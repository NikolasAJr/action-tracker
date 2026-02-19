/**
 * Вспомогательные функции (цвета, форматирование).
 */

export function getStatusClass(status) {
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

export function updateStatusColor(element, status) {
	// Сбрасываем все классы статусов, оставляем только базовые
	element.className = element.classList.contains('prop-value')
		? 'prop-value' // для панели
		: 'task-status'; // для таблицы

	element.classList.add(getStatusClass(status));
}

export function updateDaysLeftUI(taskId, deadlineDateString) {
	if (!deadlineDateString) return;

	// 1. Считаем разницу дней
	const targetDate = new Date(deadlineDateString);
	targetDate.setHours(0, 0, 0, 0);

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const diffInMs = targetDate.getTime() - today.getTime();
	const daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

	// Не показываем отрицательные числа, как в контроллере (0 минимум)
	const displayDays = daysLeft < 0 ? 0 : daysLeft;

	// 2. Определяем цвет
	let className = '';
	if (displayDays <= 1) className = 'days-critical';
	else if (displayDays <= 3) className = 'days-warning';

	// 3. Ищем элемент в таблице и обновляем
	const daysEl = document.querySelector(`[data-days-id="${taskId}"]`);
	if (daysEl) {
		daysEl.innerText = displayDays;
		daysEl.className = className; // Сбрасываем и ставим новый класс
	}
}

/**
 * Обновляет внешний вид элемента приоритета (текст и класс)
 * @param {HTMLElement} element
 * @param {string|number} value - Значение приоритета (1, 2, 3)
 */
export function updatePriorityUI(element, value) {
	// Сбрасываем старые классы, оставляем базовые
	element.className = element.classList.contains('prop-value')
		? 'prop-value priority-badge' // для панели
		: 'priority-badge'; // для таблицы и форм

	let text = 'Низкий';
	let cls = 'priority-low';

	// Приводим к числу, так как из dataset может прийти строка
	const val = Number(value);

	if (val === 3) {
		text = 'Высокий';
		cls = 'priority-high';
	} else if (val === 2) {
		text = 'Средний';
		cls = 'priority-medium';
	}

	element.innerText = text;
	element.classList.add(cls);

	// Сохраняем значение в dataset для логики
	element.dataset.val = val;
}
