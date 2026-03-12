const { SlashCommandBuilder } = require('discord.js');
const player = require('../player/MusicPlayer');
const { checkMusicChannel, checkVoiceChannel } = require('../utils/checks');
const ytdlp = require('../utils/ytdlp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Spielt einen Song oder fügt ihn zur Queue hinzu')
    .addStringOption(opt =>
      opt.setName('song')
        .setDescription('YouTube URL oder Suchbegriff')
        .setRequired(true)
        .setAutocomplete(true)),

  async autocomplete(interaction) {
    const query = interaction.options.getFocused();
    if (!query || query.length < 2) {
      return interaction.respond([]).catch(() => {});
    }

    try {
      const suggestions = await ytdlp.suggestYouTube(query);
      const choices = suggestions.map(s => ({
        name: s.length > 100 ? s.substring(0, 97) + '...' : s,
        value: s
      }));
      await interaction.respond(choices).catch(() => {});
    } catch {
      await interaction.respond([]).catch(() => {});
    }
  },

  async execute(interaction) {
    const channelCheck = checkMusicChannel(interaction);
    if (channelCheck) return interaction.reply({ embeds: [channelCheck], flags: 64 }).catch(() => {});

    const voiceCheck = checkVoiceChannel(interaction);
    if (voiceCheck) return interaction.reply({ embeds: [voiceCheck], flags: 64 }).catch(() => {});

    let deferred = false;
    try {
      await interaction.deferReply();
      deferred = true;
    } catch (e) {
      console.error('[Play] deferReply failed:', e.message);
    }

    let query = interaction.options.getString('song');
    console.log('[Play] Query:', JSON.stringify(query));

    if (!query || query.trim().length === 0) {
      const { createErrorEmbed } = require('../utils/embed');
      const embed = createErrorEmbed('Bitte gib einen Suchbegriff oder eine URL ein.');
      if (deferred) return interaction.editReply({ embeds: [embed] }).catch(() => {});
      return interaction.channel.send({ embeds: [embed] }).catch(() => {});
    }

    // Markiere interaction als deferred oder nicht
    interaction._deferred = deferred;
    await player.play(interaction, query.trim());
  }
};
