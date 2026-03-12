require('dotenv').config();

module.exports = {
  // Discord Bot Token (aus dem Discord Developer Portal)
  token: process.env.DISCORD_TOKEN || '',

  // Client ID des Bots (aus dem Discord Developer Portal)
  clientId: process.env.CLIENT_ID || '',

  // Zeit in Sekunden, nach der der Bot den Voice-Channel verlässt,
  // wenn niemand mehr im Channel ist
  autoLeaveTimeout: 120,

  // Standard-Lautstärke (0.0 bis 1.0)
  defaultVolume: 0.5,

  // Maximale Songs in der Queue
  maxQueueSize: 200,

  // Embed-Farben
  colors: {
    primary: 0x5865F2,   // Discord Blurple
    success: 0x57F287,   // Grün
    error: 0xED4245,     // Rot
    warning: 0xFEE75C,   // Gelb
    info: 0x5865F2       // Blau
  }
};
