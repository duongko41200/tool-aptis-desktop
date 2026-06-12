import { invoke } from '@tauri-apps/api/core';
import type { ScoringResult, CrossExamResult, GrammarError } from '../types/writing-scorer';
import writingData from '../public/data/exams/writing-part4.json';

export interface PdfExportParams {
  essay: string;
  examId: string;
  examTitle: string;
  letterType: 'formal' | 'informal';
  savedAt?: string;
  result: ScoringResult;
  crossExamResults?: CrossExamResult[] | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


const CEFR_CFG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  A2: { color: '#b52020', bg: '#fdeaea', border: '#f5a0a0', label: 'Cơ bản' },
  B1: { color: '#a05c10', bg: '#fef3e2', border: '#f5c87a', label: 'Trung cấp' },
  B2: { color: '#1a7a3a', bg: '#e8f7ee', border: '#7ecb9a', label: 'Trên trung cấp' },
  C1: { color: '#1a4a8a', bg: '#e8eef8', border: '#7aaae0', label: 'Nâng cao' },
};

const ERROR_TYPE_CFG: Record<GrammarError['type'], { label: string; color: string; bg: string }> = {
  grammar:     { label: 'Ngữ pháp',  color: '#b52020', bg: '#fdeaea' },
  spelling:    { label: 'Chính tả',  color: '#a05c10', bg: '#fef3e2' },
  vocabulary:  { label: 'Từ vựng',   color: '#1a4a8a', bg: '#e8eef8' },
  punctuation: { label: 'Dấu câu',   color: '#5a208a', bg: '#f3eafa' },
};

// ── Essay with inline error highlights ───────────────────────────────────────

function buildEssayHtml(essay: string, errors: GrammarError[]): string {
  if (!errors.length) return `<span>${esc(essay)}</span>`;

  const positions = errors
    .map(e => {
      const idx = essay.indexOf(e.originalText);
      return idx >= 0 ? { start: idx, end: idx + e.originalText.length, error: e } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.start - b.start);

  let html = '';
  let cursor = 0;

  for (const pos of positions) {
    if (pos.start < cursor) continue;
    if (pos.start > cursor) html += esc(essay.slice(cursor, pos.start));
    const cfg = ERROR_TYPE_CFG[pos.error.type] ?? ERROR_TYPE_CFG.grammar;
    html += `<mark style="background:${cfg.bg};border-bottom:2px solid ${cfg.color};border-radius:2px;padding:0 1px;">${esc(pos.error.originalText)}</mark>`;
    cursor = pos.end;
  }
  if (cursor < essay.length) html += esc(essay.slice(cursor));
  return html;
}

// ── Cozy-lofi section card builder ───────────────────────────────────────────
// Accent colours: warm, muted — not primary-hue saturated

const SECT = {
  format:  { rule: '#4a8a7a', dot: '#c4efe6', ink: '#1a4a42' },
  grammar: { rule: '#9a4030', dot: '#f5d8d0', ink: '#5a1a10' },
  content: { rule: '#6a48a8', dot: '#ddd0f8', ink: '#3a2060' },
  b2:      { rule: '#a07828', dot: '#f5e8c0', ink: '#5a4010' },
  cross:   { rule: '#3a7850', dot: '#c0e8d0', ink: '#1a4828' },
  essay:   { rule: '#3a5fa8', dot: '#c8d8f8', ink: '#1a2f60' },
};

function sCard(
  num: string, title: string,
  sect: typeof SECT[keyof typeof SECT],
  badge: string, body: string,
): string {
  return `
  <div class="s-card" style="--rule:${sect.rule};--dot:${sect.dot};--ink:${sect.ink};">
    <div class="s-head">
      <div class="s-rule-dot"></div>
      <div class="s-head-text">
        <div class="s-num">${num}</div>
        <h2 class="s-title" style="color:var(--ink);">${title}</h2>
      </div>
      <div class="s-badge-group">${badge}</div>
    </div>
    <div class="s-body">${body}</div>
  </div>`;
}

function scorePill(score: number, max: number, _sect: typeof SECT[keyof typeof SECT]): string {
  const pct = score / max;
  const warmGood = '#4a7a28', warmMid = '#9a6820', warmLow = '#8a2a1a';
  const c = pct >= 0.7 ? warmGood : pct >= 0.5 ? warmMid : warmLow;
  return `<div class="score-pill" style="color:${c};border-color:${c}50;background:${c}12;">
    <span class="sp-n">${score}</span><span class="sp-d"> / ${max}</span>
  </div>`;
}

// ── Section renderers ─────────────────────────────────────────────────────────

function renderFormatCheck(result: ScoringResult): string {
  const fc = result.formatCheck;
  if (!fc) return '';
  const s = SECT.format;

  const LABELS: Record<string, string> = {
    greeting: 'Lời chào', openingLine: 'Câu mở đầu', body: 'Nội dung chính',
    suggestions: 'Đề xuất / Ý kiến', closing: 'Câu kết', signature: 'Chữ ký',
  };

  const rows = Object.entries(fc.components).map(([key, comp]: [string, any]) => {
    const label = LABELS[key] ?? key;
    const extra = comp.count != null ? ` (${comp.count})` : comp.paragraphCount != null ? ` (${comp.paragraphCount} đoạn)` : '';
    const found = !!comp.found;
    return `<tr>
      <td style="width:32px;text-align:center;padding:8px 6px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;
          width:20px;height:20px;border-radius:50%;font-size:11px;font-weight:800;
          background:${found ? '#d0f0e4' : '#f8ddd8'};color:${found ? s.ink : '#7a2018'};">
          ${found ? '✓' : '✗'}
        </span>
      </td>
      <td style="padding:8px 12px;font-weight:700;color:#2a2018;">${esc(label)}${extra}</td>
      <td style="padding:8px 12px;color:#7a6e66;font-style:italic;font-size:12px;">
        ${comp.text ? `"${esc(comp.text)}"` : '<span style="color:#c0b8b0;">—</span>'}
      </td>
      <td style="padding:8px 12px;font-size:12px;color:${found ? '#6a5020' : '#8a2018'};">
        ${comp.note ? esc(comp.note) : ''}
      </td>
    </tr>`;
  }).join('');

  const passedBadge = `<span class="warm-chip" style="background:${fc.passed ? '#d0f0e4' : '#f8ddd8'};color:${fc.passed ? s.ink : '#7a2018'};">
    ${fc.passed ? 'Đạt yêu cầu' : 'Chưa đạt'}
  </span>`;

  const body = `
    <p class="s-desc">${esc(fc.feedback)}</p>
    <table class="warm-table" style="--thead:${s.rule};">
      <thead><tr>
        <th style="width:32px;"></th><th>Thành phần</th>
        <th>Trích dẫn từ bài</th><th>Nhận xét</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  return sCard('02', 'Cấu trúc bài viết', s, `${scorePill(fc.score, 5, s)} ${passedBadge}`, body);
}

function renderGrammarCheck(result: ScoringResult): string {
  const gc = result.grammarCheck;
  if (!gc) return '';
  const s = SECT.grammar;
  const errors = gc.errors ?? [];

  const ERROR_WARM: Record<GrammarError['type'], { label: string; bg: string; fg: string }> = {
    grammar:     { label: 'Ngữ pháp',  bg: '#f8ddd8', fg: '#7a2018' },
    spelling:    { label: 'Chính tả',  bg: '#fce8ca', fg: '#7a4010' },
    vocabulary:  { label: 'Từ vựng',   bg: '#d8e0f8', fg: '#2a3878' },
    punctuation: { label: 'Dấu câu',   bg: '#e8d8f8', fg: '#5a2878' },
  };

  const rows = errors.map((e, i) => {
    const cfg = ERROR_WARM[e.type] ?? ERROR_WARM.grammar;
    return `<tr>
      <td style="width:32px;text-align:center;font-size:11px;font-family:'JetBrains Mono',monospace;color:#a09088;">${String(i+1).padStart(2,'0')}</td>
      <td style="padding:8px 10px;width:88px;">
        <span class="warm-chip" style="background:${cfg.bg};color:${cfg.fg};">${cfg.label}</span>
      </td>
      <td style="padding:8px 10px;">
        <span style="text-decoration:line-through;color:#8a2018;font-family:'JetBrains Mono',monospace;font-size:12px;
          background:#f8ddd8;padding:1px 6px;border-radius:6px;">${esc(e.originalText)}</span>
        <span style="margin:0 7px;color:#c0b8b0;font-weight:700;">→</span>
        <span style="color:#2a6030;font-weight:700;font-family:'JetBrains Mono',monospace;font-size:12px;
          background:#d0f0d8;padding:1px 6px;border-radius:6px;">${esc(e.correction)}</span>
      </td>
      <td style="padding:8px 10px;font-size:11.5px;color:#7a6e66;">${e.note ? esc(e.note) : ''}</td>
    </tr>`;
  }).join('');

  const body = errors.length === 0
    ? `<p class="s-desc">${esc(gc.feedback)}</p>
       <div style="padding:16px 20px;border-radius:12px;background:#d8f0e4;border:1.5px solid #a0d8b8;">
         <p style="font-weight:700;color:#1a5030;font-size:13px;">Tốt lắm — không có lỗi ngữ pháp nào được tìm thấy.</p>
       </div>`
    : `<p class="s-desc">${esc(gc.feedback)}</p>
       <table class="warm-table" style="--thead:${s.rule};">
         <thead><tr>
           <th style="width:32px;text-align:center;">#</th>
           <th style="width:88px;">Loại lỗi</th>
           <th>Sai → Đúng</th>
           <th>Nhận xét</th>
         </tr></thead>
         <tbody>${rows}</tbody>
       </table>`;

  const errBadge = errors.length > 0
    ? `<span class="warm-chip" style="background:#f8ddd8;color:#7a2018;">${errors.length} lỗi cần sửa</span>`
    : `<span class="warm-chip" style="background:#d0f0e4;color:#1a5030;">Không có lỗi</span>`;

  return sCard('03', 'Ngữ pháp &amp; Chính tả', s, `${scorePill(gc.score, 5, s)} ${errBadge}`, body);
}

function renderContentAnalysis(result: ScoringResult): string {
  const ca = result.contentAnalysis;
  if (!ca) return '';
  const s = SECT.content;

  const covPct = Math.round(ca.promptCoverage ?? 0);
  const covGood = covPct >= 70, covMid = covPct >= 50;
  const covFg = covGood ? '#3a2060' : covMid ? '#5a4010' : '#6a1818';
  const covBg = covGood ? '#e0d8f8' : covMid ? '#f8e8c0' : '#f8d8d0';
  const barFill = covGood ? '#6a48a8' : covMid ? '#a07828' : '#a03020';

  const solutions = (ca.solutions ?? []).map((s_item, i) => {
    const relevant = s_item.relevantToPrompt !== false;
    return `
      <div style="display:flex;gap:12px;padding:12px 14px;border-radius:12px;
        background:${relevant ? '#f0ece4' : '#f8ece8'};
        border:1.5px solid ${relevant ? '#d4c8b8' : '#e8c8c0'};margin-bottom:8px;">
        <div style="width:26px;height:26px;border-radius:50%;
          background:${relevant ? s.rule : '#9a4030'};color:#faf5ed;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:800;font-family:'JetBrains Mono',monospace;
          flex-shrink:0;margin-top:2px;">${i + 1}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px;">
            <span style="font-size:13px;font-weight:700;color:#2a2018;flex:1;">${esc(s_item.idea)}</span>
            <span class="warm-chip" style="flex-shrink:0;
              background:${relevant ? '#d4e8d0' : '#f0d0c8'};
              color:${relevant ? '#2a5020' : '#6a2018'};">
              ${relevant ? 'Đúng chủ đề' : 'Lạc đề'}
            </span>
          </div>
          ${s_item.originalText ? `<p style="margin:0 0 3px;font-size:12px;color:#7a6e66;font-style:italic;line-height:1.6;">"${esc(s_item.originalText)}"</p>` : ''}
          ${s_item.relevanceNote ? `<p style="margin:0;font-size:11.5px;color:#a09088;">${esc(s_item.relevanceNote)}</p>` : ''}
        </div>
      </div>`;
  }).join('');

  const covBadge = `<div style="display:flex;align-items:center;gap:7px;">
    <span style="font-size:11px;font-weight:600;color:#7a6e66;">Bao phủ đề</span>
    <div style="width:68px;height:6px;background:#e8e0d8;border-radius:3px;overflow:hidden;">
      <div style="height:100%;width:${covPct}%;background:${barFill};border-radius:3px;"></div>
    </div>
    <span class="warm-chip" style="background:${covBg};color:${covFg};">${covPct}%</span>
  </div>`;

  const body = `<p class="s-desc">${esc(ca.feedback)}</p><div>${solutions}</div>`;
  return sCard('04', 'Phân tích nội dung', s, `${scorePill(ca.score, 10, s)} ${covBadge}`, body);
}

function renderB2Criteria(result: ScoringResult): string {
  const b2 = result.b2Criteria;
  if (!b2) return '';
  const s = SECT.b2;

  const cefr = b2.cefrLevel;
  const cefrCfg = cefr ? CEFR_CFG[cefr] : null;

  const CRITERIA = [
    { key: 'vocabulary',      label: 'Từ vựng đa dạng',   desc: 'Phạm vi và độ phong phú',   max: 3 },
    { key: 'cohesion',        label: 'Mạch lạc văn bản',   desc: 'Từ nối, liên kết ý tưởng',  max: 3 },
    { key: 'register',        label: 'Văn phong phù hợp',  desc: 'Formal / Informal',           max: 2 },
    { key: 'sentenceVariety', label: 'Đa dạng cấu trúc',   desc: 'Câu đơn, ghép, phức',        max: 2 },
  ] as const;

  const criteriaHtml = CRITERIA.map(({ key, label, desc, max }, idx) => {
    const c = (b2 as any)[key];
    const score = c?.score ?? 0;
    const note = c?.note ?? '';
    const pct = Math.round((score / max) * 100);
    const barFill = pct >= 70 ? '#a07828' : pct >= 50 ? '#b05820' : '#9a3820';
    const numColor = pct >= 70 ? '#6a5010' : pct >= 50 ? '#7a3810' : '#7a2010';
    return `
      <div style="padding:11px 14px;border-radius:12px;background:#fdf8ee;
        border:1.5px solid #e8ddc8;margin-bottom:8px;${idx === 0 ? 'margin-top:4px;' : ''}">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;">
            <span style="font-size:13px;font-weight:700;color:#2a2018;">${label}</span>
            <span style="font-size:11px;color:#a09088;margin-left:7px;">${desc}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <div style="width:72px;height:7px;background:#e8ddc8;border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${barFill};border-radius:4px;"></div>
            </div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;
              color:${numColor};min-width:30px;text-align:right;">${score}/${max}</span>
          </div>
        </div>
        ${note ? `<p style="margin:7px 0 0;font-size:11.5px;color:#7a6e66;line-height:1.55;">${esc(note)}</p>` : ''}
      </div>`;
  }).join('');

  const cefrBadgeHtml = cefrCfg && cefr ? `
    <div style="display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:12px;
      background:#fdf0d8;border:1.5px solid #e0c890;margin-bottom:12px;">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        width:56px;height:56px;border-radius:10px;background:#fff8ee;border:1.5px solid #e0c890;flex-shrink:0;">
        <span style="font-size:20px;font-weight:900;color:${s.ink};line-height:1;font-family:'JetBrains Mono',monospace;">${cefr}</span>
        <span style="font-size:9px;font-weight:700;color:${s.ink};opacity:0.7;margin-top:2px;">${cefrCfg.label}</span>
      </div>
      <p style="margin:0;font-size:12.5px;color:#5a4010;line-height:1.6;font-weight:500;">${b2.cefrNote ? esc(b2.cefrNote) : ''}</p>
    </div>` : '';

  const body = `<p class="s-desc">${esc(b2.feedback)}</p>${cefrBadgeHtml}${criteriaHtml}`;
  return sCard('05', 'Chất lượng ngôn ngữ B2', s, scorePill(b2.score, 10, s), body);
}

function renderCrossExam(crossExamResults: CrossExamResult[]): string {
  const withApplicable = crossExamResults.filter(r => r.applicableExams.length > 0);
  if (!withApplicable.length) return '';
  const s = SECT.cross;

  const items = withApplicable.map(item => {
    const exams = item.applicableExams.map(exam => {
      const isDirect = exam.applicability === 'direct';
      const examData = (writingData as any[]).find((e: any) => e._id === exam.examId);
      const sub0 = examData?.questions?.[0]?.subQuestion?.[0]?.content ?? '';
      const sub1 = examData?.questions?.[0]?.subQuestion?.[1]?.content ?? '';

      return `
        <div style="padding:10px 14px;border-top:1px solid #c8e0c8;background:#f8fcf8;">
          <div style="display:flex;align-items:flex-start;gap:8px;">
            <span style="font-size:13px;font-weight:700;color:#2a2018;flex:1;">${esc(exam.examTitle)}</span>
            <span class="warm-chip" style="flex-shrink:0;
              background:${isDirect ? '#d0ecd8' : '#f8e8c0'};
              color:${isDirect ? '#1a4828' : '#6a4810'};">
              ${isDirect ? 'Dùng thẳng' : 'Cần chỉnh sửa'}
            </span>
          </div>
          ${exam.modificationNote && !isDirect ? `<p style="margin:4px 0 0;font-size:11.5px;color:#7a6e66;">${esc(exam.modificationNote)}</p>` : ''}
          ${(sub0 || sub1) ? `
            <div style="margin-top:8px;padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #c8e0c8;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#a09088;text-transform:uppercase;letter-spacing:0.06em;">Nhiệm vụ đề</p>
              ${[sub0, sub1].filter(Boolean).map((t: string, i: number) => `
                <p style="margin:${i > 0 ? '3px' : '0'} 0 0;font-size:11.5px;color:#5a4e44;line-height:1.55;">${i + 1}. ${esc(t)}</p>
              `).join('')}
            </div>` : ''}
        </div>`;
    }).join('');

    return `
      <div style="border-radius:12px;border:1.5px solid #b0d8b8;overflow:hidden;margin-bottom:10px;background:#fff;">
        <div style="padding:10px 14px;background:#e0f0e4;border-bottom:1.5px solid #b0d8b8;display:flex;align-items:center;gap:10px;">
          <span style="font-size:13.5px;font-weight:700;color:#1a4828;">${esc(item.solutionIdea)}</span>
        </div>
        ${exams}
      </div>`;
  }).join('');

  const body = `<p class="s-desc">Những ý tưởng bạn đã viết có thể tái sử dụng cho các đề dưới đây — tiết kiệm rất nhiều thời gian ôn tập.</p>${items}`;

  const countBadge = `<span class="warm-chip" style="background:#d0ecd8;color:#1a4828;">${withApplicable.length} ý tưởng tái dùng được</span>`;
  return sCard('06', 'Phân tích đa đề', s, countBadge, body);
}

// ── Watermark ─────────────────────────────────────────────────────────────────

function makeWatermarkUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260"><text transform="rotate(-35 200 130)" x="200" y="150" text-anchor="middle" fill="#2d5a0e" font-family="Arial,sans-serif" font-size="30" font-weight="900" letter-spacing="3">Aptis Tiên Phong</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ── Main HTML builder ─────────────────────────────────────────────────────────

function buildHtml(params: PdfExportParams, includeWatermark = true): string {
  const { essay, examTitle, letterType, savedAt, result, crossExamResults } = params;
  const typeLabel = letterType === 'formal' ? 'Thư trang trọng' : 'Thư thân mật';
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const dateStr = fmtDate(savedAt);
  const errors = result.grammarCheck?.errors ?? [];
  const essayHtml = buildEssayHtml(essay, errors);

  const cefr = result.b2Criteria?.cefrLevel;
  const cefrCfg = cefr ? CEFR_CFG[cefr] : null;
  const crossHtml = crossExamResults?.length ? renderCrossExam(crossExamResults) : '';

  const wmCss = includeWatermark ? `
    /* ── Watermark ── */
    .watermark-overlay {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background-image: url("${makeWatermarkUrl()}");
      background-repeat: repeat;
      background-size: 400px 260px;
      opacity: 0.065;
      pointer-events: none;
      z-index: 0;
    }
    .page > *:not(.watermark-overlay) { position: relative; z-index: 1; }
  ` : '';

  const wmDiv = includeWatermark ? '<div class="watermark-overlay"></div>' : '';

  const totalScore = (result.formatCheck?.score ?? 0) + (result.contentAnalysis?.score ?? 0)
    + (result.grammarCheck?.score ?? 0) + (result.b2Criteria?.score ?? 0);
  const totalPct = Math.round((totalScore / 30) * 100);
  const totalGrade = totalPct >= 70 ? { label: 'Tốt', bg: '#d0ecd8', fg: '#1a4828' }
    : totalPct >= 50 ? { label: 'Khá', bg: '#f5e4c0', fg: '#6a4010' }
    : { label: 'Cần cố gắng', bg: '#f5d8d0', fg: '#6a1818' };

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo cáo chấm bài — ${esc(examTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --paper:   #f5f0e8;
      --card:    #fdfaf4;
      --ink:     #2a2018;
      --ink-2:   #5c4f45;
      --ink-3:   #9a8e86;
      --border:  #ddd5c8;
      --accent:  #d9e89d;
      --olive:   #2f4d0c;
    }

    body {
      font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
      background: var(--paper);
      color: var(--ink);
      font-size: 13px;
      line-height: 1.65;
    }

    /* Warm linen texture */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(180,160,120,0.06) 24px),
        repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(180,160,120,0.04) 24px);
      pointer-events: none;
      z-index: 0;
    }

    .page {
      max-width: 820px;
      margin: 0 auto;
      background: var(--card);
      min-height: 100vh;
      position: relative;
      z-index: 1;
      box-shadow: 0 0 0 1px rgba(180,160,120,0.15), 0 8px 48px rgba(80,60,30,0.1);
    }

    ${wmCss}

    /* ── Cover ── */
    .cover {
      background: var(--olive);
      padding: 44px 40px 36px;
      position: relative;
      overflow: hidden;
    }
    /* Decorative warm circles */
    .cover::before {
      content: '';
      position: absolute;
      top: -80px; right: -80px;
      width: 320px; height: 320px;
      border-radius: 50%;
      background: radial-gradient(circle at center, rgba(217,232,157,0.12) 0%, transparent 65%);
    }
    .cover::after {
      content: '';
      position: absolute;
      bottom: -40px; left: 30px;
      width: 180px; height: 180px;
      border-radius: 50%;
      background: rgba(255,255,255,0.03);
    }
    .cover-brand {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(217,232,157,0.6);
      margin-bottom: 14px;
      position: relative;
    }
    .cover-title {
      font-size: 24px;
      font-weight: 800;
      color: #fff;
      line-height: 1.3;
      margin-bottom: 20px;
      position: relative;
    }
    .cover-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 28px;
      position: relative;
    }
    .cover-chip {
      font-size: 11.5px;
      font-weight: 600;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 4px 14px;
      border-radius: 9999px;
      color: rgba(217,232,157,0.85);
    }

    /* ── Score panel inside cover ── */
    .score-panel {
      display: flex;
      gap: 10px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.12);
      position: relative;
    }
    .score-big {
      flex: 0 0 auto;
      width: 116px;
      border: 1.5px solid rgba(217,232,157,0.3);
      border-radius: 18px;
      padding: 14px 12px;
      text-align: center;
      background: rgba(217,232,157,0.12);
    }
    .score-big-label {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(217,232,157,0.65);
      margin-bottom: 6px;
    }
    .score-big-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 46px;
      font-weight: 700;
      color: var(--accent);
      line-height: 1;
      letter-spacing: -2px;
    }
    .score-big-denom {
      font-size: 12px;
      color: rgba(255,255,255,0.35);
      margin-top: 4px;
    }
    .score-item {
      flex: 1;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 10px 10px 9px;
      background: rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .score-item-label {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(217,232,157,0.55);
      margin-bottom: 6px;
      text-align: center;
    }
    .score-item-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 26px;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      line-height: 1;
    }
    .score-item-max {
      font-size: 10.5px;
      color: rgba(255,255,255,0.3);
      margin-top: 2px;
    }
    .score-item-bar {
      width: 100%;
      height: 3px;
      background: rgba(255,255,255,0.12);
      border-radius: 2px;
      margin-top: 7px;
      overflow: hidden;
    }
    .score-item-fill {
      height: 100%;
      border-radius: 2px;
      background: var(--accent);
      opacity: 0.7;
    }

    /* ── Content ── */
    .content { padding: 28px 32px 44px; }

    /* ── Section cards (cozy lofi) ── */
    .s-card {
      background: #fffdf8;
      border-radius: 18px;
      border: 1.5px solid var(--border);
      border-left: 4px solid var(--rule, #aaa);
      margin-bottom: 18px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(80,60,30,0.06);
    }
    .s-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 18px 12px;
      border-bottom: 1px solid var(--dot, #e8e0d8);
      background: rgba(255,255,255,0.6);
    }
    .s-rule-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--rule);
      flex-shrink: 0;
      box-shadow: 0 0 0 3px var(--dot);
    }
    .s-head-text { flex: 1; min-width: 0; }
    .s-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.15em;
      opacity: 0.5;
      margin-bottom: 1px;
    }
    .s-title {
      font-size: 14.5px;
      font-weight: 800;
      line-height: 1.2;
    }
    .s-badge-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    /* ── Score pill ── */
    .score-pill {
      display: flex;
      align-items: baseline;
      gap: 1px;
      padding: 5px 13px;
      border-radius: 9999px;
      border: 1.5px solid;
      font-weight: 800;
    }
    .sp-n {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      line-height: 1;
    }
    .sp-d {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      opacity: 0.6;
    }

    /* ── Warm chip (tag/badge) ── */
    .warm-chip {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 11px;
      border-radius: 9999px;
    }

    .s-body { padding: 16px 18px 18px; }
    .s-desc {
      font-size: 12.5px;
      color: var(--ink-2);
      line-height: 1.72;
      margin-bottom: 14px;
    }

    /* ── Warm tables ── */
    .warm-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      border: 1.5px solid var(--border);
      font-size: 12.5px;
    }
    .warm-table thead tr { background: var(--thead, #3a5040); }
    .warm-table thead th {
      padding: 10px 12px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: rgba(245,240,232,0.85);
      text-align: left;
    }
    .warm-table tbody tr { border-bottom: 1px solid #f0ece4; }
    .warm-table tbody tr:last-child { border-bottom: none; }
    .warm-table tbody tr:nth-child(even) { background: #faf6ee; }
    .warm-table tbody td { padding: 9px 12px; vertical-align: top; color: var(--ink-2); }

    /* ── Essay card ── */
    .essay-card {
      background: #fffdf8;
      border-radius: 18px;
      border: 1.5px solid var(--border);
      border-left: 4px solid #4a6a9a;
      margin-bottom: 18px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(80,60,30,0.06);
    }
    .essay-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 18px 12px;
      background: #f4f0f8;
      border-bottom: 1px solid #dcd4e8;
    }
    .essay-body {
      padding: 20px 22px;
      font-size: 13.5px;
      color: var(--ink);
      line-height: 2.1;
      white-space: pre-wrap;
      background: #fffef9;
      /* Ruled-lines feel */
      background-image: repeating-linear-gradient(
        to bottom,
        transparent 0px, transparent 33px,
        rgba(180,160,120,0.1) 33px, rgba(180,160,120,0.1) 34px
      );
    }
    .essay-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 10px 18px;
      background: #f8f4f0;
      border-top: 1px solid var(--border);
    }
    .legend-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: var(--ink-3);
      font-weight: 600;
    }
    .legend-pip { width: 16px; height: 3px; border-radius: 2px; }

    /* ── Print ── */
    @page { size: A4; margin: 10mm 12mm 14mm 12mm; }
    @media print {
      html, body { background: #f5f0e8 !important; }
      body::before { display: none; }
      .page { max-width: 100%; margin: 0; box-shadow: none; }
      .s-card, .essay-card { page-break-inside: avoid; box-shadow: none; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    ${wmDiv}

    <!-- Cover -->
    <div class="cover">
      <div class="cover-brand">Báo cáo chấm bài viết · Aptis Tiên Phong</div>
      <p class="cover-title">${esc(examTitle)}</p>
      <div class="cover-chips">
        <span class="cover-chip">${typeLabel}</span>
        <span class="cover-chip">${wordCount} từ</span>
        ${dateStr ? `<span class="cover-chip">${dateStr}</span>` : ''}
        ${cefr && cefrCfg ? `<span class="cover-chip" style="background:rgba(255,255,255,0.15);color:#fff;">CEFR ${cefr} · ${cefrCfg.label}</span>` : ''}
      </div>
      <div class="score-panel">
        <div class="score-big">
          <div class="score-big-label">Tổng điểm</div>
          <div class="score-big-num">${totalScore}</div>
          <div class="score-big-denom">/ 30 điểm</div>
        </div>
        ${[
          { label: 'Cấu trúc', score: result.formatCheck?.score ?? 0, max: 5 },
          { label: 'Nội dung', score: result.contentAnalysis?.score ?? 0, max: 10 },
          { label: 'Ngữ pháp', score: result.grammarCheck?.score ?? 0, max: 5 },
          { label: 'Ngôn ngữ B2', score: result.b2Criteria?.score ?? 0, max: 10 },
        ].map(({ label, score, max }) => `
          <div class="score-item">
            <div class="score-item-label">${label}</div>
            <div class="score-item-num">${score}</div>
            <div class="score-item-max">/ ${max}</div>
            <div class="score-item-bar">
              <div class="score-item-fill" style="width:${Math.round((score/max)*100)}%;"></div>
            </div>
          </div>`).join('')}
      </div>
    </div>

    <div class="content">

      <!-- 01 · Bài làm -->
      <div class="essay-card">
        <div class="essay-head">
          <div style="width:8px;height:8px;border-radius:50%;background:#4a6a9a;flex-shrink:0;
            box-shadow:0 0 0 3px #dcd4e8;"></div>
          <div style="flex:1;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;
              letter-spacing:0.15em;color:#4a6a9a;opacity:0.6;margin-bottom:1px;">01</div>
            <h2 style="font-size:14.5px;font-weight:800;color:#2a3050;">Bài làm của học viên</h2>
          </div>
          <span class="warm-chip" style="background:#e0d8f0;color:#3a2860;">${wordCount} từ</span>
        </div>
        <div class="essay-body">${essayHtml}</div>
        ${errors.length > 0 ? `
        <div class="essay-legend">
          ${Object.entries(ERROR_TYPE_CFG)
            .filter(([type]) => errors.some(e => e.type === type))
            .map(([, cfg]) => `
              <div class="legend-chip">
                <div class="legend-pip" style="background:${cfg.color};"></div>
                <span>${cfg.label}</span>
              </div>`).join('')}
        </div>` : ''}
      </div>

      ${renderFormatCheck(result)}
      ${renderGrammarCheck(result)}
      ${renderContentAnalysis(result)}
      ${renderB2Criteria(result)}
      ${crossHtml}

      <!-- Footer -->
      <div style="margin-top:28px;padding:14px 20px;border-radius:14px;
        border:1.5px solid var(--border);background:#fffdf8;
        display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:12.5px;font-weight:700;color:var(--olive);">Aptis Tiên Phong</span>
          <span style="font-size:11.5px;color:var(--ink-3);margin-left:6px;">· Luyện thi APTIS</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${dateStr ? `<span style="font-size:11px;color:var(--ink-3);">${dateStr}</span>` : ''}
          <span class="warm-chip" style="background:${totalGrade.bg};color:${totalGrade.fg};">
            <span style="font-family:'JetBrains Mono',monospace;">${totalScore}/30</span>
            &nbsp;·&nbsp;${totalGrade.label}
          </span>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildPreviewHtml(params: PdfExportParams): string {
  return buildHtml(params, true);
}

// ── PDF Export via Edge/Chrome headless (silent, no dialog) ──────────────────
// Rust backend renders the HTML with a headless browser and saves the PDF
// directly to the user's Desktop, then opens it automatically.

export async function exportWritingPdf(params: PdfExportParams): Promise<string> {
  const html = buildHtml(params, true);

  const safeFilename = `APTIS_Writing_${params.examTitle
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 40)
    .replace(/\s+/g, '_') || 'report'}`;

  const savedPath = await invoke<string>('export_pdf_headless', {
    html,
    filename: safeFilename,
  });

  return savedPath;
}
