import { useState, useRef, useEffect, useMemo } from 'react';
import TopBar from '../components/layout/TopBar';
import Icon from '../components/common/Icon';
import { useListeningExams } from '../hooks/useListeningExams';

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function AudioPlayer({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <div style={{
      aspectRatio: '16 / 9', width: '100%', borderRadius: 'var(--r-xl)', overflow: 'hidden',
      position: 'relative', background: 'linear-gradient(150deg, #3a4a2c, #586b3f 55%, #6e6450)',
      display: 'grid', placeItems: 'center', boxShadow: '0 8px 32px rgba(40,50,30,0.15)'
    }}>
      <style>{`@keyframes eq{from{transform:scaleY(0.4)}to{transform:scaleY(1)}}`}</style>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: 0.5 }}>
        {Array.from({ length: 32 }).map((_, i) => (
          <span key={i} style={{
            width: 5, height: (12 + Math.abs(Math.sin(i * 0.7)) * 64) + 'px',
            borderRadius: 9999, background: 'rgba(217,232,157,0.7)',
            animation: playing ? `eq 1.${i % 6}s ease-in-out ${i * 40}ms infinite alternate` : 'none',
          }} />
        ))}
      </div>
      <div style={{ position: 'relative', textAlign: 'center', color: '#fff' }}>
        <button
          onClick={onToggle}
          className="pulse-soft"
          style={{
            width: 86, height: 86, borderRadius: '50%',
            background: 'var(--accent)', color: 'var(--accent-ink)',
            display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)',
            margin: '0 auto', border: 'none', cursor: 'pointer',
          }}
        >
          <Icon name={playing ? 'pause' : 'play'} size={36} fill={!playing} />
        </button>
        <div className="text-shadow" style={{ marginTop: 20, fontSize: 16, fontWeight: 800 }}>
          Audio
        </div>
        <div className="text-shadow" style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
          Chỉ âm thanh — không có hình
        </div>
      </div>
    </div>
  );
}

export default function ListeningPage() {
  const { getExamsByPart } = useListeningExams();
  const [part, setPart] = useState<1 | 2 | 3 | 4>(1);
  const [examIndex, setExamIndex] = useState(0);

  const exams = getExamsByPart(part);
  const exam = exams[examIndex];

  const [showT, setShowT] = useState(true);
  const [active, setActive] = useState(0); // Only used for Part 1 tabs
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dictTargetEndTime = useRef<number | null>(null);

  const [isDictationMode, setIsDictationMode] = useState(false);
  const [dictIndex, setDictIndex] = useState(0);
  const [dictInput, setDictInput] = useState('');
  const [dictResults, setDictResults] = useState<Record<number, { score: number; diff: React.ReactNode }>>({});
  const [leftTab, setLeftTab] = useState<'luyen-nghe' | 'chep-chinh-ta'>('luyen-nghe');
  const [showExamModal, setShowExamModal] = useState(false);

  const mainQuestion = exam?.questions[0];
  const subQuestions = mainQuestion?.subQuestion || [];
  const currentSubQuestion = subQuestions[active];

  const audioFile = (part === 1 ? currentSubQuestion?.file : mainQuestion?.file) || '';

  const transcriptStr = part === 1 ? currentSubQuestion?.suggestion : mainQuestion?.suggestion;
  const transcriptList = useMemo(() => {
    if (!transcriptStr) return [];
    try {
      const jsonStr = transcriptStr.replace(/^<p>/, '').replace(/<\/p>$/, '');
      const parsed = JSON.parse(jsonStr) as { timestamp: [number, number | null]; text: string }[];
      return parsed.map(item => ({ t: item.timestamp[0], en: item.text }));
    } catch {
      return [];
    }
  }, [transcriptStr]);

  useEffect(() => {
    if (audioRef.current) {
      if (playing) audioRef.current.play().catch(() => setPlaying(false));
      else audioRef.current.pause();
    }
  }, [playing, audioFile]);

  useEffect(() => {
    if (leftTab === 'chep-chinh-ta') {
      setIsDictationMode(true);
    } else {
      setIsDictationMode(false);
    }
  }, [leftTab]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const ct = audioRef.current.currentTime;
      setCurrentTime(ct);

      if (isDictationMode && dictTargetEndTime.current !== null && ct >= dictTargetEndTime.current) {
        audioRef.current.pause();
        setPlaying(false);
        dictTargetEndTime.current = null;
      }
    }
  };

  const handleEnded = () => setPlaying(false);

  const pickTranscript = (i: number) => {
    if (audioRef.current && transcriptList[i]) {
      audioRef.current.currentTime = transcriptList[i].t;
      if (!playing) setPlaying(true);
    }
  };

  const playDictSentence = (idx: number) => {
    setDictIndex(idx);
    setDictInput(''); // Reset input for the new sentence
    if (audioRef.current && transcriptList[idx]) {
      audioRef.current.currentTime = transcriptList[idx].t;
      dictTargetEndTime.current = transcriptList[idx + 1] ? transcriptList[idx + 1].t - 0.1 : audioRef.current.duration;
      if (!playing) {
        audioRef.current.play().catch(() => setPlaying(false));
        setPlaying(true);
      }
    }
  };

  const checkDictation = () => {
    if (!transcriptList[dictIndex]) return;

    const target = transcriptList[dictIndex].en.toLowerCase().replace(/[.,!?;:]/g, '');
    const input = dictInput.toLowerCase().replace(/[.,!?;:]/g, '');

    const targetWords = target.split(/\s+/).filter(Boolean);
    const inputWords = input.split(/\s+/).filter(Boolean);

    let correctCount = 0;
    const diffNodes = targetWords.map((tw, i) => {
      const iw = inputWords[i];
      if (tw === iw) {
        correctCount++;
        return <span key={i} style={{ color: '#4e8a3c', fontWeight: 600 }}>{tw} </span>;
      }
      return <span key={i} style={{ color: '#b5811f', textDecoration: 'line-through' }}>{tw} </span>;
    });

    const score = targetWords.length > 0 ? Math.round((correctCount / targetWords.length) * 100) : 0;

    setDictResults(prev => ({
      ...prev,
      [dictIndex]: { score, diff: diffNodes }
    }));
  };

  const handleAnswer = (idx: number, val: string) => {
    setAnswers(prev => ({ ...prev, [idx]: val }));
    setChecked(false);
  };

  // Determine which questions to show
  const displayedQuestions = part === 1 
    ? (currentSubQuestion ? [{ sq: currentSubQuestion, idx: active }] : [])
    : subQuestions.map((sq, idx) => ({ sq, idx }));

  const canCheck = part === 1 
    ? !!answers[active] 
    : subQuestions.length > 0 && subQuestions.every((_, i) => !!answers[i]);

  const gridCols = showT ? 'minmax(380px, 1fr) 520px 340px' : 'minmax(420px, 1fr) 680px 48px';

  return (
    <div className="screen">
      <TopBar />
      <audio ref={audioRef} src={audioFile} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />

      <div style={{ position: 'absolute', inset: 0, paddingTop: 92, display: 'grid', placeItems: 'center' }}>
        <div style={{
          width: 'min(1420px, 98vw)',
          height: 'min(82vh, 760px)',
          display: 'grid',
          gridTemplateColumns: gridCols,
          gap: 16,
          transition: 'grid-template-columns 280ms var(--ease), width 280ms var(--ease)',
        }}>

          {/* ── LEFT: Questions & Interface ─────────────────────────────────── */}
          <div className="glass scroll" style={{
            borderRadius: 'var(--r-xl)', overflowY: 'auto', overflowX: 'hidden',
            display: 'flex', flexDirection: 'column', minHeight: 0
          }}>
            {/* panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.5)',
              position: 'sticky', top: 0, background: 'rgba(255,255,255,0.7)', 
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', zIndex: 2,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 14,
                  background: 'linear-gradient(135deg, #d9e89d, #b8d472)', 
                  color: '#28321e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  boxShadow: '0 4px 12px rgba(184,212,114,0.4)',
                }}>
                  <Icon name="headphones" size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#2c3622', letterSpacing: '-0.02em' }}>Luyện nghe</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['1', '2', '3', '4'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => { setPart(Number(p) as 1 | 2 | 3 | 4); setExamIndex(0); setActive(0); setAnswers({}); setChecked(false); }}
                          style={{
                            padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                            background: part === Number(p) ? '#74a84a' : 'rgba(116,168,74,0.1)',
                            color: part === Number(p) ? '#ffffff' : '#4d7031',
                          }}
                        >
                          Part {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowExamModal(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.05)',
                      padding: '4px 10px', borderRadius: 8, cursor: 'pointer', alignSelf: 'flex-start',
                      fontSize: 12, color: '#68735b', fontWeight: 500, transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <Icon name="file-text" size={12} />
                    {exams[examIndex]?.title || `Đề ${examIndex + 1}`}
                    <span style={{ opacity: 0.6 }}><Icon name="chevron-down" size={12} /></span>
                  </button>
                </div>
              </div>

            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>

              {/* NEW: Premium Left Column Tabs */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={() => setLeftTab('luyen-nghe')}
                  style={{ 
                    position: 'relative', flex: 1, padding: '16px 0', 
                    borderRadius: 16, border: leftTab === 'luyen-nghe' ? '1px solid #fff' : '1px solid transparent',
                    cursor: 'pointer', fontWeight: 700, fontSize: 15,
                    background: leftTab === 'luyen-nghe' ? '#ffffff' : 'transparent', 
                    boxShadow: leftTab === 'luyen-nghe' ? '0 8px 24px rgba(111,174,90,0.12)' : 'none', 
                    color: leftTab === 'luyen-nghe' ? '#2c3622' : '#88927d', 
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }}
                >
                  <span style={{ position: 'absolute', top: 12, left: 16, fontSize: 12, opacity: leftTab === 'luyen-nghe' ? 1 : 0.5 }}>✧</span>
                  Làm bài tập
                </button>
                <button 
                  onClick={() => setLeftTab('chep-chinh-ta')}
                  style={{ 
                    position: 'relative', flex: 1, padding: '16px 0', 
                    borderRadius: 16, border: leftTab === 'chep-chinh-ta' ? '1px solid #fff' : '1px solid transparent',
                    cursor: 'pointer', fontWeight: 700, fontSize: 15,
                    background: leftTab === 'chep-chinh-ta' ? '#ffffff' : 'transparent', 
                    boxShadow: leftTab === 'chep-chinh-ta' ? '0 8px 24px rgba(111,174,90,0.12)' : 'none', 
                    color: leftTab === 'chep-chinh-ta' ? '#2c3622' : '#88927d', 
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }}
                >
                  <span style={{ position: 'absolute', top: 12, left: 16, fontSize: 12, opacity: leftTab === 'chep-chinh-ta' ? 1 : 0.5 }}>✧</span>
                  Chép chính tả
                </button>
              </div>

              {leftTab === 'luyen-nghe' && (
                <>
                  {/* TABS (Only for Part 1) */}
                  {part === 1 && subQuestions.length > 1 && (
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {subQuestions.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setActive(i); setChecked(false); }}
                        className={`chip ${i === active ? 'active' : ''}`}
                        style={{ 
                          background: i === active ? 'var(--accent)' : 'var(--glass-2)',
                          color: i === active ? 'var(--accent-ink)' : 'inherit'
                        }}
                      >
                        Câu {i + 1}
                      </button>
                    ))}
                 </div>
              )}

              {/* SHARED INSTRUCTIONS/OPTIONS (For Parts 2, 3, 4) */}
              {part !== 1 && mainQuestion && (
                 <div className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
                    <p style={{ fontSize: 14.5, color: 'var(--ink)', margin: '0 0 12px', fontWeight: 600 }}>
                      {mainQuestion.content}
                    </p>
                    {mainQuestion.answerList && mainQuestion.answerList.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        {mainQuestion.answerList.map((ans, i) => (
                           <div key={i} style={{
                             background: 'rgba(255,255,255,0.6)', padding: '10px 14px',
                             borderRadius: 'var(--r-sm)', border: '1px solid var(--glass-edge)',
                             fontSize: 14, color: 'var(--ink)'
                           }}>
                             {ans.id ? <strong>{ans.id}. </strong> : null}{ans.content}
                           </div>
                        ))}
                      </div>
                    )}
                 </div>
              )}

              {/* RENDER QUESTIONS */}
              {displayedQuestions.map(({ sq, idx }) => {
                const isCorrect = checked && answers[idx] === sq.correctAnswer;
                
                return (
                  <div key={idx} className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div className="label-cap" style={{ color: 'var(--accent-deep)' }}>
                        <Icon name="help-circle" size={13} /> Câu hỏi {part !== 1 ? idx + 1 : active + 1}
                      </div>
                    </div>
                    <p style={{ fontSize: 15, color: 'var(--ink)', margin: '0 0 16px', fontWeight: 600 }}>
                      {sq.content}
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Choices based on part */}
                      {part === 1 || part === 4 ? (
                        sq.answerList?.map((ans, aIdx) => (
                          <label key={aIdx} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '12px 14px', borderRadius: 'var(--r-sm)',
                            border: '1px solid var(--glass-edge)',
                            background: answers[idx] === ans.content ? 'rgba(217,232,157,0.3)' : 'rgba(255,255,255,0.65)',
                            cursor: 'pointer', transition: 'all 150ms'
                          }}>
                            <input type="radio" name={`ans_${idx}`} value={ans.content} checked={answers[idx] === ans.content} onChange={() => handleAnswer(idx, ans.content)} />
                            <span style={{ fontSize: 14.5 }}>{ans.content}</span>
                          </label>
                        ))
                      ) : part === 2 ? (
                        <select 
                          value={answers[idx] || ''} 
                          onChange={(e) => handleAnswer(idx, e.target.value)}
                          style={{
                            padding: '12px 14px', borderRadius: 'var(--r-sm)',
                            border: '1px solid var(--glass-edge)',
                            background: 'rgba(255,255,255,0.65)',
                            fontSize: 14.5, outline: 'none'
                          }}
                        >
                          <option value="">-- Chọn đáp án --</option>
                          {mainQuestion?.answerList?.map(ans => (
                            <option key={ans.id} value={ans.content}>{ans.content}</option>
                          ))}
                        </select>
                      ) : part === 3 ? (
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                           {mainQuestion?.answerList?.map((ans, aIdx) => (
                              <label key={aIdx} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                                borderRadius: 'var(--r-sm)', border: '1px solid var(--glass-edge)',
                                background: answers[idx] === ans.content ? 'rgba(217,232,157,0.3)' : 'rgba(255,255,255,0.65)',
                                cursor: 'pointer'
                              }}>
                                 <input type="radio" name={`ans3_${idx}`} value={ans.content} checked={answers[idx] === ans.content} onChange={() => handleAnswer(idx, ans.content)} />
                                 <span style={{ fontSize: 14.5 }}>{ans.content}</span>
                              </label>
                           ))}
                        </div>
                      ) : null}
                    </div>

                    {checked && (
                      <div style={{
                        marginTop: 16, padding: '11px 13px', borderRadius: 'var(--r-sm)',
                        background: isCorrect ? 'rgba(111,174,90,0.14)' : 'rgba(224,169,59,0.12)',
                        border: `1px solid ${isCorrect ? 'rgba(111,174,90,0.4)' : 'rgba(224,169,59,0.35)'}`,
                      }}>
                        <div style={{
                          fontSize: 13, fontWeight: 800,
                          color: isCorrect ? '#4e8a3c' : '#b5811f',
                        }}>
                          {isCorrect ? 'Chính xác! 🌿' : `Chưa đúng. Đáp án: ${sq.correctAnswer}`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ACTION BUTTONS */}
              {displayedQuestions.length > 0 && (
                <div style={{ display: 'flex', gap: 9, marginTop: 8 }}>
                  <button onClick={() => {if (audioRef.current){ audioRef.current.currentTime = 0; setPlaying(true); }}} className="btn btn-soft btn-sm">
                    <Icon name="volume" size={15} /> Nghe lại
                  </button>
                  <button
                    onClick={() => setChecked(true)}
                    className="btn btn-primary btn-sm"
                    style={{ marginLeft: 'auto' }}
                    disabled={!canCheck}
                  >
                    <Icon name="check" size={15} /> Kiểm tra
                  </button>
                </div>
              )}
              </>
              )}

              {leftTab === 'chep-chinh-ta' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="label-cap" style={{ color: 'var(--accent-deep)' }}>
                      <Icon name="edit-3" size={13} /> Chép chính tả
                    </div>
                  </div>

                  {transcriptList.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.4)', padding: '6px 12px', borderRadius: 'var(--r-sm)' }}>
                        <button disabled={dictIndex === 0} onClick={() => playDictSentence(dictIndex - 1)} className="btn btn-sm" style={{ background: 'transparent' }}>{'<< Trước'}</button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Câu {dictIndex + 1} / {transcriptList.length}</span>
                        <button disabled={dictIndex === transcriptList.length - 1} onClick={() => playDictSentence(dictIndex + 1)} className="btn btn-sm" style={{ background: 'transparent' }}>{'Tiếp >>'}</button>
                      </div>
                      
                      <button onClick={() => playDictSentence(dictIndex)} className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }}>
                        <Icon name="play" size={14} /> Nghe lại câu này
                      </button>

                      <textarea
                        className="scroll"
                        value={dictInput}
                        onChange={e => setDictInput(e.target.value)}
                        placeholder="Nghe đoạn trên và nhập chính xác những gì bạn nghe được..."
                        style={{
                          flex: 1, resize: 'none', border: '1px solid var(--glass-edge)',
                          background: 'rgba(255,255,255,0.6)', borderRadius: 'var(--r-md)',
                          padding: '14px 16px', fontSize: 14.5, color: 'var(--ink)',
                          lineHeight: 1.6, outline: 'none', fontFamily: 'var(--font-sans)', minHeight: 120
                        }}
                      />

                      {dictResults[dictIndex] && (
                        <div style={{ fontSize: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(111,174,90,0.3)' }}>
                          <strong style={{ color: dictResults[dictIndex].score > 80 ? '#4e8a3c' : '#b5811f' }}>Độ chính xác: {dictResults[dictIndex].score}%</strong>
                          <div style={{ marginTop: 6, lineHeight: 1.6 }}>{dictResults[dictIndex].diff}</div>
                        </div>
                      )}

                      <button onClick={checkDictation} className="btn btn-primary btn-sm" style={{ marginTop: 'auto', alignSelf: 'flex-end' }}>
                        Chấm điểm
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14, background: 'rgba(255,255,255,0.4)', borderRadius: 'var(--r-md)', flex: 1, display: 'grid', placeItems: 'center' }}>
                      Đề bài này chưa có dữ liệu lời thoại để luyện chép chính tả.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* ── MIDDLE: Audio Player ─────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
            <div className="glass rise" style={{ borderRadius: 'var(--r-xl)', padding: 16 }}>
               <AudioPlayer playing={playing} onToggle={() => setPlaying((p) => !p)} />
            </div>
          </div>

          {/* ── RIGHT: transcript ────────────────────────────────────────── */}
          <div className="glass rise" style={{
            borderRadius: 'var(--r-xl)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: showT ? 'var(--glass)' : 'rgba(255, 255, 255, 0.16)',
            cursor: !showT ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }} 
            onClick={() => { if (!showT) setShowT(true); }}
            onMouseEnter={e => { if (!showT) e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { if (!showT) e.currentTarget.style.background = 'rgba(255,255,255,0.4)'; }}
          >
            {showT ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 18px', borderBottom: '1px solid var(--glass-edge)',
                }}>
                  <div className="label-cap" style={{ whiteSpace: 'nowrap' }}>Lời thoại</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="chip" style={{ fontSize: 11.5 }}>{transcriptList.length} câu</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowT(false); }} 
                      style={{ 
                        padding: '6px 12px', borderRadius: '16px', border: 'none', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', 
                        display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink)', transition: 'all 0.2s',
                        fontSize: 12, fontWeight: 600
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                    >
                      Ẩn lời thoại
                    </button>
                  </div>
                </div>

                <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                  {transcriptList.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                      Chưa có lời thoại cho bài nghe này.
                    </div>
                  ) : (
                    transcriptList.map((line, i) => {
                      const isPassed = currentTime >= line.t;
                      const nextT = transcriptList[i + 1]?.t || Infinity;
                      const isCurrent = currentTime >= line.t && currentTime < nextT;

                      return (
                        <div
                          key={i}
                          onClick={() => pickTranscript(i)}
                          style={{
                            display: 'flex', gap: 9, padding: '10px 11px',
                            borderRadius: 'var(--r-sm)', cursor: 'pointer', marginBottom: 3,
                            background: isCurrent ? 'rgba(217,232,157,0.45)' : 'transparent',
                            border: isCurrent ? '1px solid var(--accent-strong)' : '1px solid transparent',
                            transition: 'all 140ms var(--ease)',
                          }}
                          onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = 'rgba(40,55,30,0.05)'; }}
                          onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{
                            fontSize: 11, fontFamily: 'var(--font-mono)',
                            color: isCurrent ? 'var(--accent-deep)' : 'var(--ink-3)',
                            fontWeight: 700, paddingTop: 2, minWidth: 34,
                          }}>
                            {fmt(line.t)}
                          </span>
                          <span style={{
                            flex: 1, fontSize: 13.5, color: 'var(--ink)',
                            lineHeight: 1.5, fontWeight: isCurrent ? 600 : 500,
                            opacity: isPassed ? 1 : 0.6,
                          }}>
                            {line.en}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#bbbdbaff' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 600, letterSpacing: 2, fontSize: 13, textTransform: 'uppercase', opacity: 1 }}>
                  Hiện lời thoại
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EXAM SELECT MODAL */}
      {showExamModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowExamModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 24, width: '90%', maxWidth: 400,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2c3622' }}>Chọn Đề Thi</div>
              <button onClick={() => setShowExamModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#88927d' }}>
                <Icon name="x" size={20} />
              </button>
            </div>
            
            <div className="scroll" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
              {exams.map((ex, i) => (
                <button
                  key={ex._id}
                  onClick={() => { setExamIndex(i); setActive(0); setAnswers({}); setChecked(false); setShowExamModal(false); }}
                  style={{
                    padding: '12px 16px', borderRadius: 12, border: '1px solid', textAlign: 'left',
                    cursor: 'pointer', fontSize: 14.5, fontWeight: 600, transition: 'all 0.2s',
                    background: examIndex === i ? 'rgba(116,168,74,0.1)' : '#f8f9f6',
                    borderColor: examIndex === i ? '#74a84a' : 'transparent',
                    color: examIndex === i ? '#4d7031' : '#2c3622',
                  }}
                  onMouseEnter={e => { if (examIndex !== i) e.currentTarget.style.background = '#f0f2eb'; }}
                  onMouseLeave={e => { if (examIndex !== i) e.currentTarget.style.background = '#f8f9f6'; }}
                >
                  {ex.title || `Đề ${i + 1}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
