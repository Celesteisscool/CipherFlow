# NodeChef / CipherFlow

A single-file, offline **node-based CyberChef** editor: drop CyberChef operations onto a
canvas, wire them together into a graph, and run several inputs through the chain.

The whole app ships as one self-contained `index.html` — the CyberChef engine, its
operation modules and every symbol alphabet are embedded in the page, so there is nothing
to install, no CDN, and no network access at runtime. Open it and it works offline.

The **?** in the node list opens the reference, a seven-step tour walks through the canvas,
and the **flask** opens the verification lab: known-answer vectors, live probes and graph
wiring checks for every operation. All three are part of the same page.

- **App entry point:** [`index.html`](index.html) (the built, self-contained app)
- **Engine:** CyberChef 11.5.0 (Apache-2.0), bundled inline
- Extra operations recreated in the style of dCode and CacheSleuth live in [`dev/dcode/`](dev/dcode)

## Run it locally

Serve the folder over HTTP (opening the file directly with `file://` is not supported,
because the app runs the engine in web workers):

```bash
node dev/serve.mjs 8788
# then open http://127.0.0.1:8788/index.html
```

Any static file server works, since the app is a single HTML file.

## Deploy with GitHub Pages

This repo is laid out for Pages: `index.html` is at the repository root, and Pages serves that
branch root as the site.

1. Push this repo to GitHub (see below).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch **`main`**,
   folder **`/ (root)`**.
4. Once the deploy finishes the site is live at `https://<your-username>.github.io/<repo-name>/`.

Everything committed to `main` is reachable at that origin, so keep private working notes out
of the tree. The tracked `.nojekyll` file makes Pages serve the files verbatim instead of
running them through Jekyll.

**Push it the first time:**

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Note: `index.html` is about 40 MB because it carries the whole engine, its modules and the
symbol art inline. GitHub Pages serves it compressed — measured at 28 MB gzipped and
27 MB Brotli — so the first load is the slow one; after that it is cached and runs fully
offline. A plain static server without compression sends the full 40 MB.

## Repository layout

```
index.html            the app (self-contained, this is what gets deployed)
dev/app.js            UI source: canvas, nodes, wiring, run loop
dev/styles.css        UI source: styles
dev/dcode/            recreated dCode/CacheSleuth operations (payload + runtime + ops)
dev/symbols/          symbol alphabets: shipped glyph art, tag vocabulary, source verifier
dev/build.mjs         inlines app.js, styles.css, the engine and metadata into index.html
dev/gen-meta.mjs      builds the operation catalogue + test plan
dev/serve.mjs         tiny dev static server (dev only, not part of the app)
dev/collect-*.mjs     scripts that collect the operation fixtures/tests used by gen-meta
dev/testregister-stub.mjs
```

### Rebuilding `index.html`

The build reads two extracted inputs that are generated from the `cyberchef` npm
package and are **not committed** (they are large and reproducible):

- `dev/modules/modules/*.js` — the per-operation module dumps
- `/tmp/chefworker.js` — the extracted CyberChef worker (`dev/build.mjs` requires it)

Generated files that are also not committed: `dev/cc-tests.json` (from
`collect-entry.mjs`), `dev/meta.json` and `dev/testplan.json` (from `gen-meta.mjs`).

```bash
npm install
node dev/collect-entry.mjs   # -> dev/cc-tests.json
node dev/gen-meta.mjs        # -> dev/meta.json, dev/testplan.json
node dev/build.mjs           # -> index.html
```

## Credits

Built on [CyberChef](https://github.com/gchq/CyberChef) (Apache-2.0). Some operation
behaviour was modelled on [dCode](https://www.dcode.fr/) and
[CacheSleuth](https://www.cachesleuth.com/) for reference.
