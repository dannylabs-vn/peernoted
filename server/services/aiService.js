const { GoogleGenerativeAI } = require('@google/generative-ai');
const PROMPTS = require('../utils/prompts');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS_TO_TRY = [
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-2.5-flash'
];

/**
 * Robust wrapper that tries multiple models in sequence in case of rate limits or errors
 */
async function generateWithFallback(promptOrParts) {
  let lastError = null;
  for (const modelName of MODELS_TO_TRY) {
    let retries = 2; // Try each model up to 2 times
    while (retries > 0) {
      try {
        console.log(`[AI] Attempting content generation with model: ${modelName}`);
        const modelInstance = genAI.getGenerativeModel({ model: modelName });
        const result = await modelInstance.generateContent(promptOrParts);
        return result;
      } catch (err) {
        lastError = err;
        const isRateLimitOr503 = err.status === 503 || err.status === 429 || err.message.includes('503') || err.message.includes('429') || err.message.includes('quota');
        if (isRateLimitOr503 && retries > 1) {
          console.warn(`[AI] Model ${modelName} hit 503/429. Retrying in 3 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          retries--;
        } else {
          console.warn(`[AI Fallback] Model ${modelName} failed: ${err.message}. Trying next...`);
          break; // Break the while loop to try the next model
        }
      }
    }
  }
  throw new Error(`All Gemini models failed. Last error: ${lastError ? lastError.message : 'Unknown error'}`);
}

/**
 * Classify file content (text) using AI
 */
async function classifyFromText(text, existingFolders) {
  const prompt = PROMPTS.classifyFile(text, existingFolders);
  const result = await generateWithFallback(prompt);
  const response = result.response.text();
  return parseJSON(response);
}

/**
 * Classify file content (image) using AI
 */
async function classifyFromImage(imageBuffer, mimeType, existingFolders) {
  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimeType
    }
  };
  const promptText = PROMPTS.classifyImage(existingFolders);
  const result = await generateWithFallback([promptText, imagePart]);
  const response = result.response.text();
  return parseJSON(response);
}

/**
 * Generate cheat sheet from all texts in a folder
 */
async function generateCheatSheet(allTexts) {
  const prompt = PROMPTS.generateCheatSheet(allTexts);
  const result = await generateWithFallback(prompt);
  return result.response.text();
}

/**
 * Generate podcast script from all texts in a folder
 */
async function generatePodcastScript(allTexts) {
  // Step 1: Summarize the text first to extract key points
  console.log('[AI] Step 1: Summarizing text for podcast...');
  const summaryPrompt = `Hãy đọc tài liệu học tập sau và trích xuất TOÀN BỘ các kiến thức, sự kiện, khái niệm cốt lõi. Đảm bảo tính chính xác tuyệt đối về mặt học thuật (đặc biệt với môn Lịch sử, Khoa học). Độ dài của bản tóm tắt cần tỷ lệ thuận với lượng kiến thức trong tài liệu gốc (không giới hạn từ, đảm bảo đúng và đủ):\n\n${allTexts.substring(0, 30000)}`;
  const summaryResult = await generateWithFallback(summaryPrompt);
  const summary = summaryResult.response.text();

  // Step 2: Generate the script based on the summary
  console.log('[AI] Step 2: Generating podcast script from summary...');
  const prompt = PROMPTS.generatePodcastScript(summary);
  const result = await generateWithFallback(prompt);
  const response = result.response.text();
  return parseJSON(response);
}

/**
 * Generate learning resource recommendations based on document content
 * Returns array of recommended videos, podcasts, articles (VI + EN)
 */
async function generateResourceRecommendations(allTexts) {
  const prompt = PROMPTS.recommendResources(allTexts);
  const result = await generateWithFallback(prompt);
  const response = result.response.text();
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
