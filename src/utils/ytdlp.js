const { spawn, execFile } = require('child_process');
const https = require('https');
const path = require('path');
const fs = require('fs');

// Plattform-unabhängig: bin/ Ordner oder System-PATH
const BIN_DIR = path.join(__dirname, '..', '..', 'bin');
const isWindows = process.platform === 'win32';

function findBinary(name) {
  // Erst im bin/ Ordner suchen
  const exeName = isWindows ? `${name}.exe` : name;
  const localPath = path.join(BIN_DIR, exeName);
  if (fs.existsSync(localPath)) return localPath;
  // Fallback: System-PATH (Linux: installiert via apt/pip)
  return name;
}

const YT_DLP = findBinary('yt-dlp');
const FFMPEG = findBinary('ffmpeg');

/**
 * Führt yt-dlp aus und gibt das JSON-Ergebnis zurück.
 */
function execYtDlp(args, timeout = 15000) {
  return new Promise((resolve, reject) => {
    execFile(YT_DLP, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

/**
 * Schnelle YouTube-Suchvorschläge via Google Suggest API (<200ms).
 * Gibt Textvorschläge zurück (keine Video-URLs).
 */
function suggestYouTube(query) {
  return new Promise((resolve) => {
    const url = `https://clients1.google.com/complete/search?client=youtube&hl=de&ds=yt&q=${encodeURIComponent(query)}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 2500 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          // Response: window.google.ac.h(["query",[["suggestion",0,[...]],...]])
          const match = data.match(/\((.+)\)$/);
          if (match) {
            const parsed = JSON.parse(match[1]);
            const suggestions = parsed[1].map(s => s[0]);
            resolve(suggestions.slice(0, 10));
          } else {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

/**
 * Sucht auf YouTube und gibt bis zu `limit` Ergebnisse zurück.
 */
async function searchYouTube(query, limit = 10) {
  const args = [
    `ytsearch${limit}:${query}`,
    '--dump-json',
    '--flat-playlist',
    '--no-warnings',
    '--skip-download'
  ];

  try {
    const stdout = await execYtDlp(args, 20000);
    const results = stdout.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    return results.map(r => ({
      title: r.title || 'Unbekannt',
      url: r.webpage_url || (r.id ? `https://www.youtube.com/watch?v=${r.id}` : r.url),
      duration: r.duration || 0,
      durationFormatted: formatSeconds(r.duration),
      thumbnail: r.thumbnails?.[r.thumbnails.length - 1]?.url || null,
      id: r.id
    }));
  } catch (error) {
    console.error('yt-dlp search error:', error.message);
    return [];
  }
}

/**
 * Holt Video-Infos von einer YouTube-URL.
 */
async function getVideoInfo(url) {
  const args = [
    url,
    '--dump-json',
    '--no-warnings',
    '--no-playlist',
    '--skip-download'
  ];

  const stdout = await execYtDlp(args);
  const info = JSON.parse(stdout);
  return {
    title: info.title,
    url: info.webpage_url || url,
    duration: info.duration || 0,
    durationFormatted: formatSeconds(info.duration),
    thumbnail: info.thumbnail || info.thumbnails?.[info.thumbnails.length - 1]?.url || null,
    id: info.id
  };
}

/**
 * Holt alle Videos einer Playlist.
 */
async function getPlaylistInfo(url) {
  const args = [
    url,
    '--dump-json',
    '--flat-playlist',
    '--no-warnings',
    '--skip-download'
  ];

  const stdout = await execYtDlp(args, 60000);
  const results = stdout.trim().split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  return results.map(r => ({
    title: r.title || 'Unbekannt',
    url: r.url?.startsWith('http') ? r.url : `https://www.youtube.com/watch?v=${r.id}`,
    duration: r.duration || 0,
    durationFormatted: formatSeconds(r.duration),
    thumbnail: r.thumbnails?.[r.thumbnails.length - 1]?.url || null,
    id: r.id
  }));
}

/**
 * Erstellt einen Audio-Stream (Readable) über yt-dlp → ffmpeg.
 * Unterstützt Seeking über seekSeconds.
 */
function createAudioStream(url, seekSeconds = 0) {
  // yt-dlp holt die beste Audio-URL und piped zu stdout
  const ytdlpArgs = [
    url,
    '-f', 'ba/b',
    '-o', '-',
    '--no-warnings',
    '--no-playlist',
    '--quiet'
  ];

  // ffmpeg konvertiert zu Raw PCM (s16le) — damit funktioniert inlineVolume
  const ffmpegArgs = [
    '-hide_banner',
    '-loglevel', 'error',
    '-probesize', '200000',
    '-analyzeduration', '0',
    '-fflags', '+discardcorrupt',
    '-err_detect', 'ignore_err',
    ...(seekSeconds > 0 ? ['-ss', String(seekSeconds)] : []),
    '-i', 'pipe:0',
    '-vn',
    '-f', 's16le',
    '-acodec', 'pcm_s16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ];

  const ytdlp = spawn(YT_DLP, ytdlpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  const ffmpeg = spawn(FFMPEG, ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

  ytdlp.stdout.pipe(ffmpeg.stdin);

  // Error-Logging
  ytdlp.stderr.on('data', d => console.error('yt-dlp stderr:', d.toString()));
  ffmpeg.stderr.on('data', d => console.error('ffmpeg stderr:', d.toString()));

  ytdlp.on('error', (e) => { console.error('yt-dlp process error:', e); ffmpeg.kill(); });
  ffmpeg.on('error', (e) => { console.error('ffmpeg process error:', e); ytdlp.kill(); });

  // Verhindere unhandled error auf stdin wenn yt-dlp frühzeitig beendet
  ffmpeg.stdin.on('error', () => {});

  // Cleanup-Funktion anhängen
  ffmpeg.stdout.cleanup = () => {
    ytdlp.kill();
    ffmpeg.kill();
  };

  return {
    stream: ffmpeg.stdout,
    type: 'raw',
    processes: { ytdlp, ffmpeg }
  };
}

/**
 * Prüft ob eine URL eine YouTube-Video-URL ist.
 */
function isYouTubeVideoUrl(url) {
  return /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)/i.test(url);
}

/**
 * Prüft ob eine URL eine YouTube-Playlist-URL ist.
 */
function isYouTubePlaylistUrl(url) {
  return /^https?:\/\/(www\.)?youtube\.com\/(playlist\?list=|watch\?.*list=)/i.test(url);
}

function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ──── Spotify Support ────

function isSpotifyUrl(url) {
  return /^https?:\/\/open\.spotify\.com\/(track|album|playlist)\//i.test(url);
}

function getSpotifyType(url) {
  const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/i);
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

/**
 * Holt Spotify-Track-Info über die Embed-API (kein API-Key nötig).
 */
function fetchSpotifyEmbed(url) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    https.get(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Spotify embed parse error')); }
      });
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Spotify timeout')); });
  });
}

/**
 * Holt Details eines Spotify-Tracks via der internen Spotify API.
 * Gibt {title, artist, duration, searchQuery} zurück.
 */
async function getSpotifyTrack(url) {
  // Spotify Embed API liefert Titel
  const embed = await fetchSpotifyEmbed(url);
  // embed.title = "Songname - Interpret"
  const title = embed.title || '';
  return { title, searchQuery: title };
}

/**
 * Fetcht eine URL und folgt Redirects. Gibt den Body als String zurück.
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Fetch timeout')); });
  });
}

/**
 * Holt alle Tracks einer Spotify-Playlist oder eines Albums via Embed-Seiten-Scraping.
 * Extrahiert Track-Daten aus dem eingebetteten `resource`-JSON der Spotify Embed-Seite.
 */
async function getSpotifyTracks(url) {
  const info = getSpotifyType(url);
  if (!info) return [];

  if (info.type === 'track') {
    const track = await getSpotifyTrack(url);
    return [track];
  }

  // Embed-Seite scrapen — enthält alle Tracks als JSON
  try {
    const embedUrl = `https://open.spotify.com/embed/${info.type}/${info.id}`;
    const html = await fetchUrl(embedUrl);

    // Spotify bettet Track-Daten als URL-encoded JSON im "resource"-Feld ein
    const resMatch = html.match(/resource":"([^"]+)"/);
    if (resMatch) {
      const decoded = decodeURIComponent(resMatch[1]);
      const data = JSON.parse(decoded);
      const trackList = data.trackList;
      if (trackList && trackList.length > 0) {
        return trackList.map(t => ({
          title: `${t.title} - ${t.subtitle}`,
          searchQuery: `${t.title} ${t.subtitle}`
        }));
      }
    }

    // Fallback: __NEXT_DATA__
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (nextMatch) {
      const nextData = JSON.parse(nextMatch[1]);
      const entity = nextData?.props?.pageProps?.state?.data?.entity;
      if (entity?.trackList) {
        return entity.trackList.map(t => ({
          title: `${t.title} - ${t.subtitle}`,
          searchQuery: `${t.title} ${t.subtitle}`
        }));
      }
    }

    throw new Error('No track data found in embed page');
  } catch (e) {
    console.error('Spotify playlist scrape error:', e.message);
    // Letzter Fallback: oEmbed für den Playlist-Namen
    try {
      const embed = await fetchSpotifyEmbed(url);
      return [{ title: embed.title, searchQuery: embed.title }];
    } catch {
      return [];
    }
  }
}

module.exports = {
  suggestYouTube,
  searchYouTube,
  getVideoInfo,
  getPlaylistInfo,
  createAudioStream,
  isYouTubeVideoUrl,
  isYouTubePlaylistUrl,
  isSpotifyUrl,
  getSpotifyType,
  getSpotifyTracks,
  FFMPEG,
  YT_DLP
};
