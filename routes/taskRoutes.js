import Router from '@koa/router';
import { renderDashboard, createTask, deleteTask, editTask, getTaskDetails, getComments, addComment } from '../controllers/taskController.js';
import { renderLogin, login, logout } from '../controllers/authController.js'; // Импорт
import { requireAdmin } from '../middleware/auth.js'; // Импорт
import { renderAdminPanel, updateUserRole, deleteUser } from '../controllers/adminController.js'; // Импорт

const router = new Router();

// --- ADMIN ROUTES ---
router.get('/admin', requireAdmin, renderAdminPanel);
router.post('/admin/users/:id/role', requireAdmin, updateUserRole);
router.post('/admin/users/delete/:id', requireAdmin, deleteUser);

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
