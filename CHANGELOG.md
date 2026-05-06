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

## v0.21.0 - 降低模拟聊天僵硬感

提交：`v0.21.0` tag 指向的 `fix: make simulator chat more natural`

- 老板模拟回复改为更短的即时聊天风格，减少“行/嗯/可以”固定开头和长句解释
- 删除本地兜底里生硬的固定评价式表达，避免反复出现“正常发挥”“别太客服感”等口吻
- 服务端 prompt 明确 `bossReply` 不能写成客服话术、完整建议文或心理分析
- 情景模拟里的情绪变化、信号解读和下一句建议改为默认折叠，主视图更接近普通聊天
- 自动测试覆盖真人短回复提示、折叠分析区和僵硬话术回归

## v0.20.0 - 老板人格蒸馏式模拟

提交：`v0.20.0` tag 指向的 `fix: vary simulated boss replies`

- 修复情景模拟本地兜底在“关系互动 / 未说明”场景反复输出同一句的问题
- 本地模拟改为先识别陪玩本轮意图，再按老板类型、长期记忆、关系信号、情绪和历史轮次生成老板回复
- 新增老板人格推断，覆盖慢热、上分、整活、倾诉、关系试探等不同表达习惯
- 远程 AI prompt 明确要求把老板档案蒸馏成稳定人格，接住 `chat_history`，不要每轮重新开场或重复同一段话
- 自动测试覆盖多轮模拟回复差异、人格蒸馏提示和重复模板回归

## v0.19.0 - 连续对话式情景模拟

提交：`v0.19.0` tag 指向的 `feat: add conversational boss simulator`

- 情景模拟从单次结果卡片改为 ChatGPT 式网页对话，陪玩发送一句，系统按老板人设回复一句
- 每个老板保留独立模拟会话，模拟消息写入账号数据并通过 `/api/state` 同步到服务器
- AI 请求新增 `chat_history`、`boss_memory`、`recent_memory`，生成时会接住上一轮，不再像重新开场
- 服务端 `/api/ai` 白名单补上 `simulate`，远程模型可以处理情景模拟
- 部署模板新增 `OPENAI_MODEL_SIMULATE`，支持给模拟场景单独指定模型
- 自动测试覆盖模拟会话持久化、历史对话 payload、服务端 simulate 白名单和文档配置

## v0.18.0 - 账号数据服务端同步

提交：`v0.18.0` tag 指向的 `feat: sync user app state on server`

- 新增 `/api/state`，按登录账号在服务器保存老板档案、订单、求助、收藏和设置
- 新增 `AUTH_DATA_FILE`，默认建议 `/etc/pwai/app-data.json`
- 前端登录后优先加载服务器数据，保存时同步上传；`localStorage` 只作为本机缓存和离线兜底
- 旧版本浏览器已有本地数据时，服务器还没有数据会自动上传一次完成迁移
- 部署文档增加 `app-data.json` 备份说明
- 自动测试覆盖跨设备同步接口、未登录保护和文档配置

## v0.17.0 - 老板情景模拟聊天

提交：`v0.17.0` tag 指向的 `feat: add boss chat simulator`

- 新增情景模拟入口，可选择老板后输入陪玩话术，模拟老板可能回复
- 新增 AI 场景 `simulate`，输出 `bossReply`、`emotionShift`、`readSignal`、`nextSuggestion`、`avoid`
- 模拟会参考老板长期画像、互动偏好、关系互动记忆、近期订单和求助片段
- 支持开局破冰、连输安抚、沉默、想聊天、关系互动、续单维护等训练场景
- 服务端 prompt、AI 契约和自动测试同步覆盖新场景

## v0.16.0 - 关系互动分流和长期记忆

提交：`v0.16.0` tag 指向的 `feat: route relationship memory by persona mode`

- 修正 v0.15.0 的关系判断口径：恋爱、暧昧、私聊、线下见面不再默认识别为风险
- 新增陪玩人设字段 `relationship_mode`，支持可恋爱感营业、只轻微暧昧、不做恋爱感、未说明多方案
- 只有色情、违法、胁迫、未成年、隐私勒索等内容作为硬风险拒绝推进
- 增加轻量 Hermes 式长期记忆字段：`memory_profile`、`memory_interaction_style`、`memory_relationship`、`memory_recent_signals`
- 开单、实时辅助、复盘会参考老板长期记忆和近期订单 / 求助片段
- 远程 AI 契约和服务端 prompt 同步改为关系互动分流，不再一刀切

## v0.15.0 - 关系边界记忆分析

提交：`v0.15.0` tag 指向的 `fix: analyze relationship boundary memory`

注意：该版本把恋爱、暧昧、私联、线下见面默认按边界风险处理；后续 `v0.16.0` 已修正为按陪玩营业意愿分流。

- 新增关系边界风险识别，覆盖谈恋爱、暧昧、私联、线下见面、奔现等信号
- 开单准备会把老板记忆里的关系信号分析为边界风险，并给出转回游戏体验的策略
- 实时辅助会在当前局势或老板记忆触发边界风险时，输出温和但不升级关系的话术
- 订单复盘会把关系边界写入 `memory_direction`、`memory_risks`、`memory_next_probe`，避免只存普通备注
- 服务端 prompt 要求远程模型不能把恋爱/私联/线下信号当成普通偏好
- 自动测试覆盖本地生成、远程 prompt 和 AI 契约文档

## v0.14.0 - 表单属性影响 AI 生成

提交：`v0.14.0` tag 指向的 `fix: make ai use form attributes`

- 修复更改本单属性后，AI 输出像关键词替换的问题
- 开单准备显式读取 `duration`、`emotion`、`is_old`、`need_active`、`goal`、`style`
- 实时辅助显式读取 `game_state`、`reply_style`、`soft`、`humor`
- 订单复盘显式读取 `had_silence`、`renewed`、`complaint`、`boss_emotion` 等字段
- 服务端 prompt 要求远程 AI 不能只替换老板名、游戏名或关键词
- 自动测试覆盖不同表单属性会生成明显不同策略

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
