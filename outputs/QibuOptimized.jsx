import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  SkipForward,
  Sparkles,
  Sprout,
  Square,
  Target,
  Timer,
  Wand2,
  Zap,
} from 'lucide-react';

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

:root{
  --base:#F3F0E7; --surface:#FFFDF8; --surface-2:#F7F4EA; --ink:#24302F; --muted:#6C7876; --line:#E2DDD0;
  --accent:#0D7D6C; --accent-ink:#075A4F; --accent-soft:#DDEEE9; --accent-softer:#EEF7F4;
  --reward:#C9891E; --reward-soft:#F5E8C9; --danger:#A94932; --danger-soft:#FBE8E3;
  --shadow:0 24px 64px -34px rgba(83, 70, 42, .48);
  --font-d:'Bricolage Grotesque',system-ui,sans-serif; --font-b:'Plus Jakarta Sans',system-ui,sans-serif;
}
*{box-sizing:border-box}
button,textarea{font:inherit}
.qb-app{min-height:100vh;width:100%;display:flex;justify-content:center;padding:20px 14px 42px;color:var(--ink);font-family:var(--font-b);
  background:linear-gradient(180deg,#FAF7EF 0%,var(--base) 58%,#EEE9DC 100%);-webkit-font-smoothing:antialiased}
.qb-wrap{width:100%;max-width:480px;display:flex;flex-direction:column;gap:18px}
.qb-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.qb-brand{display:flex;align-items:center;gap:10px}
.qb-mark{width:32px;height:32px;border-radius:10px;background:var(--accent);display:grid;place-items:center;color:#fff;box-shadow:0 8px 18px -9px rgba(13,125,108,.75)}
.qb-name{font-family:var(--font-d);font-weight:800;font-size:20px;letter-spacing:0}
.qb-name span{color:var(--accent)}
.qb-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:rgba(255,253,248,.72);border-radius:999px;padding:7px 10px;color:var(--muted);font-size:12px;font-weight:700}
.qb-panel{background:rgba(255,253,248,.8);border:1.5px solid var(--line);border-radius:20px;padding:22px 18px;box-shadow:var(--shadow)}
.qb-h1{font-family:var(--font-d);font-size:29px;line-height:1.12;letter-spacing:0;margin:0}
.qb-sub{margin:10px 0 0;color:var(--muted);font-size:15px;line-height:1.55}
.qb-ta{width:100%;min-height:108px;margin-top:18px;padding:15px 16px;border:1.5px solid var(--line);border-radius:16px;background:var(--surface);color:var(--ink);font-size:16px;line-height:1.5;resize:vertical}
.qb-ta::placeholder{color:#A5AEAB}
.qb-ta:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}
.qb-examples{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.qb-example{border:1px solid var(--line);background:var(--surface-2);border-radius:999px;padding:8px 10px;color:#53615F;font-size:13px;font-weight:600;cursor:pointer}
.qb-example:hover{border-color:var(--accent);color:var(--accent-ink);background:var(--accent-softer)}
.qb-label{margin:20px 2px 10px;color:var(--muted);font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.qb-coaches,.qb-options{display:grid;gap:9px}
.qb-coach{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:13px;border:1.5px solid var(--line);border-radius:14px;background:var(--surface);cursor:pointer;color:var(--ink)}
.qb-coach.on{border-color:var(--accent);background:var(--accent-soft)}
.qb-cico{width:38px;height:38px;display:grid;place-items:center;border-radius:11px;background:var(--surface-2);color:var(--accent);flex:0 0 auto}
.qb-coach.on .qb-cico{background:#fff;color:var(--accent-ink)}
.qb-cname,.qb-cdesc{display:block}.qb-cname{font-weight:800;font-size:15px}.qb-cdesc{margin-top:2px;color:var(--muted);font-size:13px;line-height:1.35}
.qb-options{grid-template-columns:1fr 1fr;margin-top:14px}
.qb-seg{display:flex;align-items:center;justify-content:center;gap:7px;min-height:42px;border:1.5px solid var(--line);border-radius:13px;background:var(--surface);color:#53615F;font-weight:800;font-size:13px;cursor:pointer}
.qb-seg.on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-ink)}
.qb-btn{width:100%;min-height:52px;margin-top:20px;border:0;border-radius:15px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;gap:9px;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 12px 24px -12px rgba(13,125,108,.75)}
.qb-btn:hover{transform:translateY(-1px)}.qb-btn:disabled{opacity:.55;cursor:default;transform:none}
.qb-note{margin-top:12px;color:var(--muted);font-size:12.5px;line-height:1.45}
.qb-err{margin-top:12px;border:1px solid #EDC4BB;background:var(--danger-soft);color:var(--danger);border-radius:13px;padding:12px 13px;font-size:13.5px;line-height:1.45}
.qb-load{display:grid;justify-items:center;gap:14px;text-align:center;padding:68px 24px}.qb-spin{animation:qbspin 1s linear infinite;color:var(--accent)}
.qb-load p{font-family:var(--font-d);font-weight:800;font-size:20px;margin:0}.qb-load small{max-width:280px;color:var(--muted);line-height:1.5}
.qb-top{display:flex;align-items:center;gap:12px}.qb-back,.qb-iconbtn{width:40px;height:40px;display:grid;place-items:center;border:1.5px solid var(--line);border-radius:12px;background:var(--surface);color:var(--muted);cursor:pointer}
.qb-back:hover,.qb-iconbtn:hover{border-color:var(--accent);color:var(--accent-ink)}
.qb-prog{flex:1}.qb-prog-t{display:flex;justify-content:space-between;margin-bottom:7px;color:var(--muted);font-size:12.5px;font-weight:800}.qb-prog-t b{color:var(--accent-ink)}
.qb-bar{height:8px;border:1px solid var(--line);background:var(--surface-2);border-radius:999px;overflow:hidden}.qb-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent),#18A891);transition:width .35s ease}
.qb-card{margin-top:16px;background:var(--surface);border:1.5px solid var(--line);border-radius:22px;padding:22px 18px;box-shadow:var(--shadow)}
.qb-now{display:inline-flex;align-items:center;gap:7px;border-radius:999px;background:var(--reward-soft);color:#9A6916;padding:6px 11px;font-size:11.5px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
.qb-step{margin-top:16px;font-family:var(--font-d);font-size:26px;line-height:1.18;letter-spacing:0;font-weight:800}
.qb-how{margin:10px 0 0;color:#4F5D5A;font-size:15.5px;line-height:1.58}
.qb-cheer{display:flex;gap:9px;align-items:flex-start;margin-top:16px;padding:12px 13px;border-radius:14px;background:var(--accent-soft);color:var(--accent-ink)}
.qb-cheer p{margin:0;font-size:14.5px;font-weight:700;line-height:1.45}.qb-cheer svg{flex:0 0 auto;margin-top:2px}
.qb-timer{margin-top:17px;padding-top:17px;border-top:1px solid var(--line)}
.qb-tstart{width:100%;min-height:46px;border:1.5px solid var(--line);border-radius:14px;background:var(--surface-2);color:var(--ink);font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
.qb-tstart:hover{border-color:var(--accent);color:var(--accent-ink)}
.qb-trun{display:flex;align-items:center;gap:10px}.qb-tnum{flex:1;font-family:var(--font-d);font-size:31px;font-weight:800;font-variant-numeric:tabular-nums}.qb-tnum.done{color:var(--reward)}
.qb-actions{display:grid;gap:9px;margin-top:18px}.qb-done{min-height:50px;border:0;border-radius:14px;background:var(--accent);color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
.qb-row{display:grid;grid-template-columns:1fr 106px;gap:9px}.qb-ghost{min-height:43px;border:1.5px solid var(--line);border-radius:14px;background:var(--surface);color:#62706D;font-weight:800;font-size:13.5px;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}
.qb-ghost:hover{border-color:var(--reward);background:var(--reward-soft);color:#946414}.qb-ghost:disabled{opacity:.55;cursor:default}
.qb-finish{text-align:center}.qb-pop{width:62px;height:62px;display:grid;place-items:center;margin:0 auto 16px;border-radius:18px;background:var(--reward-soft);color:#9A6916}
.qb-finish h2{margin:0;font-family:var(--font-d);font-size:28px}.qb-stat{margin:10px 0 0;color:var(--muted);line-height:1.55}.qb-stat b{color:var(--accent-ink)}
.qb-recap{display:grid;gap:7px;margin-top:20px;text-align:left}.qb-it{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--surface-2);color:#4F5D5A;font-size:14px}.qb-it.sk{color:#939D9B}
.qb-ic{width:21px;height:21px;display:grid;place-items:center;border-radius:7px;background:var(--accent-soft);color:var(--accent-ink);flex:0 0 auto}.qb-it.sk .qb-ic{background:#ECE8DD;color:#A0A6A4}
.qb-fade{animation:qbfade .28s ease both}@keyframes qbfade{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}@keyframes qbspin{to{transform:rotate(360deg)}}
*:focus-visible{outline:2.5px solid var(--accent);outline-offset:3px}
@media (max-width:380px){.qb-options,.qb-row{grid-template-columns:1fr}.qb-h1{font-size:26px}.qb-step{font-size:24px}.qb-panel,.qb-card{padding:20px 15px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;

const COACHES = [
  { id: 'gentle', name: '温柔陪伴', icon: Sprout, desc: '慢一点也可以，不催你', persona: '温柔、有耐心、像一个会陪你慢慢来的朋友，从不催促也从不评判' },
  { id: 'direct', name: '干脆教练', icon: Target, desc: '减少纠结，直接行动', persona: '干脆、清晰、像一个靠谱的教练，帮你停止纠结、直接行动' },
  { id: 'hype', name: '元气助威', icon: Zap, desc: '给你一点启动能量', persona: '充满元气、热情，像一个为你加油的啦啦队，让你觉得我做得到' },
];

const EXAMPLES = ['写论文开头', '整理书桌', '洗澡', '回复拖了很久的消息'];

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function safeMinutes(value, fallback = 5) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(25, Math.max(1, n)) : fallback;
}

function extractJson(text) {
  const cleaned = String(text || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('No JSON found');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function detectTaskType(task) {
  const text = task.toLowerCase();
  if (hasAny(text, ['论文', '文章', '报告', '写作', '作文', '文档', 'ppt', '幻灯片'])) return 'writing';
  if (hasAny(text, ['回消息', '回复', '邮件', 'email', '微信', '短信', '私信', '消息'])) return 'message';
  if (hasAny(text, ['整理', '收拾', '房间', '桌子', '书桌', '衣柜', '杂物'])) return 'tidy';
  if (hasAny(text, ['洗澡', '洗头', '刷牙', '护肤', '出门', '起床'])) return 'selfcare';
  if (hasAny(text, ['学习', '复习', '背', '刷题', '看书', '考试', '课程', '作业'])) return 'study';
  if (hasAny(text, ['洗碗', '洗衣', '拖地', '扫地', '垃圾', '做饭', '家务'])) return 'chores';
  if (hasAny(text, ['运动', '跑步', '健身', '瑜伽', '散步', '锻炼'])) return 'exercise';
  if (hasAny(text, ['预约', '报名', '缴费', '报销', '申请', '表格', '手续', '账单'])) return 'admin';
  return 'generic';
}

function minutesFor(energy, normal) {
  if (energy !== 'tiny') return normal;
  return Math.max(1, Math.min(5, Math.ceil(normal / 3)));
}

function localBreakdown(task, energy, coach = 'gentle') {
  const type = detectTaskType(task);
  const cheer = {
    gentle: ['先这样就好', '不用一下做完', '慢慢来可以', '已经在路上了', '到这里就很好'],
    direct: ['就做这一步', '别想后面', '先推进一点', '够了，下一步', '收尾'],
    hype: ['开动了', '这步很关键', '继续有戏', '你在推进', '漂亮，收住'],
  }[coach] || ['先这样就好', '不用一下做完', '慢慢来可以', '已经在路上了', '到这里就很好'];

  const templates = {
    writing: [
      ['打开写作入口', '打开文档、资料或作业要求。先不要写正文，只把页面摆出来。', 3],
      ['写下一个很丑的标题', `在最上面写一个临时标题，哪怕只是“${task}”。标题之后可以改。`, 2],
      ['列三个要点', '只写三个短词或短句：你想说什么、需要查什么、最怕卡在哪里。', 8],
      ['写第一段的坏版本', '写 3 到 5 句话，不求顺、不求准，只让文档从空白变成有东西。', 12],
      ['标出下一处要补的地方', '在文末写一句“下一步补这里：___”，然后停。', 3],
    ],
    message: [
      ['打开那条消息', '只打开对话或邮件，不急着回复。先看清对方最后一句在说什么。', 2],
      ['写一句真实开头', '先写“刚看到，我来回一下”或“抱歉拖到现在”。不要发送。', 2],
      ['补一个核心信息', '只回答对方最需要知道的一件事。能短就短。', 5],
      ['读一遍，删掉多余解释', '把过度道歉、过度解释删一点，让它像一句正常回复。', 3],
      ['发送或定时发送', '如果已经够清楚，就发出去；如果还不行，先存成草稿。', 1],
    ],
    tidy: [
      ['选一个小范围', '只选一个位置：桌面左上角、床边、椅子上，范围越小越好。', 2],
      ['拿一个容器', '拿垃圾袋、收纳盒或空纸袋。没有也行，先用一小块空地当临时区。', 2],
      ['先丢明显垃圾', '只处理一眼能判断的垃圾，不做复杂分类。', 5],
      ['把同类东西放一起', '书归书，衣服归衣服，线和小物先堆在同一处。先集中，不追求好看。', 8],
      ['拍一下完成区域', '看一眼刚刚清出来的地方。剩下的留给下一轮。', 1],
    ],
    selfcare: [
      ['站起来，拿要用的东西', '先去拿毛巾、衣服、牙刷或洗漱用品。只拿东西，不要求马上开始。', 2],
      ['打开水或走到浴室', '让环境先动起来：开水、开灯、或站到浴室门口。', 2],
      ['做最短版本', '只完成最必要的一步：冲澡、刷牙、洗脸，先不加额外流程。', 8],
      ['换上舒服的衣服', '不用整理完美，先让身体舒服一点。', 3],
      ['把用过的东西放回一个地方', '只收一个动作，别让收尾变成新任务。', 2],
    ],
    study: [
      ['打开材料', '打开课本、题目、笔记或视频。先停在要看的那一页。', 2],
      ['圈出一个小目标', '只选一页、一道题或一个概念。不要把整章都算进来。', 3],
      ['做五分钟粗读', '先快速看一遍，遇到不会的地方只做标记，不停下来深挖。', 5],
      ['写三行自己的话', '用自己的话写下刚才看懂的三点。写得乱也可以。', 8],
      ['留下下一题或下一页', '把下一次要继续的位置标出来。今天这轮可以收住。', 2],
    ],
    chores: [
      ['把工具拿出来', '先拿洗碗布、洗衣篮、扫把、垃圾袋或锅铲。工具到位就算开始。', 2],
      ['只处理最明显的一批', '先拿走看得见的垃圾、脏碗、脏衣服或地上的大件。', 5],
      ['开一个短计时', '做 5 到 10 分钟，到点就允许停。不要把全部家务一次打包。', 8],
      ['把完成的部分归位', '只收已经处理完的东西，不打开新的区域。', 4],
      ['确认下一批是什么', '看一眼还剩什么，选出下一轮的第一个动作。', 1],
    ],
    exercise: [
      ['换鞋或换衣服', '只做装备动作，不要求马上运动。', 2],
      ['站到运动位置', '走到门口、瑜伽垫旁或楼下。先让身体到位。', 3],
      ['做两分钟热身', '转肩、拉伸、原地走都可以。不要追求强度。', 3],
      ['做一组最短版本', '散步 5 分钟、深蹲 10 个、或跟练一个小片段。', 8],
      ['记录一句完成', '写下今天做了什么。短到一句也行。', 1],
    ],
    admin: [
      ['打开办理入口', '打开网站、App、表格或聊天窗口。先不填，只打开。', 2],
      ['确认需要哪三样东西', '看一眼要求，写下需要的材料、号码或截图。', 5],
      ['先填最简单的栏', '姓名、日期、电话这类确定信息先填。不会的先空着。', 8],
      ['处理一个卡点', '只解决一个缺失项：找一张截图、复制一个号码、问一句确认。', 8],
      ['保存草稿或提交', '能提交就提交；不能提交就保存，并写下还差什么。', 2],
    ],
    generic: [
      ['把任务入口摆出来', `打开、拿出或走到和“${task}”有关的东西旁边。先不要求完成。`, 2],
      ['写下最小动作', '用一句话写：“我现在只要做 ___。”越具体越好。', 3],
      ['做两分钟版本', '只做两分钟。到点后可以停，也可以继续。', 3],
      ['完成一个看得见的小块', '只推进一个很小的部分，让它比刚才多一点点。', 8],
      ['给下一轮留提示', '写下下一步从哪里接着做，别让下次重新想。', 2],
    ],
  };

  return templates[type].map(([title, how, normalMinutes], index) => ({
    title,
    how,
    minutes: minutesFor(energy, normalMinutes),
    cheer: cheer[index] || cheer[0],
  }));
}

async function askBackend({ task, persona, energy, signal }) {
  const prompt = `你是一个专门帮助 ADHD 人群启动任务的教练，风格：${persona}。

用户此刻被这件事卡住、迟迟无法开始："${task}"
启动阻力偏好：${energy === 'tiny' ? '极低阻力，每步尽量 1 到 5 分钟' : '普通小步，每步 2 到 15 分钟'}

请拆成 4 到 6 个极小、可以立刻用身体执行的步骤。每一步要具体、第二人称、温暖不评判。
只输出 JSON：{"steps":[{"title":"...","how":"...","minutes":5,"cheer":"..."}]}`;

  const res = await fetch('/api/breakdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, task, energy }),
    signal,
  });
  if (!res.ok) throw new Error('Backend unavailable');
  const data = await res.json();
  return Array.isArray(data.steps) ? data : extractJson(data.text);
}

function normalizeSteps(raw, fallbackTask, energy, coach = 'gentle') {
  const backup = localBreakdown(fallbackTask, energy, coach);
  const source = Array.isArray(raw?.steps) && raw.steps.length ? raw.steps : backup;
  return source.slice(0, 6).map((step, index) => ({
    title: String(step.title || backup[index]?.title || '你做一个很小的动作').trim(),
    how: String(step.how || backup[index]?.how || '把这一步缩小到你现在愿意碰一下的程度。').trim(),
    minutes: safeMinutes(step.minutes, backup[index]?.minutes || 5),
    cheer: String(step.cheer || backup[index]?.cheer || '这样就很好').trim().slice(0, 18),
    status: 'pending',
  }));
}

export default function App() {
  const [phase, setPhase] = useState('input');
  const [task, setTask] = useState('');
  const [coach, setCoach] = useState('gentle');
  const [energy, setEnergy] = useState('tiny');
  const [steps, setSteps] = useState([]);
  const [cur, setCur] = useState(0);
  const [err, setErr] = useState('');
  const [splitting, setSplitting] = useState(false);
  const [timer, setTimer] = useState(null);
  const intervalRef = useRef(null);
  const inputRef = useRef(null);

  const selectedCoach = useMemo(() => COACHES.find((c) => c.id === coach) || COACHES[0], [coach]);
  const doneCount = steps.filter((s) => s.status !== 'pending').length;

  useEffect(() => {
    if (!timer?.running) return undefined;
    intervalRef.current = window.setInterval(() => {
      setTimer((prev) => {
        if (!prev) return prev;
        if (prev.remaining <= 1) return { ...prev, remaining: 0, running: false };
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => window.clearInterval(intervalRef.current);
  }, [timer?.running]);

  function clearTimer() {
    window.clearInterval(intervalRef.current);
    setTimer(null);
  }

  async function breakDown() {
    const cleanTask = task.trim();
    if (!cleanTask) {
      inputRef.current?.focus();
      return;
    }

    setErr('');
    setPhase('loading');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    try {
      const out = await askBackend({ task: cleanTask, persona: selectedCoach.persona, energy, signal: controller.signal });
      setSteps(normalizeSteps(out, cleanTask, energy, coach));
    } catch {
      setSteps(normalizeSteps({ steps: localBreakdown(cleanTask, energy, coach) }, cleanTask, energy, coach));
      setErr('现在用的是本地拆解规则；接上后端后，可以换成真正按语义生成的版本。');
    } finally {
      window.clearTimeout(timeout);
      setCur(0);
      clearTimer();
      setPhase('steps');
    }
  }

  function splitSmaller() {
    const step = steps[cur];
    if (!step) return;
    setSplitting(true);
    window.setTimeout(() => {
      const smaller = [
        { title: '先碰到它', how: '把相关页面、物品或工具放到眼前。只做到“碰到”，不要求继续。', minutes: 1, cheer: '这就算开始' },
        { title: '做十秒钟版本', how: `只给“${step.title}”十秒钟。能写一个字、拿起一个东西、点开一个页面都算。`, minutes: 1, cheer: '十秒也有效' },
        { title: '说出下一步', how: '用一句很短的话说：我接下来只做什么。说完就够。', minutes: 1, cheer: '先别加码' },
      ].map((s) => ({ ...s, status: 'pending' }));
      setSteps((prev) => {
        const next = [...prev];
        next.splice(cur, 1, ...smaller);
        return next;
      });
      clearTimer();
      setSplitting(false);
    }, 320);
  }

  function advance(status) {
    setSteps((prev) => prev.map((step, index) => (index === cur ? { ...step, status } : step)));
    clearTimer();
    if (cur < steps.length - 1) setCur((n) => n + 1);
    else setPhase('done');
  }

  function reset() {
    setPhase('input');
    setTask('');
    setSteps([]);
    setCur(0);
    setErr('');
    clearTimer();
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="qb-app">
      <style>{STYLE}</style>
      <main className="qb-wrap" aria-live="polite">
        <header className="qb-head">
          <div className="qb-brand">
            <div className="qb-mark" aria-hidden="true"><Sparkles size={17} /></div>
            <div className="qb-name">起<span>步</span></div>
          </div>
          <div className="qb-chip"><Clock3 size={14} /> 只看下一步</div>
        </header>

        {phase === 'input' && (
          <section className="qb-panel qb-fade">
            <h1 className="qb-h1">现在最不想开始的，是哪件事？</h1>
            <p className="qb-sub">不用解释原因。写个大概就行，我会先把它拆到“现在可以动一下”的程度。</p>

            <label className="qb-label" htmlFor="task-input">你卡住的事</label>
            <textarea
              id="task-input"
              ref={inputRef}
              className="qb-ta"
              value={task}
              onChange={(event) => setTask(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') breakDown();
              }}
              placeholder="比如：写期末论文、整理房间、回那封拖了三天的邮件..."
            />
            <div className="qb-examples" aria-label="示例任务">
              {EXAMPLES.map((example) => (
                <button key={example} className="qb-example" type="button" onClick={() => setTask(example)}>{example}</button>
              ))}
            </div>

            <div className="qb-label">你想要哪种语气</div>
            <div className="qb-coaches">
              {COACHES.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" className={`qb-coach${coach === item.id ? ' on' : ''}`} onClick={() => setCoach(item.id)} aria-pressed={coach === item.id}>
                    <span className="qb-cico"><Icon size={19} /></span>
                    <span>
                      <span className="qb-cname">{item.name}</span>
                      <span className="qb-cdesc">{item.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="qb-options">
              <button type="button" className={`qb-seg${energy === 'tiny' ? ' on' : ''}`} onClick={() => setEnergy('tiny')} aria-pressed={energy === 'tiny'}>
                <Wand2 size={15} /> 越小越好
              </button>
              <button type="button" className={`qb-seg${energy === 'normal' ? ' on' : ''}`} onClick={() => setEnergy('normal')} aria-pressed={energy === 'normal'}>
                <Timer size={15} /> 正常小步
              </button>
            </div>

            <button className="qb-btn" type="button" onClick={breakDown} disabled={!task.trim()}>
              <Sparkles size={18} /> 拆成下一步
            </button>
            <p className="qb-note">小提示：按 Ctrl/⌘ + Enter 也可以开始。</p>
            {err && <div className="qb-err">{err}</div>}
          </section>
        )}

        {phase === 'loading' && (
          <section className="qb-panel qb-load qb-fade">
            <Loader2 size={34} className="qb-spin" />
            <p>正在把它拆成小步...</p>
            <small>先不管整件事，只找能马上开始的那一下。</small>
          </section>
        )}

        {phase === 'steps' && steps[cur] && (
          <section className="qb-fade">
            <div className="qb-top">
              <button className="qb-back" type="button" onClick={reset} aria-label="重新开始"><ArrowLeft size={18} /></button>
              <div className="qb-prog">
                <div className="qb-prog-t"><span>第 <b>{cur + 1}</b> 步 / 共 {steps.length} 步</span><span>{doneCount}/{steps.length} 已处理</span></div>
                <div className="qb-bar" aria-hidden="true"><i style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
              </div>
            </div>

            <article className="qb-card">
              <span className="qb-now"><Target size={12} /> 现在，只做这一件事</span>
              <h2 className="qb-step">{steps[cur].title}</h2>
              <p className="qb-how">{steps[cur].how}</p>
              <div className="qb-cheer"><ChevronRight size={16} /><p>{steps[cur].cheer}</p></div>

              <div className="qb-timer">
                {!timer ? (
                  <button className="qb-tstart" type="button" onClick={() => setTimer({ remaining: steps[cur].minutes * 60, total: steps[cur].minutes * 60, running: true })}>
                    <Timer size={16} /> 开始计时 · 约 {steps[cur].minutes} 分钟
                  </button>
                ) : (
                  <div className="qb-trun">
                    <div className={`qb-tnum${timer.remaining === 0 ? ' done' : ''}`}>{timer.remaining === 0 ? '时间到' : fmt(timer.remaining)}</div>
                    {timer.remaining > 0 && (
                      <button className="qb-iconbtn" type="button" onClick={() => setTimer((t) => ({ ...t, running: !t.running }))} aria-label={timer.running ? '暂停计时' : '继续计时'}>
                        {timer.running ? <Pause size={17} /> : <Play size={17} />}
                      </button>
                    )}
                    <button className="qb-iconbtn" type="button" onClick={clearTimer} aria-label="停止计时"><Square size={16} /></button>
                  </div>
                )}
              </div>

              <div className="qb-actions">
                <button className="qb-done" type="button" onClick={() => advance('done')}><Check size={18} /> 做完了，下一步</button>
                <div className="qb-row">
                  <button className="qb-ghost" type="button" onClick={splitSmaller} disabled={splitting}>
                    {splitting ? <Loader2 size={15} className="qb-spin" /> : <Scissors size={15} />}
                    {splitting ? '正在再拆小...' : '还是动不了？再拆小'}
                  </button>
                  <button className="qb-ghost" type="button" onClick={() => advance('skipped')}><SkipForward size={15} /> 跳过</button>
                </div>
              </div>
            </article>
            {err && <div className="qb-err">{err}</div>}
          </section>
        )}

        {phase === 'done' && (
          <section className="qb-panel qb-finish qb-fade">
            <div className="qb-pop"><Sparkles size={30} /></div>
            <h2>你已经起步了</h2>
            <p className="qb-stat">这一轮你完成了 <b>{steps.filter((s) => s.status === 'done').length}</b> 个小步骤。能开始，就已经穿过了最难的那一秒。</p>
            <div className="qb-recap">
              {steps.map((step, index) => (
                <div key={`${step.title}-${index}`} className={`qb-it${step.status === 'skipped' ? ' sk' : ''}`}>
                  <span className="qb-ic">{step.status === 'done' ? <Check size={13} /> : <SkipForward size={12} />}</span>
                  <span>{step.title}</span>
                </div>
              ))}
            </div>
            <button className="qb-btn" type="button" onClick={reset}><RotateCcw size={17} /> 再开始一件事</button>
          </section>
        )}
      </main>
    </div>
  );
}
