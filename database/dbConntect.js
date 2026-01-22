import Database from 'better-sqlite3';
const db = new Database('actions.db');

// Инициализация таблиц
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER DEFAULT NULL,
    task_description TEXT NOT NULL,
    assigned_to TEXT,
    deadline DATE,
    status TEXT,
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
  )
`,
).run();
export default db;
