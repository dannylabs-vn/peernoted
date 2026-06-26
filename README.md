# PeerNoted

PeerNoted là m?t n?n t?ng qu?n lý tri th?c cá nhân và h?c t?p c?ng tác dành cho sinh viên: ngu?i dùng kéo–th? tài li?u h?c t?p (PDF / DOCX / hình ?nh), AI t? d?ng phân lo?i vào thu m?c theo môn–chuong–l?p, r?i t? n?i dung dó sinh ra **cheat sheet (phao c?u c?p)**, **podcast h?i tho?i 2 MC** và **g?i ý tài nguyên h?c t?p** trên YouTube. Ngoài ra còn có **Phòng H?c** (study rooms) v?i chat th?i gian th?c, kênh th?o lu?n, chia s? file, và h? th?ng **Peer Points** + c?a hàng ph?n thu?ng.

---

## 1. Tính nang chính

### ?? Qu?n lý tri th?c cá nhân
- **Upload thông minh**: Kéo–th? tài li?u (PDF, DOCX, TXT, hình ?nh), AI t? d?ng trích xu?t n?i dung
- **Phân lo?i t? d?ng**: GPT-4o-mini phân tích ? g?n nhãn môn h?c, chuong, l?p h?c
- **Thu vi?n tr?c quan**: Xem t?t c? tài li?u theo folder, tìm ki?m, l?c, xóa hàng lo?t
- **Trích xu?t ch? vi?t tay**: GPT-4o vision OCR cho ?nh ch?p tài li?u

### ?? Cheat Sheet (Phao c?u c?p)
- AI tóm t?t n?i dung folder thành cheat sheet có c?u trúc (công th?c, d?nh nghia, danh sách, ví d?, ghi chú)
- **4 template hi?n th?**: Academic Blue, Modern Card, Sketch Notebook, Minimalist
- **H? tr? ch? vi?t tay**: Upload ?nh ? AI nh?n d?ng và ch?n font handwriting phù h?p
- **Export PDF/PNG**: 1 trang duy nh?t, dùng html2canvas + jspdf

### ?? Podcast h?c t?p
- Chuy?n d?i tài li?u thành h?i tho?i 2 MC (NamMinh + HoaiMy)
- Dùng Microsoft Edge TTS Neural (mi?n phí, không c?n key)
- Cache script + audio, có th? t?i l?i

### ?? G?i ý h?c t?p
- AI g?i ý video YouTube, podcast, bài vi?t liên quan d?n n?i dung
- Search YouTube tr?c ti?p v?i t? khóa thông minh

### ?? Phòng H?c (Study Rooms)
- T?o phòng h?c nhóm v?i kênh th?o lu?n (channels)
- **Chat th?i gian th?c** qua Socket.IO
- Chia s? file trong phòng
- Danh sách thành viên + quy?n h?n
- M?i b?n qua link (invite code)

### ? Peer Points
- Ki?m di?m khi tham gia phòng h?c, dang bài, chia s? tài li?u
- C?a hàng d?i thu?ng (themes, icons, badges)

### ?? Dark Mode
- Giao di?n Discord-inspired, tuong ph?n cao
- Luu tr?ng thái qua localStorage
- Ð?ng b? toàn b? trang (landing + dashboard + t?t c? tab)

### ?? Di?n dàn chia s?
- Chia s? cheat sheet, podcast ra di?n dàn công khai
- Like, comment, tuong tác

### ?? B?o m?t
- JWT authentication (email/password ho?c Google OAuth)
- bcryptjs hash password (10 salt rounds)
- JSON Schema strict mode cho m?i LLM call ? ch?ng hallucination

---

## 2. Ki?n trúc t?ng th?

```
Browser (SPA)
  +----------------------------------------------------+
  ¦ client/ (React 19 + Vite 8)                        ¦
  ¦ App.jsx (landing + dashboard SPA, 7 tabs)          ¦
  ¦ components/  Dropzone, FileList, CheatSheet,        ¦
  ¦              AudioPlayer, Login, Forum,             ¦
  ¦              RoomList, RoomView, RoomFileManager,    ¦
  ¦              ChannelList, ChatArea, MemberList,      ¦
  ¦              InviteLink, PeerPointsShop, AIRoleSuggest¦
  ¦ components/cheatsheet/ 4 templates + PDF/PNG export ¦
  ¦ utils/  api.js (axios + JWT), socket.js (Socket.IO) ¦
  +----------------------------------------------------+
                       ¦ /api/*, /socket.io (proxy)
                       ?
Server (Node.js + Express 5)
  +----------------------------------------------------+
  ¦ index.js — Express + Socket.IO + healthcheck        ¦
  ¦ routes/   auth, folders, files, ai, rooms,          ¦
  ¦           channels, room-files, peerpoints           ¦
  ¦ socket/   index.js (Socket.IO handlers)              ¦
  ¦ services/ aiService, extractorService,               ¦
  ¦           storageService, ttsService                 ¦
  ¦ utils/    prompts (VN), schemas (JSON strict),       ¦
  ¦           encoding (Latin-1 fix)                     ¦
  +-----------------------------------------------------+
         ?          ?          ?
   Supabase     OpenAI      Edge TTS
   Postgres     GPT-4o      NamMinh + HoaiMy
   + Storage    + vision    (free, no key)
         ?
   uploads/ (files + audio/)
```

---

## 3. Tech stack

### Frontend — client/

| Layer | Công ngh? | Vai trò |
|---|---|---|
| Runtime | React 19.2 + react-dom 19.2 | UI declarative |
| Build | Vite 8 + @vitejs/plugin-react 6 | Dev server :5173, HMR |
| HTTP | axios 1.16 | API + JWT interceptor |
| WebSocket | socket.io-client 4.8 | Chat realtime |
| File drop | react-dropzone 15 | Kéo–th? file |
| Export | html2canvas 1.4 + jspdf 4.2 | PDF/PNG |
| OAuth | @react-oauth/google 0.13 | Google login |

### Backend — server/

| Layer | Công ngh? | Vai trò |
|---|---|---|
| Runtime | Node.js (CommonJS) | — |
| Web | Express 5.2 | Router, CORS |
| WebSocket | socket.io 4.8 | Realtime |
| DB | @supabase/supabase-js 2.106 | Postgres REST |
| Auth | bcryptjs 3, jsonwebtoken 9, google-auth-library 10 | Hash, JWT, Google |
| AI | openai 6.38 (JSON Schema strict) | Phân lo?i, cheat, podcast |
| TTS | edge-tts-universal 1.4 | Neural Voice free |
| Text | pdf-parse 2.4, mammoth 1.12 | PDF/DOCX ? text |

### Database — Supabase (9 b?ng)

| B?ng | M?c dích |
|---|---|
| users | Ngu?i dùng (email, password_hash, peer_points) |
| folders | Thu m?c môn h?c |
| files | File tài li?u (FK ? folders) |
| rooms | Phòng h?c (code invite, max_members) |
| room_members | Thành viên phòng (role) |
| room_channels | Kênh th?o lu?n (text/voice) |
| room_files | File chia s? trong phòng |
| peer_rewards | Ph?n thu?ng (cost, type) |
| user_unlocked_rewards | Ðã m? khóa |

---

## 4. C?u trúc thu m?c

```
peernoted/
+- client/
¦  +- src/
¦  ¦  +- App.jsx / App.css / index.css / main.jsx
¦  ¦  +- components/
¦  ¦  ¦  +- Dropzone.{jsx,css}         - Upload kéo–th?
¦  ¦  ¦  +- FileList.{jsx,css}         - Danh sách file
¦  ¦  ¦  +- CheatSheet.{jsx,css}       - Cheat sheet
¦  ¦  ¦  +- AudioPlayer.{jsx,css}      - Podcast player
¦  ¦  ¦  +- Login.{jsx,css}            - Email + Google
¦  ¦  ¦  +- Forum.{jsx,css}            - Di?n dàn
¦  ¦  ¦  +- RoomList.{jsx,css}         - Danh sách phòng
¦  ¦  ¦  +- RoomView.jsx               - Chi ti?t phòng
¦  ¦  ¦  +- RoomSettingsModal.jsx      - Cài d?t phòng
¦  ¦  ¦  +- RoomFileManager.jsx        - File phòng
¦  ¦  ¦  +- ChannelList.jsx            - Kênh th?o lu?n
¦  ¦  ¦  +- ChatArea.jsx               - Chat realtime
¦  ¦  ¦  +- MemberList.jsx             - Thành viên
¦  ¦  ¦  +- InviteLink.jsx             - Link m?i
¦  ¦  ¦  +- PeerPointsShop.jsx         - C?a hàng
¦  ¦  ¦  +- AIRoleSuggest.jsx          - G?i ý AI
¦  ¦  ¦  +- Sidebar.{jsx,css}          - Legacy
¦  ¦  ¦  +- cheatsheet/ (4 templates)
¦  ¦  +- utils/
¦  ¦     +- api.js                     - axios instance
¦  ¦     +- socket.js                  - Socket.IO client
¦  +- vite.config.js
¦  +- package.json
¦
+- server/
¦  +- index.js                         - Express + Socket.IO
¦  +- config/supabase-schema.sql       - DDL 9 b?ng
¦  +- middleware/auth.js               - protect()
¦  +- routes/  auth, folders, files, ai, rooms, channels, room-files, peerpoints
¦  +- socket/index.js                  - Socket.IO handlers
¦  +- services/  aiService, extractorService, storageService, ttsService
¦  +- utils/  prompts, schemas, encoding
¦
+- uploads/                            - File local + audio/
```

---

## 5. Ch?y local

### Yêu c?u
- Node.js = 20
- Supabase (free) + bucket `peernoted-files`
- OpenAI API key

### .env (thu m?c g?c)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=ey...
JWT_SECRET=thay-bang-chuoi-ngau-nhien
OPENAI_API_KEY=sk-...
```

### Cài d?t
```powershell
# Backend
cd server
npm install
npm run dev          # ? http://localhost:5000

# Frontend (terminal khác)
cd client
npm install
npm run dev          # ? http://localhost:5173
```

M? http://localhost:5173 — Vite proxy /api, /uploads, /socket.io v? :5000.

---

## 6. API Endpoints

T?t c? prefix `/api`.

### Auth
| Method | Path | Mô t? |
|---|---|---|
| POST | /auth/register | Ðang ký ? JWT |
| POST | /auth/login | Ðang nh?p ? JWT |
| POST | /auth/google | Google OAuth ? JWT |
| GET | /auth/me | (protected) user info |

### Folders
| Method | Path | Mô t? |
|---|---|---|
| GET | /folders | Danh sách |
| GET | /folders/:id | Chi ti?t |
| POST | /folders | T?o m?i |
| PUT | /folders/:id | C?p nh?t |
| DELETE | /folders/:id | Xóa |

### Files
| Method | Path | Mô t? |
|---|---|---|
| GET | /files | Danh sách |
| POST | /files/upload | Upload |
| DELETE | /files/:id | Xóa |
| POST | /files/delete-batch | Xóa hàng lo?t |

### AI
| Method | Path | Mô t? |
|---|---|---|
| POST | /ai/classify | Upload + phân lo?i |
| GET | /ai/cheatsheet/:folderId | L?y cheat sheet |
| POST | /ai/podcast/:folderId | T?o podcast |
| POST | /ai/recommend/:folderId | G?i ý YouTube |

### Phòng H?c
| Method | Path | Mô t? |
|---|---|---|
| GET/POST | /rooms | Danh sách / T?o |
| GET/PUT/DELETE | /rooms/:id | Chi ti?t / S?a / Xóa |
| POST | /rooms/:roomId/channels | T?o kênh |
| POST | /rooms/:roomId/files | Upload file |

### Peer Points
| Method | Path | Mô t? |
|---|---|---|
| GET | /peerpoints/:userId | Xem di?m |
| POST | /peerpoints/award | Thu?ng di?m |
| GET | /rewards | Danh sách thu?ng |
| POST | /rewards/unlock | M? khóa |

---

## 7. Thi?t k? dáng chú ý

- **JSON Schema strict cho LLM** — không parse markdown, không hallucination
- **2-step podcast** (summarize ? script) — gi?m b?a, gi? chính xác
- **Anti-cross-subject merge** — tránh g?p l?n môn h?c
- **Scan-PDF detection** — không g?i PDF r?ng cho AI
- **Storage abstraction** — Supabase Storage / local fallback
- **Cache-first** — cheat sheet & podcast cache vào DB
- **Discord Dark Mode** — CSS variables, full page sync, localStorage
- **Socket.IO realtime** — chat, room events, member sync
- **Peer Points gamification** — khuy?n khích tuong tác
- **Invite code** — m?i phòng có mã m?i riêng

---

## 8. L? trình

- [ ] B?t RLS + multi-user
- [ ] OCR pipeline cho PDF scan
- [ ] Wire AI config UI (tab Cài d?t)
- [ ] Supabase Storage delete
- [ ] End-to-end encryption cho file phòng
- [ ] PWA offline support
