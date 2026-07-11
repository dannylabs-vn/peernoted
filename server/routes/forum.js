const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase, toApi, toApiList } = require('../config/supabase');
const { protect } = require('../middleware/auth');
const { uploadToStorage } = require('../services/storageService');
const { fixLatin1Name } = require('../utils/encoding');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// GET /api/forum/posts — danh sách tài liệu chia sẻ (kèm tên người đăng)
router.get('/posts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*, users:user_id(id, name, avatar_url, school)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    const posts = (data || []).map(p => ({
      ...toApi(p),
      author: p.users?.name || 'Ẩn danh',
      author_avatar: p.users?.avatar_url || '',
      author_school: p.users?.school || p.school || ''
    }));
    res.json(posts);
  } catch (error) {
    console.error('[Forum GET /posts]', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/forum/posts — đăng tài liệu (upload file lên Supabase Storage)
router.post('/posts', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, description = '', category = 'Tài liệu', school = '' } = req.body;
    if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề' });

    let file_url = '', file_name = '', file_type = '', file_size = 0;
    if (req.file) {
      file_url = await uploadToStorage(req.file);
      file_name = fixLatin1Name(req.file.originalname);
      file_type = (file_name.split('.').pop() || '').toLowerCase();
      file_size = req.file.size;
    }

    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: req.user.id,
        title, description, category,
        school: school || req.user.school || '',
        file_url, file_name, file_type, file_size
      })
      .select('*, users:user_id(id, name, avatar_url, school)')
      .single();
    if (error) throw error;

    // Thưởng PeerPoint khi đóng góp tài liệu (best-effort)
    try {
      const { data: m } = await supabase.from('room_members')
        .select('id, peer_points').eq('user_id', req.user.id).limit(1).maybeSingle();
      if (m) await supabase.from('room_members')
        .update({ peer_points: (m.peer_points || 0) + 10 }).eq('id', m.id);
    } catch (e) { /* ignore */ }

    res.status(201).json({
      ...toApi(data),
      author: data.users?.name || 'Bạn',
      author_avatar: data.users?.avatar_url || '',
      author_school: data.users?.school || ''
    });
  } catch (error) {
    console.error('[Forum POST /posts]', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/forum/posts/:id/download — tăng bộ đếm tải xuống, trả file_url
router.post('/posts/:id/download', async (req, res) => {
  try {
    const { data: post } = await supabase
      .from('forum_posts').select('id, downloads, file_url, file_name').eq('id', req.params.id).maybeSingle();
    if (!post) return res.status(404).json({ error: 'Không tìm thấy tài liệu' });
    await supabase.from('forum_posts')
      .update({ downloads: (post.downloads || 0) + 1 }).eq('id', post.id);
    res.json({ file_url: post.file_url, file_name: post.file_name, downloads: (post.downloads || 0) + 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/forum/posts/:id/like — like/unlike đơn giản (tăng đếm)
router.post('/posts/:id/like', protect, async (req, res) => {
  try {
    const { data: post } = await supabase
      .from('forum_posts').select('id, likes').eq('id', req.params.id).maybeSingle();
    if (!post) return res.status(404).json({ error: 'Không tìm thấy' });
    await supabase.from('forum_posts')
      .update({ likes: (post.likes || 0) + 1 }).eq('id', post.id);
    res.json({ likes: (post.likes || 0) + 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/forum/posts/:id — xóa (chỉ chủ post)
router.delete('/posts/:id', protect, async (req, res) => {
  try {
    const { data: post } = await supabase
      .from('forum_posts').select('id, user_id').eq('id', req.params.id).maybeSingle();
    if (!post) return res.status(404).json({ error: 'Không tìm thấy' });
    if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Không có quyền xóa' });
    await supabase.from('forum_posts').delete().eq('id', post.id);
    res.json({ message: 'Đã xóa' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
