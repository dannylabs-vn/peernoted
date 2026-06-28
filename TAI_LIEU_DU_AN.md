# PeerNoted — Tài Liệu Dự Án

## Mục lục

1. Tổng quan dự án
2. Vấn đề và Giải pháp
3. Tính năng chính
4. Tech Stack
5. Kiến trúc hệ thống
6. Cơ sở dữ liệu
7. Pipeline xử lý
8. Triển khai (Deployment)
9. Bảo mật
10. Tính năng tương lai

---

## 1. Tổng quan dự án

**PeerNoted** là nền tảng quản lý tri thức cá nhân thông minh dành cho học sinh, sinh viên Việt Nam. Ứng dụng tích hợp trí tuệ nhân tạo (AI) để biến đổi tài liệu học tập khô khan thành các định dạng học hiệu quả hơn: **phao cứu cấp có cấu trúc**, **podcast học tập** với giọng đọc tự nhiên, và **gợi ý tài nguyên** học tập bổ sung.

**Triết lý**: Tận dụng AI thế hệ mới (OpenAI GPT-4o với Structured Outputs) kết hợp với hạ tầng cloud serverless giá rẻ (Supabase + Render) để mang lại trải nghiệm học tập hiện đại mà không tốn kém chi phí vận hành.

**Đối tượng**: Học sinh THPT, sinh viên đại học, người tự học (self-learner) cần ôn thi nhanh hoặc xử lý khối lượng tài liệu lớn.

---

## 2. Vấn đề và Giải pháp

### Vấn đề học sinh đang gặp

- **Tài liệu rời rạc**: PDF, Word, ảnh chụp vở ghi nằm rải rác — không có hệ thống phân loại
- **Ôn tập kém hiệu quả**: Phao cứu cấp tự làm tốn thời gian, viết tay không gọn, in ra xấu
- **Khó tận dụng thời gian rảnh**: Trên đường đi học, ăn cơm — không học được vì phải đọc
- **Tài nguyên hạn chế**: Không biết tìm video, bài viết bổ trợ ở đâu cho đúng chủ đề

### Giải pháp PeerNoted

Một pipeline AI 5 bước biến tài liệu thô thành tri thức sinh động:

```
Tài liệu → Phân loại → Phao cứu cấp → Podcast → Gợi ý tài nguyên
```

Người dùng chỉ cần kéo thả file, mọi xử lý còn lại tự động hoàn thành trong 60 giây.

---

## 3. Tính năng chính

### 3.1 Phao Cứu Cấp (Cheat Sheet Generator)

Tính năng cốt lõi của ứng dụng. Khi người dùng tải lên một hoặc nhiều tài liệu, hệ thống sẽ:

**Bước 1 — Trích xuất nội dung**: Sử dụng `pdf-parse` cho PDF, `mammoth` cho Word, đọc thuần TXT, và OpenAI Vision (GPT-4o multimodal) cho ảnh hoặc PDF dạng scan.

**Bước 2 — Phân loại tự động**: AI đọc nội dung, suy đoán môn học, chương, khối lớp, sinh tags phù hợp, rồi xếp tài liệu vào folder. Với tài liệu mới có chủ đề khác hẳn folder hiện có, hệ thống bắt buộc tạo folder mới — tránh nhồi nhét sai môn.

**Bước 3 — Sinh phao cứu cấp có cấu trúc**: GPT-4o-mini đọc toàn bộ nội dung folder (tối đa 100,000 ký tự — khoảng 100 trang), tổng hợp thành cấu trúc JSON gồm tiêu đề và các section, mỗi section chứa các "block" có kiểu:
- `formula`: Công thức Toán/Lý/Hóa, biểu diễn bằng LaTeX
- `definition`: Định nghĩa thuật ngữ
- `list`: Danh sách các điểm cần nhớ
- `example`: Ví dụ minh họa kèm lời giải
- `note`: Mẹo ghi nhớ / lưu ý quan trọng

**Bước 4 — Render với 4 template**:
1. **Học thuật Blue**: Header xanh đậm, 3 cột, phong cách cheat sheet lập trình kinh điển
2. **Card Hiện đại**: Mỗi block là một card với gradient pastel khác nhau
3. **Sổ Tay Viết Tay**: Paper texture giả vở học sinh, font handwriting, mỗi ký tự xoay nhẹ ngẫu nhiên tạo cảm giác viết tay
4. **Tối Giản**: Font Be Vietnam Pro, đen trắng, tập trung vào nội dung

**Bước 5 — Export PDF / PNG**: Sử dụng `html2canvas` chụp toàn bộ DOM, đóng gói qua `jsPDF` thành một trang PDF khổ tự co theo nội dung — như một poster có thể in ra mang vào phòng thi. Toàn bộ xử lý ở client, không tốn tài nguyên server.

**Tính năng độc đáo — Phong cách Viết Tay cá nhân**: Người dùng có thể upload một bức ảnh chữ viết tay của mình. GPT-4o Vision phân tích độ nghiêng (slant), độ dày (weight), kiểu chữ (roundness), rồi tự động chọn 1 trong 5 font Google Fonts hỗ trợ tiếng Việt (Caveat, Patrick Hand, Dancing Script, Pacifico, Be Vietnam Pro Italic) gần nhất với phong cách viết của họ. Phao sinh ra trông như chính họ vừa chép.

### 3.2 Podcast Học Tập (Podcast Producer)

Biến tài liệu thành cuộc trò chuyện hai MC sinh động.

**Bước 1 — Tóm tắt học thuật chính xác**: GPT-4o-mini đọc toàn bộ tài liệu và viết một bản tóm tắt trung thực, đầy đủ chi tiết quan trọng. Bước này quan trọng vì tránh tình trạng AI "bỏ sót" thông tin khi viết script trực tiếp — đặc biệt với môn Lịch Sử, Khoa Học cần chính xác 100%.

**Bước 2 — Viết kịch bản hội thoại**: GPT-4o-mini nhận bản tóm tắt và viết kịch bản dưới dạng JSON Schema (Structured Outputs). Hai MC tên **Minh** (nam, hỏi) và **Lan** (nữ, giải thích). Prompt được tinh chỉnh kỹ:
- Tuyệt đối không xưng "MC_A" / "MC_B" (TTS sẽ đọc thành "em xi ây")
- Phiên âm viết tắt EN tự nhiên: "GPA" → "G P A", "STEM" → "xì tem"
- Giữ nguyên cụm EN hoàn chỉnh: "Personal Statement" — TTS phát âm chuẩn
- Kịch bản có tung hứng, phản biện, ví dụ hài hước

**Bước 3 — Sinh giọng đọc bằng Microsoft Edge Neural TTS**: Sử dụng thư viện `edge-tts-universal` (open source, free, không cần API key). Hai giọng tiếng Việt chất lượng cao:
- `vi-VN-NamMinhNeural` cho MC Minh
- `vi-VN-HoaiMyNeural` cho MC Lan

Mỗi câu thoại sinh riêng một MP3 chunk, retry 3 lần exponential backoff nếu bị rate limit. Sau đó concat các chunk thành một MP3 hoàn chỉnh.

**Bước 4 — Upload Supabase Storage**: File MP3 được upload lên bucket public của Supabase Storage, trả về URL bền vững. Render free tier có ephemeral disk sẽ xóa file khi server sleep — Supabase Storage giải quyết vấn đề này.

**Bước 5 — Hiển thị Player**: Giao diện có:
- **Equalizer 7 thanh** CSS animation (không dùng canvas hay Web Audio API)
- Progress bar với seek
- **Script transcript đồng bộ** — dòng đang phát tự động highlight theo `currentTime / duration * script.length`
- Nút "Tạo lại" để regenerate khi cần

### 3.3 Gợi ý Tài Nguyên (Resource Recommender)

Sau khi đã hiểu được nội dung folder, AI gợi ý 6-8 tài nguyên học tập bổ trợ. Bao gồm video YouTube (ưu tiên Khan Academy, TED-Ed, các kênh ĐH uy tín), podcast giáo dục, bài viết/khóa học online. Cân bằng tiếng Việt + tiếng Anh. Mỗi gợi ý có sẵn URL search YouTube để click 1 phát mở ngay.

### 3.4 Authentication

- Email/password (bcrypt salt 10)
- Google OAuth (popup mode)
- JWT token 30 ngày, auto-restore session từ localStorage
- Profile có tên, email, trường đại học (dropdown sẵn các trường lớn ở Việt Nam)

---

## 4. Tech Stack

### 4.1 Frontend

| Công nghệ | Vai trò |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool, dev server với HMR |
| **Axios** | HTTP client với JWT interceptor |
| **KaTeX 0.16** | Render công thức Toán LaTeX |
| **html2canvas + jsPDF** | Export PDF/PNG client-side |
| **react-dropzone** | Drag-drop upload UI |
| **react-markdown + remark-math + rehype-katex** | Fallback render markdown phao cũ |
| **@react-oauth/google** | Google Sign-In button |
| **react-katex** | KaTeX integration |
| **Intl.Segmenter** | Tách grapheme tiếng Việt cho effect handwriting |

### 4.2 Backend

| Công nghệ | Vai trò |
|---|---|
| **Node.js 24** | Runtime |
| **Express 5** | Web framework |
| **@supabase/supabase-js** | Postgres + Storage client |
| **openai (Node SDK)** | OpenAI API với Structured Outputs |
| **edge-tts-universal** | Microsoft Edge Neural TTS |
| **multer** | File upload middleware |
| **pdf-parse** | PDF text extraction |
| **mammoth** | DOCX text extraction |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT signing/verifying |
| **google-auth-library** | Verify Google OAuth ID token |
| **cors** | Cross-origin requests |
| **dotenv** | Env variables |

### 4.3 AI

| Service | Model | Mục đích |
|---|---|---|
| OpenAI | `gpt-4o-mini` | Classify text, generate cheat sheet, podcast script, recommendations |
| OpenAI | `gpt-4o` | Vision: classify ảnh, phân tích chữ viết tay |
| Microsoft Edge TTS | `vi-VN-NamMinhNeural`, `vi-VN-HoaiMyNeural` | Sinh giọng đọc podcast |

**Đặc biệt — OpenAI Structured Outputs**: Đây là tính năng mới của OpenAI cho phép ép model trả về JSON tuân thủ JSON Schema chính xác 100%. PeerNoted dùng technique này cho tất cả output cấu trúc (cheat sheet, podcast script, recommendations, handwriting analysis, classification) — không cần regex parse, không cần retry, không bao giờ vỡ format.

### 4.4 Infrastructure

| Service | Vai trò |
|---|---|
| **Supabase Cloud** | Postgres DB + Storage bucket + (optional) Auth |
| **Render** | Static Site (frontend) + Web Service (backend) |
| **GitHub Actions** | CI/CD: auto-deploy + cron wakebot |
| **Google Cloud Console** | OAuth 2.0 Client ID |

---

## 5. Kiến trúc hệ thống

### 5.1 Sơ đồ tổng quan

```
                    ┌─────────────────────┐
                    │      Người dùng     │
                    │  (Browser/Desktop)  │
                    └──────────┬──────────┘
                               │
                               │ HTTPS
                               ▼
              ┌────────────────────────────────┐
              │   Frontend (Render Static Site)│
              │   React 19 + Vite              │
              │   peernoted-1.onrender.com     │
              └──────────┬─────────────────────┘
                         │
                         │ REST API (axios + JWT)
                         ▼
              ┌────────────────────────────────┐
              │   Backend (Render Web Service) │
              │   Node + Express               │
              │   peernoted.onrender.com       │
              └─────┬──────────┬──────────┬────┘
                    │          │          │
       ┌────────────┘          │          └─────────────┐
       ▼                       ▼                         ▼
┌──────────────┐    ┌────────────────────┐    ┌──────────────────┐
│   OpenAI     │    │  Supabase Cloud    │    │  Microsoft Edge  │
│  GPT-4o-mini │    │ Postgres+Storage   │    │   Neural TTS     │
│   GPT-4o     │    │ (folders/files/    │    │ (vi-VN voices)   │
│              │    │  users + audio/)   │    │                  │
└──────────────┘    └────────────────────┘    └──────────────────┘
```

### 5.2 Tách biệt trách nhiệm

**Frontend** xử lý:
- UI/UX, render template
- Export PDF/PNG (client-side, không tốn server)
- Auth state, JWT token storage
- Optimistic UI updates

**Backend** xử lý:
- Logic AI (gọi OpenAI, prompt engineering)
- TTS (gọi Edge-TTS, concat MP3)
- CRUD database
- Auth (bcrypt, JWT sign/verify, Google OAuth verify)
- Upload file storage

**Database (Supabase)** lưu trữ:
- Users (auth)
- Folders với cached AI output (cheat_sheet_json, podcast_script)
- Files với extracted_text + AI metadata
- Storage bucket cho file gốc + audio MP3

### 5.3 Cấu trúc thư mục

```
peernoted/
├── client/                         (React frontend)
│   ├── src/
│   │   ├── App.jsx                 (Main app + routing state)
│   │   ├── main.jsx                (GoogleOAuthProvider wrap)
│   │   ├── components/
│   │   │   ├── Login.jsx           (Register/Login/Google)
│   │   │   ├── Dropzone.jsx        (Upload UI)
│   │   │   ├── FileList.jsx        (Danh sách file + Podcast button)
│   │   │   ├── CheatSheet.jsx      (Container cho cheat sheet)
│   │   │   ├── AudioPlayer.jsx     (Equalizer + player + script)
│   │   │   └── cheatsheet/
│   │   │       ├── CheatSheetRenderer.jsx  (NFC normalize)
│   │   │       ├── TemplatePicker.jsx
│   │   │       ├── HandwritingUploadModal.jsx
│   │   │       ├── ExportButtons.jsx       (PDF + PNG)
│   │   │       ├── latex.js                (KaTeX wrapper)
│   │   │       └── templates/
│   │   │           ├── AcademicBlue.jsx
│   │   │           ├── ModernCard.jsx
│   │   │           ├── SketchNotebook.jsx  (Handwriting effect)
│   │   │           └── Minimalist.jsx
│   │   └── utils/
│   │       └── api.js              (Axios + JWT interceptor)
│   ├── public/
│   │   └── _redirects              (SPA routing on Render)
│   └── vite.config.js
│
├── server/                         (Node backend)
│   ├── index.js                    (Express entry + CORS)
│   ├── config/
│   │   ├── supabase.js             (Client init + toApi helper)
│   │   └── supabase-schema.sql     (DB schema)
│   ├── middleware/
│   │   └── auth.js                 (JWT verify + protect)
│   ├── routes/
│   │   ├── auth.js                 (Register, Login, Google, Me)
│   │   ├── folders.js              (CRUD folders)
│   │   ├── files.js                (Upload, delete)
│   │   └── ai.js                   (Classify, cheatsheet, podcast, recommend, handwriting)
│   ├── services/
│   │   ├── aiService.js            (OpenAI Structured Outputs)
│   │   ├── ttsService.js           (Edge-TTS + Supabase upload)
│   │   ├── extractorService.js     (PDF/DOCX/TXT)
│   │   └── storageService.js       (Supabase Storage)
│   └── utils/
│       ├── prompts.js              (Prompt engineering)
│       ├── schemas.js              (JSON Schemas cho Structured Outputs)
│       └── encoding.js             (UTF-8 fix cho multer)
│
├── .github/
│   └── workflows/
│       ├── deploy.yml              (Trigger Render deploy hooks)
│       └── wakebot.yml             (Cron 10p ping /api/health)
│
└── .env                            (Secrets, không commit)
```

---

## 6. Cơ sở dữ liệu (Supabase Postgres)

### Bảng `users`
| Cột | Kiểu | Mô tả |
|---|---|---|
| id | uuid PK | Default gen_random_uuid() |
| name | text | Tên hiển thị |
| email | text UNIQUE | Email đăng nhập |
| password_hash | text | bcrypt hash, null nếu chỉ login Google |
| school | text | Trường ĐH (optional) |
| cohort | text | Niên khóa |
| avatar_url | text | URL ảnh đại diện |
| created_at, updated_at | timestamptz | Auto trigger |

### Bảng `folders`
| Cột | Kiểu | Mô tả |
|---|---|---|
| id | uuid PK | |
| name | text | Tên folder (vd "Toán học/Hàm số bậc 2") |
| subject, chapter, grade | text | Metadata phân loại |
| cheat_sheet_json | jsonb | Cấu trúc phao cứu cấp |
| cheat_sheet_markdown | text | Legacy markdown format |
| selected_template | text | academic-blue / modern-card / sketch-notebook / minimalist |
| handwriting_font | text | Font handwriting đã chọn |
| handwriting_sample_url | text | URL ảnh mẫu chữ viết tay |
| podcast_script | jsonb | Mảng lines [{speaker, text}] |
| podcast_audio_url | text | URL MP3 (Supabase Storage) |
| created_at, updated_at | timestamptz | Auto trigger |

### Bảng `files`
| Cột | Kiểu | Mô tả |
|---|---|---|
| id | uuid PK | |
| folder_id | uuid FK → folders(id) ON DELETE CASCADE | |
| original_name | text | Tên file gốc (UTF-8) |
| storage_url | text | URL trên Supabase Storage |
| file_type | text | pdf, docx, jpg, png... |
| file_size | bigint | Bytes |
| extracted_text | text | Text trích xuất sẵn cho AI |
| ai_summary | text | Tóm tắt 2 câu |
| ai_tags | text[] | Tags tự động |

### Storage Bucket: `peernoted-files` (Public)
- `audio/podcast_{uuid}.mp3` — File MP3 podcast
- `{uuid}.{ext}` — File user upload (PDF, DOCX, ảnh)

---

## 7. Pipeline xử lý chi tiết

### 7.1 Upload + Phân loại

```
User kéo thả file
   ↓
client/src/components/Dropzone.jsx
   ↓
POST /api/ai/classify (multipart)
   ↓
server/routes/ai.js:
   - multer parse file
   - extractorService.extractText(buffer, ext)
   - isMeaningfulText() check — nếu PDF scan không có text → fallback
   - classifyFromText(text, existingFolders, filename) hoặc classifyFromImage()
   ↓
OpenAI GPT-4o-mini + CLASSIFY_SCHEMA → {subject, chapter, grade, folder_name, summary, tags}
   ↓
Safety check: subject AI trả có khớp subject folder cũ không?
   - Có → merge vào folder cũ
   - Không → tạo folder mới với tên sạch {subject}/{chapter}
   ↓
storageService.uploadToStorage(file) → URL Supabase Storage
   ↓
INSERT folders + files vào Postgres
   ↓
Trả về {results: [{file, folder, classification}]}
```

### 7.2 Sinh Phao Cứu Cấp

```
User vào tab Phao Cứu Cấp của folder
   ↓
GET /api/ai/cheatsheet/:folderId
   ↓
Server check cached cheat_sheet_json
   - Có → trả ngay (cached)
   - Không → tiếp tục
   ↓
Gom extracted_text của tất cả files trong folder (cách nhau ---)
   ↓
generateCheatSheet(allTexts, folderName)
   ↓
OpenAI GPT-4o-mini + CHEAT_SHEET_SCHEMA (strict mode, max_tokens=16000)
Prompt yêu cầu:
   - Tối thiểu 6 sections, 30+ blocks
   - 5 type blocks: formula/definition/list/example/note
   - Fallback dùng kiến thức AI nếu text rỗng
   ↓
JSON {title, sections: [{heading, blocks: [...]}]}
   ↓
UPDATE folders.cheat_sheet_json = json
   ↓
Trả về client
   ↓
CheatSheetRenderer.jsx:
   - NFC normalize tất cả text fields (fix Vietnamese diacritics)
   - Pick template component theo selected_template
   ↓
Template render:
   - KaTeX render block.content cho type=formula
   - SketchNotebook: Intl.Segmenter('vi', 'grapheme') split + seeded rotation per char
   ↓
User có thể:
   - Đổi template (POST /api/ai/cheatsheet/:id/template)
   - Upload chữ viết tay (POST .../handwriting) → GPT-4o Vision phân tích → chọn font
   - Export PDF/PNG (html2canvas → jsPDF, client-side, 1 trang khổ tự co)
   - Tạo lại (DELETE → regenerate)
```

### 7.3 Sinh Podcast

```
User vào tab Podcast của folder
   ↓
POST /api/ai/podcast/:folderId
   ↓
Server check cached podcast_audio_url + podcast_script
   - Có cả 2 → trả ngay
   - Không → tiếp tục
   ↓
Gom extracted_text như trên
   ↓
Step 1: summarizeForPodcast(allTexts)
   → GPT-4o-mini tóm tắt học thuật chính xác
   ↓
Step 2: generatePodcastScript(summary, folderName) + PODCAST_SCRIPT_SCHEMA
   → {lines: [{speaker: 'MC_A'|'MC_B', text}, ...]}
   ↓
ttsService.generatePodcastAudio(script):
   - For each line:
     - Pick voice (NamMinh / HoaiMy)
     - EdgeTTS(text, voice).synthesize() → Buffer MP3
     - Retry 3x exponential backoff
   - Buffer.concat all chunks → single MP3
   ↓
uploadAudioBuffer(finalBuffer, filename):
   - Production: upload Supabase Storage → URL public
   - Dev fallback: ghi /uploads/audio/ local
   ↓
UPDATE folders.podcast_script + podcast_audio_url
   ↓
AudioPlayer.jsx:
   - <audio src={audioUrl}> + custom UI
   - Equalizer 7 bars CSS animation
   - Custom progress bar + seek
   - Script transcript với highlight line đang đọc
   - onError → clear URL + báo user "Tạo lại"
```

---

## 8. Triển khai (Deployment)

### 8.1 Stack hosting

- **Frontend**: Render Static Site `peernoted-1.onrender.com`
  - Build: `npm install && npm run build`
  - Publish: `dist/`
  - SPA rewrite via `client/public/_redirects`
- **Backend**: Render Web Service `peernoted.onrender.com`
  - Build: `npm install`
  - Start: `node index.js`
  - Free tier sleep sau 15 phút idle
- **Database + Storage**: Supabase Cloud free tier
- **DNS + SSL**: Tự động từ Render

### 8.2 CI/CD (GitHub Actions)

**`.github/workflows/deploy.yml`** — chạy mỗi push lên `master`:
- Trigger Render Deploy Hook cho cả 2 services
- Concurrency control để tránh deploy chồng chéo

**`.github/workflows/wakebot.yml`** — cron mỗi 10 phút:
- Ping `BACKEND_URL/api/health`
- Giữ Render free tier không sleep
- Retry 3 lần nếu fail

### 8.3 Environment Variables

| Biến | Trong dev | Trong Render |
|---|---|---|
| `OPENAI_API_KEY` | `.env` | Backend env |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_BUCKET` | `.env` | Backend env |
| `JWT_SECRET` | `.env` | Backend env (chuỗi random 32+ ký tự) |
| `GOOGLE_CLIENT_ID` | `.env` | Backend env |
| `VITE_GOOGLE_CLIENT_ID` | `.env` | Frontend Static Site env |
| `VITE_API_URL` | (mặc định '/api') | Frontend env = backend URL + /api |
| `FRONTEND_URL` | (mặc định allow all) | Backend env = frontend URL (cho CORS) |
| `PORT` | 5000 | 10000 (Render bắt buộc) |

### 8.4 GitHub Actions Secrets

| Tên | Giá trị |
|---|---|
| `RENDER_SERVER_HOOK` | Deploy Hook URL của backend |
| `RENDER_CLIENT_HOOK` | Deploy Hook URL của frontend |
| `BACKEND_URL` | `https://peernoted.onrender.com` |

---

## 9. Bảo mật

### 9.1 Authentication

- **Password**: bcrypt salt rounds 10, không bao giờ lưu plaintext
- **JWT**: HS256 signed, expires 30 ngày, payload chỉ chứa user id
- **Google OAuth**: ID token được verify chính chủ qua `google-auth-library`, fallback decode-only dev mode

### 9.2 Database

- **Row Level Security (RLS)**: Hiện disable cho dev/MVP, sẽ enable + policy keyed off auth.uid() khi multi-tenant
- **Connection**: Anon key dùng từ server (single-user mode an toàn vì server kiểm soát truy cập qua JWT middleware)

### 9.3 Storage

- Bucket `peernoted-files` public read (cần thiết cho audio + file user)
- Policy chỉ cho insert/update của anon role (sẽ scope theo user_id khi multi-tenant)

### 9.4 Best practices

- `.env` không bao giờ commit (đã có `.gitignore`)
- `node_modules` không commit
- CORS whitelist domain frontend production
- Multer giới hạn 50MB upload, 5MB cho ảnh chữ viết tay
- Input validation ở route layer

---

## 10. Tính năng tương lai

### Phase 2 — Multi-user
- Bật RLS với policy keyed off `auth.uid()`
- Mỗi user chỉ thấy folders/files của mình
- Sharing folder qua link

### Phase 3 — Mobile app
- React Native với Expo
- Camera scan trực tiếp tài liệu trên di động
- Offline cache cheat sheet
- Background audio podcast

### Phase 4 — Collaborative learning
- Group folder share giữa nhóm bạn cùng học
- Comment trên cheat sheet
- Quiz tự sinh từ phao cứu cấp
- Leaderboard điểm thi thử

### Phase 5 — Advanced AI
- OCR offline với Tesseract cho PDF scan
- Speech-to-text: nói câu hỏi, AI trả lời dạng audio
- Personalized learning path từ lịch sử upload
- AI mentor 1-1 (chat) hiểu toàn bộ tài liệu của user

---

## Phụ lục — Thông số kỹ thuật

### Hiệu năng

- **Phân loại 1 file PDF 10MB**: ~3-8 giây (extract + AI)
- **Sinh phao cứu cấp folder 5 files**: ~10-20 giây (1 OpenAI call)
- **Sinh podcast folder 5 files**: ~30-90 giây (2 OpenAI calls + TTS 15-25 chunks)
- **Export PDF**: ~2-3 giây (client-side)

### Chi phí AI (ước tính / 100 user / tháng)

- OpenAI GPT-4o-mini: $0.15/1M input + $0.6/1M output tokens
- Trung bình mỗi user: 5 phân loại + 3 cheat sheet + 2 podcast + 1 recommend / tháng
- → ~$2-5/tháng cho 100 users active
- Microsoft Edge TTS: **Free**
- Supabase: Free tier đủ cho 100-500 users
- Render: Free tier đủ cho MVP

### Hỗ trợ ngôn ngữ

- **Tiếng Việt** (chính): UI, AI prompt, TTS voices
- **Tiếng Anh** (phụ): Recommendation song ngữ, TTS giọng en-US dự phòng

---

*Tài liệu này được tạo cho dự án PeerNoted — Hệ thống quản lý tri thức cá nhân thông minh dành cho học sinh, sinh viên Việt Nam.*
