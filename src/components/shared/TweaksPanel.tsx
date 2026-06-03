import { useTweaks, ACCENTS } from '../../contexts/TweaksContext';
import Icon from '../common/Icon';

// ── Reusable controls ──────────────────────────────────────────────────────

function Section({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase',
      color: 'rgba(41,38,27,.42)', padding: '10px 0 3px',
      borderTop: '.5px solid rgba(0,0,0,.06)', marginTop: 4,
    }}>
      {label}
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string | number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '1px 0' }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(41,38,27,.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>{label}</span>
        {value != null && (
          <span style={{ fontSize: 11, color: 'rgba(41,38,27,.42)', fontFamily: 'var(--font-mono)' }}>{value}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
}) {
  const display = step < 1 ? value.toFixed(2) : value;
  return (
    <Row label={label} value={`${display}${unit}`}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          appearance: 'none', WebkitAppearance: 'none', width: '100%', height: 4,
          margin: '3px 0', borderRadius: 999, background: 'rgba(0,0,0,.12)', outline: 'none',
          accentColor: 'var(--accent-deep)',
        }} />
    </Row>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(41,38,27,.8)' }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          position: 'relative', width: 32, height: 18, borderRadius: 999, border: 'none',
          background: value ? 'var(--accent-deep)' : 'rgba(0,0,0,.15)',
          transition: 'background .15s', cursor: 'pointer', padding: 0, flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: value ? 16 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)',
          transition: 'left .15s', pointerEvents: 'none',
        }} />
      </button>
    </div>
  );
}

function Seg({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  const idx = Math.max(0, options.indexOf(value));
  const n = options.length;
  return (
    <Row label={label}>
      <div style={{ position: 'relative', display: 'flex', padding: 2, borderRadius: 8, background: 'rgba(0,0,0,.06)', userSelect: 'none' }}>
        {/* sliding thumb */}
        <div style={{
          position: 'absolute', top: 2, bottom: 2,
          left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
          width: `calc((100% - 4px) / ${n})`,
          borderRadius: 6, background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.14)',
          transition: 'left .15s, width .15s',
          pointerEvents: 'none',
        }} />
        {options.map((o) => (
          <button key={o} type="button"
            onClick={() => onChange(o)}
            style={{
              position: 'relative', zIndex: 1, flex: 1, border: 0, background: 'transparent',
              color: 'rgba(41,38,27,.75)', fontSize: 11.5, fontWeight: value === o ? 700 : 500,
              minHeight: 22, borderRadius: 6, cursor: 'pointer', padding: '2px 4px', lineHeight: 1.2,
            }}>
            {o}
          </button>
        ))}
      </div>
    </Row>
  );
}

function ColorChips({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <Row label={label}>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map((c) => (
          <button key={c} onClick={() => onChange(c)}
            title={c}
            style={{
              width: 30, height: 30, borderRadius: 9, background: c,
              border: value === c ? '2.5px solid #29261b' : '2px solid transparent',
              cursor: 'pointer', transition: 'all .14s', flexShrink: 0,
              transform: value === c ? 'scale(1.1)' : 'scale(1)',
              boxShadow: value === c ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
              outline: 'none',
            }} />
        ))}
      </div>
    </Row>
  );
}

// ── TweaksPanel ────────────────────────────────────────────────────────────

export default function TweaksPanel() {
  const { tweaks, setTweak, resetTweaks, isOpen, closeTweaks } = useTweaks();

  const FONTS = ['Plus Jakarta Sans', 'Nunito', 'Space Grotesk'];

  return (
    <>
      {/* backdrop */}
      <div
        onClick={closeTweaks}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,.18)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'all' : 'none',
          transition: 'opacity 280ms var(--ease)',
        }}
      />

      {/* drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1000,
        width: 295,
        background: 'rgba(251,250,247,.92)',
        WebkitBackdropFilter: 'blur(28px) saturate(170%)',
        backdropFilter: 'blur(28px) saturate(170%)',
        borderLeft: '.5px solid rgba(255,255,255,.65)',
        boxShadow: '-6px 0 48px rgba(0,0,0,.28)',
        display: 'flex', flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 320ms var(--ease)',
        color: '#29261b',
      }}>
        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 18px 14px',
          borderBottom: '.5px solid rgba(0,0,0,.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'rgba(170,203,79,.18)',
              display: 'grid', placeItems: 'center', color: 'var(--accent-deep)',
            }}>
              <Icon name="settings" size={16} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Tùy chỉnh giao diện</span>
          </div>
          <button onClick={closeTweaks}
            style={{ color: 'rgba(41,38,27,.4)', padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* scrollable body */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px 16px 24px',
          display: 'flex', flexDirection: 'column', gap: 6,
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,.12) transparent',
        }}>
          <Section label="Màu sắc" />
          <ColorChips label="Accent" value={tweaks.accent} options={ACCENTS} onChange={(v) => setTweak('accent', v)} />

          <Section label="Không khí" />
          <Slider label="Độ tối nền" value={tweaks.overlay}    min={0.1} max={0.68} step={0.02} onChange={(v) => setTweak('overlay', v)} />
          <Toggle label="Hiệu ứng mưa"  value={tweaks.rain}    onChange={(v) => setTweak('rain', v)} />

          <Section label="Glass" />
          <Slider label="Độ đậm kính"   value={tweaks.glassAlpha} min={0.4}  max={0.92} step={0.02} onChange={(v) => setTweak('glassAlpha', v)} />
          <Slider label="Độ mờ (blur)"  value={tweaks.glassBlur}  min={4}    max={30}   step={1}    unit=" px" onChange={(v) => setTweak('glassBlur', v)} />

          <Section label="Chữ" />
          <Seg label="Font" value={tweaks.font} options={FONTS} onChange={(v) => setTweak('font', v)} />

          {/* reset */}
          <div style={{ marginTop: 10 }}>
            <button onClick={resetTweaks}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 9,
                background: 'rgba(0,0,0,.06)', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: 'rgba(41,38,27,.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background .12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.06)'; }}
            >
              <Icon name="refresh" size={13} /> Khôi phục mặc định
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
