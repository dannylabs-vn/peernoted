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

async function chatJSON({ model, messages, schema }) {
  const completion = await getClient().chat.completions.create({
    model,
    messages,
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

async function classifyFromText(text, existingFolders) {
  return chatJSON({
    model: TEXT_MODEL,
    schema: SCHEMAS.CLASSIFY_SCHEMA,
    messages: [
      { role: 'system', content: 'Bạn là trợ lý AI phân loại tài liệu giáo dục. Trả về theo schema JSON đã định nghĩa.' },
      { role: 'user', content: PROMPTS.classifyFile(text, existingFolders) }
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

async function generateCheatSheet(allTexts) {
  return chatJSON({
    model: TEXT_MODEL,
    schema: SCHEMAS.CHEAT_SHEET_SCHEMA,
    messages: [
      { role: 'system', content: 'Bạn là thủ khoa tạo phao cứu cấp. Trả về theo schema JSON đã định nghĩa.' },
      { role: 'user', content: PROMPTS.generateCheatSheet(allTexts) }
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

async function generatePodcastScript(allTexts) {
  const out = await chatJSON({
    model: TEXT_MODEL,
    schema: SCHEMAS.PODCAST_SCRIPT_SCHEMA,
    messages: [
      { role: 'system', content: 'Bạn là biên kịch podcast giáo dục. Trả về theo schema JSON đã định nghĩa.' },
      { role: 'user', content: PROMPTS.generatePodcastScript(allTexts) }
    ]
  });
  return out.lines;
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
  analyzeHandwriting
};
