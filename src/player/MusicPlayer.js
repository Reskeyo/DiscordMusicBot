const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  StreamType
} = require('@discordjs/voice');
const config = require('../../config');
const { createNowPlayingEmbed, createErrorEmbed, createSuccessEmbed } = require('../utils/embed');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ytdlp = require('../utils/ytdlp');

class MusicPlayer {
  constructor() {
    this.players = new Map();
  }

  getPlayer(guildId) {
    return this.players.get(guildId);
  }

  createPlayerState(guildId) {
    const state = {
      queue: [],
      currentSong: null,
      audioPlayer: createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
      }),
      connection: null,
      volume: config.defaultVolume,
      resource: null,
      currentProcesses: null,
      loop: false,
      loopQueue: false,
      textChannel: null,
      autoLeaveTimer: null,
      startedAt: null,
      seekOffset: 0,
      spotifyAbort: false,
      spotifyLoading: false,
      controlMessage: null
    };

    state.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this._killProcesses(state);
      this._onSongEnd(guildId);
    });

    state.audioPlayer.on('error', (error) => {
      console.error(`Audio Player Error [${guildId}]:`, error);
      this._killProcesses(state);
      if (state.textChannel) {
        state.textChannel.send({ embeds: [createErrorEmbed(`Fehler beim Abspielen: ${error.message}`)] });
      }
      this._onSongEnd(guildId);
    });

    this.players.set(guildId, state);
    return state;
  }

  _killProcesses(state) {
    if (state.currentProcesses) {
      try { state.currentProcesses.ytdlp.kill(); } catch {}
      try { state.currentProcesses.ffmpeg.kill(); } catch {}
      state.currentProcesses = null;
    }
  }

  /**
   * Aktualisiert das Channel-Topic mit dem aktuellen Song oder löscht es.
   */
  async _updateTopic(state, song) {
    if (!state.textChannel) return;
    try {
      const topic = song
        ? `🎵 Spielt gerade: ${song.title} [${song.durationFormatted || '?:??'}]`
        : '🎵 Nichts wird gerade abgespielt';
      await state.textChannel.setTopic(topic);
    } catch (e) {
      // Fehlende Berechtigung "Manage Channels" → stille Ignorierung
      if (e.code !== 50013) console.error('[Topic] Update error:', e.message);
    }
  }

  /**
   * Erstellt die Button-Rows für die Player-Steuerung.
   */
  _createControlButtons(paused, loop, loopQueue) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_pause')
        .setEmoji(paused ? '▶️' : '⏸️')
        .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_skip')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('music_shuffle')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_loop')
        .setEmoji(loop ? '🔂' : loopQueue ? '🔁' : '🔁')
        .setLabel(loop ? 'Song' : loopQueue ? 'Queue' : 'Loop')
        .setStyle(loop || loopQueue ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_rewind')
        .setEmoji('⏪')
        .setLabel('-10s')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_forward')
        .setEmoji('⏩')
        .setLabel('+10s')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_disconnect')
        .setEmoji('🚪')
        .setLabel('Leave')
        .setStyle(ButtonStyle.Danger)
    );
    return [row1, row2];
  }

  /**
   * Sendet oder aktualisiert die Control-Message im Text-Channel.
   */
  async _sendControlMessage(state, song, guildId) {
    if (!state.textChannel || !song) return;
    const paused = state.audioPlayer.state.status === AudioPlayerStatus.Paused;
    const embed = createNowPlayingEmbed(song);
    // Queue-Info hinzufügen
    if (state.queue.length > 0) {
      const next = state.queue.slice(0, 3).map((s, i) => `${i + 1}. ${s.title}`).join('\n');
      const more = state.queue.length > 3 ? `\n... und ${state.queue.length - 3} weitere` : '';
      embed.addFields({ name: `📋 Queue (${state.queue.length})`, value: next + more });
    }
    const components = this._createControlButtons(paused, state.loop, state.loopQueue);

    try {
      // Alte Nachricht löschen
      await this._deleteControlMessage(state);
      // Neue Nachricht senden
      state.controlMessage = await state.textChannel.send({ embeds: [embed], components });
    } catch (e) {
      console.error('[Control] Send error:', e.message);
    }
  }

  /**
   * Aktualisiert die Buttons der bestehenden Control-Message (ohne neue Nachricht).
   */
  async _updateControlMessage(state) {
    if (!state.controlMessage || !state.currentSong) return;
    const paused = state.audioPlayer.state.status === AudioPlayerStatus.Paused;
    const embed = createNowPlayingEmbed(state.currentSong);
    if (state.queue.length > 0) {
      const next = state.queue.slice(0, 3).map((s, i) => `${i + 1}. ${s.title}`).join('\n');
      const more = state.queue.length > 3 ? `\n... und ${state.queue.length - 3} weitere` : '';
      embed.addFields({ name: `📋 Queue (${state.queue.length})`, value: next + more });
    }
    const components = this._createControlButtons(paused, state.loop, state.loopQueue);
    try {
      await state.controlMessage.edit({ embeds: [embed], components });
    } catch {
      // Nachricht evtl. gelöscht
      state.controlMessage = null;
    }
  }

  /**
   * Löscht die Control-Message.
   */
  async _deleteControlMessage(state) {
    if (!state.controlMessage) return;
    try { await state.controlMessage.delete(); } catch {}
    state.controlMessage = null;
  }

  /**
   * Handhabt Button-Interaktionen von der Control-Message.
   */
  async handleButton(interaction) {
    const guildId = interaction.guildId;
    const state = this.getPlayer(guildId);

    if (!state || !state.currentSong) {
      return interaction.reply({ embeds: [createErrorEmbed('Aktuell wird nichts abgespielt.')], ephemeral: true });
    }

    // Prüfe ob User im Voice-Channel ist
    if (!interaction.member.voice.channel) {
      return interaction.reply({ embeds: [createErrorEmbed('Du musst in einem Voice-Channel sein!')], ephemeral: true });
    }

    const action = interaction.customId;
    await interaction.deferUpdate();

    switch (action) {
      case 'music_pause':
        if (state.audioPlayer.state.status === AudioPlayerStatus.Paused) {
          this.resume(guildId);
        } else {
          this.pause(guildId);
        }
        await this._updateControlMessage(state);
        break;

      case 'music_skip':
        this.skip(guildId);
        break;

      case 'music_stop':
        await this._deleteControlMessage(state);
        this.stop(guildId);
        if (state.textChannel) {
          state.textChannel.send({ embeds: [createSuccessEmbed('⏹️ Wiedergabe gestoppt.')] }).catch(() => {});
        }
        break;

      case 'music_shuffle':
        if (this.shuffle(guildId)) {
          await this._updateControlMessage(state);
          if (state.textChannel) {
            state.textChannel.send({ embeds: [createSuccessEmbed('🔀 Queue gemischt!')] }).catch(() => {});
          }
        }
        break;

      case 'music_loop': {
        // Zyklus: Aus → Song-Loop → Queue-Loop → Aus
        if (!state.loop && !state.loopQueue) {
          state.loop = true;
        } else if (state.loop) {
          state.loop = false;
          state.loopQueue = true;
        } else {
          state.loopQueue = false;
        }
        await this._updateControlMessage(state);
        const loopText = state.loop ? '🔂 Song-Loop aktiviert' : state.loopQueue ? '🔁 Queue-Loop aktiviert' : '➡️ Loop deaktiviert';
        if (state.textChannel) {
          state.textChannel.send({ embeds: [createSuccessEmbed(loopText)] }).catch(() => {});
        }
        break;
      }

      case 'music_rewind':
        await this.rewind(guildId, 10);
        break;

      case 'music_forward':
        await this.forward(guildId, 10);
        break;

      case 'music_disconnect':
        await this._deleteControlMessage(state);
        if (state.textChannel) {
          state.textChannel.send({ embeds: [createSuccessEmbed('🚪 Disconnected.')] }).catch(() => {});
        }
        this.destroy(guildId);
        break;
    }
  }

  // Sicherer Reply-Helfer: versucht editReply, fällt auf Channel zurück
  async _safeReply(interaction, options) {
    try {
      if (interaction._deferred) {
        return await interaction.editReply(options);
      }
    } catch {}
    try {
      return await interaction.channel.send(options);
    } catch {}
  }

  async play(interaction, query) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return this._safeReply(interaction, { embeds: [createErrorEmbed('Du musst in einem Voice-Channel sein!')] });
    }

    let state = this.getPlayer(interaction.guildId);
    if (!state) {
      state = this.createPlayerState(interaction.guildId);
    }
    state.textChannel = interaction.channel;

    // Spotify Playlists/Alben → asynchrones Batch-Loading
    const spotifyInfo = ytdlp.isSpotifyUrl(query) ? ytdlp.getSpotifyType(query) : null;
    if (spotifyInfo && spotifyInfo.type !== 'track') {
      return this._playSpotifyPlaylist(interaction, query, state, voiceChannel);
    }

    let songs = [];
    try {
      songs = await this._resolveQuery(query);
    } catch (error) {
      console.error('Resolve error:', error);
      return this._safeReply(interaction, { embeds: [createErrorEmbed(`Konnte nichts finden für: \`${query}\``)] });
    }

    if (songs.length === 0) {
      return this._safeReply(interaction, { embeds: [createErrorEmbed('Keine Ergebnisse gefunden.')] });
    }

    if (state.queue.length + songs.length > config.maxQueueSize) {
      return this._safeReply(interaction, {
        embeds: [createErrorEmbed(`Queue-Limit erreicht (max. ${config.maxQueueSize} Songs).`)]
      });
    }

    state.queue.push(...songs);

    if (songs.length === 1) {
      await this._safeReply(interaction, {
        embeds: [createSuccessEmbed(`🎵 **${songs[0].title}** zur Queue hinzugefügt (Position: ${state.queue.length})`)]
      });
    } else {
      await this._safeReply(interaction, {
        embeds: [createSuccessEmbed(`🎵 **${songs.length} Songs** zur Queue hinzugefügt`)]
      });
    }

    if (!state.currentSong) {
      await this._connectAndPlay(state, voiceChannel, interaction.guildId);
    }
  }

  /**
   * Spotify Playlist/Album: Tracks in Batches laden.
   * Erste 3 sofort → Playback startet. Rest im Hintergrund in 5er-Batches.
   */
  async _playSpotifyPlaylist(interaction, url, state, voiceChannel) {
    // Spotify-Tracks scrapen (schnell, nur Metadaten)
    let tracks;
    try {
      tracks = await ytdlp.getSpotifyTracks(url);
    } catch (e) {
      console.error('Spotify scrape error:', e);
      return this._safeReply(interaction, { embeds: [createErrorEmbed('Konnte keine Spotify-Tracks laden.')] });
    }
    if (!tracks.length) {
      return this._safeReply(interaction, { embeds: [createErrorEmbed('Spotify-Playlist ist leer.')] });
    }

    await this._safeReply(interaction, {
      embeds: [createSuccessEmbed(`🎵 **${tracks.length} Spotify-Tracks** gefunden — lade in Batches...`)]
    });

    // Abort-Flag zurücksetzen
    state.spotifyAbort = false;
    state.spotifyLoading = true;

    const INITIAL_BATCH = 3;
    const BATCH_SIZE = 5;
    const guildId = interaction.guildId;

    // Erste 3 Tracks sofort laden (sequentiell, für schnellen Start)
    const firstTracks = tracks.splice(0, INITIAL_BATCH);
    for (const track of firstTracks) {
      if (state.spotifyAbort) break;
      const results = await ytdlp.searchYouTube(track.searchQuery, 1);
      if (results[0]) {
        state.queue.push({ ...results[0], requestedBy: null, source: 'spotify' });
      }
    }

    if (state.spotifyAbort || state.queue.length === 0) {
      state.spotifyLoading = false;
      return;
    }

    // Playback sofort starten
    if (!state.currentSong) {
      this._connectAndPlay(state, voiceChannel, guildId);
    }

    // Restliche Tracks im Hintergrund in Batches laden
    let loaded = state.queue.length;
    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      if (state.spotifyAbort) break;

      const batch = tracks.slice(i, i + BATCH_SIZE);
      // Batch parallel auflösen
      const results = await Promise.all(
        batch.map(async (track) => {
          if (state.spotifyAbort) return null;
          const res = await ytdlp.searchYouTube(track.searchQuery, 1);
          return res[0] ? { ...res[0], requestedBy: null, source: 'spotify' } : null;
        })
      );

      if (state.spotifyAbort) break;

      const resolved = results.filter(Boolean);
      state.queue.push(...resolved);
      loaded += resolved.length;

      // Fortschritt melden (alle 15 Songs)
      if (loaded % 15 < BATCH_SIZE && state.textChannel) {
        state.textChannel.send({
          embeds: [createSuccessEmbed(`⏳ ${loaded}/${loaded + tracks.length - i - batch.length} Spotify-Tracks geladen...`)]
        }).catch(() => {});
      }
    }

    state.spotifyLoading = false;
    if (!state.spotifyAbort && state.textChannel) {
      state.textChannel.send({
        embeds: [createSuccessEmbed(`✅ Alle **${loaded} Spotify-Tracks** geladen!`)]
      }).catch(() => {});
    }
  }

  async searchYouTube(query) {
    return ytdlp.searchYouTube(query, 10);
  }

  async _resolveQuery(query) {
    const songs = [];

    if (ytdlp.isSpotifyUrl(query)) {
      // Spotify → Track-Infos holen → auf YouTube suchen
      console.log(`[Spotify] Resolving: ${query}`);
      const tracks = await ytdlp.getSpotifyTracks(query);
      for (const track of tracks) {
        const results = await ytdlp.searchYouTube(track.searchQuery, 1);
        if (results[0]) {
          console.log(`[Spotify] "${track.title}" → YT: "${results[0].title}"`);
          songs.push({ ...results[0], requestedBy: null, source: 'spotify' });
        }
      }
    } else if (ytdlp.isYouTubePlaylistUrl(query)) {
      const videos = await ytdlp.getPlaylistInfo(query);
      for (const v of videos) {
        songs.push({ ...v, requestedBy: null, source: 'youtube' });
      }
    } else if (ytdlp.isYouTubeVideoUrl(query)) {
      const info = await ytdlp.getVideoInfo(query);
      songs.push({ ...info, requestedBy: null, source: 'youtube' });
    } else {
      // Suchbegriff → YouTube-Suche (erstes Ergebnis)
      const results = await ytdlp.searchYouTube(query, 1);
      if (results[0]) {
        console.log(`[Search] Query: "${query}" → Found: "${results[0].title}" (${results[0].url})`);
        songs.push({ ...results[0], requestedBy: null, source: 'youtube' });
      }
    }

    return songs;
  }

  async _connectAndPlay(state, voiceChannel, guildId) {
    // Prüfe ob bereits eine aktive Connection existiert (auch global via @discordjs/voice)
    let connection = getVoiceConnection(guildId);

    if (connection) {
      const status = connection.state.status;
      console.log(`[Voice] Existing connection found (status: ${status})`);

      if (status === VoiceConnectionStatus.Ready) {
        // Verbindung steht → direkt nutzen
        state.connection = connection;
      } else if (status === VoiceConnectionStatus.Destroyed) {
        // Zerstört → komplett neu erstellen
        connection = null;
      } else {
        // Mittendrin (signalling/connecting) → zerstören und warten
        console.log(`[Voice] Destroying stuck connection (${status})...`);
        try { connection.destroy(); } catch {}
        connection = null;
        // Kurz warten damit Discord den Leave registriert
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
      console.log(`[Voice] Creating new connection to ${voiceChannel.name} (${voiceChannel.id})...`);
      state.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true
      });

      // Debug: Log alle State-Wechsel
      state.connection.on('stateChange', (oldState, newState) => {
        console.log(`[Voice] State: ${oldState.status} → ${newState.status}`);
      });

      // Debug: Error handler
      state.connection.on('error', (error) => {
        console.error('[Voice] Connection error:', error);
      });

      state.connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(state.connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(state.connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          this.destroy(guildId);
        }
      });
    }

    // Warte bis die Connection wirklich Ready ist
    if (state.connection.state.status !== VoiceConnectionStatus.Ready) {
      console.log(`[Voice] Waiting for Ready (currently: ${state.connection.state.status})...`);
      try {
        await entersState(state.connection, VoiceConnectionStatus.Ready, 20_000);
      } catch (err) {
        console.error(`[Voice] Connection failed! Final status: ${state.connection.state.status}`);
        // Log networking details
        try {
          const networking = Reflect.get(state.connection.state, 'networking');
          if (networking) {
            console.error('[Voice] Networking state:', networking.state?.code || networking.state);
          }
        } catch {}
        if (state.textChannel) {
          state.textChannel.send({ embeds: [createErrorEmbed('Konnte nicht zum Voice-Channel verbinden. Prüfe Bot-Berechtigungen (Verbinden + Sprechen).')] });
        }
        return;
      }
    }
    console.log(`[Voice] Connection Ready! ✓`);

    // Subscribe audio player
    state.connection.subscribe(state.audioPlayer);

    if (state.autoLeaveTimer) {
      clearTimeout(state.autoLeaveTimer);
      state.autoLeaveTimer = null;
    }

    await this._playNext(guildId);
  }

  async _playNext(guildId) {
    const state = this.getPlayer(guildId);
    if (!state) return;

    if (state.queue.length === 0) {
      state.currentSong = null;
      state.startedAt = null;
      state.seekOffset = 0;
      this._updateTopic(state, null);
      await this._deleteControlMessage(state);
      this._startAutoLeaveTimer(guildId);
      if (state.textChannel) {
        state.textChannel.send({ embeds: [createSuccessEmbed('Queue ist leer. Spiele nichts mehr ab.')] });
      }
      return;
    }

    const song = state.queue.shift();
    state.currentSong = song;
    state.seekOffset = 0;

    await this._streamSong(state, song, 0, guildId);
  }

  async _streamSong(state, song, seekSeconds, guildId) {
    try {
      this._killProcesses(state);

      console.log(`[Play] Streaming: "${song.title}" → ${song.url}`);
      const { stream, processes } = ytdlp.createAudioStream(song.url, seekSeconds);
      state.currentProcesses = processes;

      const resource = createAudioResource(stream, {
        inputType: StreamType.Raw,
        inlineVolume: true
      });
      resource.volume.setVolume(state.volume);
      state.resource = resource;
      state.startedAt = Date.now();
      state.seekOffset = seekSeconds;

      state.audioPlayer.play(resource);
      console.log(`[Audio] Player state: ${state.audioPlayer.state.status}, Connection state: ${state.connection?.state?.status}`);

      if (seekSeconds === 0) {
        this._updateTopic(state, song);
        await this._sendControlMessage(state, song, guildId);
      }
    } catch (error) {
      console.error('Stream error:', error);
      if (state.textChannel) {
        state.textChannel.send({ embeds: [createErrorEmbed(`Fehler beim Streamen von **${song.title}**: ${error.message}`)] });
      }
      this._onSongEnd(guildId);
    }
  }

  _onSongEnd(guildId) {
    const state = this.getPlayer(guildId);
    if (!state) return;

    if (state.loop && state.currentSong) {
      state.queue.unshift(state.currentSong);
    } else if (state.loopQueue && state.currentSong) {
      state.queue.push(state.currentSong);
    }

    this._playNext(guildId);
  }

  // ──── Steuerung ────

  pause(guildId) {
    const state = this.getPlayer(guildId);
    if (!state || !state.currentSong) return false;
    state.audioPlayer.pause();
    return true;
  }

  resume(guildId) {
    const state = this.getPlayer(guildId);
    if (!state || !state.currentSong) return false;
    state.audioPlayer.unpause();
    return true;
  }

  skip(guildId) {
    const state = this.getPlayer(guildId);
    if (!state || !state.currentSong) return null;
    const skipped = state.currentSong;
    this._killProcesses(state);
    state.audioPlayer.stop();
    return skipped;
  }

  stop(guildId) {
    const state = this.getPlayer(guildId);
    if (!state) return false;
    state.spotifyAbort = true;
    state.queue = [];
    state.loop = false;
    state.loopQueue = false;
    state.currentSong = null;
    this._killProcesses(state);
    state.audioPlayer.stop();
    return true;
  }

  setVolume(guildId, volume) {
    const state = this.getPlayer(guildId);
    if (!state) return false;
    state.volume = Math.max(0, Math.min(1, volume));
    if (state.resource?.volume) {
      state.resource.volume.setVolume(state.volume);
    }
    return true;
  }

  getVolume(guildId) {
    const state = this.getPlayer(guildId);
    return state ? state.volume : config.defaultVolume;
  }

  async seek(guildId, seconds) {
    const state = this.getPlayer(guildId);
    if (!state || !state.currentSong) return false;
    if (seconds < 0 || seconds >= state.currentSong.duration) return false;
    await this._streamSong(state, state.currentSong, seconds, guildId);
    return true;
  }

  async forward(guildId, seconds) {
    const state = this.getPlayer(guildId);
    if (!state || !state.currentSong) return false;
    const currentPosition = this.getCurrentPosition(guildId);
    const newPosition = currentPosition + seconds;
    if (newPosition >= state.currentSong.duration) {
      this.skip(guildId);
      return true;
    }
    return this.seek(guildId, newPosition);
  }

  async rewind(guildId, seconds) {
    const state = this.getPlayer(guildId);
    if (!state || !state.currentSong) return false;
    const currentPosition = this.getCurrentPosition(guildId);
    const newPosition = Math.max(0, currentPosition - seconds);
    return this.seek(guildId, newPosition);
  }

  getCurrentPosition(guildId) {
    const state = this.getPlayer(guildId);
    if (!state || !state.currentSong || !state.startedAt) return 0;
    const elapsed = (Date.now() - state.startedAt) / 1000;
    return Math.floor(state.seekOffset + elapsed);
  }

  toggleLoop(guildId) {
    const state = this.getPlayer(guildId);
    if (!state) return null;
    state.loop = !state.loop;
    if (state.loop) state.loopQueue = false;
    return state.loop;
  }

  toggleLoopQueue(guildId) {
    const state = this.getPlayer(guildId);
    if (!state) return null;
    state.loopQueue = !state.loopQueue;
    if (state.loopQueue) state.loop = false;
    return state.loopQueue;
  }

  shuffle(guildId) {
    const state = this.getPlayer(guildId);
    if (!state || state.queue.length < 2) return false;
    for (let i = state.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.queue[i], state.queue[j]] = [state.queue[j], state.queue[i]];
    }
    return true;
  }

  remove(guildId, index) {
    const state = this.getPlayer(guildId);
    if (!state || index < 0 || index >= state.queue.length) return null;
    return state.queue.splice(index, 1)[0];
  }

  getQueue(guildId) {
    const state = this.getPlayer(guildId);
    if (!state) return { current: null, queue: [] };
    return {
      current: state.currentSong,
      queue: state.queue,
      loop: state.loop,
      loopQueue: state.loopQueue
    };
  }

  getNowPlaying(guildId) {
    const state = this.getPlayer(guildId);
    if (!state) return null;
    return {
      song: state.currentSong,
      position: this.getCurrentPosition(guildId),
      volume: state.volume,
      loop: state.loop,
      loopQueue: state.loopQueue,
      paused: state.audioPlayer.state.status === AudioPlayerStatus.Paused
    };
  }

  // ──── Auto-Leave ────

  _startAutoLeaveTimer(guildId) {
    const state = this.getPlayer(guildId);
    if (!state) return;

    if (state.autoLeaveTimer) clearTimeout(state.autoLeaveTimer);

    state.autoLeaveTimer = setTimeout(() => {
      if (state.textChannel) {
        state.textChannel.send({
          embeds: [createSuccessEmbed(`Automatisch den Voice-Channel verlassen (${config.autoLeaveTimeout}s Inaktivität).`)]
        });
      }
      this.destroy(guildId);
    }, config.autoLeaveTimeout * 1000);
  }

  handleVoiceStateUpdate(oldState, newState) {
    const guildId = oldState.guild.id || newState.guild.id;
    const state = this.getPlayer(guildId);
    if (!state || !state.connection) return;

    const channelId = state.connection.joinConfig.channelId;
    const channel = oldState.guild.channels.cache.get(channelId);
    if (!channel) return;

    const members = channel.members.filter(m => !m.user.bot);

    if (members.size === 0) {
      this._startAutoLeaveTimer(guildId);
    } else {
      if (state.autoLeaveTimer) {
        clearTimeout(state.autoLeaveTimer);
        state.autoLeaveTimer = null;
      }
    }
  }

  destroy(guildId) {
    const state = this.getPlayer(guildId);
    if (!state) return;

    state.spotifyAbort = true;
    this._updateTopic(state, null);
    this._deleteControlMessage(state);
    if (state.autoLeaveTimer) clearTimeout(state.autoLeaveTimer);
    this._killProcesses(state);
    state.audioPlayer.stop();
    if (state.connection) {
      state.connection.destroy();
    }
    this.players.delete(guildId);
  }
}

module.exports = new MusicPlayer();
