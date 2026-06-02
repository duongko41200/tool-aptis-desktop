import { useState } from 'react';
import Icon from '../common/Icon';

interface Card {
  w: string;
  ipa: string;
  pos: string;
  vi: string;
  ex: string;
  exvi: string;
  tag: string;
}

const DECK: Card[] = [
  { w: 'serene',    ipa: '/səˈriːn/',      pos: 'adj',  vi: 'thanh bình, yên ả',         ex: 'The lake was perfectly serene at dawn.',                    exvi: 'Mặt hồ thật yên ả lúc bình minh.',                         tag: 'Mới' },
  { w: 'diligent',  ipa: '/ˈdɪlɪdʒənt/',  pos: 'adj',  vi: 'chăm chỉ, cần mẫn',         ex: 'She is a diligent student who never misses a class.',       exvi: 'Cô ấy là học sinh chăm chỉ, không bao giờ bỏ buổi học.',   tag: 'Ôn'  },
  { w: 'glimpse',   ipa: '/ɡlɪmps/',       pos: 'noun', vi: 'cái nhìn thoáng qua',        ex: 'I caught a glimpse of the sunset through the window.',      exvi: 'Tôi thoáng thấy hoàng hôn qua khung cửa sổ.',              tag: 'Mới' },
  { w: 'resilient', ipa: '/rɪˈzɪliənt/',  pos: 'adj',  vi: 'kiên cường, dẻo dai',        ex: 'Children are remarkably resilient.',                        exvi: 'Trẻ em kiên cường một cách đáng kinh ngạc.',                tag: 'Khó' },
  { w: 'cozy',      ipa: '/ˈkəʊzi/',       pos: 'adj',  vi: 'ấm cúng, dễ chịu',           ex: 'We spent the rainy evening in a cozy little café.',         exvi: 'Chúng tôi trải qua buổi tối mưa trong quán cà phê ấm cúng.', tag: 'Mới' },
];

interface Props {
  onClose: () => void;
}

export default function VocabReviewModal({ onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState<number[]>([]);
  const [empty, setEmpty] = useState(false);

  const card = DECK[idx];
  const progress = Math.round((known.length / DECK.length) * 100);

  const next = (mark: boolean) => {
    if (mark && !known.includes(idx)) setKnown(k => [...k, idx]);
    setFlip(false);
    setTimeout(() => setIdx(v => (v + 1) % DECK.length), 120);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(8,12,4,0.42)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', animation: 'screen-in 320ms var(--ease) both' }}
    >
      <div className="glass" style={{ width: 'min(1040px,96vw)', maxHeight: '92vh', borderRadius: 'var(--r-xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--sh-lg)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--glass-edge)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)' }}>
              <Icon name="cards" size={20} />
            </span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Ôn từ vựng</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Lặp lại ngắt quãng · {DECK.length} thẻ đến hạn</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="bar" style={{ width: 120 }}><i style={{ width: progress + '%' }} /></div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{known.length}/{DECK.length}</span>
            </div>
            <button className="iconbtn" onClick={onClose} title="Đóng" style={{ background: 'rgba(40,55,30,0.08)', color: 'var(--ink)', border: '1px solid var(--glass-edge)' }}>
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* LEFT — flashcard */}
          <div style={{ padding: 22, borderRight: '1px solid var(--glass-edge)', display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(255,255,255,0.28)' }}>
            <div onClick={() => setFlip(f => !f)} style={{ cursor: 'pointer', flex: 1, minHeight: 280, position: 'relative' }}>
              {!flip ? (
                <div
                  key="front"
                  className="card-flip"
                  style={{ position: 'absolute', inset: 0, background: '#fff', borderRadius: 'var(--r-lg)', border: '1px solid var(--glass-edge)', boxShadow: 'var(--sh-sm)', padding: 24, display: 'flex', flexDirection: 'column' }}
                >
                  <span className="chip chip-accent" style={{ alignSelf: 'flex-start', fontSize: 11 }}>{card.tag}</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em' }}>{card.w}</div>
                    <div style={{ fontSize: 16, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{card.ipa} · {card.pos}.</div>
                    <button
                      onClick={e => e.stopPropagation()}
                      className="btn btn-soft btn-sm"
                      style={{ alignSelf: 'flex-start', marginTop: 18 }}
                    >
                      <Icon name="volume" size={15} /> Nghe
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', fontWeight: 600 }}>Chạm để xem nghĩa →</div>
                </div>
              ) : (
                <div
                  key="back"
                  className="card-flip"
                  style={{ position: 'absolute', inset: 0, background: 'var(--accent)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-glow)', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'var(--accent-ink)' }}
                >
                  <div className="label-cap" style={{ color: 'rgba(44,58,22,0.55)' }}>Nghĩa</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{card.vi}</div>
                  <div className="label-cap" style={{ color: 'rgba(44,58,22,0.55)', marginTop: 18 }}>Ví dụ</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4, lineHeight: 1.5 }}>{card.ex}</div>
                  <div style={{ fontSize: 13, marginTop: 6, fontStyle: 'italic', opacity: 0.7 }}>{card.exvi}</div>
                  <div style={{ fontSize: 12, marginTop: 'auto', opacity: 0.6, textAlign: 'center', fontWeight: 600 }}>← Chạm để xem từ</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => next(false)} className="btn btn-soft" style={{ flex: 1 }}><Icon name="refresh" size={16} /> Ôn lại</button>
              <button onClick={() => next(true)} className="btn btn-primary" style={{ flex: 1 }}><Icon name="check" size={16} /> Đã thuộc</button>
            </div>
          </div>

          {/* RIGHT — deck list */}
          <div className="scroll" style={{ padding: 22, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Kho từ vựng của bạn</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                  {empty ? 'Chưa có thẻ nào' : `${DECK.length} thẻ · bộ "Hằng ngày"`}
                </div>
              </div>
              <button className="chip" style={{ flexShrink: 0 }} onClick={() => setEmpty(e => !e)}>
                <Icon name="list" size={14} /> {empty ? 'Xem mẫu' : 'Trống'}
              </button>
            </div>

            {empty ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px' }}>
                <span style={{ width: 72, height: 72, borderRadius: 'var(--r-lg)', background: 'rgba(217,232,157,0.45)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
                  <Icon name="calendar" size={34} />
                </span>
                <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>Kho từ vựng đang trống</div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 360, margin: '8px 0 20px', lineHeight: 1.55 }}>
                  Hãy bắt đầu lưu từ mới hoặc dùng các bộ thẻ được soạn sẵn của chúng tôi nhé.
                </p>
                <button onClick={() => setEmpty(false)} className="btn btn-primary">
                  <Icon name="cards" size={17} /> Mở bộ từ vựng
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {DECK.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 15px', borderRadius: 'var(--r-md)', background: i === idx ? 'rgba(217,232,157,0.4)' : '#fff', border: i === idx ? '1px solid var(--accent-strong)' : '1px solid var(--glass-edge)', transition: 'all 160ms var(--ease)' }}>
                    <button
                      onClick={() => { setIdx(i); setFlip(false); }}
                      style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: known.includes(i) ? 'var(--accent)' : 'rgba(40,55,30,0.07)', color: known.includes(i) ? 'var(--accent-ink)' : 'var(--ink-3)', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer' }}
                    >
                      <Icon name={known.includes(i) ? 'check' : 'cards'} size={17} />
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>{d.w}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{d.ipa}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 1 }}>{d.vi}</div>
                    </div>
                    <span className="chip" style={{ fontSize: 11, padding: '4px 9px' }}>{d.tag}</span>
                  </div>
                ))}
                <button className="btn btn-soft" style={{ marginTop: 4 }}>
                  <Icon name="plus" size={16} /> Thêm từ mới vào kho
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
