# PeerNoted

PeerNoted là một nền tảng quản lý tri thức cá nhân hướng tới sinh viên Việt Nam: người dùng kéo–thả tài liệu học tập (PDF / DOCX / hình ảnh), AI tự động phân loại vào thư mục theo môn–chương–lớp, rồi từ nội dung đó sinh ra **cheat sheet (phao cứu cấp)**, **podcast hội thoại 2 MC** và **gợi ý tài nguyên học tập** trên YouTube.

---

## 1. Kiến trúc tổng thể

Hệ thống gồm 3 lớp tách biệt rõ ràng — `client/`, `server/` và `uploads/` — chạy độc lập trên 2 cổng và giao tiếp với Supabase (Postgres) cùng các nhà cung cấp AI / TTS bên ngoài.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  client/  (React 19 + Vite 8)                                      │  │
│  │  ─ App.jsx (landing + dashboard SPA, 5 tabs)                       │  │
│  │  ─ components/   Dropzone · FileList · CheatSheet · AudioPlayer    │  │
│  │  ─ components/cheatsheet/  4 templates + PDF/PNG export            │  │
│  │  ─ utils/api.js  (axios + JWT interceptor)                         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │  /api/* (proxy Vite :5173 → :5000)
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  server/  (Node.js + Express 5, CommonJS)                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  index.js — bootstrap, CORS, JSON 50 MB, healthcheck Supabase       │ │
│  │                                                                    │  │
│  │  routes/                middleware/         services/              │  │
│  │   auth.js (JWT/Google)   auth.js (protect)   aiService.js (OpenAI) │  │
│  │   folders.js             config/             extractorService.js   │  │
│  │   files.js (multer)       supabase.js         (pdf-parse/mammoth)  │  │
│  │   ai.js (classify/        supabase-schema    storageService.js     │  │
│  │      cheatsheet/podcast/  .sql                (local + Supabase)   │  │
│  │      handwriting/recommend)                  ttsService.js         │  │
│  │                          utils/                (Edge TTS Neural)   │  │
│  │                           prompts.js                               │  │
│  │                           schemas.js (JSON Schema strict mode)     │  │
│  │                           encoding.js (Latin-1 → UTF-8 fix)        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└─────┬──────────────────┬──────────────────┬──────────────────────────────┘
      │                  │                  │
      ▼                  ▼                  ▼
┌─────────────┐  ┌────────────────┐  ┌────────────────────────────────┐
│  Supabase    │ │  OpenAI API    │ │  Microsoft Edge TTS            │
│  Postgres    │ │  gpt-4o-mini   │ │  vi-VN-NamMinhNeural           │
│  + Storage   │ │  gpt-4o (vision)│ │  vi-VN-HoaiMyNeural            │
│  (3 bảng)    │ │  JSON Schema    │ │  edge-tts-universal (free)     │
└─────────────┘  └────────────────┘  └────────────────────────────────┘
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │  uploads/        │
                                     │  ├─ *.pdf,*.jpg  │
                                     │  └─ audio/*.mp3  │
                                     │  (fallback nếu   │
                                     │  Supabase Storage│
                                     │  chưa cấu hình)  │
                                     └──────────────────┘
```

### Luồng dữ liệu chính

**(A) Upload + AI phân loại** — `POST /api/ai/classify`
1. `multer` nhận file (≤ 50 MB) vào memory buffer.
2. `extractorService` rút text: `pdf-parse` cho PDF, `mammoth` cho DOCX, đọc trực tiếp cho TXT; ảnh đi đường vision.
3. Kiểm tra `isMeaningfulText()` — nếu PDF chỉ chứa marker `-- N of M --` (PDF scan) thì coi như "cần OCR" và đẩy vào folder *Chưa phân loại* thay vì để LLM hallucinate.
4. `aiService.classifyFromText` / `classifyFromImage` gọi OpenAI với `response_format: json_schema` (strict) → trả `{subject, chapter, grade, folder_name, summary, tags}`.
5. So khớp `folder_name` (case-insensitive) với folders đã có — nếu trùng tên nhưng khác `subject` thì *từ chối merge* và tạo folder mới (tránh ghép nhầm chéo môn).
6. Upload file → Supabase Storage hoặc `uploads/` (fallback), lưu metadata + `extracted_text` vào bảng `files`.

**(B) Cheat sheet** — `GET /api/ai/cheatsheet/:folderId`
- Gộp `extracted_text` của mọi file trong folder → gửi vào `generateCheatSheet` với schema JSON gồm `sections[].blocks[]` (5 loại: `formula | definition | list | example | note`).
- Kết quả cache vào cột `folders.cheat_sheet_json` (JSONB). Có fallback markdown legacy + endpoint `migrate` để chuyển markdown cũ sang JSON.
- 4 template render ở client: `academic-blue`, `modern-card`, `sketch-notebook`, `minimalist`. Sketch hỗ trợ phân tích chữ viết tay (`gpt-4o` vision) → chọn 1 trong 5 Google Font handwriting Việt.
- Export PDF *1 trang duy nhất* dùng `html2canvas` + `jspdf` (xem commit `2775ded`).

**(C) Podcast** — `POST /api/ai/podcast/:folderId`
- **Bước 1**: `summarizeForPodcast` tóm tắt trung thành nội dung (chống bịa).
- **Bước 2**: `generatePodcastScript` viết kịch bản 2 MC (`MC_A` / `MC_B`) theo schema.
- **Bước 3**: `ttsService.generatePodcastAudio` lặp qua từng dòng, gọi `edge-tts-universal` (giọng `vi-VN-NamMinhNeural` + `vi-VN-HoaiMyNeural`), retry 3 lần × backoff, ghép buffer thành 1 file `mp3` trong `uploads/audio/`.
- Script + URL cache vào `folders.podcast_script` (JSONB) và `folders.podcast_audio_url`.

**(D) Auth** — JWT-based
- Đăng ký/đăng nhập email + password (bcryptjs, salt 10 rounds) hoặc Google ID token (`google-auth-library` verify, fallback decode khi chạy DEV không có `GOOGLE_CLIENT_ID`).
- Token JWT (`jsonwebtoken`, hết hạn 30 ngày) lưu trong `localStorage`, axios interceptor đính `Authorization: Bearer …` mỗi request.
- Middleware `protect` chỉ dùng cho `GET /api/auth/me`; phần còn lại hiện là single-user (RLS disabled — xem `supabase-schema.sql`).

---

## 2. Tech stack chi tiết

### Frontend — `client/`

| Layer | Công nghệ | Vai trò |
|---|---|---|
| Runtime | **React 19.2** + **react-dom 19.2** | UI declarative, hooks-based |
| Build / Dev | **Vite 8** + `@vitejs/plugin-react 6` | Dev server :5173, HMR, build production |
| HTTP | **axios 1.16** | Client API + JWT interceptor (`utils/api.js`) |
| File drop | **react-dropzone 15** | Khu vực kéo–thả nhiều file |
| Markdown / Math | **react-markdown 10**, **remark-math 6**, **rehype-katex 7**, **katex 0.16** | Render công thức LaTeX trong cheat sheet |
| Export | **html2canvas 1.4** + **jspdf 4.2** | Xuất cheat sheet PDF (1 trang) / PNG |
| OAuth | **@react-oauth/google 0.13** | Nút đăng nhập Google trên `Login.jsx` |
| Linting | **ESLint 10** + `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | Code quality |
| Module type | ESM (`"type": "module"`) | — |

Cấu trúc UI: 1 SPA, `App.jsx` chia 2 chế độ — **Landing** (hero + capabilities + CTA) và **Workspace dashboard** với 5 tab: *Tổng quan · Thư viện tri thức · Phao cứu cấp · Podcast học tập · Cài đặt*. Folder detail view có sub-view `files | cheatsheet | podcast`.

### Backend — `server/`

| Layer | Công nghệ | Vai trò |
|---|---|---|
| Runtime | **Node.js** (CommonJS, `node --watch` dev) | — |
| Web framework | **Express 5.2** | Router, middleware, static `/uploads` |
| CORS / parsing | **cors 2.8**, `express.json({ limit: '50mb' })` | Cho phép client cross-origin, payload lớn |
| Upload | **multer 2.1** (memoryStorage, 50 MB) | Nhận multipart, không ghi đĩa trực tiếp |
| Database SDK | **@supabase/supabase-js 2.106** | Truy vấn Postgres qua REST |
| Auth | **bcryptjs 3**, **jsonwebtoken 9**, **google-auth-library 10** | Hash password, JWT, verify Google ID token |
| Text extraction | **pdf-parse 2.4**, **mammoth 1.12** | PDF / DOCX → plain text |
| AI | **openai 6.38** SDK + `response_format: json_schema` (strict) | Phân loại, cheat sheet, podcast, recommend, handwriting |
| TTS | **edge-tts-universal 1.4** | Microsoft Edge Neural Voice (free, no key) |
| Misc | **dotenv 17**, **uuid 14** | Env, đặt tên file unique |

**Mô hình AI sử dụng** (`services/aiService.js`):
- `gpt-4o-mini` — text classification, cheat sheet generation, podcast script, recommendations.
- `gpt-4o` — vision (classify image, analyze handwriting).
- Mọi response đều cưỡng chế qua **JSON Schema strict mode** (`utils/schemas.js`) → không cần parse markdown, không hallucinate field, an toàn cho frontend.

### Database — Supabase (Postgres)

3 bảng UUID-PK với trigger `touch_updated_at` tự cập nhật `updated_at`:

| Bảng | Cột nổi bật |
|---|---|
| `users` | `email` (unique), `password_hash`, `avatar_url`, `school`, `cohort` |
| `folders` | `name`, `subject`, `chapter`, `grade`, `cheat_sheet_json` (JSONB), `cheat_sheet_markdown` (legacy), `selected_template`, `handwriting_font`, `handwriting_sample_url`, `podcast_script` (JSONB), `podcast_audio_url` |
| `files` | `folder_id` (FK → folders ON DELETE CASCADE), `original_name`, `storage_url`, `file_type`, `file_size`, `extracted_text`, `ai_summary`, `ai_tags` (text[]) |

RLS hiện tắt (single-user). Schema khởi tạo: `server/config/supabase-schema.sql`.

### Storage

- **Mặc định**: Supabase Storage bucket `peernoted-files` (`SUPABASE_URL` + `SUPABASE_ANON_KEY`).
- **Fallback**: ghi local vào `uploads/` (đã có sẵn vài file mẫu trong repo) — server serve qua `app.use('/uploads', express.static(...))`.
- Audio podcast luôn ghi vào `uploads/audio/*.mp3` (Edge TTS sinh buffer rồi `fs.writeFileSync`).

---

## 3. Cấu trúc thư mục

```
peernoted-1/
├─ client/
│  ├─ src/
│  │  ├─ App.jsx / App.css / index.css / main.jsx
│  │  ├─ components/
│  │  │  ├─ Dropzone.{jsx,css}        ─ react-dropzone wrapper
│  │  │  ├─ FileList.{jsx,css}        ─ Danh sách file trong folder
│  │  │  ├─ CheatSheet.{jsx,css}      ─ Container + control bar
│  │  │  ├─ AudioPlayer.{jsx,css}     ─ Player podcast + script
│  │  │  ├─ Login.{jsx,css}           ─ Email + Google OAuth
│  │  │  ├─ Sidebar.{jsx,css}         ─ (legacy, dashboard dùng inline)
│  │  │  └─ cheatsheet/
│  │  │     ├─ CheatSheetRenderer.jsx ─ Render blocks JSON
│  │  │     ├─ ExportButtons.jsx      ─ PDF/PNG export
│  │  │     ├─ HandwritingUploadModal.jsx
│  │  │     ├─ TemplatePicker.jsx
│  │  │     ├─ latex.js               ─ Helper KaTeX
│  │  │     ├─ cheatsheet.css
│  │  │     └─ templates/
│  │  │        ├─ AcademicBlue.jsx
│  │  │        ├─ ModernCard.jsx
│  │  │        ├─ SketchNotebook.jsx  ─ Hỗ trợ font handwriting
│  │  │        ├─ Minimalist.jsx
│  │  │        └─ index.js
│  │  ├─ utils/api.js                 ─ axios instance + endpoints
│  │  └─ assets/                      ─ hero.png, logos
│  ├─ public/                         ─ favicon.svg, icons.svg
│  ├─ vite.config.js                  ─ proxy /api & /uploads → :5000
│  ├─ eslint.config.js
│  └─ package.json
│
├─ server/
│  ├─ index.js                        ─ Express bootstrap
│  ├─ config/
│  │  ├─ supabase.js                  ─ Client + toApi() helper (id↔_id)
│  │  └─ supabase-schema.sql          ─ DDL khởi tạo
│  ├─ middleware/auth.js              ─ protect() + signToken()
│  ├─ routes/
│  │  ├─ auth.js                      ─ register/login/google/me
│  │  ├─ folders.js                   ─ CRUD + countFilesByType()
│  │  ├─ files.js                     ─ Upload, list, delete
│  │  └─ ai.js                        ─ classify, cheatsheet/*, podcast, recommend
│  ├─ services/
│  │  ├─ aiService.js                 ─ OpenAI wrappers + JSON schema
│  │  ├─ extractorService.js          ─ pdf-parse + mammoth
│  │  ├─ storageService.js            ─ Supabase OR local fallback
│  │  └─ ttsService.js                ─ Edge TTS với retry/concat MP3
│  ├─ utils/
│  │  ├─ prompts.js                   ─ Toàn bộ system/user prompt VN
│  │  ├─ schemas.js                   ─ 5 JSON Schema strict
│  │  └─ encoding.js                  ─ Fix tên file Latin-1 → UTF-8
│  └─ package.json
│
└─ uploads/                           ─ File local + audio/ (podcast mp3)
```

---

## 4. Chạy local

### Yêu cầu
- Node.js ≥ 20 (Express 5 + `--watch`)
- Tài khoản Supabase (free) + bucket `peernoted-files` (public)
- OpenAI API key
- (Tùy chọn) Google OAuth Client ID nếu bật nút đăng nhập Google

### Biến môi trường — `.env` đặt ở thư mục **gốc** (server đọc `path.join(__dirname, '..', '.env')`)

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=ey...
SUPABASE_BUCKET=peernoted-files     # optional, default

# Auth
JWT_SECRET=replace-with-long-random-string
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com  # optional, DEV fallback có sẵn

# AI
OPENAI_API_KEY=sk-...

# Server
PORT=5000                           # optional
```

### Khởi tạo Supabase
Mở SQL editor → paste toàn bộ `server/config/supabase-schema.sql` → Run.

### Cài đặt + chạy

```powershell
# Backend
cd server
npm install
npm run dev          # node --watch index.js → http://localhost:5000

# Frontend (terminal khác)
cd client
npm install
npm run dev          # vite → http://localhost:5173
```

Vite proxy `/api` và `/uploads` về cổng 5000, nên chỉ cần mở `http://localhost:5173`.

### Build production frontend
```powershell
cd client
npm run build        # output: client/dist
npm run preview      # serve dist locally
```

---

## 5. Bản đồ API

Tất cả prefix `/api`. CORS mở, không có rate-limit.

### Auth
| Method | Path | Mô tả |
|---|---|---|
| POST | `/auth/register` | Email + password, trả JWT |
| POST | `/auth/login` | Email + password, trả JWT |
| POST | `/auth/google` | Verify Google ID token, auto-upsert user |
| GET  | `/auth/me` | (protected) trả user hiện tại |

### Folders
| Method | Path | Mô tả |
|---|---|---|
| GET    | `/folders` | Liệt kê + enrich `fileCount/pdfCount/imageCount/docCount` |
| GET    | `/folders/:id` | Chi tiết 1 folder |
| POST   | `/folders` | Tạo thủ công |
| PUT    | `/folders/:id` | Đổi tên / subject / chapter / grade |
| DELETE | `/folders/:id` | Xóa folder + cascade file |

### Files
| Method | Path | Mô tả |
|---|---|---|
| GET    | `/files?folder_id=…` | Liệt kê file (mới nhất trước) |
| POST   | `/files/upload` | Upload thủ công vào folder cụ thể |
| DELETE | `/files/:id` | Xóa file (và xóa khỏi local storage nếu có) |

### AI
| Method | Path | Mô tả |
|---|---|---|
| POST   | `/ai/classify` | Upload + auto-classify ≤ 20 file/lần |
| GET    | `/ai/cheatsheet/:folderId` | Sinh hoặc trả cheat sheet JSON cache |
| DELETE | `/ai/cheatsheet/:folderId` | Xóa cache để sinh lại |
| POST   | `/ai/cheatsheet/:folderId/template` | Đổi template hiển thị |
| POST   | `/ai/cheatsheet/:folderId/migrate` | Convert legacy markdown → JSON |
| POST   | `/ai/cheatsheet/:folderId/handwriting` | Upload ảnh chữ tay → AI chọn font |
| POST   | `/ai/cheatsheet/:folderId/handwriting/manual` | Chọn font handwriting thủ công |
| POST   | `/ai/podcast/:folderId` | Sinh script + audio (cache) |
| DELETE | `/ai/podcast/:folderId` | Xóa cache podcast |
| POST   | `/ai/recommend/:folderId` | Gợi ý video/podcast/article + URL search YouTube |

### Health
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/health` | `{status:'ok', timestamp}` |

---

## 6. Quyết định thiết kế đáng chú ý

- **JSON Schema strict cho mọi LLM call** — không bao giờ parse markdown từ model; mọi field bắt buộc khai báo trong `utils/schemas.js`. Tránh được lỗi parse khi model "sáng tạo" định dạng.
- **2-step podcast generation** (summarize → script) thay vì 1 prompt to — giảm hallucination, giữ độ chính xác học thuật.
- **Anti-cross-subject merge** trong `routes/ai.js` — nếu LLM gợi ý folder hiện có nhưng `subject` khác, server tạo folder mới với tên `{subject}/{chapter}` thay vì merge bừa.
- **Scan-PDF detection** (`isMeaningfulText`) — phát hiện PDF chỉ có marker trang để không gửi rác cho LLM.
- **Storage abstraction** — `storageService.uploadToStorage()` tự chọn Supabase hoặc local theo env, fail-soft xuống local.
- **Latin-1 → UTF-8 fix** (`utils/encoding.js`) — `multer` đôi khi nhận tên file dưới dạng Latin-1; client cũng có `decodeString()` đối ứng cho data đã lưu sai trước đó.
- **Cache-first cho cheat sheet & podcast** — tránh lãng phí tokens; có endpoint DELETE để force-regenerate.
- **Mongoose-style API shape** — `toApi()` mirror `id` → `_id` + `createdAt`/`updatedAt` để frontend (vốn từng dùng Mongo) không phải đổi.

---

## 7. Lộ trình / TODO đã thấy trong code

- Bật **RLS** + multi-user thực sự (hiện tại single-user, RLS disabled).
- Áp dụng `middleware/protect` cho `/api/folders`, `/api/files`, `/api/ai` (hiện chỉ `/auth/me` được bảo vệ).
- Thêm OCR pipeline cho PDF dạng scan (đã có tag `cần-OCR`).
- Wire AI config UI ở tab *Cài đặt* (hiện là static UI).
- Triển khai Supabase Storage delete trong `storageService.deleteFromStorage()`.
