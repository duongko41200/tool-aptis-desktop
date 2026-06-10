import Icon from '../common/Icon';
import type { CrossExamResult } from '../../types/writing-scorer';

interface Props {
  results: CrossExamResult[];
}

const BADGE: Record<string, { label: string; color: string; bg: string }> = {
  direct: { label: 'Dùng thẳng', color: 'var(--good)', bg: 'rgba(111,174,90,0.15)' },
  with_modification: { label: 'Cần chỉnh sửa', color: 'var(--warn)', bg: 'rgba(224,169,59,0.15)' },
};

export default function CrossExamResultPanel({ results }: Props) {
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
          border: '1px solid var(--glass-edge)',
          overflow: 'hidden',
        }}>
          {/* Solution header */}
          <div style={{
            padding: '10px 14px',
            background: 'rgba(106,166,196,0.08)',
            borderBottom: '1px solid var(--glass-edge)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="lightbulb" size={14} style={{ color: 'var(--info)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{item.solutionIdea}</span>
          </div>

          {/* Applicable exams */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {item.applicableExams.map((exam, i) => {
              const badge = BADGE[exam.applicability] ?? BADGE.with_modification;
              return (
                <div key={exam.examId} style={{
                  padding: '10px 14px',
                  borderTop: i > 0 ? '1px solid var(--glass-edge)' : undefined,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: 'rgba(255,255,255,0.3)',
                }}>
                  <span style={{ color: 'var(--ink-3)', marginTop: 2, flexShrink: 0 }}>
                    <Icon name="chevR" size={13} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{exam.examTitle}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)',
                        background: badge.bg, color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                    </div>
                    {exam.modificationNote && exam.applicability === 'with_modification' && (
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                        {exam.modificationNote}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
