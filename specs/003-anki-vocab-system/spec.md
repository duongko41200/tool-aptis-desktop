# Feature Specification: Anki-Style Vocabulary System

**Feature Branch**: `003-anki-vocab-system`

**Created**: 2026-06-01

**Status**: Draft

**Input**: Nâng cấp tab Vocabulary và luồng "Add to Vocab" từ Clipboard để hỗ trợ mô hình Deck → Note → Card đúng chuẩn Anki, thuật toán FSRS, Cloze Deletion, Tags, và quản lý thẻ (Bury/Suspend/Flag).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Tổ chức học bằng Deck phân cấp (Priority: P1)

Người dùng muốn tổ chức flashcard theo chủ đề phân cấp: `English > Vocabulary`, `English > Grammar`, `Japanese > N5`. Khi học deck cha `English`, tất cả sub-deck bên trong cũng được học cùng. Khi chỉ muốn học `Japanese::N5`, chỉ các thẻ trong sub-deck đó được đưa ra ôn tập.

**Why this priority**: Không có Deck thì người dùng không thể tổ chức kiến thức. Đây là cấu trúc cơ sở cho mọi chức năng khác.

**Independent Test**: Tạo deck `English` với 2 sub-deck `Vocabulary` (5 notes) và `Grammar` (3 notes). Học deck `English` → xác nhận 8 notes được đưa vào review. Học riêng `English::Grammar` → xác nhận chỉ 3 notes.

**Acceptance Scenarios**:

1. **Given** không có deck nào, **When** người dùng tạo deck `English`, **Then** deck xuất hiện trong danh sách với tên `English` và 0 thẻ.
2. **Given** deck `English` tồn tại, **When** người dùng tạo sub-deck `English::Vocabulary`, **Then** sub-deck xuất hiện lồng dưới `English`.
3. **Given** deck `English` có 2 sub-deck với tổng 8 thẻ, **When** người dùng bắt đầu review `English`, **Then** cả 8 thẻ từ tất cả sub-deck được đưa vào session.
4. **Given** deck cha đang được chọn, **When** người dùng thêm note mới, **Then** note được tạo trong sub-deck cuối đã chọn, không phải deck cha.

---

### User Story 2 — Tạo Note và sinh Card (Priority: P1)

Người dùng thêm một Note với các trường (fields): Front, Back, ví dụ. Hệ thống tự sinh Card từ Note theo template được chọn: Basic (Front→Back), Reverse (Back→Front), hoặc Cloze. Một Note có thể sinh ra nhiều Card. Khi edit Note, tất cả Card liên quan cập nhật theo.

**Why this priority**: Đây là nền tảng của hệ thống flashcard. Note/Card model khác với Word/Meaning hiện tại.

**Independent Test**: Tạo Note với Front="Apple", Back="Táo", chọn template "Basic + Reverse". Xác nhận 2 cards được tạo: Card 1 hỏi Apple→?, Card 2 hỏi Táo→?. Edit Note sửa Back thành "Táo (trái cây)" → cả 2 cards cập nhật.

**Acceptance Scenarios**:

1. **Given** một deck, **When** người dùng tạo Note với Front/Back và chọn template "Basic", **Then** 1 Card được sinh ra hỏi Front → Back.
2. **Given** cùng Note, **When** người dùng chọn template "Basic + Reverse", **Then** 2 Cards được sinh: Front→Back và Back→Front.
3. **Given** Note có nội dung Cloze `The capital of Japan is {{c1::Tokyo}}`, **When** người dùng chọn template "Cloze", **Then** Card sinh ra hiện `The capital of Japan is [...]` và đáp án là `Tokyo`.
4. **Given** Note đã có Card, **When** người dùng sửa nội dung Note, **Then** tất cả Card liên quan phản ánh nội dung mới.
5. **Given** người dùng xóa Note, **When** xác nhận xóa, **Then** tất cả Card từ Note đó cũng bị xóa.

---

### User Story 3 — Luồng học hàng ngày: New → Learning → Review (Priority: P1)

Khi vào một Deck, người dùng thấy 3 nhóm: **New** (chưa học), **Learning** (đang học, chưa tới hạn), **Review** (đã thuộc, cần ôn định kỳ). Sau khi trả lời, hệ thống tự tính khoảng cách ôn tiếp theo theo thuật toán FSRS. Thẻ Again/Hard quay lại sớm hơn; Easy/Good dời ra xa hơn.

**Why this priority**: Đây là vòng lặp học tập cốt lõi. Không có flow này thì app không có giá trị học tập.

**Independent Test**: Thêm 5 thẻ mới. Vào review → 5 thẻ xuất hiện trong nhóm New. Đánh giá Good cho 3 thẻ, Again cho 2 thẻ → 3 thẻ chuyển sang Learning/Review với due_date trong tương lai; 2 thẻ xuất hiện lại trong session ngay.

**Acceptance Scenarios**:

1. **Given** deck có 5 thẻ mới, **When** người dùng vào review, **Then** màn hình deck hiện `New: 5 | Learning: 0 | Review: 0`.
2. **Given** đang trong review session, **When** người dùng nhấn Again, **Then** thẻ xuất hiện lại trong vòng 10 phút cùng session.
3. **Given** người dùng nhấn Good trên thẻ mới, **Then** thẻ chuyển sang Learning với due_date ~1 ngày sau.
4. **Given** người dùng nhấn Easy trên thẻ đang Learning, **Then** thẻ chuyển sang Review với due_date ~4 ngày sau.
5. **Given** thẻ đã ở Review nhiều lần, **When** người dùng tiếp tục đánh giá Good, **Then** khoảng cách ôn tăng dần (7 → 15 → 30 ngày...).

---

### User Story 4 — Cloze Deletion (Priority: P2)

Người dùng có thể tạo thẻ Cloze bằng cách bôi đen text và nhấn nút "Ẩn" (hoặc tự gõ `{{c1::answer}}`). App sinh thẻ ẩn phần được đánh dấu, hiện `[...]` thay thế. Hỗ trợ nhiều cloze trong cùng một Note (`c1`, `c2`...).

**Why this priority**: Cloze là loại thẻ hiệu quả nhất cho học tiếng Anh và kiến thức thực tế. Cần có sau khi Basic card ổn định.

**Independent Test**: Tạo Note Cloze với text `Canberra was founded in {{c1::1913}}`. Xác nhận Card hiện `Canberra was founded in [...]`. Đáp án khi lật là `1913`.

**Acceptance Scenarios**:

1. **Given** người dùng gõ text có `{{c1::Tokyo}}`, **When** tạo Note Cloze, **Then** Card sinh ra hiện dấu `[...]` thay cho `Tokyo`.
2. **Given** Note có 2 cloze `{{c1::X}} và {{c2::Y}}`, **When** sinh Card, **Then** tạo ra 2 Cards: Card 1 ẩn X, Card 2 ẩn Y (còn lại hiện nguyên).
3. **Given** người dùng bôi đen text trong note editor và nhấn "Tạo Cloze", **Then** text được tự động bọc bởi `{{c1::...}}`.

---

### User Story 5 — Tags, Bury, Suspend, Flag (Priority: P3)

Người dùng có thể gắn nhiều tags vào Note để tìm kiếm và lọc dễ hơn (không cần tạo nhiều Deck). Có thể Bury (ẩn thẻ 1 ngày), Suspend (ẩn vô thời hạn), và Flag (đánh dấu màu) từng Card mà không ảnh hưởng thuật toán học.

**Why this priority**: Quản lý thẻ quan trọng nhưng không blocking. Người dùng có thể học trước khi có các tính năng này.

**Independent Test**: Tạo 10 notes, tag 5 notes với "IELTS". Lọc theo tag "IELTS" → chỉ hiện 5 notes. Suspend 1 thẻ → thẻ đó không xuất hiện trong review cho tới khi unsuspend.

**Acceptance Scenarios**:

1. **Given** note có tags, **When** người dùng tìm kiếm/lọc theo tag, **Then** chỉ notes có tag đó hiển thị.
2. **Given** đang review, **When** người dùng nhấn Bury trên Card, **Then** Card không xuất hiện trong session hôm nay, xuất hiện lại ngày mai.
3. **Given** người dùng Suspend một Card, **When** mở review, **Then** Card đó không bao giờ xuất hiện cho đến khi được Unsuspend.
4. **Given** người dùng Flag card với màu đỏ, **When** xem danh sách card, **Then** card hiển thị indicator màu đỏ, thứ tự review không thay đổi.

---

### User Story 6 — "Add to Vocab" từ Clipboard Popup hỗ trợ model mới (Priority: P1)

Khi người dùng save nội dung từ popup Ctrl+K và bật "Add to Vocab", form cho phép chọn Deck đích, chọn template card (Basic/Cloze), và điền các field. Cloze có thể được tạo ngay từ text đã copy.

**Why this priority**: Đây là điểm tích hợp giữa Clipboard và Vocabulary. Người dùng nói rõ "chỉ cần điều chỉnh lúc add vào vocab".

**Independent Test**: Copy câu `The Eiffel Tower was built in 1889` từ Chrome → Ctrl+K → bật "Add to Vocab" → chọn deck "English::Reading" → chọn Cloze → bôi chọn "1889" → Save. Vào tab Vocab → deck English::Reading → xác nhận Card hiện `The Eiffel Tower was built in [...]`.

**Acceptance Scenarios**:

1. **Given** popup Ctrl+K đang hiện, **When** người dùng bật "Add to Vocab", **Then** form hiện dropdown chọn Deck và template (Basic/Cloze).
2. **Given** chọn template Basic, **When** điền Front/Back và Save, **Then** Note và Card được tạo trong deck đã chọn.
3. **Given** chọn template Cloze với text được copy, **When** người dùng bôi đen từ muốn ẩn và nhấn "Tạo Cloze", **Then** text được wrap thành `{{c1::...}}` tự động.
4. **Given** chưa có deck nào, **When** mở form Add to Vocab, **Then** có option "Tạo deck mới" ngay trong popup.

---

### Edge Cases

- Note Cloze không có `{{cN::...}}` nào → báo lỗi validation trước khi save.
- Xóa Deck đang chứa Notes → cảnh báo "X notes sẽ bị xóa", yêu cầu xác nhận.
- Sub-deck bị xóa khi deck cha còn tồn tại → chỉ sub-deck và notes bên trong bị xóa.
- Note edit làm mất nội dung Cloze đang có → cards bị re-generate, progress reset về 0.
- Deck tên trùng nhau cùng cấp → không cho phép, báo lỗi.
- Flag/Bury/Suspend khi offline → hoạt động bình thường (local operation).
- Người dùng tạo 100+ decks → UI vẫn scrollable và tìm kiếm được.

---

## Requirements *(mandatory)*

### Functional Requirements

**Deck Management**
- **FR-001**: Người dùng PHẢI có thể tạo Deck với tên tùy chỉnh.
- **FR-002**: Người dùng PHẢI có thể tạo Sub-deck bằng cách đặt tên dạng `Parent::Child` hoặc chọn deck cha khi tạo.
- **FR-003**: Khi học một deck cha, tất cả thẻ trong sub-deck cũng được đưa vào session.
- **FR-004**: Deck PHẢI hiển thị số thẻ New / Learning / Review.

**Note & Card Model**
- **FR-005**: Mỗi Note PHẢI có ít nhất 2 fields: Front và Back.
- **FR-006**: Hệ thống PHẢI sinh Card từ Note theo template: Basic (Front→Back), Reverse (Back→Front), Basic+Reverse, Cloze.
- **FR-007**: Khi sửa Note, tất cả Card liên quan PHẢI cập nhật nội dung tương ứng.
- **FR-008**: Xóa Note PHẢI xóa tất cả Card sinh ra từ Note đó.
- **FR-009**: Cloze Note PHẢI hỗ trợ cú pháp `{{c1::answer}}`, `{{c2::answer}}` và sinh Card riêng cho từng cloze.

**Review Engine**
- **FR-010**: Session PHẢI hiển thị trạng thái thẻ: New, Learning, Review.
- **FR-011**: Thẻ nhận đánh giá Again PHẢI xuất hiện lại trong session hiện tại (trong vòng 10 phút).
- **FR-012**: Thuật toán lập lịch PHẢI tính due_date dựa trên FSRS hoặc SM-2 nâng cao, khoảng cách tăng dần theo mức độ ghi nhớ.
- **FR-013**: Sau mỗi session, PHẢI hiển thị thống kê: số thẻ đã ôn, tỉ lệ Again/Hard/Good/Easy.

**Card Management**
- **FR-014**: Người dùng PHẢI có thể Bury một Card (ẩn tới ngày mai).
- **FR-015**: Người dùng PHẢI có thể Suspend một Card (ẩn vô thời hạn, Unsuspend thủ công).
- **FR-016**: Người dùng PHẢI có thể Flag Card với 4 màu: đỏ, vàng, xanh, không màu.
- **FR-017**: Tags PHẢI có thể gắn vào Note và dùng để lọc/tìm kiếm.

**Clipboard Integration**
- **FR-018**: Form "Add to Vocab" trong Clipboard popup PHẢI cho phép chọn Deck đích.
- **FR-019**: Form PHẢI cho phép chọn template card: Basic hoặc Cloze.
- **FR-020**: Với template Cloze, người dùng PHẢI có thể bôi đen text và tạo cloze bằng 1 click.
- **FR-021**: Nếu chưa có deck, form PHẢI cung cấp option tạo deck mới ngay tại chỗ.

### Key Entities

- **Deck**: id, name, parent_deck_id (nullable), created_at. Hỗ trợ phân cấp vô hạn qua self-reference.
- **Note**: id, deck_id, template_type (basic/reverse/cloze), fields (JSON: {front, back, cloze_text}), tags (comma-separated), created_at, updated_at.
- **Card**: id, note_id, card_type (forward/reverse/cloze_N), due_date, state (new/learning/review), interval_days, ease_factor, suspended (bool), buried_until (nullable), flag_color (nullable), created_at.
- **ReviewLog**: id, card_id, rating (again/hard/good/easy), reviewed_at, interval_before, interval_after.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng tạo được Deck + Sub-deck và thêm Note vào đúng sub-deck trong **dưới 30 giây**.
- **SC-002**: Khi học deck cha, **100%** thẻ từ tất cả sub-deck xuất hiện trong session.
- **SC-003**: Từ 1 Note Basic+Reverse, hệ thống tự sinh **đúng 2 Cards** mà không cần thao tác thêm.
- **SC-004**: Từ clipboard popup, người dùng hoàn thành "Add to Vocab dạng Cloze" trong **dưới 15 giây**.
- **SC-005**: Sau 30 ngày học đều đặn (≥10 thẻ/ngày), tỉ lệ nhớ thẻ khi ôn lại đạt **≥ 80%**.
- **SC-006**: Tìm kiếm theo tag trả về kết quả **chính xác 100%** trong **dưới 1 giây** với 1,000+ notes.

---

## Assumptions

- **Scope v1**: Chỉ làm Deck Management, Basic/Cloze card, FSRS/SM-2 scheduler, Tags, Bury/Suspend/Flag. Image Occlusion và Media (audio/video) là v2.
- **Thuật toán**: Dùng SM-2 cải tiến với learning steps (10m → 1d → 3d) thay vì implement full FSRS (phức tạp hơn nhiều). FSRS có thể nâng cấp sau.
- **Learning steps**: Thẻ mới đi qua các bước học: Again trong 10 phút, sau đó 1 ngày, sau đó 3 ngày trước khi vào Review queue.
- **Migration**: Vocabulary entries hiện tại (từ feature 001) cần được migrate sang model Note/Card mới — mỗi entry thành 1 Note Basic trong một deck mặc định "Default".
- **Clipboard integration**: Chỉ điều chỉnh phần "Add to Vocab" trong popup (US6), không thay đổi phần save to library.
- **Tags vs Deck**: Khuyến khích dùng Tags để phân loại chi tiết, Deck để phân loại cấp cao (theo ngôn ngữ hoặc chứng chỉ).
- **Sub-deck depth**: Cho phép tối đa 3 cấp phân cấp (Deck > Sub-deck > Sub-sub-deck).
