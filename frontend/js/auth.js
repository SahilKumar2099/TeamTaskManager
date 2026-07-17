const API = (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    return 'https://taskmanager-backend.onrender.com/api';
})();

// Redirect if already logged in
if (localStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
}

function showTab(tab) {
    document.getElementById('login-form').style.display    = tab === 'login'    ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';

    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
    });
}

async function login() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorEl  = document.getElementById('login-error');

    if (!email || !password) {
        errorEl.textContent = 'Please fill in all fields';
        return;
    }

    try {
        const res  = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            errorEl.textContent = data.message;
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));
        window.location.href = 'dashboard.html';

    } catch (err) {
        errorEl.textContent = 'Server error, try again';
    }
}

async function register() {
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const errorEl  = document.getElementById('register-error');

    if (!name || !email || !password) {
        errorEl.textContent = 'Please fill in all fields';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        return;
    }

    try {
        const res  = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            errorEl.textContent = data.message;
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));
        window.location.href = 'dashboard.html';

    } catch (err) {
        errorEl.textContent = 'Server error, try again';
    }
}