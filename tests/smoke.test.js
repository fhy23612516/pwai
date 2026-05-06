const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const appPath = path.join(root, "app.js");
const indexPath = path.join(root, "index.html");
const stylesPath = path.join(root, "styles.css");
const aiContractPath = path.join(root, "docs", "ai-contract.md");
const deployDocPath = path.join(root, "docs", "deploy.md");
const githubDeployDocPath = path.join(root, "docs", "github-and-deploy.md");
const packagePath = path.join(root, "package.json");
const serverPath = path.join(root, "server.js");
const deployDir = path.join(root, "deploy");
const deployEnvPath = path.join(deployDir, "pwai.env.example");
const deployServicePath = path.join(deployDir, "pwai.service");
const deployNginxPath = path.join(deployDir, "nginx-pwai.conf");
const installSystemdPath = path.join(deployDir, "install-systemd.sh");
const installNginxPath = path.join(deployDir, "install-nginx.sh");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function createDomStub() {
  const elements = new Map();

  function makeElement(selector = "") {
    const element = {
      selector,
      dataset: {},
      classList: {
        add() {},
        remove() {},
      },
      addEventListener() {},
      querySelector() {
        return makeElement();
      },
      querySelectorAll() {
        return [];
      },
      innerHTML: "",
      textContent: "",
    };
    elements.set(selector || `element-${elements.size}`, element);
    return element;
  }

  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, makeElement(selector));
      return elements.get(selector);
    },
  };

  return { document, elements };
}

function loadAppContext() {
  const code = read(appPath);
  const { document } = createDomStub();
  const storage = new Map();
  const context = {
    console,
    document,
    localStorage: {
      getItem(key) {
        return storage.get(key) || null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
    },
    navigator: {
      clipboard: {
        writeText() {
          return Promise.resolve();
        },
      },
    },
    window: {
      location: { hash: "" },
      addEventListener() {},
      clearTimeout() {},
      setTimeout() {
        return 0;
      },
      confirm() {
        return true;
      },
    },
    structuredClone,
    FormData,
    Date,
    Math,
    String,
    Array,
    Object,
    RegExp,
    JSON,
    Map,
    Set,
  };

  vm.createContext(context);
  vm.runInContext(
    `${code}
globalThis.__testApi = { state, aiKinds, aiOutputSchemas, generateAiOutput, generateAiOutputAsync, normalizeAiOutput, generatePrep, generateAssist, generateSimulate, generateReview, renderOutput, normalizeImportedState, mergeBossProfileSuggestion, filterOrders, bossMemoryText, bossRecentMemoryText, normalizeBoss, relationshipInteractionSignal, formatProfileUpdate };`,
    context,
    { filename: appPath },
  );
  return context.__testApi;
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("required static files exist and are not empty", () => {
  for (const filePath of [
    indexPath,
    stylesPath,
    appPath,
    packagePath,
    serverPath,
    deployEnvPath,
    deployServicePath,
    deployNginxPath,
    installSystemdPath,
    installNginxPath,
  ]) {
    const stats = fs.statSync(filePath);
    assert.ok(stats.size > 0, `${path.basename(filePath)} should not be empty`);
  }
});

test("index.html loads the app assets", () => {
  const html = read(indexPath);
  assert.match(html, /<div class="app-shell">/);
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css"/);
  assert.match(html, /<script src="\.\/app\.js"><\/script>/);
  assert.match(html, /id="app-view"/);
  assert.match(html, /id="app-nav"/);
});

test("navigation covers the MVP workflow", () => {
  const app = read(appPath);
  for (const route of ["home", "bosses", "persona", "prep", "assist", "simulate", "review", "orders", "library", "settings"]) {
    assert.match(app, new RegExp(`id: "${route}"`), `${route} route should be configured`);
  }
  for (const handler of [
    "renderHome",
    "renderBosses",
    "renderBossDetail",
    "renderBossForm",
    "renderPersona",
    "renderPrep",
    "renderAssist",
    "renderSimulator",
    "renderReview",
    "renderOrders",
    "renderReminders",
    "renderLibrary",
    "renderSettings",
  ]) {
    assert.match(app, new RegExp(`function ${handler}\\(`), `${handler} should exist`);
  }
});

test("AI contract documents required output schemas", () => {
  const contract = read(aiContractPath);
  for (const field of [
    "serviceStrategy",
    "opening",
    "topics",
    "judgment",
    "currentStrategy",
    "reply",
    "bossReply",
    "emotionShift",
    "readSignal",
    "nextSuggestion",
    "summary",
    "profileUpdate",
    "nextContact",
    "repurchase",
  ]) {
    assert.match(contract, new RegExp(field), `${field} should be documented`);
  }
});

test("deployment files expose start script and health check", () => {
  const packageJson = JSON.parse(read(packagePath));
  const server = read(serverPath);
  const deployDoc = read(deployDocPath);
  const githubDeployDoc = read(githubDeployDocPath);

  assert.equal(packageJson.scripts.start, "node server.js");
  assert.match(packageJson.scripts.test, /tests\/smoke\.test\.js/);
  assert.match(packageJson.scripts.test, /tests\/auth-flow\.test\.js/);
  assert.match(server, /\/healthz/);
  assert.match(server, /\/api\/ai/);
  assert.match(server, /bossReply/);
  assert.match(server, /老板情景模拟/);
  assert.match(server, /\/login/);
  assert.match(server, /\/api\/login/);
  assert.match(server, /\/api\/register/);
  assert.match(server, /\/api\/logout/);
  assert.match(server, /\/api\/session/);
  assert.match(server, /AUTH_USERS_FILE/);
  assert.match(server, /AUTH_ALLOW_REGISTRATION/);
  assert.match(server, /AUTH_SESSION_SECRET/);
  assert.match(server, /scryptSync/);
  assert.match(server, /password_hash/);
  assert.match(server, /HttpOnly/);
  assert.match(server, /Authorization/);
  assert.match(server, /Bearer/);
  assert.match(server, /AUTH_REQUIRED/);
  assert.match(server, /AI_PROVIDER_NOT_CONFIGURED/);
  assert.match(server, /chat\/completions/);
  assert.match(server, /AI_API_MODE/);
  assert.match(server, /OPENAI_BASE_URL/);
  assert.match(server, /OPENAI_MODEL/);
  assert.match(server, /selectModel/);
  assert.match(server, /OPENAI_MODEL_\$\{String\(kind/);
  assert.match(server, /AI_TIMEOUT_MS/);
  assert.match(server, /OPENAI_REASONING_EFFORT/);
  assert.match(server, /OPENAI_DISABLE_RESPONSE_STORAGE/);
  assert.match(server, /body\.store = false/);
  assert.match(server, /clean\.endsWith\("\/v1"\)/);
  assert.match(server, /AI_HTTP_CLIENT/);
  assert.match(server, /execFile\("curl"/);
  assert.match(server, /--data-binary/);
  assert.match(server, /OPENAI_RESPONSE_FORMAT/);
  assert.match(server, /json_object/);
  assert.match(server, /OPENAI_MAX_OUTPUT_TOKENS/);
  assert.match(server, /getMaxOutputTokens/);
  assert.match(server, /减少 AI 味/);
  assert.match(server, /不要使用“首先、其次/);
  assert.match(server, /场景细化要求/);
  assert.match(server, /memory_direction/);
  assert.match(server, /memory_recent_signals/);
  assert.match(server, /memory_openers/);
  assert.match(server, /不能只替换游戏名或老板名/);
  assert.match(server, /不要只做关键词替换/);
  assert.match(server, /关系互动信号/);
  assert.match(server, /relationship_mode/);
  assert.match(server, /谈恋爱/);
  assert.match(server, /线下见面/);
  assert.match(server, /硬风险/);
  assert.match(server, /OPENAI_API_KEY/);
  assert.match(server, /process\.env\.PORT/);
  assert.match(deployDoc, /npm start/);
  assert.match(deployDoc, /\/healthz/);
  for (const pattern of [/git remote add origin/, /git push/, /PM2/, /systemd/, /Nginx/, /4188/, /git revert/]) {
    assert.match(githubDeployDoc, pattern);
  }
});

test("versioned server config templates target the deployed service", () => {
  const env = read(deployEnvPath);
  const service = read(deployServicePath);
  const nginx = read(deployNginxPath);
  const installSystemd = read(installSystemdPath);
  const installNginx = read(installNginxPath);

  assert.match(env, /PORT=4188/);
  assert.match(env, /OPENAI_API_KEY=/);
  assert.match(env, /OPENAI_BASE_URL=https:\/\/api\.openai\.com\/v1/);
  assert.match(env, /OPENAI_MODEL=gpt-4o-mini/);
  assert.match(env, /OPENAI_MODEL_PREP=/);
  assert.match(env, /OPENAI_MODEL_ASSIST=/);
  assert.match(env, /OPENAI_MODEL_REVIEW=/);
  assert.match(env, /OPENAI_MAX_OUTPUT_TOKENS=1200/);
  assert.match(env, /AI_API_MODE=chat/);
  assert.match(env, /AI_TIMEOUT_MS=30000/);
  assert.match(env, /AI_HTTP_CLIENT=fetch/);
  assert.match(env, /AUTH_USERS_FILE=\/etc\/pwai\/users\.json/);
  assert.match(env, /AUTH_ALLOW_REGISTRATION=true/);
  assert.match(env, /AUTH_SESSION_SECRET=/);
  assert.match(env, /AUTH_SESSION_TTL_SECONDS=604800/);
  assert.match(env, /AUTH_COOKIE_NAME=pwai_session/);
  assert.match(env, /AUTH_COOKIE_SECURE=true/);
  assert.match(env, /OPENAI_REASONING_EFFORT=/);
  assert.match(env, /OPENAI_DISABLE_RESPONSE_STORAGE=true/);
  assert.match(env, /OPENAI_RESPONSE_FORMAT=json_object/);
  assert.match(env, /MAX_BODY_BYTES=65536/);
  assert.match(service, /WorkingDirectory=\/opt\/pwai/);
  assert.match(service, /EnvironmentFile=-\/etc\/pwai\/pwai\.env/);
  assert.match(nginx, /server_name pwai\.heiheihei\.pw/);
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:4188/);
  assert.match(installSystemd, /systemctl restart pwai/);
  assert.match(installNginx, /sites-available\/pwai/);
  assert.match(installNginx, /sites-enabled\/pwai/);
  assert.doesNotMatch(installNginx, /conf\.d\/pwai\.conf/);
  assert.match(installNginx, /nginx -t/);
});

test("account auth is documented and exposed in settings", () => {
  const app = read(appPath);
  const readme = read(path.join(root, "README.md"));
  const deployDoc = read(deployDocPath);
  const githubDeployDoc = read(githubDeployDocPath);

  assert.match(app, /data-logout/);
  assert.match(app, /currentUser/);
  assert.match(app, /activeStorageKey/);
  assert.match(app, /\$\{STORAGE_KEY\}:\$\{data\.user\.id\}/);
  assert.match(app, /\/api\/logout/);
  assert.match(app, /window\.location\.assign\("\/login"\)/);
  assert.match(readme, /账号注册 \/ 登录/);
  assert.match(deployDoc, /账号注册和登录/);
  assert.match(deployDoc, /AUTH_USERS_FILE=\/etc\/pwai\/users\.json/);
  assert.match(deployDoc, /\/api\/register/);
  assert.match(deployDoc, /\/api\/login/);
  assert.match(deployDoc, /Authorization: Bearer <token>/);
  assert.match(githubDeployDoc, /users\.json/);
  assert.match(githubDeployDoc, /HttpOnly/);
  assert.match(githubDeployDoc, /OPENAI_MAX_OUTPUT_TOKENS/);
});

test("frontend exposes async remote AI fallback path", () => {
  const app = read(appPath);
  assert.match(app, /async function generateAiOutputAsync/);
  assert.match(app, /fetch\(state\.settings\.remote_endpoint/);
  assert.match(app, /远程 AI 不可用，已使用本地模板/);
  assert.match(app, /setBusy/);
});

test("AI provider settings are part of local state", () => {
  const context = loadAppContext();
  assert.equal(context.state.settings.ai_provider, "local");
  assert.equal(context.state.settings.remote_endpoint, "/api/ai");

  const normalized = context.normalizeImportedState({
    persona: { nickname: "测试" },
    bosses: [],
    orders: [],
    assists: [],
    favorites: [],
  });
  assert.equal(normalized.settings.ai_provider, "local");
  assert.equal(normalized.persona.relationship_mode, "未说明，多方案考虑");
});

test("local data model includes sample persona, bosses, orders, and assists", () => {
  const app = read(appPath);
  assert.match(app, /persona:\s*{/);
  assert.match(app, /bosses:\s*\[/);
  assert.match(app, /memory_direction/);
  assert.match(app, /memory_openers/);
  assert.match(app, /memory_effective_lines/);
  assert.match(app, /memory_risks/);
  assert.match(app, /memory_next_probe/);
  assert.match(app, /memory_profile/);
  assert.match(app, /memory_interaction_style/);
  assert.match(app, /memory_relationship/);
  assert.match(app, /memory_recent_signals/);
  assert.match(app, /relationship_mode/);
  assert.match(app, /orders:\s*\[/);
  assert.match(app, /assists:\s*\[/);
  assert.match(app, /favorites:\s*\[/);
  assert.match(app, /阿辰/);
  assert.match(app, /南风/);
});

test("AI simulators return the fields expected by the renderer", () => {
  const context = loadAppContext();
  const bossId = context.state.bosses[0].id;

  const prep = context.generatePrep({
    boss_id: bossId,
    game: "瓦罗兰特",
    goal: "轻松上分",
    style: "温柔陪伴型",
  });
  assert.equal(typeof prep.serviceStrategy, "string");
  assert.equal(typeof prep.opening, "string");
  assert.ok(Array.isArray(prep.topics));
  assert.ok(prep.opening.split("\n").length >= 2);
  assert.ok(prep.topics.length >= 4);
  assert.ok(prep.avoid.length >= 4);
  assert.ok(Array.isArray(prep.avoid));
  assert.match(prep.serviceStrategy, /老板记忆/);

  const assist = context.generateAssist({
    boss_id: bossId,
    situation: "老板输了两把，现在不怎么说话。",
    emotion: "输游戏后烦躁",
    humor: "否",
  });
  assert.equal(typeof assist.judgment, "string");
  assert.equal(typeof assist.currentStrategy, "string");
  assert.equal(typeof assist.reply, "string");
  assert.ok(assist.reply.length > 40);
  assert.ok(assist.currentStrategy.split("\n").length >= 3);
  assert.ok(assist.avoid.length >= 4);
  assert.ok(Array.isArray(assist.avoid));
  assert.match(`${assist.judgment}\n${assist.currentStrategy}\n${assist.note}`, /记忆|观察/);

  const simulation = context.generateSimulate({
    boss_id: bossId,
    scenario: "老板沉默",
    emotion: "沉默",
    game_state: "刚进房间，准备第一把",
    player_message: "老板今天先轻松热两把，不急着上压力。",
    chat_context: "老板刚进房间，还没怎么说话。",
  });
  assert.equal(typeof simulation.bossReply, "string");
  assert.equal(typeof simulation.emotionShift, "string");
  assert.equal(typeof simulation.readSignal, "string");
  assert.equal(typeof simulation.nextSuggestion, "string");
  assert.ok(Array.isArray(simulation.avoid));
  assert.match(`${simulation.bossReply}\n${simulation.readSignal}\n${simulation.nextSuggestion}`, /先打|记忆|下一句|舒服的节奏/);

  const review = context.generateReview({
    boss_id: bossId,
    game: "瓦罗兰特",
    result: "前期输了两把，后面赢了两把",
    boss_emotion: "开心",
    had_silence: "否",
    renewed: "否",
    complaint: "否",
    good_points: "没有强行追问",
    improvements: "下次多记录英雄偏好",
  });
  assert.equal(typeof review.summary, "string");
  assert.equal(typeof review.profileUpdate, "object");
  assert.equal(typeof review.profileUpdate.preferred_style, "string");
  assert.equal(typeof review.profileUpdate.memory_direction, "string");
  assert.equal(typeof review.profileUpdate.memory_openers, "string");
  assert.equal(typeof review.nextOpening, "string");
  assert.equal(typeof review.nextContact, "string");
  assert.ok(review.summary.split("\n").length >= 3);
  assert.ok(review.nextContact.split("\n").length >= 2);
  assert.match(review.repurchase, /高|中|低/);
});

test("AI quality guidance avoids thin generic output", () => {
  const app = read(appPath);
  const server = read(serverPath);
  const contract = read(aiContractPath);
  const deployDoc = read(deployDocPath);

  for (const pattern of [/lines\(\[/, /具体判断条件/, /多条可复制话术/, /少用“首先、其次/, /OPENAI_MAX_OUTPUT_TOKENS=1200/]) {
    assert.match(`${app}\n${server}\n${contract}\n${deployDoc}`, pattern);
  }

  const context = loadAppContext();
  const bossId = context.state.bosses[0].id;
  const prep = context.generatePrep({ boss_id: bossId, game: "瓦罗兰特", goal: "轻松上分", style: "温柔陪伴型" });
  const assist = context.generateAssist({ boss_id: bossId, situation: "老板输了两把，现在不怎么说话。", emotion: "输游戏后烦躁" });
  const review = context.generateReview({
    boss_id: bossId,
    game: "瓦罗兰特",
    result: "前期输了两把，后面赢了两把",
    boss_emotion: "开心",
    had_silence: "否",
    renewed: "否",
    complaint: "否",
  });

  assert.doesNotMatch(`${prep.serviceStrategy}\n${assist.currentStrategy}\n${review.summary}`, /首先|其次|综上|情绪价值|建立连接|破冰/);
  assert.ok(prep.serviceStrategy.length > 120);
  assert.ok(assist.currentStrategy.length > 100);
  assert.ok(review.performance.length > 80);
});

test("AI contract documents relationship interaction routing and memory", () => {
  const readme = read(path.join(root, "README.md"));
  const contract = read(aiContractPath);
  const changelog = read(path.join(root, "CHANGELOG.md"));

  for (const pattern of [/关系互动信号/, /relationship_mode/, /不默认禁止/, /硬风险/, /memory_profile/, /memory_relationship/, /轻量 Hermes 式记忆/]) {
  assert.match(`${readme}\n${contract}\n${changelog}`, pattern);
  }
});

test("AI simulator chat uses boss persona and relationship memory", () => {
  const context = loadAppContext();
  context.state.persona.relationship_mode = "可恋爱感营业";
  const bossId = "boss-simulate-test";
  context.state.bosses.push({
    id: bossId,
    nickname: "模拟老板",
    games: "瓦罗兰特",
    customer_type: ["倾诉型"],
    preferred_style: "温柔、带一点专属感",
    disliked_style: "客服感",
    favorite_topics: "恋爱感、游戏节奏",
    avoid_topics: "太严肃",
    emotion_pattern: "赢了之后会主动聊天",
    memory_profile: "喜欢轻松陪伴，也会试探关系感。",
    memory_interaction_style: "吃专属感，喜欢自然暧昧但讨厌油。",
    memory_relationship: "提过想谈恋爱，也问过能不能见面。",
    memory_recent_signals: "上次赢了之后明显更愿意聊天。",
    memory_direction: "关系互动可以按可恋爱感营业轻接。",
    memory_openers: "",
    memory_effective_lines: "",
    memory_risks: "",
    memory_next_probe: "观察他是认真推进关系还是玩笑试探。",
  });
  context.state.orders.unshift({
    id: "order-simulate-test",
    boss_id: bossId,
    game: "瓦罗兰特",
    duration: "2 小时",
    result: "后半段赢了两把",
    boss_emotion: "开心",
    important_notes: "老板说想见面。",
    review_summary: "关系互动要轻接，不要油。",
    created_at: "2026-05-05",
  });

  const output = context.generateSimulate({
    boss_id: bossId,
    scenario: "关系互动",
    emotion: "开心",
    game_state: "刚赢一把，气氛比较轻松",
    player_message: "你说想见面我有点意外，那今天我先偏心你一点。",
    chat_context: "老板刚才说想谈恋爱，还问以后能不能线下见。",
  });

  assert.match(output.bossReply, /偏心|见面|陪得怎么样/);
  assert.match(output.emotionShift, /关系信号|可恋爱感营业/);
  assert.match(output.readSignal, /长期记忆命中|近期记忆命中|relationship_mode/);
  assert.match(output.nextSuggestion, /可恋爱感营业|游戏信息|关系话题/);
  assert.ok(output.avoid.some((item) => /营业尺度|现实关系|硬风险/.test(item)));
});

test("AI simulators respond to form attributes instead of keyword swaps", () => {
  const context = loadAppContext();
  const bossId = context.state.bosses[0].id;

  const shortQuietPrep = context.generatePrep({
    boss_id: bossId,
    game: "瓦罗兰特",
    goal: "轻松娱乐",
    duration: "1 小时",
    emotion: "沉默",
    style: "温柔陪伴型",
    is_old: "否",
    need_active: "不需要",
  });
  const longActivePrep = context.generatePrep({
    boss_id: bossId,
    game: "瓦罗兰特",
    goal: "认真上分",
    duration: "包晚",
    emotion: "开心",
    style: "技术带飞型",
    is_old: "是",
    need_active: "需要",
  });
  assert.notEqual(shortQuietPrep.serviceStrategy, longActivePrep.serviceStrategy);
  assert.match(shortQuietPrep.serviceStrategy, /本单时间短|低回应|新客户|不需要主动热场/);
  assert.match(longActivePrep.serviceStrategy, /包晚单|目标偏上分|老客户|需要更主动/);

  const softAssist = context.generateAssist({
    boss_id: bossId,
    situation: "老板输了两把，现在不怎么说话。",
    emotion: "沉默",
    game_state: "连输两把，队友节奏比较乱",
    reply_style: "温柔陪伴型",
    soft: "是",
    humor: "否",
  });
  const funnyAssist = context.generateAssist({
    boss_id: bossId,
    situation: "老板想整活，刚才那把节目效果很足。",
    emotion: "想整活",
    game_state: "优势局，准备抱团推进",
    reply_style: "元气搞笑型",
    soft: "否",
    humor: "是",
  });
  assert.notEqual(softAssist.reply, funnyAssist.reply);
  assert.match(`${softAssist.judgment}\n${softAssist.currentStrategy}`, /更委婉|低压|连输两把/);
  assert.match(`${funnyAssist.judgment}\n${funnyAssist.currentStrategy}\n${funnyAssist.reply}`, /允许幽默|接梗|优势局/);

  const complaintReview = context.generateReview({
    boss_id: bossId,
    game: "瓦罗兰特",
    duration: "1 小时",
    result: "前期连续输，后面没打回来",
    boss_emotion: "暴躁",
    had_silence: "是",
    renewed: "否",
    complaint: "是",
    important_notes: "老板说今天不想被一直问。",
    good_points: "有及时收住聊天。",
    improvements: "下次少追问。",
  });
  const renewedReview = context.generateReview({
    boss_id: bossId,
    game: "瓦罗兰特",
    duration: "3 小时",
    result: "前期热手，后面连赢三把",
    boss_emotion: "开心",
    had_silence: "否",
    renewed: "是",
    complaint: "否",
    important_notes: "老板喜欢轻松吐槽。",
    good_points: "顺着名场面自然聊天。",
    improvements: "多准备英雄话题。",
  });
  assert.notEqual(complaintReview.summary, renewedReview.summary);
  assert.equal(complaintReview.repurchase, "低");
  assert.equal(renewedReview.repurchase, "高");
  assert.match(complaintReview.summary, /出现冷场|有不满|情绪偏上头/);
  assert.match(renewedReview.summary, /没有明显冷场|已续单|情绪正向/);
});

test("AI simulators route relationship interaction by persona mode", () => {
  const context = loadAppContext();
  const bossId = "boss-relationship-test";
  context.state.bosses.push({
    id: bossId,
    nickname: "关系老板",
    games: "瓦罗兰特",
    customer_type: ["倾诉型"],
    preferred_style: "温柔自然",
    disliked_style: "太冷淡",
    favorite_topics: "游戏节奏",
    avoid_topics: "现实隐私、感情问题",
    emotion_pattern: "聊开心后容易推进关系",
    memory_profile: "倾诉型老板，容易把陪玩关系聊成亲密关系。",
    memory_interaction_style: "吃一点专属感和恋爱感，但也在意游戏体验。",
    memory_relationship: "老板之前说想和我谈恋爱，提过线下见面。",
    memory_recent_signals: "上次复盘记录：他问过能不能加微信。",
    memory_direction: "按陪玩本人 relationship_mode 决定是推进、轻接还是不做恋爱感。",
    memory_openers: "",
    memory_effective_lines: "",
    memory_risks: "",
    memory_next_probe: "观察他是真的想恋爱感、线下推进还是玩笑试探。",
    repurchase_level: "中",
    last_order_at: "2026-05-04",
    notes: "关系话题不能只记关键词，要按营业意愿分析。",
  });
  context.state.orders.unshift({
    id: "order-relationship-test",
    boss_id: bossId,
    game: "瓦罗兰特",
    duration: "2 小时",
    result: "整体顺利",
    boss_emotion: "开心",
    had_silence: false,
    renewed: false,
    important_notes: "老板说想谈恋爱，也提过线下见面。",
    review_summary: "关系互动要按陪玩意愿分流。",
    created_at: "2026-05-04",
  });

  const signal = context.relationshipInteractionSignal(context.state.bosses.at(-1));
  assert.equal(signal.label, "关系互动信号");
  assert.equal(signal.source, "老板记忆");
  assert.equal(signal.mode, "未说明，多方案考虑");

  const prep = context.generatePrep({
    boss_id: bossId,
    game: "瓦罗兰特",
    goal: "轻松上分",
    duration: "2 小时",
    emotion: "开心",
    style: "温柔陪伴型",
  });
  assert.match(`${prep.serviceStrategy}\n${prep.warning}\n${prep.opening}`, /关系互动信号|未说明，多方案考虑|可推进|轻微暧昧|不推进|近期互动参考/);

  const assist = context.generateAssist({
    boss_id: bossId,
    situation: "老板又说想和我谈恋爱，还想线下见面。",
    emotion: "开心",
    game_state: "准备进攻下一小局",
    reply_style: "温柔陪伴型",
    soft: "是",
    humor: "否",
  });
  assert.match(`${assist.judgment}\n${assist.currentStrategy}\n${assist.reply}\n${assist.note}`, /关系互动信号|关系互动策略|可推进|轻微暧昧|不推进|relationship_mode/);
  assert.ok(assist.avoid.some((item) => /陪玩意愿|本单需求/.test(item)));

  const review = context.generateReview({
    boss_id: bossId,
    game: "瓦罗兰特",
    duration: "2 小时",
    result: "整体顺利",
    boss_emotion: "开心",
    had_silence: "否",
    renewed: "否",
    complaint: "否",
    important_notes: "老板想和我谈恋爱，还提到加微信和线下见面。",
    good_points: "有及时转回游戏。",
    improvements: "下次更早判断营业尺度。",
  });
  assert.match(review.summary, /关系互动信号|关系互动偏好|下次观察点/);
  assert.match(review.profileUpdate.memory_profile, /关系互动信号/);
  assert.match(review.profileUpdate.memory_relationship, /未说明，多方案考虑|分流/);
  assert.match(review.profileUpdate.memory_recent_signals, /谈恋爱|线下见面/);
  assert.match(review.profileUpdate.memory_direction, /关系营业意愿|恋爱感营业|轻微暧昧|不做恋爱感/);
  assert.match(review.profileUpdate.memory_next_probe, /恋爱感|线下推进|玩笑试探/);
  assert.match(`${review.nextContact}\n${review.performance}`, /relationship_mode|推进、轻接或不接|关系互动处理/);
  assert.match(context.formatProfileUpdate(review.profileUpdate).join("\n"), /长期画像|关系互动|近期信号|沟通方向|下次观察/);
});

test("AI simulators respect explicit romance business mode and hard risks", () => {
  const context = loadAppContext();
  const boss = {
    nickname: "测试老板",
    memory_relationship: "老板喜欢恋爱感营业，说过想谈恋爱。",
  };

  context.state.persona.relationship_mode = "可恋爱感营业";
  const romantic = context.relationshipInteractionSignal(boss, "老板说想谈恋爱，问能不能见面");
  assert.equal(romantic.label, "可推进恋爱感营业");
  assert.match(romantic.strategy, /轻度恋爱感营业/);
  assert.doesNotMatch(romantic.risks, /不承诺恋爱关系/);

  context.state.persona.relationship_mode = "不做恋爱感";
  const bounded = context.relationshipInteractionSignal(boss, "老板说想谈恋爱");
  assert.equal(bounded.label, "不做恋爱感互动");
  assert.match(bounded.strategy, /不推进恋爱感/);

  const hardRisk = context.relationshipInteractionSignal(boss, "老板提到色情和裸聊");
  assert.equal(hardRisk.label, "硬风险信号");
  assert.equal(hardRisk.hardRisk, true);
  assert.match(hardRisk.strategy, /不接色情|违法/);
});

test("AI adapter normalizes outputs for all supported scenarios", () => {
  const context = loadAppContext();
  const bossId = context.state.bosses[0].id;

  const prep = context.generateAiOutput(context.aiKinds.prep, {
    boss_id: bossId,
    game: "瓦罗兰特",
    goal: "轻松上分",
    style: "温柔陪伴型",
  });
  for (const field of context.aiOutputSchemas.prep) {
    assert.ok(field in prep, `prep should include ${field}`);
  }
  assert.equal(prep.kind, "prep");
  assert.ok(Array.isArray(prep.topics));

  const assist = context.generateAiOutput(context.aiKinds.assist, {
    boss_id: bossId,
    situation: "老板输了两把，现在不怎么说话。",
    emotion: "沉默",
  });
  for (const field of context.aiOutputSchemas.assist) {
    assert.ok(field in assist, `assist should include ${field}`);
  }
  assert.equal(assist.kind, "assist");
  assert.ok(Array.isArray(assist.avoid));

  const simulation = context.generateAiOutput(context.aiKinds.simulate, {
    boss_id: bossId,
    scenario: "开局破冰",
    emotion: "沉默",
    player_message: "老板今天先轻松热两把。",
  });
  for (const field of context.aiOutputSchemas.simulate) {
    assert.ok(field in simulation, `simulate should include ${field}`);
  }
  assert.equal(simulation.kind, "simulate");
  assert.ok(Array.isArray(simulation.avoid));

  const review = context.generateAiOutput(context.aiKinds.review, {
    boss_id: bossId,
    game: "瓦罗兰特",
    result: "体验较好",
    boss_emotion: "开心",
    had_silence: "否",
    renewed: "否",
    complaint: "否",
  });
  for (const field of context.aiOutputSchemas.review) {
    assert.ok(field in review, `review should include ${field}`);
  }
  assert.equal(review.kind, "review");
  assert.equal(typeof review.profileUpdate, "object");
});

test("AI adapter fills missing fields with safe defaults", () => {
  const context = loadAppContext();
  const normalized = context.normalizeAiOutput(context.aiKinds.prep, {
    opening: "老板今天还打瓦吗？",
  });

  assert.equal(normalized.serviceStrategy, "");
  assert.equal(normalized.opening, "老板今天还打瓦吗？");
  assert.ok(Array.isArray(normalized.topics));
  assert.equal(normalized.topics.length, 0);
  assert.ok(Array.isArray(normalized.avoid));
  assert.equal(normalized.avoid.length, 0);
});

test("rendered AI output contains copyable cards", () => {
  const context = loadAppContext();
  const html = context.renderOutput({
    serviceStrategy: "先降低聊天压力。",
    opening: "老板今天还打瓦吗？",
    topics: ["上次名场面", "今天想上分还是快乐"],
    bossReply: "嗯，先打吧。",
    emotionShift: "老板仍然偏低回应。",
    readSignal: "当前接话短。",
    nextSuggestion: "先多报信息。",
    avoid: ["不要催单"],
  });

  assert.match(html, /本单服务策略/);
  assert.match(html, /开场话术/);
  assert.match(html, /推荐聊天话题/);
  assert.match(html, /模拟老板回复/);
  assert.match(html, /情绪变化/);
  assert.match(html, /信号解读/);
  assert.match(html, /下一句建议/);
  assert.match(html, /不建议说的话/);
  assert.match(html, /data-copy=/);
  assert.match(html, /data-favorite-text=/);
});

test("imported state normalization keeps required collections", () => {
  const context = loadAppContext();
  const normalized = context.normalizeImportedState({
    persona: { nickname: "测试" },
    bosses: [],
    orders: [],
    assists: [],
  });

  assert.equal(normalized.persona.nickname, "测试");
  assert.ok(Array.isArray(normalized.favorites));
  const migrated = context.normalizeImportedState({
    persona: { nickname: "测试" },
    bosses: [{ id: "boss-old", nickname: "旧老板", games: "瓦罗兰特" }],
    orders: [],
    assists: [],
    favorites: [],
  });
  assert.equal(migrated.bosses[0].memory_direction, "");
  assert.equal(migrated.bosses[0].memory_profile, "");
  assert.equal(migrated.bosses[0].memory_interaction_style, "");
  assert.equal(migrated.bosses[0].memory_relationship, "");
  assert.equal(migrated.bosses[0].memory_recent_signals, "");
  assert.throws(() => context.normalizeImportedState({ bosses: {} }), /bosses 格式错误/);
});

test("profile suggestions merge into structured boss fields without duplicates", () => {
  const context = loadAppContext();
  const boss = {
    preferred_style: "轻松自然",
    disliked_style: "不要催单",
    emotion_pattern: "输局后沉默",
    notes: "老客户",
    memory_direction: "先低压陪打",
    memory_openers: "",
    memory_effective_lines: "",
    memory_risks: "",
    memory_next_probe: "",
    memory_profile: "",
    memory_interaction_style: "",
    memory_relationship: "",
    memory_recent_signals: "",
  };
  const merged = context.mergeBossProfileSuggestion(boss, {
    preferred_style: "轻松自然",
    disliked_style: "不适合追问沉默原因",
    emotion_pattern: "赢局后会主动聊天",
    notes: "下次准备低压力开场",
    memory_direction: "先低压陪打",
    memory_openers: "老板今天先轻松热两把。",
    memory_effective_lines: "你要是不想说话也没事，我先多报点。",
    memory_risks: "不要追问沉默原因",
    memory_next_probe: "观察第一把输了之后是否还接话",
    memory_profile: "慢热型老板",
    memory_interaction_style: "先少问，多报点",
    memory_relationship: "熟客感即可",
    memory_recent_signals: "最近工作累",
  });

  assert.equal(merged.preferred_style, "轻松自然");
  assert.match(merged.disliked_style, /不要催单/);
  assert.match(merged.disliked_style, /不适合追问沉默原因/);
  assert.match(merged.emotion_pattern, /赢局后会主动聊天/);
  assert.match(merged.notes, /下次准备低压力开场/);
  assert.equal(merged.memory_direction, "先低压陪打");
  assert.match(merged.memory_openers, /轻松热两把/);
  assert.match(merged.memory_effective_lines, /多报点/);
  assert.match(merged.memory_risks, /不要追问/);
  assert.match(merged.memory_next_probe, /是否还接话/);
  assert.match(merged.memory_profile, /慢热型/);
  assert.match(merged.memory_interaction_style, /少问/);
  assert.match(merged.memory_relationship, /熟客感/);
  assert.match(merged.memory_recent_signals, /工作累/);
  assert.match(context.bossMemoryText(merged), /沟通方向/);
  assert.match(context.bossMemoryText(merged), /长期画像/);
});

test("recent boss memory retrieves orders and assists", () => {
  const context = loadAppContext();
  const bossId = "boss-recent-memory";
  context.state.orders.unshift({
    id: "order-recent-memory",
    boss_id: bossId,
    game: "瓦罗兰特",
    duration: "2 小时",
    result: "连赢两把",
    boss_emotion: "开心",
    important_notes: "老板说下次想继续轻松玩。",
    review_summary: "轻松氛围有效。",
    created_at: "2026-05-04",
  });
  context.state.assists.unshift({
    id: "assist-recent-memory",
    boss_id: bossId,
    situation: "老板开玩笑说想见面。",
    emotion: "开心",
    suggestion: "按关系营业意愿处理。",
    created_at: "2026-05-04",
  });

  const memory = context.bossRecentMemoryText(bossId);
  assert.match(memory, /近期订单/);
  assert.match(memory, /近期求助/);
  assert.match(memory, /想继续轻松玩/);
  assert.match(memory, /想见面/);
});

test("order filters return expected subsets", () => {
  const context = loadAppContext();
  assert.equal(context.filterOrders("全部订单").length, context.state.orders.length);
  assert.ok(context.filterOrders("出现冷场").every((order) => order.had_silence));
  assert.ok(context.filterOrders("已续单").every((order) => order.renewed));
  assert.ok(context.filterOrders("未续单").every((order) => !order.renewed));
});

test("styles include mobile-first safeguards", () => {
  const css = read(stylesPath);
  assert.match(css, /@media \(max-width: 920px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /grid-template-columns: 1fr/);
  assert.match(css, /\.mini-actions/);
});

let passed = 0;

for (const item of tests) {
  try {
    item.fn();
    passed += 1;
    console.log(`ok - ${item.name}`);
  } catch (error) {
    console.error(`not ok - ${item.name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`${passed}/${tests.length} tests passed`);
}
