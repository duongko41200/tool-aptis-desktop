import { useState, useRef } from 'react';

interface Props { onClose: () => void }

const SECTIONS = [
  { id: 'how',      label: 'Cách hoạt động' },
  { id: 'concepts', label: 'Khái niệm cơ bản' },
  { id: 'add',      label: 'Thêm Note' },
  { id: 'review',   label: 'Khi học một thẻ' },
  { id: 'states',   label: '3 trạng thái thẻ' },
  { id: 'manage',   label: 'Quản lý nâng cao' },
  { id: 'keys',     label: 'Phím tắt' },
  { id: 'flow',     label: 'Luồng thực tế' },
  { id: 'tips',     label: 'Mẹo quan trọng' },
];

const tag = (c: string): React.CSSProperties => ({
  background: c + '18', color: c, fontSize: 11, fontWeight: 700,
  padding: '2px 8px', borderRadius: 99, display: 'inline-block',
});

const divider: React.CSSProperties = { borderTop: '1px solid #f1f5f9', margin: '28px 0 0' };
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th: React.CSSProperties = { padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, background: '#f8fafc', border: '1px solid #e2e8f0' };
const td: React.CSSProperties = { padding: '7px 10px', border: '1px solid #e2e8f0', color: '#374151' };

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 1, margin: '28px 0 12px', scrollMarginTop: 16 }}>
      {children}
    </h2>
  );
}

export default function VocabGuide({ onClose }: Props) {
  const [active, setActive] = useState('how');
  const bodyRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    setActive(id);
    const el = document.getElementById(id);
    if (el && bodyRef.current) {
      bodyRef.current.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>📚 Hướng dẫn Vocabulary</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>Học flashcard thông minh kiểu Anki</div>
        </div>
        <button onClick={onClose}
          style={{ background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          ← Quay lại
        </button>
      </div>

      {/* Layout: TOC + Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* TOC Sidebar */}
        <nav style={{ width: 168, flexShrink: 0, borderRight: '1px solid #f1f5f9', overflowY: 'auto', padding: '16px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 1.5, padding: '0 14px 8px', textTransform: 'uppercase' }}>
            Mục lục
          </div>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => scrollTo(s.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 12,
                fontWeight: active === s.id ? 700 : 400,
                color: active === s.id ? '#7c3aed' : '#64748b',
                background: active === s.id ? '#faf5ff' : 'transparent',
                borderLeft: active === s.id ? '3px solid #7c3aed' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Scrollable content */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px' }}>
          <div style={{ maxWidth: 560, padding: '0 28px', margin: '0 auto' }}>

            {/* 1 */}
            <H2 id="how">Cách hoạt động</H2>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #7c3aed', borderRadius: 8, padding: '12px 14px' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                App tự tính <strong>ngày ôn tiếp theo</strong> dựa trên bạn nhớ tốt hay kém.
                Nhớ tốt → hỏi lại muộn hơn. Quên → hỏi lại sớm hơn.
                Học <strong>10 phút/ngày đều đặn</strong> hiệu quả hơn nhồi nhét 2 tiếng cuối tuần.
              </p>
            </div>

            {/* 2 */}
            <div style={divider} />
            <H2 id="concepts">Khái niệm cơ bản</H2>

            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>🗂 Deck — Bộ bài học</p>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 8px', lineHeight: 1.6 }}>
              Thư mục chứa flashcard. Có thể tạo sub-deck lồng trong deck cha.
              Học deck cha → tự học luôn tất cả sub-deck bên trong.
            </p>
            <div style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8fafc', borderRadius: 8, padding: '10px 14px', color: '#475569', lineHeight: 2, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              English<br />
              &nbsp;&nbsp;├── Vocabulary<br />
              &nbsp;&nbsp;└── Grammar
            </div>

            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>📝 Note ≠ Card</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 20px 1fr', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 4 }}>NOTE = dữ liệu gốc</div>
                <div style={{ fontSize: 13 }}>Front: <strong>Apple</strong></div>
                <div style={{ fontSize: 13 }}>Back: <strong>Táo</strong></div>
              </div>
              <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 16 }}>→</div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>CARD = câu hỏi</div>
                <div style={{ fontSize: 12, color: '#475569' }}>Card 1: Apple → ?</div>
                <div style={{ fontSize: 12, color: '#475569' }}>Card 2: Táo → ?</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, margin: '0 0 16px' }}>💡 1 Note có thể sinh nhiều Card.</p>

            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>🎴 Template — kiểu thẻ</p>
            <table style={tbl}>
              <thead><tr>{['Template','Cards','Dùng khi'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {[['Basic','1','Học từ đơn, định nghĩa'],
                  ['Basic + Reverse','2','Nhớ cả 2 chiều'],
                  ['Cloze','1 / chỗ trống','Điền vào chỗ trống trong câu'],
                ].map(([t,c,d],i) => (
                  <tr key={i}><td style={{...td,fontWeight:600}}>{t}</td><td style={{...td,color:'#7c3aed',fontWeight:600}}>{c}</td><td style={td}>{d}</td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 8, background: '#f8fafc', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
              <strong>Cloze ví dụ:</strong> nhập <code style={{ background: '#ede9fe', color: '#5b21b6', padding: '1px 4px', borderRadius: 4 }}>{'{{c1::Tokyo}}'}</code> → card hỏi: <strong>"The capital of Japan is [...]"</strong>
            </div>

            {/* 3 */}
            <div style={divider} />
            <H2 id="add">Thêm Note — 3 cách</H2>
            {[
              { n: '1', hl: false, t: 'Trong app', d: 'Chọn deck → + Add Note → điền Front / Back → chọn template → Add Note' },
              { n: '2', hl: true,  t: 'Ctrl+K  ★ Nhanh nhất', d: 'Bôi đen text trên Chrome → Ctrl+K → popup hiện → điền nghĩa → Save to Vocab' },
              { n: '3', hl: false, t: 'Seed dữ liệu mẫu', d: 'Nhấn 🧪 Seed để thêm 10 notes sẵn có, thử ngay' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: s.hl ? '#7c3aed' : '#e2e8f0', color: s.hl ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.t}</div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{s.d}</div>
                </div>
              </div>
            ))}

            {/* 4 */}
            <div style={divider} />
            <H2 id="review">Khi học một thẻ</H2>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 12px' }}>Chọn deck → nhấn <strong>▶ START REVIEW</strong></p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>MẶT TRƯỚC</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>serendipity</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Nhấn Space để lật</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1', fontSize: 18 }}>→</div>
              <div style={{ flex: 1, border: '1px solid #7c3aed', borderRadius: 10, padding: '12px', textAlign: 'center', background: '#faf5ff' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', marginBottom: 6 }}>MẶT SAU</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>tình cờ gặp điều may mắn</div>
                <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 6 }}>→ chọn 1 trong 4 nút</div>
              </div>
            </div>
            <table style={tbl}>
              <thead><tr>{['Nút','Ý nghĩa','Ôn lại sau','Phím'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {[{l:'Again',c:'#ef4444',d:'Quên hoàn toàn',n:'10 phút (ngay)',k:'1'},
                  {l:'Hard', c:'#f97316',d:'Nhớ nhưng rất khó',n:'~1 ngày',k:'2'},
                  {l:'Good', c:'#16a34a',d:'Nhớ bình thường',n:'~3 ngày',k:'3'},
                  {l:'Easy', c:'#2563eb',d:'Nhớ ngay lập tức',n:'~7 ngày',k:'4'},
                ].map(b => (
                  <tr key={b.l}>
                    <td style={td}><span style={tag(b.c)}>{b.l}</span></td>
                    <td style={td}>{b.d}</td>
                    <td style={td}>{b.n}</td>
                    <td style={{...td,textAlign:'center',fontWeight:700}}>[{b.k}]</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 5 */}
            <div style={divider} />
            <H2 id="states">3 trạng thái của thẻ</H2>
            {[{l:'NEW',c:'#2563eb',d:'Chưa học lần nào. Xuất hiện hôm nay lần đầu.'},
              {l:'LEARNING',c:'#d97706',d:'Đang học. Hỏi lại: 10 phút → 1 ngày → 3 ngày. Again → reset.'},
              {l:'REVIEW',c:'#16a34a',d:'Đã thuộc. Ôn định kỳ: 7 → 15 → 30 → 90 ngày...'},
            ].map(s => (
              <div key={s.l} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{...tag(s.c), marginTop: 2, minWidth: 68, textAlign: 'center'}}>{s.l}</span>
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{s.d}</span>
              </div>
            ))}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>Ví dụ khoảng cách ôn — từ "serendipity"</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {['Ngày 1','Ngày 4','Ngày 12','Ngày 35','Ngày 90'].map((d,i,arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length-1 ? 1 : 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', margin: '0 auto 4px' }} />
                      <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>{d}</div>
                    </div>
                    {i < arr.length-1 && <div style={{ flex: 1, height: 1, background: '#e2e8f0', margin: '0 4px 12px' }} />}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, margin: '8px 0 0' }}>Khoảng cách tăng → não càng cố nhớ → ghi nhớ sâu và lâu bền.</p>
            </div>

            {/* 6 */}
            <div style={divider} />
            <H2 id="manage">Quản lý thẻ nâng cao</H2>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>Trong review → nhấn <strong>··· More</strong> trên thẻ</p>
            {[{e:'💤',l:'Bury',d:'Ẩn thẻ đến ngày mai. Dùng khi muốn tạm bỏ qua.'},
              {e:'🚫',l:'Suspend',d:'Ẩn vĩnh viễn cho đến khi bạn mở lại thủ công.'},
              {e:'🏴',l:'Flag',d:'🟥 Cần sửa  /  🟨 Chưa chắc  /  🟩 Quan trọng — không ảnh hưởng lịch học.'},
            ].map(s => (
              <div key={s.l} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>{s.e}</span>
                <span style={{ fontSize: 13, color: '#374151' }}><strong>{s.l}</strong> — {s.d}</span>
              </div>
            ))}

            {/* 7 */}
            <div style={divider} />
            <H2 id="keys">Phím tắt</H2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[['Space','Lật thẻ'],['1','Again'],['2','Hard'],['3','Good'],['4','Easy'],['Ctrl+K','Save từ browser']].map(([k,v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                  <code style={{ background: '#e2e8f0', color: '#0f172a', fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>{k}</code>
                  <span style={{ color: '#475569' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* 8 */}
            <div style={divider} />
            <H2 id="flow">Luồng thực tế</H2>
            {['Đọc bài trên Chrome → bôi đen từ hay → Ctrl+K',
              'Popup hiện → chọn deck + template → điền nghĩa → Save',
              'Tab Vocabulary → Start Review → học thẻ mới',
              'Nhấn Good → thẻ tự lên lịch ôn sau 3 ngày',
              'Học đều đặn → khoảng cách tăng → nhớ lâu bền',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, fontSize: 13 }}>
                <span style={{ color: '#7c3aed', fontWeight: 800, minWidth: 16 }}>{i+1}.</span>
                <span style={{ color: '#374151' }}>{t}</span>
              </div>
            ))}

            {/* 9 */}
            <div style={divider} />
            <H2 id="tips">Mẹo quan trọng</H2>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 2.1 }}>
              <div>✅ <strong>Card ngắn và cụ thể</strong> — một câu hỏi, một đáp án rõ ràng.</div>
              <div>✅ <strong>Hiểu trước, Anki sau</strong> — đừng thêm khi chưa hiểu nghĩa.</div>
              <div>✅ <strong>Học đều đặn mỗi ngày</strong> — 10 phút/ngày tốt hơn 2 tiếng cuối tuần.</div>
              <div>✅ <strong>Dùng Tags thay vì nhiều Deck</strong> — ielts, toeic, food, travel...</div>
            </div>

            <div style={{ paddingTop: 28 }}>
              <button onClick={onClose}
                style={{ width: '100%', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Bắt đầu học →
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
