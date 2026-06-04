# Backend Setup

FastAPI + ChromaDB + Ollama RAG backend cho EngDaily.

## Yêu cầu

- Python 3.10+
- [Ollama](https://ollama.com) đang chạy trên máy

## Cài đặt

```bash
cd backend

# 1. Cài dependencies
pip install -r requirements.txt

# 2. Download Chromium cho crawl4ai (chỉ cần chạy 1 lần)
python -m playwright install chromium
```

## Chạy server

```bash
uvicorn main:app --port 8080
```

Server chạy tại `http://localhost:8080`.

## Biến môi trường (tuỳ chọn)

Tạo file `.env` trong thư mục `backend/` nếu cần override:

```env
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=qwen3:4b
EMBED_MODEL=nomic-embed-text
CHROMA_DIR=./chroma_db
```

## API endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/ping` | Kiểm tra backend alive |
| GET | `/health` | Trạng thái Ollama + models |
| GET | `/models/status` | Chi tiết model LLM + embed |
| GET | `/models/pull` | Stream pull LLM model từ Ollama |
| GET | `/models/pull-embed` | Stream pull embed model |
| POST | `/chat` | Chat (non-streaming) |
| POST | `/chat/stream` | Chat streaming (SSE) |
| POST | `/ingest/url` | Crawl URL và nạp vào ChromaDB |
| GET | `/sources` | Danh sách URL đã nạp |
| GET | `/sources/chunks` | Xem chunks của một URL |
| DELETE | `/sources` | Xóa một URL khỏi ChromaDB |
