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
