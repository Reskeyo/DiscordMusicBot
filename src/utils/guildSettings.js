const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '..', '..', 'guild-settings.json');

let settings = {};

// Beim Start laden
function load() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Settings] Load error:', e.message);
    settings = {};
  }
}

function save() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('[Settings] Save error:', e.message);
  }
}

function get(guildId) {
  return settings[guildId] || {};
}

function getMusicChannelId(guildId) {
  return settings[guildId]?.musicChannelId || null;
}

function setMusicChannelId(guildId, channelId) {
  if (!settings[guildId]) settings[guildId] = {};
  settings[guildId].musicChannelId = channelId;
  save();
}

function removeMusicChannelId(guildId) {
  if (settings[guildId]) {
    delete settings[guildId].musicChannelId;
    if (Object.keys(settings[guildId]).length === 0) {
      delete settings[guildId];
    }
    save();
  }
}

// Initial laden
load();

module.exports = { get, getMusicChannelId, setMusicChannelId, removeMusicChannelId, load, save };
