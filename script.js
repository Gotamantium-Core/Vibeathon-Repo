// script.js - Fixed & Improved

// ==================== UTILS ====================
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderColor = isError ? 'var(--accent)' : 'var(--green)';
  t.style.color = isError ? '#ff9a9a' : 'var(--green)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// FIX: was referencing 'toggleBtn' which doesn't exist. Now takes element IDs as params.
function togglePassword(inputId, iconId) {
  const pw = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!pw) return;
  if (pw.type === 'password') {
    pw.type = 'text';
    if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
  } else {
    pw.type = 'password';
    if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
  }
}

// ==================== AUTH ====================
function handleLogin(e) {
  e.preventDefault();
  clearError('loginError');

  const input = document.getElementById('loginInput').value.trim().toLowerCase();
  const password = document.getElementById('password').value;

  if (!input) return showError('loginError', 'Please enter your email or username.');
  if (!password) return showError('loginError', 'Please enter your password.');

  const users = JSON.parse(localStorage.getItem('users')) || [];
  const user = users.find(u =>
    u.email.toLowerCase() === input || u.username.toLowerCase() === input
  );

  if (!user) {
    return showError('loginError', 'Account not found. Please sign up first.');
  }

  if (user.password !== password) {
    return showError('loginError', 'Incorrect password. Please try again.');
  }

  localStorage.setItem('currentUser', user.username);
  window.location.href = 'index.html';
}

function handleSignup(e) {
  e.preventDefault();
  clearError('signupError');

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;

  if (!username) return showError('signupError', 'Username is required.');
  if (username.length < 3) return showError('signupError', 'Username must be at least 3 characters.');
  if (!email) return showError('signupError', 'Email is required.');
  if (!password || password.length < 6) return showError('signupError', 'Password must be at least 6 characters.');

  const users = JSON.parse(localStorage.getItem('users')) || [];

  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return showError('signupError', 'Username already taken. Try another.');
  }
  if (users.some(u => u.email === email)) {
    return showError('signupError', 'An account with this email already exists.');
  }

  users.push({ username, email, password });
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem('currentUser', username);
  window.location.href = 'index.html';
}

// ==================== DASHBOARD CORE ====================
let currentUser = null;
let dataKey = null;
let data = null;
let dailyGoals = { problems: 25, hours: 5 };

function initDashboard() {
  currentUser = localStorage.getItem('currentUser');
  if (!currentUser) return window.location.href = 'login.html';

  dataKey = `placementData_${currentUser}`;
  data = JSON.parse(localStorage.getItem(dataKey)) || {
    totalProblems: 0,
    totalHours: 0,
    streak: 0,
    lastDate: null,
    topics: {},
    history: [],
    dailyHistory: {}
  };

  // Also check for add-page redirect with init data needed
  if (!data.dailyHistory) data.dailyHistory = {};

  const savedGoals = localStorage.getItem(`goals_${currentUser}`);
  if (savedGoals) dailyGoals = JSON.parse(savedGoals);

  const el = document.getElementById('usernameDisplay');
  if (el) el.textContent = currentUser;

  updateUI();
  updateDailyGoals();
  loadRecentActivity();
  renderHeatmap();
  renderInsights();
}

// Also init add-page (needs currentUser for addProgress to work)
function initAddPage() {
  currentUser = localStorage.getItem('currentUser');
  if (!currentUser) return window.location.href = 'login.html';

  dataKey = `placementData_${currentUser}`;
  data = JSON.parse(localStorage.getItem(dataKey)) || {
    totalProblems: 0,
    totalHours: 0,
    streak: 0,
    lastDate: null,
    topics: {},
    history: [],
    dailyHistory: {}
  };
  if (!data.dailyHistory) data.dailyHistory = {};
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function saveData() {
  localStorage.setItem(dataKey, JSON.stringify(data));
}

// ==================== ADD PROGRESS ====================
function addProgress(problems = 0, hours = 0, topic = "General") {
  if (problems === 0 && hours === 0) {
    showToast("Please enter problems solved or hours studied!", true);
    return false;
  }

  const today = getToday();

  if (data.lastDate) {
    const diff = Math.floor((new Date(today) - new Date(data.lastDate)) / 86400000);
    if (diff === 1) data.streak++;
    else if (diff > 1) data.streak = 1;
    // diff === 0 means same day, no streak change
  } else {
    data.streak = 1;
  }

  data.lastDate = today;
  data.totalProblems += problems;
  data.totalHours += hours;

  if (topic && topic !== "") {
    data.topics[topic] = (data.topics[topic] || 0) + problems;
  }

  data.history.push({ date: today, problems, hours, topic: topic || "General" });

  if (!data.dailyHistory[today]) data.dailyHistory[today] = { problems: 0, hours: 0 };
  data.dailyHistory[today].problems += problems;
  data.dailyHistory[today].hours += hours;

  saveData();
  return true;
}

function addProgressFromAddPage() {
  if (!data) initAddPage();

  const problems = parseFloat(document.getElementById("problems").value) || 0;
  const hours = parseFloat(document.getElementById("hours").value) || 0;
  const topic = document.getElementById("topic").value || "General";

  if (addProgress(problems, hours, topic)) {
    showToast("Progress added! 🔥");
    setTimeout(() => window.location.href = 'index.html', 1200);
  }
}

// ==================== UI UPDATES ====================
function updateUI() {
  document.getElementById("totalProblems").textContent = data.totalProblems;
  document.getElementById("totalHours").textContent = data.totalHours.toFixed(1);
  document.getElementById("currentStreak").textContent = data.streak;

  const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
  const thisWeek = data.history
    .filter(h => new Date(h.date) >= oneWeekAgo)
    .reduce((sum, h) => sum + h.problems, 0);
  document.getElementById("thisWeek").textContent = thisWeek;

  // Topics
  const topicsList = document.getElementById("topicsList");
  topicsList.innerHTML = "";
  if (Object.keys(data.topics).length === 0) {
    topicsList.innerHTML = `<li><span class="empty-state">No topics yet. Start solving!</span></li>`;
  } else {
    Object.entries(data.topics)
      .sort((a, b) => b[1] - a[1])
      .forEach(([topic, count]) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${topic}</strong><span>${count} problems</span>`;
        topicsList.appendChild(li);
      });
  }

  drawWeeklyChart();
}

function updateDailyGoals() {
  const today = getToday();
  const todayData = data.dailyHistory[today] || { problems: 0, hours: 0 };

  document.getElementById("todayProblems").textContent = todayData.problems;
  document.getElementById("todayHours").textContent = todayData.hours.toFixed(1);
  document.getElementById("targetProblems").textContent = dailyGoals.problems;
  document.getElementById("targetHours").textContent = dailyGoals.hours;

  const probPercent = Math.min(100, Math.round((todayData.problems / dailyGoals.problems) * 100) || 0);
  const hourPercent = Math.min(100, Math.round((todayData.hours / dailyGoals.hours) * 100) || 0);

  document.getElementById("problemsProgress").style.width = probPercent + "%";
  document.getElementById("hoursProgress").style.width = hourPercent + "%";

  let msg = "Consistency is the key to cracking placements 🔥";
  if (data.streak >= 14) msg = "Two weeks straight! You're a machine 🤖";
  else if (data.streak >= 7) msg = "Legendary streak! You're unstoppable! 💪";
  else if (data.streak >= 3) msg = "Great momentum! Keep pushing! 🚀";
  document.getElementById("motivationText").textContent = msg;
}

function setDailyGoals() {
  const prob = prompt("Daily problems goal:", dailyGoals.problems);
  const hrs = prompt("Daily hours goal:", dailyGoals.hours);

  if (prob !== null && hrs !== null) {
    const newProb = parseInt(prob);
    const newHrs = parseFloat(hrs);
    if (isNaN(newProb) || isNaN(newHrs) || newProb <= 0 || newHrs <= 0) {
      return showToast("Invalid goal values.", true);
    }
    dailyGoals.problems = newProb;
    dailyGoals.hours = newHrs;
    localStorage.setItem(`goals_${currentUser}`, JSON.stringify(dailyGoals));
    updateDailyGoals();
    showToast("Goals updated!");
  }
}

function loadRecentActivity() {
  const container = document.getElementById("activityList");
  container.innerHTML = "";

  const recent = [...data.history].reverse().slice(0, 8);

  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state">No activity yet. Start tracking today!</div>`;
    return;
  }

  recent.forEach(entry => {
    const div = document.createElement("div");
    div.className = "activity-item";
    div.innerHTML = `
      <span class="act-left"><strong>${entry.date}</strong> · ${entry.topic}</span>
      <span class="act-right">${entry.problems} probs · ${entry.hours}h</span>
    `;
    container.appendChild(div);
  });
}

function drawWeeklyChart() {
  const ctx = document.getElementById("weeklyChart");
  if (!ctx) return;
  if (window.myChart) window.myChart.destroy();

  const labels = [];
  const problemsData = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    const dayData = data.history.filter(h => h.date === dateStr);
    problemsData.push(dayData.reduce((sum, h) => sum + h.problems, 0));
  }

  window.myChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Problems Solved',
        data: problemsData,
        backgroundColor: 'rgba(0,229,255,0.2)',
        borderColor: '#00e5ff',
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#5a7a9a', font: { family: 'Space Mono' } }
        },
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#5a7a9a', font: { family: 'Space Mono' } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderHeatmap() {
  const grid = document.getElementById("heatmapGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const today = new Date();
  const start = new Date(today);
  start.setMonth(today.getMonth() - 5);
  start.setDate(1);

  let current = new Date(start);
  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0];
    const dayData = data.history.filter(h => h.date === dateStr);
    const count = dayData.reduce((sum, h) => sum + h.problems, 0);

    const dayDiv = document.createElement("div");
    dayDiv.className = `heatmap-day level-${Math.min(4, Math.floor(count / 6))}`;
    dayDiv.title = `${dateStr}: ${count} problems`;
    grid.appendChild(dayDiv);

    current.setDate(current.getDate() + 1);
  }
}

function renderInsights() {
  const container = document.getElementById("insightsGrid");
  if (!container) return;

  if (Object.keys(data.topics).length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Start solving to see insights</div>`;
    return;
  }

  const sorted = Object.entries(data.topics).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0] ? `${sorted[0][0]} (${sorted[0][1]})` : "—";
  const weakest = sorted[sorted.length - 1] ? `${sorted[sorted.length - 1][0]} (${sorted[sorted.length - 1][1]})` : "—";

  const activeDays = [...new Set(data.history.map(h => h.date))].length || 1;
  const avg = (data.totalProblems / activeDays).toFixed(1);

  container.innerHTML = `
    <div class="insight-box">
      <div class="label">Strongest Topic</div>
      <div class="value strong">${strongest}</div>
    </div>
    <div class="insight-box">
      <div class="label">Weakest Topic</div>
      <div class="value weak">${weakest}</div>
    </div>
    <div class="insight-box">
      <div class="label">Avg Problems/Day</div>
      <div class="value">${avg}</div>
    </div>
    <div class="insight-box">
      <div class="label">Active Days</div>
      <div class="value">${activeDays}</div>
    </div>
  `;
}

function logout() {
  if (confirm("Logout from your account?")) {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  }
}