# Nihongo Voice Coach

AI 日语语音聊天陪练 MVP。机器人先用日语发起会话，用户录音回答后，系统返回日语转写、中文语法建议、中文发音练习提示、更自然的日语表达，并继续下一个日语话题。

## 功能

- 日语机器人主动开聊
- 浏览器麦克风录音
- 日语语音转文字
- 中文语法反馈
- 中文发音练习提示
- 机器人继续日语对话并播放语音
- Supabase 登录/注册
- 登录用户的练习会话、录音、反馈和分数历史记录
- 无 API key 时可进入 Demo 模式

## 技术栈

- Next.js + React + TypeScript
- OpenAI Responses API: 对话推进和结构化反馈
- OpenAI Speech to Text: 日语转写
- Google Speech-to-Text: 可选日语转写提供商
- OpenAI Text to Speech: 机器人日语语音
- Supabase Auth + PostgreSQL + Storage: 用户和历史记录

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 启用提交前密钥检查

```bash
git config core.hooksPath .githooks
```

3. 创建环境变量

```bash
cp .env.example .env.local
```

填入：

```bash
OPENAI_API_KEY=sk-your-key-here
```

`.env.local`、`.env.production` 等真实环境变量文件已被 `.gitignore` 忽略，不要把真实 API key 写进 `.env.example`、README 或源码。

4. 配置 Supabase 登录和历史记录

创建 Supabase 项目后，在 SQL Editor 运行：

```bash
supabase/schema.sql
```

然后在 `.env.local` 添加：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

未登录时仍可练习，但不会保存历史；登录后每次录音、转写、反馈和分数会保存到 Supabase。

5. 启动

```bash
npm run dev
```

打开 `http://localhost:3000`。

## 部署

推荐把代码推到 GitHub，然后用 Vercel 连接这个仓库部署。需要在 Vercel 项目里配置同样的环境变量：

```bash
OPENAI_API_KEY
OPENAI_CHAT_MODEL
OPENAI_STT_MODEL
OPENAI_TTS_MODEL
OPENAI_TTS_VOICE
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

不建议部署到纯 GitHub Pages，因为 OpenAI API key 不能放在前端静态页面里。

## 默认模型

`.env.example` 里的默认值：

```bash
OPENAI_CHAT_MODEL=gpt-5-mini
STT_PROVIDER=openai
OPENAI_STT_MODEL=gpt-4o-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=coral
```

可以按成本和质量调整。

## 语音识别提供商

默认使用 OpenAI Speech-to-Text：

```bash
STT_PROVIDER=openai
OPENAI_STT_MODEL=gpt-4o-transcribe
```

如果要试 Google Speech-to-Text：

```bash
STT_PROVIDER=google
GOOGLE_SPEECH_ACCESS_TOKEN=your-access-token
GOOGLE_SPEECH_MODEL=latest_short
```

也可以用 `GOOGLE_SPEECH_API_KEY`，但 Google 官方更推荐使用应用默认凭据或访问令牌。

## 发音反馈说明

当前 MVP 的发音反馈是基于转写文本和日语学习规则生成的练习提示，不是音素级声学评分。要升级到更专业的发音评测，可以继续加入词级时间戳、音素对齐、pitch accent 分析和置信度统计。
