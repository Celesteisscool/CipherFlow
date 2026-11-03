/* Tags for the shipped art — the build-time half of dev/symbols/tagmath.js.
 *
 * The measurements live in tagmath.js so the app can run the identical code over a
 * photographed cell; this file only gets the pixels out of the PNGs and aggregates.
 *
 * CLI: node dev/symbols/tags.mjs [slug ...] [--glyphs] [--features]
 *   tags the whole catalogue and prints one line per cipher, so a threshold can be judged
 *   against the real corpus instead of guessed at. --glyphs dumps each glyph of the named
 *   ciphers with the numbers behind its tags.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";

const require = createRequire(import.meta.url);
const TAGMATH = require("./tagmath.js");

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function decodePng(buf) {
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
    const palette = ihdr.color === 3;
    if (palette ? (!plte || ![1, 2, 4, 8].includes(ihdr.depth)) : ![1, 2, 4, 8, 16].includes(ihdr.depth)) return null;
    if (!palette && ihdr.depth < 8 && ihdr.color !== 0) return null;
    const ch = palette ? 1 : {0: 1, 2: 3, 4: 2, 6: 4}[ihdr.color];
    if (!ch) return null;
    // Bits on the wire, not bytes: a 4-bit palette row is half the width, and reading it as
    // one byte per pixel made every such file come up "short" and carry no tags at all — 25
    // Alphabots, 9 Pigpen, 9 Beams and a scattering of others, which is the "70 art files"
    // that would not decode.
    const bits = palette ? ihdr.depth : ch * ihdr.depth;
    const stride = Math.ceil(ihdr.w * bits / 8);
    const bpp = Math.max(1, Math.ceil(bits / 8));
    const raw = zlib.inflateSync(Buffer.concat(idat));
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
            const a = x >= bpp ? cur[x - bpp] : 0;
            const b = prev ? prev[x] : 0;
            const c = x >= bpp && prev ? prev[x - bpp] : 0;
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
    const out = Buffer.alloc(ihdr.w * ihdr.h * 4);
    const maxv = (1 << Math.min(bits, 8)) - 1;
    const sampleAt = (x, y) => {
        if (bits >= 8) return px[y * stride + x * bpp];
        const bit = x * bits;
        const byte = px[y * stride + (bit >> 3)];
        return (byte >> (8 - bits - (bit & 7))) & maxv;
    };
    for (let y = 0; y < ihdr.h; y++) {
        for (let x = 0; x < ihdr.w; x++) {
            const o = (y * ihdr.w + x) * 4;
            if (palette) {
                const i = sampleAt(x, y);
                out[o] = plte[i * 3] ?? 0;
                out[o + 1] = plte[i * 3 + 1] ?? 0;
                out[o + 2] = plte[i * 3 + 2] ?? 0;
                out[o + 3] = trns && i < trns.length ? trns[i] : 255;
            } else if (ch === 1 || ch === 2) {
                // 1/2/4-bit greys are scaled up; 16-bit is read from its high byte.
                const raw0 = ihdr.depth >= 8 ? px[y * stride + x * bpp] : sampleAt(x, y) * 255 / maxv;
                const v = ihdr.depth >= 8 ? raw0 : Math.round(raw0);
                out[o] = out[o + 1] = out[o + 2] = v;
                out[o + 3] = ch === 2 ? px[y * stride + x * bpp + (ihdr.depth >= 8 ? Math.ceil(ihdr.depth / 8) : 1)] : 255;
            } else {
                // Channels are 1 or 2 bytes each and always in RGB(A) order; reading the
                // wrong offset here duplicated red into green, which made every RGB glyph
                // look like it carried hue and put 18 monochrome alphabets under Coloured.
                const base = y * stride + x * bpp;
                const step = ihdr.depth >= 8 ? Math.ceil(ihdr.depth / 8) : 1;
                out[o] = px[base];
                out[o + 1] = px[base + step];
                out[o + 2] = px[base + 2 * step];
                out[o + 3] = ch === 4 ? px[base + 3 * step] : 255;
            }
        }
    }
    return {w: ihdr.w, h: ihdr.h, px: out};
}

/** One glyph's tags and the numbers they were read from, cached per file. */
const fileCache = new Map();
function glyphProfile(abs) {
    if (fileCache.has(abs)) return fileCache.get(abs);
    let profile = {tags: [], features: null};
    try {
        const img = decodePng(fs.readFileSync(abs));
        if (img) {
            const {mask, w, h, chroma} = TAGMATH.maskFromRgba(img.px, img.w, img.h);
            const grid = TAGMATH.gridFromMask(mask, w, h);
            const features = TAGMATH.featuresFromGrid(grid, chroma);
            profile = {tags: TAGMATH.tagsFromFeatures(features), features};
        }
    } catch { /* a file that will not decode simply carries no tags */ }
    fileCache.set(abs, profile);
    return profile;
}

/** Every drawing's tags for a cipher record from data/<slug>.json. */
function drawingsOf(cipher) {
    const perDrawing = [];
    for (const g of cipher.glyphs || []) {
        if (!g.file) continue;
        const abs = path.join(HERE, g.file);
        if (!fs.existsSync(abs)) continue;
        perDrawing.push(glyphProfile(abs).tags);
    }
    return perDrawing;
}

/*
 * Editorial exceptions to the measured tags.
 *
 * "pixels" is the one tag that needs them. It asks whether a drawing survives being redrawn
 * on a coarse block lattice, and at 24 cells that is true of far more than pixel art: a plain
 * filled slab is indistinguishable from a block-font glyph, so solid colour chips (25-Pair
 * Color Code), broad marks (Autobot, Bearded Men), picture alphabets (Eternity, Lunar, Stray)
 * and drawn line alphabets (Pigpen) all measure as pixel art too. The tag is meant for
 * alphabets actually built on a block lattice — Fez, Antiker, Dotsies — so the rest are
 * withheld here by name, rather than by tightening a threshold that would start misjudging
 * the alphabets it is right about.
 */
const WITHHELD = {
    pixels: ["25paircode", "autobot", "beardedmen", "eternity", "lunar", "stray", "pigpen"]
};

/** True when this cipher's measurement for a tag has been overruled. */
const withheld = (slug, tag) => Boolean(WITHHELD[tag] && WITHHELD[tag].includes(slug));

/** The tag list for a cipher record from data/<slug>.json. */
export function cipherTags(cipher) {
    return TAGMATH.combineTags(drawingsOf(cipher)).filter(tag => !withheld(cipher.slug, tag));
}

/** Those tags graded: the share of the cipher's own drawings that carry each one. */
export function cipherTagShares(cipher) {
    const shares = TAGMATH.tagShares(drawingsOf(cipher));
    // Zeroed, not merely dropped: the share is what makes a cipher a near miss, so a withheld
    // tag has to carry no weight anywhere or the filter would still list these under Pixels.
    for (const tag of Object.keys(shares)) if (withheld(cipher.slug, tag)) shares[tag] = 0;
    return shares;
}

/** Per-glyph detail, for judging a threshold. */
export function glyphTags(cipher) {
    return (cipher.glyphs || []).map(g => {
        const abs = g.file ? path.join(HERE, g.file) : null;
        const profile = abs && fs.existsSync(abs) ? glyphProfile(abs) : {tags: [], features: null};
        return {key: g.key, label: g.label, tags: profile.tags, features: profile.features};
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    // The catalogue is read straight off disk rather than through index.mjs: index.mjs imports
    // this file for the build, and importing it back would deadlock the module graph.
    const catalogueFile = path.join(HERE, "catalogue.json");
    const catalogue = fs.existsSync(catalogueFile) ? JSON.parse(fs.readFileSync(catalogueFile, "utf8")) : [];
    const args = process.argv.slice(2);
    const showGlyphs = args.includes("--glyphs");
    const showFeatures = args.includes("--features");
    const wanted = args.filter(a => !a.startsWith("--"));
    const ciphers = catalogue
        .filter(row => row.status === "ready" && (!wanted.length || wanted.includes(row.slug)))
        .map(row => {
            const file = path.join(HERE, "data", `${row.slug}.json`);
            return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
        })
        .filter(Boolean);
    if (!ciphers.length) {
        console.error("no ready cipher matches", wanted.join(" "));
        process.exit(1);
    }
    const totals = new Map();
    for (const c of ciphers) {
        const tags = cipherTags(c);
        for (const t of tags) totals.set(t, (totals.get(t) || 0) + 1);
        if (showGlyphs) {
            console.log(`\n${c.name} (${c.slug}) — ${c.glyphs.length} symbols`);
            for (const g of glyphTags(c)) {
                const f = g.features;
                const nums = f ? `ink ${f.ink.toFixed(2)} stroke ${f.stroke.toFixed(3)} flat ${f.flat.toFixed(2)} blobs ${f.blobs} cmp ${f.compact.toFixed(2)} blk ${f.block} chr ${f.chroma.toFixed(2)}` : "no art";
                console.log(`  ${String(g.key).padEnd(4)} ${showFeatures ? nums + "  " : ""}${g.tags.join(",") || "-"}`);
            }
        } else {
            console.log(`${c.slug.padEnd(20)} ${String(c.glyphs.length).padStart(3)}  ${tags.join(" ") || "-"}`);
        }
    }
    console.log("\ntag totals:");
    for (const t of TAGMATH.TAG_ORDER) console.log(`  ${TAGMATH.TAG_LABELS[t].padEnd(12)} ${String(totals.get(t) || 0).padStart(4)}`);
}
