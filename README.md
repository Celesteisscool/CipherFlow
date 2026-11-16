# NodeChef / CipherFlow

An offline **node-based CyberChef** editor: drop CyberChef operations onto a canvas, wire
them together into a graph, and run several inputs through the chain.

The app is `index.html` plus an `assets/` folder. The page carries the shell, the editor and
the operation catalogue; the CyberChef worker, its operation modules, the symbol alphabets,
the test plan and the Bad Apple video are fetched from `assets/` the first time a feature
needs them, then cached by the browser. There is nothing to install and no CDN, and once
those files are cached the app works offline.

The **?** in the node list opens the reference, a seven-step tour walks through the canvas,
and the **flask** opens the verification lab: known-answer vectors, live probes and graph
wiring checks for every operation. All three are part of the same page.

- **App entry point:** [`index.html`](index.html) (the built shell; serve it with `assets/`)
- **Engine:** CyberChef 11.5.0 (Apache-2.0), loaded from `assets/chefworker.js`; operation modules are fetched on demand
- Extra operations recreated in the style of dCode and CacheSleuth live in [`dev/dcode/`](dev/dcode)

## Run it locally

Serve the folder over HTTP (opening the file directly with `file://` is not supported,
because the app runs the engine in web workers):

```bash
node dev/serve.mjs 8788
# then open http://127.0.0.1:8788/index.html
```

Serve the repository root, not `index.html` alone: the server must also expose `assets/`,
or the engine worker and its modules will 404.

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

Note: the shell is **1.7 MB** (measured at 358 KB Brotli). `assets/` is about **66 MB** in
total, but it is not one download: the worker is 6 MB, the 24 operation modules are about
29 MB combined (only the modules a recipe names are fetched), the symbol art is 26 MB
(only when a symbol alphabet is opened), the test plan is 1.9 MB (only when the lab is
opened) and the Bad Apple video is 4.5 MB (only when that node is placed). GitHub Pages
serves all of it compressed, so the first use of each feature pays for its file once;
after that it is cached and runs offline.

## Repository layout

```
index.html            the app shell (deployed with assets/)
assets/               worker, operation modules, glyph art, test plan, Bad Apple PV
dev/app.js            UI source: canvas, nodes, wiring, run loop
dev/styles.css        UI source: styles
dev/dcode/            recreated dCode/CacheSleuth operations (payload + runtime + ops)
dev/symbols/          symbol alphabets: shipped glyph art, tag vocabulary, source verifier
dev/build.mjs         writes index.html and assets/ from the sources and extracted worker
dev/gen-meta.mjs      builds the operation catalogue + test plan
dev/serve.mjs         tiny dev static server (dev only, not part of the app)
dev/collect-*.mjs     scripts that collect the operation fixtures/tests used by gen-meta
dev/chess.js          pure chess rules for the Chess node; dev/chess.test.mjs checks them
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
