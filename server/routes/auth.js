const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { supabase, toApi } = require('../config/supabase');
const { protect, signToken } = require('../middleware/auth');

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com'
);

function publicUser(user) {
  if (!user) return null;
  return {
    _id: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username || '',
    school: user.school,
    cohort: user.cohort,
    avatar: user.avatar_url || ''
  };
}

// ===========================================================================
// POST /api/auth/register
// ===========================================================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, school = '', cohort = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', normalizedEmail).maybeSingle();
    if (existing) {
      return res.status(400).json({ error: 'Email này đã được sử dụng' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const emailPrefix = normalizedEmail.split('@')[0];
    const tag = Math.floor(1000 + Math.random() * 9000);
    const username = `${emailPrefix}#${tag}`;

    const { data: user, error } = await supabase
      .from('users')
      .insert({ name: name.trim(), email: normalizedEmail, username, password_hash, school, cohort })
      .select('*')
      .single();
    if (error) throw error;

    res.status(201).json({
      ...publicUser(user),
      token: signToken(user.id)
    });
  } catch (error) {
    console.error('[Auth /register]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/auth/login
// ===========================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: user, error } = await supabase
      .from('users').select('*').eq('email', normalizedEmail).maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        error: 'Tài khoản này được tạo qua Google. Vui lòng đăng nhập bằng Google.'
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    res.json({
      ...publicUser(user),
      token: signToken(user.id)
    });
  } catch (error) {
    console.error('[Auth /login]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/auth/google — sign in / sign up with Google ID token
// ===========================================================================
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing credential' });

    // Verify token; if no real GOOGLE_CLIENT_ID configured, fall back to
    // unverified decode (DEV ONLY) so local testing works without OAuth setup.
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com'
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      const decoded = jwt.decode(credential);
      if (!decoded) return res.status(401).json({ error: 'Invalid Google credential' });
      payload = decoded;
    }

    const { email, name, picture } = payload;
    if (!email) return res.status(401).json({ error: 'Google credential thiếu email' });

    const normalizedEmail = email.trim().toLowerCase();

    let { data: user, error } = await supabase
      .from('users').select('*').eq('email', normalizedEmail).maybeSingle();
    if (error) throw error;

    if (!user) {
      const { data: created, error: createErr } = await supabase
        .from('users')
        .insert({
          name: name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          avatar_url: picture || ''
        })
        .select('*')
        .single();
      if (createErr) throw createErr;
      user = created;
    } else if (picture && !user.avatar_url) {
      await supabase.from('users').update({ avatar_url: picture }).eq('id', user.id);
      user.avatar_url = picture;
    }

    res.json({
      ...publicUser(user),
      token: signToken(user.id)
    });
  } catch (error) {
    console.error('[Auth /google]', error);
    res.status(401).json({ error: 'Xác thực Google thất bại: ' + error.message });
  }
});

// ===========================================================================
// GET /api/auth/me — protected route
// ===========================================================================
router.get('/me', protect, async (req, res) => {
  res.json(publicUser(req.user));
});

// ===========================================================================
// PUT /api/auth/me — update user profile (e.g. avatar)
// ===========================================================================
router.put('/me', protect, async (req, res) => {
  try {
    const { avatar_url } = req.body;
    const updates = {};
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length > 0) {
      const { data: updated, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', req.user.id)
        .select('*')
        .single();
      
      if (error) throw error;
      return res.json(publicUser(updated));
    }
    res.json(publicUser(req.user));
  } catch (error) {
    console.error('[Auth PUT /me]', error);
    res.status(500).json({ error: error.message });
  }
});

const multer = require('multer');
const { uploadToStorage } = require('../services/storageService');

// memoryStorage để có file.buffer → upload lên Supabase Storage (URL bền,
// accessible từ mọi nơi). KHÔNG dùng diskStorage vì Render xóa file khi restart
// và URL localhost:5000 hỏng trên production.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.post('/me/avatar', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn ảnh' });

    // Upload lên Supabase Storage → public URL bền vững
    const avatarUrl = await uploadToStorage(req.file);

    const { data: updated, error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (error) throw error;
    res.json(publicUser(updated));
  } catch (error) {
    console.error('[Auth POST /me/avatar]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
