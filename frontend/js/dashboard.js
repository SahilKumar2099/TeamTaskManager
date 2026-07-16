const API = 'http://localhost:5000/api';
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user'));

// Redirect if not logged in
if (!token) window.location.href = 'index.html';

// Auth header helper
const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
});

// Track current team for invite/board creation
let currentTeamId = null;

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('user-name').textContent = user.name;
    loadTeams();
    loadMyTasks();
});

// ── Modal ─────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// ── Load Teams ────────────────────────────────────
async function loadTeams() {
    try {
        const res  = await fetch(`${API}/teams`, { headers: authHeaders() });
        const data = await res.json();

        if (!res.ok) {
            document.getElementById('teams-grid').innerHTML = `<p class="error-msg">${data.message}</p>`;
            return;
        }

        renderTeams(data.teams);
    } catch (err) {
        document.getElementById('teams-grid').innerHTML = '<p class="error-msg">Failed to load teams</p>';
    }
}

function renderTeams(teams) {
    const grid = document.getElementById('teams-grid');

    if (teams.length === 0) {
        grid.innerHTML = '<p class="empty-state">No teams yet — create one to get started!</p>';
        return;
    }

    grid.innerHTML = teams.map(team => {
       const myRole = team.members.find(m => m.user._id?.toString() === user.id?.toString())?.role;
        const isAdmin = myRole === 'admin';

        const memberTags = team.members.map(m => `
            <span class="member-tag ${m.role === 'admin' ? 'admin-tag' : ''}">
                ${m.user.name} ${m.role === 'admin' ? '★' : ''}
            </span>
        `).join('');

        return `
        <div class="card">
            <h3>${team.name}</h3>
            <p>${team.description || 'No description'}</p>
            <div class="member-list">${memberTags}</div>
            <div class="card-actions">
                <button class="btn-secondary" onclick="viewBoards('${team._id}', '${team.name}')">
                    View Boards
                </button>
                ${isAdmin ? `
                <button class="btn-secondary" onclick="openInviteModal('${team._id}')">
                    + Invite
                </button>
                <button class="btn-secondary" onclick="confirmDeleteTeam('${team._id}', '${team.name}')">
                    Delete Team
                </button>` : ''}
            </div>
        </div>`;
    }).join('');
}

// ── Load My Tasks ─────────────────────────────────
async function loadMyTasks() {
    try {
        const res  = await fetch(`${API}/tasks/my`, { headers: authHeaders() });
        const data = await res.json();

        if (!res.ok || data.tasks.length === 0) {
            document.getElementById('my-tasks').innerHTML = '<p class="empty-state">No tasks assigned to you yet.</p>';
            return;
        }

        renderMyTasks(data.tasks);
    } catch (err) {
        document.getElementById('my-tasks').innerHTML = '<p class="error-msg">Failed to load tasks</p>';
    }
}

function renderMyTasks(tasks) {
    const container = document.getElementById('my-tasks');

    container.innerHTML = tasks.map(task => {
        const due     = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;
        const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

        return `
        <div class="task-card">
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
                <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                <span class="assignee">📋 ${task.board?.name || 'Unknown board'}</span>
                ${due ? `<span class="due-date ${overdue ? 'overdue' : ''}">
                    ${overdue ? '⚠ ' : ''}Due: ${due}
                </span>` : ''}
            </div>
        </div>`;
    }).join('');
}

// ── Create Team ───────────────────────────────────
async function createTeam() {
    const name  = document.getElementById('team-name').value.trim();
    const desc  = document.getElementById('team-desc').value.trim();
    const error = document.getElementById('create-team-error');

    if (!name) { error.textContent = 'Team name is required'; return; }

    try {
        const res  = await fetch(`${API}/teams`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ name, description: desc })
        });
        const data = await res.json();

        if (!res.ok) { error.textContent = data.message; return; }

        closeModal('create-team-modal');
        document.getElementById('team-name').value = '';
        document.getElementById('team-desc').value = '';
        loadTeams();
    } catch (err) {
        error.textContent = 'Server error, try again';
    }
}

function confirmDeleteTeam(teamId, teamName) {
    const confirmed = window.confirm(`Delete team \"${teamName}\"? This will remove all boards and tasks within the team.`);
    if (!confirmed) return;
    deleteTeam(teamId);
}

async function deleteTeam(teamId) {
    try {
        const res = await fetch(`${API}/teams/${teamId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.message || 'Failed to delete team');
            return;
        }

        loadTeams();
    } catch (err) {
        alert('Server error, try again');
    }
}

// ── Invite Member ─────────────────────────────────
function openInviteModal(teamId) {
    currentTeamId = teamId;
    document.getElementById('invite-email').value = '';
    document.getElementById('invite-error').textContent = '';
    openModal('invite-modal');
}

async function inviteMember() {
    const email = document.getElementById('invite-email').value.trim();
    const role  = document.getElementById('invite-role').value;
    const error = document.getElementById('invite-error');

    if (!email) { error.textContent = 'Email is required'; return; }

    try {
        const res  = await fetch(`${API}/teams/${currentTeamId}/invite`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ email, role })
        });
        const data = await res.json();

        if (!res.ok) { error.textContent = data.message; return; }

        closeModal('invite-modal');
        loadTeams();
    } catch (err) {
        error.textContent = 'Server error, try again';
    }
}

// ── Boards ────────────────────────────────────────
function viewBoards(teamId, teamName) {
    localStorage.setItem('currentTeamId',   teamId);
    localStorage.setItem('currentTeamName', teamName);
    currentTeamId = teamId;  // ← this line was missing
    openCreateBoardModal(teamId);
}

function openCreateBoardModal(teamId) {
    currentTeamId = teamId;
    document.getElementById('board-name').value = '';
    document.getElementById('board-desc').value = '';
    document.getElementById('create-board-error').textContent = '';
    openModal('create-board-modal');
}

async function createBoard() {
    const name  = document.getElementById('board-name').value.trim();
    const desc  = document.getElementById('board-desc').value.trim();
    const error = document.getElementById('create-board-error');

    if (!name) { error.textContent = 'Board name is required'; return; }

    const res  = await fetch(`${API}/boards`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, description: desc, teamId: currentTeamId })
    });
    const data = await res.json();
    console.log('API response:', data);

    if (!res.ok) { error.textContent = data.message; return; }

    localStorage.setItem('currentBoardId',   data.board._id);
    localStorage.setItem('currentBoardName', data.board.name);
    closeModal('create-board-modal');
    window.location.href = 'board.html';
}