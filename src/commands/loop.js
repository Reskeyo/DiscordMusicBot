const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel } = require('../utils/checks');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Schaltet Loop-Modus um')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Loop-Modus')
        .setRequired(true)
        .addChoices(
          { name: 'Song (aktuellen Song wiederholen)', value: 'song' },
          { name: 'Queue (gesamte Queue wiederholen)', value: 'queue' },
          { name: 'Aus', value: 'off' }
        )),

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], ephemeral: true });

    const mode = interaction.options.getString('mode');
    const state = player.getPlayer(interaction.guildId);
    if (!state) {
      return interaction.reply({ embeds: [createErrorEmbed('Kein aktiver Player.')], ephemeral: true });
    }

    if (mode === 'song') {
      state.loop = true;
      state.loopQueue = false;
      await interaction.reply({ embeds: [createSuccessEmbed('🔂 **Song-Loop** aktiviert.')] });
    } else if (mode === 'queue') {
      state.loop = false;
      state.loopQueue = true;
      await interaction.reply({ embeds: [createSuccessEmbed('🔁 **Queue-Loop** aktiviert.')] });
    } else {
      state.loop = false;
      state.loopQueue = false;
      await interaction.reply({ embeds: [createSuccessEmbed('➡️ Loop **deaktiviert**.')] });
    }
  }
};
