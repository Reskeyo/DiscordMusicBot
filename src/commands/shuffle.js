const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Mischt die Warteschlange'),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    if (player.shuffle(interaction.guildId)) {
      await interaction.reply({ embeds: [createSuccessEmbed('🔀 Queue wurde gemischt!')] });
    } else {
      await interaction.reply({
        embeds: [createErrorEmbed('Nicht genug Songs in der Queue zum Mischen.')],
        ephemeral: true
      });
    }
  }
};
