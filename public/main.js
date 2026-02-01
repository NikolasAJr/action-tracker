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

	// 1. Раскрываем список подзадач, если он есть и был свернут
	const subtasks = document.querySelectorAll(`.task-row[data-parent-id="${taskId}"]`);
	if (subtasks.length > 0) {
		subtasks.forEach((sub) => (sub.style.display = 'grid'));
		if (icon) {
			icon.classList.add('expanded');
			icon.innerText = '▼';
		}
		saveToStorage(taskId); // Сохраняем состояние в localStorage, чтобы не закрылось
	}

	// 2. Показываем/скрываем саму форму ввода
	if (form.classList.contains('hidden')) {
		// Скрываем другие открытые формы для порядка
		document.querySelectorAll('.inline-add-form.is-subtask').forEach((f) => f.classList.add('hidden'));

		form.classList.remove('hidden');
		form.querySelector('input[name="title"]').focus();
	} else {
		form.classList.add('hidden');
	}
}

// Функция для переключения видимости
function toggleSubtasks(parentId, iconElement) {
	const subtasks = document.querySelectorAll(`.task-row[data-parent-id="${parentId}"]`);
	const isExpanded = iconElement.classList.contains('expanded');

	if (isExpanded) {
		// Сворачиваем
		subtasks.forEach((sub) => (sub.style.display = 'none'));
		iconElement.classList.remove('expanded');
		iconElement.innerText = '▶';
		removeFromStorage(parentId);
	} else {
		// Разворачиваем
		subtasks.forEach((sub) => (sub.style.display = 'grid'));
		iconElement.classList.add('expanded');
		iconElement.innerText = '▼';
		saveToStorage(parentId);
	}
}

// Функции для работы с памятью браузера
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

// ПРИ ЗАГРУЗКЕ СТРАНИЦЫ: открываем те, что были развернуты
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

// Делаем функцию глобальной, чтобы onkeyup её видел
window.filterTasks = function () {
	const input = document.getElementById('taskSearch');
	const filter = input.value.toLowerCase();
	const rows = document.querySelectorAll('.task-row:not(.inline-add-form)'); // Исключаем формы добавления

	rows.forEach((row) => {
		// Ищем текст внутри clickable-area (название, юзер, статус)
		const text = row.querySelector('.task-clickable-area').innerText.toLowerCase();

		// Логика: если текст найден - показываем, иначе скрываем.
		// НО! Если это подзадача, и она скрыта родительской логикой, мы не должны её насильно открывать,
		// если только поиск не идет конкретно по ней.

		if (text.includes(filter)) {
			row.style.display = ''; // Сбрасываем display (вернется grid)

			// Фишка: Если нашли подзадачу, нужно раскрыть родителя!
			if (row.classList.contains('is-subtask')) {
				const parentId = row.getAttribute('data-parent-id');
				// Находим иконку родителя и имитируем раскрытие, если нужно
				// (это сложнее, для начала просто фильтруем видимое)
			}
		} else {
			row.style.display = 'none';
		}
	});
};

// Функция для редактирования статуса
function editStatus(element, taskId) {
	console.log(element, taskId);
	// Если уже редактируем, ничего не делаем
	if (element.querySelector('select')) return;

	const currentStatus = element.innerText.trim();
	const originalClass = element.className; // Запоминаем текущий цвет

	// 1. Создаем выпадающий список
	const select = document.createElement('select');
	select.className = 'status-select';

	// Варианты статусов (можно расширить)
	const options = ['Открыто', 'В работе', 'Готово', 'На паузе', 'Отменено'];
	options.forEach((opt) => {
		const option = document.createElement('option');
		option.value = opt;
		option.innerText = opt;
		if (opt === currentStatus) option.selected = true;
		select.appendChild(option);
	});

	// 2. Очищаем ячейку и вставляем селект
	element.innerText = '';
	element.appendChild(select);
	select.focus();

	// 3. Обработка сохранения (когда выбрали другое значение или убрали фокус)
	const save = async () => {
		// Проверка: если селекта уже нет в элементе, значит сохранение уже идет/завершено
		if (!element.contains(select)) return;

		const newStatus = select.value;
		element.innerText = newStatus; // Удаляем селект, возвращаем текст

		if (newStatus === currentStatus) {
			updateStatusColor(element, currentStatus); // На случай, если класс сбился
			return;
		}

		updateStatusColor(element, newStatus);

		try {
			const response = await fetch(`/tasks/update/${taskId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});

			if (!response.ok) throw new Error('Ошибка сервера');

			element.style.transition = 'background 0.5s';
			element.style.backgroundColor = '#dcfce7';
			setTimeout(() => {
				element.style.backgroundColor = '';
			}, 500);

			console.log(`Задача ${taskId} обновлена`);
		} catch (error) {
			console.error(error);
			alert('Ошибка при сохранении');
			element.innerText = currentStatus;
			element.className = originalClass;
		}
	};

	// Событие: когда выбор изменился — сохраняем
	select.onchange = save;

	// Событие: если кликнули мимо (blur) — тоже сохраняем (или можно отменять)
	select.onblur = save;

	// Останавливаем всплытие клика внутри селекта, чтобы не открывалась панель деталей
	select.onclick = (e) => e.stopPropagation();
}

// Вспомогательная функция для смены цвета без перезагрузки
function updateStatusColor(element, status) {
	// Удаляем старые классы статусов
	element.classList.remove('status-open', 'status-progress', 'status-done', 'status-overdue', 'status-paused', 'status-cancelled');
	element.classList.add('task-status'); // Базовый класс

	// Добавляем новый
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
	console.log(element, taskId, field);
	// Если внутри уже есть инпут, выходим
	if (element.querySelector('input')) return;

	const originalTitle = element.innerText.trim();

	// 1. Создаем поле ввода
	const input = document.createElement('input');
	input.type = 'text';
	input.value = originalTitle;
	input.className = 'edit-input';

	// 2. Подменяем текст на инпут
	element.innerText = '';
	element.appendChild(input);
	input.focus();

	// Функция сохранения
	const save = async () => {
		const newTitle = input.value.trim();

		// Если пусто или не изменилось — просто возвращаем текст
		if (!newTitle || newTitle === originalTitle) {
			element.innerText = originalTitle;
			return;
		}

		element.innerText = newTitle;

		try {
			const response = await fetch(`/tasks/update/${taskId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: newTitle }), // Отправляем новое название
			});

			if (!response.ok) throw new Error();
			console.log(`Название задачи ${taskId} изменено на: ${newTitle}`);
		} catch (error) {
			alert('Ошибка при сохранении названия');
			element.innerText = originalTitle;
		}
	};

	// Сохранение по Enter, отмена по Escape
	input.onkeyup = (e) => {
		if (e.key === 'Enter') save();
		if (e.key === 'Escape') element.innerText = originalTitle;
	};

	input.onblur = save;
	input.onclick = (e) => e.stopPropagation(); // Чтобы не открылась панель
}
