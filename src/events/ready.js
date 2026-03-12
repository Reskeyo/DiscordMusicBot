module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Bot ist online als ${client.user.tag}`);
    client.user.setActivity('Musik | /play', { type: 2 }); // Type 2 = Listening
  }
};
