const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./autoklip.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    verified INTEGER DEFAULT 0,
    points INTEGER DEFAULT 30,
    created_at TEXT
  )`);
});

module.exports = db;
