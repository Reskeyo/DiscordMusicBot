const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Setzt die Lautstärke (0-100)')
    .addIntegerOption(opt =>
      opt.setName('level')
        .setDescription('Lautstärke in Prozent (0-100)')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    const level = interaction.options.getInteger('level');
    if (player.setVolume(interaction.guildId, level / 100)) {
      const icon = level === 0 ? '🔇' : level < 30 ? '🔈' : level < 70 ? '🔉' : '🔊';
      await interaction.reply({ embeds: [createSuccessEmbed(`${icon} Lautstärke auf **${level}%** gesetzt.`)] });
    } else {
      await interaction.reply({ embeds: [createErrorEmbed('Kein aktiver Player.')], ephemeral: true });
    }
  }
};
