/**
 * Модуль управления таблицей (подзадачи, инлайновое редактирование текста).
 */
import { updateTask } from './api.js';

// --- Подзадачи ---
export function toggleSubtaskForm(taskId) {
	const form = document.querySelector(`#form-sub-${taskId}`);
	const icon = document.querySelector(`.toggle-icon[data-id="${taskId}"]`);

	// Раскрыть существующие
	expandSubtasks(taskId, icon);

	if (form.classList.contains('hidden')) {
		// Скрыть другие формы
		document.querySelectorAll('.inline-add-form.is-subtask').forEach((f) => f.classList.add('hidden'));
		form.classList.remove('hidden');
		form.querySelector('input[name="title"]').focus();
	} else {
		form.classList.add('hidden');
	}
}

export function toggleSubtasks(id, icon) {
	const rows = document.querySelectorAll(`.task-row[data-parent-id="${id}"]`);
	const isExpanded = icon.classList.contains('expanded');

	if (isExpanded) {
		rows.forEach((r) => (r.style.display = 'none'));
		icon.classList.remove('expanded');
		icon.innerText = '▶';
		modifyStorage(id, false);
	} else {
		rows.forEach((r) => (r.style.display = 'grid'));
		icon.classList.add('expanded');
		icon.innerText = '▼';
		modifyStorage(id, true);
	}
}

function expandSubtasks(id, icon) {
	const rows = document.querySelectorAll(`.task-row[data-parent-id="${id}"]`);
	if (rows.length > 0) {
		rows.forEach((r) => (r.style.display = 'grid'));
		if (icon) {
			icon.classList.add('expanded');
			icon.innerText = '▼';
		}
		modifyStorage(id, true);
	}
}

// LocalStorage
export function restoreState() {
	const expanded = JSON.parse(localStorage.getItem('expandedTasks') || '[]');
	expanded.forEach((id) => {
		const icon = document.querySelector(`.toggle-icon[data-id="${id}"]`);
		expandSubtasks(id, icon);
	});
}

function modifyStorage(id, add) {
	let expanded = JSON.parse(localStorage.getItem('expandedTasks') || '[]');
	if (add) {
		if (!expanded.includes(id)) expanded.push(id);
	} else {
		expanded = expanded.filter((x) => x !== id.toString()); // ID может быть строкой
	}
	localStorage.setItem('expandedTasks', JSON.stringify(expanded));
}

// --- Поиск ---
export function setupSearch() {
	const input = document.getElementById('taskSearch');
	if (!input) return;
	input.addEventListener('keyup', () => {
		const filter = input.value.toLowerCase();
		document.querySelectorAll('.task-row:not(.inline-add-form)').forEach((row) => {
			const text = row.textContent.toLowerCase();
			row.style.display = text.includes(filter) ? '' : 'none';
		});
	});
}

// --- Инлайновое редактирование текста ---
export function editTextField(element, taskId, field, isPanel = false, syncCallback = null) {
	if (element.querySelector('input')) return;

	const original = element.innerText.trim();
	const input = document.createElement('input');
	input.type = field === 'deadline_at' ? 'date' : 'text';
	input.value = original;
	input.className = 'edit-input';
	if (isPanel) input.style.background = 'white';

	element.innerText = '';
	element.appendChild(input);
	input.focus();
	if (!isPanel) element.style.flex = 1;

	const save = async () => {
		const val = input.value.trim();
		if (!val || val === original) {
			element.innerText = original;
		} else {
			element.innerText = val;
			if (syncCallback) syncCallback(val);

			try {
				await updateTask(taskId, { [field]: val });
			} catch (e) {
				console.error(e);
				element.innerText = original;
			}
		}
		if (!isPanel) element.style.flex = 'none';
	};

	input.onkeyup = (e) => {
		if (e.key === 'Enter') input.blur();
		if (e.key === 'Escape') {
			element.innerText = original;
			if (!isPanel) element.style.flex = 'none';
		}
	};
	input.onblur = () => {
		if (element.contains(input)) save();
	};
	input.onclick = (e) => e.stopPropagation();
}

export function forceExpand(id) {
	let expanded = JSON.parse(localStorage.getItem('expandedTasks') || '[]');
	const strId = String(id); // Гарантируем строку

	if (!expanded.includes(strId)) {
		expanded.push(strId);
		localStorage.setItem('expandedTasks', JSON.stringify(expanded));
	}
}
