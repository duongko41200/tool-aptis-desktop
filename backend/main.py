import asyncio
import os

from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent import build_chain, get_retriever, get_vectorstore, expand_context
from ingest import ingest_url, ingest_url_with_flow

app = FastAPI(title="Aptis RAG API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/ping")
async def ping():
    return {"ok": True}


@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Schemas ───────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    history: list[dict] = []
    model: str = "gemini-2.5-flash"
    openai_key: str | None = None
    gemini_key: str | None = None
    source_filter: list[str] | None = None


class IngestRequest(BaseModel):
    url: str
    max_depth: int = 2
    openai_key: str | None = None
    gemini_key: str | None = None
    cookies: str | None = None


# ── OpenAI key validation ─────────────────────────────────
@app.post("/openai/validate")
async def validate_openai_key(body: dict):
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


# ── Chat ──────────────────────────────────────────────────
@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        chain, retriever = build_chain(req.model, gemini_key=req.gemini_key, openai_key=req.openai_key, source_filter=req.source_filter or None)
        docs    = await asyncio.to_thread(retriever.invoke, req.question)
        docs    = expand_context(docs, get_vectorstore(gemini_key=req.gemini_key, openai_key=req.openai_key))
        sources = [
            {
                "title":   (d.metadata or {}).get("title") or (d.metadata or {}).get("source") or "Nguồn không rõ",
                "url":     (d.metadata or {}).get("source", ""),
                "snippet": d.page_content[:300],
            }
            for d in docs[:5]
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
            chain, retriever = build_chain(req.model, gemini_key=req.gemini_key, openai_key=req.openai_key, source_filter=req.source_filter or None)

            docs = await asyncio.to_thread(retriever.invoke, req.question)
            docs = expand_context(docs, get_vectorstore(gemini_key=req.gemini_key, openai_key=req.openai_key))
            sources = [
                {
                    "title":   (d.metadata or {}).get("title") or (d.metadata or {}).get("source") or "Nguồn không rõ",
                    "url":     (d.metadata or {}).get("source", ""),
                    "snippet": d.page_content[:300],
                }
                for d in docs[:5]
            ]
            yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

            if req.gemini_key:
                from langchain_google_genai import ChatGoogleGenerativeAI
                streaming_llm = ChatGoogleGenerativeAI(google_api_key=req.gemini_key, model=req.model, temperature=0, streaming=True)
            elif req.openai_key:
                from langchain_openai import ChatOpenAI
                streaming_llm = ChatOpenAI(api_key=req.openai_key, model=req.model, temperature=0, streaming=True)
            else:
                yield f"data: {json.dumps({'type': 'error', 'error': 'Gemini API key là bắt buộc'})}\n\n"
                return

            from langchain_core.prompts import ChatPromptTemplate
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
@app.post("/ingest/debug")
async def ingest_debug(req: IngestRequest):
    """Crawl URL và trả về raw content để debug — không lưu vào ChromaDB."""
    import asyncio as _asyncio
    from ingest import _crawl_pages, _parse_cookie_string

    login_keywords = [
        "đăng nhập", "login", "sign in", "signin",
        "log in", "mật khẩu", "password", "email",
        "tài khoản", "account", "unauthorized", "403", "401",
    ]

    async def _run():
        docs = await _crawl_pages(req.url, max_depth=0, cookies=req.cookies)
        results = []
        for doc in docs:
            content = doc.page_content or ""
            lower = content.lower()
            detected_login = [kw for kw in login_keywords if kw in lower]
            results.append({
                "url": doc.metadata.get("source", req.url),
                "title": doc.metadata.get("title", ""),
                "content_length": len(content),
                "preview": content[:1500],
                "login_detected": bool(detected_login),
                "login_keywords_found": detected_login,
            })

        cookie_count = 0
        if req.cookies:
            cookie_count = len(_parse_cookie_string(req.cookies, req.url))

        return {
            "cookies_injected": cookie_count,
            "pages_crawled": len(results),
            "results": results,
        }

    try:
        result = await _run()
        return result
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}\n\n{traceback.format_exc()}")


class FlowNode(BaseModel):
    id: str
    data: dict


class FlowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: str | None = None


class FlowIngestRequest(BaseModel):
    url: str
    nodes: list[FlowNode]
    edges: list[FlowEdge]
    cookies: str | None = None
    openai_key: str | None = None
    gemini_key: str | None = None


@app.post("/ingest/flow")
async def ingest_flow(req: FlowIngestRequest):
    try:
        chunks = await asyncio.to_thread(
            ingest_url_with_flow,
            req.url,
            [n.model_dump() for n in req.nodes],
            [e.model_dump() for e in req.edges],
            req.cookies,
            req.gemini_key,
            req.openai_key,
        )
        return {"status": "ok", "url": req.url, "chunks": chunks}
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}\n\n{traceback.format_exc()}")


@app.post("/ingest/flow/stream")
async def ingest_flow_stream(req: FlowIngestRequest):
    import asyncio as _asyncio
    import json as _json

    queue: _asyncio.Queue = _asyncio.Queue()

    async def on_node(node_id: str, node_type: str):
        await queue.put({"type": "node", "node_id": node_id, "node_type": node_type})

    async def run():
        try:
            from ingest import _execute_flow, _chunk_docs
            from agent import get_vectorstore
            import uuid
            docs = await _execute_flow(
                req.url,
                [n.model_dump() for n in req.nodes],
                [e.model_dump() for e in req.edges],
                req.cookies,
                req.gemini_key,
                req.openai_key,
                on_node=on_node,
            )
            final_chunks = _chunk_docs(docs) if docs else []
            final_chunks = [c for c in final_chunks if len(c.page_content.strip()) >= 50]
            if final_chunks:
                vs = get_vectorstore(gemini_key=req.gemini_key, openai_key=req.openai_key)
                try:
                    existing = vs.get(where={"source": req.url})
                    if existing and existing.get("ids"):
                        vs.delete(ids=existing["ids"])
                except Exception:
                    pass
                for i, chunk in enumerate(final_chunks):
                    m = chunk.metadata
                    m["source"] = m.get("source") or req.url
                    m["title"] = m.get("title") or req.url
                    m["chunk_index"] = i
                    m.setdefault("section", "")
                for chunk in final_chunks:
                    chunk.metadata = {k: (v if v is not None else "") for k, v in chunk.metadata.items()}
                vs.add_documents(final_chunks, ids=[str(uuid.uuid4()) for _ in final_chunks])
            await queue.put({"type": "done", "chunks": len(final_chunks)})
        except Exception as e:
            await queue.put({"type": "error", "error": str(e)})

    _asyncio.create_task(run())

    async def generate():
        while True:
            event = await queue.get()
            yield f"data: {_json.dumps(event)}\n\n"
            if event["type"] in ("done", "error"):
                break

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/ingest/url")
async def ingest(req: IngestRequest):
    try:
        chunks = await asyncio.to_thread(ingest_url, req.url, req.max_depth, req.cookies, req.gemini_key, req.openai_key)
        return {"status": "ok", "url": req.url, "chunks": chunks}
    except Exception as e:
        import traceback
        detail = f"{type(e).__name__}: {e}\n\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=detail)


@app.get("/sources")
async def list_sources():
    vs = get_vectorstore()
    data = vs.get()
    metas = data.get("metadatas") or []
    counts: dict[str, int] = {}
    titles: dict[str, str] = {}
    for meta in metas:
        if not meta:
            continue
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


@app.get("/sources/chunks")
async def get_source_chunks(url: str = Query(...)):
    vs = get_vectorstore()
    try:
        data = vs.get(where={"source": url}, include=["documents", "metadatas"])
    except Exception:
        data = vs.get(include=["documents", "metadatas"])
        ids   = data.get("ids", [])
        docs  = data.get("documents", []) or []
        metas = data.get("metadatas", []) or []
        filtered = [
            (i, d, m) for i, d, m in zip(ids, docs, metas)
            if m and m.get("source") == url
        ]
        ids   = [x[0] for x in filtered]
        docs  = [x[1] for x in filtered]
        metas = [x[2] for x in filtered]
        data  = {"ids": ids, "documents": docs, "metadatas": metas}

    ids   = data.get("ids", [])
    docs  = data.get("documents", []) or []
    metas = data.get("metadatas", []) or []

    chunks = []
    for doc_id, content, meta in zip(ids, docs, metas):
        safe_meta = meta or {}
        chunks.append({
            "id":       doc_id,
            "content":  content or "",
            "metadata": safe_meta,
            "index":    safe_meta.get("chunk_index", 0),
        })
    chunks.sort(key=lambda x: x["index"])
    return {"url": url, "total": len(chunks), "chunks": chunks}


@app.delete("/sources")
async def delete_source(url: str = Query(...)):
    vs = get_vectorstore()
    data = vs.get()
    ids_to_del = [
        id_ for id_, meta in zip(data["ids"], data.get("metadatas") or [])
        if meta and meta.get("source") == url
    ]
    if ids_to_del:
        vs.delete(ids=ids_to_del)
    return {"deleted": len(ids_to_del), "url": url}
