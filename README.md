# PeerNoted — Hệ thống quản lý tài liệu tri thức bằng trí tuệ nhân tạo (AI-Driven Knowledge Management)

PeerNoted là nền tảng quản lý tri thức cá nhân thông minh dành cho giới học thuật Việt Nam. Hệ thống tự động trích xuất nội dung, phân loại tài liệu bằng AI, tạo Cheat Sheets học tập nhanh và chuyển đổi ghi chú thành Podcast âm thanh sống động.

---

## 🚀 Ngăn xếp Công nghệ (Tech Stacks)

Hệ thống được thiết kế theo mô hình **Client-Server** hiện đại với cấu trúc tách biệt giữa giao diện người dùng và máy chủ dịch vụ:

### 1. Phía Giao diện Người dùng (Frontend - Client)
Nằm tại thư mục `/client`, được xây dựng với các công nghệ hàng đầu:
* **Core Framework**: **React 19** chạy trên công cụ biên dịch siêu tốc **Vite**.
* **Định dạng Styles**: **Vanilla CSS** sử dụng hệ thống biến màu HSL linh hoạt. Thiết kế theo ngôn ngữ **Modern Business & Premium Dark Glassmorphism** (hiệu ứng kính cường lực, viền phát sáng bento grid mờ ảo, mô phỏng cửa sổ làm việc macOS).
* **Thư viện nổi bật**:
  * `axios`: Kết nối API bất đồng bộ ổn định.
  * `react-dropzone`: Hỗ trợ kéo thả nhiều tài liệu học tập cùng một lúc cực kỳ mượt mà.
  * `react-markdown`: Kết xuất văn bản Markdown do AI tạo ra một cách sắc nét.
  * `katex` & `remark-math` & `rehype-katex`: Hỗ trợ đầy đủ việc hiển thị công thức Toán học/Vật lý phức tạp trong các bản Cheat Sheets của sinh viên.

---

### 2. Phía Máy chủ Dịch vụ (Backend - Server)
Nằm tại thư mục `/server`, xử lý logic cốt lõi và các tác vụ tính toán AI:
* **Môi trường & Web Framework**: **Node.js** kết hợp **Express 5.x** (phiên bản mới nhất).
* **Cơ sở dữ liệu**: **MongoDB Atlas** đám mây sử dụng thư viện **Mongoose ODM** để quản lý dữ liệu chặt chẽ qua các schemas (`Folder`, `File`).
* **Trí tuệ nhân tạo (AI/LLM Core)**:
  * **SDK**: Sử dụng bộ công cụ chính thức `@google/generative-ai`.
  * **Lớp mô hình đa nhiệm (Multi-model Fallback)**: Tích hợp cơ chế tự động chuyển đổi thông minh giữa các mô hình Gemini (`gemini-flash-latest`, `gemini-2.5-flash-lite`, `gemini-flash-lite-latest`, `gemini-3.5-flash`) giúp giải quyết triệt để lỗi giới hạn tài nguyên quota (429 Rate Limit), đảm bảo tính khả dụng liên tục của hệ thống.
* **Xử lý trích xuất văn bản (Text Extraction)**:
  * `pdf-parse` (class wrapper): Trích xuất nội dung số hóa từ tài liệu PDF học thuật.
  * `mammoth`: Đọc cấu trúc và trích xuất chữ từ định dạng Word `.docx` và `.doc`.
  * Hỗ trợ trích xuất `.txt` thuần.
  * **Gemini Vision**: Đọc hiểu và phân tích nội dung trực tiếp từ các file hình ảnh `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` mà không cần OCR trung gian.
* **Tổng hợp âm thanh (TTS Service)**: Chuyển đổi kịch bản hội thoại học tập do AI biên soạn thành file âm thanh Podcast tương tác trực quan (giọng đọc MC Nam/Bắc tự nhiên).
* **Quản lý Upload**: Sử dụng `multer` cấu hình lưu trữ bộ nhớ đệm (Memory Storage) giúp tối ưu hóa luồng tải file và tăng tốc độ xử lý của AI.

---

## 🛠️ Các Tính năng Nổi bật Hiện có

1. **Trang chủ Modern Business**: Giao diện giới thiệu bóng bẩy, đi kèm khung mô phỏng macOS thực tế, cho phép nhấp chuột để mở ngay khu vực làm việc (Workspace) thực tế.
2. **Hệ thống Phân loại Thông minh (Smart AI Classification)**:
   * Người dùng kéo thả tài liệu học tập vào Dropzone.
   * AI tự động đọc hiểu ngữ nghĩa của tài liệu, phân tích các tag liên quan.
   * **So khớp thư mục thông minh**: Tự động so sánh với các thư mục và thẻ (tags) hiện có để gom nhóm tài liệu khoa học, tránh tạo thư mục trùng lặp (hỗ trợ so khớp Regex không phân biệt chữ hoa/thường).
3. **Quản lý Thư mục Tiện lợi (Folder Renaming)**:
   * Cho phép chỉnh sửa tên thư mục dễ nhớ chỉ với một cú nhấp vào icon Bút chì tại danh sách Thư viện hoặc ở góc tiêu đề chi tiết.
   * Hộp thoại đổi tên mờ kính cường lực (Glassmorphism Modal) hỗ trợ gõ tiếng Việt mượt mà.
4. **Bộ lọc & Nhãn Loại tệp (Visual Badge & Filters)**:
   * Hiển thị số lượng tệp tin chi tiết theo từng biểu tượng màu ngay trên bảng Thư viện: PDF (📕 Đỏ), Văn bản (📘 Xanh dương), Hình ảnh (🖼️ Lục) thay vì con số thô.
   * Kích hoạt bộ lọc danh mục giúp người dùng lọc nhanh các thư mục chứa loại tệp tương ứng.
5. **Auto Cheat Sheets**: Tóm tắt toàn bộ tài liệu trong thư mục môn học thành các công thức, thuật ngữ và sơ đồ tư duy Markdown.
6. **Study Podcast**: Chuyển tài liệu học tập thành một chương trình Radio đàm thoại thú vị, nghe học tập rảnh tay mọi lúc mọi nơi.

---

## 📦 Cài đặt và Chạy Thử nghiệm

### Bước 1: Thiết lập Biến môi trường (`.env`)
Tạo file `.env` tại thư mục gốc của dự án với các thông tin sau:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/peernoted
GEMINI_API_KEY=AIzaSy...your_gemini_api_key
```

### Bước 2: Khởi chạy Máy chủ Backend
```bash
cd server
npm install
npm run dev
```

### Bước 3: Khởi chạy Giao diện Frontend
```bash
cd client
npm install
npm run dev
```
👉 Truy cập ứng dụng tại đường dẫn mặc định: **`http://localhost:5174/`**
