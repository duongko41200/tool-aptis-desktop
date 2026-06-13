import { useState, useRef, useEffect } from 'react';
import Icon from '../common/Icon';
import { loadSpeakingExams, SpeakingExam, Question, SubQuestion } from '../../services/speaking-exam-service';
import { scoreSpeaking } from '../../services/gemini-speaking-scorer';

interface Correction {
  wrong: string;
  right: string;
  note: string;
}

interface Message {
  from: 'ai' | 'me';
  text: string;
  corr?: Correction;
  isLoading?: boolean;
}

export default function AIPracticeTab() {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [rec, setRec] = useState(false);
  
  // Selection states
  const [part, setPart] = useState<1 | 2 | 3 | 4>(1);
  const [mode, setMode] = useState<'random' | 'select'>('random');
  const [exams, setExams] = useState<SpeakingExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  
  // Active Question states
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [activeSubQuestion, setActiveSubQuestion] = useState<SubQuestion | null>(null);
  
  // Recording states
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const timerInterval = useRef<number | null>(null);

  // Load exams
  useEffect(() => {
    let active = true;
    loadSpeakingExams(part).then(data => {
      if (active) {
        setExams(data);
        if (data.length > 0) setSelectedExamId(data[0]._id);
      }
    });
    return () => { active = false; };
  }, [part]);

  // Auto scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem('gemini_api_key', val);
  };

  const getRandomQuestion = () => {
    if (exams.length === 0) return null;
    let ex = exams.find(e => e._id === selectedExamId);
    if (mode === 'random' || !ex) {
      ex = exams[Math.floor(Math.random() * exams.length)];
    }
    if (!ex || ex.questions.length === 0) return null;
    const q = ex.questions[Math.floor(Math.random() * ex.questions.length)];
    
    let sq: SubQuestion | null = null;
    if (part !== 4 && q.subQuestion && q.subQuestion.length > 0) {
       sq = q.subQuestion[Math.floor(Math.random() * q.subQuestion.length)];
    }
    return { q, sq };
  };

  const startPractice = () => {
    if (!apiKey.trim()) {
      alert("Vui lòng nhập Gemini API Key ở cột phải trước!");
      return;
    }
    const qData = getRandomQuestion();
    if (!qData) {
      alert("Không tìm thấy câu hỏi nào.");
      return;
    }
    setActiveQuestion(qData.q);
    setActiveSubQuestion(qData.sq);
    
    let questionText = qData.q.content || '';
    if (part === 4) {
      questionText += '\n' + (qData.q.subQuestion || []).map((s, i) => `Q${i+1}: ${s.content}`).join('\n');
    } else if (qData.sq) {
      questionText = qData.sq.content;
    }

    setMsgs([
      { from: 'ai', text: `Chào bạn! Chúng ta bắt đầu bài tập Part ${part} nhé.\n\nCâu hỏi của bạn là:\n"${questionText}"` }
    ]);
  };

  const toggleRecording = async () => {
    if (!activeQuestion) {
      alert("Vui lòng nhấn Bắt đầu luyện tập trước.");
      return;
    }
    
    if (rec) {
      // Stop recording
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
      }
      setRec(false);
      if (timerInterval.current) clearInterval(timerInterval.current);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);
        audioChunks.current = [];
        mediaRecorder.current.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data); };
        mediaRecorder.current.onstop = () => {
           const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
           handleAudioSubmit(blob);
        };
        mediaRecorder.current.start();
        setRec(true);
        setDuration(0);
        timerInterval.current = window.setInterval(() => setDuration(d => d + 1), 1000);
      } catch (err) {
        console.error(err);
        alert("Lỗi Microphone");
      }
    }
  };

  const handleAudioSubmit = async (blob: Blob) => {
    // Add temporary loading message for user
    const msgIndex = msgs.length;
    setMsgs(m => [...m, { from: 'me', text: '...', isLoading: true }]);

    try {
      let questionText = activeQuestion?.content || '';
      let suggestionText = '';
      if (part === 4) {
        questionText += '\n' + (activeQuestion?.subQuestion || []).map((sq, i) => `Q${i+1}: ${sq.content}`).join('\n');
        suggestionText = (activeQuestion?.subQuestion || []).map(sq => sq.suggestion).join('\n');
      } else if (activeSubQuestion) {
        questionText = activeSubQuestion.content;
        suggestionText = activeSubQuestion.suggestion || '';
      }
      
      const res = await scoreSpeaking({
        part,
        question: questionText,
        audioBlob: blob,
        suggestion: suggestionText
      }, apiKey);
      
      // Update user message with transcript and corrections
      let corr: Correction | undefined;
      if (res.corrections && res.corrections.length > 0) {
         // pick the first grammar/vocab correction for inline display
         const c = res.corrections[0];
         corr = { wrong: c.originalText, right: c.correction, note: c.note };
      }
      
      setMsgs(m => {
        const newM = [...m];
        newM[msgIndex] = { from: 'me', text: res.transcript, corr };
        return newM;
      });

      // Prepare next question
      const nextQ = getRandomQuestion();
      if (nextQ) {
         setActiveQuestion(nextQ.q);
         setActiveSubQuestion(nextQ.sq);
         
         let nextQuestionText = nextQ.q.content || '';
         if (part === 4) {
           nextQuestionText += '\n' + (nextQ.q.subQuestion || []).map((s, i) => `Q${i+1}: ${s.content}`).join('\n');
         } else if (nextQ.sq) {
           nextQuestionText = nextQ.sq.content;
         }

         setTimeout(() => {
           setMsgs(m => [...m, { 
             from: 'ai', 
             text: `**Nhận xét:**\n${res.feedback}\n\n**Điểm:** Trôi chảy: ${res.fluencyScore}/5 | Từ vựng: ${res.vocabScore}/5 | Ngữ pháp: ${res.grammarScore}/5 | Phát âm: ${res.pronunciationScore}/5\n\n**Câu trả lời mẫu:**\n${res.modelAnswer}\n\n---\n\n**Câu hỏi tiếp theo:**\n"${nextQuestionText}"` 
           }]);
         }, 800);
      }

    } catch (err: any) {
      console.error(err);
      setMsgs(m => {
        const newM = [...m];
        newM[msgIndex] = { from: 'me', text: '[Lỗi xử lý âm thanh]' };
        newM.push({ from: 'ai', text: `Lỗi: ${err.message}` });
        return newM;
      });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Get all corrections for right panel
  const allCorrections = msgs.filter(m => m.corr).map(m => m.corr!);

  const Bubble = ({ m }: { m: Message }) => {
    const isMe = m.from === 'me';
    return (
      <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 10 }} className="rise">
        {!isMe && (
          <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: 'var(--sh-glow)' }}>
            <Icon name="sparkle" size={17} />
          </span>
        )}
        <div style={{ maxWidth: '76%' }}>
          <div style={{ padding: '12px 16px', borderRadius: isMe ? '18px 18px 6px 18px' : '18px 18px 18px 6px', background: isMe ? 'var(--accent)' : '#fff', color: isMe ? 'var(--accent-ink)' : 'var(--ink)', border: isMe ? 'none' : '1px solid var(--glass-edge)', boxShadow: 'var(--sh-sm)', fontSize: 14.5, fontWeight: 500, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {m.isLoading ? (
               <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 20 }}>
                 <span className="pulse-soft" style={{ width: 6, height: 6, background: 'var(--accent-ink)', borderRadius: '50%' }} />
                 <span className="pulse-soft" style={{ width: 6, height: 6, background: 'var(--accent-ink)', borderRadius: '50%', animationDelay: '0.2s' }} />
                 <span className="pulse-soft" style={{ width: 6, height: 6, background: 'var(--accent-ink)', borderRadius: '50%', animationDelay: '0.4s' }} />
               </div>
            ) : m.text}
          </div>
          {m.corr && (
            <div style={{ marginTop: 7, padding: '10px 13px', borderRadius: 'var(--r-sm)', background: 'rgba(224,169,59,0.12)', border: '1px solid rgba(224,169,59,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#b5811f', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Icon name="sparkle" size={13} /> Gợi ý sửa
              </div>
              <div style={{ fontSize: 13.5, marginTop: 5, color: 'var(--ink-2)' }}><s style={{ color: 'var(--bad)' }}>{m.corr.wrong}</s></div>
              <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 700 }}>{m.corr.right}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>{m.corr.note}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      {/* Chat panel */}
      <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'var(--r-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--glass-edge)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)' }}>
              <Icon name="sparkle" size={19} />
            </span>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>Trợ lý AI · Luyện nói</div>
              <div style={{ fontSize: 12, color: 'var(--good)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="pulse-soft" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--good)' }} /> Đang lắng nghe
              </div>
            </div>
          </div>
          <button className="chip"><Icon name="clock" size={14} /> {formatTime(duration)}</button>
        </div>

        <div ref={scrollRef} className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {msgs.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
              Nhấn "Bắt đầu luyện tập" ở cột phải để nhận câu hỏi đầu tiên.
            </div>
          )}
          {msgs.map((m, i) => <Bubble key={i} m={m} />)}
          {rec && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div className="chip chip-accent" style={{ gap: 8 }}>
                <span className="pulse-soft" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bad)' }} /> Đang ghi âm… {formatTime(duration)}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{ padding: 18, borderTop: '1px solid var(--glass-edge)', display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
          <button className="iconbtn" style={{ background: 'rgba(40,55,30,0.07)', color: 'var(--ink)', border: '1px solid var(--glass-edge)', opacity: 0.5, cursor: 'not-allowed' }} title="Bàn phím">
            <Icon name="chat" size={18} />
          </button>
          
          <button 
            onClick={toggleRecording}
            className={rec ? '' : 'pulse-soft'}
            style={{ position: 'relative', width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: rec ? 'var(--bad)' : 'var(--accent)', color: rec ? '#fff' : 'var(--accent-ink)', boxShadow: rec ? '0 0 0 8px rgba(217,138,106,0.25)' : 'var(--sh-glow)', transition: 'all 200ms var(--ease)', border: 'none', cursor: 'pointer' }}
          >
            <Icon name={rec ? 'pause' : 'mic'} size={28} fill={rec} />
          </button>
          
          <button className="iconbtn" style={{ background: 'rgba(40,55,30,0.07)', color: 'var(--ink)', border: '1px solid var(--glass-edge)', opacity: 0.5, cursor: 'not-allowed' }} title="Nghe lại">
            <Icon name="volume" size={18} />
          </button>
        </div>
      </div>

      {/* Side panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        
        {/* Setup Panel */}
        <div className="glass" style={{ padding: 18 }}>
          <div className="label-cap" style={{ color: 'var(--accent-deep)', marginBottom: 10 }}>THIẾT LẬP BÀI TẬP</div>
          
          <div style={{ marginBottom: 12 }}>
             <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Chọn Part</div>
             <div style={{ display: 'flex', gap: 6 }}>
               {[1, 2, 3, 4].map(p => (
                 <button 
                   key={p} 
                   onClick={() => setPart(p as 1|2|3|4)}
                   className={`chip ${part === p ? 'chip-accent' : ''}`}
                   style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', opacity: part === p ? 1 : 0.6, padding: '6px 0' }}
                 >
                   P{p}
                 </button>
               ))}
             </div>
          </div>

          <div style={{ marginBottom: 12 }}>
             <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Chế độ chọn đề</div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                 <input type="radio" checked={mode === 'random'} onChange={() => setMode('random')} />
                 Hỏi ngẫu nhiên
               </label>
               <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                 <input type="radio" checked={mode === 'select'} onChange={() => setMode('select')} />
                 Chọn đề cụ thể
               </label>
             </div>
             {mode === 'select' && (
               <select 
                 value={selectedExamId} 
                 onChange={e => setSelectedExamId(e.target.value)}
                 style={{ marginTop: 8, width: '100%', padding: '8px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--glass-edge)', background: 'rgba(255,255,255,0.5)', fontSize: 13 }}
               >
                 {exams.map(e => <option key={e._id} value={e._id}>{e.title || "Bài luyện tập"}</option>)}
               </select>
             )}
          </div>

          <div style={{ marginBottom: 12 }}>
             <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Gemini API Key</div>
             <input 
               type="password" 
               value={apiKey} 
               onChange={handleApiKeyChange}
               placeholder="AIzaSy..." 
               style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--glass-edge)', background: 'rgba(255,255,255,0.5)', fontSize: 13 }}
             />
          </div>

          <button 
            onClick={startPractice}
            style={{ width: '100%', padding: '10px', background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: 'var(--sh-sm)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
          >
            <Icon name="play" size={16} /> Bắt đầu luyện tập
          </button>
        </div>

        {/* Live Corrections Panel */}
        <div className="glass scroll" style={{ padding: 18, flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="label-cap">SỬA LỖI TRỰC TIẾP</div>
            <span className="chip chip-accent" style={{ fontSize: 11 }}>{allCorrections.length}</span>
          </div>
          {allCorrections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-3)', fontSize: 13 }}>
              <Icon name="checkCircle" size={28} style={{ color: 'var(--good)', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              <div>Chưa có lỗi nào. Tốt lắm!</div>
            </div>
          ) : allCorrections.map((c, i) => (
            <div key={i} style={{ padding: '11px 13px', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.6)', border: '1px solid var(--glass-edge)', marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 700 }}>{c.right}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{c.note}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
