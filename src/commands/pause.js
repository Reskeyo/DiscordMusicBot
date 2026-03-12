const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausiert den aktuellen Song'),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    if (player.pause(interaction.guildId)) {
      await interaction.reply({ embeds: [createSuccessEmbed('⏸️ Song pausiert.')] });
    } else {
      await interaction.reply({ embeds: [createErrorEmbed('Es wird gerade nichts abgespielt.')], ephemeral: true });
    }
  }
};
