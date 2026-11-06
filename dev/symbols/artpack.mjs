/* Art packer — shrinks the glyph art before it goes into index.html.
 *
 * The sources publish their glyphs at whatever size their own page happened to draw them:
 * the CacheSleuth and dCode dumps run to 384px tall and 900px wide, and the app draws the
 * same files at 30px in a node tile, 50px in the drawer's sample strip and 30px in the
 * preview strip — 100 device pixels of a 2x display at the very most. Storing 384px art to
 * draw it at 30 costs real bytes, and those bytes are base64 inside a single HTML file, so
 * every wasted pixel costs ~1.33 characters of the shipped page.
 *
 * So the build re-encodes each drawing once at no more than MAX_SIDE pixels on its long edge,
 * and keeps whichever of the two PNGs is smaller (a 30x33 glyph sometimes compresses better
 * exactly as it was published). Nothing on disk changes: the contact sheets, the source
 * verifier and the tag measurements all still read the full-resolution originals.
 *
 * The same re-encode also pins colour count: a published glyph can arrive with thousands of
 * colours (scanned art, anti-aliased photographs of an alphabet), which ships as truecolour at
 * three or four bytes a pixel. At the size the UI draws a glyph, 64 colours is already more
 * than the eye resolves, so every drawing is median-cut down to MAX_COLORS and written as a
 * palette PNG at the smallest legal index depth (1/2/4/8 bits). That is where most of the
 * shipped page's weight went: 128px art, 8 bits of index per pixel, 12.8k glyphs.
 *
 * Both halves are hand-rolled on node:zlib so the build needs no image dependency: decoding
 * reuses decodePng() from tags.mjs, and writePng() below emits a palette PNG (indices at the
 * narrowest legal bit depth) where it can and 8-bit RGB/RGBA otherwise, choosing each row's
 * filter the usual way (smallest sum of absolute signed bytes).
 */
import fs from "node:fs";
import zlib from "node:zlib";
import {decodePng} from "./tags.mjs";

/* Long-edge cap. 128 covers the largest thing the UI does with a glyph — a 50px sample cell
 * on a 2x display is 100 device pixels — with room for a canvas zoomed past 100%. */
export const MAX_SIDE = Number(process.env.CF_ART_MAX || 128);

/* Palette cap. Enough for the anti-aliasing ramp of line art plus the handful of ciphers that
 * really are drawn in colour (flags, fennim, videogame); beyond it the extra colours only cost
 * bytes at a 30px tile. Raise CF_ART_COLORS=256 for the pre-quantisation fidelity. */
export const MAX_COLORS = Math.max(2, Math.min(256, Number(process.env.CF_ART_COLORS || 64)));

/* A drawing that needs more colours gets them. Quantisation is applied only while it stays
 * under this mean visible error, and the ladder below stops at 256; a drawing that misses the
 * bar at 256 ships in full colour, as it did before any of this. Measured against the shrunk
 * original and weighted for opacity — see colourError. */
const QUALITY_BAR = 2;
const PALETTE_LADDER = [...new Set([MAX_COLORS, 128, 256])].filter(n => n >= MAX_COLORS).sort((a, b) => a - b);

const CRC = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}

function chunk(type, data) {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
}

const packKey = (r, g, b, a) => ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/**
 * Median cut down to at most `max` RGBA colours. The box with the widest channel takes the
 * next split, weighted by how many pixels it holds, so the colours that cover the drawing are
 * the ones that survive. Alpha is treated as a fourth channel: transparent edges are most of
 * what an anti-aliased glyph spends its colours on, and a box split on red alone would spend
 * the whole budget there and band the ramp.
 *
 * Drawings already inside the budget come back untouched — no needless re-quantising.
 */
export function quantize({w, h, px}, max) {
    const count = new Map();
    for (let i = 0; i < w * h; i++) {
        const o = i * 4;
        const key = packKey(px[o], px[o + 1], px[o + 2], px[o + 3]);
        count.set(key, (count.get(key) || 0) + 1);
    }
    if (count.size <= max) return {w, h, px};

    const spread = box => {
        let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0, amin = 255, amax = 0;
        let n = 0;
        for (const [k, c] of box) {
            n += c;
            const r = k >>> 24, g = (k >>> 16) & 0xff, b = (k >>> 8) & 0xff, a = k & 0xff;
            if (r < rmin) rmin = r;
            if (r > rmax) rmax = r;
            if (g < gmin) gmin = g;
            if (g > gmax) gmax = g;
            if (b < bmin) bmin = b;
            if (b > bmax) bmax = b;
            if (a < amin) amin = a;
            if (a > amax) amax = a;
        }
        // n is the pixel mass the box holds, which is what decides which box is worth splitting
        // next: a box of a thousand colours with one pixel each is already as close as it needs
        // to be, while the box covering most of the drawing is the one still costing accuracy.
        return {box, n, r: rmax - rmin, g: gmax - gmin, b: bmax - bmin, a: amax - amin};
    };

    let work = [spread([...count.entries()])];
    while (work.length < max) {
        work.sort((x, y) => (y.r + y.g + y.b + y.a) * y.n - (x.r + x.g + x.b + x.a) * x.n);
        const target = work.find(b => b.box.length > 1);
        if (!target) break;
        const [shift] = [[24, target.r], [16, target.g], [8, target.b], [0, target.a]]
            .sort((x, y) => y[1] - x[1])[0];
        const sorted = target.box.slice().sort((x, y) => ((x[0] >>> shift) & 0xff) - ((y[0] >>> shift) & 0xff));
        let total = 0;
        for (const [, n] of sorted) total += n;
        let acc = 0, cut = 1;
        for (let i = 0; i < sorted.length - 1; i++) {
            acc += sorted[i][1];
            if (acc >= total / 2) { cut = i + 1; break; }
        }
        work = work.filter(b => b !== target);
        work.push(spread(sorted.slice(0, cut)), spread(sorted.slice(cut)));
    }

    // Each box collapses to its pixel-weighted mean colour, and every colour in it maps there.
    const mapped = new Map();
    for (const box of work) {
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (const [k, c] of box.box) {
            // Only visible colours shape the mean's RGB: what sits behind a transparent pixel is
            // unpainted, and letting it pull the average is how a transparent background turns
            // into a coloured haze.
            if (!(k & 0xff)) { n += c; continue; }
            r += (k >>> 24) * c;
            g += ((k >>> 16) & 0xff) * c;
            b += ((k >>> 8) & 0xff) * c;
            a += (k & 0xff) * c;
            n += c;
        }
        const mean = packKey(Math.round(r / n), Math.round(g / n), Math.round(b / n), Math.round(a / n));
        for (const [k] of box.box) mapped.set(k, mean);
    }
    const out = Buffer.alloc(px.length);
    for (let i = 0; i < w * h; i++) {
        const o = i * 4;
        const key = mapped.get(packKey(px[o], px[o + 1], px[o + 2], px[o + 3]));
        out[o] = (key >>> 24) & 0xff;
        out[o + 1] = (key >>> 16) & 0xff;
        out[o + 2] = (key >>> 8) & 0xff;
        out[o + 3] = key & 0xff;
    }
    return {w, h, px: out};
}

/** Adaptive filtering over already-packed rows: try all five, keep the cheapest as signed bytes. */
function filterRows(rows, h, stride, bpp) {
    const raw = Buffer.alloc(h * (stride + 1));
    const cand = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));
    for (let y = 0; y < h; y++) {
        const cur = rows.subarray(y * stride, (y + 1) * stride);
        const prev = y ? rows.subarray((y - 1) * stride, y * stride) : null;
        let bestType = 0, bestCost = Infinity, best = cand[0];
        for (let type = 0; type < 5; type++) {
            const out = cand[type];
            let cost = 0;
            for (let x = 0; x < stride; x++) {
                const a = x >= bpp ? cur[x - bpp] : 0;
                const b = prev ? prev[x] : 0;
                const c = x >= bpp && prev ? prev[x - bpp] : 0;
                let v = cur[x];
                if (type === 1) v -= a;
                else if (type === 2) v -= b;
                else if (type === 3) v -= (a + b) >> 1;
                else if (type === 4) v -= paeth(a, b, c);
                out[x] = v & 0xff;
                cost += out[x] < 128 ? out[x] : 256 - out[x];
            }
            if (cost < bestCost) { bestCost = cost; bestType = type; best = out; }
        }
        raw[y * (stride + 1)] = bestType;
        best.copy(raw, y * (stride + 1) + 1);
    }
    return raw;
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Re-encode an RGBA buffer as a PNG palette at the smallest index depth that fits, or null. */
function writePalettePng(w, h, rgba) {
    const seen = new Map();
    let anyAlpha = false;
    for (let i = 0; i < rgba.length; i += 4) {
        const key = packKey(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]);
        if (!seen.has(key)) {
            if (seen.size === 256) return null;
            seen.set(key, seen.size);
        }
        if (rgba[i + 3] !== 255) anyAlpha = true;
    }
    const colors = [...seen.keys()];
    // 2, 4 and 16 colours halve, quarter and eighth the row the indices travel in; PNG allows
    // no 3-bit depth, so 5–16 colours pay for the nibble.
    const depth = colors.length <= 2 ? 1 : colors.length <= 4 ? 2 : colors.length <= 16 ? 4 : 8;
    const stride = Math.ceil((w * depth) / 8);
    const perByte = 8 / depth;
    const rows = Buffer.alloc(h * stride);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4;
            const index = seen.get(packKey(rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]));
            // Indices run left to right, most significant bits first, as the spec requires.
            rows[y * stride + Math.floor(x / perByte)] |= index << (8 - depth * ((x % perByte) + 1));
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = depth;
    ihdr[9] = 3;                                  // palette
    const plte = Buffer.alloc(colors.length * 3);
    const trns = Buffer.alloc(colors.length);
    colors.forEach((key, i) => {
        plte[i * 3] = (key >>> 24) & 0xff;
        plte[i * 3 + 1] = (key >>> 16) & 0xff;
        plte[i * 3 + 2] = (key >>> 8) & 0xff;
        trns[i] = key & 0xff;
    });
    const parts = [PNG_SIG, chunk("IHDR", ihdr), chunk("PLTE", plte)];
    if (anyAlpha) {
        let last = trns.length - 1;
        while (last >= 0 && trns[last] === 255) last--;
        parts.push(chunk("tRNS", trns.subarray(0, last + 1)));
    }
    parts.push(chunk("IDAT", zlib.deflateSync(filterRows(rows, h, stride, 1), {level: 9})));
    parts.push(chunk("IEND", Buffer.alloc(0)));
    return Buffer.concat(parts);
}

/** Truecolour fallback for art that somehow carries more than 256 colours after quantising. */
function writeTruecolorPng(w, h, rgba) {
    let anyAlpha = false;
    for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) { anyAlpha = true; break; }
    const bpp = anyAlpha ? 4 : 3;
    const stride = w * bpp;
    const rows = Buffer.alloc(h * stride);
    for (let i = 0; i < w * h; i++) {
        const o = i * 4;
        rows[i * bpp] = rgba[o];
        rows[i * bpp + 1] = rgba[o + 1];
        rows[i * bpp + 2] = rgba[o + 2];
        if (anyAlpha) rows[i * bpp + 3] = rgba[o + 3];
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = anyAlpha ? 6 : 2;                   // RGBA / RGB
    return Buffer.concat([
        PNG_SIG,
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(filterRows(rows, h, stride, bpp), {level: 9})),
        chunk("IEND", Buffer.alloc(0))
    ]);
}

/** Re-encode an RGBA buffer as a PNG: palette at the smallest index depth, else RGB(A). */
export function writePng(w, h, rgba) {
    return writePalettePng(w, h, rgba) || writeTruecolorPng(w, h, rgba);
}

/**
 * Area-average downscale, in premultiplied alpha so a transparent edge does not drag the ink
 * towards black. Only ever shrinks: art already inside the cap comes back unchanged.
 */
export function shrink({w, h, px}, cap) {
    if (w <= cap && h <= cap) return {w, h, px};
    const scale = cap / Math.max(w, h);
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const out = Buffer.alloc(tw * th * 4);
    for (let ty = 0; ty < th; ty++) {
        const y0 = Math.floor((ty * h) / th), y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * h) / th));
        for (let tx = 0; tx < tw; tx++) {
            const x0 = Math.floor((tx * w) / tw), x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * w) / tw));
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let y = y0; y < y1 && y < h; y++) {
                for (let x = x0; x < x1 && x < w; x++) {
                    const o = (y * w + x) * 4;
                    const al = px[o + 3];
                    r += px[o] * al;
                    g += px[o + 1] * al;
                    b += px[o + 2] * al;
                    a += al;
                    n++;
                }
            }
            const o = (ty * tw + tx) * 4;
            if (a && n) {
                out[o] = Math.round(r / a);
                out[o + 1] = Math.round(g / a);
                out[o + 2] = Math.round(b / a);
                out[o + 3] = Math.round(a / n);
            }
        }
    }
    return {w: tw, h: th, px: out};
}

const memo = new Map();

/**
 * Mean visible difference between a drawing and its quantised copy, 0–255. Colour is weighted
 * by how opaque the pixel is: the RGB behind a fully transparent pixel is unpainted, and
 * scoring it would flunk every flat glyph whose file stores garbage there, while saying nothing
 * about how the tile actually looks. Alpha itself is compared at full weight.
 */
function colourError(a, b) {
    let sum = 0, n = 0;
    for (let i = 0; i < a.px.length; i += 4) {
        const w = Math.max(a.px[i + 3], b.px[i + 3]) / 255;
        const d = (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2])) / 3;
        sum += d * w + Math.abs(a.px[i + 3] - b.px[i + 3]);
        n++;
    }
    return sum / n;
}

/**
 * The data URL a shipped glyph is drawn from: whichever of the published PNG and a packed
 * downscale of it is smaller. Cached per file so a build that resolves the same art twice
 * (a glyph shared between two ciphers, or a dCode set reusing a file) packs it once.
 */
export function artDataUrl(abs, cap = MAX_SIDE, colors = MAX_COLORS) {
    const key = abs + "|" + cap + "|" + colors;
    if (memo.has(key)) return memo.get(key);
    let url = null;
    try {
        const original = fs.readFileSync(abs);
        let best = original;
        const img = decodePng(original);
        if (img) {
            const small = shrink(img, cap);
            // Walk the ladder until the drawing survives the bar, then keep that palette. A
            // drawing the last rung still washes out is packed in full colour instead: a
            // handful of scanned plates (a flag, a stamped map) are painted, not drawn, and a
            // palette turns their paper into a tint.
            let q = quantize(small, colors);
            for (const levels of PALETTE_LADDER) {
                if (levels <= colors) continue;
                if (colourError(small, q) <= QUALITY_BAR) break;
                q = quantize(small, levels);
            }
            const packed = colourError(small, q) <= QUALITY_BAR
                ? writePng(q.w, q.h, q.px)
                : writeTruecolorPng(small.w, small.h, small.px);
            if (packed.length < best.length) best = packed;
        }
        url = "data:image/png;base64," + best.toString("base64");
    } catch { /* an unreadable file ships as a missing glyph, as before */ }
    memo.set(key, url);
    return url;
}
