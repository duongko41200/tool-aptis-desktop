import uuid
from langchain_community.document_loaders import RecursiveUrlLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from bs4 import BeautifulSoup
from agent import get_vectorstore


def _bs4_extractor(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def ingest_url(url: str, max_depth: int = 2) -> int:
    loader = RecursiveUrlLoader(
        url=url,
        max_depth=max_depth,
        extractor=_bs4_extractor,
    )
    raw_docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(raw_docs)

    for chunk in chunks:
        chunk.metadata.setdefault("source", url)
        # lấy title từ metadata nếu loader cung cấp
        if "title" not in chunk.metadata:
            chunk.metadata["title"] = chunk.metadata.get("source", url)

    ids = [str(uuid.uuid4()) for _ in chunks]
    vs = get_vectorstore()
    vs.add_documents(chunks, ids=ids)

    return len(chunks)
