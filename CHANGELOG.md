# 版本记录

本项目使用 Git 提交和 tag 做版本管理。每个版本号都对应一个关键提交，后续需要回滚、对比或定位问题时，优先使用这里的版本号。

查看版本：

```bash
git tag --list --sort=version:refname
```

切到某个版本查看：

```bash
git checkout v0.12.0
```

生产环境建议优先用 `git revert <commit>` 回滚问题提交，不建议直接 `git reset --hard`。

## v0.13.0 - 版本记录整理

提交：`v0.13.0` tag 指向的 `docs: add version changelog`

- 新增 `CHANGELOG.md`
- 把前期功能更新按版本号整理，方便后续回滚、对比和继续开发
- 对关键历史提交补 Git tag

## v0.12.0 - 老板记忆卡

提交：`394c4e4 feat: add boss memory cards`

- 每个老板新增独立记忆卡
- 记录沟通方向、可复用开场、有效话术、风险提醒和下次观察点
- 老板详情页展示记忆卡，编辑页支持手动维护
- 开单准备、实时辅助会参考老板记忆
- 订单复盘会生成记忆建议，并可写回老板档案
- 旧数据导入时自动补齐记忆字段
- 远程 AI 契约和服务端 prompt 支持老板记忆字段

## v0.11.0 - 账号注册登录

提交：`a1812b7 feat: add account registration login`

- 登录从统一访问密码升级为账号注册 / 登录
- 新增 `/api/register`
- `/api/login` 改为账号密码登录
- 密码使用 `scrypt` 加盐哈希保存，不存明文
- 用户文件默认存储在 `/etc/pwai/users.json`
- 登录页支持登录 / 注册切换
- 前端本地数据按用户 ID 隔离，避免同一浏览器不同账号串数据
- 更新部署文档、环境变量模板和登录流程测试

## v0.10.0 - AI 输出质量优化

提交：`4ef993e feat: improve ai response quality`

- 增强服务端 AI prompt，减少模板化和 AI 腔
- 增加更具体的场景生成规则
- 本地 AI 模板加长，远程 AI 失败回退时也能输出更完整内容
- 新增 `OPENAI_MAX_OUTPUT_TOKENS`，默认 `1200`
- 文档说明如何调整输出长度和口吻
- 测试覆盖“不能太短、不能太泛”的生成质量要求

## v0.9.0 - 登录保护基础版

提交：`bee2202 feat: add password login protection`

- 新增 `/login`
- 新增 `/api/login`、`/api/logout`、`/api/session`
- 使用 `HttpOnly` Cookie 保存登录状态
- API 支持 `Authorization: Bearer <token>`
- 未登录访问页面跳转登录页，未登录访问 API 返回 `AUTH_REQUIRED`
- 设置页新增退出登录
- 新增真实 HTTP 登录流程测试

注意：该版本是统一访问密码版，后续 `v0.11.0` 已升级为账号注册登录。

## v0.8.0 - 按场景选择 AI 模型

提交：`bcb1781 feat: allow per-scenario ai models`

- 支持按场景配置不同模型
- 新增 `OPENAI_MODEL_PREP`
- 新增 `OPENAI_MODEL_ASSIST`
- 新增 `OPENAI_MODEL_REVIEW`
- 开单、实时辅助、订单复盘可以分别选择不同模型
- 文档增加 DeepSeek 场景模型建议

## v0.7.0 - 中转站文本响应兼容

提交：`b3e783f feat: allow text response format for relay`

- 新增 `OPENAI_RESPONSE_FORMAT`
- 支持 `json_object` 和 `text`
- 兼容不支持 `text.format=json_object` 的 Responses 中转站
- 保持服务端 JSON 解析和安全默认值补齐

## v0.6.0 - curl AI 请求客户端

提交：`646ce97 feat: add curl ai http client`

- 新增 `AI_HTTP_CLIENT=fetch|curl`
- 当 Node `fetch` 连接部分中转站超时时，可以改用系统 `curl`
- 解决部分 Cloudflare / 中转站网络兼容问题
- 文档增加服务器排查和配置说明

## v0.5.0 - Responses 中转站配置

提交：`e92d982 feat: support responses relay options`

- 支持 `AI_API_MODE=responses`
- 支持 `OPENAI_REASONING_EFFORT`
- 支持 `OPENAI_DISABLE_RESPONSE_STORAGE`
- 支持自动追加 `/v1`
- 适配 OpenAI Responses 风格中转站

## v0.4.0 - 通用 OpenAI 兼容中转站

提交：`a4d1af8 feat: support configurable ai relay provider`

- `/api/ai` 支持远程模型提供商
- 新增 `OPENAI_API_KEY`
- 新增 `OPENAI_BASE_URL`
- 新增 `OPENAI_MODEL`
- 新增 `AI_API_MODE=chat`
- 前端仍只调用同源 `/api/ai`，不暴露模型密钥

## v0.3.0 - 同源 AI API 与部署入口

提交：`757c02d feat: add shared ai api fallback`

- 新增网页和后续小程序共用的 `/api/ai`
- 未配置远程 AI 时，前端自动回退本地模板
- 统一 AI 输出 normalize
- 增加前端远程 AI 配置入口

相关部署提交：

- `a9c658e feat: prepare server deployment`
- `49d7b38 chore: version server deployment config`
- `08eea65 chore: align nginx deploy with sites-enabled`
- `96261c3 docs: add github deployment guide`

## v0.2.0 - 本地 AI 工作流 MVP

提交：`39c5283 feat: polish mobile navigation and reminders`

- 完成本地可交互 MVP
- 移动端导航和提醒体验优化
- 首页、老板档案、人设、开单准备、实时辅助、订单复盘、订单列表、话术库、设置页形成闭环
- 新增 smoke 测试基础覆盖

相关提交：

- `8116bc4 feat: add static MVP prototype`
- `e80e5f6 fix: separate generated strategy fields`
- `8477c4e feat: add phrase library and data settings`
- `78558e7 feat: structure boss profile updates`
- `912db9e feat: add order history filters`
- `619d9ed feat: add local ai output adapter`
- `41ce4d7 test: add smoke test script`
- `8500526 docs: define ai output contract`

## v0.1.0 - 需求文档基线

提交：`248469b docs: add product requirements`

- 添加需求文档
- 明确陪玩副驾 AI 的核心场景和 MVP 范围
- 作为后续版本开发的需求基线
