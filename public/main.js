/**
 * Основной фронтенд-скрипт Action Tracker.
 */

let activeMenu = null;
let activeTrigger = null;

function openDetails(title, user) {
	document.querySelector('#panel-title').innerText = title;
	document.querySelector('#panel-user').innerText = user;
	document.querySelector('#details-panel').classList.add('open');
	document.querySelector('#overlay').classList.add('visible');
}

function closeDetails() {
	document.querySelector('#details-panel').classList.remove('open');
	document.querySelector('#overlay').classList.remove('visible');
}

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

/* --- EDIT STATUS (Dropdown) --- */
function editStatus(element, taskId, isNewForm = false) {
	if (activeMenu) {
		const isSameElement = activeTrigger === element;
		closeMenuHandler();
		if (isSameElement) return;
	}
	const currentStatus = element.innerText.trim();
	const options = ['Открыто', 'В работе', 'Готово', 'На паузе', 'Отменено'];
	createDropdown(element, options, (opt) => {
		if (isNewForm) {
			element.innerText = opt;
			updateStatusColor(element, opt);
			const form = element.closest('form');
			if (form) form.querySelector('input[name="status"]').value = opt;
		} else {
			saveField(element, taskId, 'status', opt, () => updateStatusColor(element, opt));
		}
	});
}

/* --- EDIT CATEGORY (Dropdown) --- */
function editCategory(element, taskId, isNewForm = false) {
	if (activeMenu) {
		const isSameElement = activeTrigger === element;
		closeMenuHandler();
		if (isSameElement) return;
	}
	// Используем категории, переданные из EJS
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

// Вспомогательная функция для создания выпадающего меню
function createDropdown(element, options, onSelect) {
	const menu = document.createElement('div');
	menu.className = 'status-menu-custom'; // Используем те же стили

	options.forEach((opt) => {
		const item = document.createElement('div');
		item.className = 'status-opt'; // Используем те же стили опций
		item.innerText = opt;
		item.setAttribute('data-val', opt);

		// Убираем цветные точки для категорий, если нужно, или оставляем
		// Для простоты используем те же классы, стили точек применятся только если data-val совпадет со статусом

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

// Универсальная функция сохранения поля
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

		// Визуальный успех
		element.style.transition = 'background 0.3s';
		const oldBg = element.style.backgroundColor;
		element.style.backgroundColor = '#dcfce7'; // Зеленая вспышка
		setTimeout(() => (element.style.backgroundColor = oldBg), 500);
	} catch (error) {
		console.error(error);
		alert('Ошибка сохранения');
		element.innerText = originalValue;
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

	const save = () => {
		const newValue = input.value.trim();
		if (!newValue || newValue === originalValue) {
			element.innerText = originalValue;
		} else {
			saveField(element, taskId, field, newValue);
		}
		element.style.flex = 'none';
	};

	input.onkeyup = (e) => {
		if (e.key === 'Enter') {
			input.blur();
		}
		if (e.key === 'Escape') {
			element.innerText = originalValue;
			element.style.flex = 'none';
		}
	};
	input.onblur = () => {
		if (element.contains(input)) save();
	};
	input.onclick = (e) => e.stopPropagation();
}
