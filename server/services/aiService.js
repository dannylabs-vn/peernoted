const OpenAI = require('openai');
const PROMPTS = require('../utils/prompts');

let _openai = null;
function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is missing in .env');
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const TEXT_MODEL = 'gpt-4o-mini';
const VISION_MODEL = 'gpt-4o-mini'; // gpt-4o-mini also supports vision requests

/**
 * Helper to call OpenAI with fallback/retry
 */
async function generateWithFallback(messages, model = TEXT_MODEL) {
  try {
    console.log(`[AI] Attempting content generation with model: ${model}`);
    const completion = await getOpenAI().chat.completions.create({
      model: model,
      messages: messages,
      // Dùng chat bình thường, cho phép AI tự quyết định format thay vì ép strict JSON schema 
      // để tránh việc AI ảo giác mất context tiếng Việt. Hàm parseJSON sẽ dọn dẹp sau.
    });
    return completion.choices[0].message.content;
  } catch (err) {
    console.error(`[AI Error] ${err.message}`);
    throw err;
  }
}

/**
 * Format image part for OpenAI vision
 */
function formatImageMessage(imageBuffer, mimeType) {
  const base64Data = imageBuffer.toString('base64');
  return {
    type: 'image_url',
    image_url: {
      url: `data:${mimeType};base64,${base64Data}`
    }
  };
}

/**
 * Classify file content (text) using AI
 */
async function classifyFromText(text, existingFolders, filename) {
  const prompt = PROMPTS.classifyFile(text, existingFolders, filename);
  const messages = [
    { role: 'system', content: 'Bạn là trợ lý AI chuyên phân loại tài liệu giáo dục. Luôn trả về định dạng JSON hợp lệ.' },
    { role: 'user', content: prompt }
  ];
  const response = await generateWithFallback(messages, TEXT_MODEL);
  return parseJSON(response);
}

/**
 * Classify file content (image) using AI
 */
async function classifyFromImage(imageBuffer, mimeType, existingFolders) {
  const promptText = PROMPTS.classifyImage(existingFolders);
  const messages = [
    { role: 'system', content: 'Bạn là trợ lý AI chuyên phân loại tài liệu giáo dục. Luôn trả về định dạng JSON hợp lệ.' },
    {
      role: 'user',
      content: [
        { type: 'text', text: promptText },
        formatImageMessage(imageBuffer, mimeType)
      ]
    }
  ];
  const response = await generateWithFallback(messages, VISION_MODEL);
  return parseJSON(response);
}

/**
 * Generate cheat sheet from all texts in a folder
 */
async function generateCheatSheet(allTexts, folderName) {
  const prompt = PROMPTS.generateCheatSheet(allTexts, folderName);
  const messages = [
    { role: 'system', content: 'Bạn là một thủ khoa xuất sắc.' },
    { role: 'user', content: prompt }
  ];
  return await generateWithFallback(messages, TEXT_MODEL);
}

/**
 * Generate podcast script from all texts in a folder
 */
async function generatePodcastScript(allTexts, folderName) {
  // Step 1: Summarize the text first to extract key points
  console.log('[AI] Step 1: Summarizing text for podcast...');
  const summaryPrompt = `Hãy đọc tài liệu học tập sau thuộc chủ đề "${folderName}" và trích xuất TOÀN BỘ các kiến thức, sự kiện, khái niệm cốt lõi. Đảm bảo tính chính xác tuyệt đối về mặt học thuật (đặc biệt với môn Lịch sử, Khoa học). Độ dài của bản tóm tắt cần tỷ lệ thuận với lượng kiến thức trong tài liệu gốc (không giới hạn từ, đảm bảo đúng và đủ):\n\n${allTexts.substring(0, 20000)}`;
  const summaryMessages = [
    { role: 'system', content: 'Bạn là chuyên gia tóm tắt tài liệu học thuật. Giữ độ chính xác tuyệt đối.' },
    { role: 'user', content: summaryPrompt }
  ];
  const summary = await generateWithFallback(summaryMessages, TEXT_MODEL);

  // Step 2: Generate the script based on the summary
  console.log('[AI] Step 2: Generating podcast script from summary...');
  const prompt = PROMPTS.generatePodcastScript(summary, folderName);
  const scriptMessages = [
    { role: 'system', content: 'Bạn là biên kịch Podcast giáo dục.' },
    { role: 'user', content: prompt }
  ];
  const response = await generateWithFallback(scriptMessages, TEXT_MODEL);
  
  // Parse delimiter-based format: "MC_A|||text here"
  const lines = response.split('\n').filter(line => line.includes('|||'));
  const script = lines.map(line => {
    const [rawSpeaker, ...textParts] = line.split('|||');
    const speakerClean = rawSpeaker.trim().toUpperCase().replace(/[\s_-]+/g, '_');
    
    // Normalize any speaker label to MC_A or MC_B
    let speaker;
    if (speakerClean.includes('MINH') || speakerClean.includes('MC_A') || speakerClean.includes('MCA')) {
      speaker = 'MC_A';
    } else if (speakerClean.includes('LAN') || speakerClean.includes('MC_B') || speakerClean.includes('MCB')) {
      speaker = 'MC_B';
    } else {
      speaker = null; // unknown, will be assigned below
    }
    
    return {
      speaker,
      text: textParts.join('|||').trim()
    };
  }).filter(item => item.text);

  // If AI didn't differentiate speakers at all, force alternation
  const allSameSpeaker = script.every(s => s.speaker === script[0]?.speaker);
  if (allSameSpeaker || script.some(s => !s.speaker)) {
    script.forEach((item, i) => {
      item.speaker = i % 2 === 0 ? 'MC_A' : 'MC_B';
    });
    console.log('[AI] Forced alternating speakers (AI did not differentiate).');
  }

  if (script.length === 0) {
    throw new Error('AI returned no valid podcast lines. Raw response: ' + response.substring(0, 300));
  }

  console.log(`[AI] Parsed ${script.length} podcast lines successfully.`);
  return script;
}

/**
 * Generate learning resource recommendations based on document content
 */
async function generateResourceRecommendations(allTexts, folderName) {
  const prompt = PROMPTS.recommendResources(allTexts, folderName);
  const messages = [
    { role: 'system', content: 'Bạn là chuyên gia tư vấn học thuật. Luôn trả về định dạng JSON hợp lệ.' },
    { role: 'user', content: prompt }
  ];
  const response = await generateWithFallback(messages, TEXT_MODEL);
  const recommendations = parseJSON(response);

  // Enrich each recommendation with a ready-to-use YouTube search URL
  return recommendations.map(rec => ({
    ...rec,
    youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(rec.search_query)}`,
  }));
}

/**
 * Parse JSON from AI response, stripping markdown code blocks if present
 */
function parseJSON(text) {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON from the response
    const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI response as JSON: ' + cleaned.substring(0, 200));
  }
}

module.exports = {
  classifyFromText,
  classifyFromImage,
  generateCheatSheet,
  generatePodcastScript,
  generateResourceRecommendations
};
