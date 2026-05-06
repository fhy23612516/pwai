# 部署测试说明

当前项目使用 Node 静态服务和少量 JSON 文件持久化数据，运行时不需要数据库。账号文件、老板档案和订单数据建议放在 `/etc/pwai`。

登录后的业务数据会按账号保存到服务器 `/api/state`，浏览器本地只作为缓存。每个老板可以维护独立记忆卡，包括后续沟通方向、可复用开场、有效话术、风险提醒和下次观察点。订单复盘里的画像建议可以继续写回这些记忆字段。情景模拟对话也会进入账号数据，换设备登录后仍能看到同一老板的训练历史。

## 启动

```bash
npm start
```

默认监听：

```text
0.0.0.0:4173
```

可通过环境变量修改：

```bash
PORT=8080 npm start
```

Windows PowerShell：

```powershell
$env:PORT="8080"; npm start
```

## 健康检查

```bash
curl http://127.0.0.1:4173/healthz
```

预期返回：

```json
{"ok":true,"service":"pwai"}
```

## 生产部署建议

- 用 Nginx / Caddy / 宝塔面板反向代理到 Node 服务端口
- 对外使用 HTTPS
- 如果接真实 AI，不要把模型 API Key 写进前端
- 真实 AI 请求应由服务器端代理，前端只调用同源接口，例如 `/api/ai`
- 当前版本的远程 AI provider 只是配置预留，未真正请求远程接口

## 版本化配置模板

仓库里的 `deploy/` 目录包含服务器配置模板：

- `deploy/pwai.env.example`
- `deploy/pwai.service`
- `deploy/nginx-pwai.conf`
- `deploy/install-systemd.sh`
- `deploy/install-nginx.sh`

服务化部署推荐：

```bash
cd /opt/pwai
bash deploy/install-systemd.sh
bash deploy/install-nginx.sh
```

Nginx 安装脚本默认使用：

```text
/etc/nginx/sites-available/pwai
/etc/nginx/sites-enabled/pwai
```

这与 Debian / Ubuntu 常见站点配置方式一致，也方便和同服务器上的其他程序统一管理。

实际环境变量文件位于：

```text
/etc/pwai/pwai.env
```

这个文件可以按服务器实际端口修改，不需要提交到 Git。

## 账号注册和登录

当前登录功能是服务端账号系统，不需要数据库。用户第一次访问 `/login` 注册账号，后续用账号密码登录。密码使用 `scrypt` 加盐哈希后存到服务器文件，网页登录成功后服务端写入 `HttpOnly` Cookie；小程序后续可以使用 `/api/login` 返回的 `token`，请求接口时放到 `Authorization: Bearer <token>`。

在 `/etc/pwai/pwai.env` 配置：

```text
AUTH_USERS_FILE=/etc/pwai/users.json
AUTH_DATA_FILE=/etc/pwai/app-data.json
AUTH_ALLOW_REGISTRATION=true
AUTH_SESSION_SECRET=一串随机字符
AUTH_SESSION_TTL_SECONDS=604800
AUTH_COOKIE_NAME=pwai_session
AUTH_COOKIE_SECURE=true
```

生成随机密钥：

```bash
openssl rand -hex 32
```

修改后重启服务：

```bash
sudo systemctl restart pwai
```

验证流程：

```bash
curl -i http://127.0.0.1:4188/
curl -i -X POST http://127.0.0.1:4188/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

未登录访问首页应跳转 `/login`，注册或登录成功应返回 `Set-Cookie` 和 JSON。`/healthz` 会保持公开，方便 systemd、Nginx 或监控检查服务状态。

如果暂时只想开放已有账号登录，可以把注册关掉：

```text
AUTH_ALLOW_REGISTRATION=false
```

用户文件 `AUTH_USERS_FILE` 不要提交到 Git。建议放在 `/etc/pwai/users.json`，和真实 API Key 一样只保存在服务器。

老板档案、订单、话术收藏、AI 设置等应用数据会按账号保存到 `AUTH_DATA_FILE`，默认建议放在 `/etc/pwai/app-data.json`。同一账号换设备登录时，会通过 `/api/state` 读取这份服务器数据；如果服务器上还没有数据，旧版本浏览器里的本地数据会在登录后自动上传一次。

`/api/state` 默认允许最大 1MB 数据，可用下面变量调整：

```text
APP_STATE_MAX_BYTES=1048576
```

这两个文件都要纳入服务器备份：

```bash
sudo cp /etc/pwai/users.json /etc/pwai/users.json.bak
sudo cp /etc/pwai/app-data.json /etc/pwai/app-data.json.bak
```

如果你还没配置 HTTPS 域名，只用 `http://服务器IP:端口` 测试，先用：

```text
AUTH_COOKIE_SECURE=false
```

等后面切到 HTTPS 域名后，再改回：

```text
AUTH_COOKIE_SECURE=true
```

远程 AI 相关环境变量也放在这里：

```text
OPENAI_API_KEY=你的服务端模型密钥
OPENAI_BASE_URL=https://你的中转站域名/v1
OPENAI_MODEL=中转站支持的模型名
OPENAI_MODEL_PREP=
OPENAI_MODEL_ASSIST=
OPENAI_MODEL_SIMULATE=
OPENAI_MODEL_REVIEW=
OPENAI_MAX_OUTPUT_TOKENS=1200
AI_API_MODE=chat
AI_TIMEOUT_MS=30000
AI_HTTP_CLIENT=fetch
OPENAI_REASONING_EFFORT=
OPENAI_DISABLE_RESPONSE_STORAGE=true
OPENAI_RESPONSE_FORMAT=json_object
```

不要把真实密钥提交到 GitHub。

当前 `/api/ai` 已可供网页和小程序共用。未配置 `OPENAI_API_KEY` 时，接口会返回明确错误，网页端会自动回退到本地模板。

大多数中转站兼容 `/v1/chat/completions`，所以默认使用：

```text
AI_API_MODE=chat
```

只有中转站明确支持 `/v1/responses` 时，才改成：

```text
AI_API_MODE=responses
```

你的中转站如果配置是：

```toml
base_url = "https://sub.zlove.tech"
wire_api = "responses"
model = "gpt-5.4"
model_reasoning_effort = "xhigh"
disable_response_storage = true
```

则 `/etc/pwai/pwai.env` 使用：

```text
OPENAI_API_KEY=你的中转站 Key
OPENAI_BASE_URL=https://sub.zlove.tech
OPENAI_MODEL=gpt-5.4
OPENAI_MODEL_PREP=
OPENAI_MODEL_ASSIST=
OPENAI_MODEL_SIMULATE=
OPENAI_MODEL_REVIEW=
AI_API_MODE=responses
OPENAI_REASONING_EFFORT=xhigh
OPENAI_DISABLE_RESPONSE_STORAGE=true
OPENAI_MAX_OUTPUT_TOKENS=1200
AI_TIMEOUT_MS=30000
AI_HTTP_CLIENT=curl
OPENAI_RESPONSE_FORMAT=text
```

如果 Node `fetch` 访问中转站超时，但系统 `curl` 可以访问，使用：

```text
AI_HTTP_CLIENT=curl
```

这会让服务端用系统 `curl` 请求中转站，绕开 Node/undici 与部分 Cloudflare 中转站的连接兼容问题。

如果 responses 接口不支持 `text.format=json_object`，使用：

```text
OPENAI_RESPONSE_FORMAT=text
```

## 按场景选择模型

可以为不同场景配置不同模型：

```text
OPENAI_MODEL_PREP=deepseek-chat
OPENAI_MODEL_ASSIST=deepseek-chat
OPENAI_MODEL_SIMULATE=deepseek-chat
OPENAI_MODEL_REVIEW=deepseek-reasoner
```

未配置时会回退到：

```text
OPENAI_MODEL
```

对 DeepSeek 来说，建议：

- 开单准备：`deepseek-chat`
- 实时辅助：`deepseek-chat`
- 情景模拟：`deepseek-chat`
- 订单复盘：`deepseek-reasoner`

## 调整 AI 输出长度和口吻

默认服务端会给模型设置：

```text
OPENAI_MAX_OUTPUT_TOKENS=1200
```

如果生成内容仍然太短，可以提高到：

```text
OPENAI_MAX_OUTPUT_TOKENS=1800
```

如果内容太长、响应太慢，可以降低到：

```text
OPENAI_MAX_OUTPUT_TOKENS=800
```

当前 prompt 已要求模型少用模板词，输出更像陪玩临场备忘：多给具体判断条件、多条可复制话术，少写“首先、其次、建议你可以、情绪价值、建立连接”这类 AI 腔表达。

## 数据备份

设置页可以复制当前浏览器数据为 JSON。换浏览器或换服务器测试时，可在设置页粘贴 JSON 导入。
