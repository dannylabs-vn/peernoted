/**
 * TTS Service - Text to Speech using Microsoft Edge TTS
 * Uses edge-tts-universal for high-quality neural voices
 * Vietnamese voices: vi-VN-NamMinhNeural (Male), vi-VN-HoaiMyNeural (Female)
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const AUDIO_DIR = path.join(__dirname, '..', '..', 'uploads', 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Voice mapping for podcast MC characters
const VOICES = {
  MC_A: 'vi-VN-NamMinhNeural',   // Male voice for "Minh" (questioner)
  MC_B: 'vi-VN-HoaiMyNeural',    // Female voice for "Lan" (explainer)
};

// English voice alternatives
const VOICES_EN = {
  MC_A: 'en-US-GuyNeural',
  MC_B: 'en-US-JennyNeural',
};

/**
 * Wait for a specified number of milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a single audio chunk from text using edge-tts-universal
 * Uses the EdgeTTS class with the correct API: new EdgeTTS(text, voice)
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice name (e.g., 'vi-VN-NamMinhNeural')
 * @param {string} outputPath - Path to save the audio file
 * @param {number} retries - Number of retry attempts (default 3)
 * @returns {Promise<Buffer>} Audio buffer
 */
async function generateChunk(text, voice, outputPath = null, retries = 3) {
  const { EdgeTTS } = await import('edge-tts-universal');
  
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[TTS] Retry attempt ${attempt}/${retries} for voice ${voice}...`);
        await sleep(2000 * attempt); // Exponential backoff
      }
      
      const tts = new EdgeTTS(text, voice);
      const result = await tts.synthesize();
      
      if (!result || !result.audio) {
        throw new Error("No audio was received.");
      }
      
      const arrayBuffer = await result.audio.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      if (buffer.length < 100) {
        throw new Error("Generated audio buffer is suspiciously small.");
      }
      
      if (outputPath) {
        fs.writeFileSync(outputPath, buffer);
      }
      return buffer;
    } catch (err) {
      lastError = err;
      if (attempt === retries) {
        throw err;
      }
    }
  }
  throw lastError;
}



/**
 * Generate podcast audio from a script array
 * @param {Array} script - Array of {speaker, text} objects
 * @param {string} language - Language code: 'vi' or 'en' (default: 'vi')
 * @returns {Promise<string|null>} URL path to the generated audio file, or null on failure
 */
async function generatePodcastAudio(script, language = 'vi') {
  if (!script || script.length === 0) {
    console.log('Empty script, skipping TTS generation');
    return null;
  }

  const voices = language === 'en' ? VOICES_EN : VOICES;
  const outputFileName = `podcast_${uuidv4()}.mp3`;
  const outputPath = path.join(AUDIO_DIR, outputFileName);
  
  console.log(`[TTS] Generating audio chunks for ${script.length} lines...`);
  
  const buffers = [];

  try {
    // Generate each line sequentially to avoid rate-limits and keep logic simple
    for (let i = 0; i < script.length; i++) {
      const { speaker, text } = script[i];
      if (!text || text.trim().length === 0) continue;
      
      const voice = voices[speaker] || voices.MC_A;
      // console.log(`[TTS] Synthesizing line ${i+1}/${script.length}: ${voice}`);
      
      // Pass null for outputPath so it doesn't write temp files and trigger node --watch
      const buf = await generateChunk(text, voice, null);
      buffers.push(buf);
      
      // Removed silenceBuf injection here because it was an incompatible MP3 frame 
      // (44.1kHz stereo) injected into a 24kHz mono stream, crashing the browser player!
    }

    if (buffers.length === 0) {
      throw new Error("No audio buffers were generated.");
    }

    // Concatenate all chunks and save as one final file
    const finalBuffer = Buffer.concat(buffers);
    fs.writeFileSync(outputPath, finalBuffer);
    console.log(`[TTS] Podcast audio saved: ${outputPath} (${(finalBuffer.length / 1024).toFixed(1)} KB)`);
    return `/uploads/audio/${outputFileName}`;
  } catch (error) {
    console.error('[TTS] Podcast Generation Failed:', error);
    return null;
  }
}

/**
 * Generate a single text-to-speech audio file (for standalone TTS needs)
 * @param {string} text - Text to convert
 * @param {string} voice - Voice name (optional, defaults to Vietnamese female)
 * @returns {Promise<string|null>} URL path to audio file
 */
async function generateSingleAudio(text, voice = 'vi-VN-HoaiMyNeural') {
  if (!text || text.trim().length === 0) return null;

  const outputFileName = `tts_${uuidv4()}.mp3`;
  const outputPath = path.join(AUDIO_DIR, outputFileName);

  try {
    await generateChunk(text, voice, outputPath);
    return `/uploads/audio/${outputFileName}`;
  } catch (err) {
    console.error('[TTS] Single audio generation failed:', err.message);
    return null;
  }
}

module.exports = { generatePodcastAudio, generateSingleAudio, VOICES, VOICES_EN };
