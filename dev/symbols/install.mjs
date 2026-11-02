#!/usr/bin/env node
/* Promotes staged extractions into the committed data layer.
 *
 *   node dev/symbols/install.mjs
 *
 * For every /tmp/symstage/<slug>/cipher.json it writes:
 *   dev/symbols/art/<slug>/<file>         CacheSleuth glyph PNGs
 *   dev/symbols/art/<slug>/_dcode/<file>  dCode's PNGs (the second implementation)
 *   dev/symbols/data/<slug>.json          metadata, art paths repo-relative
 * and rewrites dev/symbols/catalogue.json from data/*.json.
 *
 * Exits 1 if any staged cipher fails its count check, so a short alphabet can
 * never reach the catalogue — the guard that caught the seven-segment gap.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE_ROOT = "/tmp/symstage";
const ART_DIR = path.join(HERE, "art");
const DATA_DIR = path.join(HERE, "data");
const CATALOGUE = path.join(HERE, "catalogue.json");

/* ---------------------------------------------------------------- ink-tight art
 * The sources publish a wide canvas with the drawing floating in it (eternity's ink
 * is 84x121 inside 164x384), and the host draws every glyph with `object-fit: contain`
 * in a 30px tile. Containing the canvas renders the drawing at ~7x9 px however large
 * the tile is. A staged cipher may therefore ask for `tightArt`: the shipped PNG is
 * cropped to its ink box and centred on a square transparent canvas, so the drawing
 * fills the tile. Lossless — ink pixels are copied 1:1, never resampled.
 */
const INK_PAD = 0.06; // margin each side, as a fraction of the square's side

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
    // Palette art (colour type 3, depths 1-8) is what most CacheSleuth glyphs use. It has to be
    // expanded here or the ink box cannot be read: `tightArt` was silently a no-op on those
    // files until batch 9, which is why andorian and antilife stayed tiny after the first pass.
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

/** Bounding box of every pixel that reads as ink — visible, and not a white ghost. */
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

/** Cropped-to-ink square copy of a PNG, or null when the art needs no change. */
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

if (!fs.existsSync(STAGE_ROOT)) {
    console.error(`no staging at ${STAGE_ROOT} — run dev/symbols/extract.mjs first`);
    process.exit(2);
}
const slugs = fs.readdirSync(STAGE_ROOT).filter(s => fs.existsSync(path.join(STAGE_ROOT, s, "cipher.json")));
if (!slugs.length) {
    console.error("staging is empty — run dev/symbols/extract.mjs first");
    process.exit(2);
}

fs.mkdirSync(DATA_DIR, {recursive: true});

const failures = [];
const rows = [];

for (const slug of slugs.sort()) {
    const stage = path.join(STAGE_ROOT, slug);
    const staged = JSON.parse(fs.readFileSync(path.join(stage, "cipher.json"), "utf8"));

    // Ink-tight art is asked for at staging time, but recorded here, so re-installing a
    // cipher from a staging tree that predates the flag keeps the treatment.
    const dataFile = path.join(DATA_DIR, `${slug}.json`);
    const previous = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, "utf8")) : null;
    const tight = Boolean(staged.tightArt ?? previous?.tightArt);

    if (staged.check !== "PASS") failures.push(`${slug}: count check ${staged.check}`);

    // fresh art dir for this cipher
    const artDir = path.join(ART_DIR, slug);
    fs.rmSync(artDir, {recursive: true, force: true});
    fs.mkdirSync(artDir, {recursive: true});

    const copy = (from, to) => {
        const src = path.join(stage, from);
        if (!fs.existsSync(src)) return false;
        fs.mkdirSync(path.dirname(to), {recursive: true});
        fs.copyFileSync(src, to);
        if (tight && /\.png$/i.test(to)) {
            const tightened = tightenPng(fs.readFileSync(to));
            if (tightened) fs.writeFileSync(to, tightened);
        }
        return true;
    };

    // artFrom "dcode": the two sources publish the same alphabet and dCode's icons were
    // chosen, so the shipped glyph points at dCode's file. Keys/labels stay CacheSleuth's,
    // only the drawing changes, and the duplicate set is not shipped.
    const artFrom = staged.artFrom === "dcode" ? "dcode" : "cachesleuth";
    // Exact key first, then case-folded: most sets key a letter lowercase while dCode's
    // file is char(65)/`A`, but a case-aware set (Atlantis) ships `C` and `c` as
    // different glyphs and must reach char(67) and char(99) respectively.
    const dcodeExact = new Map();
    const dcodeFold = new Map();
    if (staged.dcode) {
        for (const g of staged.dcode.glyphs) {
            if (!g.file) continue;
            const key = String(g.key ?? "");
            if (!dcodeExact.has(key)) dcodeExact.set(key, g);
            const folded = key.toLowerCase();
            if (!dcodeFold.has(folded)) dcodeFold.set(folded, g);
        }
    }
    const dcodeFor = key => dcodeExact.get(String(key)) || dcodeFold.get(String(key).toLowerCase());

    const dropSet = new Set((staged.dropped || []).map(k => String(k)));
    let artFiles = 0;
    const glyphs = [];
    for (const g of staged.glyphs) {
        const src = artFrom === "dcode" ? dcodeFor(g.key) : g;
        // A declared character with no art in the chosen source, named in --drop at
        // authoring time (hexahue's empty space): dropped from the shipped set.
        if (artFrom === "dcode" && !src && dropSet.has(String(g.key ?? ""))) continue;
        // staged paths look like "glyphs/a.png"/"dcode/char(65).png"; repo paths like
        // "art/<slug>/a.png"/"art/<slug>/_dcode/char(65).png"
        const rel = src && src.file ? src.file.replace(/^(?:glyphs|dcode)\//, "") : null;
        const sub = artFrom === "dcode" ? "_dcode" : "";
        const ok = rel && copy(src.file, path.join(artDir, sub, rel));
        if (ok) artFiles++;
        glyphs.push({index: glyphs.length + 1, key: g.key, label: g.label, file: ok ? `art/${slug}/${sub ? sub + "/" : ""}${rel}` : null});
    }

    // `same`: the two sources publish the same alphabet (reviewed against both), so the
    // second set is evidence only and is not shipped; the node has no source toggle.
    let dcode = null;
    if (staged.dcode && artFrom !== "dcode" && !staged.same) {
        const dglyphs = [];
        let dcount = 0;
        for (const g of staged.dcode.glyphs) {
            const rel = g.file ? g.file.replace(/^dcode\//, "") : null;
            const ok = rel && copy(g.file, path.join(artDir, "_dcode", rel));
            if (ok) dcount++;
            dglyphs.push({key: g.key, file: ok ? `art/${slug}/_dcode/${rel}` : null, variants: g.variants || null});
        }
        dcode = {page: staged.dcode.page, count: dcount, variantNames: staged.dcode.variantNames || [], glyphs: dglyphs};
    }

    const tableRel = staged.source.cachesleuth.tableImage
        ? `art/${slug}/${staged.source.cachesleuth.tableImage.replace(/^source-/, "table-")}` : null;
    if (staged.source.cachesleuth.tableImage) {
        copy(staged.source.cachesleuth.tableImage, path.join(artDir, path.basename(tableRel)));
    }

    const installed = {
        slug,
        name: staged.name,
        artFrom,
        dropped: staged.dropped || [],
        source: {
            cachesleuth: {
                page: staged.source.cachesleuth.page,
                images: staged.source.cachesleuth.images,
                tableImage: tableRel
            },
            dcode: staged.source.dcode || null
        },
        descriptor: staged.descriptor,
        // An editorial note the cipher's node prints above its grid (matoran's hexagonal
        // variant, documented by dCode rather than published as a second set). Carried from
        // the previous install when a re-stage predates the note, and written only when set.
        ...(staged.note || previous?.note ? {note: staged.note || previous.note} : {}),
        // Only written where it is true, so re-installing does not churn the shipped ciphers.
        ...(tight ? {tightArt: true} : {}),
        ...(staged.same ? {sameAsCachesleuth: true} : {}),
        ...(staged.cases ? {cases: true} : {}),
        counts: staged.counts,
        glyphs,
        unmapped: staged.unmapped,
        failed: staged.failed,
        dcode,
        check: staged.check
    };
    fs.writeFileSync(dataFile, JSON.stringify(installed, null, 2));

    const missing = glyphs.filter(g => !g.file).length;
    if (missing) failures.push(`${slug}: ${missing} glyph(s) with no art`);

    rows.push({
        slug,
        name: installed.name,
        source: artFrom === "dcode" ? "dcode" : dcode && dcode.count ? "both" : "cachesleuth",
        status: missing ? "blocked" : "ready",
        glyphs: glyphs.length,
        uniqueFiles: staged.counts.uniqueFiles,
        dcode: dcode ? dcode.count : 0,
        check: staged.check
    });
    console.log(`${slug.padEnd(14)} ${String(glyphs.length).padStart(3)} glyphs  ${String(artFiles).padStart(3)} art  dcode ${String(dcode ? dcode.count : 0).padStart(2)}  ${staged.check}${tight ? "  tight" : ""}${(staged.dropped || []).length ? `  dropped ${JSON.stringify(staged.dropped)}` : ""}`);
}

rows.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(CATALOGUE, JSON.stringify(rows, null, 2) + "\n");
console.log(`\ncatalogue: ${rows.length} ciphers -> ${path.relative(process.cwd(), CATALOGUE)}`);
console.log(`art: ${path.relative(process.cwd(), ART_DIR)}  data: ${path.relative(process.cwd(), DATA_DIR)}`);

if (failures.length) {
    console.error("\nFAILED:");
    failures.forEach(f => console.error("  " + f));
    process.exit(1);
}
console.log("INSTALL: PASS");
