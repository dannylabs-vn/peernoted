const { EdgeTTS } = require('edge-tts-universal');
const originalCreateSSML = EdgeTTS.prototype.createSSML;
EdgeTTS.prototype.createSSML = function() {
  if (this.text && this.text.startsWith('<speak')) {
    return `X-RequestId:${this.generateConnectionId()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${this.getTimestamp()}Z\r\nPath:ssml\r\n\r\n${this.text}`;
  }
  return originalCreateSSML.call(this);
};

async function test() {
  const fullSSML = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='vi-VN'><voice name='vi-VN-NamMinhNeural'><prosody rate='+0%'>Thử nghiệm hệ thống âm thanh, đây là Minh.</prosody></voice><voice name='vi-VN-HoaiMyNeural'><prosody rate='+0%'>Còn đây là Lan.</prosody></voice></speak>";
  const tts = new EdgeTTS(fullSSML, 'vi-VN-NamMinhNeural');
  try {
    const result = await tts.synthesize();
    console.log(result && result.audio ? 'Success: Audio generated' : 'Fail: No audio');
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
