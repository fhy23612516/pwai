const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const port = 4299;
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pwai-auth-"));
const usersFile = path.join(tempDir, "users.json");
const appDataFile = path.join(tempDir, "app-data.json");

process.env.HOST = "127.0.0.1";
process.env.PORT = String(port);
process.env.AUTH_USERS_FILE = usersFile;
process.env.AUTH_DATA_FILE = appDataFile;
process.env.AUTH_ALLOW_REGISTRATION = "true";
process.env.AUTH_SESSION_SECRET = "test-secret";
process.env.AUTH_SESSION_TTL_SECONDS = "3600";
process.env.AUTH_COOKIE_SECURE = "false";

const { server } = require("../server");

function startServer() {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("server did not become healthy");
}

async function stopServer() {
  if (!server.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
  });
}

async function main() {
  await startServer();
  try {
    await waitForServer();

    const health = await request("/healthz");
    assert.equal(health.status, 200);

    const anonymousHome = await request("/");
    assert.equal(anonymousHome.status, 302);
    assert.match(anonymousHome.headers.get("location") || "", /^\/login\?next=/);

    const anonymousAi = await request("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "prep", payload: {} }),
    });
    assert.equal(anonymousAi.status, 401);
    assert.equal((await anonymousAi.json()).error, "AUTH_REQUIRED");

    const weakRegister = await request("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice", password: "short" }),
    });
    assert.equal(weakRegister.status, 400);
    assert.equal((await weakRegister.json()).error, "WEAK_PASSWORD");

    const register = await request("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Alice_01", password: "test-pass-123" }),
    });
    assert.equal(register.status, 200);
    const registerCookie = register.headers.get("set-cookie") || "";
    assert.match(registerCookie, /pwai_session=/);
    assert.match(registerCookie, /HttpOnly/);
    const registeredSession = await register.json();
    assert.equal(registeredSession.ok, true);
    assert.equal(registeredSession.user.username, "alice_01");
    assert.equal(typeof registeredSession.token, "string");

    const stored = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    assert.equal(stored.users.length, 1);
    assert.equal(stored.users[0].username, "alice_01");
    assert.doesNotMatch(stored.users[0].password_hash, /test-pass-123/);
    assert.match(stored.users[0].password_hash, /^scrypt\$/);

    const duplicateRegister = await request("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice_01", password: "test-pass-123" }),
    });
    assert.equal(duplicateRegister.status, 409);

    const badLogin = await request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice_01", password: "wrong" }),
    });
    assert.equal(badLogin.status, 401);

    const goodLogin = await request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice_01", password: "test-pass-123" }),
    });
    assert.equal(goodLogin.status, 200);
    const cookie = goodLogin.headers.get("set-cookie") || "";
    assert.match(cookie, /pwai_session=/);
    assert.match(cookie, /HttpOnly/);
    const session = await goodLogin.json();
    assert.equal(session.ok, true);
    assert.equal(session.user.username, "alice_01");
    assert.equal(typeof session.token, "string");

    const cookieHome = await request("/", {
      headers: { Cookie: cookie },
    });
    assert.equal(cookieHome.status, 200);

    const bearerSession = await request("/api/session", {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    assert.equal(bearerSession.status, 200);
    assert.equal((await bearerSession.json()).authenticated, true);

    const anonymousState = await request("/api/state");
    assert.equal(anonymousState.status, 401);

    const initialState = await request("/api/state", {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    assert.equal(initialState.status, 200);
    assert.equal((await initialState.json()).state, null);

    const savedState = {
      persona: { nickname: "小鹿" },
      bosses: [{ id: "boss-sync", nickname: "同步老板", games: "瓦罗兰特" }],
      orders: [],
      assists: [],
      simulations: [{ id: "simulation-sync", boss_id: "boss-sync", messages: [{ role: "player", text: "老板今天先轻松热两把。" }] }],
      favorites: [],
      settings: { ai_provider: "local", remote_endpoint: "/api/ai" },
    };
    const putState = await request("/api/state", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ state: savedState }),
    });
    assert.equal(putState.status, 200);
    assert.equal((await putState.json()).ok, true);

    const storedState = JSON.parse(fs.readFileSync(appDataFile, "utf8"));
    assert.equal(storedState.users[session.user.id].state.bosses[0].nickname, "同步老板");

    const syncedState = await request("/api/state", {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    assert.equal(syncedState.status, 200);
    const syncedJson = await syncedState.json();
    assert.equal(syncedJson.state.bosses[0].id, "boss-sync");
    assert.equal(syncedJson.state.simulations[0].messages[0].text, "老板今天先轻松热两把。");

    const logout = await request("/api/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie") || "", /Max-Age=0/);

    console.log("ok - account registration and login protect pages, api, cookies, and bearer tokens");
  } finally {
    await stopServer();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
