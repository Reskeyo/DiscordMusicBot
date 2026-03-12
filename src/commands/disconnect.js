const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Trennt den Bot vom Voice-Channel'),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    const state = player.getPlayer(interaction.guildId);
    if (!state) {
      return interaction.reply({
        embeds: [createErrorEmbed('Der Bot ist in keinem Voice-Channel.')],
        ephemeral: true
      });
    }

    player.destroy(interaction.guildId);
    await interaction.reply({ embeds: [createSuccessEmbed('👋 Voice-Channel verlassen.')] });
  }
};
