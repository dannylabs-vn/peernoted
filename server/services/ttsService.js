/**
 * TTS Service — Microsoft Edge TTS via edge-tts-universal
 * Vietnamese voices: vi-VN-NamMinhNeural (Male) + vi-VN-HoaiMyNeural (Female)
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const AUDIO_DIR = path.join(__dirname, '..', '..', 'uploads', 'audio');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

const VOICES = {
  MC_A: 'vi-VN-NamMinhNeural',
  MC_B: 'vi-VN-HoaiMyNeural'
};

const VOICES_EN = {
  MC_A: 'en-US-GuyNeural',
  MC_B: 'en-US-JennyNeural'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function generateChunk(text, voice, outputPath = null, retries = 3) {
  const { EdgeTTS } = await import('edge-tts-universal');

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[TTS] Retry ${attempt}/${retries} (${voice})...`);
        await sleep(2000 * attempt);
      }

      const tts = new EdgeTTS(text, voice);
      const result = await tts.synthesize();
      if (!result || !result.audio) throw new Error('No audio received');

      const arrayBuffer = await result.audio.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length < 100) throw new Error('Audio buffer suspiciously small');

      if (outputPath) fs.writeFileSync(outputPath, buffer);
      return buffer;
    } catch (err) {
      lastError = err;
      if (attempt === retries) throw err;
    }
  }
  throw lastError;
}

/**
 * Generate concatenated podcast audio from a script
 * @param {Array<{speaker:string,text:string}>} script
 * @param {'vi'|'en'} language
 * @returns {Promise<string|null>} URL path to /uploads/audio/...
 */
// Upload buffer to Supabase Storage, fall back to local disk if Supabase fails.
// Returns a stable URL that works across Render restarts.
async function uploadAudioBuffer(buffer, filename) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const baseUrl = process.env.SUPABASE_URL
        .replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
      const supabase = createClient(baseUrl, process.env.SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
      });
      const bucket = process.env.SUPABASE_BUCKET || 'peernoted-files';
      const objectPath = `audio/${filename}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(objectPath, buffer, { contentType: 'audio/mpeg', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      console.log(`[TTS] Uploaded to Supabase: ${data.publicUrl}`);
      return data.publicUrl;
    } catch (e) {
      console.warn('[TTS] Supabase upload failed, falling back to local:', e.message);
    }
  }
  // Local fallback (dev only — Render free tier sẽ mất file khi sleep)
  const outputPath = path.join(AUDIO_DIR, filename);
  fs.writeFileSync(outputPath, buffer);
  return `/uploads/audio/${filename}`;
}

// Chạy tasks với giới hạn số lượng đồng thời. Sequential TTS 20 câu mất
// 60-120s → vượt HTTP timeout ~100s của Render free tier → podcast "lúc được
// lúc không" dù script luôn tạo tốt. Parallel concurrency=4 giảm còn 15-30s.
// Không parallel hết 100% vì Edge TTS free endpoint sẽ rate-limit.
async function runWithConcurrency(tasks, limit = 4) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function generatePodcastAudio(script, language = 'vi') {
  if (!script || script.length === 0) {
    console.log('[TTS] Empty script, skipping');
    return null;
  }

  const voices = language === 'en' ? VOICES_EN : VOICES;
  const outputFileName = `podcast_${uuidv4()}.mp3`;

  const lines = script.filter(l => l.text && l.text.trim().length > 0);
  console.log(`[TTS] Generating ${lines.length} lines (concurrency=4)...`);
  const t0 = Date.now();

  try {
    // Mỗi task giữ đúng index để concat theo thứ tự kịch bản
    const tasks = lines.map(({ speaker, text }) => () =>
      generateChunk(text, voices[speaker] || voices.MC_A, null)
    );
    const buffers = (await runWithConcurrency(tasks, 4)).filter(Boolean);

    if (buffers.length === 0) throw new Error('No audio buffers generated');
    if (buffers.length < lines.length) {
      console.warn(`[TTS] ${lines.length - buffers.length}/${lines.length} chunks failed — audio sẽ thiếu vài câu`);
    }

    const finalBuffer = Buffer.concat(buffers);
    console.log(`[TTS] Total ${(finalBuffer.length / 1024).toFixed(1)} KB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return await uploadAudioBuffer(finalBuffer, outputFileName);
  } catch (error) {
    console.error('[TTS] Podcast generation failed:', error.message);
    return null;
  }
}

async function generateSingleAudio(text, voice = 'vi-VN-HoaiMyNeural') {
  if (!text || text.trim().length === 0) return null;
  const outputFileName = `tts_${uuidv4()}.mp3`;
  const outputPath = path.join(AUDIO_DIR, outputFileName);
  try {
    await generateChunk(text, voice, outputPath);
    return `/uploads/audio/${outputFileName}`;
  } catch (err) {
    console.error('[TTS] Single audio failed:', err.message);
    return null;
  }
}

module.exports = { generatePodcastAudio, generateSingleAudio, VOICES, VOICES_EN };
