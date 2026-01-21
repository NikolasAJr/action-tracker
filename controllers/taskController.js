import db from '../database/dbConntect.js';

export const renderDashboard = async (ctx) => {
	const tasks = db.prepare('SELECT * FROM tasks').all();
	// Передаем массив задач в шаблон index.ejs
	await ctx.render('index', { tasks });
};

// Обработка создания новой задачи
export const createTask = async (ctx) => {
	const { title, assigned_to, deadline, status } = ctx.request.body;

	// 1. Получаем текущую дату (без учета часов, чтобы расчет был по дням)
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// 2. Преобразуем дедлайн из формы в объект даты
	const targetDate = new Date(deadline);
	targetDate.setHours(0, 0, 0, 0);

	// 3. Вычисляем разницу в миллисекундах и переводим в дни
	// (1000 мс * 60 сек * 60 мин * 24 часа = 86 400 000 мс в сутках)
	const diffInMs = targetDate.getTime() - today.getTime();
	let daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

	// 4. Логика статуса и дней
	let finalStatus = ''; // Статус по умолчанию
	if (daysLeft <= 0) {
		daysLeft = 0;
		finalStatus = 'Просрочена';
	} else {
		finalStatus = status;
	}

	// 5. Сохраняем в базу
	try {
		db.prepare(
			`
            INSERT INTO tasks (title, assigned_to, deadline, days_left, status) 
            VALUES (?, ?, ?, ?, ?)
        `,
		).run(title, assigned_to, deadline, daysLeft, finalStatus);
	} catch (error) {
		console.error('Ошибка при вставке в БД:', error);
	}

	ctx.redirect('/');
};
