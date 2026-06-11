import { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import FormatCheckResult from './FormatCheckResult';
import ContentAnalysisResult from './ContentAnalysisResult';
import GrammarCheckResult from './GrammarCheckResult';
import GrammarHighlight from './GrammarHighlight';
import B2CriteriaResult from './B2CriteriaResult';
import CrossExamResultPanel from './CrossExamResultPanel';
import { getByExam, deleteEntry } from '../../services/writing-history-store';
import type { WritingScoreEntry } from '../../types/writing-history';

interface Props {
  examId: string;
  examTitle: string;
  onBack: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
function totalScore(e: WritingScoreEntry) {
  return e.result.formatCheck.score + e.result.contentAnalysis.score;
}
function scoreColor(pct: number) {
  return pct >= 0.7 ? 'var(--good)' : pct >= 0.5 ? 'var(--warn)' : 'var(--bad)';
}

// ── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, max, size = 48 }: { score: number; max: number; size?: number }) {
  const pct = score / max;
  const color = scoreColor(pct);
  const r = (size - 7) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ede0" strokeWidth={5.5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5.5}
          strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          style={{ transition: 'stroke-dasharray 500ms var(--ease)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: size * 0.26, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: size * 0.18, color: '#9aa38c', lineHeight: 1 }}>/{max}</span>
      </div>
    </div>
  );
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '3px 9px',
      borderRadius: 'var(--r-pill)', textTransform: 'uppercase' as const, letterSpacing: '0.07em',
      background: bg, color,
    }}>{label}</span>
  );
}

// ── Attempt Row ──────────────────────────────────────────────────────────────
function AttemptRow({ entry, index, total, active, onClick }: {
  entry: WritingScoreEntry; index: number; total: number; active: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isForml = entry.letterType === 'formal';
  const wordCount = entry.essay.trim().split(/\s+/).length;
  const tot = totalScore(entry);

  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <div style={{
        borderRadius: 'var(--r-lg)',
        background: active ? '#eef5d6' : hovered ? '#f9fdf0' : '#ffffff',
        border: `1.5px solid ${active ? '#b8d45a' : hovered ? '#d4e88a' : '#e4eada'}`,
        boxShadow: active ? '0 2px 12px rgba(170,203,79,0.18)' : hovered ? '0 2px 10px rgba(20,28,15,0.08)' : 'none',
        transition: 'all 160ms var(--ease)',
        overflow: 'hidden', display: 'flex', alignItems: 'stretch',
      }}>
        {/* Attempt number stripe */}
        <div style={{
          width: 38, flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: active ? '#d9e89d' : '#f0f5e4',
          borderRight: '1px solid #e4eada', padding: '10px 0',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#6a8c2a' }}>
            #{total - index}
          </span>
        </div>

        <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap' as const }}>
            <Chip
              label={isForml ? 'Trang trọng' : 'Thân mật'}
              color={isForml ? 'var(--info)' : 'var(--good)'}
              bg={isForml ? '#ddeef7' : '#dff2d8'}
            />
            {entry.result.formatCheck.passed
              ? <Chip label="Đúng fmt" color="var(--good)" bg="#dff2d8" />
              : <Chip label="Sai fmt" color="var(--bad)" bg="#f7e8e0" />}
            <span style={{ fontSize: 10, color: '#9aa38c', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
              {wordCount}t
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 700, marginBottom: 3 }}>
            {formatDate(entry.savedAt)}{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, color: '#9aa38c' }}>{formatTime(entry.savedAt)}</span>
          </div>
          <p style={{
            margin: 0, fontSize: 11, color: '#79836d', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>{entry.essay}</p>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '10px 12px', flexShrink: 0,
          borderLeft: '1px solid #e4eada',
        }}>
          <ScoreRing score={tot} max={15} size={42} />
        </div>
      </div>
    </button>
  );
}

// ── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ entry, attemptNum, onDelete }: {
  entry: WritingScoreEntry; attemptNum: number; onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'scoring' | 'cross-exam'>('scoring');
  const [activeErrorId, setActiveErrorId] = useState<string | null>(null);
  const isForml = entry.letterType === 'formal';
  const wordCount = entry.essay.trim().split(/\s+/).length;
  const tot = totalScore(entry);
  const hasCrossExam = !!(entry.crossExamResults && entry.crossExamResults.length > 0);
  const hasGrammar = !!(entry.result.grammarCheck);
  const hasB2 = !!(entry.result.b2Criteria);
  const grammarErrors = entry.result.grammarCheck?.errors ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Summary header */}
      <div style={{
        padding: '14px 20px', flexShrink: 0,
        background: '#f5f9ea',
        borderBottom: '1px solid #e4eada',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ScoreRing score={tot} max={15} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>Lần #{attemptNum}</span>
              <Chip
                label={isForml ? 'Trang trọng' : 'Thân mật'}
                color={isForml ? 'var(--info)' : 'var(--good)'}
                bg={isForml ? '#ddeef7' : '#dff2d8'}
              />
              {entry.result.formatCheck.passed
                ? <Chip label="Đúng format" color="var(--good)" bg="#dff2d8" />
                : <Chip label="Sai format" color="var(--bad)" bg="#f7e8e0" />}
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
              {[
                { label: 'Format', score: entry.result.formatCheck.score, max: 5 },
                { label: 'Nội dung', score: entry.result.contentAnalysis.score, max: 10 },
                ...(hasGrammar ? [{ label: 'Ngữ pháp', score: entry.result.grammarCheck!.score, max: 5 }] : []),
                ...(hasB2 ? [{ label: 'B2', score: entry.result.b2Criteria!.score, max: 10 }] : []),
              ].map(({ label, score, max }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9aa38c', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: scoreColor(score / max), lineHeight: 1 }}>
                    {score}<span style={{ fontSize: 11, color: '#9aa38c', fontWeight: 400 }}>/{max}</span>
                  </div>
                </div>
              ))}
              <div style={{ width: 1, height: 26, background: '#e4eada', alignSelf: 'center' }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9aa38c', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Số từ</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: 'var(--ink-2)', lineHeight: 1 }}>{wordCount}</div>
              </div>
              <div style={{ width: 1, height: 26, background: '#e4eada', alignSelf: 'center' }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9aa38c', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Ngày làm</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', lineHeight: 1.2 }}>
                  {formatDate(entry.savedAt)}
                  <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9aa38c', fontWeight: 400 }}>{formatTime(entry.savedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '8px 20px',
        background: '#eef5d6',
        borderBottom: '1px solid #d8e6b8',
        flexShrink: 0,
      }}>
        {[
          { key: 'scoring' as const, label: 'Chấm điểm', icon: 'sparkle' as const },
          ...(hasCrossExam ? [{ key: 'cross-exam' as const, label: 'Phân tích đa đề', icon: 'globe' as const }] : []),
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 'var(--r-pill)',
            fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
            color: activeTab === tab.key ? 'var(--accent-ink)' : 'var(--ink-3)',
            boxShadow: activeTab === tab.key ? 'var(--sh-glow)' : 'none',
            transition: 'all 140ms var(--ease)',
          }}>
            <Icon name={tab.icon} size={13} />
            {tab.label}
            {tab.key === 'cross-exam' && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--good)', marginLeft: 2, flexShrink: 0 }} />
            )}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {confirmDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>Xoá bài này?</span>
            <button onClick={onDelete} style={{ padding: '5px 12px', borderRadius: 'var(--r-pill)', background: 'var(--bad)', color: '#fff', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Xoá</button>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: '5px 12px', borderRadius: 'var(--r-pill)', background: '#edf0e8', color: 'var(--ink-2)', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Huỷ</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              borderRadius: 'var(--r-pill)', background: 'transparent', color: '#b87060',
              border: '1px solid #f2c8b5', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', transition: 'background 160ms var(--ease)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fdf0ea')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Icon name="trash" size={12} />
            Xoá
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14, background: '#fafcf5' }}>

        {activeTab === 'scoring' && (
          <>
            <section>
              <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Bài làm</p>
              <div style={{ borderRadius: 'var(--r-md)', background: '#ffffff', border: '1px solid #e4eada', padding: '14px 16px' }}>
                {grammarErrors.length > 0
                  ? <GrammarHighlight essay={entry.essay} errors={grammarErrors} activeErrorId={activeErrorId} onErrorClick={setActiveErrorId} />
                  : <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{entry.essay}</p>
                }
              </div>
            </section>

            <section>
              <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Kiểm tra format</p>
              <div style={{ borderRadius: 'var(--r-md)', background: '#ffffff', border: '1px solid #e4eada', padding: 16 }}>
                <FormatCheckResult result={entry.result.formatCheck} />
              </div>
            </section>

            {hasGrammar && (
              <section>
                <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Ngữ pháp & Chính tả</p>
                <div style={{ borderRadius: 'var(--r-md)', background: '#ffffff', border: '1px solid #e4eada', padding: 16 }}>
                  <GrammarCheckResult result={entry.result.grammarCheck!} activeErrorId={activeErrorId} onErrorClick={setActiveErrorId} />
                </div>
              </section>
            )}

            {hasB2 && (
              <section>
                <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Tiêu chí B2</p>
                <div style={{ borderRadius: 'var(--r-md)', background: '#ffffff', border: '1px solid #e4eada', padding: 16 }}>
                  <B2CriteriaResult result={entry.result.b2Criteria!} />
                </div>
              </section>
            )}

            <section>
              <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 800, color: '#9aa38c', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Phân tích nội dung</p>
              <div style={{ borderRadius: 'var(--r-md)', background: '#ffffff', border: '1px solid #e4eada', padding: 16 }}>
                <ContentAnalysisResult result={entry.result.contentAnalysis} />
              </div>
            </section>
          </>
        )}

        {activeTab === 'cross-exam' && hasCrossExam && (
          <section>
            <div style={{ borderRadius: 'var(--r-md)', background: '#ffffff', border: '1px solid #e4eada', padding: 16 }}>
              <CrossExamResultPanel results={entry.crossExamResults!} />
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#fafcf5' }}>
      <div style={{ width: 60, height: 60, borderRadius: 'var(--r-xl)', background: '#eef5d6', display: 'grid', placeItems: 'center' }}>
        <Icon name="bookmark" size={26} style={{ color: '#8aad3a' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Chọn một bài để xem chi tiết</p>
        <p style={{ margin: 0, fontSize: 13, color: '#79836d', lineHeight: 1.5 }}>Nhấn vào bất kỳ lần làm nào ở danh sách bên trái.</p>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function WritingHistoryPanel({ examId, examTitle, onBack }: Props) {
  const [entries, setEntries] = useState<WritingScoreEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'formal' | 'informal'>('all');
  const [selected, setSelected] = useState<WritingScoreEntry | null>(null);

  useEffect(() => {
    getByExam(examId).then(data => {
      setEntries(data);
      if (data.length > 0) setSelected(data[0]);
    });
  }, [examId]);

  const handleDelete = async () => {
    if (!selected) return;
    await deleteEntry(selected.id);
    const next = entries.filter(e => e.id !== selected.id);
    setEntries(next);
    setSelected(next.length > 0 ? next[0] : null);
  };

  const filtered = entries.filter(e => filter === 'all' ? true : e.letterType === filter);
  const avgScore = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + totalScore(e), 0) / entries.length * 10) / 10
    : null;
  const attemptNum = selected ? entries.length - entries.findIndex(e => e.id === selected.id) : 0;

  return (
    <div style={{
      width: '100%', height: '100%',
      borderRadius: 'var(--r-xl)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: '#f5f9ea',
      border: '1px solid #d8e6b8',
      boxShadow: '0 8px 32px rgba(20,28,15,0.18)',
      animation: 'screen-in 220ms var(--ease) both',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px',
        background: '#eef5d6',
        borderBottom: '1px solid #d8e6b8',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 16px', borderRadius: 'var(--r-pill)',
            background: '#ffffff', border: '1px solid #d8e6b8',
            fontSize: 13, fontWeight: 700, color: 'var(--ink-2)',
            cursor: 'pointer', transition: 'all 160ms var(--ease)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-ink)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = 'var(--ink-2)'; }}
        >
          <Icon name="chevL" size={14} />
          Làm bài
        </button>

        <div style={{ width: 1, height: 20, background: '#d8e6b8' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--accent)', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)', flexShrink: 0 }}>
            <Icon name="bookmark" size={15} style={{ color: 'var(--accent-ink)' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Lịch sử bài làm
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {examTitle}
            </p>
          </div>
        </div>

        {/* Stats */}
        {entries.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {[
              { value: entries.length, label: 'lần làm', color: '#6a8c2a' },
              ...(avgScore !== null ? [{ value: `${avgScore}/15`, label: 'điểm TB', color: scoreColor(avgScore / 15) }] : []),
              { value: entries.filter(e => e.result.formatCheck.passed).length, label: 'đúng fmt', color: 'var(--good)' },
            ].map(({ value, label, color }) => (
              <div key={label} style={{ padding: '4px 12px', borderRadius: 'var(--r-pill)', background: '#ffffff', border: '1px solid #d8e6b8', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color }}>{value}</span>
                <span style={{ fontSize: 10, color: '#9aa38c', marginLeft: 5 }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Master-detail body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: list */}
        <div style={{
          width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #d8e6b8',
          background: '#f0f6e0',
        }}>
          {/* Filter */}
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #d8e6b8', flexShrink: 0 }}>
            <div style={{ display: 'inline-flex', gap: 2, padding: 3, background: '#e4efd4', borderRadius: 'var(--r-pill)' }}>
              {(['all', 'informal', 'formal'] as const).map(k => (
                <button key={k} onClick={() => setFilter(k)} style={{
                  padding: '5px 11px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 140ms var(--ease)',
                  background: filter === k ? 'var(--accent)' : 'transparent',
                  color: filter === k ? 'var(--accent-ink)' : '#4b5443',
                  boxShadow: filter === k ? 'var(--sh-glow)' : 'none',
                }}>
                  {k === 'all' ? 'Tất cả' : k === 'informal' ? 'Thân mật' : 'Trang trọng'}
                </button>
              ))}
            </div>
          </div>

          {/* Entries */}
          <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--r-xl)', background: '#e4efd4', display: 'grid', placeItems: 'center' }}>
                  <Icon name="bookmark" size={20} style={{ color: '#8aad3a' }} />
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#79836d', lineHeight: 1.5 }}>
                  Chưa có bài nào.<br />
                  Làm bài và nhấn <strong style={{ color: '#6a8c2a' }}>Lưu lịch sử</strong>.
                </p>
              </div>
            ) : (
              filtered.map((entry, i) => (
                <AttemptRow
                  key={entry.id}
                  entry={entry}
                  index={i}
                  total={filtered.length}
                  active={selected?.id === entry.id}
                  onClick={() => setSelected(entry)}
                />
              ))
            )}
          </div>

          {entries.length > 0 && (
            <div style={{ padding: '7px 12px', borderTop: '1px solid #d8e6b8', background: '#e8f0d0', flexShrink: 0, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#9aa38c', fontFamily: 'var(--font-mono)' }}>{filtered.length} / {entries.length} bài</span>
              <span style={{ fontSize: 10, color: '#9aa38c' }}>Lưu trữ trên máy</span>
            </div>
          )}
        </div>

        {/* Right: detail */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {selected
            ? <DetailPanel entry={selected} attemptNum={attemptNum} onDelete={handleDelete} />
            : <EmptyDetail />}
        </div>
      </div>
    </div>
  );
}
