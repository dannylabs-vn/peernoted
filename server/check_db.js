const mongoose = require('mongoose');
require('dotenv').config({path: '../.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Folder = require('./models/Folder');
  const folders = await Folder.find({});
  folders.forEach(f => {
    if (f.podcast_audio_url) {
      console.log('Folder:', f.name, 'Audio:', f.podcast_audio_url);
      console.log('Script length:', f.podcast_script.length);
      if(f.podcast_script.length > 0) console.log('First line:', f.podcast_script[0].text.substring(0, 50));
    }
  });
  process.exit(0);
});
