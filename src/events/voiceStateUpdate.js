const player = require('../player/MusicPlayer');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  execute(oldState, newState) {
    player.handleVoiceStateUpdate(oldState, newState);
  }
};
