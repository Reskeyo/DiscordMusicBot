const { createErrorEmbed } = require('../utils/embed');
const musicPlayer = require('../player/MusicPlayer');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // Button Handling (Player-Steuerung)
    if (interaction.isButton() && interaction.customId.startsWith('music_')) {
      try {
        await musicPlayer.handleButton(interaction);
      } catch (error) {
        console.error(`Button Error [${interaction.customId}]:`, error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [createErrorEmbed('Fehler bei der Button-Aktion.')], ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // Autocomplete Handling
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error(`Autocomplete Error [${interaction.commandName}]:`, error);
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Command Error [${interaction.commandName}]:`, error);
      const errorEmbed = createErrorEmbed('Ein unerwarteter Fehler ist aufgetreten.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  }
};
