import db from '../database/dbConnect.js';

/**
 * Рендерит дашборд.
 */
export const renderDashboard = async (ctx) => {
	try {
		const allTasks = db.prepare('SELECT * FROM task').all();
		// НОВОЕ: Получаем список категорий
		const categories = db.prepare('SELECT * FROM category').all();

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const mainTasks = allTasks.filter((t) => t.parent_id === null);
		const subTasks = allTasks.filter((t) => t.parent_id !== null);
		const taskTree = [];

		mainTasks.forEach((main) => {
			const mainTask = decorateTask(main, today);
			taskTree.push({ ...mainTask, isSubtask: false });

			const children = subTasks.filter((sub) => sub.parent_id === main.id);
			children.forEach((child) => {
				const childTask = decorateTask(child, today);
				taskTree.push({ ...childTask, isSubtask: true });
			});
		});

		// Передаем categories в шаблон
		await ctx.render('index', { tasks: taskTree, categories });
	} catch (err) {
		console.error('Ошибка при загрузке задач:', err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка при загрузке задач' };
	}
};

// Вспомогательная функция для подсчета дней и статусов
function decorateTask(task, today) {
	const targetDate = new Date(task.deadline_at);
	targetDate.setHours(0, 0, 0, 0);
	const diffInMs = targetDate.getTime() - today.getTime();
	const daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

	task.daysLeft = daysLeft < 0 ? 0 : daysLeft;
	const activeStatuses = ['Открыто', 'В работе'];
	if (daysLeft < 0 && activeStatuses.includes(task.status)) {
		task.status = 'Просрочено';
	}
	return { ...task };
}

// ... Остальные методы (createTask, deleteTask, editTask) остаются без изменений,
// так как они работают с полями динамически или через стандартный INSERT/UPDATE
export const createTask = async (ctx) => {
	try {
		if (!db) throw new Error('БД не инициализирована');

		const { title, assigned_to, deadline_at, status, parent_id, category, priority } = ctx.request.body;
		const currentUser = ctx.state.user; // Получаем из сессии
		const finalAssignee = assigned_to || currentUser.username;

		db.prepare(
			`INSERT INTO task (title, assigned_to, deadline_at, status, parent_id, category, priority)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
		).run(title, finalAssignee, deadline_at, status, parent_id || null, category || null, priority || 1);

		ctx.redirect('/');
	} catch (err) {
		console.error(err);
		ctx.status = 500;
		ctx.body = 'Ошибка создания задачи';
	}
};

export const deleteTask = async (ctx) => {
	try {
		const { id } = ctx.params;
		if (!db) throw new Error('БД не инициализирована');
		db.prepare('DELETE FROM task WHERE id = ?').run(id);
		ctx.body = { success: true, id };
	} catch (err) {
		console.error(err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка удаления' };
	}
};

export const editTask = async (ctx) => {
	const { id } = ctx.params;
	const body = ctx.request.body || {};
	const allowedFields = ['title', 'category', 'assigned_to', 'deadline_at', 'status', 'mto_number', 'object_name', 'comments', 'task_type', 'priority', 'created_by'];
	const fieldsToUpdate = Object.keys(body).filter((key) => allowedFields.includes(key) && body[key] !== undefined);

	if (fieldsToUpdate.length === 0) {
		ctx.status = 400;
		ctx.body = { error: 'Нет полей' };
		return;
	}
	try {
		const setClause = fieldsToUpdate.map((key) => `${key} = ?`).join(', ');
		const values = fieldsToUpdate.map((key) => body[key]);
		const sql = `UPDATE task SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
		db.prepare(sql).run(...values, id);
		ctx.body = { success: true };
	} catch (err) {
		ctx.status = 500;
		ctx.body = { error: 'Ошибка БД' };
	}
};

export const getTaskDetails = async (ctx) => {
	const { id } = ctx.params;
	try {
		if (!db) throw new Error('БД не инициализирована');

		const task = db.prepare('SELECT * FROM task WHERE id = ?').get(id);

		if (!task) {
			ctx.status = 404;
			ctx.body = { error: 'Задача не найдена' };
			return;
		}

		ctx.body = task;
	} catch (err) {
		console.error('Ошибка получения деталей:', err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка сервера' };
	}
};

export const getComments = async (ctx) => {
	const { id } = ctx.params;
	try {
		if (!db) throw new Error('БД не инициализирована');
		const comments = db.prepare('SELECT * FROM task_comment WHERE task_id = ? ORDER BY created_at ASC').all(id); //DESC
		ctx.body = comments;
	} catch (err) {
		console.error('Ошибка получения комментариев:', err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка получения комментариев' };
	}
};

export const addComment = async (ctx) => {
	const { id } = ctx.params;
	// const { author, text } = ctx.request.body;
	const { text } = ctx.request.body;

	try {
		if (!db) throw new Error('БД не инициализирована');

		if (!text || !text.trim()) {
			ctx.status = 400;
			return;
		}

		const author = ctx.state.user.username; // Вместо 'Admin'

		const info = db.prepare('INSERT INTO task_comment (task_id, author, text) VALUES (?, ?, ?)').run(id, author, text);

		const newComment = db.prepare('SELECT * FROM task_comment WHERE id = ?').get(info.lastInsertRowid);
		ctx.body = newComment;
	} catch (err) {
		console.error('Ошибка добавления комментария:', err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка отправки' };
	}
};
