import { useState, useMemo, useRef, useEffect } from 'react';
import Icon from '../common/Icon';
import type { CrossExamResult } from '../../types/writing-scorer';
import writingData from '../../public/data/exams/writing-part4.json';

interface Props { results: CrossExamResult[] }

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExamNode {
  examId: string;
  examTitle: string;
  connections: Array<{
    solutionId: string;
    applicability: 'direct' | 'with_modification';
    supplementSentences: string[];
  }>;
}

interface PopupInfo {
  examId: string;
  examTitle: string;
  connections: ExamNode['connections'];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripHtml(h: string) {
  return h.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
function findExam(id: string) {
  return (writingData as any[]).find(e => e._id === id) ?? null;
}
function buildExamNodes(results: CrossExamResult[]): ExamNode[] {
  const map = new Map<string, ExamNode>();
  for (const r of results) {
    for (const ea of r.applicableExams) {
      if (!map.has(ea.examId))
        map.set(ea.examId, { examId: ea.examId, examTitle: ea.examTitle, connections: [] });
      map.get(ea.examId)!.connections.push({
        solutionId: r.solutionId,
        applicability: ea.applicability as any,
        supplementSentences: ea.supplementSentences ?? [],
      });
    }
  }
  return Array.from(map.values());
}

// ── Layout constants ──────────────────────────────────────────────────────────
const SOL_W = 172;
const SOL_H = 48;
const SOL_GAP = 10;
const EXAM_W = 152;
const EXAM_H = 46;

// ── Popup Modal ───────────────────────────────────────────────────────────────
function ExamPopup({ info, onClose }: { info: PopupInfo; onClose: () => void }) {
  const exam = findExam(info.examId);
  const q = exam?.questions?.[0];
  const scenario = q?.content ? stripHtml(q.content) : '';
  const sub0: string = q?.subQuestion?.[0]?.content ?? '';
  const sub1: string = q?.subQuestion?.[1]?.content ?? '';

  return (
    /* Overlay — covers entire wrapperRef div, flexbox centers the modal */
    <div style={{
      position: 'absolute', inset: 0, zIndex: 9998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 'inherit',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(10,18,8,0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          borderRadius: 'inherit',
          animation: 'screen-in 150ms var(--ease) both',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: 360,
        maxWidth: '90%',
        maxHeight: '80%',
        overflowY: 'auto',
        background: '#fff',
        border: '1.5px solid #d8e6b8',
        borderRadius: 'var(--r-lg)',
        boxShadow: '0 16px 48px rgba(20,30,12,0.22)',
        animation: 'screen-in 160ms var(--ease) both',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '14px 16px 12px',
          borderBottom: '1px solid #e8f0d4',
          background: '#f4fae8',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          position: 'sticky', top: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Đề thi</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.35 }}>{info.examTitle}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              flexShrink: 0, width: 28, height: 28,
              borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(20,30,12,0.07)', color: 'var(--ink-3)',
              display: 'grid', placeItems: 'center',
              transition: 'background 130ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(20,30,12,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(20,30,12,0.07)'; }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Connections */}
          {info.connections.map((c, i) => {
            const supp = c.supplementSentences;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{
                  alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, padding: '2px 9px',
                  borderRadius: 'var(--r-pill)',
                  background: c.applicability === 'direct' ? 'rgba(111,174,90,0.18)' : 'rgba(224,169,59,0.18)',
                  color: c.applicability === 'direct' ? 'var(--good)' : 'var(--warn)',
                }}>
                  {c.applicability === 'direct' ? 'Dùng thẳng' : 'Cần chỉnh nhẹ'}
                </span>

                {supp.length > 0 && (
                  <div style={{
                    background: 'rgba(106,166,196,0.10)',
                    border: '1px solid rgba(106,166,196,0.28)',
                    borderRadius: 'var(--r-sm)',
                    padding: '10px 12px',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="sparkle" size={10} style={{ color: 'var(--info)' }} />
                      Câu bổ sung
                    </p>
                    {supp.map((s, j) => (
                      <span key={j} style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1.6, paddingLeft: 4 }}>{s}</span>
                    ))}
                  </div>
                )}

                {i < info.connections.length - 1 && (
                  <div style={{ height: 1, background: '#e8f0d4', margin: '2px 0' }} />
                )}
              </div>
            );
          })}

          {/* Scenario */}
          {scenario && (
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tình huống</p>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6, background: '#f9fcf2', borderRadius: 'var(--r-sm)', border: '1px solid #e8f0d4', padding: '10px 12px' }}>
                {scenario.length > 260 ? scenario.slice(0, 260) + '…' : scenario}
              </p>
            </div>
          )}

          {/* Tasks */}
          {(sub0 || sub1) && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nhiệm vụ</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[sub0, sub1].filter(Boolean).map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, marginTop: 2 }}>{i + 1}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CrossExamDiagram({ results }: Props) {
  const [selectedExam, setSelectedExam] = useState<PopupInfo | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const withApplicable = useMemo(() => results.filter(r => r.applicableExams.length > 0), [results]);
  const examNodes      = useMemo(() => buildExamNodes(results), [results]);

  // ── Layout math ─────────────────────────────────────────────────────────────
  const layout = useMemo(() => {
    const M = withApplicable.length;
    const N = examNodes.length;
    if (M === 0 || N === 0) return null;

    const RX = Math.max(200, N * 26);
    const RY = Math.max(160, Math.max(M * (SOL_H + SOL_GAP), N * 20));

    const CW = RX * 2 + EXAM_W + 24;
    const CH = RY * 2 + EXAM_H + 24;
    const CX = CW / 2;
    const CY = CH / 2;

    const totalSolH = M * SOL_H + (M - 1) * SOL_GAP;
    const solutions = withApplicable.map((r, i) => ({
      id: r.solutionId,
      idea: r.solutionIdea,
      x: CX - SOL_W / 2,
      y: CY - totalSolH / 2 + i * (SOL_H + SOL_GAP),
      cy: CY - totalSolH / 2 + i * (SOL_H + SOL_GAP) + SOL_H / 2,
    }));

    const exams = examNodes.map((node, i) => {
      const angle = (2 * Math.PI / N) * i - Math.PI / 2;
      const ecx = CX + RX * Math.cos(angle);
      const ecy = CY + RY * Math.sin(angle);
      return { ...node, x: ecx - EXAM_W / 2, y: ecy - EXAM_H / 2, cx: ecx, cy: ecy };
    });

    const lines: Array<{ path: string; applicability: string; key: string }> = [];
    for (const r of withApplicable) {
      const sol = solutions.find(s => s.id === r.solutionId);
      if (!sol) continue;
      for (const ea of r.applicableExams) {
        const ex = exams.find(e => e.examId === ea.examId);
        if (!ex) continue;
        const sx = sol.x + SOL_W / 2;
        const sy = sol.cy;
        const ex2 = ex.cx;
        const ey = ex.cy;
        const mx = (sx + ex2) / 2;
        lines.push({
          path: `M ${sx} ${sy} Q ${mx} ${(sy + ey) / 2}, ${ex2} ${ey}`,
          applicability: ea.applicability,
          key: `${r.solutionId}-${ea.examId}`,
        });
      }
    }

    return { CW, CH, CX, CY, solutions, exams, lines };
  }, [withApplicable, examNodes]);

  if (!layout || withApplicable.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center', background: 'rgba(106,166,196,0.08)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(106,166,196,0.18)' }}>
        <span style={{ fontSize: 13, color: 'var(--info)' }}>Các ý tưởng trong bài khá đặc thù — chưa tìm thấy đề nào có thể áp dụng tương tự.</span>
      </div>
    );
  }

  const { CW, CH, solutions, exams, lines } = layout;
  const scale = containerWidth > 0 ? Math.min(1, containerWidth / CW) : 1;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="var(--good)" strokeWidth="2"/></svg>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Dùng thẳng</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="var(--warn)" strokeWidth="2" strokeDasharray="5 3"/></svg>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Cần chỉnh nhẹ</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="eye" size={11} /> Nhấn vào đề để xem chi tiết
        </span>
      </div>

      {/* Diagram canvas — scales to fit container width */}
      <div style={{ width: '100%', height: CH * scale, overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: CW, height: CH, transformOrigin: 'top left', transform: `scale(${scale})` }}>

          {/* SVG lines */}
          <svg style={{ position: 'absolute', inset: 0, width: CW, height: CH, pointerEvents: 'none', overflow: 'visible' }}>
            {lines.map(l => (
              <path
                key={l.key}
                d={l.path}
                fill="none"
                stroke={l.applicability === 'direct' ? 'var(--good)' : 'var(--warn)'}
                strokeWidth={1.6}
                strokeDasharray={l.applicability === 'with_modification' ? '5 4' : undefined}
                opacity={0.45}
              />
            ))}
          </svg>

          {/* Solution nodes — center */}
          {solutions.map(sol => (
            <div
              key={sol.id}
              style={{
                position: 'absolute', left: sol.x, top: sol.y,
                width: SOL_W, height: SOL_H,
                padding: '0 13px',
                borderRadius: 'var(--r-md)',
                background: 'var(--accent)',
                border: '2px solid var(--accent-deep)',
                boxShadow: '0 2px 12px rgba(120,170,40,0.28)',
                display: 'flex', alignItems: 'center', gap: 8,
                zIndex: 2,
              }}
            >
              <Icon name="lightbulb" size={14} style={{ color: 'var(--accent-ink)', flexShrink: 0 }} />
              <span style={{
                fontSize: 12, fontWeight: 800, color: 'var(--accent-ink)',
                lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
              }}>
                {sol.idea}
              </span>
            </div>
          ))}

          {/* Exam nodes — on ellipse */}
          {exams.map(ex => {
            const hasModified = ex.connections.some(c => c.applicability === 'with_modification');
            const isSelected = selectedExam?.examId === ex.examId;

            return (
              <div
                key={ex.examId}
                style={{
                  position: 'absolute', left: ex.x, top: ex.y,
                  width: EXAM_W, zIndex: 3, cursor: 'pointer',
                }}
                onClick={() => setSelectedExam({
                  examId: ex.examId,
                  examTitle: ex.examTitle,
                  connections: ex.connections,
                })}
              >
                <div style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--r-sm)',
                  background: isSelected ? (hasModified ? '#fffbe8' : '#f0fbe6') : '#fff',
                  border: `1.5px solid ${isSelected ? (hasModified ? 'var(--warn)' : 'var(--good)') : (hasModified ? 'rgba(224,169,59,0.45)' : '#d0e3a0')}`,
                  boxShadow: isSelected ? '0 4px 16px rgba(20,30,12,0.13)' : '0 1px 4px rgba(20,30,12,0.07)',
                  transition: 'all 150ms',
                  display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ex.examTitle}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, alignSelf: 'flex-start',
                    padding: '1px 7px', borderRadius: 'var(--r-pill)',
                    background: hasModified ? 'rgba(224,169,59,0.15)' : 'rgba(111,174,90,0.15)',
                    color: hasModified ? 'var(--warn)' : 'var(--good)',
                  }}>
                    {hasModified ? 'Cần chỉnh' : 'Dùng thẳng'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Click popup — centered modal */}
      {selectedExam && (
        <ExamPopup info={selectedExam} onClose={() => setSelectedExam(null)} />
      )}
    </div>
  );
}
