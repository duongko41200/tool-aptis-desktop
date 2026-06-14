# Kế hoạch xây dựng Telegram Bot Nhắc nhở (Cron) Miễn phí cho nhiều người

Kế hoạch này phác thảo các bước chi tiết để xây dựng và triển khai một bot Telegram nhắc nhở dùng Node.js, lưu trữ dữ liệu trên MongoDB Atlas và chạy miễn phí trên Render.com kết hợp với cron-job.org.

## Tổng quan Kiến trúc
- **Ngôn ngữ:** Node.js (JavaScript/TypeScript)
- **Framework Bot:** `telegraf`
- **Database:** MongoDB Atlas (Lưu trữ lịch nhắc nhở của nhiều người dùng)
- **Lập lịch (Cron):** `node-cron`
- **Web Server (giữ kết nối):** `express`
- **Hosting:** Render.com (Web Service miễn phí)
- **Duy trì hoạt động:** cron-job.org (Ping mỗi 14 phút để tránh Render bị ngủ)

## 1. Chuẩn bị (Prerequisites)

- [ ] Tạo bot trên Telegram qua `@BotFather` và lưu lại **BOT_TOKEN**.
- [ ] Tạo tài khoản **MongoDB Atlas** (gói M0 Free), tạo Database và lấy chuỗi kết nối **MONGODB_URI**.
- [ ] Tạo tài khoản **Render.com** (kết nối với GitHub).
- [ ] Tạo tài khoản **cron-job.org**.

## 2. Thiết lập Dự án & Code

- [ ] Khởi tạo dự án Node.js: `npm init -y`
- [ ] Cài đặt thư viện: `npm install telegraf node-cron mongoose express dotenv`
- [ ] Cài đặt thư viện dev (nếu dùng TypeScript): `npm install -D typescript @types/node ts-node`
- [ ] Tạo cấu trúc thư mục cơ bản:
  - `.env` (Lưu biến môi trường)
  - `src/index.js` (hoặc `.ts` - File chạy chính)
  - `src/database.js` (Kết nối MongoDB và định nghĩa Schema)
  - `src/bot.js` (Xử lý logic lệnh của Bot)
- [ ] Xây dựng luồng Logic:
  - Khởi tạo Express server với endpoint `/ping` trả về status 200.
  - Kết nối MongoDB. Khi khởi động server, đọc toàn bộ lịch nhắc nhở trong DB và chạy lại các `cron.schedule`.
  - Thiết lập Telegraf bot với lệnh `/remind [phút] [nội dung]`.
  - Xử lý lưu thông tin `chatId`, `cronTime`, `message` vào MongoDB khi người dùng đặt lệnh.
  - Xử lý hàm gửi tin nhắn khi đến giờ cron kích hoạt.

## 3. Triển khai (Deployment)

- [ ] Tạo repository trên GitHub và đẩy code lên (Nhớ bỏ file `.env` vào `.gitignore`).
- [ ] Vào Render.com, tạo một **Web Service** mới, liên kết với repo GitHub vừa tạo.
- [ ] Đặt các **Environment Variables** trên Render:
  - `BOT_TOKEN`: Token của bot Telegram.
  - `MONGODB_URI`: Chuỗi kết nối MongoDB.
- [ ] Chờ Render build và lấy đường link ứng dụng (VD: `https://my-bot.onrender.com`).

## 4. Thiết lập chống "ngủ" (Keep-alive)

- [ ] Đăng nhập vào cron-job.org.
- [ ] Tạo một cronjob mới.
- [ ] Nhập URL là link Render của bạn kèm endpoint `/ping` (VD: `https://my-bot.onrender.com/ping`).
- [ ] Thiết lập chạy lặp lại mỗi **14 phút**.

## Open Questions

> [!IMPORTANT]
> 1. Bạn muốn tạo dự án này trong một **thư mục hoàn toàn mới** riêng biệt trên máy, hay tạo như một thư mục con bên trong dự án `CODE-APTIS` hiện tại của bạn?
> 2. Bạn có muốn dùng **TypeScript** không (giống với dự án bạn đang làm), hay chỉ cần dùng **JavaScript** cho đơn giản?
> 3. Bạn đã có sẵn `BOT_TOKEN` (từ @BotFather) và `MONGODB_URI` (từ MongoDB Atlas) chưa? Nếu chưa, mình có thể hướng dẫn bạn cách lấy từng bước trước khi bắt đầu code.

## User Review Required
Vui lòng xem lại kế hoạch ở trên. Khi bạn sẵn sàng, hãy trả lời các câu hỏi mở (Open Questions) để mình biết hướng tạo cấu trúc thư mục và viết code cho bạn nhé!
