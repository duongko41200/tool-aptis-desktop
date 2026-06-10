import { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import FormatCheckResult from './FormatCheckResult';
import ContentAnalysisResult from './ContentAnalysisResult';
import { getByExam, deleteEntry } from '../../services/writing-history-store';
import type { WritingScoreEntry } from '../../types/writing-history';

interface Props {
  examId: string;
  examTitle: string;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function ScoreBadge({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = score / max;
  const color = pct >= 0.7 ? 'var(--good)' : pct >= 0.5 ? 'var(--warn)' : 'var(--bad)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 'var(--r-pill)',
      background: `${color}18`, border: `1px solid ${color}30`,
    }}>
      <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>
        {score}<span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7 }}>/{max}</span>
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</span>
    </div>
  );
}

function EntryCard({
  entry,
  onDelete,
}: {
  entry: WritingScoreEntry;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isForml = entry.letterType === 'formal';
  const wordCount = entry.essay.trim().split(/\s+/).length;

  return (
    <div style={{
      borderRadius: 'var(--r-lg)',
      background: 'rgba(255,255,255,0.72)',
      border: '1px solid var(--glass-edge)',
      boxShadow: '0 2px 8px rgba(20,28,15,0.07)',
      overflow: 'hidden',
      transition: 'box-shadow 200ms var(--ease)',
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(20,28,15,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(20,28,15,0.07)')}
    >
      {/* Card header */}
      <div style={{
        padding: '14px 16px 12px',
        background: 'linear-gradient(135deg,rgba(217,232,157,0.28),rgba(255,255,255,0.1))',
        borderBottom: '1px solid var(--glass-edge)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 9px',
              borderRadius: 'var(--r-pill)', textTransform: 'uppercase', letterSpacing: '0.06em',
              background: isForml ? 'rgba(106,166,196,0.18)' : 'rgba(111,174,90,0.18)',
              color: isForml ? 'var(--info)' : 'var(--good)',
            }}>
              {isForml ? 'Trang trọng' : 'Thân mật'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              {wordCount} từ
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
              {formatDate(entry.savedAt)}
            </span>
          </div>

          {/* Score row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <ScoreBadge label="Format" score={entry.result.formatCheck.score} max={5} />
            <ScoreBadge label="Nội dung" score={entry.result.contentAnalysis.score} max={10} />
            <span style={{
              fontSize: 11, padding: '4px 8px', borderRadius: 'var(--r-pill)',
              background: entry.result.formatCheck.passed ? 'rgba(111,174,90,0.12)' : 'rgba(217,138,106,0.12)',
              color: entry.result.formatCheck.passed ? 'var(--good)' : 'var(--bad)',
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Icon name={entry.result.formatCheck.passed ? 'checkCircle' : 'close'} size={12} />
              {entry.result.formatCheck.passed ? 'Đúng format' : 'Sai format'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            className="iconbtn"
            title={expanded ? 'Thu gọn' : 'Xem chi tiết'}
            style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.7)', color: 'var(--ink-2)' }}
          >
            <Icon name={expanded ? 'chevD' : 'chevR'} size={14} />
          </button>
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={onDelete}
                style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 'var(--r-sm)', background: 'var(--bad)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Xoá
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 'var(--r-sm)', background: 'rgba(40,55,30,0.08)', color: 'var(--ink-2)', border: 'none', cursor: 'pointer' }}>
                Huỷ
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="iconbtn"
              title="Xoá bài này"
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.7)', color: 'var(--ink-3)' }}
            >
              <Icon name="trash" size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Essay preview — always visible */}
      <div style={{ padding: '12px 16px' }}>
        <p style={{
          margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: expanded ? undefined : 3,
          WebkitBoxOrient: 'vertical', overflow: expanded ? 'visible' : 'hidden',
          whiteSpace: 'pre-wrap',
        }}>
          {entry.essay}
        </p>
      </div>

      {/* Expanded scoring detail */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--glass-edge)',
          padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 14,
          background: 'rgba(255,255,255,0.4)',
        }}>
          <div style={{ borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.7)', padding: 16, border: '1px solid var(--glass-edge)' }}>
            <FormatCheckResult result={entry.result.formatCheck} />
          </div>
          <div style={{ borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.7)', padding: 16, border: '1px solid var(--glass-edge)' }}>
            <ContentAnalysisResult
              result={entry.result.contentAnalysis}
              onAnalyzeCrossExam={() => {}}
              isCrossExamLoading={false}
              crossExamDone={false}
              showCrossExam={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function WritingHistoryPanel({ examId, examTitle, onClose }: Props) {
  const [entries, setEntries] = useState<WritingScoreEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'formal' | 'informal'>('all');

  useEffect(() => {
    getByExam(examId).then(setEntries);
  }, [examId]);

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const filtered = entries.filter(e =>
    filter === 'all' ? true : e.letterType === filter
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(10,16,6,0.38)',
          backdropFilter: 'blur(2px)',
          animation: 'screen-in 220ms var(--ease) both',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(520px, 96vw)',
        zIndex: 41,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(246,250,236,0.94)',
        backdropFilter: 'blur(22px) saturate(1.3)',
        borderLeft: '1px solid var(--glass-edge)',
        boxShadow: '-8px 0 40px rgba(10,16,6,0.22)',
        animation: 'slide-from-right 280ms var(--ease) both',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 22px 16px',
          background: 'linear-gradient(135deg,rgba(217,232,157,0.45),rgba(217,232,157,0.12))',
          borderBottom: '1px solid var(--glass-edge)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 'var(--r-md)',
              background: 'var(--accent)', display: 'grid', placeItems: 'center',
              boxShadow: 'var(--sh-glow)',
            }}>
              <Icon name="bookmark" size={18} style={{ color: 'var(--accent-ink)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.2 }}>
                Lịch sử bài làm
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>
                {examTitle} · {entries.length} bài đã lưu
              </p>
            </div>
            <button
              onClick={onClose}
              className="iconbtn"
              style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.6)', color: 'var(--ink-2)' }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'inline-flex', gap: 3, padding: 4, background: 'rgba(255,255,255,0.5)', borderRadius: 'var(--r-pill)' }}>
            {([['all', 'Tất cả'], ['informal', 'Thân mật'], ['formal', 'Trang trọng']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 160ms var(--ease)',
                  background: filter === k ? 'var(--accent)' : 'transparent',
                  color: filter === k ? 'var(--accent-ink)' : 'var(--ink-2)',
                  boxShadow: filter === k ? 'var(--sh-glow)' : 'none',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Entries list */}
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 'var(--r-xl)', background: 'rgba(217,232,157,0.3)', display: 'grid', placeItems: 'center' }}>
                <Icon name="bookmark" size={24} style={{ color: 'var(--accent-deep)' }} />
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                  Chưa có bài nào được lưu
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  Sau khi chấm xong, nhấn{' '}
                  <strong style={{ color: 'var(--accent-deep)' }}>"Lưu vào lịch sử"</strong>
                  {' '}để lưu lại bài làm và nhận xét.
                </p>
              </div>
            </div>
          ) : (
            filtered.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {entries.length > 0 && (
          <div style={{
            padding: '12px 18px', borderTop: '1px solid var(--glass-edge)',
            background: 'rgba(255,255,255,0.5)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              {filtered.length} / {entries.length} bài
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Lưu trữ trên máy tính của bạn
            </span>
          </div>
        )}
      </div>
    </>
  );
}
