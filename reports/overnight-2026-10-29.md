# Overnight mission 1 — 2026-10-29

Mission file: `reports/mission-2026-10-29.md` (untracked, not committed).
Starting point: `07e5c1f` with a clean tree. Everything below was done in `dev/` and the
generated `index.html` was rebuilt with `node dev/build.mjs`; the shipped file was never
hand-edited.

Order of work: the five tasks were implemented in order and each was exercised in the built
page before the next one started.

## Task 1 — a bundle previews one value at a time

`listPreviewText()` used to draw a bundle as "N values" plus up to 24 numbered entries. A
bundled wire (the output of Compact, or any list-valued wire) now renders **one entry at a
time** in `updatePreviewEl()` (`dev/app.js`):

- The selected entry goes through the same `previewBytes()`/`imageMimeOf()` path as a single
  value, so Text/Raw/Hex apply to that entry and a PNG/JPEG/GIF/WebP entry gets the Image
  view.
- The header shows `‹ 3 / 12 ›` in place of the old `N values ·` label. Both arrows are
  disabled at the ends and when the bundle holds one value; the byte label is the selected
  entry's size.
- **Full** means "this entry without truncation": text limit = entry length, hex limit =
  3 × entry length, no image height cap. It no longer changes how many entries are listed.
- **Clicking the counter** switches to the flat listing (`all 12`); clicking it again returns
  to the same page. Arrows are absent in that mode.
- **Copy** copies the current entry in paged mode (honouring Text/Raw/Hex) and the joined
  list in all-entries mode.
- Page and mode are view state on the node (`bundlePage`, `bundleAll`). They are **not** in
  `cleanNodeForSave()`/`serializeGraph()`/localStorage, so a reload starts at 1 and the page
  is reset (clamped) when the bundle's shape changes — a count plus a hash of the first eight
  entries (`bundleSignature()`).

`dev/styles.css` gained `.preview-pager`/`.preview-bundle` rules; the header wraps at narrow
widths and keeps every control reachable.

Built-page evidence (final build, Compact node with three typed values):

| action | pager | body |
|---|---|---|
| initial | `1 / 3`, prev disabled | `alpha` |
| next | `2 / 3` | `beta` |
| counter | `all 3` | `3 values` / `1 · alpha` / `2 · beta` / `3 · gamma` |
| counter again | `2 / 3` | `beta` (same page) |
| Full | pressed, `.preview.full` | entry untruncated |
| copy (writeText intercepted) | `2 / 3` | wrote `beta`; all mode wrote `alpha\nbeta\ngamma` |

At the 220 px minimum width the header wrapped to two rows (34 px) with `scrollWidth ==
clientWidth`; the arrows, counter, Full, Text/Raw/Hex, copy and save controls all stayed
inside the preview box.

## Task 2 — Full is a filled pill

The `<label class="preview-full"><input type="checkbox">` is gone. Every preview now renders
a `<button data-action="preview-full" aria-pressed="…">Full</button>` chip:

- at rest it is quiet like the segmented control; when on it uses the Snap/grid treatment:
  accent fill at 16 % (24 % on hover) and accent ink;
- it is a real button, so Space and Enter work, and `aria-pressed` tracks `node.fullPreview`;
- `node.fullPreview` still drives text, image, hex, bundle, Magic and audit previews, and
  still survives reload/export through `cleanNodeForSave()`.

The dead `.preview-full` checkbox CSS was removed. On the final build the active pill read
`color(srgb .427 .612 1 / .16)` with `rgb(109,156,255)` ink in dark and
`color(srgb .184 .435 .929 / .16)` with `rgb(47,111,237)` ink in light.

## Task 3 — Magic in four parallel chunks

`dev/app.js` now has a small engine pool beside the Magic runner:

- `ChefEngine` instances are created from the same inline source/blob and `//# sourceURL`
  as the primary worker; each has its own listener, pending map, id counter and chain.
- `probeMagic()` splits `magicCandidates()` into contiguous slices (only when the list is at
  least `MAGIC_CHUNK_MIN = 80`; below that it stays serial). Each slice gets its required
  modules, is probed concurrently, and results are tagged with their original index and
  merged back **before** `rankMagicResults()` — the scorer sees catalogue order.
- Slice zero always uses the primary worker. A failed/timed-out pool chunk is re-run on the
  primary; if that also fails the sweep throws instead of returning a partial ranking. A
  stale run (a newer sweep started) is discarded.
- The pool stays warm between sweeps, terminates after `MAGIC_POOL_IDLE_MS = 60000`, and is
  stopped on `beforeunload`. Status text names the split: `Magic is testing 666 operations
  in 4 chunks…`.

Scoring, `MAGIC_SKIP`, `MAGIC_NOISE`, `MAGIC_BENCHMARK` and `rankMagicResults()` were not
changed. Measured on this machine, default 666-candidate sweep, same `"Khoor, Zruog!"` input:

| run | wall time | notes |
|---|---|---|
| serial, first after reload | **4.03 s** | includes primary engine start |
| serial, warm (2nd/3rd) | **0.48 s / 0.39 s** | forked build with `magicChunkCount() => 1`, then reverted |
| 4 chunks, cold | **7.43 s / 7.49 s** | primary + three pool workers starting |
| 4 chunks, warm (2nd) | **0.30 s / 0.27 s** | |
| 4 chunks, 66 s after the last sweep | **5.09 s** | pool gone; primary still warm — confirms the idle shutdown |

Four chunks win once warm (~0.3 s vs ~0.4–0.5 s) but lose cold because three extra workers
must boot; that is the honest trade-off, not hidden. Both cold sweeps still produced the same
top row (`ROT13 (shift 23)`, `Hello, World!`).

## Task 4 — probes become real checks

Census supplied by `dev/gen-meta.mjs` / `dev/testplan.json` (708 tests):

| | official | dcode | probes | skipped | total |
|---|---|---|---|---|---|
| before | 352 | 187 | 148 | 21 | 708 |
| after | 352 | 187 | **112 plain + 36 with an expectation** | 21 | 708 |

`dev/gen-meta.mjs` now counts asserted probes separately (`probeExpected`), and 29 operations
gained a deterministic `expected`/`expectedContains` via its `PROBES[op]` merge (7 probes
already had one, making 36). The Operations tab went from 680 passed / 111 probes / **4
failed** on the first run to **684 passed / 111 probes / 0 failed** once four wrong
expectations were corrected (below). The 3 `blocked upstream` rows are unchanged
(CyberChef browser-build limitations for JWT Sign/Verify and P-list Viewer).

Conversions and provenance (all verified by the lab, none derived from today's output):

- Plain transforms — `To Upper case`, `To Lower case`, `Reverse`, `Remove null bytes`,
  `Expand alphabet range`, `Split`, `Unique`, `Take bytes`, `Pad lines`,
  `Count occurrences`, `Add line numbers`: the operation's definition/source (uppercase,
  reverse-by-character, drop NUL, a–z expansion, split/join delimiters, first/last bytes,
  pad-to-length, occurrence count, sequential numbering).
- Encodings — `From Hex Content` and `To Hex Content`: the SNORT `|hex|` format is a
  documented round-trip (`|48 65…21|` ⇄ `Hello, World!`). `To Decimal`: ASCII code points of
  its fixture. `To Braille` / `From Braille`: the CyberChef `BRAILLE_LOOKUP.dot6` table, whose
  ASCII side is uppercase. `To Quoted Printable`: RFC 2045 on the fixture's Latin-1 bytes
  (`=`→`=3D`, `é` 0xE9→`=E9`). `From Quoted Printable`: RFC 2045 decoding of `=3D`, `=2C`,
  `=C3=A9`. `Swap endianness`: four-byte words of `48 65 6c 6c | 6f` padded and reversed to
  `6c 6c 65 48 | 00 00 00 6f`, joined by `toHex`'s space.
- Checksums — `Adler-32 Checksum` (`1f9e046a`) and `Fletcher-8 Checksum` (`b4`): recomputed
  independently in Node from the published formulas (mod 65521 / mod 15 nibbles).
- Arithmetic — `Sum` (`10`) and `Mean` (`2.5`) over `1 2 3 4` … (the fixtures are number
  lists with a Space delimiter).
- Extractors — `Extract domains`, `Extract URLs`: the matches in the fixture in reading
  order; `Defang URL` and `Fang URL`: documented inverse transformations.
- ASN.1 — `Hex to Object Identifier` / `Object Identifier to Hex`: rsaEncryption
  `1.2.840.113549.1.1.1` ⇄ DER `2a864886f70d010101`.

Corrections made after the first run (each had a real, recorded reason):

- `From Braille` expected lowercase; the six-dot table is uppercase (`HELLO`).
- `From Hex Content` needed the SNORT-pipe input, not bare spaced hex.
- `Swap endianness` returns space-delimited hex by default.
- `To Quoted Printable` sees Latin-1 bytes, so `é` is `=E9`, not `=C3=A9`.

Probe bite test: `From Braille` was temporarily changed back to `hello`, rebuilt, and the lab
row failed (`HELLO`); restoring `HELLO`, rebuilding, and running the single row passed again.

Operations tab on the final build: **684 passed · 111 probes · 0 failed · 3 blocked
upstream · 21 skipped · 819 / 819**.

## Task 5 — one click runs every wiring check

`renderIntegration()` now draws a toolbar above the cards: **Run all wiring checks**, a
**Stop** button, and a live summary (`26 passed · 1 failed · 34.2 s`).

- `runIntegration(id)` and the batch both call the same `executeIntegration(def)`, which
  returns `{status, detail, duration}` and does no DOM work; `paintIntegrationCard()` is the
  single painter. Batch mode owns `lab.integrationBatch`; the per-card button is disabled
  while it runs but works again afterwards. `lab.integrationRunning` no longer causes the
  batch to skip cards.
- Checks run sequentially. **Stop** is checked between cards and halts after the current one.
- The batch records the autosave slot before it starts and restores it in `finally`; checks
  that exercise the save path use `withAutosaveGuard()`, which waits out the debounced writer
  and restores `STORAGE_KEY`. The user's graph is byte-identical afterwards.
- Each check runs through `withScratchGraph()` (or, for undo/Snap, restores the canvas
  snapshot) and calls the editor's own functions, not pointer simulation.

New checks (all added to `INTEGRATION_CHECK_IDS`): `bundles` (Compact → Expand/Pick),
`fstring`, `switch` (match, otherwise, pass-through), `collapse` (ports stay anchored, size
returns), `previewstate` (Full + Raw survive a re-render and land in the save), `resize`
(w/h through save → load), `snap` (grid, one undo, and an open function moving only its own
nodes), `save-reload` (text, size, collapsed state, switch cases, function through
localStorage), `export-import` (serialize → the same normaliser Open uses), and
`suite-coverage` (compares the defined ids with the expected list; missing or renamed cards
fail it).

Stop test (measured on the build just before the trailing-space cleanup, where the suite
was 27 cards and the batch listing showed `stopped after 16 / 27 · 16 passed · 0 failed ·
14.6 s`): started a batch and pressed Stop during `magic`; it halted after that card, Stop
re-disabled and Run enabled.

Two harness bugs were found and fixed while making the suite genuinely run:

- Several function checks hard-coded node ids 3/4/5, which can collide with ids `createFunction()`
  allocates from the shared `nodeSeq` after a reload (the collision made a function body wire
  itself to its own node). Those ids now come from `++nodeSeq`.
- `applyGraph()` schedules an auto-run. A check that restored the canvas left that timer
  pending; when the user's graph contains a Magic node it swept Magic during the next check
  and superseded it ("A newer Magic sweep replaced this one"). `executeIntegration()` now
  clears a queued run before and after each check, and the batch restores the autosave
  afterwards. The `magic` card passes again in the batch.

Self-check bite test: `bundles` was temporarily renamed to `bundles-renamed`, rebuilt. The
batch turned red with `suite-coverage`: `Fail — 27 check(s) defined, missing bundles,
unexpected bundles-renamed`, overall `25 passed · 2 failed · 38.0 s`. Restored from the
backup, rebuilt.

Final build: **27 cards, 26 passed, 1 failed, 34.2 s**. Every new card passed and its detail
shows real values, e.g.:

- `bundles`: `bundle of 3 → Expand ["alpha","beta","gamma"], Pick "beta"`
- `fstring`: `"Hello {input1}, key {input2}" → "Hello world, key K3Y"`
- `switch`: `case → "two", otherwise → "fallback", no otherwise → "gamma"`
- `snap`: `off-grid → on-grid yes, undo restored yes, open function snapped itself and left
  the canvas untouched`
- `save-reload`: `3 node(s), 1 function(s); text "persisted value", size 260×160, folded true,
  cases 2, wire 1`

The single failure is described under "Known failure" below.

## Known failure (pre-existing, not introduced here)

`magic-benchmark` fails its `plain english` case: Magic picks `GoldBug Decode`
(`"The quick brown fox jumps over the lazy dogp"`, 6 visible rows) with no warning instead of
saying nothing looks convincing. This is **not** caused by this mission: the same card was run
against the mission's base build (`git show HEAD:index.html > head-check.html`, served from the
same dev server) and produced the identical failure (`GoldBug Decode`, 6 visible rows,
21.8 s). That temporary copy was deleted afterwards.

Mission 1's task 3 is scheduling-only and mission 2 (`reports/mission-2026-10-29b.md`) owns
Magic accuracy, so the scorer and benchmark were left untouched. Consequence: the wiring
suite is 26/27 rather than fully green; `magic` itself passes in the batch.

## Checks actually run

1. `node --check dev/app.js` — clean (run after every edit; last run after removing the
   temporary measurement hook).
2. `node dev/dcode/selftest.mjs` — `all 284 checks passed`.
3. `node dev/gen-meta.mjs` — `official: 352, dcode: 187, probes: 112, probeExpected: 36,
   skipped: 21, total: 708`; `dev/meta.json`/`dev/testplan.json` regenerated (gitignored).
4. `node dev/build.mjs` — `wrote …/index.html 13.86 MB`, `worker 4786735 modules 24`;
   `index.html` is 14,538,667 bytes (the byte count changed only by the trailing-space
   cleanup above, so the generator is otherwise reproducible; last written 2026-10-29 01:48).
5. Built page at `http://127.0.0.1:8788/index.html` (existing `dev/serve.mjs`):
   - bundle pager table above, Final build, 3-value Compact; Full pill states in light/dark;
     header at 220 px wrapped with no overflow;
   - `Magic` card: 3 cases pass, 666/666 probed; `magic-benchmark` 13/14 (the plain-English
     failure is the pre-existing one);
   - wiring suite: 26 passed / 1 failed, 34.2 s; summary counted from the cards; Stop test
     above; self-check bite test above; a single card (`bundles`) re-ran successfully after
     the batch;
   - `localStorage["cipherflow.graph.v1"]` byte-identical after the batch (721 bytes, two
     nodes, one wire);
   - Operations tab: 684 passed / 111 probes / 0 failed / 3 blocked / 21 skipped;
   - pager test graph was removed afterwards and the autosave was verified back at 721 bytes
     with nodes 1 and 2 only.
6. Confirm prompts on the shipped file: `window.confirm` was the browser's native function
   (`[native code]`), no override in source (`window.__cfDebug` and every TEMP marker absent).
   A page-only spy that returned `false` captured
   `"Load the example? This replaces what is on the canvas. Saved graphs in this browser are kept."`
   and `"Start a new graph? This replaces what is on the canvas. Saved graphs in this browser are kept."`;
   both actions were cancelled, the graph unchanged.

## Judgement calls and limits

- **Pager/Full verification build.** Tasks 1–2 were verified end to end earlier in the
  session on the build that contains their final code; later rebuilds only added the Magic
  pool, metadata and wiring-suite changes. The final build re-exercised the pager, the Full
  pill, wrapping at 220 px and the two theme fills.
- **Copy** was proven by intercepting `navigator.clipboard.writeText` (`beta` for the page,
  the joined list for all-entries); the harness page is not focused, so reading the real
  clipboard back is refused by the browser. The app itself reported "Output copied".
- **Magic timings** are single-run wall times on this machine, with the serial baseline from
  a temporary one-chunk build that was reverted. They are reported as measured, including the
  cold-start loss.
- **`nodeSeq` allocation** changes are test-harness fixes (ids inside checks), not product
  behaviour.
- **The `magic-benchmark` failure** is left for mission 2; see above. No check was skipped,
  weakened or deleted to get the 26/27 result.
- Untracked fixtures (`check-all-ciphers.json`, `check_all_ciphers_*.json`,
  `cipherflow-*.json`, `screenshots/`) and both mission files are untouched and not
  committed.
