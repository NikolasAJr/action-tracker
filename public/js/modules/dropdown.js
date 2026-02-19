/**
 * Модуль выпадающих меню.
 */
import { updateTask } from './api.js';
import { updatePriorityUI, updateStatusColor } from './utils.js';

let activeMenu = null;
let activeTrigger = null;

// --- Public API ---

export function closeActiveMenu() {
	if (activeMenu) {
		activeMenu.remove();
		activeMenu = null;
		activeTrigger = null;
		document.removeEventListener('click', documentClickHandler);
	}
}

export function openStatusDropdown(element, taskId, isNewForm = false, onSuccess = null) {
	if (checkIfActive(element)) return;

	const options = ['Открыто', 'В работе', 'Готово', 'На паузе', 'Отменено'];
	createMenu(element, options, (opt) => {
		if (isNewForm) {
			updateUI(element, opt);
			updateStatusColor(element, opt);
			setInput(element, 'status', opt);
		} else {
			save(element, taskId, 'status', opt, () => {
				updateStatusColor(element, opt);
				if (onSuccess) onSuccess(opt);
			});
		}
	});
}

export function openCategoryDropdown(element, taskId, isNewForm = false, onSuccess = null) {
	if (checkIfActive(element)) return;

	const options = window.CATEGORIES || [];
	createMenu(element, options, (opt) => {
		if (isNewForm) {
			updateUI(element, opt);
			setInput(element, 'category', opt);
		} else {
			save(element, taskId, 'category', opt, onSuccess);
		}
	});
}

export function openPriorityDropdown(element, taskId, isNewForm = false, onSuccess = null) {
	if (checkIfActive(element)) return;

	const options = [
		{ label: 'Низкий', val: 1 },
		{ label: 'Средний', val: 2 },
		{ label: 'Высокий', val: 3 },
	];

	// createMenu(..., ..., isComplex=true)
	createMenu(
		element,
		options,
		(optObj) => {
			if (isNewForm) {
				// 1. Обновляем внешний вид бейджа
				updatePriorityUI(element, optObj.val);
				// 2. Обновляем скрытый инпут
				setInput(element, 'priority', optObj.val);
			} else {
				// Сохраняем в БД
				save(element, taskId, 'priority', optObj.val, () => {
					if (onSuccess) onSuccess(optObj.val);
				});
			}
		},
		true,
	);
}

// --- Internals ---

function checkIfActive(element) {
	if (activeMenu) {
		const isSame = activeTrigger === element;
		closeActiveMenu();
		return isSame; // Если тот же элемент, возвращаем true, чтобы не открывать снова
	}
	return false;
}

function createMenu(element, options, onSelect, isComplex = false) {
	const menu = document.createElement('div');
	menu.className = 'status-menu-custom';

	options.forEach((opt) => {
		const item = document.createElement('div');
		item.className = 'status-opt';
		item.innerText = isComplex ? opt.label : opt;

		item.onclick = (e) => {
			e.stopPropagation();
			onSelect(opt); // Передаем либо строку, либо объект
			closeActiveMenu();
		};
		menu.appendChild(item);
	});

	document.body.appendChild(menu);
	positionMenu(element, menu);

	activeMenu = menu;
	activeTrigger = element;

	setTimeout(() => document.addEventListener('click', documentClickHandler), 0);
}

function positionMenu(element, menu) {
	const rect = element.getBoundingClientRect();
	const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

	// Центрируем
	const centerX = rect.left + scrollLeft + rect.width / 2;
	const topY = rect.bottom + scrollTop + 8;

	menu.style.top = topY + 'px';
	menu.style.left = centerX + 'px';
}

function documentClickHandler(e) {
	if (activeMenu && !activeMenu.contains(e.target) && e.target !== activeTrigger) {
		closeActiveMenu();
	}
}

async function save(element, taskId, field, value, cb) {
	updateUI(element, value); // Оптимистичное обновление (если это текст)
	if (cb) cb(value);

	try {
		// Отправляем запрос к нашему API
		await updateTask(taskId, { [field]: value });

		// Визуальная индикация успеха (зеленая вспышка)
		element.style.transition = 'background 0.3s';
		const oldBg = element.style.backgroundColor;
		element.style.backgroundColor = '#dcfce7';
		setTimeout(() => (element.style.backgroundColor = oldBg), 500);
	} catch (e) {
		console.error('Ошибка сохранения поля:', e);
		alert('Не удалось сохранить изменения в базе данных');
		// Тут по-хорошему надо откатывать UI назад, но для начала исправим запись
	}
}

function updateUI(element, value) {
	// Если это приоритет, текст меняется выше. Для простых полей:
	if (typeof value === 'string') element.innerText = value;
}

function setInput(element, name, value) {
	const form = element.closest('form');
	if (form) {
		const input = form.querySelector(`input[name="${name}"]`);
		if (input) input.value = value;
	}
}
