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

## 数据备份

设置页可以复制当前浏览器数据为 JSON。换浏览器或换服务器测试时，可在设置页粘贴 JSON 导入。
