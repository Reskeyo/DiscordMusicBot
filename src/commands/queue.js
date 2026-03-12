const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createQueueEmbed, createErrorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Zeigt die aktuelle Warteschlange an')
    .addIntegerOption(opt =>
      opt.setName('page')
        .setDescription('Seite der Queue')
        .setMinValue(1)),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    const data = player.getQueue(interaction.guildId);
    if (!data.current && data.queue.length === 0) {
      return interaction.reply({ embeds: [createErrorEmbed('Die Queue ist leer.')], ephemeral: true });
    }

    const page = (interaction.options.getInteger('page') || 1) - 1;
    await interaction.reply({ embeds: [createQueueEmbed(data, page)] });
  }
};
