# 起步

一个面向 ADHD 启动困难的 AI 任务拆解网站原型。

## 已有功能

- 个性化进入页
- 本地登录状态
- DeepSeek 任务拆解接口，本地运行时由 `server.js` 保护 API key
- GitHub Pages 静态发布支持，没有后端时自动使用演示拆解
- 没配置 API key 时的本地演示拆解
- 浏览器语音输入
- 小任务勾选
- 每天完成一步后打卡续火花
- 本周打卡视图

## 本地运行

需要 Node.js 18 或以上。

```bash
cd outputs/qibu-site
cp .env.example .env
```

把 `.env` 里的 `DEEPSEEK_API_KEY` 换成你的新 key。不要把 key 写进前端，也不要提交 `.env`。

macOS / Linux 可以这样启动：

```bash
export DEEPSEEK_API_KEY="你的新 key"
npm start
```

然后打开：

```text
http://localhost:5173
```

## 安全提醒

你刚才把 API key 发到了聊天里。建议立刻去 DeepSeek 控制台撤销这个 key，重新生成一个新 key，再放进本地 `.env` 或服务器环境变量里。

## 后续上线建议

- 登录从本地状态换成 Supabase、Clerk 或 Firebase Auth
- 打卡数据放到数据库，比如 Supabase Postgres
- DeepSeek 请求只放在后端或 serverless function
- 加上用户每日任务历史和提醒
- 上线时使用 HTTPS，否则语音输入可能被浏览器限制

## 发布到 GitHub Pages

这个仓库已经包含 `.github/workflows/pages.yml`。推送到 GitHub 的 `main` 分支后，GitHub Actions 会把 `public/` 目录发布到 GitHub Pages。

注意：GitHub Pages 只能托管静态文件，不能安全保存 DeepSeek API key。公开给别人用 AI 功能时，需要再部署一个后端或 serverless function，然后在前端配置 `window.QIBU_API_BASE` 指向那个后端。

## 真实 AI 后端

项目包含 Vercel Serverless 接口 `api/breakdown.js`。在 Vercel 配置这些环境变量后，接口会安全调用 DeepSeek：

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`，默认 `deepseek-v4-flash`
- `ALLOWED_ORIGIN`，可选，建议填 GitHub Pages 地址

如果把整个项目部署到 Vercel，网页会自动调用同域的 `/api/breakdown`。如果继续使用 GitHub Pages 前端，把 `config.js` 里的 `window.QIBU_API_BASE` 改成 Vercel 后端地址即可。

## Google 登录和数据库

推荐使用 Supabase Auth + Supabase Postgres。创建 Supabase 项目后：

1. 在 Supabase Auth 里开启 Google provider。
2. 把 GitHub Pages 地址加入允许跳转 URL：

```text
https://olin047.github.io/qibu/
```

3. 在 SQL Editor 里执行：

```sql
create table if not exists public.qibu_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.qibu_user_state enable row level security;

create policy "Users can read their own qibu state"
on public.qibu_user_state
for select
using (auth.uid() = user_id);

create policy "Users can insert their own qibu state"
on public.qibu_user_state
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own qibu state"
on public.qibu_user_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

4. 把 `config.js` 里的配置填上：

```js
window.QIBU_SUPABASE_URL = "你的 Supabase Project URL";
window.QIBU_SUPABASE_ANON_KEY = "你的 Supabase anon public key";
```

`anon public key` 可以公开放在前端，真正的数据隔离依赖 RLS policy。
