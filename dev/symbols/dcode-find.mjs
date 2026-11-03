#!/usr/bin/env node
/* dCode page lookup — authoring-time only, never part of dev/build.mjs.
 *
 *   node dev/symbols/dcode-find.mjs <slug> [--name "Display Name"] [--keys "abc…"]
 *                                    [--all] [--top N] [--refresh]
 *
 * The batch routine used to guess three slug shapes — `/<slug>`, `/langage-<slug>`,
 * `/alphabet-<slug>` — and read a non-200 as "dCode has no page". That is how amohibia
 * shipped single-source while https://www.dcode.fr/amphibia-alphabet was there all
 * along: dCode spells the cipher differently ("Amphibia") and puts the suffix on the
 * other end of the slug.
 *
 * This resolves a cipher by what dCode itself publishes:
 *
 *   sitemap     https://www.dcode.fr/sitemap.xml — every page URL, cached in /tmp
 *   name match  path words against the cipher's own name, with 1–2 edit tolerance so
 *               amohibia finds amphibia; stopwords (code, cipher, alphabet, language…)
 *               are ignored so "Alien Language" does not match every *-alphabet page
 *   inventory   the candidate page's own glyph list — <img class="glyph"> srcs keyed
 *               from alt="char(65)", or the page's $.cryptoarea.icons array, the same
 *               two sources extract.mjs reads
 *   coverage    our declared keys (data JSON, else /tmp/symstage/<slug>/cipher.json)
 *               against that inventory, case-folded for letters
 *
 * A page is only SELECTED when it passes BOTH gates:
 *   coverage 100%  every declared key exists in the page's inventory, and
 *   name >= 0.80   the page's own <h1> vocabulary agrees with the cipher's name,
 * or, when no title agrees, SHAPE — the two sets' art is compared glyph by glyph.
 * Coverage alone is not enough: Futurama's alphabet also has 36 letters-and-digits, so
 * "Alien Language" matched it 36/36 while its page calls itself "Futurama Alien
 * Alphabet". Names alone are not enough either: CacheSleuth's "Ancient Hylian" is
 * dCode's "Hylian Language (Skyward Sword)" — 0.80 median glyph agreement, while the
 * other five Hylian pages sit at 0.49–0.61. Neither title would ever have found it.
 *
 * Exit 0 only with a SELECTED page; 1 when nothing covers the declared set; 2 on usage.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DCODE = "https://www.dcode.fr";
const SITEMAP_URL = DCODE + "/sitemap.xml";
const SITEMAP_CACHE = "/tmp/dcode-urls.txt";
const DATA_DIR = path.join(ROOT, "dev", "symbols", "data");
const CATALOGUE = path.join(ROOT, "dev", "symbols", "catalogue.json");
const STAGE_ROOT = "/tmp/symstage";
const ART_CACHE = "/tmp/dcode-glyph-cache";
const UA = {"user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"};
const STOP = new Set([
    "code", "codes", "cipher", "ciphers", "symbol", "symbols", "alphabet", "alphabets",
    "language", "languages", "script", "writing", "numerals", "numbers", "text", "system",
    "based", "the", "and", "of", "from"
]);

function usage(code = 2) {
    console.error("usage: node dev/symbols/dcode-find.mjs <slug> [--name \"Display Name\"] [--keys \"abc…\"] [--all] [--top N] [--refresh] [--no-shape]");
    process.exit(code);
}

async function getText(url) {
    const r = await fetch(url, {headers: UA});
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return await r.text();
}

// Every dCode page URL, cached: the sitemap is ~400 KB and the batch asks about a
// dozen ciphers per run, so it is fetched once and reused until --refresh.
async function sitemapUrls(refresh) {
    if (!refresh && fs.existsSync(SITEMAP_CACHE)) {
        const cached = fs.readFileSync(SITEMAP_CACHE, "utf8").split("\n").filter(Boolean);
        if (cached.length) return {urls: cached, cached: true};
    }
    const xml = await getText(SITEMAP_URL);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map(m => m[1].trim())
        .filter(u => u.startsWith(DCODE + "/") && !/\.xml(\.gz)?$/.test(u));
    const urls = [...new Set(locs)];
    fs.writeFileSync(SITEMAP_CACHE, urls.join("\n"));
    return {urls, cached: false};
}

function cipherName(slug) {
    try {
        const rows = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));
        const row = (Array.isArray(rows) ? rows : []).find(r => r.slug === slug);
        return row ? row.name : null;
    } catch {
        return null;
    }
}

// Declared keys come from what we already ship, else from the staging tree extract.mjs
// wrote — never from a hand-typed list, so coverage is measured against the real set.
function declaredKeys(slug) {
    for (const p of [path.join(DATA_DIR, slug + ".json"), path.join(STAGE_ROOT, slug, "cipher.json")]) {
        if (!fs.existsSync(p)) continue;
        try {
            const data = JSON.parse(fs.readFileSync(p, "utf8"));
            const keys = (data.glyphs || []).map(g => g.key).filter(k => typeof k === "string" && k.length);
            if (keys.length) return {keys, from: path.relative(ROOT, p)};
        } catch { /* unreadable file: try the next source */ }
    }
    return null;
}

const words = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// dCode names its French pages with the type word first (/alphabet-amphibia) and its
// English ones with it last (/amphibia-alphabet). Where both exist and both match, the
// English ordering is preferred, so a report link is the one a reader lands on.
const TYPE_WORDS = new Set(["alphabet", "langage", "chiffre", "code", "alphabet", "alphabetique"]);
const frenchOrdered = (p) => TYPE_WORDS.has(p.replace(/^\//, "").split("-")[0]);

function lev(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 3;
    let prev = Array.from({length: b.length + 1}, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = cur;
    }
    return prev[b.length];
}

// Path words carry dCode's own naming. Exact word beats a fuzzy hit beats a substring,
// so /amphibia-alphabet outranks every page that merely shares a word with the name.
function scorePath(pathWords, tokens, slug) {
    let score = 0;
    if (pathWords.join("-") === slug) score += 12;
    for (const t of tokens) {
        if (pathWords.includes(t)) score += 6;
        else if (pathWords.some(w => t.length >= 6 && lev(w, t) <= 2)) score += 4;
        else if (pathWords.some(w => w.length >= 4 && (w.includes(t) || t.includes(w)))) score += 2;
    }
    return score;
}

// The page's declared glyph inventory: the <img class="glyph"> tags plus, where the page
// also names its set in $.cryptoarea.icons, that array. The union matters because the
// array is case-limited (stray lists 48) while the tags carry the case-distinct glyphs
// the page also publishes — measuring coverage against the array alone understates the
// page and would reject a set extract.mjs already ships 57 tiles from.
function inventory(html) {
    const found = new Map();
    for (const m of html.matchAll(/<img[^>]*>/g)) {
        const tag = m[0];
        if (!/class="glyph"/.test(tag)) continue;
        const src = (tag.match(/\bsrc="([^"]+)"/) || [])[1];
        const alt = (tag.match(/\balt="([^"]*)"/) || [])[1] || "";
        if (!src) continue;
        const abs = new URL(src, DCODE).href;
        if (found.has(abs)) continue;
        const code = (alt.match(/char\((\d+)\)/) || [])[1]
            || (path.basename(new URL(src, DCODE).pathname).match(/char\((\d+)\)/) || [])[1];
        found.set(abs, code ? String.fromCodePoint(Number(code)) : alt);
    }
    const meta = html.match(/(https?:\/\/[^'"\s]+\/images)'\s*;\s*\$\.cryptoarea\.icons\s*=\s*\[([^\]]*)\]/);
    if (meta) {
        for (const hit of meta[2].matchAll(/char\((\d+)\)/g)) {
            const src = `${meta[1]}/char(${hit[1]})`;
            if (!found.has(src)) found.set(src, String.fromCodePoint(Number(hit[1])));
        }
    }
    return [...found.entries()].map(([src, key]) => ({src, key}));
}

// How much the page's own title agrees with the cipher's name: 2·shared/(ours+theirs),
// so one extra word the page carries (Futurama, II, XX) lowers the score below the gate
// while a one-letter spelling difference (Amohibia/Amphibia) still scores 1.0.
function nameAgreement(ourTokens, titleWords) {
    const theirs = titleWords.filter(w => w.length >= 3 && !STOP.has(w));
    if (!ourTokens.length || !theirs.length) return 0;
    const shared = new Set();
    for (const t of ourTokens) {
        for (const w of theirs) {
            if (w === t || (w.length >= 6 && t.length >= 6 && lev(w, t) <= 2)
                || (w.length >= 4 && t.length >= 4 && (w.includes(t) || t.includes(w)))) {
                shared.add(t);
            }
        }
    }
    return (2 * shared.size) / (ourTokens.length + theirs.length);
}

function coverageOf(inv, keys) {
    const have = new Set(inv.map(i => String(i.key).toLowerCase()).filter(Boolean));
    const missing = keys.filter(k => !have.has(String(k).toLowerCase()));
    return {covered: keys.length - missing.length, total: keys.length, missing};
}

/* -------------------------------------------------------- shape verification
 * The third gate, used only when no page title agrees with the cipher's name. A page
 * can publish the right alphabet under an unrelated name — CacheSleuth's "Ancient
 * Hylian" is dCode's "Hylian Language (Skyward Sword)", a fact no title reveals.
 *
 * Each glyph we already ship is compared with the same key on the candidate page: ink
 * is cropped to its bounding box, fitted into a 24x24 grid the way a tile renders it
 * (aspect preserved, centred), dilated by one cell so a filled drawing and an outline
 * of the same letter still line up, and scored by intersection-over-union. The median
 * over matched keys is the page's score, and a page is only chosen on a clear win —
 * measure, do not eyeball.
 */
const GRID = 24;
const SHAPE_GATE = 0.65;
const SHAPE_MARGIN = 0.08;

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

// Ink = visible and not a white ghost, the same rule install.mjs measures tightArt by.
function inkMask(img) {
    const m = new Uint8Array(img.w * img.h);
    for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
            const i = y * img.stride + x * img.ch;
            const alpha = img.ch === 4 ? img.px[i + 3] : img.ch === 2 ? img.px[i + 1] : 255;
            if (alpha <= 16) continue;
            const r = img.px[i];
            const g = img.ch >= 3 ? img.px[i + 1] : r;
            const b = img.ch >= 3 ? img.px[i + 2] : r;
            if (Math.min(r, g, b) >= 200) continue;
            m[y * img.w + x] = 1;
        }
    }
    return m;
}

function inkGrid(buf) {
    const img = decodePng(buf);
    if (!img) return null;
    const m = inkMask(img);
    let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
    for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
            if (!m[y * img.w + x]) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
        }
    }
    if (x1 < 0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const scale = Math.min(GRID / bw, GRID / bh);
    const w = Math.max(1, Math.round(bw * scale));
    const h = Math.max(1, Math.round(bh * scale));
    const ox = Math.floor((GRID - w) / 2), oy = Math.floor((GRID - h) / 2);
    const out = new Float32Array(GRID * GRID);
    for (let ty = 0; ty < h; ty++) {
        for (let tx = 0; tx < w; tx++) {
            const sx0 = x0 + Math.floor((tx * bw) / w);
            const sx1 = x0 + Math.max(Math.floor(((tx + 1) * bw) / w), Math.floor((tx * bw) / w) + 1);
            const sy0 = y0 + Math.floor((ty * bh) / h);
            const sy1 = y0 + Math.max(Math.floor(((ty + 1) * bh) / h), Math.floor((ty * bh) / h) + 1);
            let ink = 0, total = 0;
            for (let y = sy0; y < sy1; y++) {
                for (let x = sx0; x < sx1; x++) {
                    ink += m[y * img.w + x];
                    total++;
                }
            }
            out[(oy + ty) * GRID + (ox + tx)] = total ? ink / total : 0;
        }
    }
    return out;
}

function dilateGrid(g) {
    const o = new Float32Array(GRID * GRID);
    for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
            let v = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const yy = y + dy, xx = x + dx;
                    if (yy < 0 || yy >= GRID || xx < 0 || xx >= GRID) continue;
                    v = Math.max(v, g[yy * GRID + xx]);
                }
            }
            o[y * GRID + x] = v;
        }
    }
    return o;
}

function gridSim(a, b) {
    if (!a || !b) return null;
    const A = dilateGrid(a), B = dilateGrid(b);
    let inter = 0, uni = 0;
    for (let i = 0; i < A.length; i++) {
        const x = A[i] >= 0.25 ? 1 : 0;
        const y = B[i] >= 0.25 ? 1 : 0;
        inter += x & y;
        uni += x | y;
    }
    return uni ? inter / uni : 0;
}

// Our side of the comparison: the art already shipped, else the staged files.
function ourGlyphs(slug) {
    const out = new Map();
    let base = null, glyphs = null;
    const dataPath = path.join(DATA_DIR, slug + ".json");
    const stagePath = path.join(STAGE_ROOT, slug, "cipher.json");
    if (fs.existsSync(dataPath)) {
        glyphs = JSON.parse(fs.readFileSync(dataPath, "utf8")).glyphs || [];
        base = path.join(ROOT, "dev", "symbols");
    } else if (fs.existsSync(stagePath)) {
        glyphs = JSON.parse(fs.readFileSync(stagePath, "utf8")).glyphs || [];
        base = path.join(STAGE_ROOT, slug);
    }
    for (const g of glyphs) {
        if (!g.file) continue;
        const p = path.join(base, g.file);
        if (!fs.existsSync(p)) continue;
        out.set(String(g.key).toLowerCase(), fs.readFileSync(p));
    }
    return out;
}

async function cachedArt(url) {
    fs.mkdirSync(ART_CACHE, {recursive: true});
    const file = path.join(ART_CACHE, crypto.createHash("sha1").update(url).digest("hex") + ".png");
    if (fs.existsSync(file)) return fs.readFileSync(file);
    const r = await fetch(url, {headers: UA});
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(file, buf);
    return buf;
}

async function pool(items, size, fn) {
    const out = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({length: Math.min(size, items.length)}, async () => {
        while (next < items.length) {
            const i = next++;
            out[i] = await fn(items[i], i);
        }
    }));
    return out;
}

function bar(frac) {
    return `${String(Math.round(frac * 100)).padStart(3)}%`;
}

async function main() {
    const args = process.argv.slice(2);
    if (!args.length || args[0] === "-h" || args[0] === "--help") usage(args.length ? 0 : 2);

    const positional = [];
    let nameFlag = null;
    let keysFlag = null;
    let refresh = false;
    let showAll = false;
    let noShape = false;
    let top = 10;
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--name") nameFlag = args[++i];
        else if (a === "--keys") keysFlag = args[++i];
        else if (a === "--refresh") refresh = true;
        else if (a === "--all") showAll = true;
        else if (a === "--no-shape") noShape = true;
        else if (a === "--top") top = Math.max(1, Number(args[++i]) || 10);
        else if (a.startsWith("-")) usage(2);
        else positional.push(a);
    }
    if (!positional.length) usage(2);

    const slug = positional[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!slug) usage(2);
    const name = nameFlag || positional.slice(1).join(" ") || cipherName(slug) || slug;
    const declared = keysFlag ? {keys: [...keysFlag], from: "--keys"} : declaredKeys(slug);
    const keys = declared ? declared.keys : null;

    const tokens = words(name).filter(w => w.length >= 4 && !STOP.has(w));

    const {urls, cached} = await sitemapUrls(refresh);
    const paths = urls.map(u => u.slice(DCODE.length + 1)).filter(Boolean);

    const scored = paths
        .map(p => ({path: "/" + p, words: words(p)}))
        .map(c => ({...c, score: scorePath(c.words, tokens, slug)}))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score || a.path.length - b.path.length);

    const candidates = showAll ? scored : scored.slice(0, top);

    console.log(`cipher        : ${name} (${slug})`);
    console.log(`declared keys : ${keys ? `${keys.length}${keys.length <= 40 ? " — " + keys.join("") : ""} (from ${declared.from})` : "unknown — no data file and nothing staged; pass --keys or stage first"}`);
    console.log(`dCode sitemap : ${urls.length} page URLs (${cached ? "cached " + SITEMAP_CACHE : "fetched"})`);
    console.log(`candidates    : ${scored.length} scored${showAll ? "" : ` of ${scored.length}, showing ${candidates.length}`}`);
    console.log("");

    if (!candidates.length) {
        console.log(`NO PAGE — nothing in dCode's sitemap shares a name with ${JSON.stringify(name)}.`);
        console.log("Record the cipher as single-source; do not invent a slug.");
        process.exit(1);
    }

    const checked = await pool(candidates, 4, async c => {
        try {
            const html = await getText(DCODE + c.path);
            const h1 = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
            const inv = inventory(html);
            return {...c, h1, inv, cov: keys ? coverageOf(inv, keys) : null,
                name: nameAgreement(tokens, words(h1))};
        } catch (err) {
            return {...c, h1: "", inv: [], cov: null, name: 0, err: err.message};
        }
    });

    for (const c of checked) {
        const inv = c.err ? `ERROR ${c.err}` : `${String(c.inv.length).padStart(3)} glyphs`;
        const cov = c.cov ? `${String(c.cov.covered).padStart(3)}/${String(c.cov.total).padEnd(3)} ${bar(c.cov.covered / c.cov.total)}` : "   coverage n/a";
        console.log(`  ${c.path.padEnd(42)} ${inv}  ${cov}  name ${c.name.toFixed(2)}  ${c.h1 ? JSON.stringify(c.h1) : ""}`);
    }
    console.log("");

    const NAME_GATE = 0.8;
    const full = checked
        .filter(c => c.cov && c.cov.covered === c.cov.total && c.name >= NAME_GATE)
        .sort((a, b) => b.name - a.name || b.score - a.score
            || Number(frenchOrdered(a.path)) - Number(frenchOrdered(b.path))
            || a.path.length - b.path.length);
    if (full.length) {
        const best = full[0];
        console.log(`SELECTED ${best.path}`);
        console.log(`next: node dev/symbols/extract.mjs ${slug} --dcode ${best.path}`);
        process.exit(0);
    }

    // No title agrees. Before calling the cipher a lookalike, compare the art — the only
    // gate that finds a page whose name shares nothing with ours (Ancient Hylian).
    const covering = checked.filter(c => c.cov && c.cov.covered === c.cov.total);
    const ours = noShape ? new Map() : ourGlyphs(slug);
    if (ours.size && covering.length) {
        await pool(covering, 3, async c => {
            const scores = [];
            for (const g of c.inv) {
                const key = String(g.key).toLowerCase();
                if (!ours.has(key)) continue;
                try {
                    const theirs = inkGrid(await cachedArt(g.src));
                    const s = gridSim(inkGrid(ours.get(key)), theirs);
                    if (s !== null) scores.push(s);
                } catch { /* unreadable art is not evidence either way */ }
            }
            scores.sort((a, b) => a - b);
            c.matched = scores.length;
            c.shape = scores.length ? scores[Math.floor(scores.length / 2)] : null;
        });
        console.log("shape agreement with our art (median dilated IoU per shared key):");
        for (const c of covering.slice().sort((a, b) => (b.shape ?? -1) - (a.shape ?? -1))) {
            console.log(`  ${c.path.padEnd(42)} ${String(c.matched).padStart(3)} keys  shape ${c.shape === null ? "n/a" : c.shape.toFixed(2)}  ${c.h1 ? JSON.stringify(c.h1) : ""}`);
        }
        console.log("");
        const ranked = covering.filter(c => c.shape !== null && c.matched >= Math.min(8, ours.size))
            .sort((a, b) => b.shape - a.shape
                || Number(frenchOrdered(a.path)) - Number(frenchOrdered(b.path))
                || a.path.length - b.path.length);
        if (ranked.length) {
            const best = ranked[0];
            // dCode serves the same page in French and English (/langage-hylian-skyward-sword
            // and /hylian-language-skyward-sword are one alphabet, both at 0.80). Twins must not
            // shadow each other in the margin test or a real match fails against itself.
            const rival = ranked.find(c => best.shape - c.shape >= 0.02);
            if (best.shape >= SHAPE_GATE && (!rival || best.shape - rival.shape >= SHAPE_MARGIN)) {
                console.log(`SELECTED ${best.path}  (art ${best.shape.toFixed(2)} over ${best.matched} keys, next different alphabet ${rival ? rival.shape.toFixed(2) : "none"}; name ${best.name.toFixed(2)} < ${NAME_GATE})`);
                console.log(`next: node dev/symbols/extract.mjs ${slug} --dcode ${best.path}`);
                process.exit(0);
            }
            console.log(`NO PAGE — closest art is ${best.shape.toFixed(2)} (${best.path}) against the ${SHAPE_GATE} gate`);
            console.log(`or the next different alphabet is within ${SHAPE_MARGIN}. That set is not this one; stage single-source.`);
            process.exit(1);
        }
    }

    // Nothing passed both gates. Name the gate that failed for the closest candidate, so
    // the record says why rather than just "no page".
    const nearMiss = checked
        .sort((a, b) => (b.cov ? b.cov.covered / b.cov.total : 0) - (a.cov ? a.cov.covered / a.cov.total : 0)
            || b.name - a.name)[0];
    if (nearMiss && nearMiss.cov && nearMiss.cov.covered === nearMiss.cov.total && nearMiss.name < NAME_GATE) {
        console.log(`NO PAGE — ${nearMiss.path} covers the keys but calls itself ${JSON.stringify(nearMiss.h1)} (name agreement ${nearMiss.name.toFixed(2)} < ${NAME_GATE}).`);
        console.log(noShape
            ? "Shape check skipped (--no-shape): this may still be the page. Re-run without it before deciding."
            : "That is a different cipher that happens to share the key plan. Stage single-source and record it.");
        process.exit(1);
    }

    if (!keys) {
        console.log("NO SELECTION — declared keys unknown, so coverage cannot be proven.");
        console.log("Stage the cipher (or pass --keys) and run this again before using --dcode.");
        process.exit(1);
    }

    const partial = checked.filter(c => c.cov && c.cov.covered > 0 && c.name >= NAME_GATE)
        .sort((a, b) => b.cov.covered - a.cov.covered);
    if (partial.length) {
        const p = partial[0];
        console.log(`NO PAGE covers the declared set. Closest lookalike: ${p.path} at ${p.cov.covered}/${p.cov.total} — missing ${JSON.stringify(p.cov.missing.join(""))}.`);
        console.log("That is a different cipher, not this one. Stage single-source and record it.");
    } else {
        console.log("NO PAGE shares a glyph inventory with this cipher. Stage single-source and record it.");
    }
    process.exit(1);
}

main().catch(err => {
    console.error(err.stack || err.message);
    process.exit(1);
});
