# Implementation Plan: Writing Part 4 — AI Scorer

**Branch**: `004-writing-scorer` | **Date**: 2026-06-10 | **AI**: Gemini Free Tier

---

## Summary

Xây dựng hệ thống chấm điểm tự động cho APTIS Writing Part 4 bằng Gemini AI (free tier). Hệ thống chấm theo 2 tiêu chí chính:
1. **Format Check** — bài viết có đúng cấu trúc thư không (formal/informal)
2. **Content + Solution Reuse** — tìm ý tưởng/giải pháp trong bài, so sánh xem solution đó có thể áp dụng cho đề bài nào khác trong data

Toàn bộ xử lý AI chạy ở frontend (gọi Gemini REST API trực tiếp). Không cần thay đổi backend Rust.

---

## Technical Context

**Language/Version**: TypeScript 5 (React 18) + Tauri v2

**AI Provider**: Google Gemini Free Tier — `gemini-2.0-flash` (miễn phí, 15 req/min, 1500 req/day)

**Primary Dependencies**: Tauri v2, React — tất cả đã có sẵn. Chỉ thêm Gemini REST call qua `fetch`.

**Storage**: Không cần thêm DB table. API key lưu trong localStorage hoặc Tauri app config.

**Testing**: Manual theo quickstart. Không cần unit test cho AI calls.

**Target Platform**: Windows 10/11 (Tauri desktop)

**Performance Goals**: Mỗi lần chấm < 10s (1-2 Gemini calls). Cross-exam analysis chạy 1 lần, kết quả cache trong session.

**Constraints**:
- Gemini free tier: 15 req/min, 1500 req/day — cần debounce, không auto-score khi typing
- Không gửi toàn bộ essay content của tất cả đề lên Gemini (quá dài) — chỉ gửi title + tóm tắt context
- Kết quả chấm không lưu persistent (session only, user có thể export nếu muốn)

---

## Exam Data Context

### Writing Part 4 Structure

```
Mỗi đề bài (exam):
├── _id, title (e.g. "Art Club", "Book Club")
├── content (HTML) — scenario/email nhận được
└── questions[0]
    ├── subQuestion[0] — Write to a friend (informal, ~50 words)
    └── subQuestion[1] — Write to organizer/manager (formal, ~120-150 words)
```

### Các dạng đề phổ biến (từ data hiện có)
Tất cả đề Part 4 đều là **Club/Organization email** scenario, yêu cầu:
- Thư 1 (informal): viết cho bạn bè về tình huống, hỏi ý kiến / chia sẻ cảm xúc
- Thư 2 (formal): viết cho ban tổ chức / quản lý, bày tỏ cảm xúc và đưa ra đề xuất (suggestions)

---

## Scoring Criteria — Chi tiết

### Tiêu chí 1: Format Check

#### Informal Letter Format
| Component | Required | Example |
|-----------|----------|---------|
| Greeting | ✅ | `Dear [Name],` / `Hi [Name],` / `Hello [Name],` |
| Opening line | ✅ | `How are you?` / `I hope you're well.` |
| Body | ✅ | ≥ 1 đoạn, đề cập đến tình huống + cảm xúc |
| Question to friend | khuyến khích | `What do you think?` / `Can you...?` |
| Closing phrase | ✅ | `Bye for now,` / `Love,` / `Best,` / `Take care,` |
| Signature | ✅ | Tên người viết |

#### Formal Letter Format
| Component | Required | Example |
|-----------|----------|---------|
| Salutation | ✅ | `Dear Sir,` / `Dear Sir/Madam,` / `Dear [Name],` |
| Opening sentence | ✅ | `I am writing to...` / `I hope this email finds you well.` |
| Self-introduction | khuyến khích | `My name is... and I have been a member since...` |
| Reference to email | ✅ | `According to your email/announcement...` |
| Feelings/reaction | ✅ | `I was disappointed/excited/concerned to hear...` |
| Suggestions/ideas | ✅ | ≥ 1 suggestion rõ ràng, có connectors (Moreover, In addition, Furthermore) |
| Closing sentence | ✅ | `I look forward to hearing from you.` / `I hope my suggestions are helpful.` |
| Sign-off | ✅ | `Best regards,` / `Yours sincerely,` |
| Full name | ✅ | Họ và tên đầy đủ |

### Tiêu chí 2: Content — Solution Extraction & Cross-Exam Reuse

#### Bước A: Trích xuất Solutions
Gemini nhận bài viết + context đề bài → trả về danh sách các **solution/idea** mà học sinh đề xuất trong bài, ví dụ:
- *"Mời artist nổi tiếng có ảnh hưởng đến giới trẻ"*
- *"Đăng thông báo lên social media (Facebook, Instagram)"*
- *"Giới thiệu mã giảm giá hàng tháng thay vì sách miễn phí"*

Mỗi solution được đánh giá:
- Có trả lời đúng yêu cầu đề không? (relevance score)
- Có đủ chi tiết/giải thích không? (depth score)

#### Bước B: Cross-Exam Applicability
Với mỗi solution tìm được, Gemini so sánh với tóm tắt của **tất cả đề khác** trong data để tìm:
- `direct`: solution dùng được nguyên vẹn cho đề khác
- `with_modification`: solution cần điều chỉnh nhỏ nhưng ý tưởng gốc giống nhau
- Ví dụ: *"Post on social media"* có thể dùng cho đề Art Club, Language Club, Sports Club, bất kỳ club nào cần quảng bá

---

## Architecture

### Flow Diagram

```
User nhập bài viết
        │
        ▼
[WritingScorerPanel]
        │
        ├─► Call 1: scoreFormat(essay, subQuestion, letterType)
        │           └─► Gemini API → FormatResult
        │
        ├─► Call 2: extractSolutions(essay, examContext)
        │           └─► Gemini API → SolutionList
        │
        └─► Call 3: crossExamAnalysis(solutionList, allExamSummaries)
                    └─► Gemini API → ApplicabilityMap
                    
        All results → display in ScoringResultPanel
```

> **Optimization**: Nếu free tier rate limit bị hit, Call 1 và Call 2 có thể merge thành 1 call với JSON output schema. Call 3 là optional (user bấm nút riêng).

### Data Types

```typescript
// Input
interface ScoringRequest {
  essay: string;
  examId: string;
  examTitle: string;
  examContent: string;        // HTML stripped về plain text
  subQuestionContent: string; // "Write an email to your friend..."
  letterType: 'formal' | 'informal';
  wordCountTarget: number;    // e.g. 50 or 120-150
}

// Output — Format Check
interface FormatCheckResult {
  passed: boolean;
  score: number;             // 0-5
  letterType: 'formal' | 'informal';
  components: {
    greeting:     ComponentCheck;
    openingLine:  ComponentCheck;
    body:         ComponentCheck;
    suggestions:  ComponentCheck; // formal only
    closing:      ComponentCheck;
    signature:    ComponentCheck;
  };
  feedback: string;          // tiếng Việt
  wordCount: number;
}

interface ComponentCheck {
  found: boolean;
  text?: string;             // extracted text from essay
  note?: string;             // feedback note
}

// Output — Content Analysis
interface ContentAnalysisResult {
  solutions: Solution[];
  promptCoverage: number;    // 0-100%, % yêu cầu đề được trả lời
  score: number;             // 0-10
  feedback: string;          // tiếng Việt
}

interface Solution {
  id: string;
  idea: string;              // tóm tắt ý tưởng
  originalText: string;      // đoạn text gốc trong bài
  relevantToPrompt: boolean;
  relevanceNote: string;
}

// Output — Cross-Exam Applicability
interface CrossExamResult {
  solutionId: string;
  solutionIdea: string;
  applicableExams: ExamApplicability[];
}

interface ExamApplicability {
  examId: string;
  examTitle: string;
  applicability: 'direct' | 'with_modification' | 'not_applicable';
  modificationNote: string;  // mô tả cần thay đổi gì
}
```

---

## Gemini Prompt Design

### Prompt 1: Format + Content (Combined — 1 API call)

```
You are an APTIS English exam evaluator for Vietnamese students.

EXAM SCENARIO:
{examContent_plaintext}

SUB-QUESTION:
{subQuestionContent}

LETTER TYPE: {formal | informal}
WORD COUNT TARGET: {wordCount} words

STUDENT ESSAY:
---
{studentEssay}
---

Evaluate the essay and return ONLY valid JSON matching this schema:
{
  "formatCheck": {
    "passed": boolean,
    "score": 0-5,
    "components": {
      "greeting":    { "found": boolean, "text": "...", "note": "..." },
      "openingLine": { "found": boolean, "text": "...", "note": "..." },
      "body":        { "found": boolean, "paragraphCount": number },
      "suggestions": { "found": boolean, "count": number },   // formal only
      "closing":     { "found": boolean, "text": "...", "note": "..." },
      "signature":   { "found": boolean, "text": "..." }
    },
    "wordCount": number,
    "feedback": "Vietnamese feedback here"
  },
  "contentAnalysis": {
    "solutions": [
      {
        "id": "s1",
        "idea": "brief idea summary in Vietnamese",
        "originalText": "exact quote from essay",
        "relevantToPrompt": boolean,
        "relevanceNote": "Vietnamese note"
      }
    ],
    "promptCoverage": 0-100,
    "score": 0-10,
    "feedback": "Vietnamese feedback here"
  }
}
```

### Prompt 2: Cross-Exam Analysis (Optional, separate button)

```
You are an APTIS writing coach analyzing solution reusability.

STUDENT'S SOLUTIONS from essay about "{currentExamTitle}":
{solutions_json}

OTHER EXAM TOPICS (title + brief context):
{allExamSummaries_json}

For each solution, determine which other exams it could apply to.
Return ONLY valid JSON:
[
  {
    "solutionId": "s1",
    "solutionIdea": "...",
    "applicableExams": [
      {
        "examId": "...",
        "examTitle": "...",
        "applicability": "direct" | "with_modification",
        "modificationNote": "What to change (in Vietnamese)"
      }
    ]
  }
]
```

---

## Project Structure

### New Files

```text
specs/004-writing-scorer/
├── plan.md                     ← This file

src/
├── services/
│   └── gemini-writing-scorer.ts   [NEW] Gemini API calls + prompt templates
├── hooks/
│   └── useWritingScorer.ts        [NEW] React hook quản lý state + calls
├── components/writing/
│   ├── WritingScorerPanel.tsx      [NEW] Input panel (essay textarea + submit)
│   ├── FormatCheckResult.tsx       [NEW] Hiển thị kết quả format
│   ├── ContentAnalysisResult.tsx   [NEW] Hiển thị solutions + coverage
│   └── CrossExamResult.tsx         [NEW] Hiển thị cross-exam applicability
└── utils/
    └── html-to-text.ts             [NEW] Strip HTML từ exam content
```

### Modified Files

```text
src/
├── pages/WritingPart4Page.tsx      [MODIFY] Thêm WritingScorerPanel vào sub-question view
└── components/settings/
    └── ApiKeySettings.tsx          [MODIFY] Thêm Gemini API key field
```

---

## Implementation Phases

### Phase 1 — Core Infrastructure (không có UI)

**Tasks:**
1. Tạo `gemini-writing-scorer.ts`:
   - `callGemini(prompt: string, apiKey: string): Promise<string>`
   - `scoreEssay(request: ScoringRequest, apiKey: string): Promise<ScoringResult>`
   - `analyzeCrossExam(solutions: Solution[], allExams: ExamSummary[], apiKey: string): Promise<CrossExamResult[]>`
   - JSON response parser + error handling
   - Rate limit retry logic (429 → wait 4s → retry once)

2. Tạo `html-to-text.ts` — strip HTML tags từ exam `content` field

3. Tạo `useWritingScorer.ts` hook:
   - State: `{ status, formatResult, contentResult, crossExamResult, error }`
   - Actions: `score()`, `analyzeCrossExam()`, `reset()`

4. Thêm Gemini API key vào settings (localStorage key: `gemini_api_key`)

**Deliverable**: Service hoạt động, test được qua browser console.

---

### Phase 2 — Scoring UI

**Tasks:**
5. Tạo `WritingScorerPanel.tsx`:
   - Textarea cho essay input
   - Nút "Chấm điểm" (disabled khi essay rỗng hoặc đang loading)
   - Hiển thị word count realtime
   - Loading spinner khi đang chờ Gemini

6. Tạo `FormatCheckResult.tsx`:
   - Score badge (e.g. 4/5)
   - Checklist các components (✅/❌ + extracted text + note)
   - Feedback text (màu đỏ/xanh theo pass/fail)

7. Tạo `ContentAnalysisResult.tsx`:
   - Score badge (e.g. 7/10)
   - Danh sách solutions dạng card (ý tưởng + quote gốc + relevance badge)
   - Prompt coverage progress bar

8. Integrate vào `WritingPart4Page.tsx`:
   - Tab layout: [Đề bài] [Bài làm + Chấm điểm]
   - Scorer hiển thị bên phải essay input

**Deliverable**: UI hoàn chỉnh, có thể chấm điểm format + content.

---

### Phase 3 — Cross-Exam Analysis (Optional, có thể release sau)

**Tasks:**
9. Load tất cả exam summaries từ `writing-part4.json` (title + stripped content)

10. Tạo `CrossExamResult.tsx`:
    - Hiển thị mỗi solution + danh sách đề áp dụng được
    - Badge: "Dùng thẳng" (direct) vs "Cần chỉnh sửa" (with_modification)
    - ModificationNote hiển thị tooltip/popover

11. Thêm nút "Phân tích đa đề" vào `ContentAnalysisResult.tsx`
    - Chỉ available sau khi đã có solutions
    - Warning: "Tính năng này dùng thêm 1 lượt Gemini API"

**Deliverable**: Cross-exam analysis hoạt động, user thấy solutions của mình có thể tái sử dụng cho đề nào.

---

## Gemini Free Tier Handling

| Issue | Strategy |
|-------|----------|
| 15 req/min limit | Debounce button 3s sau khi click; không auto-score |
| 429 Too Many Requests | Retry 1 lần sau 5s, nếu vẫn lỗi thì hiển thị message "Vui lòng thử lại sau 1 phút" |
| Response không phải JSON | Fallback parser: extract JSON từ markdown code block; nếu vẫn fail thì hiển thị raw text |
| API key không có | Hiển thị prompt "Nhập Gemini API key trong Settings → AI Keys" với link |
| Essay quá dài | Giới hạn input 500 words, hiển thị warning nếu vượt quá |

---

## API Key Setup Guide (cho user)

1. Truy cập [aistudio.google.com](https://aistudio.google.com) → Get API Key → Create API key
2. Copy key (bắt đầu bằng `AIza...`)
3. Trong app: Settings → AI Settings → Gemini API Key → Paste → Save
4. Key lưu trong localStorage, không gửi đi đâu ngoài Gemini API

---

## Scoring Display Design

```
┌─────────────────────────────────────────────────────┐
│  CHẤM ĐIỂM BÀI VIẾT                                 │
├─────────────────┬───────────────────────────────────┤
│  FORMAT         │  NỘI DUNG                         │
│  ████████░░ 4/5 │  ██████████░░ 7/10               │
├─────────────────┴───────────────────────────────────┤
│ ✅ Lời chào: "Dear Sir," — đúng cho thư trang trọng │
│ ✅ Câu mở đầu: "I am writing to..."                 │
│ ✅ Bày tỏ cảm xúc — đã có                           │
│ ✅ Đề xuất (2 ideas): "monthly discount", "new...   │
│ ✅ Câu kết: "I look forward to..."                  │
│ ❌ Tên đầy đủ — thiếu họ                            │
├─────────────────────────────────────────────────────┤
│ SOLUTIONS TÌM ĐƯỢC (2/2 đúng đề)                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 💡 Mã giảm giá hàng tháng                       │ │
│ │    "I recommend monthly discount codes..."       │ │
│ │    ✅ Đúng đề | [Xem đề áp dụng được]           │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 💡 Chuyển đối tác giao hàng                     │ │
│ │    "consider switching to a new delivery..."     │ │
│ │    ✅ Đúng đề | [Xem đề áp dụng được]           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ [Phân tích đa đề - dùng 1 lượt Gemini API]          │
└─────────────────────────────────────────────────────┘
```

---

## Cross-Exam Analysis Output Example

```
💡 Solution: "Mã giảm giá hàng tháng" có thể áp dụng cho:

┌──────────────────┬──────────────────┬─────────────────────────────┐
│ Đề bài           │ Mức độ           │ Ghi chú                     │
├──────────────────┼──────────────────┼─────────────────────────────┤
│ Art Club         │ 🟡 Cần chỉnh sửa │ Đổi "discount" → "ticket    │
│                  │                  │ giảm giá" cho buổi talk      │
├──────────────────┼──────────────────┼─────────────────────────────┤
│ Language Club    │ 🟢 Dùng thẳng    │ Câu lạc bộ phí thành viên   │
│                  │                  │ → discount code áp dụng OK  │
├──────────────────┼──────────────────┼─────────────────────────────┤
│ Sports Club      │ 🟡 Cần chỉnh sửa │ Đổi thành "membership fee   │
│                  │                  │ reduction" hoặc "free trial" │
└──────────────────┴──────────────────┴─────────────────────────────┘
```

---

## Out of Scope

- Grammar/vocabulary scoring (đây là chức năng khác biệt, cần model tốt hơn)
- Persistent lưu kết quả chấm vào DB
- Batch scoring nhiều bài cùng lúc
- So sánh bài của user với model answer
- Scoring cho Writing Part 1, 2, 3 (chỉ Part 4 trong plan này)

---

## Dependencies & Prerequisites

- Gemini API key (user tự lấy miễn phí từ AI Studio)
- `writing-part4.json` đã có sẵn tại `src/public/data/exams/`
- React + TypeScript setup đã có
- Không cần cài thêm package nào (dùng native `fetch`)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gemini trả về invalid JSON | Medium | Medium | Prompt rõ "return ONLY JSON", thêm fallback parser |
| Rate limit 15 req/min | Low | Low | Debounce + retry, user hiểu đây là free tier |
| Gemini hiểu sai letterType | Low | Medium | Explicit trong prompt: "This is a FORMAL letter to a club manager" |
| Exam content HTML quá phức tạp để strip | Low | Low | html-to-text utility + test với vài đề |
| Cross-exam context quá dài cho free tier | Medium | Medium | Chỉ gửi title + 1 câu tóm tắt mỗi đề, không gửi full content |
