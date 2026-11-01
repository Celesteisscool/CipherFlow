#!/usr/bin/env node
/* Symbol glyph extractor — authoring-time only, never part of dev/build.mjs.
 *
 *   node dev/symbols/extract.mjs <cachesleuth-url> [--dcode /page-path [--art dcode [--drop <chars>] [--dcode-extras] [--cases]] [--same] [--dcode-icons]]
 *
 * --same records that dCode publishes the same alphabet (reviewed side by side):
 * the second set is downloaded as evidence but not shipped, so the node keeps
 * CacheSleuth's art and has no source toggle (American Sign Language, Dotsies).
 * --dcode-icons reads a page that draws its alphabet from the `$.cryptoarea.icons`
 * array instead of <img class="glyph"> tags (ogham): that list is the page's own
 * declared inventory (Ogham ships 52 — digits 0–9 and 21 letters in both cases),
 * and it is taken whole, as dCode publishes it.
 *
 * --art dcode ships dCode's icons as the cipher's own glyphs — used where both
 * sources publish the same alphabet and dCode's art was chosen (unown, hexahue).
 * The keys stay CacheSleuth's; the extractor refuses if dCode's set does not cover
 * every declared character, unless that character is named in --drop (hexahue's
 * empty space tile, which dCode does not publish). A named drop is recorded in
 * cipher.json and shown on the contact sheet — never silent.
 * --dcode-extras keeps the symbols dCode publishes beyond CacheSleuth's declared set
 * (Futurama's `! " ' - . : ;`): they are tiles in their own right, drawn from dCode's
 * art and keyed by their own character, so the shipped set is dCode's whole table.
 * --cases keys the letters in the case the chosen art writes (dCode's `char(65)` is
 * `A`) and ships dCode's case-distinct glyphs as tiles of their own. Atlantis publishes
 * lowercase `c`, `s`, `t` beside C/S/T as different shapes, so all three are real
 * symbols, each keeping its own lowercase key and label; the extras are compared
 * exactly rather than case-folded so `c` is not mistaken for `C`.
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
    console.error("usage: node dev/symbols/extract.mjs <cachesleuth-url> [--dcode /page-path [--art dcode [--drop <chars>] [--dcode-extras]] [--same] [--dcode-icons]]");
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
    for (const m of descriptorBodies(src)) {
        const rest = m.rest;
        out.push({
            name: m.name,
            url: m.url,
            letters: field(rest, "letters"),
            numbers: field(rest, "numbers"),
            otherchars: field(rest, "otherchars"),
            othernames: field(rest, "othernames"),
            digraphs: parseDigraphs(rest),
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

/* Descriptors contain nested objects (`digraphs:[{seq,file}]`) and strings that may
 * contain braces, so the old character-class capture stopped at the first digraph
 * entry and dropped the Specials. Scan balanced braces from each `{name:"` start,
 * skipping
 * quoted strings, and take the whole object body. */
function descriptorBodies(src) {
    const out = [];
    for (let i = src.indexOf('{name:"'); i !== -1; i = src.indexOf('{name:"', i + 1)) {
        let depth = 0, quote = null;
        for (let j = i; j < src.length; j++) {
            const ch = src[j];
            if (quote) {
                if (ch === "\\") j++;
                else if (ch === quote) quote = null;
                continue;
            }
            if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
            if (ch === "{") depth++;
            else if (ch === "}" && --depth === 0) {
                const body = src.slice(i, j + 1);
                const head = body.match(/^\{name:"((?:[^"\\]|\\.)*)",url:"([^"]*)",([\s\S]*)\}$/);
                if (head) out.push({name: JSON.parse(`"${head[1]}"`), url: head[2], rest: head[3]});
                i = j;
                break;
            }
        }
    }
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

/* The source's table ends with a "Specials" group: each descriptor `digraphs` entry
 * is ONE glyph for a multi-character sequence (dragon_skyrim: aa, ah, … @; sign:
 * ä/ae). They are table entries, not encoder-only aliases, so they are planned as
 * keys too. The array contains nested brackets and quoted escapes, so scan it with a
 * depth counter instead of a greedy regex; the first sequence is the site's caption. */
function parseDigraphs(rest) {
    const key = rest.indexOf("digraphs:");
    if (key < 0) return [];
    const start = rest.indexOf("[", key);
    if (start < 0) return [];
    let depth = 0, quote = null, end = -1;
    for (let i = start; i < rest.length; i++) {
        const ch = rest[i];
        if (quote) {
            if (ch === "\\") i++;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === "[") depth++;
        else if (ch === "]" && --depth === 0) { end = i; break; }
    }
    if (end < 0) return [];
    const out = [];
    for (const m of rest.slice(start + 1, end).matchAll(/\{([^{}]*)\}/g)) {
        const body = m[1];
        const file = (body.match(/\bfile:"((?:[^"\\]|\\.)*)"/) || [])[1];
        if (!file) continue;
        const seqs = [];
        for (const s of body.matchAll(/\bseqs?:\s*(\[[^\]]*\]|"(?:[^"\\]|\\.)*")/g)) {
            if (s[1].startsWith("[")) {
                for (const q of s[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) seqs.push(unescapeJs(q[1]));
            } else {
                seqs.push(unescapeJs(s[1].slice(1, -1)));
            }
        }
        if (seqs.length) out.push({seq: seqs[0], file});
    }
    return out;
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
    // Some descriptors attach table metadata to the list itself: Dotsies writes
    // `letters:atoz,indexImage:"x.png"`, and the field parser keeps the tail because the
    // next key starts with an uppercase letter. The list is still the leading atoz/nums
    // token; the tail only names the table's index picture, which the manifest already
    // accounts for — so it is reported and then ignored, never hand-trimmed.
    const tailed = e.match(/^(atoz|nums),([\s\S]*)$/);
    if (tailed) {
        console.warn(`  ~ descriptor list carries an attribute, ignored: ,${tailed[2]}`);
        return tailed[1] === "atoz" ? ATOZ.slice() : NUMS.slice();
    }
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
function planGlyphs(desc, {upperKeys = false} = {}) {
    const glyphs = [];
    const seen = new Set();
    // The site's caption rule (codetables.js): an up-cipher captions each tile
    // with its own character ("A" under the uppercase art, "a" under the
    // lowercase art); everything else is captioned uppercase. --cases keys by the
    // art's own character, so the caption follows the key.
    const labelFor = key => (desc.up || upperKeys ? key : key.toUpperCase());
    const add = (key, file) => {
        if (!file || seen.has(key)) return;
        seen.add(key);
        glyphs.push({key, label: labelFor(key), file});
    };
    const letters = listOf(desc.letters);
    // up:"1" ciphers publish BOTH cases as distinct art: the site's main table
    // renders an "Uppercase" section ([ucdir/]UPPER.png, via its ln() rule)
    // before the "Lowercase" one ([lcdir/]lower.png, via on()), so both sets are
    // the source's alphabet — not a duplicate to drop (zodiac_killer: 62 files).
    if (upperKeys) {
        // One art per letter, keyed the way the chosen source writes it (dCode's
        // char(65) is `A`). The key's case is the tile's identity, which is what lets
        // dCode's lowercase c/s/t ship beside C/S/T as their own symbols.
        for (const ch of letters) add(ch.toUpperCase(), `${desc.lcdir ? desc.lcdir + "/" : ""}${ch.toLowerCase()}.png`);
    } else if (desc.up) {
        for (const ch of letters) add(ch.toUpperCase(), `${desc.ucdir ? desc.ucdir + "/" : ""}${ch.toUpperCase()}.png`);
    } else {
        for (const ch of letters) add(ch, `${desc.lcdir ? desc.lcdir + "/" : ""}${ch.toLowerCase()}.png`);
    }
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
    // The source's own "Specials" group: one glyph for a multi-character key.
    for (const d of desc.digraphs || []) {
        if (d.seq && d.file) add(d.seq, d.file);
    }
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

/* Some cipher pages (zodiac-killer) publish a mapping table whose repeated
 * header cells name the cipher's variants, one group per row of
 * [glyph img][variant-1 letter][variant-2 letter]… . Parse it so every glyph
 * carries what it MEANS in each variant — the Zodiac symbols are homophonic,
 * so dCode's page maps one symbol inventory onto Z408 and Z340 separately. */
function dcodeVariants(html) {
    const out = new Map(); // absolute img src -> {variantName: plaintext}
    for (let t = html.indexOf("<table"); t !== -1; t = html.indexOf("<table", t + 1)) {
        const tEnd = html.indexOf("</table>", t);
        const tbl = html.slice(t, tEnd === -1 ? html.length : tEnd);
        if (!/class="glyph"/.test(tbl)) continue;
        const names = [...new Set([...tbl.matchAll(/<th>([^<]*)<\/th>/g)].map(m => m[1].trim()).filter(Boolean))];
        if (names.length < 2) continue;
        for (const row of tbl.match(/<tr>[\s\S]*?<\/tr>/g) || []) {
            const tds = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map(m => m[1]);
            for (let i = 0; i < tds.length; i++) {
                const src = (tds[i].match(/\bsrc="([^"]+)"/) || [])[1];
                if (!src || !/class="glyph"/.test(tds[i])) continue;
                const vals = {};
                for (let k = 0; k < names.length && i + 1 + k < tds.length; k++) {
                    const v = tds[i + 1 + k].replace(/<[^>]+>/g, "").trim();
                    if (v) vals[names[k]] = v;
                }
                if (Object.keys(vals).length) out.set(src, vals);
            }
        }
        if (out.size) return out;
    }
    return out;
}

async function extractDcode(pagePath, dir, {icons = false} = {}) {
    const html = await fetchText(DCODE_BASE + pagePath);
    const variantsFor = dcodeVariants(html);
    const tags = [...html.matchAll(/<img[^>]*>/g)].map(x => x[0]).filter(t => /class="glyph"/.test(t));
    const seen = new Map();
    for (const t of tags) {
        const src = (t.match(/\bsrc="([^"]+)"/) || [])[1];
        const alt = (t.match(/\balt="([^"]*)"/) || [])[1] || "";
        if (!src || seen.has(src)) continue;
        // Key from the alt text where the page writes it, else from the src filename:
        // Gravity Falls' page labels its glyphs "gravity-falls-alchemy symbol NN" while the
        // files are still char(N).png, so keying from alt alone would caption every tile
        // with dCode's internal symbol name. Pages that do write char(N) in the alt are
        // unaffected — the alt still wins.
        const fromSrc = path.basename(new URL(src, DCODE_BASE).pathname).match(/char\((\d+)\)/);
        const code = (alt.match(/char\((\d+)\)/) || [])[1] || (fromSrc ? fromSrc[1] : null);
        // fromCodePoint, not fromCharCode: dCode names glyphs by Unicode code point and
        // Mayan numerals live at U+1D2E0+ — fromCharCode would truncate 119520 to U+D2E0
        // (a Hangul syllable) and caption the tiles with the wrong characters entirely.
        const key = code ? String.fromCodePoint(Number(code)) : alt;
        seen.set(src, key);
    }
    // Some pages draw the alphabet from a JS array rather than <img> tags: ogham's
    // `$.cryptoarea.icons = ["char(48)", …]` lists every glyph its tool can write. That
    // array IS the page's inventory (52 for Ogham: digits plus 21 letters in both cases,
    // with no glyph published for j/k/v/w/x), so it is taken whole. The inline demo images
    // beside it are excerpts of that list, so the static scan is replaced, not added to.
    if (icons) {
        const meta = html.match(/(https?:\/\/[^'"\s]+\/images)'\s*;\s*\$\.cryptoarea\.icons\s*=\s*\[([^\]]*)\]/);
        if (meta) {
            seen.clear();
            for (const hit of meta[2].matchAll(/char\((\d+)\)/g)) {
                const key = String.fromCodePoint(Number(hit[1]));
                const src = `${meta[1]}/char(${hit[1]}).png`;
                if (!seen.has(src)) seen.set(src, key);
            }
            // dCode's Ogham menu parks forfeda in the ten digit slots (char(48)–57), but
            // its encoder never emits them for digits: typing 0–9 returns nothing, while
            // ea/oi/ui/ae return char(50)/char(52)/char(53)/char(49). Labeling those
            // slots 0–9 was wrong. The four the encoder confirms get their letters; the
            // rest (marks and variants with no reachable Latin input) are not shipped
            // rather than captioned with a guess.
            if (/alphabet-ogham/.test(pagePath)) {
                for (const [code, key] of Object.entries({49: "AE", 50: "EA", 52: "OI", 53: "UI"})) {
                    const src = `${meta[1]}/char(${code}).png`;
                    if (seen.has(src)) seen.set(src, key);
                }
                for (const code of [48, 51, 54, 55, 56, 57]) seen.delete(`${meta[1]}/char(${code}).png`);
            }
        }
    }
    const entries = [...seen.entries()].map(([src, key]) => ({src, key}));
    const glyphs = await pool(entries, 6, async e => {
        const variants = variantsFor.get(e.src) || null;
        try {
            const buf = await fetchBuf(e.src.startsWith("http") ? e.src : DCODE_BASE + e.src);
            const file = `dcode/${encodeURIComponent(path.basename(new URL(e.src, DCODE_BASE).pathname))}`;
            const bytes = writePng(dir, file, buf);
            return {key: e.key, file, bytes, ok: isPng(buf), variants};
        } catch (err) {
            console.warn(`  ! dcode ${e.key}: ${err.message}`);
            return {key: e.key, file: null, bytes: 0, ok: false, variants};
        }
    });
    return {page: pagePath, variantNames: [...new Set([...variantsFor.values()].flatMap(v => Object.keys(v)))],
        glyphs, count: glyphs.filter(g => g.file).length, ok: glyphs.every(g => g.ok)};
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
    const artIdx = args.indexOf("--art");
    const artFrom = artIdx >= 0 ? String(args[artIdx + 1] || "").toLowerCase() : "cachesleuth";
    if (!["cachesleuth", "dcode"].includes(artFrom)) usage(2);
    if (artFrom === "dcode" && !dcodePath) {
        console.error("--art dcode needs --dcode <page-path>");
        process.exit(2);
    }
    // Reviewed-same alphabet: keep CacheSleuth's art, ship no second set.
    const same = args.includes("--same");
    const dcodeIcons = args.includes("--dcode-icons");
    const dcodeExtras = args.includes("--dcode-extras");
    const cases = args.includes("--cases");
    for (const [flag, on] of [["--same", same], ["--dcode-icons", dcodeIcons], ["--dcode-extras", dcodeExtras], ["--cases", cases]]) {
        if (on && !dcodePath) {
            console.error(`${flag} needs --dcode <page-path>`);
            process.exit(2);
        }
    }
    if (dcodeExtras && artFrom !== "dcode") {
        console.error("--dcode-extras only applies with --art dcode");
        process.exit(2);
    }
    if (cases && artFrom !== "dcode") {
        console.error("--cases only applies with --art dcode");
        process.exit(2);
    }
    const dropIdx = args.indexOf("--drop");
    const dropSet = new Set();
    if (dropIdx >= 0) {
        if (artFrom !== "dcode") {
            console.error("--drop only applies with --art dcode");
            process.exit(2);
        }
        const val = dropIdx + 1 < args.length ? args[dropIdx + 1] : undefined;
        if (val === undefined) {
            console.error("--drop needs the characters to drop, e.g. --drop \" \"");
            process.exit(2);
        }
        for (const ch of String(val)) dropSet.add(ch);
    }

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

    const glyphs = planGlyphs(desc, {upperKeys: cases});
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
    let artGap = [], artDropped = [];
    if (dcodePath) {
        console.log(`  dCode page             : ${dcodePath}`);
        dcode = await extractDcode(dcodePath, stage, {icons: dcodeIcons});
        console.log(`  dCode glyphs downloaded : ${dcode.count} (all PNG: ${dcode.ok})`);
        if (dcode.variantNames.length) console.log(`  dCode variant mapping   : ${dcode.variantNames.join(", ")}`);
        if (artFrom === "dcode") {
            // Shipping dCode's icons works only when its set covers every character
            // CacheSleuth declares, unless a character is named in --drop (hexahue's
            // empty space): dCode publishes no glyph for it, so it is dropped on purpose
            // and recorded — anything unnamed stays a count-check failure.
            const byKey = new Map();
            for (const g of dcode.glyphs) if (g.ok) byKey.set(String(g.key).toLowerCase(), g);
            const uncovered = glyphs.filter(g => !byKey.has(String(g.key).toLowerCase())).map(g => g.key);
            artDropped = uncovered.filter(k => dropSet.has(k));
            artGap = uncovered.filter(k => !dropSet.has(k));
            console.log(`  art source             : dCode (${glyphs.length - uncovered.length}/${glyphs.length} declared characters covered${artDropped.length ? ", dropped " + artDropped.map(k => JSON.stringify(k)).join(" ") : ""})`);
            for (const c of dropSet) if (!uncovered.includes(c)) console.warn(`  ! --drop ${JSON.stringify(c)} — dCode has art for it, not dropped`);
            if (artGap.length) console.log(`  dCode art missing keys : ${artGap.map(k => JSON.stringify(k)).join(", ")} (name them in --drop to drop on purpose)`);
        }
    }

    // --dcode-extras: dCode's own table may publish symbols CacheSleuth does not declare
    // (Futurama's punctuation). They are real tiles of the chosen art, so they ship with
    // their own key; install.mjs draws them from dCode by key like every other glyph.
    const extraGlyphs = [];
    if ((dcodeExtras || cases) && dcode && dcode.ok) {
        // --cases compares exactly: a key is a character, and `c` is not `C` when both
        // are shipped as different art. Otherwise case is folded, so dCode's uppercase
        // set is recognised as the same alphabet as the descriptor's lowercase keys.
        const norm = key => (cases ? String(key) : String(key).toLowerCase());
        const covered = new Set(glyphs.map(g => norm(g.key)));
        for (const g of dcode.glyphs) {
            if (!g.ok) continue;
            const key = String(g.key);
            if (covered.has(norm(key))) continue;
            covered.add(norm(key));
            extraGlyphs.push({key, label: key});
        }
        console.log(`  dCode extras shipped    : ${extraGlyphs.length}${extraGlyphs.length ? " -> " + extraGlyphs.map(g => JSON.stringify(g.key)).join(", ") : ""}`);
    }

    const counts = {
        declared: glyphs.length + extraGlyphs.length,
        uniqueFiles: new Set(results.filter(r => r.ok).map(r => r.file)).size,
        manifestFiles: declared.length,
        downloaded: downloaded.length + extraGlyphs.length,
        failed: failed.length,
        unmapped: unmapped.length,
        extras: extraGlyphs.length
    };
    const check = counts.declared === counts.downloaded && counts.failed === 0 && absent.length === 0
        && (artFrom !== "dcode" || (dcode && dcode.ok && artGap.length === 0))
        ? "PASS" : "FAIL";

    const data = {
        slug,
        name: desc.name,
        artFrom,
        dropped: artDropped,
        same,
        ...(cases ? {cases: true} : {}),
        descriptor: {
            letters: desc.letters, numbers: desc.numbers,
            otherchars: desc.otherchars, othernames: desc.othernames,
            digraphs: desc.digraphs,
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
        glyphs: [
            ...results.map((r, i) => ({index: i + 1, key: r.key, label: r.label, file: r.ok ? `glyphs/${r.file}` : null, bytes: r.bytes})),
            ...extraGlyphs.map((g, i) => ({index: results.length + i + 1, key: g.key, label: g.label, file: null}))
        ],
        failed: failed.map(r => ({key: r.key, file: r.file, why: r.why})),
        unmapped,
        dcode: dcode ? {page: dcode.page, count: dcode.count, variantNames: dcode.variantNames, glyphs: dcode.glyphs} : null,
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
