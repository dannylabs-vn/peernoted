const OpenAI = require('openai');
const PROMPTS = require('../utils/prompts');
const SCHEMAS = require('../utils/schemas');

let _client = null;
let TEXT_MODEL = 'gpt-4o-mini';
let VISION_MODEL = 'gpt-4o';

function getClient() {
  if (!_client) {
    // Ưu tiên OpenAI vì hỗ trợ Structured Outputs strict mode (Gemini KHÔNG hỗ trợ
    // đầy đủ → schema phức tạp sẽ fail → fallback về heuristicClassify keyword cứng).
    // Gemini chỉ dùng làm fallback khi không có OpenAI key.
    if (process.env.OPENAI_API_KEY) {
      _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      TEXT_MODEL = 'gpt-4o-mini';
      VISION_MODEL = 'gpt-4o';
    } else if (process.env.GEMINI_API_KEY) {
      _client = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
      });
      TEXT_MODEL = 'gemini-1.5-flash';
      VISION_MODEL = 'gemini-1.5-flash';
    } else {
      throw new Error('OPENAI_API_KEY hoặc GEMINI_API_KEY chưa được điền trong .env');
    }
  }
  return _client;
}

// Pre-initialize variables on module load if keys are available
try { getClient(); } catch (e) {}


function getMockResponseForSchema(schema) {
  const name = schema.name;
  if (name === 'classify') {
    return {
      subject: "Giải tích 1",
      chapter: "Giới hạn & Liên tục",
      grade: "Năm nhất",
      folder_name: "Giải tích 1",
      summary: "Tài liệu học tập tự động được phân loại bởi AI về giới hạn hàm số, định lý kẹp và các dạng vô định.",
      tags: ["Giải tích 1", "Toán cao cấp", "Giới hạn"]
    };
  }
  if (name === 'cheat_sheet') {
    return {
      title: "Tóm Tắt Giải Tích 1 - Cứu Cánh Kỳ Thi",
      sections: [
        {
          heading: "1. Giới Hạn Cơ Bản",
          blocks: [
            {
              type: "formula",
              content: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
              term: "Giới hạn lượng giác",
              items: null,
              caption: "Công thức tính giới hạn lượng giác kinh điển"
            },
            {
              type: "definition",
              content: "Một hàm số f(x) liên tục tại x0 khi và chỉ khi giới hạn của f(x) khi x tiến tới x0 bằng f(x0).",
              term: "Tính liên tục",
              items: null,
              caption: "Định nghĩa tính liên tục tại một điểm"
            }
          ]
        },
        {
          heading: "2. Quy tắc Đạo Hàm",
          blocks: [
            {
              type: "list",
              content: "Các quy tắc đạo hàm cơ bản:",
              term: "Quy tắc cơ bản",
              items: [
                "(u + v)' = u' + v'",
                "(uv)' = u'v + uv'",
                "(u/v)' = (u'v - uv') / v^2"
              ],
              caption: "Bảng quy tắc tính nhanh"
            }
          ]
        }
      ]
    };
  }
  if (name === 'podcast_script') {
    return {
      lines: [
        { speaker: "MC_A", text: "Chào mừng các bạn đã đến với PeerNoted Podcast! Mình là MC Nam." },
        { speaker: "MC_B", text: "Và mình là Hoài Mỹ. Hôm nay chúng ta sẽ cùng tóm tắt kiến thức cốt lõi của môn Giải tích 1 nhé." },
        { speaker: "MC_A", text: "Đúng vậy, phần giới hạn hàm số luôn là một trong những chương đầu tiên và quan trọng nhất." },
        { speaker: "MC_B", text: "Chính xác, nắm chắc phần này sẽ giúp các bạn học tốt phần đạo hàm và tích phân sau này." }
      ]
    };
  }
  if (name === 'recommendations') {
    return {
      items: [
        {
          title: "Mẹo học Giải tích 1 đạt điểm A+",
          type: "video",
          language: "vi",
          search_query: "Giải tích 1 Bách Khoa",
          description: "Video hướng dẫn giải các dạng đề thi Giải tích 1 phổ biến của trường ĐH Bách Khoa.",
          topic_match: "Giải tích 1",
          source_hint: "YouTube"
        },
        {
          title: "Calculus 1 Full Course Lectures",
          type: "video",
          language: "en",
          search_query: "Calculus 1 Professor Leonard",
          description: "Bài giảng chi tiết về giới hạn, đạo hàm và tích phân từ giáo sư Leonard.",
          topic_match: "Calculus 1",
          source_hint: "YouTube Lectures"
        }
      ]
    };
  }
  if (name === 'handwriting_analysis') {
    return {
      font_family: "Patrick Hand",
      reasoning: "Chữ viết nghiêng nhẹ sang phải, nét bút tương đối gọn và đều đặn.",
      slant: "slight-right",
      weight: "regular"
    };
  }
  return {};
}

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

function heuristicClassify(text = '', filename = '') {
  const cleanFilename = filename.toLowerCase();
  const cleanText = text.toLowerCase();
  
  let subject = 'Chưa phân loại';
  let chapter = 'Tài liệu chung';
  let grade = 'Đại học';
  let folder_name = 'Tài liệu chung';
  let tags = ['Tài liệu'];
  
  // 1. Prioritize filename keywords
  if (cleanFilename.includes('interview') || cleanFilename.includes('phỏng vấn') || cleanFilename.includes('cv') || cleanFilename.includes('resume') || cleanFilename.includes('tuyển dụng')) {
    subject = 'Kỹ năng phỏng vấn';
    chapter = 'Chuẩn bị phỏng vấn';
    folder_name = 'Kỹ năng phỏng vấn';
    tags = ['Phỏng vấn', 'Sự nghiệp'];
  } else if (cleanFilename.includes('kinh tế vi mô') || cleanFilename.includes('microeconomic')) {
    subject = 'Kinh tế vi mô';
    chapter = 'Hành vi người tiêu dùng';
    folder_name = 'Kinh tế vi mô';
    tags = ['Kinh tế', 'Vi mô'];
  } else if (cleanFilename.includes('kinh tế vĩ mô') || cleanFilename.includes('macroeconomic')) {
    subject = 'Kinh tế vĩ mô';
    chapter = 'Tổng sản phẩm quốc nội';
    folder_name = 'Kinh tế vĩ mô';
    tags = ['Kinh tế', 'Vĩ mô'];
  } else if (cleanFilename.includes('triết') || cleanFilename.includes('mác') || cleanFilename.includes('lenin')) {
    subject = 'Triết học Mác - Lênin';
    chapter = 'Chủ nghĩa duy vật';
    folder_name = 'Triết học';
    tags = ['Triết học', 'Mác-Lênin'];
  } else if (cleanFilename.includes('giải tích') || cleanFilename.includes('calculus') || cleanFilename.includes('tích phân')) {
    subject = 'Giải tích 1';
    chapter = 'Giới hạn & Liên tục';
    folder_name = 'Giải tích 1';
    tags = ['Toán', 'Giải tích'];
  } else if (cleanFilename.includes('đại số') || cleanFilename.includes('linear algebra')) {
    subject = 'Đại số tuyến tính';
    chapter = 'Hệ phương trình tuyến tính';
    folder_name = 'Đại số tuyến tính';
    tags = ['Toán', 'Đại số'];
  } else if (cleanFilename.includes('lập trình') || cleanFilename.includes('programming') || cleanFilename.includes('code') || cleanFilename.includes('python') || cleanFilename.includes('java') || cleanFilename.includes('c++')) {
    subject = 'Kỹ thuật lập trình';
    chapter = 'Cấu trúc dữ liệu';
    folder_name = 'Lập trình';
    tags = ['Công nghệ', 'Lập trình'];
  }
  // 2. Fall back to text content keywords if not matched by filename
  else {
    if (cleanText.includes('interview') || cleanText.includes('phỏng vấn') || cleanText.includes('tuyển dụng') || cleanText.includes('cv') || cleanText.includes('resume')) {
      subject = 'Kỹ năng phỏng vấn';
      chapter = 'Chuẩn bị phỏng vấn';
      folder_name = 'Kỹ năng phỏng vấn';
      tags = ['Phỏng vấn', 'Sự nghiệp'];
    } else if (cleanText.includes('kinh tế vi mô') || cleanText.includes('vi mô') || cleanText.includes('ueh')) {
      subject = 'Kinh tế vi mô';
      chapter = 'Hành vi người tiêu dùng';
      folder_name = 'Kinh tế vi mô';
      tags = ['Kinh tế', 'Vi mô'];
    } else if (cleanText.includes('vĩ mô') || cleanText.includes('kinh tế vĩ mô')) {
      subject = 'Kinh tế vĩ mô';
      chapter = 'Tổng sản phẩm quốc nội';
      folder_name = 'Kinh tế vĩ mô';
      tags = ['Kinh tế', 'Vĩ mô'];
    } else if (cleanText.includes('triết') || cleanText.includes('mác') || cleanText.includes('lênin') || cleanText.includes('lenin')) {
      subject = 'Triết học Mác - Lênin';
      chapter = 'Chủ nghĩa duy vật';
      folder_name = 'Triết học';
      tags = ['Triết học', 'Mác-Lênin'];
    } else if (cleanText.includes('giải tích') || cleanText.includes('tích phân') || cleanText.includes('đạo hàm') || cleanText.includes('giới hạn')) {
      subject = 'Giải tích 1';
      chapter = 'Giới hạn & Liên tục';
      folder_name = 'Giải tích 1';
      tags = ['Toán', 'Giải tích'];
    } else if (cleanText.includes('đại số tuyến tính') || (cleanText.includes('ma trận') && !cleanText.includes('code') && !cleanText.includes('lập trình')) || cleanText.includes('đại số')) {
      subject = 'Đại số tuyến tính';
      chapter = 'Hệ phương trình tuyến tính';
      folder_name = 'Đại số tuyến tính';
      tags = ['Toán', 'Đại số'];
    } else if (cleanText.includes('lập trình') || cleanText.includes('python') || cleanText.includes('java') || cleanText.includes('c++') || cleanText.includes('code') || cleanText.includes('thuật toán') || cleanText.includes('vector') || cleanText.includes('matrix')) {
      subject = 'Kỹ thuật lập trình';
      chapter = 'Cấu trúc dữ liệu';
      folder_name = 'Lập trình';
      tags = ['Công nghệ', 'Lập trình'];
    } else if (filename) {
      const cleanName = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
      subject = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      folder_name = subject;
      tags = [subject.split(' ')[0]];
    }
  }

  return {
    subject,
    chapter,
    grade,
    folder_name,
    summary: `Tài liệu môn học ${subject} được phân tích tự động (Chế độ Heuristic Offline).`,
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
    console.warn('[AI Service] API Error, falling back to heuristic classifier:', err.message);
    return heuristicClassify(text, filename);
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
    console.warn('[AI Service] API Error, falling back to heuristic classifier:', err.message);
    return heuristicClassify('', filename);
  }
}

async function generateCheatSheet(allTexts, folderName = '') {
  try {
    return await chatJSON({
      model: TEXT_MODEL,
      schema: SCHEMAS.CHEAT_SHEET_SCHEMA,
      messages: [
        { role: 'system', content: 'Bạn là thủ khoa tạo phao cứu cấp. Trả về theo schema JSON đã định nghĩa.' },
        { role: 'user', content: PROMPTS.generateCheatSheet(allTexts, folderName) }
      ]
    });
  } catch (err) {
    console.warn('[AI Service] generateCheatSheet API error, using mock:', err.message);
    return getMockResponseForSchema(SCHEMAS.CHEAT_SHEET_SCHEMA);
  }
}

async function migrateMarkdownToJson(markdown) {
  try {
    return await chatJSON({
      model: TEXT_MODEL,
      schema: SCHEMAS.CHEAT_SHEET_SCHEMA,
      messages: [
        { role: 'system', content: 'Bạn là trợ lý chuyển đổi định dạng. Trả về theo schema JSON đã định nghĩa.' },
        { role: 'user', content: PROMPTS.migrateMarkdownToJson(markdown) }
      ]
    });
  } catch (err) {
    console.warn('[AI Service] migrateMarkdownToJson API error, using mock:', err.message);
    return getMockResponseForSchema(SCHEMAS.CHEAT_SHEET_SCHEMA);
  }
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
  try {
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
  } catch (err) {
    console.warn('[AI Service] generatePodcastScript API error, using mock:', err.message);
    return getMockResponseForSchema(SCHEMAS.PODCAST_SCRIPT_SCHEMA).lines;
  }
}

async function generateResourceRecommendations(allTexts, folderName = '') {
  try {
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
  } catch (err) {
    console.warn('[AI Service] generateResourceRecommendations API error, using mock:', err.message);
    const mock = getMockResponseForSchema(SCHEMAS.RECOMMENDATIONS_SCHEMA);
    return mock.items.map(rec => ({
      ...rec,
      youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(rec.search_query)}`
    }));
  }
}

async function analyzeHandwriting(imageBuffer, mimeType) {
  try {
    return await chatJSON({
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
  } catch (err) {
    console.warn('[AI Service] analyzeHandwriting API error, using mock:', err.message);
    return getMockResponseForSchema(SCHEMAS.HANDWRITING_SCHEMA);
  }
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
