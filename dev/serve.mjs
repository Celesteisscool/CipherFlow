// Dev-only static file server. Not part of the deliverable (the app is a single HTML file).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PORT = Number(process.argv[2] || 8788);
const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".br": "text/javascript",
    ".gz": "text/javascript"
};

http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = path.join(ROOT, urlPath);
    if (urlPath.endsWith("/")) file = path.join(file, "index.html");
    if (!file.startsWith(ROOT)) {
        res.writeHead(403).end("forbidden");
        return;
    }
    fs.readFile(file, (err, buf) => {
        if (err) {
            res.writeHead(404, {"content-type": "text/plain"}).end("404 " + urlPath);
            return;
        }
        res.writeHead(200, {"content-type": TYPES[path.extname(file)] || "application/octet-stream"});
        res.end(buf);
    });
}).listen(PORT, "127.0.0.1", () => console.log("serving", ROOT, "on http://127.0.0.1:" + PORT));
