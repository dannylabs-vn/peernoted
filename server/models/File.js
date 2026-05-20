const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  folder_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: true
  },
  original_name: {
    type: String,
    required: true
  },
  storage_url: {
    type: String,
    default: ''
  },
  file_type: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    default: 0
  },
  extracted_text: {
    type: String,
    default: ''
  },
  ai_summary: {
    type: String,
    default: ''
  },
  ai_tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('File', fileSchema);
