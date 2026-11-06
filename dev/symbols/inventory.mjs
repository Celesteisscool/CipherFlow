#!/usr/bin/env node
/* Symbol cipher inventory — regenerates reports/symbol-ciphers-inventory.md.
 *
 *   node dev/symbols/inventory.mjs [--refresh]
 *
 * Both lists come from the sources themselves, never from hand-typed names or from
 * scraping a rendered page:
 *
 *   CacheSleuth  assets/vendor/codes/codes.js — the descriptor array behind
 *                https://www.cachesleuth.com/codes/, and the same file extract.mjs
 *                stages art from, so a url here is exactly a staggable slug
 *   dCode        https://www.dcode.fr/symbols-ciphers — the site's own index of
 *                symbol-cipher tools, read as href + link text
 *
 * A cipher is ticked when dev/symbols/catalogue.json ships it. dCode pages are split
 * three ways: bound by a shipped cipher (a data file records that page), sharing a name
 * with a shipped cipher (a second-source candidate), and having no catalogue entry at
 * all (no CacheSleuth descriptor, so the batch pipeline cannot stage it).
 *
 * Output is deterministic — same catalogue, same bytes — so the checklist diffs cleanly
 * between batches and a stale file shows up in review as a moved count, not as churn.
 *
 * Exit 0 on a written file; 1 when a source is unreachable and uncached, when a source
 * parses to nothing (the markup moved), or when the section counts stop adding up.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CATALOGUE = path.join(ROOT, "dev", "symbols", "catalogue.json");
const DATA_DIR = path.join(ROOT, "dev", "symbols", "data");
const OUT = path.join(ROOT, "reports", "symbol-ciphers-inventory.md");

const CS_URL = "https://www.cachesleuth.com/assets/vendor/codes/codes.js";
const DC_URL = "https://www.dcode.fr/symbols-ciphers";
const CS_CACHE = "/tmp/cs-codes.js";
const DC_CACHE = "/tmp/dcode-symbols.json";
const UA = {"user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"};

function die(msg) {
    console.error(`inventory: ${msg}`);
    process.exit(1);
}

async function fetchText(url) {
    const r = await fetch(url, {headers: UA});
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return await r.text();
}

/* CacheSleuth's list is `var codes=[{name:"…",url:"…",…},…]`. Entries are scanned one
 * `{name:"` at a time; a url can repeat under two names (pigpen is both "Freemason
 * Version 1" and "Pig Pen Version 1"), so the first name for a url wins. */
function parseCacheSleuth(src) {
    const out = new Map();
    for (let i = src.indexOf('{name:"'); i !== -1; i = src.indexOf('{name:"', i + 1)) {
        const m = src.slice(i, i + 400).match(/^\{name:"((?:[^"\\]|\\.)*)",url:"([^"]*)"/);
        if (!m) continue;
        let name;
        try { name = JSON.parse(`"${m[1]}"`); } catch { continue; }
        if (name && m[2] && !out.has(m[2])) out.set(m[2], name);
    }
    return out;
}

/* dCode's index is plain markup: one anchor per tool, the link text being the cipher's
 * own name. Keys are skipped so a tracker or a nav link cannot become a "cipher". */
function parseDcode(html) {
    const out = [];
    const seen = new Set();
    for (const [, href, inner] of html.matchAll(/<a[^>]+href="(\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        const title = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (!title || title.length < 2 || href.startsWith("/images") || seen.has(href)) continue;
        seen.add(href);
        out.push({path: href, title});
    }
    return out;
}

async function loadCs(refresh) {
    if (!refresh && fs.existsSync(CS_CACHE)) return fs.readFileSync(CS_CACHE, "utf8");
    const src = await fetchText(CS_URL);
    fs.writeFileSync(CS_CACHE, src);
    return src;
}

async function loadDc(refresh) {
    if (!refresh && fs.existsSync(DC_CACHE)) {
        const cached = JSON.parse(fs.readFileSync(DC_CACHE, "utf8"));
        if (Array.isArray(cached) && cached.length) return cached;
    }
    const entries = parseDcode(await fetchText(DC_URL));
    fs.writeFileSync(DC_CACHE, JSON.stringify(entries));
    return entries;
}

// Case- and accent-insensitive comparison, locale-free so two machines sort identically.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byName = (a, b) => cmp(a.toLowerCase(), b.toLowerCase());
const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7f]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

async function main() {
    const refresh = process.argv.includes("--refresh");
    if (!fs.existsSync(CATALOGUE)) die(`no catalogue at ${path.relative(ROOT, CATALOGUE)}`);
    const cat = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));
    if (!Array.isArray(cat) || !cat.length) die("catalogue is empty");

    const cs = parseCacheSleuth(await loadCs(refresh));
    if (!cs.size) die("codes.js parsed to no tables — the source markup changed");
    const dc = await loadDc(refresh);
    if (!dc.length) die("dCode index parsed to no pages — the source markup changed");

    const shipped = new Map(cat.map(r => [r.slug, r]));

    // Which dCode page each shipped cipher is actually built from, per its data file.
    const bound = new Map();
    for (const row of cat) {
        const file = path.join(DATA_DIR, `${row.slug}.json`);
        if (!fs.existsSync(file)) continue;
        let data;
        try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch { continue; }
        // A dCode-only cipher keeps the page on `source.dcode`; ciphers with a second
        // set keep it on `dcode`. Both mean the page is bound to this shipped row.
        const page = data.dcode?.page
            || data.source?.dcode?.page?.replace(/^https:\/\/www\.dcode\.fr/, "");
        if (page) bound.set(page, row.slug);
    }

    const csAll = [...cs].map(([url, name]) => ({url, name, row: shipped.get(url) || null}))
        .sort((a, b) => byName(a.name, b.name) || cmp(a.url, b.url));
    const csDone = csAll.filter(c => c.row);
    const csLeft = csAll.filter(c => !c.row);

    const dcBound = dc.filter(e => bound.has(e.path));
    const dcTwin = [];
    const dcFresh = [];
    for (const e of dc) {
        if (bound.has(e.path)) continue;
        const t = norm(e.title);
        let owner = null;
        for (const [slug, row] of shipped) {
            const n = norm(row.name);
            if (n && (t === n || t.startsWith(n + " ") || n.startsWith(t + " "))) { owner = slug; break; }
        }
        (owner ? dcTwin : dcFresh).push({...e, owner});
    }
    dcTwin.sort((a, b) => byName(a.title, b.title));
    dcFresh.sort((a, b) => byName(a.title, b.title));

    // The sections have to partition both sources, or the checklist is lying about progress.
    if (csDone.length + csLeft.length !== csAll.length) die("CacheSleuth sections do not add up");
    if (dcBound.length + dcTwin.length + dcFresh.length !== dc.length) die("dCode sections do not add up");

    const pct = Math.round((csDone.length / csAll.length) * 100);
    const L = [];
    L.push("# Symbol cipher inventory");
    L.push("");
    L.push("Generated from the sources' own lists, not scraped names:");
    L.push("");
    L.push("- **CacheSleuth** — `https://www.cachesleuth.com/assets/vendor/codes/codes.js`");
    L.push("  (the descriptor array behind `https://www.cachesleuth.com/codes/`; the same file");
    L.push("  `dev/symbols/extract.mjs` reads at staging time)");
    L.push("- **dCode** — `https://www.dcode.fr/symbols-ciphers`");
    L.push("");
    L.push("Regenerate with `node dev/symbols/inventory.mjs`; the batch runbook (§5) runs it after every");
    L.push("install. `--refresh` re-fetches both source lists, otherwise the `/tmp` copies are reused.");
    L.push("Do not hand-edit this file — a tick is a fact about `dev/symbols/catalogue.json`, not an edit.");
    L.push("");
    L.push(`**CacheSleuth: ${csDone.length} of ${csAll.length} tables shipped (${pct}%) — ${csLeft.length} left.**`);
    L.push("");
    L.push(`**dCode: ${dc.length} pages — ${dcBound.length} bound by a shipped cipher, ${dcTwin.length} sharing a`);
    L.push(`name with a shipped cipher but not bound, ${dcFresh.length} with no catalogue entry.**`);
    L.push("");
    L.push("A tick means the cipher is in `dev/symbols/catalogue.json` and drawing its own art.");
    L.push("");
    L.push(`## CacheSleuth — shipped (${csDone.length})`);
    L.push("");
    for (const c of csDone) L.push(`- [x] ${c.name} — \`${c.url}\``);
    L.push("");
    L.push(`## CacheSleuth — remaining (${csLeft.length})`);
    L.push("");
    for (const c of csLeft) L.push(`- [ ] ${c.name} — \`${c.url}\``);
    L.push("");
    L.push(`## dCode — bound by a shipped cipher (${dcBound.length})`);
    L.push("");
    for (const e of dcBound.slice().sort((a, b) => byName(a.title, b.title))) {
        L.push(`- [x] ${e.title} — \`${e.path}\` → \`${bound.get(e.path)}\``);
    }
    L.push("");
    L.push(`## dCode — same cipher already shipped, page not bound (${dcTwin.length})`);
    L.push("");
    L.push("Second-source candidates: the art is already in the catalogue, only the dCode page");
    L.push("is unused, so these are toggle/variant work rather than new ciphers.");
    L.push("");
    for (const e of dcTwin) L.push(`- [ ] ${e.title} — \`${e.path}\` → shipped as \`${e.owner}\``);
    L.push("");
    L.push(`## dCode — no catalogue entry (${dcFresh.length})`);
    L.push("");
    L.push("These have no CacheSleuth descriptor, so the current batch pipeline cannot stage");
    L.push("them; they need a different extraction path.");
    L.push("");
    for (const e of dcFresh) L.push(`- [ ] ${e.title} — \`${e.path}\``);
    L.push("");

    const text = L.join("\n");
    const ticked = (text.match(/^- \[x\]/gm) || []).length;
    const open = (text.match(/^- \[ \]/gm) || []).length;
    if (ticked !== csDone.length + dcBound.length) die("tick count does not match the sections");
    if (open !== csLeft.length + dcTwin.length + dcFresh.length) die("open count does not match the sections");

    fs.mkdirSync(path.dirname(OUT), {recursive: true});
    fs.writeFileSync(OUT, text);

    console.log(`CacheSleuth  ${csDone.length}/${csAll.length} shipped (${pct}%), ${csLeft.length} left`);
    console.log(`dCode        ${dc.length} pages: ${dcBound.length} bound, ${dcTwin.length} twin candidates, ${dcFresh.length} uncatalogued`);
    console.log(`wrote ${path.relative(ROOT, OUT)} (${L.length} lines, ${ticked} ticked, ${open} open)`);
}

main().catch(err => die(err.stack || err.message));
