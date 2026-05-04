# AI 输出契约

当前应用通过本地模板模拟 AI 输出。后续接真实模型时，页面只依赖 `generateAiOutput(kind, payload)` 返回的结构化对象。

真实模型必须返回 JSON，不要返回 Markdown。所有话术都应短句优先，便于复制。当前版本要求输出更像陪玩临场备忘：内容要具体、有判断条件、有多条可直接发的话术，避免只给一两句泛泛建议。

网页和小程序后续共用服务端接口：

```text
POST /api/ai
```

浏览器前端不保存模型密钥。服务端从环境变量读取密钥，例如 `OPENAI_API_KEY`。

当前远程接口骨架行为：

- 未设置 `OPENAI_API_KEY`：返回 `503 AI_PROVIDER_NOT_CONFIGURED`
- 已设置 `OPENAI_API_KEY`：按 `AI_API_MODE` 调用模型接口
- `AI_API_MODE=chat`：调用 `{OPENAI_BASE_URL}/chat/completions`
- `AI_API_MODE=responses`：调用 `{OPENAI_BASE_URL}/responses`
- 前端收到错误会自动回退到本地模板

中转站建议配置：

```text
OPENAI_API_KEY=你的中转站 Key
OPENAI_BASE_URL=https://你的中转站域名/v1
OPENAI_MODEL=中转站支持的模型名
OPENAI_MODEL_PREP=
OPENAI_MODEL_ASSIST=
OPENAI_MODEL_REVIEW=
AI_API_MODE=chat
AI_TIMEOUT_MS=30000
AI_HTTP_CLIENT=fetch
OPENAI_MAX_OUTPUT_TOKENS=1200
OPENAI_RESPONSE_FORMAT=json_object
```

你的 `responses` 中转站配置示例：

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
OPENAI_MAX_OUTPUT_TOKENS=1200
OPENAI_RESPONSE_FORMAT=text
```

`OPENAI_BASE_URL` 可以写 `https://sub.zlove.tech` 或 `https://sub.zlove.tech/v1`，服务端会自动补齐 `/v1`。

如果服务器上 Node `fetch` 连接中转站超时，但命令行 `curl` 可以正常调用，设置：

```text
AI_HTTP_CLIENT=curl
```

如果中转站 responses 接口不支持 `text.format=json_object`，设置：

```text
OPENAI_RESPONSE_FORMAT=text
```

此时服务端会通过 prompt 要求模型输出 JSON，并继续解析模型返回的 JSON 文本。

按场景模型覆盖：

```text
OPENAI_MODEL_PREP=deepseek-chat
OPENAI_MODEL_ASSIST=deepseek-chat
OPENAI_MODEL_REVIEW=deepseek-reasoner
```

这些变量为空时，统一使用 `OPENAI_MODEL`。

## 通用安全规则

- 不诱导消费
- 不使用 PUA、情绪操控或羞辱话术
- 不建议陪玩欺骗老板
- 不收集敏感隐私
- 不生成过度暧昧或性暗示内容
- 不伪装 AI 直接和老板聊天
- 输出内容自然、克制、像真人能说出口
- 少用“首先、其次、综上、情绪价值、破冰、建立连接、建议你可以”等模板词
- 字符串字段可以用换行组织成多条短句，但不要输出 Markdown 列表
- 开单和复盘要给 2-3 条可直接复制的话术，实时辅助至少给稳妥、温柔、活泼、技术四种表达

## 开单准备 `prep`

输入来源：

- `player_profile`
- `boss_profile`
- `order_context`

返回结构：

```json
{
  "serviceStrategy": "本单服务策略",
  "opening": "开场话术",
  "topics": ["推荐聊天话题 1", "推荐聊天话题 2"],
  "warning": "老板雷点提醒",
  "avoid": ["不建议说的话 1", "不建议说的话 2"]
}
```

## 实时辅助 `assist`

输入来源：

- `player_profile`
- `boss_profile`
- `situation`

返回结构：

```json
{
  "judgment": "情绪判断",
  "currentStrategy": "当前最优策略",
  "reply": "推荐话术",
  "gentle": "温柔版本",
  "lively": "活泼版本",
  "technical": "技术版本",
  "avoid": ["不建议说的话 1", "不建议说的话 2"]
}
```

## 订单复盘 `review`

输入来源：

- `player_profile`
- `boss_profile`
- `order_review`

返回结构：

```json
{
  "summary": "本次订单总结",
  "profileUpdate": {
    "preferred_style": "建议写入老板偏好的内容",
    "disliked_style": "建议写入老板雷点的内容",
    "emotion_pattern": "建议写入情绪模式的内容",
    "notes": "建议写入备注的内容"
  },
  "nextOpening": "下次开场话术",
  "nextContact": "下次联系建议",
  "repurchase": "高 / 中高 / 中 / 低",
  "performance": "陪玩表现建议"
}
```

## 前端容错

前端会做轻量 normalize：

- 缺失的字符串字段会补为空字符串
- `topics` 和 `avoid` 会规范成数组
- `profileUpdate` 会规范成对象

但真实接口仍应尽量完整返回，避免页面出现空卡片。
