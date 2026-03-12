const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stoppt die Musik und leert die Queue'),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    if (player.stop(interaction.guildId)) {
      await interaction.reply({ embeds: [createSuccessEmbed('⏹️ Musik gestoppt und Queue geleert.')] });
    } else {
      await interaction.reply({ embeds: [createErrorEmbed('Es wird gerade nichts abgespielt.')], ephemeral: true });
    }
  }
};
