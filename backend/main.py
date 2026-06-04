import asyncio
import os

from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent import build_chain, get_retriever, get_vectorstore
from ingest import ingest_url

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LLM_MODEL  = os.getenv("LLM_MODEL", "llama3:latest")

app = FastAPI(title="Aptis RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    history: list[dict] = []
    model: str = "qwen3:4b"
    openai_key: str | None = None   # nếu dùng OpenAI thay Ollama


class IngestRequest(BaseModel):
    url: str
    max_depth: int = 2
    openai_key: str | None = None


# ── Model / Ollama status ─────────────────────────────────
@app.get("/models/status")
async def model_status():
    """Kiểm tra Ollama đang chạy và model đã pull chưa."""
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags", timeout=3.0)
        installed = [m["name"] for m in r.json().get("models", [])]
        # Ưu tiên LLM_MODEL, nếu không có thì dùng model đầu tiên trong danh sách
        if any(LLM_MODEL in m for m in installed):
            active_model = LLM_MODEL
            available = True
        elif installed:
            active_model = installed[0]
            available = True
        else:
            active_model = LLM_MODEL
            available = False
        return {
            "ollama_running": True,
            "model_available": available,
            "model": active_model,
            "installed_models": installed,
        }
    except Exception:
        return {
            "ollama_running": False,
            "model_available": False,
            "model": LLM_MODEL,
            "installed_models": [],
        }


@app.get("/models/pull")
async def pull_model():
    """Stream tiến trình pull model từ Ollama (SSE)."""
    async def generate():
        try:
            async with httpx.AsyncClient(timeout=None) as c:
                async with c.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/pull",
                    json={"name": LLM_MODEL},
                ) as r:
                    async for line in r.aiter_lines():
                        if line.strip():
                            yield f"data: {line}\n\n"
        except Exception as e:
            yield f'data: {{"error": "{str(e)}"}}\n\n'
        yield 'data: {"done": true}\n\n'

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/openai/validate")
async def validate_openai_key(body: dict):
    """Kiểm tra OpenAI API key có hợp lệ không."""
    key = body.get("key", "")
    if not key.startswith("sk-"):
        raise HTTPException(400, "API key không hợp lệ")
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {key}"},
                timeout=8.0,
            )
        if r.status_code == 200:
            return {"valid": True}
        raise HTTPException(401, "API key bị từ chối bởi OpenAI")
    except httpx.TimeoutException:
        raise HTTPException(408, "Timeout khi kiểm tra key")


# ── Health ────────────────────────────────────────────────
@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags", timeout=3.0)
        models = [m["name"] for m in r.json().get("models", [])]
        return {"status": "ok", "ollama": True, "models": models}
    except Exception:
        return {"status": "degraded", "ollama": False, "models": []}


# ── Chat ──────────────────────────────────────────────────
@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        chain, retriever = build_chain(req.model, openai_key=req.openai_key)
        docs    = await asyncio.to_thread(retriever.invoke, req.question)
        sources = [
            {
                "title":   d.metadata.get("title", d.metadata.get("source", "Nguồn không rõ")),
                "url":     d.metadata.get("source", ""),
                "snippet": d.page_content[:220],
            }
            for d in docs[:3]
        ]
        answer = await asyncio.to_thread(chain.invoke, req.question)
        return {"answer": answer, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Stream câu trả lời từng token qua SSE."""
    import json

    async def generate():
        try:
            chain, retriever = build_chain(req.model, openai_key=req.openai_key)

            # Lấy context trước
            docs = await asyncio.to_thread(retriever.invoke, req.question)
            sources = [
                {
                    "title":   d.metadata.get("title", d.metadata.get("source", "Nguồn không rõ")),
                    "url":     d.metadata.get("source", ""),
                    "snippet": d.page_content[:220],
                }
                for d in docs[:3]
            ]
            # Emit sources ngay
            yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

            # Stream từng token từ LLM
            llm = chain.steps[-2] if hasattr(chain, 'steps') else None  # type: ignore
            from langchain_ollama import ChatOllama as _ChatOllama
            from langchain_openai import ChatOpenAI as _ChatOpenAI

            if req.openai_key:
                from langchain_openai import ChatOpenAI
                streaming_llm = ChatOpenAI(api_key=req.openai_key, model=req.model, temperature=0, streaming=True)
            else:
                from langchain_ollama import ChatOllama
                streaming_llm = ChatOllama(model=req.model, base_url=OLLAMA_URL)

            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import StrOutputParser
            from langchain_core.runnables import RunnablePassthrough
            from agent import format_docs, SYSTEM_PROMPT

            context_str = format_docs(docs)
            prompt = ChatPromptTemplate.from_messages([
                ("system", SYSTEM_PROMPT),
                ("human", "{question}"),
            ])
            messages = prompt.format_messages(context=context_str, question=req.question)

            full_answer = ""
            async for chunk in streaming_llm.astream(messages):
                token = chunk.content if hasattr(chunk, 'content') else str(chunk)
                if token:
                    full_answer += token
                    yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

            yield f"data: {json.dumps({'type': 'done', 'answer': full_answer, 'sources': sources})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Ingest ────────────────────────────────────────────────
@app.post("/ingest/url")
async def ingest(req: IngestRequest):
    try:
        chunks = await asyncio.to_thread(ingest_url, req.url, req.max_depth)
        return {"status": "ok", "url": req.url, "chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sources")
async def list_sources():
    vs = get_vectorstore()
    data = vs.get()
    metas = data.get("metadatas") or []
    counts: dict[str, int] = {}
    titles: dict[str, str] = {}
    for meta in metas:
        url = meta.get("source", "unknown")
        counts[url] = counts.get(url, 0) + 1
        if url not in titles:
            titles[url] = meta.get("title", url)
    return {
        "sources": [
            {"url": url, "title": titles[url], "chunks": n}
            for url, n in counts.items()
        ]
    }


@app.delete("/sources")
async def delete_source(url: str = Query(...)):
    vs = get_vectorstore()
    data = vs.get()
    ids_to_del = [
        id_ for id_, meta in zip(data["ids"], data.get("metadatas") or [])
        if meta.get("source") == url
    ]
    if ids_to_del:
        vs.delete(ids=ids_to_del)
    return {"deleted": len(ids_to_del), "url": url}
