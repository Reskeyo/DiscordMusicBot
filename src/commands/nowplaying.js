const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createNowPlayingDetailEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Zeigt den aktuellen Song mit Fortschrittsbalken an'),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    const info = player.getNowPlaying(interaction.guildId);
    await interaction.reply({ embeds: [createNowPlayingDetailEmbed(info)] });
  }
};
