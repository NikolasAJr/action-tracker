/**
 * Главный файл. Связывает события DOM с модулями.
 */
import * as SidePanel from './modules/sidePanel.js';
import * as Dropdown from './modules/dropdown.js';
import * as Table from './modules/table.js';
import { updateStatusColor, updateDaysLeftUI, updatePriorityUI } from './modules/utils.js';
import * as Api from './modules/api.js';
import * as Admin from './modules/admin.js';

document.addEventListener('DOMContentLoaded', () => {
	Table.restoreState();
	Table.setupSearch();

	// Глобальная обработка кликов
	document.body.addEventListener('click', handleGlobalClick);

	// Подтверждение удаления
	document.body.addEventListener('submit', async (e) => {
		// 1. Обработка УДАЛЕНИЯ
		if (e.target.dataset.confirm === 'true') {
			e.preventDefault(); // Останавливаем стандартную отправку формы

			if (!confirm('Удалить задачу и все её подзадачи?')) return;

			// Находим ID из action атрибута формы: /tasks/delete/123
			const actionUrl = e.target.getAttribute('action');
			const id = actionUrl.split('/').pop();

			try {
				await Api.deleteTask(id);

				// Удаляем строку из DOM
				const row = e.target.closest('.task-row');
				if (row) {
					// Анимация исчезновения
					row.style.transition = 'all 0.3s';
					row.style.opacity = '0';
					row.style.transform = 'translateX(20px)';

					setTimeout(() => {
						row.remove();
						// Также удаляем подзадачи, если это была родительская задача
						document.querySelectorAll(`.task-row[data-parent-id="${id}"]`).forEach((sub) => sub.remove());
					}, 300);
				}
			} catch (err) {
				alert('Не удалось удалить задачу');
				console.error(err);
			}
			return;
		}

		// Ищем скрытое поле parent_id внутри формы
		const parentIdInput = e.target.querySelector('input[name="parent_id"]');
		if (parentIdInput) {
			// Перед тем как форма уйдет на сервер и страница перезагрузится,
			// мы сохраняем ID родителя в LocalStorage.
			// После перезагрузки restoreState() увидит его и раскроет список.
			Table.forceExpand(parentIdInput.value);
		}
	});

	document.body.addEventListener('change', (e) => {
		if (e.target.dataset.action === 'admin-change-role') {
			const userId = e.target.dataset.id;
			const newRole = e.target.value;

			// Визуально блокируем на время запроса
			e.target.disabled = true;

			Admin.changeRole(userId, newRole)
				.then(() => {
					// Зеленая вспышка успеха
					e.target.style.backgroundColor = '#dcfce7';
					setTimeout(() => (e.target.style.backgroundColor = ''), 500);
				})
				.catch((err) => {
					alert(err.message);
					// Откатываем значение назад (если бы сохранили предыдущее, но пока просто алерт)
				})
				.finally(() => {
					e.target.disabled = false;
				});
		}
	});

	// Инициализация кнопки отправить
	SidePanel.initChatListeners();

	// --- THEME SWITCHER ---
	const settingsTrigger = document.getElementById('settings-trigger');
	const settingsMenu = document.getElementById('settings-menu');

	// Клик по шестеренке
	settingsTrigger.addEventListener('click', (e) => {
		e.stopPropagation(); // Чтобы не сработал global click
		settingsMenu.classList.toggle('hidden');
	});

	// Клик по опции темы
	document.querySelectorAll('.theme-option').forEach((opt) => {
		opt.addEventListener('click', async (e) => {
			const theme = e.target.dataset.val;

			// 1. Мгновенно меняем атрибут (быстро UI)
			document.documentElement.setAttribute('data-theme', theme);

			// 2. Закрываем меню
			settingsMenu.classList.add('hidden');

			// 3. Сохраняем на сервере
			try {
				await fetch('/user/theme', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ theme }),
				});
			} catch (err) {
				console.error('Ошибка сохранения темы', err);
			}
		});
	});
});

function handleGlobalClick(e) {
	const settingsMenu = document.getElementById('settings-menu');
	if (settingsMenu && !settingsMenu.contains(e.target) && !e.target.closest('#settings-trigger')) {
		settingsMenu.classList.add('hidden');
	}

	const target = e.target.closest('[data-action]');

	// Если клик мимо меню - закрыть меню
	if (!target) {
		Dropdown.closeActiveMenu();
		return;
	}

	const { action, id, field } = target.dataset;
	const isNew = target.dataset.isNew === 'true';

	// ID для панели берем из переменной модуля панели
	const panelId = SidePanel.currentPanelTaskId;

	// Добавить: Закрытие меню настроек при клике вне его

	switch (action) {
		// --- Таблица и Общее ---
		case 'open-details':
			SidePanel.openDetails(id);
			break;
		case 'close-details':
			SidePanel.closeDetails();
			break;
		case 'toggle-subtasks':
			Table.toggleSubtasks(id, target);
			break;
		case 'toggle-add-form':
			Table.toggleSubtaskForm(id);
			break;

		// --- Дропдауны ---
		case 'edit-status':
			Dropdown.openStatusDropdown(target, id, isNew, (newVal) => {
				// Синхронизация с панелью, если открыта
				if (panelId === id) {
					const pStatus = document.getElementById('p-status');
					if (pStatus) {
						pStatus.innerText = newVal;
						updateStatusColor(pStatus, newVal);
					}
				}
			});
			break;
		case 'edit-category':
			Dropdown.openCategoryDropdown(target, id, isNew);
			break;
		case 'edit-priority':
			Dropdown.openPriorityDropdown(target, id, isNew, (newVal) => {
				// Обновляем бейдж в таблице
				updatePriorityUI(target, newVal);

				// Синхронизация с панелью, если открыта
				if (panelId === id) {
					const pEl = document.getElementById('p-priority');
					if (pEl) updatePriorityUI(pEl, newVal);
				}
			});
			break;
		// --- Инлайн текст (Таблица) ---
		case 'edit-field-btn': // Карандаш
			Table.editTextField(target.previousElementSibling, id, field, false, (val) => syncPanel(id, field, val));
			break;
		case 'edit-field-text':
			Table.editTextField(target, id, field, false, (val) => {
				syncPanel(id, field, val);
				// Если меняли дату, обновляем дни
				if (field === 'deadline_at') updateDaysLeftUI(id, val);
			});
			break;

		// --- Внутри Панели ---
		case 'edit-panel-status':
			Dropdown.openStatusDropdown(target, panelId, false, (newVal) => {
				// Синхронизация с таблицей
				const tEl = document.querySelector(`.task-status[data-id="${panelId}"]`);
				if (tEl) {
					tEl.innerText = newVal;
					updateStatusColor(tEl, newVal);
				}
			});
			break;
		case 'edit-panel-priority':
			Dropdown.openPriorityDropdown(target, panelId, false, (newVal) => {
				// 1. Обновляем бейдж в самой панели
				updatePriorityUI(target, newVal);

				// 2. СИНХРОНИЗАЦИЯ: Ищем бейдж в основной таблице и обновляем его
				const tablePriorityEl = document.querySelector(`.priority-badge[data-id="${panelId}"]`);
				if (tablePriorityEl) {
					updatePriorityUI(tablePriorityEl, newVal);
				}
			});
			break;
		case 'edit-panel-field':
			Table.editTextField(target, panelId, field, true, (newVal) => {
				// Синхронизация с таблицей
				const tEl = document.querySelector(`[data-action="edit-field-text"][data-field="${field}"][data-id="${panelId}"]`);
				if (tEl) tEl.innerText = newVal;

				// Если меняли дату, обновляем дни в таблице
				if (field === 'deadline_at') updateDaysLeftUI(panelId, newVal);
			});
			break;
		// --- ADMIN ACTIONS ---
		case 'admin-delete-user':
			if (!confirm('Удалить пользователя?')) return;
			Admin.deleteUser(id)
				.then(() => {
					const row = e.target.closest('tr');
					if (row) row.remove();
				})
				.catch((err) => alert(err.message));
			break;
	}
}

// Хелпер: Обновить панель, если мы правим таблицу и панель открыта для этой задачи
function syncPanel(taskId, field, value) {
	if (SidePanel.currentPanelTaskId === taskId) {
		// Маппинг полей таблицы на ID элементов панели
		const map = {
			assigned_to: 'p-assignee',
			deadline_at: 'p-deadline',
			title: 'p-title',
		};
		const elId = map[field];
		if (elId) {
			const el = document.getElementById(elId);
			if (el) el.innerText = value;
		}
	}
}
