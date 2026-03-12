const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Entfernt einen Song aus der Queue')
    .addIntegerOption(opt =>
      opt.setName('position')
        .setDescription('Position des Songs in der Queue (1, 2, 3...)')
        .setMinValue(1)
        .setRequired(true)),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    const position = interaction.options.getInteger('position');
    const removed = player.remove(interaction.guildId, position - 1);

    if (removed) {
      await interaction.reply({
        embeds: [createSuccessEmbed(`🗑️ **${removed.title}** aus der Queue entfernt.`)]
      });
    } else {
      await interaction.reply({
        embeds: [createErrorEmbed(`Ungültige Position. Prüfe die Queue mit \`/queue\`.`)],
        ephemeral: true
      });
    }
  }
};
