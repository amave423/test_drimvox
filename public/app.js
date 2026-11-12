const API = '';

let token = localStorage.getItem('token');

function navigate(page) {
  const app = document.getElementById('app');
  if (page === 'login') {
    app.innerHTML = loginPage();
    bindLoginEvents();
  } else if (page === 'register') {
    app.innerHTML = registerPage();
    bindRegisterEvents();
  } else if (page === 'tasks') {
    app.innerHTML = tasksPage();
    bindTaskEvents();
    loadTasks();
  }
}

function loginPage() {
  return `
    <h1>Список дел</h1>
    <div class="card">
      <div class="auth-tabs">
        <button class="active" onclick="switchTab('login')">Вход</button>
        <button onclick="switchTab('register')">Регистрация</button>
      </div>
      <div id="auth-form">${loginForm()}</div>
    </div>
  `;
}

function registerPage() {
  return `
    <h1>Список дел</h1>
    <div class="card">
      <div class="auth-tabs">
        <button onclick="switchTab('login')">Вход</button>
        <button class="active" onclick="switchTab('register')">Регистрация</button>
      </div>
      <div id="auth-form">${registerForm()}</div>
    </div>
  `;
}

function loginForm() {
  return `
    <div class="form-group">
      <label>Имя пользователя</label>
      <input type="text" id="username" placeholder="Введите имя">
    </div>
    <div class="form-group">
      <label>Пароль</label>
      <input type="password" id="password" placeholder="Введите пароль">
    </div>
    <div id="auth-error" class="error"></div>
    <button class="btn btn-primary" onclick="handleLogin()">Войти</button>
  `;
}

function registerForm() {
  return `
    <div class="form-group">
      <label>Имя пользователя</label>
      <input type="text" id="username" placeholder="Минимум 3 символа">
    </div>
    <div class="form-group">
      <label>Пароль</label>
      <input type="password" id="password" placeholder="Минимум 6 символов">
    </div>
    <div id="auth-error" class="error"></div>
    <button class="btn btn-primary" onclick="handleRegister()">Зарегистрироваться</button>
  `;
}

function tasksPage() {
  return `
    <h1>Список дел</h1>
    <div class="user-info">
      <span id="user-greeting"></span>
      <button class="logout-btn" onclick="handleLogout()">Выйти</button>
    </div>
    <div class="card">
      <div class="add-form">
        <input type="text" id="new-task" placeholder="Новая задача...">
        <button class="btn btn-primary" onclick="handleAddTask()">Добавить</button>
      </div>
      <ul class="task-list" id="task-list"></ul>
    </div>
  `;
}

function switchTab(tab) {
  if (tab === 'login') navigate('login');
  else navigate('register');
}

async function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('auth-error');

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('token', token);
    navigate('tasks');
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

async function handleRegister() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('auth-error');

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('token', token);
    navigate('tasks');
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

function handleLogout() {
  token = null;
  localStorage.removeItem('token');
  navigate('login');
}

async function loadTasks() {
  const list = document.getElementById('task-list');
  if (!list) return;

  try {
    const res = await fetch(`${API}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tasks = await res.json();
    list.innerHTML = tasks.map(t => `
      <li class="task-item ${t.done ? 'done' : ''}">
        <span class="task-title">${escapeHtml(t.title)}</span>
        <div class="task-actions">
          <button class="btn btn-small btn-success" onclick="toggleTask(${t.id}, ${t.done ? 0 : 1})">
            ${t.done ? 'Отменить' : '✓'}
          </button>
          <button class="btn btn-small btn-danger" onclick="deleteTask(${t.id})">Удалить</button>
        </div>
      </li>
    `).join('');
  } catch (err) {
    list.innerHTML = '<li>Ошибка загрузки задач</li>';
  }
}

async function handleAddTask() {
  const input = document.getElementById('new-task');
  const title = input.value.trim();
  if (!title) return;

  try {
    const res = await fetch(`${API}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      input.value = '';
      loadTasks();
    }
  } catch (err) {
    console.error(err);
  }
}

async function toggleTask(id, done) {
  try {
    await fetch(`${API}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ done: !!done }),
    });
    loadTasks();
  } catch (err) {
    console.error(err);
  }
}

async function deleteTask(id) {
  try {
    await fetch(`${API}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadTasks();
  } catch (err) {
    console.error(err);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Init
if (token) {
  navigate('tasks');
} else {
  navigate('login');
}
