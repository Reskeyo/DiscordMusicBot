const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');
const { formatDuration } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Springt zu einer bestimmten Stelle im Song')
    .addStringOption(opt =>
      opt.setName('time')
        .setDescription('Zeitposition (z.B. "1:30" oder "90" für 90 Sekunden)')
        .setRequired(true)),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    await interaction.deferReply();

    const timeStr = interaction.options.getString('time');
    const seconds = parseTime(timeStr);

    if (seconds === null || seconds < 0) {
      return interaction.editReply({
        embeds: [createErrorEmbed('Ungültiges Zeitformat. Verwende z.B. `1:30` oder `90`.')]
      });
    }

    const success = await player.seek(interaction.guildId, seconds);
    if (success) {
      await interaction.editReply({
        embeds: [createSuccessEmbed(`⏩ Gesprungen zu **${formatDuration(seconds)}**.`)]
      });
    } else {
      await interaction.editReply({
        embeds: [createErrorEmbed('Konnte nicht springen. Läuft ein Song und ist die Zeit gültig?')]
      });
    }
  }
};

function parseTime(str) {
  str = str.trim();

  // Format: mm:ss oder h:mm:ss
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  // Reine Sekunden
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}
