const http = require("http");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const port = Number(process.env.PORT || 4178);
const host = "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mind": "application/octet-stream"
};

const server = http.createServer((request, response) => {
  let pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
  if (pathname === "/") pathname = "/index.html";

  const file = path.normalize(path.join(root, pathname));
  if (!file.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    fs.createReadStream(file).pipe(response);
  });
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}/`);
});
