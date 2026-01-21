import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import Database from 'better-sqlite3';
import serve from 'koa-static';
import path from 'path';

const app = new Koa();
app.use(serve(path.join(process.cwd(), 'frontend'), { index: 'index.html' }));

const router = new Router();

// 1. Настройка базы данных SQLite
// В ESM режиме файл базы данных создается так же просто
const db = new Database('actions.db');

// Инициализация таблицы
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    assigned_to TEXT,
    status TEXT DEFAULT 'pending'
  )
`
).run();

// 2. Настройка Middleware
app.use(bodyParser());

// Получение всех задач
router.get('/tasks', (ctx) => {
	const tasks = db.prepare('SELECT * FROM tasks').all();
	ctx.body = tasks;
});

// Добавление новой задачи
router.post('/tasks', (ctx) => {
	const { title, assigned_to } = ctx.request.body;

	if (!title) {
		ctx.status = 400;
		ctx.body = { error: 'Название задачи обязательно' };
		return;
	}

	const insert = db.prepare('INSERT INTO tasks (title, assigned_to) VALUES (?, ?)');
	const info = insert.run(title, assigned_to);

	ctx.status = 201;
	ctx.body = { id: info.lastInsertRowid, title, assigned_to, status: 'pending' };
});

// 3. Подключение роутера к приложению
app.use(router.routes()).use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Action Tracker запущен: http://localhost:${PORT}`);
});
