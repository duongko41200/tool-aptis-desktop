import { useState, useEffect } from 'react';
import AudioRecorderWidget from './AudioRecorderWidget';
import TeleprompterWidget from './TeleprompterWidget';
import Icon from '../common/Icon';
import { loadSpeakingExams, SpeakingExam } from '../../services/speaking-exam-service';

export default function SelfStudyTab() {
  const [part, setPart] = useState<1 | 2 | 3 | 4>(1);
  const [exams, setExams] = useState<SpeakingExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [activeSqIndex, setActiveSqIndex] = useState(0);
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchExams = async () => {
      const data = await loadSpeakingExams(part);
      if (active) {
        setExams(data);
        if (data.length > 0) setSelectedExamId(data[0]._id);
        else setSelectedExamId(null);
      }
    };
    fetchExams();
    return () => { active = false; };
  }, [part]);

  useEffect(() => {
    setActiveSqIndex(0);
  }, [part, selectedExamId]);

  const activeExam = exams.find(e => e._id === selectedExamId);

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: isTeleprompterOpen ? '260px 1fr 340px' : '260px 1fr', gap: 16, position: 'relative' }}>
      
      {/* SIDEBAR: Navigation */}
      <div className="glass rise" style={{ borderRadius: 'var(--r-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-edge)', background: 'rgba(255,255,255,0.4)' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map(p => (
              <button 
                key={p} 
                onClick={() => setPart(p as 1|2|3|4)}
                className={`chip ${part === p ? 'chip-accent' : ''}`}
                style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', opacity: part === p ? 1 : 0.7 }}
              >
                Part {p}
              </button>
            ))}
          </div>
        </div>

        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {exams.map(exam => (
            <button
              key={exam._id}
              onClick={() => setSelectedExamId(exam._id)}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                transition: 'all 0.2s', border: '1px solid transparent',
                background: selectedExamId === exam._id ? 'var(--accent)' : 'transparent',
                color: selectedExamId === exam._id ? 'var(--accent-ink)' : 'var(--ink)',
                boxShadow: selectedExamId === exam._id ? 'var(--sh-sm)' : 'none',
              }}
              onMouseEnter={e => { if (selectedExamId !== exam._id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (selectedExamId !== exam._id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontSize: 13.5, fontWeight: selectedExamId === exam._id ? 700 : 500 }}>
                {exam.title || "Bài luyện tập"}
              </div>
            </button>
          ))}
          {exams.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)', fontSize: 13 }}>
              Không có dữ liệu cho Part {part}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT: Exam Viewer & Recorder */}
      <div className="glass rise scroll" style={{ borderRadius: 'var(--r-xl)', overflowY: 'auto', padding: 32 }}>
        {!activeExam ? (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 15 }}>
            Vui lòng chọn một đề bài bên trái để bắt đầu.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 800, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="label-cap" style={{ color: 'var(--accent-deep)', marginBottom: 8 }}>SPEAKING PART {part}</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{activeExam.title}</h2>
              {activeExam.description && <p style={{ marginTop: 12, fontSize: 15, color: 'var(--ink-2)' }}>{activeExam.description}</p>}
            </div>

            {activeExam.questions.map((q, qIdx) => (
              <div key={q._id || qIdx} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {q.content && q.content !== activeExam.title && q.content !== "không có tiêu đề" && (
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{q.content}</div>
                )}
                
                {(() => {
                  let imagesToRender: string[] = [];
                  if (Array.isArray(q.image) && q.image.length > 0) {
                    imagesToRender = q.image;
                  } else if (typeof q.image === 'string' && q.image.trim() !== '') {
                    imagesToRender = [q.image];
                  } else if (q.subQuestion && q.subQuestion.length > 0) {
                    // Try to find image from subQuestions
                    const sqImg = q.subQuestion.find(sq => typeof sq.image === 'string' && sq.image.trim() !== '')?.image as string | undefined;
                    if (sqImg) imagesToRender = [sqImg];
                  }

                  if (imagesToRender.length === 0) return null;

                  return (
                    <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {imagesToRender.map((img, i) => {
                        const src = img.startsWith('http') ? img : `https://files.aptisacademy.com.vn/${img.replace(/^\/+/, '')}`;
                        return (
                          <img key={i} src={src} alt="Question Context" style={{ width: '100%', maxWidth: imagesToRender.length > 1 ? 220 : 360, borderRadius: 'var(--r-md)', objectFit: 'cover', boxShadow: 'var(--sh-md)' }} />
                        );
                      })}
                    </div>
                  );
                })()}

                {q.subQuestion && q.subQuestion.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {part === 4 && (
                      <div style={{ background: '#fff', padding: 24, borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-sm)', border: '1px solid var(--glass-edge)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                          {q.subQuestion.map((sq, sqIdx) => (
                            <div key={sq._id || sqIdx} style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', display: 'flex', gap: 12 }}>
                              <span style={{ color: 'var(--accent-deep)', flexShrink: 0 }}>Q{sqIdx + 1}.</span>
                              <span>{sq.content}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ borderTop: '1px solid var(--glass-edge)', paddingTop: 20 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 16, textAlign: 'center' }}>
                            Ghi âm một bài nói liên tục cho các câu hỏi trên
                          </div>
                          <AudioRecorderWidget 
                            recordKey={`speaking_part4_${activeExam._id}_${q._id}_combined`} 
                            timeLimit={120}
                          />
                        </div>
                      </div>
                    )}

                    {part !== 4 && q.subQuestion.map((sq, sqIdx) => {
                      if (sqIdx !== activeSqIndex) return null;
                      
                      const recordKey = `speaking_part${part}_${activeExam._id}_${q._id}_${sq._id}`;
                      const hasNext = sqIdx < q.subQuestion.length - 1;
                      const hasPrev = sqIdx > 0;
                      const timeLimit = part === 1 ? 30 : 45;
                      
                      return (
                        <div key={sq._id || sqIdx} style={{ background: '#fff', padding: 24, borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-sm)', border: '1px solid var(--glass-edge)' }}>
                          <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 20, display: 'flex', gap: 12 }}>
                            <span style={{ color: 'var(--accent-deep)', flexShrink: 0 }}>Q{sqIdx + 1}.</span>
                            <span>{sq.content}</span>
                          </div>
                          <AudioRecorderWidget 
                            recordKey={recordKey}
                            onNext={() => setActiveSqIndex(sqIdx + 1)}
                            onPrev={() => setActiveSqIndex(sqIdx - 1)}
                            hasNext={hasNext}
                            hasPrev={hasPrev}
                            timeLimit={timeLimit}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Fallback if no subquestions but there is a main question recording needed */}
                {(!q.subQuestion || q.subQuestion.length === 0) && (
                   <div style={{ background: '#fff', padding: 24, borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-sm)', border: '1px solid var(--glass-edge)' }}>
                      <AudioRecorderWidget 
                        recordKey={`speaking_part${part}_${activeExam._id}_${q._id}`} 
                        timeLimit={part === 4 ? 120 : part === 1 ? 30 : 45}
                      />
                   </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teleprompter Toggle Button */}
      <button
        onClick={() => setIsTeleprompterOpen(!isTeleprompterOpen)}
        className="glass rise"
        style={{
          position: 'absolute',
          right: isTeleprompterOpen ? 356 : 16,
          bottom: 16,
          zIndex: 10,
          width: 44,
          height: 44,
          borderRadius: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '1px solid var(--glass-edge)',
          boxShadow: 'var(--sh-md)',
          transition: 'all 0.3s ease',
          background: isTeleprompterOpen ? 'rgba(255,255,255,0.7)' : 'var(--accent)',
          color: isTeleprompterOpen ? 'var(--ink)' : 'var(--accent-ink)'
        }}
        title={isTeleprompterOpen ? "Đóng Máy nhắc chữ" : "Mở Máy nhắc chữ"}
      >
        <Icon name={isTeleprompterOpen ? "chevron-right" : "text-align-left"} size={20} />
      </button>

      {/* RIGHT SIDEBAR: Teleprompter */}
      {isTeleprompterOpen && (
        <div style={{ borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
          <TeleprompterWidget />
        </div>
      )}

    </div>
  );
}
