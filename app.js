import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import views from '@ladjs/koa-views';
import path from 'path';
import taskRoutes from './routes/taskRoutes.js';
import session from 'koa-session';
import { requireAuth } from './middleware/auth.js';

const app = new Koa();

// Настройка сессий
app.keys = ['some-secret-key-change-it']; // Секрет для подписи куки
const CONFIG = {
	key: 'koa.sess',
	maxAge: 86400000, // 1 день
	httpOnly: true,
	signed: true,
};
app.use(session(CONFIG, app));
app.use(bodyParser());

// Middleware для проверки аутентификации
// Глобальная защита маршрутов
app.use(requireAuth);

app.use(serve(path.join(process.cwd(), 'public')));

app.use(
	views(path.join(process.cwd(), 'resources', 'views'), {
		extension: 'ejs',
		map: { ejs: 'ejs' },
	}),
);

app.use(taskRoutes.routes()).use(taskRoutes.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Action Tracker запущен: http://localhost:${PORT}`);
});

// // Статика
// app.use(serve(path.join(process.cwd(), 'frontend'), { index: 'index.html' }));
// app.use(bodyParser());

// // Подключаем маршруты
// app.use(taskRoutes.routes()).use(taskRoutes.allowedMethods());

// const PORT = 3000;
// app.listen(PORT, () => {
// 	console.log(`🚀 Action Tracker запущен: http://localhost:${PORT}`);
// });
