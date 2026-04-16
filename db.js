const Database = require('better-sqlite3');
const db = new Database('tweets.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT    UNIQUE NOT NULL,
    password TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    author   TEXT    NOT NULL,
    content  TEXT    NOT NULL,
    date     TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id       TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created  TEXT NOT NULL
  );
`);

module.exports = db;