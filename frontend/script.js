const taskList = document.getElementById('taskList');
const taskForm = document.getElementById('taskForm');

// Функция для загрузки задач с сервера
async function fetchTasks() {
	const response = await fetch('/tasks');
	const tasks = await response.json();

	taskList.innerHTML = tasks
		.map(
			(task) => `
        <div class="task-item">
            <div>
                <strong>${task.title}</strong> <br>
                <small>Ответственный: ${task.assigned_to || 'не назначен'}</small>
            </div>
            <span class="task-status">${task.status}</span>
        </div>
    `
		)
		.join('');
}

// Функция для отправки новой задачи
taskForm.addEventListener('submit', async (e) => {
	e.preventDefault();

	const title = document.getElementById('title').value;
	const assigned_to = document.getElementById('assignedTo').value;

	await fetch('/tasks', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title, assigned_to }),
	});

	taskForm.reset();
	fetchTasks(); // Обновляем список
});

// Загружаем задачи при открытии страницы
fetchTasks();
