import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {MODULE_NAME, renderModule} from "./dcode/payload.mjs";
import {glyphDataBundle, spriteStats} from "./symbols/index.mjs";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "index.html");
const MODULE_DIR = path.join(ROOT, "dev/modules/modules");

const WORKER_PATH = "/tmp/chefworker.js";
if (!fs.existsSync(WORKER_PATH)) throw new Error("Missing extracted CyberChef worker: " + WORKER_PATH);

const HOOK = `
;(function () {
    // CipherFlow host hooks -------------------------------------------------
    // The extracted CyberChef worker normally fetches modules/<Name>.js from its
    // own origin. In this single-file build the host page delivers every module
    // over postMessage instead, so preloaded modules satisfy the recipe loader.
    self.loadRequiredModules = function (recipeConfig) {
        for (const step of recipeConfig || []) {
            const mod = self.OperationConfig && self.OperationConfig[step.op] && self.OperationConfig[step.op].module;
            if (mod && mod !== "Default" && !(mod in self.OpModules)) {
                self.postMessage({action: "cipherflowModuleMissing", name: mod, op: step.op});
            }
        }
    };
    self.addEventListener("message", function (ev) {
        const d = ev.data || {};
        if (d.action === "cipherflowModule") {
            try {
                (0, eval)(String(d.source) + "\\n//# sourceURL=cipherflow-" + d.name + ".js");
                self.postMessage({action: "cipherflowModuleLoaded", name: d.name});
            } catch (err) {
                self.postMessage({action: "cipherflowModuleError", name: d.name, message: String((err && err.message) || err)});
            }
        }
    });

    // Magic ---------------------------------------------------------------
    // Runs every candidate operation once over the same input inside this worker
    // (one message instead of hundreds) and returns their raw text results. The
    // host page scores and ranks them.
    self.addEventListener("message", async function (ev) {
        const d = ev.data || {};
        if (d.action !== "cipherflowProbe") return;
        const data = d.data || {};
        const results = [];
        // Every candidate gets its own copy of the input. Operations are allowed to work on
        // the bytes they are handed, and several do (arithmetic, XOR, bit shifts), so reusing
        // one buffer let each operation read whatever the one before it left behind — From
        // Base64 decoded correctly on its own and returned mojibake in the middle of a sweep.
        const source = data.input instanceof ArrayBuffer
            ? data.input
            : (data.input && data.input.buffer ? data.input.buffer.slice(0) : new ArrayBuffer(0));
        for (const candidate of data.candidates || []) {
            const started = Date.now();
            try {
                const res = await self.chef.bake(source.slice(0), [{op: candidate.op, args: candidate.args || []}], {returnType: "string"});
                // Score the raw value, not the presentation: image, archive and chart
                // operations present themselves as markup, which would otherwise look
                // like very promising text.
                let text = "";
                const raw = res && res.dish ? res.dish.value : null;
                if (typeof raw === "string") text = raw;
                else if (raw != null) {
                    try { text = String(await res.dish.get("string")); } catch (err) { text = ""; }
                }
                if (!text && res && typeof res.result === "string") text = res.result;
                // The arguments come back with the result: a swept candidate is not always the
                // operation's default, and the host needs the exact ones to bake the pick.
                results.push({op: candidate.op, args: candidate.args || [], label: candidate.label || "", ok: true, text: text.slice(0, 1500), length: text.length, kind: res && res.type, ms: Date.now() - started});
            } catch (err) {
                results.push({op: candidate.op, args: candidate.args || [], label: candidate.label || "", ok: false, error: String((err && err.message) || err).slice(0, 200), ms: Date.now() - started});
            }
        }
        self.postMessage({action: "cipherflowProbeDone", data: {id: data.id, results: results, ms: Date.now() - (data.started || Date.now())}});
    });
})();
`;

const worker = fs.readFileSync(WORKER_PATH, "utf8") + "\n" + HOOK;
// The recreated dCode operations are generated from dev/dcode/*.mjs into one more
// module bundle, delivered to the worker exactly like the built-in ones.
const moduleFile = path.join(MODULE_DIR, MODULE_NAME + ".js");
fs.writeFileSync(moduleFile, renderModule());
console.log("Recreated ops module:", (fs.statSync(moduleFile).size / 1024).toFixed(1), "KB");
const moduleFiles = fs.readdirSync(MODULE_DIR).filter(f => f.endsWith(".js")).sort();
const modules = moduleFiles.map(file => ({
    name: file.replace(/\.js$/, ""),
    source: fs.readFileSync(path.join(MODULE_DIR, file), "utf8")
}));

const meta = fs.readFileSync(path.join(ROOT, "dev/meta.json"), "utf8");
const tests = fs.readFileSync(path.join(ROOT, "dev/testplan.json"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "dev/styles.css"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "dev/app.js"), "utf8");
// The symbol tag vocabulary and its measurements, shared with the build scripts: the app
// runs this exact file over a picture, dev/symbols/tags.mjs runs it over the shipped art.
const tagMath = fs.readFileSync(path.join(ROOT, "dev/symbols/tagmath.js"), "utf8");
// The chess rules are shared the same way: one file, inlined here and loaded directly by
// dev's checks, so the board in the page and the tests agree on what a legal move is.
const chessJs = fs.readFileSync(path.join(ROOT, "dev/chess.js"), "utf8");

// Symbol ciphers travel as one JSON island of data URLs: the panel and the node draw
// straight from it, so a single-file offline build never fetches a glyph at runtime.
// Every cipher in here has already passed its count check (dev/symbols/index.mjs).
const glyphs = glyphDataBundle();
const glyphStats = spriteStats();
console.log("glyphs:", glyphStats.ciphers, "ciphers", glyphStats.symbols, "symbols",
    (glyphStats.bytes / 1024).toFixed(0), "KB of source art");

const gzB64 = str => zlib.gzipSync(Buffer.from(str, "utf8"), {level: 9}).toString("base64");
const jsonForScript = str => str.replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

function chunks(b64, width = 200) {
    const out = [];
    for (let i = 0; i < b64.length; i += width) out.push(b64.slice(i, i + width));
    return out.join("\n");
}

const engineB64 = chunks(gzB64(worker));
const moduleTags = modules.map(m => `<script type="text/plain" id="moduleGzip-${m.name}" data-module-gzip="${m.name}">\n${chunks(gzB64(m.source))}\n</script>`).join("\n");

// The favicon is the sidebar's node-graph mark, inline as an SVG data URI: no extra file to
// ship, no request, and it still works when index.html is opened straight off disk or served
// from Pages. The brand mark inverts with the theme, so the dark-scheme link overrides the
// light default below it.
const faviconSvg = (bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">` +
    `<rect width="16" height="16" rx="4.5" fill="${bg}"/>` +
    `<g fill="none" stroke="${fg}" stroke-width="1.5" stroke-linecap="round">` +
    `<circle cx="4" cy="3.2" r="1.55"/><circle cx="12" cy="8" r="1.55"/><circle cx="4" cy="12.8" r="1.55"/>` +
    `<path d="M5.5 3.9 10.4 7.1M5.5 12.1 10.4 8.9"/></g></svg>`;
const faviconHref = (bg, fg) => "data:image/svg+xml," + encodeURIComponent(faviconSvg(bg, fg));

const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#ecece8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0d10" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/svg+xml" href="${faviconHref("#17181a", "#f8f8f5")}">
<link rel="icon" type="image/svg+xml" href="${faviconHref("#eef0f4", "#14171c")}" media="(prefers-color-scheme: dark)">
<script>
// Apply the saved theme before the first paint so the loading screen does not flash
// the wrong colour. initTheme() repeats this once the app boots.
(function () {
    try {
        var t = localStorage.getItem("cipherflow.theme.v1") ||
            (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.dataset.theme = t;
    } catch (e) { /* storage unavailable; keep the default */ }
})();
</script>
<title>CipherFlow — node-based CyberChef</title>
<meta name="description" content="A single-file, offline node editor for chaining CyberChef's operations with multiple inputs.">
<style>
${css}
</style>
</head>
<body>
<noscript><p style="padding:24px;font:14px system-ui">CipherFlow needs JavaScript. All processing happens locally in this page.</p></noscript>

<div class="boot" id="boot" role="status" aria-live="polite">
    <div class="boot-card">
        <span class="boot-spinner" aria-hidden="true"></span>
        <div class="boot-title">CipherFlow</div>
        <div class="boot-sub">Offline node editor — everything runs in this page</div>
        <div class="boot-status" id="bootStatus">Loading the embedded engine…</div>
        <div class="boot-progress" aria-hidden="true">
            <div class="boot-bar"><span class="boot-bar-fill" id="bootBarFill"></span></div>
            <span class="boot-pct" id="bootPct">4%</span>
        </div>
        <div class="boot-error" id="bootError" hidden></div>
        <button class="btn-primary boot-retry" id="bootRetry" hidden>Reload</button>
    </div>
</div>
<script>
/* Sits directly under the splash so it runs before the payload islands below are parsed,
 * which is most of a cold load and is invisible to the app, whose script comes last. The
 * browser reports nothing while it parses, so this stretch is a clock-based estimate: it is
 * capped at the first measured stage, and app.js takes the bar over the moment it runs. */
(function () {
    var shell = document.getElementById("boot");
    var fill = document.getElementById("bootBarFill");
    var label = document.getElementById("bootPct");
    if (!shell || !fill) return;
    var from = 4, to = 40, ms = 5000, t0 = performance.now();
    var timer = setInterval(function () {
        if (window.__bootApp || !document.getElementById("bootBarFill")) { clearInterval(timer); return; }
        var t = Math.min(1, (performance.now() - t0) / ms);
        var pct = from + (to - from) * (1 - Math.pow(1 - t, 3));
        fill.style.width = pct.toFixed(1) + "%";
        if (label) label.textContent = Math.round(pct) + "%";
    }, 100);
})();
</script>

<div id="app">
    <main class="stage" id="stage">
        <div class="toolbar" id="toolbar"></div>
        <div class="world" id="world">
            <svg class="edges-svg" id="edgesSvg" aria-hidden="true"><g id="edgesLayer"></g></svg>
            <div class="nodes-layer" id="nodesLayer"></div>
            <svg class="edge-handles-svg" id="edgeHandlesSvg" aria-hidden="true"><g id="edgeHandlesLayer"></g></svg>
        </div>
        <div class="stage-controls">
            <button class="zoom-btn" id="zoomOut" title="Zoom out">−</button>
            <span class="zoom-value" id="zoomLabel">100%</span>
            <button class="zoom-btn" id="zoomIn" title="Zoom in">+</button>
            <button class="zoom-btn fit-btn" id="fitBtn" title="Fit graph to view"><span id="fitBtnIcon"></span>Fit</button>
            <button class="zoom-btn fit-btn" id="snapBtn" title="Snap is off: click to keep every node on the grid" aria-pressed="false"><span id="snapBtnIcon"></span>Snap</button>
        </div>
        <div class="run-status" id="runStatus" title="Last run summary"><span class="status-dot"></span><span id="runStatusText">Loading embedded engine…</span></div>
    </main>

    <aside class="sidebar" id="sidebar">
        <div class="sidebar-head">
            <div class="brand"><span class="brand-mark"></span><span>CipherFlow · offline node editor</span></div>
            <div class="sidebar-title-row">
                <h1 class="sidebar-title">Node list</h1>
                <span class="count-badge"><span id="opCount">0</span> nodes</span>
                <button class="icon-button" id="themeBtn" title="Toggle dark / light mode"></button>
                <a class="icon-button" id="githubBtn" href="https://github.com/Celesteisscool/CipherFlow" target="_blank" rel="noopener noreferrer" title="CipherFlow on GitHub" aria-label="CipherFlow on GitHub"></a>
                <button class="icon-button" id="helpBtn" title="How this works"></button>
                <button class="icon-button" id="labOpenBtn" title="Open the verification lab"></button>
                <button class="icon-button sidebar-close" id="sidebarCloseBtn" title="Close node list"></button>
            </div>
            <div class="search-wrap">
                <span id="searchIcon"></span>
                <input id="paletteSearch" class="search-input" placeholder="Search operations" autocomplete="off" spellcheck="false" aria-label="Search operations">
                <button class="search-clear" id="searchClear" title="Clear search"></button>
            </div>
            <p class="sidebar-hint">Click to add, or drag onto the canvas. Wire a second input into any key, IV or text argument. Engine: <span id="engineLabel">CyberChef</span>.</p>
        </div>
        <div class="sidebar-body" id="paletteBody"></div>
        <div class="sidebar-foot">
            <span class="engine-dot" id="engineDot"></span>
            <span class="foot-text" id="engineStatus">Starting embedded engine…</span>
        </div>
    </aside>
</div>

<div class="sidebar-backdrop" id="sidebarBackdrop"></div>

<div class="modal" id="lab" hidden>
    <div class="lab-card">
        <div class="lab-head">
            <div class="lab-title-wrap">
                <div class="lab-kicker"><span id="labKickerIcon"></span> Verification lab</div>
                <h2 class="lab-title">Every operation, checked</h2>
                <p class="lab-sub">Known-answer vectors from CyberChef's own test suite where they exist, live probes through the embedded engine everywhere else, and graph-wiring integration checks. Nothing leaves this page.</p>
                <div class="lab-tabs">
                    <button class="lab-tab on" data-labtab="ops">Operations</button>
                    <button class="lab-tab" data-labtab="wiring">Graph wiring</button>
                </div>
            </div>
            <button class="icon-button lab-close" id="labClose" title="Close"></button>
        </div>
        <div class="lab-tools">
            <button class="btn-primary" id="labRun">Run all checks</button>
            <button class="btn-secondary" id="labRunVisible" disabled>Run visible</button>
            <button class="btn-secondary" id="labRetry" disabled>Retry failures</button>
            <button class="btn-secondary" id="labStop" disabled>Stop</button>
            <button class="btn-secondary" id="labCopy">Copy report</button>
            <button class="btn-secondary" id="labClear" disabled>Clear</button>
            <div class="lab-search"><input class="search-input" id="labSearch" placeholder="Filter operations…" autocomplete="off" spellcheck="false" aria-label="Filter checks"></div>
            <select class="lab-filter" id="labFilter" aria-label="Filter checks by result">
                <option value="all">All checks</option>
                <option value="run">Executed</option>
                <option value="fail">Failures</option>
                <option value="blocked">Blocked</option>
                <option value="official">Known-answer</option>
                <option value="dcode">Recreated ops</option>
                <option value="probes">Live probes</option>
                <option value="skip">Not auto-run</option>
            </select>
            <div class="lab-progress-wrap">
                <div class="lab-progress"><span id="labProgressBar"></span></div>
                <span class="lab-progress-label" id="labProgressLabel">0 / 0</span>
            </div>
        </div>
        <div class="lab-summary" id="labSummary"></div>
        <div class="lab-list-wrap"><div class="lab-list" id="labList"></div></div>
        <div class="integration-wrap" id="integrationWrap" hidden></div>
    </div>
</div>

<div class="modal" id="help" hidden>
    <div class="help-card">
        <div class="help-head">
            <div>
                <div class="lab-kicker">CipherFlow</div>
                <h2 class="lab-title">How this works</h2>
            </div>
            <button class="btn-secondary" id="tourBtn">Take the tour</button>
            <button class="icon-button lab-close" id="helpClose" title="Close"></button>
        </div>
        <div class="help-body">
            <div class="help-links">
                <a href="https://github.com/Celesteisscool/CipherFlow" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
                <span aria-hidden="true">·</span>
                <a href="https://github.com/Celesteisscool/CipherFlow/issues/new" target="_blank" rel="noopener noreferrer">Report an issue</a>
                <button class="help-expand" id="helpExpandAll" type="button">Expand all</button>
            </div>
            <details class="help-section" open>
                <summary><h3>Build a graph</h3></summary>
                <p>Every node is a step. Circles on a node are <b>ports</b>: inputs on the left, outputs on the right. Drag from an output to an input to draw a wire, and data flows along it. Add nodes from the list on the left — click one, drag it onto the canvas, or search for it. The list is grouped into <b>Functions</b> (blocks you build), <b>Graph</b> (the wiring nodes: Text Input / Output, File Input / Output, Join, Fstring, Math, Switch, Gate and Magic), <b>Bundles</b> (Compact, Expand, Pick and Fork, the nodes that carry lists) and <b>Operations</b> by category. The operations recreated from dCode and CacheSleuth come after the built-in ones in categories of their own, and the <b>Symbols</b> tab down the left edge of the canvas holds the symbol alphabets, which have a section below.</p>
                <p>New here? <b>Take the tour</b> at the top of this panel walks through the canvas in seven steps — it also offers itself the first time the page is opened in a browser, and the <b>?</b> button in the sidebar brings this panel back whenever you want it.</p>
            </details>
            <details class="help-section">
                <summary><h3>Text and file nodes are input <em>and</em> output</h3></summary>
                <p><b>Text Input / Output</b> and <b>File Input / Output</b> each have a port on both sides. With nothing piped into the left port, the text node shows a box for you to type your own value, and the file node shows a drop area. As soon as you pipe data in, that input wins and the node displays it instead — so either is the end of a chain on its own, with copy and save buttons on its preview. There is no separate Output node to add.</p>
            </details>
            <details class="help-section">
                <summary><h3>Preview controls</h3></summary>
                <p>Every output box has <b>Text</b> and <b>Raw</b> views plus <b>Hex</b>, and a <b>Full</b> box that shows the whole result instead of cutting it off. When the result is an image, it renders in place and the tabs become <b>Image</b>, <b>Raw</b> and <b>Hex</b>. Raw shows the underlying bytes one character per byte; Hex writes the same bytes out in hexadecimal.</p>
            </details>
            <details class="help-section">
                <summary><h3>Operations and their arguments</h3></summary>
                <p>Every operation carries a box for its own main input, and <b>every</b> argument it has gets a port of its own — a key, an IV, a password, but also a number, a switch or a dropdown. Type straight into a box and the node runs on what you typed, or wire another node's output into the port and the wire wins: the box dims and shows the value arriving on the wire, cut short if it runs long. A wired number is read as a number, a switch as on or off, and a wire into a dropdown picks whichever option it matches.</p>
                <ul>
                    <li><b>Join</b> merges several wires into one in order, with an optional separator.</li>
                    <li><b>Fstring</b> builds one string out of several: type a shape like <code>Hello {input1}, key {input2}</code> and each slot is filled from that numbered port — an f-string whose variables are wires.</li>
                    <li><b>Math</b> uses the same numbered slots for arithmetic: type <code>({input1} * {input2}) - {input3}</code> and it evaluates <code>+ - * / %</code>, parentheses and <code>^</code> (or <code>**</code>) over the wired numbers.</li>
                    <li><b>Switch</b> is a lookup table: wire a value into it, add a case per key with the value to hand on, and give an <em>otherwise</em> value for when nothing matches. Both halves of a case and the otherwise value take wires too — the wire wins while it is connected. With no otherwise at all (nothing wired and nothing typed) the input is passed straight through. Keys match exactly, once surrounding spaces are trimmed.</li>
                    <li><b>Gate</b> hands nothing on until it is pressed, and a wire that loops back through a gate is not a cycle: each press lets the loop run one step further.</li>
                </ul>
            </details>
            <details class="help-section">
                <summary><h3>Lists on one wire</h3></summary>
                <p>A <b>bundle</b> is a list carried on one wire, drawn <b>thicker</b> than a normal wire. The three bundle nodes sit together in the <b>Bundles</b> section at the top of the node list. <b>Compact</b> gathers everything plugged into it into a single bundle; its <b>Inputs</b> field sets how many ports it offers (1–32), and a port with no wire takes a <b>string typed under it</b>, so a literal can travel in the same bundle as wired values. Nested bundles are flattened, changing the count grows or shrinks the card to fit, and the preview numbers what the wire is carrying. Every port label on Compact and Expand is a text field: type over it to name that input or output, and the name is saved with the graph. Wires follow the port's position, not its name.</p>
                <p><b>Expand</b> spreads that bundle back over as many outputs as its own <b>Outputs</b> field says. Values past the number of outputs are dropped, and outputs with no value to carry come out empty. Lowering either count removes the wires on the ports that disappear.</p>
                <p><b>Fork</b> splits a text on a character — piped in, or typed on the node — and puts the parts on one bundled wire, so a comma-separated line becomes a list without being wired up part by part. Leave the box empty to split nothing.</p>
                <p><b>Pick</b> takes one value out of a bundle. Set <b>Index</b> to 1 for the first value; an index past the end gives an empty value. Its output is a single value, so the wire after it is a normal one.</p>
                <p>An <b>operation</b> downstream of a bundle runs once per value and hands back a bundle, so a whole chain can work through a list without being wired once per item. That applies to arguments too: a bundle on a key, number or switch port runs the operation once per entry, two bundles are <b>zipped</b> by index, and a single value is broadcast against the whole list. A blank entry stays blank rather than failing the run.</p>
            </details>
            <details class="help-section">
                <summary><h3>Symbol alphabets</h3></summary>
                <p>Down the left edge of the canvas is the <b>Symbols</b> tab, and behind it every symbol cipher this page can draw: <b>353 alphabets</b> and 11,915 glyphs, from pigpen and the dancing men to Ogham, the Voynich hand, Dothraki, Teyvat, Wingdings, and the alphabets dCode and CacheSleuth publish art for. Search by name, or narrow the list with the <b>tag pills</b> — Thin or Bold, Straight or Curved, Dots, Pixels, Filled, Monochrome or Coloured. The pills in a group are alternatives, so choosing one releases the other; the count in the header, and a <b>Reset</b> beside it, say how much of the catalogue is left. With tags chosen every row carries how well it matches as a percentage, best first, and each row previews ten of its glyphs.</p>
                <p>Click a row to drop that alphabet on the canvas as a node. The node is a <b>transcription surface</b>: click tiles in the grid and their letters are appended to the box under it, in the order you clicked them — type in the box instead if you already have the reading, and <b>Clear</b> empties it. The strip between grid and box repeats what you clicked as smaller labelled glyphs, and the text in the box is what leaves the node. A tile whose key is more than one character is separated from the one before it, so the reading cannot fuse.</p>
                <p>Where both sources publish art for the same alphabet, a <b>Source</b> switch redraws the node with CacheSleuth's drawings or with dCode's. Where dCode also publishes a solved mapping for a cipher, a <b>Variant</b> switch on a dCode node captions each tile with that cryptogram's own letters instead of dCode's look-alike.</p>
            </details>
            <details class="help-section">
                <summary><h3>Magic</h3></summary>
                <p><b>Magic</b> lives in the <b>Graph</b> section of the node list (the wand icon). It is not one step in a chain: wire data into it and it runs every operation in the library over that input — including every Caesar shift from 1 to 25 — scores each result for how much it reads like real output, and ranks them. Set <b>Show top</b> to choose how many rows the node lists: it returns exactly that many, with findings first and less likely results filling the tail. Operations that land on the same text share one row, and decoders outrank encoders. Click a row to make that result the node's output and send it downstream.</p>
            </details>
            <details class="help-section">
                <summary><h3>Steganalysis, all local</h3></summary>
                <p>The six audits below head the <b>Multimedia</b> category of the node list, above the operations they read bytes for.</p>
                <ul>
                    <li><b>PNG Chunks</b> reads a PNG's container the way pngcheck does: every chunk with its length and CRC, the IHDR dimensions and colour type, tEXt/zTXt/iTXt text, and anything appended after IEND.</li>
                    <li><b>PDF Scan</b> is the pdfid/pdfinfo view: header and version, object, stream and page counts, title/author strings, the risky markers (/JS, /OpenAction, /Launch, /EmbeddedFile, /Encrypt…), every %%EOF, and data appended after the last one.</li>
                    <li><b>Image Info</b> is identify: format, dimensions, bit depth, frames and metadata for PNG, JPEG, GIF, WebP and BMP.</li>
                    <li><b>Spectrogram</b> draws audio as a frequency plot over time: scroll or pinch to zoom the time axis, hold <kbd>Shift</kbd> while scrolling to zoom the frequency band, drag the picture to move it and double-click to fit the file again. Its <b>Merge channels</b> switch folds left and right into one plot instead of giving each a lane, and the whole file leaves on the node's output wire as a PNG of the same plot.</li>
                    <li><b>Audio Info</b> reports an audio file's format, stream and tags: ID3v1 and ID3v2, Vorbis comments and iTunes atoms, with sample rate, bit rate and duration.</li>
                    <li><b>Audio Levels</b> is the loudness measurement — peak, RMS, DC offset, clipping and silence.</li>
                </ul>
                <p>Each takes bytes on its left port and hands back one text report.</p>
                <p>The rest of a sweep is already in the operation list, and these reports pipe into it: <b>Strings</b> for printable runs, <b>Extract LSB</b> and <b>View Bit Plane</b> for hidden bit layers, <b>Extract RGBA</b> and <b>Randomize Colour Palette</b> for channel and palette tricks, <b>Extract EXIF</b> for camera metadata, <b>Scan for Embedded Files</b> for signatures at any offset, and <b>Extract Files</b> for carving. Native tools such as steghide, outguess, zsteg and binwalk are separate programs with no browser equivalent, so they are not bundled — everything above runs in the page, offline, with nothing uploaded.</p>
            </details>
            <details class="help-section">
                <summary><h3>Canvas, wires and view</h3></summary>
                <ul>
                    <li>Drag a node by its title bar to move it; drag the dotted canvas to pan, or scroll to zoom. <b>Fit</b>, in the bottom-left controls, frames the whole graph.</li>
                    <li>The <b>chevron</b> in a node's header collapses it. Wires stay connected while collapsed.</li>
                    <li>Drag the bottom-right corner of a node to resize it. A long output scrolls inside the node instead of forcing it open, so it can be shrunk right down to a readable minimum. Double-click a title to rename any node, an operation or a function instance included.</li>
                    <li><b>Snap</b>, beside Fit in the bottom-left controls, is a toggle. Turning it on puts every node on the graph back on the nearest grid dot and then keeps them there: dragged nodes track the grid as they move. It lights up while it is holding and the setting is remembered, so a reload comes back snapped. The same controls are the function editor's controls: Fit, Snap and zoom act on whichever graph is open.</li>
                    <li>Click a wire to select it — an <b>×</b> appears in the middle. Click the × to remove it, or double-click the wire.</li>
                    <li>The sun or moon icon in the sidebar switches between dark and light, and the choice is remembered.</li>
                    <li>On a phone the node list and the symbol alphabets are <b>drawers</b>: the two icons at either end of the toolbar open them, and placing a node closes the drawer again so the canvas comes back.</li>
                </ul>
            </details>
            <details class="help-section">
                <summary><h3>Several nodes at once</h3></summary>
                <ul>
                    <li><kbd>Shift</kbd>+click a node to add it to the selection, or click it again to take it back out.</li>
                    <li><kbd>Shift</kbd>+drag on the empty canvas draws a box and selects everything it touches.</li>
                    <li>Dragging any selected node moves the whole selection, and <kbd>Delete</kbd> removes all of it with its wires.</li>
                    <li><kbd>Ctrl</kbd>+<kbd>C</kbd>, <kbd>Ctrl</kbd>+<kbd>X</kbd> and <kbd>Ctrl</kbd>+<kbd>V</kbd> copy, cut and paste the selection. The same JSON goes to your system clipboard, so a fragment can be pasted into another tab or a file and pasted back in.</li>
                </ul>
            </details>
            <details class="help-section">
                <summary><h3>Functions</h3></summary>
                <p>A function is a graph of your own: build a body once, then place it like any other node. Press <b>New function</b> at the top of the node list to create one and its editor opens. Inside, the <b>Function input</b> node declares what the function takes — rename each row, give it a sample value, and add as many rows as you need — up to 32 inputs and 32 outputs on one function. Wire those into your body, and wire the body into the <b>Function output</b> node, which declares what it hands back. <b>Run test</b> tries the body on its sample values.</p>
                <p>The editor window is the <b>same canvas</b> pointed at the definition, with its own <b>node list</b> down the right side — the same operations, search and gestures as the sidebar. The <b>Nodes</b> button in the header tucks the list away when you want the whole width for the canvas.</p>
                <p>Press <b>Done</b> and the function appears in the node list: click or drag it onto the canvas to place an instance, which has one input port per declared input and one output port per declared output. Editing the definition updates every instance — the pencil in an instance's head (or the one beside the function in the node list) reopens the editor. A function cannot call itself, and definitions are saved inside the graph file, so a shared file keeps its functions.</p>
                <p>Wiring a bundle into an <b>instance</b> runs the function once per entry and hands each declared output back as a bundle of the results. Two bundles wired into two inputs are <b>zipped</b>: run one takes entry 1 of both, run two takes entry 2 of both, and so on — so a function that needs a name and a key can be applied to two lists in step. When the lists differ in length the longer one decides, and an input whose list has run out gets an empty value.</p>
                <p>Each declared input carries a <b>test sample</b>, which is what the body runs on when you press <b>Run test</b>. A sample can be <b>Text</b> you type, a <b>File</b> you attach, or a value <b>piped in</b> from a node in the body — wire something into the port on the sample row and it takes over. That is how a fixture is derived: build the value with nodes, pipe it in, and every instance can fall back to it. A function that works on an image, an archive or any other bytes can be tested on the real thing from inside the editor.</p>
                <p>Tick <b>Can be typed in</b> on a declared input and every instance of the function grows a box for it, so a constant can be typed straight onto the node instead of needing something wired into the port. The box shows the input's test sample as its <b>default</b>, so you can see the value an untouched instance will run on; typing in the box overrides it, emptying the box puts the default back, and a wire into the port overrides both.</p>
            </details>
            <details class="help-section">
                <summary><h3>Running and shortcuts</h3></summary>
                <p>With <b>Auto-run</b> on, the graph re-runs as you edit; <b>Run</b> forces a fresh pass. On a Mac, <kbd>⌘</kbd> works wherever <kbd>Ctrl</kbd> is listed.</p>
                <ul class="help-keys">
                    <li><kbd>Ctrl</kbd>+<kbd>Enter</kbd> runs the graph</li>
                    <li><kbd>Ctrl</kbd>+<kbd>S</kbd> saves in this browser</li>
                    <li><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> downloads the graph</li>
                    <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes; add <kbd>Shift</kbd> to redo</li>
                    <li><kbd>Ctrl</kbd>+<kbd>C</kbd>, <kbd>Ctrl</kbd>+<kbd>X</kbd> and <kbd>Ctrl</kbd>+<kbd>V</kbd> copy, cut and paste</li>
                    <li><kbd>Delete</kbd> or <kbd>Backspace</kbd> removes the selection or a wire</li>
                    <li><kbd>Escape</kbd> closes a panel, cancels a wire, clears the selection</li>
                    <li><kbd>Shift</kbd>+click or drag adds to the selection</li>
                </ul>
            </details>
            <details class="help-section">
                <summary><h3>Graphs and files</h3></summary>
                <p>The <b>File</b> menu in the toolbar keeps your graphs. <b>Load</b> lists everything saved in this browser, newest first — click one to open it, or use the trash to delete it. <b>New blank graph</b> and <b>Example graph</b> replace whatever is on the canvas; the saved graphs stay.</p>
                <p><b>Save</b> keeps the graph under its name: <b>Save “name”</b> overwrites it and <b>Save as…</b> saves it under another name. A graph with no name asks for one, and the name it is saved under shows at the top of the menu. Separately, the canvas is autosaved as you work, so a reload brings back exactly what you had even if you never named it.</p>
                <p><b>Import</b> opens a <code>.json</code> graph file and <b>Export</b> downloads the current graph, or every saved graph in one file. Everything runs in this page, offline — no data leaves it.</p>
                <p><b>Copy share link</b> puts the graph in the address bar as a link, compressed and encoded after the <code>#</code> — the part a browser never sends to the server. Opening one asks before it replaces the canvas; attached file bytes are not included, because a link is too small to carry them.</p>
            </details>
            <details class="help-section">
                <summary><h3>Checking the operations</h3></summary>
                <p>The <b>flask</b> icon in the sidebar opens the verification lab: known-answer vectors, encode/decode round-trips and graph-wiring checks for every operation. <b>Run all checks</b> sweeps the lot; search or filter first and <b>Run visible</b> covers just those rows, while <b>Retry failures</b> re-runs what came back red. Results are kept in this browser, so closing the tab does not lose a long run, and the flask carries a count of unresolved failures. The filter beside the search narrows the rows to the <b>Known-answer</b> vectors, the <b>Live probes</b> or the <b>Recreated ops</b> — the dCode and CacheSleuth alphabets — so the recreated work is never mixed in with the built-in checks.</p>
            </details>
            <div class="help-section help-contact">
                <h3>Contact</h3>
                <p>CipherFlow is built and looked after by <b>Celesteisscool</b>. A bug, an operation that gives a wrong answer, an idea, or a cryptogram that will not come out — Discord is the way to reach me.</p>
                <div class="contact-gate" id="contactGate">
                    <button class="btn-primary" id="contactReveal" type="button">Reveal my Discord</button>
                    <a class="btn-secondary" href="https://github.com/Celesteisscool/CipherFlow/issues/new" target="_blank" rel="noopener noreferrer">Open an issue on GitHub</a>
                </div>
                <div class="contact-ask" id="contactAsk" hidden>
                    <p>Have you read the whole help panel?</p>
                    <div class="contact-ask-actions">
                        <button class="btn-secondary" id="contactRead" type="button">Yes, all of it</button>
                        <button class="btn-secondary" id="contactNotYet" type="button">Not yet</button>
                    </div>
                </div>
                <div class="contact-card" id="contactCard" hidden>
                    <span class="contact-label">Discord</span>
                    <code class="contact-handle" id="contactHandle">Celesteisscool</code>
                    <button class="btn-secondary" id="contactCopy" type="button">Copy</button>
                    <p class="contact-note">Discord asks for a short reason when a friend request is sent. Put something about CipherFlow in it — the cipher you were working on, the bug you hit, this page — so the request is clearly from here rather than from nowhere.</p>
                    <p class="contact-also">No Discord? <a href="https://github.com/Celesteisscool/CipherFlow/issues/new" target="_blank" rel="noopener noreferrer">Open an issue on GitHub</a> instead — bugs, wrong answers and ideas all get read there.</p>
                </div>
            </div>
        </div>
    </div>
</div>

<input type="file" id="openFileInput" accept="application/json,.json" hidden>
<div id="toasts"></div>

<script type="application/json" id="metaData">${jsonForScript(meta)}</script>
<script type="application/json" id="testData">${jsonForScript(tests)}</script>
<script type="application/json" id="glyphData" data-ciphers="${glyphStats.ciphers}">${jsonForScript(JSON.stringify(glyphs))}</script>
<script type="text/plain" id="engineGzip">
${engineB64}
</script>
${moduleTags}

<script>
${tagMath}
</script>

<script>
${chessJs}
</script>

<script>
${app}
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log("wrote", OUT, (html.length / 1024 / 1024).toFixed(2), "MB");
console.log("worker", worker.length, "modules", modules.length);
