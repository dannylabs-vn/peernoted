const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { healthcheck } = require('./config/supabase');
const authRoutes = require('./routes/auth');
const folderRoutes = require('./routes/folders');
const fileRoutes = require('./routes/files');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files (local fallback storage)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  app.listen(PORT, () => {
    console.log(`🚀 PeerNoted Server running on http://localhost:${PORT}`);
  });
};

startServer();
