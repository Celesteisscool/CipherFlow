#!/usr/bin/env node
/* Contact sheet generator — authoring-time only, never part of dev/build.mjs.
 *
 *   node dev/symbols/sheet.mjs <slug>
 *
 * Reads /tmp/symstage/<slug>/cipher.json plus the downloaded PNGs and writes a
 * self-contained reports/sheets/<slug>.html: the source's own table beside the
 * grid we will ship, plus the dCode art where it exists, so a reviewer can see
 * at a glance whether every glyph sits under the right letter.
 *
 * Written as HTML rather than PNG on purpose: this repo has no image library and
 * no browser to screenshot with, and an HTML sheet is zoomable and text-searchable.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STAGE_ROOT = "/tmp/symstage";
const OUT_DIR = path.join(ROOT, "reports", "sheets");

const slug = process.argv[2];
if (!slug) {
    console.error("usage: node dev/symbols/sheet.mjs <slug>");
    process.exit(2);
}
const stage = path.join(STAGE_ROOT, slug);
const jsonPath = path.join(stage, "cipher.json");
if (!fs.existsSync(jsonPath)) {
    console.error(`no staging data at ${jsonPath} — run dev/symbols/extract.mjs ${slug} first`);
    process.exit(2);
}
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const dataUrl = file => {
    const abs = path.join(stage, file);
    if (!fs.existsSync(abs)) return null;
    return `data:image/png;base64,${fs.readFileSync(abs).toString("base64")}`;
};

function tile(g) {
    const src = g.file ? dataUrl(g.file) : null;
    const label = esc(g.label ?? g.key ?? "?");
    return `<figure class="tile${src ? "" : " missing"}">
        ${src ? `<img src="${src}" alt="glyph ${esc(g.key)}">` : `<span class="ph">?</span>`}
        <figcaption>${label}</figcaption>
        <span class="idx">${g.index ?? ""}</span>
    </figure>`;
}

// What the node will actually draw: CacheSleuth's grid, or dCode's icons matched by
// key where both sources publish the same alphabet and dCode's art was chosen
// (`artFrom: "dcode"`) — the latter ships without a source toggle.
const dcodeByKey = new Map();
for (const g of data.dcode?.glyphs || []) {
    const key = String(g.key ?? "").toLowerCase();
    if (g.file && !dcodeByKey.has(key)) dcodeByKey.set(key, g);
}
// Declared characters dropped because the chosen art has no tile for them (--drop)
// leave the set entirely — the same rule install.mjs ships by.
const dropSet = new Set((data.dropped || []).map(k => String(k)));
const shipped = data.artFrom === "dcode"
    ? data.glyphs.filter(g => !dropSet.has(String(g.key ?? "")))
        .map(g => ({...g, file: dcodeByKey.get(String(g.key ?? "").toLowerCase())?.file || null}))
    : data.glyphs;
const ourGrid = shipped.map(tile).join("\n");
const dcodeGrid = data.dcode ? data.dcode.glyphs.map(g => {
    const vs = g.variants
        ? `<span class="variants">${Object.entries(g.variants).map(([n, v]) => `${esc(n)}: ${esc(v)}`).join(" · ")}</span>`
        : "";
    return `<figure class="tile${g.file ? "" : " missing"}">
        ${g.file && dataUrl(g.file) ? `<img src="${dataUrl(g.file)}" alt="dcode ${esc(g.key)}">` : `<span class="ph">?</span>`}
        <figcaption>${esc(g.key.toUpperCase())}${vs}</figcaption>
    </figure>`;
}).join("\n") : "";

const dcodeNote = data.dcode && data.dcode.variantNames && data.dcode.variantNames.length
    ? `Second implementation: ${data.dcode.count} symbols with a per-variant plaintext mapping (${data.dcode.variantNames.map(esc).join(", ")}) — dCode maps each symbol to its solved meaning in each cryptogram (homophonic, several symbols per letter), a different model from CacheSleuth's one-glyph-per-letter grid. The captions under this grid read \"variant: plaintext\".`
    : data.dcode && !data.dcode.count
    ? `dCode has a page for this cipher (<code>${esc(data.dcode.page)}</code>) but publishes no per-glyph images on it, so there is nothing to switch to and the node stays single-source (D2). This section records the check.`
    : data.same
    ? `dCode publishes the same alphabet for this cipher (${data.dcode ? data.dcode.count : 0} glyphs, checked against CacheSleuth's ${data.counts.declared}). The two were compared and found identical, so CacheSleuth's art stays the shipped set and the node has no source toggle. This section is provenance only.`
    : data.artFrom === "dcode"
    ? `This is the shipped art: dCode's ${data.dcode ? data.dcode.count : 0} glyphs were chosen as the cipher's own set, keyed and captioned by CacheSleuth's characters, so the node has no source toggle.${data.dropped && data.dropped.length ? ` The declared ${data.dropped.map(esc).map(k => `“${k}”`).join(", ")} tile${data.dropped.length > 1 ? "s" : ""} had no dCode art and was dropped at authoring time (\`--drop\`): dCode publishes no glyph for ${data.dropped.length > 1 ? "them" : "it"}, so ${data.dropped.length > 1 ? "they" : "it"} would draw empty anyway.` : ""} Section 2 draws these same files; this section is provenance only.`
    : `Second implementation: ${data.dcode ? data.dcode.count : 0} glyphs vs CacheSleuth's ${data.counts.declared}. Where the two sets differ (count, keys or art), the node header shows the CacheSleuth/dCode toggle (D2).`;

const tableImg = data.source.cachesleuth.tableImage ? dataUrl(data.source.cachesleuth.tableImage) : null;
const pass = data.check === "PASS";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Contact sheet — ${esc(data.name)} (${esc(data.slug)})</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.45 system-ui, sans-serif; margin: 0; padding: 22px; background: #14161a; color: #e7e9ee; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 26px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #2b2f38; }
  .meta { color: #9aa3b2; font-size: 13px; }
  .verdict { display: inline-block; margin-top: 10px; padding: 4px 10px; border-radius: 6px;
             font-weight: 600; background: ${pass ? "#1d4d2b" : "#5a1f1f"}; color: ${pass ? "#9ff0b6" : "#ffc9c9"}; }
  .counts { display: flex; flex-wrap: wrap; gap: 14px; margin: 14px 0 0; }
  .counts div { background: #1b1e24; border: 1px solid #2b2f38; border-radius: 6px; padding: 8px 12px; }
  .counts b { display: block; font-size: 18px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; }
  .tile { margin: 0; position: relative; background: #fff; border-radius: 6px; padding: 8px 4px 5px;
          text-align: center; color: #111; }
  .tile img { width: 44px; height: 44px; object-fit: contain; image-rendering: auto; }
  .tile figcaption { font-size: 12px; font-weight: 700; letter-spacing: .04em; margin-top: 4px; }
  .tile .variants { display: block; font-size: 10px; font-weight: 500; letter-spacing: 0; color: #555; margin-top: 2px; }
  .tile .idx { position: absolute; top: 2px; left: 4px; font-size: 9px; color: #999; }
  .tile.missing { background: #402020; color: #ffd7d7; outline: 2px dashed #d33; }
  .tile .ph { font-size: 30px; line-height: 44px; }
  .split { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
  .col { flex: 1 1 340px; min-width: 300px; }
  img.table { max-width: 100%; border-radius: 6px; background: #fff; padding: 6px; }
  .note { background: #1b1e24; border: 1px solid #2b2f38; border-radius: 6px; padding: 10px 12px; margin-top: 10px; }
  code { background: #23262d; padding: 1px 5px; border-radius: 4px; }
  a { color: #7fb3ff; }
</style>
</head>
<body>
<h1>${esc(data.name)} — contact sheet</h1>
<div class="meta">slug <code>${esc(data.slug)}</code> · generated by <code>dev/symbols/sheet.mjs</code> · ${new Date().toISOString().slice(0, 16).replace("T", " ")}</div>
<div class="verdict">${pass ? "COUNT CHECK PASS" : "COUNT CHECK FAIL"} — ${data.counts.downloaded}/${data.counts.declared} declared characters downloaded</div>

<div class="counts">
  <div><b>${data.counts.declared}</b>declared by descriptor</div>
  <div><b>${data.counts.manifestFiles}</b>files in source manifest</div>
  <div><b>${data.counts.downloaded}</b>downloaded OK</div>
  <div><b>${data.counts.failed}</b>failed</div>
  <div><b>${data.counts.unmapped}</b>unmapped (legends)</div>
  <div><b>${data.dcode ? data.dcode.count : "—"}</b>dCode glyphs</div>
  ${data.dropped && data.dropped.length ? `<div><b>${data.dropped.length}</b>dropped (no dCode art)</div>` : ""}
</div>

<div class="split">
  <section class="col">
    <h2>1 · The source's own table (CacheSleuth)</h2>
    ${tableImg ? `<img class="table" src="${tableImg}" alt="source table">`
              : `<div class="note">This cipher publishes no legend/table image in the manifest; compare against <a href="${esc(data.source.cachesleuth.page)}">the live table</a> instead.</div>`}
    <div class="meta" style="margin-top:8px">${esc(data.source.cachesleuth.images)}${data.unmapped.length ? " · unmapped: " + data.unmapped.map(esc).join(", ") : ""}</div>
  </section>

  <section class="col">
    <h2>2 · Ours — ${data.artFrom === "dcode" ? "dCode art (chosen), our letter mapping" : "CacheSleuth art, our letter mapping"}</h2>
    <div class="grid">
${ourGrid}
    </div>
    <div class="meta" style="margin-top:8px">what the node will draw: glyph above, letter beneath, index in the corner${data.artFrom === "dcode" ? " · dCode's icons, CacheSleuth's characters, no source toggle" : ""}${data.dropped && data.dropped.length ? ` · dropped ${data.dropped.map(k => JSON.stringify(k)).join(", ")} — no dCode art for it` : ""}</div>
  </section>
</div>

${data.dcode ? `<section>
  <h2>3 · dCode's own art for the same cipher (${data.dcode.count} glyphs, <code>${esc(data.dcode.page)}</code>)</h2>
  <div class="grid">
${dcodeGrid}
  </div>
  <div class="note">${dcodeNote}</div>
</section>` : `<section><h2>3 · dCode</h2><div class="note">Not extracted for this cipher — single source.</div></section>`}

${data.failed.length ? `<section><h2>Failures</h2><div class="note">${data.failed.map(f => `${esc(f.key)} (${esc(f.file)}): ${esc(f.why)}`).join("<br>")}</div></section>` : ""}
</body>
</html>
`;

fs.mkdirSync(OUT_DIR, {recursive: true});
const out = path.join(OUT_DIR, `${slug}.html`);
fs.writeFileSync(out, html);
console.log(`wrote ${out}`);
console.log(`  tiles: ${data.glyphs.length} ours, ${data.dcode ? data.dcode.count : 0} dCode`);
console.log(`  table image: ${tableImg ? "yes" : "no"}`);
console.log(`  size: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
