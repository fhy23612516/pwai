const assert = require("node:assert/strict");

const port = 4299;
const baseUrl = `http://127.0.0.1:${port}`;

process.env.HOST = "127.0.0.1";
process.env.PORT = String(port);
process.env.AUTH_PASSWORD = "test-pass";
process.env.AUTH_SESSION_SECRET = "test-secret";
process.env.AUTH_SESSION_TTL_SECONDS = "3600";

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

    const badLogin = await request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    });
    assert.equal(badLogin.status, 401);

    const goodLogin = await request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "test-pass" }),
    });
    assert.equal(goodLogin.status, 200);
    const cookie = goodLogin.headers.get("set-cookie") || "";
    assert.match(cookie, /pwai_session=/);
    assert.match(cookie, /HttpOnly/);
    const session = await goodLogin.json();
    assert.equal(session.ok, true);
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

    const logout = await request("/api/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie") || "", /Max-Age=0/);

    console.log("ok - password login protects pages, api, cookies, and bearer tokens");
  } finally {
    await stopServer();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
