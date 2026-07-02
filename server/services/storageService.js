const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Local storage directory (fallback when Supabase is not configured)
const UPLOAD_DIR = path.join(__dirname, '..', '..', '.uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Upload file to storage
 * Uses local filesystem as default. Can be swapped to Supabase/S3 later.
 */
async function uploadToStorage(file) {
  // If Supabase is configured, use it
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return uploadToSupabase(file);
  }

  // Fallback: local file storage
  return uploadToLocal(file);
}

/**
 * Upload to local filesystem
 */
async function uploadToLocal(file) {
  const ext = file.originalname.split('.').pop();
  const filename = `${uuidv4()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  fs.writeFileSync(filepath, file.buffer);

  // Return a URL that the server can serve
  return `/uploads/${filename}`;
}

/**
 * Upload to Supabase Storage
 */
async function uploadToSupabase(file) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    const ext = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    const bucket = process.env.SUPABASE_BUCKET || 'peernoted-files';

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Supabase upload error, falling back to local:', error.message);
    return uploadToLocal(file);
  }
}

/**
 * Delete file from storage
 */
async function deleteFromStorage(url) {
  if (url.startsWith('/uploads/')) {
    const filepath = path.join(__dirname, '..', '..', url);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }
  // Supabase deletion can be added later
}

module.exports = { uploadToStorage, deleteFromStorage };
