import { useState } from 'react';
import Icon from '../common/Icon';
import type { CrossExamResult } from '../../types/writing-scorer';
import writingData from '../../public/data/exams/writing-part4.json';

interface Props {
  results: CrossExamResult[];
}

const BADGE: Record<string, { label: string; color: string; bg: string }> = {
  direct:            { label: 'Dùng thẳng',    color: 'var(--good)', bg: 'rgba(111,174,90,0.15)' },
  with_modification: { label: 'Cần chỉnh sửa', color: 'var(--warn)', bg: 'rgba(224,169,59,0.15)' },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function findExam(examId: string) {
  return (writingData as any[]).find((e: any) => e._id === examId) ?? null;
}

// ── Exam Detail Drawer ───────────────────────────────────────────────────────
function ExamDrawer({ examId, open }: { examId: string; open: boolean }) {
  if (!open) return null;
  const exam = findExam(examId);
  if (!exam) {
    return (
      <div style={{ padding: '12px 14px', background: '#fff9f0', borderTop: '1px solid #e4eada' }}>
        <span style={{ fontSize: 12, color: 'var(--bad)' }}>Không tìm thấy dữ liệu đề.</span>
      </div>
    );
  }

  const q = exam.questions[0];
  const scenario = q?.content ? stripHtml(q.content) : '';
  const sub0 = q?.subQuestion?.[0]?.content ?? '';
  const sub1 = q?.subQuestion?.[1]?.content ?? '';

  return (
    <div style={{
      borderTop: '1px solid #d8e6b8',
      background: '#f5f9ea',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
      animation: 'screen-in 180ms var(--ease) both',
    }}>
      {/* Scenario */}
      <div>
        <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Tình huống
        </p>
        <p style={{
          margin: 0, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.65,
          background: '#ffffff', borderRadius: 'var(--r-sm)',
          border: '1px solid #e4eada', padding: '10px 12px',
        }}>
          {scenario}
        </p>
      </div>

      {/* Sub-questions */}
      {(sub0 || sub1) && (
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Nhiệm vụ
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[sub0, sub1].filter(Boolean).map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent)', color: 'var(--accent-ink)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 800, marginTop: 1,
                }}>
                  {i + 1}
                </span>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CrossExamResultPanel({ results }: Props) {
  const [openExamId, setOpenExamId] = useState<string | null>(null);

  const toggle = (examId: string) =>
    setOpenExamId(prev => (prev === examId ? null : examId));

  const withApplicable = results.filter(r => r.applicableExams.length > 0);

  if (withApplicable.length === 0) {
    return (
      <div style={{
        padding: 16, borderRadius: 'var(--r-sm)', textAlign: 'center',
        background: 'rgba(106,166,196,0.08)', border: '1px solid rgba(106,166,196,0.18)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--info)' }}>
          Các ý tưởng trong bài khá đặc thù — chưa tìm thấy đề nào có thể áp dụng tương tự.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="globe" size={16} style={{ color: 'var(--info)' }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Phân tích đa đề</span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>— ý tưởng của bạn có thể dùng cho:</span>
      </div>

      {withApplicable.map((item) => (
        <div key={item.solutionId} style={{
          borderRadius: 'var(--r-sm)',
          border: '1px solid #d8e6b8',
          overflow: 'hidden',
        }}>
          {/* Solution header */}
          <div style={{
            padding: '10px 14px',
            background: '#eef5d6',
            borderBottom: '1px solid #d8e6b8',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="lightbulb" size={14} style={{ color: 'var(--info)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{item.solutionIdea}</span>
          </div>

          {/* Applicable exam rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {item.applicableExams.map((exam, i) => {
              const badge = BADGE[exam.applicability] ?? BADGE.with_modification;
              const isOpen = openExamId === exam.examId;

              return (
                <div key={exam.examId} style={{ borderTop: i > 0 ? '1px solid #e4eada' : undefined }}>
                  {/* Row */}
                  <button
                    onClick={() => toggle(exam.examId)}
                    style={{
                      width: '100%', textAlign: 'left', border: 'none',
                      cursor: 'pointer', padding: '10px 14px',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      transition: 'background 140ms var(--ease)',
                      background: isOpen ? '#f0f6e0' : '#ffffff',
                    }}
                    onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#f9fdf0'; }}
                    onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = '#ffffff'; }}
                  >
                    <span style={{ color: 'var(--ink-3)', marginTop: 3, flexShrink: 0 }}>
                      <Icon name={isOpen ? 'chevD' : 'chevR'} size={13} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                          {exam.examTitle}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px',
                          borderRadius: 'var(--r-pill)',
                          background: badge.bg, color: badge.color,
                        }}>
                          {badge.label}
                        </span>
                        <span style={{
                          fontSize: 10, color: '#9aa38c', marginLeft: 'auto',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <Icon name="eye" size={11} />
                          {isOpen ? 'Ẩn đề' : 'Xem đề'}
                        </span>
                      </div>
                      {exam.modificationNote && exam.applicability === 'with_modification' && (
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                          {exam.modificationNote}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Exam detail drawer */}
                  <ExamDrawer examId={exam.examId} open={isOpen} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
