// Symbol-cipher harness.
//
//   node dev/symbols/check.mjs
//       Validate every registered cipher and the catalogue's ready rows.
//
//   node dev/symbols/check.mjs --sheet pigpen,braille
//       Write /tmp/cf-sheet.svg and /tmp/cf-sheet.png for visual inspection.
//
// Reference recipe for new ciphers (used by the batch prompts):
//   - Commons API:
//     curl -sS 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=<query>&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=1200'
//     Download a thumburl to /tmp and inspect it with the file reader. Redraw, never trace.
//   - Noto fonts (SIL OFL):
//     https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/<Family>/<Family>-Regular.ttf
//   - Art: 100x100 viewBox, paths/g/rect/circle/ellipse/line/polyline/polygon only,
//     no <text>, <image>, <script> or external href, <=400 bytes/glyph target,
//     and a `credit` naming the published basis.

import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {allCiphers, cipherBySlug, symbolId, spriteStats} from "./index.mjs";

const catalogue = JSON.parse(fs.readFileSync(new URL("./catalogue.json", import.meta.url), "utf8"));
const errors = [];
const warnings = [];
const ALLOWED = new Set(["g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "use", "defs", "title"]);
const encoder = new TextEncoder();

const slugs = new Set();
for (const cipher of allCiphers()) {
    if (slugs.has(cipher.slug)) errors.push(`duplicate cipher slug: ${cipher.slug}`);
    slugs.add(cipher.slug);
    if (!Array.isArray(cipher.glyphs) || !cipher.glyphs.length) {
        errors.push(`${cipher.slug}: no glyphs`);
        continue;
    }
    const seen = new Set();
    cipher.glyphs.forEach((glyph, i) => {
        if (glyph.index !== i + 1) errors.push(`${cipher.slug}: glyph ${i + 1} has index ${glyph.index}`);
        if (seen.has(glyph.index)) errors.push(`${cipher.slug}: duplicate index ${glyph.index}`);
        seen.add(glyph.index);
        if (typeof glyph.label !== "string" || !glyph.label) errors.push(`${cipher.slug}#${glyph.index}: missing label`);
        if (typeof glyph.key !== "string" || !glyph.key) warnings.push(`${cipher.slug}#${glyph.index}: empty key`);
        if (typeof glyph.svg !== "string") {
            errors.push(`${cipher.slug}#${glyph.index}: missing svg`);
            return;
        }
        if (/<(text|image|script)\b/i.test(glyph.svg) || /href\s*=\s*["']https?:/i.test(glyph.svg)) {
            errors.push(`${cipher.slug}#${glyph.index}: forbidden markup`);
        }
        for (const match of glyph.svg.matchAll(/<([a-zA-Z][\w:-]*)/g)) {
            if (!ALLOWED.has(match[1])) errors.push(`${cipher.slug}#${glyph.index}: tag <${match[1]}>`);
        }
        const bytes = encoder.encode(`<symbol id="${symbolId(cipher.slug, glyph.index)}" viewBox="0 0 100 100">${glyph.svg}</symbol>`).length;
        if (bytes > 1000) errors.push(`${cipher.slug}#${glyph.index}: ${bytes} bytes (>1000)`);
        else if (bytes > 400) warnings.push(`${cipher.slug}#${glyph.index}: ${bytes} bytes (>400)`);
    });
}

const bySlug = new Map(catalogue.map(row => [row.slug, row]));
for (const row of catalogue.filter(row => row.status === "ready")) {
    if (!cipherBySlug(row.slug)) errors.push(`catalogue ready row not registered: ${row.slug}`);
}
for (const cipher of allCiphers()) {
    const row = bySlug.get(cipher.slug);
    if (!row) errors.push(`registered cipher missing from catalogue: ${cipher.slug}`);
    else if (row.status !== "ready") errors.push(`registered cipher not marked ready: ${cipher.slug}`);
}

const stats = spriteStats();
console.log(`sprite: ${stats.symbols} symbols, ${stats.bytes} bytes`);
for (const [slug, s] of Object.entries(stats.perCipher)) {
    const perGlyph = s.bytes / Math.max(s.symbols, 1);
    const flag = perGlyph > 350 ? " — over the 350 B/glyph budget" : "";
    console.log(`  ${slug}: ${s.symbols} glyphs, ${s.bytes} bytes (${perGlyph.toFixed(0)} B/glyph)${flag}`);
}
const counts = (key) => catalogue.reduce((m, row) => (m[row[key]] = (m[row[key]] || 0) + 1, m), {});
console.log("catalogue status", counts("status"));
console.log("catalogue class ", counts("class"));

for (const warning of warnings) console.log(`warn: ${warning}`);
for (const error of errors) console.log(`FAIL: ${error}`);

const sheetIndex = process.argv.indexOf("--sheet");
if (sheetIndex !== -1) {
    const wanted = (process.argv[sheetIndex + 1] || "").split(",").map(s => s.trim()).filter(Boolean);
    const picked = wanted.map(slug => cipherBySlug(slug)).filter(Boolean);
    if (!picked.length) {
        errors.push("--sheet needs at least one registered slug");
    } else {
        const cols = 9;
        const cell = 96;
        const labelHeight = 18;
        const pad = 8;
        const glyphs = picked.flatMap(cipher => cipher.glyphs.map(glyph => ({cipher, glyph})));
        const height = Math.ceil(glyphs.length / cols) * (cell + labelHeight) + pad * 2;
        const escape = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const defs = glyphs.map(({cipher, glyph}) =>
            `<symbol id="${symbolId(cipher.slug, glyph.index)}" viewBox="0 0 100 100">${glyph.svg}</symbol>`
        ).join("");
        const body = glyphs.map(({cipher, glyph}, i) => {
            const x = pad + (i % cols) * cell;
            const y = pad + Math.floor(i / cols) * (cell + labelHeight);
            return `<use href="#${symbolId(cipher.slug, glyph.index)}" x="${x}" y="${y}" width="${cell - 12}" height="${cell - 12}"/>` +
                `<text x="${x + (cell - 12) / 2}" y="${y + cell - 2}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#333">${escape(glyph.label)}</text>`;
        }).join("");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell + pad * 2}" height="${height}"><rect width="100%" height="100%" fill="#fff"/><defs>${defs}</defs>${body}</svg>`;
        fs.writeFileSync("/tmp/cf-sheet.svg", svg);
        execFileSync("rsvg-convert", ["-o", "/tmp/cf-sheet.png", "/tmp/cf-sheet.svg"]);
        console.log("sheet: /tmp/cf-sheet.png");
    }
}

if (errors.length) {
    console.error(`${errors.length} error(s)`);
    process.exit(1);
}
console.log(`ok: ${allCiphers().length} ciphers, ${stats.symbols} glyphs, ${warnings.length} warning(s)`);
