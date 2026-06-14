import { useState, useMemo } from 'react';
import Icon from '../common/Icon';
import {
  generateSchedule, SKILL_COLORS, calcHours,
  type ScheduleRequest, type DayNote, type TimeSlot,
} from '../../services/gemini-schedule';
import { CalendarStore, type CalendarEvent } from '../../services/calendar-store';

const ALL_SKILLS = ['Writing', 'Speaking', 'Listening', 'Vocabulary'];
const SESSIONS_OPTIONS = [2, 3, 4, 5, 6, 7];
const DAYS_CONFIG = [
  { label: 'T2', dow: 1 }, { label: 'T3', dow: 2 }, { label: 'T4', dow: 3 },
  { label: 'T5', dow: 4 }, { label: 'T6', dow: 5 }, { label: 'T7', dow: 6 },
  { label: 'CN', dow: 0 },
];

function getTodayStr() { return new Date().toISOString().split('T')[0]; }
function fmt(h: number) { return h % 1 === 0 ? `${h}` : h.toFixed(1); }
function formatDateVi(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}
function formatTimeVi(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

interface Props { onClose: () => void; onApplied: () => void; }
type Step = 'form' | 'loading' | 'preview';

export default function AiScheduleModal({ onClose, onApplied }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [submitted, setSubmitted] = useState(false);

  // ── Core form ──
  const [examDate, setExamDate] = useState('');
  const [skills, setSkills] = useState<string[]>([...ALL_SKILLS]);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(4);
  const [notes, setNotes] = useState('');

  // ── Time slots ──
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ start: '19:00', end: '21:00' }]);

  // ── Day settings ──
  const [inactiveDays, setInactiveDays] = useState<Set<number>>(new Set());
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [showNoteAdder, setShowNoteAdder] = useState(false);
  const [noteForm, setNoteForm] = useState<{ dow: number; startTime: string; endTime: string; note: string }>({
    dow: 1, startTime: '', endTime: '', note: '',
  });
  const [noteFormErr, setNoteFormErr] = useState('');

  // ── Multi-skill ──
  const [allowMultiSkill, setAllowMultiSkill] = useState(false);

  // ── Preview ──
  const [generated, setGenerated] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Validation ──
  const apiKey = localStorage.getItem('gemini_api_key') ?? '';
  const hasApiKey = apiKey.trim().length > 0;
  const minExamDate = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  const slotErrors = useMemo(() =>
    timeSlots.map(s => {
      if (!s.start || !s.end) return 'Chưa nhập đủ giờ';
      if (s.start >= s.end) return 'Giờ kết thúc phải sau giờ bắt đầu';
      return '';
    }),
    [timeSlots],
  );

  const errors = useMemo(() => ({
    examDate: !examDate
      ? 'Vui lòng chọn ngày thi'
      : examDate < minExamDate
        ? 'Ngày thi phải sau ngày hôm nay'
        : '',
    skills: skills.length === 0 ? 'Chọn ít nhất 1 kỹ năng' : '',
    timeSlots: timeSlots.length === 0
      ? 'Cần ít nhất 1 khung giờ học'
      : slotErrors.some(e => e) ? 'Kiểm tra lại các khung giờ bên dưới' : '',
    apiKey: !hasApiKey ? 'Chưa có Gemini API key — vào Settings để thêm' : '',
  }), [examDate, skills, timeSlots, slotErrors, hasApiKey, minExamDate]);

  const hasAnyError = Object.values(errors).some(Boolean);

  // ── Computed ──
  const maxSlotHours = timeSlots.length > 0
    ? Math.max(...timeSlots.map(s => calcHours(s.start, s.end)))
    : 0;
  const canMultiSkill = maxSlotHours >= 2;

  // ── Handlers: skills ──
  const toggleSkill = (s: string) =>
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  // ── Handlers: time slots ──
  const addSlot = () => setTimeSlots(prev => [...prev, { start: '07:00', end: '09:00' }]);
  const removeSlot = (i: number) => setTimeSlots(prev => prev.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, field: keyof TimeSlot, val: string) =>
    setTimeSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  // ── Handlers: day toggles ──
  const toggleDay = (dow: number) =>
    setInactiveDays(prev => { const n = new Set(prev); n.has(dow) ? n.delete(dow) : n.add(dow); return n; });

  // ── Handlers: day notes ──
  const openNoteAdder = () => {
    setNoteForm({ dow: 1, startTime: '', endTime: '', note: '' });
    setNoteFormErr('');
    setShowNoteAdder(true);
  };

  const addDayNote = () => {
    if (!noteForm.note.trim()) { setNoteFormErr('Vui lòng nhập nội dung ghi chú'); return; }
    if (noteForm.startTime && !noteForm.endTime) { setNoteFormErr('Nhập giờ kết thúc hoặc bỏ trống cả hai'); return; }
    if (!noteForm.startTime && noteForm.endTime) { setNoteFormErr('Nhập giờ bắt đầu hoặc bỏ trống cả hai'); return; }
    if (noteForm.startTime && noteForm.endTime && noteForm.startTime >= noteForm.endTime) {
      setNoteFormErr('Giờ kết thúc phải sau giờ bắt đầu'); return;
    }
    const label = DAYS_CONFIG.find(d => d.dow === noteForm.dow)?.label ?? '';
    setDayNotes(prev => [...prev, {
      dow: noteForm.dow, label,
      startTime: noteForm.startTime || undefined,
      endTime: noteForm.endTime || undefined,
      note: noteForm.note.trim(),
    }]);
    setNoteFormErr('');
    setNoteForm(f => ({ ...f, startTime: '', endTime: '', note: '' }));
    setShowNoteAdder(false);
  };

  const removeDayNote = (idx: number) => setDayNotes(prev => prev.filter((_, i) => i !== idx));

  // ── Handlers: preview ──
  const toggleEvent = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setSelected(selected.size === generated.length ? new Set() : new Set(generated.map(e => e.id)));

  // ── Generate ──
  const handleGenerate = async () => {
    setSubmitted(true);
    if (hasAnyError) return;

    setStep('loading');
    const req: ScheduleRequest = {
      examDate, skills, timeSlots, sessionsPerWeek,
      notes: notes.trim(), todayDate: getTodayStr(),
      inactiveDays: Array.from(inactiveDays), dayNotes, allowMultiSkill,
    };

    try {
      const events = await generateSchedule(req, apiKey);
      setGenerated(events);
      setSelected(new Set(events.map(e => e.id)));
      setStep('preview');
    } catch (err: any) {
      setStep('form');
      // show api-level error inline
      alert(err.message ?? 'Lỗi không xác định.');
    }
  };

  const handleApply = () => {
    generated.filter(e => selected.has(e.id)).forEach(e => CalendarStore.addEvent(e));
    onApplied();
    onClose();
  };

  const showErr = (key: keyof typeof errors) =>
    submitted && errors[key] ? errors[key] : '';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'grid', placeItems: 'center', padding: 24 }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }}
        onClick={step !== 'loading' ? onClose : undefined}
      />
      <div className="glass rise" style={{
        position: 'relative', width: '100%',
        maxWidth: step === 'preview' ? 600 : 540,
        maxHeight: '92vh', padding: 32,
        borderRadius: 'var(--r-xl)', background: 'var(--glass-bg)',
        boxShadow: 'var(--sh-lg)', border: '1px solid var(--glass-edge)',
        display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="sparkle" size={20} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>AI Tạo Lịch Học</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>
              {step === 'form' && 'Cấu hình để AI tạo lịch học tối ưu'}
              {step === 'loading' && 'Đang phân tích và tạo lịch...'}
              {step === 'preview' && `${generated.length} buổi học được đề xuất`}
            </div>
          </div>
          {step !== 'loading' && (
            <button className="iconbtn" onClick={onClose}><Icon name="close" size={20} /></button>
          )}
        </div>

        {/* ══ FORM ══ */}
        {step === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1, paddingRight: 6 }}>

            {/* API key warning — luôn hiện nếu chưa có key */}
            {!hasApiKey && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 'var(--r-md)',
                background: '#FEF3C7', border: '1.5px solid #F59E0B', color: '#92400E',
              }}>
                <Icon name="bell" size={16} style={{ flexShrink: 0, color: '#F59E0B' }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Chưa có Gemini API key —{' '}
                  <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                    vào Settings để thêm trước khi tạo lịch
                  </span>
                </div>
              </div>
            )}

            {/* Tóm tắt lỗi khi submit */}
            {submitted && hasAnyError && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--r-md)',
                background: '#FEE2E2', border: '1.5px solid #FCA5A5',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>
                  Vui lòng kiểm tra lại:
                </div>
                {Object.values(errors).filter(Boolean).map((e, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span>•</span> {e}
                  </div>
                ))}
              </div>
            )}

            {/* Ngày thi */}
            <Field label="Ngày thi APTIS" required error={showErr('examDate')}>
              <input
                type="date" min={minExamDate} value={examDate}
                onChange={e => setExamDate(e.target.value)}
                style={{ ...inputStyle, ...(showErr('examDate') ? errBorder : {}) }}
              />
            </Field>

            {/* Kỹ năng */}
            <Field label="Kỹ năng cần luyện" required error={showErr('skills')}>
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap',
                padding: showErr('skills') ? '10px' : 0,
                borderRadius: 'var(--r-md)',
                border: showErr('skills') ? '1.5px solid #FCA5A5' : 'none',
                background: showErr('skills') ? '#FFF5F5' : 'transparent',
                transition: 'all 0.2s',
              }}>
                {ALL_SKILLS.map(skill => {
                  const active = skills.includes(skill);
                  const c = SKILL_COLORS[skill];
                  return (
                    <button key={skill} onClick={() => toggleSkill(skill)} style={{
                      padding: '8px 18px', borderRadius: 'var(--r-md)',
                      border: active ? 'none' : '1.5px solid var(--glass-edge)',
                      background: active ? c.bg : 'transparent',
                      color: active ? c.text : 'var(--ink-2)',
                      fontWeight: 700, fontSize: 13.5, cursor: 'pointer', transition: 'all 0.18s',
                      boxShadow: active ? 'var(--sh-sm)' : 'none',
                    }}>{skill}</button>
                  );
                })}
              </div>
            </Field>

            {/* ── Khung giờ học ── */}
            <Field label="Khung giờ học" required error={showErr('timeSlots')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {timeSlots.map((slot, i) => {
                  const h = calcHours(slot.start, slot.end);
                  const slotErr = slotErrors[i];
                  const showSlotErr = slotErr && (submitted || (slot.start && slot.end));
                  return (
                    <div key={i}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px', borderRadius: 'var(--r-md)',
                        border: `1.5px solid ${showSlotErr ? '#FCA5A5' : 'var(--glass-edge)'}`,
                        background: showSlotErr ? '#FFF5F5' : 'rgba(255,255,255,0.6)',
                        transition: 'border-color 0.2s',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', width: 50, flexShrink: 0 }}>
                          Slot {i + 1}
                        </span>
                        <input type="time" value={slot.start}
                          onChange={e => updateSlot(i, 'start', e.target.value)}
                          style={{ ...inputStyle, flex: 1, padding: '8px 10px', border: 'none', background: 'transparent' }}
                        />
                        <span style={{ color: 'var(--ink-3)', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>–</span>
                        <input type="time" value={slot.end}
                          onChange={e => updateSlot(i, 'end', e.target.value)}
                          style={{ ...inputStyle, flex: 1, padding: '8px 10px', border: 'none', background: 'transparent' }}
                        />
                        {slot.start && slot.end && !slotErr && (
                          <span style={{
                            fontSize: 12, fontWeight: 700, color: 'var(--accent)',
                            background: 'rgba(180,215,120,0.2)', padding: '3px 8px',
                            borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap',
                          }}>
                            {fmt(h)}h
                          </span>
                        )}
                        {timeSlots.length > 1 && (
                          <button onClick={() => removeSlot(i)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--ink-3)', padding: 4, flexShrink: 0,
                          }}>
                            <Icon name="close" size={14} />
                          </button>
                        )}
                      </div>
                      {showSlotErr && (
                        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, marginLeft: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="close" size={12} style={{ flexShrink: 0 }} /> {slotErr}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button onClick={addSlot} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 12px', background: 'none',
                  border: '1.5px dashed var(--glass-edge)', borderRadius: 'var(--r-md)',
                  color: 'var(--ink-2)', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', width: '100%', justifyContent: 'center', transition: 'border-color 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-edge)'}
                >
                  <Icon name="plus" size={14} /> Thêm khung giờ khác
                </button>
              </div>
            </Field>

            {/* Số buổi/tuần */}
            <Field label="Số buổi học mỗi tuần" required>
              <div style={{ display: 'flex', gap: 8 }}>
                {SESSIONS_OPTIONS.map(n => (
                  <button key={n} onClick={() => setSessionsPerWeek(n)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)',
                    border: sessionsPerWeek === n ? 'none' : '1.5px solid var(--glass-edge)',
                    background: sessionsPerWeek === n ? 'var(--accent)' : 'transparent',
                    color: sessionsPerWeek === n ? 'var(--accent-ink)' : 'var(--ink-2)',
                    fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.18s',
                    boxShadow: sessionsPerWeek === n ? 'var(--sh-sm)' : 'none',
                  }}>{n}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>buổi / tuần</div>
            </Field>

            {/* ── Cài đặt từng ngày (tuỳ chọn) ── */}
            <Field label="Cài đặt từng ngày" optional>
              {/* Day toggles */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {DAYS_CONFIG.map(({ label, dow }) => {
                  const inactive = inactiveDays.has(dow);
                  const hasNote = dayNotes.some(n => n.dow === dow);
                  return (
                    <button key={dow} onClick={() => toggleDay(dow)}
                      title={inactive ? 'Bấm để mở lại' : 'Bấm để không xếp lịch ngày này'}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
                        border: inactive ? '1.5px solid rgba(0,0,0,0.08)' : '1.5px solid var(--accent)',
                        background: inactive ? 'rgba(0,0,0,0.04)' : 'rgba(180,215,120,0.15)',
                        color: inactive ? 'var(--ink-3)' : 'var(--ink)',
                        fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.18s',
                        textDecoration: inactive ? 'line-through' : 'none',
                        position: 'relative',
                      }}>
                      {label}
                      {hasNote && !inactive && (
                        <span style={{
                          position: 'absolute', top: 3, right: 4,
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--accent)',
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day notes list */}
              {dayNotes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {dayNotes.map((n, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.03)',
                      borderRadius: 'var(--r-md)', border: '1px solid var(--glass-edge)',
                    }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent)', width: 24, flexShrink: 0, paddingTop: 1 }}>{n.label}</span>
                      <div style={{ flex: 1 }}>
                        {n.startTime && n.endTime && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 2 }}>
                            {n.startTime} – {n.endTime}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>{n.note}</div>
                      </div>
                      <button onClick={() => removeDayNote(idx)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ink-3)', padding: 2, flexShrink: 0, marginTop: 1,
                      }}>
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Note adder trigger */}
              {!showNoteAdder && (
                <button onClick={openNoteAdder} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 12px', background: 'none',
                  border: '1.5px dashed var(--glass-edge)', borderRadius: 'var(--r-md)',
                  color: 'var(--ink-2)', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', width: '100%', justifyContent: 'center', transition: 'border-color 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-edge)'}
                >
                  <Icon name="plus" size={14} /> Thêm ghi chú cho ngày cụ thể
                </button>
              )}

              {/* Note adder form */}
              {showNoteAdder && (
                <div style={{
                  padding: 14, background: 'rgba(0,0,0,0.02)',
                  borderRadius: 'var(--r-md)', border: '1px solid var(--glass-edge)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  {/* Row 1: day + time range */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={noteForm.dow}
                      onChange={e => { setNoteForm(f => ({ ...f, dow: Number(e.target.value) })); setNoteFormErr(''); }}
                      style={{ ...inputStyle, width: 'auto', padding: '8px 10px', flexShrink: 0 }}>
                      {DAYS_CONFIG.map(d => <option key={d.dow} value={d.dow}>{d.label}</option>)}
                    </select>
                    <input type="time" value={noteForm.startTime}
                      placeholder="Từ giờ"
                      onChange={e => { setNoteForm(f => ({ ...f, startTime: e.target.value })); setNoteFormErr(''); }}
                      style={{ ...inputStyle, flex: 1, padding: '8px 10px', ...(noteFormErr && noteForm.startTime && !noteForm.endTime ? errBorder : {}) }}
                    />
                    <span style={{ color: 'var(--ink-3)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>–</span>
                    <input type="time" value={noteForm.endTime}
                      placeholder="Đến giờ"
                      onChange={e => { setNoteForm(f => ({ ...f, endTime: e.target.value })); setNoteFormErr(''); }}
                      style={{ ...inputStyle, flex: 1, padding: '8px 10px', ...(!noteForm.startTime && noteForm.endTime ? errBorder : {}) }}
                    />
                  </div>
                  {/* Row 2: note text + actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <input autoFocus type="text"
                        placeholder="Ghi chú (bắt buộc) — VD: Rảnh buổi sáng, học thêm được..."
                        value={noteForm.note}
                        onChange={e => { setNoteForm(f => ({ ...f, note: e.target.value })); setNoteFormErr(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') addDayNote(); if (e.key === 'Escape') setShowNoteAdder(false); }}
                        style={{ ...inputStyle, padding: '8px 12px', ...(noteFormErr && !noteForm.note.trim() ? errBorder : {}) }}
                      />
                      {noteFormErr && (
                        <div style={{ fontSize: 12, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="close" size={12} style={{ flexShrink: 0 }} /> {noteFormErr}
                        </div>
                      )}
                    </div>
                    <button onClick={addDayNote} style={{
                      padding: '8px 16px', background: 'var(--accent)', color: 'var(--accent-ink)',
                      border: 'none', borderRadius: 'var(--r-md)', fontWeight: 700,
                      fontSize: 13, cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start',
                    }}>Thêm</button>
                    <button onClick={() => setShowNoteAdder(false)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--ink-3)', padding: '8px 4px', flexShrink: 0, alignSelf: 'flex-start',
                    }}>
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    Khung giờ là tuỳ chọn — bỏ trống nếu ghi chú áp dụng cả ngày
                  </div>
                </div>
              )}
            </Field>

            {/* ── Ghép kỹ năng ── */}
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--r-md)',
              border: allowMultiSkill ? '1.5px solid var(--accent)' : '1.5px solid var(--glass-edge)',
              background: allowMultiSkill ? 'rgba(180,215,120,0.08)' : 'transparent',
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div onClick={() => canMultiSkill && setAllowMultiSkill(v => !v)} style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: allowMultiSkill ? 'var(--accent)' : 'rgba(0,0,0,0.12)',
                  position: 'relative', cursor: canMultiSkill ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s', flexShrink: 0, opacity: canMultiSkill ? 1 : 0.4,
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: allowMultiSkill ? 20 : 3,
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: canMultiSkill ? 'var(--ink)' : 'var(--ink-3)' }}>
                    Ghép 2 kỹ năng vào 1 buổi
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
                    {canMultiSkill
                      ? `Slot dài nhất ${fmt(maxSlotHours)}h — AI ghép kỹ năng khi hợp lý`
                      : `Cần slot ≥ 2 tiếng để bật (hiện tại: ${fmt(maxSlotHours)}h)`}
                  </div>
                </div>
              </div>
            </div>

            {/* Ghi chú chung */}
            <Field label="Ghi chú thêm" optional>
              <textarea
                placeholder="VD: Tôi yếu Speaking, ưu tiên luyện nhiều hơn..."
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
              />
            </Field>

            {/* CTA */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={onClose} style={btnSecondaryStyle}>Hủy</button>
              <button onClick={handleGenerate} style={{
                ...btnPrimaryStyle,
                opacity: !hasApiKey ? 0.6 : 1,
              }}>
                <Icon name="sparkle" size={16} />
                Tạo lịch học với AI
              </button>
            </div>
          </div>
        )}

        {/* ══ LOADING ══ */}
        {step === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '32px 0', flex: 1 }}>
            <div style={{
              width: 56, height: 56,
              border: '4px solid var(--glass-edge)', borderTopColor: 'var(--accent)',
              borderRadius: '50%', animation: 'spin 0.9s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Gemini đang phân tích...</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Đang tạo lịch học tối ưu dựa trên cấu hình của bạn</div>
            </div>
          </div>
        )}

        {/* ══ PREVIEW ══ */}
        {step === 'preview' && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, marginBottom: 16 }}>
              {Object.entries(SKILL_COLORS).map(([skill, c]) =>
                generated.some(e => e.backgroundColor === c.bg) ? (
                  <div key={skill} style={{ padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.text, fontSize: 12, fontWeight: 700 }}>
                    {skill}
                  </div>
                ) : null
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
                Đã chọn <strong style={{ color: 'var(--ink)' }}>{selected.size}</strong> / {generated.length} buổi
              </div>
              <button onClick={toggleAll} style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {selected.size === generated.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
              {generated.map(evt => {
                const isSel = selected.has(evt.id);
                const bg = evt.backgroundColor ?? 'var(--accent)';
                const txt = evt.textColor ?? 'var(--accent-ink)';
                return (
                  <div key={evt.id} onClick={() => toggleEvent(evt.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 'var(--r-md)',
                    border: isSel ? `1.5px solid ${bg}` : '1.5px solid var(--glass-edge)',
                    background: isSel ? `${bg}18` : 'transparent',
                    cursor: 'pointer', transition: 'all 0.18s', opacity: isSel ? 1 : 0.5,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: isSel ? bg : '#fff',
                      border: isSel ? 'none' : '2px solid rgba(0,0,0,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s', color: txt,
                    }}>
                      {isSel && <Icon name="check" size={12} />}
                    </div>
                    <div style={{ width: 104, flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{formatDateVi(evt.start)}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{formatTimeVi(evt.start)} – {formatTimeVi(evt.end)}</div>
                    </div>
                    <div style={{
                      flex: 1, background: bg, color: txt,
                      padding: '5px 12px', borderRadius: 6,
                      fontSize: 13, fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{evt.title}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, flexShrink: 0, marginTop: 16 }}>
              <button onClick={() => { setStep('form'); }} style={btnSecondaryStyle}>Tạo lại</button>
              <button onClick={handleApply} disabled={selected.size === 0}
                style={{ ...btnPrimaryStyle, opacity: selected.size === 0 ? 0.5 : 1, cursor: selected.size === 0 ? 'not-allowed' : 'pointer' }}>
                <Icon name="calendar" size={16} />
                Thêm {selected.size} buổi vào lịch
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function Field({
  label, required, optional, error, children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
        {required && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#fff',
            background: '#EF4444', padding: '1px 6px', borderRadius: 20,
          }}>bắt buộc</span>
        )}
        {optional && (
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 400 }}>
            (tuỳ chọn)
          </span>
        )}
      </div>
      {children}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, color: '#DC2626', marginTop: 5, fontWeight: 600,
        }}>
          <Icon name="close" size={12} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}
    </div>
  );
}

// ── Styles ──

const errBorder: React.CSSProperties = {
  border: '1.5px solid #FCA5A5',
  background: '#FFF5F5',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  borderRadius: 'var(--r-md)', border: '1px solid var(--glass-edge)',
  background: '#fff', fontSize: 14, color: 'var(--ink)',
  fontWeight: 500, outline: 'none', boxSizing: 'border-box',
};

const btnSecondaryStyle: React.CSSProperties = {
  flex: 1, padding: '13px', background: 'transparent', color: 'var(--ink-2)',
  border: '1px solid var(--glass-edge)', borderRadius: 'var(--r-md)',
  fontWeight: 700, cursor: 'pointer', fontSize: 14,
};

const btnPrimaryStyle: React.CSSProperties = {
  flex: 2, padding: '13px',
  background: 'var(--accent)', color: 'var(--accent-ink)',
  border: 'none', borderRadius: 'var(--r-md)',
  fontWeight: 700, cursor: 'pointer', fontSize: 14,
  boxShadow: 'var(--sh-sm)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
