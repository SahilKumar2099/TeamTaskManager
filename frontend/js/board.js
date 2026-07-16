const API   = 'http://localhost:5000/api';
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user'));

const boardId   = localStorage.getItem('currentBoardId');
const boardName = localStorage.getItem('currentBoardName');
const teamId    = localStorage.getItem('currentTeamId');
const teamName  = localStorage.getItem('currentTeamName');

if (!token || !boardId) window.location.href = 'index.html';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
});

let currentTaskId = null;
let teamMembers   = [];

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('user-name').textContent  = user.name;
    document.getElementById('board-name').textContent = boardName;
    document.getElementById('team-name').textContent  = `Team: ${teamName}`;
    loadTeamMembers();
    loadTasks();
});

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// ── Modal ─────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ── Load Team Members for Assign Dropdown ─────────
async function loadTeamMembers() {
    try {
        const res  = await fetch(`${API}/teams/${teamId}`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) return;

        teamMembers = data.team.members;
        const select = document.getElementById('task-assign');
        select.innerHTML = '<option value="">Unassigned</option>';
        teamMembers.forEach(m => {
            select.innerHTML += `<option value="${m.user._id}">${m.user.name}</option>`;
        });
    } catch (err) {
        console.error('Failed to load members', err);
    }
}

// ── Load Tasks ────────────────────────────────────
async function loadTasks() {
    try {
        const res  = await fetch(`${API}/tasks/board/${boardId}`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) return;

        renderTasks(data.tasks);
    } catch (err) {
        console.error('Failed to load tasks', err);
    }
}

function renderTasks(tasks) {
    const todo     = tasks.filter(t => t.status === 'todo');
    const progress = tasks.filter(t => t.status === 'in-progress');
    const done     = tasks.filter(t => t.status === 'done');

    document.getElementById('col-todo').innerHTML     = todo.length     ? todo.map(taskCard).join('')     : '<p class="empty-state">No tasks</p>';
    document.getElementById('col-progress').innerHTML = progress.length ? progress.map(taskCard).join('') : '<p class="empty-state">No tasks</p>';
    document.getElementById('col-done').innerHTML     = done.length     ? done.map(taskCard).join('')     : '<p class="empty-state">No tasks</p>';

    document.getElementById('count-todo').textContent     = todo.length;
    document.getElementById('count-progress').textContent = progress.length;
    document.getElementById('count-done').textContent     = done.length;
}

function taskCard(task) {
    const due     = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;
    const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

    const labels = task.labels?.map(l =>
        `<span class="label-tag" style="background:${l.color}22; color:${l.color}; border:1px solid ${l.color}">${l.name}</span>`
    ).join('') || '';

    return `
    <div class="task-card" onclick="openTaskDetail('${task._id}')">
        <div class="task-title">${task.title}</div>
        <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">${task.priority}</span>
            ${task.assignedTo ? `<span class="assignee">👤 ${task.assignedTo.name}</span>` : ''}
            ${due ? `<span class="due-date ${overdue ? 'overdue' : ''}">${overdue ? '⚠ ' : ''}${due}</span>` : ''}
            ${labels}
        </div>
    </div>`;
}

// ── Create Task ───────────────────────────────────
async function createTask() {
    const title    = document.getElementById('task-title').value.trim();
    const desc     = document.getElementById('task-desc').value.trim();
    const priority = document.getElementById('task-priority').value;
    const dueDate  = document.getElementById('task-due').value;
    const assignTo = document.getElementById('task-assign').value;
    const error    = document.getElementById('create-task-error');

    if (!title) { error.textContent = 'Title is required'; return; }

    try {
        const res  = await fetch(`${API}/tasks`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                title,
                description: desc,
                boardId,
                priority,
                dueDate:    dueDate    || null,
                assignedTo: assignTo   || null
            })
        });
        const data = await res.json();

        if (!res.ok) { error.textContent = data.message; return; }

        closeModal('create-task-modal');
        document.getElementById('task-title').value = '';
        document.getElementById('task-desc').value  = '';
        document.getElementById('task-due').value   = '';
        loadTasks();
    } catch (err) {
        error.textContent = 'Server error, try again';
    }
}

// ── Task Detail ───────────────────────────────────
async function openTaskDetail(taskId) {
    currentTaskId = taskId;

    try {
        const res  = await fetch(`${API}/tasks/${taskId}`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) return;

        const task = data.task;
        document.getElementById('detail-title').textContent    = task.title;
        document.getElementById('detail-desc').textContent     = task.description || 'No description';
        document.getElementById('detail-status').value         = task.status;
        document.getElementById('detail-priority').value       = task.priority;
        document.getElementById('detail-error').textContent    = '';

        openModal('task-detail-modal');
    } catch (err) {
        console.error('Failed to load task', err);
    }
}

// ── Update Task ───────────────────────────────────
async function updateTask() {
    const status   = document.getElementById('detail-status').value;
    const priority = document.getElementById('detail-priority').value;
    const error    = document.getElementById('detail-error');

    try {
        const res  = await fetch(`${API}/tasks/${currentTaskId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ status, priority })
        });
        const data = await res.json();

        if (!res.ok) { error.textContent = data.message; return; }

        closeModal('task-detail-modal');
        loadTasks();
    } catch (err) {
        error.textContent = 'Server error, try again';
    }
}

// ── Delete Task ───────────────────────────────────
async function deleteTask() {
    const error = document.getElementById('detail-error');

    try {
        const res  = await fetch(`${API}/tasks/${currentTaskId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await res.json();

        if (!res.ok) { error.textContent = data.message; return; }

        closeModal('task-detail-modal');
        loadTasks();
    } catch (err) {
        error.textContent = 'Server error, try again';
    }
}