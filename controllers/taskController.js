import db from '../database/dbConntect.js';

export const renderDashboard = async (ctx) => {
	const tasks = db.prepare('SELECT * FROM tasks').all();
	// Передаем массив задач в шаблон index.ejs
	await ctx.render('index', { tasks });
};

// Обработка создания новой задачи
export const createTask = async (ctx) => {
	// Достаем статус из формы вместе с остальными полями
	const { title, assigned_to, deadline, status } = ctx.request.body;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const targetDate = new Date(deadline);
	targetDate.setHours(0, 0, 0, 0);

	const diffInMs = targetDate.getTime() - today.getTime();
	let daysLeft = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	// Приоритет: если срок вышел — "Просрочена",
	// иначе — тот статус, который пришел из формы
	let finalStatus = status;

	if (daysLeft <= 0) {
		daysLeft = 0;
		finalStatus = 'Просрочена';
	}

	db.prepare(
		`
        INSERT INTO tasks (title, assigned_to, deadline, days_left, status) 
        VALUES (?, ?, ?, ?, ?)
    `,
	).run(title, assigned_to, deadline, daysLeft, finalStatus);

	ctx.redirect('/');
};

// Добавляем новую функцию удаления
export const deleteTask = async (ctx) => {
	const { id } = ctx.params;
	db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
	ctx.redirect('/');
};
