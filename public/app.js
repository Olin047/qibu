const STORAGE_KEY = "qibu-state-v2";
const LEGACY_STORAGE_KEY = "qibu-state-v1";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const configuredApiBase = (window.QIBU_API_BASE || "").replace(/\/$/, "");
const isLocalHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const isGithubPages = location.hostname.endsWith("github.io");
const API_BASE = configuredApiBase || (isLocalHost || !isGithubPages ? "" : null);

const $ = (selector) => document.querySelector(selector);

const els = {
  loginView: $("#loginView"),
  loginForm: $("#loginForm"),
  nameInput: $("#nameInput"),
  minutesInput: $("#minutesInput"),
  dashboard: $("#dashboard"),
  todayLabel: $("#todayLabel"),
  personalGreeting: $("#personalGreeting"),
  personalHint: $("#personalHint"),
  logoutButton: $("#logoutButton"),
  streakCount: $("#streakCount"),
  streakBig: $("#streakBig"),
  weekDone: $("#weekDone"),
  weekStrip: $("#weekStrip"),
  taskInput: $("#taskInput"),
  planMinutes: $("#planMinutes"),
  voiceButton: $("#voiceButton"),
  breakdownButton: $("#breakdownButton"),
  statusLine: $("#statusLine"),
  emptyPlan: $("#emptyPlan"),
  planContent: $("#planContent"),
  planTitle: $("#planTitle"),
  planMeta: $("#planMeta"),
  starterText: $("#starterText"),
  stepList: $("#stepList"),
  stuckText: $("#stuckText"),
  rewardText: $("#rewardText"),
  checkinButton: $("#checkinButton"),
  checkinState: $("#checkinState"),
  resetPlanButton: $("#resetPlanButton"),
  historyList: $("#historyList"),
  celebrationLayer: $("#celebrationLayer")
};

const defaultState = {
  user: null,
  streak: 0,
  checkins: [],
  lastCheckin: null,
  currentPlan: null,
  completedSteps: [],
  history: [],
  celebratedPlanId: null
};

let state = loadState();
let recognition = null;
let isRecording = false;
let loadingTimer = null;

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  try {
    return normalizeState({ ...defaultState, ...JSON.parse(raw || "{}") });
  } catch {
    return { ...defaultState };
  }
}

function normalizeState(nextState) {
  return {
    ...defaultState,
    ...nextState,
    checkins: Array.isArray(nextState.checkins) ? nextState.checkins : [],
    completedSteps: Array.isArray(nextState.completedSteps) ? nextState.completedSteps : [],
    history: Array.isArray(nextState.history) ? nextState.history : []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function friendlyDate(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(date);
}

function friendlyTime(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了，轻一点开始";
  if (hour < 12) return "早上好，先动一小步";
  if (hour < 18) return "下午好，重启一下节奏";
  return "晚上好，做一个收尾动作";
}

function dayDiff(a, b) {
  const start = new Date(`${a}T00:00:00`);
  const end = new Date(`${b}T00:00:00`);
  return Math.round((end - start) / 86_400_000);
}

function sumMinutes(steps = []) {
  return steps.reduce((total, step) => total + (Number(step.minutes) || 0), 0);
}

function recomputeStreak() {
  const today = dateKey();
  const unique = [...new Set(state.checkins || [])].sort();
  if (!unique.length) {
    state.streak = 0;
    state.lastCheckin = null;
    return;
  }

  let cursor = unique.includes(today) ? today : dateKey(new Date(Date.now() - 86_400_000));
  let streak = 0;
  while (unique.includes(cursor)) {
    streak += 1;
    cursor = dateKey(new Date(new Date(`${cursor}T00:00:00`).getTime() - 86_400_000));
  }

  state.streak = streak;
  state.lastCheckin = unique[unique.length - 1];
}

function syncLoginView() {
  const hasUser = Boolean(state.user && state.user.name);
  els.loginView.classList.toggle("is-hidden", hasUser);
  els.dashboard.classList.toggle("is-hidden", !hasUser);

  if (hasUser) {
    els.planMinutes.value = state.user.minutes || 25;
  }
}

function renderPersonal() {
  if (!state.user) return;
  els.todayLabel.textContent = friendlyDate();
  els.personalGreeting.textContent = `${greeting()}，${state.user.name}`;
  els.personalHint.textContent = "这是你的本机档案；别人打开网站会看到自己的记录，不会共享你的火花。";
}

function renderStreak() {
  recomputeStreak();
  const checkedToday = state.checkins.includes(dateKey());
  els.streakCount.textContent = state.streak;
  els.streakBig.textContent = state.streak;
  els.checkinState.textContent = checkedToday ? "今日已点亮" : "还未打卡";

  const doneCount = weekDates().filter((day) => state.checkins.includes(day.key)).length;
  els.weekDone.textContent = `${doneCount}/7`;
  els.weekStrip.innerHTML = "";
  weekDates().forEach((day) => {
    const div = document.createElement("div");
    div.className = `day-pill${state.checkins.includes(day.key) ? " is-done" : ""}`;
    div.innerHTML = `<span>${day.weekday}</span><b>${day.day}</b>`;
    els.weekStrip.appendChild(div);
  });
}

function weekDates() {
  const now = new Date();
  const current = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - current + 1);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return {
      key: dateKey(day),
      day: String(day.getDate()),
      weekday: ["一", "二", "三", "四", "五", "六", "日"][index]
    };
  });
}

function renderPlan() {
  const plan = state.currentPlan;
  const hasPlan = Boolean(plan);
  els.emptyPlan.classList.toggle("is-hidden", hasPlan);
  els.planContent.classList.toggle("is-hidden", !hasPlan);

  if (!plan) {
    els.planTitle.textContent = "你的第一步会出现在这里";
    els.checkinButton.disabled = true;
    return;
  }

  const doneCount = state.completedSteps.length;
  const totalSteps = plan.steps.length;
  els.planTitle.textContent = plan.title;
  els.planMeta.textContent = `${totalSteps} 步 · ${sumMinutes(plan.steps)} 分钟 · 已完成 ${doneCount}/${totalSteps}`;
  els.starterText.textContent = plan.starter;
  els.stuckText.textContent = plan.ifStuck;
  els.rewardText.textContent = plan.reward;
  els.stepList.innerHTML = "";

  plan.steps.forEach((step, index) => {
    const isDone = state.completedSteps.includes(index);
    const item = document.createElement("li");
    item.className = `step-item${isDone ? " is-done" : ""}`;
    item.style.setProperty("--step-index", index);
    item.innerHTML = `
      <button class="step-check" type="button" aria-label="完成小任务 ${index + 1}">✓</button>
      <div class="step-copy">
        <strong>${escapeHtml(step.text)}</strong>
        <span>${escapeHtml(step.cue)}</span>
      </div>
      <span class="step-time">${Number(step.minutes) || 1} 分钟</span>
    `;
    item.querySelector("button").addEventListener("click", () => toggleStep(index));
    els.stepList.appendChild(item);
  });

  updateCheckinButton();
}

function updateCheckinButton() {
  const completedAny = state.completedSteps.length > 0;
  const checkedToday = state.checkins.includes(dateKey());
  els.checkinButton.disabled = !completedAny || checkedToday;
  els.checkinButton.textContent = checkedToday ? "今日火花已续上" : completedAny ? "点亮今日火花" : "完成一步后打卡";
}

function toggleStep(index) {
  const wasDone = state.completedSteps.includes(index);
  if (wasDone) {
    state.completedSteps = state.completedSteps.filter((item) => item !== index);
  } else {
    state.completedSteps = [...state.completedSteps, index].sort((a, b) => a - b);
  }

  const isAllDone = state.currentPlan && state.completedSteps.length === state.currentPlan.steps.length;
  if (!wasDone && isAllDone) {
    addTodayCheckin();
    saveHistoryForPlan("complete");
    state.celebratedPlanId = state.currentPlan.id;
  }

  saveState();
  renderAll();

  if (!wasDone && isAllDone) {
    triggerCelebration();
    setStatus("全部完成了，火花已点亮。");
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function requestBreakdown() {
  const task = els.taskInput.value.trim();
  if (!task) {
    setStatus("先写下一个任务，哪怕很乱也可以。");
    els.taskInput.focus();
    return;
  }

  const minutes = clampMinutes(Number(els.planMinutes.value));
  els.planMinutes.value = minutes;
  els.breakdownButton.disabled = true;
  els.breakdownButton.textContent = "拆解中...";
  startLoadingStatus();

  try {
    if (API_BASE === null) {
      throw new Error("GitHub Pages 没有后端接口");
    }

    const response = await fetch(`${API_BASE}/api/breakdown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, minutes })
    });
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || "拆解失败");
    }

    applyPlan(data.plan, minutes);
    setStatus("已生成今日行动。");
  } catch (error) {
    applyPlan(createLocalPlan(task, minutes), minutes);
    setStatus("当前 AI 后端暂时没连上，已先用本地拆解。");
  } finally {
    stopLoadingStatus();
    els.breakdownButton.disabled = false;
    els.breakdownButton.textContent = "拆成小任务";
  }
}

function startLoadingStatus() {
  const messages = ["正在拆成更小的动作...", "正在校准总时间...", "快好了，马上给你第一步..."];
  let index = 0;
  setStatus(messages[index]);
  clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    index = (index + 1) % messages.length;
    setStatus(messages[index]);
  }, 1300);
}

function stopLoadingStatus() {
  clearInterval(loadingTimer);
  loadingTimer = null;
}

function applyPlan(plan, minutes) {
  state.currentPlan = {
    ...plan,
    id: plan.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    steps: fitStepMinutes(plan.steps || [], minutes)
  };
  state.completedSteps = [];
  state.celebratedPlanId = null;
  state.user = {
    ...state.user,
    minutes
  };
  saveState();
  renderAll();
}

function createLocalPlan(task, minutes) {
  const safeTask = task || "完成今天最重要的一件小事";
  const steps = fitStepMinutes(
    [
      { text: "写下完成后能看到的结果", minutes: 2, cue: "只描述结果，不要求完整" },
      { text: "打开或拿出开始需要的第一个东西", minutes: 4, cue: "打开就算启动，不需要马上做完" },
      { text: "完成最小的一格", minutes: 12, cue: "小到不会让自己想逃开" },
      { text: "给刚才的进度打一个标记", minutes: 2, cue: "完成任意一步就能续上火花" }
    ],
    minutes
  );

  return {
    title: safeTask.slice(0, 80),
    starter: "先把它缩小成一个能立刻开始的动作。",
    steps,
    reward: "完成一格后，给自己 3 分钟自由时间。",
    ifStuck: "如果卡住，把下一步改成“打开页面”“写一个词”“站起来拿材料”这种身体能立刻执行的动作。"
  };
}

function clampMinutes(value) {
  if (!Number.isFinite(value)) return 25;
  return Math.min(90, Math.max(5, Math.round(value)));
}

function fitStepMinutes(steps, targetMinutes) {
  const target = clampMinutes(targetMinutes);
  const maxSteps = Math.min(7, target);
  const fallbackSteps = [
    { text: "写下完成后能看到的结果", minutes: 2, cue: "只描述结果，不要求完整" },
    { text: "打开或拿出开始需要的第一个东西", minutes: 4, cue: "打开就算启动，不需要马上做完" },
    { text: "完成最小的一格", minutes: 12, cue: "小到不会让自己想逃开" },
    { text: "给刚才的进度打一个标记", minutes: 2, cue: "完成任意一步就能续上火花" }
  ];
  const cleanSteps = (steps.length ? steps : fallbackSteps).slice(0, maxSteps);
  const base = cleanSteps.map((step) => Math.max(1, Math.round(Number(step.minutes) || 1)));
  const current = base.reduce((total, item) => total + item, 0);
  const scale = target / Math.max(current, 1);
  let minutes = base.map((item) => Math.max(1, Math.round(item * scale)));
  let diff = target - minutes.reduce((total, item) => total + item, 0);

  while (diff !== 0) {
    for (let index = minutes.length - 1; index >= 0 && diff !== 0; index -= 1) {
      if (diff > 0) {
        minutes[index] += 1;
        diff -= 1;
      } else if (minutes[index] > 1) {
        minutes[index] -= 1;
        diff += 1;
      }
    }
  }

  return cleanSteps.map((step, index) => ({
    text: String(step.text || `完成第 ${index + 1} 个小动作`).slice(0, 90),
    cue: String(step.cue || "只做这一小步").slice(0, 80),
    minutes: minutes[index]
  }));
}

function setStatus(message) {
  els.statusLine.textContent = message;
}

function checkIn() {
  const didCheckIn = addTodayCheckin();
  if (didCheckIn) {
    saveHistoryForPlan("checkin");
    saveState();
    triggerCelebration();
  }
  renderAll();
}

function addTodayCheckin() {
  const today = dateKey();
  if (!state.checkins.includes(today)) {
    const yesterday = dateKey(new Date(Date.now() - 86_400_000));
    const shouldReset = state.lastCheckin && dayDiff(state.lastCheckin, today) > 1 && state.lastCheckin !== yesterday;
    if (shouldReset) {
      state.streak = 0;
    }
    state.checkins = [...state.checkins, today];
    recomputeStreak();
    return true;
  }
  return false;
}

function saveHistoryForPlan(reason) {
  if (!state.currentPlan) return;
  const planId = state.currentPlan.id;
  if (state.history.some((item) => item.planId === planId)) return;

  const now = new Date();
  state.history = [
    {
      planId,
      title: state.currentPlan.title,
      date: now.toISOString(),
      dateKey: dateKey(now),
      time: friendlyTime(now),
      minutes: sumMinutes(state.currentPlan.steps),
      completedCount: state.completedSteps.length,
      totalSteps: state.currentPlan.steps.length,
      reason,
      steps: state.currentPlan.steps.map((step) => step.text)
    },
    ...state.history
  ].slice(0, 30);
}

function renderHistory() {
  if (!els.historyList) return;
  if (!state.history.length) {
    els.historyList.innerHTML = `<p class="empty-history">完成一次任务后，这里会留下记录。</p>`;
    return;
  }

  els.historyList.innerHTML = state.history
    .slice(0, 8)
    .map((item) => {
      const date = new Date(item.date);
      return `
        <article class="history-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${friendlyDate(date)} · ${item.time || friendlyTime(date)}</span>
          </div>
          <span class="history-time">${item.completedCount}/${item.totalSteps} · ${item.minutes} 分钟</span>
        </article>
      `;
    })
    .join("");
}

function resetPlan() {
  state.currentPlan = null;
  state.completedSteps = [];
  state.celebratedPlanId = null;
  saveState();
  renderPlan();
  setStatus("已清空。可以重新输入一个更想开始的任务。");
}

function triggerCelebration() {
  els.celebrationLayer.classList.remove("is-active");
  window.requestAnimationFrame(() => {
    els.celebrationLayer.classList.add("is-active");
  });
  window.setTimeout(() => {
    els.celebrationLayer.classList.remove("is-active");
  }, 1500);
}

function setupVoice() {
  if (!SpeechRecognition) {
    els.voiceButton.disabled = true;
    els.voiceButton.title = "当前浏览器不支持语音输入";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    isRecording = true;
    els.voiceButton.classList.add("is-recording");
    setStatus("正在听你说任务...");
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join("");
    els.taskInput.value = transcript;
  };

  recognition.onerror = () => {
    setStatus("语音没有识别成功，可以直接输入文字。");
  };

  recognition.onend = () => {
    isRecording = false;
    els.voiceButton.classList.remove("is-recording");
    if (els.taskInput.value.trim()) {
      setStatus("听到了。确认一下文字，再点拆成小任务。");
    }
  };
}

function toggleVoice() {
  if (!recognition) return;
  if (isRecording) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

function renderAll() {
  syncLoginView();
  renderPersonal();
  renderStreak();
  renderPlan();
  renderHistory();
}

els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.user = {
    name: els.nameInput.value.trim(),
    minutes: Number(els.minutesInput.value)
  };
  saveState();
  renderAll();
});

els.logoutButton.addEventListener("click", () => {
  state.user = null;
  saveState();
  renderAll();
});

els.breakdownButton.addEventListener("click", requestBreakdown);
els.voiceButton.addEventListener("click", toggleVoice);
els.checkinButton.addEventListener("click", checkIn);
els.resetPlanButton.addEventListener("click", resetPlan);

setupVoice();
renderAll();
