import Router from '@koa/router';
import { renderDashboard, createTask, deleteTask, editTask } from '../controllers/taskController.js';

const router = new Router();

router.get('/', renderDashboard);
router.post('/tasks', createTask);
router.post('/tasks/delete/:id', deleteTask); // Изменено на POST
router.post('/tasks/update/:id', editTask);

export default router;
