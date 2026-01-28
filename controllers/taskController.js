import db from '../database/dbConntect.js';

export const renderDashboard = async (ctx) => {
	try {
		// Получаем все задачи
		const allTasks = db.prepare('SELECT * FROM task').all();
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Разделяем на основные и подзадачи
		// @ts-ignore
		const mainTasks = allTasks.filter((t) => t.parent_id === null);
		// @ts-ignore
		const subTasks = allTasks.filter((t) => t.parent_id !== null);

		// Собираем иерархию: после каждой основной задачи вставляем её подзадачи
		const taskTree = [];
		mainTasks.forEach((main) => {
			// @ts-ignore
			let mainTask = innerTaskHandler(main);
			taskTree.push(Object.assign({}, mainTask, { isSubtask: false }));

			// @ts-ignore
			const children = subTasks.filter((sub) => sub.parent_id === main.id);
			children.forEach((child) => {
				let childTask = innerTaskHandler(child);
				taskTree.push(Object.assign({}, childTask, { isSubtask: true }));
			});

			/**
			 * @param {object} task
			 */
			function innerTaskHandler(task) {
				const targetDate = new Date(task.deadline_at);
				targetDate.setHours(0, 0, 0, 0);
				const diffInMs = targetDate.getTime() - today.getTime();
				let daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

				// Сохраняем реальные дни
				task.daysLeft = daysLeft < 0 ? 0 : daysLeft;

				// Список статусов, которые считаются "активными"
				const activeStatuses = ['Открыто', 'В работе'];

				// Меняем статус для отображения, только если задача просрочена И всё еще активна
				if (daysLeft < 0 && activeStatuses.includes(task.status)) {
					task.status = 'Просрочено';
				}

				return { ...task };
			}
		});

		await ctx.render('index', { tasks: taskTree });
	} catch (err) {
		console.error('Ошибка при загрузке задач:', err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка при загрузке задач' };
	}
};

// Обновите createTask, чтобы принимать parent_id
export const createTask = async (ctx) => {
	try {
		const { title, assigned_to, deadline_at, status, parent_id } = ctx.request.body;

		if (!db) {
			throw new Error('БД еще не была инициализирована');
		}

		db.prepare(
			`
			INSERT INTO task (title, assigned_to, deadline_at, status, parent_id) 
			VALUES (?, ?, ?, ?, ?)
		`,
		).run(title, assigned_to, deadline_at, status, parent_id || null);

		ctx.redirect('/');
	} catch (err) {
		console.error('Ошибка при создании задачи:', err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка при создании задачи' };
	}
};

// Добавляем новую функцию удаления
export const deleteTask = async (ctx) => {
	try {
		if (!db) {
			throw new Error('БД еще не была инициализирована');
		}

		const { id } = ctx.params;
		db.prepare('DELETE FROM task WHERE id = ?').run(id);
		ctx.redirect('/');
	} catch (err) {
		console.error('Ошибка при удалении задачи:', err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка при удалении задачи' };
	}
};

export const editTask = async (ctx) => {
	const { id } = ctx.params;
	const { status, title } = ctx.request.body; // Получаем и статус, и название

	try {
		if (!db) throw new Error('БД еще не была инициализирована');

		// Если пришло название
		if (title !== undefined) {
			db.prepare('UPDATE task SET title = ? WHERE id = ?').run(title, id);
		}

		// Если пришел статус
		if (status !== undefined) {
			db.prepare('UPDATE task SET status = ? WHERE id = ?').run(status, id);
		}

		console.log(`Задача ${id} обновлена`);
		ctx.body = { success: true };
	} catch (err) {
		console.error('Ошибка БД:', err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка при обновлении' };
	}
};
