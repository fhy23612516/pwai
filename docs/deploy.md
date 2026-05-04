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

## 数据备份

设置页可以复制当前浏览器数据为 JSON。换浏览器或换服务器测试时，可在设置页粘贴 JSON 导入。
