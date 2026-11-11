// Dev-only static file server. Not part of the deliverable (the site is index.html plus assets/).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const PORT = Number(process.argv[2] || 8788);
// Loopback by default; pass a host as the second argument to expose it, e.g. the Tailscale IP.
const HOST = process.argv[3] || "127.0.0.1";
const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webm": "video/webm",
    ".br": "text/javascript",
    ".gz": "text/javascript"
};
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg"]);
// index.html is a 42 MB document, so each encoding is compressed once and reused until the
// file changes.
const encoded = new Map();

function compress(buf, encoding, ext) {
    if (encoding === "br") {
        return zlib.brotliCompressSync(buf, {
            params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
                [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length
            }
        });
    }
    return zlib.gzipSync(buf, {level: ext === ".html" ? 9 : 6});
}

http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = path.join(ROOT, urlPath);
    if (urlPath.endsWith("/")) file = path.join(file, "index.html");
    if (!file.startsWith(ROOT)) {
        res.writeHead(403).end("forbidden");
        return;
    }
    fs.stat(file, (statErr, stat) => {
        if (statErr || !stat.isFile()) {
            res.writeHead(404, {"content-type": "text/plain", "content-length": 0}).end();
            return;
        }
        fs.readFile(file, (err, raw) => {
            if (err) {
                res.writeHead(404, {"content-type": "text/plain", "content-length": 0}).end();
                return;
            }
            const type = TYPES[path.extname(file)] || "application/octet-stream";
            const accepts = String(req.headers["accept-encoding"] || "");
            const ext = path.extname(file).toLowerCase();
            let encoding = "identity";
            let body = raw;
            if (COMPRESSIBLE.has(ext) && raw.length > 4096) {
                if (/\bbr\b/.test(accepts)) encoding = "br";
                else if (/\bgzip\b/.test(accepts)) encoding = "gzip";
                if (encoding !== "identity") {
                    const key = encoding + ":" + file;
                    const hit = encoded.get(key);
                    if (hit && hit.mtimeMs === stat.mtimeMs) {
                        body = hit.data;
                    } else {
                        body = compress(raw, encoding, ext);
                        encoded.set(key, {mtimeMs: stat.mtimeMs, data: body});
                    }
                }
            }
            const headers = {"content-type": type, "content-length": body.length, "vary": "accept-encoding"};
            if (encoding !== "identity") headers["content-encoding"] = encoding;
            res.writeHead(200, headers);
            res.end(body);
        });
    });
}).listen(PORT, HOST, () => console.log("serving", ROOT, "on http://" + HOST + ":" + PORT));
