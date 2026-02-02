import Router from '@koa/router';
import { renderDashboard, createTask, deleteTask, editTask, getTaskDetails } from '../controllers/taskController.js';

const router = new Router();

router.get('/', renderDashboard);
router.post('/tasks', createTask);
router.post('/tasks/delete/:id', deleteTask);
router.post('/tasks/update/:id', editTask);

// НОВЫЙ МАРШРУТ: Получение деталей задачи (JSON)
router.get('/tasks/:id', getTaskDetails);

export default router;
