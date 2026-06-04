const BASE = 'http://localhost:8080';

export interface RagSource {
  title: string;
  url: string;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  sources: RagSource[];
}

export interface SourceInfo {
  url: string;
  title: string;
  chunks: number;
}

export interface ChunkInfo {
  id: string;
  content: string;
  index: number;
  metadata: {
    source?: string;
    title?: string;
    section?: string;
    heading1?: string;
    heading2?: string;
    heading3?: string;
    chunk_index?: number;
    [key: string]: unknown;
  };
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  ollama: boolean;
  models: string[];
}

export interface ModelStatus {
  ollama_running: boolean;
  model_available: boolean;
  model: string;
  installed_models: string[];
  embed_model: string | null;
  embed_ready: boolean;
  backend_offline?: boolean;
}

export interface PullProgress {
  status?: string;
  digest?: string;
  total?: number;
  completed?: number;
  done?: boolean;
  error?: string;
}

// ── Health & model status ─────────────────────────────────
export async function ragHealth(): Promise<HealthResponse> {
  const r = await fetch(`${BASE}/health`);
  return r.json();
}

/** Kiểm tra backend alive — chỉ gọi /ping, không phụ thuộc Ollama. */
export async function pingBackend(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/ping`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function ragModelStatus(): Promise<ModelStatus> {
  try {
    // /models/status gọi Ollama 2 lần → cần timeout đủ lớn
    const r = await fetch(`${BASE}/models/status`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error('backend error');
    return r.json();
  } catch {
    return {
      ollama_running: false,
      model_available: false,
      model: 'qwen3:4b',
      installed_models: [],
      embed_model: null,
      embed_ready: false,
      backend_offline: true,
    };
  }
}

// ── Pull embed model với progress callback ───────────────
export async function ragPullEmbedModel(
  onProgress: (p: PullProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const r = await fetch(`${BASE}/models/pull-embed`, { signal });
  if (!r.body) throw new Error('No response body');
  const reader  = r.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data: PullProgress = JSON.parse(line.slice(6));
        onProgress(data);
        if (data.done || data.error) return;
      } catch { /* partial */ }
    }
  }
}

// ── Pull model với progress callback ─────────────────────
export async function ragPullModel(
  onProgress: (p: PullProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const r = await fetch(`${BASE}/models/pull`, { signal });
  if (!r.body) throw new Error('No response body');
  const reader  = r.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    // parse SSE lines: "data: {...}\n\n"
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data: PullProgress = JSON.parse(line.slice(6));
        onProgress(data);
        if (data.done || data.error) return;
      } catch { /* partial chunk */ }
    }
  }
}

// ── OpenAI key validation ─────────────────────────────────
export async function ragValidateOpenAIKey(key: string): Promise<boolean> {
  const r = await fetch(`${BASE}/openai/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) return false;
  const data = await r.json();
  return data.valid === true;
}

// ── Chat (non-streaming fallback) ────────────────────────
export async function ragChat(
  question: string,
  history: { role: string; content: string }[],
  model = 'llama3:latest',
  openaiKey?: string,
): Promise<ChatResponse> {
  const r = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history, model, openai_key: openaiKey ?? null }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail ?? 'Lỗi server');
  }
  return r.json();
}

// ── Chat streaming ────────────────────────────────────────
export async function ragChatStream(
  question: string,
  model = 'llama3:latest',
  openaiKey: string | undefined,
  onToken: (token: string) => void,
  onSources: (sources: RagSource[]) => void,
  signal?: AbortSignal,
): Promise<void> {
  const r = await fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history: [], model, openai_key: openaiKey ?? null }),
    signal,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail ?? 'Lỗi server');
  }
  const reader  = r.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'token') onToken(data.token);
        if (data.type === 'sources') onSources(data.sources);
        if (data.type === 'error') throw new Error(data.error);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

// ── Sources ───────────────────────────────────────────────
export interface IngestDebugResult {
  cookies_injected: number;
  pages_crawled: number;
  results: {
    url: string;
    title: string;
    content_length: number;
    preview: string;
    login_detected: boolean;
    login_keywords_found: string[];
  }[];
}

export async function ragIngestDebug(
  url: string,
  cookies?: string,
): Promise<IngestDebugResult> {
  const r = await fetch(`${BASE}/ingest/debug`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, max_depth: 0, cookies: cookies || null }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail ?? `HTTP ${r.status}`);
  }
  return r.json();
}

export async function ragIngestUrl(
  url: string,
  maxDepth = 1,
  openaiKey?: string,
  cookies?: string,
): Promise<{ chunks: number }> {
  const r = await fetch(`${BASE}/ingest/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      max_depth: maxDepth,
      openai_key: openaiKey ?? null,
      cookies: cookies || null,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail ?? `HTTP ${r.status}`);
  }
  return r.json();
}

export async function ragListSources(): Promise<SourceInfo[]> {
  const r = await fetch(`${BASE}/sources`);
  const data = await r.json();
  return data.sources ?? [];
}

export async function ragGetChunks(url: string): Promise<ChunkInfo[]> {
  const r = await fetch(`${BASE}/sources/chunks?url=${encodeURIComponent(url)}`);
  const data = await r.json();
  return data.chunks ?? [];
}

export async function ragDeleteSource(url: string): Promise<number> {
  const r = await fetch(`${BASE}/sources?url=${encodeURIComponent(url)}`, {
    method: 'DELETE',
  });
  const data = await r.json();
  return data.deleted ?? 0;
}

// ── Automation Flow ───────────────────────────────────────
export interface FlowRunNode {
  id: string;
  data: Record<string, unknown>;
}

export interface FlowRunEdge {
  id: string;
  source: string;
  target: string;
}

export async function ragIngestFlow(
  url: string,
  nodes: FlowRunNode[],
  edges: FlowRunEdge[],
  openaiKey?: string,
): Promise<{ chunks: number }> {
  const r = await fetch(`${BASE}/ingest/flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, nodes, edges, openai_key: openaiKey ?? null }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail ?? `HTTP ${r.status}`);
  }
  return r.json();
}
