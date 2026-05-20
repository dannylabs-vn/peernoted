const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text from a file buffer based on its type
 */
async function extractText(buffer, fileType) {
  switch (fileType) {
    case 'pdf':
      return extractFromPDF(buffer);
    case 'docx':
    case 'doc':
      return extractFromDOCX(buffer);
    case 'txt':
      return buffer.toString('utf-8');
    default:
      return null; // Images and other types won't have text extraction
  }
}

/**
 * Extract text from PDF buffer
 */
async function extractFromPDF(buffer) {
  try {
    const parser = new pdfParse.PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error.message);
    return '';
  }
}

/**
 * Extract text from DOCX buffer
 */
async function extractFromDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    console.error('DOCX extraction error:', error.message);
    return '';
  }
}

/**
 * Check if file type is an image
 */
function isImageType(fileType) {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileType);
}

/**
 * Get MIME type for image
 */
function getImageMimeType(fileType) {
  const mimeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp'
  };
  return mimeMap[fileType] || 'image/jpeg';
}

module.exports = {
  extractText,
  isImageType,
  getImageMimeType
};
