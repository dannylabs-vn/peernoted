const express = require('express');
const router = express.Router();
const { supabase, toApi, toApiList } = require('../config/supabase');

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const DOC_TYPES = ['docx', 'doc', 'txt'];

async function countFilesByType(folderId) {
  const { data, error } = await supabase
    .from('files')
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
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const enriched = await Promise.all(
      data.map(async (folder) => {
        const counts = await countFilesByType(folder.id);
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
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Folder not found' });
    const counts = await countFilesByType(data.id);
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
    const { data, error } = await supabase
      .from('folders')
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
    const { data, error } = await supabase
      .from('folders')
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

// DELETE folder + its files (cascade handled by FK on delete cascade)
router.delete('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('folders')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Folder not found' });
    res.json({ message: 'Folder and its files deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
