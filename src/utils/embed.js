const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function createProgressBar(current, total, length = 20) {
  const progress = Math.round((current / total) * length);
  const bar = '▬'.repeat(Math.max(0, progress)) + '🔵' + '▬'.repeat(Math.max(0, length - progress));
  return bar;
}

function createNowPlayingEmbed(song) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎶 Jetzt wird gespielt')
    .setDescription(`**[${song.title}](${song.url})**`)
    .addFields({ name: 'Dauer', value: song.durationFormatted || formatDuration(song.duration), inline: true });

  if (song.source === 'spotify') {
    embed.addFields({ name: 'Quelle', value: '🟢 Spotify', inline: true });
  } else {
    embed.addFields({ name: 'Quelle', value: '🔴 YouTube', inline: true });
  }

  if (song.thumbnail) {
    embed.setThumbnail(song.thumbnail);
  }

  return embed;
}

function createNowPlayingDetailEmbed(info) {
  if (!info || !info.song) {
    return createErrorEmbed('Aktuell wird nichts abgespielt.');
  }

  const { song, position, volume, loop, loopQueue, paused } = info;
  const progressBar = createProgressBar(position, song.duration);
  const posFormatted = formatDuration(position);
  const durFormatted = song.durationFormatted || formatDuration(song.duration);

  const status = paused ? '⏸️ Pausiert' : '▶️ Spielt';
  const loopStatus = loop ? '🔂 Song-Loop' : loopQueue ? '🔁 Queue-Loop' : '➡️ Aus';

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎶 Aktueller Song')
    .setDescription(`**[${song.title}](${song.url})**\n\n${progressBar}\n\`${posFormatted} / ${durFormatted}\``)
    .addFields(
      { name: 'Status', value: status, inline: true },
      { name: 'Lautstärke', value: `${Math.round(volume * 100)}%`, inline: true },
      { name: 'Loop', value: loopStatus, inline: true }
    );

  if (song.thumbnail) {
    embed.setThumbnail(song.thumbnail);
  }

  return embed;
}

function createQueueEmbed(data, page = 0) {
  const { current, queue, loop, loopQueue } = data;
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(queue.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('📋 Warteschlange');

  let description = '';

  if (current) {
    description += `**Aktuell:** [${current.title}](${current.url})\n\n`;
  }

  if (queue.length === 0) {
    description += '*Die Queue ist leer.*';
  } else {
    const start = currentPage * pageSize;
    const end = Math.min(start + pageSize, queue.length);
    const pageItems = queue.slice(start, end);

    pageItems.forEach((song, i) => {
      const index = start + i + 1;
      const dur = song.durationFormatted || formatDuration(song.duration);
      description += `**${index}.** [${song.title}](${song.url}) \`${dur}\`\n`;
    });

    description += `\n**${queue.length} Songs** in der Queue`;
  }

  const loopStatus = loop ? ' | 🔂 Song-Loop' : loopQueue ? ' | 🔁 Queue-Loop' : '';
  embed.setDescription(description);
  embed.setFooter({ text: `Seite ${currentPage + 1}/${totalPages}${loopStatus}` });

  return embed;
}

function createErrorEmbed(message) {
  return new EmbedBuilder()
    .setColor(config.colors.error)
    .setDescription(`❌ ${message}`);
}

function createSuccessEmbed(message) {
  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setDescription(message);
}

module.exports = {
  formatDuration,
  createProgressBar,
  createNowPlayingEmbed,
  createNowPlayingDetailEmbed,
  createQueueEmbed,
  createErrorEmbed,
  createSuccessEmbed
};
