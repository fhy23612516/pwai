const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

const root = __dirname;
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4173);
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 65536);
const aiTimeoutMs = Number(process.env.AI_TIMEOUT_MS || 30000);
const defaultBaseUrl = "https://api.openai.com/v1";

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

function sendJson(response, status, data) {
  send(response, status, JSON.stringify(data), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBodyBytes) {
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
  if (request.url === "/healthz") {
    sendJson(response, 200, { ok: true, service: "pwai" });
    return;
  }

  if ((request.url || "").split("?")[0] === "/api/ai") {
    handleAiRequest(request, response);
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
  if (!["prep", "assist", "review"].includes(kind)) {
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
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: Number(process.env.OPENAI_TEMPERATURE || 0.7),
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
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
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

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function buildSystemPrompt(kind) {
  return [
    "你是陪玩副驾 AI 的服务端生成器。",
    "只输出 JSON，不要输出 Markdown、解释、代码块或多余文本。",
    "输出必须符合当前场景字段，字段名使用英文。",
    "话术自然、克制、短句优先，便于复制。",
    "禁止诱导消费、PUA、情绪操控、隐私套话、过度暧昧、冒充真人或欺骗老板。",
    `当前场景：${kind}`,
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
    };
  }
  return normalized;
}

server.listen(port, host, () => {
  console.log(`pwai server listening on http://${host}:${port}`);
});
