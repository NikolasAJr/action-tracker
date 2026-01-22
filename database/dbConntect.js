import Database from 'better-sqlite3';
const db = new Database('actions.db');

// Инициализация таблиц
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS task (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id     INTEGER DEFAULT NULL,
    
    -- Обязательные поля
    title         TEXT NOT NULL,
    assigned_to   TEXT NOT NULL,              -- Исполнитель
    deadline_at   DATE NOT NULL,              -- Срок выполнения
    status        TEXT NOT NULL,              -- Статус задачи
        
    -- Необязательные поля
    mto_number    TEXT,                       -- MTO номер
    object_name   TEXT,                       -- Объект
    comments      TEXT,                       -- Комментарии
    task_type     TEXT,                       -- Тип задачи
    priority      INTEGER,                    -- Приоритет
    created_by    TEXT,                       -- Создатель задачи

    -- Автоматические поля
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES task(id) ON DELETE CASCADE
  )
`,
).run();
export default db;
