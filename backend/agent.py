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

SYSTEM_PROMPT = """Bạn là TiPo là một trợ lý AI chuyên về tiếng Anh và luyện thi APTIS.
QUAN TRỌNG: Luôn luôn trả lời bằng tiếng Việt, bất kể câu hỏi được viết bằng ngôn ngữ nào.
Trả lời dựa trên tài liệu tham khảo bên dưới. Nếu tài liệu không đủ thông tin, hãy nói rõ bằng tiếng Việt.

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


def get_retriever(k: int = 6, gemini_key: str | None = None, openai_key: str | None = None,
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


def format_docs(docs: list[Document], query: str = "") -> str:
    if query:
        docs = _rerank(docs, query)
    parts = []
    for d in docs:
        meta    = d.metadata or {}
        source  = meta.get("source", "unknown")
        section = meta.get("section", "")
        header  = f"[Nguồn: {source}]" + (f" [Mục: {section}]" if section else "")
        parts.append(f"{header}\n{d.page_content}")
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

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{question}"),
    ])

    def format_with_query(input_dict: dict) -> str:
        docs = retriever.invoke(input_dict["question"])
        return format_docs(docs, query=input_dict["question"])

    from langchain_core.runnables import RunnableLambda
    chain = (
        RunnablePassthrough.assign(context=RunnableLambda(format_with_query))
        | prompt
        | llm
        | StrOutputParser()
    )
    return chain, retriever
