import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {MODULE_NAME, renderModule} from "./dcode/payload.mjs";

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
console.log("dCode module:", (fs.statSync(moduleFile).size / 1024).toFixed(1), "KB");
const moduleFiles = fs.readdirSync(MODULE_DIR).filter(f => f.endsWith(".js")).sort();
const modules = moduleFiles.map(file => ({
    name: file.replace(/\.js$/, ""),
    source: fs.readFileSync(path.join(MODULE_DIR, file), "utf8")
}));

const meta = fs.readFileSync(path.join(ROOT, "dev/meta.json"), "utf8");
const tests = fs.readFileSync(path.join(ROOT, "dev/testplan.json"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "dev/styles.css"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "dev/app.js"), "utf8");

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
        <div class="boot-bar" aria-hidden="true"><span class="boot-bar-fill"></span></div>
        <div class="boot-error" id="bootError" hidden></div>
        <button class="btn-primary boot-retry" id="bootRetry" hidden>Reload</button>
    </div>
</div>

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
                <span class="count-badge"><span id="opCount">0</span> ops</span>
                <button class="icon-button" id="themeBtn" title="Toggle dark / light mode"></button>
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
            <button class="btn-secondary" id="labStop" disabled>Stop</button>
            <button class="btn-secondary" id="labCopy">Copy report</button>
            <div class="lab-search"><input class="search-input" id="labSearch" placeholder="Filter operations…" autocomplete="off" spellcheck="false" aria-label="Filter checks"></div>
            <select class="lab-filter" id="labFilter" aria-label="Filter checks by result">
                <option value="all">All checks</option>
                <option value="run">Executed</option>
                <option value="fail">Failures</option>
                <option value="blocked">Blocked upstream</option>
                <option value="official">Known-answer</option>
                <option value="dcode">dCode ciphers</option>
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
            <button class="icon-button lab-close" id="helpClose" title="Close"></button>
        </div>
        <div class="help-body">
            <div class="help-section">
                <h3>Build a graph</h3>
                <p>Every node is a step. Circles on a node are <b>ports</b>: the one on the right is its output, the ones on the left are inputs. Drag from an output to an input to draw a wire and the data flows along it. Add nodes from the list on the left (click, or drag onto the canvas).</p>
            </div>
            <div class="help-section">
                <h3>Text and file nodes are input <em>and</em> output</h3>
                <p>Both have a port on each side. With nothing piped into the left port, a text node shows a box for you to type your own value, and a file node shows a drop area. As soon as you pipe data in, that input wins and the node displays it instead — so a text or file node is the end of a chain on its own, with copy and save buttons on its preview. There is no separate Output node to add.</p>
            </div>
            <div class="help-section">
                <h3>Combine two inputs</h3>
                <p>Every operation carries a box for its own main input, and <b>every</b> argument it has gets a port of its own — a key, an IV, a password, but also a number, a switch or a dropdown. Type straight into a box and the node runs on what you typed, or wire another node's output into the port and the wire wins: the box dims and shows the value arriving on the wire, cut short if it runs long. A wired number is read as a number, a switch as on or off, and a wire into a dropdown picks whichever option it matches. <b>Join</b> merges several wires into one in order, with an optional separator. This is the part CyberChef recipes cannot do.</p>
                <p><b>Fstring</b> builds one string out of several: type a shape like <code>Hello {input1}, key {input2}</code> and each slot is filled from that numbered port — an f-string whose variables are wires. <b>Switch</b> is a lookup table: wire a value into it, add a case per key with the value to hand on, and give an <em>otherwise</em> value for when nothing matches. Both halves of a case and the otherwise value take wires too — the wire wins while it is connected. With no otherwise at all (nothing wired and nothing typed) the input is passed straight through. Keys match exactly once trimmed of surrounding spaces.</p>
            </div>
            <div class="help-section">
                <h3>Magic</h3>
                <p><b>Magic</b> lives in the <b>Graph</b> section of the node list, beside Text, File, Join, Fstring and Switch (the wand icon). It is not one step in a chain: wire data into it and it runs every operation in the library over that input — including every Caesar shift from 1 to 25 — scores each result for how much it reads like real output, and ranks the best ten. Results that read no better than the input are dropped, operations that land on the same text share one row, and decoders outrank encoders. Click a row to make that result the node's output and send it downstream.</p>
            </div>
            <div class="help-section">
                <h3>Steganalysis, all local</h3>
                <p>The three audits below are in the <b>Multimedia</b> category of the node list, at the top, next to the operations they read bytes for. <b>PNG Chunks</b> reads a PNG's container the way pngcheck does: every chunk with its length and CRC, the IHDR dimensions and colour type, tEXt/zTXt/iTXt text, and anything appended after IEND. <b>PDF Scan</b> is the pdfid/pdfinfo view: header and version, object, stream and page counts, title/author strings, the risky markers (/JS, /OpenAction, /Launch, /EmbeddedFile, /Encrypt…), every %%EOF, and data appended after the last one. <b>Image Info</b> is identify: format, dimensions, bit depth, frames and metadata for PNG, JPEG, GIF, WebP and BMP. Each takes bytes on its left port and hands back one text report.</p>
                <p>The rest of a sweep is already in the operation list, and these reports pipe into it: <b>Strings</b> for printable runs, <b>Extract LSB</b> and <b>View Bit Plane</b> for hidden bit layers, <b>Extract RGBA</b> and <b>Randomize Colour Palette</b> for channel and palette tricks, <b>Extract EXIF</b> for camera metadata, <b>Scan for Embedded Files</b> for signatures at any offset, and <b>Extract Files</b> for carving. Native tools such as steghide, outguess, zsteg and binwalk are separate programs with no browser equivalent, so they are not bundled — everything above runs in the page, offline, with nothing uploaded.</p>
            </div>
            <div class="help-section">
                <h3>Move, resize, collapse</h3>
                <ul>
                    <li>Drag a node by its title bar to move it; drag the dotted canvas to pan, or scroll to zoom.</li>
                    <li>The <b>chevron</b> in a node's header collapses it. Wires stay connected while collapsed.</li>
                    <li>Drag the bottom-right corner of a node to resize it. A long output scrolls inside the node instead of forcing it open, so it can be shrunk right down to a readable minimum. Double-click a title to rename it.</li>
                    <li><b>Snap</b>, beside Fit in the bottom-left controls, is a toggle. Turning it on puts every node on the graph back on the nearest grid dot and then keeps them there: dragged nodes track the grid as they move. It lights up while it is holding and the setting is remembered, so a reload comes back snapped. The same controls are the function editor's controls: Fit, Snap and zoom act on whichever graph is open.</li>
                    <li><kbd>Delete</kbd> removes the selected node or wire; <kbd>Ctrl</kbd>+<kbd>Enter</kbd> runs the graph.</li>
                    <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes and <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> redoes — adding and deleting nodes, wires, moves, resizes and every value you type. A burst of typing undoes in one step.</li>
                </ul>
            </div>
            <div class="help-section">
                <h3>Several nodes at once</h3>
                <ul>
                    <li><kbd>Shift</kbd>+click a node to add it to the selection, or click it again to take it back out.</li>
                    <li><kbd>Shift</kbd>+drag on the empty canvas draws a box and selects everything it touches.</li>
                    <li>Dragging any selected node moves the whole selection, and <kbd>Delete</kbd> removes all of it with its wires.</li>
                    <li><kbd>Ctrl</kbd>+<kbd>C</kbd>, <kbd>Ctrl</kbd>+<kbd>X</kbd> and <kbd>Ctrl</kbd>+<kbd>V</kbd> copy, cut and paste the selection. The same JSON goes to your system clipboard, so a fragment can be pasted into another tab or a file and pasted back in.</li>
                </ul>
            </div>
            <div class="help-section">
                <h3>Function blocks</h3>
                <p>A function is a graph of your own: build a body once, then place it like any other node. Press <b>New function</b> at the top of the node list to create one and its editor opens. Inside, the <b>Function input</b> node declares what the function takes — rename each row, give it a sample value, and add as many rows as you need. Wire those into your body, and wire the body into the <b>Function output</b> node, which declares what it hands back. <b>Run test</b> tries the body on its sample values.</p>
                <p>The editor window is the <b>same canvas</b> pointed at the definition, with its own <b>node list</b> down the right side — the same operations, search and gestures as the sidebar. The <b>Nodes</b> button in the header tucks the list away when you want the whole width for the canvas.</p>
                <p>Press <b>Done</b> and the function appears in the node list: click or drag it onto the canvas to place an instance, which has one input port per declared input and one output port per declared output. Editing the definition updates every instance — double-click an instance (or its pencil in the list) to reopen the editor. A function cannot call itself, and definitions are saved inside the graph file, so a shared file keeps its functions.</p>
                <p>Each declared input carries a <b>test sample</b>, which is what the body runs on when you press <b>Run test</b>. A sample can be <b>Text</b> you type, a <b>File</b> you attach, or a value <b>piped in</b> from a node in the body — wire something into the port on the sample row and it takes over. That is how a fixture is derived: build the value with nodes, pipe it in, and every instance can fall back to it. A function that works on an image, an archive or any other bytes can be tested on the real thing from inside the editor.</p>
                <p>Tick <b>Can be typed in</b> on a declared input and every instance of the function grows a box for it, so a constant can be typed straight onto the node instead of needing something wired into the port. The box shows the input's test sample as its <b>default</b>, so you can see the value an untouched instance will run on; typing in the box overrides it, emptying the box puts the default back, and a wire into the port overrides both.</p>
            </div>
            <div class="help-section">
                <h3>Delete a wire</h3>
                <p>Click a wire to select it — an <b>×</b> appears in the middle. Click the × to remove it (double-clicking the wire works too).</p>
            </div>
            <div class="help-section">
                <h3>Running and saving</h3>
                <p>With <b>Auto-run</b> on, the graph re-runs as you edit. Use <b>Run</b> to force a fresh pass. <b>Save</b> and <b>Open</b> move a graph as a JSON file, and your work is kept in this browser automatically. Everything runs in this page, offline — no data leaves it.</p>
            </div>
            <div class="help-section">
                <h3>Checking the operations</h3>
                <p>The <b>flask</b> icon in the sidebar opens the verification lab: known-answer vectors, encode/decode round-trips and graph-wiring checks for every operation.</p>
            </div>
        </div>
    </div>
</div>

<input type="file" id="openFileInput" accept="application/json,.json" hidden>
<div id="toasts"></div>

<script type="application/json" id="metaData">${jsonForScript(meta)}</script>
<script type="application/json" id="testData">${jsonForScript(tests)}</script>
<script type="text/plain" id="engineGzip">
${engineB64}
</script>
${moduleTags}

<script>
${app}
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log("wrote", OUT, (html.length / 1024 / 1024).toFixed(2), "MB");
console.log("worker", worker.length, "modules", modules.length);
