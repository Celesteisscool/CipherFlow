# Mission — symbol ciphers in CipherFlow

**Date:** 2026-10-30
**Status:** ready to execute, not started
**Scope:** one new subsystem (catalogue + left panel + node grid + preview strip)
**Written from:** a design conversation that is *not* part of this thread's history. Everything
needed to execute is in this document; do not go looking for the transcript.

---

## 0. Read this before touching anything

1. Read `AGENTS.md` at the repo root. Its rules override anything here that looks like extra
   scope: one task at a time, no unrequested artifacts, minimal verification, never hand-edit
   `index.html`.
2. `index.html` at the root is the **shipped, generated** app (~14 MB, whole engine inlined,
   served by GitHub Pages). All work happens in `dev/`, then `node dev/build.mjs` regenerates
   `index.html`. A behaviour change is committed as **source + rebuilt `index.html` together**.
3. There is no test suite. `npm test` is a stub that exits 1. Do not run it, do not fix it.
4. Build inputs that are not committed (`dev/modules/modules/*.js`, `/tmp/chefworker.js`) must
   exist before the first build:
   ```bash
   npm install
   node dev/collect-entry.mjs
   node dev/gen-meta.mjs
   node dev/build.mjs
   ```
5. This file lives in `reports/`, which is untracked. Do not commit it unless asked.

---

## 1. Goal

Give CipherFlow a first-class symbol-cipher workflow:

- a **searchable left panel** listing symbol ciphers from CacheSleuth and dCode, each row
  previewing ~5 symbols, closed by default behind a visible edge hint;
- a **wired node per cipher** whose body is a large, indexed grid of that cipher's glyphs, each
  glyph drawn with its plaintext translation underneath;
- **clicking a glyph appends its letter** to the node's text/output box, so a ciphertext can be
  transcribed by clicking instead of typing, with keyboard input highlighting the matching tiles;
- a **live preview strip at the bottom of the node** that re-renders the transcription as large
  labelled glyph images, for cross-referencing against a physical or pictured ciphertext.

Reference for the tile anatomy (glyph above, translation below): the CacheSleuth omni table,
`https://www.cachesleuth.com/codes/omni?code=conway`.

## 2. Non-goals

- No new engine/CyberChef operations beyond the one symbol-cipher op pair described below.
- No OCR, no photograph import, no auto-solving of ciphertext.
- No cloud sync, no accounts, no build-time network access.
- No new dependencies. Artwork is authored, not imported from a package.
- No changes to the existing right-hand node list, its search, or the run loop's semantics.

## 3. Hard constraints

| Constraint | Consequence |
|---|---|
| The app ships as **one self-contained `index.html`** | Every glyph must be inlined at build time. No external SVG files, no fetches, no spritesheet URLs. |
| `index.html` is generated | Never hand-edit it. Edit `dev/app.js` / `dev/styles.css` / new `dev/symbols/*` and rebuild. |
| Artwork is SVG for **every** cipher (decided) | There is no Unicode fallback path. Ciphers whose glyphs are geometric (pigpen, semaphore, dancing men, zodiac) are first-class, not excluded. |
| Build size matters | Budget: **≤ 2 MB added to `index.html`** before gzip for the full catalogue. P0 measures and reports; if over, simplify paths and share primitives via `<defs>`. |
| Offline | No runtime network. Everything comes from the inlined sprite. |
| One op, many ciphers | 380 ciphers must not become 380 registered operations. See §7. |

---

## 4. Product specification

### 4.1 Left panel — "Symbol ciphers"

**Closed state (default).** A vertical rail flush to the left edge, 28–32 px wide, full height:

- a glyph mark (e.g. a small pigpen-style square) at the top,
- the word "Symbols" written vertically, and a count badge (`380`),
- `aria-expanded="false"`, `title="Symbol ciphers (380)"`, tooltip on hover.

Clicking the rail opens the drawer. The rail stays visible while open is not required; the drawer
takes the same footprint as the right sidebar so the canvas does not jump when it opens and
closes. Prefer a grid column (`#app` currently uses
`grid-template-columns: minmax(0,1fr) var(--sidebar-w)` at `dev/styles.css:169`) over a floating
overlay, but an overlay is acceptable if the canvas reflow looks bad.

**Open state.** 320–348 px panel, matching the visual language of `aside.sidebar`
(`dev/build.mjs:180`): same background, hairline separator, header row with title, count, and a
close button, then a search field, then the scrolling list.

**Rows.** One per cipher:

```
┌──────────────────────────────────────────────┐
│ Pigpen                            cachesleuth │
│ ▣ ▤ ◰ ◱ ◲                          6 variants │
└──────────────────────────────────────────────┘
```

- name, small source chip (`cachesleuth` / `dcode` / `both`),
- **5 sample glyphs** rendered from the inlined sprite at ~22 px, chosen as the first five
  letters of the alphabet where possible (never five punctuation glyphs),
- a secondary line with glyph count and any variant count.

**Search.** Matches name, tags and aliases, case- and accent-insensitive; e.g. `flag`, `semaphore`,
`masonic`, `pig`, `runes`, `star wars`, `pokemon` all find the right rows. Empty state: "No symbol
cipher matches “x”." Search must not re-render the whole list per keystroke — filter existing rows.

**Interaction.**

- Click a row → add that cipher's node at the viewport centre (same placement logic the right
  palette uses via `makeNode`, `dev/app.js:1003`).
- Drag a row → drop at the pointer, reusing the palette's existing drag payload if practical;
  otherwise click-to-add only, but say so in the phase report.
- `Esc` closes the drawer. The open/closed state persists in `localStorage` under
  `cf.symbolsPanelOpen` (`"1"` / `"0"`).
- The rail is keyboard reachable (`button`, `aria-controls`, focus ring), and the search input
  autofocuses when the panel opens.

### 4.2 The node

A symbol cipher node is a normal graph node with a custom body, added by the left panel and
pre-configured with its cipher. Header controls inside the body:

```
Pigpen                     [ Encode | Decode ]   [ # ]
──────────────────────────────────────────────────────
  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
  │ ▣  │ │ ▤  │ │ ◰  │ │ ◱  │ │ ◲  │
  │ A  │ │ B  │ │ C  │ │ D  │ │ E  │
  └────┘ └────┘ └────┘ └────┘ └────┘
                     ... grid wraps ...
──────────────────────────────────────────────────────
 Preview · 12 glyphs                        [Copy PNG]
  ▩   ▩   ▩   ▩   ▩   ▩   ▩   ▩   ▩   ▩   ▩   ▩
  H   E   L   L   O   W   O   R   L   D   !   ?
```

**Grid.** `display:grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap:6px`,
scrolling inside the node body if the glyph count is large. Order is catalogue order (index
ascending), never alphabetical by label — pigpen's variants must stay adjacent.

**Tile anatomy.**

- glyph `<svg viewBox="0 0 100 100" class="glyph-tile-art"><use href="#g-<slug>-<index>"/></svg>`,
  sized ~44–56 px, `currentColor` so it follows the theme,
- translation **underneath**, exactly as the reference: the plaintext letter, uppercase by
  default; multi-character keys (`TH`, `ING`) render at a smaller size so they fit,
- index badge in the top-left corner, small and muted, toggleable with the `#` button in the
  header. Index = 1-based position in the cipher's glyph array, stable across releases.
- `aria-label="index 12, letter L"`, `role="button"`, `tabindex="0"`.

**Empty/irregular entries.** Ciphers with a "space" or punctuation glyph show those tiles too;
label space as `␣` with the word "space" in the title. Homophones (several glyphs for one letter)
are separate tiles sharing a label but not an index.

**Sizing.** The node is user-resizable already (`.node.resized` in `dev/styles.css`). The grid
must reflow at 2–4 columns minimum; the preview strip must remain at the bottom and not shrink
below one row of tiles.

### 4.3 Click and keyboard contract

- **Click a tile** → append that glyph's key to the node's transcription text (`node.text`, the
  textarea at `dev/app.js:1980`, class `control typed-input`). Append, never insert at the caret.
- **Backspace** in the textarea removes the last character as usual. Deleting via the tile grid
  is not required.
- **Typing** in the textarea highlights every tile whose key matches the character just typed
  (case-insensitive). Highlight decays after ~600 ms or when the caret moves; it must not steal
  focus or scroll the grid unexpectedly — scroll the matched tile into view only if it is fully
  outside the viewport.
- **Undo.** Programmatic `value = …` writes destroy the native undo stack. Append via
  `document.execCommand("insertText", false, key)` when the textarea is focused, with a manual
  splice + `input` event fallback. Verify Ctrl/Cmd+Z removes a clicked glyph.
- **Case.** If the cipher is uppercase-only, clicking appends uppercase even when the surrounding
  text is lowercase. Mixed-case ciphers preserve the label's own case.
- Clicks must not initiate node drag or pan. Stop propagation on `pointerdown`.

### 4.4 Preview strip

Pinned to the bottom of the node body, below the grid, separated by a hairline.

- **Source:** the node's transcription text (`node.text`), i.e. the same box clicks write into.
  This is the "retranscribe what's in the output" behaviour: the strip shows that text again as
  large cipher glyphs.
- **Rendering:** one horizontally wrapping row of large tiles (~72–96 px art) each with the label
  underneath. Characters with no glyph in the cipher render as a dashed placeholder box with the
  literal character inside, so a wrong transcription is visible rather than silently dropped.
- **Live:** updates on `input` and after tile clicks, debounced ~80 ms. No button needed to
  refresh.
- **Header line:** `Preview · N glyphs` plus a `Copy PNG` button.
- **Copy PNG:** rasterise the strip at 2× device pixel ratio to a `<canvas>`, labels included,
  background from the current theme, download as
  `cipherflow-<slug>-<yyyymmdd-hhmm>.png`. Serialise each glyph's `<symbol>` contents into a
  standalone SVG string and draw via an `Image` + blob URL — `<use href="#…">` cannot be drawn
  directly to canvas reliably across browsers.
- If the transcription is empty, show the hint "Click a glyph to start transcribing." and disable
  Copy PNG.

---

## 5. Data model

One module per cipher under `dev/symbols/`, plus a registry. Keep the shapes boring and uniform so
later ciphers are data-only additions.

```js
/** @typedef {Object} Glyph
 *  @property {number} index   1-based, unique within the cipher, stable forever
 *  @property {string} key     what it stands for, lowercase unless the cipher is case-sensitive
 *  @property {string} label   shown under the glyph ("A", "TH", "␣", "?")
 *  @property {string} svg     inner markup for a 0 0 100 100 viewBox, no <svg> wrapper
 */

/** @typedef {Object} Cipher
 *  @property {string} slug              "pigpen", "flag-semaphore"
 *  @property {string} name              "Pigpen"
 *  @property {"cachesleuth"|"dcode"|"both"} source
 *  @property {string[]} tags            search aliases: ["masonic","freemason","geometric"]
 *  @property {string} [variantOf]       slug of the parent cipher, for "6 variants" counts
 *  @property {"ltr"|"rtl"|"vertical"} direction   default "ltr"
 *  @property {boolean} caseSensitive    default false
 *  @property {Glyph[]} glyphs
 *  @property {(text: string) => string} [encode]  only when key→glyph is not enough
 *  @property {(text: string) => string} [decode]
 *  @property {string} [credit]          where the alphabet/artwork was derived from
 */
```

Rules:

- `key` is the **plaintext** side (what a click types). Most ciphers are a simple table; keep
  `encode`/`decode` absent for those and let the runtime use the table.
- One glyph may map to many keys only via separate glyph entries (homophones). Do not build an
  array-of-keys field; it complicates indexing and the click contract.
- Preserve the catalogue's own ordering in `glyphs`; `index` is that position.
- Text normalisation lives in the runtime, not in modules: strip accents only if the cipher says
  so, keep spaces where the cipher has a space glyph, otherwise render them as gaps.

## 6. Artwork pipeline

**Authoring.** Each glyph is vector geometry authored in a 100×100 box using only `path`, `line`,
`rect`, `circle` and `polygon` — stroke width and cap style consistent across a cipher. Simple
ciphers should stay under ~300 bytes of markup per glyph.

**Derivation and licensing.** Do not copy CacheSleuth's PNGs or dCode's images. Redraw from the
published alphabet descriptions. Where a glyph set is a known typeface or franchise alphabet
(Wingdings, Unown, Aurebesh, Klingon pIqaD, Standard Galactic), draw an original geometric
rendition and record the basis in the module's `credit` field. If a set cannot be redrawn
confidently, mark it `status: "blocked"` in the catalogue rather than shipping a bad guess.

**Build.** Add a step to `dev/build.mjs` that imports `dev/symbols/index.mjs` and emits one hidden
sprite near the end of `<body>`:

```html
<svg id="glyphSprite" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">
  <symbol id="g-pigpen-1" viewBox="0 0 100 100">…</symbol>
  …
</svg>
```

Tiles and previews reference `#g-<slug>-<index>`. Ids must be namespaced by slug to avoid
collisions between ciphers that reuse shapes. Shared geometry (pigpen frame, semaphore poles,
braille dot grid) goes in `<defs>` once and is referenced by the symbols that need it.

**Size.** P0 records the delta for three ciphers and extrapolates to the full set. If the
extrapolation exceeds 2 MB, reduce coordinate precision, drop redundant attributes, and share
primitives before adding more ciphers.

## 7. Runtime integration

**One op pair, not 380 ops.** Register `Symbol cipher encode` and `Symbol cipher decode` in
`dev/dcode/` following the existing `ops-*.mjs` shape (`{name, host, group, description,
args, run}`) and the registration path used at `dev/dcode/payload.mjs:19` (which imports each ops
module; `dev/build.mjs:82` explains the generation step). The only argument is `cipher` (a slug,
rendered as a searchable select if the arg system allows, otherwise a plain select). The node's
direction toggle switches which op runs.

- Encoding: plaintext `key` → glyph. Since the graph pipeline carries bytes/text, encoding emits
  either (a) the glyph's Unicode stand-in when one exists, or (b) a private-use placeholder that
  the node's own renderer resolves. Prefer (b): store the encoded text as the sequence of
  `\uE000 + index` code points so encode/decode round-trips losslessly without pretending the
  glyphs are real characters. Document this in the op description; downstream text ops will see
  placeholder code points, not letters.
- Decoding: the reverse mapping; unknown code points pass through unchanged.
- The node keeps `symbolCipher` (slug) and `symbolDirection` (`"encode"`/`"decode"`) on the node
  object. Both must survive `serializeGraph` (`dev/app.js:1219`), the autosave path
  (`dev/app.js:1399`), clipboard copy/paste, duplicate, and graph file save/load. Anything
  already-white-listed for node fields is the place to add them — search for an existing
  node-level custom field and follow it.

**Rendering hooks.** The node body is built at `dev/app.js:1693` and refreshed through
`buildPreview` (`:2792`), `updatePreviewEl` (`:2903`) and `refreshNodePreview` (`:3040`). Add a
branch keyed on the node's op/type that returns the grid + preview markup and wires the tile
handlers; do not fork the whole node renderer. `entryKind`/`imageDataUrlFor` (`:2843`, `:2838`)
show how typed output is classified — the glyph grid is a new kind, not an image blob.

**State.** No `innerHTML` rebuild on every keystroke: build the grid once per cipher change, then
toggle a `.is-hit` class for keyboard highlighting, and update only the preview strip's children.

## 8. Catalogue and phasing

Target: the union of `https://www.cachesleuth.com/codes/` (~300+ tables) and
`https://www.dcode.fr/symbols-ciphers` (~150). Ship in waves; each later cipher should require a
module and a registry row, nothing else.

| Phase | Deliverable | Acceptance |
|---|---|---|
| **P0** | `dev/symbols/` registry + 3 reference ciphers (pigpen, braille, standard galactic) + sprite emission in `dev/build.mjs` + measured size delta | `node --check` on every new module; build exits 0; dev server renders the three ciphers' samples; delta reported in the phase summary |
| **P1** | Left panel: rail, drawer, search, rows with 5 samples, click-to-add, persisted open state | rail visible by default; search narrows correctly for `flag`, `pig`, `star wars`; adding a P0 cipher places a node; `Esc` closes |
| **P2** | Node body: grid, tile anatomy, index toggle, click-to-append, keyboard highlight, undo | clicking 5 tiles builds a 5-letter transcription; Backspace removes one; typing `a` highlights the A tile; Ctrl/Cmd+Z undoes the last click |
| **P3** | Preview strip: live render, labels, unknown-char placeholders, Copy PNG | `ABC` shows three labelled glyphs; an unmapped `?` shows a placeholder; the PNG matches the strip and includes labels |
| **P4** | Wave 1: the 15 ciphers in Appendix A, encode/decode op pair, graph persistence | save → reload → node still shows the same cipher, direction and transcription; encode/decode round-trips |
| **P5** | Remaining dCode symbol ciphers, in batches of ~20 | each batch: build 0, one spot-check per 5 ciphers, size within budget |
| **P6** | CacheSleuth exclusives, in batches of ~20 | same as P5; blocked/suspect sets recorded in the catalogue as `status: "blocked"` |

Stop after each phase and report. Do not roll P4 into P3 because "the grid was already open".

## 9. Verification

Scale checks to the phase; this is the ceiling.

```bash
node --check dev/app.js
node --check dev/build.mjs
node --check dev/symbols/pigpen.mjs        # each touched module
node dev/build.mjs                          # must exit 0
node dev/serve.mjs 8788                     # then http://127.0.0.1:8788/index.html
```

Then one targeted behaviour check for the phase (open the panel, click three tiles, read the
preview). Report the commands, their exit status, and what you saw. A passing build is not a
behaviour check. Never claim the Pages site updated — publishing is a separate, user-authorized
push.

## 10. Risks and open questions

1. **Artwork volume.** ~380 ciphers × ~30 glyphs ≈ 11k symbols. Redrawing is the long pole, not
   the code. Mitigation: P0 measures bytes per glyph and forces the budget decision early.
2. **Licensing.** Several alphabets belong to typefaces or franchises. The mission requires
   original renditions and per-cipher `credit`; it does not authorize copying vendor art.
3. **Keyed symbol ciphers** (e.g. variants needing a keyword or grid rotation) are out of scope
   for the 1:1 click model. List them in the catalogue with `status: "keyed"` and skip.
4. **Right-to-left / vertical scripts** (some Ogham presentations, vertical numerals). The data
   model carries `direction`, but wave 1 ships left-to-right only; do not fake it.
5. **Placeholder code points** mean downstream text ops see `U+E000+`. If that proves confusing in
   practice, revisit with a real symbol-aware type rather than silently changing the encoding.
6. **Panel and canvas width.** Adding a left column changes the canvas origin; check that saved
   node positions and "Fit" still look right with the panel open and closed.

---

## Appendix A — wave 1 (15 ciphers)

All have a clean one-to-one letter mapping and no key material.

| # | slug | name | source | notes |
|---|---|---|---|---|
| 1 | `pigpen` | Pigpen | both | geometric frame + dots; variants share shapes |
| 2 | `flag-semaphore` | Flag semaphore | both | two-arm positions; draw poles once in `<defs>` |
| 3 | `braille` | Braille | both | 2×3 dot grid; reuse one dot symbol |
| 4 | `dancing-men` | Dancing Men | both | stick figures, 26 poses |
| 5 | `standard-galactic` | Standard Galactic | both | clean geometric caps |
| 6 | `elder-futhark` | Elder Futhark | both | runes; straight strokes only |
| 7 | `younger-futhark` | Younger Futhark | dcode | 16 runes, some multi-letter keys |
| 8 | `theban` | Theban | both | witches' alphabet |
| 9 | `ogham` | Ogham | both | strokes off a baseline; `direction: "ltr"` for now |
| 10 | `templars` | Knights Templar | both | cross-based glyphs |
| 11 | `zodiac-408` | Zodiac 408 | both | 54 symbols, includes homophones |
| 12 | `hexahue` | Hexahue | cachesleuth | coloured blocks; colour must survive theming |
| 13 | `unown` | Unown | both | 28 forms incl. `!` and `?` |
| 14 | `aurebesh` | Aurebesh | both | digraphs (`ch`, `sh`, `th`) exercise multi-char keys |
| 15 | `wingdings-1` | Wingdings 1 | both | original geometric rendition only |

Sequencing note: do 1–3 in P0 (they cover geometric, positional and simple-stroke art styles).
Add 4–8 in P4a, 9–15 in P4b.

## Appendix B — building the full inventory

P0 produces `dev/symbols/catalogue.json` by hand-curating from the two index pages, one row per
cipher:

```json
{"slug":"pigpen","name":"Pigpen","source":"both","tags":["masonic","geometric"],
 "status":"ready","wave":1,"variants":6}
```

`status` is one of `ready`, `todo`, `blocked`, `keyed`. The left panel counts only `ready`
ciphers; the search may show `todo` rows greyed out with "not yet drawn" so the roadmap is
visible without pretending it works. Do not scrape at build time — the app must build offline,
and the inventory is a curated file, not a network dependency.
