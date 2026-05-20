const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    default: ''
  },
  chapter: {
    type: String,
    default: ''
  },
  grade: {
    type: String,
    default: ''
  },
  cheat_sheet_markdown: {
    type: String,
    default: ''
  },
  podcast_audio_url: {
    type: String,
    default: ''
  },
  podcast_script: {
    type: Array,
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Folder', folderSchema);
