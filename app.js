const STORAGE_KEY = "pwai-state-v1";

const navItems = [
  { id: "home", label: "首页", icon: "H", title: "首页", eyebrow: "工作台" },
  { id: "bosses", label: "老板", icon: "B", title: "老板列表", eyebrow: "客户档案" },
  { id: "persona", label: "人设", icon: "P", title: "陪玩人设", eyebrow: "个人风格" },
  { id: "prep", label: "开单", icon: "S", title: "开单准备", eyebrow: "订单开始前" },
  { id: "assist", label: "求助", icon: "A", title: "实时辅助", eyebrow: "订单进行中" },
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

const aiKinds = {
  prep: "prep",
  assist: "assist",
  review: "review",
};

const aiOutputSchemas = {
  prep: ["serviceStrategy", "opening", "topics", "warning", "avoid"],
  assist: ["judgment", "currentStrategy", "reply", "gentle", "lively", "technical", "avoid"],
  review: ["summary", "profileUpdate", "nextOpening", "nextContact", "repurchase", "performance"],
};

const localAiProvider = {
  prep: generatePrep,
  assist: generateAssist,
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
  favorites: [],
  settings: {
    ai_provider: "local",
    remote_endpoint: "/api/ai",
  },
};

let state = loadState();
let currentBossFilter = "全部老板";
let currentOrderFilter = "全部订单";
let selectedBossId = null;

const appView = document.querySelector("#app-view");
const nav = document.querySelector("#app-nav");
const viewTitle = document.querySelector("#view-title");
const viewEyebrow = document.querySelector("#view-eyebrow");
const toast = document.querySelector("#toast");

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  return state.bosses.find((boss) => boss.id === bossId);
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
    };
  }
  return {
    preferred_style: "",
    disliked_style: "",
    emotion_pattern: "",
    notes: String(profileUpdate || ""),
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

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">登录状态</h3>
            <p class="card-subtitle">退出后需要重新输入服务器访问密码。</p>
          </div>
        </div>
        <div class="card-body">
          <div class="button-row">
            <button class="danger-button" type="button" data-logout>退出登录</button>
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
  appView.querySelector("[data-logout]").addEventListener("click", async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  });
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
  if (!Array.isArray(next.favorites)) next.favorites = [];
  if (!next.settings || typeof next.settings !== "object") next.settings = structuredClone(defaultState.settings);
  if (!next.persona || typeof next.persona !== "object") {
    throw new Error("persona 格式错误");
  }
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

function generatePrep(payload) {
  const boss = getBoss(payload.boss_id) || {};
  const name = bossLabel(boss);
  const game = payload.game || boss.games || "今天的游戏";
  const style = payload.style || state.persona.style;
  const opening = makeOpening(boss, payload.game, style);
  const typeText = splitList(boss.customer_type).join("、") || "未记录类型";
  const favoriteTopic = firstValue(boss.favorite_topics, "上次比较顺的那一把");
  return {
    serviceStrategy: lines([
      `${name}偏${typeText}，本单目标是“${payload.goal || "轻松体验"}”，不要一上来把聊天拉满，先把游戏状态稳住。`,
      `开局前 5 分钟先观察两件事：他接话快不快、输一波后还愿不愿意说话。接话慢就多报信息，接话快再顺着${favoriteTopic}聊。`,
      `聊天密度控制在“有回应再多接一句”，不要连续问问题；如果他沉默，先用游戏信息填空，不要追问原因。`,
      `如果局势顺，夸具体行为，比如“这波位置选得挺舒服”；如果逆风，少复盘失误，先给下一波能做的小目标。`,
    ]),
    opening,
    topics: [
      `先问${game}今天想稳一点还是轻松一点，不要直接问“要不要上分”`,
      `接上次的${favoriteTopic}，用一句短吐槽开场`,
      `问最近常玩的英雄、位置或枪法手感，只问一个点，不连环追问`,
      payload.goal?.includes("上分") ? "聊今天先保分还是试着主动找节奏" : "聊今天想认真打两把还是先热手快乐局",
      boss.emotion_pattern ? `留意情绪模式：${boss.emotion_pattern}` : "留意第一把输了之后老板还接不接话",
      state.persona.can_joke?.includes("可以") ? "如果气氛顺，可以轻轻接梗，但别把话题抢走" : "保持安静陪伴，把重点放在游戏信息",
    ],
    warning: lines([
      boss.notes ? `档案备注：${boss.notes}` : "",
      boss.disliked_style ? `雷点：${boss.disliked_style}` : "不要一开始太密集聊天，先观察老板状态。",
      boss.avoid_topics ? `避开话题：${boss.avoid_topics}` : "",
      `如果${name}回复变短、只回“嗯/行”、开始频繁叹气，就把闲聊降下来，改成报点、补信息、给下一波小目标。`,
    ]),
    avoid: [
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

  const judgment = quiet
    ? lines([
        `${name}现在不像是不想理人，更像是输局后在收情绪或想专注打下一把。`,
        "这个阶段越问“怎么了”越容易让他有压力，先把陪伴感放在游戏信息和稳定节奏上。",
        boss.emotion_pattern ? `档案里也记录过：${boss.emotion_pattern}` : "",
      ])
    : fun
      ? lines([
          `${name}现在偏娱乐局，重点不是讲道理，而是接住他的梗和情绪。`,
          "可以轻松一点，但别一直抢话；笑点过去后要把注意力拉回游戏。",
        ])
      : lines([
          `${name}现在需要稳定感，先承认局势乱，再给一个能马上执行的小方向。`,
          "不要长篇分析，不要复盘谁的问题；先让下一波有事可做。",
        ]);

  const strategy = angry
    ? lines([
        `先接住“这把确实乱”，不要评价${name}刚才的操作。`,
        `下一句话给具体安排：${gameState}，先帮他看信息、报点或提醒技能。`,
        "如果他继续沉默，就 2-3 分钟只报关键游戏信息，等他主动接话再聊。",
        "赢一波后再轻轻把气氛带回来，不要在输局马上开玩笑。",
      ])
    : fun
      ? lines([
          "先接梗，不急着纠正打法。",
          "把输赢压力往后放，但关键团前还是提醒一句重点信息。",
          "如果他笑了或继续抛梗，可以多接一句；如果没回应，就收回来认真打。",
        ])
      : lines([
          "先短句回应当前局势。",
          "第二句给下一波行动，不超过 15 秒。",
          "观察他是否接话：接话就轻聊，不接就专注报信息。",
        ]);

  const reply = payload.shorter
    ? "没事，这两把节奏确实乱。下一把我帮你多看信息，咱们先把开局稳住。"
    : fun
      ? lines([
          "懂了，今天主打快乐局。赢了血赚，输了也得整出点节目效果。",
          "不过下一波我还是帮你盯一下关键信息，节目效果归节目效果，能赢咱也不放过。",
        ])
      : lines([
          "这两把节奏确实有点乱，先别急着怪自己。我下一把多帮你看信息，咱们把开局稳住。",
          "刚才那波先过去，下一局我们先打简单一点：少冒险，先拿信息，再找机会。",
          "你要是不想说话也没事，我先多报点，等手感回来咱再慢慢聊。",
        ]);

  return {
    judgment,
    currentStrategy: strategy,
    reply,
    gentle: lines([
      "没事，刚才确实不好打。你先缓一下，我陪你慢慢找手感。",
      "这把先别想太多，我在旁边帮你看着点，咱们一波一波来。",
    ]),
    lively: lines([
      "这两把节奏有点抽象，下一把咱们把场子找回来。",
      "先稳住，等会儿赢一波我再帮你把气氛拉回来。",
    ]),
    technical: lines([
      "下一把我多报位置和技能信息，开局先别急着接第一波硬架。",
      "我们先拿信息，能打再打，不能打就退一步等队友节奏。",
    ]),
    avoid: [
      "你怎么不说话？（会把沉默变成压力）",
      "别生气了。（像在否定他的情绪）",
      "其实你刚才也有点问题。（输局后容易顶起来）",
      "这队友真没救。（短期爽，后面更容易上头）",
      "要不别打了吧。（会显得你先泄气）",
    ],
    note: boss.disliked_style ? `结合老板雷点：${boss.disliked_style}。这轮先避开这些表达，等他主动开口再延展话题。` : "",
  };
}

function generateReview(payload) {
  const boss = getBoss(payload.boss_id) || {};
  const name = bossLabel(boss);
  const hadSilence = payload.had_silence === "是";
  const renewed = payload.renewed === "是";
  const complaint = payload.complaint === "是";
  const repurchase = complaint ? "低" : renewed ? "高" : hadSilence ? "中" : "中高";
  const profileUpdate = hadSilence
    ? {
        preferred_style: "沉默或输局阶段更适合低压力陪伴，先给空间再辅助游戏信息。",
        disliked_style: "不适合追问沉默原因，不适合评价刚才操作。",
        emotion_pattern: "输局或节奏乱时可能沉默，需要短句稳定情绪。",
        notes: "下次开局前准备低压力开场，避免强行热场。",
      }
    : {
        preferred_style: "对自然轻松的互动接受度较好，可以从上次游戏体验切入。",
        disliked_style: complaint ? "出现不满时先承认体验问题，不要辩解或催单。" : "",
        emotion_pattern: `${payload.boss_emotion || "情绪稳定"}时互动较顺，可以适度延续话题。`,
        notes: payload.important_notes ? `本次重要信息：${payload.important_notes}` : "下次继续记录老板喜欢的英雄、打法和聊天节奏。",
      };

  return {
    summary: lines([
      `${name}本单${payload.result || "整体完成"}，整体情绪是${payload.boss_emotion || "未记录"}，整体体验先按“${repurchase}复购”判断。`,
      hadSilence ? "中途出现冷场，说明逆风或疲惫时不适合强行热场；低压力报信息比连续聊天更稳。" : "本单互动较顺，说明自然接话有效，不需要刻意把聊天强度拉太高。",
      renewed ? "本次已经续单，下次维护重点是延续体验，不要立刻重复催下一单。" : "本次未续单，后续联系要从上次体验切入，不要直接问要不要再点。",
      payload.important_notes ? `需要记住的信息：${payload.important_notes}` : "",
    ]),
    profileUpdate,
    nextOpening: makeOpening(boss, payload.game, state.persona.style),
    nextContact: renewed
      ? lines([
          "可以在 1-2 天后自然联系，时间选他常在线的时段。",
          "第一句别提“续单”，先接上次体验：老板上次后面那几把手感还挺顺，今晚还打不打？",
          "如果没回复就停住，不要连续追问；隔一天再从游戏状态切一次就够了。",
        ])
      : lines([
          "建议 2-3 天后晚上 8 点左右自然联系，从上次游戏体验切入。",
          "可发：老板这两天还打不打？上次后面节奏其实找回来了，今晚想轻松玩的话我在。",
          "如果对方只简单回复，就别马上推时长，先问今天想认真打还是轻松热手。",
        ]),
    repurchase,
    performance: lines([
      `做得好的地方：${payload.good_points || "本次服务节奏稳定，没有过度打扰老板。"}`,
      `下次改进：${payload.improvements || "继续记录老板偏好、雷点和逆风时的反应。"}`,
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
    ["本次订单总结", output.summary],
    ["老板画像更新建议", formatProfileUpdate(output.profileUpdate)],
    ["下次开场话术", output.nextOpening],
    ["下次联系建议", output.nextContact],
    ["复购概率", output.repurchase],
    ["陪玩表现建议", output.performance],
    ["不建议说的话", output.avoid],
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
render();
