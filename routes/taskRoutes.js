import Router from '@koa/router';
import { renderDashboard, createTask, deleteTask } from '../controllers/taskController.js';
// import { getTasks, createTask } from '../controllers/taskController.js';

const router = new Router();

// router.get('/tasks', getTasks);
// router.post('/tasks', createTask);

router.get('/', renderDashboard); // Главная страница
router.post('/tasks', createTask); // Создание задачи
router.get('/tasks/delete/:id', deleteTask);

export default router;
