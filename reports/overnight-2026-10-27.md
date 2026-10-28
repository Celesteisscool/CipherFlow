# Overnight mission — 2026-10-27

Five tasks from the approved plan, run unattended. Sources in `dev/` were edited and
`index.html` rebuilt from them; the built file was exercised in a real browser and in the
in-page Verification lab. Local commits only — nothing was pushed.

## What changed

### 1. Nodes can be shrunk below the size of their text

The resize handler used to measure the card's full content height (with the preview
expanded) and clamp the node to it, so a long output pinned the node open. Now a resized
node is a fixed-size box with a real floor, and its preview scrolls inside that box.

- `dev/app.js`
  - New constant: `GRID_SIZE = 22` (shared with the dot grid and Snap).
  - `buildNode()` sets a fixed `height` for a resized node (was `minHeight`), still dropping
    it while collapsed so the collapsed card stays compact.
  - `startNodeResize()` measures the floor from the node's own controls with the preview
    hidden, adds the preview's reserved height, then clamps the drag and the saved size to
    it. Content height no longer participates. It reads the values back from CSS.
- `dev/styles.css`
  - `.node.resized` makes the body a flex column and gives the preview the
    `--node-preview-floor` minimum (82px, no top margin) with internal scrolling; the
    input/file/join/function wrapper is included in the flex chain (without it the preview
    kept its content height and spilled out of the card).
  - The preview `<pre>` uses `align-items: safe center`, so short output stays vertically
    centred but a long result is not clipped above the scroll area.
  - The resize floor values now have one owner: `--node-min-w`, `--node-min-h`,
    `--node-preview-floor`, `--node-preview-media-min-h` and `--node-preview-frame-min-h`
    are declared once in `:root` and consumed by both the stylesheet and `startNodeResize`.
  - The resized-node block was moved after the per-type preview caps, so it wins on source
    order; the second, more-specific `.node.resized .node-body .preview` override block is
    gone.

Verified after the refactor: a text sink holding 1,100 characters still shrank to 162px at
220px wide, with a scrolling preview and no clipped controls; an AES node still stopped at
its 570px controls floor at 220px wide. Collapse/expand, undo, persistence and the earlier
image-preview check still hold.

The preview viewport is deliberately 82px with no top margin, replacing the old 72px
preview plus 9px margin. The node floors and the 82px reserve are unchanged (162px text,
354px image, 570px many-control); the preview simply receives the full reserve as scroll
area and starts 9px higher. This is an accepted, documented change, not a second floor.

### 2. Magic moved into the Graph section, with a wand icon

- `dev/app.js`
  - Added `ICONS.wand` (16×16 stroke style, matching the other icons).
  - The Graph palette section now lists Text / File / Join / **Magic**; `addGraphNode("magic")`
    adds an op node whose op is `Magic`; the palette drag ghost names it too.
  - Magic is filtered out of the Operations categories (`CATEGORIES`), and categories left
    with zero operations are dropped, so the old `CipherFlow · Magic` row is gone rather
    than opening onto an empty list. Search still finds Magic and still adds it (`OP_NAMES`
    unchanged).
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
    function editor header (`#fnSnap`). The editor is a full-screen `.modal.fn-editor`
    (`z-index: 100`); measured at the main button's centre while editing, `elementFromPoint`
    returns `#fnStage`, so the bottom-left strip is genuinely covered. The header Snap is
    the only reachable control for the open function graph, and is retained for that reason;
    the help text says so.
- `dev/build.mjs`: the button with a dot-grid icon, plus a help entry that distinguishes the
  main strip from the function editor's header control.

Verified: 10 nodes off-grid snapped in one click (`Snapped 10 nodes to the grid`), one undo
restored them, positions persisted to `localStorage`, and inside the function editor snapping
moved only that function's three nodes (all landed on multiples of 22) while the main graph's
four nodes kept their coordinates.

### 5. Magic quality

Work was measured, not guessed: a fixed benchmark (13 cases in the first pass, 14 after the
list-hygiene follow-up below) was added, run against the committed build and against the new
one, then four fresh held-out cases were tried.

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
the same ~556 operations either way). The full lab check now takes ~15.7–16.3s for 14 cases.

### Held-out cases (invented after tuning)

| input | result | verdict |
|---|---|---|
| octal bytes of "Hello, World!" | From Octal 103 — correct | pass |
| ROT47 of "Hello, World!" | ROT47 103 — correct | pass |
| reversed "!dlroW ,olleH" | Reverse 103 — correct | pass |
| base64 with line breaks | From Base64 86 — correct | pass |

## Follow-up — honest visible lists

The first pass cleaned the top of each list but still appended up to six non-reading
runners-up. The follow-up changes the ranker and its fixed benchmark only: when the top
finding both reads and clears the existing 55-point confidence bar, the list contains
reading findings (or structural answers) only. A second decode that reads is kept — this is
not "top row only", and no score threshold is applied to findings themselves.

Measured on the built page with `Magic` at its defaults, same inputs before and after:

| case | before: rows listed | after: rows listed |
|---|---|---|
| base64 (`The quick brown fox…`) | 6 — From Base64 87, Enigma 45, Fractionated Morse Decode 43, Typex 42, Pollux Cipher Decode 35, Convert to NATO alphabet 30 | 1 — From Base64 87 |
| octal (`Hello, World!`) | 6 — From Octal 103, Parse UNIX file permissions 38, Lorenz 9, Pollux Cipher Decode 45, ROT47 35, Convert to NATO alphabet 30 | 1 — From Octal 103 |
| ranking contract (synthetic) | 3 — From Base64, From Hex, Enigma | 2 — From Base64, From Hex |

- **Visible noise: 10 non-reading rows → 0** across the two measured cases (five each). The
  top scores are unchanged (87 and 103); this is an evidence/visibility change, not a raised
  score threshold.
- **Genuine second-best: kept.** The synthetic contract feeds the ranker a confident base64
  result, a second real decode (`From Hex`, “Attack at dawn!…”) and a no-word Enigma
  scramble. It asserts both decodes survive and the scramble does not. The measured old
  lists contain that same scramble, so the contract fails on exactly that state; it passes
  now, and the lab reports “ranking contract: kept 2 answers, dropped the scramble”.
- **Benchmark extension:** octal is now the fourteenth fixed case. Each confident solved
  case declares a fixed `visible` row count; the lab asserts `rows.length` equals that
  number. This is independent of the ranker's `reads` flag, so a row wrongly labelled as
  reading still fails, and a genuine second-best row cannot disappear without the count
  changing. Current lab result: **14/14 (16.3s on the final run)**. The previous 13-case
  benchmark passed while these lists were noisy because it only checked row 1.

### Benchmark independence and mutation evidence

The per-case `clean` assertion no longer calls `reads`. A confident case must leave exactly
the fixed number of visible rows declared in `MAGIC_BENCHMARK` (`visible: 1` for the eleven
high-confidence solves); the low-confidence no-answer cases are still allowed to list
guesses. The synthetic ranking contract now asserts the exact labels
`From Base64` + `From Hex` and that Enigma is absent, instead of looking up rows by the
ranker's own judgement.

Two throwaway mutations were run against the built page, then reverted:

| mutation | lab result |
|---|---|
| over-filter: `confident ? findings.slice(0, 1)` | **Fail** — `reading second-best kept: false, no-word scramble dropped: true · From Base64 87` |
| no filter: `confident ? findings.concat(nearMisses)` | **Fail** — `reading second-best kept: true, no-word scramble dropped: false · From Base64 87, From Hex 86, Enigma 44` |

The first shows a real second-best decode is not silently hidden; the second shows the
contract catches the noise the per-case counts are meant to prevent. Both mutations were
reverted and the final build was rerun.

## Checks actually run

- `node --check dev/app.js` — clean.
- `node dev/dcode/selftest.mjs` — `all 116 checks passed`.
- `node dev/build.mjs` — `wrote …/index.html 13.59 MB`, `worker 4786735 modules 24`;
  rebuilt after the list-hygiene follow-up and again after the residue and benchmark
  passes (fresh `node --check dev/app.js` clean; build reproducible).
- Verification lab, **Operations** tab (all checks): 647 checks — **487 passed, 136 live
  probes, 0 failed, 3 blocked upstream, 21 not auto-run**.
- Verification lab, **Graph wiring**:
  - "Magic ranks the answer first" — pass (15.1s) on the final build.
  - "Magic benchmark across encodings" — pass, **14/14** (16.3s), including the ranking
    contract that keeps `From Base64` + `From Hex` and drops the Enigma scramble.
  - Benchmark mutation checks: over-filter and no-filter builds both fail; final restored
    build passes (see the table above).
- Manual preview checks listed under each task above (resize, collapse, undo, persistence,
  image scaling, Magic click/drag/search/function palette, snap in both canvases, favicon).
- Residue checks: the palette has no `CipherFlow · Magic` category; the floor variables
  resolve to 220px / 140px / 82px and the text/image/AES floors remain 162px / 354px /
  570px; the preview viewport is the accepted 82px (was 72px + 9px margin); the main stage
  controls are covered by `#fnStage` while the editor is open, and `#fnSnap` snapped the
  function's two nodes onto the 22px grid.
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
-The function editor's Snap used to live in its header; the 2026-10-28 follow-up below removes
that control and the separate canvas, so the bottom-left strip now serves whichever graph
is open.

## Files

- `dev/app.js` — resize, Magic placement, wand/snap icons, snap action, benchmark, scorer,
  and the reading/confidence filter for visible Magic lists.
- `dev/styles.css` — fixed-box resized nodes with scrolling previews and the single CSS
  definition of the floor; no new UI in the list-hygiene follow-up.
- `dev/build.mjs` — favicon links, dark theme-color, Snap button, help text.
- `index.html` — rebuilt from the above.
- `reports/overnight-2026-10-27.md` — this report.

`check-all-ciphers.json` and `screenshots/` were already untracked when the mission started
and were deliberately left out of the commit. The list-hygiene and residue passes were
committed together; this benchmark-independence pass is a separate local commit. Nothing
was pushed.

## Follow-up (2026-10-28): function editor reuses the main canvas

- `dev/app.js`: removed the editor's second canvas (`#fnStage`, its world, node and edge
  layers, and its own run status). `openFunctionEditor()` now moves the one `#stage` into
  the editor and records its original parent/next sibling; closing moves it back. The
  editor header's duplicate **Snap** and **Fit** buttons are gone because the shared
  bottom-left controls are now reachable and act on whichever graph is open. The function
  hint is moved into the reused stage while editing.
- `dev/styles.css`: `.stage.fn-stage` makes the reused stage fill the editor body and hides
  only the main toolbar; the editor keeps its own node list, which is necessary because the
  full-screen window covers the sidebar.
- Verification on the built page: there is always exactly one `.stage`; opening a function
  moves it under `#fnBody`, the function's nodes render in the same `#nodesLayer`, adding,
  dragging, wiring, **Run test**, **Fit** and **Snap** all work there, and closing returns the
  stage to `#app` with the main graph's six nodes and seven wires intact. `node --check`,
  the build and `dev/dcode/selftest.mjs` (116/116) all pass.
