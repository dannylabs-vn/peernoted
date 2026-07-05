const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { supabase, toApi, toApiList } = require('../config/supabase');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const { getFiles, saveFile, deleteFile } = require('../dataStore');

let fileTypeFromFile;
(async () => {
  const fileType = await import('file-type');
  fileTypeFromFile = fileType.fileTypeFromFile;
})();

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `room_${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ===========================================================================
// POST /api/rooms/:roomId/files — Upload file to room
// ===========================================================================

// Auto-award PeerPoints khi đóng góp tài liệu cho phòng (best-effort, không chặn response)
async function awardUploadPoints(roomId, userId, points = 5) {
  try {
    const { data: member } = await supabase.from('room_members')
      .select('id, peer_points').eq('room_id', roomId).eq('user_id', userId).maybeSingle();
    if (member) {
      await supabase.from('room_members')
        .update({ peer_points: (member.peer_points || 0) + points })
        .eq('id', member.id);
    }
  } catch (e) { console.warn('[Award upload]', e.message); }
}

router.post('/rooms/:roomId/files', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Vui long chon file' });

    if (fileTypeFromFile) {
      const typeInfo = await fileTypeFromFile(req.file.path);
      const dangerousMimes = ['application/x-msdownload', 'application/x-dosexec', 'application/x-executable', 'application/x-sh', 'application/x-bat'];
      if (typeInfo && dangerousMimes.includes(typeInfo.mime)) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Định dạng file không an toàn' });
      }
    }

    const { channel_id } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;

    const fileObj = {
      room_id: req.params.roomId,
      channel_id: channel_id || null,
      uploaded_by: req.user.id,
      original_name: req.file.originalname,
      storage_url: fileUrl,
      file_type: req.file.mimetype || path.extname(req.file.originalname).slice(1),
      file_size: req.file.size,
      source_type: 'upload'
    };

    let { data: roomFile, error } = await (req.supabase || supabase).from('room_files')
      .insert(fileObj)
      .select('*')
      .single();

    if (error) {
      if (error.message && (error.message.includes('relation "public.room_files" does not exist') || error.message.includes('Could not find the table \'public.room_files\''))) {
        roomFile = {
          id: uuidv4(),
          ...fileObj,
          created_at: new Date().toISOString()
        };
        saveFile(roomFile);
      } else {
        throw error;
      }
    }
    awardUploadPoints(req.params.roomId, req.user.id, 5);
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
    let { data: files, error } = await (req.supabase || supabase).from('room_files')
      .select('*, uploader:uploaded_by(id, name, avatar_url)')
      .eq('room_id', req.params.roomId)
      .order('created_at', { ascending: false });

    let dbFiles = files || [];
    if (error) {
      if (error.message && (error.message.includes('relation "public.room_files" does not exist') || error.message.includes('Could not find the table \'public.room_files\''))) {
        dbFiles = [];
      } else {
        throw error;
      }
    }

    const localFiles = getFiles().filter(f => f.room_id === req.params.roomId);
    if (localFiles.length > 0) {
      dbFiles = [...dbFiles, ...localFiles];
      const seen = new Set();
      dbFiles = dbFiles.filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      dbFiles.sort((a,b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
    }

    res.json(dbFiles.map(f => ({
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
    const { data: member } = await (req.supabase || supabase).from('room_members')
      .select('role')
      .eq('room_id', req.params.roomId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    const { data: file } = await (req.supabase || supabase).from('room_files')
      .select('uploaded_by')
      .eq('id', req.params.fileId)
      .maybeSingle();

    const canDelete = member && (member.role === 'owner' || member.role === 'admin' || (file && file.uploaded_by === req.user.id));
    // If not found in DB but found in local dataStore, we assume they can delete it if they uploaded it
    if (!file) {
      const localFiles = getFiles();
      const localFile = localFiles.find(f => f.id === req.params.fileId);
      if (localFile) {
        if (member && (member.role === 'owner' || member.role === 'admin' || localFile.uploaded_by === req.user.id)) {
          deleteFile(req.params.fileId);
          return res.json({ success: true });
        } else {
          return res.status(403).json({ error: 'Ban khong co quyen xoa file nay' });
        }
      }
      return res.status(404).json({ error: 'Khong tim thay file' });
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'Ban khong co quyen xoa file nay' });
    }

    const { error } = await (req.supabase || supabase).from('room_files')
      .delete()
      .eq('id', req.params.fileId);

    if (error && !error.message.includes('does not exist')) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[RoomFiles /delete]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
