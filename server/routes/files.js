const express = require('express');
const router = express.Router();
const multer = require('multer');
const File = require('../models/File');
const Folder = require('../models/Folder');
const { uploadToStorage, deleteFromStorage } = require('../services/storageService');

// Multer config - store in memory for processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// GET files by folder
router.get('/', async (req, res) => {
  try {
    const { folder_id } = req.query;
    const filter = folder_id ? { folder_id } : {};
    const files = await File.find(filter).sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST upload file(s) to a specific folder
router.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    const { folder_id } = req.body;
    if (!folder_id) return res.status(400).json({ error: 'folder_id is required' });

    const folder = await Folder.findById(folder_id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    const savedFiles = [];

    for (const file of req.files) {
      // Upload to cloud storage
      const storageUrl = await uploadToStorage(file);

      const ext = file.originalname.split('.').pop().toLowerCase();
      
      // Correct Latin-1 encoding issues in multer originalname
      const originalNameUtf8 = /[\u0080-\u00ff]/.test(file.originalname)
        ? Buffer.from(file.originalname, 'latin1').toString('utf8')
        : file.originalname;

      const newFile = new File({
        folder_id,
        original_name: originalNameUtf8,
        storage_url: storageUrl,
        file_type: ext,
        file_size: file.size
      });

      await newFile.save();
      savedFiles.push(newFile);
    }

    res.status(201).json(savedFiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE file
router.delete('/:id', async (req, res) => {
  try {
    const file = await File.findByIdAndDelete(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Try to delete from storage too
    if (file.storage_url) {
      try { await deleteFromStorage(file.storage_url); } catch (e) { /* ignore */ }
    }

    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
