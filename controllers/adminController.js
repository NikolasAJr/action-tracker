import db from '../database/dbConnect.js';

// Рендер страницы админки
export const renderAdminPanel = async (ctx) => {
	try {
		const users = db.prepare('SELECT * FROM user ORDER BY id ASC').all();
		// Передаем текущего юзера (ctx.state.user уже там благодаря requireAuth) и список всех
		await ctx.render('admin', { users });
	} catch (e) {
		console.error(e);
		ctx.status = 500;
		ctx.body = 'Ошибка сервера';
	}
};

// API: Смена роли
export const updateUserRole = async (ctx) => {
	const { id } = ctx.params;
	const { role } = ctx.request.body;

	if (!['admin', 'user'].includes(role)) {
		ctx.status = 400;
		return;
	}

	// Защита: нельзя снять админку с самого себя
	if (Number(id) === ctx.state.user.id && role !== 'admin') {
		ctx.status = 400;
		ctx.body = { error: 'Нельзя понизить самого себя' };
		return;
	}

	db.prepare('UPDATE user SET role = ? WHERE id = ?').run(role, id);
	ctx.body = { success: true };
};

// API: Удаление пользователя
export const deleteUser = async (ctx) => {
	const { id } = ctx.params;

	if (Number(id) === ctx.state.user.id) {
		ctx.status = 400;
		ctx.body = { error: 'Нельзя удалить самого себя' };
		return;
	}

	db.prepare('DELETE FROM user WHERE id = ?').run(id);
	ctx.body = { success: true };
};
