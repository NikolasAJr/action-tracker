import Router from '@koa/router';
import { renderDashboard, createTask, deleteTask, editTask, getTaskDetails, getComments, addComment } from '../controllers/taskController.js';
import { renderLogin, login, logout } from '../controllers/authController.js'; // Импорт

const router = new Router();

// AUTH
router.get('/login', renderLogin);
router.post('/login', login);
router.get('/logout', logout);

router.get('/', renderDashboard);
router.post('/tasks', createTask);
router.post('/tasks/delete/:id', deleteTask);
router.post('/tasks/update/:id', editTask);

// НОВЫЙ МАРШРУТ: Получение деталей задачи (JSON)
router.get('/tasks/:id', getTaskDetails);

// НОВЫЙ МАРШРУТ: Получение комментариев задачи (JSON)
router.get('/tasks/:id/comments', getComments);

// НОВЫЙ МАРШРУТ: Добавление комментария к задаче (JSON)
router.post('/tasks/:id/comments', addComment);

export default router;
