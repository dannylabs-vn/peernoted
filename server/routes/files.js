const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase, toApi, toApiList } = require('../config/supabase');
const { uploadToStorage, deleteFromStorage } = require('../services/storageService');
const { fixLatin1Name } = require('../utils/encoding');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// GET files by folder
router.get('/', async (req, res) => {
  try {
    const { folder_id } = req.query;
    
    // Ignore invalid folder IDs from old MongoDB data
    if (folder_id === 'undefined' || folder_id === 'null') {
      return res.json([]);
    }

    let query = (req.supabase || supabase).from('files').select('*').order('created_at', { ascending: false });
    
    if (folder_id) {
      // Basic UUID format check to avoid Postgres 22P02 errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(folder_id)) {
        return res.json([]);
      }
      query = query.eq('folder_id', folder_id);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('[Files GET] Supabase error:', error);
      return res.json([]);
    }
    res.json(toApiList(data));
  } catch (error) {
    console.error('[Files GET] Exception:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST upload file(s) to a specific folder
router.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    const { folder_id } = req.body;
    if (!folder_id) return res.status(400).json({ error: 'folder_id is required' });

    const { data: folder, error: fErr } = await (req.supabase || supabase).from('folders').select('id').eq('id', folder_id).maybeSingle();
    if (fErr) throw fErr;
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    const savedFiles = [];

    for (const file of req.files) {
      const storageUrl = await uploadToStorage(file);
      const ext = file.originalname.split('.').pop().toLowerCase();
      const originalNameUtf8 = fixLatin1Name(file.originalname);

      const { data, error } = await (req.supabase || supabase).from('files')
        .insert({
          folder_id,
          original_name: originalNameUtf8,
          storage_url: storageUrl,
          file_type: ext,
          file_size: file.size
        })
        .select('*')
        .single();
      if (error) throw error;
      savedFiles.push(toApi(data));
    }

    res.status(201).json(savedFiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE file
router.delete('/:id', async (req, res) => {
  try {
    const { data, error } = await (req.supabase || supabase).from('files')
      .delete()
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'File not found' });

    if (data.storage_url) {
      try { await deleteFromStorage(data.storage_url); } catch (e) { /* ignore */ }
    }
    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST delete multiple files (batch)
router.post('/delete-batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }

    const { data, error } = await (req.supabase || supabase).from('files')
      .delete()
      .in('id', ids)
      .select('*');
    if (error) throw error;

    // Clean up storage for each file
    for (const file of data || []) {
      if (file.storage_url) {
        try { await deleteFromStorage(file.storage_url); } catch (e) { /* ignore */ }
      }
    }

    res.json({ message: `${data?.length || 0} files deleted`, deleted: data?.length || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
