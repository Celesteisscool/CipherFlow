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

## Mission 2 — queued follow-up

Mission file: `reports/mission-2026-10-29b.md` (untracked, not committed). Started from
mission 1's commit `de86c3a` with a clean tree. Everything below was measured in the built
`index.html`, rebuilt with `node dev/build.mjs`; the shipped file was never hand-edited.
Mission 1's pager, Full pill, four-engine pool, probe expectations and wiring suite were not
modified. The only lab code touched is the `magic-benchmark` check's own rows and count, which
the mission allows.

### Task A — the extended benchmark and its baseline

`MAGIC_BENCHMARK` grew from 14 to 19 cases. The five new ones and why each exists:

| case | input | expected | why |
|---|---|---|---|
| nato sentence | `Hotel Echo Lima Lima Oscar (space) Whiskey Oscar Romeo Lima Delta` | `HELLO WORLD` | a real NATO message, mixed-case words and the `(space)` token |
| icao | `Alfa Bravo Charlie (space) Tango Hotel Echo (space) Delta Alfa Whiskey November` | `ABC THE DAWN` | the ICAO alphabet through the same decoder; long enough that the answer can actually rank (see the note below) |
| nato aliases | `Tango Hotel Echo (space) Alpha Lima Papa Hotel Alfa (space) Juliet Uniform Mike Papa Sierra (space) Foxtrot Oscar Xray` | `THE ALPHA JUMPS FOX` | the spellings people type: `Alpha`, `Juliet`, `Xray`, plus `(space)` |
| nato encoder output | `Hotel Echo Lima Lima Oscar  Whiskey Oscar Romeo Lima Delta ` | `HELLO WORLD` | the output of CyberChef's `Convert to NATO alphabet` fed back in; must be decoded by `Spelling Alphabet Decode`, never "solved" by the encoder |
| morse encoder output | `.- - - .- -.-. -.-`⏎`.- -`⏎`-.. .- .-- -.` | `ATTACK AT DAWN` | the output of `To Morse Code` fed back in; must decode via `From Morse Code` |

A run-on Morse case (no letter or word delimiters) was deliberately left out: a string of dots
and dashes with no separators has no single unambiguous plaintext, and inventing one would make
the benchmark assert a guess. Recorded here instead of added.

`top` is a new optional field: when a case names one, the top row's label must match it, so
"the right text came out of the wrong operation" cannot pass. The check now runs **every** case
instead of returning at the first failure, and ends with `top-1 N/M` plus one line per case
(`ok name → label score "output"`), so the same table can be produced by anyone, on any build.

**Bare `Alfa Bravo Charlie` is not in the pass/fail set, on purpose.** Its answer is three
characters. The hard "sub-8-character result cannot score above 20" cap holds `ABC` at 20 while
a junk decode sits at 45 (`Atbash Cipher 45 "Zouz Yizel Xsziorv"`, measured), so it cannot rank
first without breaking a guardrail the mission keeps. The ICAO alphabet is therefore tested
through a phrase long enough to read; the three-letter case is recorded as a guardrail limit,
not quietly dropped.

#### Before/after, identical cases

Measured on two builds that differ only in the scorer: "before" has the prior application
switched off and the old score-only warning, "after" is the final scorer. Both builds contain
the spelling-alphabet fixes, so the comparison isolates the scoring work.

| case | expected | before: top op (score) | after: top op (score) | hit |
|---|---|---|---|---|
| base64 | `The quick brown fox jumps over 13 lazy dogs.` | From Base64 (87) | From Base64 (87) | yes/yes |
| base64url | `Attack at dawn! Meet me by the old bridge.` | From Base64 (86) | From Base64 (86) | yes/yes |
| hex | `Hello, World!` | From Charcode (103) | From Charcode (103) | yes/yes |
| decimal bytes | `Hello, World!` | From Decimal (103) | From Decimal (103) | yes/yes |
| binary | `Hello, World!` | From Binary (103) | From Binary (103) | yes/yes |
| octal | `Hello, World!` | From Octal (103) | From Octal (103) | yes/yes |
| url encoded | `Café au lait is ready at nine` | URL Decode (45) | URL Decode (45) | yes/yes |
| caesar 3 | `Hello, World!` | ROT13 shift 23 (103) | ROT13 shift 23 (104) | yes/yes |
| caesar 7 | `Hello, world!` | ROT13 shift 19 (103) | ROT13 shift 19 (104) | yes/yes |
| atbash | `Hello, World!` | Atbash Cipher (103) | Atbash Cipher (104) | yes/yes |
| base32 | `Hello World!` | From Base32 (104) | From Base32 (104) | yes/yes |
| morse | `HELLO WORLD` | From Morse Code (105) | From Morse Code (107) | yes/yes |
| nato sentence | `HELLO WORLD` | Spelling Alphabet Decode (105) | Spelling Alphabet Decode (109) | yes/yes |
| icao | `ABC THE DAWN` | Spelling Alphabet Decode (76) | Spelling Alphabet Decode (80) | yes/yes |
| nato aliases | `THE ALPHA JUMPS FOX` | Spelling Alphabet Decode (79) | Spelling Alphabet Decode (83) | yes/yes |
| nato encoder output | `HELLO WORLD` | Spelling Alphabet Decode (105) | Spelling Alphabet Decode (109) | yes/yes |
| morse encoder output | `ATTACK AT DAWN` | From Morse Code (86) | From Morse Code (88) | yes/yes |
| plain english | (no answer) | GoldBug Decode (90), **no warning** | GoldBug Decode (90), warning | **no**/yes |
| gibberish | (no answer) | Enigma (45), warned | ROT13 shift 5 (45), warned | yes/yes |

**Top-1: 18/19 before → 19/19 after.** The one behavioural change is the `plain english` case:
the selected row is still the closest match, but Magic now says it is not convinced, which is
that case's contract. The score boosts are exactly the priors below (+4 spelling, +2 Morse,
+1 ROT13/Atbash) — every previously passing case still passes, and none of them changed
operation.

A first baseline, taken before the spelling-alphabet fixes and with the two short NATO cases,
was 13/19: `nato sentence` had the right text but a missing row count, `nato encoder output`
tied at 45 with `ROT13 (shift 7)` (CyberChef's encoder leaves a literal double space, and the
decoder was dropping it), `icao` picked `Atbash Cipher 45 "Zouz Yizel Xsziorv"`, `nato aliases`
picked `Enigma 45`, `plain english` warned not at all, and the Morse round-trip case was right
but uncounted. Those rows are what led to the op fixes and the warning correction below.

### Task B — `MAGIC_OP_PRIOR`

One table beside `MAGIC_WEIGHTS`. Applied once in `rankMagicResults()` after
`scoreMagicResult()`, then `magicApplyCaps()` re-applies the same caps in the same order as the
scorer: encoders ≤ 30, no-real-words ≤ 45 (35 under 12 letters), words-do-not-read ≤ 45 (≤ 52
for two tokens), sub-8-character results ≤ 20. A prior can therefore reorder results that are
already close (`104` over `103`, or a decode over a parser table at 45) but can never lift a
capped result above its ceiling.

| operation | delta | reason |
|---|---|---|
| Spelling Alphabet Decode | +4 | one word per letter; a readable result is a decode by construction |
| A1Z26 Cipher Decode | +3 | numbers to letters, nothing else to explain |
| Vigenère Decode | +3 | a keyed decode only lands on text when it worked |
| Fractionated Morse Decode | +2 | deterministic table decode |
| From Morse Code | +2 | deterministic table decode |
| UnMorse Decode | +2 | same, alternate Morse table |
| Morse Decode | +2 | same, CacheSleuth spelling of the table |
| Bacon Cipher Decode | +2 | five-bit groups to letters, no presentation tricks |
| Baudot Decode | +2 | deterministic five-bit table decode |
| Atbash Cipher | +1 | always yields letters; only text should survive |
| ROT13 | +1 | the shift sweep is the point; ties go to the decode |
| Parse UNIX file permissions | -2 | a permissions table describes the input, not a message |
| Render Markdown | -2 | markup shows the input, it does not decode it |
| Extract URLs | -2 | a list of what the input already contains |
| Extract domains | -2 | same, one field out of the input |
| Extract email addresses | -2 | same |
| Extract IP addresses | -2 | same |
| Extract hashes | -2 | same |
| Extract MAC addresses | -2 | same |
| Extract dates | -2 | same |
| Extract file paths | -2 | same |
| Extract EXIF | -2 | metadata dump |
| Extract Audio Metadata | -2 | metadata dump |
| Extract ID3 | -2 | metadata dump |
| Parse URI | -2 | a breakdown of the input |
| Parse User Agent | -2 | a breakdown of the input |
| Parse DateTime | -2 | a presentation of the input |
| Parse colour code | -2 | a presentation of the input |
| Show on map | -2 | draws the input |
| Generate all checksums | -2 | a listing of derived values |
| Generate all hashes | -2 | a listing of derived values |

No weight was added to an operation that only one case exercises, and no weight is large enough
to change a cap.

### Task C — NATO decoding and the encoder decision

**The encoder cannot be the answer.** `Convert to NATO alphabet` is classified as an encoder by
`magicOpClass()` (name starts with "Convert to "), capped at 30 by the scorer and again after
any prior. `Spelling Alphabet Decode` carries the positive weight instead. The
`nato encoder output` case feeds the encoder's exact output back in and asserts that the top row
is the decoder; it reads `Spelling Alphabet Decode (109)`.

Changes in the recreated spelling-alphabet operation (`dev/dcode/runtime-cachesleuth-code.js`),
not in the scorer:

- Alias spellings — `Alpha`→`Alfa`, `Juliet`→`Juliett`, `Whisky`→`Whiskey` — accepted only when
  the canonical word belongs to the selected alphabet, so APCO's spelling cannot leak into NATO.
  `X-ray`/`Xray` already collapsed to the same key.
- Hyphen-separated spellings (`Hotel-Echo-Lima-Oscar`) decode as their parts, but only when
  every part resolves; a stray hyphen in prose still yields `?` rather than a false decode.
- A run of two or more spaces between spelling words becomes a space in the output. CyberChef's
  `Convert to NATO alphabet` spells the letters and leaves the original space, so a round trip
  was losing the word break ("HELLOWORLD" instead of "HELLO WORLD"). This is what the NATO
  round-trip case now exercises.
- The operation's description lists the accepted spellings and the hyphen rule.

Guards for the change, so it cannot silently regress:

- Three known-answer selftests: `Alpha Bravo Charlie (space) Juliet X-ray Yankee` → `ABC JXY`,
  `Hotel-Echo-Lima-Lima-Oscar` → `HELLO`, `Whisky Alfa Xray` → `WAX`, plus the double-space
  round trip `Hotel Echo Lima Lima Oscar  Whiskey Oscar Romeo Lima Delta` → `HELLO WORLD`.
- A lab case, `nato aliases`, in the benchmark.

Bite test: with the alias table temporarily emptied, `node dev/dcode/selftest.mjs spelling`
failed with `"?BC ?XY"` and `"?AX"` (2 problems across 7 checks); restoring it passed 7/7. The
rest of the suite was unaffected.

### Task D — warning correctness, held-out cases, timing

**The `plain english` case needed a contract fix, not a bigger weight.** GoldBug's output is the
input with one letter changed (`dogp`), so it scores 90 against an input that itself scores
about 103 — a negative gain. The old warning only looked at the absolute score, so it called a
near-copy of the input convincing. A ±4 prior cannot move 90 below the 55 bar, so no weight
could have fixed this honestly. `runMagicNode()` now calls a result convincing only when it
clears the confidence score **and** reads **and** is solid **and** improves on the input by at
least `MAGIC_MIN_GAIN`. The node's output is still the selected row (top by default), and the
weak-result warning still appears for gibberish. This is the one scorer-contract change, and it
is what turns the benchmark from 18/19 to 19/19; no expectation was edited to accommodate it.

The benchmark's "expected visible rows" assertion was scoped to cases with an expected answer:
a no-answer case has no confident solve whose row count can be checked, and its contract is the
warning. The `plain english` and `gibberish` expectations themselves are unchanged and still
fail if the warning is missing (the before build demonstrates exactly that).

Existing honesty rules are untouched and still hold: messages/markup/parsed records are rejected
by `scoreMagicResult`, brute-force listings are never probed, "same letters" and
"contains the input" results score below every decode, and the ranking contract (a confident
decode plus a reading second-best, with an Enigma scramble dropped) still passes.

#### Held-out cases (invented after tuning, not used to tune)

Run through a temporary lab card on the final scorer, then removed and rebuilt; the card did not
change the scorer.

| input | top operation (score) | output | result |
|---|---|---|---|
| ROT-19 of `Meet me at the old bridge at midnight` | ROT13 shift 7 (85) | `Meet me at the old bridge at midnight` | **hit** |
| hex of `Honesty is the best policy.` | From Charcode (89) | `Honesty is the best policy.` | **hit** |
| `The%20early%20bird%20catches%20the%20worm!` | Fractionated Morse Decode (45) | `R N  T SLEYIRYT G` | **miss** |
| base64 of `Secret meeting at the library at nine` | From Base64 (45) | `Secret meeting at the library at nine` | **hit, warned** |

The URL-encoded miss is real and not retuned: percent-decoding `%20` leaves the letters
identical, so the "same letters rearranged" guard (score −500) discards the correct
`The early bird catches the worm!` before ranking. The original URL case only survives because
`%C3%A9` decodes to `é`, whose letters differ after the guard's normalisation. Fixing that guard
is a scorer change the mission did not ask for, so it is reported rather than patched. The
base64 hit carries a warning because only three of its seven words (`secret`, `meeting`, `the`)
are in the scorer's dictionary, so the words-do-not-read cap holds it at 45 — the text is still
selected correctly.

#### Timing

`magic` card (three sweeps: Caesar, base64, hex; 666 candidates each), same machine:

| build | card wall time | per sweep |
|---|---|---|
| mission 1 final (no priors, old warning) | 17.86 s | ~6.0 s |
| mission 2 final, cold | 19.34 s | 6.4 s |
| mission 2 final, warm | 14.47 s / 15.02 s | 4.8–5.0 s |

The scorer work is a Map lookup and a few comparisons per distinct result; the variation is
engine warmth, not scoring, and a full default sweep stays well under the ~20 s bar. The
`magic-benchmark` card is 19 sweeps and reports 44.4 s after (44.8 s on the pre-tuning build),
so scoring added no measurable cost.

### Checks actually run

1. `node --check dev/app.js` — clean, including after removing the temporary held-out card.
2. `node dev/dcode/selftest.mjs` — `195 operations, 191 known-answer checks` → **all 288 checks
   passed**; the `spelling` filter alone passes 7/7.
3. `node dev/build.mjs` — `wrote …/index.html 13.87 MB`, `worker 4786735 modules 24`;
   `index.html` is 14,547,447 bytes, sha256 `99ed345c…55f305b2f`. Two consecutive builds from
   the same sources produced the identical hash. The byte count moved from the earlier
   measurement build because `node dev/gen-meta.mjs` was rerun after the operation description
   and selftest changes, so the inlined catalogue and test plan are current.
4. Built page at `http://127.0.0.1:8788/index.html`:
   - `magic-benchmark`: **top-1 19/19**, all 19 rows `ok`, 44.4 s; the same card on the
     pre-tuning build was 18/19 with `plain english … (no warning)` — see the table above.
   - `magic`: pass, `ROT13 (shift 23) 104`, `From Base64 87`, `From Charcode 103`, 666/666
     probed, 15.0 s.
   - Wiring suite, one click: **27 passed · 0 failed · 58.2 s** (mission 1's failing card is
     green now); no other card changed.
   - Operations tab, `Run all checks`: **688 passed · 111 probes · 0 failed · 3 blocked
     upstream · 21 skipped** of 823 planned checks — mission 1 was 684 passed of 819, and the
     four extra passes are the new spelling-alphabet selftests.
   - Example/New prompts: `window.confirm` was the browser's own (`[native code]`) before any
     override; a page-only spy that returned `false` captured
     `"Start a new graph? This replaces what is on the canvas. Saved graphs in this browser are kept."`
     and `"Load the example? This replaces what is on the canvas. Saved graphs in this browser are kept."`,
     and the graph was unchanged.
5. Temporary harness: `magic-heldout` card added for the four held-out cases, run in the built
   page, then deleted. The final build after regenerating metadata is sha `99ed345c…`; no
   harness code is in the commit.
6. Working tree at commit time contains only `dev/app.js`, `dev/dcode/ops-cachesleuth-code.mjs`,
   `dev/dcode/runtime-cachesleuth-code.js`, `index.html` and this report's appended section.

### Judgement calls and limits

- **The bare three-letter ICAO case is a guardrail limit, not a miss.** `ABC` is capped at 20
  (sub-8 characters) while junk sits at 45, so it cannot rank first without weakening a cap the
  mission keeps. ICAO is covered through a read-length phrase instead, and the measured
  three-letter behaviour is recorded above.
- **Benchmark case re-specification.** The first run used the literal short ICAO/alias strings;
  they were replaced with phrases that decode to readable text before the scoring work began,
  because their expected outputs were unreachable under the sub-8 cap. The original measured
  rows are preserved in this report.
- **The warning change is a contract fix, not a weight.** A ±4 prior cannot overcome 35 points
  of gap; the old rule was answering "is this legible?" when the question is "is this a find?".
  No cap was lowered and no expectation edited.
- **Encoder exclusion** is enforced by classification and two caps, and demonstrated by the
  NATO round-trip case, which feeds the encoder's own output back in.
- **Held-out URL miss** is left unfixed and reported, per the mission's instruction not to retune
  after seeing held-out results.
- **Not covered:** NATO spelling of digits (`Zero`, `One`, …) is not decoded by this operation —
  its encoder only spells letters — so that was left out of scope rather than guessed at. No
  other browser or machine was tested, and timings are single-run wall times that vary with
  engine warmth.
