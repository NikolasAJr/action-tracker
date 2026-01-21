import Router from '@koa/router';
import { renderDashboard, createTask } from '../controllers/taskController.js';
// import { getTasks, createTask } from '../controllers/taskController.js';

const router = new Router();

// router.get('/tasks', getTasks);
// router.post('/tasks', createTask);

router.get('/', renderDashboard); // Главная страница
router.post('/tasks', createTask); // Создание задачи

export default router;
