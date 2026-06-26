const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { supabase, toApi, toApiList } = require('../config/supabase');
const { protect } = require('../middleware/auth');
const multer = require('multer');

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `room_${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// ===========================================================================
// POST /api/rooms/:roomId/files — Upload file to room
// ===========================================================================
router.post('/rooms/:roomId/files', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Vui long chon file' });

    const { channel_id } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;

    const { data: roomFile, error } = await supabase
      .from('room_files')
      .insert({
        room_id: req.params.roomId,
        channel_id: channel_id || null,
        uploaded_by: req.user.id,
        original_name: req.file.originalname,
        storage_url: fileUrl,
        file_type: req.file.mimetype || path.extname(req.file.originalname).slice(1),
        file_size: req.file.size,
        source_type: 'upload'
      })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(toApi(roomFile));
  } catch (error) {
    console.error('[RoomFiles /upload]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// GET /api/rooms/:roomId/files — List files in room
// ===========================================================================
router.get('/rooms/:roomId/files', protect, async (req, res) => {
  try {
    const { data: files } = await supabase
      .from('room_files')
      .select('*, uploader:uploaded_by(id, name, avatar_url)')
      .eq('room_id', req.params.roomId)
      .order('created_at', { ascending: false });

    res.json((files || []).map(f => ({
      ...toApi(f),
      uploader: f.uploader ? {
        _id: f.uploader.id,
        name: f.uploader.name,
        avatar: f.uploader.avatar_url || ''
      } : null
    })));
  } catch (error) {
    console.error('[RoomFiles /list]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// DELETE /api/rooms/:roomId/files/:fileId — Delete file from room
// ===========================================================================
router.delete('/rooms/:roomId/files/:fileId', protect, async (req, res) => {
  try {
    // Check permission: file uploader or room owner/admin
    const { data: member } = await supabase
      .from('room_members')
      .select('role')
      .eq('room_id', req.params.roomId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    const { data: file } = await supabase
      .from('room_files')
      .select('uploaded_by')
      .eq('id', req.params.fileId)
      .maybeSingle();

    if (!file) return res.status(404).json({ error: 'Khong tim thay file' });

    const canDelete = member && (member.role === 'owner' || member.role === 'admin' || file.uploaded_by === req.user.id);
    if (!canDelete) {
      return res.status(403).json({ error: 'Ban khong co quyen xoa file nay' });
    }

    const { error } = await supabase
      .from('room_files')
      .delete()
      .eq('id', req.params.fileId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[RoomFiles /delete]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
