/**
 * Модуль для общения с сервером (API).
 */

export async function fetchTask(id) {
	console.log(id);
	const response = await fetch(`/tasks/${id}`);
	if (!response.ok) throw new Error(`Ошибка загрузки задачи: ${response.status}`);
	return await response.json();
}

export async function updateTask(id, data) {
	const response = await fetch(`/tasks/update/${id}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	});
	if (!response.ok) throw new Error('Ошибка обновления задачи');
	return await response.json();
}

export async function fetchComments(taskId) {
	const response = await fetch(`/tasks/${taskId}/comments`);
	if (!response.ok) throw new Error('Ошибка загрузки комментариев');
	return await response.json();
}

export async function sendComment(taskId, text) {
	const response = await fetch(`/tasks/${taskId}/comments`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text }),
	});
	if (!response.ok) throw new Error('Ошибка отправки комментария');
	return await response.json();
}
