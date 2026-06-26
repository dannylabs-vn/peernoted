# PeerNoted

PeerNoted là một nền tảng quản lý tri thức cá nhân và học tập cộng tác dành cho sinh viên: người dùng kéo–thả tài liệu học tập (PDF / DOCX / hình ảnh), AI tự động phân loại vào thư mục theo môn–chương–lớp, rồi từ nội dung đó sinh ra **cheat sheet (phao cứu cấp)**, **podcast hội thoại 2 MC** và **gợi ý tài nguyên học tập** trên YouTube. Ngoài ra còn có **Phòng Học** (study rooms) với chat thời gian thực, kênh thảo luận, chia sẻ file, và hệ thống **Peer Points** + cửa hàng phần thưởng.

---

## 1. Tính năng chính

###  Quản lý tri thức cá nhân
- **Upload thông minh**: Kéo–thả tài liệu (PDF, DOCX, TXT, hình ảnh), AI tự động trích xuất nội dung
- **Phân loại tự động**: GPT-4o-mini phân tích → gắn nhãn môn học, chương, lớp học
- **Thư viện trực quan**: Xem tất cả tài liệu theo folder, tìm kiếm, lọc, xóa hàng loạt
- **Trích xuất chữ viết tay**: GPT-4o vision OCR cho ảnh chụp tài liệu

###  Cheat Sheet (Phao cứu cấp)
- AI tóm tắt nội dung folder thành cheat sheet có cấu trúc (công thức, định nghĩa, danh sách, ví dụ, ghi chú)
- **4 template hiển thị**: Academic Blue, Modern Card, Sketch Notebook, Minimalist
- **Hỗ trợ chữ viết tay**: Upload ảnh → AI nhận dạng và chọn font handwriting phù hợp
- **Export PDF/PNG**: 1 trang duy nhất, dùng html2canvas + jspdf

###  Podcast học tập
- Chuyển đổi tài liệu thành hội thoại 2 MC (NamMinh + HoaiMy)
- Dùng Microsoft Edge TTS Neural (miễn phí, không cần key)
- Cache script + audio, có thể tải lại

###  Gợi ý học tập
- AI gợi ý video YouTube, podcast, bài viết liên quan đến nội dung
- Search YouTube trực tiếp với từ khóa thông minh

###  Phòng Học (Study Rooms)
- Tạo phòng học nhóm với kênh thảo luận (channels)
- **Chat thời gian thực** qua Socket.IO
- Chia sẻ file trong phòng
- Danh sách thành viên + quyền hạn
- Mời bạn qua link (invite code)

###  Peer Points
- Kiếm điểm khi tham gia phòng học, đăng bài, chia sẻ tài liệu
- Cửa hàng đổi thưởng (themes, icons, badges)

###  Dark Mode
- Giao diện Discord-inspired, tương phản cao
- Lưu trạng thái qua localStorage
- Đồng bộ toàn bộ trang (landing + dashboard + tất cả tab)

###  Diễn đàn chia sẻ
- Chia sẻ cheat sheet, podcast ra diễn đàn công khai
- Like, comment, tương tác

###  Bảo mật
- JWT authentication (email/password hoặc Google OAuth)
- bcryptjs hash password (10 salt rounds)
- JSON Schema strict mode cho mọi LLM call → chống hallucination

---

## 2. Kiến trúc tổng thể

````
Browser (SPA)
  ┌────────────────────────────────────────────────────┐
  │ client/ (React 19 + Vite 8)                        │
  │ App.jsx (landing + dashboard SPA, 7 tabs)          │
  │ components/  Dropzone, FileList, CheatSheet,        │
  │              AudioPlayer, Login, Forum,             │
  │              RoomList, RoomView, RoomFileManager,    │
  │              ChannelList, ChatArea, MemberList,      │
  │              InviteLink, PeerPointsShop, AIRoleSuggest│
  │ components/cheatsheet/ 4 templates + PDF/PNG export │
  │ utils/  api.js (axios + JWT), socket.js (Socket.IO) │
  └────────────────────┬───────────────────────────────┘
                       │ /api/*, /socket.io (proxy)
                       ▼
Server (Node.js + Express 5)
  ┌────────────────────────────────────────────────────┐
  │ index.js — Express + Socket.IO + healthcheck        │
  │ routes/   auth, folders, files, ai, rooms,          │
  │           channels, room-files, peerpoints           │
  │ socket/   index.js (Socket.IO handlers)              │
  │ services/ aiService, extractorService,               │
  │           storageService, ttsService                 │
  │ utils/    prompts (VN), schemas (JSON strict),       │
  │           encoding (Latin-1 fix)                     │
  └──────┬──────────┬──────────┬────────────────────────┘
         ▼          ▼          ▼
   Supabase     OpenAI      Edge TTS
   Postgres     GPT-4o      NamMinh + HoaiMy
   + Storage    + vision    (free, no key)
         ▼
   uploads/ (files + audio/)
````

---

## 3. Tech stack

### Frontend — client/

| Layer | Công nghệ | Vai trò |
|---|---|---|
| Runtime | React 19.2 + react-dom 19.2 | UI declarative |
| Build | Vite 8 + @vitejs/plugin-react 6 | Dev server :5173, HMR |
| HTTP | axios 1.16 | API + JWT interceptor |
| WebSocket | socket.io-client 4.8 | Chat realtime |
| File drop | react-dropzone 15 | Kéo–thả file |
| Export | html2canvas 1.4 + jspdf 4.2 | PDF/PNG |
| OAuth | @react-oauth/google 0.13 | Google login |

### Backend — server/

| Layer | Công nghệ | Vai trò |
|---|---|---|
| Runtime | Node.js (CommonJS) | — |
| Web | Express 5.2 | Router, CORS |
| WebSocket | socket.io 4.8 | Realtime |
| DB | @supabase/supabase-js 2.106 | Postgres REST |
| Auth | bcryptjs 3, jsonwebtoken 9, google-auth-library 10 | Hash, JWT, Google |
| AI | openai 6.38 (JSON Schema strict) | Phân loại, cheat, podcast |
| TTS | edge-tts-universal 1.4 | Neural Voice free |
| Text | pdf-parse 2.4, mammoth 1.12 | PDF/DOCX → text |

### Database — Supabase (9 bảng)

| Bảng | Mục đích |
|---|---|
| users | Người dùng (email, password_hash, peer_points) |
| folders | Thư mục môn học |
| files | File tài liệu (FK → folders) |
| rooms | Phòng học (code invite, max_members) |
| room_members | Thành viên phòng (role) |
| room_channels | Kênh thảo luận (text/voice) |
| room_files | File chia sẻ trong phòng |
| peer_rewards | Phần thưởng (cost, type) |
| user_unlocked_rewards | Đã mở khóa |

---

## 4. Cấu trúc thư mục

````
peernoted/
├─ client/
│  ├─ src/
│  │  ├─ App.jsx / App.css / index.css / main.jsx
│  │  ├─ components/
│  │  │  ├─ Dropzone.{jsx,css}         ─ Upload kéo–thả
│  │  │  ├─ FileList.{jsx,css}         ─ Danh sách file
│  │  │  ├─ CheatSheet.{jsx,css}       ─ Cheat sheet
│  │  │  ├─ AudioPlayer.{jsx,css}      ─ Podcast player
│  │  │  ├─ Login.{jsx,css}            ─ Email + Google
│  │  │  ├─ Forum.{jsx,css}            ─ Diễn đàn
│  │  │  ├─ RoomList.{jsx,css}         ─ Danh sách phòng
│  │  │  ├─ RoomView.jsx               ─ Chi tiết phòng
│  │  │  ├─ RoomSettingsModal.jsx      ─ Cài đặt phòng
│  │  │  ├─ RoomFileManager.jsx        ─ File phòng
│  │  │  ├─ ChannelList.jsx            ─ Kênh thảo luận
│  │  │  ├─ ChatArea.jsx               ─ Chat realtime
│  │  │  ├─ MemberList.jsx             ─ Thành viên
│  │  │  ├─ InviteLink.jsx             ─ Link mời
│  │  │  ├─ PeerPointsShop.jsx         ─ Cửa hàng
│  │  │  ├─ AIRoleSuggest.jsx          ─ Gợi ý AI
│  │  │  ├─ Sidebar.{jsx,css}          ─ Legacy
│  │  │  └─ cheatsheet/ (4 templates)
│  │  └─ utils/
│  │     ├─ api.js                     ─ axios instance
│  │     └─ socket.js                  ─ Socket.IO client
│  ├─ vite.config.js
│  └─ package.json
│
├─ server/
│  ├─ index.js                         ─ Express + Socket.IO
│  ├─ config/supabase-schema.sql       ─ DDL 9 bảng
│  ├─ middleware/auth.js               ─ protect()
│  ├─ routes/  auth, folders, files, ai, rooms, channels, room-files, peerpoints
│  ├─ socket/index.js                  ─ Socket.IO handlers
│  ├─ services/  aiService, extractorService, storageService, ttsService
│  └─ utils/  prompts, schemas, encoding
│
└─ uploads/                            ─ File local + audio/
````

---

## 5. Chạy local

### Yêu cầu
- Node.js ≥ 20
- Supabase (free) + bucket peernoted-files
- OpenAI API key

### .env (thư mục gốc)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=ey...
JWT_SECRET=thay-bang-chuoi-ngau-nhien
OPENAI_API_KEY=sk-...
```

### Cài đặt
```powershell
# Backend
cd server
npm install
npm run dev          # → http://localhost:5000

# Frontend (terminal khác)
cd client
npm install
npm run dev          # → http://localhost:5173
```

Mở http://localhost:5173 — Vite proxy /api, /uploads, /socket.io về :5000.

---

## 6. API Endpoints

Tất cả prefix /api.

### Auth
| Method | Path | Mô tả |
|---|---|---|
| POST | /auth/register | Đăng ký → JWT |
| POST | /auth/login | Đăng nhập → JWT |
| POST | /auth/google | Google OAuth → JWT |
| GET | /auth/me | (protected) user info |

### Folders
| Method | Path | Mô tả |
|---|---|---|
| GET | /folders | Danh sách |
| GET | /folders/:id | Chi tiết |
| POST | /folders | Tạo mới |
| PUT | /folders/:id | Cập nhật |
| DELETE | /folders/:id | Xóa |

### Files
| Method | Path | Mô tả |
|---|---|---|
| GET | /files | Danh sách |
| POST | /files/upload | Upload |
| DELETE | /files/:id | Xóa |
| POST | /files/delete-batch | Xóa hàng loạt |

### AI
| Method | Path | Mô tả |
|---|---|---|
| POST | /ai/classify | Upload + phân loại |
| GET | /ai/cheatsheet/:folderId | Lấy cheat sheet |
| POST | /ai/podcast/:folderId | Tạo podcast |
| POST | /ai/recommend/:folderId | Gợi ý YouTube |

### Phòng Học
| Method | Path | Mô tả |
|---|---|---|
| GET/POST | /rooms | Danh sách / Tạo |
| GET/PUT/DELETE | /rooms/:id | Chi tiết / Sửa / Xóa |
| POST | /rooms/:roomId/channels | Tạo kênh |
| POST | /rooms/:roomId/files | Upload file |

### Peer Points
| Method | Path | Mô tả |
|---|---|---|
| GET | /peerpoints/:userId | Xem điểm |
| POST | /peerpoints/award | Thưởng điểm |
| GET | /rewards | Danh sách thưởng |
| POST | /rewards/unlock | Mở khóa |

---

## 7. Thiết kế đáng chú ý

- **JSON Schema strict cho LLM** — không parse markdown, không hallucination
- **2-step podcast** (summarize → script) — giảm bịa, giữ chính xác
- **Anti-cross-subject merge** — tránh gộp lộn môn học
- **Scan-PDF detection** — không gửi PDF rỗng cho AI
- **Storage abstraction** — Supabase Storage / local fallback
- **Cache-first** — cheat sheet & podcast cache vào DB
- **Discord Dark Mode** — CSS variables, full page sync, localStorage
- **Socket.IO realtime** — chat, room events, member sync
- **Peer Points gamification** — khuyến khích tương tác
- **Invite code** — mỗi phòng có mã mời riêng

---

## 8. Lộ trình

- [ ] Bật RLS + multi-user
- [ ] OCR pipeline cho PDF scan
- [ ] Wire AI config UI (tab Cài đặt)
- [ ] Supabase Storage delete
- [ ] End-to-end encryption cho file phòng
- [ ] PWA offline support
