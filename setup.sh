#!/bin/bash
set -e

echo "=== Discord Music Bot — Linux Setup ==="
echo ""

# Node.js prüfen
if ! command -v node &> /dev/null; then
    echo "❌ Node.js nicht gefunden. Installiere mit:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "   sudo apt install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo "✓ Node.js $(node -v)"

# ffmpeg prüfen/installieren
if ! command -v ffmpeg &> /dev/null; then
    echo "→ ffmpeg nicht gefunden, installiere..."
    sudo apt update && sudo apt install -y ffmpeg
else
    echo "✓ ffmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')"
fi

# yt-dlp prüfen/installieren
if ! command -v yt-dlp &> /dev/null; then
    echo "→ yt-dlp nicht gefunden, installiere..."
    sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
    sudo chmod a+rx /usr/local/bin/yt-dlp
else
    echo "✓ yt-dlp $(yt-dlp --version)"
fi

# npm dependencies installieren
echo ""
echo "→ Installiere Node.js Dependencies..."
npm install

# .env prüfen
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "⚠️  .env Datei erstellt! Bitte ausfüllen:"
    echo "   nano .env"
    echo ""
    echo "   DISCORD_TOKEN=dein_bot_token"
    echo "   CLIENT_ID=deine_client_id"
    echo ""
    exit 0
fi

echo ""
echo "=== Setup abgeschlossen! ==="
echo ""
echo "Starten mit:"
echo "  npm run deploy    # Slash-Commands registrieren (einmalig)"
echo "  npm start         # Bot starten"
echo ""
echo "Oder mit PM2 (Dauerbetrieb):"
echo "  npm install -g pm2"
echo "  pm2 start src/index.js --name music-bot"
echo "  pm2 save"
echo "  pm2 startup       # Auto-Start nach Reboot"
