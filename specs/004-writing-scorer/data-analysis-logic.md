# Data Analysis Logic — Writing Scorer

**File tham chiếu**: `src/services/gemini-writing-scorer.ts`  
**Data nguồn**: `src/public/data/exams/writing-part4.json`

---

## 1. Cấu trúc dữ liệu đề bài (JSON)

Mỗi đề trong `writing-part4.json` có dạng:

```
Exam
├── _id              → examId dùng để tra cứu lịch sử
├── title            → "Art Club", "Book Club", ...
├── questions[0]
│   ├── content      → HTML scenario (email nhận được từ club)
│   └── subQuestion
│       ├── [0].content  → yêu cầu thư thân mật (~50 từ)
│       └── [1].content  → yêu cầu thư trang trọng (~120–150 từ)
```

`questions[0].content` là HTML thô — phải strip tags trước khi đưa vào prompt Gemini.  
`subQuestion[1]` không phải lúc nào cũng là formal — cần đọc nội dung để xác định (xem `letterType` truyền vào từ `WritingScorerPanel`).

---

## 2. Luồng dữ liệu tổng quan

```
WritingPage (chọn đề)
    │
    ├─► selectedTopic._id, title, questions[0]
    │
    └─► WritingScorerPanel (nhận essay + letterType từ user)
            │
            ▼
        ScoringRequest (interface)
            │
            ├─► scoreEssay()       → Gemini Call 1 → ScoringResult
            └─► analyzeCrossExam() → Gemini Call 2 → CrossExamResult[]
                    (chỉ chạy khi user bấm nút riêng)
```

---

## 3. Interface `ScoringRequest` — dữ liệu đầu vào

```typescript
interface ScoringRequest {
  essay: string;              // bài viết của học sinh
  examId: string;             // _id của đề
  examTitle: string;          // "Book Club"
  examContent: string;        // HTML đã strip → plain text
  subQuestionContent: string; // nội dung câu hỏi cụ thể
  letterType: 'formal' | 'informal';
  wordCountTarget: number;    // 50 hoặc 120–150
}
```

`examContent` được strip HTML từ `questions[0].content` bằng `html-to-text.ts`.  
`subQuestionContent` = `subQuestion[0].content` hoặc `subQuestion[1].content` tuỳ tab đang active.

---

## 4. Call 1 — `scoreEssay()` : Chấm format + nội dung

### 4.1 Prompt được build như thế nào

Hàm `buildScoringPrompt(req)` tạo prompt gồm 3 phần:

```
SCENARIO:   plain text từ examContent
TASK:       subQuestionContent
TYPE:       FORMAL | INFORMAL  +  TARGET word count
ESSAY:      bài viết học sinh (toàn văn)

JSON schema: (nhúng inline, terse, không có comment)
```

Tham số quan trọng:
- `temperature: 0.1` — giảm ngẫu nhiên, output ổn định hơn
- `responseMimeType: 'application/json'` — bắt Gemini trả thẳng JSON
- `maxOutputTokens: 8192`

### 4.2 Kết quả trả về — `ScoringResult`

```typescript
interface ScoringResult {
  formatCheck: {
    passed: boolean;
    score: number;           // 0–5
    letterType: 'formal' | 'informal';
    components: {
      greeting:    { found, text, note }
      openingLine: { found, text, note }
      body:        { found, paragraphCount, note }
      suggestions: { found, count, note }  // formal: bắt buộc / informal: không tính điểm
      closing:     { found, text, note }
      signature:   { found, text, note }
    }
    wordCount: number;
    feedback: string;        // tiếng Việt
  };
  contentAnalysis: {
    solutions: Solution[];
    promptCoverage: number;  // 0–100 (%)
    score: number;           // 0–10
    feedback: string;        // tiếng Việt
  };
}
```

### 4.3 Luật chấm format

| Trường hợp | Điểm |
|---|---|
| `greeting` missing HOẶC `closing` missing | `passed = false` |
| Informal: `suggestions.found` không ảnh hưởng điểm | — |
| Formal: `suggestions` bắt buộc, thiếu trừ điểm nặng | — |
| Tất cả components đều found | `score = 5` |

Gemini tự tính `score` theo prompt — không có formula cứng ở frontend.

### 4.4 Giải thích trường `solutions`

Gemini trích xuất các **ý kiến/đề xuất thực sự** trong bài (không phải filler):

```typescript
interface Solution {
  id: string;             // "s1", "s2", ...
  idea: string;           // tóm tắt ý tưởng (tiếng Việt)
  originalText: string;   // quote chính xác từ bài viết
  relevantToPrompt: bool; // có trả lời đúng yêu cầu đề không
  relevanceNote: string;  // giải thích (tiếng Việt)
}
```

Ví dụ từ đề Book Club:
- `idea`: "Giới thiệu mã giảm giá hàng tháng thay vì sách miễn phí"
- `originalText`: "I recommend monthly discount codes..."
- `relevantToPrompt`: true

---

## 5. Call 2 — `analyzeCrossExam()` : Phân tích đa đề

### 5.1 Khi nào chạy

Chỉ khi user bấm nút **"Phân tích đa đề"** trong `ContentAnalysisResult.tsx`.  
Không tự động. Lý do: tốn thêm 1 lượt Gemini API (giới hạn free tier 15 req/min).

### 5.2 Dữ liệu đầu vào

```typescript
// Lọc trước khi gửi — chỉ gửi solutions hợp lệ
const relevantSolutions = solutions.filter(s => s.relevantToPrompt)

// Loại đề hiện tại, giới hạn 12 đề
const otherExams = allExams
  .filter(e => e.examId !== currentExamId)
  .slice(0, 12)
```

`allExams` được build từ `writing-part4.json`:

```typescript
interface ExamSummary {
  examId: string;
  examTitle: string;
  context: string;   // plain text, tối đa 80 ký tự (tiết kiệm token)
}
```

### 5.3 Prompt cross-exam

```
SOLUTIONS: [{ id, idea }]   // chỉ id + idea, không gửi originalText
OTHER EXAMS: [{ id, t (title), c (context 80 chars) }]

→ Gemini trả về: với mỗi solution, đề nào dùng được, mức độ nào
```

### 5.4 Kết quả — `CrossExamResult[]`

```typescript
interface CrossExamResult {
  solutionId: string;
  solutionIdea: string;
  applicableExams: {
    examId: string;
    examTitle: string;
    applicability: 'direct' | 'with_modification';
    modificationNote: string;  // tiếng Việt, tối đa 12 từ
  }[];
}
```

| Giá trị | Ý nghĩa |
|---|---|
| `direct` | Solution dùng nguyên vẹn cho đề kia |
| `with_modification` | Ý tưởng giống, cần điều chỉnh ngữ cảnh nhỏ |

Exams với `applicability = 'not_applicable'` bị filter bỏ trước khi trả về UI.

**Ví dụ**: Solution *"Post on social media"* từ đề Art Club:
- Art Club → bị loại (đề hiện tại)
- Language Club → `direct` (cũng cần quảng bá)
- Book Club → `with_modification` ("social media for book recommendations")
- Sports Club → `direct`

---

## 6. Fallback & Error Handling

### 6.1 Model fallback

```typescript
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash']
```

Thử `gemini-2.5-flash` trước. Nếu lỗi 429 hoặc 5xx → đợi 4s → thử `gemini-2.0-flash`.

### 6.2 JSON parser

```typescript
function parseJson<T>(text: string): T {
  // Strip markdown code block nếu Gemini vẫn trả về ```json ... ```
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  return JSON.parse(cleaned)
}
```

Nếu JSON bị cắt ngắn (Unterminated string) → throw lỗi rõ ràng cho user.

### 6.3 Các lỗi phổ biến

| Lỗi | Nguyên nhân | Hiển thị cho user |
|---|---|---|
| 429 | Vượt 15 req/min free tier | "Vui lòng thử lại sau 1 phút" |
| API_KEY_INVALID | Key sai hoặc hết hạn | "Kiểm tra lại Gemini API key" |
| 503 | Gemini quá tải | "Thử lại sau ít phút" |
| Unterminated JSON | Essay quá dài, bị cắt | "Phản hồi bị cắt ngắn, thử lại" |

---

## 7. Tối ưu token

| Kỹ thuật | Mục đích |
|---|---|
| `compact()` = `JSON.stringify()` không indent | Giảm ~30% token cho schema |
| `context.slice(0, 80)` trong ExamSummary | Không gửi full content đề khác |
| `MAX_CROSS_EXAM_EXAMS = 12` | Cap số đề trong cross-exam prompt |
| `temperature: 0.1` | Không cần cao — task có cấu trúc |
| `responseMimeType: 'application/json'` | Bỏ token intro "Here is the JSON..." |
| Chỉ gửi `relevantToPrompt = true` solutions | Giảm số solution đưa vào cross-exam |

---

## 8. Ví dụ end-to-end — đề Book Club

**Input**:
```
examContent:  "From next month we will no longer be able to continue our offer 
              of one free book every month. Also, problems with delivery..."
subQuestion:  "Write an email to the manager... show your feeling and recommendation"
letterType:   "formal"
essay:        "Dear Sir, I hope this email finds you well..."
```

**Call 1 output (scoreEssay)**:
```json
{
  "formatCheck": {
    "passed": true, "score": 5,
    "components": {
      "greeting":    { "found": true, "text": "Dear Sir," },
      "openingLine": { "found": true, "text": "I hope this email finds you well." },
      "suggestions": { "found": true, "count": 2 },
      "closing":     { "found": true, "text": "I look forward to hearing from you." },
      "signature":   { "found": true, "text": "Nguyen Mai Anh" }
    }
  },
  "contentAnalysis": {
    "solutions": [
      { "id": "s1", "idea": "Giới thiệu mã giảm giá hàng tháng",
        "originalText": "I recommend monthly discount codes...",
        "relevantToPrompt": true },
      { "id": "s2", "idea": "Đổi đối tác giao hàng mới",
        "originalText": "consider switching to a new delivery partner",
        "relevantToPrompt": true }
    ],
    "promptCoverage": 90, "score": 8
  }
}
```

**Call 2 output (analyzeCrossExam) — solution s1**:
```json
[{
  "solutionId": "s1",
  "solutionIdea": "Mã giảm giá hàng tháng",
  "applicableExams": [
    { "examId": "...", "examTitle": "Art Club",
      "applicability": "with_modification",
      "modificationNote": "Đổi thành giảm giá vé vào cửa buổi talk" },
    { "examId": "...", "examTitle": "Language Club",
      "applicability": "direct",
      "modificationNote": "" }
  ]
}]
```
