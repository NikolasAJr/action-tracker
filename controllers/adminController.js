import db from '../database/dbConnect.js';

/**
 * Рендер страницы администрирования
 */
export const renderAdminPanel = async (ctx) => {
	try {
		// Получаем всех пользователей
		const users = db.prepare('SELECT * FROM user ORDER BY created_at DESC').all();
		
		await ctx.render('admin', { users });
	} catch (err) {
		console.error('Ошибка загрузки админ-панели:', err);
		ctx.status = 500;
		ctx.body = 'Ошибка сервера';
	}
};

/**
 * Обновление роли пользователя
 */
export const updateUserRole = async (ctx) => {
	const { id } = ctx.params;
	const { role } = ctx.request.body;

	// Защита: нельзя менять роль самому себе, чтобы не потерять админку
	if (parseInt(id) === ctx.state.user.id) {
		ctx.status = 400;
		ctx.body = { error: 'Нельзя изменить роль самому себе' };
		return;
	}

	if (!['admin', 'user'].includes(role)) {
		ctx.status = 400;
		ctx.body = { error: 'Некорректная роль' };
		return;
	}

	try {
		const info = db.prepare('UPDATE user SET role = ? WHERE id = ?').run(role, id);
		
		if (info.changes === 0) {
			ctx.status = 404;
			ctx.body = { error: 'Пользователь не найден' };
			return;
		}

		ctx.body = { success: true };
	} catch (err) {
		console.error(err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка БД' };
	}
};

/**
 * Удаление пользователя
 */
export const deleteUser = async (ctx) => {
	const { id } = ctx.params;

	// Защита: нельзя удалить самого себя
	if (parseInt(id) === ctx.state.user.id) {
		ctx.status = 400;
		ctx.body = { error: 'Нельзя удалить самого себя' };
		return;
	}

	try {
		const info = db.prepare('DELETE FROM user WHERE id = ?').run(id);

		if (info.changes === 0) {
			ctx.status = 404;
			ctx.body = { error: 'Пользователь не найден' };
			return;
		}

		ctx.body = { success: true };
	} catch (err) {
		console.error(err);
		ctx.status = 500;
		ctx.body = { error: 'Ошибка БД' };
	}
};