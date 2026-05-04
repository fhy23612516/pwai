const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4173);

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
    send(response, 200, JSON.stringify({ ok: true, service: "pwai" }), {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
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

server.listen(port, host, () => {
  console.log(`pwai server listening on http://${host}:${port}`);
});
