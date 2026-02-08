/**
 * Подключение к SQLite и инициализация таблиц.
 */

import Database from 'better-sqlite3';

const db = new Database('actions.db');

// 1. Таблица задач
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS task (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id     INTEGER DEFAULT NULL,
    title         TEXT NOT NULL,
    assigned_to   TEXT NOT NULL,
    deadline_at   DATE NOT NULL,
    status        TEXT NOT NULL,
    category      TEXT, 
    mto_number    TEXT,
    object_name   TEXT,
    comments      TEXT,
    task_type     TEXT,
    priority      INTEGER,
    created_by    TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES task(id) ON DELETE CASCADE
  )
`,
).run();

// 2. Таблица категорий (НОВОЕ)
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS category (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )
`,
).run();

// 3. Таблица комментариев (Чат)
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS task_comment (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     INTEGER NOT NULL,
    author      TEXT NOT NULL,
    text        TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE
  )
`,
).run();

// 4. Заполняем категории, если таблица пуста
const catCount = db.prepare('SELECT count(*) as count FROM category').get();
if (catCount.count === 0) {
	const insertCat = db.prepare('INSERT INTO category (name) VALUES (?)');
	const defaults = ['Разработка', 'Дизайн', 'Маркетинг', 'Тестирование', 'Менеджмент'];
	defaults.forEach((c) => insertCat.run(c));
}

// 5. Таблица пользователей
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS user (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT NOT NULL UNIQUE,
    full_name   TEXT,
    role        TEXT DEFAULT 'user', -- 'admin' или 'user'
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`,
).run();

// Создаем дефолтного админа (например, твой текущий юзер)
const myUser = process.env.USERNAME || 'admin';
const userCheck = db.prepare('SELECT count(*) as count FROM user WHERE username = ?').get(myUser);
if (userCheck.count === 0) {
	db.prepare('INSERT INTO user (username, full_name, role) VALUES (?, ?, ?)').run(myUser, 'Главный Администратор', 'admin');
}

// 6. Миграция: Добавляем колонку theme, если её нет
try {
	const userColumns = db.prepare('PRAGMA table_info(user)').all();
	const hasTheme = userColumns.some((col) => col.name === 'theme');
	if (!hasTheme) {
		db.prepare("ALTER TABLE user ADD COLUMN theme TEXT DEFAULT 'standard'").run();
		console.log('Migrated: theme column added to user table');
	}
} catch (err) {
	console.error('Migration error:', err);
}

export default db;
