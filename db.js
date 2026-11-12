const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'db.json');

let data = { users: [], tasks: [] };

function loadDb() {
  if (fs.existsSync(DB_PATH)) {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    data = JSON.parse(raw);
  } else {
    data = { users: [], tasks: [] };
  }
}

function saveDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getDb() {
  return data;
}

module.exports = { loadDb, saveDb, getDb };
