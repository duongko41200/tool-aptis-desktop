import { useState } from 'react';
import Icon from '../common/Icon';
import type { CrossExamResult } from '../../types/writing-scorer';
import writingData from '../../public/data/exams/writing-part4.json';

interface Props {
  results: CrossExamResult[];
}

interface MatrixCell {
  applicability: 'direct' | 'with_modification';
  supplementSentences: string[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function findExam(examId: string) {
  return (writingData as any[]).find((e: any) => e._id === examId) ?? null;
}

function buildMatrix(results: CrossExamResult[]) {
  const solutions = results.filter(r => r.applicableExams.length > 0);
  const examMap = new Map<string, string>(); // examId → examTitle
  const cells = new Map<string, MatrixCell>(); // `sId-eId` → cell

  for (const r of solutions) {
    for (const ea of r.applicableExams) {
      examMap.set(ea.examId, ea.examTitle);
      cells.set(`${r.solutionId}-${ea.examId}`, {
        applicability: ea.applicability as 'direct' | 'with_modification',
        supplementSentences: ea.supplementSentences ?? [],
      });
    }
  }

  const exams = Array.from(examMap.entries()).map(([id, title]) => ({ id, title }));
  return { solutions, exams, cells };
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
interface TooltipData {
  examId: string;
  cell: MatrixCell;
  rect: DOMRect;
  containerRect: DOMRect;
}

function CellTooltip({ data }: { data: TooltipData }) {
  const exam = findExam(data.examId);
  const { cell, rect, containerRect } = data;

  const q = exam?.questions?.[0];
  const scenario = q?.content ? stripHtml(q.content) : '';
  const sub0: string = q?.subQuestion?.[0]?.content ?? '';
  const sub1: string = q?.subQuestion?.[1]?.content ?? '';

  const TOOLTIP_W = 280;
  let left = rect.left - containerRect.left + rect.width / 2 - TOOLTIP_W / 2;
  left = Math.max(8, Math.min(left, containerRect.width - TOOLTIP_W - 8));
  const top = rect.bottom - containerRect.top + 8;

  return (
    <div style={{
      position: 'absolute', left, top, width: TOOLTIP_W, zIndex: 30,
      background: '#fff', border: '1px solid #d8e6b8',
      borderRadius: 'var(--r-md)',
      boxShadow: '0 8px 28px rgba(20,30,12,0.16)',
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none',
      animation: 'screen-in 130ms var(--ease) both',
    }}>
      {/* Badge */}
      <span style={{
        alignSelf: 'flex-start',
        fontSize: 10, fontWeight: 800, padding: '2px 9px',
        borderRadius: 'var(--r-pill)',
        background: cell.applicability === 'direct' ? 'rgba(111,174,90,0.18)' : 'rgba(224,169,59,0.18)',
        color: cell.applicability === 'direct' ? 'var(--good)' : 'var(--warn)',
      }}>
        {cell.applicability === 'direct' ? 'Dùng thẳng' : 'Cần chỉnh nhẹ'}
      </span>

      {/* Supp sentences */}
      {cell.supplementSentences.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Câu bổ sung
          </p>
          {cell.supplementSentences.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <Icon name="sparkle" size={10} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontSize: 12, color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.5 }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Exam content */}
      {scenario && (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tình huống
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            {scenario.length > 160 ? scenario.slice(0, 160) + '…' : scenario}
          </p>
        </div>
      )}
      {(sub0 || sub1) && (
        <div>
          <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Nhiệm vụ
          </p>
          {[sub0, sub1].filter(Boolean).map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 3 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 800, marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dot ───────────────────────────────────────────────────────────────────────
function Dot({ applicability }: { applicability: 'direct' | 'with_modification' }) {
  const isDirect = applicability === 'direct';
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: isDirect ? 'rgba(111,174,90,0.18)' : 'rgba(224,169,59,0.18)',
      border: `2px solid ${isDirect ? 'var(--good)' : 'var(--warn)'}`,
      display: 'grid', placeItems: 'center',
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: isDirect ? 'var(--good)' : 'var(--warn)',
      }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CrossExamMatrix({ results }: Props) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  const { solutions, exams, cells } = buildMatrix(results);

  if (solutions.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center', background: 'rgba(106,166,196,0.08)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(106,166,196,0.18)' }}>
        <span style={{ fontSize: 13, color: 'var(--info)' }}>Chưa có dữ liệu phân tích.</span>
      </div>
    );
  }

  const COL_W = 72;
  const ROW_H = 52;
  const LABEL_W = 200;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Dot applicability="direct" />
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Dùng thẳng</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Dot applicability="with_modification" />
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Cần chỉnh nhẹ</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="eye" size={11} />
          Hover ô để xem chi tiết
        </span>
      </div>

      {/* Matrix */}
      <div
        ref={setContainerEl}
        style={{ position: 'relative', overflowX: 'auto', overflowY: 'visible' }}
      >
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: LABEL_W + exams.length * COL_W }}>

          {/* Header row — exam titles */}
          <thead>
            <tr>
              {/* Empty corner */}
              <th style={{ width: LABEL_W, minWidth: LABEL_W }} />
              {exams.map(exam => (
                <th
                  key={exam.id}
                  style={{ width: COL_W, minWidth: COL_W, padding: '0 4px 10px', verticalAlign: 'bottom' }}
                >
                  <div style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    fontSize: 11, fontWeight: 700, color: 'var(--ink-2)',
                    maxHeight: 100, overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                    textAlign: 'left',
                  }}>
                    {exam.title}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body rows — solutions × exams */}
          <tbody>
            {solutions.map((sol, ri) => (
              <tr key={sol.solutionId} style={{ background: ri % 2 === 0 ? 'rgba(238,245,214,0.5)' : 'rgba(255,255,255,0.6)' }}>

                {/* Solution label */}
                <td style={{ padding: '0 12px 0 4px', height: ROW_H, verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Icon name="lightbulb" size={12} style={{ color: 'var(--info)', flexShrink: 0 }} />
                    <span style={{
                      fontSize: 12.5, fontWeight: 700, color: 'var(--ink)',
                      lineHeight: 1.35, display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                      overflow: 'hidden',
                    }}>
                      {sol.solutionIdea}
                    </span>
                  </div>
                </td>

                {/* Cells */}
                {exams.map(exam => {
                  const cell = cells.get(`${sol.solutionId}-${exam.id}`);
                  return (
                    <td
                      key={exam.id}
                      style={{
                        textAlign: 'center', verticalAlign: 'middle',
                        height: ROW_H, cursor: cell ? 'pointer' : 'default',
                        borderLeft: '1px solid rgba(216,230,184,0.6)',
                        transition: 'background 140ms',
                      }}
                      onMouseEnter={e => {
                        if (!cell || !containerEl) return;
                        e.currentTarget.style.background = 'rgba(180,210,80,0.12)';
                        setTooltip({
                          examId: exam.id,
                          cell,
                          rect: e.currentTarget.getBoundingClientRect(),
                          containerRect: containerEl.getBoundingClientRect(),
                        });
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '';
                        setTooltip(null);
                      }}
                    >
                      {cell ? <Dot applicability={cell.applicability} /> : (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(180,200,150,0.25)', margin: '0 auto' }} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tooltip */}
        {tooltip && containerEl && (
          <CellTooltip data={tooltip} />
        )}
      </div>
    </div>
  );
}
