const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`Registriere ${commands.length} Slash-Commands global...`);

    // Global registrieren (funktioniert auf allen Servern)
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );
    console.log('Globale Commands erfolgreich registriert! (Kann bis zu 1h dauern bis sie überall sichtbar sind)');

    // Alte Guild-Commands aufräumen falls vorhanden
    if (process.env.GUILD_ID) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(config.clientId, process.env.GUILD_ID),
          { body: [] }
        );
        console.log(`Alte Guild-Commands für ${process.env.GUILD_ID} gelöscht.`);
      } catch {}
    }
  } catch (error) {
    console.error('Fehler beim Registrieren der Commands:', error);
  }
})();
