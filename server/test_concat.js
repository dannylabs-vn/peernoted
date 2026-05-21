const fs = require('fs');
async function test() {
  const { EdgeTTS } = await import('edge-tts-universal');
  
  const tts1 = new EdgeTTS("Xin chào, tôi là Minh.", 'vi-VN-NamMinhNeural');
  const res1 = await tts1.synthesize();
  const buf1 = Buffer.from(await res1.audio.arrayBuffer());

  const tts2 = new EdgeTTS("Còn tôi là Lan.", 'vi-VN-HoaiMyNeural');
  const res2 = await tts2.synthesize();
  const buf2 = Buffer.from(await res2.audio.arrayBuffer());

  const silenceHex = 'fffb9004' + '00'.repeat(417);
  const silenceBuf = Buffer.from(silenceHex, 'hex');

  fs.writeFileSync('test1_concat.mp3', Buffer.concat([buf1, buf2]));
  fs.writeFileSync('test2_concat_silence.mp3', Buffer.concat([buf1, silenceBuf, buf2]));
  console.log('Saved test files');
}
test().catch(console.error);
