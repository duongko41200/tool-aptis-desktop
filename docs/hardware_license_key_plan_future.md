# Kế hoạch Triển khai Hệ thống License Key (Chống Chia Sẻ) - Dành cho Tương lai

Bản kế hoạch này mô tả kiến trúc và các bước cần thiết để xây dựng một hệ thống bản quyền chặt chẽ, khóa Key theo từng máy tính (Hardware Binding) sử dụng Tauri và Cloudflare KV. Bạn hãy lưu lại bản này để dùng khi dự án bắt đầu bán thương mại.

## 1. Kiến trúc Hệ thống (Architecture)

- **Frontend (React/Tauri):** Giao diện nhập Key. Nhận nhiệm vụ lấy Mã máy tính và gửi API.
- **Backend (Rust - Tauri Core):** Lấy mã số phần cứng gốc của máy tính Windows (Mainboard/CPU ID) mà không cần quyền Admin.
- **Database & API (Cloudflare Workers + KV):** Lưu trữ danh sách Key. Xử lý logic kiểm tra, khóa thiết bị và trả kết quả về cho Frontend.

## 2. Cấu trúc Dữ liệu trên Cloudflare KV

Mỗi khi bạn bán 1 Key, bạn sẽ tạo một bản ghi trên Cloudflare KV:
- **Key (Tên dữ liệu):** `LICENSE:APTIS-VIP-ABCD`
- **Value (Nội dung dữ liệu - JSON):**
  ```json
  {
    "status": "unused",         // Trạng thái ban đầu: chưa ai dùng
    "machine_id": null,         // Lúc đầu chưa gán cho máy nào
    "created_at": "2026-06-14",
    "owner_email": "khachhang@gmail.com"
  }
  ```

## 3. Luồng hoạt động chi tiết (Workflow)

### Bước 1: Đọc Mã Máy Tính (Hardware ID)
Sử dụng thư viện Rust (ví dụ crate `machine-uid`) trong `src-tauri/Cargo.toml` để đọc mã máy tính duy nhất.
- Frontend gọi hàm: `const hwid = await invoke('get_hardware_id');`
- Output ví dụ: `d82c4x9b-1234-abcd-5678-ef9012345678`

### Bước 2: Gửi Yêu Cầu Lên Server
Frontend gửi yêu cầu HTTP POST lên Cloudflare Worker của bạn:
- URL: `https://api.aptis.com/verify-license`
- Body: `{ "key": "APTIS-VIP-ABCD", "machine_id": "d82c4x9b..." }`

### Bước 3: Logic Kiểm Tra Của Server (Cloudflare Worker)
Server nhận request và kiểm tra trong KV Database:

1. **Kiểm tra Key có tồn tại không?**
   - Nếu KHÔNG -> Trả về lỗi: *"Key không hợp lệ hoặc không tồn tại."*
2. **Kiểm tra trạng thái Key:**
   - Nếu `status == "unused"` (Key mới tinh):
     - Server sẽ CẬP NHẬT lại KV: Đổi `status` thành `"active"`, gán `machine_id` bằng cái mã vừa gửi lên.
     - Trả về thành công: *"Kích hoạt thành công!"*
   - Nếu `status == "active"` (Key đã có người dùng):
     - Server đối chiếu: `machine_id` gửi lên CÓ TRÙNG với `machine_id` lưu trong database không?
     - Nếu **TRÙNG**: Trả về thành công: *"Xác thực thành công, chào mừng trở lại!"* (Dành cho trường hợp người dùng cài lại app trên cùng 1 máy tính).
     - Nếu **KHÔNG TRÙNG**: Trả về lỗi: *"Key này đã được kích hoạt trên một thiết bị khác. Vui lòng mua Key mới!"* (Khóa mõm kẻ xài lậu).

## 4. Các File Cần Chỉnh Sửa Trong Tương Lai

1. **`src-tauri/Cargo.toml`**: Cài thêm crate `machine-uid`.
2. **`src-tauri/src/main.rs`**: Viết command `get_hardware_id` bằng Rust.
3. **`src/pages/ActivationPage.tsx`**: Gọi API `fetch` thay vì chỉ check chuỗi string cứng.
4. **Project Cloudflare Worker**: Tạo một endpoint API để xử lý logic check KV.

## 5. Xử lý các trường hợp ngoại lệ
- **Người dùng đổi máy tính / Mua máy tính mới:** Họ sẽ liên hệ với bạn qua Fanpage/Email. Bạn chỉ cần vào Cloudflare KV, tìm cái Key của họ và xóa trắng (null) cái dòng `machine_id`, đổi `status` về `"unused"`. Họ nhập lại vào máy mới là xong.
