# Discord Music Bot 🎵

Ein selbst-gehosteter Discord Musikbot mit YouTube & Spotify Support. Funktioniert auf mehreren Servern gleichzeitig.

## Features

- 🎵 **YouTube** — Songs, Playlists, Suchbegriffe mit Autocomplete
- 🟢 **Spotify** — Tracks, Playlists & Alben (werden automatisch auf YouTube gesucht)
- 🎛️ **Player-Buttons** — Steuerung direkt per Buttons im Chat (Pause, Skip, Stop, Shuffle, Loop, Seek, Disconnect)
- 🔊 **Lautstärke** — 0-100%
- ⏱️ **Seek/Forward/Rewind** — Springe zu Zeitstempeln
- 📋 **Queue** — bis zu 200 Songs, Shuffle, Remove
- 🔁 **Loop** — Song-Loop oder Queue-Loop
- 🚪 **Auto-Leave** — Verlässt den Channel nach Inaktivität
- 🌐 **Multi-Server** — Funktioniert auf beliebig vielen Servern gleichzeitig
- 🔒 **Channel-Lock** — Pro Server einen Musik-Channel festlegen (`/setchannel`)

## Voraussetzungen

- [Node.js](https://nodejs.org/) v18+
- [ffmpeg](https://ffmpeg.org/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)

## Installation

### Linux (empfohlen)

```bash
git clone https://github.com/DEIN_USER/DiscordMusicBot.git
cd DiscordMusicBot
chmod +x setup.sh
./setup.sh
```

Das Setup-Script installiert automatisch fehlende Dependencies (ffmpeg, yt-dlp, Node-Pakete).

### Windows

1. Lade [ffmpeg](https://www.gyan.dev/ffmpeg/builds/) und [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases) herunter
2. Lege die `.exe`-Dateien in den `bin/` Ordner
3. `npm install`

### Konfiguration

```bash
cp .env.example .env
nano .env
```

```env
DISCORD_TOKEN=dein_bot_token
CLIENT_ID=deine_client_id
```

**Wo bekomme ich die?**

1. [Discord Developer Portal](https://discord.com/developers/applications) → neue Application
2. **Bot** → Reset Token → Token kopieren
3. **Bot** → Privileged Intents: `Message Content Intent` aktivieren
4. **OAuth2** → URL Generator:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Embed Links`, `Manage Channels`, `Connect`, `Speak`
5. URL öffnen → Bot einladen

### Starten

```bash
npm run deploy    # Slash-Commands registrieren (einmalig, dauert bis zu 1h)
npm start         # Bot starten
```

### Dauerbetrieb (PM2)

```bash
npm install -g pm2
pm2 start src/index.js --name music-bot
pm2 save
pm2 startup    # Auto-Start nach Reboot
```

## Commands

| Command | Beschreibung |
|---------|-------------|
| `/play <song>` | Song abspielen (YouTube/Spotify URL oder Suche) |
| `/pause` | Pausieren |
| `/resume` | Fortsetzen |
| `/skip` | Überspringen |
| `/stop` | Stoppen & Queue leeren |
| `/queue` | Warteschlange anzeigen |
| `/nowplaying` | Aktueller Song mit Fortschritt |
| `/volume <0-100>` | Lautstärke |
| `/seek <zeit>` | Zu Zeitstempel springen (`1:30` oder `90`) |
| `/forward <sek>` | Vorspulen |
| `/rewind <sek>` | Zurückspulen |
| `/loop` | Song-Loop / Queue-Loop / Aus |
| `/shuffle` | Queue mischen |
| `/remove <pos>` | Song aus Queue entfernen |
| `/disconnect` | Voice-Channel verlassen |
| `/setchannel [ch]` | Musik-Channel festlegen (Admin) |
| `/help` | Alle Commands anzeigen |

## Troubleshooting

- **Kein Sound**: `ffmpeg -version` und `yt-dlp --version` prüfen
- **Bot tritt nicht bei**: Bot-Berechtigungen prüfen (Connect + Speak)
- **Commands nicht sichtbar**: `npm run deploy` ausführen, bis zu 1h warten
- **YouTube blockiert**: yt-dlp updaten: `yt-dlp -U` oder `sudo yt-dlp -U`
