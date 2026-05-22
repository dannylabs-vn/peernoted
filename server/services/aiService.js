const OpenAI = require('openai');
const PROMPTS = require('../utils/prompts');
const SCHEMAS = require('../utils/schemas');

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY chưa được điền trong .env — vui lòng dán key OpenAI mới (đã rotate) vào file .env và lưu lại.');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const TEXT_MODEL = 'gpt-4o-mini';
const VISION_MODEL = 'gpt-4o';

async function chatJSON({ model, messages, schema, maxTokens = 16000 }) {
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

async function classifyFromText(text, existingFolders, filename = '') {
  return chatJSON({
    model: TEXT_MODEL,
    schema: SCHEMAS.CLASSIFY_SCHEMA,
    messages: [
      { role: 'system', content: 'Bạn là trợ lý AI phân loại tài liệu giáo dục. Trả về theo schema JSON đã định nghĩa.' },
      { role: 'user', content: PROMPTS.classifyFile(text, existingFolders, filename) }
    ]
  });
}

async function classifyFromImage(imageBuffer, mimeType, existingFolders) {
  return chatJSON({
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
}

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
  // Step 1: extract a faithful knowledge summary
  console.log('[AI] Podcast step 1/2: summarizing...');
  const summary = await summarizeForPodcast(allTexts);

  // Step 2: write podcast script from the summary
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
  // Enrich each item with a ready-to-use YouTube search URL
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
