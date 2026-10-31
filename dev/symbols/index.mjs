/* Symbol-cipher registry — the panel, the node and the build all read through this.
 *
 * Data lives beside it: data/<slug>.json (metadata) and art/<slug>/**.png (the
 * sources' own glyphs), both written by dev/symbols/extract.mjs + install.mjs.
 * Nothing here is hand-typed. A cipher counts as ready only when its count check
 * passed AND every glyph it declares has art on disk, so the catalogue can never
 * advertise a cipher the app cannot draw — the guard that caught the missing
 * seven-segment symbol.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, "data");
const ART_DIR = path.join(HERE, "art");
const CATALOGUE = path.join(HERE, "catalogue.json");

const encoder = new DataURICache();
function DataURICache() {
    const memo = new Map();
    return abs => {
        if (memo.has(abs)) return memo.get(abs);
        const url = fs.existsSync(abs)
            ? "data:image/png;base64," + fs.readFileSync(abs).toString("base64")
            : null;
        memo.set(abs, url);
        return url;
    };
}

function rows() {
    if (!fs.existsSync(CATALOGUE)) return [];
    return JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));
}

function readCipher(slug) {
    const file = path.join(DATA_DIR, `${slug}.json`);
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const missing = data.glyphs.filter(g => !g.file || !fs.existsSync(path.join(HERE, g.file)));
    return {
        ...data,
        missing: missing.length,
        ready: data.check === "PASS" && missing.length === 0
    };
}

/** Every cipher in the catalogue, with art resolved and a readiness flag. */
export function allCiphers() {
    return rows().map(r => ({...r, ...(readCipher(r.slug) || {})}));
}

export function cipherBySlug(slug) {
    return readCipher(slug);
}

/** Ready ciphers only — what the panel offers to place on the canvas. */
export function readyCiphers() {
    return allCiphers().filter(c => c.ready);
}

/** First few letter glyphs of a cipher, for the panel row's sample strip. */
function samplesFor(data) {
    const letters = data.glyphs.filter(g => g.file && /^[A-Za-z]{1,3}$/.test(String(g.key)));
    const picked = (letters.length >= 5 ? letters : data.glyphs.filter(g => g.file)).slice(0, 5);
    return picked.map(g => ({key: g.key, label: g.label, src: encoder(path.join(HERE, g.file))}));
}

/** Panel rows: one per ready cipher, sample strip already resolved to data URLs. */
export function panelRows() {
    return readyCiphers().map(c => ({
        slug: c.slug,
        name: c.name,
        source: c.source,
        glyphs: c.glyphs.length,
        dcode: c.dcode ? c.dcode.count : 0,
        direction: "ltr",
        caseSensitive: false,
        samples: samplesFor(c)
    }));
}

/**
 * The whole symbol layer in one object, inlined into index.html by dev/build.mjs
 * as <script type="application/json" id="glyphData">. Keyed by slug; each cipher
 * carries its glyph list with art already resolved to data URLs, plus dCode's
 * second implementation where the source publishes one.
 */
export function glyphDataBundle() {
    const ciphers = {};
    for (const c of readyCiphers()) {
        const dcodeArt = c.dcode
            ? c.dcode.glyphs.map(g => ({key: g.key, src: g.file ? encoder(path.join(HERE, g.file)) : null}))
            : null;
        ciphers[c.slug] = {
            name: c.name,
            source: c.source,
            direction: "ltr",
            caseSensitive: false,
            table: c.source.cachesleuth.tableImage ? encoder(path.join(HERE, c.source.cachesleuth.tableImage)) : null,
            glyphs: c.glyphs.map(g => ({
                index: g.index,
                key: g.key,
                label: g.label,
                src: g.file ? encoder(path.join(HERE, g.file)) : null
            })),
            dcode: c.dcode && c.dcode.count
                ? {page: c.dcode.page, glyphs: dcodeArt}
                : null
        };
    }
    return {generated: new Date().toISOString().slice(0, 10), ciphers};
}

/** Per-cipher byte cost of the sprite, for the size report (D11). */
export function spriteStats() {
    const stats = {};
    let bytes = 0;
    let symbols = 0;
    for (const c of readyCiphers()) {
        let per = 0;
        for (const g of c.glyphs) {
            if (!g.file) continue;
            const abs = path.join(HERE, g.file);
            if (fs.existsSync(abs)) per += fs.statSync(abs).size;
        }
        if (c.dcode) {
            for (const g of c.dcode.glyphs) {
                if (!g.file) continue;
                const abs = path.join(HERE, g.file);
                if (fs.existsSync(abs)) per += fs.statSync(abs).size;
            }
        }
        stats[c.slug] = {glyphs: c.glyphs.length, bytes: per};
        bytes += per;
        symbols += c.glyphs.length;
    }
    return {ciphers: Object.keys(stats).length, symbols, bytes, perCipher: stats};
}
