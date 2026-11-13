const { createRoom, joinRoom, assignRoles } = require('../server/gameLogic');
const { ROLES } = require('../server/constants');

const roomResult = createRoom('host-123', 'HostPlayer', {
  numWolves: 1,
  numSeers: 1,
  numCupids: 1,
  numBodyguards: 1,
  numWitches: 1,
});

const room = roomResult.room;
joinRoom(room.code, 'p2', 'Bob', null);
joinRoom(room.code, 'p3', 'Charlie', null);
joinRoom(room.code, 'p4', 'David', null);
joinRoom(room.code, 'p5', 'Eve', null);

console.log('Room players count:', room.players.size);
console.log('Room settings numCupids:', room.settings.numCupids);

// Simulating start-game logic
assignRoles(room);

const rolesAssigned = [...room.players.values()].map(p => ({ name: p.name, role: p.role }));
console.log('Roles assigned:', rolesAssigned);

const cupidPlayer = [...room.players.values()].find(p => p.role === ROLES.CUPID);
if (!cupidPlayer) {
  console.error('❌ ERROR: Cupid player was NOT assigned!');
  process.exit(1);
} else {
  console.log('✅ SUCCESS: Cupid assigned to player:', cupidPlayer.name, '(Role:', cupidPlayer.role, ')');
}

