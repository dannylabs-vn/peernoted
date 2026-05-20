// Multer hands back originalname as latin1 bytes when the file name contains
// non-ASCII characters. Re-decode it as UTF-8 so Vietnamese filenames are
// preserved.
function fixLatin1Name(name) {
  if (!name) return name;
  const hasHighBytes = Buffer.from(name, 'binary').some(b => b >= 0x80);
  return hasHighBytes ? Buffer.from(name, 'latin1').toString('utf8') : name;
}

module.exports = { fixLatin1Name };
