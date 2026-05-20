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
    try {
      console.log(`[AI] Attempting content generation with model: ${modelName}`);
      const modelInstance = genAI.getGenerativeModel({ model: modelName });
      const result = await modelInstance.generateContent(promptOrParts);
      return result;
    } catch (err) {
      console.warn(`[AI Fallback] Model ${modelName} failed: ${err.message}. Trying next...`);
      lastError = err;
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
  const prompt = PROMPTS.generatePodcastScript(allTexts);
  const result = await generateWithFallback(prompt);
  const response = result.response.text();
  return parseJSON(response);
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
  generatePodcastScript
};
