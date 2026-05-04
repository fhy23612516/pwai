# AI 输出契约

当前应用通过本地模板模拟 AI 输出。后续接真实模型时，页面只依赖 `generateAiOutput(kind, payload)` 返回的结构化对象。

真实模型必须返回 JSON，不要返回 Markdown。所有话术都应短句优先，便于复制。

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
AI_API_MODE=chat
AI_TIMEOUT_MS=30000
```

你的 `responses` 中转站配置示例：

```text
OPENAI_API_KEY=你的中转站 Key
OPENAI_BASE_URL=https://sub.zlove.tech
OPENAI_MODEL=gpt-5.4
AI_API_MODE=responses
OPENAI_REASONING_EFFORT=xhigh
OPENAI_DISABLE_RESPONSE_STORAGE=true
AI_TIMEOUT_MS=30000
```

`OPENAI_BASE_URL` 可以写 `https://sub.zlove.tech` 或 `https://sub.zlove.tech/v1`，服务端会自动补齐 `/v1`。

## 通用安全规则

- 不诱导消费
- 不使用 PUA、情绪操控或羞辱话术
- 不建议陪玩欺骗老板
- 不收集敏感隐私
- 不生成过度暧昧或性暗示内容
- 不伪装 AI 直接和老板聊天
- 输出内容自然、克制、像真人能说出口

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
