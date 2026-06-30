const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { healthcheck } = require('./config/supabase');
const authRoutes = require('./routes/auth');
const folderRoutes = require('./routes/folders');
const fileRoutes = require('./routes/files');
const aiRoutes = require('./routes/ai');
const roomRoutes = require('./routes/rooms');
const channelRoutes = require('./routes/channels');
const roomFileRoutes = require('./routes/room-files');
const peerpointRoutes = require('./routes/peerpoints');
const quizRoutes = require('./routes/quiz');
const setupSocket = require('./socket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const rateLimit = require('express-rate-limit');

// CORS: allow comma-separated FRONTEND_URL in production, anything in dev.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length === 0
    ? true // dev: allow all (local Vite dev server)
    : (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
      },
  credentials: true
}));

// Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes)
  message: { error: 'Quá nhiều request từ IP này, vui lòng thử lại sau.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window` for sensitive routes
  message: { error: 'Đã đạt giới hạn request cho chức năng này, vui lòng thử lại sau.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
// Apply strict limiter to specific sensitive routes
app.use('/api/auth/login', strictLimiter);
app.use('/api/files/upload', strictLimiter);
app.use('/api/ai/classify', strictLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files (local fallback storage)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api', channelRoutes);
app.use('/api', roomFileRoutes);
app.use('/api', peerpointRoutes);
app.use('/api/quiz', quizRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length === 0 ? true : allowedOrigins,
    credentials: true
  }
});
setupSocket(io);

// Global Error Handler for uncaught middleware errors (e.g. Multer)
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const startServer = async () => {
  try {
    await healthcheck();
    console.log('✅ Supabase connected');
  } catch (err) {
    console.error(`❌ Supabase Error: ${err.message}`);
    console.error('   Did you run server/config/supabase-schema.sql in the Supabase SQL editor?');
    process.exit(1);
  }
  server.listen(PORT, () => {
    console.log(`🚀 PeerNoted Server running on http://localhost:${PORT}`);
  });
};

startServer();
