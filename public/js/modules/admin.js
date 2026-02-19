/**
 * Модуль для админских действий (API).
 */

export async function changeRole(userId, newRole) {
	const response = await fetch(`/admin/users/${userId}/role`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ role: newRole }),
	});

	if (!response.ok) {
		const data = await response.json();
		throw new Error(data.error || 'Ошибка изменения роли');
	}
	return await response.json();
}

export async function deleteUser(userId) {
	const response = await fetch(`/admin/users/delete/${userId}`, {
		method: 'POST',
	});

	if (!response.ok) {
		const data = await response.json();
		throw new Error(data.error || 'Ошибка удаления пользователя');
	}
	return await response.json();
}