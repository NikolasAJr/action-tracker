import db from '../database/dbConntect.js';

export const renderDashboard = async (ctx) => {
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
			// Если срок прошел, ставим 0 и меняем статус для отображения

			if (daysLeft < 0) {
				daysLeft = 0;
				task.status = 'Просрочено';
			} else {
				task.daysLeft = daysLeft;
			}

			return { ...task };
		}
	});

	await ctx.render('index', { tasks: taskTree });
};

// Обновите createTask, чтобы принимать parent_id
export const createTask = async (ctx) => {
	const { title, assigned_to, deadline_at, status, parent_id } = ctx.request.body;

	// ... логика расчета daysLeft (как была) ...

	db.prepare(
		`
        INSERT INTO task (title, assigned_to, deadline_at, status, parent_id) 
        VALUES (?, ?, ?, ?, ?)
    `,
	).run(title, assigned_to, deadline_at, status, parent_id || null);

	ctx.redirect('/');
};

// Добавляем новую функцию удаления
export const deleteTask = async (ctx) => {
	const { id } = ctx.params;
	db.prepare('DELETE FROM task WHERE id = ?').run(id);
	ctx.redirect('/');
};
