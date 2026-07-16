const assert = require('assert');

const API = 'http://localhost:5000/api';
const random = Math.random().toString(36).slice(2, 8);
const adminUser = {
    name: `Admin ${random}`,
    email: `admin.${random}@example.com`,
    password: 'Password123!'
};
const memberUser = {
    name: `Member ${random}`,
    email: `member.${random}@example.com`,
    password: 'Password123!'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function request(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    let body;
    try {
        body = await res.json();
    } catch (err) {
        body = null;
    }
    return { res, body };
}

async function register(user) {
    const { res, body } = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(user)
    });
    assert.strictEqual(res.status, 201, `register failed: ${JSON.stringify(body)}`);
    return body;
}

async function login(email, password) {
    const { res, body } = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    assert.strictEqual(res.status, 200, `login failed: ${JSON.stringify(body)}`);
    assert.ok(body.token, 'login did not return token');
    return body.token;
}

async function createTeam(token, name) {
    const { res, body } = await request('/teams', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description: 'Integration test team' })
    });
    assert.strictEqual(res.status, 201, `create team failed: ${JSON.stringify(body)}`);
    return body.team;
}

async function inviteMember(token, teamId, email) {
    const { res, body } = await request(`/teams/${teamId}/invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, role: 'member' })
    });
    assert.strictEqual(res.status, 200, `invite failed: ${JSON.stringify(body)}`);
    return body.team;
}

async function createBoard(token, teamId, name) {
    const { res, body } = await request('/boards', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description: 'Test board', teamId })
    });
    assert.strictEqual(res.status, 201, `create board failed: ${JSON.stringify(body)}`);
    return body.board;
}

async function createTask(token, boardId, title) {
    const { res, body } = await request('/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, boardId, description: 'Test task', priority: 'medium' })
    });
    assert.strictEqual(res.status, 201, `create task failed: ${JSON.stringify(body)}`);
    return body.task;
}

async function getBoard(token, boardId) {
    const { res, body } = await request(`/boards/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return { res, body };
}

async function getTasksByBoard(token, boardId) {
    const { res, body } = await request(`/tasks/board/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return { res, body };
}

async function deleteTeam(token, teamId) {
    const { res, body } = await request(`/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
    });
    return { res, body };
}

async function run() {
    console.log('Starting integration test for team delete flow...');

    // Wait for server to start
    for (let i = 0; i < 10; i += 1) {
        try {
            const ping = await request('/');
            if (ping.res.ok) break;
        } catch (err) {
            if (i === 9) throw err;
            await sleep(500);
        }
    }

    const adminRegister = await register(adminUser);
    const adminToken = await login(adminUser.email, adminUser.password);
    const memberRegister = await register(memberUser);
    const memberToken = await login(memberUser.email, memberUser.password);

    const team = await createTeam(adminToken, `Test Team ${random}`);
    assert.strictEqual(team.name.startsWith('Test Team'), true);

    await inviteMember(adminToken, team._id, memberUser.email);

    const board = await createBoard(adminToken, team._id, `Board ${random}`);
    const task = await createTask(adminToken, board._id, `Task ${random}`);

    const tasksBefore = await getTasksByBoard(adminToken, board._id);
    assert.strictEqual(tasksBefore.res.status, 200, `expected tasks before delete, got ${tasksBefore.res.status}`);
    assert.ok(Array.isArray(tasksBefore.body.tasks), 'tasks response missing array');
    assert.strictEqual(tasksBefore.body.tasks.length, 1, 'expected one task before delete');

    const deleteAttempt = await deleteTeam(memberToken, team._id);
    assert.strictEqual(deleteAttempt.res.status, 403, 'member should not be allowed to delete team');

    const adminDelete = await deleteTeam(adminToken, team._id);
    assert.strictEqual(adminDelete.res.status, 200, `admin delete failed: ${JSON.stringify(adminDelete.body)}`);

    const teamFetch = await request(`/teams/${team._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(teamFetch.res.status, 404, 'deleted team should not be found');

    const boardFetch = await getBoard(adminToken, board._id);
    assert.strictEqual(boardFetch.res.status, 404, 'deleted board should not be found');

    const tasksAfter = await getTasksByBoard(adminToken, board._id);
    assert.strictEqual(tasksAfter.res.status, 404, 'tasks should be removed when board is deleted');

    console.log('All integration test cases passed successfully.');
}

run().catch(err => {
    console.error('Integration test failed:', err);
    process.exit(1);
});
