import type { B2CriteriaCheck, CefrLevel } from "../../types/writing-scorer";

interface Props {
  result: B2CriteriaCheck;
  targetLevel?: CefrLevel;
}

function scoreColor(pct: number) {
  return pct >= 0.7 ? "var(--good)" : pct >= 0.5 ? "var(--warn)" : "var(--bad)";
}

function MiniBar({ score, max }: { score: number; max: number }) {
  const pct = score / max;
  const color = scoreColor(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <div
        style={{
          flex: 1,
          height: 5,
          borderRadius: "var(--r-pill)",
          background: "#e8ede0",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "var(--r-pill)",
            width: `${Math.round(pct * 100)}%`,
            background: color,
            transition: "width 500ms var(--ease)",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          color,
          minWidth: 28,
          textAlign: "right",
        }}
      >
        {score}/{max}
      </span>
    </div>
  );
}

const CEFR_ORDER: CefrLevel[] = ["A2", "B1", "B2", "C1"];

const CEFR_CONFIG: Record<
  CefrLevel,
  { color: string; bg: string; label: string }
> = {
  A2: { color: "#c0392b", bg: "rgba(192,57,43,0.10)", label: "Cơ bản" },
  B1: { color: "#e67e22", bg: "rgba(230,126,34,0.10)", label: "Trung cấp" },
  B2: { color: "#27ae60", bg: "rgba(39,174,96,0.10)", label: "Trên trung cấp" },
  C1: { color: "#2980b9", bg: "rgba(41,128,185,0.10)", label: "Nâng cao" },
};

function CefrBadge({
  level,
  active,
  isTarget,
}: {
  level: CefrLevel;
  active: boolean;
  isTarget?: boolean;
}) {
  const cfg = CEFR_CONFIG[level];
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
      }}
    >
      <div
        style={{
          padding: "6px 14px",
          borderRadius: "var(--r-sm)",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          fontWeight: 800,
          border: `2px solid ${active ? cfg.color : "rgba(40,55,30,0.12)"}`,
          background: active ? cfg.bg : "transparent",
          color: active ? cfg.color : "var(--ink-3)",
          transition: "all 250ms var(--ease)",
          minWidth: 44,
          textAlign: "center",
        }}
      >
        {level}
      </div>
      {isTarget && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          mục tiêu
        </span>
      )}
    </div>
  );
}

const CRITERIA = [
  {
    key: "vocabulary",
    label: "Từ vựng đa dạng",
    max: 3,
    desc: "Phạm vi và độ phong phú của từ vựng",
  },
  {
    key: "cohesion",
    label: "Mạch lạc",
    max: 3,
    desc: "Dùng từ nối, discourse markers",
  },
  {
    key: "register",
    label: "Văn phong",
    max: 2,
    desc: "Ngôn ngữ phù hợp formal/informal",
  },
  {
    key: "sentenceVariety",
    label: "Đa dạng câu văn",
    max: 2,
    desc: "Kết hợp câu đơn, ghép, phức",
  },
] as const;

export default function B2CriteriaResult({
  result,
  targetLevel = "B2",
}: Props) {
  const total = result.score;
  const totalColor = scoreColor(total / 10);
  const cefrLevel = result.cefrLevel ?? "B1";
  const cefrCfg = CEFR_CONFIG[cefrLevel];

  const currentIdx = CEFR_ORDER.indexOf(cefrLevel);
  const targetIdx = CEFR_ORDER.indexOf(targetLevel);
  const meetsTarget = currentIdx >= targetIdx;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* CEFR level row */}
      <div
        style={{
          padding: "14px 16px",
          borderRadius: "var(--r-md)",
          background: cefrCfg.bg,
          border: `1px solid ${cefrCfg.color}44`,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Level badges */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          {CEFR_ORDER.map((lvl) => (
            <CefrBadge
              key={lvl}
              level={lvl}
              active={lvl === cefrLevel}
              isTarget={lvl === targetLevel && lvl !== cefrLevel}
            />
          ))}
        </div>

        {/* Level info */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{ fontSize: 15, fontWeight: 800, color: cefrCfg.color }}
            >
              {cefrLevel} — {cefrCfg.label}
            </span>
            {meetsTarget ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "var(--r-pill)",
                  background: "rgba(39,174,96,0.15)",
                  color: "var(--good)",
                }}
              >
                Đạt mục tiêu {targetLevel}
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "var(--r-pill)",
                  background: "rgba(224,169,59,0.15)",
                  color: "var(--warn)",
                }}
              >
                Chưa đạt mục tiêu {targetLevel}
              </span>
            )}
          </div>
          {result.cefrNote && (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "var(--ink-2)",
                lineHeight: 1.5,
              }}
            >
              {result.cefrNote}
            </p>
          )}
        </div>
      </div>

      {/* Header with score */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--r-sm)",
            flexShrink: 0,
            background: `${totalColor}22`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 800, color: totalColor }}>
            {total}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}
            >
              Tiêu chí chấm của APTIS{" "}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>/10</span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            {result.feedback}
          </p>
        </div>
      </div>

      {/* Criteria rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CRITERIA.map(({ key, label, max, desc }) => {
          const criterion = result[key];
          return (
            <div
              key={key}
              style={{
                padding: "10px 12px",
                borderRadius: "var(--r-sm)",
                background: "#fafcf5",
                border: "1px solid #e4eada",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 5,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 6 }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--ink)",
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {desc}
                    </span>
                  </div>
                </div>
                <MiniBar score={criterion.score} max={max} />
              </div>
              {criterion.note && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--ink-3)",
                    lineHeight: 1.4,
                  }}
                >
                  {criterion.note}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
