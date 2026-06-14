# Hướng dẫn Phát hành Bản cập nhật (Release Workflow)

Tài liệu này là "sách trắng" (Sổ tay) ghi lại toàn bộ các bước thủ công bạn cần làm mỗi khi code xong tính năng mới và muốn gửi bản cập nhật đến tất cả người dùng ứng dụng Aptis.

Bạn hãy mở file này ra xem mỗi khi cần phát hành bản update nhé!

---

## Bước 1: Nâng cấp Phiên bản (Bump Version)

Mở 2 file sau trong Visual Studio Code và thay đổi số phiên bản (Ví dụ từ `0.1.0` lên `0.1.1`):

1. File **`package.json`**:
   ```json
   "version": "0.1.1",
   ```
2. File **`src-tauri/tauri.conf.json`**:
   ```json
   "version": "0.1.1",
   ```

> [!WARNING]
> Lưu ý: Hai file này bắt buộc phải có số phiên bản (Version) giống hệt nhau.

---

## Bước 2: Xuất file cài đặt (Build App)

Mở Terminal (PowerShell) ngay trong VS Code, dán nguyên cụm lệnh dưới đây vào và nhấn Enter. 
*(Lệnh này giúp nạp chìa khóa bảo mật và tự động đóng gói ứng dụng)*:

```powershell
npm run build:release
```

Hãy đi pha một cốc cafe và đợi từ 5-10 phút để máy tính nén và biên dịch mã nguồn.

---

## Bước 3: Lấy file nén và Chữ ký bảo mật

Sau khi Terminal báo thành công (chữ màu xanh `Done`), bạn hãy mở thư mục sau trên máy tính:
`d:\CODE-APTIS\desktop-app-tool\tool-aptis-desktop\src-tauri\target\release\bundle\`

Trong đó, bạn chỉ cần quan tâm đến 2 file quan trọng nhất nằm trong thư mục `nsis`:
1. File **`.exe`** (Ví dụ: `Aptis English Learning_0.1.x_x64-setup.exe`) -> Đây chính là file để người dùng cài đặt và cũng là file để app tự động tải về cập nhật.
2. File **`.sig`** (Ví dụ: `Aptis English Learning_0.1.x_x64-setup.exe.sig`) -> Chữ ký bảo mật. Mở file này bằng Notepad, bạn sẽ thấy một đoạn mã loằng ngoằng. Hãy để đó xíu dùng.

---

## Bước 4: Tải file lên GitHub Releases

1. Truy cập vào kho lưu trữ GitHub mới của bạn: `https://github.com/duongMyColor/app-ATP-Releases`
2. Bấm vào mục **Releases** ở thanh Menu bên phải màn hình.
3. Bấm **Draft a new release**.
4. Ở ô **Choose a tag**, gõ tên phiên bản mới (Ví dụ: `v0.1.1`) và bấm *Create new tag*.
5. Kéo xuống dưới cùng màn hình sẽ thấy một cái hộp ghi là **"Attach binaries by dropping them here or selecting them"** *(Lưu ý: Tuyệt đối không kéo file vào cái ô gõ chữ mô tả ở bên trên, nó sẽ báo lỗi)*.
6. **Kéo thả file `.exe`** (ở Bước 3) vào cái hộp dưới cùng đó để tải lên mạng.
7. Bấm nút xanh **Publish release**.
8. Sau khi Publish, bạn sẽ thấy file `.exe` hiện ra dưới dạng link tải. **Chuột phải vào chữ `.exe` đó -> Chọn "Copy link address" (Sao chép địa chỉ liên kết)**.

---

## Bước 5: Cập nhật `updater.json` (Kích hoạt Update)

> [!IMPORTANT]
> Đây là bước cuối cùng và quan trọng nhất. Ngay sau khi bạn làm xong bước này, tất cả người dùng đang mở App sẽ lập tức nhận được thông báo bắt buộc cập nhật.

1. Quay lại trang chủ của kho GitHub `app-ATP-Releases`, bấm vào file `updater.json`.
2. Bấm vào biểu tượng hình Cây bút ✏️ để chỉnh sửa.
3. Thay đổi 3 chỗ quan trọng sau:
   - Sửa `"version": "0.1.1"` (Hoặc phiên bản tương ứng)
   - Dán cái đoạn mã loằng ngoằng trong file **`.sig`** (lấy ở Bước 3 bằng Notepad) vào ô `"signature": "..."`.
   - Dán đường **Link tải file .exe** (vừa copy ở Bước 4) vào ô `"url": "..."`.
4. Bấm **Commit changes...** (Lưu lại).

🎉 **HOÀN THÀNH!** Quy trình kết thúc. Chúc mừng bạn đã phát hành thành công một phiên bản mới của ứng dụng!
