const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const File = require('../models/File');

// GET all folders
router.get('/', async (req, res) => {
  try {
    const folders = await Folder.find().sort({ updatedAt: -1 });
    // Attach total and category-specific file counts for each folder
    const foldersWithCount = await Promise.all(
      folders.map(async (folder) => {
        const fileCount = await File.countDocuments({ folder_id: folder._id });
        const pdfCount = await File.countDocuments({ 
          folder_id: folder._id, 
          file_type: 'pdf' 
        });
        const imageCount = await File.countDocuments({ 
          folder_id: folder._id, 
          file_type: { $in: ['jpg', 'jpeg', 'png', 'gif', 'webp'] } 
        });
        const docCount = await File.countDocuments({ 
          folder_id: folder._id, 
          file_type: { $in: ['docx', 'doc', 'txt'] } 
        });
        return { 
          ...folder.toObject(), 
          fileCount,
          pdfCount,
          imageCount,
          docCount
        };
      })
    );
    res.json(foldersWithCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single folder
router.get('/:id', async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    const fileCount = await File.countDocuments({ folder_id: folder._id });
    const pdfCount = await File.countDocuments({ 
      folder_id: folder._id, 
      file_type: 'pdf' 
    });
    const imageCount = await File.countDocuments({ 
      folder_id: folder._id, 
      file_type: { $in: ['jpg', 'jpeg', 'png', 'gif', 'webp'] } 
    });
    const docCount = await File.countDocuments({ 
      folder_id: folder._id, 
      file_type: { $in: ['docx', 'doc', 'txt'] } 
    });
    res.json({ 
      ...folder.toObject(), 
      fileCount,
      pdfCount,
      imageCount,
      docCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create folder
router.post('/', async (req, res) => {
  try {
    const { name, subject, chapter, grade } = req.body;
    const folder = new Folder({ name, subject, chapter, grade });
    await folder.save();
    res.status(201).json(folder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update folder
router.put('/:id', async (req, res) => {
  try {
    const { name, subject, chapter, grade } = req.body;
    const folder = await Folder.findByIdAndUpdate(
      req.params.id,
      { name, subject, chapter, grade },
      { new: true, runValidators: true }
    );
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.json(folder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE folder + all files inside
router.delete('/:id', async (req, res) => {
  try {
    const folder = await Folder.findByIdAndDelete(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    await File.deleteMany({ folder_id: req.params.id });
    res.json({ message: 'Folder and its files deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
