const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase, toApi } = require('../config/supabase');
const { protect } = require('../middleware/auth');
const {
  classifyFromText,
  classifyFromImage,
  generateCheatSheet,
  migrateMarkdownToJson,
  generatePodcastScript,
  analyzeHandwriting,
  generateResourceRecommendations
} = require('../services/aiService');
const { extractText, isImageType, getImageMimeType } = require('../services/extractorService');
const { uploadToStorage } = require('../services/storageService');
const { generatePodcastAudio } = require('../services/ttsService');
const { fixLatin1Name } = require('../utils/encoding');
let fileTypeFromBuffer;
(async () => {
  const fileType = await import('file-type');
  fileTypeFromBuffer = fileType.fileTypeFromBuffer;
})();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const handwritingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const VALID_TEMPLATES = ['academic-blue', 'modern-card', 'sketch-notebook', 'minimalist'];

async function getFolderOr404(id, res) {
  const { data, error } = await (req.supabase || supabase).from('folders').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) {
    res.status(404).json({ error: 'Folder not found' });
    return null;
  }
  return data;
}

// Detect text that's just page markers (image-based PDFs extracted via pdf-parse
// often produce nothing but "-- N of M --" lines). Returns false if the text
// looks like extraction garbage.
function isMeaningfulText(text) {
  if (!text) return false;
  // Strip common page-marker patterns and whitespace
  const stripped = text
    .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
    .replace(/page\s*\d+(\s*of\s*\d+)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length < 30) return false;
  // Require at least a few "real" words (3+ letters) — pages of "1 2 3 ..." wouldn't pass
  const wordHits = stripped.match(/[A-Za-zÀ-ỹ]{3,}/g) || [];
  return wordHits.length >= 5;
}

async function getAllTextsForFolder(folderId) {
  const { data, error } = await (req.supabase || supabase).from('files')
    .select('extracted_text')
    .eq('folder_id', folderId);
  if (error) throw error;
  return data
    .map(f => f.extracted_text)
    .filter(t => t && t.trim().length > 0)
    .join('\n\n---\n\n');
}

// ===========================================================================
// POST /api/ai/classify — upload + auto-classify into folders
// ===========================================================================
router.post('/classify', upload.array('files', 20), async (req, res) => {
  try {
    const results = [];

    for (const file of req.files) {
      // Magic Number Check
      if (fileTypeFromBuffer) {
        const typeInfo = await fileTypeFromBuffer(file.buffer);
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (typeInfo) {
          const safeMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp'];
          if (!safeMimes.includes(typeInfo.mime)) {
             throw new Error(`Định dạng file không an toàn: ${typeInfo.mime}`);
          }
        } else if (ext !== 'txt') {
          throw new Error('Không thể xác định định dạng file hoặc file không được hỗ trợ');
        }
      }

      const originalNameUtf8 = fixLatin1Name(file.originalname);
      const ext = originalNameUtf8.split('.').pop().toLowerCase();

      // Build folders context for AI
      const { data: folders, error: foldersErr } = await (req.supabase || supabase).from('folders').select('*');
      if (foldersErr) throw foldersErr;

      const foldersWithTags = [];
      for (const f of folders) {
        const { data: filesInFolder } = await (req.supabase || supabase).from('files').select('ai_tags').eq('folder_id', f.id);
        const uniqueTags = [...new Set((filesInFolder || []).flatMap(fi => fi.ai_tags || []))];
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
        classification = await classifyFromImage(file.buffer, getImageMimeType(ext), foldersWithTags, originalNameUtf8);
      } else {
        const text = await extractText(file.buffer, ext);
        const meaningfulText = isMeaningfulText(text);
        if (!text || text.trim().length < 10 || !meaningfulText) {
          // Either no text extracted at all, or only page markers (image-based PDF
          // / scan). Without real content, AI would hallucinate based on existing
          // folder names — refuse instead.
          classification = {
            subject: 'Chưa phân loại',
            chapter: '',
            grade: '',
            folder_name: 'Chưa phân loại',
            summary: `File ${originalNameUtf8} không trích xuất được text (có thể PDF dạng ảnh scan). Cần OCR hoặc upload từng trang dưới dạng ảnh.`,
            tags: ['cần-OCR']
          };
        } else {
          classification = await classifyFromText(text, foldersWithTags, originalNameUtf8);
        }
      }

      // Ensure all fields from AI are strings to prevent .trim() or DB type errors
      classification.folder_name = (typeof classification.folder_name === 'string' ? classification.folder_name : String(classification.folder_name || 'Chưa phân loại'));
      classification.subject = (typeof classification.subject === 'string' ? classification.subject : String(classification.subject || ''));
      classification.chapter = (typeof classification.chapter === 'string' ? classification.chapter : String(classification.chapter || ''));
      classification.grade = (typeof classification.grade === 'string' ? classification.grade : String(classification.grade || ''));
      classification.summary = (typeof classification.summary === 'string' ? classification.summary : String(classification.summary || ''));
      classification.tags = Array.isArray(classification.tags) ? classification.tags.map(String) : ['cần-phân-loại'];

      // Find folder by case-insensitive name
      const targetName = classification.folder_name.trim();
      const { data: existing } = await (req.supabase || supabase).from('folders').select('*').ilike('name', targetName).maybeSingle();

      // Safety check: if AI returned an existing folder name but the subject
      // doesn't match, refuse the merge and create a fresh folder instead.
      // This prevents cross-subject grouping (e.g. Tin học into Hóa học).
      const normalize = (s) => (s || '').trim().toLowerCase();
      const subjectsMatch = existing
        && normalize(existing.subject) === normalize(classification.subject);

      let folder;
      if (existing && subjectsMatch) {
        folder = existing;
        classification.folder_name = folder.name;
        classification.subject = folder.subject;
        classification.chapter = folder.chapter || '';
        classification.grade = folder.grade || '';
      } else if (existing && !subjectsMatch) {
        // LLM tried to merge into a folder with a different subject.
        // Discard LLM's bad folder_name and synthesize a clean one from
        // its own subject/chapter so the result is sensible.
        const subj = (classification.subject || 'Chưa rõ').trim();
        const chap = (classification.chapter || 'Tổng quát').trim();
        let cleanName = chap ? `${subj}/${chap}` : subj;

        // Avoid clashing with another existing folder of that exact name
        const { data: nameClash } = await (req.supabase || supabase).from('folders').select('id').ilike('name', cleanName).maybeSingle();
        if (nameClash) {
          cleanName = `${cleanName} ${Date.now().toString().slice(-4)}`;
        }
        classification.folder_name = cleanName;

        const { data: created, error: createErr } = await (req.supabase || supabase).from('folders')
          .insert({
            name: cleanName,
            subject: subj,
            chapter: chap,
            grade: classification.grade || ''
          })
          .select('*')
          .single();
        if (createErr) throw createErr;
        folder = created;
      } else {
        const { data: created, error: createErr } = await (req.supabase || supabase).from('folders')
          .insert({
            name: classification.folder_name,
            subject: classification.subject || '',
            chapter: classification.chapter || '',
            grade: classification.grade || ''
          })
          .select('*')
          .single();
        if (createErr) throw createErr;
        folder = created;
      }

      // Upload to storage
      const storageUrl = await uploadToStorage(file);

      // Extract text for cheat sheet / podcast later
      let extractedText = '';
      if (!isImageType(ext)) {
        extractedText = await extractText(file.buffer, ext) || '';
      }

      const { data: newFile, error: insertErr } = await (req.supabase || supabase).from('files')
        .insert({
          folder_id: folder.id,
          original_name: originalNameUtf8,
          storage_url: storageUrl,
          file_type: ext,
          file_size: file.size,
          extracted_text: extractedText,
          ai_summary: classification.summary,
          ai_tags: classification.tags
        })
        .select('*')
        .single();
      if (insertErr) throw insertErr;

      results.push({
        file: toApi(newFile),
        folder: toApi(folder),
        classification
      });
    }

    res.json({ results });
  } catch (error) {
    console.error('Classify error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// GET /api/ai/cheatsheet/:folderId — generate or return cached cheat sheet
// ===========================================================================
router.get('/cheatsheet/:folderId', async (req, res) => {
  try {
    const folder = await getFolderOr404(req.params.folderId, res);
    if (!folder) return;

    // Return cached JSON if present
    if (folder.cheat_sheet_json) {
      return res.json({
        json: folder.cheat_sheet_json,
        markdown: folder.cheat_sheet_markdown || null,
        template: folder.selected_template,
        font: folder.handwriting_font,
        cached: true
      });
    }

    // Generate fresh
    const allTexts = await getAllTextsForFolder(folder.id);
    if (!allTexts || allTexts.trim().length < 20) {
      return res.status(400).json({
        error: 'Không đủ nội dung văn bản trong thư mục này để tạo phao cứu cấp'
      });
    }

    let json = null;
    try {
      json = await generateCheatSheet(allTexts, folder.name);
    } catch (e) {
      console.error('Cheat sheet JSON generation failed:', e.message);
      // Legacy markdown fallback if folder has it
      if (folder.cheat_sheet_markdown) {
        return res.json({
          json: null,
          markdown: folder.cheat_sheet_markdown,
          template: folder.selected_template,
          font: folder.handwriting_font,
          cached: true
        });
      }
      throw e;
    }

    await (req.supabase || supabase).from('folders')
      .update({ cheat_sheet_json: json })
      .eq('id', folder.id);

    res.json({
      json,
      markdown: null,
      template: folder.selected_template,
      font: folder.handwriting_font,
      cached: false
    });
  } catch (error) {
    console.error('Cheat sheet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/ai/cheatsheet/:folderId/template — switch active template
// ===========================================================================
router.post('/cheatsheet/:folderId/template', async (req, res) => {
  try {
    const { template } = req.body;
    if (!VALID_TEMPLATES.includes(template)) {
      return res.status(400).json({ error: `template phải là một trong ${VALID_TEMPLATES.join(', ')}` });
    }
    const { data, error } = await (req.supabase || supabase).from('folders')
      .update({ selected_template: template })
      .eq('id', req.params.folderId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Folder not found' });
    res.json({ template: data.selected_template });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/ai/cheatsheet/:folderId/migrate — convert legacy markdown → JSON
// ===========================================================================
router.post('/cheatsheet/:folderId/migrate', async (req, res) => {
  try {
    const folder = await getFolderOr404(req.params.folderId, res);
    if (!folder) return;

    if (folder.cheat_sheet_json) {
      return res.json({ json: folder.cheat_sheet_json, migrated: false, message: 'Already in JSON format' });
    }
    if (!folder.cheat_sheet_markdown) {
      return res.status(400).json({ error: 'No markdown to migrate' });
    }

    const json = await migrateMarkdownToJson(folder.cheat_sheet_markdown);
    await (req.supabase || supabase).from('folders')
      .update({ cheat_sheet_json: json })
      .eq('id', folder.id);

    res.json({ json, migrated: true });
  } catch (error) {
    console.error('Migrate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/ai/cheatsheet/:folderId/handwriting — analyze handwriting sample
// ===========================================================================
router.post(
  '/cheatsheet/:folderId/handwriting',
  handwritingUpload.single('image'),
  async (req, res) => {
    try {
      const folder = await getFolderOr404(req.params.folderId, res);
      if (!folder) return;
      if (!req.file) return res.status(400).json({ error: 'Image is required' });

      const ext = req.file.originalname.split('.').pop().toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        return res.status(400).json({ error: 'Image must be jpg/png/webp' });
      }

      const mimeType = getImageMimeType(ext);
      const sampleUrl = await uploadToStorage(req.file);
      const analysis = await analyzeHandwriting(req.file.buffer, mimeType);

      await (req.supabase || supabase).from('folders')
        .update({
          handwriting_font: analysis.font_family,
          handwriting_sample_url: sampleUrl,
          selected_template: 'sketch-notebook'
        })
        .eq('id', folder.id);

      res.json({
        font_family: analysis.font_family,
        reasoning: analysis.reasoning,
        slant: analysis.slant,
        weight: analysis.weight,
        sample_url: sampleUrl
      });
    } catch (error) {
      console.error('Handwriting analyze error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===========================================================================
// POST /api/ai/cheatsheet/:folderId/handwriting/manual — pick font manually
// ===========================================================================
router.post('/cheatsheet/:folderId/handwriting/manual', async (req, res) => {
  try {
    const VALID_FONTS = ['Caveat', 'Patrick Hand', 'Dancing Script', 'Pacifico', 'Be Vietnam Pro Italic'];
    const { font_family } = req.body;
    if (!VALID_FONTS.includes(font_family)) {
      return res.status(400).json({ error: `font_family phải là một trong ${VALID_FONTS.join(', ')}` });
    }
    const { data, error } = await (req.supabase || supabase).from('folders')
      .update({ handwriting_font: font_family, selected_template: 'sketch-notebook' })
      .eq('id', req.params.folderId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Folder not found' });
    res.json({ font_family: data.handwriting_font });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// DELETE /api/ai/cheatsheet/:folderId — clear cache to force regeneration
// ===========================================================================
router.delete('/cheatsheet/:folderId', async (req, res) => {
  try {
    const { error } = await (req.supabase || supabase).from('folders')
      .update({ cheat_sheet_json: null, cheat_sheet_markdown: '' })
      .eq('id', req.params.folderId);
    if (error) throw error;
    res.json({ message: 'Cheat sheet cache cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/ai/podcast/:folderId
// ===========================================================================
router.post('/podcast/:folderId', async (req, res) => {
  try {
    const folder = await getFolderOr404(req.params.folderId, res);
    if (!folder) return;

    if (folder.podcast_audio_url && Array.isArray(folder.podcast_script) && folder.podcast_script.length > 0) {
      return res.json({
        script: folder.podcast_script,
        audio_url: folder.podcast_audio_url,
        cached: true
      });
    }

    const allTexts = await getAllTextsForFolder(folder.id);
    if (!allTexts || allTexts.trim().length < 20) {
      return res.status(400).json({ error: 'Không đủ nội dung văn bản để tạo podcast' });
    }

    const script = await generatePodcastScript(allTexts, folder.name);

    let audioUrl = null;
    try {
      audioUrl = await generatePodcastAudio(script);
    } catch (e) {
      console.log('TTS generation skipped:', e.message);
    }

    await (req.supabase || supabase).from('folders')
      .update({
        podcast_script: script,
        podcast_audio_url: audioUrl || ''
      })
      .eq('id', folder.id);

    res.json({ script, audio_url: audioUrl, cached: false });
  } catch (error) {
    console.error('Podcast error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// DELETE /api/ai/podcast/:folderId — clear cached podcast (script + audio)
// ===========================================================================
router.delete('/podcast/:folderId', async (req, res) => {
  try {
    const { error } = await (req.supabase || supabase).from('folders')
      .update({ podcast_script: [], podcast_audio_url: '' })
      .eq('id', req.params.folderId);
    if (error) throw error;
    res.json({ message: 'Podcast cache cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/ai/recommend/:folderId — learning resource recommendations
// ===========================================================================
router.post('/recommend/:folderId', async (req, res) => {
  try {
    const folder = await getFolderOr404(req.params.folderId, res);
    if (!folder) return;

    const allTexts = await getAllTextsForFolder(folder.id);
    if (!allTexts || allTexts.trim().length < 20) {
      return res.status(400).json({ error: 'Không đủ nội dung văn bản để gợi ý tài nguyên' });
    }

    const items = await generateResourceRecommendations(allTexts, folder.name);
    res.json({ items });
  } catch (error) {
    console.error('Recommend error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/ai/suggest-role — AI suggests roles for room members
// ===========================================================================
router.post('/suggest-role', protect, async (req, res) => {
  try {
    const { roomId, memberIds } = req.body;
    if (!roomId || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Thieu thong tin roomId hoac memberIds' });
    }

    // Get room info
    const { data: room } = await (req.supabase || supabase).from('rooms')
      .select('name, topic')
      .eq('id', roomId)
      .maybeSingle();

    if (!room) return res.status(404).json({ error: 'Khong tim thay phong' });

    // Get files in room for context
    const { data: roomFiles } = await (req.supabase || supabase).from('room_files')
      .select('original_name, extracted_text')
      .eq('room_id', roomId)
      .limit(10);

    const filesText = (roomFiles || [])
      .map(f => `File: ${f.original_name}\nNoi dung: ${(f.extracted_text || '').slice(0, 1000)}`)
      .join('\n\n');

    // Get member names
    const { data: members } = await (req.supabase || supabase).from('users')
      .select('id, name')
      .in('id', memberIds);

    const memberNames = (members || []).map(m => m.name).join(', ');

    // Build prompt
    const promptContent = rolePrompt(room.name, room.topic, filesText, memberNames);

    // Call OpenAI
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: promptContent }],
      temperature: 0.7,
      max_tokens: 1000
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse suggestions from response
    const suggestions = parseRoleSuggestions(responseText, memberIds, members || []);
    
    res.json({ suggestions, raw_response: responseText });
  } catch (error) {
    console.error('[AI /suggest-role]', error);
    res.status(500).json({ error: error.message });
  }
});

function rolePrompt(roomName, topic, filesContent, memberNames) {
  return `Ban la tro ly AI chuyen nghiep giup phan cong vai tro hoc tap trong phong "${roomName}" (chu de: ${topic || 'khong xac dinh'}).

Tai lieu hoc tap trong phong:
${filesContent || 'Khong co tai lieu nao.'}

Thanh vien: ${memberNames}

Cac vai tro co san:
- Academic Lead (Truong giao hoc thuat): Danh cho nguoi co kien thuc tot nhat ve chu de chinh.
- Note Taker (Nguoi ghi chep): Ghi lai y chinh va tom tat noi dung.
- Question Master (Chuyen gia cau hoi): Dat cau hoi de ca nhom thao luan.
- Resource Finder (Nguoi tim tai lieu): Tim them tai lieu tham khao.
- Quiz Master (Nguoi ra de): Tao cau hoi trac nghiem de kiem tra.

Hay goi y vai tro phu hop cho TUNG thanh vien dua tren ten cua ho va tai lieu co san.
Tra loi theo dinh dang JSON:
[
  { "userId": "...", "suggestedRole": "...", "reason": "..." },
  ...
]

Chi tra ve JSON array, khong co text khac.`;
}

function parseRoleSuggestions(responseText, memberIds, members) {
  try {
    // Try to find JSON array in response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map(s => {
        const member = members.find(m => m.id === s.userId || m.name === s.userId);
        return {
          userId: member?.id || s.userId,
          userName: member?.name || s.userId,
          suggestedRole: s.suggestedRole,
          reason: s.reason
        };
      });
    }
  } catch (e) {
    console.error('[AI] Failed to parse role suggestions:', e.message);
  }

  // Fallback: assign random roles
  const roleOptions = ['Academic Lead', 'Note Taker', 'Question Master', 'Resource Finder', 'Quiz Master'];
  return members.map((m, i) => ({
    userId: m.id,
    userName: m.name,
    suggestedRole: roleOptions[i % roleOptions.length],
    reason: 'GOI Y TU DONG (AI khong phan tich duoc)'
  }));
}

module.exports = router;
