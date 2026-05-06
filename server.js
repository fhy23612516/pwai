const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");

const root = __dirname;
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4173);
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 65536);
const appStateMaxBytes = Number(process.env.APP_STATE_MAX_BYTES || 1048576);
const aiTimeoutMs = Number(process.env.AI_TIMEOUT_MS || 30000);
const aiMaxOutputTokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 1200);
const defaultBaseUrl = "https://api.openai.com/v1";
const authUsersFile = process.env.AUTH_USERS_FILE || path.join(process.env.AUTH_DATA_DIR || "/etc/pwai", "users.json");
const appDataFile = process.env.AUTH_DATA_FILE || path.join(process.env.AUTH_DATA_DIR || "/etc/pwai", "app-data.json");
const authAllowRegistration = !["0", "false", "no", "off"].includes(String(process.env.AUTH_ALLOW_REGISTRATION ?? "true").toLowerCase());
const authCookieName = sanitizeCookieName(process.env.AUTH_COOKIE_NAME || "pwai_session");
const authSessionSecret = process.env.AUTH_SESSION_SECRET || process.env.AUTH_PASSWORD || "pwai-dev-session-secret";
const authSessionTtlSeconds = Number(process.env.AUTH_SESSION_TTL_SECONDS || 604800);
const authCookieSecure = parseBoolean(process.env.AUTH_COOKIE_SECURE);
const authUsernamePattern = /^[A-Za-z0-9_-]{3,32}$/;

const outputSchemas = {
  prep: {
    serviceStrategy: "string",
    opening: "string",
    topics: "array",
    warning: "string",
    avoid: "array",
  },
  assist: {
    judgment: "string",
    currentStrategy: "string",
    reply: "string",
    gentle: "string",
    lively: "string",
    technical: "string",
    avoid: "array",
  },
  simulate: {
    bossReply: "string",
    emotionShift: "string",
    readSignal: "string",
    nextSuggestion: "string",
    avoid: "array",
  },
  review: {
    summary: "string",
    profileUpdate: "object",
    nextOpening: "string",
    nextContact: "string",
    repurchase: "string",
    performance: "string",
  },
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(body);
}

function sendJson(response, status, data, headers = {}) {
  send(response, status, JSON.stringify(data), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
}

function readJsonBody(request, limitBytes = maxBodyBytes) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > limitBytes) {
        reject(new Error("REQUEST_BODY_TOO_LARGE"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });
    request.on("error", reject);
  });
}

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.resolve(root, `.${safePath}`);
  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return null;
  return filePath;
}

const server = http.createServer((request, response) => {
  const requestPath = getRequestPath(request);

  if (requestPath === "/healthz") {
    sendJson(response, 200, { ok: true, service: "pwai" });
    return;
  }

  if (requestPath === "/login") {
    serveLoginPage(request, response);
    return;
  }

  if (requestPath === "/api/login") {
    handleLoginRequest(request, response);
    return;
  }

  if (requestPath === "/api/register") {
    handleRegisterRequest(request, response);
    return;
  }

  if (requestPath === "/api/logout") {
    handleLogoutRequest(request, response);
    return;
  }

  if (requestPath === "/api/session") {
    handleSessionRequest(request, response);
    return;
  }

  if (!isAuthenticated(request)) {
    sendAuthRequired(request, response);
    return;
  }

  if (requestPath === "/api/ai") {
    handleAiRequest(request, response);
    return;
  }

  if (requestPath === "/api/state") {
    handleStateRequest(request, response);
    return;
  }

  const filePath = resolveRequestPath(request.url || "/");
  if (!filePath) {
    send(response, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      send(response, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=300",
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

function getRequestPath(request) {
  return (request.url || "/").split("?")[0] || "/";
}

function isAuthEnabled() {
  return true;
}

function getSessionTtlSeconds() {
  return Number.isFinite(authSessionTtlSeconds) && authSessionTtlSeconds > 0 ? authSessionTtlSeconds : 604800;
}

function currentUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

function createSessionToken(userId, issuedAt = currentUnixSeconds()) {
  const timestamp = String(issuedAt);
  const id = String(userId || "");
  return `${timestamp}.${id}.${signSessionPayload(timestamp, id)}`;
}

function signSessionPayload(timestamp, userId) {
  return crypto.createHmac("sha256", authSessionSecret).update(`${timestamp}.${userId}`).digest("base64url");
}

function getSessionFromToken(token) {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;

  const issuedAt = Number(parts[0]);
  if (!Number.isInteger(issuedAt)) return null;
  const now = currentUnixSeconds();
  if (issuedAt > now + 60) return null;
  if (now - issuedAt > getSessionTtlSeconds()) return null;
  if (!timingSafeEqual(parts[2], signSessionPayload(parts[0], parts[1]))) return null;

  const user = findUserById(parts[1]);
  if (!user) return null;

  return {
    user_id: user.id,
    username: user.username,
    issued_at: issuedAt,
  };
}

function validateSessionToken(token) {
  return Boolean(getSessionFromToken(token));
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getSessionTokenFromRequest(request) {
  const authorization = String(request.headers.authorization || "");
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();
  return parseCookies(request.headers.cookie || "")[authCookieName];
}

function isAuthenticated(request) {
  return validateSessionToken(getSessionTokenFromRequest(request));
}

function getSessionFromRequest(request) {
  return getSessionFromToken(getSessionTokenFromRequest(request));
}

function ensureUsersFile() {
  const directory = path.dirname(authUsersFile);
  fs.mkdirSync(directory, { recursive: true });
  if (!fs.existsSync(authUsersFile)) {
    fs.writeFileSync(authUsersFile, JSON.stringify({ users: [] }, null, 2));
  }
}

function readUsersStore() {
  ensureUsersFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(authUsersFile, "utf8"));
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
    };
  } catch {
    return { users: [] };
  }
}

function writeUsersStore(store) {
  ensureUsersFile();
  const temporaryPath = `${authUsersFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify({ users: store.users || [] }, null, 2));
  fs.renameSync(temporaryPath, authUsersFile);
}

function ensureAppDataFile() {
  const directory = path.dirname(appDataFile);
  fs.mkdirSync(directory, { recursive: true });
  if (!fs.existsSync(appDataFile)) {
    fs.writeFileSync(appDataFile, JSON.stringify({ users: {} }, null, 2));
  }
}

function readAppDataStore() {
  ensureAppDataFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(appDataFile, "utf8"));
    return {
      users: parsed && typeof parsed.users === "object" && !Array.isArray(parsed.users) ? parsed.users : {},
    };
  } catch {
    return { users: {} };
  }
}

function writeAppDataStore(store) {
  ensureAppDataFile();
  const temporaryPath = `${appDataFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify({ users: store.users || {} }, null, 2));
  fs.renameSync(temporaryPath, appDataFile);
}

function getUserAppState(userId) {
  const record = readAppDataStore().users[String(userId || "")];
  return record?.state && typeof record.state === "object" && !Array.isArray(record.state) ? record.state : null;
}

function setUserAppState(userId, state) {
  const store = readAppDataStore();
  const key = String(userId || "");
  const now = new Date().toISOString();
  store.users[key] = {
    state,
    updated_at: now,
  };
  writeAppDataStore(store);
  return store.users[key];
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function validateUsername(username) {
  const normalized = normalizeUsername(username);
  if (!authUsernamePattern.test(normalized)) {
    return {
      ok: false,
      error: "INVALID_USERNAME",
      message: "账号只能使用 3-32 位字母、数字、下划线或短横线。",
    };
  }
  return { ok: true, username: normalized };
}

function validatePassword(password) {
  if (String(password || "").length < 8) {
    return {
      ok: false,
      error: "WEAK_PASSWORD",
      message: "密码至少需要 8 位。",
    };
  }
  return { ok: true };
}

function findUserById(userId) {
  return readUsersStore().users.find((user) => user.id === userId) || null;
}

function findUserByUsername(username) {
  const normalized = normalizeUsername(username);
  return readUsersStore().users.find((user) => user.username === normalized) || null;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [algorithm, salt, hash] = String(storedHash || "").split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = crypto.scryptSync(String(password), salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    created_at: user.created_at,
  };
}

function sendAuthenticatedSession(response, request, user) {
  const issuedAt = currentUnixSeconds();
  const token = createSessionToken(user.id, issuedAt);
  sendJson(
    response,
    200,
    {
      ok: true,
      auth_enabled: true,
      authenticated: true,
      user: publicUser(user),
      token,
      expires_at: new Date((issuedAt + getSessionTtlSeconds()) * 1000).toISOString(),
    },
    {
      "Set-Cookie": buildSessionCookie(token, request),
    },
  );
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((cookies, item) => {
      const separator = item.indexOf("=");
      if (separator === -1) return cookies;
      const name = item.slice(0, separator).trim();
      const value = item.slice(separator + 1).trim();
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
      return cookies;
    }, {});
}

function buildSessionCookie(token, request) {
  const parts = [
    `${authCookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${getSessionTtlSeconds()}`,
  ];
  if (shouldUseSecureCookie(request)) parts.push("Secure");
  return parts.join("; ");
}

function buildClearSessionCookie(request) {
  const parts = [`${authCookieName}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (shouldUseSecureCookie(request)) parts.push("Secure");
  return parts.join("; ");
}

function shouldUseSecureCookie(request) {
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  return authCookieSecure || forwardedProto === "https";
}

function sendAuthRequired(request, response) {
  if (getRequestPath(request).startsWith("/api/")) {
    sendJson(response, 401, {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Login required.",
    });
    return;
  }
  const next = encodeURIComponent(request.url || "/");
  send(response, 302, "", {
    Location: `/login?next=${next}`,
    "Cache-Control": "no-store",
  });
}

function redirect(response, location) {
  send(response, 302, "", {
    Location: location,
    "Cache-Control": "no-store",
  });
}

async function handleLoginRequest(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request, appStateMaxBytes);
  } catch (error) {
    const status = error.message === "REQUEST_BODY_TOO_LARGE" ? 413 : 400;
    sendJson(response, status, { ok: false, error: error.message });
    return;
  }

  const usernameResult = validateUsername(body.username);
  if (!usernameResult.ok) {
    sendJson(response, 400, usernameResult);
    return;
  }

  const user = findUserByUsername(usernameResult.username);
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    sendJson(response, 401, { ok: false, error: "INVALID_CREDENTIALS", message: "账号或密码不正确。" });
    return;
  }

  sendAuthenticatedSession(response, request, user);
}

async function handleRegisterRequest(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  if (!authAllowRegistration) {
    sendJson(response, 403, { ok: false, error: "REGISTRATION_DISABLED", message: "当前服务器已关闭注册。" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    const status = error.message === "REQUEST_BODY_TOO_LARGE" ? 413 : 400;
    sendJson(response, status, { ok: false, error: error.message });
    return;
  }

  const usernameResult = validateUsername(body.username);
  if (!usernameResult.ok) {
    sendJson(response, 400, usernameResult);
    return;
  }

  const passwordResult = validatePassword(body.password);
  if (!passwordResult.ok) {
    sendJson(response, 400, passwordResult);
    return;
  }

  const store = readUsersStore();
  if (store.users.some((user) => user.username === usernameResult.username)) {
    sendJson(response, 409, { ok: false, error: "USERNAME_TAKEN", message: "这个账号已经注册。" });
    return;
  }

  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    username: usernameResult.username,
    password_hash: hashPassword(body.password),
    created_at: now,
    updated_at: now,
  };
  store.users.push(user);
  writeUsersStore(store);

  sendAuthenticatedSession(response, request, user);
}

function handleLogoutRequest(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }
  sendJson(response, 200, { ok: true, authenticated: false }, { "Set-Cookie": buildClearSessionCookie(request) });
}

function handleSessionRequest(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }
  const session = getSessionFromRequest(request);
  sendJson(response, 200, {
    ok: true,
    auth_enabled: isAuthEnabled(),
    registration_enabled: authAllowRegistration,
    authenticated: Boolean(session),
    user: session ? { id: session.user_id, username: session.username } : null,
  });
}

async function handleStateRequest(request, response) {
  const session = getSessionFromRequest(request);
  if (!session) {
    sendAuthRequired(request, response);
    return;
  }

  if (request.method === "GET") {
    const record = readAppDataStore().users[session.user_id];
    sendJson(response, 200, {
      ok: true,
      state: record?.state || null,
      updated_at: record?.updated_at || null,
    });
    return;
  }

  if (request.method !== "PUT") {
    sendJson(response, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    const status = error.message === "REQUEST_BODY_TOO_LARGE" ? 413 : 400;
    sendJson(response, status, { ok: false, error: error.message });
    return;
  }

  if (!body.state || typeof body.state !== "object" || Array.isArray(body.state)) {
    sendJson(response, 400, { ok: false, error: "INVALID_STATE", message: "state must be an object." });
    return;
  }

  const record = setUserAppState(session.user_id, body.state);
  sendJson(response, 200, {
    ok: true,
    updated_at: record.updated_at,
  });
}

function serveLoginPage(request, response) {
  if (isAuthenticated(request)) {
    redirect(response, "/");
    return;
  }

  send(response, 200, renderLoginPage(), {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
}

function renderLoginPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>登录 - 陪玩副驾 AI</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f5f7fb;
      color: #172033;
      font-family: Inter, "Microsoft YaHei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(92vw, 380px);
      padding: 28px;
      background: #fff;
      border: 1px solid #e3e8f0;
      border-radius: 8px;
      box-shadow: 0 18px 50px rgba(23, 32, 51, 0.12);
    }
    h1 { margin: 0 0 8px; font-size: 24px; line-height: 1.2; }
    p { margin: 0 0 22px; color: #647086; line-height: 1.6; }
    label { display: grid; gap: 8px; margin-top: 14px; color: #3b4659; font-weight: 700; }
    input {
      width: 100%;
      height: 44px;
      padding: 0 12px;
      border: 1px solid #cfd7e6;
      border-radius: 6px;
      font: inherit;
    }
    input:focus { border-color: #2563eb; outline: 3px solid rgba(37, 99, 235, 0.16); }
    .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 18px; }
    .tab {
      height: 38px;
      border: 1px solid #cfd7e6;
      border-radius: 6px;
      background: #fff;
      color: #3b4659;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    .tab.active { border-color: #2563eb; background: rgba(37, 99, 235, 0.1); color: #1d4ed8; }
    button {
      width: 100%;
      height: 44px;
      margin-top: 18px;
      border: 0;
      border-radius: 6px;
      background: #2563eb;
      color: #fff;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    button:disabled { cursor: progress; opacity: 0.72; }
    .error { min-height: 22px; margin-top: 14px; color: #b42318; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>陪玩副驾 AI</h1>
    <p id="intro">登录账号后继续使用。第一次进入请先注册。</p>
    <div class="tabs" role="tablist" aria-label="登录或注册">
      <button class="tab active" type="button" data-mode="login">登录</button>
      <button class="tab" type="button" data-mode="register">注册</button>
    </div>
    <form id="auth-form">
      <label>
        账号
        <input id="username" name="username" type="text" autocomplete="username" placeholder="3-32 位字母、数字、_ 或 -" required autofocus>
      </label>
      <label>
        密码
        <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      </label>
      <button type="submit" id="submit-button">登录</button>
      <div class="error" id="error" role="alert"></div>
    </form>
  </main>
  <script>
    const form = document.querySelector("#auth-form");
    const tabs = Array.from(document.querySelectorAll("[data-mode]"));
    const intro = document.querySelector("#intro");
    const button = document.querySelector("#submit-button");
    const errorBox = document.querySelector("#error");
    let mode = "login";

    function setMode(nextMode) {
      mode = nextMode;
      tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
      intro.textContent = mode === "login" ? "登录账号后继续使用。第一次进入请先注册。" : "注册一个账号，后续用账号密码登录。";
      button.textContent = mode === "login" ? "登录" : "注册并进入";
      form.password.autocomplete = mode === "login" ? "current-password" : "new-password";
      errorBox.textContent = "";
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => setMode(tab.dataset.mode));
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorBox.textContent = "";
      button.disabled = true;
      try {
        const response = await fetch(mode === "login" ? "/api/login" : "/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username.value,
            password: form.password.value
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.message || "登录失败");
        const next = new URLSearchParams(window.location.search).get("next") || "/";
        window.location.assign(next.startsWith("/") && !next.startsWith("//") ? next : "/");
      } catch (error) {
        errorBox.textContent = error.message || "登录失败";
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

async function handleAiRequest(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    const status = error.message === "REQUEST_BODY_TOO_LARGE" ? 413 : 400;
    sendJson(response, status, { ok: false, error: error.message });
    return;
  }

  const kind = payload.kind;
  if (!["prep", "assist", "simulate", "review"].includes(kind)) {
    sendJson(response, 400, { ok: false, error: "INVALID_AI_KIND" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 503, {
      ok: false,
      error: "AI_PROVIDER_NOT_CONFIGURED",
      message: "Set OPENAI_API_KEY on the server to enable remote AI.",
    });
    return;
  }

  try {
    const output = await callAiProvider(kind, payload);
    sendJson(response, 200, { ok: true, output });
  } catch (error) {
    console.error("[api/ai]", error);
    sendJson(response, 502, {
      ok: false,
      error: "AI_PROVIDER_ERROR",
      message: error.message || "Remote AI provider request failed.",
    });
  }
}

async function callAiProvider(kind, requestPayload) {
  const mode = (process.env.AI_API_MODE || "chat").toLowerCase();
  if (mode === "responses") {
    return callResponsesApi(kind, requestPayload);
  }
  return callChatCompletionsApi(kind, requestPayload);
}

async function callChatCompletionsApi(kind, requestPayload) {
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL || defaultBaseUrl);
  const body = {
    model: selectModel(kind),
    temperature: Number(process.env.OPENAI_TEMPERATURE || 0.7),
    max_tokens: getMaxOutputTokens(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(kind) },
      { role: "user", content: JSON.stringify(requestPayload) },
    ],
  };

  const data = await postProviderJson(`${baseUrl}/chat/completions`, body);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned empty chat content.");
  return normalizeProviderOutput(kind, parseJsonContent(content));
}

async function callResponsesApi(kind, requestPayload) {
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL || defaultBaseUrl);
  const body = {
    model: selectModel(kind),
    max_output_tokens: getMaxOutputTokens(),
    input: [
      { role: "system", content: buildSystemPrompt(kind) },
      { role: "user", content: JSON.stringify(requestPayload) },
    ],
  };

  if ((process.env.OPENAI_RESPONSE_FORMAT || "json_object").toLowerCase() === "json_object") {
    body.text = {
      format: {
        type: "json_object",
      },
    };
  }

  if (process.env.OPENAI_REASONING_EFFORT) {
    body.reasoning = { effort: process.env.OPENAI_REASONING_EFFORT };
  }
  if (parseBoolean(process.env.OPENAI_DISABLE_RESPONSE_STORAGE)) {
    body.store = false;
  }

  const data = await postProviderJson(`${baseUrl}/responses`, body);
  const content = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!content) throw new Error("AI provider returned empty responses content.");
  return normalizeProviderOutput(kind, parseJsonContent(content));
}

async function postProviderJson(url, body) {
  if ((process.env.AI_HTTP_CLIENT || "fetch").toLowerCase() === "curl") {
    return postProviderJsonWithCurl(url, body);
  }
  return postProviderJsonWithFetch(url, body);
}

async function postProviderJsonWithFetch(url, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), aiTimeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`AI provider returned non-JSON response: ${text.slice(0, 120)}`);
    }
    if (!response.ok) {
      const message = data.error?.message || data.message || `AI provider HTTP ${response.status}`;
      throw new Error(message);
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`AI provider request timed out after ${aiTimeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function postProviderJsonWithCurl(url, body) {
  const payload = JSON.stringify(body);
  const args = [
    "--silent",
    "--show-error",
    "--fail-with-body",
    "--max-time",
    String(Math.ceil(aiTimeoutMs / 1000)),
    "--request",
    "POST",
    url,
    "--header",
    "Content-Type: application/json",
    "--header",
    `Authorization: Bearer ${process.env.OPENAI_API_KEY}`,
    "--data-binary",
    "@-",
  ];

  return new Promise((resolve, reject) => {
    const child = execFile("curl", args, { timeout: aiTimeoutMs + 2000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const detail = stdout || stderr || error.message;
        reject(new Error(`curl provider request failed: ${String(detail).slice(0, 300)}`));
        return;
      }
      try {
        resolve(stdout ? JSON.parse(stdout) : {});
      } catch {
        reject(new Error(`curl provider returned non-JSON response: ${stdout.slice(0, 120)}`));
      }
    });
    child.stdin.end(payload);
  });
}

function normalizeBaseUrl(baseUrl) {
  const clean = String(baseUrl || defaultBaseUrl).replace(/\/+$/, "");
  return clean.endsWith("/v1") ? clean : `${clean}/v1`;
}

function selectModel(kind) {
  const key = `OPENAI_MODEL_${String(kind || "").toUpperCase()}`;
  return process.env[key] || process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function sanitizeCookieName(value) {
  const clean = String(value || "").replace(/[^A-Za-z0-9_-]/g, "");
  return clean || "pwai_session";
}

function getMaxOutputTokens() {
  return Number.isFinite(aiMaxOutputTokens) && aiMaxOutputTokens > 0 ? aiMaxOutputTokens : 1200;
}

function buildSystemPrompt(kind) {
  const sceneGuidance = {
    prep: [
      "必须逐项参考 payload.game、payload.goal、payload.duration、payload.emotion、payload.style、payload.is_old、payload.need_active；不能只替换游戏名或老板名。",
      "duration 要影响聊天密度和节奏安排；emotion 要影响开场压力；is_old 要影响是否引用历史；need_active 要影响主动程度。",
      "serviceStrategy 写 3-5 行：开局观察点、聊天密度、游戏节奏、如果老板沉默怎么调。",
      "opening 写 2-3 条可直接发的开场话术，用换行分隔，分别适配自然开场、低压开场、老客户开场。",
      "topics 给 4-6 个具体话题，不要只写大类，要能直接拿来聊。",
      "warning 写具体雷点和观察信号，说明什么时候少说、什么时候接话。",
      "avoid 给 4-6 条不建议说的话，每条后面用括号写原因。",
    ],
    assist: [
      "必须逐项参考 payload.situation、payload.emotion、payload.game_state、payload.reply_style、payload.soft、payload.humor；不同字段变化时 judgment、currentStrategy、reply 至少两项要明显变化。",
      "game_state 要影响具体打法建议；soft 要影响委婉程度；humor 要影响是否接梗；reply_style 要影响话术风格。",
      "judgment 写 2-4 句，判断老板当前更可能是沉默、烦躁、尴尬、想整活还是专注上分。",
      "currentStrategy 写 3-5 行可执行动作：现在先说什么、下一局怎么报信息、老板继续沉默怎么处理。",
      "reply 写 2-3 条可直接发的话术，用换行分隔，第一条最稳。",
      "gentle、lively、technical 分别给不同风格的可复制话术，不要只改语气词。",
      "avoid 给 4-6 条此刻不能说的话，每条后面用括号写原因。",
    ],
    simulate: [
      "这是连续对话式老板情景模拟，类似角色聊天训练沙盒；你要把 boss_profile 蒸馏成一个稳定的老板人格来对话。",
      "必须参考 payload.scenario、payload.emotion、payload.game_state、payload.player_message、payload.chat_context、payload.chat_history，以及 boss_profile 的长期记忆字段。",
      "bossReply 只能写老板当前这一轮会说出口的一段话；不要写多个候选项，不要写陪玩视角建议，不要解释你在扮演谁。",
      "bossReply 要像即时通讯里的真人短回复：1-2 句，允许短句、停顿、轻微口癖和不完整表达；不要写成完整建议文、客服话术或心理分析。",
      "必须接住 chat_history 的上一轮，不要每轮重新开场；同一段话不要反复出现，老板语气要随玩家输入、情绪和关系进展变化。",
      "如果老板画像显示慢热、上分、整活、倾诉、关系试探等不同倾向，bossReply 要明显体现对应性格和表达习惯。",
      "避免 bossReply 每次都用“嗯、行、可以、那就、先”开头；不要反复出现“正常发挥、别太客服感、打舒服了再说”。",
      "emotionShift 写老板听完陪玩这句话后的情绪变化和原因。",
      "readSignal 写这句话暴露出的老板需求、雷点、关系信号或复购信号。",
      "nextSuggestion 写陪玩下一句怎么接，必须给可复制话术。",
      "avoid 给 4-6 条本轮训练里不建议继续说的话，每条后面用括号写原因。",
    ],
    review: [
      "必须逐项参考 payload.duration、payload.result、payload.boss_emotion、payload.had_silence、payload.renewed、payload.complaint、payload.important_notes、payload.good_points、payload.improvements；不能只写通用复盘。",
      "had_silence、renewed、complaint 必须影响 summary、nextContact、repurchase、performance。",
      "summary 写 3-5 句：本单节奏、老板情绪变化、有效做法、下次要记住的点。",
      "profileUpdate 字段要写具体，可直接合并进老板档案；除 preferred_style、disliked_style、emotion_pattern、notes 外，还要尽量包含 memory_profile、memory_interaction_style、memory_relationship、memory_recent_signals、memory_direction、memory_openers、memory_effective_lines、memory_risks、memory_next_probe。",
      "如果 important_notes、boss_profile 或本单记录出现谈恋爱、暧昧、喜欢你、私下联系方式、线下见面、奔现等内容，profileUpdate 必须把它写成关系互动信号，而不是默认风险：memory_relationship 写老板关系互动偏好，memory_direction 写按陪玩 relationship_mode 选择推进、轻接或不接，memory_next_probe 写下次观察他是真的想恋爱感、线下推进还是玩笑试探。",
      "nextOpening 写 2-3 条下次可直接发的开场话术，用换行分隔。",
      "nextContact 写联系时间、第一句话、没回复时怎么处理，不要催单。",
      "performance 写做得好的地方和下次改进点，避免空泛鼓励。",
    ],
  };

  return [
    "你是陪玩副驾 AI 的服务端生成器。",
    "除 simulate 场景里的 bossReply 需要扮演老板外，其他输出对象都是给陪玩本人看的备忘和话术。",
    "只输出 JSON，不要输出 Markdown、解释、代码块或多余文本。",
    "输出必须符合当前场景字段，字段名使用英文。",
    "内容要比短模板更具体，但仍然方便复制；字符串字段可以用换行组织成几条短句。",
    "必须结合输入里的老板档案、当前局势、陪玩人设和本次目标，不要泛泛而谈。",
    "不要只做关键词替换。每次生成前先隐式判断 payload 里的每个字段对策略的影响，并把影响体现在输出内容里。",
    "如果 boss_profile 里有 memory_profile、memory_interaction_style、memory_relationship、memory_recent_signals、memory_direction、memory_openers、memory_effective_lines、memory_risks、memory_next_probe，必须像长期记忆一样优先参考；不要只看当前输入。",
    "话术要像真人陪玩临场能说出口：轻一点、自然一点、有边界，不要客服腔。",
    "减少 AI 味：不要使用“首先、其次、综上、赋能、情绪价值、建立连接、破冰、建议你可以、高质量陪伴”等套话。",
    "不要每句都用“可以”开头；少讲道理，多给具体可发的句子和判断条件。",
    "禁止诱导消费、PUA、情绪操控、隐私套话、色情、违法犯罪、冒充真人或欺骗老板。",
    "普通恋爱感、暧昧、线下见面、私聊在陪玩场景中不默认禁止；必须结合 player_profile.relationship_mode 和本单需求生成：可恋爱感营业、只轻微暧昧、不做恋爱感，未说明时给多方案让陪玩选择。",
    "硬风险只包括色情、违法、胁迫、未成年、隐私勒索等内容；这些场景必须拒绝推进并回到正常服务。",
    `当前场景：${kind}`,
    `场景细化要求：${(sceneGuidance[kind] || []).join(" ")}`,
    `必须包含字段：${Object.keys(outputSchemas[kind] || {}).join(", ")}`,
  ].join("\n");
}

function parseJsonContent(content) {
  const trimmed = String(content || "").trim();
  if (!trimmed) throw new Error("AI provider returned empty JSON text.");
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI provider response does not contain JSON.");
    return JSON.parse(match[0]);
  }
}

function normalizeProviderOutput(kind, output) {
  const schema = outputSchemas[kind];
  if (!schema) throw new Error(`Unknown AI kind: ${kind}`);
  const normalized = { ...output };
  for (const [field, type] of Object.entries(schema)) {
    if (!(field in normalized)) {
      normalized[field] = type === "array" ? [] : type === "object" ? {} : "";
    }
  }
  if (kind === "review") {
    normalized.profileUpdate = {
      preferred_style: normalized.profileUpdate?.preferred_style || "",
      disliked_style: normalized.profileUpdate?.disliked_style || "",
      emotion_pattern: normalized.profileUpdate?.emotion_pattern || "",
      notes: normalized.profileUpdate?.notes || "",
      memory_profile: normalized.profileUpdate?.memory_profile || "",
      memory_interaction_style: normalized.profileUpdate?.memory_interaction_style || "",
      memory_relationship: normalized.profileUpdate?.memory_relationship || "",
      memory_recent_signals: normalized.profileUpdate?.memory_recent_signals || "",
      memory_direction: normalized.profileUpdate?.memory_direction || "",
      memory_openers: normalized.profileUpdate?.memory_openers || "",
      memory_effective_lines: normalized.profileUpdate?.memory_effective_lines || "",
      memory_risks: normalized.profileUpdate?.memory_risks || "",
      memory_next_probe: normalized.profileUpdate?.memory_next_probe || "",
    };
  }
  return normalized;
}

if (require.main === module) {
  server.listen(port, host, () => {
    console.log(`pwai server listening on http://${host}:${port}`);
  });
}

module.exports = { server };
