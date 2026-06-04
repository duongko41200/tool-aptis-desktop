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

SYSTEM_PROMPT = """Bạn là trợ lý AI chuyên về tiếng Anh và luyện thi APTIS/IELTS.
Trả lời dựa trên tài liệu tham khảo bên dưới. Nếu tài liệu không đủ thông tin, hãy nói rõ.
Trả lời bằng ngôn ngữ người dùng đang dùng (tiếng Việt hoặc tiếng Anh).

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


def get_vectorstore(openai_key: str | None = None) -> Chroma:
    return Chroma(
        collection_name=COLLECTION,
        embedding_function=get_embeddings(openai_key),
        persist_directory=CHROMA_DIR,
    )


def get_retriever(k: int = 4, openai_key: str | None = None):
    vs = get_vectorstore(openai_key)
    vector_ret = vs.as_retriever(search_kwargs={"k": k})

    data = vs.get()
    raw_docs = data.get("documents") or []
    if not raw_docs:
        return vector_ret

    metas = data.get("metadatas") or [{}] * len(raw_docs)
    docs = [Document(page_content=t, metadata=m) for t, m in zip(raw_docs, metas)]
    bm25_ret = BM25Retriever.from_documents(docs, k=k)

    return EnsembleRetriever(
        retrievers=[vector_ret, bm25_ret],
        weights=[0.7, 0.3],
    )


def format_docs(docs: list[Document]) -> str:
    return "\n\n---\n\n".join(
        f"[Nguồn: {d.metadata.get('source', 'unknown')}]\n{d.page_content}"
        for d in docs
    )


def build_chain(model: str = LLM_MODEL, openai_key: str | None = None):
    if openai_key:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(api_key=openai_key, model=model, temperature=0)
    else:
        llm = ChatOllama(model=model, base_url=OLLAMA_URL)

    retriever = get_retriever(openai_key=openai_key)

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{question}"),
    ])

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    return chain, retriever
