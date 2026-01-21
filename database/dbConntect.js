import Database from 'better-sqlite3';
const db = new Database('actions.db');

// Инициализация таблиц
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    assigned_to TEXT,
    deadline DATE,
    days_left INT,
    status TEXT
  )
`,
).run();

export default db;
