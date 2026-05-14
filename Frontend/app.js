const API_BASE = 'http://localhost:3000/api';

const state = {
  user: null,
  registerStep: 'email',
  registerData: { name: '', email: '', otp: '', password: '', confirmPassword: '' },
  aiQuestion: '',
  complaintText: '',
  complaintAnswer: '',
  complaints: [],
  adminComplaints: [],
  message: '',
  error: '',
};

const appEl = document.getElementById('app');
const navEl = document.getElementById('top-nav');

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('hashchange', renderRoute);

async function init() {
  await refreshSession();
  renderRoute();
}

async function refreshSession() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      state.user = null;
      return;
    }

    state.user = await response.json();
  } catch (error) {
    state.user = null;
  }
}

function setError(message) {
  state.error = message;
  state.message = '';
  renderRoute();
}

function setSuccess(message) {
  state.message = message;
  state.error = '';
  renderRoute();
}

function renderNav() {
  const isAuth = Boolean(state.user);
  const userRole = state.user?.role;
  const links = [];

  if (!isAuth) {
    links.push({ label: 'Login', hash: '#/login' });
    links.push({ label: 'Register', hash: '#/register' });
  } else {
    links.push({ label: 'My Complaints', hash: '#/my' });
    links.push({ label: 'Submit Complaint', hash: '#/new' });
    if (userRole === 'admin') {
      links.push({ label: 'Admin Dashboard', hash: '#/admin' });
    }
    links.push({ label: 'Logout', action: logout });
  }

  navEl.innerHTML = links
    .map((link) => {
      if (link.action) {
        return `<button class="secondary" type="button" onclick="window.app.${link.action.name}()">${link.label}</button>`;
      }
      return `<a class="secondary" href="${link.hash}">${link.label}</a>`;
    })
    .join(' ');
}

window.app = { logout };

function renderRoute() {
  renderNav();
  const hash = window.location.hash.replace('#', '');
  const route = hash.startsWith('/') ? hash.slice(1) : 'login';

  if (!state.user) {
    if (route === 'register') {
      return renderRegister();
    }
    return renderLogin();
  }

  if (route === 'login' || route === 'register') {
    return window.location.replace('#/my');
  }

  if (route === 'new') {
    return renderComplaintForm();
  }

  if (route === 'my') {
    return renderMyComplaints();
  }

  if (route === 'admin' && state.user.role === 'admin') {
    return renderAdminDashboard();
  }

  return renderMyComplaints();
}

function renderMessage() {
  if (state.error) {
    return `<div class="error">${state.error}</div>`;
  }
  if (state.message) {
    return `<div class="success">${state.message}</div>`;
  }
  return '';
}

function renderLogin() {
  appEl.innerHTML = `
    <div class="card">
      <h2>Login</h2>
      ${renderMessage()}
      <div class="form-group">
        <label for="login-email">Email</label>
        <input id="login-email" type="email" placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label for="login-password">Password</label>
        <input id="login-password" type="password" placeholder="Password" />
      </div>
      <button type="button" onclick="window.app.login()">Login</button>
      <p style="margin-top: 16px;">Don't have an account? <a href="#/register">Register</a></p>
    </div>
  `;
}

function renderRegister() {
  const step = state.registerStep;
  const isOtpStep = step === 'otp';

  appEl.innerHTML = `
    <div class="card">
      <h2>Register</h2>
      ${renderMessage()}
      ${step === 'email' ? `
        <div class="form-group">
          <label for="register-name">Full Name</label>
          <input id="register-name" type="text" placeholder="Your full name" />
        </div>
        <div class="form-group">
          <label for="register-email">Email</label>
          <input id="register-email" type="email" placeholder="you@example.com" />
        </div>
        <button type="button" onclick="window.app.sendOtp()">Send OTP</button>
      ` : `
        <div class="form-group">
          <label for="register-otp">OTP</label>
          <input id="register-otp" type="text" placeholder="Enter OTP" />
        </div>
        <div class="form-group">
          <label for="register-password">Password</label>
          <input id="register-password" type="password" placeholder="Password" />
        </div>
        <div class="form-group">
          <label for="register-confirm-password">Confirm Password</label>
          <input id="register-confirm-password" type="password" placeholder="Confirm Password" />
        </div>
        <button type="button" onclick="window.app.verifyOtpAndRegister()">Complete Registration</button>
      `}
      <p style="margin-top: 16px;">Already registered? <a href="#/login">Login</a></p>
    </div>
  `;

  if (!isOtpStep) {
    document.getElementById('register-name').value = state.registerData.name;
    document.getElementById('register-email').value = state.registerData.email;
  }
}

function renderComplaintForm() {
  appEl.innerHTML = `
    <div class="card">
      <h2>Submit a Complaint</h2>
      ${renderMessage()}
      <div class="form-group">
        <label for="complaint-text">Complaint</label>
        <textarea id="complaint-text" placeholder="Describe your issue"></textarea>
      </div>
      <button type="button" onclick="window.app.getAiQuestion()">Generate Follow-up Question</button>
      ${state.aiQuestion ? `
        <div class="form-group" style="margin-top: 18px;">
          <label>AI Follow-up Question</label>
          <div class="complaint-card"><strong>${state.aiQuestion}</strong></div>
        </div>
        <div class="form-group">
          <label for="ai-answer">Your Answer</label>
          <textarea id="ai-answer" placeholder="Answer the follow-up question"></textarea>
        </div>
        <button type="button" onclick="window.app.submitComplaint()">Submit Complaint</button>
      ` : ''}
    </div>
  `;

  document.getElementById('complaint-text').value = state.complaintText;
}

function renderMyComplaints() {
  const complaints = state.complaints || [];
  appEl.innerHTML = `
    <div class="card">
      <h2>My Complaints</h2>
      ${renderMessage()}
      <button type="button" onclick="window.location.hash='#/new'">Submit New Complaint</button>
    </div>
    ${complaints.length === 0 ? '<div class="card"><p>No complaints yet.</p></div>' : complaints.map(renderComplaintCard).join('')}
  `;
}

function renderAdminDashboard() {
  const complaints = state.adminComplaints || [];
  appEl.innerHTML = `
    <div class="card">
      <h2>Admin Dashboard</h2>
      ${renderMessage()}
    </div>
    ${complaints.length === 0 ? '<div class="card"><p>No complaints found.</p></div>' : complaints.map(renderAdminComplaintCard).join('')}
  `;
}

function renderComplaintCard(item) {
  return `
    <div class="complaint-card">
      <h4>Submitted ${new Date(item.created_at).toLocaleString()}</h4>
      <p><strong>Complaint:</strong> ${escapeHtml(item.complaint_text)}</p>
      <p><strong>AI Question:</strong> ${escapeHtml(item.ai_question)}</p>
      <p><strong>Answer:</strong> ${escapeHtml(item.user_answer)}</p>
    </div>
  `;
}

function renderAdminComplaintCard(item) {
  return `
    <div class="complaint-card">
      <h4>Submitted ${new Date(item.created_at).toLocaleString()}</h4>
      <p><strong>User:</strong> ${escapeHtml(item.user_name)} (${escapeHtml(item.user_email)})</p>
      <p><strong>Complaint:</strong> ${escapeHtml(item.complaint_text)}</p>
      <p><strong>AI Question:</strong> ${escapeHtml(item.ai_question)}</p>
      <p><strong>Answer:</strong> ${escapeHtml(item.user_answer)}</p>
    </div>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.app.login = async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (!email || !password) {
    return setError('Email and password are required');
  }

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      return setError(payload.error || 'Login failed');
    }
    state.user = payload;
    state.error = '';
    window.location.hash = '#/my';
    await loadComplaints();
  } catch (error) {
    setError('Unable to login, please try again');
  }
};

window.app.sendOtp = async function sendOtp() {
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  if (!name || !email) {
    return setError('Name and email are required');
  }

  try {
    const response = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    const payload = await response.json();
    if (!response.ok) {
      return setError(payload.error || 'Unable to send OTP');
    }

    state.registerStep = 'otp';
    state.registerData.name = name;
    state.registerData.email = email;
    setSuccess('OTP sent. Enter the code and choose a password.');
  } catch (error) {
    setError('Unable to send OTP. Check your network and try again.');
  }
};

window.app.verifyOtpAndRegister = async function verifyOtpAndRegister() {
  const otp = document.getElementById('register-otp').value.trim();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;

  if (!otp || !password || !confirmPassword) {
    return setError('OTP and both password fields are required');
  }
  if (password !== confirmPassword) {
    return setError('Passwords do not match');
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: state.registerData.email, otp, password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      return setError(payload.error || 'Registration failed');
    }

    state.registerStep = 'email';
    state.registerData = { name: '', email: '', otp: '', password: '', confirmPassword: '' };
    setSuccess('Registration successful. Please login.');
    window.location.hash = '#/login';
  } catch (error) {
    setError('Registration failed. Please try again.');
  }
};

window.app.getAiQuestion = async function getAiQuestion() {
  const complaintText = document.getElementById('complaint-text').value.trim();
  if (!complaintText) {
    return setError('Complaint text is required');
  }

  state.complaintText = complaintText;

  try {
    const response = await fetch(`${API_BASE}/ai/question`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaint_text: complaintText }),
    });
    const payload = await response.json();
    if (!response.ok) {
      return setError(payload.error || 'Unable to get AI question');
    }
    state.aiQuestion = payload.ai_question;
    state.error = '';
    setSuccess('AI follow-up question generated. Answer it below.');
    renderRoute();
  } catch (error) {
    setError('Failed to generate AI question. Try again later.');
  }
};

window.app.submitComplaint = async function submitComplaint() {
  const aiAnswer = document.getElementById('ai-answer').value.trim();
  if (!state.aiQuestion || !state.complaintText || !aiAnswer) {
    return setError('You must answer the AI question before submitting');
  }

  try {
    const response = await fetch(`${API_BASE}/complaints`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaint_text: state.complaintText, ai_question: state.aiQuestion, ai_answer: aiAnswer }),
    });
    const payload = await response.json();
    if (!response.ok) {
      return setError(payload.error || 'Unable to save complaint');
    }

    state.aiQuestion = '';
    state.complaintText = '';
    state.complaintAnswer = '';
    setSuccess('Complaint submitted successfully.');
    window.location.hash = '#/my';
    await loadComplaints();
  } catch (error) {
    setError('Failed to submit complaint. Please try again.');
  }
};

async function loadComplaints() {
  try {
    const response = await fetch(`${API_BASE}/complaints/my`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return;
    }
    state.complaints = await response.json();
  } catch (error) {
    console.error(error);
  }
}

async function loadAdminComplaints() {
  try {
    const response = await fetch(`${API_BASE}/admin/complaints`, {
      credentials: 'include',
    });
    if (!response.ok) {
      state.adminComplaints = [];
      return;
    }
    state.adminComplaints = await response.json();
  } catch (error) {
    console.error(error);
    state.adminComplaints = [];
  }
}

async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error(error);
  }
  state.user = null;
  window.location.hash = '#/login';
  renderRoute();
}

window.addEventListener('hashchange', async () => {
  const route = window.location.hash.replace('#/', '');
  if (route === 'my') {
    await loadComplaints();
  }
  if (route === 'admin') {
    await loadAdminComplaints();
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  const route = window.location.hash.replace('#/', '');
  if (route === 'my') {
    await loadComplaints();
  }
  if (route === 'admin') {
    await loadAdminComplaints();
  }
});
