const { createErrorEmbed } = require('../utils/embed');
const guildSettings = require('./guildSettings');

/**
 * Prüft ob der Command im richtigen Channel ausgeführt wird.
 * Nutzt per-Guild-Einstellungen.
 */
function checkMusicChannel(interaction) {
  const musicChannelId = guildSettings.getMusicChannelId(interaction.guildId);
  if (musicChannelId && interaction.channelId !== musicChannelId) {
    return createErrorEmbed(`Musik-Commands können nur in <#${musicChannelId}> verwendet werden.`);
  }
  return null;
}

function checkVoiceChannel(interaction) {
  if (!interaction.member.voice.channel) {
    return createErrorEmbed('Du musst in einem Voice-Channel sein!');
  }
  return null;
}

module.exports = { checkMusicChannel, checkVoiceChannel };
