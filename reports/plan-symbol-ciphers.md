# Plan — symbol ciphers, rebuilt from source

**Written:** 2026-10-30 · **Status:** ✅ approved 2026-10-30 (all three open decisions taken at their defaults)
**This is the only planning document.** Scope changes get edited into this file, never added
as a second mission/goal doc. Approved phases are marked ✅ as you sign them off.

---

## 0. Why the last attempt was thrown away

Three things, in your words:

1. **The artwork was a restyle, not a replica.** Glyphs were redrawn to "fit the house look"
   instead of copying how they look on the site they came from.
2. **Alphabets shipped incomplete.** The seven-segment set, for one, was missing symbols —
   the glyph list was written by hand instead of taken from the source's own character list.
3. **Process drift.** Several mission files and several goals, repeatedly interrupted and
   changed, until nobody could tell what the original idea was.

So the fix is not "draw better". It is: **take the glyph art and the character list from the
source itself**, and keep **one plan, one approval at a time**.

---

## 1. Decisions already made

| # | Decision |
|---|---|
| D1 | **Artwork = the source's own PNGs**, inlined as data URLs. No redrawing, no house styling. Pixel-exact replica. |
| D2 | **Source toggle is per node**, and only appears when that cipher genuinely has two different implementations across CacheSleuth and dCode (e.g. 7-segment). No toggle where there is only one version. |
| D3 | **The first batch of 3–5 ciphers is proposed by me and approved by you** before any code or artwork is touched. |
| D4 | **Use case: transcribing a pictured ciphertext into plaintext.** Everything else is secondary. |
| D5 | **UI concept kept, code rebuilt from the ground up.** Left list showing ~5 sample symbols per row; node showing the full alphabet. Nothing is restored from git history. |
| D6 | **Completeness by construction:** the glyph set is generated from the source's own letters/numbers/extras list, *plus* a per-cipher count check against the source's expected count. |
| D7 | **Node layout:** glyph grid → preview of smaller symbols with the letter under each → below that, the text the preview transcribes to. |
| D8 | **Plan lives in this one file** (`reports/plan-symbol-ciphers.md`). |
| D9 | **You approve each phase** before the next one starts. |
| D10 | **One commit per batch**, source + rebuilt `index.html` together. |
| D11 | **No size cap** for now; I report bytes added per batch. |
| D12 | Rebuild the cipher **list from scratch** — the old 451-row catalogue is not reused. |
| D13 | Network is fine **at authoring time**; the shipped build stays fully offline. |
| D14 | `CACHESLUETH CODE LIST/` stays and is used as a primary input. |
| D15 | Review is **contact sheets, batches of 3–5**, side by side against the source. |
| D16 | **Source gaps are shipped as-is.** When the source itself is incomplete, we ship exactly
       what it has, the gap stays visible, and the contact sheet proves it is the source's gap
       and not ours. We do not quietly supplement, and we do not hide the cipher. *(settled
       2026-10-30 after CacheSleuth's 7-segment table turned out to be missing `g`)* |
| D17 | **Toggle rule (Phase 4):** the CacheSleuth↔dCode switch appears only when the other
       source publishes a **complete alphabet for the cipher's own letters** — every
       single-letter key the shipped set declares. (Written as "complete A–Z" in Phase 4;
       Ogham's 20-letter alphabet is why that was too strict — a complete 20-glyph dCode set
       failed a 26-letter test.) A source holding a handful of images (dCode ships 9 for
       Braille, 6 for Futhark) is not something you can transcribe with, so those nodes stay
       single-source instead of drawing a half-empty grid; a numbers-only set (Babylonian,
       Mayan) declares no letters and never shows it. Result: pigpen, semaphore and dancingmen show the toggle; braille and futhark
       do not. Enforced when reading a saved graph too, so a hand-edited `symbolSource` can
       never render a partial alphabet. When both sources publish the *same* alphabet and
       one source's art is shipped (D19), there is nothing to switch to and the toggle is
       suppressed. A solved per-variant mapping (Zodiac's z408/z340) is *offered*, not
       refused (changed 2026-10-31 on your Phase-5 flag): its tiles print each symbol's
       per-variant letters under the caption — the legibility the original refusal existed
       to protect — so D2's toggle now shows it. |
| D18 | **Symbol art on a white plate + rail inset (Phase 4 review fix):** the sources
       draw black-on-transparent art, which is black-on-black on the dark tiles. Every
       symbol image — grid tile, preview strip, drawer samples — now sits on a white plate
       (`background: #fff`, 4px radius): the treatment the approved contact sheets use, so
       the ink reads the same in either theme and coloured art (Semaphore's flags) is
       untouched. An earlier `filter: invert(1)` attempt was dropped — the filter also
       inverts the element's own background, so the drawer's sample chips came out white
       *and* their glyphs came out white: white on white. The plate goes on the image, not
       the tile, so the letter underneath stays on the node's own ground where the theme's
       ink colour still applies. The symbol rail and drawer are also inset to the canvas
       card's inner edge (12px page inset + 1px border) instead of running past the card's
       border to the window corner, and the toolbar steps right with the Fit/Snap controls
       while the rail is open. |
| D19 | **Where both sources publish the same alphabet, ship the chosen art as the cipher's
       own glyphs** and drop the duplicate set + toggle. Settled 2026-10-31 for `unown`:
       CacheSleuth and dCode both have the same 28 characters, and dCode's icons are shipped
       (`artFrom: "dcode"`) because you preferred how they look. Generated by
       `extract.mjs --art dcode`, which refuses unless dCode's set covers every character
       the descriptor declares — nothing hand-picked. Keys and labels stay CacheSleuth's.
       **Extended the same day for `hexahue`:** dCode publishes every declared character
       *except* the descriptor's space tile (477 bytes of nothing), so a character may be
       left out only when named at authoring time with `--drop " "` — the drop is recorded
       in the data and printed on the contact sheet, and anything unnamed stays a
       count-check failure. Hexahue therefore ships dCode's 38 icons and no space tile. |

---

## 2. The inputs (what I found)

**CacheSleuth** — `CACHESLUETH CODE LIST/` already contains the good data:

- `codes.js` — **308 cipher descriptors**: name, url, `letters`, `numbers`, `otherchars`,
  `othernames`, and image dirs (`lcdir`/`ucdir`, e.g. `alphabots_lc`, `alt`, `states`).
- Glyph art is **one PNG per character**, referenced as `<dir>/<char>.png` with images served
  from `…/images/<url>/…` and the CDN `i.cachesleuth.com/images/…`.
  *Hypothesis to confirm in Phase 2 — the exact URL recipe is the first thing proven.*
- A handful of ciphers render through `@font-face` or CSS instead of per-glyph PNGs (20 font
  faces seen). Those are the fallback cases in §5.

**dCode** — `dcode.fr/symbols-ciphers` lists the tools; each has its own page (e.g.
`/7-segment-display`). How their glyph art is served per character is **not yet confirmed** and
is a Phase 2 deliverable. Where dCode exposes no per-glyph asset, that cipher is single-source
and simply shows no toggle (per D2).

**Nothing else is reused.** The old catalogue, the old modules and the old UI code stay
reverted.

---

## 3. What we are building

- **Left panel** — a list of symbol ciphers, each row showing the name and ~5 sample symbols
  taken from the real glyph art, plus search.
- **Node** — the cipher's full alphabet as a grid of glyph tiles. Clicking a tile appends its
  letter. The header carries a source toggle (`CacheSleuth | dCode`) **only** when both exist
  and differ for that cipher, and the direction/state survives save, load and duplicate.
- **Preview** — smaller versions of the symbols you have chosen, letter under each.
- **Transcribed text** — under the preview: the text those symbols spell out. This is the
  node's output, so it can be piped into the rest of the graph.
- **No engine op in this delivery.** See open decision OD-1.

---

## 4. Phases

Each phase ends with: what I ran, its exit status, what I saw, and what I could **not** verify.

### ✅ Phase 1 — Batch 1 proposal *(no code, no artwork)*
I shortlist **3–5 ciphers**, each with: CacheSleuth availability, dCode availability, the
source's own character count, extraction difficulty (per-glyph PNG vs font/CSS), and why it
helps transcription. You cut, add, or approve.
**Acceptance:** you say "batch locked" on an explicit list.

### ✅ Phase 2 — Extraction recipe, proven on ONE cipher
Pick one approved cipher and prove the whole pipeline end to end:
- confirm the CacheSleuth per-glyph URL recipe and download every glyph for that cipher,
- confirm dCode's per-glyph asset for the same cipher (or record "single source"),
- generate its data from the descriptor's own character list — never hand-typed,
- **count check:** downloaded glyph count == the source's declared character count, else fail,
- emit a contact sheet for that one cipher, source table beside ours.
**Acceptance:** you look at the contact sheet and say it matches the source.
**Verify:** `node --check` on the new scripts; the count check; your visual sign-off.

### ✅ Phase 3 — Data layer for the whole batch *(art reviewed by you, 2026-10-30)*
- `dev/symbols/` data modules for the approved batch, generated from descriptors + downloaded
  art, committed as data (the build never touches the network),
- a fresh `dev/symbols/catalogue.json` built from those descriptors,
- the registry that feeds the panel,
- `node dev/build.mjs` step that inlines every glyph as a data URL into `index.html`.
**Acceptance:** build exits 0; every batch cipher passes its count check; bytes added reported.

### ✅ Phase 4 — UI, rebuilt *(accepted 2026-10-31, after the review fixes)*
- Left panel with sample-symbol rows and search,
- the glyph-grid node with click-to-append, the preview strip with letters under each glyph,
  and the transcribed text beneath it (D7),
- the per-node source toggle, only where D2 applies,
- persistence across `serializeGraph`, autosave, clipboard, duplicate and graph files.
**Acceptance:** `node dev/serve.mjs 8788` → add a cipher from the panel, click glyphs, see the
preview and the text update, reload the page and get the same node back.

### ✅ Phase 5 — Batch review and commit *(signed off 2026-10-31, commit `5e691e0`)*
- Contact sheets for **all** ciphers in the batch, ours vs the source, side by side,
- fix whatever you flag, regenerate, re-review,
- **one commit: source + rebuilt `index.html` together** (D10).
**Acceptance:** your sign-off on the sheets; `git diff --stat` shows exactly the expected files.

**After Phase 5 we stop and re-plan** — more batches, dCode variants, and whether to add the
encode/decode op (OD-1) get decided then, by editing this file.

### Checklist — steps per phase

Boxes are ticked as the work completes; a phase is not over until every box in it is ticked
and you have said so (D9).

**Phase 1 — batch proposal (no code, no artwork)**
- [x] Pull the CacheSleuth descriptor for each candidate: name, url, `letters`/`numbers`/
      `otherchars`, image dirs
- [x] Check dCode for a matching page on each candidate; record yes/no
- [x] Classify extraction difficulty: per-glyph PNG vs font/CSS-rendered
- [x] Write up 3–5 candidates with source character counts and why each helps transcription
- [x] You cut or approve → batch recorded here as "locked"

**🔒 Batch 1 — LOCKED 2026-10-30** (counts exact, from CacheSleuth's `image_manifest.json`):

| Cipher | id | glyphs | dCode page | note |
|---|---|---|---|---|
| Pigpen | `pigpen` | 36 (a–z, 0–9) | ✓ | geometric baseline |
| Braille | `braille` | 50 (a–z, 0–9, 14 punct) | ✓ | punctuation for real ciphertexts |
| Flag Semaphore | `semaphore` | 28 glyphs + 2 legend files | ✓ | file→char mapping must drop legends |
| Dancing Men | `dancingmen` | 36 (a–z, 0–9) | ✓ | figurative |
| Elder Futhark | `futhark` | 26 per source | ✓ | source lists 26 for a 24-rune alphabet — resolve in Phase 2 |

7-Segment was **cut**: its source table is missing `g` (see D16). The CacheSleuth↔dCode toggle
(D2) has no guaranteed demo in this batch any more — Phase 2 must check whether Futhark's two
implementations differ enough to warrant the toggle, and report back.

**Phase 2 — extraction recipe, one cipher**
- [x] Confirm the live URL recipe for that cipher's glyph PNGs
- [x] Download every glyph for it into a local staging dir
- [x] Confirm whether dCode exposes a per-glyph asset for the same cipher, or record "single source"
- [x] Generate its data from the descriptor's own character list — nothing hand-typed
- [x] Count check: downloaded glyph count == declared character count
- [x] `node --check` on every new script
- [x] Generate the contact sheet: source table beside ours
- [x] You confirm the sheet matches the source → phase accepted ✅ 2026-10-30

**Phase 2 results — Pigpen, 2026-10-30**

- **Recipe confirmed live:** `https://i.cachesleuth.com/images/<slug>/<file>` — `a.png` and
  `0.png` return 200/PNG, a bogus path returns 404.
- **`dev/symbols/extract.mjs`** builds the set from the descriptor + manifest: 36 declared,
  36 downloaded, 0 unmapped, 0 missing → **COUNT CHECK PASS**, exit 0.
- **dCode does expose per-glyph art:** `https://www.dcode.fr/tools/<slug>/images/char(65).png`,
  `class="glyph"`, key from the ASCII code. 26 glyphs downloaded for pigpen. Not single-source.
- The source's own `legend.png` (named by the descriptor's html) is fetched as the sheet's
  "source table" side.
- **Futhark toggle check (from the locked-batch note): YES, warranted.** dCode's Elder Futhark
  page renders Unicode runes as text (207 rune characters, only 6 glyph images) while
  CacheSleuth publishes 26 PNGs — two genuinely different implementations, so D2 applies.
- Observed dCode glyph-image counts in raw HTML: pigpen 26, semaphore-flag 44,
  dancing-men 34, braille 12, elder-futhark 6. Full dCode inventory is Phase 3 work.
- Artifacts: staging `/tmp/symstage/pigpen/`, sheet `reports/sheets/pigpen.html` (31 KB).

**Phase 3 — data layer for the batch**
- [x] Download glyphs for every cipher in the locked batch
- [x] Generate the `dev/symbols/` data modules from descriptors + downloaded art
- [x] Write the fresh `dev/symbols/catalogue.json` from those descriptors
- [x] Registry the panel reads (a cipher is "ready" only when its art is present)
- [x] Build step inlines every glyph as a data URL into `index.html`
- [x] Count check passes for every cipher in the batch
- [x] `node --check` on touched files, `node dev/build.mjs` exits 0
- [x] Report bytes added to `index.html` (D11)

**Phase 3 results — 2026-10-30**

- All five extracted and installed: **INSTALL: PASS**, 5/5 count checks pass.
- Data layer: `dev/symbols/{art,data,catalogue.json,index.mjs}` — 276 PNGs (1.6 MB),
  179 glyph rows across 5 ciphers, catalogue marks all five `ready`.
- Registry `dev/symbols/index.mjs`: a cipher is ready only when its check is PASS **and**
  every declared glyph has art on disk; it resolves art to data URLs for the panel, the
  node and the build.
- Build: `dev/build.mjs` now emits `<script type="application/json" id="glyphData">`
  beside `metaData`/`testData`, carrying both sources' art.
- **Bytes (D11):** source art 872 KB → island **1,216,703 bytes (+1,188 KB)**;
  `index.html` 14,557,921 → 15,774,624. A baseline rebuild of *unchanged* sources already
  differed from the committed file by +7,852 bytes, so the delta is measured against a
  fresh baseline build, not against the committed file.
- Verified: `node --check` on all five scripts; build exit 0; the shipped island parses
  with `JSON.parse`, and all 179 glyphs resolve to a `data:image/png` URL (0 missing,
  0 malformed).
- **Not verified:** no browser pass yet — nothing renders these glyphs until Phase 4.

**Phase 4 — UI, rebuilt**
- [x] Left panel: rail/drawer, rows with 5 sample symbols, search
- [x] Node: full-alphabet grid, clicking a tile appends its letter
- [x] Preview: smaller symbols with the letter beneath each
- [x] Transcribed text under the preview, wired as the node's output
- [x] Per-node source toggle, rendered only where both sources exist and differ (D2)
- [x] State survives `serializeGraph`, autosave, clipboard copy/paste, duplicate, graph files
- [x] `node --check dev/app.js dev/build.mjs`
- [x] Behaviour pass on `node dev/serve.mjs 8788`: add from panel → click glyphs → preview → text updates → reload → node still intact — **you drove this in your browser 2026-10-31**
- [x] No regression in the existing palette, search or run loop — your session reported none;
      the 17/17 logic assertions still pass. I have no browser, so this rests on your eyes,
      not on an automated click-through.

**Phase 4 results — 2026-10-30**

Every tick above rests on code + static checks; the two open boxes need a browser.

- **Left rail + drawer**, `position: fixed`, so opening it never reflows the canvas or
  moves a saved node position. Rows carry 5 sample glyphs, live search, open state in
  `localStorage cf.symbolsPanelOpen`, Esc closes only while focus is inside the drawer.
  The stage's Fit/Snap controls step right (`body.has-sym-rail`) to clear the rail.
- **Symbol node**, in the order you asked for (D7): glyph grid → preview strip (small
  glyph, letter beneath) → transcribed text. A tile click appends its key; typing, Clear
  and the source toggle all re-render the strip; the text is the node's output.
- **No input ports** (`nodeInPorts` returns `[]`), one output, so the transcription pipes
  into the rest of the graph.
- **Persistence:** `symbolCipher`/`symbolSource` added to `makeNode`, `cleanNodeForSave`
  and the `nodeFromRaw` type whitelist, so save/load/paste/duplicate carry them.
- **Run loop:** a `symbol` branch encodes `node.text`; its signature covers cipher +
  source + text, so edits invalidate the cache.
- **Toggle per D17**, and enforced when *reading* a saved graph, not just when drawing it.
- 45 `.sym-*`/`.glyph-*` rules appended to `dev/styles.css`.

**Checks run:** `node --check dev/app.js dev/build.mjs` (0); `node dev/build.mjs` (0,
island present); **17/17 assertions against the real inlined bundle** (`/tmp/symcheck.mjs`:
toggle decisions per cipher, glyph-set selection, dCode fallback, labels, art present in
both sources); dev server returns 200 for `/index.html`, the contact sheet and the CSS.

**Behaviour pass — driven by you, 2026-10-31** on `http://127.0.0.1:8788/index.html`. That
session covered add-from-panel, glyph clicking, preview/text updates, dark mode, symbol
size, drag behaviour and the drawer animation, and turned up six defects, all fixed and
re-verified here: (a) glyph art invisible on dark tiles — settled as D18, white plates;
(b) the rail running past the card's border to the window corner; (c) list samples too
small and cipher buttons indistinguishable; (d) glyph images draggable as file drops;
(e) list rows not draggable to the canvas; (f) the drawer sliding under a stationary bar
instead of pushing it.

**Still unverified by me:** this environment has no browser and no DOM driver (checked:
no chrome/chromium/firefox, no playwright/puppeteer/jsdom), so every UI check above rests
on your eyes rather than an automated run.

**Phase 5 — review and commit**
- [x] Contact sheet for every cipher in the batch, ours vs the source — all five generated
      and verified 2026-10-31 (exact tile counts, 0 missing tiles, 0 `?` placeholders, count
      badge PASS, every tile embedded as a data URL). **Source column is uneven:** only
      pigpen gets CacheSleuth's rendered `legend.png`; for braille, dancingmen, futhark and
      semaphore the source publishes no composite table at all — no `tableImg` in any of the
      308 descriptors (only 17 have one) and no `legend.png`/`alphabet.png` in their manifest
      entries. For those four the "source" side is CacheSleuth's own per-glyph PNGs, which is
      byte-for-byte what our grid is, plus dCode's independent rendering as the cross-check.
- [x] Collect your flags into a fix list — **you signed off with no flags**, so there was
      nothing to fix
- [x] Fix, regenerate, re-review until you sign off — not needed after the sign-off above
- [x] Rebuild `index.html` from the final sources — built immediately before the commit,
      harness 17/17, `node --check` clean on all six touched scripts
- [x] One commit: source + rebuilt `index.html` together (D10) — **`5e691e0`**, 290 files
      (286 under `dev/symbols/`, plus `dev/app.js`, `dev/build.mjs`, `dev/styles.css`,
      `index.html`), 3,671 insertions / 8 deletions
- [x] Report `git diff --stat` and what was not verified — reported before and after the
      commit; left out on purpose: `AGENTS.md` (a pre-existing rewrite, not this work),
      `reports/` (no new report files unless asked; sheets are local per OD-3) and
      `CACHESLUETH CODE LIST/` (untracked input dump)
- [x] Re-plan gate: edit this file for the next batch before starting it — §8 refreshed below

**🔒 Batch 2 — LOCKED 2026-10-31** (§8 gate; counts exact, from `image_manifest.json`):

| Cipher | id | glyphs | dCode page | note |
|---|---|---|---|---|
| Theban | `theban` | 26 (a–z) | ✓ Theban Alphabet | clean, single dir |
| Zodiac Killer | `zodiac_killer` | 36 declared, 62 PNGs | ✓ Zodiac Killer Cipher | `up:"1"` + `ucdir:"uppercase"` publishes a second, uppercase set of 26 — Phase 2 must decide which art is the source's alphabet |
| Aurebesh | `aurebesh` | 36 (a–z, 0–9) | ✓ Aurebesh Alphabet | clean |
| Unown | `unown` | 28 (a–z, `?` `!`) | ✓ Unown Pokemon Alphabet | clean |
| Hexahue | `hexahue` | 39 (a–z, 0–9, space/comma/period) | ✓ Hexahue | colour art |
| Enochian | `enochian` | 26 (a–z) | ✓ Enochian Alphabet | clean |

7-Segment stays out (gate 2026-10-31): the missing `g` was never published, D16 stands.
All six are per-glyph PNG on the CacheSleuth side (no `font:` field on any descriptor) and
all six have a dCode page — toggle eligibility is still a D17 completeness check, Phase 3.
Gate decisions: batch size **6** (D11: no cap, bytes reported); **OD-1 stays deferred** —
no encode/decode op; **sheet source column = per-glyph PNGs + dCode cross-check**, the same
treatment batch 1 was signed off with (no live table-page fetch — these six publish no
composite table anyway, only 7-segment had a `tableImg`).

**Phase 2 (batch 2) — extraction recipe, one cipher: `zodiac_killer`**
(chosen because it is the batch's only extraction decision — the dual-dir question above)
- [x] Confirm the live URL recipe still holds for this cipher's glyph PNGs
- [x] Download every glyph into `/tmp/symstage/zodiac_killer/`
- [x] Resolve the dual-dir question: compare root vs `uppercase/` art and settle which set
      is the source's alphabet (or that they are duplicates) — nothing hand-picked
- [x] Count check: downloaded == descriptor-declared (62); the 26 uppercase files are now
      mapped to their own section, explicitly, not silently dropped
- [x] dCode per-glyph assets for the Zodiac Killer page downloaded
- [x] `node --check` on any touched script
- [x] Contact sheet: ours vs the source's per-glyph PNGs + dCode column
- [x] You confirm the sheet matches the source → phase accepted ✅ 2026-10-31

**Phase 2 (batch 2) results — `zodiac_killer`, 2026-10-31** *(awaiting your sign-off)*

- **The dual-dir question, settled from the source's own renderer, not guessed.** The two
  sets are *different art*, not duplicates (root `a` is a smiley, `uppercase/A` a chevron),
  so it was a real question. `codetables.js`'s main-table builder decides it verbatim:
  `l.up && v(upper, "upper", "Uppercase")` renders `[ucdir/]UPPER.png` via its `ln()` rule,
  then `v(letters, "letter", "Lowercase")` renders `[lcdir/]lower.png` via `on()`, each tile
  gated only by manifest presence. The source's alphabet is therefore **all 62 tiles**
  (A–Z + a–z + 0–9), case-sensitive — and the site's own encoder maps `A` and `a` to
  different art for `up` ciphers.
- **Extractor change (`dev/symbols/extract.mjs`, `planGlyphs`):** when the descriptor's `up`
  flag is set, emit the uppercase set (key `A`…`Z`, file `[ucdir/]UPPER.png`) *before* the
  lowercase set (key `a`…`z`), and caption tiles with the site's rule — as-is for `up`
  ciphers (`A` under upper art, `a` under lower art), uppercase otherwise (byte-identical
  for everything else). Nothing hand-typed; both sets still come from `letters:atoz`.
- **Regression:** re-extracted `pigpen` with the changed script → 36/36 glyph rows
  (key|label|file) byte-identical to shipped `dev/symbols/data/pigpen.json`. Only
  `zodiac_killer` has `up:"1"` across batch 1 + 2, so no other cipher can shift.
- **Count check: PASS, exit 0** — declared 62 == manifest 62 == downloaded 62, 0 unmapped,
  0 would-404, 0 failed. dCode `/zodiac-killer-cipher`: 73 glyph PNGs, all PNG magic.
- **Live recipe re-confirmed:** `https://i.cachesleuth.com/images/zodiac_killer/<file>`
  serves every file; no `tableImg`/legend published for this cipher (as the gate predicted).
- **Sheet:** `reports/sheets/zodiac_killer.html` (145 KB) — 62 ours + 73 dCode tiles, exact
  counts, 0 missing tiles, 0 placeholder tiles, all 135 tiles embedded as data URLs,
  count badge PASS. Source column = CacheSleuth's per-glyph PNGs + dCode cross-check
  (the batch-1 treatment, per the gate decision).
- **Not verified:** no browser pass — the sheet needs your eyes; I have no browser here.
- **Flagged for Phase 4:** `index.mjs` hardcodes `caseSensitive: false` on panel rows and the
  glyph bundle. Nothing reads that field today (appended keys are verbatim, so transcription
  is already case-correct), but it should say `true` for `zodiac_killer` when batch 2's UI
  work lands.

**Your Phase 2 flag — dCode's two variants (Z408 / Z340), investigated 2026-10-31**

- **Confirmed on the live page.** `/zodiac-killer-cipher` offers radio choices
  `Z408 (First cryptogram)` and `Z340 (Second cryptogram - transposition ignored)`, and its
  symbol table maps each of **73 symbols** to its *solved* plaintext in each cryptogram:
  **55 symbols appear in Z408, 68 in Z340** — homophonic, several symbols per letter.
  (dCode names each symbol file `char(N)` by look-alike: `char(65)` is the A-shaped symbol,
  which — solved — means **W in Z408** and **D in Z340**.)
- **The two sources share the symbol family but assign letters differently.** Spot checks:
  CacheSleuth's chevron `A` is the same symbol dCode maps to z408:W / z340:D; dCode's
  z408:A symbols are `6`-, `s`- and triangle-dot-shaped, none of which is CacheSleuth's `A`.
  CacheSleuth maps look-alike symbols to their look-alike letters (its "Uppercase"/
  "Lowercase" sections are its own two sets, unlabeled by variant); dCode maps to the solved
  cipher meanings. Our replica follows CacheSleuth's convention (D1/D4) — the sheet now
  carries dCode's per-variant meanings beside it so the disagreement is visible at review.
- **Extractor/sheet now record the variants** (`dcodeVariants()` in `extract.mjs` parses any
  glyph-mapping table whose headers name variants; `cipher.json` gains `variantNames` + a
  per-glyph `variants` object; `install.mjs` passes both through; `sheet.mjs` prints
  `z408: A · z340: L`-style captions and a variant-aware section note). Pages without such a
  table (every batch-1 cipher) are byte-identical: the parser returns empty.
- **Re-run after the change:** `node --check` clean on extract/sheet/install; extraction
  COUNT CHECK PASS 62/62 with `dCode variant mapping: z408, z340`; sheet regenerated
  (148 KB, 71 of 73 dCode tiles carrying variant letters — the other 2 symbols belong to
  neither solved mapping).
- **D17 consequence for Phase 3:** dCode publishes no complete A–Z alphabet for this cipher —
  it is a per-variant solved-meaning map of the same symbols, so a CacheSleuth↔dCode toggle
  has nothing complete to switch *to*. Expected outcome: `zodiac_killer` stays
  single-source in the node, dCode art kept as the cross-check only. Final call in Phase 3.

**Phase 3 (batch 2) — data layer for the whole batch**
- [x] Stage all 11 ciphers — batch 2's six *and* a re-stage of batch 1's five (install rewrites
      the catalogue from staging only, so batch 1 must be present or it drops out of the panel)
- [x] Count check passes for every cipher in the batch — 11/11 PASS
- [x] Generate the `dev/symbols/` data modules from descriptors + downloaded art
- [x] Fresh `dev/symbols/catalogue.json` with all 11 ciphers
- [x] D17 toggle check per batch-2 cipher: dCode publishes a complete A–Z alphabet?
- [x] `node --check` on touched files; `node dev/build.mjs` exits 0
- [x] Bytes added to `index.html` reported against a fresh baseline build (D11)

**Phase 3 (batch 2) results — 2026-10-31**

- **Build input recovered:** `/tmp/chefworker.js` was gone (AGENTS.md: not committed).
  Re-extracted losslessly from the shipped `index.html` — gunzip the `#engineGzip` blob,
  strip the appended hook — and verified: the baseline rebuild's engine blob is
  byte-identical to what HEAD ships.
- **Staged 11/11, count checks 11/11 PASS.** Batch-1's five re-staged with their original
  dCode pages (pigpen `/pigpen-cipher`, braille `/braille-alphabet`, semaphore
  `/semaphore-flag`, dancingmen `/dancing-men-cipher`, futhark `/elder-futhark`), because
  install rewrites the catalogue from staging only. Batch-2 dCode glyph counts: theban 24,
  aurebesh 35, unown 28, hexahue 38, enochian 22, zodiac 73 — all valid PNGs.
- **`INSTALL: PASS`** — catalogue now 11 rows, every cipher `ready`, art copied fresh.
  Data layer: 396 symbols, 3,179 KB of source art (was 179 / 872 KB).
- **D17 per batch-2 cipher:** toggle **on** for aurebesh, unown, hexahue (dCode publishes a
  full letter-keyed A–Z); **off** for theban (dCode missing j, v, w), enochian (missing
  j, k, v, w), zodiac_killer (see below). Batch-1 decisions unchanged (harness-verified).
- **The zodiac toggle trap, closed:** its 73 dCode keys cover a–z *by coincidence* — the
  symbols resemble all 26 letters — but their meanings live in the z408/z340 columns, so
  the coverage rule alone would have offered a 73-tile grid captioned with dCode's private
  key chars. `symbolToggleSources` now refuses when a page publishes a solved per-variant
  mapping (`dcodeSolvedMapping`: every mapped variant value is a single plaintext char),
  and the bundle carries `variantNames` + per-glyph `variants` so the host can tell.
  Enochian's similar-looking table (glyph → letter *name*, multi-char) is not a solved
  mapping and still falls through to the coverage test — correctly no-toggle anyway.
- **Checks:** `node --check` clean on app.js, index.mjs, extract.mjs, sheet.mjs, install.mjs;
  build exit 0; **33/33 assertions against the real inlined island** (`/tmp/symcheck2.mjs`:
  per-cipher toggle decisions for all 11, art present on every tile, zodiac's 62 case-distinct
  keys + variant data, enochian not a solved mapping).
- **Bytes (D11), vs a fresh baseline rebuild of HEAD:** glyph island 1,216,618 → 4,397,581
  (**+3,180,963 bytes, +3,106 KB**); `index.html` 15,801,177 → 18,983,120 (+3,181,943).
- **Not verified:** no browser pass — node rendering of the six new ciphers (grid, preview,
  the zodiac case behaviour, the new toggle decisions) needs Phase 4 and your eyes.

**Phase 4 (batch 2) — UI verified for the new batch**
- [x] Panel: 11 rows, 5 sample glyphs each, every sample a data URL; search is name-based
      and picks up the six new names unchanged
- [x] Node data path: every tile carries art + key + label in the inlined island
      (33/33 harness), zodiac's labels stay case-correct (A under upper art, a under lower)
- [x] Per-node source toggle per D17: on for aurebesh/unown/hexahue, off for theban/
      enochian/zodiac (harness-verified decisions) — **superseded 2026-10-31 by your
      Phase-5 flags:** unown and hexahue now ship dCode art with no toggle (D19), and
      zodiac gains one (D17)
- [x] `caseSensitive` now computed, not hardcoded: true only for `zodiac_killer` (its A and
      a are different symbols), in both panel rows and the inlined bundle; first version of
      the check missed uppercase-first ordering, fixed and re-verified
- [x] Persistence: unchanged code paths — the six new ciphers add no node type, no field
      and no key shape the serializer has not carried since batch 1
- [x] `node --check dev/symbols/index.mjs`; `node dev/build.mjs` exit 0; 33/33 assertions
      re-run against the rebuilt island
- [x] `node dev/serve.mjs 8788` up, serving the rebuilt app (200 for index.html + CSS,
      island reports 11 ciphers, zodiac caseSensitive true)
- [x] Behaviour pass in the browser — **yours, 2026-10-31**: all six ciphers added, glyphs
      clicked, zodiac's A/a distinct, toggles tried, reload intact — accepted with one art
      request (unown, below)
- [x] No regression in the existing palette, search or run loop — your session reported none

**Phase 4 (batch 2) review result — 2026-10-31**

- **Only change: unown's art.** Both sources publish the same 28-character alphabet, and
  you prefer dCode's icons. Implemented in the data layer, not hand-copied: `extract.mjs
  unown --dcode /pokemon-unown-alphabet --art dcode` validates that dCode's set covers every
  declared character (28/28), records `artFrom: "dcode"`, and `install.mjs` ships dCode's
  files as the cipher's own glyphs. Keys and labels stay CacheSleuth's (so saved graphs and
  transcribed text are unchanged); the duplicate CacheSleuth set is not shipped, and the
  source toggle disappears because there is nothing to switch to.
- **Re-run:** COUNT CHECK PASS 28/28 with `art source: dCode (28/28 declared characters
  covered)`; `INSTALL: PASS` 11/11; rebuilt `index.html` (exit 0). Island check: unown has
  28 data-URL glyphs, byte-identical to dCode's staged PNGs, `artFrom: "dcode"`,
  `dcode: null`; **35/35** harness assertions (unown moved to the no-toggle set, the other
  ten decisions unchanged).
- **Bytes:** CacheSleuth's unown art was unusually heavy (1,316 KB for 28 icons vs dCode's
  99 KB), so shipping one set shrinks the layer: glyph island 4,397,581 → **2,599,268**
  bytes; `index.html` 18,983,120 → **17,185,008**. Source art total 3,179 → 1,863 KB.
- **Sheet:** `reports/sheets/unown.html` regenerated (276 KB): section 2 shows the shipped
  dCode art with CacheSleuth's letters, 28 tiles, count badge PASS — needs your eyes.
**Phase 5 (batch 2) — batch review and commit**
- [x] Contact sheet for every cipher in the batch — all six generated and verified 2026-10-31
      (exact tile counts, 0 missing tiles, 0 placeholder tiles, every tile embedded as a
      data URL, count badge PASS):

  | Cipher | ours | dCode | Sheet |
  |---|---|---|---|
  | Theban | 26 | 24 | `reports/sheets/theban.html` (122 KB) |
  | Aurebesh | 36 | 35 | `reports/sheets/aurebesh.html` (481 KB) |
  | Unown | 28 | 28 — dCode art is the shipped set (D19) | `reports/sheets/unown.html` (276 KB) |
  | Hexahue | 38 | 38 | `reports/sheets/hexahue.html` (67 KB, regenerated — 39 declared, the empty space tile dropped per D19) |
  | Enochian | 26 | 22 | `reports/sheets/enochian.html` (400 KB) |
  | Zodiac Killer | 62 | 73, with z408/z340 captions | `reports/sheets/zodiac_killer.html` (148 KB) |

  Source column = the sources' own per-glyph PNGs + the dCode cross-check, the batch-1
  treatment; none of the six publishes a composite table (as the gate predicted).
- [x] **Your flags — three, 2026-10-31, all fixed:**
      1. *Zodiac:* the sheet shows each dCode symbol's two variant letters, but the site
      showed none of them. Fixed: the solved z408/z340 mapping is no longer refused by the
      toggle rule (D17) — the node offers **Source: dCode** for Zodiac, and every
      variant-mapped tile (71 of 73) prints `z408: W · z340: D` under its caption, with
      the same letters in the tile tooltip.
      2. *Hexahue:* use dCode's art too — same alphabet, the only difference being
      CacheSleuth's space character, which is empty. Fixed via D19's `--drop`: hexahue
      ships dCode's 38 icons, the empty space tile is gone, and the drop is recorded in
      the data and printed on the sheet.
      3. *Zodiac, second toggle:* with dCode selected, add a **Variant** switch —
      *Normal / Z408 / Z340*. Normal is what shipped: dCode's look-alike letter with both
      mappings printed under each tile; Z408 and Z340 take that cryptogram's solved letter
      as the tile's caption *and* as what a click appends (the preview strip resolves it
      back to a symbol carrying that meaning). A symbol unused in the chosen cryptogram
      keeps its look-alike letter — 18 of 73 tiles in Z408, 5 in Z340, and 2 symbols have
      no mapping at all. The switch is per node, persisted with the source and part of the
      run-cache key.
- [x] Fixes verified: `node --check` clean on all five touched files; extraction
      `COUNT CHECK: PASS` (`art source: dCode (38/39 declared characters covered, dropped
      " ")`);      `INSTALL: PASS` 11/11 (hexahue 38 glyphs, no second set); `node dev/build.mjs` exit 0;
      **41/41** island assertions — toggle decisions swapped for zodiac/hexahue, the
      variant line styled *and* present in the built app, hexahue's space key gone, the
      Variant switch shipped (`data-sym-variant`, `symbolVariant` in all nine code paths:
      makeNode / save / load / run signature / render / set / control / click) and the
      control bar wrapping for it; hexahue sheet regenerated (76 tiles, 0 missing,
      0 placeholders, badge PASS); the other five sheets re-verified unchanged.
      Bytes: glyph island 2,599,268 → **2,519,972** (source art 1,863 → 1,806 KB),
      `index.html` 17,185,008 → **17,109,875** after the variant switch.
- [x] Your sign-off on the six sheets — ✅ 2026-10-31 ("alright, seems good!") after all
      three flags were fixed and re-verified
- [x] Fix, regenerate, re-review until you sign off — three flags came in, all fixed above;
      nothing else was raised after the fixes
- [x] `index.html` rebuilt from the final sources — `node dev/build.mjs` exit 0, 41/41 island
      assertions after the fixes (plus 13/13 assertions running the shipped glyph-set
      logic straight out of the built file)
- [x] One commit: source + rebuilt `index.html` together (D10) — **`3a89acd`**, 389 files
      (386 under `dev/symbols/`, plus `dev/app.js`, `dev/styles.css`, `index.html`),
      3,244 insertions / 162 deletions. Left out on purpose, as in batch 1: `AGENTS.md`
      (a pre-existing rewrite, not this work), `reports/` (sheets local per OD-3) and
      `CACHESLUETH CODE LIST/` (untracked input dump)
- [x] Re-plan gate: **batch 2 shipped 2026-10-31** — more batches, dCode variants and OD-1
      get decided next by editing §8

**Phase 1 (batch 3) — proposal only, no code, no artwork** *(awaiting your cut/approve)*
- [x] Pull the CacheSleuth descriptor for each candidate: name, url, letters/numbers/
      otherchars, image dirs
- [x] Check dCode for a matching page on each candidate; record yes/no
- [x] Classify extraction difficulty: per-glyph PNG vs font/CSS-rendered
- [x] Write up 5 candidates with exact source character counts and why each helps
      transcription
- [x] You cut or approve → batch recorded here as "locked" — ✅ 2026-10-31, approved at
      **10** ("could you do a batch of 10? the current ones you suggested are good!")

**🔒 Batch 3 — LOCKED 2026-10-31** (counts exact, from `image_manifest.json`):

| Cipher | id | glyphs | dCode page | note |
|---|---|---|---|---|
| Klingon | `klingon` | 36 (a–z, 0–9) | ✓ `/klingon-language`, 28 glyph PNGs | D2 toggle candidate, decided Phase 3 |
| American Sign Language | `signlanguage` | 26 (a–z) | ✓ `/american-sign-language`, 34 glyph PNGs | D2 toggle candidate, decided Phase 3 |
| Music Sheet | `music` | 59 (a–z + 0–6, `up:"1"`/`ucdir:"UC"`) | ✓ page exists, **0 glyph art** on either music page | confirmed single source; **Phase 2 pick** |
| Ogham | `ogham` | 20 (source's own list `abcdefghilmnopqrstuz`) | ✓ `/ogham-alphabet`, only 14 glyph PNGs | likely single-source (D17) |
| Tengwar | `tengwar` | 23 (source's own list `abcdefghijklmnoprstuvwx`) | ✗ no page at all | the deliberate single-source |
| Babylonian Numerals | `babylonian` | 24 (0–9, 10…50) | ✓ `/babylonian-numbers`, 108 glyph PNGs | multi-char keys → preview segmentation decision in Phase 4 |
| Mayan Numbers 1 | `mayan` | 20 (0–19) | ✓ `/mayan-numbers`, 46 glyph PNGs | multi-char keys, same decision |
| Gravity Falls – Bill | `gravity_falls_bill` | 26 (a–z) | ✓ `/gravity-falls-ciphers`, 80 glyph PNGs, **none keyed `char(N)`** | dCode key form unknown until Phase 3 |
| Hylian | `hylian` | 62 (a–z + 0–9, `up:"1"`/`ucdir:"UC"`) | ✓ page, but a *different* Hylian variant (A Link Between Worlds) | possible source disagreement like Zodiac — a Phase 2 decision |
| Dotsies | `dotsies` | 26 (a–z — manifest is exactly `a.png`…`z.png`) | ✓ `/dotsies-writing`, 38 glyph PNGs | descriptor is `letters:atoz,indexImage:"x.png"`; the extractor's `listOf` must learn that form first |

Gate decisions: **batch size 10** (your call, above D15's 3–5); **all five non-cut
alternates accepted with their flagged risks** (multi-char keys, Hylian's variant mismatch,
Dotsies' extractor extension); **`barcode39` stays out** — `space.png` was never published
(D16); **OD-1 stays deferred**; **sheet source column unchanged** (the sources' per-glyph
PNGs + the dCode cross-check where art exists). 10 ciphers, 322 glyphs planned.

**Phase 2 (batch 3) — extraction recipe, one cipher: `music`**
(chosen because its `up:"1"` two-case rule is this batch's extraction decision, and its
rather-then-assumed dCode coverage — both settled by measurement below)
- [x] Confirm the live URL recipe for this cipher's glyph PNGs — including the `UC/` dir
- [x] Download every glyph into `/tmp/symstage/music/`
- [x] Resolve the two-case question: are `UC/*` and root art distinct sets or duplicates?
- [x] Count check: downloaded == descriptor-planned (59), 0 unmapped, 0 would-404
- [x] dCode per-glyph assets: checked — `/music-notes` **and** `/music-sheet` publish 0
      glyph images → recorded as single source
- [x] `node --check` on the touched script (`sheet.mjs`)
- [x] Contact sheet for this one cipher
- [ ] You confirm the sheet matches the source → phase accepted

**Phase 2 (batch 3) results — `music`, 2026-10-31** *(awaiting your sign-off)*

- **Recipe re-confirmed, nested dir included:** `https://i.cachesleuth.com/images/music/<file>`
  serves `0.png`, `3.png`, `a.png`, `z.png`, `UC/A.png`, `UC/Z.png` as PNGs (200) and 404s
  bogus paths in both the root and `UC/`.
- **COUNT CHECK: PASS, exit 0** — declared 59 == manifest 59 == downloaded 59, 0 unmapped,
  0 would-404, 0 failed. Composition: 26 uppercase (`UC/A`…`UC/Z`), 26 lowercase,
  7 digits `0`–`6`, labels captioned by the site's own `up` rule (`A` under upper art,
  `a` under lower).
- **The two-case question, settled by measurement:** all 26 `UC/x` vs `x` pairs are
  different files (SHA-256: 26 differ, 0 match) *and* visibly different art — `UC/*` is
  76×143 opaque grayscale (black notes on white), lowercase/digits are 215×384
  dark-on-transparent. So the source's alphabet is all 59 tiles, exactly as the `up:"1"`
  rule from Zodiac states; nothing to drop as duplicate.
- **Visible on the app's white plates (D18):** opaque pixels of the lowercase/digit art are
  dark gray (mean L 84–108, no pixel above 240) on transparency; `UC/*` is black on white.
  Flattened onto white and viewed: solid black notes on a black-line staff, legible in
  either theme — no D18-style invisibility.
- **dCode is a single source — measured, not assumed:** `/music-notes` and `/music-sheet`
  both return HTTP 200 with **0** `class="glyph"` images, so there is nothing to switch to
  (D2). `sheet.mjs` gained a note for the 0-art case: it previously would have claimed the
  node shows a source toggle.
- **Sheet:** `reports/sheets/music.html` (385 KB) — 59 ours + 0 dCode, exact counts,
  0 missing tiles, 0 placeholders, all 59 embedded as data URLs, count badge PASS.
- **Not verified:** no browser pass — the sheet needs your eyes, especially the upper and
  lower blocks reading as two distinct sets.

**Phase 3 (batch 3) — data layer for the whole batch**
- [x] Stage all 21 ciphers — batch 3's ten *and* the shipped eleven (install rewrites the
      catalogue from staging only)
- [x] Count check passes for every cipher in the batch — 21/21 PASS
- [x] Generate the `dev/symbols/` data modules from the descriptors + downloaded art
- [x] Fresh `dev/symbols/catalogue.json` with 21 rows
- [x] D17 toggle check per batch-3 cipher (and re-verify the shipped eleven)
- [x] `node --check` on the touched script; `node dev/build.mjs` exits 0
- [x] Bytes reported against the committed build (D11)

**Phase 3 (batch 3) results — 2026-10-31**

- **Two extractor extensions, both forced by the batch's own descriptors:**
  - `listOf` learned attribute-tailed lists — Dotsies writes `letters:atoz,indexImage:"x.png"`,
    whose tail the field parser keeps. It is now reported (`~ descriptor list carries an
    attribute, ignored: ,indexImage:"x.png"`) and dropped, never hand-trimmed; its manifest
    is exactly `a.png`…`z.png`, so the planned 26 == manifest 26.
  - dCode keying got two fixes: keys fall back to the `char(N)` **filename** when the alt
    text carries dCode's internal name (Gravity Falls labels glyphs
    `gravity-falls-alchemy symbol 66` while shipping `char(73).png` — keying from alt alone
    would caption all 80 tiles with dCode's symbol index), and `String.fromCodePoint`
    replaces `fromCharCode`: dCode names Mayan files `char(119520)` = **U+1D2E0** (the Mayan
    Numerals block), which the old call truncated to Hangul `U+D2E0`. Both verified — the
    gravity set now keys to single letters, mayan's 20 keys are all U+1D2E0–2F3 — and a scan
    of all 21 staged sets found mayan the only affected one, so batches 1+2 are unchanged.
- **Staged 21/21, count checks 21/21 PASS** (ten new + the eleven shipped, per install's
  from-staging rule). Live recipe re-confirmed by every extraction: 0 would-404 anywhere.
- **`INSTALL: PASS`** — 21 rows, every cipher `ready`: **717 glyphs** installed (395 shipped
  before + 322 new) and 483 dCode glyphs.
- **D17 calls for batch 3 (as corrected in review):** toggle **on** for `klingon` and
  `hylian` (complete letter coverage); **off** for `music` and `tengwar` (no dCode art at
  all), `babylonian` (5/24), `mayan` (0/20 — keyed by Unicode Mayan numerals),
  `gravity_falls_bill` (25/26), and `signlanguage`/`dotsies` (same alphabet as CacheSleuth's,
  so there is nothing to switch to). Installed set = **8 toggles**: aurebesh, dancingmen,
  hylian, klingon, ogham, pigpen, semaphore, zodiac_killer — unown and hexahue remain off
  because their dCode art *is* the shipped set.
- **Hylian flagged, not guessed:** dCode's page is complete (26 letter keys) so D17 offers
  the toggle, but it is the *A Link Between Worlds* alphabet while CacheSleuth publishes its
  own 62-tile two-case set. Whether the two assign the same glyph to the same letter is
  exactly what the Phase-5 sheet shows side by side — recorded as a review item.
- **Checks:** `node --check dev/symbols/extract.mjs` clean; `node dev/build.mjs` exit 0;
  **69/69** island assertions (21 ciphers, per-cipher toggle decisions, music's 59 two-case
  tiles with distinct A/a art, hylian's 62, mayan's astral keys, gravity's filename keys,
  tengwar single-source, and `caseSensitive` exactly zodiac/hylian/music); served file byte-
  equals the built file (21,774,527).
- **Bytes (D11), against the committed build (HEAD: island 2,519,972 / `index.html`
  17,109,875):** glyph island → **7,184,624** (+4,664,652 bytes, **+4,555 KB**);
  `index.html` → **21,774,527**. Source art 1,806 → 5,197 KB — no cap per D11, so reporting
  rather than trimming; the heaviest new ciphers are `signlanguage` **1,009 KB** (26 hand
  images) and `klingon` **857 KB**.
- **Not verified:** no browser — how the ten new ciphers render (grids, previews, the new
  toggles) is Phase 4 and needs your eyes.

**Review fixes — 2026-10-31 (after Phase 3 sign-off)**

- **ASL and Dotsies are the same alphabet in both sources.** `extract.mjs --same` records the
  verdict, install keeps CacheSleuth's art and does not ship dCode's duplicate set, so both
  nodes are single-source (D19/D17). Chosen art: CacheSleuth's for both, per your call on
  Dotsies and no preference stated for ASL.
- **Multi-character numeral keys now read as one glyph.** Babylonian (`10`–`50`) and Mayan
  Numbers 1 (`10`–`19`) were drawn digit by digit in the preview strip because it walked the
  text one character at a time. `symbolTokens` now matches the longest key first, and a
  click on a multi-character tile inserts a space, so `1` then `0` stays two glyphs while the
  `10` tile stays one — checked with spaced input exactly as asked.
- **Ogham's dCode page is `/alphabet-ogham`** (the earlier probe used `/ogham-alphabet`).
  Its alphabet is not in `<img class="glyph">` tags at all: the page draws from
  `$.cryptoarea.icons`, whose 52 entries are **not** Latin digits + letters. The ten
  `char(48)`–`char(57)` slots hold Ogham forfeda: the page's own encoder emits `char(50)`
  for `ea`, `char(52)` for `oi`, `char(53)` for `ui`, `char(49)` for `ae`, and returns
  nothing for `0`–`9`. Labeling them 0–9 was wrong (caught in the browser pass below); they
  now carry AE/OI/UI/EA, and the six marks with no reachable Latin input are dropped rather
  than guessed. Ogham's dCode set is **46 tiles** — 21 letters in both cases + 4 forfeda —
  covering every letter CacheSleuth declares, so the toggle stands (D17 revised).
- **Browser pass over all 21 shipped sets (2026-10-31):** a headless Chrome opened every
  live CacheSleuth table and hashed every tile against the build. **19/19 CacheSleuth-art
  ciphers match key-for-key and byte-for-byte** (braille's 51 and semaphore's 30 included).
  unown and hexahue ship dCode's art by design (D19): their keys match, and hexahue's
  missing space is the recorded `--drop`. Ogham's dCode page was driven through its own
  encoder in Unicode and image modes to prove the forfeda labels.
- **Re-verified after the fixes:** ogham count check PASS (46 dCode glyphs);
  `INSTALL: PASS` 21 rows; `node dev/build.mjs` exit 0; **83/83** island assertions (incl.
  no digit-keyed ogham tiles, the four forfeda keys, the tokenizer on Babylonian and Mayan,
  the two same-source sets); `index.html` **21,742,703** bytes, island **7,149,588**. The
  grids are hash-verified rather than hand-reviewed, except Ogham which was also rendered.
- **Bug sweep — 2026-10-31 (live app):** three host bugs found and fixed.
  (1) Uppercase text on a lowercase-keyed set drew misses — the tokenizer matched exact keys
  and the preview skipped the case-fold lookup; both now fold.
  (2) The separator was narrowed to numeric keys for a moment, then restored on request:
  every multi-character-key set (Babylonian, Mayan, Ogham forfeda) separates entries, so
  Ogham A then B is “A B” with a gap.
  (3) Braille’s own space tile drew a gap; `symbolTokens` now returns the space glyph when the
  set keys it. Live tests: uppercase 3/3 glyphs, braille space 1 glyph/0 gaps, Ogham “AB”,
  Babylonian “10 5” with 2 glyphs + 1 gap. Data sweep: 21/21 art present and PNG, no duplicate
  keys; the only empty labels are the two space tiles (braille, semaphore), shown as ␣.
  Not covered: the other seven dCode toggle pages were not driven through their encoders.

**How these were derived (2026-10-31):** all 308 descriptors parsed from
`CACHESLUETH CODE LIST/.../codes.js`; counts checked against the cached
`image_manifest.json` (319 entries) using the extractor's own `planGlyphs` rule including
the `up:` two-case expansion, so "planned" below is exactly what a count check would
require; dCode coverage from its published `sitemap.xml` (2,046 URLs), and each candidate
page fetched to count `class="glyph"` images. 11 shipped, **296 unshipped descriptors have
a manifest entry**, 0 unshipped descriptors lack one.

| # | Cipher | id | glyphs (source's own list) | dCode page | extraction | why it helps transcription |
|---|---|---|---|---|---|---|
| 1 | Klingon | `klingon` | **36** = a–z + 0–9, planned == manifest 36 | ✓ `/klingon-language`, 28 glyph PNGs → likely full A–Z, **D2 toggle candidate** | per-glyph PNG, clean | most-requested fictional script (Star Trek), full letters *and* digits so a whole message transcribes |
| 2 | American Sign Language | `signlanguage` | **26** = a–z, planned == manifest 26 | ✓ `/american-sign-language`, 34 glyph PNGs → **D2 toggle candidate** | per-glyph PNG, clean | hand shapes — figurative like the approved Dancing Men; signed-message puzzles are common |
| 3 | Music Sheet | `music` | **59** = a–z + 0–6, `up:"1"`/`ucdir:"UC"` two-case, planned == manifest 59 | ✓ `/music-notes`, **0 glyph art** → single source | per-glyph PNG, clean | only non-Zodiac `up:"1"` candidate with matching counts: exercises the two-case path again, minus the homophone trap; note-cipher puzzles |
| 4 | Ogham | `ogham` | **20** = the source's own list `"abcdefghilmnopqrstuz"`, planned == manifest 20 | ✓ `/ogham-alphabet`, only 14 glyph PNGs → likely single-source (D17) | per-glyph PNG, clean | real ancient alphabet; feathered strokes look like nothing shipped yet |
| 5 | Tengwar | `tengwar` | **23** = the source's own list `"abcdefghijklmnoprstuvwx"`, planned == manifest 23 | ✗ **no page** (checked all 2,046 sitemap URLs; only `/goblin-tolkien-alphabet` exists) | per-glyph PNG, clean | Tolkien's script, heavy fan-puzzle use; the batch's deliberate single-source |

**Batch 3 alternates (swap in freely):**
- `babylonian` **24** (numbers 0–9,10…50), dCode `/babylonian-numbers` with **108 glyph PNGs** — the richest dCode set found.
- `mayan` **20** (numbers 0–19), dCode `/mayan-numbers` 46 glyph PNGs — first number-only cipher.
- `gravity_falls_bill` **26** (a–z), dCode `/gravity-falls-ciphers` 80 glyph PNGs but **none keyed `char(N)`** → letter keys unknown until Phase 3.
- `hylian` **62**, `up:"1"` — but dCode's page is a *different* Hylian variant (A Link Between Worlds), so the two sources may assign letters differently (the Zodiac situation): a Phase 2 decision, not a drop-in.
- `dotsies` **26** — needs a small extractor extension first (`letters:atoz,indexImage:"x.png"` is an expression `listOf` does not handle today).
- **Cut / known gap:** `barcode39` plans 37 but the manifest holds 36 — `space.png` was never published, the 7-segment situation (D16). Shippable only with a named `--drop`, or leave it out.

**Known risks for this batch:**
1. **Multi-character keys** (numeral alternates): `mayan` has ten keys (`10`…`19`) and
   `babylonian` fourteen (`10`…`50`). The preview strip walks the text **character by
   character**, so a `10` tile would append `"10"` but render in the strip as the `1` and
   `0` tiles, never the `10` glyph. Every shipped cipher so far has single-char keys. This
   is the main reason the recommended five are all single-char; taking a numeral cipher
   means deciding how the preview should segment (longest-key-first) in Phase 4.
2. **`font:`-flagged descriptors stay out** (nyctographic, circularglyphs, dinotopian,
   drazi, hyach, morsemountain, numikki, unitology, vorlon, vulcan_old, dna, …): the
   rendering path is unverified — several also fail the count check outright (nyctographic
   declares 47 vs 36 files, hyach 36 vs 26, circularglyphs 37 vs 36). A separate risk item,
   not a batch-3 candidate.
3. dCode glyph counts above are inventories, not alphabets: whether Klingon's 28 and ASL's
   34 cover a–z for the D17 toggle test is Phase 3's call, as in every batch.

**What I need from you:** approve the five, cut any, swap in alternates — and say the batch
size you want (3–5 per D15; batch 2 ran at 6 with your say-so). Then the batch is locked and
Phase 2 starts on whichever candidate holds an extraction decision (Music Sheet's two-case
rule is the obvious pick).

**Phase 1 (batch 4) — proposal, ✅ approved 2026-10-31** ("looks good! next phase")
- [x] Parsed all 308 CacheSleuth descriptors; 274 unshipped ciphers have a manifest entry
- [x] Checked the 2,046-URL dCode sitemap for each candidate and counted the page's own glyph inventory
- [x] Excluded font-only descriptors, missing-art descriptors and dCode-only pages
- [x] Selected ten with exact source counts (descriptor-planned == manifest files)

| # | Cipher | id | glyphs | dCode page / inventory | why it earns a place |
|---|---|---|---|---|---|
| 1 | Kryptonian | `kryptonian` | **36** = a–z + 0–9 | ✓ `/kryptonian-alphabet`, 36 icons | DC/Smallville script, full letters *and* digits, clean PNGs |
| 2 | Vulcan (Modern) | `vulcan_modern` | **26** = a–z | ✓ `/vulcan-language`, 26 icons | Star Trek's other major script; complete for its letter-only set. `vulcan_old` is font-only and stays out |
| 3 | Atlantis (Atlantean) | `atlantis` | **36** = a–z + 0–9 | ✓ `/atlantean-language`, 39 icons | Disney Atlantean; geometric glyphs unlike anything shipped |
| 4 | Dragon – Skyrim | `dragon_skyrim` | **58** = a–z + 0–9 + 12 punctuation + 10 Specials | ✓ `/dovahzul-dragon-language`, 36 icons (a–z + 0–9) | Dovahzul is heavily used in puzzles; the source's own Specials are shipped as multi-character tiles |
| 5 | Futurama | `futurama` | **43** = a–z + 0–9 + `! " ' - . : ;` | ✓ `/alphabet-alien-futurama`, 43 icons | Alien Alphabet 1, instantly recognisable; dCode's whole table is the shipped set (review 2026-10-31) |
| 6 | Chappe | `chappe` | **36** = a–z + 0–9 | ✓ `/alphabet-chappe`, 36 icons | historical optical-telegraph code; the batch's real-world "machine" alphabet |
| 7 | Adlam | `adlam` | **36** = a–z + 0–9 | ✗ no page | real West African script, right-to-left; no dCode duplicate |
| 8 | N'Ko | `nko` | **36** = a–z + 0–9 | ✗ no page | real Guinean script, right-to-left; visually unlike the Latin-derived sets |
| 9 | Glagolitic | `glagolitic` | **36** = a–z + 0–9 | ✗ no page | real medieval Slavic alphabet; round, ornate strokes |
| 10 | Breath of the Wild | `botw` | **40** = a–z + 0–9 + `. ! ? -` | ✓ `/sheikah-language`, 40 icons | Zelda Sheikah script; CacheSleuth's `a` and dCode's `char(65)` are the same shape, and both sets are 40 — a likely D19 same-alphabet decision |

**Batch 4 total: 383 glyphs** (largest so far; batch 3 was 322). Seven of the ten have a
dCode page; Adlam, N'Ko and Glagolitic are the deliberate single-source sets.

**Alternates if you want a swap:** Mandalorian `mandalorian` 36 (no dCode page), Gerudo
`gerudo` 26 (dCode 30), Cistern `cistern` 36 numeric keys `1`–`9000` (multi-key, dCode 37
— a third numeral system, so not recommended twice in a row).

**Batch-4 risks to settle in Phase 2:**
1. **BotW may be Sheikah under another name.** Equal 40-glyph counts and a matching `A`
   shape are strong but not proof; Phase 2 compares all 40 and, if they are the same
   alphabet, applies D19 (one shipped set, no toggle).
2. **Dovahzul's Specials.** The manifest's 58 files are 48 core characters plus ten
   `alt/` entries; Phase 2 confirmed they are the source's own Specials and shipped them as
   tiles, so the count check requires 58. The set becomes multi-key, and the node's existing
   separator rule spaces clicks until Phase 4 review says otherwise.
3. **Adlam and N'Ko are RTL.** The grid and preview are per-character tiles, so no shaping
   or joining is implied; if the source publishes isolated forms, those are what ship.
4. **dCode counts are page inventories, not alphabets** (the Ogham lesson). Whether each page
   covers every declared letter is the Phase 3 D17 test, not a promise made here.
5. **Size.** 383 new glyphs is the biggest batch yet; no cap per D11, but bytes get reported
   against the committed build as usual.

**Phase 2 (batch 4) — extraction recipe, one cipher: `dragon_skyrim`**
- [x] Confirm the live URL recipe, including the nested `alt/` directory
- [x] Download every declared glyph into `/tmp/symstage/dragon_skyrim/`
- [x] Resolve the ten manifest extras against the source's own table
- [x] Count check: downloaded == descriptor-planned (58), 0 would-404, 0 failed
- [x] dCode per-glyph assets: `$.cryptoarea.icons` on `/dovahzul-dragon-language`, 36 icons
- [x] Contact sheet for this one cipher
- [x] You confirm the sheet matches the source → phase accepted (✅ 2026-10-31)

**Phase 2 (batch 4) results — `dragon_skyrim`, 2026-10-31** *(✅ signed off 2026-10-31)*

- **Recipe confirmed:** `https://i.cachesleuth.com/images/dragon_skyrim/<file>` serves the root
  letters/digits/punctuation and the nested `alt/*.png` files as PNGs; 0 planned files would
  404, 0 downloads failed.
- **COUNT CHECK: PASS, exit 0** — declared 58 == planned 58 == downloaded 58, 58 unique
  files, 0 failed, 0 unmapped. Composition: 26 letters (`a`–`z`), 10 digits (`0`–`9`),
  12 punctuation (`' . , $ # ! % ? ( ) & *`), and the 10 Specials (`aa`, `ah`, `ei`, `ey`,
  `ii`, `ir`, `oo`, `ur`, `uu`, `@`).
- **The ten Specials are now shipped as tiles:** the live table's four groups are
  Letters, Numbers, Punctuation, **Specials**; the last ten carry `data-digraph="1"`:
  `AA, AH, EI, EY, II, IR, OO, UR, UU, @` backed by `alt/aa.png` … `alt/web_at.png`.
  They are the descriptor's own `digraphs` array. `extract.mjs` now reads that array
  through a balanced-brace descriptor scanner — the old `[^}]*` capture stopped at the
  first nested digraph object, which is why the tiles were missing — and plans each entry
  as a key. 58/58 downloaded, 0 unmapped.
- **dCode needs `--dcode-icons`:** `/dovahzul-dragon-language` has only 10 static
  `<img class="glyph">` tags but its `$.cryptoarea.icons` array lists 36 — digits `0`–`9`
  and letters `A`–`Z`. All 36 downloaded as PNGs. **Letter coverage 26/26**, so D17 makes
  this a toggle candidate; dCode has none of the 22 non-letter keys (12 punctuation +
  10 Specials). The 26 letters + 10 digits are the same shapes as CacheSleuth's (A and 0
  compared at full size; dCode is ~35×36 vs CacheSleuth's 486×384), so Phase 3 decides
  whether this is a D19 same-alphabet set or a genuine source toggle; the review made it
  same-alphabet (CacheSleuth art, no toggle). The batch total is **383** with Futurama's
  seven dCode punctuation tiles.
- **Sheet:** `reports/sheets/dragon_skyrim.html` (792 KB) — 58 ours + 36 dCode, 94 tiles,
  **0 missing**, all 94 embedded, count badge PASS. No table image is published.
- **Checks:** `node --check dev/symbols/extract.mjs` clean; balanced scanner reads
  **308/308** descriptors; extraction exit 0; the browser table enumeration is the
  live-source proof.
- **Not verified:** the full 36 dCode images have not been hand-compared one by one — only
  A and 0 were sampled at full size; the sheet is the side-by-side review artifact. The
  ten Specials' click/preview behavior is Phase 4 (they are now multi-character keys).

**Phase 3 (batch 4) — data layer, ✅ complete 2026-10-31**
- [x] Stage all 31 ciphers — the 21 shipped plus batch 4's ten; 31/31 count checks PASS
- [x] Generate `dev/symbols/data/*.json` and copy art; catalogue now 31 rows, all ready
- [x] D17/D19 calls for every batch-4 cipher (below)
- [x] `node --check` the touched extractor; install PASS; build exit 0
- [x] Bytes reported against the committed build (D11)
- [x] Phase 4 browser pass over the ten new nodes *(✅ 2026-11-01, 80/80 in headless Chrome)*

**Phase 3 (batch 4) results — 2026-10-31**

- **Extractor fix now feeds every cipher:** descriptor scanning is balanced-brace, so all
  **308/308** descriptors parse and `digraphs` is a real descriptor field. Dragon's ten
  Specials are planned by `planGlyphs`, not hand-added. `node --check` clean.
- **Staging 31/31 PASS:** the ten new counts are adlam 36, atlantis 39, botw 40, chappe 36,
  dragon_skyrim 58, futurama 43, glagolitic 36, kryptonian 36, nko 36, vulcan_modern 26.
- **D17/D19 calls (final, after your 2026-10-31 review):**
  - **Same alphabet, one shipped set, no toggle:** `atlantis` — dCode's art over
    CacheSleuth's keys, **39 tiles**: letters keyed in the case the art writes (`A`–`Z`)
    plus dCode's lowercase `c`, `s`, `t`, which are different shapes and ship as their own
    lowercase-keyed/labelled tiles (review 2026-10-31: keep them). `futurama` — dCode's
    art plus its seven extra symbols as real tiles
    (**43**: `! " ' - . : ;`). `dragon_skyrim` — CacheSleuth's art and all **58** tiles
    (dCode publishes only 26 letters + 10 digits, none of the 12 punctuation/10 Specials).
    All three are recorded with `--same`, so the second set is downloaded as evidence and
    not shipped.
  - **`--dcode-extras` is new:** it appends the keys dCode publishes that CacheSleuth does
    not declare, so Futurama's punctuation is reproducible from the extractor instead of a
    hand-edit. The count check stays honest — declared 43 == downloaded 43, with
    `counts.extras: 7` and `manifestFiles: 36` making up the difference.
  - **`--cases` is new (Atlantis):** keys the letters in the case the art writes and
    compares dCode's glyphs exactly rather than folded, so `c`/`s`/`t` are not mistaken for
    the uppercase tiles. Atlantis therefore stages 39 = 36 (a–z, 0–9) + 3 lowercase
    variants; `counts.extras: 3`. Its page needs `--dcode-icons` — the static page shows
    only 20 demo glyphs while `$.cryptoarea.icons` lists all 39.
  - **Same alphabet, CacheSleuth art:** `kryptonian` (36/36), `vulcan_modern` (26/26),
    `botw` (40/40).
  - **No toggle:** `chappe` — dCode publishes 36 keys but only 25 letters (`j` absent,
    `&` extra); `adlam`, `nko`, `glagolitic` — no dCode page.
  - Existing eight toggles unchanged: pigpen, semaphore, dancingmen, aurebesh,
    zodiac_killer, klingon, hylian, ogham. **Installed total: 8 toggles** — the three
    batch-4 toggles proposed in Phase 3 were withdrawn when the review found the same
    alphabet in both sources.
- **Install:** **31 ciphers / 1,103 glyphs** (717 before + 386 new); 8,188 KB of source art.
- **Build:** `index.html` **25,888,624 bytes** (24.69 MB), **+4,145,863 bytes (+3.95 MB)**
  over the committed 21,742,761. Worker and modules load cleanly; build exit 0.
- **Caption fix (2026-10-31):** dCode-mode tiles were captioned `key.toUpperCase()`, so a
  lower-case key was drawn as a second identical A/B/C/D tile (semaphore's four special
  flags). Captions now keep the glyph's own case, in the app and in the island check.
- **Checks:** **126/126** island assertions — all 31 grids carry data-URL art, the three
  reviewed sets have no second source (`sameAsCachesleuth`, `dcode: null`), the eight
  toggles match D17, Futurama's `!` tile is dCode's `char(33)` bytes and its punctuation
  tiles all draw dCode art, Atlantis's `A` is dCode's `char(65)` and its lowercase
  `c`/`s`/`t` are `char(99)/char(115)/char(116)` with lowercase captions, Dragon's ten
  Specials are present and captioned, Chappe's incomplete dCode set is suppressed, and the
  tokenizer reads `aa` as the Special but `a a` as two A tiles.
- **Not verified:** no browser pass on the ten new nodes (Phase 4); the Specials' click
  separator, Futurama's seven punctuation tiles and the dCode grids need eyes. Contact
  sheets exist for dragon_skyrim, kryptonian, vulcan_modern and botw; the dragon sheet
  predates this decision and still shows dCode as a second set, and no sheet covers
  Futurama's new punctuation tiles.

**Phase 4 (batch 4) — browser pass, ✅ 2026-11-01 (80/80 checks)**

Driven in real headless Chrome (Chrome for Testing 156, CDP) against `index.html` served by
`dev/serve.mjs`. Every check below ran against the shipped build, not the dev sources.

- **Panel:** boot splash clears, rail reads *Symbol ciphers 31*, list holds 31 rows, and
  search narrows to Dragon. Row meta says `· both sources` only for the ciphers that really
  have a toggle.
- **All ten nodes, per cipher:** tile count exact (36/39/40/36/58/43/36/36/36/26), captions
  byte-identical to the source's own labels, every tile carries a `data:image/png` data URL
  on its white plate, **0** missing tiles, foot reads *N glyphs*, and **no source toggle and
  no variant bar** — D17 held for all ten. Fixed source label is `dCode` for atlantis and
  futurama, `CacheSleuth` for the other eight, matching `artFrom`.
- **Dragon's Specials:** all ten (`AA AH EI EY II IR OO UR UU @`) are tiles; clicking `AA`
  appends the key `aa` as one entry, the next click is separated (`aa` + `A` → `aa a`), and
  the preview draws two glyph tiles with one `sym-gap` between them.
- **Atlantis:** lowercase `c/s/t` sit beside uppercase `C/S/T`, carry lowercase captions,
  use **different art** from their uppercase twins, and clicking `c` appends `c` with a
  lowercase preview caption.
- **Futurama:** all seven dCode punctuation tiles (`! " ' - . : ;`) are present; clicking
  `!` appends `!` and the preview draws that glyph rather than the fallback placeholder.
- **Wheel (the fix from this session):** a real compositor wheel over a glyph grid scrolls
  the grid (`scrollTop 0 → 92`) with the canvas transform untouched, while the same wheel
  over bare stage still zooms (`scale 0.733 → 1.115`). A real hit-tested mouse click on a
  tile transcribes it, so the checks are not resting on JS-dispatched clicks.
- **Screenshots reviewed:** panel, atlantis, dragon_skyrim, futurama — grids full, art on
  plates, no empty tiles.

**Two failures on the first run were the harness, not the app:** the boot splash was still
up (it clears with `.done`, and JS `.click()` had been bypassing it), and spawned nodes
overlap, so the first scrollable grid sat under a neighbour and the wheel hit the stage.
Both were fixed in the probe; no product code changed for Phase 4.

**Not verified:** a human eyeball over all 1,103 glyphs; the 21 pre-existing ciphers were not
re-checked (they were signed off in their own phases); no RTL shaping is implied for Adlam
and N'Ko, as the plan states. Contact sheets for the batch-4 set were not regenerated.

**What I need from you now:** sign off Phase 4, or name anything you want re-checked. After
that batch 4 is fully shipped (committed `8576cf0`, with `79c5e7f`), and the next thing in
this file is the re-plan gate for **batch 5**.

**🔒 Batch 5 — LOCKED 2026-11-01** ("approved! start with shoes please!"): Gerudo, Simlish,
Outer Rim, Covenant, Moon, Lunar, Rosicrucian, Fez, RM4SCC, Shoes (367 glyphs, batch size 10).
Phase 2 starter: **`shoes`** — your pick.

**Phase 1 (batch 5) — proposal only, no code, no artwork** *(✅ approved 2026-11-01)*
- [x] Re-ran the batch-4 candidate scan over all 308 CacheSleuth descriptors; 274 unshipped
  ciphers have a manifest entry (same filter as batch 4: descriptor-planned == manifest files)
- [x] Checked the 2,046-URL dCode sitemap for every candidate and counted each matched page's
  own icon inventory (icons = table grid, static = published PNGs)
- [x] Excluded shipped-family duplicates, false sitemap matches and dCode pages already
  claimed by a shipped cipher
- [x] Selected ten with exact source counts

**Proposed ten (batch 5):**

| # | Cipher | id | glyphs | dCode page / inventory | why it earns a place |
|---|---|---|---|---|---|
| 1 | Gerudo | `gerudo` | **26** = a–z | ✓ `/gerudo-language`, 30 icons / 30 static | Zelda's alternate from batch 4; exact letter set, clean dCode match |
| 2 | Simlish | `simlish` | **52** = A–Z + a–z (`up`) | ✓ `/simlish-language`, 52 icons / 52 static | The Sims; the batch's two-case exercise (same `up` rule as Zodiac/Music), counts match exactly |
| 3 | Outer Rim | `outerrim` | **36** = a–z + 0–9 | ✓ `/outer-rim-basic-alphabet`, 36 icons / 36 static | Star Wars; dCode inventory is exactly 36, the cleanest match in the scan |
| 4 | Covenant | `covenant` | **26** = a–z | ✓ `/covenant-halo-language`, 26 icons / 26 static | Halo's language; exact 26/26 on both sides |
| 5 | Moon | `moon` | **26** = a–z | ✓ `/alphabet-moon`, 27 icons / 27 classic | Moon's tactile alphabet; a real accessibility-originated cipher, 1 extra icon (space) to resolve |
| 6 | Lunar | `lunar` | **26** = a–z | ✓ `/lunar-alphabet-leandro-katz`, 27 icons / 27 static | Leandro Katz's Lunar alphabet; real artist's script, 1 extra to resolve |
| 7 | Rosicrucian | `rosicrucian` | **26** = a–z | ✓ `/rosicrucian-cipher`, 26 icons / 26 static | historical occult cipher; exact 26/26 |
| 8 | Fez | `fez` | **36** = a–z + 0–9 | ✓ `/alphabet-fez`, 40 icons / 40 static | FEZ (indie game) alphabet; 4 dCode extras to resolve, like BotW's |
| 9 | Royal Mail (RM4SCC) | `rm4scc` | **38** = a–z + 0–9 + 2 | ✗ no page | real-world postcode barcode; the batch's single-source real script, like Adlam/N'Ko/Glagolitic |
| 10 | Shoes Code | `shoes` | **75** = A–Z + a–z (`up`) + 0–9 + 13 others | ✗ no page | the biggest unshipped set; multi-key specials + two-case, exercises the Dragon Specials path |

**Batch 5 total: 367 glyphs** (batch 4 was 383). Eight of the ten have a dCode page — the
strongest dCode coverage of any batch — and RM4SCC and Shoes are the deliberate
single-source sets.

**Alternates if you want a swap:** Ballet `ballet` 35 (dCode `/alphabet-ballet` 61/61),
Tic Tac Toe `tictactoe` 26 (27/27), Stray `stray` 35 (48 icons / 57 static), Dagger `dagger`
26 (26 icons), Eternity `eternity` 26 (26/23), Birds On A Wire `birdsonawire` 26 (26/26),
Matoran `matoran` 36 (62 icons but only 27 static — digits may be missing), Elia `elia` 36
(91 icons / 69 static — the largest dCode table in the scan), Malachim `malachim` 26,
Templar `templar` 26, Window `window` 26, Dorabella `dorabella` 26 (all four have dCode
pages *under* 26 glyphs, so they would ship single-source), Mandolorian `mandalorian` 36,
Autobot `autobot` 36, Decepticon `decepticon` 36, Ewok `ewok` 36, Gardner `gardner` 46,
Murray Version 4 `murray1796` 41, Cybertronic `cybertronic` 40, Spintype `spintype` 40,
Blox `blox` 38, Cistern `cistern` 36 (numeric keys `1`–`9000`, multi-key — still not
recommended twice in a row), Alphabots `alphabots` 67 (`up`).

**Excluded on purpose (documented so they aren't rediscovered):**
- `dragon` / `dragon2` — their sitemap match is `/dovahzul-dragon-language`, **the page
  shipped as `dragon_skyrim` in batch 4**; `draconic` / `drac` both match
  `/draconic-dragon-language`, two CS names for one page — pick one in a later batch, not now.
- `hylian64` — `hylian` already ships (batch 3); a second Hylian needs a variant call first.
- `galactic` / `galacticalphabetmedia` — both match `/standard-galactic-alphabet`; one page,
  two CS names. `futurama2` matched `/alphabet-alien-futurama` (that is **Alien Alphabet 1**,
  shipped as `futurama`); the real page is `/alphabet-alien-2-futurama` — correctable later.
- `ancientalien` / `ancienthylian` / `stargate_universe` — three CS names, one dCode page
  with only 9 static PNGs; needs a per-cipher comparison, not a blind toggle.
- `time` — false match: the anchor sits inside `code-signal-maritime`.
- `pigpen2` / `semaphore_*` / `glagolitic2` / `zodiac` — shipped families.

**Batch-5 risks to settle in Phase 2:**
1. **dCode inventories are not alphabets** (the Ogham lesson). `icons` vs `static` differ on
   several pages (dagger 26/9, dadaurka 26/9, nazcaan 36/9, ancientalien 36/9): the grid is
   populated but only some glyphs are published PNGs. Phase 2 downloads and counts; Phase 3
   runs the D17 letter-coverage test before any toggle is promised.
2. **Simlish's two-case rule** must reproduce Zodiac/Music's `up` handling: A–Z and a–z are
   distinct tiles with distinct art. 52 == 52 on both sides suggests it works, but the
   lowercase art has to be confirmed as separate images, not case-variants of one PNG.
3. **Shoes is the biggest single set yet** (75 glyphs, 13 non-alphanumeric keys, two-case).
   It reuses the Dragon Specials path (multi-character keys, spaced clicks) — if that path
   changed since batch 4, Shoes is where it shows.
4. **Fez's 4 dCode extras and Moon/Lunar's 1 extra** resolve against the source's own table
   in Phase 2, exactly as BotW's did.
5. **Size.** 367 new glyphs; bytes reported against the committed build as usual (no cap, D11).

**What I need from you:** ~~approve the ten, cut any, swap in alternates — and confirm the
batch size~~ — ✅ locked 2026-11-01 at all ten, batch size 10. Phase 2 runs on `shoes`.

**Phase 2 (batch 5) — extraction recipe, one cipher: `shoes`**
- [x] Confirm the live URL recipe: `https://i.cachesleuth.com/images/shoes/<file>`
- [x] Parse the descriptor: 75 planned (26 `uc/` uppercase + 26 lowercase + 10 digits + 13
  specials), matching the manifest's 75 exactly, 0 planned-not-in-manifest, 0 manifest-not-planned
- [x] Download every declared glyph into `/tmp/symstage/shoes/` — 0 would-404, 0 failed, 0 non-PNG
- [x] Count check: downloaded == descriptor-planned (75), PASS
- [x] dCode: none — Shoes is single-source by design (no dCode page)
- [x] Contact sheet: `reports/sheets/shoes.html` — 75 tiles, 0 dCode, 282 KB
- [x] **Fixed a regression in `dev/symbols/extract.mjs` found by this cipher** — see below

**Phase 2 (batch 5) results — `shoes`, 2026-11-01** *(✅ signed off 2026-11-01, "shoes look good!")*

- **Recipe confirmed:** `https://i.cachesleuth.com/images/shoes/<file>` serves the root
  letters/digits/specials and the nested `uc/*.png` uppercase set; 0 planned files would
  404, 0 downloads failed, all 75 are valid PNGs.
- **COUNT CHECK: PASS, exit 0** — planned 75 == downloaded 75, 75 unique files, 0 failed,
  0 unmapped. Composition: 26 uppercase (`uc/A.png` … `uc/Z.png`), 26 lowercase
  (`a.png` … `z.png`), 10 digits (`0.png` … `9.png`), 13 specials (`AE_umlaut`,
  `OE_umlaut`, `UE_umlaut`, `SZ_umlaut`, `_ae_umlaut`, `_oe_umlaut`, `_ue_umlaut`,
  `dot`, `comma`, `dash`, `exclamation`, `question`, `degree`).
- **The 13 specials are the source's own `otherchars`/`othernames` pairs** — German
  umlauts (Ä Ö Ü ß ä ö ü) plus seven punctuation marks, each backed by its own PNG.
- **Regression found and fixed in `extract.mjs`:** the batch-4 refactor of `planGlyphs`
  moved the lowercase-letter loop inside an `else if (desc.up)` branch, so every
  `up:"1"` cipher lost its lowercase set. Re-running the fixed extractor on the four
  shipped two-case ciphers reproduces their committed counts exactly (zodiac_killer 62,
  music 59, hylian 62, shoes 75) with 0 unmapped on all four. No shipped data changed;
  the fix only matters for batch 5's two `up:"1"` ciphers (shoes and simlish) and for
  any future re-stage of the shipped ones.
- **Contact sheet written:** `reports/sheets/shoes.html` (75 tiles, 282 KB) — the source's
  own table beside the grid we will ship, single-source with no dCode column.

**What I need from you:** ~~open `reports/sheets/shoes.html` and confirm the 75 tiles match
the source's own table~~ — ✅ accepted 2026-11-01 ("shoes look good!"). Phase 2 closed;
Phase 3 stages the whole batch of ten.

**Phase 3 (batch 5) — data layer, ✅ complete 2026-11-01**
- [x] Stage all 41 ciphers — the 31 shipped plus batch 5's ten; 41/41 count checks PASS
      (reconstructed each shipped cipher's staging flags from its committed data JSON and
      validated staged-vs-committed: glyph keys/labels, counts, artFrom/same/cases, dcode
      counts — all matched before install ran)
- [x] D17 letter-coverage test on the eight dCode candidates (below)
- [x] D19 same-alphabet calls on the eight (below) — all eight staged `--same`
- [x] `node --check` on touched files; install PASS (41 rows, all ready); build exit 0
- [x] Bytes reported against the committed build (D11)

**Phase 3 (batch 5) results — 2026-11-01**

- **Staging 41/41 PASS.** New counts: gerudo 26, simlish 52, outerrim 36, covenant 26,
  moon 26, lunar 26, rosicrucian 26, fez 36, rm4scc 38, shoes 75 = **367** (locked total ✓).
- **D17 coverage (live `$.cryptoarea.icons` per page):** gerudo 26/26, simlish 52/52,
  outerrim 26/26, covenant 26/26, moon 26/26, lunar 26/26, rosicrucian 26/26, fez
  **24/26 — `q` and `v` absent** (its 40 dCode icons are 24 letters + 10 digits + 6
  punctuation; CacheSleuth publishes the full 36). Fez's toggle would be refused by D17
  regardless of D19 — same situation as batch-4's chappe.
- **D19 same-alphabet calls: all eight are the same alphabet in both sources.** Evidence:
  side-by-side strips of CacheSleuth art (row 1) vs dCode art (row 2) composited on white
  plates — lunar shows the identical card-in-pocket motif (pixel similarity 0.91 median),
  gerudo the same arrow forms, moon/covenant/outerrim/rosicrucian the same shapes with
  different line weight, simlish the same line drawings in both cases (its two-case rule
  confirmed: CS uppercase art is 92x156 grayscale, lowercase 236x384 RGBA — genuinely
  different images, not case-variants). **All eight staged `--same`: CacheSleuth art ships,
  dCode's set is downloaded as evidence and not shipped, no source toggle.**
- **Batch 5 adds no toggles. Installed total stays 8** (pigpen, semaphore, dancingmen,
  aurebesh, zodiac_killer, klingon, hylian, ogham).
- **Two extractor fixes ship with this batch:** (1) the `planGlyphs` two-case regression
  found in Phase 2 (zodiac/music/hylian re-stage to their committed counts again); (2)
  `counts.extras` is now written only where true, so re-staging a shipped cipher keeps its
  committed counts byte-identical.
- **Shipped ciphers untouched:** the full re-stage transiently churned 25 committed JSONs
  (era-normalized `digraphs`/`extras` metadata) and gravity_falls_bill's dCode set had
  drifted on the live page (H/O gone, Z added) — all reverted; the commit carries only the
  ten new data JSONs + art, the catalogue (+10 rows), and `extract.mjs`. Catalogue diff is
  exactly 10 added rows, 0 removed.
- **Install:** **41 ciphers / 1,470 glyphs** (1,103 + 367); 10,689 KB of source art.
- **Build:** `index.html` **29,341,105 bytes** (27.98 MB), **+3,446,878 bytes (+3.29 MB)**
  over the committed 25,894,227. Bundle check: `glyphData` carries 41 ciphers, 1,470 tiles,
  **0** tiles without a data URL; shoes/simlish/gerudo/fez/rm4scc present with exact counts
  and no `dcode` block (the `--same` calls held).
- **Not verified:** no browser pass over the ten new nodes (Phase 4); contact sheets exist
  only for shoes (Phase 2); the eight same-alphabet calls rest on strip comparison, not a
  human eyeball over every glyph.

**Phase 4 (batch 5) — browser pass, ✅ 2026-11-01 (83/83 checks)**

Driven in real headless Chrome (Chrome for Testing 156, CDP) against `index.html` served by
`dev/serve.mjs`. Every check below ran against the shipped build, not the dev sources.

- **Panel:** boot splash clears, rail reads *Symbol ciphers 41*, list holds 41 rows, and
  search narrows to Shoes Code.
- **All ten nodes, per cipher:** tile count exact (26/52/36/26/26/26/26/36/38/75), captions
  byte-identical to the source's own labels, every tile carries a `data:image/png` data URL
  on its white plate, **0** missing tiles, foot reads *N glyphs*, and **no source toggle and
  no variant bar** — the D19 same-alphabet calls held for all ten. Fixed source label is
  `CacheSleuth` everywhere, matching `artFrom`.
- **Simlish (two cases):** 26 uppercase + 26 lowercase tiles; **every** lowercase tile's art
  differs from its uppercase twin; clicking `a` appends `a` (case is not folded), the
  preview shows the lowercase caption, and `A` after `a` appends as its own glyph (`aA`).
- **Shoes (specials):** all 13 special tiles present (`Ä Ö Ü ß ä ö ü . , - ! ? °`); umlaut
  lowercases use different art than their uppercase twins; clicking `ä` appends `ä` and the
  preview draws the umlaut glyph.
- **RM4Scc (start/stop):** the start and stop marks are tiles (`.` and `,`, CacheSleuth's
  own transcription); 26 letters + 10 digits + start + stop = 38; clicking the start mark
  appends `.` and the preview draws it.
- **Fez (suppressed toggle):** ships `q` and `v` from CacheSleuth (36 tiles) and shows **no
  source toggle** despite a dCode set existing — D17 refuses it because dCode lacks `q`/`v`.
- **Wheel (regression check on the new grids):** a real compositor wheel over a glyph grid
  scrolls the grid (`scrollTop 0 → 300 of 604`) with the canvas transform untouched, while
  the same wheel over bare stage still zooms. A real hit-tested mouse click on a tile
  transcribes it.
- **Screenshots reviewed:** panel (badge 41, Shoes row shows 75 glyphs with shoe icons),
  simlish (both cases drawn), shoes (umlauts and punctuation visible), lunar (moon-phase
  grid under the CacheSleuth label), rosicrucian, final canvas.

**Two failures on the first run were the harness, not the app:** my probe filtered fez's and
rm4scc's captions with lowercase regexes, but those ciphers key lowercase and caption with
the source's printed uppercase form (key `q` → label `Q`). Fixed in the probe; no product
code changed for Phase 4.

**Not verified:** a human eyeball over all 1,470 glyphs; the 31 pre-existing ciphers were not
re-checked (they were signed off in their own phases); no encode/decode roundtrip (OD-1 is
deferred).

**What I need from you now:** sign off Phase 4, or name anything you want re-checked. After
sign-off, batch 5 is fully shipped and the gate reopens for a batch-6 plan if you want one.

**Phase 1 (batch 6) — proposal only, no code, no artwork** *(proposed 2026-11-01, awaiting gate)*
- [x] Re-ran the candidate scan over all 308 CacheSleuth descriptors; 274 unshipped, 264
  extractable, **223 clean** (no font, no gap, planned == manifest files); dCode page
  matched for 68, 57 pages fetched with live icon/static inventories
- [x] Excluded shipped-family duplicates (dancingmen2/3, semaphore_* ×4, pigpen2 ×2,
  signlanguage_color, glagolitic2, zodiac, mayan1 "Mayan Numbers 2", hylian64,
  dragon/dragon2 — dovahzul already ships as dragon_skyrim)
- [x] Excluded 21 false sitemap matches (8-puzzle-solver, quantile-nombres, lattice-path,
  suite-conway, android-pattern-lock, flags, enigma-machine-cipher, game-of-life,
  mastermind-solver, letter-lines-cipher, code-parsons, code-signal-maritime,
  triangle-pascal, caesar-box-cipher, four/three/two-square solvers, barcode-planet ×2,
  resistor-color-code ×2, 7-segment-display, code-chappe, mirror-writing, barcode-postnet)
- [x] Resolved the two deferred calls from batch 5: **`galactic`** (one dCode page,
  two CS names — the first CS entry wins) and **`draconic`** (draconic/drac share a page;
  draconic is the fuller CS entry)
- [x] Selected ten with exact source counts

**Proposed ten (batch 6):**

| # | Cipher | id | glyphs | dCode page / inventory | why it earns a place |
|---|---|---|---|---|---|
| 1 | Elia | `elia` | **36** = a–z + 0–9 | ✓ `/elian-script`, 91 icons / 69 static | the largest dCode table in the scan; Elan Higgins' Elion script, indie-cipher favourite |
| 2 | Ballet | `ballet` | **35** = a–z + 0–9 (9) | ✓ `/alphabet-ballet`, 61/61 exact | the cleanest match in the scan; historical women's-symbol cipher |
| 3 | Stray | `stray` | **35** = a–z + 0–9 (9) | ✓ `/alphabet-stray`, 48 icons / 57 static | the game Stray's alphabet; franchise pick |
| 4 | Birds On A Wire | `birdsonawire` | **26** = a–z | ✓ `/birds-on-a-wire-cipher`, 26/26 exact | exact 26/26 on both sides |
| 5 | Tic Tac Toe | `tictactoe` | **26** = a–z | ✓ `/tic-tac-toe-cipher`, 27/27 | 1 extra to resolve, the moon/lunar pattern |
| 6 | Eternity | `eternity` | **26** = a–z | ✓ `/eternity-code-artemis-fowl`, 26 icons / 23 static | Artemis Fowl's Eternity Code; 3 static short — D17 decides |
| 7 | Galactic | `galactic` | **26** = a–z | ✓ `/standard-galactic-alphabet`, 27 icons / 22 static | Undertale/Men in Black SGA — the most-requested unshipped script; settles batch 5's two-CS-names call |
| 8 | Draconic | `draconic` | **36** = a–z + 0–9 | ✓ `/draconic-dragon-language`, 0 icons / 28 static | D&D Draconic; settles batch 5's pick-one call; 28 static may cover letters only |
| 9 | Anillo | `anillo` | **62** = A–Z + a–z (`up`) + 0–9 | ✗ no page | Tolkien's One Ring inscription; the batch's two-case single-source (zodiac/music path) |
| 10 | Alphabots | `alphabots` | **67** = A–Z + a–z (`up`) + 0–9 + 5 | ✗ no page | the biggest unshipped set; two-case + multi-key specials, the shoes-slot |

**Batch 6 total: 375 glyphs** (batch 5 was 367). Eight of ten have a dCode page; Anillo
and Alphabots are the deliberate single-sources. Phase 2 starter candidates: `ballet`
(exact 61/61 match, the least-risk extraction) or `alphabots` (the hardest set, shoes-style).

**Alternates if you want a swap:** Matoran `matoran` 36 (62 icons / 27 static), Nazcaan
`nazcaan` 36 (36/9), Dagger `dagger` 26 (26/9), Malachim `malachim` 26 (23/9), Templar
`templar` 26 (25/25), Window `window` 26 (24/24), Dorabella `dorabella` 26 (24/24),
Minimoys `minimoys` 26 (26/9), Ancient Alien `ancientalien` 26 (36/9 — needs per-cipher
comparison, not a blind toggle), Gravity Falls Author `gravity_falls_author` 26 (26/26) /
Journal `gravity_falls_journal` 26 (26/26 — same franchise as shipped bill, needs a variant
Call), Mandalorian/Ewok/Autobot/Decepticon/Sith 36 each (no page), Borg `borg` 52 (`up`),
Romulan/Maximal/Bynar 62 each (`up`), Blork `blork` 48 (`up`), Gardner `gardner` 46,
Murray Version 4 `murray1796` 41, Cybertronic `cybertronic` 40, Spintype `spintype` 40,
Blox `blox` 38, I Ching `iching` 64 (MULTI numeric keys 1–64 — the Babylonian path, well
exercised by now), Mary Queen of Scots `maryqueenofscots` 23, Tetragrammaton
`tetragrammaton` 20, Sumerian/Ugaritic/Orkhon/Etruscan/Hieratic/Egyptian 26 each
(ancient scripts, single-source), Solresol `solresol` 7 (musical do-re-mi cipher),
Meroitic Hieroglyphs `meroitan_hieroglyphs` 23 (27 icons / 8 static), Futurama 2
`futurama2` (its scan match is Futurama 1's page — needs the corrected
`/alphabet-alien-2-futurama` URL first).

**Batch-6 risks to settle in Phase 2:**
1. **Three dCode pages are short of static PNGs** (eternity 23/26, galactic 22/26,
   draconic 28/36): icons ≠ static again — Phase 2 downloads and counts, Phase 3 runs D17
   before any toggle is promised. A short page just ships single-source (fez/chappe rule).
2. **Elia and Stray have more static PNGs than the cipher needs** (69 vs 36, 57 vs 35) —
   extras resolve against the source's own table, as BotW's and Fez's did.
3. **Anillo and Alphabots are the second and third big `up` sets** — the two-case path is
   proven (zodiac/music/hylian/simlish/shoes) but 62–67 tiles double-check the tile-size
   rendering at the grid's upper end.
4. **Size.** 375 new glyphs; bytes reported against the committed build as usual (no cap, D11).

**What I need from you:** ~~approve the ten, cut any, swap in alternates — and name the
Phase 2 starter~~ — ✅ locked 2026-11-01 at all ten, batch size 10. Phase 2 runs on
`alphabots` (your pick — the hardest set, shoes-style).

**Phase 2 (batch 6) — extraction recipe, one cipher: `alphabots`**
- [x] Confirm the live URL recipe: `https://i.cachesleuth.com/images/alphabots/<file>`
- [x] Parse the descriptor: 67 planned (26 `alphabots_uc/` uppercase + 26 `alphabots_lc/`
  lowercase + 10 digits + 5 specials `! % & . :` named exclamation/percent/ampersand/
  period/colon), matching the manifest's 67 exactly, 0 planned-not-in-manifest,
  0 manifest-not-planned
- [x] Download every declared glyph into `/tmp/symstage/alphabots/` — 0 would-404,
  0 failed, 0 non-PNG (independent pre-check plus the extractor's own pass)
- [x] Count check: downloaded == descriptor-planned (67), PASS
- [x] dCode: none — Alphabots is single-source by design (no dCode page)
- [x] Contact sheet: `reports/sheets/alphabots.html` — 67 tiles, 0 dCode, 687 KB
- [x] Staged data verified: case-sensitive two-case keys (`A`/`a` distinct, distinct art
  paths), digits `0`–`9` at root, the 5 specials keyed by their own characters

**Phase 2 (batch 6) results — `alphabots`, 2026-11-01** *(✅ signed off 2026-11-02)*

- **Recipe confirmed:** `https://i.cachesleuth.com/images/alphabots/<file>` serves all
  three layouts — root digits/specials, `alphabots_uc/*.png` uppercase,
  `alphabots_lc/*.png` lowercase; 0 planned files would 404, 0 downloads failed, all 67
  are valid PNGs.
- **COUNT CHECK: PASS, exit 0** — planned 67 == downloaded 67, 67 unique files, 0 failed,
  0 unmapped. Composition: 26 uppercase (`alphabots_uc/A.png` … `Z.png`), 26 lowercase
  (`alphabots_lc/a.png` … `z.png`), 10 digits (`0.png` … `9.png`), 5 specials
  (`exclamation`, `percent`, `ampersand`, `period`, `colon`).
- **Two-case confirmed:** the set is case-sensitive (keys `A`–`Z` and `a`–`z` are distinct
  tiles with distinct art paths) — the zodiac/music/simlish/shoes `up` path, third big
  two-case single-source after Anillo-scale sets; the 5 specials are multi-key-style
  single characters, no Dragon-Specials spacing needed (all one char each).
- **Contact sheet written:** `reports/sheets/alphabots.html` (67 tiles, 687 KB) — the
  source's own table beside the grid we will ship, single-source with no dCode column.

**What I need from you:** ~~open `reports/sheets/alphabots.html` and confirm the 67 tiles
match the source's own table~~ — ✅ accepted 2026-11-02 ("looks good!"), reviewed over the
tailnet via a local HTTP server as in AGENTS-hosting.md. Phase 2 closed; Phase 3 stages the
whole batch of ten.

**Phase 3 (batch 6) — data layer, ✅ complete 2026-11-02**
- [x] Stage all 51 ciphers — the 41 shipped plus batch 6's ten; 51/51 count checks PASS
      (the shipped 41 were first re-staged and compared field-by-field to their committed
      JSON: **41/41 identical** — same keys/labels, counts, artFrom/same/cases, dcode count)
- [x] Batch-6 counts: alphabots 67, elia 36, ballet 35, stray 35, birdsonawire 26,
      tictactoe 26, eternity 26, galactic 26, draconic 36, anillo 62 = **375** (locked ✓)
- [x] D17 coverage and D19 same-alphabet calls (below)
- [x] `node --check dev/app.js`; `INSTALL: PASS` (51 rows, all ready); `node dev/build.mjs` exit 0
- [x] Bytes reported against a fresh baseline build (D11)

**Phase 3 (batch 6) results — 2026-11-02**

- **New machine, two build inputs rebuilt from the repo itself:** `/tmp/chefworker.js` was
  gone again (AGENTS.md: not committed), so it was recovered losslessly from the shipped
  `#engineGzip` blob. The recovery needs to split on *two* newlines — `dev/build.mjs` writes
  `worker + "\n" + HOOK` and the hook itself starts with one — and it must read the pristine
  committed file, not a build output. Verified: a rebuild of unchanged sources decompresses
  to an engine blob **byte-identical** to HEAD, with the glyph island and `metaData`/
  `testData` identical once the island's `generated` date is ignored. That rebuild is
  **52,063 bytes larger** than the committed file (different Node/zlib here), which is why
  every byte figure below is measured against the fresh baseline, not against `index.html`.
- **D19 — measured, then judged by eye, because the metric lied.** Headless Chrome
  correlated every CacheSleuth/dCode pair (48×48, composited on white). The numbers were
  unusable: tictactoe 0.014 and galactic 0.118 read as "different" while the strips plainly
  show the same shapes in a different line weight and aspect. So the call rests on the full
  side-by-side strips (`/tmp/pairs-<slug>.png`, all letters + digits per cipher):
  - **Same alphabet → `--same`, CacheSleuth art, no toggle:** ballet, birdsonawire,
    tictactoe, eternity, galactic.
  - **Genuine second implementation → toggle (D2/D17): `stray`.** 35/35 letters and digits
    covered, and every key is a visibly different glyph (CS `f` is a 4-shape, dCode's is a
    2-shape). This is the batch's only new toggle; installed total **9**.
  - **Different art, unusable coverage → no toggle, evidence kept:** `elia` (dCode keys 91
    icons, but only a scrambled 26 Latin letters and 43 **private-use** code points; no
    digits) and `draconic` (28 files, 18 distinct keys, 14/26 letters, 4/10 digits).
- **Host rule tightened for the elia trap (6 lines in `symbolToggleSources`):** the letter
  coverage test alone would have offered elia's toggle and captioned 43 tiles with
  untypeable private-use characters. A page that keys glyphs to `U+E000–U+F8FF` is now
  refused outright — the same class of guard as Zodiac's solved-mapping check. Verified
  against the shipped build: elia is refused, stray is offered, the other eight toggles are
  unchanged.
- **Install:** **51 ciphers / 1,845 glyphs** (1,470 + 375); 12,466 KB of source art.
- **Shipped ciphers untouched:** the full re-stage again churned 25 committed data JSONs
  (metadata normalisation) and gravity_falls_bill's dCode set had drifted on the live page
  (H and O gone, Z added) — all reverted to HEAD, including the extra untracked `char(90).png`.
  Catalogue diff is exactly 10 added rows, 0 removed; only `dev/app.js`, the catalogue,
  `index.html`, 10 data JSONs and 10 art directories change.
- **Build:** `index.html` **31,875,845 bytes** — **+2,482,677 bytes (+2.37 MB)** over the
  fresh baseline (29,393,168), and +2,534,740 over the committed file. Glyph island
  14,747,062 → **17,229,222 (+2,482,160)**. Bundle check: 51 ciphers, 1,845 tiles, **0**
  without a data URL, every tile a `data:image/png`.
- **Not verified:** no browser pass over the ten new nodes (Phase 4); contact sheets still
  exist only for alphabots (Phase 2); the D19 calls rest on the strips rather than a human
  eyeball over every glyph; elia and draconic keep their dCode art as recorded evidence even
  though no toggle can use it.

**Post-review corrections — 2026-11-02** *(reviewed all ten: eight accepted as shipped)*
- ✅ Accepted: alphabots, anillo, ballet, birdsonawire, galactic, tictactoe, elia, draconic.
  Two changes, both on your call:
- **`stray` now ships dCode's art** (`artFrom: "dcode"`, the CacheSleuth set is not shipped
  and there is no source toggle). That removes the batch's only new toggle: the installed
  total is back to the **8** it was before batch 6. Verified by running the shipped
  `symbolToggleSources` rule over the built island — 8 ciphers offer a toggle, and stray,
  elia and draconic are all `null`.
- **`eternity` art is ink-tight.** The source publishes 164×384 canvases with an 84×121
  drawing floating in them, and the host contains the *canvas* in a 30px tile, so the
  drawing rendered at ~7×9 px — the smallest shipped art was not a tile-size problem. New
  per-cipher `tightArt` flag in `install.mjs`: each shipped PNG is cropped to its ink box
  and centred on a square transparent canvas, pixels copied 1:1 with no resampling. Eternity
  now ships 95×95–265×265 squares whose ink fills the tile (~26 px tall instead of 9).
- `tightArt` is recorded in `dev/symbols/data/<slug>.json` like `same`/`cases`, and install
  reuses the committed flag when the staging tree predates it, so a rebuild cannot silently
  undo the treatment.
- Rebuild: `index.html` **31,824,061 bytes** — +2,430,893 over the fresh baseline
  (29,393,168), and 51,784 smaller than the pre-correction batch-6 build (stray's smaller
  dCode set + eternity's cropped canvases). Island 17,229,222 → **17,177,239**. Island
  check: **51 ciphers, 1,845 tiles, 0 without art**. Shipped drift (gravity_falls_bill's
  dCode page again) reverted.
- **Eternity measured in the tile, not on the canvas:** with the art square and tight, ink
  now draws at 26–27 px on its long axis (was 9 px). Every letter lands between 10×26 and
  27×27 px.
- **Damage during this step, recovered:** a `git clean -f dev/symbols/art` meant to drop one
  drifted PNG also removed the ten untracked batch-6 art directories. Re-running
  `install.mjs` from `/tmp/symstage` restored all of them (`INSTALL: PASS`, 51 dirs, 0 glyphs
  without art); nothing needed re-downloading, and no shipped cipher's art was lost.
- **Not verified:** no browser pass over eternity's new art — the pixel sizes above are
  measured from the shipped PNGs, not a rendered node. Phase 4 covers that.

**Phase 4 (batch 6) — browser pass, ✅ 2026-11-02 (112/112 checks)** *(✅ signed off 2026-11-02)*

Driven in real headless Chrome (Chrome for Testing 156, CDP) against the shipped
`index.html` served over the tailnet. No product code changed for this phase; the harness
lives in `/tmp` and ships nothing.

- **Panel:** boot splash clears, rail reads *Symbol ciphers 51*, the list holds 51 rows, and
  search *eternity* narrows it to one row.
- **All ten nodes, placed from the panel:** tile counts exact (67/62/35/26/36/36/26/26/35/26),
  captions byte-identical to the source labels, every tile a real PNG data URL (the base64
  payload is decoded and its signature checked), **0** missing-glyph placeholders, foot reads
  *N glyphs*, **no source toggle and no variant bar** on any of the ten, and every tile sits
  on its white plate.
- **stray ships dCode's art:** all 35 tiles are dCode's PNGs, **none** is a CacheSleuth file,
  and the fixed source label reads *dCode*. Clicking the first tile transcribes `a` and the
  preview draws that one glyph.
- **alphabots / anillo (two-case):** `A` and `a` are separate tiles with **different art**, and
  clicking one after the other transcribes `Aa` — case is not folded.
- **eternity, measured as rendered:** all 26 tiles decode; every canvas is square (95×95 to
  265×265), and the ink's long axis is **26–28 px** in the 30 px tile — it was 9 px before the
  crop. No tile is left near the old size.
- **Three harness failures on the first runs, no app defects:** the boot wait keyed off `#boot`,
  which reads as absent while a 31 MB document is still parsing (now waits for the rail);
  nodes were matched to ciphers by caption, which cannot separate the six a–z sets (now matched
  by art); and a 200-character minimum on data URLs rejected dCode's smallest tile, which is a
  126-byte PNG (now checks the decoded PNG signature).

**Not verified:** a human eyeball over all 1,845 glyphs; the 41 pre-existing ciphers were not
re-checked (signed off in their own phases); no screenshot review this pass — eternity's size
is measured from the rendered pixels rather than looked at.

**Sign-off — ✅ 2026-11-02** ("sign off Phase 4 and commit"): Phase 4 accepted. **Batch 6 is
complete** — all four phases signed off, **51 ciphers / 1,845 glyphs** shipped in `index.html`
at **31,824,061 bytes**. The commit carries `dev/app.js` (the elia private-use guard),
`dev/symbols/install.mjs` (`tightArt`), the catalogue, the ten data JSONs and their ten art
directories, and the rebuilt `index.html`. `reports/` stays local, as it always has in this
repo — the plan and contact sheets are review artifacts, not shipped files.

**Phase 1 (batch 7) — proposal only, no code, no artwork** *(✅ approved 2026-11-02, nine locked)*
- [x] Re-ran the candidate scan over all 308 CacheSleuth descriptors: **245 distinct unshipped
  candidates** (shipped slugs and the already-represented families removed), **213 clean** —
  no font, planned files exactly equal to the manifest, no gap. 19 descriptors carry a font,
  5 have a manifest gap, 3 use a list expression the extractor does not handle.
- [x] Matched dCode pages from the 2,050-URL sitemap and fetched each one to count its own
  inventory: templar `/templars-cipher` 25/25, dorabella `/chiffre-dorabella` 24/24,
  minimoys `/chiffre-arthur-minimoys` 9/9, matoran `/langage-matoran` 27/27. **No sitemap
  page exists for iching, borg, gardner, autobot or ewok** — five of the nine are
  single-source by the sources' own coverage.
- [x] Compared the rest of the 213 clean candidates and set nine against batch 6's mix of
  sizes, sources and franchise scripts; the ones that lost on variety are listed as
  alternates, not rejected on count.
- [x] Selected nine — 51 + 9 = **60 ciphers**, the round number asked for.

**Proposed nine (batch 7):**

| # | Cipher | id | glyphs | dCode page / inventory | why it earns a place |
|---|---|---|---|---|---|
| 1 | I Ching Hexagrams | `iching` | **64** = keys `1`–`64` | ✗ no page | the batch's only **multi-character numeric** set at scale (55 of the keys are two digits), the Babylonian path pushed to its limit |
| 2 | Borg | `borg` | **52** = A–Z + a–z (`up`) | ✗ no page | Star Trek's Borg; the batch's two-case entry (hylian/simlish/shoes path) |
| 3 | Gardner | `gardner` | **46** = a–z + 0–9 (10) + 10 specials | ✗ no page | the Gardner treasure-hunt cipher, 46 tiles and the largest mixed set here |
| 4 | Autobot | `autobot` | **36** = a–z + 0–9 (10) | ✗ no page | Transformers; franchise pick, exact 36/36 manifest |
| 5 | Ewok | `ewok` | **36** = a–z + 0–9 (10) | ✗ no page | Star Wars pick alongside the shipped Aurebesh and Kryptonian |
| 6 | Matoran | `matoran` | **36** = a–z + 0–9 (10) | ✓ `/langage-matoran`, 27/27 | Bionicle; the page is 9 short of CacheSleuth, so likely letters-only |
| 7 | Templar | `templar` | **26** = a–z | ✓ `/templars-cipher`, 25/25 | historical Templar cipher; the page is short exactly one glyph |
| 8 | Dorabella | `dorabella` | **26** = a–z | ✓ `/chiffre-dorabella`, 24/24 | Elgar's Dorabella; the cleanest 26-set on the clean list |
| 9 | Minimoys | `minimoys` | **26** = a–z | ✓ `/chiffre-arthur-minimoys`, 9/9 | Arthur and the Invisibles; dCode publishes only 9, the shortest page in the batch |

**Batch 7 total: 348 glyphs** (batch 6 was 375), taking the build from 51 to **60 ciphers /
2,193 glyphs**. Four of nine have a dCode page; after staging that is six single-sources (see
below), because matoran's page publishes no digits.

**What this batch is not:** unlike batch 6, **no new source toggle is promised**. Every page
found is short of CacheSleuth's declared set (templar 25 vs 26, dorabella 24 vs 26, matoran
27 vs 36, minimoys 9 vs 26), so under D17 none can be a second implementation — and dCode's
art is too incomplete to be the art source either. If Phase 2 finds a page is actually
complete, the call is made then, not assumed now.

**Batch-7 risks to settle in Phase 2:**
1. **`iching` is the multi-key test.** 64 keys, 55 of them two characters: the click separator
   must keep `1` then `0` as two tiles while `10` stays one, at a scale the Babylonian and
   Mayan sets never reached. This is the reason to start Phase 2 here or to start on templar
   and end here.
2. **`borg` is a 52-tile `up` set** — both cases are planned as distinct art; Phase 2 confirms
   A and a really differ (the zodiac/music/simlish check), not that a directory was reused.
3. **`gardner`'s 10 specials** are `otherchars` with their own names; Phase 2 resolves each
   key from the descriptor and the count check gates it at 46.
4. **Four short dCode pages** — evidence-only art is kept in `_dcode/`, as elia's and
   draconic's were, so a later review can see what was refused.
5. **Size.** 348 new glyphs; bytes reported against the committed build as usual (no cap, D11).

**Alternates if you want a swap:** Nazcaan `nazcaan` 36 (dCode 9/9), Malachim `malachim` 26
(9/9), Cybertronic `cybertronic` 40, Spintype `spintype` 40, Blork `blork` 48 (`up`),
Decepticon `decepticon` 36, Droid `droid` 36, Forerunner `forerunner` 36, Krakoan `krakoan` 26,
Precursor `precursor` 26, Riddler `riddler` 25, Gravity Falls Author `gravity_falls_author` 26 /
Journal `gravity_falls_journal` 26 (same franchise as shipped bill — needs a variant call),
Sumerian / Ugaritic / Orkhon / Hieratic 26 each, Meroitic Hieroglyphs `meroitan_hieroglyphs` 23,
Tetragrammaton `tetragrammaton` 20, Solresol `solresol` 7, Sign `sign` 42 (3 specials),
Ulog `ulog` 51 (15 specials), Geocache Attributes `geocacheid` 72 (not a cipher — an attribute
alphabet, included only for completeness).

**What I need from you:** ~~approve the nine, cut any, or swap in alternates — and name the
Phase 2 starter~~ — ✅ approved 2026-11-02 at all nine, no swaps, and Phase 2 runs on
**`iching`** (your pick — 64 tiles, the multi-key scale test, as alphabots was for two-case).

**Phase 2 (batch 7) — extraction recipe, one cipher: `iching`**
- [x] Confirm the live URL recipe: `https://i.cachesleuth.com/images/iching/<n>.png`
- [x] Parse the descriptor: 64 planned characters, **all of them `numbers`** — the list is
  `new Array("1",…,"64")`, not `nums` — matching the manifest's 64 files exactly, 0
  planned-but-absent, 0 manifest-but-unmapped
- [x] Download every declared glyph: 64/64, 64 unique files, 0 failed, 0 non-PNG
- [x] Count check: declared 64 == downloaded 64, **PASS** (extractor exit 0)
- [x] dCode: none — no page in the 2,050-URL sitemap
- [x] Contact sheet: `reports/sheets/iching.html` — 64 tiles, 0 dCode, 382 KB

**Phase 2 (batch 7) results — `iching`, 2026-11-02**

- **Keys are the source's own numbers:** `1`–`64` in order, caption equal to key — **9
  one-character keys** (`1`–`9`) and **55 two-character keys** (`10`–`64`).
- **Art:** all 64 tiles are PNGs on a uniform **346×384** canvas. That is near-square, so the
  tile's `object-fit: contain` keeps the drawing large — this set needs no `tightArt`, unlike
  eternity's 164×384 padding.
- **The multi-key path holds at this scale, tested against the shipped tokenizer:**
  `symbolTokens` was lifted out of `dev/app.js` by brace matching and run over the staged
  keys, not re-implemented. `"1"`→1 · `"10"`→10 · `"64"`→64 · `"1064"`→10, 64 ·
  `"1 0"`→1, gap, 0 · `"123"`→12, 3 · `"645"`→64, 5 · `"12 34"`→12, gap, 34. Longest key wins
  everywhere, and the space only separates.
- **The click separator round-trips:** clicking `1` then `0` writes `"1 0"` and segments as two
  glyphs with one `sym-gap` between them; clicking `64` writes `"64"` and stays one tile.
- **One thing to watch in Phase 4:** `0` is not a key in this set, so typing it draws the
  fallback character tile rather than a hexagram. That is correct — there is no key 0 — but it
  is the kind of thing a reviewer notices.
- **Nothing shipped:** the catalogue is still 51 and `index.html` still 31,824,061 bytes;
  install and build come once all nine are staged.

**Phase 2 (batch 7) — the remaining eight, staged 2026-11-02**
- [x] `borg`, `gardner`, `autobot`, `ewok`, `matoran`, `templar`, `dorabella`, `minimoys` all
  staged: **8/8 COUNT CHECK: PASS**, 0 planned-but-absent, 0 manifest-but-unmapped, 0 non-PNG
- [x] Counts: borg 52, gardner 46, autobot 36, ewok 36, matoran 36, templar 26, dorabella 26,
  minimoys 26 = **284**; with `iching`'s 64 the batch is **348 glyphs / 348 art files**
- [x] Contact sheets for the eight not generated yet — they are review artifacts, made on request

**Results and calls:**
- **`borg` (52):** A–Z + a–z with **all 26 case pairs on different art** — the two-case check is
  real, not a reused directory. Two canvases in play: 333×384 uppercase, 328×384 lowercase.
- **`gardner` (46):** the ten specials resolved from the descriptor itself —
  `space . , ! ? ^ : ; " '`. It ships **a space glyph**, so this cipher draws its own space tile
  (the braille path) rather than the host's separator gap.
- **`autobot` / `ewok` / `matoran` (36 each):** a–z + 0–9. **`templar` / `dorabella` /
  `minimoys` (26 each):** a–z.
- **dCode evidence, kept where pages exist:** templar 25 (`…I` then `K…` — the page has **no J**),
  dorabella 24 (no J, V), minimoys 9, matoran 27. Under D17 none of templar/dorabella/minimoys
  can be a second implementation.
- **`matoran` was the trap, and it is why the batch still promises no toggles.** Its dCode page
  covers **every letter** — so the letter-coverage test would have offered a source toggle — but
  the page has **no digits at all**, so switching would silently drop the ten digit tiles. It was
  therefore **staged without `--dcode`**: matoran ships single-source and no partial set can be
  offered. This is a real gap in `symbolToggleSources` (it tests letters, not digits); fixing it
  is a product change, not a staging one, and is not made here.
- **Ink as rendered in the 30px tile** (measured from the staged PNGs, same method as eternity's):

  | cipher | canvas | ink long axis | ink height |
  |---|---|---|---|
  | iching | 346×384 | 23 px | 23 px |
  | matoran | 384×384 | 23 px | 23 px |
  | borg | 333×384 / 328×384 | 19 px | 19 px |
  | templar | 384×384 | 18 px | 18 px |
  | minimoys | 384×384 | 16 px | 16 px |
  | autobot | 382×384 | 6–15 px | 13 px |
  | gardner | 924×384 | 27 px | 12 px |
  | dorabella | 384×384 | 9–16 px | 10 px |
  | ewok | 193–295×384 | 5–9 px | 9 px |

  `ewok`, `dorabella` and `autobot` sit in the same small-drawing range eternity was in before its
  crop, and `gardner`'s 924×384 canvases are wide rather than tall. `tightArt` is per-cipher and
  currently off for all nine; whether to turn it on is a call to make before Phase 4, not an
  assumption made here.
- **Not verified:** no contact sheet review yet for the eight; no install or build; ink figures
  are measured from the PNGs, not from a rendered node.

**Phase 3 (batch 7) — data layer, ✅ complete 2026-11-02**
- [x] Install all 60 — the 51 shipped plus batch 7's nine; **INSTALL: PASS**, every row ready
- [x] `dev/symbols/catalogue.json` 60 rows, 60 data JSONs, 60 art directories
- [x] D17 run over the built island: **8 toggles, unchanged** — the batch adds none, as promised
- [x] `node dev/build.mjs` exit 0; bytes reported against the fresh baseline (D11)
- [x] Island check: 60 ciphers, 2,193 tiles, 0 without art

**Phase 3 (batch 7) results — 2026-11-02**

- **Install:** `autobot` 36, `borg` 52, `dorabella` 26 (dCode 24), `ewok` 36, `gardner` 46,
  `iching` 64, `matoran` 36, `minimoys` 26 (dCode 9), `templar` 26 (dCode 25) — all PASS.
  **60 ciphers / 2,193 glyphs** (1,845 + 348), 13,923 KB of source art.
- **Shipped ciphers untouched:** the install churned 25 committed data JSONs cosmetically and
  gravity_falls_bill's dCode page had drifted again (the extra `char(90).png`) — all reverted to
  HEAD. The catalogue diff is exactly 9 added rows, 0 removed.
- **Build:** `index.html` **33,890,996 bytes** — **+4,497,828 (+4.29 MB)** over the fresh baseline
  (29,393,168) and **+2,066,935** over the batch-6 commit. Glyph island 17,177,239 →
  **19,244,174**.
- **Island, verified from the built file:** 60 ciphers, **2,193 tiles**, 0 without art, 0 payloads
  that are not PNGs. `iching` 64 tiles with **55 multi-key** keys; `borg` 52 with **26 case pairs
  on distinct art**; `gardner` 46 including its own **space glyph**.
- **Toggles:** exactly the **8** that existed before batch 7 — aurebesh, dancingmen, hylian,
  klingon, ogham, pigpen, semaphore, zodiac_killer. `templar`, `dorabella` and `minimoys` carry
  their dCode art as evidence and offer no switch; `matoran` has none at all.
- **`tightArt` stays off for all nine.** `ewok` (ink 5–9 px), `dorabella` (10 px tall) and
  `autobot` (6–15 px) are the same small-drawing case eternity was in, and `gardner`'s canvases
  are wide (924×384, 27×12 px in the tile). Turning the crop on is a per-cipher call not yet made.
- **Not verified:** no browser pass over the nine nodes (Phase 4); no contact sheets for the
  eight; the ink figures are measured from the staged PNGs, not from rendered nodes.

**Phase 4 (batch 7) — browser pass, ✅ 2026-11-02 (104/104 checks)** *(✅ signed off 2026-11-02;
pushed by you)*

Driven in real headless Chrome (Chrome for Testing 156, CDP) against the shipped
`index.html` served over the tailnet. No product code changed for this phase; the harness
lives in `/tmp` and ships nothing.

- **Panel:** boot splash clears, rail reads *Symbol ciphers 60*, the list holds 60 rows, the
  title badge reads 60, and search *iching* narrows it to one row.
- **All nine nodes, placed from the panel** and each matched to its cipher by its art: tile
  counts exact (64/52/46/36/36/36/26/26/26), captions match the source labels, every tile a
  real PNG data URL (decoded and signature-checked), **0** missing-glyph placeholders, foot
  reads *N glyphs*, **no source toggle and no variant bar** on any of the nine, the fixed
  source label reads *CacheSleuth*, and every tile sits on its white plate.
- **`iching`'s multi-key path, driven for real:** 55 two-character keys are tiles; clicking
  `1` twice writes `1 1` and the preview draws **1, gap, 1**; clicking `64` writes `64` and
  draws **one** glyph with no gap; typing `1064` reads **10, 64**; typing `1 0` reads
  **1, gap, 0**; typing `0` falls back to a character tile and no digit tile is captioned 0.
- **`gardner`'s space glyph:** the space tile is present and captioned `␣` like braille's,
  clicking it transcribes a space, and the preview draws **the space glyph rather than a gap**.
  Its ten specials are all tiles.
- **`borg`'s two cases:** `A` and `a` are separate tiles with different art, and clicking one
  then the other transcribes `Aa`.
- **Two failures on the first run were the harness, not the app:** it expected gardner's space
  caption to be a literal space and looked the tile up by `" "`, while `symbolDisplayLabel`
  prints `␣` for a whitespace-only key — the behaviour braille already relied on. Fixed in the
  probe; nothing changed for the product.
- **Not verified:** a human eyeball over all 2,193 glyphs; the 51 pre-existing ciphers were not
  re-checked; no screenshot review this pass; in-tile ink size is still measured from the PNGs
  rather than from the browser (the `tightArt` question for ewok/dorabella/autobot/gardner).

**Sign-off — ✅ 2026-11-02:** batch 7 accepted and pushed by you. **60 ciphers / 2,193 glyphs**
shipped at `ebdf7c3`, `index.html` 33,890,996 bytes.

**Phase 1 (batch 8) — proposal only, no code, no artwork** *(✅ approved 2026-11-02, ten locked)*
- [x] Re-ran the candidate scan against the 60-cipher catalogue: **236 distinct unshipped
  candidates**, **204 clean** (no font, planned files exactly equal to the manifest, no gap)
- [x] Checked the dCode sitemap for every proposed cipher and fetched the pages that exist:
  only `nazcaan` (9 icons / 9 static) and `malachim` (9/9) have one; the other eight have none
- [x] Selected ten — 60 + 10 = **70 ciphers**

**Proposed ten (batch 8):**

| # | Cipher | id | glyphs | dCode page / inventory | why it earns a place |
|---|---|---|---|---|---|
| 1 | Romulan | `romulan` | **62** = A–Z + a–z + 0–9 (`up`) | ✗ none | Star Trek's Romulan script; the batch's largest set |
| 2 | Bynar | `bynar` | **62** = A–Z + a–z + 0–9 (`up`) | ✗ none | Star Trek TNG; second 62-tile two-case set |
| 3 | Ulog | `ulog` | **51** = a–z + 0–9 + 15 specials | ✗ none | the specials stress test — 15 declared `otherchars`, more than any shipped set |
| 4 | Blork | `blork` | **48** = 24 letters in both cases (`up`, no q/x, no digits) | ✗ none | third two-case set; letters only |
| 5 | Murray Version 4 | `murray1796` | **41** = a–z + 0–9 + 5 | ✗ none | historical telegraph code, the batch's 19th-century pick |
| 6 | Cybertronic | `cybertronic` | **40** | ✗ none | sci-fi display alphabet, mid-size single-source |
| 7 | Spintype | `spintype` | **40** | ✗ none | geometric display alphabet, mid-size single-source |
| 8 | Nazcaan | `nazcaan` | **36** = a–z + 0–9 | ✓ `/nazcaan-alphabet`, 9/9 | the Nazca-line alphabet; page is 27 short, so single-source |
| 9 | Malachim | `malachim` | **26** = a–z | ✓ `/alphabet-malachim`, 9/9 | Agrippa's Malachim script; historical, page 17 short |
| 10 | Solresol | `solresol` | **7** = `a`–`g`, one per musical syllable | ✗ none | the smallest set in the app; the source keys its seven syllables `a`–`g` (do, re, mi…) |

**Batch 8 total: 413 glyphs** (batch 7 was 348), taking the build from 60 to **70 ciphers /
2,606 glyphs**.

**No new toggles again.** Only two of the ten have a dCode page and both publish 9 glyphs
against sets of 36 and 26 — no second implementation, and not enough art to serve as the art
source. As in batch 7, the promise is zero new source toggles.

**Batch-8 risks to settle in Phase 2:**
1. **Three `up` sets is 172 of the 413 tiles** (romulan 62, bynar 62, blork 48). The two-case
   path is proven, but each needs its case pairs confirmed on distinct art — the borg check.
2. **`solresol` is smaller than it looks.** Its descriptor declares `letters: "abcdefg"`, so the
   seven tiles are keyed `a`–`g`, one per syllable do–si, captioned A–G — no key is
   multi-character and the multi-key path is not exercised by this batch. Phase 2 confirms the
   syllable ordering against the source's own table so those captions are not misleading.
3. **`ulog`'s 15 specials** need each key resolved from `otherchars`/`othernames`, and the count
   check gates it at 51.
4. **Two Murrays exist** in the source (`murray1796` v4 41, `murray2007` v1 42). This batch takes
   Version 4 only; shipping both would be two tiles for one cipher family.
5. **Ink:** romulan/bynar/blork canvases are unmeasured; if they are padded like borg's the
   `tightArt` decision comes before Phase 4, not after.
6. **Size.** 413 new glyphs; bytes reported against the committed build as usual (no cap, D11).

**Alternates if you want a swap:** Maximal `maximal` 62 (`up`), Zeti `zeti` 62 (`up`),
Murray Version 1 `murray2007` 42 (3 specials), Sign `sign` 42 (3 specials; dCode
`/langue-des-signes-americaine` has 26/26 — but the shipped `signlanguage` may be the same table,
so it needs a family check first), Forerunner `forerunner` 36, Antiker `antiker` 36,
Illuminati `illuminati_1` / `illuminati_2` 36 each, Gravity Falls Author `gravity_falls_author` 26
(its dCode page publishes **80** glyphs, likely Author + Journal in one table — a variant call),
Krakoan `krakoan` 26, Precursor `precursor` 26, Riddler `riddler` 25, Sumerian / Ugaritic /
Orkhon / Hieratic 26 each, Meroitic Hieroglyphs `meroitan_hieroglyphs` 23, Tetragrammaton
`tetragrammaton` 20.

**What I need from you:** ~~approve the ten, cut any, or swap in alternates — and name the Phase 2
starter~~ — ✅ approved 2026-11-02 at all ten, no swaps. Phase 2 runs on **`romulan`** (your
pick — 62 tiles, the largest two-case set, so the case-pair check leads the batch).

**Phase 2 (batch 8) — extraction recipe, one cipher: `romulan`**
- [x] Live recipe confirmed: `https://i.cachesleuth.com/images/romulan/` — uppercase under `uc/`
  (`ucdir: "uc"`), lowercase and digits at the root
- [x] Descriptor: `letters: atoz`, `numbers: nums` → 62 planned, equal to the manifest's 62, 0
  planned-but-absent, 0 manifest-but-unmapped
- [x] Downloaded 62/62, **62 unique files**, 0 failed, 0 non-PNG
- [x] Count check: **PASS** (extractor exit 0)
- [x] dCode: none — no page in the 2,050-URL sitemap
- [x] Contact sheet: `reports/sheets/romulan.html` — 62 tiles, 0 dCode, 169 KB

**Phase 2 (batch 8) results — `romulan`, 2026-11-02**

- **Composition corrected against the proposal:** 62 is **A–Z + a–z + 0–9**, not letters only —
  the descriptor declares `numbers: nums` as well. 26 uppercase sit on 200×200 canvases under
  `uc/`, and the 26 lowercase plus 10 digits are 384×384 at the root.
- **All 26 case pairs are different art**, and all 62 files are distinct: the two-case check
  that leads this batch passes at the first attempt, with no same-art pair.
- Captions are the letter or digit itself (`A`–`Z`, `a`–`z`, `0`–`9`) — the `up` caption rule.
- **Ink as rendered:** long axis min **11px**, median **19px**, ink height median **13px**. This
  set is padded like borg's, so it is a `tightArt` candidate and the decision belongs before
  Phase 4, not after.
- **Not verified:** no sheet review yet; nothing installed or built.

**Phase 2 (batch 8) — the remaining nine, staged 2026-11-02**
- [x] `bynar`, `ulog`, `blork`, `murray1796`, `cybertronic`, `spintype`, `nazcaan`, `malachim`,
  `solresol` all staged: **9/9 COUNT CHECK: PASS**, 0 planned-but-absent, 0
  manifest-but-unmapped, 0 non-PNG
- [x] Counts: bynar 62, ulog 51, blork 48, murray1796 41, cybertronic 40, spintype 40,
  nazcaan 36, malachim 26, solresol 7 = **351**; with romulan's 62 the batch is
  **413 glyphs / 413 art files**
- [ ] Contact sheets for the nine not generated — review artifacts, made on request

**Results, and three composition corrections:**
- **`bynar` (62):** A–Z + a–z + 0–9 like romulan, and **all 26 case pairs are different art**.
  Canvases vary per letter (340–432 × 384), so it is not one uniform grid.
- **`blork` (48):** **24 letters in both cases — no `q`, no `x`, no digits**, exactly as the
  descriptor's own list says. All 24 case pairs distinct.
- **`ulog` (51) is the batch's real surprise:** a–z + 0–9 + **15 specials**
  (`ä ö ü ß ch ng sh th tsch c_ j_ th_ 10 11 12`) with **11 multi-key keys**. That is digraphs
  *and* two-digit numbers in one set, so iching's longest-key/space-separator rule applies again
  — and this time the competing keys overlap (`th` vs `th_`).
- **`murray1796` (41):** a–z + 0–9 + `. , ! - =`.
- **`cybertronic` (40) and `spintype` (40):** a–z + 0–9 plus four specials each, both including
  a **space glyph** — so two more ciphers draw their own space tile rather than a gap.
- **`nazcaan` (36)** dCode 9 (17 letters short) and **`malachim` (26)** dCode 9 with **all 26
  letters short** — that page's keys match no Latin letter at all, so there is nothing to switch
  to even if the art were complete. **`solresol` (7)** is `a`–`g`, one per syllable.
- **No new toggles**, as the plan promised: the only two pages are 9 glyphs each.
- **Ink:** measured for romulan (11–19 px) but **not yet for these nine**.
- **Not verified:** no contact sheets for the nine; nothing installed or built.

**Phase 3 (batch 8) — data layer, ✅ complete 2026-11-02**
- [x] Install all 70 — the 60 shipped plus batch 8's ten; **INSTALL: PASS**, every row ready
- [x] Catalogue 70 rows, 70 data JSONs, 70 art directories
- [x] D17 run over the built island: **8 toggles, unchanged**
- [x] `node dev/build.mjs` exit 0; bytes reported against the fresh baseline (D11)
- [x] Island check: 70 ciphers, 2,606 tiles, 0 without art

**Phase 3 (batch 8) results — 2026-11-02**

- **Install:** `romulan` 62, `bynar` 62, `ulog` 51, `blork` 48, `murray1796` 41,
  `cybertronic` 40, `spintype` 40, `nazcaan` 36 (dCode 9), `malachim` 26 (dCode 9),
  `solresol` 7 — all PASS. **70 ciphers / 2,606 glyphs** (2,193 + 413), **20,179 KB** of
  source art.
- **Shipped ciphers untouched:** 25 committed data JSONs churned cosmetically and
  gravity_falls_bill's dCode page had drifted once more (the extra `char(90).png`) — all
  reverted to HEAD. The catalogue diff is exactly **10 added rows, 0 removed**.
- **Build:** `index.html` **42,501,085 bytes**:
  - **+8,610,089 (+8.21 MB)** over the batch-7 commit (33,890,996) — this batch's own cost
  - **+13,107,917 (+12.50 MB)** over the pre-batch-6 baseline (29,393,168), the whole glyph
    layer's growth across 721 ciphers' worth of additions since then
- **Glyph island:** 19,244,174 → **27,854,247** (+8,610,073, matching the HTML delta to 16 bytes).
- **Island, verified from the built file:** **70 ciphers, 2,606 tiles**, 0 without art, 0
  payloads that are not PNGs. Per cipher: romulan 62, bynar 62, ulog 51, blork 48,
  murray1796 41, cybertronic 40, spintype 40, nazcaan 36, malachim 26, solresol 7.
- **Toggles:** exactly the **8** that existed before batch 8 — aurebesh, dancingmen, hylian,
  klingon, ogham, pigpen, semaphore, zodiac_killer. `nazcaan` and `malachim` keep their 9-glyph
  dCode sets as evidence and offer no switch.
- **Ink:** still measured only for romulan (11–19 px); the other nine are unmeasured, so the
  `tightArt` call is open for them.
- **Not verified:** no browser pass over the ten nodes (Phase 4); no contact sheets for the nine.

**Phase 4 (batch 8) — browser pass, ✅ 2026-11-02 (123/123 checks)**

Driven in real headless Chrome (Chrome for Testing 156, CDP) against the shipped
`index.html`. No product code changed for this phase; the harness lives in `/tmp`.

- **Panel:** boot splash clears, rail reads *Symbol ciphers 70*, the list holds 70 rows, the
  title badge reads 70, and search *solresol* narrows it to one row.
- **All ten nodes, placed from the panel** and each matched to its cipher by art: tile counts
  exact (62/62/51/48/41/40/40/36/26/7), captions matching the source labels, every tile a real
  PNG data URL, **0** placeholders, foot reading *N glyphs*, **no source toggle and no variant
  bar** on any of them, the fixed label *CacheSleuth*, and every tile on its white plate.
- **`romulan` and `bynar` (two-case):** 26 case pairs each, **all on different art**, and
  clicking `A` then `a` transcribes `Aa` — case is not folded.
- **`blork`:** no `q`, no `x`, no digits, and 24 distinct letters across 48 tiles — the
  descriptor's own limitation, confirmed in the UI rather than assumed.
- **`ulog` (the multi-key test):** 11 multi-character keys are tiles; `TH`, `TH_` and `TSCH` all
  coexist; `10`, `11`, `12` are tiles; 15 specials. Clicking `CH` then `A` writes `ch a` and the
  preview draws **CH, gap, A**. Typing `tsch` gives **one** glyph, `th_` gives **one** (not `th`
  plus something), `101` reads as **10, 1**, and `chng` as **CH, NG** — longest key wins, the
  space only separates.
- **`cybertronic` and `spintype`:** each ships a space tile, clicking it transcribes a space and
  the preview draws **the space glyph rather than a gap**.
- **`solresol`:** keys are `A`–`G` and the first tile transcribes `a`.
- **One failure on the first run was the harness, not the app:** it counted captions longer than
  one character, and `ß` uppercases to `SS`, so it read 12 multi-key keys instead of 11. Fixed to
  count declared keys; the `SS` caption is correct behaviour, now asserted separately.
- **Not verified:** a human eyeball over all 2,606 glyphs; the 60 pre-existing ciphers were not
  re-checked; no screenshots this pass; in-tile ink is still unmeasured for these ten, so
  `tightArt` remains open.

---

## 5. Files this will touch (pre-approved by approving the plan)

| Path | What |
|---|---|
| `dev/symbols/**` | new: data modules, registry, catalogue, extractor + sheet generators (authoring-time scripts) |
| `dev/build.mjs` | inline glyph data URLs into `index.html` |
| `dev/app.js`, `dev/styles.css` | new panel, node body, preview, toggle — written fresh |
| `index.html` | regenerated only, never hand-edited |
| `reports/sheets/*.html` | contact sheets, **local review artifacts, not committed** unless you ask.
  HTML rather than PNG: this repo has no image library and no browser to screenshot with, and
  an HTML sheet is zoomable and text-searchable (changed 2026-10-30 during Phase 2) |

Nothing else in the repo changes. `CACHESLUETH CODE LIST/` is read, never modified.

---

## 6. Open decisions (answer with your approval or changes)

All three taken at the defaults given below. Change any of them by editing this section.

- **OD-1 — encode/decode op.** ✅ *deferred.* This delivery is transcription only; no
  `Symbol cipher encode/decode` operation, so no `U+E000` placeholder code points anywhere.
- **OD-2 — licensing.** ✅ *proceed.* CacheSleuth's and dCode's glyph PNGs are inlined, which
  publishes their artwork inside the GitHub Pages build.
- **OD-3 — contact sheets.** ✅ *local-only*, written under `reports/sheets/`, not committed.

---

## 7. Risks

1. **The URL recipe is a hypothesis** until Phase 2 proves it on a live cipher.
2. **Font/CSS-rendered ciphers** may have no per-glyph PNG — those become single-source or are
   reported to you as not extractable (best-effort with a flag, per your call).
3. **dCode per-glyph extraction may not be possible**; the toggle then simply doesn't appear
   for that cipher, which is what D2 asks for anyway.
4. **PNG inlining grows `index.html`** (no cap per D11) — I report bytes per batch so it never
   becomes a surprise.
5. **Scope creep** — this file is the only place scope changes land (D8). If it isn't in §4, it
   isn't in the delivery.

---

## 8. What I need from you now *(re-plan gate — batch 1 is shipped)*

1. ~~Approve this plan~~ — ✅ done 2026-10-30.
2. ~~OD-1 / OD-2 / OD-3~~ — ✅ all taken at their defaults.
3. ~~Phases 1–5~~ — ✅ complete 2026-10-31. **Batch 1 committed as `5e691e0`**
   (pigpen, braille, semaphore, dancingmen, futhark): 5/5 count checks pass, sheets signed
   off with no flags, `index.html` 15,800,617 bytes (+1.19 MB over the committed file).
4. ~~Batch-2 decisions~~ — ✅ taken at the gate **2026-10-31**:
   - **Batch 2 locked:** Theban, Zodiac Killer, Aurebesh, Unown, Hexahue, Enochian
     (6 ciphers, 191 glyphs); 7-segment stays out — D16's missing `g` was never published.
   - **Batch size:** 6, no cap (D11 — bytes reported per batch as before).
   - **OD-1:** stays deferred — "it's fine how it is"; no encode/decode op this delivery.
   - **Sheet source column:** per-glyph PNGs + dCode cross-check, the batch-1 treatment;
     no live table-page fetch (none of the six publishes a composite table).
   Gate closed; batch 2 runs the same phases as batch 1. **Phase 2 (batch 2) started
   2026-10-31** on `zodiac_killer` — checklist in §4 above.

**Batch 8 follow-up — `stray` ships both cases, ✅ 2026-11-02 (your call)**

You reviewed the five dCode-art sheets and asked for `stray` to use dCode's version because it
publishes the lowercase letters as well. That is a re-stage, not a code change:

- `node dev/symbols/extract.mjs stray --dcode /alphabet-stray --art dcode --cases` →
  **57 glyphs, COUNT CHECK: PASS** (was 35).
- dCode's page publishes 57 icons: 26 uppercase, 22 lowercase, digits 1–9. Every upper/lower
  pair (22 of them) is **different art**, so the two cases are real symbols, not a caption
  change.
- The four lowercase letters dCode does not publish — **q, x, y, z** — are absent, not faked;
  its `$.cryptoarea.icons` stops at `char(119)` (w), so `char(113)` and `char(120)`–`(122)` do
  not exist. Uppercase covers all 26.
- `install.mjs` rewrote 25 committed JSONs and drifted `gravity_falls_bill`'s dCode art again;
  all restored to HEAD, and the drifted `char(90).png` removed. Only `data/stray.json`, 22 new
  `art/stray/_dcode/*.png` files and one catalogue row changed.
- Build: `index.html` **42,513,404 bytes** (+12,319), island **70 ciphers / 2,628 tiles**
  (2,606 + 22). `stray` is case-sensitive in the built data, all 57 tiles are PNG data URLs.
- Sheet regenerated: `reports/sheets/stray.html`, 57 ours + 57 dCode tiles.
- Not verified: no browser pass over the new stray node; the case toggle is tested only through
  the built data, not by clicking.

**Open:** the matoran Hexagon/Circle switch is blocked — dCode's page publishes only circle
files (62 icons), its encoder is hCaptcha-gated, and every guessed hex asset path 404s. Waiting
on the hex image URLs from a manual encode.

---

## 9. Batch automation contract — agreed 2026-11-02

**The word is "batch".** One instruction runs Phase 1 → 5 and ends in a commit, with no approval
gates. You review afterwards; anything the rules below cannot decide is *reported*, not asked
about mid-run. Batches stay the unit of work: one batch, one commit, one byte report.

### 9.1 Fixed parameters

| Parameter | Value | Changes when |
|---|---|---|
| Batch size | **15** | once the catalogue holds **100** ciphers → **25** |
| Order | alphabetical by slug, CacheSleuth manifest | — |
| Art source | CacheSleuth | a swap is proposed in the report, never applied silently |
| Commit | one per batch, sources + rebuilt `index.html` | — |
| Push | **never** in the run | you push |

Schedule from today's **70 ciphers / 249 unshipped manifest entries** (every one has at least one
file, none is empty):

| Batch | Size | Ends at |
|---|---|---|
| 9 | 15 | 85 |
| 10 | 15 | **100** → size changes here |
| 11 onward | 25 | 125, 150, … |

### 9.2 Candidate selection — no approval

1. Take the CacheSleuth `image_manifest.json` slugs not already in `catalogue.json`.
2. Drop any slug with no descriptor in `codes.js` or no manifest files.
3. Walk the rest alphabetically, staging each until the batch holds its size.
4. A slug that fails extraction, count check or the art-presence test is **logged with its reason
   and replaced** by the next candidate, so the batch still delivers 15.
5. `--dcode <page>` evidence is fetched whenever the cipher's dCode page exists (resolved once
   per slug and cached in the plan log); a page that is gone or captcha-walled is recorded and
   the cipher ships single-source.

Previously this list came to you as a proposal. It no longer does.

### 9.3 Automatic per-cipher decisions

These are the calls that used to be Phase-1 questions:

| Decision | Rule | Why |
|---|---|---|
| Art source | CacheSleuth, always, unless it cannot cover the declared set (then dCode with the gap recorded) | 65 of 70 shipped this way; dCode-art swaps were one-off reviews (stray, atlantis, unown, futurama, hexahue) |
| Source toggle (D17) | **on** iff dCode covers *every declared key* — letters, digits **and** specials — with no private-use keys | closes the matoran gap: letters-only coverage used to offer a toggle that dropped the digit tiles |
| Case split (`--cases`) | only when dCode art ships and ≥1 upper/lower pair differs by hash | a caption change is not a symbol; stray's 22 pairs all differ |
| `tightArt` | **on** when the drawing's rendered ink long axis in a 30 px tile is **< 12 px** | eternity's ~7–9 px was unreadable; the same measurement now decides instead of asking |
| Drops | none automatically | drops only arise with dCode art, which no longer ships by default |
| Notes (matoran-style) | none | that note was a one-off you asked for |

### 9.4 Gates that still block the commit (correctness, not feedback)

A run that trips any of these stops **before** committing, leaves `index.html` untouched and
reports the failure:

1. every staged cipher: `COUNT CHECK: PASS`, 0 missing art, 0 non-PNG
2. `install.mjs` churn contained — non-target data/art restored to `HEAD`, verified by hash
3. `node dev/build.mjs` exit 0
4. island check: catalogue rows == data files == art dirs, 0 tiles without art
5. sheet audit: every sheet tile equals the shipped PNG (the 70/70 pass from 2026-11-02)
6. `node dev/symbols/verify-source.mjs`: **0 CacheSleuth mismatches** (dCode drift is
   informational and never fails)
7. browser pass over every new node: tile count, captions, all tiles real PNGs, 0 placeholders,
   toggles exactly where the rule says, fixed-source label correct

### 9.5 Commit

**The run itself ends without a commit.** `dev/symbols/BATCH.md` is the checklist that runs; it
closes by asking for sign-off, and only a yes produces the commit. Message pattern
`Add the <n>th batch of symbol ciphers from the sources' own art.` with the batch's ciphers,
size change, `index.html` bytes and any blocked slug in the body. Sources and the rebuilt file
together; no push.

### 9.6 Report format

One table: cipher, glyphs, art files, dCode evidence, toggle yes/no, PASS. Then: bytes before →
after (+Δ), total ciphers/tiles, toggles added, blocked slugs with reasons, and what was **not**
verified. Plus a two-line "optional swaps" list where dCode's art is visibly the better set.

### 9.7 Prep before batch 9 (one-time, needs your OK)

Three small changes make the run honestly one-shot rather than me improvising:

1. **`symbolToggleSources` coverage fix** — test every declared key, not just letters (the
   matoran gap, and the reason that node has no switch).
2. **`dev/symbols/ink.mjs`** — the rendered-ink measurement as a committed tool, so `tightArt`
   is decided by a number rather than a judgement call.
3. **`dev/symbols/batch.mjs`** — stage → count-check → install → build → sheet in one command,
   printing the report table, so a batch is reproducible and does not depend on me remembering
   the flag order.

Until those land, "batch" still runs — just with the steps typed out by hand in the same turn.

### 9.8 What still comes back to you

Only four things, and none of them mid-run:

- the word "batch";
- a source page that has disappeared or become captcha-only (the cipher ships single-source and
  the report says so);
- a cipher whose art belongs to neither source — a third source is a licensing call, not mine;
- two consecutive batches tripping the same gate, which means a rule is wrong and needs changing.

**Batch 9 — first run under the automation contract, 2026-11-02**

Selected, staged, installed, built, sheeted and browser-checked without a proposal gate.
`dev/symbols/BATCH.md` was followed end to end; nothing was committed.

- **Selection (15):** alienlanguage, alphabetcode, amohibia, ancientalien, ancienthylian,
  andorian, antiker, antilife, aquarius, arcadian, astronomy, ath, baal, baaldiagonal,
  backslash — alphabetical from the manifest, `bacon` skipped (no descriptor).
- **Largest first:** `alienlanguage` (36 files) staged alone and passed before the other fourteen
  were touched.
- **Skipped:** `25paircode` — `extract.mjs` cannot parse its descriptor expression
  `["1","2",…,"25"]` (`listOf` handles `atoi`/`split`/`new Array`, not a raw array literal).
  Replaced by `backslash`; the parser gap is a follow-up, not a batch failure.
- **dCode:** no page found for any of the fifteen under `/<slug>`, `/langage-<slug>` or
  `/alphabet-<slug>`, so all fifteen ship single-source with no toggle. Recorded, not guessed.
- **Counts:** 15/15 `COUNT CHECK: PASS`, **420 glyphs** (36/36/26×10/16/36/36), 0 missing art.
- **Install/build:** catalogue 70 → **85**, island **3,048 tiles**, `index.html`
  **47,470,179 bytes** (+4,956,083). Churn outside the batch restored; 1 untracked drift file
  removed from `gravity_falls_bill`.
- **Sheets:** 15 generated, `85` in `reports/sheets/`; every sheet reads `N ours, 0 dCode`.
- **Checks:** island 0 tiles without PNG; `verify-source` **2,843 / 2,843**, 0 mismatched,
  PASS; browser pass **199/199** after correcting two of my own assertions (panel search is a
  substring match, so `ath` also lists `botw` and `baal` lists `baaldiagonal` — the app was right).
- **Not committed** — awaiting sign-off, per §9.5.

**Batch 9 amendment — `tightArt` actually applied, 2026-11-02**

The ink measurement (run because BATCH.md requires it) found three ciphers under the 12 px rule:
`andorian` 4.5 px, `baaldiagonal` 5.2 px, `antilife` 9.3 px. Applying it exposed a real bug:
`install.mjs`'s `decodePng` handled only 8-bit RGB/RGBA, and 355 of the batch's 420 glyphs are
**colour type 3 (palette)**, so `tightenPng` returned null and `tightArt` had always been a
silent no-op on palette art.

- Fixed `decodePng` to expand palette PNGs (depths 1/2/4/8, with `tRNS` alpha) to RGBA before the
  ink box is measured; non-palette paths untouched.
- Re-installed: `andorian` 730×384 → cropped square, ink **4.5 → 26.4 px**; `antilife`
  341×384 → ink **9.3 → 26.4 px**; `baaldiagonal` already cropped at 26.4 px.
- `eternity` (the only other `tightArt` cipher) was re-cropped by install and **restored to HEAD**,
  verified byte-identical — the fix changes no shipped art outside this batch.
- `index.html` **47,483,139 bytes**; island 85 ciphers / 3,048 tiles / 0 non-PNG; sheets for the
  three regenerated; browser pass **199/199** again.
- Follow-up: this decoder gap is why the previous `tightArt` decisions (ewok, dorabella, autobot)
  were "measured, not applied" — they deserve a re-measure with the fixed tool.

**Phase 1 (batch 10) — selection, 2026-11-02** *(no approval gate: BATCH.md §1)*

Batch size **15** (catalogue held 85 < 100 when the batch opened; the 100-cipher rule now puts
the next batch at 25). Candidates are manifest slugs not yet shipped, alphabetically:

- **bacon** — skipped, no descriptor in `codes.js` (`grep -c` 0). Not a cipher we can key.
- **barcode39** — staged, then **dropped**: its descriptor declares a `space` glyph
  (`otherchars:new Array(" ")`) that CacheSleuth never publishes (`space.png` is absent from the
  manifest), so `COUNT CHECK: FAIL` at 37 declared / 36 files. Replaced by `chappe2`, then
  `chappe3` and `chinesecode` were staged as spares and **not** shipped.
- **Shipped 15:** 25paircode, baku, beams, beardedmen, blokscript, blox, book, box, brahmi,
  builder, caps, centaur, centauri, chainofdeath, chappe2.

**Extractor gaps found (tool fix, not batch improvisation).** Three descriptor list shapes that
the site allows had never been parsed, because no earlier batch used them:

- `othernames:new Array("space","period"),indexImage:"b.png"` (blox) — the field parser keeps the
  attribute that follows the list, and the `new Array` branch was anchored to a trailing `)`, so
  it threw. `listOf` now balances parentheses from the opening one, skipping quoted strings
  (braille's list contains `(` and `)` as entries of their own), and reports the tail as ignored
  metadata — the same treatment `atoz,indexImage:` already had.
- `numbers:["1","2",…,"25"]` (25paircode) — a bare array literal, now read as a character list.
  This is the same class as batch 9's `["1",…,"25"]` note, which had been papered over by
  dropping the cipher; it is a parser gap, not a cipher problem.
- `letters:atoz.concat("_")` (chainofdeath) — a base list with extras, now supported.

**dCode lookup — `dcode-find.mjs` per cipher, all staged first so the real keys are known.**
Fourteen of fifteen returned `NO PAGE`: nothing in the 2,050-URL sitemap shares their name
(baku, beams, beardedmen, blox, box, brahmi, builder, caps, centaur, centauri), or the pages that
do share a name are different ciphers — `blokscript` closest is `/elian-script` at shape 0.32
against the 0.65 gate, `chainofdeath` only reaches "Markov Chain", `book` reaches "Book Cipher"
with 0 glyphs, `25paircode` shares its plan with QR/T9/BCD pages at 0 coverage.

`chappe2` returned `SELECTED /chappe-code` — and that is a **false positive worth recording**: the
name gate scores "Chappe 2" against "Code Chappe" at 1.00 because `code` is a stopword and the
numeral is dropped, so it cannot tell a numbered variant from its predecessor. Staging it proved
the page is not the alphabet: `extract.mjs --dcode /chappe-code` harvested **4** glyphs
(`+`, `3`, `.`, `U+0004`) instead of 26. Re-staged single-source, no toggle. A variant-suffix
awareness in `dcode-find.mjs`'s name gate is a follow-up, not a batch failure.

**Phase 2 (batch 10) — install and build, 2026-11-02** ✅

- `INSTALL: PASS`, 100 rows, 15/15 `COUNT CHECK: PASS`, **437 symbols** added, 0 missing art.
- Catalogue 85 → **100**; island **3,485 tiles**; `index.html` **56,539,794 bytes** (+8,613,519 —
  the largest single-batch jump, driven by blox/book/brahmi's art weight: 30,403 KB).
- Churn outside the batch restored by hash (`data: 0 shipped changes`, `art: 0 shipped changes`);
  two untracked leftovers removed — `art/barcode39/` + `data/barcode39.json` (from the dropped
  cipher) and `art/gravity_falls_bill/_dcode/char(90).png`.
- First install pass reported 101 rows because the failed `barcode39` stage directory was still in
  `/tmp/symstage` and got installed; caught by the `FAILED:` line, cleaned, re-installed.

**Phase 3 (batch 10) — verification, 2026-11-02** ✅

- **Sheets:** 15 generated, 100 in `reports/sheets/`; each reads `N ours, 0 dCode`.
- **`verify-source`:** PASS — **3,280 glyphs byte-identical** to the live CacheSleuth source,
  0 mismatched, 0 unreachable, 205 keyed to dCode art.
- **Browser pass (shipped `index.html` over CDP):** **180/180**. Panel and rail read 100; all
  fifteen place and match their art; every tile count equals its data file; captions equal the
  source labels; 0 placeholders; feet read `N symbols`; no source toggle and no note on any of
  them; first-tile transcription correct on all fifteen; multi-key paths hold —
  `25paircode` reads `12` as one symbol and `2525` as `25` twice, `brahmi` reads `1000` as one
  symbol and `1020` as `10,20`, `chainofdeath` draws `a_b` as three symbols.
- **Not committed** — awaiting sign-off, per §9.

**Phase 4 (batch 10) — dCode shape pass over the whole symbol catalogue, 2026-11-02** ✅

The name and slug checks (Phase 3) say none of the fifteen has a dCode page. That reasoning has one
hole — a page publishing the same art under an unrelated name, the Ancient Hylian failure — so this
phase compares art directly against dCode's entire symbol catalogue: `/symbols-ciphers`,
**156 entries**, of which **145** carry usable glyph art. Eleven publish no `<img class="glyph">` at
all and therefore cannot be compared (or bound to a toggle): `gold-bug-poe`, `tom-tom-code`,
`mac-option-key-cipher`, `ideograms`, `code-claw-gregor`, `telugu-language`, `domino-reader`,
`thai-language`, `sanskrit-language`, `malayalam-language`, `substitution-cipher`.

**The 0.65 shape gate is not valid as an absolute test.** Calibrated against pairs whose answer is
known: `pigpen` ↔ `/pigpen-cipher` **0.48** and `hylian` ↔ `/hylian-language-skyward-sword`
**0.60** — both true, both below the gate — while `beardedmen` ↔ `/hexahue-cipher` scores **0.85**
and is plainly false (painted bearded faces against flat 3x2 colour blocks). Dense art against dense
art inflates IoU; thin strokes against thick deflate it. The gate is only meaningful as a relative
ranking among name-plausible candidates, which is how `dcode-find.mjs` uses it.

The pass therefore grades each cipher with a permutation test: every one of our keys is scored
against every glyph on the page, and counted when its own key wins on shape.

| cipher | page | self-top | own vs other key | verdict |
|---|---|---|---|---|
| `box` | `/rosicrucian-cipher` | **11/26** | 0.69 vs 0.69 | inconclusive — true-pair territory |
| `beardedmen` | `/hexahue-cipher` | 1/26 | 0.85 vs 0.85 | false — no key identity |
| `blokscript` | `/gravity-falls-colors` | 1/26 | 0.77 vs 0.77 | false |
| `builder` | `/knot-notation` | 0/26 | 0.75 vs 0.79 | false — another key matches better |
| `beams` | `/eternity-code-artemis-fowl` | 0/17 | 0.65 vs 0.89 | false |
| `25paircode` | `/illageralt-alphabet` | 1/25 | 0.76 vs 0.95 | false |
| *pigpen* (control) | `/pigpen-cipher` | 12/27 | 0.48 vs 0.41 | true |
| *chappe* (control) | `/alphabet-chappe` | 23/36 | 0.68 vs 0.64 | true |
| *matoran* (control) | `/matoran-language` | 26/36 | 0.84 vs 0.84 | true |
| *pigpen* (control) | `/hexahue-cipher` | 1/27 | 0.27 vs 0.34 | false |

Fourteen of the fifteen are clean negatives at this level. The five flagged pairs were also inspected
side by side: faces against colour blocks, outlined brackets against solid colour squares, wedges
against Dotsies dots, ruled rectangles against tally marks, twisted-pair cable drawings against
Illageralt glyphs — visibly different alphabets that merely share ink density.

**`box` is the one live candidate and is not resolved here.** Its 26 dotted corner-bracket glyphs
(thin strokes) track `/rosicrucian-cipher` (thick strokes, 52 glyphs) row for row on bracket
orientation and dot count, and its self-top of 11/26 sits beside the true pigpen control's 12/27.
Against `/pigpen-cipher` it scores 2/26 (0.35 own vs 0.56 other) and against `/tic-tac-toe-cipher`
1/26, so it is not either of those. But a same-table pair lands at 23–26/36 (chappe, matoran), and
11/26 is roughly half — part genuine tie noise, since four of its glyphs are near-identical to a
neighbour (`d~e` 0.91, `e~f` 0.93, `n~o` 0.91, `w~x` 0.93), but not all. Either the letter→shape
assignment differs or the stroke-weight gap is defeating the comparison. That is a human call on the
sheet; it is not recorded as a match and `box` still ships single-source (`dcode: null`).

One correction to the Phase 3 note above: `/chappe-code` publishing "only 4 glyphs" was an extractor
gap, not evidence against the page. Its alphabet is served as `$.cryptoarea.icons`, which
`extract.mjs` reads only with `--dcode-icons`; with the flag it yields 92 glyphs, 26 letter-keyed.
`chappe2` stays single-source for a different reason — its A–Z is not the table `/alphabet-chappe`
publishes, and which page CacheSleuth's "Chappe 2" actually follows is still unidentified.

The pass itself is authoring-side only (`/tmp/shapepass.mjs`, art cached in `/tmp/shape-art`); no
committed tool changed, and no cipher's data file was altered by it.

**Phase 1 (batch 11) — selection, staging, install and build, 2026-11-03** ✅

Batch size **25** (the catalogue held 100 when the batch opened, so the 100-cipher rule applies).
Candidates are manifest slugs not yet shipped, alphabetically:

- **bacon** — skipped, no descriptor in `codes.js`.
- **barcode39** — dropped again: 37 declared (its descriptor declares a space) against 36 published,
  `COUNT CHECK: FAIL`. Replaced by **devanagari**, the next candidate.
- **Shipped 25:** chappe3, chinesecode, chocolate, circle, circles, circularglyphs, cistern,
  clutter, code_s, codescript, coldcode, color, colorhoney, colormusic, colorsquares, colortokki,
  conway, dadaurka, dagger, dancingmen2, dancingmen3, deadspyscrawls, decepticon, demonscript,
  devanagari.

**dCode lookups (`dcode-find.mjs`, each after staging so the declared keys are real).** Nineteen of
twenty-five return `NO PAGE`. Four pages were found, and only one ships as a source:

- `circularglyphs` → `/circular-glyphs-alphabet`, 37/37 keys, art 0.88 (name gate 0.67, art gate
  decides). **The batch's only source toggle.**
- `dancingmen3` → `/dancing-men-cipher`, art **0.84** over 52 keys — genuinely the same set, but the
  page publishes **one case**: 26 glyphs against 52 declared. The toggle rule counts letters, not
  case pairs, so it would offer a switch that halves the grid. Staged **single-source** and the
  evidence removed, the same call made for `matoran` (plan §8). The rule gap is the one recorded
  there and is still open.
- `chappe3` → `/chappe-code` selects on name agreement 1.00 (the variant-number blind spot already
  recorded for `chappe2`), but its digits measure **0.10** median dilated IoU against ours — a
  different Chappe table. Evidence kept (4 glyphs, no key coverage), no toggle.
- `dagger` → `/daggers-alphabet`, 26/26 by inventory but only **9** glyphs extractable
  (`SECRTMAGI`), so coverage fails and no toggle is offered.

**Counts:** 25/25 `COUNT CHECK: PASS`, **705 symbols**, 0 missing art, 0 non-PNG.

**`tightArt`:** off for all 25. Rendered ink long axis in a 30 px tile runs 15.8–28.1 px (median per
cipher); the smallest single glyphs (`clutter` 5.5, `decepticon` 7.2, `coldcode` 7.6) are outliers in
otherwise large sets, and the flag is per cipher.

**Install:** `install.mjs` rebuilds `catalogue.json` from the staging tree alone, and the tree had
been cleared at the start of the run, so the first pass wrote **26 rows** and built a 17 MB page. Data
and art were already complete (125/125); the catalogue was restored from `HEAD` and the 25 rows merged
in install's own shape, then the page rebuilt. **This is a runbook hazard**: BATCH.md §4's restore step
protects shipped data/art but not the catalogue, which is regenerated wholesale.

Churn outside the batch: **0** shipped data changes, **0** shipped art changes. The `barcode39`
leftovers from the failed stage (untracked `data/barcode39.json`, `art/barcode39/`) were removed.

**Build:** `index.html` 29,951,869 → **32,339,438 bytes** (+2,387,569); island **125 ciphers /
4,190 symbols**.

**Verification:** sheets for all 25 (125 in `reports/sheets/`); `verify-source` **3,985 glyphs
byte-identical**, 0 mismatched, 0 unreachable; browser pass **256/256** over the shipped page — all
25 place from the panel, tile counts and captions match, every tile a real PNG, 0 placeholders,
feet read `N symbols`, the toggle appears on `circularglyphs` alone, first-tile transcription correct
on all 25. The toggle switch itself was driven with a real CDP press/release (`/tmp/toggle-probe.mjs`):
37 dCode tiles, caption `␣`. A synthetic `MouseEvent` does **not** flip it — that was the harness,
not the app.

**Tool gap found, not fixed:** `install.mjs`/`verify-source.mjs` `decodePng` uses `w * ch` as the
palette row stride, which is only right at 8-bit depth; sub-byte palette art (depth 1 and 4 — `color`
27 glyphs, `colormusic` 12, `cistern` 24, `circularglyphs` 1) fails to decode, so those sets cannot
be ink-measured or tightened. Same class as the palette gap fixed in batch 9.

**Not committed** — awaiting sign-off, per §9.5.

### Batch 11 review fixes (2026-11-04)

Two ciphers changed after the user's sheet review; nothing else in the batch moved.

- **coldcode** — zoomed. Its CacheSleuth art is a 101x384 canvas with the drawing floating in
  it (ink 22x100 to 53x280), so a 44 px sheet tile drew the glyph 11–32 px tall and the app's
  30 px tile drew it 7.6–21.9 px. Re-staged with `tightArt`, which crops to the ink box and
  centres it on a square (install.mjs's existing treatment, as for eternity): the sheet now
  draws every glyph at 38.6–38.8 px of its 44 px tile, and the packed art the node serves fills
  the tile (ink share 1.00). CacheSleuth keys/labels unchanged — verifier: 26/26 ink-tight.
- **circularglyphs** — no toggle. Compared the two sets glyph by glyph off the sheet: dCode's
  32x32 icons are the same drawings as CacheSleuth's 422x384 canvases (A, K, 3 all confirmed
  side by side). Marked `same` at staging, so the second set is evidence only: `dcode` dropped
  from `data/circularglyphs.json`, `_dcode/` art removed, catalogue row back to
  `source: "cachesleuth"`. Verifier: 37/37.

Touching that also had to be safe: `install.mjs` now takes slugs
(`node dev/symbols/install.mjs coldcode circularglyphs`), installing only those and patching
only their catalogue rows — staging holds the whole batch, and the old full rewrite is how the
catalogue got clobbered earlier in this batch. `BATCH.md` §4/§5 says so.

`index.html` rebuilt: 32,326,013 bytes (was 32,340,174; the 37 dCode PNGs are what left).

---

## Batch 12 — 25 ciphers (catalogue 125 → 150)

**Phase 1 (batch 12) — selection.** Manifest order, alphabetically, skipping slugs with no
CacheSleuth descriptor: `bacon` (no descriptor), `fiveneedletelegraph` (no descriptor).
Then two count-check failures during staging, dropped and replaced by the next candidates:

- `barcode39` — 37 declared / 37 downloaded but COUNT CHECK FAIL (duplicate key plan).
- `doctor` — 26 declared / 25 downloaded (one glyph has no file in the manifest).

Batch: dinotopian, dli, dna, dniletters, dninumbers, doop, dots, drac, dragon, dragon2, drazi,
droid, dwemeri, efkolia, egyptian, etruscan, fabrini, fairy, fakoo, fennim, ferengi, flags,
fonic, forerunner, foursquare.

**Phase 2 (batch 12) — largest first.** `fennim` (62 files) is the largest in the batch:
`dcode-find` → NO PAGE, staged single-source, 62/62, COUNT CHECK PASS.

**dcode-find ordering.** The lookup reads the declared keys from `dev/symbols/data/<slug>.json`
or `/tmp/symstage/<slug>/cipher.json`. Run before staging, it reports
`declared keys : unknown` and can only conclude from names — for 24 of this batch's 25 that
printed a `NO PAGE` that was not yet evidence. Re-running it after staging (keys known) is the
correct order and is what this batch's verdicts are based on. Only one page in the whole batch
was found: `dinotopian` → `/dinotopia-alphabet` (36/36 keys, title agrees) — the one cipher
with a second set (it was installed with the toggle, then reviewed and switched to dCode's art
alone; see the review-fix note at the end of this section).

Fixed after the batch in `dev/symbols/dcode-find.mjs`: with no shipped and no staged set it now
runs `extract.mjs` for the cipher itself and stops loudly if staging fails, so the premature
`NO PAGE` cannot be produced by getting the order wrong again (`--no-stage` restores the old
keys-only behaviour). Verified on `gnommish`, which now reports `28/31 — missing "äöü"` against
`/gnommish-alphabet` instead of a bare `NO PAGE`.

**Ink-tight gate.** Measured every staged glyph's rendered long axis in a 30 px tile: medians
12.6–28.1 px, none under the 12 px gate, so `tightArt` stayed off for all 25.

**Review fix — `dinotopian` drawn from dCode.** Reviewed against CacheSleuth's grid, the two
sources publish the same 36-character alphabet (same drawings, same keys); dCode's icons are
simply the bigger raster. So the cipher ships one set, dCode's: re-staged with
`extract.mjs dinotopian --dcode /dinotopia-alphabet --art dcode`, installed as a subset, and
now `artFrom: "dcode"`, `dcode: null`, catalogue `source: "dcode"`, no source toggle — the same
shape as `stray`. `verify-source.mjs dinotopian --dcode` reports `dCode art, 36 glyphs` with
`dCode 36/36` matched to the live page. The shipped art is `art/dinotopian/_dcode/*`.

Measured in the tile's own 44 px box (drawing fitted, ink box long axis): dCode's median is
**39.0 px** against CacheSleuth's **26.3 px** for the same 36 keys — CacheSleuth's drawings float
inside 343×384 canvases where dCode's 25×32 icons are almost all ink, which is the size
difference the review saw. In the shipped node all 36 tiles measure dCode's ink (0 match
CacheSleuth), so what draws is the chosen set. `index.html` rebuilt: 35,434,684 bytes
(was 35,507,790).

---

## Batch 13 — 25 ciphers (catalogue 150 → 175)

**Phase 1 (batch 13) — selection, staging, install and build, 2026-11-04.** N = 25 (the
catalogue is over 100, so the batch size is 25). Candidates are manifest slugs not yet in the
catalogue, alphabetically, `N` taken after skips:

- `bacon`, `fiveneedletelegraph` — no CacheSleuth descriptor (`grep` on codes.js returns 0), the
  same two batch 12 passed over.
- `barcode39` — 37 declared / 36 in the manifest (`space.png` would 404), COUNT CHECK FAIL. Same
  reason as batch 12; unchanged upstream.
- `giovannifontana` — 46 declared / 28 in the manifest: 18 uppercase `uc/*.png` entries do not
  exist, so 28/46 download and the check fails. Dropped.
- `hyach` — 36 declared / 26 in the manifest (no digit art), 26/36. Dropped.
- `doctor` — batch 12 recorded 25/26 and dropped it; this run downloads **26/26, PASS**, so it is
  the first cipher in the batch rather than a skip.

Batch: doctor, freezemarks, fringe, futurama2, gaim, galacticalphabetmedia, geocacheid,
glagolitic2, gnommish, gravity_falls_author, gravity_falls_journal, greatmachine, hexacode,
hieratic, hvd, hylian64, hymmnos, iconian, illuminati_1, illuminati_2, indianajones,
japanesenumbers, jenks, kabouter, kabouter_1947.

**Phase 2 (batch 13) — largest first.** `geocacheid` (72 manifest files) is the largest:
staged 72/72, COUNT CHECK PASS, `dcode-find` → `NO PAGE` (no sitemap candidate at all), so it is
single-source. Pipeline sound; continued.

**dCode lookup.** Run after staging, so every verdict had the declared keys:

- `futurama2` → `SELECTED /futurama-alien-2-alphabet` (art 0.87 over 57 keys, next different
  alphabet 0.35, name 0.67 < 0.80). dCode publishes 36 glyphs to our 26; toggle shipped.
- `gravity_falls_author` → `SELECTED /gravity-falls-author-cipher` (26/26 keys, title agrees).
- `gravity_falls_journal` → `SELECTED /gravity-falls-journal-3` (26/26 keys, title agrees).
- `hymmnos` → `SELECTED /hymnos-alphabet` (52 glyphs; covers every declared letter, publishes no
  digits). Toggle shipped on the app's rule (`symbolToggleSources`: letters, no private-use
  keys), the same shape the already-shipped `hylian` has — its dCode page also stops at letters.
- Everything else `NO PAGE`, with the failing gate recorded: `gnommish`
  `/gnommish-alphabet` 28/31 (missing äöü), `galacticalphabetmedia` closest art 0.31
  (`/standard-galactic-alphabet`), `kabouter` 0.47 and `kabouter_1947` 0.50
  (`/outer-rim-basic-alphabet`), `giovannifontana` 0.47 (`/webdings-font`); `gaim`,
  `glagolitic2`, `hieratic`, `hvd`, `iconian`, `indianajones`, `japanesenumbers`, `jenks` have no
  name candidate in the sitemap.

**Ink-tight gate.** Measured every staged glyph's rendered long axis in a 30 px tile: medians
11.0–28.4 px. One cipher is under the 12 px gate — `gravity_falls_journal` (median 11.0,
range 8.7–14.4) — so `tightArt` is set for it, installed as a subset (`install.mjs
gravity_falls_journal`, which crops the art to its ink box and keeps the batch's `new` flags),
and its sheet rebuilt. The other 24 stay untightened (lowest: hymmnos 12.9, greatmachine 13.5,
gravity_falls_author 13.8).

**Install and build.** Subset install of the 25 slugs (a full install would also pick up the three
staged-but-failed ciphers). Hash snapshot before/after: **0** pre-existing data files and **0**
pre-existing art files changed; only the 25 art dirs and data files are new. Catalogue 175 rows ==
175 data files == 175 art dirs, 0 tiles without art. `index.html` rebuilt at **39,820,969** bytes
(was 35,443,229; +4,377,740 for 626 new shipped glyphs plus 140 dCode glyphs). `new: true` is on
this batch's 25 rows and cleared from batch 12's.

**Sheets and checklist.** 25 sheets written (175 total). `inventory.mjs` exits 0: CacheSleuth
**175/306 (57%)**, 131 left; dCode 156 pages — 22 bound, 34 twin, 100 uncatalogued.

**Browser pass.** 254/254 checks over the shipped page (boot splash, rail/panel counts at 175,
search "gravity" → the three Gravity Falls sets, 25 nodes placed, per node: tile count, captions,
PNG art, no placeholder, foot count, toggle present only where dCode covers the letters, fixed
label otherwise, no variant bar, no note, first tile transcription; multi-key tiles for
japanesenumbers). `verify-source.mjs`: 5,535 glyphs byte-identical, 0 mismatched; re-run for
`gravity_falls_journal` after the tight install, 26/26.

Nothing committed — awaiting sign-off.

## Batch 13 amendment — four source/art calls (2026-11-04)

Review settled four of the batch's source choices. Applied as a subset re-install
(`install.mjs` on the four slugs) plus their sheets; no new ciphers.

- **Hymmnos** — CacheSleuth art stays, because dCode publishes the 52 letters and no digits to
  CacheSleuth's 62. `tightArt` is now on: rendered ink goes from **12.9 px** median (9.1–23.7)
  to **26.4 px** in the 30 px tile, so the script draws at a readable size.
- **Gravity Falls - Journal** — CacheSleuth art stays, "the two sets are the same", so `same` is
  set: the dCode second set and its toggle are gone (26 glyphs, `tightArt` unchanged).
- **Gravity Falls - Author** — dCode art now ships (`artFrom: "dcode"`), same alphabet on both
  sides, so the toggle is gone; 26 glyphs, no `tightArt` (ink 22.0 px).
- **Futurama 2** — dCode art ships. Its page yielded 36 images: the A–Z alphabet plus ten glyphs
  scraped from the page's worked example (keyed Q M 8 . 5 B ; 6 9 D). Those ten are dropped, so
  the dCode set is 26 in A–Z order and the grid reads A…Z instead of the scrambled prefix.
  Single-source now: no toggle.

**Verification.** `install.mjs` PASS for all four; `verify-source.mjs` PASS (88 glyphs — Hymmnos
62/62 and Journal 26/26 byte-identical to live CacheSleuth, both ink-tight; Author and Futurama 2
reported as dCode art). `index.html` rebuilt at **39,594,342** bytes (175 ciphers, 5,776 shipped
symbols). Browser pass **51/51** over the shipped page: island `artFrom`/`dcode` metadata, tile
counts 62/26/26/26, A–Z captions in order, no toggle for the three single-source ciphers, fixed
source labels, square packed art for the ink-tight sets, first-tile transcription, and the New
pill still narrowing 175 → 25. Inventory regenerated: CacheSleuth 175/306, dCode 156 pages
(20 bound, 35 twin, 101 uncatalogued). Sheets rewritten for the four.

Nothing committed.

## Batch 14 — 25 ciphers (catalogue 175 → 200)

**Phase 1 (batch 14) — selection, staging, install and build, 2026-11-04.** N = 25 (the catalogue
is over 100). Candidates are manifest slugs not yet shipped, alphabetically, N taken after skips:

- `bacon`, `fiveneedletelegraph`, `goldbug`, `kenny`, `letterstonumbers`, `lotrperiodic` — no
  CacheSleuth descriptor (`extract.mjs` exits 2), so they cannot be staged at all.
- `barcode39` (37 declared / 36 manifest, `space.png` 404), `giovannifontana` (46 declared / 28,
  18 `uc/*.png` missing) and `hyach` (36 declared / 26, no digit art) — COUNT CHECK FAIL; re-checked
  this run and unchanged upstream.

Batch: maximal, kargi, kartrak, kilrathi, kix, klinzhai, kokopelli, korean, krakoan, leprechaun,
life, llort, magicode, malcorian, mandalorian, marain, marain1, markab, maryqueenofscots,
masterofmagic, maya_calander, maya_calander2, mayan1, maze, meroitan_hieroglyphs.

**Phase 2 (batch 14) — largest first.** `maximal` (62 manifest files) staged 62/62, COUNT CHECK
PASS. `dcode-find` matched only "maximum of a list/function" pages, all 0 glyphs, so `NO PAGE` —
single-source. Pipeline sound; staging continued.

**dCode lookup.** `dcode-find` on every chosen slug returned `NO PAGE` with the declared keys in
hand, so the whole batch ships CacheSleuth art and no source toggles. These are the manifest-slug
near misses the lookup scores and rejects, not evidence gaps.

**Ink-tight gate.** Medians 11.1–30.0 px in the 30 px tile. One cipher is under the 12 px gate:
`kargi` (median 11.1, range 3.5–11.3), so `tightArt` is set for it and installed as a subset.
`meroitan_hieroglyphs` is 12.2 px and stays off, as does everything else (lowest after that:
maximal 12.7, life 13.4); `maze` renders at 30.0 px.

**Install and build.** Subset install of the 25 slugs. Hash snapshot before/after: all **175**
pre-existing data files and all **6,482** pre-existing art files unchanged; only the 25 new data
files and 25 art dirs appear. Catalogue 200 rows == 200 data files == 200 art dirs, 0 tiles
without art. `index.html` rebuilt at **42,968,836** bytes (was 39,594,342; +3,374,494 for 768
shipped symbols). `new: true` is on this batch's 25 rows and cleared from batch 13's.

**Sheets and checklist.** 25 sheets written (200 total). `inventory.mjs` exits 0: CacheSleuth
**200/306 (65%)**, 106 left; dCode 156 pages — 20 bound, 35 twin, 101 uncatalogued.

**Browser pass.** 264/264 checks over the shipped page (panel and header count at 200, the New
pill isolating 25 and Reset restoring 200, 25 nodes placed; per node: tile count, captions in
source order, PNG art, no placeholder, foot "N symbols", no toggle, fixed CacheSleuth label, no
variant bar, first-tile and multi-key transcription; `kargi`'s packed art square from the tight
crop). `verify-source.mjs`: **768 glyphs byte-identical**, 0 mismatched, 0 unreachable.

Nothing committed — awaiting sign-off.

**Phase 1 (batch 15) — selection, staging, install and build, 2026-11-04.** N = 25 (catalogue 200).
Candidates are manifest slugs not yet shipped, alphabetically, N taken after skips:

- `bacon`, `fiveneedletelegraph`, `goldbug`, `kenny`, `letterstonumbers`, `lotrperiodic`,
  `natophonetic`, `periodictable` — no CacheSleuth descriptor, so they cannot be staged.
- `barcode39` (37 declared / 36 manifest), `giovannifontana` (46/28), `hyach` (36/26) — carried
  from batch 14's COUNT CHECK FAIL; not re-staged this run.
- `nyctographic` — 47 declared / 36 manifest, 11 punctuation PNGs (`ampersand`, `apostrophe`,
  `colon`, `comma`, `doublequote`, `exclamation`, `lparen`, `period`, `question`, `rparen`,
  `semicolon`) 404 upstream: COUNT CHECK FAIL. Dropped, and `planetbarcode` took the slot.

Batch: mesoppotanic, minbari, mirrornumbers1, mirrornumbers2, morseircle, morsemountain,
murray2003, murray2007, murray2016, narn, nato, nuha, numberpadlines, numikki, orkhon, pakmara,
pasley, pentadic, pictish_swirl, pigpen2, pipeline, pixel, planet, ophidean, planetbarcode.

**Phase 2 (batch 15) — largest first.** `ophidean` (62 manifest files) staged 62/62, COUNT CHECK
PASS. `dcode-find` SELECTED `/ophidian-alphabet-ultima` (100% of keys, art 0.77 over 72 keys,
title 0.67) — but that page publishes only 36 glyphs for a 62-key upper/lower alphabet, so the
second set cannot cover the declared keys and the node would draw a half grid. Re-staged
single-source; the page is recorded as evidence, not shipped.

**dCode lookup.** `mirrornumbers1` (art 0.94) and `mirrornumbers2` (0.75) SELECTED
`/mirror-digits`; both declare digits only, and numbers-only sets never show the toggle (D17),
so the 20-glyph dCode set ships as evidence without a source switch. Every other slug returned
`NO PAGE` with its declared keys in hand — e.g. mesoppotanic's only near miss is the 0-glyph
`/alphabet-phonetique-otan`, and nato's `/semaphore-flag` covers 26/36 keys. No other toggles.

**Ink-tight gate.** Medians 15.4–28.1 px in the 30 px tile; none under the 12 px gate, so
`tightArt` is off for all 25 (lowest: mesoppotanic 15.4, morsemountain 16.0, pipeline 17.4).

**Install and build.** Subset install of the 25 slugs. Hash snapshot before/after: all **200**
pre-existing data files and all **7,198** pre-existing art files unchanged; only the 25 new data
files and 25 art dirs appear. Catalogue 225 rows == 225 data files == 225 art dirs, 7,276
symbols, 0 tiles without art. Batch art: 732 CacheSleuth glyph PNGs + 40 dCode evidence PNGs +
`pigpen2`'s table legend (773 files).
`index.html` rebuilt at **46,113,177** bytes (was 42,923,004; +3,190,173). `new: true` is on this
batch's 25 rows and cleared from batch 14's.

**Sheets and checklist.** 25 sheets written (225 total); `ophidean` was regenerated after the
single-source re-stage. `inventory.mjs` exits 0: CacheSleuth **225/306 (74%)**, 81 left; dCode
156 pages — 20 bound, 35 twin, 101 uncatalogued.

**Browser pass.** 256/256 checks over the shipped page (panel and header at 225, New pill
isolating 25 and Reset restoring 225, 25 nodes placed; per node: tile count, captions in source
order, PNG art that decodes, no placeholder, foot count, no toggle, fixed CacheSleuth label, no
variant bar, first-tile transcription). The first run caught `ophidean` offering a dCode toggle
over its 36-glyph page; re-staged and the affected checks re-run green. `verify-source.mjs`:
**732 glyphs byte-identical**, 0 mismatched, 0 unreachable.

Nothing committed — awaiting sign-off.

**Phase 1 (batch 16) — selection, staging, install and build, 2026-11-04.** N = 25 (catalogue 225).
Candidates are manifest slugs not yet shipped, alphabetically, N taken after skips:

- `bacon`, `fiveneedletelegraph`, `goldbug`, `kenny`, `letterstonumbers`, `lotrperiodic`,
  `natophonetic`, `periodictable`, `resistor` — no CacheSleuth descriptor.
- `barcode39`, `giovannifontana`, `hyach` — carried from batch 14's COUNT CHECK FAIL; `nyctographic`
  — carried from batch 15. Not re-staged this run.
- `shadow` — 37 declared / 35 manifest, `_.png` and `0.png` 404 upstream: COUNT CHECK FAIL.
  Dropped, and `sheliak` took the slot.
- `segmentdisplay` — staged from `/7-segment-display`, then dropped after review (its 128-icon
  ASCII table was not the wanted set); `sign` took the slot.

Batch: puzzle_code_black, poolballs, popham, postnetbarcode, precursor, predacon, predator,
preservers, puzzle, quadoo, r2units, reality, redherring, resident_alien, retrospection, rich,
riddler, sanluca, seltorian, semaphore_clock, semaphore_man, semaphore_stickmen,
semaphore_trousers, sheliak, sign.

**Phase 2 (batch 16) — largest first.** `puzzle_code_black` (62 manifest files) staged 62/62,
COUNT CHECK PASS. `dcode-find` matched only sliding-puzzle solvers, all 0 glyphs — `NO PAGE`,
single-source. Pipeline sound; staging continued.

**dCode lookup.** One page passed selection: `segmentdisplay` → `/7-segment-display` (name 0.80,
16/16 keys). It was dropped after review: the page's icon table is all 128 ASCII characters
(NUL–DEL), not the cipher's declared set. `sign` took the slot; no dCode page matches it
(`/american-sign-language` and `/french-sign-language` cover 26/42 keys at 62%,
`/maritime-signals-code` 36/42 at 86%, none past the coverage/title gates) — single-source.
Everything else returned `NO PAGE` with its declared keys in hand: `semaphore_clock` closest at
27/30 (`/\@` missing), `semaphore_man` 26/31, `r2units` art 0.60 against the 0.65 gate,
`resident_alien` 0.41. No toggles.

**Ink-tight gate.** Medians 14.8–30.0 px in the 30 px tile; none under the 12 px gate, so
`tightArt` is off for all 25 (lowest: sanluca 14.8, riddler 15.6, predator 15.8).
`retrospection`'s art is 4-bit palette and the batch-14 ink script assumes one byte per pixel, so
it was re-measured with the correct row stride: 28.1 px. `install.mjs`'s `decodePng` carries the
same byte-per-pixel assumption, so `tightArt` would silently no-op on depth-4 art if it were ever
needed.

**Install and build.** Subset install of the 25 slugs. Hash snapshot before/after: all **225**
pre-existing data files and all **7,971** pre-existing art files unchanged; only the 25 new data
files and 25 art dirs appear. Catalogue 250 rows == 250 data files == 250 art dirs, 8,028
symbols, 0 tiles without art. Batch art: 752 glyph PNGs (none dCode's), no table legend.
`index.html` rebuilt at **49,767,385** bytes (was 46,113,177; +3,654,208). `new: true` is on this
batch's 25 rows and cleared from batch 15's.

**Sheets and checklist.** 25 sheets written (250 total). `inventory.mjs` exits 0: CacheSleuth
**250/306 (82%)**, 56 left; dCode 156 pages — 20 bound, 36 twin, 100 uncatalogued.

**Browser pass.** 257/257 checks over the shipped page (panel and header at 250, New pill
isolating 25 and Reset restoring 250, 25 nodes placed; per node: tile count, captions in source
order, PNG art that decodes, no placeholder, foot count, no toggle, fixed CacheSleuth label, no
variant bar, first-tile transcription). That pass included the original 16-glyph `segmentdisplay`
node; after the swap, `sign` was re-checked 16/16 with 42 tiles, captions in order, decodable art,
foot reading 42 symbols, fixed CacheSleuth label and no toggle. `verify-source.mjs` had already
confirmed 710 CacheSleuth glyphs from the batch byte-identical with 0 mismatched; `sign`
re-verifies 42/42 byte-identical, 0 mismatched.

Nothing committed — awaiting sign-off.
