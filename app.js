import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import views from '@ladjs/koa-views';
import path from 'path';
import taskRoutes from './routes/taskRoutes.js';

const app = new Koa();

app.use(serve(path.join(process.cwd(), 'public')));

app.use(
	views(path.join(process.cwd(), 'resources', 'views'), {
		extension: 'ejs',
		map: { ejs: 'ejs' },
	}),
);

app.use(bodyParser());

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
