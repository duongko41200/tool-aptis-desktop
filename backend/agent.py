import os
from dotenv import load_dotenv
load_dotenv()

from langchain_chroma import Chroma
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.documents import Document

CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_db")
COLLECTION  = "aptis_docs_gemini"

SYSTEM_PROMPT = """Bạn là TiPo, trợ lý AI chuyên về tiếng Anh và luyện thi APTIS.

QUY TẮC TRẢ LỜI:
1. Ngôn ngữ: trả lời cùng ngôn ngữ với câu hỏi. Câu hỏi tiếng Việt → trả lời tiếng Việt. Câu hỏi tiếng Anh → trả lời tiếng Anh.
2. Trích dẫn tài liệu: khi người dùng yêu cầu lấy nội dung, đoạn văn, bài đọc, câu hỏi... từ tài liệu thì PHẢI trích dẫn NGUYÊN VĂN, KHÔNG dịch, KHÔNG tóm tắt, KHÔNG bỏ bớt. Lấy đủ toàn bộ đoạn được yêu cầu.
3. Giải thích / hướng dẫn: viết bằng tiếng Việt, phần nội dung tiếng Anh giữ nguyên tiếng Anh.
4. Nếu tài liệu không có đủ thông tin, nói rõ là không tìm thấy trong tài liệu.
5. KHÔNG tự bịa thêm nội dung không có trong tài liệu.
6. KHÔNG thêm bất kỳ chú thích URL, link, hay nhãn nguồn nào vào câu trả lời.

ĐỊNH DẠNG:
- Dùng **in đậm** cho tiêu đề, từ khoá quan trọng, tên người (A, B, C, D...).
- Dùng dòng trống để phân cách giữa các đoạn, giữa các người A/B/C/D.
- Nếu có nhiều mục/người/câu hỏi riêng biệt, trình bày mỗi mục trên một khối riêng, có tiêu đề rõ ràng.
- KHÔNG viết tất cả vào một đoạn văn dài liên tục.

Tài liệu tham khảo:
{context}"""


class _GeminiEmbeddings:
    """Gọi trực tiếp Google Embedding API v1 qua HTTP — tránh langchain/SDK dùng v1beta."""

    _BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent"

    def __init__(self, api_key: str):
        self._api_key = api_key

    def _embed_one(self, text: str) -> list[float]:
        import httpx
        r = httpx.post(
            self._BASE,
            params={"key": self._api_key},
            json={"content": {"parts": [{"text": text}]}},
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json()["embedding"]["values"]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed_one(text)


def get_embeddings(gemini_key: str | None = None, openai_key: str | None = None):
    if gemini_key:
        return _GeminiEmbeddings(gemini_key)
    if openai_key:
        try:
            from langchain_openai import OpenAIEmbeddings
            return OpenAIEmbeddings(api_key=openai_key, model="text-embedding-3-small")
        except Exception:
            pass
    # Fallback: RAG vẫn dùng BM25; vector search sẽ kém chất lượng
    from langchain_community.embeddings import FakeEmbeddings
    return FakeEmbeddings(size=768)


def get_vectorstore(gemini_key: str | None = None, openai_key: str | None = None, embeddings=None) -> Chroma:
    if embeddings is None:
        embeddings = get_embeddings(gemini_key, openai_key)
    return Chroma(
        collection_name=COLLECTION,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )


def get_retriever(k: int = 12, gemini_key: str | None = None, openai_key: str | None = None,
                  source_filter: list[str] | None = None):
    embeddings = get_embeddings(gemini_key, openai_key)
    is_fake = type(embeddings).__name__ == "FakeEmbeddings"
    vector_weight = 0.0 if is_fake else 0.7
    bm25_weight = 1.0 if is_fake else 0.3

    vs = get_vectorstore(gemini_key, openai_key, embeddings=embeddings)

    # Vector retriever — lọc theo source nếu có
    if source_filter:
        chroma_filter = {"source": {"$in": source_filter}}
        vector_ret = vs.as_retriever(search_kwargs={"k": k, "filter": chroma_filter})
        data = vs.get(where=chroma_filter)
    else:
        vector_ret = vs.as_retriever(search_kwargs={"k": k})
        data = vs.get()

    raw_docs = data.get("documents") or []
    if not raw_docs:
        return vector_ret

    raw_metas = data.get("metadatas") or []
    metas = [(m if m is not None else {}) for m in raw_metas] or [{}] * len(raw_docs)
    docs = [Document(page_content=t, metadata=m) for t, m in zip(raw_docs, metas)]
    bm25_ret = BM25Retriever.from_documents(docs, k=k)

    return EnsembleRetriever(
        retrievers=[vector_ret, bm25_ret],
        weights=[vector_weight, bm25_weight],
    )


def _rerank(docs: list[Document], query: str) -> list[Document]:
    from collections import defaultdict
    import hashlib

    for d in docs:
        if d.metadata is None:
            d.metadata = {}

    docs = [d for d in docs if len(d.page_content.strip()) >= 50]

    seen_hashes: set[str] = set()
    deduped = []
    for d in docs:
        h = hashlib.md5(d.page_content[:200].encode()).hexdigest()
        if h not in seen_hashes:
            seen_hashes.add(h)
            deduped.append(d)

    query_words = set(query.lower().split())
    def score(d: Document) -> float:
        text = d.page_content.lower()
        hits = sum(1 for w in query_words if w in text)
        section = d.metadata.get("section", "").lower()
        heading_bonus = sum(2 for w in query_words if w in section)
        return hits + heading_bonus

    scored = sorted(deduped, key=score, reverse=True)

    source_counts: dict = defaultdict(int)
    result = []
    for d in scored:
        src = d.metadata.get("source", "unknown")
        if source_counts[src] < 3:
            result.append(d)
            source_counts[src] += 1

    return result


def expand_context(docs: list[Document], vs: Chroma, window: int = 3) -> list[Document]:
    """
    Với mỗi chunk được retrieve, lấy thêm các chunk liền kề (±window theo chunk_index)
    cùng source từ ChromaDB. Giúp lấy đủ nội dung khi đoạn văn bị tách thành nhiều chunk.
    """
    from collections import defaultdict

    if not docs:
        return docs

    # Gom chunk_index theo từng source
    source_ranges: dict[str, tuple[int, int]] = {}
    for d in docs:
        meta = d.metadata or {}
        source = meta.get("source", "")
        raw_idx = meta.get("chunk_index")
        if not source or raw_idx is None:
            continue
        idx = int(raw_idx)
        if source in source_ranges:
            lo, hi = source_ranges[source]
            source_ranges[source] = (min(lo, idx), max(hi, idx))
        else:
            source_ranges[source] = (idx, idx)

    # Với mỗi source, fetch chunk trong khoảng [lo-window, hi+window]
    extra: list[Document] = []
    for source, (lo, hi) in source_ranges.items():
        min_idx = max(0, lo - window)
        max_idx = hi + window
        try:
            data = vs.get(
                where={"$and": [
                    {"source": {"$eq": source}},
                    {"chunk_index": {"$gte": min_idx}},
                    {"chunk_index": {"$lte": max_idx}},
                ]},
                include=["documents", "metadatas"],
            )
            for content, meta in zip(data.get("documents") or [], data.get("metadatas") or []):
                if content:
                    extra.append(Document(page_content=content, metadata=meta or {}))
        except Exception:
            pass

    # Merge + dedup theo (source, chunk_index), giữ thứ tự chunk_index
    seen: set[tuple] = set()
    merged: list[Document] = []
    for d in docs + extra:
        meta = d.metadata or {}
        key = (meta.get("source", ""), int(meta.get("chunk_index", -1)))
        if key not in seen:
            seen.add(key)
            merged.append(d)

    merged.sort(key=lambda d: (
        (d.metadata or {}).get("source", ""),
        int((d.metadata or {}).get("chunk_index", 0)),
    ))
    return merged


def format_docs(docs: list[Document], query: str = "") -> str:
    if query:
        docs = _rerank(docs, query)
    parts = []
    for d in docs:
        parts.append(d.page_content)
    return "\n\n---\n\n".join(parts)


def build_chain(model: str = "gemini-2.5-flash", gemini_key: str | None = None, openai_key: str | None = None,
                source_filter: list[str] | None = None):
    if gemini_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(google_api_key=gemini_key, model=model, temperature=0)
    elif openai_key:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(api_key=openai_key, model=model, temperature=0)
    else:
        raise ValueError("Gemini API key hoặc OpenAI API key là bắt buộc.")

    retriever = get_retriever(gemini_key=gemini_key, openai_key=openai_key, source_filter=source_filter or None)
    vs = get_vectorstore(gemini_key=gemini_key, openai_key=openai_key)

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{question}"),
    ])

    def format_with_query(input_dict: dict) -> str:
        docs = retriever.invoke(input_dict["question"])
        docs = expand_context(docs, vs)
        return format_docs(docs, query=input_dict["question"])

    from langchain_core.runnables import RunnableLambda
    chain = (
        RunnablePassthrough.assign(context=RunnableLambda(format_with_query))
        | prompt
        | llm
        | StrOutputParser()
    )
    return chain, retriever
