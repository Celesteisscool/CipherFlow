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
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE_ROOT = "/tmp/symstage";
const ART_DIR = path.join(HERE, "art");
const DATA_DIR = path.join(HERE, "data");
const CATALOGUE = path.join(HERE, "catalogue.json");

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
        return true;
    };

    // artFrom "dcode": the two sources publish the same alphabet and dCode's icons were
    // chosen, so the shipped glyph points at dCode's file. Keys/labels stay CacheSleuth's,
    // only the drawing changes, and the duplicate set is not shipped.
    const artFrom = staged.artFrom === "dcode" ? "dcode" : "cachesleuth";
    const dcodeByKey = new Map();
    if (staged.dcode) {
        for (const g of staged.dcode.glyphs) {
            const key = String(g.key ?? "").toLowerCase();
            if (g.file && !dcodeByKey.has(key)) dcodeByKey.set(key, g);
        }
    }

    const dropSet = new Set((staged.dropped || []).map(k => String(k)));
    let artFiles = 0;
    const glyphs = [];
    for (const g of staged.glyphs) {
        const src = artFrom === "dcode" ? dcodeByKey.get(String(g.key ?? "").toLowerCase()) : g;
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
        // Only written where it is true, so re-installing does not churn the shipped ciphers.
        ...(staged.same ? {sameAsCachesleuth: true} : {}),
        counts: staged.counts,
        glyphs,
        unmapped: staged.unmapped,
        failed: staged.failed,
        dcode,
        check: staged.check
    };
    fs.writeFileSync(path.join(DATA_DIR, `${slug}.json`), JSON.stringify(installed, null, 2));

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
    console.log(`${slug.padEnd(14)} ${String(glyphs.length).padStart(3)} glyphs  ${String(artFiles).padStart(3)} art  dcode ${String(dcode ? dcode.count : 0).padStart(2)}  ${staged.check}${(staged.dropped || []).length ? `  dropped ${JSON.stringify(staged.dropped)}` : ""}`);
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
