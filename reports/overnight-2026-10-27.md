# Overnight mission — 2026-10-27

Five tasks from the approved plan, run unattended. Sources in `dev/` were edited and
`index.html` rebuilt from them; the built file was exercised in a real browser and in the
in-page Verification lab. One local commit only — nothing was pushed.

## What changed

### 1. Nodes can be shrunk below the size of their text

The resize handler used to measure the card's full content height (with the preview
expanded) and clamp the node to it, so a long output pinned the node open. Now a resized
node is a fixed-size box with a real floor, and its preview scrolls inside that box.

- `dev/app.js`
  - New constants: `GRID_SIZE = 22`, `NODE_MIN_W = 220`, `NODE_MIN_H = 140`.
  - `buildNode()` sets a fixed `height` for a resized node (was `minHeight`), still dropping
    it while collapsed so the collapsed card stays compact.
  - `startNodeResize()` measures the floor from the node's own controls with the preview
    hidden (`max(NODE_MIN_H, controls + 82px)`), then clamps the drag and the saved size to
    it. Content height no longer participates.
- `dev/styles.css`
  - `.node.resized` makes the body a flex column and gives the preview a 72px minimum with
    internal scrolling; the input/file/join/function wrapper is included in the flex chain
    (without it the preview kept its content height and spilled out of the card).
  - The preview `<pre>` uses `align-items: safe center`, so short output stays vertically
    centred but a long result is not clipped above the scroll area.
  - Type-specific caps for sink nodes were overridden with a more specific selector so a
    resized sink does not grow back to its 250px preview.

Verified in the preview: a text sink holding 1,100 characters shrank from 366px to 162px,
its preview became a 45px scroll area with 401px of content, wires stayed attached, collapse
dropped it to 69px and expanding restored 162px, undo restored the previous size, and the
size survived a reload (`localStorage` held the new height). An image preview scaled from
200px to 95px inside the same floor instead of overflowing.

### 2. Magic moved into the Graph section, with a wand icon

- `dev/app.js`
  - Added `ICONS.wand` (16×16 stroke style, matching the other icons).
  - The Graph palette section now lists Text / File / Join / **Magic**; `addGraphNode("magic")`
    adds an op node whose op is `Magic`; the palette drag ghost names it too.
  - Magic is filtered out of the Operations categories (`CATEGORIES`), so it is not offered
    twice. Search still finds it and still adds it (`OP_NAMES` unchanged).
  - The function editor's palette uses the same builder, so Magic is available there as well.
- `dev/build.mjs`: the in-app help now says Magic lives in the Graph section beside Text,
  File and Join (wand icon) and explains it is not one step in a chain.

Verified: clicking and dragging both add a Magic node, search for "magic" lists it, the
function editor palette offers it and adds it inside the function.

### 3. Favicon

- `dev/build.mjs` generates two inline SVG data-URI icons from the sidebar brand mark
  (three nodes and two links on a rounded square): a light-scheme default and a
  `prefers-color-scheme: dark` override. `theme-color` also gained a dark variant.
- No new file, no request; it works from disk and from Pages.

Verified: the built page has exactly two `link[rel=icon]` elements, both data URIs, and the
decoded SVG parses as `<svg>` with the rounded rect and node circles.

### 4. Snap button in the bottom-left zoom/Fit strip

- `dev/app.js`
  - `snapNodesToGrid()` moves every node of the **currently open** graph to
    `Math.round(v / GRID_SIZE) * GRID_SIZE` (22 world px, shared with the dot-grid drawing,
    which now uses `GRID_SIZE` too). It updates positions in place, re-measures wires,
    saves, records **one** history entry and toasts how many moved. An already aligned graph
    only toasts.
  - Button in the main stage controls (`#snapBtn`) and a matching **Snap** button in the
    function editor header (`#fnSnap`) — the main controls sit behind the editor, so a
    function needs its own control.
- `dev/build.mjs`: the button with a dot-grid icon, plus a help entry.

Verified: 10 nodes off-grid snapped in one click (`Snapped 10 nodes to the grid`), one undo
restored them, positions persisted to `localStorage`, and inside the function editor snapping
moved only that function's three nodes (all landed on multiples of 22) while the main graph's
four nodes kept their coordinates.

### 5. Magic quality

Work was measured, not guessed: a fixed 13-case benchmark was added, run against the
committed build and against the new one, then four fresh held-out cases were tried.

Scoring changes in `dev/app.js`:

- **Exception text is rejected.** `BSONError: buffer length 88 must === bson size 123` is a
  legible sentence starting with a class name, so it used to rank high. Any `…Error` /
  `Exception` / `stack trace` token now disqualifies a result.
- **Encoders are capped at 30 and never count as findings.** "To HTML Entity", "To Hex
  Content", "Convert to NATO alphabet" can only re-spell the input; previously they could
  outrank real decodes (80 on plain English, 50 on Morse).
- **Entity spellings do not hide a copy.** The "same letters" check strips `&name;` before
  comparing, so `The quick brown fox …&period` is recognised as the input, not a decode.
- **Results that contain the whole input are rejected** (Power Set and similar wrappers).
- **A sentence must read.** Fewer than 55% known words caps a result at 45 (two-token
  results at 52); ≥85% known words adds 4. This demotes scrambler near-misses such as
  "Her Wlldolo!" while leaving real decodes untouched.

The benchmark lives beside the scorer as `MAGIC_BENCHMARK` and is also a lab check
("Magic benchmark across encodings"), so it is repeatable without this report.

## Magic benchmark — before and after

Same 13 inputs, same single-operation scope, `Magic` at its default settings, run on the
committed build and then on the new build.

| input | before (HEAD) top result | after top result | verdict |
|---|---|---|---|
| base64 | From Base64 83 — correct | From Base64 87 — correct | pass → pass |
| base64url | From Base64 86 — correct | From Base64 86 — correct | pass → pass |
| hex | From Charcode 99 — correct | From Charcode 103 — correct | pass → pass |
| decimal bytes | From Decimal 99 — correct | From Decimal 103 — correct | pass → pass |
| binary | From Binary 99 — correct | From Binary 103 — correct | pass → pass |
| url encoded | URL Decode 59 — correct | URL Decode 45 — correct, low-confidence warning | pass → pass |
| caesar 3 | ROT13 (shift 23) 99 — correct | ROT13 (shift 23) 103 — correct | pass → pass |
| caesar 7 | ROT13 (shift 19) 99 — correct | ROT13 (shift 19) 103 — correct | pass → pass |
| atbash | Atbash Cipher 99 — correct | Atbash Cipher 103 — correct | pass → pass |
| base32 | From Base32 100 — correct | From Base32 104 — correct | pass → pass |
| morse | From Morse Code 101 — correct | From Morse Code 105 — correct | pass → pass |
| plain english | **To HTML Entity 80** — no warning | ROT13 near-miss 45 — warning | **fail → pass** |
| gibberish | BSON error 42 — warning | Enigma 45 — warning | pass → pass |
| **total** | **12 / 13** | **13 / 13** | |

Junk in the lists:

| measure | before | after |
|---|---|---|
| exception-text rows in the top 4 | 10 (scores 41–57) | 0 (top 10 lists) |
| highest-scoring encoder | 80 | 30 (capped, never above a real decode) |
| Power Set / input-echo rows | 2 | 0 |

Timing per sweep stayed ~1.7s for most inputs; hex is the outlier at ~14.9s (the sweep runs
the same ~556 operations either way). The full 13-case lab check takes ~18.7s.

### Held-out cases (invented after tuning)

| input | result | verdict |
|---|---|---|
| octal bytes of "Hello, World!" | From Octal 103 — correct | pass |
| ROT47 of "Hello, World!" | ROT47 103 — correct | pass |
| reversed "!dlroW ,olleH" | Reverse 103 — correct | pass |
| base64 with line breaks | From Base64 86 — correct | pass |

## Checks actually run

- `node --check dev/app.js` — clean.
- `node dev/dcode/selftest.mjs` — `all 116 checks passed`.
- `node dev/build.mjs` — `wrote …/index.html 13.58 MB`, `worker 4786735 modules 24`.
- Verification lab, **Operations** tab (all checks): 647 checks — **487 passed, 136 live
  probes, 0 failed, 3 blocked upstream, 21 not auto-run**.
- Verification lab, **Graph wiring**:
  - "Magic ranks the answer first" — pass (13.4s).
  - "Magic benchmark across encodings" — pass, 13/13 (18.7s).
- Manual preview checks listed under each task above (resize, collapse, undo, persistence,
  image scaling, Magic click/drag/search/function palette, snap in both canvases, favicon).
- Confirmation prompts: the built file still contains the "Load the example? This replaces
  the currently saved graph." and "Start a new graph? …" confirms, and no test override.
  Testing used `window.confirm = () => true` injected into the incognito tab only; nothing
  was changed in the source for it.

## Things worth knowing

- **A pre-existing lab failure was found and fixed at the assertion, not the code.** The old
  Magic check required the hex case's top label to be exactly `From Hex`, but `From Charcode`
  decodes the same bytes to the same plaintext and Magic merges rows by text, so the label is
  whichever it met first. Building the committed HEAD reproduced the same failure, so this
  was not a regression. The check now accepts either decoder while still requiring the exact
  plaintext; every other expectation is unchanged.
- **URL Decode scores 45 with a warning** even though its output is right: "Café", "au" and
  "lait" are not in the English dictionary, so the word ratio stays under the confidence
  cap. The right text is still selected and sent downstream.
- **The 220×140 floor is a minimum, not a promise.** A node with several argument rows has
  measured controls taller than 140px, so its actual floor is larger — that is what keeps
  controls from being cut off. Text nodes reach the small end.
- **Image shrinking was verified with a synthetic image preview** (an injected `<img>` in a
  real resized node) and a `Generate Image` node, not a full user PNG pipeline; the rules
  exercised are the same ones the app uses for image bytes.
- **Magic stays single-operation by design.** Cases that inherently need two steps
  (base64 → gunzip) and parsed-record outputs (a JWT payload with no prose) were left out of
  the benchmark rather than scored as failures.
- The function editor's Snap lives in its header; the main Snap button is behind the modal
  while the editor is open.

## Files

- `dev/app.js` — resize, Magic placement, wand/snap icons, snap action, benchmark, scorer.
- `dev/styles.css` — fixed-box resized nodes with scrolling previews.
- `dev/build.mjs` — favicon links, dark theme-color, Snap button, help text.
- `index.html` — rebuilt from the above.
- `reports/overnight-2026-10-27.md` — this report.

`check-all-ciphers.json` and `screenshots/` were already untracked when the mission started
and were deliberately left out of the commit. Nothing was pushed.
