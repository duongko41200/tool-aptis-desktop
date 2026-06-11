import { useState } from 'react';
import TopBar from '../components/layout/TopBar';
import Icon from '../components/common/Icon';
import WritingScorerPanel from '../components/writing/WritingScorerPanel';
import WritingHistoryPanel from '../components/writing/WritingHistoryPanel';
import writingData from '../public/data/exams/writing-part4.json';

export default function WritingPage() {
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [activePart, setActivePart] = useState<'part1' | 'part2'>('part1');
  
  // States for the writing room
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // If no topic selected, show topic list
  if (!selectedTopic) {
    return (
      <div className="screen">
        <TopBar />
        <div className="scroll" style={{ position: 'absolute', inset: 0, paddingTop: 92, overflowY: 'auto' }}>
          <div style={{ width: 'min(1080px,95vw)', margin: '0 auto', paddingBottom: 60 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--r-xl)', background: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent-ink)' }}>
                <Icon name="pencil" size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>Chọn đề bài Writing</h1>
                <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--ink-2)' }}>Luyện tập viết email theo form Aptis Part 4</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {writingData.map((topic: any) => (
                <div 
                  key={topic._id}
                  className="glass"
                  onClick={() => setSelectedTopic(topic)}
                  style={{ 
                    padding: 24, 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 16, 
                    borderRadius: 'var(--r-xl)', 
                    transition: 'all 0.2s var(--ease)',
                    border: '1px solid var(--glass-edge)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.3 }}>
                      {topic.title}
                    </h3>
                    <span className="chip" style={{ fontSize: 12, background: 'rgba(40,55,30,0.06)', color: 'var(--ink-2)', flexShrink: 0 }}>
                      <Icon name="clock" size={12} /> {topic.timeToDo}p
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {topic.questions[0]?.subQuestion?.map((sq: any) => (
                      <div key={sq._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ color: 'var(--accent-deep)', marginTop: 2 }}><Icon name="mail" size={14} /></span>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sq.content}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-deep)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Bắt đầu viết <Icon name="arrow-right" size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // History screen — same container as writing room
  if (showHistory) {
    return (
      <div className="screen">
        <TopBar />
        <div style={{ position: 'absolute', inset: 0, paddingTop: 70, display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 'min(1280px,98vw)', height: 'min(86vh,800px)' }}>
            <WritingHistoryPanel
              examId={selectedTopic._id}
              examTitle={selectedTopic.title}
              onBack={() => setShowHistory(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  // Writing Room
  const words1 = text1.trim() ? text1.trim().split(/\s+/).length : 0;
  const words2 = text2.trim() ? text2.trim().split(/\s+/).length : 0;

  const question = selectedTopic.questions[0];
  const subQ1 = question?.subQuestion?.[0];
  const subQ2 = question?.subQuestion?.[1];

  return (
    <div className="screen">
      <TopBar />
      <div style={{ position: 'absolute', inset: 0, paddingTop: 70, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 'min(1280px,98vw)', height: 'min(86vh,800px)', display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>

          {/* Left: prompt */}
          <div className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 8, paddingBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setSelectedTopic(null)}>
              <div className="chip" style={{ background: 'rgba(255,255,255,0.5)' }}>
                <Icon name="arrow-left" size={16} /> Quay lại
              </div>
            </div>

            <div className="glass" style={{ padding: 24, borderRadius: 'var(--r-xl)' }}>
              <div className="chip chip-accent" style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
                <Icon name="calendar" size={14} /> Đề bài
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: 1.2 }}>
                {selectedTopic.title}
              </h2>
              {question?.content && (
                <div 
                  style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: question.content }}
                />
              )}
            </div>

            {/* Sub questions guidelines */}
            <div className="glass" style={{ padding: 24, borderRadius: 'var(--r-xl)', flex: 1 }}>
              <div className="label-cap" style={{ marginBottom: 16 }}>Nhiệm vụ</div>
              
              {subQ1 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>1</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Email thân mật (khoảng 50 từ)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', paddingLeft: 32 }}>{subQ1.content}</p>
                </div>
              )}

              {subQ2 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>2</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Email trang trọng (120-150 từ)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', paddingLeft: 32 }}>{subQ2.content}</p>
                </div>
              )}
              
            </div>
          </div>

          {/* Right: editors tabbed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>

            {/* Tabs + history button row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div className="glass" style={{ display: 'inline-flex', gap: 4, padding: 6, borderRadius: 'var(--r-pill)' }}>
                <button
                  onClick={() => setActivePart('part1')}
                  style={{ padding: '8px 20px', borderRadius: 'var(--r-pill)', fontSize: 14, fontWeight: 700, color: activePart === 'part1' ? 'var(--accent-ink)' : 'var(--ink-2)', background: activePart === 'part1' ? 'var(--accent)' : 'transparent', transition: 'all 160ms var(--ease)', border: 'none', cursor: 'pointer' }}
                >
                  1. Thư thân mật
                </button>
                <button
                  onClick={() => setActivePart('part2')}
                  style={{ padding: '8px 20px', borderRadius: 'var(--r-pill)', fontSize: 14, fontWeight: 700, color: activePart === 'part2' ? 'var(--accent-ink)' : 'var(--ink-2)', background: activePart === 'part2' ? 'var(--accent)' : 'transparent', transition: 'all 160ms var(--ease)', border: 'none', cursor: 'pointer' }}
                >
                  2. Thư trang trọng
                </button>
              </div>
              <button
                className="btn btn-soft btn-sm"
                onClick={() => setShowHistory(true)}
                style={{ gap: 7, marginLeft: 'auto' }}
              >
                <Icon name="bookmark" size={14} />
                Lịch sử
              </button>
            </div>

            {/* Editor 1 */}
            {activePart === 'part1' && (
              <div className="glass scroll" style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--r-xl)', flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--glass-edge)', background: 'rgba(255,255,255,0.4)', position: 'sticky', top: 0, zIndex: 1, borderRadius: 'var(--r-xl) var(--r-xl) 0 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(40,55,30,0.1)', color: 'var(--ink)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>1</span>
                    <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>Phòng viết: Thân mật</span>
                  </div>
                  <span className="chip" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{words1} từ</span>
                </div>
                <textarea
                  value={text1}
                  onChange={e => setText1(e.target.value)}
                  placeholder="Viết email cho bạn bè ở đây..."
                  style={{ minHeight: 200, border: 'none', outline: 'none', resize: 'none', background: 'transparent', padding: '20px 24px', fontSize: 15, lineHeight: 1.6, color: 'var(--ink)', fontFamily: 'var(--font)' }}
                />

                {/* Scorer panel — replaces old "Chấm bài" button */}
                <div style={{ padding: '0 24px 24px' }}>
                  <WritingScorerPanel
                    key={selectedTopic._id + '-1'}
                    essay={text1}
                    examId={selectedTopic._id}
                    examTitle={selectedTopic.title}
                    examContentHtml={question?.content ?? ''}
                    examSummary={selectedTopic.summary}
                    subQuestionContent={subQ1?.content ?? ''}
                    letterType="informal"
                    wordCountTarget={50}
                  />
                </div>
              </div>
            )}

            {/* Editor 2 */}
            {activePart === 'part2' && (
              <div className="glass scroll" style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--r-xl)', flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--glass-edge)', background: 'rgba(255,255,255,0.4)', position: 'sticky', top: 0, zIndex: 1, borderRadius: 'var(--r-xl) var(--r-xl) 0 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(40,55,30,0.1)', color: 'var(--ink)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>2</span>
                    <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>Phòng viết: Trang trọng</span>
                  </div>
                  <span className="chip" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{words2} từ</span>
                </div>
                <textarea
                  value={text2}
                  onChange={e => setText2(e.target.value)}
                  placeholder="Viết email cho người quản lý/tổ chức ở đây..."
                  style={{ minHeight: 200, border: 'none', outline: 'none', resize: 'none', background: 'transparent', padding: '20px 24px', fontSize: 15, lineHeight: 1.6, color: 'var(--ink)', fontFamily: 'var(--font)' }}
                />

                {/* Scorer panel */}
                <div style={{ padding: '0 24px 24px' }}>
                  <WritingScorerPanel
                    key={selectedTopic._id + '-2'}
                    essay={text2}
                    examId={selectedTopic._id}
                    examTitle={selectedTopic.title}
                    examContentHtml={question?.content ?? ''}
                    examSummary={selectedTopic.summary}
                    subQuestionContent={subQ2?.content ?? ''}
                    letterType="formal"
                    wordCountTarget={150}
                  />
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

    </div>
  );
}

