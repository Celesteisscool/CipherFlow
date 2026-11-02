#!/usr/bin/env node
/* Per-glyph provenance check against the source's own files.
 *
 *   node dev/symbols/verify-source.mjs [slug ...] [--dcode]
 *
 * For every shipped glyph, fetches the file the source publishes for that key and
 * compares bytes with the PNG in dev/symbols/art. The extractor maps a key to the
 * source's own filename (letter -> [lcdir/]lower.png, digit -> char.png, other ->
 * othernames[i].png) and install.mjs copies that file to art/<slug>/<same path>, so
 * the live URL follows from the shipped path: source.cachesleuth.images + the part
 * after `art/<slug>/`. That makes the check independent of /tmp staging — it can be
 * run on a fresh clone, long after the extraction that produced the art.
 *
 * CacheSleuth is the oracle. Its files are content-addressed by cipher and key and
 * have not moved for any of the 70 shipped ciphers, so a mismatch is a real defect:
 * the shipped tile is not the symbol the source publishes under that key.
 *
 * dCode is NOT an oracle. Its pages render a different inventory run to run — at
 * audit time atlantis published 20 of the 57 glyphs it served at staging, ogham 13
 * of 46, gravity_falls_bill 26 of 80 with new bytes behind the same filenames — so
 * a live page cannot confirm a snapshot. dCode is therefore reported as information
 * and never changes the exit code; pass --dcode to include those checks.
 *
 * Ink-tight ciphers (eternity) ship install.mjs's cropped square, so the live bytes
 * are put through the same crop before comparing. The crop below mirrors install.mjs
 * and is validated on every run: a wrong copy fails those glyphs against real data.
 *
 * Exit code: 0 when every CacheSleuth glyph matches, 1 on a mismatch or an
 * unreachable/failed one, 2 on bad usage or an unknown slug.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, "data");
const CATALOGUE = path.join(HERE, "catalogue.json");
const CONCURRENCY = 12;
const UA = {
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8"
};

/* ------------------------------------------------------- ink-tight art (mirror)
 * install.mjs crops a wide source canvas to its ink box and centres it on a square
 * transparent canvas, losslessly. Copied here so the shipped bytes can be re-derived
 * from the live file; the run itself proves the copy — every tight cipher's shipped
 * PNGs have to come back byte-identical or they are reported as mismatches.
 */
const INK_PAD = 0.06;

function decodePng(buf) {
    let p = 8, ihdr = null, plte = null, trns = null;
    const idat = [];
    while (p < buf.length) {
        const len = buf.readUInt32BE(p);
        const type = buf.toString("ascii", p + 4, p + 8);
        const data = buf.subarray(p + 8, p + 8 + len);
        if (type === "IHDR") ihdr = {w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12]};
        else if (type === "PLTE") plte = data;
        else if (type === "tRNS") trns = data;
        else if (type === "IDAT") idat.push(data);
        else if (type === "IEND") break;
        p += 12 + len;
    }
    if (!ihdr || ihdr.interlace) return null;
    // Mirrors install.mjs: palette art (colour type 3) must be expanded to RGBA, or the ink crop
    // cannot be re-derived and every tight cipher looks like drift.
    const palette = ihdr.color === 3;
    if (palette ? (!plte || ![1, 2, 4, 8].includes(ihdr.depth)) : ihdr.depth !== 8) return null;
    const ch = palette ? 1 : {0: 1, 2: 3, 4: 2, 6: 4}[ihdr.color];
    if (!ch) return null;
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const stride = ihdr.w * ch;
    if (raw.length < ihdr.h * (stride + 1)) return null;
    const px = Buffer.alloc(ihdr.h * stride);
    let pos = 0;
    for (let y = 0; y < ihdr.h; y++) {
        const f = raw[pos++];
        const line = raw.subarray(pos, pos + stride);
        pos += stride;
        const prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
        const cur = px.subarray(y * stride, (y + 1) * stride);
        for (let x = 0; x < stride; x++) {
            const a = x >= ch ? cur[x - ch] : 0;
            const b = prev ? prev[x] : 0;
            const c = x >= ch && prev ? prev[x - ch] : 0;
            let v = line[x];
            if (f === 1) v += a;
            else if (f === 2) v += b;
            else if (f === 3) v += (a + b) >> 1;
            else if (f === 4) {
                const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
                v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
            }
            cur[x] = v & 255;
        }
    }
    if (!palette) return {...ihdr, ch, stride, px};
    const out = Buffer.alloc(ihdr.w * ihdr.h * 4);
    const maxv = (1 << Math.min(ihdr.depth, 8)) - 1;
    const index = (x, y) => {
        const bit = x * ihdr.depth;
        const byte = px[y * stride + (bit >> 3)];
        return (byte >> (8 - ihdr.depth - (bit & 7))) & maxv;
    };
    for (let y = 0; y < ihdr.h; y++) {
        for (let x = 0; x < ihdr.w; x++) {
            const i = index(x, y);
            const o = (y * ihdr.w + x) * 4;
            out[o] = plte[i * 3] ?? 0;
            out[o + 1] = plte[i * 3 + 1] ?? 0;
            out[o + 2] = plte[i * 3 + 2] ?? 0;
            out[o + 3] = trns && i < trns.length ? trns[i] : 255;
        }
    }
    return {...ihdr, depth: 8, color: 6, ch: 4, stride: ihdr.w * 4, px: out};
}

function inkBox(img) {
    let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
    for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
            const i = y * img.stride + x * img.ch;
            const alpha = img.ch === 4 ? img.px[i + 3] : img.ch === 2 ? img.px[i + 1] : 255;
            if (alpha <= 16) continue;
            const r = img.px[i];
            const g = img.ch >= 3 ? img.px[i + 1] : r;
            const b = img.ch >= 3 ? img.px[i + 2] : r;
            if (Math.min(r, g, b) >= 200) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
        }
    }
    return x1 < 0 ? null : {x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1};
}

const CRC = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();
const crc32 = buf => {
    let c = ~0;
    for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
    return ~c >>> 0;
};
const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
};
function encodePng(w, h, rgba) {
    const stride = w * 4;
    const raw = Buffer.alloc(h * (stride + 1));
    for (let y = 0; y < h; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 6; // RGBA
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(raw, {level: 9})),
        chunk("IEND", Buffer.alloc(0))
    ]);
}

function tightenPng(buf) {
    const img = decodePng(buf);
    if (!img) return null;
    const box = inkBox(img);
    if (!box) return null;
    if (box.x0 === 0 && box.y0 === 0 && box.w === img.w && box.h === img.h) return null;
    const side = Math.max(2, Math.round(Math.max(box.w, box.h) / (1 - 2 * INK_PAD)));
    const ox = Math.floor((side - box.w) / 2);
    const oy = Math.floor((side - box.h) / 2);
    const out = Buffer.alloc(side * side * 4); // transparent ground, ink centred
    for (let y = 0; y < box.h; y++) {
        for (let x = 0; x < box.w; x++) {
            const si = (box.y0 + y) * img.stride + (box.x0 + x) * img.ch;
            const di = ((oy + y) * side + ox + x) * 4;
            if (img.ch >= 3) {
                out[di] = img.px[si];
                out[di + 1] = img.px[si + 1];
                out[di + 2] = img.px[si + 2];
                out[di + 3] = img.ch === 4 ? img.px[si + 3] : 255;
            } else if (img.ch === 2) {
                out[di] = out[di + 1] = out[di + 2] = img.px[si];
                out[di + 3] = img.px[si + 1];
            } else {
                out[di] = out[di + 1] = out[di + 2] = img.px[si];
                out[di + 3] = 255;
            }
        }
    }
    return encodePng(side, side, out);
}

/* ------------------------------------------------------------------ network */

const sha = buf => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);

async function pool(items, size, fn) {
    let next = 0;
    await Promise.all(Array.from({length: Math.min(size, items.length)}, async () => {
        while (next < items.length) {
            const i = next++;
            await fn(items[i], i);
        }
    }));
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const isPng = buf => buf.length > 8 && PNG_MAGIC.every((b, i) => buf[i] === b);

/** Fetched body, or the HTTP status / transport error, with two retries. */
async function getBytes(url) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const r = await fetch(url, {headers: UA, redirect: "follow"});
            if (r.status === 404) return {status: 404, url};
            if (!r.ok) {
                if (r.status >= 500 && attempt < 2) continue;
                return {status: r.status, url};
            }
            const buf = Buffer.from(await r.arrayBuffer());
            const type = r.headers.get("content-type") || "";
            // Judge by the bytes, not the header: some of the source's PNGs come back as
            // application/octet-stream, and a proxy error page can claim image/png.
            if (!isPng(buf)) return {status: r.status, url, notImage: type || "not a PNG"};
            return {status: 200, url, buf, sha: sha(buf)};
        } catch (err) {
            if (attempt === 2) return {status: 0, url, err: err.message};
        }
    }
    return {status: 0, url, err: "retries exhausted"};
}

/** Page HTML — dCode's cipher page is markup, not a glyph. */
async function getText(url) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const r = await fetch(url, {headers: UA, redirect: "follow"});
            if (!r.ok) {
                if (r.status >= 500 && attempt < 2) continue;
                return {status: r.status, url};
            }
            return {status: 200, url, text: await r.text()};
        } catch (err) {
            if (attempt === 2) return {status: 0, url, err: err.message};
        }
    }
    return {status: 0, url, err: "retries exhausted"};
}

/** dCode glyphs on a page: the character its alt/filename names -> absolute image URL. */
function dcodeGlyphs(html, pageUrl) {
    const found = new Map();
    for (const m of html.matchAll(/<img[^>]*>/g)) {
        const tag = m[0];
        if (!/class="glyph"/.test(tag)) continue;
        const src = (tag.match(/\bsrc="([^"]+)"/) || [])[1];
        if (!src) continue;
        let abs;
        try { abs = new URL(src, pageUrl).href; } catch { continue; }
        const alt = (tag.match(/\balt="([^"]*)"/) || [])[1] || "";
        const code = (alt.match(/char\((\d+)\)/) || [])[1] || (abs.match(/char\((\d+)\)/) || [])[1];
        const key = code ? String.fromCodePoint(Number(code)) : alt;
        if (key && !found.has(key)) found.set(key, abs);
    }
    return found;
}

/* ---------------------------------------------------------------------- run */

function usage(code) {
    console.error("usage: node dev/symbols/verify-source.mjs [slug ...] [--dcode]");
    console.error("  Checks every shipped glyph against the live source file for its key.");
    console.error("  Exits 1 only on a CacheSleuth mismatch; --dcode adds dCode findings as");
    console.error("  information (its pages are not stable enough to fail a build on).");
    process.exit(code);
}

const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) usage(0);
const withDcode = args.includes("--dcode");
const unknownFlag = args.find(a => a.startsWith("-") && a !== "--dcode");
if (unknownFlag) {
    console.error(`unknown option ${unknownFlag}`);
    usage(2);
}

const catalogue = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));
const wanted = args.filter(a => !a.startsWith("-"));
const bySlug = new Map(catalogue.map(r => [r.slug, r]));
const missingSlugs = wanted.filter(s => !bySlug.has(s));
if (missingSlugs.length) {
    console.error(`not in the catalogue: ${missingSlugs.join(", ")}`);
    process.exit(2);
}
const rows = wanted.length ? wanted.map(s => bySlug.get(s)) : catalogue;

const totals = {ok: 0, mismatch: 0, missing: 0, skipped: 0, ciphers: 0, failedCiphers: 0};
const totalsDcode = {ok: 0, diff: 0, missing: 0, skipped: 0};
const failures = [];
const dcodeNotes = [];
const started = Date.now();

for (const row of rows) {
    const slug = row.slug;
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${slug}.json`), "utf8"));
    const base = data.source?.cachesleuth?.images || "";
    const prefix = `art/${slug}/`;
    const cs = {ok: 0, tight: 0, mismatch: 0, missing: 0, skipped: 0};

    if (data.artFrom === "dcode") {
        cs.skipped = data.glyphs.length; // art is dCode's; CacheSleuth has no file to compare
    } else {
        const jobs = data.glyphs.map(g => {
            const rel = g.file && g.file.startsWith(prefix) ? g.file.slice(prefix.length) : null;
            return {g, rel};
        });
        await pool(jobs, CONCURRENCY, async ({g, rel}) => {
            const key = JSON.stringify(g.key);
            if (!rel || rel.startsWith("_dcode/")) {
                cs.missing++;
                failures.push(`${slug} ${key}: shipped path ${g.file || "(none)"} is not a CacheSleuth file`);
                return;
            }
            const shipped = path.join(HERE, g.file);
            if (!fs.existsSync(shipped)) {
                cs.missing++;
                failures.push(`${slug} ${key}: shipped art missing on disk (${g.file})`);
                return;
            }
            const live = await getBytes(base + rel);
            if (live.status !== 200 || !live.buf) {
                cs.missing++;
                failures.push(`${slug} ${key}: source returned ${live.status || live.err} for ${base + rel}${live.notImage ? ` (${live.notImage})` : ""}`);
                return;
            }
            const want = data.tightArt ? (tightenPng(live.buf) || live.buf) : live.buf;
            if (sha(want) === sha(fs.readFileSync(shipped))) {
                cs.ok++;
                if (data.tightArt) cs.tight++;
            } else {
                cs.mismatch++;
                failures.push(`${slug} ${key}: live ${sha(want)} != shipped ${sha(fs.readFileSync(shipped))} (${rel})`);
            }
        });
    }

    /* dCode: information only — a page's inventory changes between requests. */
    let dcodeCell = "";
    if (withDcode) {
        const glyphs = data.artFrom === "dcode" ? data.glyphs : (data.dcode?.glyphs || []);
        const page = data.source?.dcode?.page
            || (data.dcode?.page ? "https://www.dcode.fr" + data.dcode.page : null);
        const dc = {ok: 0, diff: 0, missing: 0};
        if (!glyphs.length) {
            totalsDcode.skipped++;
        } else if (!page) {
            dc.missing = glyphs.length;
            dcodeNotes.push(`${slug}: no dCode page recorded`);
        } else {
            const livePage = await getText(page);
            if (livePage.status !== 200 || !livePage.text) {
                dc.missing = glyphs.length;
                dcodeNotes.push(`${slug}: dCode page returned ${livePage.status || livePage.err}`);
            } else {
                const onPage = dcodeGlyphs(livePage.text, page);
                const lookup = k => onPage.get(String(k))
                    || onPage.get(String(k).toUpperCase())
                    || onPage.get(String(k).toLowerCase());
                await pool(glyphs.map(g => ({g, src: lookup(g.key)})), 10, async ({g, src}) => {
                    const key = JSON.stringify(g.key);
                    if (!src) { dc.missing++; return; }
                    const shipped = g.file ? path.join(HERE, g.file) : null;
                    if (!shipped || !fs.existsSync(shipped)) { dc.missing++; return; }
                    const got = await getBytes(src);
                    if (got.status !== 200 || !got.buf) { dc.missing++; return; }
                    if (got.sha === sha(fs.readFileSync(shipped))) dc.ok++;
                    else dc.diff++;
                });
                if (dc.diff || dc.missing) {
                    dcodeNotes.push(`${slug}: ${dc.ok}/${glyphs.length} of its dCode art still matches the live page`
                        + `${dc.diff ? `, ${dc.diff} changed` : ""}${dc.missing ? `, ${dc.missing} no longer published` : ""}`);
                }
            }
        }
        totalsDcode.ok += dc.ok;
        totalsDcode.diff += dc.diff;
        totalsDcode.missing += dc.missing;
        dcodeCell = glyphs.length ? `  dCode ${dc.ok}/${glyphs.length}${dc.diff || dc.missing ? " (informational)" : ""}` : "";
    }

    totals.ok += cs.ok;
    totals.mismatch += cs.mismatch;
    totals.missing += cs.missing;
    totals.skipped += cs.skipped;
    totals.ciphers++;
    if (cs.mismatch || cs.missing) totals.failedCiphers++;

    const checked = cs.ok + cs.mismatch + cs.missing;
    const cell = data.artFrom === "dcode"
        ? `dCode art, ${data.glyphs.length} glyphs — not a CacheSleuth set`
        : `CacheSleuth ${cs.ok}/${checked}${cs.tight ? ` (${cs.tight} ink-tight)` : ""}${cs.mismatch || cs.missing ? `  FAIL ${cs.mismatch} mismatch, ${cs.missing} unreachable` : ""}`;
    console.log(`${slug.padEnd(18)} ${cell}${dcodeCell}`);
}

const secs = ((Date.now() - started) / 1000).toFixed(0);
console.log(`\nCacheSleuth: ${totals.ok} glyphs byte-identical to the live source, `
    + `${totals.mismatch} mismatched, ${totals.missing} unreachable, ${totals.skipped} keyed to dCode art`);
console.log(`checked ${totals.ok + totals.mismatch + totals.missing} glyphs in ${totals.ciphers} ciphers (${secs}s)`);
if (withDcode) {
    console.log(`dCode (information only): ${totalsDcode.ok} matched, ${totalsDcode.diff} changed, `
        + `${totalsDcode.missing} absent from today's pages — its pages serve a different inventory run to run, so this never fails`);
    for (const n of dcodeNotes) console.log(`  ${n}`);
}
if (failures.length) {
    console.log(`\nFAILURES (${failures.length}):`);
    for (const f of failures.slice(0, 80)) console.log("  " + f);
    if (failures.length > 80) console.log(`  ... ${failures.length - 80} more`);
    process.exit(1);
}
console.log("\nVERIFY: PASS — every CacheSleuth glyph is the source's own file for its key");
