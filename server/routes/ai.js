const express = require('express');
const router = express.Router();
const multer = require('multer');
const Folder = require('../models/Folder');
const File = require('../models/File');
const { classifyFromText, classifyFromImage, generateCheatSheet, generatePodcastScript, generateResourceRecommendations } = require('../services/aiService');
const { extractText, isImageType, getImageMimeType } = require('../services/extractorService');
const { uploadToStorage } = require('../services/storageService');
const { generatePodcastAudio } = require('../services/ttsService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 * POST /api/ai/classify
 * Upload + AI auto-classify files into folders
 */
router.post('/classify', upload.array('files', 20), async (req, res) => {
  try {
    const results = [];

    for (const file of req.files) {
      // Correct Latin-1 encoding issues in multer originalname
      const originalNameUtf8 = /[\u0080-\u00ff]/.test(file.originalname)
        ? Buffer.from(file.originalname, 'latin1').toString('utf8')
        : file.originalname;

      const ext = originalNameUtf8.split('.').pop().toLowerCase();

      // Retrieve existing folders with unique tags of files inside them to act as classification context
      const folders = await Folder.find({});
      const foldersWithTags = [];
      for (const f of folders) {
        const filesInFolder = await File.find({ folder_id: f._id }, 'ai_tags');
        const uniqueTags = [...new Set(filesInFolder.flatMap(fi => fi.ai_tags || []))];
        foldersWithTags.push({
          folder_name: f.name,
          subject: f.subject,
          chapter: f.chapter,
          grade: f.grade,
          tags: uniqueTags
        });
      }

      let classification;

      if (isImageType(ext)) {
        // Classify image directly via Gemini vision with existing folders context
        classification = await classifyFromImage(file.buffer, getImageMimeType(ext), foldersWithTags);
      } else {
        // Extract text first, then classify
        const text = await extractText(file.buffer, ext);
        if (!text || text.trim().length < 10) {
          // If text extraction failed or too short, skip AI
          classification = {
            subject: 'Chưa phân loại',
            chapter: '',
            grade: '',
            folder_name: 'Chưa phân loại',
            summary: `File ${originalNameUtf8} không thể trích xuất nội dung`,
            tags: []
          };
        } else {
          classification = await classifyFromText(text, foldersWithTags, originalNameUtf8);
        }
      }

      // Find folder case-insensitively to prevent duplicates and align metadata casing
      let folder = await Folder.findOne({
        name: { $regex: new RegExp(`^${classification.folder_name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
      });

      if (folder) {
        // Align name and metadata casing with the existing folder record
        classification.folder_name = folder.name;
        classification.subject = folder.subject;
        classification.chapter = folder.chapter;
        classification.grade = folder.grade;
      } else {
        folder = new Folder({
          name: classification.folder_name,
          subject: classification.subject,
          chapter: classification.chapter,
          grade: classification.grade
        });
        await folder.save();
      }

      // Upload file to storage
      const storageUrl = await uploadToStorage(file);

      // Extract text for storage (for cheat sheet / podcast later)
      let extractedText = '';
      if (!isImageType(ext)) {
        extractedText = await extractText(file.buffer, ext) || '';
      }

      // Save file record
      const newFile = new File({
        folder_id: folder._id,
        original_name: originalNameUtf8,
        storage_url: storageUrl,
        file_type: ext,
        file_size: file.size,
        extracted_text: extractedText,
        ai_summary: classification.summary,
        ai_tags: classification.tags
      });
      await newFile.save();

      results.push({
        file: newFile,
        folder: folder,
        classification
      });
    }

    res.json({ results });
  } catch (error) {
    console.error('Classify error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/cheatsheet/:folderId
 * Generate or return cached cheat sheet
 */
router.get('/cheatsheet/:folderId', async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    // Cache check
    if (folder.cheat_sheet_markdown) {
      return res.json({
        markdown: folder.cheat_sheet_markdown,
        cached: true
      });
    }

    // Gather all texts from files in this folder
    const files = await File.find({ folder_id: folder._id });
    const allTexts = files
      .map(f => f.extracted_text)
      .filter(t => t && t.trim().length > 0)
      .join('\n\n---\n\n');

    if (!allTexts || allTexts.trim().length < 20) {
      return res.status(400).json({
        error: 'Không đủ nội dung văn bản trong thư mục này để tạo phao cứu cấp'
      });
    }

    // Generate with AI
    const markdown = await generateCheatSheet(allTexts, folder.name);

    // Cache it
    folder.cheat_sheet_markdown = markdown;
    await folder.save();

    res.json({ markdown, cached: false });
  } catch (error) {
    console.error('Cheat sheet error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/podcast/:folderId
 * Generate podcast script + audio
 */
router.post('/podcast/:folderId', async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    // Cache check - if podcast already exists
    if (folder.podcast_audio_url && folder.podcast_script && folder.podcast_script.length > 0) {
      return res.json({
        script: folder.podcast_script,
        audio_url: folder.podcast_audio_url,
        cached: true
      });
    }

    // Get text from all files in folder
    const files = await File.find({ folder_id: req.params.folderId });
    const allTexts = files.map(f => f.extracted_text).join('\n\n');

    if (!allTexts || allTexts.trim().length < 20) {
      return res.status(400).json({
        error: 'Không đủ nội dung văn bản để tạo podcast'
      });
    }

    // Generate script with AI
    const script = await generatePodcastScript(allTexts, folder.name);

    // Try to generate audio (may fail if TTS not configured)
    let audioUrl = null;
    try {
      audioUrl = await generatePodcastAudio(script);
    } catch (e) {
      console.log('TTS generation skipped:', e.message);
    }

    // Cache results
    folder.podcast_script = script;
    folder.podcast_audio_url = audioUrl || '';
    await folder.save();

    res.json({
      script,
      audio_url: audioUrl,
      cached: false
    });
  } catch (error) {
    console.error('Podcast error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/ai/cheatsheet/:folderId
 * Clear cached cheat sheet (to regenerate)
 */
router.delete('/cheatsheet/:folderId', async (req, res) => {
  try {
    await Folder.findByIdAndUpdate(req.params.folderId, { cheat_sheet_markdown: '' });
    res.json({ message: 'Cheat sheet cache cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/ai/podcast/:folderId
 * Clear cached podcast (to regenerate)
 */
router.delete('/podcast/:folderId', async (req, res) => {
  try {
    await Folder.findByIdAndUpdate(req.params.folderId, {
      podcast_script: [],
      podcast_audio_url: ''
    });
    res.json({ message: 'Podcast cache cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/recommend/:folderId
 * Generate learning resource recommendations based on folder content
 */
router.post('/recommend/:folderId', async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    // Gather all texts from files in this folder
    const files = await File.find({ folder_id: folder._id });
    const allTexts = files
      .map(f => f.extracted_text)
      .filter(t => t && t.trim().length > 0)
      .join('\n\n---\n\n');

    if (!allTexts || allTexts.trim().length < 20) {
      return res.status(400).json({
        error: 'Không đủ nội dung văn bản để tạo gợi ý tài nguyên học tập'
      });
    }

    // Generate recommendations with AI
    const recommendations = await generateResourceRecommendations(allTexts, folder.name);

    res.json({
      recommendations,
      folder_name: folder.name,
      folder_subject: folder.subject
    });
  } catch (error) {
    console.error('Recommend error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/ai/podcast-all
 * Clear ALL cached podcasts across all files (utility for re-generating with new TTS engine)
 */
router.delete('/podcast-all', async (req, res) => {
  try {
    const result = await File.updateMany(
      { $or: [{ podcast_audio_url: { $ne: '' } }, { 'podcast_script.0': { $exists: true } }] },
      { podcast_script: [], podcast_audio_url: '' }
    );
    res.json({ message: `Cleared podcast cache for ${result.modifiedCount} file(s)` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
