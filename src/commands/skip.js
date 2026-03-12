const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Überspringt den aktuellen Song'),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    const skipped = player.skip(interaction.guildId);
    if (skipped) {
      await interaction.reply({ embeds: [createSuccessEmbed(`⏭️ **${skipped.title}** übersprungen.`)] });
    } else {
      await interaction.reply({ embeds: [createErrorEmbed('Es wird gerade nichts abgespielt.')], ephemeral: true });
    }
  }
};
