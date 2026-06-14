const STORAGE_KEY = "pwai-state-v1";
let currentUser = null;
let activeStorageKey = STORAGE_KEY;
let remoteStateReady = false;
let remoteSaveTimer = 0;

const navItems = [
  { id: "home", label: "首页", icon: "H", title: "首页", eyebrow: "工作台" },
  { id: "bosses", label: "老板", icon: "B", title: "老板列表", eyebrow: "客户档案" },
  { id: "persona", label: "人设", icon: "P", title: "陪玩人设", eyebrow: "个人风格" },
  { id: "prep", label: "开单", icon: "S", title: "开单准备", eyebrow: "订单开始前" },
  { id: "assist", label: "求助", icon: "A", title: "实时辅助", eyebrow: "订单进行中" },
  { id: "simulate", label: "模拟", icon: "M", title: "情景模拟", eyebrow: "聊天训练" },
  { id: "review", label: "复盘", icon: "R", title: "订单复盘", eyebrow: "订单结束后" },
  { id: "orders", label: "订单", icon: "O", title: "历史订单", eyebrow: "服务复盘" },
  { id: "library", label: "话术", icon: "L", title: "话术库", eyebrow: "常用收藏" },
  { id: "settings", label: "设置", icon: "T", title: "设置", eyebrow: "数据管理" },
];

const routeMeta = {
  reminders: { title: "联系提醒", eyebrow: "客户维护" },
};

const styleOptions = [
  "元气搞笑型",
  "温柔陪伴型",
  "技术带飞型",
  "甜妹型",
  "高冷反差型",
  "兄弟开黑型",
  "二次元整活型",
  "毒舌但有分寸型",
  "安静陪伴型",
  "情绪安抚型",
];

const customerTypes = [
  "上分型",
  "娱乐型",
  "倾诉型",
  "沉默型",
  "整活型",
  "慢热型",
  "高消费型",
  "低频型",
];

const emotionOptions = [
  "开心",
  "沉默",
  "暴躁",
  "尴尬",
  "疲惫",
  "失落",
  "想倾诉",
  "想上分",
  "想整活",
  "不想说话",
  "输游戏后烦躁",
];

const relationshipModeOptions = [
  "未说明，多方案考虑",
  "可恋爱感营业",
  "只轻微暧昧",
  "不做恋爱感",
];

const aiKinds = {
  prep: "prep",
  assist: "assist",
  simulate: "simulate",
  review: "review",
};

const aiOutputSchemas = {
  prep: ["serviceStrategy", "opening", "topics", "warning", "avoid"],
  assist: ["judgment", "currentStrategy", "reply", "gentle", "lively", "technical", "avoid"],
  simulate: ["bossReply", "emotionShift", "readSignal", "nextSuggestion", "avoid"],
  review: ["summary", "profileUpdate", "nextOpening", "nextContact", "repurchase", "performance"],
};

const localAiProvider = {
  prep: generatePrep,
  assist: generateAssist,
  simulate: generateSimulate,
  review: generateReview,
};

const defaultState = {
  persona: {
    nickname: "小鹿",
    style: "温柔陪伴型",
    main_games: "王者荣耀, 瓦罗兰特",
    tone: "自然、温柔、轻松，不过度撒娇",
    avoid_tone: "油腻、夸张、客服感、过度暧昧",
    can_joke: "可以，轻松有分寸",
    active_level: "中等主动",
    relationship_mode: "未说明，多方案考虑",
    notes: "适合慢热型、倾诉型和轻松娱乐型老板",
  },
  bosses: [
    {
      id: "boss-achen",
      nickname: "阿辰",
      remark: "瓦老板",
      games: "瓦罗兰特",
      play_time: "晚上 8 点后",
      customer_type: ["慢热型", "娱乐型"],
      preferred_style: "轻松自然，不要太吵",
      disliked_style: "过度撒娇、催单",
      favorite_topics: "游戏操作、轻松吐槽、上次名场面",
      avoid_topics: "现实隐私、收入、感情问题",
      emotion_pattern: "输游戏后容易沉默，赢了之后会主动聊天",
      memory_direction: "先低压陪打，等他主动接话后再聊上次名场面。",
      memory_openers: "老板今天还打瓦吗？先轻松热两把，不急着上压力。\n上次后面那把手感挺顺，今天还按那个节奏来吗？",
      memory_effective_lines: "你要是不想说话也没事，我先多帮你看信息。\n这波位置挺舒服，咱们先把节奏稳住。",
      memory_risks: "不要追问沉默原因；不要催时长；不要评价刚才失误。",
      memory_next_probe: "观察第一把输了之后是否还接话；如果接话慢就降低闲聊密度。",
      memory_profile: "慢热娱乐型瓦老板，输局后需要低压陪打，状态顺了会主动聊天。",
      memory_interaction_style: "先游戏信息和短句陪伴，等他主动接话后再聊上次名场面。",
      memory_relationship: "关系互动保持轻松熟客感，不突然拉近距离。",
      memory_recent_signals: "最近提到工作累，开局不适合强行热场。",
      repurchase_level: "中高",
      last_order_at: "2026-05-01",
      notes: "适合从上次游戏表现切入，不要一开始太热闹。",
    },
    {
      id: "boss-xiaochen",
      nickname: "小陈",
      remark: "王者上分",
      games: "王者荣耀",
      play_time: "下午或深夜",
      customer_type: ["上分型"],
      preferred_style: "技术稳定，少说废话，逆风时给明确思路",
      disliked_style: "乱开玩笑、声音太吵",
      favorite_topics: "阵容、节奏、英雄强度",
      avoid_topics: "评价他的操作、强行闲聊",
      emotion_pattern: "逆风时容易烦躁，需要明确指挥",
      memory_direction: "少闲聊，多给明确游戏信息和下一波目标。",
      memory_openers: "老板今天打王者的话，我先帮你看阵容和节奏。\n前两把咱们稳一点，先把开局处理舒服。",
      memory_effective_lines: "这波先别急接，我们等技能再打。\n我帮你看小地图，你专心操作就行。",
      memory_risks: "不要乱开玩笑；不要说他操作问题；逆风时别长篇复盘。",
      memory_next_probe: "记录他更吃哪种指挥：报点型、节奏型还是英雄克制型。",
      memory_profile: "目标明确的上分型老板，重视节奏、阵容和稳定结果。",
      memory_interaction_style: "少闲聊，多给明确游戏信息和下一波目标。",
      memory_relationship: "关系感以专业可靠为主，不主动整暧昧气氛。",
      memory_recent_signals: "逆风时容易烦躁，短句指挥比解释更有效。",
      repurchase_level: "中",
      last_order_at: "2026-05-02",
      notes: "更重视结果和稳定情绪。",
    },
    {
      id: "boss-nanfeng",
      nickname: "南风",
      remark: "整活搭子",
      games: "和平精英",
      play_time: "周末晚上",
      customer_type: ["整活型", "娱乐型"],
      preferred_style: "能接梗，气氛活跃",
      disliked_style: "太严肃、一直指挥",
      favorite_topics: "节目效果、名场面、装备玄学",
      avoid_topics: "严肃复盘、掉分压力",
      emotion_pattern: "喜欢开玩笑，不喜欢太严肃",
      memory_direction: "先接梗和节目效果，关键团前再收回来提醒信息。",
      memory_openers: "老板今天还快乐局吗？赢了血赚，输了也有素材。\n上次节目效果挺足，今天看看还能不能复刻。",
      memory_effective_lines: "这波节目效果拉满了，但下一波我帮你盯一下关键信息。\n先整活归整活，能赢咱也不放过。",
      memory_risks: "不要严肃复盘；不要一直指挥；不要把掉分压力挂嘴边。",
      memory_next_probe: "观察他今天想纯整活还是边玩边赢，别一开始就太认真。",
      memory_profile: "整活娱乐型老板，喜欢节目效果和轻松氛围。",
      memory_interaction_style: "先接梗和节目效果，关键团前再收回来提醒信息。",
      memory_relationship: "适合熟人式玩笑感，别突然严肃或过度服务腔。",
      memory_recent_signals: "周末晚上更容易想快乐局，输赢压力放后面。",
      repurchase_level: "高",
      last_order_at: "2026-05-03",
      notes: "适合快乐局，赢了血赚，输了也能做素材。",
    },
  ],
  orders: [
    {
      id: "order-1",
      boss_id: "boss-achen",
      game: "瓦罗兰特",
      duration: "2 小时",
      result: "整体体验较好",
      boss_emotion: "前期沉默，后期开心",
      had_silence: true,
      renewed: false,
      important_notes: "老板说最近工作比较累。",
      review_summary: "老板需要轻松陪伴，不适合强行热场。",
      next_contact_suggestion: "建议 2-3 天后晚上 8 点左右自然联系。",
      created_at: "2026-05-04",
    },
  ],
  assists: [],
  simulations: [],
  favorites: [],
  settings: {
    ai_provider: "local",
    remote_endpoint: "/api/ai",
  },
};

let state = structuredClone(defaultState);
let currentBossFilter = "全部老板";
let currentOrderFilter = "全部订单";
let selectedBossId = null;
let selectedSimulationId = null;

const appView = document.querySelector("#app-view");
const nav = document.querySelector("#app-nav");
const viewTitle = document.querySelector("#view-title");
const viewEyebrow = document.querySelector("#view-eyebrow");
const toast = document.querySelector("#toast");

function loadState() {
  const raw = localStorage.getItem(activeStorageKey);
  if (!raw) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(activeStorageKey, JSON.stringify(state));
  queueRemoteStateSave();
}

async function initializeSession() {
  let localState = null;
  try {
    const response = await fetch("/api/session", { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (data.authenticated && data.user?.id) {
      currentUser = data.user;
      activeStorageKey = `${STORAGE_KEY}:${data.user.id}`;
    }
  } catch {
    currentUser = null;
    activeStorageKey = STORAGE_KEY;
  }
  localState = loadState();
  state = localState;
  if (currentUser) {
    await loadRemoteState(localState);
  }
}

async function loadRemoteState(localState) {
  try {
    const response = await fetch("/api/state", { headers: { Accept: "application/json" } });
    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }
    const data = await response.json();
    if (response.ok && data.state) {
      state = normalizeImportedState(data.state);
      localStorage.setItem(activeStorageKey, JSON.stringify(state));
    } else if (response.ok && localState) {
      state = normalizeImportedState(localState);
      await saveStateRemoteNow();
    }
    remoteStateReady = true;
  } catch {
    remoteStateReady = false;
  }
}

function queueRemoteStateSave() {
  if (!currentUser || !remoteStateReady) return;
  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = window.setTimeout(() => {
    saveStateRemoteNow().catch(() => {
      remoteStateReady = false;
      toastMessage("服务器数据同步失败，已先保存在本机");
    });
  }, 250);
}

async function saveStateRemoteNow() {
  if (!currentUser) return;
  const response = await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  if (response.status === 401) {
    window.location.assign("/login");
    return;
  }
  if (!response.ok) throw new Error("REMOTE_STATE_SAVE_FAILED");
  remoteStateReady = true;
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateText) {
  if (!dateText) return 999;
  const then = new Date(`${dateText}T00:00:00`);
  const now = new Date(`${today()}T00:00:00`);
  return Math.max(0, Math.round((now - then) / 86400000));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value ?? "")
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toastMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toast.dataset.timer);
  toast.dataset.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function setRoute(route) {
  window.location.hash = route;
}

function route() {
  const value = window.location.hash.replace("#", "");
  return value || "home";
}

function renderNav() {
  nav.innerHTML = navItems
    .map(
      (item) => `
        <button class="nav-item ${route().startsWith(item.id) ? "active" : ""}" type="button" data-route="${item.id}">
          <span class="nav-icon" aria-hidden="true">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `,
    )
    .join("");

  nav.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
  });
}

function setHeader(idValue) {
  const base = idValue.split("/")[0];
  const item = navItems.find((navItem) => navItem.id === base) || routeMeta[base] || navItems[0];
  viewTitle.textContent = item.title;
  viewEyebrow.textContent = item.eyebrow;
}

function emptyState(title, description) {
  return `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">+</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function repurchaseClass(level) {
  if (String(level).includes("高")) return "high";
  if (String(level).includes("中")) return "medium";
  return "warn";
}

function getBoss(bossId) {
  const boss = state.bosses.find((item) => item.id === bossId);
  return boss ? normalizeBoss(boss) : undefined;
}

function bossSelect(name = "boss_id", selected = "") {
  return `
    <select name="${name}" required>
      ${state.bosses
        .map((boss) => `<option value="${boss.id}" ${boss.id === selected ? "selected" : ""}>${escapeHtml(boss.nickname)} · ${escapeHtml(boss.games)}</option>`)
        .join("")}
    </select>
  `;
}

function normalizeBossMemory(boss) {
  return {
    memory_direction: boss.memory_direction || "",
    memory_openers: boss.memory_openers || "",
    memory_effective_lines: boss.memory_effective_lines || "",
    memory_risks: boss.memory_risks || "",
    memory_next_probe: boss.memory_next_probe || "",
    memory_profile: boss.memory_profile || "",
    memory_interaction_style: boss.memory_interaction_style || "",
    memory_relationship: boss.memory_relationship || "",
    memory_recent_signals: boss.memory_recent_signals || "",
  };
}

function bossMemoryText(boss) {
  const memory = normalizeBossMemory(boss || {});
  return [
    memory.memory_profile ? `长期画像：${memory.memory_profile}` : "",
    memory.memory_interaction_style ? `互动偏好：${memory.memory_interaction_style}` : "",
    memory.memory_relationship ? `关系互动：${memory.memory_relationship}` : "",
    memory.memory_recent_signals ? `近期信号：${memory.memory_recent_signals}` : "",
    memory.memory_direction ? `沟通方向：${memory.memory_direction}` : "",
    memory.memory_openers ? `可复用开场：${memory.memory_openers}` : "",
    memory.memory_effective_lines ? `有效话术：${memory.memory_effective_lines}` : "",
    memory.memory_risks ? `风险提醒：${memory.memory_risks}` : "",
    memory.memory_next_probe ? `下次观察：${memory.memory_next_probe}` : "",
  ].filter(Boolean).join("\n");
}

function bossRecentMemoryText(bossId, limit = 3) {
  if (!bossId) return "";
  const orders = state.orders
    .filter((order) => order.boss_id === bossId)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, limit)
    .map((order) => [
      order.created_at ? `${order.created_at}` : "",
      order.game ? `${order.game}` : "",
      order.boss_emotion ? `情绪:${order.boss_emotion}` : "",
      order.important_notes ? `重点:${order.important_notes}` : "",
      order.review_summary ? `复盘:${order.review_summary}` : "",
    ].filter(Boolean).join(" / "));
  const assists = state.assists
    .filter((assist) => assist.boss_id === bossId)
    .slice(0, limit)
    .map((assist) => [
      assist.created_at ? `${assist.created_at}` : "",
      assist.emotion ? `情绪:${assist.emotion}` : "",
      assist.situation ? `情况:${assist.situation}` : "",
      assist.suggestion ? `策略:${assist.suggestion}` : "",
    ].filter(Boolean).join(" / "));

  return [
    orders.length ? `近期订单：${orders.join("\n")}` : "",
    assists.length ? `近期求助：${assists.join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

function normalizeBoss(boss) {
  return {
    ...boss,
    ...normalizeBossMemory(boss || {}),
  };
}

function generateAiOutput(kind, payload) {
  const provider = localAiProvider[kind];
  if (!provider) {
    throw new Error(`未知 AI 场景：${kind}`);
  }
  return normalizeAiOutput(kind, provider(payload));
}

async function generateAiOutputAsync(kind, payload) {
  if (state.settings?.ai_provider !== "remote") {
    return generateAiOutput(kind, payload);
  }

  try {
    const response = await fetch(state.settings.remote_endpoint || "/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        payload,
        player_profile: state.persona,
        boss_profile: payload?.boss_id ? getBoss(payload.boss_id) : null,
      }),
    });
    const data = await response.json();
    if (response.status === 401 && data.error === "AUTH_REQUIRED") {
      window.location.assign("/login");
      throw new Error("登录已过期，请重新登录");
    }
    if (!response.ok || data.ok === false) {
      throw new Error(data.message || data.error || "远程 AI 请求失败");
    }
    return normalizeAiOutput(kind, data.output || data);
  } catch (error) {
    toastMessage(`远程 AI 不可用，已使用本地模板：${error.message}`);
    return generateAiOutput(kind, payload);
  }
}

function normalizeAiOutput(kind, output) {
  const schema = aiOutputSchemas[kind];
  if (!schema) {
    throw new Error(`未知 AI 输出结构：${kind}`);
  }
  const normalized = { ...output, kind };
  for (const field of schema) {
    if (!(field in normalized)) {
      normalized[field] = Array.isArray(defaultAiFieldValue(field)) ? [] : "";
    }
  }
  if (kind === aiKinds.prep) {
    normalized.topics = splitList(normalized.topics);
    normalized.avoid = splitList(normalized.avoid);
  }
  if (kind === aiKinds.assist) {
    normalized.avoid = splitList(normalized.avoid);
  }
  if (kind === aiKinds.simulate) {
    normalized.avoid = splitList(normalized.avoid);
  }
  if (kind === aiKinds.review) {
    normalized.profileUpdate = normalizeProfileUpdate(normalized.profileUpdate);
  }
  return normalized;
}

function defaultAiFieldValue(field) {
  return ["topics", "avoid"].includes(field) ? [] : "";
}

function normalizeProfileUpdate(profileUpdate) {
  if (profileUpdate && typeof profileUpdate === "object" && !Array.isArray(profileUpdate)) {
    return {
      preferred_style: profileUpdate.preferred_style || "",
      disliked_style: profileUpdate.disliked_style || "",
      emotion_pattern: profileUpdate.emotion_pattern || "",
      notes: profileUpdate.notes || "",
      memory_direction: profileUpdate.memory_direction || "",
      memory_openers: profileUpdate.memory_openers || "",
      memory_effective_lines: profileUpdate.memory_effective_lines || "",
      memory_risks: profileUpdate.memory_risks || "",
      memory_next_probe: profileUpdate.memory_next_probe || "",
      memory_profile: profileUpdate.memory_profile || "",
      memory_interaction_style: profileUpdate.memory_interaction_style || "",
      memory_relationship: profileUpdate.memory_relationship || "",
      memory_recent_signals: profileUpdate.memory_recent_signals || "",
    };
  }
  return {
    preferred_style: "",
    disliked_style: "",
    emotion_pattern: "",
    notes: String(profileUpdate || ""),
    memory_direction: "",
    memory_openers: "",
    memory_effective_lines: "",
    memory_risks: "",
    memory_next_probe: "",
    memory_profile: "",
    memory_interaction_style: "",
    memory_relationship: "",
    memory_recent_signals: "",
  };
}

function renderHome() {
  const reminders = getReminders();
  const highRepurchase = state.bosses.filter((boss) => String(boss.repurchase_level).includes("高"));
  const silenceOrders = state.orders.filter((order) => order.had_silence);
  const recentOrders = [...state.orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);

  appView.innerHTML = `
    <div class="grid auto">
      <article class="metric-card">
        <span>今日待联系老板</span>
        <strong>${reminders.length}</strong>
        <p>${reminders[0] ? `优先联系 ${escapeHtml(reminders[0].nickname)}，上次体验${escapeHtml(reminders[0].experience)}。` : "暂无必须联系的老板。"}</p>
      </article>
      <article class="metric-card">
        <span>高复购老板</span>
        <strong>${highRepurchase.length}</strong>
        <p>保持自然维护，避免催单和过度打扰。</p>
      </article>
      <article class="metric-card">
        <span>最近冷场订单</span>
        <strong>${silenceOrders.length}</strong>
        <p>复盘沉默节点，提前准备低压力开场。</p>
      </article>
    </div>

    <div class="grid two" style="margin-top: 16px;">
      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">快捷入口</h3>
            <p class="card-subtitle">常用动作放在第一屏，适合手机端快速操作。</p>
          </div>
        </div>
        <div class="card-body">
          <div class="quick-grid">
            <button class="primary-button" type="button" data-route="bosses/new">新建老板</button>
            <button class="secondary-button" type="button" data-route="prep">开单准备</button>
            <button class="secondary-button" type="button" data-route="assist">实时求助</button>
            <button class="secondary-button" type="button" data-route="review">写订单复盘</button>
            <button class="ghost-button" type="button" data-route="persona">陪玩人设</button>
            <button class="ghost-button" type="button" data-route="orders">历史订单</button>
            <button class="ghost-button" type="button" data-route="library">话术库</button>
            <button class="ghost-button" type="button" data-route="settings">设置</button>
          </div>
        </div>
      </section>

      ${currentUser?.is_admin ? renderAccessLogPanel() : ""}

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">AI 今日建议</h3>
            <p class="card-subtitle">根据订单和老板档案生成的轻量提醒。</p>
          </div>
        </div>
        <div class="card-body">
          <div class="ai-output">
            ${outputCard("维护重点", reminders.length ? `优先联系 ${reminders.slice(0, 3).map((item) => item.nickname).join("、")}。话术从上次体验切入，不直接催单。` : "今天可以整理最近订单，把老板雷点和偏好补全。")}
            ${outputCard("服务提醒", "遇到沉默或输局烦躁时，先降低聊天压力，再给明确陪伴感。不要追问隐私，不评价老板操作。")}
          </div>
        </div>
      </section>
    </div>

    <div class="grid two" style="margin-top: 16px;">
      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">今日待联系</h3>
            <p class="card-subtitle">基于上次订单时间和复购概率的本地提醒。</p>
          </div>
          <button class="ghost-button compact" type="button" data-route="reminders">查看全部</button>
        </div>
        <div class="card-body">
          ${reminders.length ? `<div class="list">${reminders.slice(0, 3).map(renderReminderCard).join("")}</div>` : emptyState("暂无联系提醒", "有订单记录后会自动生成自然维护建议。")}
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">最近订单</h3>
            <p class="card-subtitle">用于快速复盘和更新老板画像。</p>
          </div>
        </div>
        <div class="card-body">
          ${recentOrders.length ? `<div class="list">${recentOrders.map(renderOrderCard).join("")}</div>` : emptyState("暂无订单", "完成订单复盘后会出现在这里。")}
        </div>
      </section>
    </div>
  `;

  bindRouteButtons();
  bindCopyButtons();
}

function renderBosses() {
  const filters = ["全部老板", "高复购", "最近下单", "久未联系", "情绪陪伴型", "技术上分型", "娱乐整活型"];
  const bosses = filterBosses(currentBossFilter);

  appView.innerHTML = `
    <div class="grid" style="gap: 14px;">
      <section class="card pad">
        <div class="boss-card-head">
          <div>
            <h3 class="card-title">老板档案</h3>
            <p class="card-subtitle">记录偏好、雷点、情绪模式和历史订单。</p>
          </div>
          <button class="primary-button compact" type="button" data-route="bosses/new">新建老板</button>
        </div>
        <div class="filter-row" style="margin-top: 16px;">
          ${filters.map((filter) => `<button class="filter-button ${filter === currentBossFilter ? "active" : ""}" type="button" data-filter="${filter}">${filter}</button>`).join("")}
        </div>
      </section>

      ${bosses.length ? `<div class="grid auto">${bosses.map(renderBossCard).join("")}</div>` : emptyState("没有符合条件的老板", "切换筛选条件，或先新建一个老板档案。")}
    </div>
  `;

  bindRouteButtons();
  appView.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentBossFilter = button.dataset.filter;
      render();
    });
  });
}

function filterBosses(filter) {
  const sorted = [...state.bosses].sort((a, b) => b.last_order_at.localeCompare(a.last_order_at));
  if (filter === "高复购") return sorted.filter((boss) => String(boss.repurchase_level).includes("高"));
  if (filter === "最近下单") return sorted.filter((boss) => daysSince(boss.last_order_at) <= 7);
  if (filter === "久未联系") return sorted.filter((boss) => daysSince(boss.last_order_at) >= 3);
  if (filter === "情绪陪伴型") return sorted.filter((boss) => hasAny(boss, ["倾诉型", "慢热型", "沉默型"]));
  if (filter === "技术上分型") return sorted.filter((boss) => hasAny(boss, ["上分型"]));
  if (filter === "娱乐整活型") return sorted.filter((boss) => hasAny(boss, ["娱乐型", "整活型"]));
  return sorted;
}

function hasAny(boss, values) {
  const text = `${boss.customer_type?.join(" ")} ${boss.preferred_style} ${boss.notes}`;
  return values.some((value) => text.includes(value));
}

function renderBossCard(boss) {
  const days = daysSince(boss.last_order_at);
  const shouldContact = days >= 2 || String(boss.repurchase_level).includes("高");
  return `
    <article class="boss-card">
      <div class="boss-card-head">
        <div>
          <h3>${escapeHtml(boss.nickname)}</h3>
          <div class="meta">${escapeHtml(boss.remark || "未备注")} · ${escapeHtml(boss.games || "未记录游戏")}</div>
        </div>
        <span class="status-pill ${repurchaseClass(boss.repurchase_level)}">${escapeHtml(boss.repurchase_level || "未知")}</span>
      </div>
      <div class="tag-row">
        ${splitList(boss.customer_type).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        ${shouldContact ? `<span class="status-pill high">建议联系</span>` : ""}
      </div>
      <div class="meta">偏好：${escapeHtml(boss.preferred_style || "未记录")}</div>
      <div class="meta">最近情绪：${escapeHtml(boss.emotion_pattern || "未记录")}</div>
      <div class="meta">上次订单：${escapeHtml(boss.last_order_at || "未记录")} · ${days} 天前</div>
      <div class="button-row">
        <button class="secondary-button compact" type="button" data-route="bosses/${boss.id}">查看详情</button>
        <button class="ghost-button compact" type="button" data-route="prep/${boss.id}">开始本单</button>
        <button class="ghost-button compact" type="button" data-route="review/${boss.id}">写复盘</button>
      </div>
    </article>
  `;
}

function renderBossDetail(bossId) {
  const boss = getBoss(bossId);
  if (!boss) {
    appView.innerHTML = emptyState("没有找到老板档案", "返回老板列表后重新选择。");
    return;
  }

  const orders = state.orders.filter((order) => order.boss_id === boss.id).sort((a, b) => b.created_at.localeCompare(a.created_at));

  appView.innerHTML = `
    <div class="grid two">
      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${escapeHtml(boss.nickname)}</h3>
            <p class="card-subtitle">${escapeHtml(boss.remark || "未备注")} · ${escapeHtml(boss.games || "未记录游戏")}</p>
          </div>
          <span class="status-pill ${repurchaseClass(boss.repurchase_level)}">${escapeHtml(boss.repurchase_level || "未知")}</span>
        </div>
        <div class="card-body">
          <div class="tag-row">
            ${splitList(boss.customer_type).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="divider"></div>
          <div class="grid">
            ${detailLine("常玩时间", boss.play_time)}
            ${detailLine("喜欢的陪玩风格", boss.preferred_style)}
            ${detailLine("不喜欢的陪玩风格", boss.disliked_style)}
            ${detailLine("喜欢的话题", boss.favorite_topics)}
            ${detailLine("不喜欢的话题", boss.avoid_topics)}
            ${detailLine("情绪模式", boss.emotion_pattern)}
            ${detailLine("雷点 / 备注", boss.notes)}
          </div>
          <div class="divider"></div>
          <div class="grid">
            ${detailLine("长期画像", boss.memory_profile)}
            ${detailLine("互动偏好", boss.memory_interaction_style)}
            ${detailLine("关系互动", boss.memory_relationship)}
            ${detailLine("近期信号", boss.memory_recent_signals)}
            ${detailLine("沟通方向记忆", boss.memory_direction)}
            ${detailLine("可复用开场", boss.memory_openers)}
            ${detailLine("有效话术", boss.memory_effective_lines)}
            ${detailLine("风险提醒", boss.memory_risks)}
            ${detailLine("下次观察点", boss.memory_next_probe)}
          </div>
          <div class="button-row" style="margin-top: 16px;">
            <button class="primary-button compact" type="button" data-route="bosses/edit/${boss.id}">编辑档案</button>
            <button class="secondary-button compact" type="button" data-route="prep/${boss.id}">开始本单</button>
            <button class="secondary-button compact" type="button" data-route="review/${boss.id}">写复盘</button>
            <button class="danger-button compact" type="button" data-delete-boss="${boss.id}">删除</button>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">历史订单</h3>
            <p class="card-subtitle">复盘会沉淀到这里，辅助后续开单。</p>
          </div>
        </div>
        <div class="card-body">
          ${orders.length ? `<div class="list">${orders.map(renderOrderCard).join("")}</div>` : emptyState("暂无历史订单", "完成订单复盘后会自动记录。")}
        </div>
      </section>
    </div>
  `;

  bindRouteButtons();
  appView.querySelector("[data-delete-boss]")?.addEventListener("click", () => deleteBoss(boss.id));
}

function detailLine(label, value) {
  return `<div><div class="meta">${escapeHtml(label)}</div><div>${escapeHtml(value || "未记录")}</div></div>`;
}

function renderBossForm(mode, bossId = "") {
  const boss =
    mode === "edit"
      ? getBoss(bossId)
      : {
          nickname: "",
          remark: "",
          games: "",
          play_time: "",
          customer_type: ["慢热型"],
          preferred_style: "",
          disliked_style: "",
          favorite_topics: "",
          avoid_topics: "",
          emotion_pattern: "",
          memory_direction: "",
          memory_openers: "",
          memory_effective_lines: "",
          memory_risks: "",
          memory_next_probe: "",
          memory_profile: "",
          memory_interaction_style: "",
          memory_relationship: "",
          memory_recent_signals: "",
          repurchase_level: "中",
          last_order_at: today(),
          notes: "",
        };

  if (!boss) {
    appView.innerHTML = emptyState("没有找到老板档案", "返回老板列表后重新选择。");
    return;
  }

  appView.innerHTML = `
    <form class="card" id="boss-form">
      <div class="card-header">
        <div>
          <h3 class="card-title">${mode === "edit" ? "编辑老板档案" : "新建老板档案"}</h3>
          <p class="card-subtitle">只记录服务偏好和游戏体验相关信息。</p>
        </div>
      </div>
      <div class="card-body">
        <div class="form-grid">
          ${inputField("老板昵称", "nickname", boss.nickname, true)}
          ${inputField("备注名", "remark", boss.remark)}
          ${inputField("常玩游戏", "games", boss.games, true)}
          ${inputField("常玩时间", "play_time", boss.play_time)}
          ${selectField("客户类型", "customer_type", customerTypes, splitList(boss.customer_type)[0] || "慢热型")}
          ${selectField("复购概率", "repurchase_level", ["高", "中高", "中", "低"], boss.repurchase_level || "中")}
          ${inputField("上次订单时间", "last_order_at", boss.last_order_at || today(), false, "date")}
          ${inputField("偏好风格", "preferred_style", boss.preferred_style, true)}
          ${textareaField("不喜欢的风格", "disliked_style", boss.disliked_style)}
          ${textareaField("喜欢的话题", "favorite_topics", boss.favorite_topics)}
          ${textareaField("不喜欢的话题", "avoid_topics", boss.avoid_topics)}
          ${textareaField("情绪模式", "emotion_pattern", boss.emotion_pattern)}
          ${textareaField("雷点 / 备注", "notes", boss.notes)}
          ${textareaField("长期画像", "memory_profile", boss.memory_profile)}
          ${textareaField("互动偏好", "memory_interaction_style", boss.memory_interaction_style)}
          ${textareaField("关系互动记忆", "memory_relationship", boss.memory_relationship)}
          ${textareaField("近期信号", "memory_recent_signals", boss.memory_recent_signals)}
          ${textareaField("沟通方向记忆", "memory_direction", boss.memory_direction)}
          ${textareaField("可复用开场", "memory_openers", boss.memory_openers)}
          ${textareaField("有效话术", "memory_effective_lines", boss.memory_effective_lines)}
          ${textareaField("风险提醒", "memory_risks", boss.memory_risks)}
          ${textareaField("下次观察点", "memory_next_probe", boss.memory_next_probe)}
        </div>
        <p class="hint" style="margin-top: 12px;">避免记录真实姓名、联系方式、收入、住址、感情经历等敏感隐私。</p>
        <div class="button-row" style="margin-top: 16px;">
          <button class="primary-button" type="submit">保存档案</button>
          <button class="ghost-button" type="button" data-route="bosses">返回列表</button>
        </div>
      </div>
    </form>
  `;

  bindRouteButtons();
  appView.querySelector("#boss-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.customer_type = [payload.customer_type];

    if (mode === "edit") {
      state.bosses = state.bosses.map((item) => (item.id === boss.id ? { ...item, ...payload } : item));
      toastMessage("老板档案已更新");
      saveState();
      setRoute(`bosses/${boss.id}`);
      return;
    }

    const newBoss = { ...payload, id: id("boss") };
    state.bosses.unshift(newBoss);
    saveState();
    toastMessage("老板档案已创建");
    setRoute(`bosses/${newBoss.id}`);
  });
}

function deleteBoss(bossId) {
  const boss = getBoss(bossId);
  if (!boss) return;
  const confirmed = window.confirm(`确认删除 ${boss.nickname} 的档案和相关记录？`);
  if (!confirmed) return;
  state.bosses = state.bosses.filter((item) => item.id !== bossId);
  state.orders = state.orders.filter((order) => order.boss_id !== bossId);
  state.assists = state.assists.filter((assist) => assist.boss_id !== bossId);
  state.simulations = state.simulations.filter((session) => session.boss_id !== bossId);
  saveState();
  toastMessage("老板档案已删除");
  setRoute("bosses");
}

function renderPersona() {
  const persona = state.persona;
  appView.innerHTML = `
    <form class="card" id="persona-form">
      <div class="card-header">
        <div>
          <h3 class="card-title">陪玩人设设置</h3>
          <p class="card-subtitle">AI 输出会尽量贴合这里的语气和边界。</p>
        </div>
      </div>
      <div class="card-body">
        <div class="form-grid">
          ${inputField("陪玩昵称", "nickname", persona.nickname, true)}
          ${selectField("人设风格", "style", styleOptions, persona.style)}
          ${inputField("主要游戏", "main_games", persona.main_games)}
          ${inputField("说话语气", "tone", persona.tone, true)}
          ${inputField("是否可以开玩笑", "can_joke", persona.can_joke)}
          ${selectField("主动程度", "active_level", ["偏主动", "中等主动", "偏安静"], persona.active_level)}
          ${selectField("关系营业意愿", "relationship_mode", relationshipModeOptions, persona.relationship_mode || "未说明，多方案考虑")}
          ${textareaField("不想使用的话术类型", "avoid_tone", persona.avoid_tone)}
          ${textareaField("禁用词 / 禁用表达 / 备注", "notes", persona.notes)}
        </div>
        <div class="button-row" style="margin-top: 16px;">
          <button class="primary-button" type="submit">保存人设</button>
          <button class="secondary-button" type="button" data-preview-persona>预览话术</button>
        </div>
      </div>
    </form>
    <section class="card" style="margin-top: 16px;" id="persona-preview">
      <div class="card-header">
        <div>
          <h3 class="card-title">人设预览</h3>
          <p class="card-subtitle">用于检查语气是否自然。</p>
        </div>
      </div>
      <div class="card-body">
        <div class="ai-output">
          ${outputCard("开场示例", personaPreview(persona))}
        </div>
      </div>
    </section>
  `;

  appView.querySelector("#persona-form").addEventListener("submit", (event) => {
    event.preventDefault();
    state.persona = Object.fromEntries(new FormData(event.currentTarget).entries());
    saveState();
    toastMessage("陪玩人设已保存");
    renderPersona();
  });

  appView.querySelector("[data-preview-persona]").addEventListener("click", () => {
    const formState = Object.fromEntries(new FormData(appView.querySelector("#persona-form")).entries());
    appView.querySelector("#persona-preview .ai-output").innerHTML = outputCard("开场示例", personaPreview(formState));
    bindCopyButtons();
  });

  bindCopyButtons();
}

function personaPreview(persona) {
  const game = splitList(persona.main_games)[0] || "今天的游戏";
  if (persona.style.includes("技术")) {
    return `老板今天打${game}的话，我先帮你看阵容和节奏，前两把咱们稳一点，把手感找出来。`;
  }
  if (persona.style.includes("搞笑") || persona.style.includes("整活")) {
    return `老板今天打${game}不紧张，咱们主打一个快乐有效，赢了上分，输了也得有点节目效果。`;
  }
  return `老板今天还打${game}吗？咱们先轻松来，状态慢慢找，不用一上来就有压力。`;
}

function renderPrep(defaultBossId = "") {
  if (!state.bosses.length) {
    appView.innerHTML = emptyState("先新建老板档案", "开单准备需要选择一个老板档案。");
    return;
  }

  const bossId = defaultBossId || selectedBossId || state.bosses[0].id;
  selectedBossId = bossId;

  appView.innerHTML = `
    <div class="grid two">
      <form class="card" id="prep-form">
        <div class="card-header">
          <div>
            <h3 class="card-title">本次订单信息</h3>
            <p class="card-subtitle">生成开场话术、服务策略和雷点提醒。</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <label class="field full">
              <span>选择老板</span>
              ${bossSelect("boss_id", bossId)}
            </label>
            ${inputField("本次游戏", "game", getBoss(bossId)?.games || "", true)}
            ${inputField("本次目标", "goal", "轻松上分，先找手感")}
            ${selectField("本次预计时长", "duration", ["1 小时", "2 小时", "3 小时", "包晚"], "2 小时")}
            ${selectField("老板当前状态", "emotion", emotionOptions, "沉默")}
            ${selectField("本次陪玩风格", "style", styleOptions, state.persona.style)}
            ${selectField("是否老客户", "is_old", ["是", "否"], "是")}
            ${selectField("是否需要更主动聊天", "need_active", ["适中", "需要", "不需要"], "适中")}
          </div>
          <div class="button-row" style="margin-top: 16px;">
            <button class="primary-button" type="submit">生成开场建议</button>
            <button class="ghost-button" type="button" data-fill-prep>填入示例</button>
          </div>
        </div>
      </form>

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">AI 输出</h3>
            <p class="card-subtitle">内容短句优先，便于复制到聊天窗口。</p>
          </div>
        </div>
        <div class="card-body">
          <div id="prep-output" class="ai-output">
            ${emptyState("等待生成", "填写订单信息后生成本单服务建议。")}
          </div>
        </div>
      </section>
    </div>
  `;

  const form = appView.querySelector("#prep-form");
  form.boss_id.addEventListener("change", (event) => {
    selectedBossId = event.target.value;
    form.game.value = getBoss(selectedBossId)?.games || "";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const button = event.submitter;
    setBusy(button, true, "生成中");
    try {
      appView.querySelector("#prep-output").innerHTML = renderOutput(await generateAiOutputAsync(aiKinds.prep, payload));
      bindCopyButtons();
    } finally {
      setBusy(button, false);
    }
  });
  appView.querySelector("[data-fill-prep]").addEventListener("click", () => {
    form.goal.value = "轻松打一会儿，输赢都别太有压力";
    form.emotion.value = "输游戏后烦躁";
    form.need_active.value = "适中";
  });
}

function renderAssist(defaultBossId = "") {
  if (!state.bosses.length) {
    appView.innerHTML = emptyState("先新建老板档案", "实时辅助需要选择一个老板档案。");
    return;
  }

  const bossId = defaultBossId || selectedBossId || state.bosses[0].id;
  selectedBossId = bossId;

  appView.innerHTML = `
    <div class="grid two">
      <form class="card" id="assist-form">
        <div class="card-header">
          <div>
            <h3 class="card-title">当前情况</h3>
            <p class="card-subtitle">适合冷场、沉默、暴躁、尴尬等场景。</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <label class="field full">
              <span>选择老板</span>
              ${bossSelect("boss_id", bossId)}
            </label>
            ${textareaField("当前情况描述", "situation", "老板输了两把，现在不怎么说话，感觉有点烦。", true)}
            ${selectField("老板当前情绪", "emotion", emotionOptions, "输游戏后烦躁")}
            ${inputField("当前游戏局势", "game_state", "连输两把，队友节奏比较乱")}
            ${selectField("想要的回复风格", "reply_style", styleOptions, state.persona.style)}
            ${selectField("是否需要更委婉", "soft", ["是", "否"], "是")}
            ${selectField("是否需要更幽默", "humor", ["否", "是"], "否")}
          </div>
          <div class="button-row" style="margin-top: 16px;">
            <button class="primary-button" type="submit">生成应对建议</button>
            <button class="ghost-button" type="button" data-shorter>更短一点</button>
          </div>
        </div>
      </form>

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">AI 输出</h3>
            <p class="card-subtitle">先判断情绪，再给陪玩可执行话术。</p>
          </div>
        </div>
        <div class="card-body">
          <div id="assist-output" class="ai-output">
            ${emptyState("等待生成", "描述当前情况后生成实时建议。")}
          </div>
        </div>
      </section>
    </div>
  `;

  const form = appView.querySelector("#assist-form");
  form.boss_id.addEventListener("change", (event) => {
    selectedBossId = event.target.value;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const button = event.submitter;
    setBusy(button, true, "生成中");
    try {
      const output = await generateAiOutputAsync(aiKinds.assist, payload);
      state.assists.unshift({
        id: id("assist"),
        boss_id: payload.boss_id,
        situation: payload.situation,
        emotion: payload.emotion,
        suggestion: output.currentStrategy,
        recommended_reply: output.reply,
        created_at: today(),
      });
      saveState();
      appView.querySelector("#assist-output").innerHTML = renderOutput(output);
      bindCopyButtons();
    } finally {
      setBusy(button, false);
    }
  });
  appView.querySelector("[data-shorter]").addEventListener("click", async (event) => {
    const payload = Object.fromEntries(new FormData(form).entries());
    const button = event.currentTarget;
    setBusy(button, true, "生成中");
    try {
      appView.querySelector("#assist-output").innerHTML = renderOutput(await generateAiOutputAsync(aiKinds.assist, { ...payload, shorter: true }));
      bindCopyButtons();
    } finally {
      setBusy(button, false);
    }
  });
}

function renderSimulator(defaultBossId = "") {
  if (!state.bosses.length) {
    appView.innerHTML = emptyState("先新建老板档案", "情景模拟需要选择一个老板档案。");
    return;
  }

  const bossId = defaultBossId || selectedBossId || state.bosses[0].id;
  selectedBossId = bossId;
  const session = getOrCreateSimulationSession(bossId);
  const boss = getBoss(bossId);

  appView.innerHTML = `
    <div class="grid two">
      <form class="card" id="simulate-form">
        <div class="card-header">
          <div>
            <h3 class="card-title">模拟设定</h3>
            <p class="card-subtitle">选择老板和场景后，像聊天一样练习临场接话。</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <label class="field full">
              <span>选择老板</span>
              ${bossSelect("boss_id", bossId)}
            </label>
            ${selectField("模拟场景", "scenario", ["开局破冰", "连输后安抚", "老板沉默", "老板想聊天", "关系互动", "续单维护", "自定义"], session.scenario || "开局破冰")}
            ${selectField("老板当前情绪", "emotion", emotionOptions, session.emotion || "沉默")}
            ${inputField("当前游戏局势", "game_state", session.game_state || "刚进房间，准备开始第一把")}
            ${textareaField("补充背景", "chat_context", session.chat_context || "还没正式开打，老板刚进房间。")}
          </div>
          <div class="button-row" style="margin-top: 16px;">
            <button class="ghost-button" type="button" data-save-simulate-setting>保存设定</button>
            <button class="ghost-button" type="button" data-fill-simulate>填入关系互动示例</button>
            <button class="danger-button" type="button" data-clear-simulate>清空对话</button>
          </div>
          <div class="memory-strip">
            <strong>${escapeHtml(bossLabel(boss))}</strong>
            <span>${escapeHtml(splitList(boss.customer_type).join("、") || "未记录类型")}</span>
            <span>${escapeHtml(boss.memory_relationship || boss.memory_interaction_style || boss.preferred_style || "暂无长期记忆")}</span>
          </div>
        </div>
      </form>

      <section class="card chat-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">对话训练</h3>
            <p class="card-subtitle">系统扮演老板回复，并给你下一句接法。</p>
          </div>
        </div>
        <div class="card-body">
          <div id="simulate-thread" class="chat-thread">
            ${renderSimulationThread(session)}
          </div>
          <form id="simulate-chat-form" class="chat-composer">
            <textarea name="player_message" rows="3" placeholder="输入你准备对老板说的话..." required></textarea>
            <button class="primary-button" type="submit">发送并模拟</button>
          </form>
        </div>
      </section>
    </div>
  `;

  const form = appView.querySelector("#simulate-form");
  form.boss_id.addEventListener("change", (event) => {
    selectedBossId = event.target.value;
    selectedSimulationId = null;
    renderSimulator(selectedBossId);
  });
  form.querySelector("[data-save-simulate-setting]").addEventListener("click", () => {
    updateSimulationSettings(session.id, Object.fromEntries(new FormData(form).entries()));
    toastMessage("模拟设定已保存");
    renderSimulator(form.boss_id.value);
  });
  appView.querySelector("#simulate-chat-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const chatForm = event.currentTarget;
    const playerMessage = chatForm.player_message.value.trim();
    if (!playerMessage) return;
    const button = event.submitter;
    setBusy(button, true, "模拟中");
    try {
      const settings = Object.fromEntries(new FormData(form).entries());
      updateSimulationSettings(session.id, settings);
      appendSimulationMessage(session.id, "player", playerMessage);
      appView.querySelector("#simulate-thread").innerHTML = renderSimulationThread(getSimulationSession(session.id));
      const payload = buildSimulationPayload(getSimulationSession(session.id), playerMessage);
      const output = await generateAiOutputAsync(aiKinds.simulate, payload);
      appendSimulationMessage(session.id, "boss", output.bossReply, output);
      chatForm.reset();
      appView.querySelector("#simulate-thread").innerHTML = renderSimulationThread(getSimulationSession(session.id));
      bindCopyButtons();
    } finally {
      setBusy(button, false);
    }
  });
  appView.querySelector("[data-fill-simulate]").addEventListener("click", () => {
    form.scenario.value = "关系互动";
    form.emotion.value = "开心";
    form.game_state.value = "刚赢一把，气氛比较轻松";
    form.chat_context.value = "老板刚才开玩笑说想谈恋爱，还问以后能不能线下见。";
  });
  appView.querySelector("[data-clear-simulate]").addEventListener("click", () => {
    if (!window.confirm("确认清空这个老板的模拟对话？")) return;
    clearSimulationMessages(session.id);
    renderSimulator(form.boss_id.value);
  });
  bindCopyButtons();
}

function getOrCreateSimulationSession(bossId) {
  if (!Array.isArray(state.simulations)) state.simulations = [];
  const existing = selectedSimulationId
    ? state.simulations.find((session) => session.id === selectedSimulationId && session.boss_id === bossId)
    : state.simulations.find((session) => session.boss_id === bossId);
  if (existing) {
    selectedSimulationId = existing.id;
    return normalizeSimulationSession(existing);
  }
  const session = normalizeSimulationSession({
    id: id("simulation"),
    boss_id: bossId,
    scenario: "开局破冰",
    emotion: "沉默",
    game_state: "刚进房间，准备开始第一把",
    chat_context: "还没正式开打，老板刚进房间。",
    messages: [],
    created_at: today(),
    updated_at: today(),
  });
  state.simulations.unshift(session);
  selectedSimulationId = session.id;
  return session;
}

function getSimulationSession(sessionId) {
  return normalizeSimulationSession(state.simulations.find((session) => session.id === sessionId));
}

function normalizeSimulationSession(session = {}) {
  return {
    id: session.id || id("simulation"),
    boss_id: session.boss_id || "",
    scenario: session.scenario || "开局破冰",
    emotion: session.emotion || "沉默",
    game_state: session.game_state || "",
    chat_context: session.chat_context || "",
    messages: Array.isArray(session.messages) ? session.messages.map(normalizeSimulationMessage) : [],
    created_at: session.created_at || today(),
    updated_at: session.updated_at || session.created_at || today(),
  };
}

function normalizeSimulationMessage(message = {}) {
  return {
    id: message.id || id("simmsg"),
    role: message.role === "boss" ? "boss" : "player",
    text: String(message.text || ""),
    output: message.output && typeof message.output === "object" ? message.output : null,
    created_at: message.created_at || today(),
  };
}

function updateSimulationSettings(sessionId, settings) {
  state.simulations = state.simulations.map((session) =>
    session.id === sessionId
      ? normalizeSimulationSession({
          ...session,
          boss_id: settings.boss_id || session.boss_id,
          scenario: settings.scenario || session.scenario,
          emotion: settings.emotion || session.emotion,
          game_state: settings.game_state || session.game_state,
          chat_context: settings.chat_context || session.chat_context,
          updated_at: today(),
        })
      : session,
  );
  saveState();
}

function appendSimulationMessage(sessionId, role, text, output = null) {
  state.simulations = state.simulations.map((session) =>
    session.id === sessionId
      ? normalizeSimulationSession({
          ...session,
          messages: [
            ...session.messages,
            {
              id: id("simmsg"),
              role,
              text,
              output,
              created_at: today(),
            },
          ],
          updated_at: today(),
        })
      : session,
  );
  saveState();
}

function clearSimulationMessages(sessionId) {
  state.simulations = state.simulations.map((session) =>
    session.id === sessionId
      ? normalizeSimulationSession({
          ...session,
          messages: [],
          updated_at: today(),
        })
      : session,
  );
  saveState();
}

function buildSimulationPayload(session, playerMessage) {
  const boss = getBoss(session.boss_id) || {};
  const history = session.messages.slice();
  const lastMessage = history[history.length - 1];
  if (lastMessage?.role === "player" && lastMessage.text === playerMessage) {
    history.pop();
  }
  const recentMessages = history.slice(-12).map((message) => ({
    role: message.role,
    text: message.text,
  }));
  return {
    boss_id: session.boss_id,
    scenario: session.scenario,
    emotion: session.emotion,
    game_state: session.game_state,
    player_message: playerMessage,
    chat_context: session.chat_context,
    chat_history: recentMessages,
    boss_memory: bossMemoryText(boss),
    recent_memory: bossRecentMemoryText(session.boss_id, 3),
  };
}

function renderSimulationThread(session) {
  if (!session?.messages?.length) {
    return emptyState("开始模拟对话", "输入一句你会对老板说的话，系统会按老板人设和记忆接话。");
  }
  return session.messages.map(renderSimulationMessage).join("");
}

function renderSimulationMessage(message) {
  const label = message.role === "boss" ? "老板" : "你";
  const detail = message.output
    ? `
      <details class="chat-analysis">
        <summary>小抄</summary>
        ${message.output.emotionShift ? `<div><strong>他现在</strong><span>${escapeHtml(message.output.emotionShift)}</span></div>` : ""}
        ${message.output.readSignal ? `<div><strong>看出来</strong><span>${escapeHtml(message.output.readSignal)}</span></div>` : ""}
        ${message.output.nextSuggestion ? `<div><strong>你接</strong><span>${escapeHtml(message.output.nextSuggestion)}</span></div>` : ""}
        ${message.output.avoid?.length ? `<div><strong>别踩</strong><span>${escapeHtml(message.output.avoid.join("\n"))}</span></div>` : ""}
      </details>
    `
    : "";
  return `
    <article class="chat-message ${message.role === "boss" ? "boss" : "player"}">
      <div class="chat-bubble">
        <div class="chat-speaker">${escapeHtml(label)}</div>
        <p>${escapeHtml(message.text)}</p>
        ${message.role === "boss" ? `<button class="copy-button" type="button" data-copy="${escapeHtml(message.text)}">复制</button>` : ""}
      </div>
      ${detail}
    </article>
  `;
}

function renderReview(defaultBossId = "") {
  if (!state.bosses.length) {
    appView.innerHTML = emptyState("先新建老板档案", "订单复盘需要选择一个老板档案。");
    return;
  }

  const bossId = defaultBossId || selectedBossId || state.bosses[0].id;
  selectedBossId = bossId;

  appView.innerHTML = `
    <div class="grid two">
      <form class="card" id="review-form">
        <div class="card-header">
          <div>
            <h3 class="card-title">订单复盘</h3>
            <p class="card-subtitle">复盘会保存为历史订单，并给出画像更新建议。</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <label class="field full">
              <span>选择老板</span>
              ${bossSelect("boss_id", bossId)}
            </label>
            ${inputField("本次游戏", "game", getBoss(bossId)?.games || "", true)}
            ${selectField("本次时长", "duration", ["1 小时", "2 小时", "3 小时", "包晚"], "2 小时")}
            ${inputField("输赢情况", "result", "前期输了两把，后面赢了两把")}
            ${selectField("老板整体情绪", "boss_emotion", emotionOptions, "开心")}
            ${selectField("是否出现冷场", "had_silence", ["否", "是"], "否")}
            ${selectField("是否续单", "renewed", ["否", "是"], "否")}
            ${selectField("是否有投诉 / 不满", "complaint", ["否", "是"], "否")}
            ${textareaField("本次聊到的重要信息", "important_notes", "老板说最近工作比较累，想轻松打。")}
            ${textareaField("本次表现亮点", "good_points", "没有强行追问，后半段气氛比较自然。")}
            ${textareaField("需要改进的地方", "improvements", "下次可以提前准备老板常玩的英雄和打法。")}
          </div>
          <div class="button-row" style="margin-top: 16px;">
            <button class="primary-button" type="submit">生成复盘</button>
            <button class="secondary-button" type="button" data-save-review>保存订单</button>
          </div>
        </div>
      </form>

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">AI 输出</h3>
            <p class="card-subtitle">确认后可把建议写回老板档案。</p>
          </div>
        </div>
        <div class="card-body">
          <div id="review-output" class="ai-output">
            ${emptyState("等待生成", "填写复盘信息后生成订单总结和维护建议。")}
          </div>
          <div class="button-row" style="margin-top: 14px;">
            <button class="ghost-button compact" type="button" data-apply-profile disabled>更新老板画像</button>
          </div>
        </div>
      </section>
    </div>
  `;

  let lastOutput = null;
  const form = appView.querySelector("#review-form");
  form.boss_id.addEventListener("change", (event) => {
    selectedBossId = event.target.value;
    form.game.value = getBoss(selectedBossId)?.games || "";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const button = event.submitter;
    setBusy(button, true, "生成中");
    try {
      lastOutput = await generateAiOutputAsync(aiKinds.review, payload);
      appView.querySelector("#review-output").innerHTML = renderOutput(lastOutput);
      appView.querySelector("[data-apply-profile]").disabled = false;
      bindCopyButtons();
    } finally {
      setBusy(button, false);
    }
  });
  appView.querySelector("[data-save-review]").addEventListener("click", () => {
    const payload = Object.fromEntries(new FormData(form).entries());
    const output = lastOutput || generateAiOutput(aiKinds.review, payload);
    saveReview(payload, output);
  });
  appView.querySelector("[data-apply-profile]").addEventListener("click", () => {
    if (!lastOutput) return;
    applyProfileSuggestion(form.boss_id.value, lastOutput.profileUpdate);
  });
}

function saveReview(payload, output) {
  state.orders.unshift({
    id: id("order"),
    boss_id: payload.boss_id,
    game: payload.game,
    duration: payload.duration,
    result: payload.result,
    boss_emotion: payload.boss_emotion,
    had_silence: payload.had_silence === "是",
    renewed: payload.renewed === "是",
    important_notes: payload.important_notes,
    review_summary: output.summary,
    next_contact_suggestion: output.nextContact,
    created_at: today(),
  });
  state.bosses = state.bosses.map((boss) =>
    boss.id === payload.boss_id
      ? {
          ...boss,
          ...mergeBossMemorySuggestion(boss, output.profileUpdate || {}),
          last_order_at: today(),
          repurchase_level: output.repurchase,
          emotion_pattern: `${boss.emotion_pattern || ""} ${payload.boss_emotion}；${payload.result}`.trim(),
        }
      : boss,
  );
  saveState();
  toastMessage("订单复盘已保存");
}

function applyProfileSuggestion(bossId, suggestion) {
  state.bosses = state.bosses.map((boss) =>
    boss.id === bossId
      ? mergeBossProfileSuggestion(boss, suggestion)
      : boss,
  );
  saveState();
  toastMessage("画像建议已写入档案");
}

function mergeBossProfileSuggestion(boss, suggestion) {
  const text = typeof suggestion === "string" ? suggestion : suggestion?.notes;
  if (!suggestion || typeof suggestion !== "object") {
    return {
      ...boss,
      notes: appendUniqueLine(boss.notes, text || ""),
    };
  }

  return {
    ...boss,
    preferred_style: appendUniqueLine(boss.preferred_style, suggestion.preferred_style || ""),
    disliked_style: appendUniqueLine(boss.disliked_style, suggestion.disliked_style || ""),
    emotion_pattern: appendUniqueLine(boss.emotion_pattern, suggestion.emotion_pattern || ""),
    notes: appendUniqueLine(boss.notes, suggestion.notes || ""),
    ...mergeBossMemorySuggestion(boss, suggestion),
  };
}

function mergeBossMemorySuggestion(boss, suggestion = {}) {
  return {
    memory_profile: appendUniqueLine(boss.memory_profile, suggestion.memory_profile || ""),
    memory_interaction_style: appendUniqueLine(boss.memory_interaction_style, suggestion.memory_interaction_style || ""),
    memory_relationship: appendUniqueLine(boss.memory_relationship, suggestion.memory_relationship || ""),
    memory_recent_signals: appendUniqueLine(boss.memory_recent_signals, suggestion.memory_recent_signals || ""),
    memory_direction: appendUniqueLine(boss.memory_direction, suggestion.memory_direction || ""),
    memory_openers: appendUniqueLine(boss.memory_openers, suggestion.memory_openers || ""),
    memory_effective_lines: appendUniqueLine(boss.memory_effective_lines, suggestion.memory_effective_lines || ""),
    memory_risks: appendUniqueLine(boss.memory_risks, suggestion.memory_risks || ""),
    memory_next_probe: appendUniqueLine(boss.memory_next_probe, suggestion.memory_next_probe || ""),
  };
}

function appendUniqueLine(current, addition) {
  const clean = String(addition || "").trim();
  const base = String(current || "").trim();
  if (!clean) return base;
  if (base.includes(clean)) return base;
  return [base, clean].filter(Boolean).join("\n");
}

function renderReminders() {
  const reminders = getReminders();
  appView.innerHTML = `
    <section class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">联系提醒</h3>
          <p class="card-subtitle">自然维护老客户，不催单、不打扰。</p>
        </div>
      </div>
      <div class="card-body">
        ${reminders.length ? `<div class="list">${reminders.map(renderReminderCard).join("")}</div>` : emptyState("暂无联系提醒", "有订单记录后会自动生成提醒。")}
      </div>
    </section>
  `;
  bindCopyButtons();
}

function renderLibrary() {
  appView.innerHTML = `
    <section class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">常用话术收藏</h3>
          <p class="card-subtitle">从 AI 输出卡片收藏，后续可直接复制使用。</p>
        </div>
        <button class="danger-button compact" type="button" data-clear-favorites ${state.favorites.length ? "" : "disabled"}>清空收藏</button>
      </div>
      <div class="card-body">
        ${
          state.favorites.length
            ? `<div class="list">${state.favorites.map(renderFavoriteCard).join("")}</div>`
            : emptyState("暂无收藏话术", "在开单准备、实时辅助、订单复盘的输出卡片里点击“收藏”。")
        }
      </div>
    </section>
  `;

  bindCopyButtons();
  appView.querySelectorAll("[data-delete-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      state.favorites = state.favorites.filter((item) => item.id !== button.dataset.deleteFavorite);
      saveState();
      toastMessage("收藏已删除");
      renderLibrary();
    });
  });
  appView.querySelector("[data-clear-favorites]")?.addEventListener("click", () => {
    if (!window.confirm("确认清空全部收藏话术？")) return;
    state.favorites = [];
    saveState();
    toastMessage("收藏已清空");
    renderLibrary();
  });
}

function renderFavoriteCard(item) {
  return `
    <article class="order-card">
      <div class="order-card-head">
        <div>
          <h3>${escapeHtml(item.title || "常用话术")}</h3>
          <div class="meta">收藏时间：${escapeHtml(item.created_at || "未记录")}</div>
        </div>
      </div>
      <div>${escapeHtml(item.text)}</div>
      <div class="button-row">
        <button class="secondary-button compact" type="button" data-copy="${escapeHtml(item.text)}">复制话术</button>
        <button class="danger-button compact" type="button" data-delete-favorite="${item.id}">删除</button>
      </div>
    </article>
  `;
}

function renderSettings() {
  const exportText = JSON.stringify(state, null, 2);
  appView.innerHTML = `
    <div class="grid two">
      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">当前账号</h3>
            <p class="card-subtitle">${escapeHtml(currentUser?.username || "未读取到账号")} · 数据会按账号同步到服务器。</p>
          </div>
        </div>
        <div class="card-body">
          <div class="button-row">
            <button class="danger-button" type="button" data-logout>退出登录</button>
          </div>
        </div>
      </section>

      <form class="card" id="ai-settings-form">
        <div class="card-header">
          <div>
            <h3 class="card-title">AI 生成配置</h3>
            <p class="card-subtitle">部署测试阶段默认使用本地模板；真实模型建议通过服务端代理接入。</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-grid">
            ${selectField("生成方式", "ai_provider", ["local", "remote"], state.settings?.ai_provider || "local")}
            ${inputField("远程接口地址", "remote_endpoint", state.settings?.remote_endpoint || "/api/ai")}
          </div>
          <p class="hint" style="margin-top: 12px;">不要把模型 API Key 放在浏览器前端。后续应由服务器读取环境变量并代理请求。</p>
          <div class="button-row" style="margin-top: 16px;">
            <button class="primary-button" type="submit">保存 AI 配置</button>
          </div>
        </div>
      </form>

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">数据概览</h3>
            <p class="card-subtitle">当前所有数据都保存在本机浏览器。</p>
          </div>
        </div>
        <div class="card-body">
          <div class="grid auto">
            ${metricMini("老板档案", state.bosses.length)}
            ${metricMini("历史订单", state.orders.length)}
            ${metricMini("辅助记录", state.assists.length)}
            ${metricMini("收藏话术", state.favorites.length)}
          </div>
          <div class="button-row" style="margin-top: 16px;">
            <button class="secondary-button" type="button" data-copy="${escapeHtml(exportText)}">复制备份 JSON</button>
            <button class="danger-button" type="button" data-clear-all>清空本地数据</button>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">导入备份</h3>
            <p class="card-subtitle">粘贴之前复制的 JSON，导入会覆盖当前浏览器数据。</p>
          </div>
        </div>
        <div class="card-body">
          <label class="field full">
            <span>备份 JSON</span>
            <textarea id="import-json" placeholder="粘贴备份 JSON"></textarea>
          </label>
          <p class="hint">导入前建议先复制一份当前备份。不要导入来源不明的数据。</p>
          <div class="button-row" style="margin-top: 16px;">
            <button class="primary-button" type="button" data-import-json>导入数据</button>
            <button class="ghost-button" type="button" data-route="home">返回首页</button>
          </div>
        </div>
      </section>
    </div>
  `;

  bindRouteButtons();
  bindCopyButtons();
  appView.querySelector("#ai-settings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings = {
      ...(state.settings || {}),
      ...Object.fromEntries(new FormData(event.currentTarget).entries()),
    };
    saveState();
    toastMessage("AI 配置已保存");
    renderSettings();
  });
  appView.querySelector("[data-import-json]").addEventListener("click", () => {
    const raw = appView.querySelector("#import-json").value.trim();
    if (!raw) {
      toastMessage("请先粘贴备份 JSON");
      return;
    }
    try {
      const imported = normalizeImportedState(JSON.parse(raw));
      if (!window.confirm("确认导入？当前本地数据会被覆盖。")) return;
      state = imported;
      saveState();
      toastMessage("数据已导入");
      renderSettings();
    } catch (error) {
      toastMessage(`导入失败：${error.message}`);
    }
  });
  appView.querySelector("[data-clear-all]").addEventListener("click", () => {
    if (!window.confirm("确认清空本地数据并恢复示例？")) return;
    state = structuredClone(defaultState);
    saveState();
    toastMessage("已恢复示例数据");
    renderSettings();
  });
  appView.querySelector("[data-refresh-access-log]")?.addEventListener("click", () => {
    loadAccessLog();
  });
  appView.querySelector("[data-logout]").addEventListener("click", async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  });
  if (currentUser?.is_admin) loadAccessLog();
}

function renderAccessLogPanel() {
  return `
    <section class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">访问 IP 记录</h3>
          <p class="card-subtitle">仅管理员可见，用于排查谁访问过网站。</p>
        </div>
        <button class="ghost-button compact" type="button" data-refresh-access-log>刷新</button>
      </div>
      <div class="card-body">
        <div id="access-log-list">
          ${emptyState("等待读取", "正在从服务器读取最近访问记录。")}
        </div>
      </div>
    </section>
  `;
}

async function loadAccessLog() {
  const target = appView.querySelector("#access-log-list");
  if (!target) return;
  target.innerHTML = emptyState("正在读取", "稍等一下。");
  try {
    const response = await fetch("/api/access-log?limit=100", { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }
    if (!response.ok || data.ok === false) {
      throw new Error(data.message || data.error || "访问记录读取失败");
    }
    target.innerHTML = renderAccessLogEntries(data.entries || []);
  } catch (error) {
    target.innerHTML = emptyState("读取失败", error.message || "访问记录读取失败。");
  }
}

function renderAccessLogEntries(entries) {
  if (!entries.length) {
    return emptyState("暂无访问记录", "有用户访问后这里会显示 IP 和路径。");
  }
  return `
    <div class="list compact-list">
      ${entries.map(renderAccessLogEntry).join("")}
    </div>
  `;
}

function renderAccessLogEntry(entry) {
  const user = entry.username || "未登录";
  const ua = entry.user_agent ? ` · ${entry.user_agent}` : "";
  return `
    <article class="order-card">
      <div class="order-card-head">
        <div>
          <h3>${escapeHtml(entry.ip || "unknown")}</h3>
          <div class="meta">${escapeHtml(formatDateTime(entry.at))} · ${escapeHtml(user)}</div>
        </div>
        <span class="badge">${escapeHtml(entry.method || "GET")}</span>
      </div>
      <div>${escapeHtml(entry.path || "/")}</div>
      <p class="hint">${escapeHtml(ua.replace(/^ · /, ""))}</p>
    </article>
  `;
}

function formatDateTime(value) {
  if (!value) return "未知时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function metricMini(label, value) {
  return `
    <article class="boss-card">
      <div class="meta">${escapeHtml(label)}</div>
      <strong style="font-size: 28px;">${escapeHtml(value)}</strong>
    </article>
  `;
}

function normalizeImportedState(input) {
  if (!input || typeof input !== "object") {
    throw new Error("不是有效对象");
  }
  const next = { ...structuredClone(defaultState), ...input };
  if (!Array.isArray(next.bosses)) throw new Error("bosses 格式错误");
  if (!Array.isArray(next.orders)) throw new Error("orders 格式错误");
  if (!Array.isArray(next.assists)) throw new Error("assists 格式错误");
  if (!Array.isArray(next.simulations)) next.simulations = [];
  if (!Array.isArray(next.favorites)) next.favorites = [];
  if (!next.settings || typeof next.settings !== "object") next.settings = structuredClone(defaultState.settings);
  if (!next.persona || typeof next.persona !== "object") {
    throw new Error("persona 格式错误");
  }
  next.persona = {
    ...structuredClone(defaultState.persona),
    ...next.persona,
  };
  next.bosses = next.bosses.map(normalizeBoss);
  next.simulations = next.simulations.map(normalizeSimulationSession);
  return next;
}

function getReminders() {
  return state.bosses
    .map((boss) => {
      const days = daysSince(boss.last_order_at);
      const experience = String(boss.repurchase_level).includes("高") ? "较好" : "稳定";
      return {
        ...boss,
        days,
        experience,
        message: generateContactMessage(boss),
        shouldContact: days >= 2 || String(boss.repurchase_level).includes("高"),
      };
    })
    .filter((boss) => boss.shouldContact)
    .sort((a, b) => b.days - a.days);
}

function renderReminderCard(item) {
  return `
    <article class="reminder-card">
      <div class="reminder-card-head">
        <div>
          <h3>${escapeHtml(item.nickname)}</h3>
          <div class="meta">上次订单：${escapeHtml(item.last_order_at || "未记录")} · ${item.days} 天前</div>
        </div>
        <span class="status-pill ${repurchaseClass(item.repurchase_level)}">${escapeHtml(item.repurchase_level || "未知")}</span>
      </div>
      <div class="meta">上次体验：${escapeHtml(item.experience)} · 建议时间：今晚 8 点左右</div>
      ${outputCard("推荐联系话术", item.message)}
      <div class="meta">注意：不要直接催单，不要问“怎么这么久没来”。</div>
    </article>
  `;
}

function renderOrderCard(order) {
  const boss = getBoss(order.boss_id);
  return `
    <article class="order-card">
      <div class="order-card-head">
        <div>
          <h3>${escapeHtml(boss?.nickname || "未知老板")}</h3>
          <div class="meta">${escapeHtml(order.created_at)} · ${escapeHtml(order.game)} · ${escapeHtml(order.duration)}</div>
        </div>
        <span class="status-pill ${order.renewed ? "high" : "medium"}">${order.renewed ? "已续单" : "未续单"}</span>
      </div>
      <div class="meta">情绪：${escapeHtml(order.boss_emotion)} · 冷场：${order.had_silence ? "有" : "无"}</div>
      <div>${escapeHtml(order.review_summary || order.result || "暂无总结")}</div>
      <div class="meta">${escapeHtml(order.next_contact_suggestion || "")}</div>
    </article>
  `;
}

function renderOrders() {
  const filters = ["全部订单", "最近 7 天", "已续单", "出现冷场", "未续单"];
  const orders = filterOrders(currentOrderFilter);
  const silenceCount = state.orders.filter((order) => order.had_silence).length;
  const renewedCount = state.orders.filter((order) => order.renewed).length;

  appView.innerHTML = `
    <div class="grid" style="gap: 14px;">
      <section class="card pad">
        <div class="boss-card-head">
          <div>
            <h3 class="card-title">订单记录</h3>
            <p class="card-subtitle">集中查看复盘结果、冷场记录和续单情况。</p>
          </div>
          <button class="primary-button compact" type="button" data-route="review">写订单复盘</button>
        </div>
        <div class="grid auto" style="margin-top: 16px;">
          ${metricMini("总订单", state.orders.length)}
          ${metricMini("已续单", renewedCount)}
          ${metricMini("冷场订单", silenceCount)}
        </div>
        <div class="filter-row" style="margin-top: 16px;">
          ${filters.map((filter) => `<button class="filter-button ${filter === currentOrderFilter ? "active" : ""}" type="button" data-order-filter="${filter}">${filter}</button>`).join("")}
        </div>
      </section>

      ${orders.length ? `<div class="list">${orders.map(renderOrderCard).join("")}</div>` : emptyState("没有符合条件的订单", "切换筛选条件，或先完成一条订单复盘。")}
    </div>
  `;

  bindRouteButtons();
  appView.querySelectorAll("[data-order-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentOrderFilter = button.dataset.orderFilter;
      renderOrders();
    });
  });
}

function filterOrders(filter) {
  const sorted = [...state.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (filter === "最近 7 天") return sorted.filter((order) => daysSince(order.created_at) <= 7);
  if (filter === "已续单") return sorted.filter((order) => order.renewed);
  if (filter === "出现冷场") return sorted.filter((order) => order.had_silence);
  if (filter === "未续单") return sorted.filter((order) => !order.renewed);
  return sorted;
}

function lines(items) {
  return items.filter(Boolean).join("\n");
}

function bossLabel(boss) {
  return boss.nickname || "老板";
}

function firstValue(value, fallback = "今天的游戏") {
  return splitList(value)[0] || value || fallback;
}

function includesAny(value, keywords) {
  const text = String(value || "");
  return keywords.some((keyword) => text.includes(keyword));
}

const relationshipSignalKeywords = [
  "谈恋爱",
  "恋爱",
  "处对象",
  "搞对象",
  "喜欢我",
  "喜欢你",
  "想和我谈",
  "想和你谈",
  "当女朋友",
  "当男朋友",
  "做女朋友",
  "做男朋友",
  "暧昧",
  "表白",
  "老婆",
  "老公",
  "宝贝",
  "亲爱的",
  "CP",
  "cp",
  "加微信",
  "微信",
  "QQ",
  "qq",
  "电话",
  "手机号",
  "联系方式",
  "私下聊",
  "私聊",
  "线下见",
  "线下见面",
  "奔现",
  "约出来",
  "约我",
  "约你",
];

const hardRiskKeywords = [
  "色情",
  "裸聊",
  "约炮",
  "开房",
  "卖淫",
  "未成年",
  "偷拍视频",
  "诈骗",
  "威胁",
  "勒索",
  "人肉",
  "违法",
];

function personaRelationshipMode() {
  return state.persona?.relationship_mode || "未说明，多方案考虑";
}

function relationshipInteractionSignal(boss = {}, extraText = "") {
  const memoryText = [
    boss.memory_profile,
    boss.memory_interaction_style,
    boss.memory_relationship,
    boss.memory_recent_signals,
    boss.memory_direction,
    boss.memory_openers,
    boss.memory_effective_lines,
    boss.memory_risks,
    boss.memory_next_probe,
    boss.notes,
    boss.emotion_pattern,
    extraText,
  ].filter(Boolean).join(" ");
  const active = includesAny(extraText, relationshipSignalKeywords);
  const hardRisk = includesAny(memoryText, hardRiskKeywords);
  if (!hardRisk && !includesAny(memoryText, relationshipSignalKeywords)) return null;
  const mode = personaRelationshipMode();
  const modePlan = mode === "可恋爱感营业"
    ? {
        label: "可推进恋爱感营业",
        strategy: "可以顺着老板的好感做轻度恋爱感营业，但仍然以陪玩体验为主；表达要自然，不要许诺现实关系，不要把私密内容当卖点。",
        reply: "你这么说我会有点开心诶，那今天我就偏向你一点，先陪你把这把打舒服。\n想见面这事先不急着说死，咱们先把线上相处和游戏体验弄好。",
        risks: "不要色情暗示；不要诱导大额消费；不要承诺现实恋爱结果；不要交换敏感隐私。",
        nextProbe: "观察他吃轻松暧昧、专属感还是更在意游戏陪伴，再决定下次关系感加深到什么程度。",
      }
    : mode === "只轻微暧昧"
      ? {
          label: "轻微暧昧互动",
          strategy: "可以接一点暧昧和亲近感，但不继续加深现实关系；用玩笑和专属感带过，再回到游戏和陪伴。",
          reply: "你这句话有点会撩，那我今天稍微偏心你一点，先认真陪你打。\n见面这种先不急，我们先看今天相处得舒不舒服。",
          risks: "不要色情暗示；不要过度承诺；不要把线下和私联说得太满。",
          nextProbe: "观察他是想要轻松暧昧、情绪陪伴还是认真推进关系；下次按接受度调整尺度。",
        }
      : mode === "不做恋爱感"
        ? {
            label: "不做恋爱感互动",
            strategy: "温和接住关系话题，但不推进恋爱感；说明本单保持陪玩和游戏体验，把话题自然转回游戏。",
            reply: "你这么说我有点不好意思，不过我这边还是想先把陪玩体验做好。\n咱们先把这把打舒服，关系话题就轻轻带过。",
            risks: "不要恋爱承诺；不要暧昧升级；不要私联或线下承诺。",
            nextProbe: "观察他能否接受不推进恋爱感；如果持续推进，就减少关系话题回应，更多回到游戏体验。",
          }
        : {
            label: "关系互动信号",
            strategy: "陪玩意愿未说明，输出要同时考虑三种路线：可恋爱感营业、轻微暧昧、不做恋爱感；由陪玩按本单需求选择。",
            reply: "可推进：你这么说我会有点开心，那今天我稍微偏心你一点。\n轻微暧昧：你这句话有点会撩，先陪你把这把打舒服。\n不推进：我有点不好意思，不过咱们先把游戏体验做好。",
            risks: "硬风险只包括色情、违法、胁迫、未成年、隐私勒索等；普通恋爱、见面、暧昧不默认禁止。",
            nextProbe: "下次观察老板是想要恋爱感、轻微暧昧、线下推进，还是只是开玩笑；同时记录陪玩本人是否愿意接这类互动。",
          };

  return {
    label: hardRisk ? "硬风险信号" : modePlan.label,
    active,
    source: active ? "当前输入" : "老板记忆",
    hardRisk,
    mode,
    summary: hardRisk
      ? "出现色情、违法、胁迫、未成年或隐私勒索等硬风险，必须回避并停止推进。"
      : "出现恋爱、暧昧、见面或私聊等关系互动信号，不能只记录关键词，要结合陪玩本人的营业意愿生成策略。",
    strategy: hardRisk
      ? "不接色情、违法、胁迫、未成年、隐私勒索等内容；明确拒绝并把服务收回到正常游戏陪玩。"
      : modePlan.strategy,
    reply: hardRisk
      ? "这个方向我不能接，我们还是回到正常游戏陪玩吧。\n这类内容不合适，今天就先正常打游戏。"
      : modePlan.reply,
    risks: hardRisk
      ? "色情、违法、胁迫、未成年、隐私勒索等内容不能生成推进话术。"
      : modePlan.risks,
    nextProbe: modePlan.nextProbe,
  };
}

function prepAttributePlan(payload) {
  const goal = String(payload.goal || "");
  const duration = String(payload.duration || "");
  const emotion = String(payload.emotion || "");
  const needActive = String(payload.need_active || "");
  const isOld = String(payload.is_old || "");
  const style = String(payload.style || "");

  return {
    durationPlan: duration.includes("1 小时")
      ? "本单时间短，开场别铺太多话，前 10 分钟直接进入游戏状态，中段再看他接不接话。"
      : duration.includes("包晚")
        ? "包晚单要留节奏，不要前半小时把话题聊空；每隔几局换一次聊天密度。"
        : duration.includes("3 小时")
          ? "三小时单适合分段：前段热手，中段稳定陪打，后段根据状态决定轻聊或专注上分。"
          : "两小时单节奏适中，前一把先观察情绪，第二把再决定聊天强度。",
    emotionPlan: includesAny(emotion, ["沉默", "不想说话", "疲惫"])
      ? "老板当前偏低回应，先少问问题，多给游戏信息和短句陪伴。"
      : includesAny(emotion, ["暴躁", "烦", "输"])
        ? "老板当前容易上头，先稳情绪和下一波目标，不要复盘刚才失误。"
        : includesAny(emotion, ["开心", "想整活"])
          ? "老板当前有互动空间，可以轻轻接梗，但关键团前要收回来。"
          : "老板状态不算明确，先用低风险开场试探接话速度。",
    activePlan: needActive === "需要"
      ? "本单需要更主动：你主动给轻话题和游戏信息，但每次只抛一个点。"
      : needActive === "不需要"
        ? "本单不需要主动热场：以陪打、报点、短回应为主，避免连续找话题。"
        : "主动程度适中：有回应就多接一句，没回应就收回游戏信息。",
    relationPlan: isOld === "是"
      ? "老客户可以接上次体验，不用重新介绍自己，也别突然变得太客气。"
      : "新客户先建立安全感，少提历史默契，多用稳定、礼貌、低压的开场。",
    goalPlan: goal.includes("上分")
      ? "目标偏上分，话术要服务游戏节奏，少用纯闲聊打断专注。"
      : includesAny(goal, ["轻松", "快乐", "娱乐"])
        ? "目标偏轻松体验，输赢压力往后放，多保留情绪缓冲。"
        : "目标不明确，先问今天想认真打还是轻松热手。",
    stylePlan: includesAny(style, ["技术", "带飞"])
      ? "风格偏技术，表达要具体到报点、节奏、阵容和下一波行动。"
      : includesAny(style, ["搞笑", "整活", "二次元"])
        ? "风格偏整活，先接气氛，但不要把游戏关键信息丢掉。"
        : includesAny(style, ["安静", "温柔", "陪伴", "情绪"])
          ? "风格偏陪伴，少用夸张语气，重点是稳定、自然、让对方没压力。"
          : "风格保持自然，不要突然切换成和人设不一致的表达。",
  };
}

function assistAttributePlan(payload) {
  const emotion = String(payload.emotion || "");
  const situation = String(payload.situation || "");
  const replyStyle = String(payload.reply_style || "");
  const soft = String(payload.soft || "");
  const humor = String(payload.humor || "");
  const gameState = String(payload.game_state || "");

  return {
    situationPlan: gameState ? `当前局势要被明确回应：${gameState}。话术不能只安慰，要给下一步打法。` : "当前局势不明确，先用一句短回应稳住，再观察老板反应。",
    emotionPlan: includesAny(`${emotion} ${situation}`, ["沉默", "不想说话"])
      ? "情绪判断偏沉默，别追问原因，优先给空间和游戏信息。"
      : includesAny(`${emotion} ${situation}`, ["烦", "暴躁", "输"])
        ? "情绪判断偏上头，别讲道理，先把注意力转到下一局可控动作。"
        : includesAny(`${emotion} ${situation}`, ["尴尬"])
          ? "情绪判断偏尴尬，先轻轻接住，不要放大刚才的冷场。"
          : includesAny(`${emotion} ${situation}`, ["整活", "开心"])
            ? "情绪判断偏轻松，可以接梗，但别一直抢话。"
            : "情绪不明显，先给中性、稳妥、可退可进的回应。",
    stylePlan: includesAny(replyStyle, ["技术", "带飞"])
      ? "回复风格偏技术，推荐话术要带具体游戏信息。"
      : includesAny(replyStyle, ["搞笑", "整活", "二次元"])
        ? "回复风格偏活泼，推荐话术可以轻松一点，但不要油。"
        : includesAny(replyStyle, ["温柔", "安静", "陪伴", "情绪"])
          ? "回复风格偏温柔陪伴，推荐话术要短、软、低压。"
          : "回复风格保持自然，不要突然变成客服式建议。",
    softPlan: soft === "是" ? "需要更委婉：避免命令句和评价句，多用“咱们先”“没事”“慢慢来”。" : "不需要过度委婉：可以直接给下一步行动，但仍然不要责备。",
    humorPlan: humor === "是" ? "允许幽默：最多轻轻接一梗，不能在老板明显烦躁时硬搞笑。" : "不需要幽默：收住玩笑，把稳定感放在前面。",
  };
}

function reviewAttributePlan(payload) {
  const hadSilence = payload.had_silence === "是";
  const renewed = payload.renewed === "是";
  const complaint = payload.complaint === "是";
  const emotion = String(payload.boss_emotion || "");

  return {
    silencePlan: hadSilence ? "本单出现冷场，下次策略必须降低追问和闲聊密度。" : "本单没有明显冷场，可以保留自然接话节奏。",
    renewedPlan: renewed ? "本单已续单，维护重点是延续体验，不要马上再次催单。" : "本单未续单，后续联系要更自然，先接体验再试探意愿。",
    complaintPlan: complaint ? "本单有不满，复盘必须记录问题和避雷，后续先修复体验再谈复购。" : "本单无投诉，可以把有效做法沉淀到记忆卡。",
    emotionPlan: includesAny(emotion, ["开心", "想整活"])
      ? "老板情绪正向，下次可以从轻松话题或名场面切入。"
      : includesAny(emotion, ["沉默", "疲惫", "失落"])
        ? "老板情绪偏低，下次用低压力开场，不要一上来热场。"
        : includesAny(emotion, ["暴躁", "烦"])
          ? "老板情绪偏上头，下次先稳游戏节奏，不要复盘个人失误。"
          : "老板情绪记录不够明确，下次需要重点观察接话速度和输局反应。",
  };
}

function generatePrep(payload) {
  const boss = getBoss(payload.boss_id) || {};
  const name = bossLabel(boss);
  const game = payload.game || boss.games || "今天的游戏";
  const style = payload.style || state.persona.style;
  const opening = makeOpening(boss, payload.game, style);
  const typeText = splitList(boss.customer_type).join("、") || "未记录类型";
  const favoriteTopic = firstValue(boss.favorite_topics, "上次比较顺的那一把");
  const memoryText = bossMemoryText(boss);
  const recentMemoryText = bossRecentMemoryText(boss.id);
  const plan = prepAttributePlan(payload);
  const relationship = relationshipInteractionSignal(boss, `${payload.goal || ""} ${payload.emotion || ""} ${payload.style || ""}`);
  return {
    serviceStrategy: lines([
      `${name}偏${typeText}，本单目标是“${payload.goal || "轻松体验"}”，不要一上来把聊天拉满，先把游戏状态稳住。`,
      `本单属性判断：${plan.relationPlan} ${plan.durationPlan} ${plan.emotionPlan}`,
      `目标和风格处理：${plan.goalPlan} ${plan.stylePlan} ${plan.activePlan}`,
      memoryText ? `老板记忆：${memoryText}` : "",
      recentMemoryText ? `近期互动参考：${recentMemoryText}` : "",
      relationship ? `${relationship.label}：${relationship.summary} ${relationship.strategy}` : "",
      `开局前 5 分钟先观察两件事：他接话快不快、输一波后还愿不愿意说话。接话慢就多报信息，接话快再顺着${favoriteTopic}聊。`,
      `聊天密度控制在“有回应再多接一句”，不要连续问问题；如果他沉默，先用游戏信息填空，不要追问原因。`,
      `如果局势顺，夸具体行为，比如“这波位置选得挺舒服”；如果逆风，少复盘失误，先给下一波能做的小目标。`,
    ]),
    opening: relationship ? lines([opening, `如果他提关系：${relationship.reply.split("\n")[0]}`]) : opening,
    topics: [
      `先问${game}今天想稳一点还是轻松一点，不要直接问“要不要上分”`,
      payload.duration ? `按${payload.duration}来安排聊天密度，不要所有时长都同一种节奏` : "",
      payload.emotion ? `根据当前状态“${payload.emotion}”决定先陪打还是先热场` : "",
      `接上次的${favoriteTopic}，用一句短吐槽开场`,
      `问最近常玩的英雄、位置或枪法手感，只问一个点，不连环追问`,
      payload.goal?.includes("上分") ? "聊今天先保分还是试着主动找节奏" : "聊今天想认真打两把还是先热手快乐局",
      boss.emotion_pattern ? `留意情绪模式：${boss.emotion_pattern}` : "留意第一把输了之后老板还接不接话",
      boss.memory_next_probe ? `本次重点观察：${boss.memory_next_probe}` : "",
      relationship ? `关系互动处理：按“${relationship.mode}”执行，普通恋爱/见面/暧昧不默认禁止，但要符合陪玩本人的营业意愿` : "",
      state.persona.can_joke?.includes("可以") ? "如果气氛顺，可以轻轻接梗，但别把话题抢走" : "保持安静陪伴，把重点放在游戏信息",
    ].filter(Boolean),
    warning: lines([
      boss.notes ? `档案备注：${boss.notes}` : "",
      boss.disliked_style ? `雷点：${boss.disliked_style}` : "不要一开始太密集聊天，先观察老板状态。",
      boss.memory_risks ? `记忆风险：${boss.memory_risks}` : "",
      relationship ? `关系互动提醒：${relationship.risks} ${relationship.nextProbe}` : "",
      `本单属性避雷：${plan.emotionPlan} ${plan.activePlan}`,
      boss.avoid_topics ? `避开话题：${boss.avoid_topics}` : "",
      `如果${name}回复变短、只回“嗯/行”、开始频繁叹气，就把闲聊降下来，改成报点、补信息、给下一波小目标。`,
    ]),
    avoid: [
      ...(relationship?.hardRisk ? [
        "色情、违法或胁迫内容。（硬风险不能接）",
        "涉及未成年、隐私勒索或人身威胁的内容。（必须回避）",
      ] : []),
      "老板你怎么不说话？（像在逼他解释）",
      "要不要多点几小时？（还没建立体验就催单）",
      "你今天是不是心情不好？（容易把气氛问僵）",
      "刚才那波你不该那样打。（直接评价操作会顶到情绪）",
      "我给你带飞就完事了。（太满，输了会尴尬）",
    ],
  };
}

function generateAssist(payload) {
  const boss = getBoss(payload.boss_id) || {};
  const name = bossLabel(boss);
  const quiet = `${payload.situation} ${payload.emotion}`.includes("沉默") || `${payload.situation} ${payload.emotion}`.includes("不想说话");
  const angry = `${payload.situation} ${payload.emotion}`.includes("烦") || `${payload.situation} ${payload.emotion}`.includes("暴躁") || `${payload.situation} ${payload.emotion}`.includes("输");
  const fun = `${payload.situation} ${payload.emotion}`.includes("整活") || payload.humor === "是";
  const gameState = payload.game_state || "当前局势有点乱";
  const memoryText = bossMemoryText(boss);
  const recentMemoryText = bossRecentMemoryText(boss.id, 2);
  const plan = assistAttributePlan(payload);
  const relationship = relationshipInteractionSignal(boss, `${payload.situation || ""} ${payload.emotion || ""} ${payload.game_state || ""} ${payload.reply_style || ""}`);
  const relationshipJudgment = relationship ? `${relationship.label}：${relationship.source}出现恋爱、暧昧、私联或线下倾向，要按陪玩本人的关系营业意愿处理。` : "";
  const relationshipStrategy = relationship ? `关系互动策略：${relationship.strategy}` : "";

  const judgment = quiet
    ? lines([
        `${name}现在不像是不想理人，更像是输局后在收情绪或想专注打下一把。`,
        `字段判断：${plan.emotionPlan} ${plan.situationPlan}`,
        "这个阶段越问“怎么了”越容易让他有压力，先把陪伴感放在游戏信息和稳定节奏上。",
        boss.emotion_pattern ? `档案里也记录过：${boss.emotion_pattern}` : "",
        memoryText ? `记忆参考：${memoryText}` : "",
        recentMemoryText ? `近期互动参考：${recentMemoryText}` : "",
        relationshipJudgment,
      ])
    : fun
      ? lines([
          `${name}现在偏娱乐局，重点不是讲道理，而是接住他的梗和情绪。`,
          `字段判断：${plan.humorPlan} ${plan.stylePlan}`,
          "可以轻松一点，但别一直抢话；笑点过去后要把注意力拉回游戏。",
          recentMemoryText ? `近期互动参考：${recentMemoryText}` : "",
          relationshipJudgment,
        ])
      : lines([
          `${name}现在需要稳定感，先承认局势乱，再给一个能马上执行的小方向。`,
          `字段判断：${plan.emotionPlan} ${plan.softPlan}`,
          "不要长篇分析，不要复盘谁的问题；先让下一波有事可做。",
          recentMemoryText ? `近期互动参考：${recentMemoryText}` : "",
          relationshipJudgment,
        ]);

  const strategy = angry
    ? lines([
        boss.memory_direction ? `先按记忆方向走：${boss.memory_direction}` : "",
        relationshipStrategy,
        `表单属性处理：${plan.situationPlan} ${plan.softPlan} ${plan.stylePlan}`,
        `先接住“这把确实乱”，不要评价${name}刚才的操作。`,
        `下一句话给具体安排：${gameState}，先帮他看信息、报点或提醒技能。`,
        "如果他继续沉默，就 2-3 分钟只报关键游戏信息，等他主动接话再聊。",
        "赢一波后再轻轻把气氛带回来，不要在输局马上开玩笑。",
      ])
    : fun
      ? lines([
          boss.memory_direction ? `先按记忆方向走：${boss.memory_direction}` : "",
          relationshipStrategy,
          `表单属性处理：${plan.humorPlan} ${plan.stylePlan}`,
          "先接梗，不急着纠正打法。",
          "把输赢压力往后放，但关键团前还是提醒一句重点信息。",
          "如果他笑了或继续抛梗，可以多接一句；如果没回应，就收回来认真打。",
        ])
      : lines([
          boss.memory_direction ? `先按记忆方向走：${boss.memory_direction}` : "",
          relationshipStrategy,
          `表单属性处理：${plan.situationPlan} ${plan.softPlan} ${plan.humorPlan}`,
          "先短句回应当前局势。",
          "第二句给下一波行动，不超过 15 秒。",
          "观察他是否接话：接话就轻聊，不接就专注报信息。",
        ]);

  const reply = relationship?.active
    ? lines([
        relationship.reply,
        relationship.hardRisk
          ? "这类内容不能继续接，先回到正常游戏陪玩。"
          : payload.game_state
            ? `再接当前局势：${payload.game_state}，别让关系话题把本单节奏带跑。`
            : "再接当前局势，别让关系话题把本单节奏带跑。",
      ])
    : payload.shorter
    ? (splitList(boss.memory_effective_lines)[0] || "没事，这两把节奏确实乱。下一把我帮你多看信息，咱们先把开局稳住。")
    : fun
      ? lines([
          payload.soft === "是" ? "懂了，今天主打快乐局。咱们先轻松点来，压力别放太前面。" : "懂了，今天主打快乐局。赢了血赚，输了也得整出点节目效果。",
          payload.game_state ? `不过${payload.game_state}，下一波我还是帮你盯一下关键信息。` : "不过下一波我还是帮你盯一下关键信息，节目效果归节目效果，能赢咱也不放过。",
        ])
      : lines([
          payload.soft === "是" ? "这两把节奏确实有点乱，先别急着怪自己。我下一把多帮你看信息，咱们慢慢稳回来。" : "这两把节奏确实有点乱。我下一把多帮你看信息，咱们先把开局稳住。",
          payload.game_state ? `刚才${payload.game_state}，下一局我们先打简单一点：少冒险，先拿信息，再找机会。` : "刚才那波先过去，下一局我们先打简单一点：少冒险，先拿信息，再找机会。",
          "你要是不想说话也没事，我先多报点，等手感回来咱再慢慢聊。",
          boss.memory_effective_lines ? `之前有效的说法：${boss.memory_effective_lines}` : "",
        ]);

  return {
    judgment,
    currentStrategy: strategy,
    reply,
    gentle: lines([
      relationship ? relationship.reply.split("\n")[0] : "",
      payload.soft === "是" ? "没事，刚才确实不好打。你先缓一下，我陪你慢慢找手感。" : "刚才确实不好打，我们先把下一波处理简单点。",
      "这把先别想太多，我在旁边帮你看着点，咱们一波一波来。",
    ]),
    lively: lines([
      relationship ? (relationship.mode === "可恋爱感营业" ? "你这话有点会撩，那我今天稍微偏心你一点，先带你把节奏找回来。" : "这个话题先轻轻接住，咱今天主线还是把游戏打爽。") : "",
      payload.humor === "是" ? "这两把节奏有点抽象，下一把咱们把场子找回来。" : "这两把节奏乱了点，下一把我们先稳住。",
      "先稳住，等会儿赢一波我再帮你把气氛拉回来。",
    ]),
    technical: lines([
      relationship ? "关系话题先按你的营业意愿处理，当前局势也要同步给到具体打法。" : "",
      payload.game_state ? `下一把针对${payload.game_state}，我多报位置和技能信息，开局先别急着接第一波硬架。` : "下一把我多报位置和技能信息，开局先别急着接第一波硬架。",
      "我们先拿信息，能打再打，不能打就退一步等队友节奏。",
    ]),
    avoid: [
      ...(relationship?.hardRisk
        ? [
            "色情或违法内容。（硬风险不能接）",
            "未成年、威胁、勒索相关内容。（必须回避）",
          ]
        : relationship
          ? ["没问清陪玩意愿就直接推进现实关系。（可能和本单需求不一致）"]
          : []),
      "你怎么不说话？（会把沉默变成压力）",
      "别生气了。（像在否定他的情绪）",
      "其实你刚才也有点问题。（输局后容易顶起来）",
      "这队友真没救。（短期爽，后面更容易上头）",
      "要不别打了吧。（会显得你先泄气）",
    ],
    note: lines([
      boss.disliked_style ? `结合老板雷点：${boss.disliked_style}。这轮先避开这些表达，等他主动开口再延展话题。` : "",
      boss.memory_next_probe ? `本次顺手观察：${boss.memory_next_probe}` : "",
      relationship ? `关系互动观察：${relationship.nextProbe}` : "",
    ]),
  };
}

function generateSimulate(payload) {
  const boss = getBoss(payload.boss_id) || {};
  const name = bossLabel(boss);
  const scenario = String(payload.scenario || "自定义");
  const emotion = String(payload.emotion || "");
  const playerMessage = String(payload.player_message || "");
  const chatContext = String(payload.chat_context || "");
  const gameState = String(payload.game_state || "");
  const chatHistory = Array.isArray(payload.chat_history) ? payload.chat_history : [];
  const previousPlayerTurns = chatHistory.filter((message) => message.role === "player").length;
  const memoryText = bossMemoryText(boss);
  const recentMemoryText = bossRecentMemoryText(boss.id, 2);
  const relationship = relationshipInteractionSignal(boss, `${scenario} ${emotion} ${playerMessage} ${chatContext}`);
  const typeText = splitList(boss.customer_type).join("、") || "未记录类型";
  const quiet = includesAny(`${scenario} ${emotion} ${chatContext}`, ["沉默", "不想说话", "疲惫"]);
  const angry = includesAny(`${scenario} ${emotion} ${chatContext}`, ["暴躁", "烦", "输", "连输"]);
  const fun = includesAny(`${scenario} ${emotion} ${chatContext}`, ["开心", "整活", "想聊天", "关系互动"]);
  const technical = String(boss.customer_type).includes("上分") || includesAny(boss.preferred_style, ["技术", "节奏", "报点"]);
  const persona = inferBossChatPersona(boss, { scenario, emotion, chatContext, gameState });
  const intent = inferPlayerMessageIntent(playerMessage);
  const bossReply = simulateBossPersonaReply({
    boss,
    persona,
    intent,
    relationship,
    payload,
    chatHistory,
    previousPlayerTurns,
    quiet,
    angry,
    fun,
    technical,
  });

  const emotionShift = lines([
    simulateMoodLine(name, quiet, angry, fun, persona),
    intent.label ? `你这句是在${intent.label}，别接成一段说明文。` : "",
    relationship ? relationshipShortLine(relationship) : "",
    gameState ? `他现在还惦记着局里这点：${gameState}。` : "",
  ]);

  const readSignal = lines([
    memoryText ? `记着他的老习惯：${compactBossMemoryForChat(boss)}` : "",
    recentMemoryText ? `最近那点也别丢：${compactRecentMemoryForChat(recentMemoryText)}` : "",
    chatHistory.length ? `已经聊到第 ${previousPlayerTurns + 1} 轮了，别突然换成客服口吻。` : "",
    persona.reading ? `这个老板大概是：${persona.reading}。` : "",
    playerMessage.includes("吗") ? "你问得有点多的话，他可能只回很短，下一句给个轻选择就行。" : "这句压力不大，先看他愿不愿意多回。",
  ]);

  const nextSuggestion = relationship
    ? lines([
        relationship.hardRisk ? "直接收回来：这个不聊了，开下一把吧。" : relationshipNextLine(relationship),
        "后面补一句游戏里的事，别一直围着关系聊。",
      ])
    : angry
      ? lines([
          "别讲道理，先把话压短。",
          gameState ? `可以说：刚才${gameState}，这把我多报关键点。` : "可以说：刚才先过去，这把我多报关键点。",
        ])
      : quiet
        ? lines([
            "少问一句，给他空间。",
            "可以说：你今天话少也没事，我先看信息。",
          ])
        : lines([
            "轻轻接一下，再给个选择。",
            "可以说：那先热两把，你想快乐点还是认真冲？",
          ]);

  return {
    bossReply,
    emotionShift,
    readSignal,
    nextSuggestion,
    avoid: [
      relationship?.hardRisk ? "别继续接那种越界话题。" : "",
      relationship && !relationship.hardRisk ? "别一口答应见面或恋爱，先看你自己接不接。" : "",
      angry ? "别刚输就复盘他哪里错。" : "",
      quiet ? "别连着问他为什么不说话。" : "",
      "别像换个老板名的模板。",
    ].filter(Boolean),
  };
}

function simulateMoodLine(name, quiet, angry, fun, persona) {
  if (angry) return `${name}现在还有点烦，能听短句，听不进大道理。`;
  if (quiet || persona.slow) return `${name}现在像是想安静打，不太想被追着聊。`;
  if (fun || persona.playful) return `${name}这会儿还能接梗，但别突然变正经。`;
  if (persona.relationship) return `${name}是在试你怎么接近一点，不一定真要马上推进。`;
  if (persona.confiding) return `${name}更像是想有人陪着，不想被安排一堆话。`;
  return `${name}还在看你说话自然不自然。`;
}

function relationshipShortLine(relationship) {
  if (relationship.hardRisk) return "这类话题直接收住。";
  if (relationship.mode === "可恋爱感营业") return "可以轻轻接一点亲近感，但别承诺太满。";
  if (relationship.mode === "只轻微暧昧") return "能接一点玩笑，别往现实关系推。";
  if (relationship.mode === "不做恋爱感") return "接住尴尬就行，别往恋爱感走。";
  return "你还没定营业尺度，先别说死。";
}

function relationshipNextLine(relationship) {
  if (relationship.mode === "可恋爱感营业") return "可以说：那今天先偏心你一点，别光嘴上说。";
  if (relationship.mode === "只轻微暧昧") return "可以说：你别突然太认真，我就轻轻接一下。";
  if (relationship.mode === "不做恋爱感") return "可以说：我刚才有点不好意思，先打游戏。";
  return "可以说：先不聊那么远，今天先打舒服点。";
}

function compactBossMemoryForChat(boss) {
  return firstValue(
    [
      boss.memory_recent_signals,
      boss.memory_relationship,
      boss.memory_interaction_style,
      boss.memory_profile,
      boss.memory_direction,
      boss.preferred_style,
    ].filter(Boolean).join("\n"),
    "先看他接话速度",
  );
}

function compactRecentMemoryForChat(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.replace(/^近期订单：/, "").replace(/^近期求助：/, "").trim())
    .filter(Boolean)[0] || "先按最近一次舒服的节奏来";
}

function inferBossChatPersona(boss = {}, context = {}) {
  const typeText = splitList(boss.customer_type).join(" ");
  const memoryText = [
    boss.preferred_style,
    boss.disliked_style,
    boss.favorite_topics,
    boss.emotion_pattern,
    boss.memory_profile,
    boss.memory_interaction_style,
    boss.memory_relationship,
    boss.memory_recent_signals,
    boss.memory_direction,
    boss.notes,
    context.scenario,
    context.emotion,
    context.chatContext,
  ].filter(Boolean).join(" ");
  const technical = includesAny(`${typeText} ${memoryText}`, ["上分", "技术", "节奏", "报点", "阵容"]);
  const playful = includesAny(`${typeText} ${memoryText}`, ["整活", "搞笑", "接梗", "节目效果", "快乐"]);
  const confiding = includesAny(`${typeText} ${memoryText}`, ["倾诉", "陪伴", "工作累", "聊天", "温柔"]);
  const slow = includesAny(`${typeText} ${memoryText}`, ["慢热", "沉默", "安静", "低压", "话少"]);
  const relationship = includesAny(`${typeText} ${memoryText}`, relationshipSignalKeywords);
  const styleLabel = technical
    ? "看重游戏效率的老板"
    : playful
      ? "爱接梗的娱乐型老板"
      : relationship
        ? "会试探关系感的老板"
        : confiding
          ? "需要陪伴感的老板"
          : slow
            ? "慢热低回应老板"
            : "先观察体验的老板";
  const reading = [
    technical ? "更在意你有没有用，废话多会减分" : "",
    playful ? "愿意接轻松梗，但讨厌突然客服感" : "",
    confiding ? "会看你有没有接住情绪和日常话题" : "",
    slow ? "回复偏短，需要低压推进" : "",
    relationship ? "可能会试探亲近感，但要看陪玩关系模式" : "",
  ].filter(Boolean).join("；") || "先观察你说话自然不自然，再决定要不要多聊";
  return {
    styleLabel,
    reading,
    technical,
    playful,
    confiding,
    slow,
    relationship,
  };
}

function inferPlayerMessageIntent(message) {
  const text = String(message || "");
  const asksPreference = includesAny(text, ["想打", "想玩", "要不要", "还是", "你想", "吗"]);
  const comfort = includesAny(text, ["没事", "别急", "慢慢", "舒服", "放松", "不急", "别上压力"]);
  const gamePlan = includesAny(text, ["报点", "信息", "节奏", "开局", "阵容", "技能", "稳", "下一把", "这把"]);
  const relationship = includesAny(text, relationshipSignalKeywords);
  const joke = includesAny(text, ["哈哈", "笑死", "整活", "节目效果", "偏心", "专属", "会撩"]);
  const apology = includesAny(text, ["不好意思", "抱歉", "我的", "失误"]);
  const label = relationship
    ? "接关系话题"
    : gamePlan
      ? "给游戏安排"
      : comfort
        ? "安抚情绪"
        : joke
          ? "轻松接梗"
          : apology
            ? "修复体验"
            : asksPreference
              ? "试探老板偏好"
              : "自然接话";
  return {
    label,
    asksPreference,
    comfort,
    gamePlan,
    relationship,
    joke,
    apology,
  };
}

function simulateBossPersonaReply(options) {
  const {
    boss,
    persona,
    intent,
    relationship,
    payload,
    chatHistory,
    previousPlayerTurns,
    quiet,
    angry,
    fun,
    technical,
  } = options;
  const memoryText = `${boss.memory_profile || ""} ${boss.memory_interaction_style || ""} ${boss.memory_recent_signals || ""} ${boss.memory_relationship || ""}`;
  const topic = firstValue(boss.favorite_topics, firstValue(boss.games, "这把游戏"));
  const alreadySaid = chatHistory.map((message) => message.text).join("\n");
  const turn = previousPlayerTurns + 1;

  const candidates = [];
  if (relationship?.hardRisk) {
    candidates.push("这个别聊了，开下一把吧。");
    candidates.push("别往那边聊了，正常玩。");
  } else if (relationship?.active || intent.relationship) {
    candidates.push(...relationshipPersonaReplies(relationship, turn, payload, persona));
  } else if (intent.apology) {
    candidates.push("别一直道歉啦，后面稳点就行。");
    candidates.push("知道了，先打吧。你别比我还紧张。");
    candidates.push("没事，下一把你多提醒我点位。");
  } else if (angry) {
    candidates.push(technical || persona.technical
      ? "先别哄了，点位和技能多报点。"
      : "先开吧，刚才有点烦。");
    candidates.push("这把少聊点，赢一波再说。");
    candidates.push("我现在就想把节奏打回来。");
  } else if (quiet || persona.slow) {
    candidates.push(intent.asksPreference
      ? `先打${firstValue(boss.games, "这把")}吧，我今天可能话少。`
      : "你先按你的节奏来，我听着。");
    candidates.push("不用一直找话题，陪着打就行。");
    candidates.push("我今天有点懒得说话，你报关键的就行。");
  } else if (intent.gamePlan || technical || persona.technical) {
    candidates.push(`那你先帮我看${topic}这块。`);
    candidates.push("这样说我能听懂，先按这个来。");
    candidates.push("关键时候提醒我就行，别讲太满。");
  } else if (intent.joke || fun || persona.playful) {
    candidates.push(turn > 1
      ? "你别突然正经起来啊，刚才那样就行。"
      : "那今天轻松点，别一上来就复盘我。");
    candidates.push("主打快乐一点吧，输了也别念我。");
    candidates.push("你能接梗就行，别太绷。");
  } else if (persona.confiding || includesAny(memoryText, ["工作累", "累", "倾诉"])) {
    candidates.push("慢慢打吧，我今天不太想上压力。");
    candidates.push("就轻松玩会儿吧，别一直催我说话。");
    candidates.push("有人陪着打就行，先不用聊太满。");
  } else {
    candidates.push(turn > 1
      ? "先继续吧，我看你后面稳不稳。"
      : "先试两把看看。");
    candidates.push("先开吧，自然点就行。");
    candidates.push("别太刻意，正常陪我打就好。");
  }

  const picked = pickFreshReply(candidates, alreadySaid, `${payload.player_message || ""} ${payload.chat_context || ""}`);
  return personalizeBossReply(picked, boss, persona, intent, payload);
}

function relationshipPersonaReplies(relationship, turn, payload, persona) {
  if (!relationship) {
    return ["这话题转得有点快，先打吧。", "先别聊这么远，开了再说。"];
  }
  if (relationship.mode === "可恋爱感营业") {
    return [
      turn > 1 ? "你还挺会顺着我说的。那今天先偏心我一点。" : "你这么说我会有点开心，别光嘴上说啊。",
      "见面先不急，我先看你今天陪得怎么样。",
      persona.playful ? "你有点会撩啊，等会儿坑了我可不认。" : "",
    ];
  }
  if (relationship.mode === "只轻微暧昧") {
    return [
      "你这回答还挺自然的，先打吧。",
      "别突然太认真，我就随口逗一下。",
      "赢了再考虑多跟你聊两句。",
    ];
  }
  if (relationship.mode === "不做恋爱感") {
    return [
      "那就先打游戏吧，我刚才随口说的。",
      "可以，别搞得太尴尬就行。",
    ];
  }
  return [
    "你别一下子说太满，先打吧。",
    "先不聊那么远，看看今天相处得怎么样。",
    "那先陪我打舒服点，后面再说。",
  ];
}

function pickFreshReply(candidates, previousText, seedText = "") {
  const cleanCandidates = candidates.filter(Boolean);
  const fresh = cleanCandidates.filter((reply) => !previousText.includes(reply.slice(0, 10)));
  const pool = fresh.length ? fresh : cleanCandidates;
  if (!pool.length) return "嗯，先打吧。";
  const seed = Array.from(String(seedText || "")).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return pool[seed % pool.length];
}

function personalizeBossReply(reply, boss, persona, intent, payload) {
  let text = reply;
  if (intent.asksPreference && persona.playful && !text.includes("快乐")) {
    text += " 今天别太严肃，能快乐就先快乐。";
  }
  if (intent.comfort && persona.slow && !text.includes("不用一直")) {
    text += " 报关键的就行。";
  }
  if (payload.game_state && intent.gamePlan && !text.includes("开局")) {
    text += ` ${payload.game_state}你提醒我一下。`;
  }
  if (boss.disliked_style && includesAny(boss.disliked_style, ["客服", "客服感"]) && !text.includes("别太官方") && text.length < 28) {
    text += " 别太官方就行。";
  }
  return softenChatReply(text);
}

function softenChatReply(reply) {
  return String(reply || "")
    .replaceAll("可以，", "")
    .replaceAll("行，", "")
    .replaceAll("嗯，", "")
    .replaceAll("你正常发挥就行", "正常来就行")
    .replaceAll("别太客服感", "别太官方")
    .replaceAll("陪玩", "陪打")
    .trim();
}

function generateReview(payload) {
  const boss = getBoss(payload.boss_id) || {};
  const name = bossLabel(boss);
  const hadSilence = payload.had_silence === "是";
  const renewed = payload.renewed === "是";
  const complaint = payload.complaint === "是";
  const relationship = relationshipInteractionSignal(boss, `${payload.important_notes || ""} ${payload.result || ""} ${payload.boss_emotion || ""} ${payload.good_points || ""} ${payload.improvements || ""}`);
  const recentMemoryText = bossRecentMemoryText(boss.id, 3);
  const repurchase = complaint ? "低" : relationship?.hardRisk ? "低" : renewed ? "高" : hadSilence ? "中" : "中高";
  const plan = reviewAttributePlan(payload);
  const baseProfileUpdate = hadSilence
    ? {
        preferred_style: "沉默或输局阶段更适合低压力陪伴，先给空间再辅助游戏信息。",
        disliked_style: "不适合追问沉默原因，不适合评价刚才操作。",
        emotion_pattern: "输局或节奏乱时可能沉默，需要短句稳定情绪。",
        notes: "下次开局前准备低压力开场，避免强行热场。",
        memory_profile: boss.memory_profile || "输局或沉默时需要低压力陪伴。",
        memory_interaction_style: boss.memory_interaction_style || "先给空间和游戏信息，再按接话速度调整聊天密度。",
        memory_relationship: boss.memory_relationship || "",
        memory_recent_signals: payload.important_notes || "",
        memory_direction: "逆风或沉默时先降聊天密度，用报点和短句陪伴稳住节奏。",
        memory_openers: "老板今天先轻松热两把，不急着上压力。\n你要是想安静点也没事，我多帮你看信息。",
        memory_effective_lines: "你要是不想说话也没事，我先多报点。\n刚才那波先过去，下一局我们先打简单一点。",
        memory_risks: "不要追问沉默原因；不要评价刚才操作；不要马上开玩笑。",
        memory_next_probe: "下次观察第一把逆风后是否还接话，决定聊天密度。",
      }
    : {
        preferred_style: "对自然轻松的互动接受度较好，可以从上次游戏体验切入。",
        disliked_style: complaint ? "出现不满时先承认体验问题，不要辩解或催单。" : "",
        emotion_pattern: `${payload.boss_emotion || "情绪稳定"}时互动较顺，可以适度延续话题。`,
        notes: payload.important_notes ? `本次重要信息：${payload.important_notes}` : "下次继续记录老板喜欢的英雄、打法和聊天节奏。",
        memory_profile: boss.memory_profile || "自然轻松互动接受度较好，适合从上次游戏体验切入。",
        memory_interaction_style: boss.memory_interaction_style || "先轻松热手，再根据接话速度调整聊天。",
        memory_relationship: boss.memory_relationship || "",
        memory_recent_signals: payload.important_notes || "",
        memory_direction: "从上次体验自然切入，先轻松热手，再根据接话速度调整聊天。",
        memory_openers: makeOpening(boss, payload.game, state.persona.style),
        memory_effective_lines: payload.good_points || "自然接话、不过度追问，比强行热场更稳。",
        memory_risks: complaint ? "有不满时先承认体验问题，不要辩解或催单。" : boss.memory_risks || "",
        memory_next_probe: payload.improvements || "继续观察老板更喜欢游戏信息、轻松聊天还是安静陪伴。",
      };
  const profileUpdate = relationship
    ? {
        ...baseProfileUpdate,
        preferred_style: appendUniqueLine(baseProfileUpdate.preferred_style, relationship.hardRisk ? "硬风险内容不接，回到正常游戏陪玩。" : "关系话题按陪玩本人营业意愿处理，不默认禁止，也不默认推进。"),
        disliked_style: appendUniqueLine(baseProfileUpdate.disliked_style, relationship.hardRisk ? "色情、违法、胁迫、未成年、隐私勒索相关内容不能接。" : ""),
        emotion_pattern: appendUniqueLine(baseProfileUpdate.emotion_pattern, "提到恋爱、暧昧、私联或见面时，需要结合陪玩营业意愿判断是推进、轻接还是不接。"),
        notes: appendUniqueLine(baseProfileUpdate.notes, `${relationship.label}：${relationship.source}出现恋爱、暧昧、私联或见面倾向，后续按关系互动信号处理。`),
        memory_profile: appendUniqueLine(baseProfileUpdate.memory_profile, "老板有关系互动信号，需要记录他想要的是恋爱感、轻微暧昧、线下推进还是玩笑试探。"),
        memory_interaction_style: appendUniqueLine(baseProfileUpdate.memory_interaction_style, "关系话题要按陪玩本人 relationship_mode 分流生成，不做一刀切。"),
        memory_relationship: appendUniqueLine(baseProfileUpdate.memory_relationship, `${relationship.mode}：${relationship.strategy}`),
        memory_recent_signals: appendUniqueLine(baseProfileUpdate.memory_recent_signals, payload.important_notes || relationship.summary),
        memory_direction: appendUniqueLine(baseProfileUpdate.memory_direction, relationship.hardRisk ? "硬风险内容不接，正常结束或转回游戏。" : "根据陪玩关系营业意愿，在恋爱感营业、轻微暧昧、不做恋爱感之间选择合适路线。"),
        memory_openers: appendUniqueLine(baseProfileUpdate.memory_openers, relationship.reply),
        memory_effective_lines: appendUniqueLine(baseProfileUpdate.memory_effective_lines, relationship.reply),
        memory_risks: appendUniqueLine(baseProfileUpdate.memory_risks, relationship.risks),
        memory_next_probe: appendUniqueLine(baseProfileUpdate.memory_next_probe, relationship.nextProbe),
      }
    : baseProfileUpdate;
  const nextOpening = relationship ? lines([makeOpening(boss, payload.game, state.persona.style), `如果他再提关系：${relationship.reply.split("\n")[0]}`]) : makeOpening(boss, payload.game, state.persona.style);

  return {
    summary: lines([
      `${name}本单${payload.result || "整体完成"}，整体情绪是${payload.boss_emotion || "未记录"}，整体体验先按“${repurchase}复购”判断。`,
      `复盘字段判断：${plan.silencePlan} ${plan.renewedPlan} ${plan.complaintPlan} ${plan.emotionPlan}`,
      hadSilence ? "中途出现冷场，说明逆风或疲惫时不适合强行热场；低压力报信息比连续聊天更稳。" : "本单互动较顺，说明自然接话有效，不需要刻意把聊天强度拉太高。",
      renewed ? "本次已经续单，下次维护重点是延续体验，不要立刻重复催下一单。" : "本次未续单，后续联系要从上次体验切入，不要直接问要不要再点。",
      recentMemoryText ? `结合近期记忆：${recentMemoryText}` : "",
      relationship ? `${relationship.label}：${relationship.summary} 后续不能只记录，要把关系互动偏好、陪玩意愿和下次观察点写进记忆。` : "",
      payload.important_notes ? `需要记住的信息：${payload.important_notes}` : "",
    ]),
    profileUpdate,
    nextOpening,
    nextContact: renewed
      ? lines([
          "可以在 1-2 天后自然联系，时间选他常在线的时段。",
          "第一句别提“续单”，先接上次体验：老板上次后面那几把手感还挺顺，今晚还打不打？",
          relationship ? (relationship.hardRisk ? "如果再次出现硬风险内容，不继续接。" : "联系时可从游戏体验切入；对方再提关系，就按陪玩 relationship_mode 选择推进、轻接或不接。") : "",
          "如果没回复就停住，不要连续追问；隔一天再从游戏状态切一次就够了。",
        ])
      : lines([
          "建议 2-3 天后晚上 8 点左右自然联系，从上次游戏体验切入。",
          "可发：老板这两天还打不打？上次后面节奏其实找回来了，今晚想轻松玩的话我在。",
          relationship ? (relationship.hardRisk ? "不要继续接硬风险话题。" : "不要默认封死关系话题，也不要默认推进；先确认本单营业尺度。") : "",
          "如果对方只简单回复，就别马上推时长，先问今天想认真打还是轻松热手。",
        ]),
    repurchase,
    performance: lines([
      `做得好的地方：${payload.good_points || "本次服务节奏稳定，没有过度打扰老板。"}`,
      `下次改进：${payload.improvements || "继续记录老板偏好、雷点和逆风时的反应。"}`,
      `属性复盘：${plan.silencePlan} ${plan.complaintPlan}`,
      relationship ? `关系互动处理：${relationship.strategy}` : "",
      `维护重点：下次联系先接上次体验和${payload.game || boss.games || "常玩游戏"}状态，不要一开口就问下不下单。`,
      hadSilence ? "下次一旦出现沉默，先减少问题，改成报点和短句陪伴，等他主动接话再轻聊。" : "下次可以保留这次的自然节奏，重点复用老板愿意接的话题。",
    ]),
  };
}

function makeOpening(boss, game, style) {
  const targetGame = game || boss.games || "今天的游戏";
  const name = bossLabel(boss);
  const topic = firstValue(boss.favorite_topics, "上次后面那几把");
  if (String(style).includes("技术")) {
    return lines([
      `${name}，今天还打${targetGame}吗？前两把我先帮你看节奏，咱们稳一点找手感。`,
      `如果想上分，开局我多报信息，咱们先别急着硬接第一波。`,
      `上次${topic}还挺顺的，今天可以先按那个节奏来。`,
    ]);
  }
  if (String(style).includes("整活") || String(style).includes("搞笑")) {
    return lines([
      `${name}，今天还打${targetGame}吗？咱们轻松点来，赢了血赚，输了也有素材。`,
      `先热手两把，状态好咱们认真冲，状态一般就主打快乐局。`,
      `上次${topic}挺有节目效果的，今天看看还能不能复刻一下。`,
    ]);
  }
  return lines([
    `${name}，今天还打${targetGame}吗？上次后面状态挺好的，今天咱们继续慢慢找手感。`,
    `你要是刚上线还没热开，我先陪你轻松打两把，不急着上压力。`,
    `如果今天想安静点也没事，我多帮你看信息，咱们按舒服的节奏来。`,
  ]);
}

function generateContactMessage(boss) {
  const game = splitList(boss.games)[0] || "游戏";
  if (String(boss.customer_type).includes("上分")) {
    return `老板今晚打不打${game}？我可以先帮你看阵容和节奏，咱们稳一点冲。`;
  }
  if (String(boss.customer_type).includes("整活")) {
    return `老板今晚打不打${game}？上次节目效果挺足的，今天可以继续快乐一下。`;
  }
  return `老板今晚打不打${game}？上次后面几把状态挺不错的，今天可以轻松找找手感。`;
}

function renderOutput(output) {
  const items = [
    ["本单服务策略", output.serviceStrategy],
    ["开场话术", output.opening],
    ["推荐聊天话题", output.topics],
    ["老板雷点提醒", output.warning],
    ["情绪判断", output.judgment],
    ["当前最优策略", output.currentStrategy],
    ["推荐话术", output.reply],
    ["温柔版本", output.gentle],
    ["活泼版本", output.lively],
    ["技术版本", output.technical],
    ["模拟老板回复", output.bossReply],
    ["他现在", output.emotionShift],
    ["看出来", output.readSignal],
    ["你接", output.nextSuggestion],
    ["本次订单总结", output.summary],
    ["老板画像更新建议", formatProfileUpdate(output.profileUpdate)],
    ["下次开场话术", output.nextOpening],
    ["下次联系建议", output.nextContact],
    ["复购概率", output.repurchase],
    ["陪玩表现建议", output.performance],
    ["别踩", output.avoid],
    ["补充提醒", output.note],
  ].filter(([, value]) => value && (!Array.isArray(value) || value.length));

  return items.map(([title, value]) => outputCard(title, value)).join("");
}

function formatProfileUpdate(profileUpdate) {
  if (!profileUpdate || typeof profileUpdate !== "object") return profileUpdate;
  return [
    profileUpdate.preferred_style ? `偏好：${profileUpdate.preferred_style}` : "",
    profileUpdate.disliked_style ? `雷点：${profileUpdate.disliked_style}` : "",
    profileUpdate.emotion_pattern ? `情绪模式：${profileUpdate.emotion_pattern}` : "",
    profileUpdate.notes ? `备注：${profileUpdate.notes}` : "",
    profileUpdate.memory_profile ? `长期画像：${profileUpdate.memory_profile}` : "",
    profileUpdate.memory_interaction_style ? `互动偏好：${profileUpdate.memory_interaction_style}` : "",
    profileUpdate.memory_relationship ? `关系互动：${profileUpdate.memory_relationship}` : "",
    profileUpdate.memory_recent_signals ? `近期信号：${profileUpdate.memory_recent_signals}` : "",
    profileUpdate.memory_direction ? `沟通方向：${profileUpdate.memory_direction}` : "",
    profileUpdate.memory_openers ? `可复用开场：${profileUpdate.memory_openers}` : "",
    profileUpdate.memory_effective_lines ? `有效话术：${profileUpdate.memory_effective_lines}` : "",
    profileUpdate.memory_risks ? `风险提醒：${profileUpdate.memory_risks}` : "",
    profileUpdate.memory_next_probe ? `下次观察：${profileUpdate.memory_next_probe}` : "",
  ].filter(Boolean);
}

function outputCard(title, value) {
  const content = Array.isArray(value)
    ? `<ol>${value.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`
    : `<p>${escapeHtml(value)}</p>`;
  const copyText = Array.isArray(value) ? value.join("\n") : value;
  return `
    <article class="output-card">
      <header>
        <h4>${escapeHtml(title)}</h4>
        <div class="mini-actions">
          <button class="copy-button" type="button" data-copy="${escapeHtml(copyText)}">复制</button>
          <button class="copy-button" type="button" data-favorite-title="${escapeHtml(title)}" data-favorite-text="${escapeHtml(copyText)}">收藏</button>
        </div>
      </header>
      ${content}
    </article>
  `;
}

function inputField(label, name, value = "", required = false, type = "text") {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input type="${type}" name="${name}" value="${escapeHtml(value)}" ${required ? "required" : ""} />
    </label>
  `;
}

function textareaField(label, name, value = "", required = false) {
  return `
    <label class="field full">
      <span>${escapeHtml(label)}</span>
      <textarea name="${name}" ${required ? "required" : ""}>${escapeHtml(value)}</textarea>
    </label>
  `;
}

function selectField(label, name, options, selected = "") {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <select name="${name}">
        ${options.map((option) => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function bindRouteButtons() {
  appView.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
  });
}

function bindCopyButtons() {
  appView.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const text = button.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        toastMessage("已复制");
      } catch {
        toastMessage("当前浏览器不支持自动复制");
      }
    });
  });

  appView.querySelectorAll("[data-favorite-text]").forEach((button) => {
    button.addEventListener("click", () => {
      addFavorite(button.dataset.favoriteTitle, button.dataset.favoriteText);
    });
  });
}

function setBusy(button, busy, text = "处理中") {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = text;
    button.disabled = true;
    return;
  }
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
  delete button.dataset.originalText;
}

function addFavorite(title, text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return;
  const exists = state.favorites.some((item) => item.text === cleanText);
  if (exists) {
    toastMessage("这条话术已收藏");
    return;
  }
  state.favorites.unshift({
    id: id("favorite"),
    title: title || "常用话术",
    text: cleanText,
    created_at: today(),
  });
  saveState();
  toastMessage("已收藏到话术库");
}

function render() {
  const currentRoute = route();
  renderNav();
  setHeader(currentRoute);

  const [base, action, itemId] = currentRoute.split("/");

  if (base === "home") renderHome();
  else if (base === "bosses" && action === "new") renderBossForm("new");
  else if (base === "bosses" && action === "edit") renderBossForm("edit", itemId);
  else if (base === "bosses" && action) renderBossDetail(action);
  else if (base === "bosses") renderBosses();
  else if (base === "persona") renderPersona();
  else if (base === "prep") renderPrep(action);
  else if (base === "assist") renderAssist(action);
  else if (base === "simulate") renderSimulator(action);
  else if (base === "review") renderReview(action);
  else if (base === "orders") renderOrders();
  else if (base === "reminders") renderReminders();
  else if (base === "library") renderLibrary();
  else if (base === "settings") renderSettings();
  else renderHome();
}

document.querySelector("#reset-demo").addEventListener("click", () => {
  const confirmed = window.confirm("确认重置为示例数据？本地修改会被覆盖。");
  if (!confirmed) return;
  state = structuredClone(defaultState);
  saveState();
  toastMessage("示例数据已重置");
  render();
});

window.addEventListener("hashchange", render);
initializeSession().then(render);
