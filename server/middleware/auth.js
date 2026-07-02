const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { supabase, toApi } = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

const supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '') : '';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Không có token, từ chối truy cập' });
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, username, school, cohort, avatar_url, created_at, updated_at')
      .eq('id', decoded.id || decoded.sub)
      .maybeSingle();
      
    // Fallback if 'username' column doesn't exist yet
    if (error && error.message && error.message.includes('username')) {
      const fallback = await supabase
        .from('users')
        .select('id, name, email, school, cohort, avatar_url, created_at, updated_at')
        .eq('id', decoded.id || decoded.sub)
        .maybeSingle();
      user = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    if (!user) return res.status(401).json({ error: 'Người dùng không tồn tại' });
    
    req.user = toApi(user);
    req.token = token;
    
    // Create a user-specific Supabase client that injects the user's JWT
    // This allows RLS to work on behalf of the user
    if (supabaseUrl && supabaseKey) {
      req.supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: { persistSession: false }
      });
    } else {
      req.supabase = supabase; // fallback
    }

    next();
  } catch (err) {
    console.error('[Auth] verify error:', err.message);
    res.status(401).json({ error: 'Token không hợp lệ hoặc hết hạn' });
  }
}

function signToken(userId) {
  // Sign JWT with 'sub' and 'role' claims for Supabase compatibility
  return jwt.sign({ sub: userId, role: 'authenticated', id: userId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { protect, signToken };
