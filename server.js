const http = require("http");
const fs = require("fs");
const path = require("path");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8765);
const webRoot = path.join(__dirname, "web");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function send(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.resolve(webRoot, requestedPath.slice(1));

  if (!filePath.startsWith(webRoot) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    send(response, 404, "Not found");
    return;
  }

  const contentType = contentTypes[path.extname(filePath)] || "application/octet-stream";
  fs.readFile(filePath, (error, body) => {
    if (error) {
      send(response, 500, "Internal server error");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": body.length,
    });
    response.end(body);
  });
});

server.listen(port, host, () => {
  console.log(`Blackjack web rodando em http://${host}:${port}`);
});
