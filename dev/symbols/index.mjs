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
import {cipherTags, cipherTagShares} from "./tags.mjs";
import {artDataUrl} from "./artpack.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, "data");
const ART_DIR = path.join(HERE, "art");
const CATALOGUE = path.join(HERE, "catalogue.json");

// Art is packed, not merely base64'd: artpack.mjs re-encodes each drawing at the size the UI
// actually draws it (dev/symbols/artpack.mjs), which is most of what index.html's weight was.
const encoder = abs => (fs.existsSync(abs) ? artDataUrl(abs) : null);

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

/** True when two keys in the set differ only by case (zodiac_killer's A/a are different
 * symbols with different art), so the host must not fold case when matching text. */
function caseSensitiveSet(glyphs) {
    const byFold = new Map();
    for (const g of glyphs) {
        const k = String(g.key ?? "");
        const f = k.toLowerCase();
        if (byFold.has(f) && byFold.get(f) !== k) return true;
        if (!byFold.has(f)) byFold.set(f, k);
    }
    return false;
}

/** Panel rows: one per ready cipher, sample strip already resolved to data URLs. */
export function panelRows() {
    return readyCiphers().map(c => ({
        slug: c.slug,
        name: c.name,
        source: c.source,
        artFrom: c.artFrom || "cachesleuth",
        glyphs: c.glyphs.length,
        dcode: c.dcode ? c.dcode.count : 0,
        direction: "ltr",
        caseSensitive: caseSensitiveSet(c.glyphs),
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
            ? c.dcode.glyphs.map(g => ({
                key: g.key,
                src: g.file ? encoder(path.join(HERE, g.file)) : null,
                // Per-glyph plaintext per variant, where the page publishes one (Zodiac's
                // Z408/Z340). The host uses it to tell a solved per-variant mapping from a
                // letter-keyed alphabet, which decides the source toggle under D17.
                variants: g.variants && Object.keys(g.variants).length ? g.variants : undefined
            }))
            : null;
        ciphers[c.slug] = {
            name: c.name,
            source: c.source,
            // Measured from the art at build time (dev/symbols/tags.mjs), so the panel's tag
            // pills and the wand's scan agree without either of them decoding a glyph.
            tags: cipherTags(c),
            // The same measurement graded, per tag: the share of this cipher's own drawings
            // that carry it, which is what its near misses are worth when a picture is ranked.
            tagShares: cipherTagShares(c),
            artFrom: c.artFrom || "cachesleuth",
            // dCode glyphs merged into CacheSleuth's shipped set (tenctonese's &), which
            // keeps the node single-source and hides the source toggle.
            ...(c.dcodeMerge?.length ? {dcodeMerge: c.dcodeMerge} : {}),
            sameAsCachesleuth: Boolean(c.sameAsCachesleuth),
            direction: "ltr",
            caseSensitive: caseSensitiveSet(c.glyphs),
            // Editorial note for the node (matoran: the source documents a hexagonal outline
            // but publishes no second glyph set), omitted entirely when a cipher has none.
            ...(c.note ? {note: c.note} : {}),
            table: c.source?.cachesleuth?.tableImage ? encoder(path.join(HERE, c.source.cachesleuth.tableImage)) : null,
            glyphs: c.glyphs.map(g => ({
                index: g.index,
                key: g.key,
                label: g.label,
                src: g.file ? encoder(path.join(HERE, g.file)) : null
            })),
            dcode: c.dcode && c.dcode.count
                ? {page: c.dcode.page, variantNames: c.dcode.variantNames || [], glyphs: dcodeArt}
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
