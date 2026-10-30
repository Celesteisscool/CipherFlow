// Symbol-cipher registry and sprite emitter.
//
// Every cipher module exports a `cipher` object with the shape described in
// reports/mission-2026-10-30-symbol-ciphers.md §5. `renderSprite` turns the
// registered ciphers into one hidden <svg> of <symbol> elements; the ship step
// inlines it into index.html so tiles can reference `#g-<slug>-<index>` with a
// plain <use> and no runtime fetch.

import fs from "node:fs";
import {cipher as pigpen} from "./pigpen.mjs";
import {cipher as braille} from "./braille.mjs";
import {cipher as standardGalactic} from "./standard-galactic.mjs";
import {cipher as ogham} from "./ogham.mjs";
import {cipher as elderFuthark} from "./elder-futhark.mjs";
import {cipher as flagSemaphore} from "./flag-semaphore.mjs";
import {cipher as sevenSegment} from "./seven-segment.mjs";
import {cipher as mayanNumerals} from "./mayan-numerals.mjs";
import {cipher as youngerFuthark} from "./younger-futhark.mjs";
import {cipher as babylonianNumerals} from "./babylonian-numerals.mjs";
import {cipher as tallyMarks} from "./tally-marks.mjs";
import {cipher as dancingMen} from "./dancing-men.mjs";
import {cipher as templars} from "./templars.mjs";
import {cipher as theban} from "./theban.mjs";

const REGISTRY = [pigpen, braille, standardGalactic, ogham, elderFuthark, flagSemaphore, sevenSegment, mayanNumerals, youngerFuthark, babylonianNumerals, tallyMarks, dancingMen, templars, theban];

const encoder = new TextEncoder();

export function allCiphers() {
    return REGISTRY.slice();
}

export function cipherBySlug(slug) {
    return REGISTRY.find(c => c.slug === slug) || null;
}

export function symbolId(slug, index) {
    return `g-${slug}-${index}`;
}

function symbolMarkup(cipher, glyph) {
    return `<symbol id="${symbolId(cipher.slug, glyph.index)}" viewBox="0 0 100 100">${glyph.svg}</symbol>`;
}

export function renderSprite() {
    const parts = [];
    for (const c of REGISTRY) {
        for (const g of c.glyphs) parts.push(symbolMarkup(c, g));
    }
    return `<svg id="glyphSprite" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">${parts.join("")}</svg>`;
}

// The rows the left panel lists. A catalogue row is only "ready" when its module is
// registered, so a missing module can never advertise a cipher the app cannot draw.
// The panel previews five glyphs per row. Prefer letters (and digraphs) so the row
// reads as an alphabet; then fill with any non-space, non-punctuation glyph. Only a
// cipher with no letter-like keys at all falls back to its first five entries.
function sampleGlyphs(cipher) {
    const picked = cipher.glyphs
        .filter(glyph => /^[A-Za-z]{1,3}$/.test(String(glyph.key ?? "")))
        .slice(0, 5);
    if (picked.length < 5) {
        const used = new Set(picked);
        const fillers = cipher.glyphs.filter(glyph => {
            if (used.has(glyph)) return false;
            const key = String(glyph.key ?? "");
            return key.trim() && !/^[\s\p{P}\p{S}]+$/u.test(key);
        });
        picked.push(...fillers.slice(0, 5 - picked.length));
    }
    return picked.length ? picked.slice(0, 5) : cipher.glyphs.slice(0, 5);
}

export function panelCatalogue() {
    const rows = JSON.parse(fs.readFileSync(new URL("./catalogue.json", import.meta.url), "utf8"));
    return rows.map(row => {
        const cipher = cipherBySlug(row.slug);
        const ready = Boolean(cipher) && row.status === "ready";
        return {
            slug: row.slug,
            name: row.name,
            source: row.source,
            tags: row.tags || [],
            status: row.status,
            klass: row.class || "",
            note: row.note || "",
            aliasOf: row.aliasOf || "",
            ready,
            caseSensitive: ready ? Boolean(cipher.caseSensitive) : false,
            direction: ready ? (cipher.direction || "ltr") : "ltr",
            variants: row.variants || 1,
            glyphCount: ready ? cipher.glyphs.length : 0,
            samples: ready
                ? sampleGlyphs(cipher).map(g => ({id: symbolId(cipher.slug, g.index), label: g.label}))
                : [],
            glyphs: ready
                ? cipher.glyphs.map(g => ({index: g.index, key: g.key, label: g.label}))
                : []
        };
    });
}

export function spriteStats() {
    let symbols = 0;
    let bytes = 0;
    const perCipher = {};
    for (const c of REGISTRY) {
        let cipherBytes = 0;
        for (const g of c.glyphs) {
            cipherBytes += encoder.encode(symbolMarkup(c, g)).length;
            symbols++;
        }
        bytes += cipherBytes;
        perCipher[c.slug] = {symbols: c.glyphs.length, bytes: cipherBytes};
    }
    return {symbols, bytes, perCipher};
}
