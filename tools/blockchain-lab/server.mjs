import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const LAB_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(LAB_ROOT, "..", "..");
const PUBLIC_ROOT = resolve(REPO_ROOT, "public");
const HOST = process.env.HOST ?? "127.0.0.1";
const requestedPort = Number.parseInt(process.env.PORT ?? process.argv[2] ?? "4177", 10);
const PORT = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536 ? requestedPort : 4177;

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
]);

function safeResolve(root, relativePath) {
  const target = resolve(root, relativePath);
  return target === root || target.startsWith(`${root}${sep}`) ? target : null;
}

function routePath(pathname) {
  if (pathname === "/") return safeResolve(LAB_ROOT, "index.html");
  if (pathname === "/lab.css" || pathname === "/lab.js") return safeResolve(LAB_ROOT, pathname.slice(1));
  if (pathname.startsWith("/data/") || pathname.startsWith("/assets/")) {
    return safeResolve(PUBLIC_ROOT, pathname.slice(1));
  }
  return null;
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(message);
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendText(response, 405, "Method not allowed\n");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname);
  } catch {
    sendText(response, 400, "Invalid request path\n");
    return;
  }

  if (pathname === "/health") {
    sendText(response, 200, "ok\n");
    return;
  }

  const filePath = routePath(pathname);
  if (!filePath) {
    sendText(response, 404, "Not found\n");
    return;
  }

  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) {
      sendText(response, 404, "Not found\n");
      return;
    }

    response.writeHead(200, {
      "Content-Type": MIME_TYPES.get(extname(filePath).toLowerCase()) ?? "application/octet-stream",
      "Content-Length": metadata.size,
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendText(response, 404, "Not found\n");
      return;
    }
    console.error(error);
    sendText(response, 500, "Internal server error\n");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Rush Pi Blockchain Design Lab: http://${HOST}:${PORT}`);
});

function stop() {
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
