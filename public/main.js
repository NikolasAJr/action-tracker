/**
 * Основной фронтенд-скрипт Action Tracker.
 * Использует Event Delegation для обработки кликов.
 */

let activeMenu = null;
let activeTrigger = null;
let currentPanelTaskId = null;

// --- ИНИЦИАЛИЗАЦИЯ ---
document.addEventListener('DOMContentLoaded', () => {
	// 1. Восстановление состояния подзадач
	restoreSubtasksState();

	// 2. Глобальный слушатель кликов (Делегирование)
	document.body.addEventListener('click', handleGlobalClick);

	// 3. Слушатель для поиска
	const searchInput = document.getElementById('taskSearch');
	if (searchInput) {
		searchInput.addEventListener('keyup', filterTasks);
	}

	// 4. Глобальный слушатель для подтверждения удаления
	document.body.addEventListener('submit', handleFormSubmit);
});

// --- ОБРАБОТЧИК КЛИКОВ ---
function handleGlobalClick(e) {
	const target = e.target.closest('[data-action]');

	// Закрытие меню при клике вовне
	if (activeMenu && !target && !activeMenu.contains(e.target)) {
		// Логика внутри createDropdown закроет его
	}

	if (!target) return;

	const action = target.dataset.action;
	const id = target.dataset.id; // ID из кнопки таблицы
	const field = target.dataset.field;
	const isNew = target.dataset.isNew === 'true';

	// Для действий внутри панели ID берем из глобальной переменной currentPanelTaskId
	const panelId = currentPanelTaskId;

	switch (action) {
		// ... (Старые кейсы: open-details, close-details, toggle-subtasks...)
		case 'open-details':
			openDetails(id);
			break;
		case 'close-details':
			closeDetails();
			break;
		case 'toggle-subtasks':
			toggleSubtasks(id, target);
			break;
		case 'toggle-add-form':
			toggleSubtaskForm(id);
			break;
		case 'edit-field-btn':
			editTask(target.previousElementSibling, id, field);
			break;
		case 'edit-field-text':
			editTask(target, id, field);
			break;
		case 'edit-category':
			editCategory(target, id, isNew);
			break;
		case 'edit-category-btn':
			editCategory(target.previousElementSibling, id, false);
			break;
		case 'edit-status':
			editStatus(target, id, isNew);
			break;
		case 'edit-panel-field':
			// Редактируем текстовое поле (исполнитель, дата) прямо в панели
			editTask(target, panelId, field, true);
			break;
		case 'edit-panel-status':
			// Редактируем статус в панели
			editStatus(target, panelId, false, true);
			break;
		case 'edit-panel-priority':
			// Редактируем приоритет
			editPriority(target, panelId);
			break;
	}
}

// --- ОБРАБОТЧИК ФОРМ ---
function handleFormSubmit(e) {
	if (e.target.dataset.confirm === 'true') {
		if (!confirm('Удалить задачу?')) {
			e.preventDefault();
		}
	}
}

// --- ФУНКЦИИ ЛОГИКИ (Почищены от onclick привязок) ---

async function openDetails(taskId) {
	const panel = document.querySelector('#details-panel');
	const overlay = document.querySelector('#overlay');
	const loading = document.querySelector('#panel-loading');
	const content = document.querySelector('#panel-data');

	panel.classList.add('open');
	overlay.classList.add('visible');
	loading.classList.remove('hidden');
	content.classList.add('hidden');
	currentPanelTaskId = taskId;

	try {
		const response = await fetch(`/tasks/${taskId}`);
		if (!response.ok) throw new Error('Ошибка загрузки');
		const task = await response.json();

		// Заполняем ID и Заголовок
		document.getElementById('p-id').innerText = task.id;
		const titleEl = document.getElementById('p-title');
		titleEl.innerText = task.title;
		// Вешаем слушатель на сохранение заголовка при Blur
		titleEl.onblur = () => savePanelTitle(titleEl, taskId);
		titleEl.onkeydown = (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				titleEl.blur();
			}
		};

		// Заполняем свойства
		document.getElementById('p-assignee').innerText = task.assigned_to;

		// Статус (раскрашиваем класс)
		const statusEl = document.getElementById('p-status');
		statusEl.innerText = task.status;
		updateStatusColor(statusEl, task.status); // Используем существующую функцию

		document.getElementById('p-deadline').innerText = task.deadline_at;

		// Приоритет (новая логика)
		const priorityEl = document.getElementById('p-priority');
		renderPriority(priorityEl, task.priority);

		// Комментарии и даты (как было)
		const commentBox = document.getElementById('p-comments');
		commentBox.value = task.comments || '';
		document.getElementById('p-created').innerText = new Date(task.created_at).toLocaleString();
		document.getElementById('p-updated').innerText = new Date(task.updated_at).toLocaleString();

		loading.classList.add('hidden');
		content.classList.remove('hidden');

		setupAutoSave(commentBox, taskId);
	} catch (err) {
		console.error(err);
		loading.innerHTML = 'Ошибка загрузки данных';
	}
}

// 1. Сохранение заголовка панели
async function savePanelTitle(element, taskId) {
	const newTitle = element.innerText.trim();
	if (!newTitle) return; // Не сохраняем пустой

	// Обновляем UI таблицы (ищем элемент в таблице по data-action и data-id)
	const tableTitleEl = document.querySelector(`.task-title-text[data-id="${taskId}"]`);
	if (tableTitleEl) tableTitleEl.innerText = newTitle;

	await saveField(element, taskId, 'title', newTitle);
}

// 2. Отрисовка приоритета (HTML + классы)
function renderPriority(element, value) {
	element.className = 'prop-value priority-badge'; // Сброс классов
	// Маппинг значений из БД (1, 2, 3) или текста
	let text = 'Обычный';
	let cls = 'priority-low';

	// Предположим в БД: 3=High, 2=Medium, 1=Low (или null)
	if (value == 3 || value === 'Высокий') {
		text = 'Высокий';
		cls = 'priority-high';
	} else if (value == 2 || value === 'Средний') {
		text = 'Средний';
		cls = 'priority-medium';
	} else {
		text = 'Низкий';
		cls = 'priority-low';
	}

	element.innerText = text;
	element.classList.add(cls);
	element.dataset.val = value; // Сохраняем "сырое" значение если надо
}

// 3. Редактирование приоритета (Dropdown)
function editPriority(element, taskId) {
	if (activeMenu) {
		closeMenuHandler();
		return;
	}

	// Опции: [Текст, Значение для БД]
	const options = [
		{ label: '🔥 Высокий', val: 3 },
		{ label: '⚡ Средний', val: 2 },
		{ label: '🟢 Низкий', val: 1 },
	];

	createDropdownComplex(element, options, (selectedOption) => {
		// Обновляем UI панели
		renderPriority(element, selectedOption.val);

		// Сохраняем в БД
		saveField(element, taskId, 'priority', selectedOption.val);
	});
}

// Улучшенная функция Dropdown (принимает объекты {label, val})
function createDropdownComplex(element, options, onSelect) {
	if (activeMenu) closeMenuHandler();

	const menu = document.createElement('div');
	menu.className = 'status-menu-custom';

	options.forEach((opt) => {
		const item = document.createElement('div');
		item.className = 'status-opt';
		item.innerText = opt.label;

		item.onclick = (e) => {
			e.stopPropagation();
			onSelect(opt);
			closeMenuHandler();
		};
		menu.appendChild(item);
	});

	document.body.appendChild(menu);
	// ... (позиционирование копируем из createDropdown или выносим в общую утилиту) ...
	const rect = element.getBoundingClientRect();
	const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
	const centerX = rect.left + scrollLeft + rect.width / 2;
	const topY = rect.bottom + scrollTop + 8;
	menu.style.top = topY + 'px';
	menu.style.left = centerX + 'px';

	activeMenu = menu;
	activeTrigger = element;
	setTimeout(() => document.addEventListener('click', documentClickHandler), 0);
}

function closeDetails() {
	document.querySelector('#details-panel').classList.remove('open');
	document.querySelector('#overlay').classList.remove('visible');
	currentPanelTaskId = null;
}

function setupAutoSave(textarea, taskId) {
	let timeout = null;
	const indicator = document.getElementById('save-indicator');

	const save = async () => {
		indicator.innerText = 'Сохранение...';
		indicator.classList.add('visible');
		try {
			await fetch(`/tasks/update/${taskId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ comments: textarea.value }),
			});
			indicator.innerText = 'Сохранено';
			setTimeout(() => indicator.classList.remove('visible'), 2000);
			document.getElementById('p-updated').innerText = new Date().toLocaleString();
		} catch (e) {
			indicator.innerText = 'Ошибка!';
		}
	};

	textarea.oninput = () => {
		indicator.classList.remove('visible');
		clearTimeout(timeout);
		timeout = setTimeout(save, 1000);
	};
}

function toggleSubtaskForm(taskId) {
	const form = document.querySelector(`#form-sub-${taskId}`);
	// Ищем иконку не по onclick, а по data-id
	const icon = document.querySelector(`.toggle-icon[data-id="${taskId}"]`);

	const subtasks = document.querySelectorAll(`.task-row[data-parent-id="${taskId}"]`);
	if (subtasks.length > 0) {
		subtasks.forEach((sub) => (sub.style.display = 'grid'));
		if (icon) {
			icon.classList.add('expanded');
			icon.innerText = '▼';
		}
		saveToStorage(taskId);
	}

	if (form.classList.contains('hidden')) {
		document.querySelectorAll('.inline-add-form.is-subtask').forEach((f) => f.classList.add('hidden'));
		form.classList.remove('hidden');
		form.querySelector('input[name="title"]').focus();
	} else {
		form.classList.add('hidden');
	}
}

function toggleSubtasks(parentId, iconElement) {
	const subtasks = document.querySelectorAll(`.task-row[data-parent-id="${parentId}"]`);
	const isExpanded = iconElement.classList.contains('expanded');

	if (isExpanded) {
		subtasks.forEach((sub) => (sub.style.display = 'none'));
		iconElement.classList.remove('expanded');
		iconElement.innerText = '▶';
		removeFromStorage(parentId);
	} else {
		subtasks.forEach((sub) => (sub.style.display = 'grid'));
		iconElement.classList.add('expanded');
		iconElement.innerText = '▼';
		saveToStorage(parentId);
	}
}

function restoreSubtasksState() {
	const expanded = JSON.parse(localStorage.getItem('expandedTasks') || '[]');
	expanded.forEach((id) => {
		const subtasks = document.querySelectorAll(`.task-row[data-parent-id="${id}"]`);
		const icon = document.querySelector(`.toggle-icon[data-id="${id}"]`);

		if (subtasks.length > 0) {
			subtasks.forEach((sub) => (sub.style.display = 'grid'));
			if (icon) {
				icon.classList.add('expanded');
				icon.innerText = '▼';
			}
		}
	});
}

function saveToStorage(id) {
	let expanded = JSON.parse(localStorage.getItem('expandedTasks') || '[]');
	if (!expanded.includes(id)) expanded.push(id);
	localStorage.setItem('expandedTasks', JSON.stringify(expanded));
}

function removeFromStorage(id) {
	let expanded = JSON.parse(localStorage.getItem('expandedTasks') || '[]');
	expanded = expanded.filter((item) => item !== id);
	localStorage.setItem('expandedTasks', JSON.stringify(expanded));
}

function filterTasks() {
	const input = document.getElementById('taskSearch');
	const filter = input.value.toLowerCase();
	const rows = document.querySelectorAll('.task-row:not(.inline-add-form)');

	rows.forEach((row) => {
		// Используем textContent для поиска по всей строке
		const text = row.textContent.toLowerCase();
		row.style.display = text.includes(filter) ? '' : 'none';
	});
}

// --- UI HELPERS (Dropdowns & Inputs) ---

function createDropdown(element, options, onSelect) {
	if (activeMenu) closeMenuHandler(); // Закрыть старое если есть

	const menu = document.createElement('div');
	menu.className = 'status-menu-custom';

	options.forEach((opt) => {
		const item = document.createElement('div');
		item.className = 'status-opt';
		item.innerText = opt;
		item.setAttribute('data-val', opt);

		item.onclick = (e) => {
			e.stopPropagation();
			onSelect(opt);
			closeMenuHandler();
		};
		menu.appendChild(item);
	});

	document.body.appendChild(menu);
	const rect = element.getBoundingClientRect();
	const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
	const centerX = rect.left + scrollLeft + rect.width / 2;
	const topY = rect.bottom + scrollTop + 8;

	menu.style.top = topY + 'px';
	menu.style.left = centerX + 'px';

	activeMenu = menu;
	activeTrigger = element;

	setTimeout(() => {
		document.addEventListener('click', documentClickHandler);
	}, 0);
}

function documentClickHandler(e) {
	if (activeMenu && !activeMenu.contains(e.target) && e.target !== activeTrigger) {
		closeMenuHandler();
	}
}

function closeMenuHandler() {
	if (activeMenu) {
		activeMenu.remove();
		activeMenu = null;
		activeTrigger = null;
	}
	document.removeEventListener('click', documentClickHandler);
}

function editStatus(element, taskId, isNewForm = false, isFromPanel = false) {
	if (activeMenu) {
		closeMenuHandler();
		return;
	}
	const options = ['Открыто', 'В работе', 'Готово', 'На паузе', 'Отменено'];

	// Используем обычный createDropdown (так как опции - просто строки)
	createDropdown(element, options, (opt) => {
		if (isNewForm) {
			// ... (старая логика для новой формы)
			element.innerText = opt;
			updateStatusColor(element, opt);
			const form = element.closest('form');
			if (form) form.querySelector('input[name="status"]').value = opt;
		} else {
			// Логика сохранения
			saveField(element, taskId, 'status', opt, () => {
				updateStatusColor(element, opt);

				// СИНХРОНИЗАЦИЯ: Если мы в панели, обновляем таблицу
				if (isFromPanel) {
					const tableStatusEl = document.querySelector(`.task-status[data-id="${taskId}"]`);
					if (tableStatusEl) {
						tableStatusEl.innerText = opt;
						updateStatusColor(tableStatusEl, opt);
					}
				}
				// Если мы в таблице, обновляем панель (если она открыта для этой задачи)
				else if (currentPanelTaskId === taskId) {
					const panelStatusEl = document.getElementById('p-status');
					if (panelStatusEl) {
						panelStatusEl.innerText = opt;
						updateStatusColor(panelStatusEl, opt);
					}
				}
			});
		}
	});
}

function editCategory(element, taskId, isNewForm = false) {
	if (activeMenu && activeTrigger === element) {
		closeMenuHandler();
		return;
	}
	const options = window.CATEGORIES || [];
	createDropdown(element, options, (opt) => {
		if (isNewForm) {
			element.innerText = opt;
			const form = element.closest('form');
			if (form) form.querySelector('input[name="category"]').value = opt;
		} else {
			saveField(element, taskId, 'category', opt);
		}
	});
}

function updateStatusColor(element, status) {
	element.className = `task-status ${getStatusClass(status)}`;
}

// Вспомогательная функция для классов (дублирует логику EJS для JS)
function getStatusClass(status) {
	switch (status?.toLowerCase()) {
		case 'готово':
			return 'status-done';
		case 'открыто':
			return 'status-open';
		case 'в работе':
			return 'status-progress';
		case 'просрочено':
			return 'status-overdue';
		case 'на паузе':
			return 'status-paused';
		case 'отменено':
			return 'status-cancelled';
		default:
			return 'status-open';
	}
}

async function saveField(element, taskId, field, newValue, uiCallback) {
	const originalValue = element.innerText;
	if (newValue === originalValue) return;

	element.innerText = newValue;
	if (uiCallback) uiCallback();

	try {
		const response = await fetch(`/tasks/update/${taskId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ [field]: newValue }),
		});
		if (!response.ok) throw new Error();

		element.style.transition = 'background 0.3s';
		const oldBg = element.style.backgroundColor;
		element.style.backgroundColor = '#dcfce7';
		setTimeout(() => (element.style.backgroundColor = oldBg), 500);
	} catch (error) {
		console.error(error);
		alert('Ошибка сохранения');
		element.innerText = originalValue;
	}
}

function editTask(element, taskId, field, isFromPanel = false) {
	if (!field) return;
	if (element.querySelector('input')) return;

	const originalValue = element.innerText.trim();
	const input = document.createElement('input');
	input.type = field === 'deadline_at' ? 'date' : 'text';
	input.value = originalValue;
	input.className = 'edit-input'; // Убедись, что этот класс подходит для панели (фон)

	// Для панели можно добавить спец класс, чтобы инпут выглядел красиво на белом фоне
	if (isFromPanel) input.style.background = 'white';

	element.innerText = '';
	element.appendChild(input);
	input.focus();
	if (!isFromPanel) element.style.flex = 1; // Только для таблицы

	const save = () => {
		const newValue = input.value.trim();
		if (!newValue || newValue === originalValue) {
			element.innerText = originalValue;
		} else {
			saveField(element, taskId, field, newValue, () => {
				// СИНХРОНИЗАЦИЯ
				if (isFromPanel) {
					// Ищем элемент в таблице по data-action="edit-field-text" или "edit-field-btn"
					// Для текста (дата, исполнитель)
					const tableEl = document.querySelector(`[data-action="edit-field-text"][data-field="${field}"][data-id="${taskId}"]`);
					if (tableEl) tableEl.innerText = newValue;
				}
			});
		}
		if (!isFromPanel) element.style.flex = 'none';
	};

	input.onkeyup = (e) => {
		if (e.key === 'Enter') input.blur();
		if (e.key === 'Escape') {
			element.innerText = originalValue;
			if (!isFromPanel) element.style.flex = 'none';
		}
	};
	input.onblur = () => {
		if (element.contains(input)) save();
	};
	input.onclick = (e) => e.stopPropagation();
}
