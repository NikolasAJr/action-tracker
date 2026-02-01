/**
 * Контроллеры задач: рендер дашборда, создание, удаление и универсальное редактирование.
 */

import db from '../database/dbConnect.js';

/**
 * Рендерит дашборд с задачами и подзадачами, добавляя daysLeft и вычисленный статус.
 * @param {import('koa').Context} ctx
 */
export const renderDashboard = async (ctx) => {
	try {
		// Получаем все задачи
		const allTasks = db.prepare('SELECT * FROM task').all();
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		/** @type {any[]} */
		const mainTasks = allTasks.filter((t) => t.parent_id === null);
		/** @type {any[]} */
		const subTasks = allTasks.filter((t) => t.parent_id !== null);

		/** @type {any[]} */
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

		await ctx.render('index', { tasks: taskTree });
	} catch (err) {
		console.error('Ошибка при загрузке задач:', err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка при загрузке задач' };
	}
};

/**
 * Подготавливает задачу к отображению: считает дни и выставляет статус "Просрочено" при необходимости.
 * @param {any} task - Объект задачи из БД.
 * @param {Date} today - Текущая дата (обнулённое время).
 * @returns {any} Клонированный и дополненный объект задачи.
 */
function decorateTask(task, today) {
	const targetDate = new Date(task.deadline_at);
	targetDate.setHours(0, 0, 0, 0);
	const diffInMs = targetDate.getTime() - today.getTime();
	const daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

	// Сохраняем реальные дни (не отрицательные)
	task.daysLeft = daysLeft < 0 ? 0 : daysLeft;

	// Список статусов, которые считаются "активными"
	const activeStatuses = ['Открыто', 'В работе'];

	// Меняем статус для отображения, только если задача просрочена И всё еще активна
	if (daysLeft < 0 && activeStatuses.includes(task.status)) {
		task.status = 'Просрочено';
	}

	return { ...task };
}

/**
 * Создаёт новую задачу или подзадачу.
 * @param {import('koa').Context} ctx
 */
export const createTask = async (ctx) => {
	try {
		const { title, assigned_to, deadline_at, status, parent_id, category } = ctx.request.body;

		// Валидация на сервере
		if (!title || !assigned_to || !deadline_at) {
			// В идеале использовать flash-сообщения, но для простоты редиректим с ошибкой в query
			return ctx.redirect('/?error=missing_fields');
		}

		if (!db) throw new Error('БД не инициализирована');

		db.prepare(
			`INSERT INTO task (title, assigned_to, deadline_at, status, parent_id, category)
             VALUES (?, ?, ?, ?, ?, ?)`,
		).run(title, assigned_to, deadline_at, status || 'Открыто', parent_id || null, category || null);

		ctx.redirect('/');
	} catch (err) {
		console.error('Ошибка создания:', err);
		ctx.status = 500;
		ctx.body = 'Ошибка сервера при создании задачи. <a href="/">Назад</a>';
	}
};

/**
 * Удаляет задачу по id (подзадачи удаляются каскадно по FK).
 * @param {import('koa').Context} ctx
 */
export const deleteTask = async (ctx) => {
	try {
		if (!db) throw new Error('БД не инициализирована');
		const { id } = ctx.params;

		// Используем POST, параметры те же
		db.prepare('DELETE FROM task WHERE id = ?').run(id);
		ctx.redirect('/');
	} catch (err) {
		console.error('Ошибка удаления:', err);
		ctx.status = 500;
		ctx.body = 'Ошибка при удалении.';
	}
};

/**
 * Универсальное обновление полей задачи.
 * Принимает JSON-тело с любыми допустимыми полями и обновляет их в одной операции.
 * @param {import('koa').Context} ctx
 */
export const editTask = async (ctx) => {
	const { id } = ctx.params;
	const body = ctx.request.body || {};

	try {
		if (!db) throw new Error('БД не инициализирована');

		const allowedFields = ['title', 'category', 'assigned_to', 'deadline_at', 'status', 'comments'];
		const fieldsToUpdate = Object.keys(body).filter((key) => allowedFields.includes(key) && body[key] !== undefined);

		if (fieldsToUpdate.length === 0) {
			ctx.status = 400;
			ctx.body = { error: 'Нет полей для обновления' };
			return;
		}

		// Исправление времени: формируем локальную строку времени в JS, а не полагаемся на UTC в SQL
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

		const setClause = fieldsToUpdate.map((key) => `${key} = ?`).join(', ');
		const values = fieldsToUpdate.map((key) => body[key]);

		// Добавляем дату обновления вручную
		const sql = `UPDATE task SET ${setClause}, updated_at = ? WHERE id = ?`;

		// Добавляем now и id в конец массива значений
		db.prepare(sql).run(...values, now, id);

		console.log(`Задача ${id} обновлена`);
		ctx.body = { success: true };
	} catch (err) {
		console.error('Ошибка БД:', err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка сервера' };
	}
};
