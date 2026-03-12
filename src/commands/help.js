const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Zeigt alle verfügbaren Befehle an'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎶 Musik-Bot — Hilfe')
      .setDescription('Hier sind alle verfügbaren Befehle:')
      .addFields(
        {
          name: '🎵 Wiedergabe',
          value: [
            '`/play <song>` — Song abspielen (YouTube/Spotify URL oder Suchbegriff)',
            '`/pause` — Wiedergabe pausieren',
            '`/resume` — Wiedergabe fortsetzen',
            '`/stop` — Wiedergabe stoppen & Queue leeren',
            '`/skip` — Aktuellen Song überspringen',
          ].join('\n')
        },
        {
          name: '⏱️ Navigation',
          value: [
            '`/seek <zeit>` — Zu einer bestimmten Stelle springen (z.B. `1:30` oder `90`)',
            '`/forward <sekunden>` — Vorspulen (Standard: 10s)',
            '`/rewind <sekunden>` — Zurückspulen (Standard: 10s)',
          ].join('\n')
        },
        {
          name: '📋 Queue & Info',
          value: [
            '`/queue` — Aktuelle Warteschlange anzeigen',
            '`/nowplaying` — Aktuellen Song mit Fortschritt anzeigen',
            '`/remove <position>` — Song aus der Queue entfernen',
            '`/shuffle` — Queue mischen',
          ].join('\n')
        },
        {
          name: '🔧 Einstellungen',
          value: [
            '`/volume <0-100>` — Lautstärke ändern',
            '`/loop` — Song-Loop an/aus',
            '`/disconnect` — Bot aus dem Voice-Channel trennen',
            '`/setchannel [channel]` — Musik-Channel festlegen (Admin)',
          ].join('\n')
        },
        {
          name: '🎧 Unterstützte Quellen',
          value: [
            '• **YouTube** — URLs, Playlists & Suchbegriffe',
            '• **Spotify** — Song-Links, Playlist- & Album-Links',
          ].join('\n')
        }
      )
      .setFooter({ text: 'Tipp: Beim Tippen von /play werden automatisch Suchvorschläge angezeigt!' });

    await interaction.reply({ embeds: [embed] });
  }
};
