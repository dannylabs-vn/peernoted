const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const msgsFile = path.join(dataDir, 'messages.json');
const nicksFile = path.join(dataDir, 'nicknames.json');

function getMessages() {
  if (!fs.existsSync(msgsFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(msgsFile, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveMessage(msg) {
  const msgs = getMessages();
  msgs.push(msg);
  fs.writeFileSync(msgsFile, JSON.stringify(msgs, null, 2));
}

function getNicknames() {
  if (!fs.existsSync(nicksFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(nicksFile, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveNickname(roomId, userId, nickname) {
  const nicks = getNicknames();
  if (!nicks[roomId]) nicks[roomId] = {};
  nicks[roomId][userId] = nickname;
  fs.writeFileSync(nicksFile, JSON.stringify(nicks, null, 2));
}

function getNickname(roomId, userId) {
  const nicks = getNicknames();
  return nicks[roomId]?.[userId] || null;
}

const filesFile = path.join(dataDir, 'files.json');

function getFiles() {
  if (!fs.existsSync(filesFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(filesFile, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveFile(file) {
  const files = getFiles();
  files.push(file);
  fs.writeFileSync(filesFile, JSON.stringify(files, null, 2));
}

function deleteFile(fileId) {
  let files = getFiles();
  files = files.filter(f => f.id !== fileId);
  fs.writeFileSync(filesFile, JSON.stringify(files, null, 2));
}

module.exports = { getMessages, saveMessage, getNicknames, saveNickname, getNickname, getFiles, saveFile, deleteFile };
