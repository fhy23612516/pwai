# 陪玩副驾 AI

面向真人陪玩的 AI 辅助工作台原型。当前版本是无构建依赖的静态可交互 MVP，用本地模板模拟 AI 输出；登录后老板档案等数据会按账号同步到服务器。

## 运行方式

直接在浏览器打开 `index.html` 即可。

也可以用内置 Node 静态服务运行，适合部署测试：

```powershell
npm start
```

如果 Windows PowerShell 拦截 `npm.ps1`，使用：

```powershell
npm.cmd start
```

默认监听 `0.0.0.0:4173`。可通过环境变量修改：

```powershell
$env:PORT="8080"; npm start
```

健康检查：

```powershell
curl http://127.0.0.1:4173/healthz
```

## 当前功能

- 首页工作台和快捷入口
- 陪玩人设设置
- 老板档案新增、编辑、删除、列表、详情
- 每个老板独立记忆卡，记录后续沟通方向、可复用话术、风险和观察点
- 开单准备模拟生成
- 实时辅助模拟生成
- 老板情景模拟聊天，像 ChatGPT 网页对话一样连续扮演老板回复，并根据老板人设、长期记忆和近期互动练习下一句
- 订单复盘模拟生成和保存
- 历史订单查询和筛选
- 老板画像结构化更新建议
- 复盘建议可沉淀到老板记忆，后续开单和实时辅助会参考
- 老板记忆支持长期画像、互动偏好、关系互动和近期信号，生成时会参考最近订单 / 求助片段
- 恋爱感、暧昧、私聊、线下见面按陪玩关系营业意愿分流生成，不默认禁止；色情、违法、胁迫等硬风险除外
- 联系提醒轻量规则
- 话术复制
- 常用话术收藏
- 设置页数据备份 / 导入 / 恢复示例
- 本地 AI provider 适配层，预留真实模型接口
- `/api/ai` 服务端代理，支持 OpenAI 兼容中转站，供网页和小程序后续共用
- 支持中转站 `chat/completions` 与 `responses` 两种协议
- 支持 `AI_HTTP_CLIENT=curl` 兼容部分中转站网络问题
- 支持 `OPENAI_RESPONSE_FORMAT=text` 兼容不支持结构化格式的中转站
- 支持按场景选择模型：开单、实时辅助、情景模拟、订单复盘
- 支持 `OPENAI_MAX_OUTPUT_TOKENS` 控制远程 AI 输出长度
- AI 生成内容强化为多条可复制话术和具体临场判断，减少模板化表达
- AI 生成会读取本单表单属性，避免只做关键词替换
- 账号注册 / 登录，支持网页 Cookie 和小程序 Bearer token
- 内置 Node 静态服务器和 `/healthz` 健康检查

AI 接口契约见 [docs/ai-contract.md](./docs/ai-contract.md)。

GitHub 推送和服务器部署流程见 [docs/github-and-deploy.md](./docs/github-and-deploy.md)。

服务器配置模板见 [deploy](./deploy)。

版本记录见 [CHANGELOG.md](./CHANGELOG.md)。

## 测试方式

运行烟测脚本：

```powershell
node .\tests\smoke.test.js
```

当前烟测覆盖：

- 静态入口文件存在
- `index.html` 正确加载资源
- MVP 导航和渲染函数存在
- 示例人设、老板、订单数据存在
- 开单准备、实时辅助、订单复盘生成字段完整
- AI 输出 schema 统一适配
- AI 契约文档关键字段存在
- `/api/ai` 远程接口骨架存在
- 注册登录接口、会话 Cookie 和受保护接口入口存在
- 老板记忆字段和复盘写回逻辑存在
- 情景模拟连续对话和会话持久化存在
- AI prompt 和本地模板包含更具体的生成质量约束
- AI 输出包含可复制、可收藏卡片
- 设置页备份导入结构校验
- 老板画像建议结构化合并
- 历史订单筛选规则
- 移动端关键样式存在
- 真实注册登录流程保护页面、接口、Cookie 和 Bearer token

## 版本管理

项目已启用 Git。建议每个稳定节点提交一次：

```powershell
git status --short
git add .
git commit -m "说明本次改动"
```

查看历史：

```powershell
git log --oneline --decorate --max-count=10
```

回滚到某个历史版本前，先确认当前状态：

```powershell
git status --short
```

再根据需要用 `git revert <commit>` 创建反向提交。避免直接使用 `git reset --hard`，除非明确确认要丢弃本地改动。

## 数据说明

登录后数据会通过 `/api/state` 按账号保存到服务器，默认文件是 `/etc/pwai/app-data.json`；浏览器 `localStorage` 只作为本机缓存和离线兜底。页面右上角“重置示例”会覆盖当前账号数据。
