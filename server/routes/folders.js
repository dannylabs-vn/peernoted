const express = require('express');
const router = express.Router();
const { supabase, toApi, toApiList } = require('../config/supabase');
const { deleteFromStorage } = require('../services/storageService');

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const DOC_TYPES = ['docx', 'doc', 'txt'];

async function countFilesByType(client, folderId) {
  const { data, error } = await client.from('files')
    .select('file_type')
    .eq('folder_id', folderId);
  if (error) throw error;

  const total = data.length;
  let pdf = 0, image = 0, doc = 0;
  for (const f of data) {
    if (f.file_type === 'pdf') pdf++;
    else if (IMAGE_TYPES.includes(f.file_type)) image++;
    else if (DOC_TYPES.includes(f.file_type)) doc++;
  }
  return { fileCount: total, pdfCount: pdf, imageCount: image, docCount: doc };
}

// GET all folders
router.get('/', async (req, res) => {
  try {
    const { data, error } = await (req.supabase || supabase).from('folders')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const enriched = await Promise.all(
      data.map(async (folder) => {
        const counts = await countFilesByType(req.supabase || supabase, folder.id);
        return { ...toApi(folder), ...counts };
      })
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single folder
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await (req.supabase || supabase).from('folders')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Folder not found' });
    const counts = await countFilesByType(req.supabase || supabase, data.id);
    res.json({ ...toApi(data), ...counts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create folder
router.post('/', async (req, res) => {
  try {
    const { name, subject = '', chapter = '', grade = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { data, error } = await (req.supabase || supabase).from('folders')
      .insert({ name, subject, chapter, grade })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(toApi(data));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update folder
router.put('/:id', async (req, res) => {
  try {
    const { name, subject, chapter, grade } = req.body;
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (subject !== undefined) patch.subject = subject;
    if (chapter !== undefined) patch.chapter = chapter;
    if (grade !== undefined) patch.grade = grade;
    const { data, error } = await (req.supabase || supabase).from('folders')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Folder not found' });
    res.json(toApi(data));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE folder — xóa hết files trước, sau đó xóa folder
router.delete('/:id', async (req, res) => {
  try {
    const folderId = req.params.id;

    // 1. Xóa hết files trong folder (kèm cleanup storage)
    const { data: files, error: fileErr } = await (req.supabase || supabase).from('files')
      .delete()
      .eq('folder_id', folderId)
      .select('*');
    if (fileErr) throw fileErr;

    for (const file of files || []) {
      if (file.storage_url) {
        try { await deleteFromStorage(file.storage_url); } catch (e) { /* ignore */ }
      }
    }

    // 2. Xóa folder
    const { data, error } = await (req.supabase || supabase).from('folders')
      .delete()
      .eq('id', folderId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Folder not found' });

    res.json({ message: 'Folder and its files deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST delete multiple folders (batch) — xóa hết files trước, sau đó xóa folders
router.post('/delete-batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }

    // 1. Xóa hết files trong các folder
    const { data: files, error: fileErr } = await (req.supabase || supabase).from('files')
      .delete()
      .in('folder_id', ids)
      .select('*');
    if (fileErr) throw fileErr;

    for (const file of files || []) {
      if (file.storage_url) {
        try { await deleteFromStorage(file.storage_url); } catch (e) { /* ignore */ }
      }
    }

    // 2. Xóa các folders
    const { data, error } = await (req.supabase || supabase).from('folders')
      .delete()
      .in('id', ids)
      .select('id');
    if (error) throw error;

    res.json({ message: `${data?.length || 0} folders deleted`, deleted: data?.length || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
