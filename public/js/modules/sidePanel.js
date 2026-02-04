/**
 * Модуль боковой панели.
 */
import { fetchTask, updateTask, fetchComments, sendComment } from './api.js';
import { updateStatusColor, updatePriorityUI } from './utils.js';

const els = {
	panel: () => document.getElementById('details-panel'),
	overlay: () => document.getElementById('overlay'),
	loading: () => document.getElementById('panel-loading'),
	content: () => document.getElementById('panel-data'),
	chatList: () => document.getElementById('chat-messages'),
	chatInput: () => document.getElementById('chat-input'),
	sendBtn: () => document.getElementById('chat-send-btn'),
};

export let currentPanelTaskId = null;

export async function openDetails(taskId) {
	currentPanelTaskId = taskId;

	els.panel().classList.add('open');
	els.overlay().classList.add('visible');
	els.loading().classList.remove('hidden');
	els.content().classList.add('hidden');

	try {
		const task = await fetchTask(taskId);
		render(task);

		const comments = await fetchComments(taskId);
		renderChat(comments);

		els.loading().classList.add('hidden');
		els.content().classList.remove('hidden');
	} catch (e) {
		console.error(e);
		els.loading().innerText = 'Ошибка загрузки';
	}
}

export function closeDetails() {
	els.panel().classList.remove('open');
	els.overlay().classList.remove('visible');
	currentPanelTaskId = null;
}

function render(task) {
	setText('p-id', task.id);
	setText('p-title', task.title);
	setText('p-assignee', task.assigned_to);
	setText('p-deadline', task.deadline_at);
	setText('p-created', new Date(task.created_at).toLocaleString());
	setText('p-updated', new Date(task.updated_at).toLocaleString());

	// Статус
	const statusEl = document.getElementById('p-status');
	statusEl.innerText = task.status;
	updateStatusColor(statusEl, task.status);

	// Приоритет
	updatePriorityUI(document.getElementById('p-priority'), task.priority || 1);

	// Обработчик заголовка
	const titleEl = document.getElementById('p-title');
	titleEl.onblur = () => saveTitle(titleEl, task.id);
	titleEl.onkeydown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			titleEl.blur();
		}
	};
}

function renderChat(comments) {
	const list = els.chatList();
	list.innerHTML = ''; // Очистка

	if (comments.length === 0) {
		list.innerHTML = '<div style="text-align:center; color:#ccc; margin-top:20px; font-size:12px;">Нет комментариев</div>';
	} else {
		comments.forEach((msg) => appendMessage(msg));
	}

	scrollToBottom();
}

function appendMessage(msg) {
	const list = els.chatList();
	// Удаляем заглушку "Нет комментариев", если есть
	if (list.querySelector('div[style*="text-align:center"]')) list.innerHTML = '';

	const isMe = msg.author === 'Admin'; // Хардкод пока нет авторизации
	const date = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	const el = document.createElement('div');
	el.className = `chat-message ${isMe ? 'is-me' : ''}`;
	el.innerHTML = `
        <div class="msg-header">${isMe ? 'Вы' : msg.author} • ${date}</div>
        <div class="msg-bubble">${escapeHtml(msg.text)}</div>
    `;
	list.appendChild(el);
}

function scrollToBottom() {
	const list = els.chatList();
	list.scrollTop = list.scrollHeight;
}

// Защита от XSS
function escapeHtml(text) {
	if (!text) return '';
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Инициализация обработчиков чата (вызывается один раз при старте)
export function initChatListeners() {
	const btn = els.sendBtn();
	const input = els.chatInput();

	const send = async () => {
		const text = input.value.trim();
		if (!text || !currentPanelTaskId) return;

		// Блокируем интерфейс
		input.disabled = true;

		try {
			const newMsg = await sendComment(currentPanelTaskId, text);
			appendMessage(newMsg);
			scrollToBottom();
			input.value = '';
		} catch (e) {
			alert('Ошибка отправки');
		} finally {
			input.disabled = false;
			input.focus();
		}
	};

	btn.onclick = send;
	input.onkeydown = (e) => {
		if (e.key === 'Enter') send();
	};
}

function setText(id, val) {
	const el = document.getElementById(id);
	if (el) el.innerText = val;
}

async function saveTitle(el, id) {
	const val = el.innerText.trim();
	if (!val) return;
	try {
		await updateTask(id, { title: val });
		// Синхронизация с таблицей
		const tableEl = document.querySelector(`.task-title-text[data-id="${id}"]`);
		if (tableEl) tableEl.innerText = val;
	} catch (e) {
		console.error(e);
	}
}
