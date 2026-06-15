import os
from dotenv import load_dotenv
load_dotenv()
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.documents import Document

CHROMA_DIR  = os.getenv("CHROMA_DIR",  "./chroma_db")
COLLECTION  = "aptis_docs"
OLLAMA_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LLM_MODEL   = os.getenv("LLM_MODEL",   "llama3:latest")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

SYSTEM_PROMPT = """Bạn là TiPo là một trợ lý AI chuyên về tiếng Anh và luyện thi APTIS.
QUAN TRỌNG: Luôn luôn trả lời bằng tiếng Việt, bất kể câu hỏi được viết bằng ngôn ngữ nào.
Trả lời dựa trên tài liệu tham khảo bên dưới. Nếu tài liệu không đủ thông tin, hãy nói rõ bằng tiếng Việt.

Tài liệu tham khảo:
{context}"""


def _test_embed(model_name: str) -> bool:
    """Thử thực sự embed một chuỗi ngắn — trả về True nếu model hỗ trợ."""
    try:
        import httpx as _httpx
        r = _httpx.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": model_name, "prompt": "test"},
            timeout=5.0,
        )
        return r.status_code == 200 and "embedding" in r.json()
    except Exception:
        return False


def _pick_embed_model() -> str | None:
    """Chọn embedding model đầu tiên thực sự hoạt động."""
    try:
        import httpx as _httpx
        r = _httpx.get(f"{OLLAMA_URL}/api/tags", timeout=2.0)
        installed = [m["name"] for m in r.json().get("models", [])]
    except Exception:
        installed = []

    prefer = [EMBED_MODEL, "nomic-embed-text", "all-minilm", "mxbai-embed-large"]
    for candidate in prefer:
        if any(candidate.split(":")[0] in m for m in installed):
            if _test_embed(candidate):
                return candidate
    return None


def get_embeddings(openai_key: str | None = None):
    if openai_key:
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(api_key=openai_key, model="text-embedding-3-small")

    model = _pick_embed_model()
    if model is None:
        # Không có embedding model — dùng fake để app không crash
        # RAG vẫn dùng BM25; vector search sẽ kém chất lượng
        from langchain_community.embeddings import FakeEmbeddings
        return FakeEmbeddings(size=768)
    return OllamaEmbeddings(model=model, base_url=OLLAMA_URL)


def get_vectorstore(openai_key: str | None = None, embeddings=None) -> Chroma:
    if embeddings is None:
        embeddings = get_embeddings(openai_key)
    return Chroma(
        collection_name=COLLECTION,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )


def get_retriever(k: int = 6, openai_key: str | None = None):
    embeddings = get_embeddings(openai_key)
    is_fake = type(embeddings).__name__ == "FakeEmbeddings"
    vector_weight = 0.0 if is_fake else 0.7
    bm25_weight = 1.0 if is_fake else 0.3

    vs = get_vectorstore(openai_key, embeddings=embeddings)
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
    """
    Simple reranker:
    1. Loại chunk quá ngắn (< 50 ký tự)
    2. Loại chunk trùng nội dung (hash đầu 200 ký tự)
    3. Ưu tiên chunk chứa từ khóa từ query (score đơn giản)
    4. Giới hạn tối đa 3 chunk per source URL
    """
    from collections import defaultdict
    import hashlib

    # Đảm bảo metadata không None (có thể xảy ra khi load từ ChromaDB cũ)
    for d in docs:
        if d.metadata is None:
            d.metadata = {}

    # Bước 1: lọc chunk rỗng / quá ngắn
    docs = [d for d in docs if len(d.page_content.strip()) >= 50]

    # Bước 2: dedup theo nội dung
    seen_hashes: set[str] = set()
    deduped = []
    for d in docs:
        h = hashlib.md5(d.page_content[:200].encode()).hexdigest()
        if h not in seen_hashes:
            seen_hashes.add(h)
            deduped.append(d)

    # Bước 3: score theo keyword overlap
    query_words = set(query.lower().split())
    def score(d: Document) -> float:
        text = d.page_content.lower()
        hits = sum(1 for w in query_words if w in text)
        # Ưu tiên chunk có heading khớp query
        section = d.metadata.get("section", "").lower()
        heading_bonus = sum(2 for w in query_words if w in section)
        return hits + heading_bonus

    scored = sorted(deduped, key=score, reverse=True)

    # Bước 4: max 3 chunk per source
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


def build_chain(model: str = LLM_MODEL, openai_key: str | None = None, gemini_key: str | None = None):
    if gemini_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(google_api_key=gemini_key, model=model, temperature=0)
    elif openai_key:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(api_key=openai_key, model=model, temperature=0)
    else:
        llm = ChatOllama(model=model, base_url=OLLAMA_URL)

    retriever = get_retriever(openai_key=openai_key if not gemini_key else None)

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
