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
globalThis.__testApi = { state, aiKinds, aiOutputSchemas, generateAiOutput, generateAiOutputAsync, normalizeAiOutput, generatePrep, generateAssist, generateReview, renderOutput, normalizeImportedState, mergeBossProfileSuggestion, filterOrders };`,
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
  for (const route of ["home", "bosses", "persona", "prep", "assist", "review", "orders", "library", "settings"]) {
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
  assert.match(server, /\/login/);
  assert.match(server, /\/api\/login/);
  assert.match(server, /\/api\/logout/);
  assert.match(server, /\/api\/session/);
  assert.match(server, /AUTH_PASSWORD/);
  assert.match(server, /AUTH_SESSION_SECRET/);
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
  assert.match(env, /AI_API_MODE=chat/);
  assert.match(env, /AI_TIMEOUT_MS=30000/);
  assert.match(env, /AI_HTTP_CLIENT=fetch/);
  assert.match(env, /AUTH_PASSWORD=/);
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

test("login protection is documented and exposed in settings", () => {
  const app = read(appPath);
  const readme = read(path.join(root, "README.md"));
  const deployDoc = read(deployDocPath);
  const githubDeployDoc = read(githubDeployDocPath);

  assert.match(app, /data-logout/);
  assert.match(app, /\/api\/logout/);
  assert.match(app, /window\.location\.assign\("\/login"\)/);
  assert.match(readme, /服务端登录保护/);
  assert.match(deployDoc, /AUTH_PASSWORD=设置一个强密码/);
  assert.match(deployDoc, /\/api\/login/);
  assert.match(deployDoc, /Authorization: Bearer <token>/);
  assert.match(githubDeployDoc, /AUTH_PASSWORD/);
  assert.match(githubDeployDoc, /HttpOnly/);
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
});

test("local data model includes sample persona, bosses, orders, and assists", () => {
  const app = read(appPath);
  assert.match(app, /persona:\s*{/);
  assert.match(app, /bosses:\s*\[/);
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
  assert.ok(Array.isArray(prep.avoid));

  const assist = context.generateAssist({
    boss_id: bossId,
    situation: "老板输了两把，现在不怎么说话。",
    emotion: "输游戏后烦躁",
    humor: "否",
  });
  assert.equal(typeof assist.judgment, "string");
  assert.equal(typeof assist.currentStrategy, "string");
  assert.equal(typeof assist.reply, "string");
  assert.ok(Array.isArray(assist.avoid));

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
  assert.equal(typeof review.nextOpening, "string");
  assert.equal(typeof review.nextContact, "string");
  assert.match(review.repurchase, /高|中|低/);
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
    avoid: ["不要催单"],
  });

  assert.match(html, /本单服务策略/);
  assert.match(html, /开场话术/);
  assert.match(html, /推荐聊天话题/);
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
  assert.throws(() => context.normalizeImportedState({ bosses: {} }), /bosses 格式错误/);
});

test("profile suggestions merge into structured boss fields without duplicates", () => {
  const context = loadAppContext();
  const boss = {
    preferred_style: "轻松自然",
    disliked_style: "不要催单",
    emotion_pattern: "输局后沉默",
    notes: "老客户",
  };
  const merged = context.mergeBossProfileSuggestion(boss, {
    preferred_style: "轻松自然",
    disliked_style: "不适合追问沉默原因",
    emotion_pattern: "赢局后会主动聊天",
    notes: "下次准备低压力开场",
  });

  assert.equal(merged.preferred_style, "轻松自然");
  assert.match(merged.disliked_style, /不要催单/);
  assert.match(merged.disliked_style, /不适合追问沉默原因/);
  assert.match(merged.emotion_pattern, /赢局后会主动聊天/);
  assert.match(merged.notes, /下次准备低压力开场/);
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
