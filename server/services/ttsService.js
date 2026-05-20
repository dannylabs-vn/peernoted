/**
 * TTS Service - Text to Speech
 * Uses Google Cloud TTS or gTTS as fallback
 * For now, this is a placeholder that can be configured later
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const AUDIO_DIR = path.join(__dirname, '..', '..', 'uploads', 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

/**
 * Generate audio from podcast script
 * @param {Array} script - Array of {speaker, text} objects
 * @returns {string} URL to the final audio file
 */
async function generatePodcastAudio(script) {
  // For MVP: Return a placeholder indicating TTS needs to be configured
  // In production: Use Google Cloud TTS API or similar
  
  // Check if we have a TTS solution available
  try {
    return await generateWithGTTS(script);
  } catch (error) {
    console.log('TTS not available, podcast will be text-only:', error.message);
    return null;
  }
}

/**
 * Generate audio using gTTS (requires Python + gtts package)
 */
async function generateWithGTTS(script) {
  const { execSync } = require('child_process');
  const chunks = [];

  for (let i = 0; i < script.length; i++) {
    const { speaker, text } = script[i];
    const chunkFile = path.join(AUDIO_DIR, `chunk_${i}.mp3`);

    // Use different speech rates for different speakers
    const speed = speaker === 'MC_A' ? 'slow=False' : 'slow=False';

    try {
      // Create a temp Python script for gTTS
      const pyScript = `
from gtts import gTTS
tts = gTTS(text="${text.replace(/"/g, '\\"')}", lang='vi', ${speed})
tts.save("${chunkFile.replace(/\\/g, '/')}")
`;
      const pyFile = path.join(AUDIO_DIR, `tts_${i}.py`);
      fs.writeFileSync(pyFile, pyScript);
      execSync(`python "${pyFile}"`, { timeout: 30000 });
      fs.unlinkSync(pyFile);
      chunks.push(chunkFile);
    } catch (e) {
      console.error(`TTS chunk ${i} failed:`, e.message);
    }
  }

  if (chunks.length === 0) {
    throw new Error('No audio chunks generated');
  }

  // Merge chunks using ffmpeg
  const outputFile = path.join(AUDIO_DIR, `podcast_${uuidv4()}.mp3`);

  try {
    // Create ffmpeg concat file
    const concatList = chunks.map(c => `file '${c.replace(/\\/g, '/')}'`).join('\n');
    const concatFile = path.join(AUDIO_DIR, 'concat.txt');
    fs.writeFileSync(concatFile, concatList);

    execSync(`ffmpeg -f concat -safe 0 -i "${concatFile}" -y "${outputFile}"`, { timeout: 120000 });

    // Cleanup chunks
    fs.unlinkSync(concatFile);
    chunks.forEach(c => { try { fs.unlinkSync(c); } catch (e) {} });

    return `/uploads/audio/${path.basename(outputFile)}`;
  } catch (e) {
    console.error('Audio merge failed:', e.message);
    // Return first chunk as fallback
    if (chunks[0]) {
      return `/uploads/audio/${path.basename(chunks[0])}`;
    }
    throw e;
  }
}

module.exports = { generatePodcastAudio };
