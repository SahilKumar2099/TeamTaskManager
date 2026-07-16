const API = 'http://localhost:5000/api';
const random = Math.random().toString(36).slice(2, 8);
const user = { name: `Admin ${random}`, email: `admin.${random}@example.com`, password: 'Password123!' };
const fetch = global.fetch;
(async () => {
  const registerRes = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  const registerBody = await registerRes.text();
  console.log('register', registerRes.status, registerBody);

  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password })
  });
  const loginBody = await loginRes.text();
  console.log('login', loginRes.status, loginBody);
  let token;
  try { token = JSON.parse(loginBody).token; } catch (err) { console.error('login parse err', err); process.exit(1); }

  const createRes = await fetch(`${API}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: `Test Team ${random}`, description: 'Integration test team' })
  });
  const createBody = await createRes.text();
  console.log('createTeam', createRes.status, createBody);
})();
