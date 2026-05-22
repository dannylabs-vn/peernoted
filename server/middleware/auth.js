const jwt = require('jsonwebtoken');
const { supabase, toApi } = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Không có token, từ chối truy cập' });
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, school, cohort, avatar_url, created_at, updated_at')
      .eq('id', decoded.id)
      .maybeSingle();
    if (error) throw error;
    if (!user) return res.status(401).json({ error: 'Người dùng không tồn tại' });
    req.user = toApi(user);
    next();
  } catch (err) {
    console.error('[Auth] verify error:', err.message);
    res.status(401).json({ error: 'Token không hợp lệ hoặc hết hạn' });
  }
}

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { protect, signToken };
