#!/usr/bin/env node
/* Symbol glyph extractor — authoring-time only, never part of dev/build.mjs.
 *
 *   node dev/symbols/extract.mjs <cachesleuth-url> [--dcode /page-path]
 *
 * Builds one cipher's glyph set from what the sources themselves declare, so no
 * character list is ever hand-typed (plan D6):
 *
 *   descriptors  CACHESLUETH CODE LIST/.../codes.js   letters/numbers/otherchars + image dirs
 *   manifest     cachesleuth.com/codes/image_manifest.json   exact image files per cipher
 *   dCode        the page's class="glyph" images, keyed from alt="char(65)"
 *
 * Output: /tmp/symstage/<slug>/  (glyph PNGs + cipher.json).
 * Exits 1 when the count check fails, so a short alphabet can never pass silently.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CODES_JS = path.join(ROOT, "CACHESLUETH CODE LIST", "Code Tables - CacheSleuth_files", "codes.js");
const MANIFEST_URL = "https://www.cachesleuth.com/codes/image_manifest.json";
const MANIFEST_CACHE = "/tmp/image_manifest.json";
const IMAGE_BASE = "https://i.cachesleuth.com/images/";
const DCODE_BASE = "https://www.dcode.fr";
const STAGE_ROOT = "/tmp/symstage";
const UA = {"user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"};

const ATOZ = "abcdefghijklmnopqrstuvwxyz".split("");
const NUMS = "0123456789".split("");
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function usage(code) {
    console.error("usage: node dev/symbols/extract.mjs <cachesleuth-url> [--dcode /page-path]");
    process.exit(code);
}

/* --- descriptor ------------------------------------------------------- */

/* Some urls appear twice in codes.js ("pigpen" is both "Freemason Version 1" and
 * "Pig Pen Version 1"). Prefer the descriptor whose own name contains the url so
 * the panel shows the source's name for that table without anyone hand-picking it. */
function pickDescriptor(all, url) {
    const matches = all.filter(d => d.url === url);
    if (!matches.length) return null;
    const target = url.toLowerCase().replace(/[^a-z]/g, "");
    const score = d => {
        const n = d.name.toLowerCase().replace(/[^a-z]/g, "");
        return (n.includes(target) ? 2 : 0) + (n && target.includes(n) ? 1 : 0);
    };
    return matches.slice().sort((a, b) => score(b) - score(a))[0];
}

function readDescriptors() {
    const src = fs.readFileSync(CODES_JS, "utf8");
    const out = [];
    const re = /\{name:"((?:[^"\\]|\\.)*)",url:"([^"]*)",([^}]*)\}/g;
    let m;
    while ((m = re.exec(src))) {
        const rest = m[3];
        out.push({
            name: JSON.parse(`"${m[1]}"`),
            url: m[2],
            letters: field(rest, "letters"),
            numbers: field(rest, "numbers"),
            otherchars: field(rest, "otherchars"),
            othernames: field(rest, "othernames"),
            lcdir: strField(rest, "lcdir"),
            ucdir: strField(rest, "ucdir"),
            up: strField(rest, "up"),
            font: strField(rest, "font"),
            // the descriptor's own html names the source's table/legend picture
            tableImg: (rest.match(/\.\.\/images\/["'\s]*[^"'\s]+\.png/) || [])[0] || null
        });
    }
    if (!out.length) throw new Error("no descriptors parsed from codes.js");
    return out;
}

function field(rest, name) {
    const m = rest.match(new RegExp(`(?:^|,)${name}:([^,]*(?:,(?![a-z]+:)[^,]*)*)`));
    return m ? m[1].trim() : "";
}
function strField(rest, name) {
    const m = rest.match(new RegExp(`${name}:"([^"]*)"`));
    return m ? m[1] : "";
}

/* The descriptor's literals are JavaScript strings, so a key must be the character
 * they denote rather than the text of their escape: "\u201C" is the left double quote
 * and "\\" is one backslash. Without this the tile is captioned \u201C and clicking it
 * appends those six characters, one glyph each. */
function unescapeJs(s) {
    return String(s).replace(/\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([\s\S]))/g,
        (_, braced, u4, x2, ch) => {
            if (braced !== undefined) return String.fromCodePoint(parseInt(braced, 16));
            if (u4 !== undefined) return String.fromCharCode(parseInt(u4, 16));
            if (x2 !== undefined) return String.fromCharCode(parseInt(x2, 16));
            return ({n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", "0": "\0"})[ch] ?? ch;
        });
}

/* Turns the descriptor's list expressions into arrays without hand-typing them. */
function listOf(expr) {
    const e = (expr || "").trim();
    if (!e || e === '""' || e === "''") return [];
    if (e === "atoz") return ATOZ.slice();
    if (e === "nums") return NUMS.slice();
    if (/^"([^"]*)"\.split\(""\)$/.test(e)) return unescapeJs(e.match(/^"([^"]*)"/)[1]).split("");
    if (/^"([^"]*)"$/.test(e)) return unescapeJs(e.match(/^"([^"]*)"/)[1]).split("");
    if (/^new Array\(([\s\S]*)\)$/.test(e)) {
        const inner = e.replace(/^new Array\(/, "").replace(/\)$/, "");
        return [...inner.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)].map(x => unescapeJs(x[1] ?? x[2]));
    }
    throw new Error(`unhandled descriptor expression: ${e}`);
}

/* Mirror the site's own rules (an()/on()/ga() in codetables.js):
 *   letter -> [lcdir/]lower(char).png     number -> char.png
 *   other  -> othernames[i].png           space  -> handled by othernames ("space")   */
function planGlyphs(desc) {
    const glyphs = [];
    const seen = new Set();
    const add = (key, file) => {
        if (!file || seen.has(key)) return;
        seen.add(key);
        glyphs.push({key, label: key.length === 1 ? key.toUpperCase() : key.toUpperCase(), file});
    };
    for (const ch of listOf(desc.letters)) add(ch, `${desc.lcdir ? desc.lcdir + "/" : ""}${ch.toLowerCase()}.png`);
    for (const n of listOf(desc.numbers)) add(n, `${n}.png`);
    const others = listOf(desc.otherchars);
    const names = listOf(desc.othernames);
    others.forEach((ch, i) => {
        if (!names[i]) {
            console.warn(`  ! otherchar ${JSON.stringify(ch)} has no othernames entry — skipped`);
            return;
        }
        add(ch, `${names[i]}.png`);
    });
    return glyphs;
}

/* --- network ---------------------------------------------------------- */

async function fetchBuf(url) {
    const r = await fetch(url, {headers: UA});
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    return Buffer.from(await r.arrayBuffer());
}
async function fetchText(url) {
    const r = await fetch(url, {headers: UA});
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    return r.text();
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
async function loadManifest() {
    if (fs.existsSync(MANIFEST_CACHE)) return JSON.parse(fs.readFileSync(MANIFEST_CACHE, "utf8"));
    const txt = await fetchText(MANIFEST_URL);
    fs.writeFileSync(MANIFEST_CACHE, txt);
    return JSON.parse(txt);
}
function writePng(dir, file, buf) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, buf);
    return buf.length;
}

/* --- dCode ----------------------------------------------------------- */

async function extractDcode(pagePath, dir) {
    const html = await fetchText(DCODE_BASE + pagePath);
    const tags = [...html.matchAll(/<img[^>]*>/g)].map(x => x[0]).filter(t => /class="glyph"/.test(t));
    const seen = new Map();
    for (const t of tags) {
        const src = (t.match(/\bsrc="([^"]+)"/) || [])[1];
        const alt = (t.match(/\balt="([^"]*)"/) || [])[1] || "";
        if (!src || seen.has(src)) continue;
        const code = alt.match(/char\((\d+)\)/);
        const key = code ? String.fromCharCode(Number(code[1])) : alt;
        seen.set(src, key);
    }
    const entries = [...seen.entries()].map(([src, key]) => ({src, key}));
    const glyphs = await pool(entries, 6, async e => {
        try {
            const buf = await fetchBuf(e.src.startsWith("http") ? e.src : DCODE_BASE + e.src);
            const file = `dcode/${encodeURIComponent(path.basename(new URL(e.src, DCODE_BASE).pathname))}`;
            const bytes = writePng(dir, file, buf);
            return {key: e.key, file, bytes, ok: isPng(buf)};
        } catch (err) {
            console.warn(`  ! dcode ${e.key}: ${err.message}`);
            return {key: e.key, file: null, bytes: 0, ok: false};
        }
    });
    return {page: pagePath, glyphs, count: glyphs.filter(g => g.file).length, ok: glyphs.every(g => g.ok)};
}

function isPng(buf) {
    return buf.length > 4 && PNG_MAGIC.every((b, i) => buf[i] === b);
}

/* --- main ------------------------------------------------------------- */

async function main() {
    const args = process.argv.slice(2);
    if (!args.length || args[0] === "-h" || args[0] === "--help") usage(args.length ? 0 : 2);
    const slug = args[0];
    const dIdx = args.indexOf("--dcode");
    const dcodePath = dIdx >= 0 ? args[dIdx + 1] : null;

    const desc = pickDescriptor(readDescriptors(), slug);
    if (!desc) {
        console.error(`no descriptor for "${slug}" in codes.js`);
        process.exit(2);
    }

    const stage = path.join(STAGE_ROOT, slug);
    fs.rmSync(stage, {recursive: true, force: true});
    fs.mkdirSync(path.join(stage, "glyphs"), {recursive: true});

    const manifest = await loadManifest();
    const declared = manifest[slug];
    if (!declared) {
        console.error(`"${slug}" has no image_manifest.json entry — not extractable`);
        process.exit(2);
    }

    const glyphs = planGlyphs(desc);
    const planned = new Set(glyphs.map(g => g.file));
    const unmapped = declared.filter(f => !planned.has(f));
    const absent = glyphs.filter(g => !declared.includes(g.file));

    console.log(`cipher: ${desc.name} (${slug})`);
    console.log(`  declared by descriptor : ${glyphs.length} characters`);
    console.log(`  files in manifest      : ${declared.length}`);
    console.log(`  planned but not in manifest (would 404) : ${absent.length}${absent.length ? " -> " + absent.map(g => g.file).join(", ") : ""}`);
    console.log(`  in manifest but unmapped (legends/other): ${unmapped.length}${unmapped.length ? " -> " + unmapped.join(", ") : ""}`);

    const results = await pool(glyphs, 6, async g => {
        try {
            const buf = await fetchBuf(IMAGE_BASE + slug + "/" + g.file);
            if (!isPng(buf)) return {...g, bytes: 0, ok: false, why: "not a PNG"};
            const bytes = writePng(path.join(stage, "glyphs"), g.file, buf);
            return {...g, bytes, ok: true};
        } catch (err) {
            return {...g, bytes: 0, ok: false, why: err.message};
        }
    });

    const failed = results.filter(r => !r.ok);
    const downloaded = results.filter(r => r.ok);

    // the source's own table/legend picture, for the contact sheet: prefer the path
    // the descriptor's html points at, then a manifest entry named for a table
    const refs = [];
    if (desc.tableImg) refs.push(desc.tableImg.replace(/^(\.\.\/)?images\//, ""));
    for (const f of ["legend.png", "alphabet.png"]) if (declared.includes(f)) refs.push(`${slug}/${f}`);
    let tableImage = null;
    for (const ref of refs) {
        const url = ref.startsWith("http") ? ref : IMAGE_BASE + ref;
        try {
            const buf = await fetchBuf(url);
            if (!isPng(buf)) continue;
            tableImage = `source-${path.basename(ref)}`;
            writePng(stage, tableImage, buf);
            console.log(`  source table image       : ${url}`);
            break;
        } catch (err) {
            console.warn(`  ! table image ${url}: ${err.message}`);
        }
    }

    let dcode = null;
    if (dcodePath) {
        console.log(`  dCode page             : ${dcodePath}`);
        dcode = await extractDcode(dcodePath, stage);
        console.log(`  dCode glyphs downloaded : ${dcode.count} (all PNG: ${dcode.ok})`);
    }

    const counts = {
        declared: glyphs.length,
        uniqueFiles: new Set(results.filter(r => r.ok).map(r => r.file)).size,
        manifestFiles: declared.length,
        downloaded: downloaded.length,
        failed: failed.length,
        unmapped: unmapped.length
    };
    const check = counts.declared === counts.downloaded && counts.failed === 0 && absent.length === 0
        ? "PASS" : "FAIL";

    const data = {
        slug,
        name: desc.name,
        descriptor: {
            letters: desc.letters, numbers: desc.numbers,
            otherchars: desc.otherchars, othernames: desc.othernames,
            lcdir: desc.lcdir, ucdir: desc.ucdir, font: desc.font
        },
        source: {
            cachesleuth: {
                page: `https://www.cachesleuth.com/codes/omni?code=${slug}`,
                images: `${IMAGE_BASE}${slug}/`,
                tableImage,
            },
            dcode: dcodePath ? {page: DCODE_BASE + dcodePath} : null
        },
        counts,
        glyphs: results.map((r, i) => ({index: i + 1, key: r.key, label: r.label, file: r.ok ? `glyphs/${r.file}` : null, bytes: r.bytes})),
        failed: failed.map(r => ({key: r.key, file: r.file, why: r.why})),
        unmapped,
        dcode: dcode ? {page: dcode.page, count: dcode.count, glyphs: dcode.glyphs} : null,
        check
    };
    fs.writeFileSync(path.join(stage, "cipher.json"), JSON.stringify(data, null, 2));

    console.log(`  downloaded              : ${counts.downloaded}/${counts.declared} (${counts.uniqueFiles} unique files)`);
    if (failed.length) failed.forEach(f => console.log(`    FAIL ${f.key} (${f.file}): ${f.why}`));
    console.log(`  table image              : ${tableImage || "(none published)"}`);
    console.log(`  staging                 : ${stage}`);
    console.log(`  COUNT CHECK: ${check}`);

    if (check !== "PASS") process.exit(1);
}

main().catch(err => {
    console.error(err.stack || err.message);
    process.exit(1);
});
