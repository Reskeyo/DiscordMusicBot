const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embed');
const guildSettings = require('../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Musik-Channel für diesen Server festlegen oder entfernen')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Der Text-Channel für Musik-Commands (leer lassen zum Entfernen)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (channel) {
      guildSettings.setMusicChannelId(interaction.guildId, channel.id);
      await interaction.reply({
        embeds: [createSuccessEmbed(`🎵 Musik-Channel auf ${channel} gesetzt. Commands funktionieren nur noch dort.`)],
        ephemeral: true
      });
    } else {
      guildSettings.removeMusicChannelId(interaction.guildId);
      await interaction.reply({
        embeds: [createSuccessEmbed('🎵 Musik-Channel-Beschränkung entfernt. Commands funktionieren jetzt überall.')],
        ephemeral: true
      });
    }
  }
};
