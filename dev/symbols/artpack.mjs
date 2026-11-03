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
 * Both halves are hand-rolled on node:zlib so the build needs no image dependency: decoding
 * reuses decodePng() from tags.mjs, and writePng() below emits an 8-bit palette PNG when the
 * drawing has few enough colours and 8-bit RGB/RGBA otherwise, choosing each row's filter the
 * usual way (smallest sum of absolute signed bytes).
 */
import fs from "node:fs";
import zlib from "node:zlib";
import {decodePng} from "./tags.mjs";

/* Long-edge cap. 128 covers the largest thing the UI does with a glyph — a 50px sample cell
 * on a 2x display is 100 device pixels — with room for a canvas zoomed past 100%. */
export const MAX_SIDE = Number(process.env.CF_ART_MAX || 128);

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

/** Re-encode an RGBA buffer as a PNG: palette when it fits in 256 colours, else RGB(A). */
export function writePng(w, h, rgba) {
    // Downscaled line art lands on a handful of ink and antialias steps, so the palette path
    // is the normal one; a photograph falls through to truecolour.
    const seen = new Map();
    let anyAlpha = false;
    let packed = true;
    for (let i = 0; i < rgba.length; i += 4) {
        const key = packKey(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]);
        if (!seen.has(key)) {
            if (seen.size === 256) { packed = false; break; }
            seen.set(key, seen.size);
        }
        if (rgba[i + 3] !== 255) anyAlpha = true;
    }
    const colors = [...seen.keys()];
    const indexed = packed && colors.length <= 256;
    const opaque = !anyAlpha;
    const bpp = indexed ? 1 : opaque ? 3 : 4;
    const stride = w * bpp;
    const rows = Buffer.alloc(h * stride);
    for (let i = 0; i < w * h; i++) {
        const o = i * 4;
        if (indexed) {
            rows[i] = seen.get(packKey(rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]));
        } else if (opaque) {
            rows[i * 3] = rgba[o];
            rows[i * 3 + 1] = rgba[o + 1];
            rows[i * 3 + 2] = rgba[o + 2];
        } else {
            rows[o] = rgba[o];
            rows[o + 1] = rgba[o + 1];
            rows[o + 2] = rgba[o + 2];
            rows[o + 3] = rgba[o + 3];
        }
    }

    // Adaptive filtering: try all five, keep the row whose bytes sum smallest read as signed.
    const raw = Buffer.alloc(h * (stride + 1));
    const cand = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));
    const paeth = (a, b, c) => {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    };
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

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;                                  // bit depth
    ihdr[9] = indexed ? 3 : opaque ? 2 : 6;       // palette / RGB / RGBA
    const parts = [
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr)
    ];
    if (indexed) {
        const plte = Buffer.alloc(colors.length * 3);
        const trns = Buffer.alloc(colors.length);
        colors.forEach((key, i) => {
            plte[i * 3] = (key >>> 24) & 0xff;
            plte[i * 3 + 1] = (key >>> 16) & 0xff;
            plte[i * 3 + 2] = (key >>> 8) & 0xff;
            trns[i] = key & 0xff;
        });
        parts.push(chunk("PLTE", plte));
        if (anyAlpha) {
            let last = trns.length - 1;
            while (last >= 0 && trns[last] === 255) last--;
            parts.push(chunk("tRNS", trns.subarray(0, last + 1)));
        }
    }
    parts.push(chunk("IDAT", zlib.deflateSync(raw, {level: 9})));
    parts.push(chunk("IEND", Buffer.alloc(0)));
    return Buffer.concat(parts);
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
 * The data URL a shipped glyph is drawn from: whichever of the published PNG and a packed
 * downscale of it is smaller. Cached per file so a build that resolves the same art twice
 * (a glyph shared between two ciphers, or a dCode set reusing a file) packs it once.
 */
export function artDataUrl(abs, cap = MAX_SIDE) {
    const key = abs + "|" + cap;
    if (memo.has(key)) return memo.get(key);
    let url = null;
    try {
        const original = fs.readFileSync(abs);
        let best = original;
        const img = decodePng(original);
        if (img) {
            const small = shrink(img, cap);
            const packed = writePng(small.w, small.h, small.px);
            if (packed.length < best.length) best = packed;
        }
        url = "data:image/png;base64," + best.toString("base64");
    } catch { /* an unreadable file ships as a missing glyph, as before */ }
    memo.set(key, url);
    return url;
}
