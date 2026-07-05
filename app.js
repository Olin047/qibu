const STORAGE_KEY = "qibu-state-v1";
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
  energyInput: $("#energyInput"),
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
  moodSelect: $("#moodSelect"),
  energySelect: $("#energySelect"),
  planMinutes: $("#planMinutes"),
  voiceButton: $("#voiceButton"),
  breakdownButton: $("#breakdownButton"),
  statusLine: $("#statusLine"),
  emptyPlan: $("#emptyPlan"),
  planContent: $("#planContent"),
  planTitle: $("#planTitle"),
  starterText: $("#starterText"),
  stepList: $("#stepList"),
  stuckText: $("#stuckText"),
  rewardText: $("#rewardText"),
  checkinButton: $("#checkinButton"),
  checkinState: $("#checkinState"),
  resetPlanButton: $("#resetPlanButton")
};

const defaultState = {
  user: null,
  streak: 0,
  checkins: [],
  lastCheckin: null,
  currentPlan: null,
  completedSteps: []
};

let state = loadState();
let recognition = null;
let isRecording = false;

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...defaultState };
  }
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

function friendlyDate() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());
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
    els.energySelect.value = state.user.energy || "中";
    els.planMinutes.value = state.user.minutes || 25;
  }
}

function renderPersonal() {
  if (!state.user) return;
  els.todayLabel.textContent = friendlyDate();
  els.personalGreeting.textContent = `${greeting()}，${state.user.name}`;
  els.personalHint.textContent =
    state.user.energy === "低"
      ? "今天按低能量模式来：只找一个能在两分钟内开始的动作。"
      : "先不用管整座山，起步只负责找到第一块石头。";
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

  els.planTitle.textContent = plan.title;
  els.starterText.textContent = plan.starter;
  els.stuckText.textContent = plan.ifStuck;
  els.rewardText.textContent = plan.reward;
  els.stepList.innerHTML = "";

  plan.steps.forEach((step, index) => {
    const isDone = state.completedSteps.includes(index);
    const item = document.createElement("li");
    item.className = `step-item${isDone ? " is-done" : ""}`;
    item.innerHTML = `
      <button class="step-check" type="button" aria-label="完成小任务 ${index + 1}">✓</button>
      <div class="step-copy">
        <strong>${escapeHtml(step.text)}</strong>
        <span>${escapeHtml(step.cue)}</span>
      </div>
      <span class="step-time">${Number(step.minutes) || 5} 分钟</span>
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
  if (state.completedSteps.includes(index)) {
    state.completedSteps = state.completedSteps.filter((item) => item !== index);
  } else {
    state.completedSteps = [...state.completedSteps, index];
  }
  saveState();
  renderPlan();
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

  els.breakdownButton.disabled = true;
  setStatus("正在拆解成更容易开始的小任务...");

  try {
    if (API_BASE === null) {
      throw new Error("GitHub Pages 没有后端接口");
    }

    const response = await fetch(`${API_BASE}/api/breakdown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task,
        mood: els.moodSelect.value,
        energy: els.energySelect.value,
        minutes: Number(els.planMinutes.value)
      })
    });
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || "拆解失败");
    }

    applyPlan(data.plan);
    setStatus(data.note || "已生成今日行动。");
  } catch (error) {
    applyPlan(createLocalPlan(task, els.energySelect.value, Number(els.planMinutes.value)));
    setStatus("当前没有连接 AI 后端，已使用演示拆解。上线完整 AI 版需要再接一个后端服务。");
  } finally {
    els.breakdownButton.disabled = false;
  }
}

function applyPlan(plan) {
  state.currentPlan = plan;
  state.completedSteps = [];
  state.user = {
    ...state.user,
    energy: els.energySelect.value,
    minutes: Number(els.planMinutes.value)
  };
  saveState();
  renderAll();
}

function createLocalPlan(task, energy, minutes) {
  const safeTask = task || "完成今天最重要的一件小事";
  const time = Number(minutes) || 25;
  const lowEnergy = energy === "低";
  const firstSlice = lowEnergy ? 2 : 5;

  return {
    title: safeTask.slice(0, 80),
    starter: `先把它缩小成一个 ${lowEnergy ? "2 分钟" : "5 分钟"} 内能开始的动作。`,
    steps: [
      {
        text: "写下完成后能看到的结果",
        minutes: 2,
        cue: "只描述结果，不要求完整"
      },
      {
        text: "打开或拿出开始需要的第一个东西",
        minutes: firstSlice,
        cue: "打开就算启动，不需要马上做完"
      },
      {
        text: "完成最小的一格",
        minutes: Math.min(10, Math.max(5, Math.round(time / 3))),
        cue: "小到不会让自己想逃开"
      },
      {
        text: "给刚才的进度打一个标记",
        minutes: 2,
        cue: "完成任意一步就能续上火花"
      }
    ],
    reward: "完成一格后，给自己 3 分钟自由时间。",
    ifStuck: "如果卡住，把下一步改成“打开页面”“写一个词”“站起来拿材料”这种身体能立刻执行的动作。"
  };
}

function setStatus(message) {
  els.statusLine.textContent = message;
}

function checkIn() {
  const today = dateKey();
  if (!state.checkins.includes(today)) {
    const yesterday = dateKey(new Date(Date.now() - 86_400_000));
    const shouldReset = state.lastCheckin && dayDiff(state.lastCheckin, today) > 1 && state.lastCheckin !== yesterday;
    if (shouldReset) {
      state.streak = 0;
    }
    state.checkins = [...state.checkins, today];
    recomputeStreak();
    saveState();
  }
  renderAll();
}

function resetPlan() {
  state.currentPlan = null;
  state.completedSteps = [];
  saveState();
  renderPlan();
  setStatus("已清空。可以重新输入一个更想开始的任务。");
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
}

els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.user = {
    name: els.nameInput.value.trim(),
    energy: els.energyInput.value,
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
