# 部署测试说明

当前项目是静态前端原型，运行时不需要数据库。用户数据存储在浏览器 `localStorage`。

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

远程 AI 相关环境变量也放在这里：

```text
OPENAI_API_KEY=你的服务端模型密钥
OPENAI_BASE_URL=https://你的中转站域名/v1
OPENAI_MODEL=中转站支持的模型名
OPENAI_MODEL_PREP=
OPENAI_MODEL_ASSIST=
OPENAI_MODEL_REVIEW=
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
OPENAI_MODEL_REVIEW=
AI_API_MODE=responses
OPENAI_REASONING_EFFORT=xhigh
OPENAI_DISABLE_RESPONSE_STORAGE=true
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
OPENAI_MODEL_REVIEW=deepseek-reasoner
```

未配置时会回退到：

```text
OPENAI_MODEL
```

对 DeepSeek 来说，建议：

- 开单准备：`deepseek-chat`
- 实时辅助：`deepseek-chat`
- 订单复盘：`deepseek-reasoner`

## 数据备份

设置页可以复制当前浏览器数据为 JSON。换浏览器或换服务器测试时，可在设置页粘贴 JSON 导入。
