import { useCallback, useState, useMemo, useEffect, useRef, DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type NodeProps,
  type ReactFlowInstance,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Icon from '../common/Icon';
import { ragIngestFlow } from '../../lib/rag-api';

// ─── Node catalogue ───────────────────────────────────────────────────────────

interface NodeDef { label: string; category: string; color: string }

const NODE_DEFS: Record<string, NodeDef> = {
  start:        { label: 'Start',          category: 'Browser',     color: '#6aa6c4' },
  open_url:     { label: 'Open URL',        category: 'Browser',     color: '#6aa6c4' },
  refresh:      { label: 'Refresh',         category: 'Browser',     color: '#6aa6c4' },
  back:         { label: 'Back',            category: 'Browser',     color: '#6aa6c4' },
  end:          { label: 'End',             category: 'Browser',     color: '#d98a6a' },
  click:        { label: 'Click',           category: 'Interaction', color: '#e0a93b' },
  dbl_click:    { label: 'Double Click',    category: 'Interaction', color: '#e0a93b' },
  hover:        { label: 'Hover',           category: 'Interaction', color: '#e0a93b' },
  type_text:    { label: 'Type Text',       category: 'Interaction', color: '#e0a93b' },
  press_key:    { label: 'Press Key',       category: 'Interaction', color: '#e0a93b' },
  wait_time:    { label: 'Wait Time',       category: 'Wait',        color: '#d9e89d' },
  wait_element: { label: 'Wait Element',    category: 'Wait',        color: '#d9e89d' },
  wait_network: { label: 'Wait Network',    category: 'Wait',        color: '#d9e89d' },
  extract_text: { label: 'Extract Text',    category: 'Data',        color: '#6fae5a' },
  extract_html: { label: 'Extract HTML',    category: 'Data',        color: '#6fae5a' },
  screenshot:   { label: 'Screenshot',      category: 'Data',        color: '#6fae5a' },
  save_var:     { label: 'Save Variable',   category: 'Data',        color: '#6fae5a' },
  condition:    { label: 'Condition (If)',  category: 'Logic',       color: '#b07ef5' },
  loop:         { label: 'Loop',            category: 'Logic',       color: '#b07ef5' },
  repeat_until: { label: 'Repeat Until',   category: 'Logic',       color: '#b07ef5' },
  chunk_text:   { label: 'Chunk Text',      category: 'RAG',         color: '#aacb4f' },
  embedding:    { label: 'Embedding',       category: 'RAG',         color: '#aacb4f' },
  save_chroma:  { label: 'Save ChromaDB',   category: 'RAG',         color: '#aacb4f' },
  export_md:    { label: 'Export MD',       category: 'RAG',         color: '#aacb4f' },
  crawl:        { label: 'Crawl trang',     category: 'Data',        color: '#5bbfea' },
};

const CATEGORIES = ['Browser', 'Interaction', 'Wait', 'Data', 'Logic', 'RAG'];

const NODE_ICONS: Record<string, string> = {
  start: '▶', open_url: '↗', refresh: '↺', back: '←', end: '■',
  click: '◎', dbl_click: '◉', hover: '⊙', type_text: 'Aa', press_key: '⌨',
  wait_time: '⏱', wait_element: '⌛', wait_network: '⏳',
  extract_text: '≡', extract_html: '<>', screenshot: '⊡', save_var: '{}', crawl: '⬇',
  condition: '?', loop: '↻', repeat_until: '⟲',
  chunk_text: '⋮', embedding: '⬡', save_chroma: '⬢', export_md: '↓',
};

// ─── Custom node ─────────────────────────────────────────────────────────────

function AutomationNodeComp({ data, selected }: NodeProps) {
  const type      = data.type as string;
  const def       = NODE_DEFS[type] ?? { label: type, color: '#888', category: '' };
  const icon      = NODE_ICONS[type] ?? '◆';
  const isStart   = type === 'start';
  const isEnd     = type === 'end';
  const detailVal = String(data.selector || data.url || data.text || data.key || '');

  const handleStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    background: def.color,
    border: `3px solid #f0ede4`,
    borderRadius: '50%',
    cursor: 'crosshair',
    zIndex: 20,
    boxShadow: `0 0 0 2px ${def.color}55, 0 0 12px ${def.color}70`,
    transition: 'transform 140ms, box-shadow 140ms',
  };

  return (
    /* outer wrapper has NO overflow:hidden so handles are never clipped */
    <div style={{
      position: 'relative',
      background: selected ? 'rgba(30,42,22,0.98)' : 'rgba(18,26,14,0.95)',
      border: `1.5px solid ${selected ? def.color + 'cc' : 'rgba(255,255,255,0.10)'}`,
      borderRadius: 16,
      minWidth: 182,
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: selected
        ? `0 0 0 3px ${def.color}22, 0 16px 40px rgba(2,8,1,0.7)`
        : '0 6px 20px rgba(2,8,1,0.5)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: 'box-shadow 200ms, border-color 200ms',
    }}>

      {/* ── Target handle (top, input) ── */}
      {!isStart && (
        <Handle type="target" position={Position.Top}
          style={{ ...handleStyle, top: -11 }}
        />
      )}

      {/* ── Colored header (own border-radius so no overflow:hidden needed) ── */}
      <div style={{
        padding: '9px 12px 8px',
        background: `linear-gradient(135deg, ${def.color}20 0%, ${def.color}08 100%)`,
        borderBottom: `1px solid ${def.color}18`,
        borderRadius: '15px 15px 0 0',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: `${def.color}20`,
          border: `1.5px solid ${def.color}45`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: def.color, fontWeight: 800,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12.5, fontWeight: 800, color: '#f0efe8',
            letterSpacing: '-0.02em', lineHeight: 1.25,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {(data.label as string) || def.label}
          </div>
        </div>
        <div style={{
          fontSize: 8.5, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: def.color,
          background: `${def.color}18`, border: `1px solid ${def.color}30`,
          padding: '2px 6px', borderRadius: 9999, flexShrink: 0,
        }}>
          {def.category}
        </div>
      </div>

      {/* ── Detail row ── */}
      {detailVal && (
        <div style={{
          padding: '6px 12px 8px', display: 'flex', alignItems: 'center', gap: 6,
          borderRadius: '0 0 15px 15px',
        }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: def.color, flexShrink: 0, opacity: 0.5 }} />
          <div style={{
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
            color: 'rgba(255,255,255,0.38)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {detailVal}
          </div>
        </div>
      )}

      {/* ── Source handles ── */}
      {!isEnd && (() => {
        if (type === 'condition') {
          return (
            <>
              <Handle type="source" id="true" position={Position.Bottom}
                style={{ ...handleStyle, bottom: -11, left: '28%', transform: 'none' }} />
              <Handle type="source" id="false" position={Position.Bottom}
                style={{ ...handleStyle, bottom: -11, left: '72%', transform: 'none' }} />
              <div style={{ position: 'absolute', bottom: -24, left: '14%', fontSize: 9, color: '#6fae5a', fontWeight: 800, pointerEvents: 'none' }}>✓ True</div>
              <div style={{ position: 'absolute', bottom: -24, left: '60%', fontSize: 9, color: '#d98a6a', fontWeight: 800, pointerEvents: 'none' }}>✗ False</div>
            </>
          );
        }
        if (type === 'loop' || type === 'repeat_until') {
          return (
            <>
              <Handle type="source" id="body" position={Position.Bottom}
                style={{ ...handleStyle, bottom: -11, left: '28%', transform: 'none' }} />
              <Handle type="source" id="exit" position={Position.Bottom}
                style={{ ...handleStyle, bottom: -11, left: '72%', transform: 'none' }} />
              <div style={{ position: 'absolute', bottom: -24, left: '14%', fontSize: 9, color: '#e0a93b', fontWeight: 800, pointerEvents: 'none' }}>↻ Body</div>
              <div style={{ position: 'absolute', bottom: -24, left: '62%', fontSize: 9, color: '#b07ef5', fontWeight: 800, pointerEvents: 'none' }}>→ Exit</div>
            </>
          );
        }
        return (
          <Handle type="source" position={Position.Bottom}
            style={{ ...handleStyle, bottom: -11 }} />
        );
      })()}
    </div>
  );
}

// ─── Field components (for light-glass properties panel) ─────────────────────

function FieldInput({ label, value, onChange, mono = false, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean; placeholder?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{
        fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#79836d',
      }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '8px 11px', borderRadius: 12,
          background: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(40,55,30,0.12)',
          color: '#232a1e', fontSize: 12.5, outline: 'none',
          fontFamily: mono ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif",
          transition: 'border-color 140ms',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#aacb4f'; e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(40,55,30,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; }}
      />
    </div>
  );
}

function FieldNumber({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{
        fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#79836d',
      }}>{label}</label>
      <input
        type="number" min={0} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          padding: '8px 11px', borderRadius: 12,
          background: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(40,55,30,0.12)',
          color: '#232a1e', fontSize: 12.5, outline: 'none',
          fontFamily: "'JetBrains Mono', monospace",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#aacb4f'; e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(40,55,30,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; }}
      />
    </div>
  );
}

function FieldToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
      <label style={{
        fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#79836d',
      }}>{label}</label>
      <button
        onClick={() => onChange(!value)}
        style={{
          padding: '4px 12px', borderRadius: 9999, border: 'none', cursor: 'pointer',
          fontSize: 11.5, fontWeight: 700,
          background: value ? 'rgba(111,174,90,0.2)' : 'rgba(40,55,30,0.1)',
          color: value ? '#4b8c3a' : '#79836d',
          transition: 'all 140ms',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {value ? '✓ Bật' : 'Tắt'}
      </button>
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#79836d' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding: '8px 11px', borderRadius: 12,
        background: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(40,55,30,0.12)',
        color: '#232a1e', fontSize: 12.5, outline: 'none',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        cursor: 'pointer',
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Properties panel (light-glass surface) ──────────────────────────────────

function PropertiesPanel({ node, onChange }: { node: Node; onChange: (field: string, value: unknown) => void }) {
  const type = node.data.type as string;
  const def = NODE_DEFS[type] ?? { label: type, color: '#888', category: '' };
  const isStartOrEnd  = type === 'start' || type === 'end';
  const needsSelector = ['click','dbl_click','hover','type_text','wait_element','extract_text','extract_html'].includes(type);
  const needsText     = type === 'type_text';
  const needsKey      = type === 'press_key';
  const needsUrl      = type === 'open_url';
  const isCrawl       = type === 'crawl';
  const needsSaveVar    = type === 'save_var';
  const isCondition     = type === 'condition';
  const isLoop          = type === 'loop';
  const isRepeatUntil   = type === 'repeat_until';
  const isScreenshot    = type === 'screenshot';
  const needsCondFields = isCondition || isRepeatUntil;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingBottom: 12, borderBottom: '1px solid rgba(40,55,30,0.1)',
      }}>
        <span style={{
          width: 11, height: 11, borderRadius: '50%',
          background: def.color, flexShrink: 0,
          boxShadow: `0 0 8px ${def.color}80`,
        }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#232a1e', letterSpacing: '-0.01em' }}>
            Cấu hình node
          </div>
          <div style={{ fontSize: 10.5, color: '#79836d', fontWeight: 600, marginTop: 1 }}>
            {def.category} · {def.label}
          </div>
        </div>
      </div>

      {isStartOrEnd ? (
        <div style={{ fontSize: 12.5, color: '#79836d', textAlign: 'center', padding: '12px 0' }}>
          Node {type === 'start' ? 'bắt đầu' : 'kết thúc'} — không có cấu hình
        </div>
      ) : (
        <>
          <FieldInput
            label="Tên node"
            value={String(node.data.label ?? '')}
            onChange={v => onChange('label', v)}
            placeholder="Nhập tên..."
          />
          {needsSelector && (
            <FieldInput
              label="CSS Selector"
              value={String(node.data.selector ?? '')}
              onChange={v => onChange('selector', v)}
              mono placeholder=".element:nth-child(1)"
            />
          )}
          {needsUrl && (
            <FieldInput
              label="URL"
              value={String(node.data.url ?? '')}
              onChange={v => onChange('url', v)}
              mono placeholder="https://..."
            />
          )}
          {isCrawl && (
            <>
              <div style={{
                padding: '8px 10px', borderRadius: 10,
                background: 'rgba(91,191,234,0.1)',
                border: '1px solid rgba(91,191,234,0.25)',
                fontSize: 11.5, color: '#2a7a9e', lineHeight: 1.55,
              }}>
                Crawl trang hiện tại và <strong>thêm</strong> nội dung mới vào ChromaDB (không xóa dữ liệu cũ).
              </div>
              <FieldNumber
                label="Độ sâu crawl (max_depth)"
                value={Number(node.data.max_depth ?? 0)}
                onChange={v => onChange('max_depth', v)}
              />
              <div style={{ fontSize: 10.5, color: '#79836d', marginTop: -8 }}>
                0 = chỉ trang hiện tại · 1 = trang hiện tại + links con
              </div>
            </>
          )}
          {needsText && (
            <FieldInput
              label="Nội dung nhập"
              value={String(node.data.text ?? '')}
              onChange={v => onChange('text', v)}
              placeholder="Text to type..."
            />
          )}
          {needsKey && (
            <FieldInput
              label="Phím bấm"
              value={String(node.data.key ?? '')}
              onChange={v => onChange('key', v)}
              mono placeholder="Enter, Tab, Escape..."
            />
          )}
          {type === 'wait_time' && (
            <FieldNumber label="Chờ (ms)" value={Number(node.data.wait_ms ?? 800)} onChange={v => onChange('wait_ms', v)} />
          )}
          {['loop','repeat_until'].includes(type) && (
            <FieldNumber label="Số lần lặp" value={Number(node.data.repeat ?? 1)} onChange={v => onChange('repeat', v)} />
          )}
          {!['wait_time','wait_element','wait_network','open_url'].includes(type) && (
            <FieldNumber label="Chờ sau click (ms)" value={Number(node.data.wait_ms ?? 800)} onChange={v => onChange('wait_ms', v)} />
          )}
          {['click','dbl_click','hover'].includes(type) && (
            <FieldNumber label="Lặp lại" value={Number(node.data.repeat ?? 1)} onChange={v => onChange('repeat', v)} />
          )}
          {['click','dbl_click','hover'].includes(type) && (
            <FieldToggle
              label="Đọc nội dung sau thao tác"
              value={Boolean(node.data.capture_content ?? true)}
              onChange={v => onChange('capture_content', v)}
            />
          )}

          {needsSaveVar && (
            <>
              <FieldInput label="Tên biến" value={String(node.data.var_name ?? '')} onChange={v => onChange('var_name', v)} mono placeholder="my_var" />
              <FieldInput label="CSS Selector (tuỳ chọn)" value={String(node.data.selector ?? '')} onChange={v => onChange('selector', v)} mono placeholder=".value-element" />
              <FieldInput label="Attribute (tuỳ chọn)" value={String(node.data.attribute ?? '')} onChange={v => onChange('attribute', v)} mono placeholder="href, value, data-id..." />
              <FieldInput label="Regex extract (tuỳ chọn)" value={String(node.data.regex ?? '')} onChange={v => onChange('regex', v)} mono placeholder="(\d+)" />
              <div style={{ fontSize: 11, color: '#79836d', lineHeight: 1.55 }}>
                Dùng <code style={{ background: 'rgba(40,55,30,0.08)', padding: '1px 4px', borderRadius: 4 }}>{'{{my_var}}'}</code> trong các node sau để dùng lại giá trị.
              </div>
            </>
          )}

          {needsCondFields && (
            <>
              <FieldSelect
                label="Điều kiện"
                value={String(node.data.condition_type ?? 'element_exists')}
                onChange={v => onChange('condition_type', v)}
                options={[
                  { value: 'element_exists', label: 'Element tồn tại' },
                  { value: 'page_contains',  label: 'Trang chứa text' },
                  { value: 'var_equals',     label: 'Biến = giá trị' },
                  { value: 'url_contains',   label: 'URL chứa text' },
                ]}
              />
              {(node.data.condition_type === 'element_exists' || !node.data.condition_type) && (
                <FieldInput label="CSS Selector" value={String(node.data.selector ?? '')} onChange={v => onChange('selector', v)} mono placeholder=".element" />
              )}
              {node.data.condition_type === 'page_contains' && (
                <FieldInput label="Text cần tìm" value={String(node.data.expected ?? '')} onChange={v => onChange('expected', v)} placeholder="Nội dung trang chứa..." />
              )}
              {node.data.condition_type === 'var_equals' && (
                <>
                  <FieldInput label="Tên biến" value={String(node.data.var_name ?? '')} onChange={v => onChange('var_name', v)} mono placeholder="my_var" />
                  <FieldInput label="Giá trị mong đợi" value={String(node.data.expected ?? '')} onChange={v => onChange('expected', v)} placeholder="expected value" />
                </>
              )}
              {node.data.condition_type === 'url_contains' && (
                <FieldInput label="URL chứa" value={String(node.data.expected ?? '')} onChange={v => onChange('expected', v)} mono placeholder="/page/detail" />
              )}
              {isRepeatUntil && (
                <FieldNumber label="Lặp tối đa" value={Number(node.data.max_repeat ?? 10)} onChange={v => onChange('max_repeat', v)} />
              )}
              {isCondition && (
                <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(176,126,245,0.1)', border: '1px solid rgba(176,126,245,0.25)', fontSize: 11, color: '#7a4eb5', lineHeight: 1.55 }}>
                  Kéo từ handle <strong>✓ True</strong> sang node đúng, <strong>✗ False</strong> sang node sai.
                </div>
              )}
            </>
          )}

          {isScreenshot && (
            <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(111,174,90,0.1)', border: '1px solid rgba(111,174,90,0.25)', fontSize: 11.5, color: '#4b8c3a', lineHeight: 1.55 }}>
              Lưu toàn bộ nội dung text trang hiện tại vào ChromaDB.
            </div>
          )}

          {/* Suppress unused variable warnings for isLoop */}
          {isLoop && null}

          <FieldToggle
            label="Bỏ qua lỗi"
            value={Boolean(node.data.continue_on_error ?? true)}
            onChange={v => onChange('continue_on_error', v)}
          />
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onComplete: (url: string, chunks: number) => void;
  openaiKey?: string;
  geminiKey?: string;
}

export default function AutomationFlowBuilder({ onClose, onComplete, openaiKey, geminiKey }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [url, setUrl] = useState('');
  const [cookies, setCookies] = useState('');
  const [showCookies, setShowCookies] = useState(false);
  const [cookiePos, setCookiePos] = useState({ top: 0, right: 0 });
  const cookieBtnRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null);

  const nodeTypes = useMemo<NodeTypes>(() => ({ automation: AutomationNodeComp }), []);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges(eds => addEdge({
        ...connection, animated: true,
        style: { stroke: 'rgba(80,110,40,0.55)', strokeWidth: 2 },
      }, eds)),
    [setEdges],
  );

  const onDragStart = (e: DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type || !rfInstance) return;
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addNewNode(type, position);
  }, [rfInstance]); // eslint-disable-line

  const addNewNode = useCallback((type: string, position?: { x: number; y: number }) => {
    const def = NODE_DEFS[type] ?? { label: type, color: '#888' };
    const pos = position ?? { x: 220 + Math.random() * 140, y: 80 + Math.random() * 100 };
    setNodes(nds => [...nds, {
      id: `${type}-${Date.now()}`,
      type: 'automation',
      position: pos,
      data: { type, label: def.label, selector: '', wait_ms: 800, repeat: 1, continue_on_error: true, capture_content: true, max_depth: 0 },
    }]);
  }, [setNodes]);

  const onNodeClick  = useCallback((_: unknown, node: Node) => setSelectedNode(node), []);
  const onPaneClick  = useCallback(() => setSelectedNode(null), []);

  const updateNodeData = useCallback((id: string, field: string, value: unknown) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n));
    setSelectedNode(prev => prev?.id === id ? { ...prev, data: { ...prev.data, [field]: value } } : prev);
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setSelectedNode(prev => prev?.id === id ? null : prev);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (showCookies && cookieBtnRef.current) {
      const rect = cookieBtnRef.current.getBoundingClientRect();
      setCookiePos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
  }, [showCookies]);

  // Delete/Backspace khi node đang được chọn
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement)) {
        setSelectedNode(prev => {
          if (prev) deleteNode(prev.id);
          return null;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteNode]);

  const handleRun = async () => {
    if (!url.trim()) { setRunStatus({ type: 'error', msg: 'Nhập URL trước khi chạy' }); return; }
    if (nodes.length === 0) { setRunStatus({ type: 'error', msg: 'Thêm ít nhất một node' }); return; }
    setRunning(true); setRunStatus(null);
    try {
      const res = await ragIngestFlow(
        url.trim(),
        nodes.map(n => ({ id: n.id, data: n.data as Record<string, unknown> })),
        edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null })),
        openaiKey,
        geminiKey,
        cookies.trim() || undefined,
      );
      setRunStatus({ type: 'ok', msg: `Xong! Lưu được ${res.chunks} chunks` });
      onComplete(url.trim(), res.chunks);
    } catch (e) {
      setRunStatus({ type: 'error', msg: e instanceof Error ? e.message : 'Lỗi không xác định' });
    } finally {
      setRunning(false);
    }
  };

  const handleExport = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ url, nodes, edges }, null, 2)], { type: 'application/json' }));
    a.download = 'workflow.json'; a.click();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const d = JSON.parse(ev.target?.result as string);
          if (d.url) setUrl(d.url);
          if (d.nodes) setNodes(d.nodes);
          if (d.edges) setEdges(d.edges);
        } catch { /* invalid */ }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    /* ── Backdrop ── */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(6,12,4,0.72)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      animation: 'flow-backdrop 260ms ease both',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
    {/* ── Modal ── */}
    <div style={{
      width: 'clamp(860px, 90vw, 1600px)',
      height: 'clamp(600px, 86vh, 960px)',
      display: 'flex', flexDirection: 'column',
      borderRadius: 26,
      overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(4,10,2,0.7), 0 8px 24px rgba(4,10,2,0.4)',
      border: '1px solid rgba(255,255,255,0.08)',
      animation: 'flow-enter 320ms cubic-bezier(0.34,1.56,0.64,1) both',
    }}>

      {/* ── Style overrides ── */}
      <style>{`
        @keyframes flow-backdrop { from { opacity: 0; } to { opacity: 1; } }
        @keyframes flow-enter { from { transform: translateY(16px) scale(0.97); opacity: 0; } to { transform: none; opacity: 1; } }
        .flow-wrap .react-flow { background: transparent !important; }
        .flow-wrap .react-flow__attribution { display: none !important; }
        .flow-wrap .react-flow__controls {
          background: rgba(255,255,255,0.88) !important;
          border: 1px solid rgba(40,55,30,0.15) !important;
          border-radius: 14px !important; overflow: hidden;
          box-shadow: 0 4px 16px rgba(40,55,30,0.12) !important;
        }
        .flow-wrap .react-flow__controls-button {
          background: transparent !important; border: none !important;
          color: rgba(40,55,30,0.6) !important;
          fill: rgba(40,55,30,0.6) !important;
        }
        .flow-wrap .react-flow__controls-button svg { fill: rgba(40,55,30,0.6) !important; }
        .flow-wrap .react-flow__controls-button:hover {
          background: rgba(170,203,79,0.15) !important;
          color: #4b6b1a !important; fill: #4b6b1a !important;
        }
        .flow-wrap .react-flow__controls-button:hover svg { fill: #4b6b1a !important; }
        .flow-wrap .react-flow__edge-path { stroke: rgba(80,110,40,0.5) !important; }
        .flow-wrap .react-flow__edge.selected .react-flow__edge-path { stroke: #7aab30 !important; stroke-width: 2.5px !important; }
        .flow-wrap .react-flow__handle {
          transition: transform 140ms, box-shadow 140ms !important;
          opacity: 1 !important;
        }
        .flow-wrap .react-flow__handle:hover {
          transform: scale(1.55) !important;
          filter: brightness(1.35) !important;
        }
        .flow-wrap .react-flow__handle-connecting { transform: scale(1.45) !important; }
        .flow-wrap .react-flow__handle-valid {
          transform: scale(1.6) !important;
          filter: brightness(1.6) !important;
        }
        .flow-url-input::placeholder { color: rgba(255,255,255,0.3); }
        .flow-node-item:active { transform: scale(0.97); }
      `}</style>

      {/* ── Header (darkglass chrome) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px',
        background: 'rgba(28,38,22,0.72)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        flexShrink: 0,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9999,
            background: 'rgba(217,232,157,0.15)',
            border: '1px solid rgba(217,232,157,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Automation Flow Builder
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(217,232,157,0.65)', fontWeight: 600, letterSpacing: '0.04em' }}>
              Kéo thả · Kết nối · Chạy tự động
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* URL input */}
        <div style={{ position: 'relative', width: 380 }}>
          <div style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', fontSize: 13,
          }}>
            <Icon name="globe" size={14} />
          </div>
          <input
            className="flow-url-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://trang-cần-crawl.com"
            style={{
              width: '100%', padding: '8px 12px 8px 32px', borderRadius: 12,
              background: 'rgba(255,255,255,0.09)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff', fontSize: 12.5, outline: 'none',
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'border-color 140ms',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(217,232,157,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
          />
        </div>

        {/* Cookie toggle + input */}
        <div ref={cookieBtnRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCookies(v => !v)}
            title="Nhập cookie để truy cập trang cần đăng nhập"
            style={{
              height: 36, padding: '0 12px', borderRadius: 10, cursor: 'pointer',
              background: cookies.trim() ? 'rgba(170,203,79,0.25)' : 'rgba(255,255,255,0.09)',
              border: `1px solid ${cookies.trim() ? 'rgba(170,203,79,0.45)' : 'rgba(255,255,255,0.14)'}`,
              color: cookies.trim() ? '#d9e89d' : 'rgba(255,255,255,0.45)',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 140ms', flexShrink: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            } as React.CSSProperties}
          >
            🍪 {cookies.trim() ? 'Cookie đã có' : 'Cookie'}
          </button>

          {showCookies && (
            <div style={{
              position: 'fixed', top: cookiePos.top, right: cookiePos.right, zIndex: 9999,
              width: 420, padding: '14px 14px 12px',
              background: 'rgba(22,32,18,0.97)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              boxShadow: '0 16px 40px rgba(4,10,2,0.7)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(217,232,157,0.6)', marginBottom: 8 }}>
                Cookie (copy từ DevTools → Application → Cookies)
              </div>
              <textarea
                value={cookies}
                onChange={e => setCookies(e.target.value)}
                placeholder={'session=abc123; token=xyz; auth=...'}
                rows={4}
                style={{
                  width: '100%', padding: '9px 11px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#d9e89d', fontSize: 11.5, outline: 'none', resize: 'vertical',
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1.6, boxSizing: 'border-box',
                } as React.CSSProperties}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(217,232,157,0.4)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1, fontSize: 10.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.55 }}>
                  Playwright sẽ inject cookie vào browser trước khi mở URL.
                </div>
                <button
                  onClick={() => { setCookies(''); }}
                  style={{
                    padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(217,90,60,0.15)', color: '#d98a6a',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Xóa
                </button>
                <button
                  onClick={() => setShowCookies(false)}
                  style={{
                    padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(170,203,79,0.15)', color: '#aacb4f',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Xong
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: 9999, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 140ms', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,90,60,0.25)'; e.currentTarget.style.color = '#f0a090'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: Node Library (darkglass rail) */}
        <div style={{
          width: 192, flexShrink: 0,
          background: 'rgba(22,32,18,0.82)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          overflowY: 'auto', padding: '14px 10px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(217,232,157,0.5)',
            paddingLeft: 4,
          }}>Node Library</div>

          {CATEGORIES.map(cat => {
            const items = Object.entries(NODE_DEFS).filter(([, d]) => d.category === cat);
            const catColor = items[0]?.[1].color ?? '#888';
            return (
              <div key={cat}>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: catColor,
                  marginBottom: 6, paddingLeft: 4,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
                  {cat}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {items.map(([type, def]) => (
                    <div
                      key={type}
                      className="flow-node-item"
                      draggable
                      onDragStart={e => onDragStart(e, type)}
                      onClick={() => addNewNode(type)}
                      style={{
                        padding: '6px 9px', borderRadius: 9999, cursor: 'grab',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        display: 'flex', alignItems: 'center', gap: 7,
                        fontSize: 11.5, color: 'rgba(255,255,255,0.72)',
                        fontWeight: 600, transition: 'all 130ms', userSelect: 'none',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = `${def.color}18`;
                        e.currentTarget.style.borderColor = `${def.color}44`;
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.72)';
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: def.color, flexShrink: 0 }} />
                      {def.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: Canvas */}
        <div className="flow-wrap" style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver} onDrop={onDrop}
            onInit={setRfInstance}
            onNodeClick={onNodeClick} onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ maxZoom: 0.85, padding: 0.3 }}
            defaultViewport={{ x: 60, y: 40, zoom: 0.75 }}
            minZoom={0.3}
            maxZoom={1.5}
            deleteKeyCode="Delete"
            style={{ background: '#f0ede4' }}
          >
            <Background variant={BackgroundVariant.Dots} color="rgba(60,80,40,0.18)" gap={22} size={1.4} />
            <Controls />
          </ReactFlow>

          {nodes.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
              gap: 10,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 9999,
                background: 'rgba(217,232,157,0.06)',
                border: '1px solid rgba(217,232,157,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, opacity: 0.6,
              }}>⚡</div>
              <div style={{ fontSize: 14, color: 'rgba(40,55,30,0.4)', fontWeight: 700 }}>
                Kéo node từ thư viện vào đây
              </div>
              <div style={{ fontSize: 12, color: 'rgba(40,55,30,0.28)', fontWeight: 500 }}>
                hoặc click vào tên node để thêm
              </div>
            </div>
          )}
        </div>

        {/* Right: Properties (light-glass panel) */}
        {selectedNode && (
          <div style={{
            width: 264, flexShrink: 0,
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255,255,255,0.6)',
            boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.55)',
            padding: '18px 16px', overflowY: 'auto',
            animation: 'panel-in 220ms cubic-bezier(0.4,0,0.2,1) both',
          }}>
            <style>{`@keyframes panel-in { from { transform: translateX(14px); } to { transform: none; } }`}</style>
            <PropertiesPanel
              node={selectedNode}
              onChange={(field, value) => updateNodeData(selectedNode.id, field, value)}
            />
            {/* Nút xóa node */}
            <button
              onClick={() => deleteNode(selectedNode.id)}
              style={{
                marginTop: 18, width: '100%',
                padding: '8px 0', borderRadius: 10,
                background: 'rgba(217,90,60,0.1)',
                border: '1.5px solid rgba(217,90,60,0.25)',
                color: '#c0502a', fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'all 140ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,90,60,0.2)'; e.currentTarget.style.borderColor = 'rgba(217,90,60,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(217,90,60,0.1)'; e.currentTarget.style.borderColor = 'rgba(217,90,60,0.25)'; }}
            >
              <Icon name="trash" size={13} /> Xóa node
            </button>
          </div>
        )}
      </div>

      {/* ── Footer (darkglass chrome) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px',
        background: 'rgba(28,38,22,0.72)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        flexShrink: 0,
      }}>
        <button
          onClick={handleRun}
          disabled={running}
          className="btn btn-primary btn-sm"
          style={{ gap: 6, minWidth: 88 }}
        >
          {running
            ? <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', border: '2.5px solid var(--accent-ink)', borderTopColor: 'transparent', animation: 'rag-spin 0.7s linear infinite' }} />
            : <span style={{ fontSize: 11 }}>▶</span>
          }
          {running ? 'Đang chạy...' : 'Chạy flow'}
        </button>

        <button onClick={handleExport} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Export JSON
        </button>
        <button onClick={handleImport} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Import JSON
        </button>

        {runStatus && (
          <div style={{
            marginLeft: 8, padding: '5px 12px', borderRadius: 9999,
            background: runStatus.type === 'ok' ? 'rgba(111,174,90,0.18)' : 'rgba(217,138,106,0.18)',
            border: `1px solid ${runStatus.type === 'ok' ? 'rgba(111,174,90,0.3)' : 'rgba(217,138,106,0.3)'}`,
            color: runStatus.type === 'ok' ? '#6fae5a' : '#d98a6a',
            fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {runStatus.type === 'ok' ? '✓' : '✗'} {runStatus.msg}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.25)',
          fontFamily: "'JetBrains Mono', monospace",
          display: 'flex', gap: 10,
        }}>
          <span>{nodes.length} nodes</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{edges.length} edges</span>
          {selectedNode && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{ color: 'rgba(217,232,157,0.5)' }}>1 selected</span>
            </>
          )}
        </div>
      </div>
    </div>{/* end modal */}
    </div>/* end backdrop */
  );
}
