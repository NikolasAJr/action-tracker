/**
 * Основной фронтенд-скрипт Action Tracker.
 */

// Глобальные переменные для управления меню статуса
let activeMenu = null;
let activeTrigger = null;

/**
 * Открывает правую панель с деталями задачи.
 */
function openDetails(title, user) {
	document.querySelector('#panel-title').innerText = title;
	document.querySelector('#panel-user').innerText = user;
	document.querySelector('#details-panel').classList.add('open');
	document.querySelector('#overlay').classList.add('visible');
}

/**
 * Закрывает правую панель.
 */
function closeDetails() {
	document.querySelector('#details-panel').classList.remove('open');
	document.querySelector('#overlay').classList.remove('visible');
}

/**
 * Показывает/скрывает форму добавления подзадачи и раскрывает список.
 */
function toggleSubtaskForm(taskId) {
	const form = document.querySelector(`#form-sub-${taskId}`);
	const icon = document.querySelector(`.toggle-icon[onclick*="'${taskId}'"]`);

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

/**
 * Сворачивание/разворачивание подзадач.
 */
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

// LocalStorage Helpers
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

// Восстановление состояния при загрузке
window.addEventListener('DOMContentLoaded', () => {
	const expanded = JSON.parse(localStorage.getItem('expandedTasks') || '[]');
	expanded.forEach((id) => {
		const subtasks = document.querySelectorAll(`.task-row[data-parent-id="${id}"]`);
		const icon = document.querySelector(`.toggle-icon[onclick*="'${id}'"]`);

		if (subtasks.length > 0) {
			subtasks.forEach((sub) => (sub.style.display = 'grid'));
			if (icon) {
				icon.classList.add('expanded');
				icon.innerText = '▼';
			}
		}
	});
});

/**
 * Фильтрация задач.
 */
window.filterTasks = function () {
	const input = document.getElementById('taskSearch');
	const filter = input.value.toLowerCase();
	const rows = document.querySelectorAll('.task-row:not(.inline-add-form)');

	rows.forEach((row) => {
		const clickable = row.querySelector('.task-clickable-area');
		if (!clickable) return;
		const text = clickable.innerText.toLowerCase();
		row.style.display = text.includes(filter) ? '' : 'none';
	});
};

/**
 * Редактирование статуса (Кастомное меню в body).
 */
function editStatus(element, taskId) {
	// 1. Логика переключения (Toggle)
	if (activeMenu) {
		const isSameElement = activeTrigger === element;
		closeMenuHandler(); // Закрываем текущее
		if (isSameElement) return; // Если кликнули по тому же, просто выходим
	}

	const currentStatus = element.innerText.trim();
	const originalContent = element.innerHTML;

	// 2. Создаем меню
	const menu = document.createElement('div');
	menu.className = 'status-menu-custom';

	const options = ['Открыто', 'В работе', 'Готово', 'На паузе', 'Отменено'];

	options.forEach((opt) => {
		const item = document.createElement('div');
		item.className = 'status-opt';
		item.innerText = opt;
		item.setAttribute('data-val', opt);

		item.onclick = (e) => {
			e.stopPropagation();
			saveCustomStatus(element, taskId, opt, originalContent);
			closeMenuHandler();
		};
		menu.appendChild(item);
	});

	// 3. Добавляем в body и позиционируем
	document.body.appendChild(menu);

	const rect = element.getBoundingClientRect();
	const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

	// Вычисляем центр элемента
	const centerX = rect.left + scrollLeft + rect.width / 2;
	const topY = rect.bottom + scrollTop + 8; // Отступ 8px

	menu.style.top = topY + 'px';
	menu.style.left = centerX + 'px';

	activeMenu = menu;
	activeTrigger = element;

	// 4. Слушаем клики вовне
	setTimeout(() => {
		document.addEventListener('click', documentClickHandler);
	}, 0);
}

function documentClickHandler(e) {
	// Закрываем, если клик не по меню и не по триггеру
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

async function saveCustomStatus(element, taskId, newStatus, originalContent) {
	const oldStatusText = element.innerText.trim();
	if (newStatus === oldStatusText) return;

	element.innerText = newStatus;
	updateStatusColor(element, newStatus);

	try {
		const response = await fetch(`/tasks/update/${taskId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: newStatus }),
		});

		if (!response.ok) throw new Error();

		element.style.transition = 'background 0.3s';
		element.style.backgroundColor = '#dcfce7';
		setTimeout(() => (element.style.backgroundColor = ''), 500);
	} catch (error) {
		console.error(error);
		alert('Не удалось сохранить статус');
		element.innerHTML = originalContent;
		updateStatusColor(element, oldStatusText);
	}
}

function updateStatusColor(element, status) {
	element.classList.remove('status-open', 'status-progress', 'status-done', 'status-overdue', 'status-paused', 'status-cancelled');
	element.classList.add('task-status');

	switch (status.toLowerCase()) {
		case 'готово':
			element.classList.add('status-done');
			break;
		case 'открыто':
			element.classList.add('status-open');
			break;
		case 'в работе':
			element.classList.add('status-progress');
			break;
		case 'просрочено':
			element.classList.add('status-overdue');
			break;
		case 'на паузе':
			element.classList.add('status-paused');
			break;
		case 'отменено':
			element.classList.add('status-cancelled');
			break;
		default:
			element.classList.add('status-open');
	}
}

/**
 * Инлайновое редактирование с поддержкой Escape.
 */
function editTask(element, taskId, field) {
	if (!field) return;
	if (element.querySelector('input')) return;

	const originalValue = element.innerText.trim();
	const input = document.createElement('input');
	input.type = field === 'deadline_at' ? 'date' : 'text';
	input.value = originalValue;
	input.className = 'edit-input';

	element.innerText = '';
	element.appendChild(input);
	input.focus();

	element.style.flex = 1;

	// flex: 1;

	const save = async () => {
		const newValue = input.value.trim();
		if (!newValue || newValue === originalValue) {
			element.innerText = originalValue;
			return;
		}

		element.innerText = newValue;

		try {
			const response = await fetch(`/tasks/update/${taskId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [field]: newValue }),
			});
			element.style.flex = 'none';
			if (!response.ok) throw new Error();
		} catch (error) {
			alert('Ошибка сохранения');
			element.innerText = originalValue;
			element.style.flex = 'none';
		}
	};

	input.onkeyup = (e) => {
		if (e.key === 'Enter') save();
		if (e.key === 'Escape') {
			element.innerText = originalValue;
			input.blur();
		}
	};

	// Сохраняем при потере фокуса, если текст остался инпутом
	input.onblur = () => {
		if (element.contains(input)) save();
		element.style.flex = 'none';
	};

	input.onclick = (e) => e.stopPropagation();
}
