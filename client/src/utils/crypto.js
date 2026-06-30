/**
 * E2EE Crypto Module using Web Crypto API
 * 
 * Uses the Room Invite Code as a master password to derive a 256-bit AES-GCM key.
 * Encrypts the file blob before uploading, and decrypts it after downloading.
 */

// String to ArrayBuffer
function stringToArrayBuffer(str) {
  return new TextEncoder().encode(str);
}

// Derive a strong AES-GCM key from the room's invite code
async function deriveKey(inviteCode) {
  // We use a fixed salt for simplicity, but in a real-world scenario with true E2EE,
  // the salt should be random and prepended to the ciphertext.
  // Since we use the invite code as the master key across the room, we fix the salt
  // so all users derive the exact same AES key from the same invite code.
  const salt = stringToArrayBuffer('peernoted-room-salt-v1');
  
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(inviteCode),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a File object.
 * @param {File} file 
 * @param {string} inviteCode 
 * @returns {Promise<File>} Encrypted File with same name
 */
export async function encryptFile(file, inviteCode) {
  if (!inviteCode) return file; // Fallback if no code provided
  
  try {
    const key = await deriveKey(inviteCode);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM IV is 12 bytes
    const fileBuffer = await file.arrayBuffer();

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      fileBuffer
    );

    // Combine IV + Encrypted Data
    const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combinedBuffer.set(iv, 0);
    combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.length);

    // Return as a new File object
    return new File([combinedBuffer], file.name, { type: 'application/octet-stream' });
  } catch (error) {
    console.error('Lỗi khi mã hóa file:', error);
    throw new Error('Mã hóa file thất bại');
  }
}

/**
 * Decrypt a Blob object downloaded from the server.
 * @param {Blob} blob 
 * @param {string} inviteCode 
 * @param {string} originalType 
 * @returns {Promise<Blob>} Decrypted Blob with original mime type
 */
export async function decryptFile(blob, inviteCode, originalType) {
  if (!inviteCode) return blob;

  try {
    const key = await deriveKey(inviteCode);
    const buffer = await blob.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Extract IV (first 12 bytes) and ciphertext
    const iv = data.slice(0, 12);
    const ciphertext = data.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    return new Blob([decryptedBuffer], { type: originalType });
  } catch (error) {
    console.error('Lỗi khi giải mã file:', error);
    throw new Error('Sai mã phòng hoặc file không được mã hóa đúng cách.');
  }
}
