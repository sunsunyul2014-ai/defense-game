const fs = require('fs');
const lines = fs.readFileSync('game.js', 'utf8').split('\n');
console.log(lines[35]);
