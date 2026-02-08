import db from '../database/dbConnect.js';

export const renderLogin = async (ctx) => {
	// Автоопределение пользователя Windows
	const defaultUser = process.env.USERNAME || 'user';
	await ctx.render('login', { defaultUser });
};

export const login = async (ctx) => {
	const { username } = ctx.request.body;

	if (!username) {
		return ctx.redirect('/login');
	}

	const cleanName = username.trim();

	// 1. Ищем пользователя
	let user = db.prepare('SELECT * FROM user WHERE username = ?').get(cleanName);

	// 2. Если нет - регистрируем автоматически (Auto-Provisioning)
	if (!user) {
		const info = db.prepare('INSERT INTO user (username, full_name, role) VALUES (?, ?, ?)').run(cleanName, cleanName, 'user');
		user = db.prepare('SELECT * FROM user WHERE id = ?').get(info.lastInsertRowid);
	}

	// 3. Записываем в сессию
	ctx.session.user = user;
	ctx.redirect('/');
};

export const logout = async (ctx) => {
	ctx.session = null;
	ctx.redirect('/login');
};

export const updateTheme = async (ctx) => {
	const { theme } = ctx.request.body;

	// 1. Валидация (твой код)
	const validThemes = ['standard', 'light', 'dark'];
	if (!validThemes.includes(theme)) {
		ctx.status = 400;
		ctx.body = { error: 'Недопустимая тема' };
		return;
	}

	try {
		// 2. Обновление в Базе Данных (твой код)
		db.prepare('UPDATE user SET theme = ? WHERE id = ?').run(theme, ctx.state.user.id);

		// 3. ВАЖНО: Обновление в Сессии (чтобы при F5 тема не сбрасывалась)
		if (ctx.session && ctx.session.user) {
			ctx.session.user.theme = theme;
		}

		ctx.body = { success: true };
	} catch (err) {
		console.error(err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка БД' };
	}
};
