const OpenAI = require('openai');
const PROMPTS = require('../utils/prompts');
const SCHEMAS = require('../utils/schemas');

let _client = null;
let TEXT_MODEL = 'gpt-4o-mini';
let VISION_MODEL = 'gpt-4o';
let PROVIDER = 'openai';   // 'openai' | 'gemini'

// Chọn provider qua env AI_PROVIDER (openai | gemini). Mặc định:
// - Nếu OPENAI_API_KEY có → openai
// - Còn lại nếu GEMINI_API_KEY có → gemini
// Set AI_PROVIDER=gemini để FORCE Gemini ngay cả khi có OPENAI_API_KEY.
function getClient() {
  if (!_client) {
    const explicit = (process.env.AI_PROVIDER || '').trim().toLowerCase();
    const wantGemini = explicit === 'gemini' || (!explicit && !process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY);
    const wantOpenAI = explicit === 'openai' || (!explicit && process.env.OPENAI_API_KEY);

    if (wantGemini && process.env.GEMINI_API_KEY) {
      _client = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
      });
      TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.0-flash';
      VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash';
      PROVIDER = 'gemini';
      console.log(`[AI] Provider=gemini model=${TEXT_MODEL}`);
    } else if (wantOpenAI && process.env.OPENAI_API_KEY) {
      _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      TEXT_MODEL = 'gpt-4o-mini';
      VISION_MODEL = 'gpt-4o';
      PROVIDER = 'openai';
      console.log(`[AI] Provider=openai model=${TEXT_MODEL}`);
    } else {
      throw new Error('OPENAI_API_KEY hoặc GEMINI_API_KEY chưa được điền trong .env (kiểm tra AI_PROVIDER nếu set explicit)');
    }
  }
  return _client;
}

// Pre-initialize on module load (nếu key có sẵn)
try { getClient(); } catch (e) {}

// Gemini không hỗ trợ response_format: json_schema strict mode đầy đủ qua
// OpenAI-compat endpoint → phải dùng json_object mode + nhúng schema description
// vào prompt. Helper convert schema JSON thành prompt text dễ hiểu cho LLM.
function schemaToHint(schema) {
  const s = schema?.schema || {};
  return `\n\nQUAN TRỌNG: Trả về JSON THUẦN (không markdown code block), tuân thủ schema:\n${JSON.stringify(s, null, 2)}\n\nMọi field bắt buộc phải có (dùng null nếu không áp dụng).`;
}

async function chatJSON({ model, messages, schema, maxTokens = 16000 }) {
  if (PROVIDER === 'gemini') {
    // Append schema hint vào user message cuối cùng
    const augmented = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === 'user') {
        if (typeof m.content === 'string') {
          return { ...m, content: m.content + schemaToHint(schema) };
        }
        // multimodal content (array) — chèn schema hint vào phần text đầu
        return {
          ...m,
          content: m.content.map((c, idx) => idx === 0 && c.type === 'text'
            ? { ...c, text: c.text + schemaToHint(schema) } : c)
        };
      }
      return m;
    });

    const completion = await getClient().chat.completions.create({
      model,
      messages: augmented,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    });
    const raw = completion.choices[0].message.content;
    // Gemini đôi khi vẫn bọc trong ```json ... ``` → strip trước parse
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    return JSON.parse(cleaned);
  }

  // OpenAI: dùng Structured Outputs strict mode (đảm bảo schema 100%)
  const completion = await getClient().chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    response_format: {
      type: 'json_schema',
      json_schema: schema
    }
  });
  const raw = completion.choices[0].message.content;
  return JSON.parse(raw);
}

function imageMessagePart(buffer, mimeType) {
  return {
    type: 'image_url',
    image_url: { url: `data:${mimeType};base64,${buffer.toString('base64')}` }
  };
}

// Helper log chi tiết khi AI call fail — để user/dev hiểu nguyên nhân
// thay vì silent fallback rồi cache mock data sai.
function logAIError(fn, err) {
  const status = err?.status || err?.response?.status;
  const code = err?.code || err?.response?.data?.error?.code;
  const msg = err?.message || String(err);
  console.error(`[AI Service] ${fn} FAILED — status=${status} code=${code} msg=${msg}`);
}

// Fallback khi AI thực sự không khả dụng. KHÔNG hardcode "Giải tích" /
// "Tài liệu chung" để tránh nhiễm bẩn DB. Chỉ dùng filename nếu có thông
// tin rõ ràng, ngược lại đánh dấu "Chưa phân loại" để user xử lý thủ công.
function safeFallbackClassify(filename = '') {
  let subject = 'Chưa phân loại';
  let chapter = '';
  let folder_name = 'Chưa phân loại';
  let tags = ['cần-phân-loại'];

  if (filename) {
    // Lấy tên file (không extension, không dấu gạch) làm gợi ý chủ đề
    const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ').trim();
    if (cleanName.length >= 3) {
      subject = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      folder_name = subject;
      tags = ['cần-phân-loại', ...cleanName.split(/\s+/).slice(0, 2)];
    }
  }

  return {
    subject,
    chapter,
    grade: '',
    folder_name,
    summary: `AI hiện không khả dụng. Tài liệu "${filename || 'không rõ tên'}" chưa được phân loại tự động — bạn có thể đổi tên thư mục thủ công.`,
    tags
  };
}

async function classifyFromText(text, existingFolders, filename = '') {
  try {
    return await chatJSON({
      model: TEXT_MODEL,
      schema: SCHEMAS.CLASSIFY_SCHEMA,
      messages: [
        { role: 'system', content: 'Bạn là trợ lý AI phân loại tài liệu giáo dục. Trả về theo schema JSON đã định nghĩa.' },
        { role: 'user', content: PROMPTS.classifyFile(text, existingFolders, filename) }
      ]
    });
  } catch (err) {
    logAIError('classifyFromText', err);
    return safeFallbackClassify(filename);
  }
}

async function classifyFromImage(imageBuffer, mimeType, existingFolders, filename = '') {
  try {
    return await chatJSON({
      model: VISION_MODEL,
      schema: SCHEMAS.CLASSIFY_SCHEMA,
      messages: [
        { role: 'system', content: 'Bạn là trợ lý AI phân loại tài liệu giáo dục. Trả về theo schema JSON đã định nghĩa.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPTS.classifyImage(existingFolders) },
            imageMessagePart(imageBuffer, mimeType)
          ]
        }
      ]
    });
  } catch (err) {
    logAIError('classifyFromImage', err);
    return safeFallbackClassify(filename);
  }
}

// Cheat sheet / Podcast / Recommendations / Handwriting:
// KHÔNG trả mock data — throw lỗi để route handler báo cho user.
// Trả mock cũ ("Giải tích 1") gây cache bẩn vào DB và lừa user nghĩ AI đã chạy.
async function generateCheatSheet(allTexts, folderName = '') {
  return chatJSON({
    model: TEXT_MODEL,
    schema: SCHEMAS.CHEAT_SHEET_SCHEMA,
    messages: [
      { role: 'system', content: 'Bạn là thủ khoa tạo phao cứu cấp. Trả về theo schema JSON đã định nghĩa.' },
      { role: 'user', content: PROMPTS.generateCheatSheet(allTexts, folderName) }
    ]
  });
}

async function migrateMarkdownToJson(markdown) {
  return chatJSON({
    model: TEXT_MODEL,
    schema: SCHEMAS.CHEAT_SHEET_SCHEMA,
    messages: [
      { role: 'system', content: 'Bạn là trợ lý chuyển đổi định dạng. Trả về theo schema JSON đã định nghĩa.' },
      { role: 'user', content: PROMPTS.migrateMarkdownToJson(markdown) }
    ]
  });
}

async function summarizeForPodcast(allTexts) {
  const completion = await getClient().chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: 'Bạn là chuyên gia tóm tắt tài liệu học tập. Giữ độ chính xác học thuật tuyệt đối.' },
      { role: 'user', content: PROMPTS.summarizeForPodcast(allTexts) }
    ]
  });
  return completion.choices[0].message.content;
}

async function generatePodcastScript(allTexts, folderName = '') {
  console.log('[AI] Podcast step 1/2: summarizing...');
  const summary = await summarizeForPodcast(allTexts);
  console.log('[AI] Podcast step 2/2: writing script...');
  const out = await chatJSON({
    model: TEXT_MODEL,
    schema: SCHEMAS.PODCAST_SCRIPT_SCHEMA,
    messages: [
      { role: 'system', content: 'Bạn là biên kịch podcast giáo dục. Trả về theo schema JSON đã định nghĩa.' },
      { role: 'user', content: PROMPTS.generatePodcastScript(summary, folderName) }
    ]
  });
  return out.lines;
}

async function generateResourceRecommendations(allTexts, folderName = '') {
  const out = await chatJSON({
    model: TEXT_MODEL,
    schema: SCHEMAS.RECOMMENDATIONS_SCHEMA,
    messages: [
      { role: 'system', content: 'Bạn là chuyên gia tư vấn học thuật. Trả về theo schema JSON đã định nghĩa.' },
      { role: 'user', content: PROMPTS.recommendResources(allTexts, folderName) }
    ]
  });
  return out.items.map(rec => ({
    ...rec,
    youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(rec.search_query)}`
  }));
}

async function analyzeHandwriting(imageBuffer, mimeType) {
  return chatJSON({
    model: VISION_MODEL,
    schema: SCHEMAS.HANDWRITING_SCHEMA,
    messages: [
      { role: 'system', content: 'Bạn là chuyên gia phân tích chữ viết tay. Trả về theo schema JSON đã định nghĩa.' },
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPTS.analyzeHandwriting() },
          imageMessagePart(imageBuffer, mimeType)
        ]
      }
    ]
  });
}

module.exports = {
  classifyFromText,
  classifyFromImage,
  generateCheatSheet,
  migrateMarkdownToJson,
  generatePodcastScript,
  analyzeHandwriting,
  generateResourceRecommendations
};
