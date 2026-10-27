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
        for (const candidate of data.candidates || []) {
            const started = Date.now();
            try {
                const res = await self.chef.bake(data.input, [{op: candidate.op, args: candidate.args || []}], {returnType: "string"});
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
                results.push({op: candidate.op, ok: true, text: text.slice(0, 1500), length: text.length, kind: res && res.type, ms: Date.now() - started});
            } catch (err) {
                results.push({op: candidate.op, ok: false, error: String((err && err.message) || err).slice(0, 200), ms: Date.now() - started});
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

const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#ecece8">
<title>CipherFlow — node-based CyberChef</title>
<meta name="description" content="A single-file, offline node editor for chaining CyberChef's operations with multiple inputs.">
<style>
${css}
</style>
</head>
<body>
<noscript><p style="padding:24px;font:14px system-ui">CipherFlow needs JavaScript. All processing happens locally in this page.</p></noscript>

<div id="app">
    <main class="stage" id="stage">
        <div class="toolbar" id="toolbar"></div>
        <div class="world" id="world">
            <svg class="edges-svg" id="edgesSvg" aria-hidden="true"><g id="edgesLayer"></g></svg>
            <div class="nodes-layer" id="nodesLayer"></div>
        </div>
        <div class="stage-controls">
            <button class="zoom-btn" id="zoomOut" title="Zoom out">−</button>
            <span class="zoom-value" id="zoomLabel">100%</span>
            <button class="zoom-btn" id="zoomIn" title="Zoom in">+</button>
            <button class="zoom-btn fit-btn" id="fitBtn" title="Fit graph to view"><span id="fitBtnIcon"></span>Fit</button>
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
