const { createRoom, joinRoom, assignRoles, checkWinCondition } = require('../server/gameLogic');
const { ROLES } = require('../server/constants');

console.log('--- TEST 1: Room Creation & Cupid Settings ---');
const { room } = createRoom('host1', 'Host', { numWolves: 1, numSeers: 1, numCupids: 1, numVillagers: 1 });
console.log('Room settings numCupids:', room.settings.numCupids);
if (room.settings.numCupids !== 1) throw new Error('numCupids failed');

console.log('--- TEST 2: Assign Roles ---');
joinRoom(room.code, 'p2', 'Alice');
joinRoom(room.code, 'p3', 'Bob');
joinRoom(room.code, 'p4', 'Charlie');
joinRoom(room.code, 'p5', 'David');
assignRoles(room);
const rolesAssigned = [...room.players.values()].map(p => p.role);
console.log('Assigned roles:', rolesAssigned);
if (!rolesAssigned.includes('cupid')) throw new Error('Cupid was not assigned');

console.log('--- TEST 3: Couple Win Condition (Last 2 Survivors) ---');
const pAlice = room.players.get('p2');
const pBob = room.players.get('p3');
pAlice.role = ROLES.WOLF;
pBob.role = ROLES.VILLAGER;
room.couple = ['p2', 'p3'];

// Giết tất cả những người khác
room.players.forEach(p => {
  if (p.id !== 'p2' && p.id !== 'p3') p.alive = false;
  else p.alive = true;
});

let winResult = checkWinCondition(room);
console.log('Win result last 2 survivors:', winResult);
if (!winResult.gameOver || winResult.winner !== 'couple') throw new Error('Couple win last 2 survivors failed');

console.log('--- TEST 4: Couple Win with Pied Piper ---');
pAlice.role = ROLES.PIED_PIPER;
pBob.role = ROLES.WOLF;
const pCharlie = room.players.get('p4');
pCharlie.alive = true;
pCharlie.role = ROLES.VILLAGER;
room.charmedPlayers = new Set(['p4']);

winResult = checkWinCondition(room);
console.log('Win result Piper couple charmed outsiders:', winResult);
if (!winResult.gameOver || winResult.winner !== 'couple') throw new Error('Piper couple win failed');

console.log('✅ ALL SERVER TESTS PASSED PERFECTLY!');

