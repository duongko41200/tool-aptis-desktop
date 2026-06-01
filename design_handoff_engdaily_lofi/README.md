# Handoff: EngDaily — Lo-fi Study UI (refined glass redesign)

## Overview
EngDaily là app desktop học tiếng Anh (Tauri 2 + React 19 + Vite + TypeScript + Tailwind v4)
với thẩm mỹ **lo-fi**: nền minh hoạ phòng học/quán cà phê ấm, panel kính mờ, accent xanh lime,
font Plus Jakarta Sans. Gói này là bản **thiết kế lại giao diện** đã được chủ dự án duyệt:
giữ nguyên DNA lo-fi nhưng **tinh tế và dễ đọc hơn** — chuyển panel kính từ "tối/chữ trắng"
sang **kính sáng-trắng mờ, chữ đậm tối**, đồng thời chuẩn hoá nhịp khoảng cách, phân cấp chữ,
và bổ sung micro-interaction.

Phạm vi: 5 màn chính + 1 modal:
1. Welcome / Trang chủ
2. Dashboard (hub học tập hằng ngày)
3. AI Speaking Partner (luyện nói)
4. Writing Exercise (phòng viết)
5. Writing Feedback (AI chấm bài)
6. Modal "Ôn từ vựng" (flashcard reviewer)

## About the Design Files
Các file trong gói (`EngDaily.html` + thư mục `EngDaily/`) là **bản thiết kế tham chiếu viết bằng HTML**
(React qua Babel-in-browser, inline style + CSS variables). **KHÔNG copy trực tiếp vào app.**

Nhiệm vụ: **tái dựng các màn này trong codebase hiện có** (`aptis-desktop-apps`) theo đúng quy ước của nó —
TypeScript `.tsx`, class Tailwind + utility trong `index.css`, định tuyến bằng `react-router-dom`,
state bằng `zustand`. Phần lớn token thiết kế đã CÓ SẴN trong repo (xem mục Design Tokens) nên đây là
việc **dịch + tinh chỉnh**, không phải làm lại từ đầu.

## Fidelity
**High-fidelity.** Màu, typography, spacing, radius, shadow, và hành vi tương tác đều là bản cuối.
Hãy tái dựng pixel-perfect bằng Tailwind/utility sẵn có của repo. Khi prototype dùng inline style/CSS var,
ưu tiên map sang class Tailwind (`bg-lofi-green`, `glass-panel`, …) hoặc thêm utility mới vào `index.css`.

---

## Codebase mapping (rất quan trọng)

Repo: `aptis-desktop-apps/` · stack: React 19, Vite 7, Tauri 2, TS 5.8, Tailwind v4, react-router-dom 7, zustand 5.

| Màn thiết kế (file prototype) | Page đích trong repo | Route |
|---|---|---|
| `EngDaily/welcome.jsx` → `WelcomeScreen` | `src/pages/EngdailyLoFiWelcomeScreen.tsx` | `/` |
| `EngDaily/dashboard.jsx` → `DashboardScreen` | `src/pages/EngdailyDashboardUpdatedBg.tsx` (hoặc `...EnhancedReadability.tsx`) | `/dashboard` |
| `EngDaily/speaking.jsx` → `SpeakingScreen` | `src/pages/EngdailyAiSpeakingPartner.tsx` | `/speaking` |
| `EngDaily/writing.jsx` → `WritingScreen` | `src/pages/EngdailyWritingExercise.tsx` | `/writing` |
| `EngDaily/writing.jsx` → `FeedbackScreen` | `src/pages/EngdailyAdvancedAiWritingFeedback.tsx` | `/writing/feedback` |
| `EngDaily/vocab.jsx` → `VocabModal` | component mới `src/components/vocab/VocabReviewModal.tsx` | (modal, mở từ Welcome/Dashboard) |
| `EngDaily/lib.jsx` → `Icon`, `Logo`, `Widget`, `useCountdown` | `src/components/common/` (vd `Icon.tsx`, `Logo.tsx`) | — |
| `EngDaily/welcome.jsx` → `TopBar` | `src/components/layout/TopBar.tsx` | — |
| `EngDaily/welcome.jsx` → `ProfilePopover`, `SettingsPopover`, `SearchPopover` | `src/components/layout/` | — |

Repo đã có sẵn các component writing nên **tái dùng**, đừng tạo trùng:
`src/components/writing/{FeedbackPanel,GrammarSection,VocabSection,StructureSection,TopicCard}.tsx`,
`src/hooks/useWritingSession.ts`, `src/stores/useWritingStore.ts`, `src/services/writingService.ts`,
`src/types/writing.ts`. Hãy nối UI mới vào các module này thay vì hard-code dữ liệu mẫu.

### Routing
`App.tsx` hiện là demo Tauri mặc định — thay bằng router thật:
```tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
// hoặc <BrowserRouter><Routes>… nếu muốn
const router = createBrowserRouter([
  { path: "/", element: <EngdailyLoFiWelcomeScreen /> },
  { path: "/dashboard", element: <EngdailyDashboardUpdatedBg /> },
  { path: "/speaking", element: <EngdailyAiSpeakingPartner /> },
  { path: "/writing", element: <EngdailyWritingExercise /> },
  { path: "/writing/feedback", element: <EngdailyAdvancedAiWritingFeedback /> },
]);
```
Trong prototype, điều hướng là hàm `go('dashboard')`. Khi port: thay bằng
`const navigate = useNavigate();` → `navigate('/dashboard')`. Modal vocab điều khiển bằng
state cục bộ (`useState`) hoặc một slice zustand, KHÔNG phải route.

---

## Design Tokens

### Đã có trong `src/index.css` (giữ nguyên / tái dùng)
```
--color-lofi-green: #d9e89d   ← accent chính (= --accent của prototype)
--color-primary:    #d9f99d
--color-primary-dark:#bef264
font-family: 'Plus Jakarta Sans'
utilities: .glass-panel .glass-panel-dark .glass-button .raindrops .animate-pulse-soft .mic-active-ring
@keyframes pulse-soft, pulse-ring
```

### Cần BỔ SUNG vào `index.css` (hệ kính sáng + token mới của bản redesign)
Đây là thay đổi cốt lõi giúp "dễ đọc, chuyên nghiệp hơn". Thêm vào `@theme` và `@layer utilities`:

```css
@theme {
  /* accent shades */
  --color-accent: #d9e89d;
  --color-accent-strong: #c5e063;
  --color-accent-deep: #aacb4f;
  --color-accent-ink: #2c3a16;     /* chữ tối ĐẶT TRÊN nền accent */
  /* ink trên nền kính sáng */
  --color-ink:   #232a1e;
  --color-ink-2: #4b5443;
  --color-ink-3: #79836d;
}

@layer utilities {
  /* KÍNH SÁNG — thay cho glass-panel tối khi cần chữ đậm dễ đọc */
  .glass-light {
    background: rgba(255,255,255,0.74);
    backdrop-filter: blur(18px) saturate(1.25);
    -webkit-backdrop-filter: blur(18px) saturate(1.25);
    border: 1px solid rgba(255,255,255,0.65);
    box-shadow: 0 8px 24px rgba(20,28,15,0.16), 0 2px 6px rgba(20,28,15,0.08),
                inset 0 1px 0 rgba(255,255,255,0.55);
    border-radius: 26px;
  }
  .glass-light-2 {
    background: rgba(255,255,255,0.58);
    backdrop-filter: blur(14px) saturate(1.2);
    -webkit-backdrop-filter: blur(14px) saturate(1.2);
    border: 1px solid rgba(255,255,255,0.65);
    border-radius: 18px;
  }
}
```

### Bảng token đầy đủ (từ `EngDaily/styles.css`)
- **Radius:** sm 12 · md 18 · lg 26 · xl 34 · pill 9999 (px)
- **Shadow:**
  - sm `0 1px 2px rgba(20,28,15,.10), 0 2px 8px rgba(20,28,15,.06)`
  - md `0 8px 24px rgba(20,28,15,.16), 0 2px 6px rgba(20,28,15,.08)`
  - lg `0 24px 60px rgba(15,22,10,.34), 0 6px 18px rgba(15,22,10,.18)`
  - glow (accent) `0 6px 20px rgba(170,203,79,.40)`
- **Status:** good `#6fae5a` · warn `#e0a93b` · bad `#d98a6a` · info `#6aa6c4`
- **Fonts:** UI `Plus Jakarta Sans` (400–800); mono `JetBrains Mono` (cho IPA, timer, số liệu)
- **Overlay nền:** lớp tối phủ ảnh nền, mặc định `rgba(10,16,6,0.34)` (gradient dọc, đậm dần xuống dưới)
- **Easing:** `cubic-bezier(0.4,0,0.2,1)` cho mọi transition (~140–240ms)

### Lưu ý màu chữ
- Trên **ảnh nền / kính tối**: chữ trắng `#fff` + `text-shadow: 0 2px 14px rgba(8,12,4,.45)`.
- Trên **kính sáng (`glass-light`)**: chữ `--color-ink` (#232a1e), phụ `--color-ink-2/3`.
- Trên **nền accent** (nút primary, mặt sau flashcard): chữ `--color-accent-ink` (#2c3a16).

---

## Screens / Views

### 1. Welcome / Trang chủ  (`/`)
**Purpose:** điểm vào; CTA chính "Bắt đầu bài học"; lối tắt luyện tập; widget streak.
**Layout:** full-viewport, nền ảnh + overlay + lớp mưa (z thấp); nội dung canh giữa.
- **TopBar** (fixed top, padding 22/28px): trái = Logo (icon tai nghe trong khối bo méo `border-radius: 36% 64% 60% 40% / 50% 42% 58% 50%`, nền accent, chữ EngDaily 800). Phải = nav pill (`glass-panel-dark`) gồm Trang chủ/Học tập/Nói/Viết (mục active nền accent, chữ ink); nút cúp tròn; nút "Đăng nhập" (primary pill).
- **Hero (giữa màn):** chip "Học mỗi ngày · giữ chuỗi của bạn"; H1 **một dòng** `clamp(26px,3.1vw,40px)` weight 800, `white-space:nowrap`, text-shadow; hàng dưới: chip "5 phút" + phụ đề. CTA lớn: nút primary bo `34px`, 2 dòng ("Bắt đầu bài học" 22px / "Từ vựng • Đọc • Nghe" 13px), có `animate-pulse-soft`, shadow glow. Dưới CTA: nhãn "Thêm lựa chọn luyện tập" + 4 nút ghost (Thêm từ mới/Ôn từ vựng/Luyện đọc/Xem video).
- **Bottom-left widgets** (fixed, w≈268, gap 11): "Có gì mới?", "Luyện phát âm", hàng Streak (9 ngày, icon lửa) + Thử thách (timer mono đếm ngược, chip accent), và công tắc Study/Pomodoro (`glass-light-2` pill, mục chọn nền accent).
- **Right utility rail** (fixed right-bottom, các nút tròn `iconbtn` = glass tối, gap 11). Thứ tự & hành vi (đã chốt theo feedback của teammate "duong"):
  1. **Tìm kiếm** → mở `SearchPopover` (ô input + lịch sử gần đây)
  2. **Đã hoàn thành** → `navigate('/dashboard')`
  3. **Hồ sơ** (icon user) → mở `ProfilePopover`
  4. **Trò chuyện với AI** (icon chat) → `navigate('/speaking')`
  5. **Cài đặt** → mở `SettingsPopover`
  - Nút đang mở **sáng nền accent**. Click ra ngoài (overlay trong suốt) để đóng. Popover hiện bên trái rail (`right: 80px; bottom: 22px`, w 312, `glass-light`, bo 26).

**ProfilePopover:** header gradient accent — avatar "M", "Minh Nguyễn", email, chip hạng "Bạc"; 3 ô thống kê (Streak 9 / Từ 142 / Mục tiêu 67%); menu (Xem hồ sơ, Thống kê học tập, Kho từ đã lưu, Cài đặt tài khoản) + "Đăng xuất" (màu bad).
**SettingsPopover:** header "Cài đặt"; hàng có toggle (Âm thanh nền, Nhắc học hằng ngày — switch tròn 42×24, bật = accent-deep), Ngôn ngữ = chip "Tiếng Việt", và "Tùy chỉnh giao diện → Tweaks".
**SearchPopover:** ô input bo pill + danh sách "Gần đây" lọc theo từ khoá.

### 2. Dashboard  (`/dashboard`)
**Purpose:** hub hằng ngày — chào, tiến độ, chọn chế độ luyện tập, hoạt động gần đây, player.
**Layout:** cuộn dọc, `max-width: 1080px`, padding-top 108 (chừa TopBar).
- **Header card** (`glass-light`, padding 26, flex): trái = eyebrow "Thứ Hai · Buổi sáng", H1 "Chào buổi sáng, Minh 🌿" 30px/800, dòng tiến độ "20/30 phút", 3 chip (Streak/từ đã thuộc/hạng). Phải = **Ring** SVG (vòng tiến độ 67%, stroke 9, màu accent-deep) + nút primary "Tiếp tục học".
- **Mode grid** (3 cột, gap 16): mỗi `ModeCard` (`glass-light`, hover nhấc 4px + viền accent + shadow lg): icon khối accent 48px, chip tag, tiêu đề 19/800, mô tả, meta + "Bắt đầu →". 3 thẻ: "Luyện nói với AI"→`/speaking`, "Phòng viết"→`/writing`, "Luyện nghe & nhại"→`/speaking`.
- **Bottom row** (grid 1.5fr / 1fr): trái = card "Hoạt động gần đây" (list item icon + tiêu đề + phụ, hover nền nhạt, click điều hướng). Phải = **Player** lo-fi (`glass-panel-dark`: nút play tròn accent, tên track, thanh tiến độ, skip/volume) + card "Từ của ngày" (serene /səˈriːn/ + nghĩa + nút "Lưu vào kho").
- **Ring component:** SVG vòng tròn, `strokeDasharray=chu vi`, `strokeDashoffset` theo %, xoay -90°, transition 900ms; giữa hiển thị label + sub.

### 3. AI Speaking Partner  (`/speaking`)
**Purpose:** hội thoại với AI, sửa lỗi trực tiếp.
**Layout:** canh giữa, khung `min(1080px,95vw) × min(78vh,720px)`, grid `1fr / 320px`.
- **Khung chat** (`glass-light`, bo 34): header (avatar AI accent + "Trợ lý AI · Luyện nói" + "Đang lắng nghe" chấm xanh + chip timer). Vùng tin nhắn cuộn: bong bóng AI nền trắng/viền, bong bóng user nền accent chữ ink; mỗi tin user có thể kèm khối "Gợi ý sửa" (nền warn nhạt: câu sai gạch đỏ, câu đúng đậm, ghi chú). Composer dưới: nút bàn phím, **nút mic tròn 72px** (đứng yên nền accent + pulse; khi ghi âm đổi sang `bad` + vòng ring lan — dùng `.mic-active-ring`), nút loa.
- **Side panel** (cột phải): card "Chủ đề hôm nay" (list chọn, mục chọn nền accent nhạt) + card "Sửa lỗi trực tiếp" (đếm số lỗi, list các câu đã sửa; rỗng thì hiện icon check xanh "Chưa có lỗi nào").
- **Behavior:** bấm mic = bắt đầu ghi → bấm lại = thêm 1 câu user (lấy lần lượt từ mảng mẫu) rồi sau ~700ms AI trả lời; câu nào có `corr` thì đẩy vào panel sửa lỗi. Trong app thật: nối với service nhận diện giọng nói + LLM, đừng dùng mảng cứng.

### 4. Writing Exercise  (`/writing`)
**Purpose:** viết theo đề; checklist yêu cầu cập nhật realtime; nộp để chấm.
**Layout:** canh giữa `min(1080px,95vw) × min(80vh,740px)`, grid `300px / 1fr`.
- **Cột trái:** card đề (chip "Đề hôm nay", tiêu đề đề, mô tả) + card "Yêu cầu bài viết" (mỗi yêu cầu có icon tròn check/✗ đổi trạng thái theo số từ; dưới có Ring nhỏ "x/3").
- **Cột phải = editor** (`glass-light`, bo 34): header (icon bút + "Phòng viết" + nút "Điền mẫu" + đếm từ). `<textarea>` nền trắng mờ, 16px/1.7. Footer: "Tự động lưu nháp" + nút "Lưu nháp" + nút primary "Nộp & chấm bài" (disable khi <5 từ) → `navigate('/writing/feedback')`.
- **Behavior:** đếm từ = `text.trim().split(/\s+/)`; mỗi yêu cầu có hàm `test(wordCount)` bật/tắt. Trong app thật nối `useWritingSession`/`useWritingStore` sẵn có.

### 5. Writing Feedback  (`/writing/feedback`)
**Purpose:** hiển thị điểm AI chấm + nhận xét chi tiết.
**Layout:** cuộn dọc, `max-width: 1040`, grid `320px / 1fr`.
- **Cột trái (sticky):** card điểm tổng (Ring lớn 132px = 82, "/100", chip "Khá tốt"); card "Phân tích" (3 ScoreBar: Ngữ pháp 78 / Từ vựng 85 / Bố cục 84 — mỗi cái có icon + số mono + thanh `bar`); nút "Viết lại / cải thiện" → `/writing`.
- **Cột phải:** H1 "Nhận xét chi tiết" + tên đề; tab pill (`glass-light-2`) **Ngữ pháp / Từ vựng / Bố cục / Bài mẫu** (mục chọn nền accent):
  - *Ngữ pháp:* các thẻ câu sai (gạch đỏ) → câu đúng (✓ xanh) + ghi chú.
  - *Từ vựng:* từ cũ (gạch) → từ nâng cấp (đậm) + lý do.
  - *Bố cục:* danh sách gợi ý (icon bóng đèn warn).
  - *Bài mẫu:* đoạn văn mẫu trên nền accent nhạt, từ khoá in đậm.
- Trong app thật map vào `FeedbackPanel`/`GrammarSection`/`VocabSection`/`StructureSection` sẵn có.

### 6. Modal "Ôn từ vựng" (flashcard reviewer)
**Purpose:** ôn từ bằng flashcard lật + duyệt bộ thẻ. **Đây là phần thay thế cho "khối xanh đặc" cũ.**
**Layout:** overlay tối + blur; hộp `min(1040px,96vw)`, bo 34, grid `380px / 1fr`.
- **Header:** icon + "Ôn từ vựng" + phụ "Lặp lại ngắt quãng · N thẻ"; phải = thanh tiến độ + "đã thuộc/tổng" + nút đóng.
- **Trái = flashcard:** mặt trước (nền trắng): chip tag, từ 38px/800, IPA mono, nút "Nghe", gợi ý "Chạm để xem nghĩa". Mặt sau (nền accent, chữ ink): Nghĩa + Ví dụ (EN + VI). **Quan trọng — KHÔNG dùng 3D `rotateY` + `backface-visibility`** (renderer làm chữ bị lật gương). Dùng **render có điều kiện** front/back kèm animation `card-in` (chỉ scale, không lật). Dưới: nút "Ôn lại" + "Đã thuộc".
- **Phải = deck list:** tiêu đề + nút chuyển trạng thái rỗng↔mẫu. List thẻ (từ + IPA + nghĩa + tag, item đang chọn viền accent), nút "Thêm từ mới". **Empty state:** icon lịch + "Kho từ vựng đang trống" + mô tả + nút "Mở bộ từ vựng".
- **Behavior:** click thẻ = lật (toggle state, KHÔNG transform 3D); "Đã thuộc" = đánh dấu + sang thẻ kế; tiến độ = số đã thuộc/tổng.

---

## Interactions & Behavior (chung)
- **Entrance animation — CẢNH BÁO:** prototype từng bị kẹt `opacity:0` khi runtime tạm dừng animation. Quy tắc: animation vào màn **chỉ transform** (translateY/scale), **không bao giờ animate opacity từ 0** ở trạng thái persistent. Trong React/Vite chuẩn thì an toàn hơn, nhưng vẫn nên giữ nguyên tắc này (hoặc dùng `@starting-style`/Framer Motion với giá trị cuối luôn hiển thị).
- **Hover:** card nhấc `translateY(-4px)` + đổi viền sang accent + shadow lg; nút icon nhấc 1px + nền đậm hơn; nav item nền `rgba(255,255,255,.1)`.
- **Active:** nút `translateY(1px)`.
- **Transition:** ~140–240ms, easing `cubic-bezier(0.4,0,0.2,1)`.
- **Lớp mưa:** prototype vẽ hạt mưa bằng JS (46 hạt rơi). Repo đã có `.raindrops` (texture tĩnh) — có thể giữ texture, hoặc port hiệu ứng hạt rơi nếu muốn động. Nên cho bật/tắt được (settings).

## State Management
- **Điều hướng:** react-router (`navigate`). Modal vocab = state cục bộ hoặc slice zustand.
- **Writing:** dùng `useWritingStore` (zustand) + `useWritingSession` + `writingService` đã có.
- **Speaking:** cần slice cho danh sách tin nhắn, trạng thái ghi âm, danh sách lỗi.
- **Settings (Tweaks → tuỳ chọn):** prototype có panel chỉnh accent/overlay/blur/font/mưa. Trong app, nếu muốn giữ, lưu vào zustand + localStorage và áp bằng CSS variable trên `:root`. Không bắt buộc cho bản đầu.
- **Profile/Settings/Search popover:** state mở/đóng cục bộ trong page Welcome (hoặc layout dùng chung).

## Design Tokens — xem mục "Design Tokens" ở trên (đã liệt kê đầy đủ màu/spacing/radius/shadow/typography).

## Assets
- **Ảnh nền lo-fi:** prototype dùng `<image-slot>` (placeholder kéo-thả) — **chỉ dành cho prototype**. App thật dùng `src/assets/images/dashboard_bg.gif` (đã có) hoặc ảnh tĩnh chất lượng cao. Pinterest GIF trong code cũ nên thay bằng asset tự host để chạy offline (Tauri).
- **Icon:** prototype dùng bộ SVG inline tự vẽ (`Icon` trong `lib.jsx`, stroke 1.7, grid 24). Khi port nên dùng **`lucide-react`** (hoặc Material Symbols repo đã khai báo) cho gọn — tên icon map gần như 1-1 (play, mic, pencil, chat, user, settings, search, trophy, flame, …).
- **Fonts:** Plus Jakarta Sans (đã dùng) + JetBrains Mono (cho IPA/timer/số — cần thêm import). Nên self-host trong `src/assets/fonts` để offline.
- **Âm thanh:** repo có `src/assets/sounds` cho player lo-fi — nối vào component Player ở Dashboard.

## Files (tham chiếu trong gói này)
- `EngDaily.html` — shell: nền, overlay, lớp mưa, mount React, nạp các module.
- `EngDaily/styles.css` — **nguồn token gốc** (màu, glass, button, chip, bar, animation). Đối chiếu khi viết `index.css`.
- `EngDaily/lib.jsx` — `Icon` (bộ path SVG), `Logo`, `Widget`, `useCountdown`.
- `EngDaily/welcome.jsx` — `WelcomeScreen`, `TopBar`, `ProfilePopover`, `SettingsPopover`, `SearchPopover`.
- `EngDaily/dashboard.jsx` — `DashboardScreen`, `Ring`, `ModeCard`, `Player`.
- `EngDaily/vocab.jsx` — `VocabModal` (flashcard + deck + empty state) và mảng `DECK` mẫu.
- `EngDaily/speaking.jsx` — `SpeakingScreen`, `Bubble`, dữ liệu hội thoại mẫu.
- `EngDaily/writing.jsx` — `WritingScreen`, `FeedbackScreen`, `ScoreBar`, dữ liệu đề + feedback mẫu.
- `EngDaily/app.jsx` — bộ định tuyến state-machine của prototype (`go()`), lớp mưa JS, wiring Tweaks → dùng làm tham chiếu logic, KHÔNG port nguyên.
- `EngDaily/tweaks-panel.jsx`, `EngDaily/image-slot.js` — tiện ích prototype, **không port** vào app.

## Gợi ý thứ tự triển khai
1. Cập nhật `index.css` (thêm token + `.glass-light/.glass-light-2`) và import JetBrains Mono.
2. Dựng `react-router` trong `App.tsx` + tạo `components/common/Icon.tsx` (hoặc cài `lucide-react`) và `layout/TopBar.tsx`.
3. Port Welcome (gồm 3 popover) → Dashboard → Vocab modal → Speaking → Writing → Feedback.
4. Nối Writing/Feedback vào store + service sẵn có; thay dữ liệu mẫu bằng dữ liệu thật.
5. Thay nền `<image-slot>` bằng asset thật; nối Player với `assets/sounds`.
