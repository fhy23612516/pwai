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
- 不生成色情、违法犯罪、胁迫、未成年、隐私勒索相关内容
- 不伪装 AI 直接和老板聊天
- 输出内容自然、克制、像真人能说出口
- 少用“首先、其次、综上、情绪价值、破冰、建立连接、建议你可以”等模板词
- 字符串字段可以用换行组织成多条短句，但不要输出 Markdown 列表
- 开单和复盘要给 2-3 条可直接复制的话术，实时辅助至少给稳妥、温柔、活泼、技术四种表达
- 如果 `boss_profile` 有老板记忆字段，应优先参考记忆，而不是每次重新泛化判断
- 必须让表单属性实质影响输出，不能只替换游戏名、老板名或关键词
- 普通恋爱感、暧昧、线下见面、私聊在陪玩场景中不默认禁止；必须结合 `player_profile.relationship_mode` 和本单需求生成不同路线
- 硬风险只包括色情、违法犯罪、胁迫、未成年、隐私勒索等内容，这类内容必须拒绝推进并回到正常服务

## 字段影响要求

- 开单准备必须参考 `game`、`goal`、`duration`、`emotion`、`style`、`is_old`、`need_active`
- 实时辅助必须参考 `situation`、`emotion`、`game_state`、`reply_style`、`soft`、`humor`
- 订单复盘必须参考 `duration`、`result`、`boss_emotion`、`had_silence`、`renewed`、`complaint`、`important_notes`、`good_points`、`improvements`
- 如果这些字段变化，输出里的策略、话术、提醒至少要有两处明显变化
- 如果 `boss_profile` 有长期记忆字段，模型必须像检索记忆一样引用，不要只看当前表单

## 轻量 Hermes 式记忆

老板档案里维护四类长期记忆，生成时优先参考：

- `memory_profile`：稳定画像，例如客户类型、消费动机、情绪模式
- `memory_interaction_style`：互动偏好，例如喜欢报点、整活、倾诉、安静陪伴
- `memory_relationship`：关系互动记忆，例如吃恋爱感、只喜欢玩笑暧昧、抗拒亲密感
- `memory_recent_signals`：近期信号，例如最近提到的状态、关系推进、投诉或复购意愿

同时保留原有执行型记忆：

- `memory_direction`
- `memory_openers`
- `memory_effective_lines`
- `memory_risks`
- `memory_next_probe`

## 关系互动信号

当老板档案或复盘内容里出现恋爱、暧昧、私聊、线下见面等信号时，AI 必须先判断陪玩本人的关系营业意愿：

- `可恋爱感营业`：可以生成轻度恋爱感和专属感话术，但仍避免色情、违法、胁迫和隐私勒索
- `只轻微暧昧`：可以接一点暧昧和玩笑，不继续给现实关系承诺
- `不做恋爱感`：温和接住后转回正常陪玩体验
- `未说明，多方案考虑`：同时给可推进、轻微暧昧、不推进三种路线，让陪玩选择

复盘时要把关系互动写入 `memory_relationship`、`memory_recent_signals`、`memory_direction`、`memory_next_probe`，避免只把“老板想谈恋爱”当一句普通备注。

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

## 情景模拟 `simulate`

输入来源：

- `player_profile`
- `boss_profile`
- `scenario`
- `emotion`
- `game_state`
- `player_message`
- `chat_context`
- `chat_history`
- `boss_memory`
- `recent_memory`

返回结构：

```json
{
  "bossReply": "老板这一轮会说出口的一段回复",
  "emotionShift": "他现在大概什么状态，用陪玩能扫一眼懂的短句写",
  "readSignal": "这轮看出来什么，用口语小抄写",
  "nextSuggestion": "下一句怎么接，直接给能说出口的话",
  "avoid": ["别踩的点 1", "别踩的点 2"]
}
```

情景模拟是 ChatGPT 式连续对话训练。`bossReply` 只写老板当前这一轮回复，不要写多个候选项；优先像即时通讯里的真人短消息，允许短句、停顿和轻微口癖，不要写成客服话术、完整建议文或心理分析。`emotionShift`、`readSignal`、`nextSuggestion` 是陪玩自己看的小抄，前端默认折叠展示，不能写成报告腔；少用“情绪变化、信号解读、关系推进、策略、方案、建议你可以”等词。生成时必须把老板档案蒸馏成稳定人格，根据老板长期画像、互动偏好、关系互动记忆、近期订单 / 求助片段和 `chat_history` 接住上一轮，不要像重新开场，也不要反复输出同一句模板。

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
    "notes": "建议写入备注的内容",
    "memory_profile": "稳定长期画像",
    "memory_interaction_style": "互动偏好",
    "memory_relationship": "关系互动记忆",
    "memory_recent_signals": "近期信号",
    "memory_direction": "后续沟通方向",
    "memory_openers": "可复用开场话术",
    "memory_effective_lines": "已经验证有效的话术",
    "memory_risks": "下次应避开的风险",
    "memory_next_probe": "下次需要观察的问题"
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
