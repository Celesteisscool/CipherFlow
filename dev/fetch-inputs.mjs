#!/usr/bin/env node
/* dev/fetch-inputs.mjs — write the two inputs dev/build.mjs needs but does not ship.
 *
 *   dev/modules/modules/*.js   one bundled file per CyberChef module
 *   /tmp/chefworker.js         the raw CyberChef worker, before the host hook
 *
 * Both come from a CyberChef 11.5.0 production build (npx grunt prod), which writes
 * build/prod/modules/*.js and build/prod/chefworker.js. The npm package is sources
 * only — no build output and no webpack in this repo — so the script looks for a
 * build in this order:
 *
 *   1. CYBERCHEF_PROD=<dir>                an explicit prod build directory
 *   2. node_modules/cyberchef/build/prod   a build made inside the package
 *   3. assets/                             the shipped copy of that same build
 *
 * The third path is what makes a fresh clone buildable: assets/modules/*.js are the
 * prod modules verbatim and assets/chefworker.js is that worker with the host hook
 * appended, so the inputs are the modules back with the generated dCode bundle left
 * out and the worker back with the two newlines and the hook cut off the end. Whichever
 * path runs, `node dev/build.mjs` afterwards should leave assets/ and index.html as they
 * were, which is the check to run after editing this file.
 *
 * Run from the repository root: node dev/fetch-inputs.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MODULE_DIR = path.join(ROOT, "dev/modules/modules");
const WORKER_OUT = "/tmp/chefworker.js";
const ASSET_MODULES = path.join(ROOT, "assets/modules");
const ASSET_WORKER = path.join(ROOT, "assets/chefworker.js");
// The recreated dCode operations are generated into their own module by the build, so a
// copy of an older one is never an input.
const GENERATED_MODULE = "CipherFlowDcode.js";
// build.mjs writes the worker as raw + "\n" + HOOK, and HOOK starts with a newline and this
// comment. Cutting at the two newlines before it recovers the raw worker exactly.
const HOST_HOOK = ";(function () {\n    // CipherFlow host hooks";

const die = message => {
    console.error("fetch-inputs:", message);
    process.exit(1);
};

function prodCandidates() {
    const dirs = [];
    if (process.env.CYBERCHEF_PROD) dirs.push(path.resolve(ROOT, process.env.CYBERCHEF_PROD));
    dirs.push(path.join(ROOT, "node_modules/cyberchef/build/prod"));
    return dirs;
}

function readDir(dir) {
    const modulesDir = path.join(dir, "modules");
    const workerPath = path.join(dir, "chefworker.js");
    if (!fs.existsSync(modulesDir) || !fs.existsSync(workerPath)) return null;
    const files = fs.readdirSync(modulesDir).filter(f => f.endsWith(".js")).sort();
    if (!files.length) return null;
    return {
        from: dir,
        worker: fs.readFileSync(workerPath, "utf8"),
        modules: files.map(file => ({name: file, source: fs.readFileSync(path.join(modulesDir, file), "utf8")}))
    };
}

function readShipped() {
    if (!fs.existsSync(ASSET_MODULES) || !fs.existsSync(ASSET_WORKER)) return null;
    const files = fs.readdirSync(ASSET_MODULES)
        .filter(f => f.endsWith(".js") && f !== GENERATED_MODULE)
        .sort();
    if (!files.length) return null;
    const built = fs.readFileSync(ASSET_WORKER, "utf8");
    const at = built.lastIndexOf(HOST_HOOK);
    if (at < 0) die("assets/chefworker.js does not carry the host hook; build it from a prod build instead");
    const start = at - 2;
    if (built.slice(start, at) !== "\n\n") die("assets/chefworker.js lacks the newlines build.mjs puts before the hook");
    const worker = built.slice(0, start);
    return {
        from: "assets/",
        worker,
        modules: files.map(file => ({name: file, source: fs.readFileSync(path.join(ASSET_MODULES, file), "utf8")}))
    };
}

let inputs = null;
for (const dir of prodCandidates()) {
    inputs = readDir(dir);
    if (inputs) break;
}
const source = inputs ? inputs.from : "assets/";
if (!inputs) inputs = readShipped();
if (!inputs) die("no CyberChef prod build and no committed assets/ to take one from");

// Cheap sanity checks: a truncated tree must fail here rather than in the middle of a build.
if (inputs.modules.length < 20) die(`only ${inputs.modules.length} modules found in ${source}`);
const moduleBytes = inputs.modules.reduce((n, m) => n + Buffer.byteLength(m.source), 0);
if (moduleBytes < 8 * 1024 * 1024) die(`modules in ${source} total only ${(moduleBytes / 1024 / 1024).toFixed(1)} MB`);
for (const m of inputs.modules) {
    // A prod module bundle ends by hanging its operations off self.OpModules; minified names
    // mean that string, not the operation or module names, is what survives to check.
    if (!m.source.includes("OpModules")) die(`${m.name} from ${source} does not look like a module bundle`);
}
if (inputs.worker.length < 1024 * 1024) die(`worker from ${source} is only ${inputs.worker.length} bytes`);
if (inputs.worker.includes(HOST_HOOK)) die("worker still carries the host hook");

fs.rmSync(MODULE_DIR, {recursive: true, force: true});
fs.mkdirSync(MODULE_DIR, {recursive: true});
for (const m of inputs.modules) fs.writeFileSync(path.join(MODULE_DIR, m.name), m.source);
fs.writeFileSync(WORKER_OUT, inputs.worker);

console.log("inputs from", source);
console.log("modules", inputs.modules.length, "files,", (moduleBytes / 1024 / 1024).toFixed(1), "MB in", path.relative(ROOT, MODULE_DIR));
console.log("worker", inputs.worker.length, "bytes at", WORKER_OUT);
console.log("now run: node dev/build.mjs");
