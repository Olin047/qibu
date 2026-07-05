const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

loadDotEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 5173);
const PUBLIC_DIR = path.join(__dirname, "public");
const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) {
        reject(new Error("请求内容太长"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function cleanTask(task) {
  return String(task || "").replace(/\s+/g, " ").trim().slice(0, 500);
}

function clampMinutes(value) {
  if (!Number.isFinite(Number(value))) return 25;
  return Math.min(90, Math.max(5, Math.round(Number(value))));
}

function fitStepMinutes(steps, targetMinutes) {
  const target = clampMinutes(targetMinutes);
  const maxSteps = Math.min(7, target);
  const cleanSteps = (Array.isArray(steps) && steps.length ? steps : [
    { text: "把任务写成一句看得见的结果", minutes: 2, cue: "只写完成后的样子，不评价自己" },
    { text: "准备开始需要的第一个材料或页面", minutes: 4, cue: "只打开，不要求马上做完" },
    { text: "完成最小的一步", minutes: 12, cue: "小到不会让大脑想逃跑" },
    { text: "停下来标记进度", minutes: 2, cue: "完成一格就能打卡续火花" }
  ]).slice(0, maxSteps);
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
    minutes: minutes[index],
    cue: String(step.cue || "只做这一小步").slice(0, 80)
  }));
}

function fallbackPlan(task, minutes) {
  const safeTask = cleanTask(task) || "完成今天最重要的一件小事";
  const target = clampMinutes(minutes);
  const steps = fitStepMinutes(
    [
      { text: "把任务写成一句看得见的结果", minutes: 2, cue: "只写完成后的样子，不评价自己" },
      { text: "准备开始需要的第一个材料或页面", minutes: 4, cue: "只打开，不要求马上做完" },
      { text: "完成最小的一步", minutes: 12, cue: "小到不会让大脑想逃跑" },
      { text: "停下来标记进度", minutes: 2, cue: "完成一格就能打卡续火花" }
    ],
    target
  );

  return {
    title: safeTask,
    starter: "先把任务缩小到一个能立刻开始的动作。",
    steps,
    reward: "完成任意一步后，给自己 3 分钟自由时间。",
    ifStuck: "如果卡住，把下一步改成“打开文件/站起来/写一个词”这种身体能直接执行的动作。"
  };
}

function extractJson(text) {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
  }
  return null;
}

function normalizePlan(plan, originalTask, minutes) {
  const fallback = fallbackPlan(originalTask, minutes);
  const steps = Array.isArray(plan && plan.steps) ? plan.steps : fallback.steps;

  return {
    title: String((plan && plan.title) || fallback.title).slice(0, 80),
    starter: String((plan && plan.starter) || fallback.starter).slice(0, 160),
    steps: fitStepMinutes(steps, minutes),
    reward: String((plan && plan.reward) || fallback.reward).slice(0, 120),
    ifStuck: String((plan && plan.ifStuck) || fallback.ifStuck).slice(0, 160)
  };
}

async function createDeepSeekPlan(payload) {
  const task = cleanTask(payload.task);
  const minutes = clampMinutes(payload.minutes);
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return {
      source: "demo",
      plan: normalizePlan(fallbackPlan(task, minutes), task, minutes),
      note: "未配置 DEEPSEEK_API_KEY，当前使用本地演示拆解。"
    };
  }

  const systemPrompt = [
    "你是一个面向 ADHD 启动困难用户的任务拆解助手。",
    "目标是降低启动阻力，不要说教，不要给过长计划。",
    "只返回严格 json，不要 Markdown。",
    "JSON 字段必须是 title, starter, steps, reward, ifStuck。",
    "steps 是 3 到 6 个对象，每个对象包含 text, minutes, cue。",
    "所有 steps.minutes 相加必须严格等于用户给的 availableMinutes。",
    "示例 json：{\"title\":\"整理书桌\",\"starter\":\"先清出一小块空间。\",\"steps\":[{\"text\":\"拿走桌上的杯子\",\"minutes\":2,\"cue\":\"只拿杯子\"}],\"reward\":\"休息三分钟。\",\"ifStuck\":\"只做第一步。\"}"
  ].join("\n");

  const userPrompt = JSON.stringify({
    task,
    availableMinutes: minutes,
    language: "简体中文"
  });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 650,
      stream: false
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek 请求失败：${response.status} ${text.slice(0, 180)}`);
  }

  const data = await response.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  const parsed = extractJson(content);

  if (!parsed) {
    return {
      source: "fallback",
      plan: normalizePlan(fallbackPlan(task, minutes), task, minutes),
      note: "AI 暂时没有返回稳定结构，已使用兜底拆解。"
    };
  }

  return {
    source: "deepseek",
    plan: normalizePlan(parsed, task, minutes),
    note: "已生成今日行动。"
  };
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS" && req.url === "/api/breakdown") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && req.url === "/api/breakdown") {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const task = cleanTask(payload.task);
      if (!task) {
        sendJson(res, 400, { error: "请先输入一个大任务。" });
        return;
      }
      try {
        const result = await createDeepSeekPlan(payload);
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 200, {
          source: "fallback",
          plan: normalizePlan(fallbackPlan(task, payload.minutes), task, payload.minutes),
          note: "AI 暂时不可用，已使用兜底拆解。"
        });
      }
    } catch (error) {
      sendJson(res, 500, {
        error: error.message || "任务拆解失败"
      });
    }
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`起步正在运行：http://localhost:${PORT}`);
});
