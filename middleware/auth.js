export const requireAuth = async (ctx, next) => {
	// Исключаем страницу логина и статику (css, js)
	if (ctx.path === '/login' || ctx.path.startsWith('/css') || ctx.path.startsWith('/js')) {
		return next();
	}

	if (!ctx.session || !ctx.session.user) {
		return ctx.redirect('/login');
	}

	// Передаем пользователя в шаблоны (чтобы в EJS было доступно user.role)
	ctx.state.user = ctx.session.user;

	await next();
};
