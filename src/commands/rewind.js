const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rewind')
    .setDescription('Spult eine bestimmte Anzahl Sekunden zurück')
    .addIntegerOption(opt =>
      opt.setName('seconds')
        .setDescription('Anzahl Sekunden zum Zurückspulen')
        .setMinValue(1)
        .setRequired(true)),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    await interaction.deferReply();

    const seconds = interaction.options.getInteger('seconds');
    const success = await player.rewind(interaction.guildId, seconds);

    if (success) {
      await interaction.editReply({
        embeds: [createSuccessEmbed(`⏪ **${seconds} Sekunden** zurückgespult.`)]
      });
    } else {
      await interaction.editReply({
        embeds: [createErrorEmbed('Konnte nicht zurückspulen. Läuft ein Song?')]
      });
    }
  }
};
