# GitHub 提交与服务器部署完整流程

这份流程假设服务器上已经有其他程序，所以本项目使用独立端口运行，再通过 Nginx / 宝塔 / Caddy 反向代理到域名或子域名。

## 1. 本地提交前检查

在本地项目目录执行：

```bash
git status --short
npm test
```

Windows PowerShell 如果拦截 `npm.ps1`，使用：

```powershell
npm.cmd test
```

预期：

```text
15/15 tests passed
```

如果工作区有改动，先提交：

```bash
git add .
git commit -m "chore: update deployment docs"
```

## 2. 推送到 GitHub

### 2.1 创建 GitHub 仓库

在 GitHub 新建一个空仓库，例如：

```text
pwai
```

不要勾选初始化 README、`.gitignore` 或 License，因为本地仓库已经有文件和提交历史。

### 2.2 绑定远程仓库

HTTPS 示例：

```bash
git remote add origin https://github.com/<your-name>/pwai.git
```

SSH 示例：

```bash
git remote add origin git@github.com:<your-name>/pwai.git
```

如果已经添加过 remote：

```bash
git remote -v
git remote set-url origin https://github.com/<your-name>/pwai.git
```

### 2.3 推送

当前分支是 `master`，直接推送：

```bash
git push -u origin master
```

如果你想改成 `main`：

```bash
git branch -M main
git push -u origin main
```

后续更新：

```bash
git add .
git commit -m "feat: your change"
git push
```

## 3. 服务器准备

确认 Node.js 可用：

```bash
node -v
npm -v
```

建议 Node.js 18 或更高。

查看服务器已有监听端口，避免冲突：

```bash
ss -lntp
```

选择一个未占用端口，例如 `4188`。

## 4. 服务器拉取代码

选择部署目录，例如：

```bash
mkdir -p /www/wwwroot
cd /www/wwwroot
git clone https://github.com/<your-name>/pwai.git
cd pwai
```

运行测试：

```bash
npm test
```

试启动：

```bash
PORT=4188 npm start
```

另开一个终端验证：

```bash
curl http://127.0.0.1:4188/healthz
```

预期：

```json
{"ok":true,"service":"pwai"}
```

## 5. 常驻运行方式

二选一：PM2 或 systemd。

如果采用 systemd，推荐使用仓库里的版本化模板：

```bash
cd /opt/pwai
bash deploy/install-systemd.sh
```

脚本会：

- 创建 `/etc/pwai/pwai.env`
- 从 `deploy/pwai.service` 生成 `/etc/systemd/system/pwai.service`
- 使用当前服务器上的 `node` 路径
- reload 并重启 `pwai`

端口配置在：

```bash
/etc/pwai/pwai.env
```

默认：

```text
PORT=4188
```

### 5.1 PM2 方式

安装 PM2：

```bash
npm install -g pm2
```

启动：

```bash
cd /www/wwwroot/pwai
PORT=4188 pm2 start server.js --name pwai
pm2 save
pm2 startup
```

查看：

```bash
pm2 status
pm2 logs pwai
```

重启：

```bash
pm2 restart pwai
```

### 5.2 systemd 方式

创建服务文件：

```bash
sudo nano /etc/systemd/system/pwai.service
```

内容：

```ini
[Unit]
Description=PWAI static app
After=network.target

[Service]
Type=simple
WorkingDirectory=/www/wwwroot/pwai
Environment=PORT=4188
ExecStart=/usr/bin/node /www/wwwroot/pwai/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

如果 `node` 不在 `/usr/bin/node`，用下面命令查实际路径：

```bash
which node
```

启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable pwai
sudo systemctl start pwai
sudo systemctl status pwai
```

查看日志：

```bash
journalctl -u pwai -f
```

## 6. Nginx 反向代理

推荐用子域名，例如：

```text
pwai.heiheihei.pw
```

推荐使用仓库里的版本化模板：

```bash
cd /opt/pwai
bash deploy/install-nginx.sh
```

脚本会把 `deploy/nginx-pwai.conf` 复制到 `/etc/nginx/sites-available/pwai`，并创建软链接 `/etc/nginx/sites-enabled/pwai`，然后执行 `nginx -t` 并 reload。

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name pwai.heiheihei.pw;

    location / {
        proxy_pass http://127.0.0.1:4188;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

如果手动配置，推荐保持和服务器其他程序一致：

```bash
sudo cp /opt/pwai/deploy/nginx-pwai.conf /etc/nginx/sites-available/pwai
sudo ln -sfn /etc/nginx/sites-available/pwai /etc/nginx/sites-enabled/pwai
sudo nginx -t
sudo systemctl reload nginx
```

如果使用宝塔面板：

1. 新建站点或子域名站点
2. 网站目录可随便指向一个空目录
3. 设置反向代理到：

```text
http://127.0.0.1:4188
```

## 7. 更新部署

服务器上执行：

```bash
cd /www/wwwroot/pwai
git pull
npm test
```

如果你采用服务化目录 `/opt/pwai`，使用：

```bash
cd /opt/pwai
git pull
npm test
sudo systemctl restart pwai
sudo systemctl status pwai --no-pager -l
```

PM2：

```bash
pm2 restart pwai
```

systemd：

```bash
sudo systemctl restart pwai
```

## 8. 回滚

先看提交历史：

```bash
git log --oneline --max-count=10
```

推荐用 `git revert` 回滚某个问题提交：

```bash
git revert <commit>
npm test
git push
```

服务器更新：

```bash
git pull
npm test
sudo systemctl restart pwai
```

或：

```bash
sudo systemctl restart pwai
```

## 9. 注意事项

- 不要和服务器现有程序使用同一个端口
- 本项目服务器配置模板在 `deploy/` 目录下，应该一起纳入 Git
- 实际 `/etc/pwai/pwai.env` 可以按服务器修改，不需要提交回仓库
- 不要把 AI API Key 写入前端代码或 GitHub
- 访问密码只放服务器环境变量，例如 `/etc/pwai/pwai.env` 里的 `AUTH_PASSWORD`
- 网页和小程序后续共用服务端 `/api/ai`
- 网页登录使用服务端 `HttpOnly` Cookie；小程序可用 `/api/login` 返回的 token 走 `Authorization: Bearer <token>`
- 模型密钥只放服务器环境变量，例如 `/etc/pwai/pwai.env` 里的 `OPENAI_API_KEY`
- 中转站 API 在 `/etc/pwai/pwai.env` 配置 `OPENAI_BASE_URL`、`OPENAI_MODEL`、`AI_API_MODE=chat`
- 可用 `OPENAI_MODEL_PREP`、`OPENAI_MODEL_ASSIST`、`OPENAI_MODEL_REVIEW` 按场景选择模型
- 可用 `OPENAI_MAX_OUTPUT_TOKENS` 调整 AI 输出长度，默认 `1200`
- 如果中转站使用 Responses 协议，可配置 `AI_API_MODE=responses`、`OPENAI_REASONING_EFFORT=xhigh`、`OPENAI_DISABLE_RESPONSE_STORAGE=true`
- 如果 Node `fetch` 连中转站超时但系统 `curl` 可用，配置 `AI_HTTP_CLIENT=curl`
- 如果中转站不支持 `text.format=json_object`，配置 `OPENAI_RESPONSE_FORMAT=text`
- 当前数据存在浏览器 `localStorage`，换浏览器会看不到旧数据
- 设置页可以导出 / 导入 JSON 数据
- 真实 AI 接入时建议增加服务端 `/api/ai`，由服务器读取环境变量里的密钥
