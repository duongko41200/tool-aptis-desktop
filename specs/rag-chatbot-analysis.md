# Phân Tích Dự Án: LLM RAG Chatbot với LangChain Python

> **Nguồn:** https://github.com/kaizenX209/Build-An-LLM-RAG-Chatbot-With-LangChain-Python  
> **Ngày phân tích:** 2026-06-04  
> **Người phân tích:** Claude Code

---

## 1. Tổng Quan Dự Án

Dự án xây dựng một **chatbot thông minh** sử dụng kỹ thuật **RAG (Retrieval-Augmented Generation)** — một kiến trúc AI kết hợp tìm kiếm thông tin từ cơ sở dữ liệu với khả năng sinh ngôn ngữ của LLM. Chatbot có thể:

- **Học từ dữ liệu tùy chỉnh**: Thu thập dữ liệu từ URL web hoặc file JSON
- **Trả lời thông minh**: Tìm kiếm thông tin liên quan rồi dùng LLM để tổng hợp câu trả lời
- **Hỗ trợ nhiều LLM**: OpenAI GPT-4, Grok (X.AI), Ollama + Qwen3:4b (chạy local)
- **Giao diện web**: Streamlit UI với lịch sử hội thoại

---

## 2. Công Nghệ Sử Dụng

### LLM & Embedding
| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| LLM chính | OpenAI GPT-4 | Qua API, temperature=0 |
| LLM thay thế | Grok (X.AI) | API riêng |
| LLM local | Ollama + **Qwen3:4b** ✅ | Chạy offline, có streaming, hỗ trợ tiếng Việt |
| Embedding cloud | OpenAI Embeddings | Chất lượng cao |
| Embedding local | Ollama Embeddings (nomic-embed-text) | Miễn phí, offline |

### Framework & Thư Viện
| Thành phần | Thư viện | Version |
|---|---|---|
| AI Orchestration | LangChain | 0.0.300+ |
| Vector Database | Milvus | 2.4.14 |
| Lexical Search | BM25 (rank-bm25) | latest |
| Web UI | Streamlit | 1.39.0+ |
| API Backend | FastAPI + Uvicorn | 0.100.0+ |
| HTML Parsing | BeautifulSoup4 | latest |
| Observability | LangSmith | optional |

### Hạ Tầng (Docker)
```
Milvus 2.4.14    ← Vector database chính (port 19530)
etcd             ← Quản lý cấu hình cho Milvus
MinIO            ← Object storage (S3-compatible, port 9000/9001)
```

---

## 3. Cấu Trúc Dự Án

```
Build-An-LLM-RAG-Chatbot-With-LangChain-Python/
├── README.md                  ← Tài liệu tiếng Việt
├── requirements.txt           ← 24 thư viện Python
├── docker-compose.yml         ← Khởi động Milvus stack
├── .env                       ← API keys và cấu hình
└── src/
    ├── main.py                ← Giao diện Streamlit (điểm vào)
    ├── agent.py               ← Logic RAG + truy xuất hybrid
    ├── crawl.py               ← Thu thập dữ liệu từ web
    ← seed_data.py             ← Nhúng và lưu dữ liệu vào vector DB
    └── local_ollama.py        ← Cấu hình agent với Ollama
```

---

## 4. Chi Tiết Các Module Đã Triển Khai

### 4.1 `crawl.py` — Thu Thập Dữ Liệu Web

**Chức năng:**
- `crawl_web(url)`: Crawl đệ quy đến 4 cấp độ URL
- `web_base_loader(url)`: Load một trang đơn lẻ
- `save_data_locally(docs)`: Lưu dữ liệu crawl ra file JSON

**Kỹ thuật:**
- Dùng `RecursiveUrlLoader` của LangChain để đệ quy
- `BeautifulSoup4` parse HTML, loại bỏ script/style
- Lưu ra JSON để tái sử dụng mà không cần crawl lại

---

### 4.2 `seed_data.py` — Nhúng Dữ Liệu Vào Vector DB

**Pipeline:**
```
Input (URL / JSON file)
    ↓
BeautifulSoup parse HTML
    ↓
RecursiveCharacterTextSplitter (chunk_size=10000, overlap=500)
    ↓
OpenAI / Ollama Embeddings → vector 1536 chiều
    ↓
Lưu vào Milvus collection "data_test"
```

**Điểm đáng chú ý:**
- Tạo unique ID cho mỗi document chunk
- Hỗ trợ chọn embedding model qua tham số
- Không xóa dữ liệu cũ (incremental ingestion)

---

### 4.3 `agent.py` — Core RAG Logic

**Hybrid Retrieval System:**
```python
# Semantic search (70% weight)
milvus_retriever = Milvus(collection="data_test").as_retriever(k=4)

# Lexical search (30% weight)
bm25_retriever = BM25Retriever(documents)

# Kết hợp
ensemble = EnsembleRetriever(
    retrievers=[milvus_retriever, bm25_retriever],
    weights=[0.7, 0.3]
)
```

**Tại sao dùng hybrid?**
- Vector search: Hiểu ngữ nghĩa (semantic matching)
- BM25: Khớp từ khóa chính xác (exact keyword matching)
- Kết hợp: Tốt hơn cả hai cách đơn lẻ

**Agent Setup:**
- Tool: Custom "Stack AI" retriever tool
- System prompt: "an expert at AI"
- LLM: GPT-4 với temperature=0 (deterministic)

---

### 4.4 `local_ollama.py` — Local LLM (cập nhật dùng Qwen3:4b)

- Dùng `ChatOllama("qwen3:4b")` thay thế `llama2` — thế hệ mới hơn, tốt hơn
- Streaming response (real-time output)
- Cùng retriever logic như `agent.py`
- Không cần internet sau khi download model
- Context window 32K (gấp 8 lần llama2) — chứa được nhiều retrieved chunks hơn

```python
# Đổi duy nhất 1 dòng trong local_ollama.py
# Trước:  llm = ChatOllama(model="llama2", streaming=True)
llm = ChatOllama(model="qwen3:4b", streaming=True)

# Pull model về máy (chạy 1 lần):
# ollama pull qwen3:4b
```

**So sánh llama2 vs Qwen3:4b:**

| Tiêu chí | llama2 (7B) | Qwen3:4b |
|---|---|---|
| RAM cần | ~6–8 GB | ~3–4 GB |
| Tốc độ | Trung bình | Nhanh hơn |
| Tiếng Anh | Tốt | Tốt |
| Tiếng Việt | Kém | **Tốt hơn nhiều** |
| Reasoning | Cơ bản | **Tốt hơn** |
| Context window | 4K tokens | **32K tokens** |
| Thế hệ | 2023 | 2025 (mới hơn) |

---

### 4.5 `main.py` — Giao Diện Streamlit

**Cấu trúc UI:**
```
Sidebar:
├── Chọn Embedding model (OpenAI / Ollama)
├── Chọn nguồn dữ liệu (URL / File upload)
└── Chọn LLM (OpenAI GPT-4 / Grok / Ollama)

Main Area:
├── Chat history (session state)
├── Input box
└── Streaming response display
```

---

## 5. Luồng Hoạt Động Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                    GIAI ĐOẠN 1: INGESTION                    │
│                                                              │
│  URL/JSON → Crawl → Chunk → Embed → Milvus                  │
│             crawl.py        seed_data.py   (19530)          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    GIAI ĐOẠN 2: RETRIEVAL                    │
│                                                              │
│  User Query → Milvus Search (70%) ─┐                        │
│             → BM25 Search  (30%) ─→ Ensemble → Top-K Docs  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    GIAI ĐOẠN 3: GENERATION                   │
│                                                              │
│  Top-K Docs + User Query → LLM Prompt → Response            │
│                            (GPT-4/Grok/Qwen3:4b)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Cấu Hình Môi Trường

```env
OPENAI_API_KEY=sk-proj-...
XAI_API_KEY=xai-...                    # Cho Grok
LANGCHAIN_TRACING_V2=true              # LangSmith debug
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=<tên-dự-án>
```

**Yêu cầu hệ thống:**
- Python 3.8.18+
- Docker Desktop (để chạy Milvus)
- Ollama (cài tại https://ollama.com) để chạy Qwen3:4b
- RAM: 4GB+ tối thiểu (Qwen3:4b cần ~3–4GB)
- Disk: 5GB+ (cho model + data, Qwen3:4b ~2.5GB)

**Cài đặt Qwen3:4b:**
```bash
# Cài Ollama xong chạy lệnh này 1 lần
ollama pull qwen3:4b

# Kiểm tra model đã có chưa
ollama list
```

---

## 7. Tích Hợp Vào Dự Án Aptis Desktop

### 7.1 Use Case Phù Hợp

Trong dự án **Aptis Desktop** (ứng dụng học tiếng Anh), RAG chatbot có thể dùng để:

| Feature | Ứng dụng RAG |
|---|---|
| **Grammar Assistant** | Chatbot giải thích ngữ pháp từ tài liệu IELTS/APTIS |
| **Vocabulary Helper** | Tra nghĩa + ví dụ từ corpus văn bản tiếng Anh |
| **Writing Feedback** | So sánh bài viết với mẫu câu chuẩn |
| **Listening Comprehension** | Trả lời câu hỏi từ transcript bài nghe |

---

### 7.2 Kiến Trúc Tích Hợp Đề Xuất

```
Aptis Desktop (Tauri + React)
├── Frontend (React)
│   └── Chat UI component → gọi API
│
└── Backend (sidecar hoặc server riêng)
    ├── FastAPI server
    │   ├── POST /chat      ← nhận câu hỏi, trả lời từ RAG
    │   └── POST /ingest    ← nạp tài liệu mới
    │
    └── RAG Engine (từ dự án này)
        ├── agent.py (hybrid retriever)
        ├── seed_data.py (ingestion)
        └── Vector DB (Milvus hoặc ChromaDB)
```

---

### 7.3 Các Bước Tích Hợp

#### Bước 1: Chọn Vector Database

| Option | Milvus | ChromaDB | LanceDB |
|---|---|---|---|
| Setup | Docker required | Embedded | Embedded |
| Scale | Production | Dev/Small | Dev/Medium |
| Phù hợp Desktop | ❌ Nặng | ✅ Nhẹ | ✅ Nhẹ |

> **Khuyến nghị cho Aptis Desktop**: Dùng **ChromaDB** hoặc **LanceDB** thay Milvus vì không cần Docker, phù hợp app desktop.

#### Bước 2: Chuẩn Bị Dữ Liệu APTIS

```python
# Các nguồn dữ liệu cho APTIS chatbot
sources = [
    "APTIS grammar guide PDFs",
    "Cambridge English corpus",
    "APTIS sample test questions",
    "Common writing templates",
]
```

#### Bước 3: Tạo FastAPI Sidecar (dùng Qwen3:4b)

```python
# backend/main.py - Tauri sidecar
from fastapi import FastAPI
from langchain_ollama import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings
from agent import create_rag_agent

app = FastAPI()

# Dùng Qwen3:4b thay llama2
llm = ChatOllama(model="qwen3:4b", streaming=True)
embeddings = OllamaEmbeddings(model="nomic-embed-text")  # embedding nhẹ, miễn phí
agent = create_rag_agent(llm=llm, embeddings=embeddings)

@app.post("/chat")
async def chat(question: str, history: list[dict]):
    response = agent.invoke({
        "input": question,
        "chat_history": history
    })
    return {"answer": response["output"]}
```

#### Bước 4: Gọi Từ React/Tauri

```typescript
// src/lib/rag-client.ts
export async function askRAG(question: string): Promise<string> {
  const response = await fetch("http://localhost:8000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history: [] })
  });
  const data = await response.json();
  return data.answer;
}
```

#### Bước 5: Thêm Chat UI Component

```tsx
// src/components/AptisChat.tsx
import { useState } from "react";
import { askRAG } from "@/lib/rag-client";

export function AptisChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  
  const handleSend = async (text: string) => {
    const answer = await askRAG(text);
    setMessages(prev => [...prev, 
      { role: "user", content: text },
      { role: "assistant", content: answer }
    ]);
  };
  
  return <ChatUI messages={messages} onSend={handleSend} />;
}
```

---

### 7.4 Lựa Chọn LLM Cho Desktop App

| Option | Model | Pros | Cons |
|---|---|---|---|
| **OpenAI API** | GPT-4o | Chất lượng cao nhất, nhanh | Cần internet, tốn tiền |
| **Claude API** | Claude Sonnet | Tốt cho tiếng Anh, reasoning | Cần internet |
| **Ollama local** ✅ | **Qwen3:4b** | Offline, miễn phí, hỗ trợ tiếng Việt | Cần cài Ollama |

> **Khuyến nghị cho Aptis Desktop**: Dùng **Ollama + Qwen3:4b** làm mặc định (offline, miễn phí, nhẹ), cho phép người dùng nhập API key OpenAI để nâng cấp chất lượng khi cần.

---

## 8. Đánh Giá Dự Án

### Điểm Mạnh
- Kiến trúc Hybrid Retrieval (Milvus + BM25) thông minh
- Hỗ trợ cả cloud và local LLM
- Code modular, dễ tách từng phần ra dùng riêng
- README tiếng Việt chi tiết, dễ follow
- Docker setup tự động hóa infrastructure

### Điểm Yếu / Hạn Chế
- Milvus quá nặng cho desktop app (cần Docker)
- Không có authentication/multi-user support
- Chunk size 10000 khá lớn, có thể ảnh hưởng precision
- Không có document deduplication

### Độ Phù Hợp Với Aptis Desktop
**7/10** — Ý tưởng và logic RAG hoàn toàn phù hợp, nhưng cần thay thế Milvus bằng vector DB nhẹ hơn (ChromaDB/LanceDB) và bọc backend thành Tauri sidecar thay vì chạy Streamlit riêng.

---

## 9. Tóm Tắt Nhanh

| Hạng mục | Thông tin |
|---|---|
| **Mục đích** | RAG Chatbot có thể học từ dữ liệu tùy chỉnh |
| **LLM** | GPT-4, Grok, **Qwen3:4b** (Ollama) ✅ |
| **Vector DB** | Milvus 2.4.14 (chạy qua Docker) |
| **Retrieval** | Hybrid: Semantic (70%) + BM25 (30%) |
| **UI** | Streamlit web app |
| **Ngôn ngữ** | Python 3.8+ |
| **Độ khó tích hợp** | Trung bình (thay vector DB + wrap API) |
