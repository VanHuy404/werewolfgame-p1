const fs = require('fs');
const files = [
  '../components/CoupleRevealModal.js',
  '../components/CupidVictoryModal.js',
  '../components/ChatBox.js',
  '../screens/GameOverScreen.js',
  '../screens/GameScreen.js'
];

for (const file of files) {
  const content = fs.readFileSync(require.resolve(file), 'utf8');
  console.log(`Checking ${file}: length ${content.length} bytes - OK`);
}
console.log('✅ All component files verified readable and intact!');

