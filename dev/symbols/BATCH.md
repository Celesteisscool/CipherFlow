# Batch runbook — what to do when the user says "create a new batch"

This replaces the old Phase-1 approval gate. You choose the ciphers, run the pipeline, check it in
a real browser, and **end by asking the user to sign off** — you do not commit until they answer.

One batch = one reading of this file. Do not improvise flags; if a rule here does not cover a
case, record it and keep going, and put it in the closing questions.

---

## 0. Parameters

| Parameter | Value | Source |
|---|---|---|
| Batch size `N` | a number named in the request; else **15** while the catalogue holds < 100 ciphers, **25** at ≥ 100 | `dev/symbols/catalogue.json` row count |
| Candidate order | alphabetical by slug | CacheSleuth `image_manifest.json` |
| Art source | CacheSleuth | dCode art only as an optional swap offered in the closing note |
| dCode lookup | `node dev/symbols/dcode-find.mjs <slug>` | matches dCode's sitemap and verifies the page's glyph inventory — a guessed slug is never evidence |
| Sheets | `reports/sheets/<slug>.html` | `dev/symbols/sheet.mjs` |
| Commit | **not** part of the run | ask first (§8) |
| Push | never | the user pushes |

State `N` and the current catalogue size in the opening line of the final report, so a size
change (15 → 25) is visible when it happens.

---

## 1. Pick the ciphers — no approval

Candidates are manifest slugs that are not yet in the catalogue, alphabetically:

```bash
node -e '
const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync("/tmp/image_manifest.json", "utf8"));
const shipped = new Set(JSON.parse(fs.readFileSync("dev/symbols/catalogue.json", "utf8")).map(r => r.slug));
const rows = Object.keys(manifest).filter(s => !shipped.has(s) && manifest[s].length)
    .map(s => ({slug: s, files: manifest[s].length}))
    .sort((a, b) => a.slug.localeCompare(b.slug));
console.log(rows.length + " candidates remain");
for (const r of rows.slice(0, 40)) console.log(r.slug.padEnd(26), String(r.files).padStart(3), "files");
'
```

`/tmp/image_manifest.json` is cached by `extract.mjs`; if it is missing, run any extraction once
and it reappears.

Then, for the first `N` candidates:

- **Skip** a slug with no descriptor:
  `grep -c "url:\"<slug>\"" "CACHESLUETH CODE LIST/Code Tables - CacheSleuth_files/codes.js"`
  returning 0.
- **Skip** a slug whose staging fails its count check, and take the next candidate instead, so the
  batch still delivers `N`. Log every skip with its reason.
- Record the chosen list and the skips in `reports/plan-symbol-ciphers.md` under a new
  `**Phase 1 (batch n) — selection**` heading. No proposal, no waiting.

---

## 2. Prove the largest cipher first

"Largest" = most manifest files (a proxy for the biggest declared set; confirm against the staged
count and say so if another cipher turns out larger).

**Find its dCode page first — never guess a slug:**

```bash
node dev/symbols/dcode-find.mjs <slug>
```

This matches the cipher's name against dCode's own sitemap (with 1–2 edit tolerance, so
`amohibia` reaches `amphibia`) and then verifies the candidate page's glyph inventory against the
declared keys. Three outcomes:

- `SELECTED /<page>` — 100% key coverage plus the page's own `<h1>` agreeing with the name.
- `SELECTED /<page>  (art 0.80 over 26 keys, next best 0.61; name … < 0.8)` — the title shares
  nothing with ours but the **art is the same set**. This is how `ancienthylian` resolves to
  `/hylian-language-skyward-sword` (0.80 median glyph IoU, other Hylian pages 0.49–0.61).
- `NO PAGE` — nothing in the sitemap is this cipher. That, and only that, is evidence of
  single-source; a 301 on a slug you invented is not.
- `NO PAGE — <path> covers the keys but calls itself "…"` or `closest art is 0.35` — a *different*
  cipher that happens to share the key plan (Futurama's alphabet also has 36 letters and digits,
  measured at 0.35 against our art). Ignore it.

Three gates, in order: 100% key coverage, then the page's `<h1>` matching the cipher's name
(≥ 0.80), then — only if no title agrees — glyph-by-glyph art agreement (median dilated IoU
≥ 0.65 and ≥ 0.08 clear of the runner-up). Coverage alone is how `alienlanguage` matched Futurama
at 36/36; names alone would lose Ancient Hylian. `--no-shape` skips the art pass when it is slow.

A non-zero exit from the lookup is not a failed run; it is the answer.

```bash
node dev/symbols/extract.mjs <slug> --dcode /<page> 2>&1 | tail -20   # only after SELECTED
node dev/symbols/extract.mjs <slug> 2>&1 | tail -20                   # after NO PAGE
```

**Stop the whole run** if this cipher fails its count check, has missing art, or a non-PNG: the
pipeline is broken, not the cipher. Report and ask before continuing.

Otherwise print its glyph count, art files, source and check result, then go to §3.

---

## 3. Stage the rest of the batch

```bash
node dev/symbols/dcode-find.mjs <slug>                  # SELECTED / NO PAGE, per cipher
node dev/symbols/extract.mjs <slug> [--dcode /<page>]   # --dcode only on SELECTED
```

Automatic per-cipher decisions, applied without asking:

| Decision | Rule |
|---|---|
| Source toggle | will appear only if dCode covers **every declared key** — letters, digits and specials — with no private-use keys. Do not force it. |
| Case split (`--cases`) | only if dCode art ships and an upper/lower pair differs by hash; with CacheSleuth art it is not used. |
| `tightArt` | on when the drawing's rendered ink long axis is < 12 px in a 30 px tile; otherwise off. |
| Drops | none automatically. |
| Notes | none. |

Every staged cipher must print `COUNT CHECK: PASS`. A cipher that cannot pass is dropped from the
batch (§1) and named in the report — never shipped short.

---

## 4. Install and build

```bash
# hash snapshot, so install churn can be proven contained
find dev/symbols/data -name '*.json' -exec md5sum {} + | sort > /tmp/batch-before-data.md5
find dev/symbols/art -type f -exec md5sum {} + | sort > /tmp/batch-before-art.md5

node dev/symbols/install.mjs
node dev/build.mjs
stat -c '%s' index.html
```

`install.mjs` with no arguments rewrites the catalogue from every cipher in `/tmp/symstage`, so a
new batch needs **everything that is not a new cipher restored**:

```bash
for f in $(git diff --name-only -- dev/symbols/data dev/symbols/art); do
  case "$f" in
    *<new-slug-1>*|*<new-slug-2>*) ;;   # list every new slug
    *) git checkout -- "$f" ;;
  esac
done
rm -f dev/symbols/art/*/_dcode/char\(*\).png   # only if untracked drift appeared for a shipped cipher
```

Then verify by hash that no non-target data file or art file changed, and that the catalogue diff
is exactly `N` added rows.

For a later fix to a shipped cipher, name the slugs instead — `node dev/symbols/install.mjs
coldcode` installs just that one and patches only its catalogue row (the `new` marks and every
other row are left as they stand), so no restore step is needed.

---

## 5. Sheets and the inventory checklist

```bash
for slug in <new slugs>; do node dev/symbols/sheet.mjs "$slug"; done
ls -la reports/sheets/<new slugs>.html
```

Each sheet states its own tile counts (`ours` / `dCode`). The sheet is what the user reviews, so a
sheet that fails to build is a blocking error, not a warning.

**Then refresh the checklist** — `reports/symbol-ciphers-inventory.md` is generated, never edited:

```bash
node dev/symbols/inventory.mjs        # add --refresh to re-fetch both source lists
```

**Mark the batch in the catalogue.** Add `"new": true` to each new row of
`dev/symbols/catalogue.json` (drop it from the previous batch's rows) — the panel prints a **New**
pill on those rows, which is how the newest ciphers are found in a list this long. A full
`install.mjs` run rewrites the catalogue without the flag, so this is a follow-up edit, not a
staging one; a subset install (named slugs) keeps it.

Run it after `install.mjs`, so the tick marks describe what this batch actually shipped. It reads
CacheSleuth's `codes.js` and dCode's `/symbols-ciphers` index, diff them against
`catalogue.json`, and rewrite all five sections; it exits 1 rather than write a file whose counts
do not add up. Paste its printed figures into the report (§7).

---

## 6. Headless browser check (required)

Drive the **shipped** `index.html` over CDP against the local server, one node per new cipher.
Reuse the harness pattern in the previous phase scripts (`/tmp/phase8.mjs`):
`~/.cache/puppeteer/chrome/linux-<ver>/chrome-linux64/chrome`, `--headless=new`,
`--remote-debugging-port`, `Runtime.evaluate` with an async page function.

Assertions — every one must pass before the report is written:

1. boot splash clears; the rail count and panel row count equal the new catalogue size
2. each new cipher places from the panel and renders a node
3. tile count equals its data file, and every tile has a `data:image/png` src
4. captions equal the source labels; 0 placeholders (`?` tiles)
5. the foot reads `N glyphs`; a source toggle appears **only** for ciphers where dCode covers
   every declared key, and the fixed label matches the art source otherwise
6. clicking the first tile transcribes its key into the textarea
7. multi-key ciphers (keys longer than one character) still separate entries
8. any cipher carrying a note renders it above the grid

Also run the end-to-end source check:

```bash
node dev/symbols/verify-source.mjs            # exits 1 only on a CacheSleuth mismatch
```

Report the pass count (`n/n checks`). A failure here blocks the batch: fix the cause, re-run the
affected check, do not commit around it.

---

## 7. The report

One message, in this shape:

```
Batch <n> — <N> ciphers, catalogue <before> → <after>, index.html <bytes> (<+Δ>)

| Cipher | Slug | Glyphs | CacheSleuth | dCode | Toggle | Sheet |
|---|---|---|---|---|---|---|
| Name   | slug | 36     | 36          | 26    | no     | reports/sheets/slug.html |

Symbols added: <sum> · art files: <sum> · toggles added: <list or none>
Inventory: CacheSleuth <done>/<total> (<pct>%), <left> left · dCode <bound> bound / <twin> twin / <fresh> uncatalogued
Blocked/skipped: <slug — reason> (or "none")
Browser pass: <n>/<n> · verify-source: <n> glyphs matched, 0 mismatched
```

"CacheSleuth" is the shipped glyph count; "dCode" is the evidence count (`0` when the cipher is
single-source). Every sheet gets a clickable link on the tailnet:

`http://100.109.160.10:8788/reports/sheets/<slug>.html`

(the IP and port come from whichever static server is up — `node dev/serve.mjs 8788` or the
local one already serving the repo; check with `ss -ltnp | grep 8788` before quoting links).

Close with what was **not** verified, and nothing else.

---

## 8. Questions to ask — every time, exactly these

1. **"Do the sheets look right — any cipher to swap, drop or fix before this ships?"**
   (point at the sheet links; this is the eyeball pass)
2. **"Commit this batch now — sources plus the rebuilt `index.html`?"**
3. Only when dCode's art is visibly the better set for a cipher:
   **"Do you want `<slug>` switched to dCode's art like stray?"**

Do not commit, push, or start another batch until the answers arrive. If the user answers only
question 2 with "yes", commit and stop.

---

## 9. Definition of done

- [ ] `N` ciphers staged, **all PASS**, none shipped short
- [ ] non-target data/art unchanged (hash-verified)
- [ ] `dev/build.mjs` exit 0, bytes recorded
- [ ] catalogue rows == data files == art dirs; 0 tiles without art
- [ ] a sheet exists for every new cipher and lists both sources' counts
- [ ] `node dev/symbols/inventory.mjs` exits 0 and its counts match the report
- [ ] browser pass all green, `verify-source` 0 mismatches
- [ ] report posted with links, counts per source, and the three questions
- [ ] **nothing committed yet**

---

## 10. Failure handling

| Failure | Action |
|---|---|
| One cipher fails its count check | drop it, take the next candidate, name it in the report |
| The largest cipher fails | stop the run before installing anything; report the cause |
| dCode page missing | only after `dcode-find.mjs` prints `NO PAGE` — stage single-source, record it, no toggle |
| dCode page captcha-walled | stage single-source, record it, no toggle |
| Install churns shipped files | restore by hash/`git checkout`, re-verify, then continue |
| Build fails | stop, leave `index.html` as it was, report |
| Browser check fails | fix the cause and re-run that check; never relax the assertion |
| More than half the candidates fail | stop and ask — that means a source changed, not a bad batch |
