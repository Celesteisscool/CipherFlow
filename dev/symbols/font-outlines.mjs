// Dev-only font-outline generator for Unicode-script ciphers.
//
//   NODE_PATH=/tmp/cf-fonts/node_modules node dev/symbols/font-outlines.mjs \
//     --font /tmp/NotoSansAdlam-Regular.ttf \
//     --name "Adlam" \
//     --map '{"A":"0x1E900","B":"0x1E901"}' \
//     [--slug adlam] [--credit "Noto Sans Adlam (SIL OFL 1.1)"] [--out dev/symbols/adlam.mjs]
//
// The font is read from disk or fetched from an http(s) URL. opentype.js is a dev
// dependency installed outside the project (see NODE_PATH above); no font binary and
// no runtime dependency is committed. Glyphs are baked as 100x100 SVG paths.
//
// The generated module is a starting point: check the Latin key map against the
// published transliteration, then register it in dev/symbols/index.mjs.

import fs from "node:fs";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");

function arg(name, fallback = "") {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? fallback : (process.argv[index + 1] || fallback);
}

const fontSource = arg("font");
const name = arg("name", "Unicode script");
const mapRaw = arg("map");
const slug = arg("slug", name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
const credit = arg("credit", `Noto Sans ${name} (SIL OFL 1.1), outlines baked at build time`);
const out = arg("out");

if (!fontSource || !mapRaw) {
    console.error("usage: node dev/symbols/font-outlines.mjs --font <path-or-url> --name <name> --map '{\"A\":\"0x1E900\"}' [--out file]");
    process.exit(1);
}

const mapping = JSON.parse(mapRaw);
const buffer = /^https?:/i.test(fontSource)
    ? Buffer.from(await (await fetch(fontSource)).arrayBuffer())
    : fs.readFileSync(fontSource);
const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

const glyphs = [];
for (const [key, value] of Object.entries(mapping)) {
    const codepoint = typeof value === "number" ? value : Number.parseInt(String(value), 0);
    const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
    if (!glyph || glyph.index === 0) {
        console.error(`missing glyph for ${key} U+${codepoint.toString(16).toUpperCase()}`);
        continue;
    }
    const path = glyph.getPath(0, 0, 100);
    const box = path.getBoundingBox();
    const width = Math.max(box.x2 - box.x1, 1);
    const height = Math.max(box.y2 - box.y1, 1);
    const scale = 90 / Math.max(width, height);
    const tx = (100 - width * scale) / 2 - box.x1 * scale;
    const ty = (100 - height * scale) / 2 - box.y1 * scale;
    const svg = `<g fill="currentColor" transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${scale.toFixed(4)})"><path d="${path.toPathData(1)}"/></g>`;
    glyphs.push({
        index: glyphs.length + 1,
        key,
        label: key,
        svg
    });
}

if (!glyphs.length) {
    console.error("no glyphs mapped");
    process.exit(1);
}

const lines = [];
lines.push(`// ${name} — SVG outlines baked from a Noto font.`);
lines.push(`//`);
lines.push(`// Basis: ${credit}. The font is not shipped; only the outlines below are.`);
lines.push(`// Check each Latin key against the published transliteration before registering.`);
lines.push(``);
lines.push(`const glyphs = [`);
for (const glyph of glyphs) {
    lines.push(`    {index: ${glyph.index}, key: ${JSON.stringify(glyph.key)}, label: ${JSON.stringify(glyph.label)}, svg: ${JSON.stringify(glyph.svg)}},`);
}
lines.push(`];`);
lines.push(``);
lines.push(`export const cipher = {`);
lines.push(`    slug: ${JSON.stringify(slug)},`);
lines.push(`    name: ${JSON.stringify(name)},`);
lines.push(`    source: "both",`);
lines.push(`    tags: [],`);
lines.push(`    direction: "ltr",`);
lines.push(`    caseSensitive: false,`);
lines.push(`    credit: ${JSON.stringify(credit)},`);
lines.push(`    glyphs`);
lines.push(`};`);
const moduleText = lines.join("\n") + "\n";

if (out) {
    fs.writeFileSync(out, moduleText);
    console.log(`wrote ${out} (${glyphs.length} glyphs)`);
} else {
    console.log(moduleText);
}
