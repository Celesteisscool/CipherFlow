(() => {
"use strict";

/* ================================================================ helpers */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const ESC = {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);
// Used when reading text back out of CyberChef's HTML file listings.
const unescapeHtml = s => String(s ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", {fatal: false});
const decLatin1 = new TextDecoder("latin1");
const STORAGE_KEY = "cipherflow.graph.v1";
const THEME_KEY = "cipherflow.theme.v1";
const ENGINE_LABEL = "CyberChef 11.5.0";

const CAT_COLORS = {
    "Data format": "#159b89",
    "Encryption / Encoding": "#8d5bc2",
    "Public Key": "#a268d8",
    "Arithmetic / Logic": "#3f7fd6",
    "Networking": "#2f8f61",
    "Language": "#c28a2c",
    "Utils": "#8a6f5a",
    "Date / Time": "#5b6abf",
    "Extractors": "#587f8e",
    "Compression": "#b65d7c",
    "Hashing": "#6e8f2e",
    "Code tidy": "#328b75",
    "Forensics": "#92578c",
    "Multimedia": "#b97831",
    "Other": "#63758c",
    "Flow control": "#49576b",
    "Graph": "#387fa5"
};

const ICONS = {
    logo: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="4" cy="3" r="1.6"/><circle cx="12" cy="8" r="1.6"/><circle cx="4" cy="13" r="1.6"/><path d="M5.5 3.8 10.4 7M5.5 12.2 10.4 9"/></svg>',
    search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.2"/><path d="m10.2 10.2 3.1 3.1"/></svg>',
    x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m4 4 8 8M12 4l-8 8"/></svg>',
    chevron: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3 5 5-5 5"/></svg>',
    plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
    minus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 8h10"/></svg>',
    fit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3H3v3M10 3h3v3M6 13H3v-3M10 13h3v-3"/></svg>',
    play: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.8c0-.6.65-.96 1.15-.64l7.05 4.7a.75.75 0 0 1 0 1.28l-7.05 4.7A.75.75 0 0 1 4.5 12.2V2.8Z"/></svg>',
    sun: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9"/></svg>',
    moon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M13.1 9.6A5.5 5.5 0 0 1 6.4 2.9 5.5 5.5 0 1 0 13.1 9.6Z"/></svg>',
    flask: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 1.8h4M6.8 2v3.1L3.2 11a1.6 1.6 0 0 0 1.4 2.4h6.8a1.6 1.6 0 0 0 1.4-2.4L9.2 5.1V2"/><path d="M5 9.5h6"/></svg>',
    nodes: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.7" y="2" width="4.2" height="3.6" rx="1"/><rect x="10.1" y="10.4" width="4.2" height="3.6" rx="1"/><rect x="1.7" y="10.4" width="4.2" height="3.6" rx="1"/><path d="M5.9 3.8h2.3a1 1 0 0 1 1 1v4.6a1 1 0 0 0 1 1h-.1"/></svg>',
    copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 10.5V4a1 1 0 0 1 1-1h6.5"/></svg>',
    save: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2.5h8l2 2v9H3z"/><path d="M5.5 2.5v4h5v-4M5.5 13.5v-4h5v4"/></svg>',
    trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 4.2h10.4M6 2.4h4M4 4.2l.6 9.4h6.8l.6-9.4M6.5 7v4M9.5 7v4"/></svg>',
    folder: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 4.4h4l1.2 1.4h7.2v7.2H1.8z"/><path d="M1.8 4.4V3.2h3.5l1.4 1.2"/></svg>',
    doc: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 1.8h5l3 3v9.4H4z"/><path d="M9 1.8v3h3M6 8h4M6 10.5h4"/></svg>',
    input: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 8h8M7 5l3 3-3 3M12 3v10"/></svg>',
    output: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M14 8H6M9 5 6 8l3 3M4 3v10"/></svg>',
    join: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h4M2 12h4M6 4v8M6 8h7"/><path d="m10.7 5.7 2.5 2.3-2.5 2.3"/></svg>',
    file: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 1.8h5l3 3v9.4H4z"/><path d="M9 1.8v3h3M6.5 8.5h3M8 7v3"/></svg>',
    check: '<path d="m3.5 8.2 3 3 6-6.5"/>',
    alert: '<path d="M8 2.2 14 13H2zM8 6v3.5M8 11.3v.2"/>',
    clock: '<circle cx="8" cy="8" r="5.2"/><path d="M8 5v3.4l2.1 1.2"/>',
    external: '<path d="M9 2h5v5M14 2 7 9M12 9v5H2V4h5"/>',
    help: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.2"/><path d="M6.1 6.2a1.95 1.95 0 1 1 2.7 1.85c-.65.28-.85.65-.85 1.3"/><path d="M8 11.6v.15"/></svg>'
};

const svg = (name, cls = "") => String(ICONS[name] || "").replace("<svg", `<svg class="${cls}"`);
// Every icon ends up as exactly ONE <svg>. Some entries already carry their own <svg>
// element, so wrapping those again produced a nested svg with no size of its own, which
// inflated to fill whatever box it sat in. The icon's own attributes win; the shared
// defaults only fill in what it leaves out.
const iconFill = name => {
    const raw = String(ICONS[name] || "").trim();
    const match = raw.match(/^<svg([^>]*)>([\s\S]*)<\/svg>$/);
    const attrs = {viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round"};
    if (match) for (const a of match[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    const body = match ? match[2] : raw;
    const attrText = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ");
    return `<svg ${attrText}>${body}</svg>`;
};

function bytesToHex(bytes, sep = "") {
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
        out += (i ? sep : "") + bytes[i].toString(16).padStart(2, "0");
    }
    return out;
}
function hexToBytes(text) {
    const cleaned = String(text).replace(/0x/gi, "").replace(/[^0-9a-f]/gi, "");
    if (cleaned.length % 2) throw new Error("Hex input has an odd number of digits.");
    const out = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
    return out;
}
function bytesToB64(bytes) {
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
}
function b64ToBytes(text) {
    const normal = String(text).replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    const pad = normal.length % 4 ? "=".repeat(4 - (normal.length % 4)) : "";
    const bin = atob(normal + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}
function latin1ToBytes(text) {
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
    return out;
}
function bytesToLatin1(bytes) {
    let out = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return out;
}
function concatBytes(parts) {
    let length = 0;
    for (const p of parts) length += p.length;
    const out = new Uint8Array(length);
    let offset = 0;
    for (const p of parts) { out.set(p, offset); offset += p.length; }
    return out;
}
function looksBinary(bytes) {
    if (!bytes.length) return false;
    let suspicious = 0;
    const sample = Math.min(bytes.length, 600);
    for (let i = 0; i < sample; i++) {
        const b = bytes[i];
        if (b === 0 || (b < 7) || (b > 13 && b < 32) || (b > 126 && b < 160)) suspicious++;
    }
    return suspicious / sample > 0.18;
}
function previewBytes(bytes, mode = "text", limit = 600) {
    if (!bytes || !bytes.length) return {text: "No output yet.", binary: false};
    if (mode === "hex") {
        const full = bytesToHex(bytes.subarray(0, Math.ceil(limit / 3)), " ");
        return {text: full + (bytes.length > Math.ceil(limit / 3) ? " …" : ""), binary: false};
    }
    if (looksBinary(bytes)) {
        return {text: `Binary output (${formatBytes(bytes.length)}). Switch to Hex to inspect.`, binary: true};
    }
    let text = dec.decode(bytes);
    text = text.replace(/\u0000/g, "·").replace(/\r/g, "");
    if (text.length > limit) text = text.slice(0, limit) + " …";
    return {text, binary: false};
}
function formatBytes(n) {
    if (n < 1024) return `${n} byte${n === 1 ? "" : "s"}`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function shortName(s, n = 22) {
    s = String(s || "Node");
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function fnvBytes(bytes, seed = 0x811c9dc5) {
    let h = seed >>> 0;
    for (let i = 0; i < bytes.length; i++) {
        h ^= bytes[i];
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}
function sigHash(text) {
    const b = enc.encode(String(text));
    return fnvBytes(b).toString(16) + "-" + b.length.toString(16);
}
function utf8(bytes) { return dec.decode(bytes); }
function toB64DataUrl(bytes, mime = "application/octet-stream") {
    return `data:${mime};base64,${bytesToB64(bytes)}`;
}
function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}
async function gunzipBase64(b64) {
    const raw = b64ToBytes(b64);
    if (typeof DecompressionStream === "undefined") {
        throw new Error("This browser does not support embedded gzip. Use a current Chrome, Edge, Firefox or Safari.");
    }
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new TextDecoder("utf-8").decode(await new Response(stream).arrayBuffer());
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch {}
        ta.remove();
        return ok;
    }
}
function debounce(fn, ms) {
    let t = 0;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}
function toast(message, kind = "") {
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = message;
    $("#toasts").appendChild(el);
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translateY(4px)";
        el.style.transition = "opacity .18s, transform .18s";
        setTimeout(() => el.remove(), 200);
    }, 3200);
}
function safeFileName(s) {
    return String(s || "output").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 60) || "output";
}
function naturalNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

/* ================================================================ meta */
const META = JSON.parse($("#metaData").textContent);
const TESTPLAN = JSON.parse($("#testData").textContent);
const OPS = META.ops;
const OP_NAMES = Object.keys(OPS);
const FLOW_OPS = new Set(OP_NAMES.filter(n => OPS[n].flowControl));
// CipherFlow wires graphs itself, so CyberChef's flow-control ops (jumps, labels, fork,
// merge…) are left out of the palette entirely rather than shown as dead entries.
const CATEGORIES = META.categories
    .filter(c => c.name !== "Flow control")
    .map(c => ({...c, color: CAT_COLORS[c.name] || CAT_COLORS.Other, ops: c.ops.filter(op => !FLOW_OPS.has(op))}));
const GRAPH_COLOR = CAT_COLORS.Graph;

function argTypeWirable(type) {
    return type === "toggleString" || type === "string" || type === "binaryString" ||
        type === "binaryShortString" || type === "text" || type === "shortString";
}
function cloneValue(v) {
    if (v === undefined) return v;
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(cloneValue);
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = cloneValue(val);
    return o;
}
function opArgIndex(op, name) {
    return (OPS[op]?.args || []).findIndex(a => a.name === name);
}
function defaultNodeValues(op) {
    return cloneValue(OPS[op].defaults || []);
}
function nodeValuesWith(op, overrides = {}) {
    const values = defaultNodeValues(op);
    const args = OPS[op].args || [];
    for (const [name, value] of Object.entries(overrides)) {
        const i = args.findIndex(a => a.name === name);
        if (i >= 0) values[i] = cloneValue(value);
    }
    return values;
}
function categoryOf(op) {
    return OPS[op]?.category || "Other";
}
function opAccent(op) {
    return CAT_COLORS[categoryOf(op)] || CAT_COLORS.Other;
}

/* ================================================================ engine */
class ChefEngine {
    constructor() {
        this.worker = null;
        this.loaded = false;
        this.loading = null;
        this.chain = Promise.resolve();
        this.pending = null;
        this.seq = 0;
        this.lastError = "";
        this.onStatus = null;
        this.moduleWaiters = new Map();
        this.modulesSent = new Set();
        this.modulePromises = new Map();
        this.probeWaiter = null;
        // How many bakes have ever come back with real data. Zero means the engine is
        // still cold, which is the only time an empty pass is treated as a failure.
        this.bakesWithData = 0;
    }

    /* Magic: run a list of candidate operations over one input inside the worker
     * (a single round trip) and hand back their wrapped text results. */
    async probe(input, candidates, options = {}) {
        const previous = this.chain;
        let release;
        this.chain = new Promise(r => release = r);
        await previous.catch(() => {});
        try {
            await this.start();
            return await this._probe(input, candidates, options);
        } finally {
            release();
        }
    }

    _probe(input, candidates, options) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error("The engine is not running."));
                return;
            }
            const id = ++this.seq;
            const timeoutMs = Math.max(5000, options.timeout || 90000);
            const timer = setTimeout(() => {
                if (this.probeWaiter?.id === id) this.probeWaiter = null;
                reject(new Error(`Magic timed out after ${Math.round(timeoutMs / 1000)}s.`));
            }, timeoutMs);
            this.probeWaiter = {id, resolve, reject, timer};
            try {
                this.worker.postMessage({action: "cipherflowProbe", data: {id, input, candidates, started: Date.now()}});
            } catch (err) {
                clearTimeout(timer);
                this.probeWaiter = null;
                reject(err);
            }
        });
    }

    async start() {
        if (this.loaded && this.worker) return;
        if (this.loading) return this.loading;
        this.loading = (async () => {
            this.setStatus("loading", "Unpacking the embedded engine…");
            const source = await this.source();
            this.setStatus("loading", "Starting the local engine…");
            const url = URL.createObjectURL(new Blob([source + "\n//# sourceURL=cipherflow-chef-worker.js"], {type: "text/javascript"}));
            let worker;
            try {
                worker = new Worker(url);
            } finally {
                URL.revokeObjectURL(url);
            }
            this.worker = worker;
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error("The embedded CyberChef worker did not start.")), 20000);
                const onReady = e => {
                    if (e.data?.action === "workerLoaded") {
                        clearTimeout(timer);
                        worker.removeEventListener("message", onReady);
                        resolve();
                    }
                };
                worker.addEventListener("message", onReady);
                worker.addEventListener("error", ev => {
                    clearTimeout(timer);
                    const msg = ev.message || "Embedded engine failed to start.";
                    reject(new Error(msg));
                }, {once: true});
            });
            this.attach();
            worker.postMessage({action: "docURL", data: location.href.split(/[#?]/)[0]});
            this.modulesSent.clear();
            this.modulePromises.clear();
            // A restarted worker is cold again.
            this.bakesWithData = 0;
            this.loaded = true;
            this.setStatus("ready");
        })().catch(err => {
            this.lastError = err.message || String(err);
            this.setStatus("error");
            throw err;
        });
        try {
            await this.loading;
        } finally {
            this.loading = null;
        }
    }

    setStatus(status, detail) {
        if (this.onStatus) this.onStatus(status, detail);
    }

    async source() {
        const b64 = $("#engineGzip").textContent.trim().replace(/\s+/g, "");
        if (!b64) throw new Error("The embedded engine payload is missing.");
        return gunzipBase64(b64);
    }

    async ensureModules(recipeConfig) {
        const needed = new Set();
        for (const step of recipeConfig || []) {
            const mod = OPS[step.op]?.module;
            if (mod && mod !== "Default") needed.add(mod);
        }
        for (const name of needed) {
            if (this.modulesSent.has(name)) continue;
            await this.sendModule(name);
        }
    }

    async sendModule(name) {
        if (this.modulesSent.has(name)) return;
        if (this.modulePromises.has(name)) return this.modulePromises.get(name);
        const task = (async () => {
            await this.start();
            const holder = document.getElementById("moduleGzip-" + name) ||
                document.querySelector(`[data-module-gzip="${name}"]`);
            if (!holder) throw new Error(`The embedded ${name} module is missing from this build.`);
            const source = await gunzipBase64(holder.textContent.trim().replace(/\s+/g, ""));
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    this.moduleWaiters.delete(name);
                    reject(new Error(`The embedded ${name} module did not load.`));
                }, 25000);
                this.moduleWaiters.set(name, {resolve, reject, timer});
                this.worker.postMessage({action: "cipherflowModule", name, source});
            });
            this.modulesSent.add(name);
        })().catch(err => {
            this.modulePromises.delete(name);
            throw err;
        });
        this.modulePromises.set(name, task);
        return task;
    }

    attach() {
        const worker = this.worker;
        worker.onmessage = ev => {
            const msg = ev.data || {};
            if (msg.action === "cipherflowModuleLoaded") {
                const waiter = this.moduleWaiters.get(msg.name);
                if (waiter) {
                    clearTimeout(waiter.timer);
                    this.moduleWaiters.delete(msg.name);
                    waiter.resolve();
                }
                return;
            }
            if (msg.action === "cipherflowModuleError") {
                const waiter = this.moduleWaiters.get(msg.name);
                if (waiter) {
                    clearTimeout(waiter.timer);
                    this.moduleWaiters.delete(msg.name);
                    waiter.reject(new Error(msg.message || "Module failed to load"));
                }
                return;
            }
            if (msg.action === "bakeComplete" || msg.action === "bakeError" || msg.action === "dishReturned") {
                const id = msg.data?.id;
                if (!id || !this.pending || this.pending.id !== id) return;
                const pending = this.pending;
                this.pending = null;
                clearTimeout(pending.timer);
                if (msg.action === "bakeError") {
                    pending.reject(new Error(String(msg.data?.error || "Operation failed")));
                } else {
                    pending.resolve(msg.data);
                }
                return;
            }
            if (msg.action === "cipherflowProbeDone") {
                const waiter = this.probeWaiter;
                if (!waiter || (msg.data && msg.data.id !== waiter.id)) return;
                this.probeWaiter = null;
                clearTimeout(waiter.timer);
                waiter.resolve(msg.data || {results: []});
            }
        };
        worker.onerror = ev => {
            const message = ev.message || "The CyberChef worker crashed.";
            this.lastError = message;
            this.loaded = false;
            if (this.pending) {
                const p = this.pending;
                this.pending = null;
                clearTimeout(p.timer);
                p.reject(new Error(message));
            }
            try { worker.terminate(); } catch {}
            if (this.worker === worker) this.worker = null;
            this.setStatus("error");
        };
        worker.onmessageerror = () => {
            if (this.pending) {
                const p = this.pending;
                this.pending = null;
                clearTimeout(p.timer);
                p.reject(new Error("The embedded engine returned an unreadable message."));
            }
        };
    }

    async bake(recipeConfig, input, options = {}) {
        const previous = this.chain;
        let release;
        this.chain = new Promise(r => release = r);
        await previous.catch(() => {});
        try {
            await this.start();
            await this.ensureModules(recipeConfig);
            let response = await this._bake(recipeConfig, input, options);
            // A bake that carries neither a dish value nor a result has not really
            // answered: the very first pass on a freshly started worker can come back
            // like that. An empty answer is not a result, so ask again before the
            // caller turns it into a silent empty output.
            for (let attempt = 0; attempt < 2 && !bakeHasData(response); attempt++) {
                await new Promise(r => setTimeout(r, 40));
                response = await this._bake(recipeConfig, input, options);
            }
            if (bakeHasData(response)) this.bakesWithData++;
            return response;
        } finally {
            release();
        }
    }

    _bake(recipeConfig, input, options) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error("The engine is not running."));
                return;
            }
            const id = ++this.seq;
            const timeoutMs = Math.max(1000, options.timeout || 30000);
            const timer = setTimeout(() => {
                if (this.pending?.id === id) this.pending = null;
                const old = this.worker;
                this.worker = null;
                this.loaded = false;
                try { old?.terminate(); } catch {}
                this.setStatus("error");
                reject(new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s. The engine was restarted.`));
            }, timeoutMs);
            this.pending = {id, resolve, reject, timer};
            const msg = {
                action: "bake",
                data: {
                    input,
                    recipeConfig,
                    options: {returnType: options.returnType || "ArrayBuffer"},
                    id,
                    bakeId: id,
                    inputNum: -1
                }
            };
            try {
                this.worker.postMessage(msg);
            } catch (err) {
                clearTimeout(timer);
                this.pending = null;
                reject(err);
            }
        });
    }

    bakeOp(op, args, input, options = {}) {
        return this.bake([{op, args}], input, options);
    }

    bakeRecipe(recipe, input, options = {}) {
        return this.bake(recipe, input, options);
    }

    loadedModules() {
        return new Set(["Default", ...this.modulesSent]);
    }
}

const engine = new ChefEngine();

// Does an engine response actually carry data? `result` is the payload the worker
// computes for the requested return type; a null/undefined result with no dish value
// means the bake returned nothing at all (an empty string or zero-length ArrayBuffer
// is still a real answer and passes this test).
function bakeHasData(response) {
    if (!response) return false;
    if (response.error) return true;
    if (response.result != null) return true;
    const value = response.dish && response.dish.value;
    return value != null;
}

/* ================================================================ state */
let state = null;
let selected = null;
let nodeSeq = 1;
let edgeSeq = 1;
let runTimer = 0;
let running = false;
let runPending = false;
let runGeneration = 0;
let lastSavedAt = 0;
let saveTimer = 0;
let paletteOpen = new Set();
let searchTerm = "";
let sidebarOpen = false;
let fitAfterRender = false;

function makeNode(type, opts = {}) {
    const node = {
        id: opts.id ?? nodeSeq++,
        type,
        x: Math.round(opts.x ?? 80),
        y: Math.round(opts.y ?? 100),
        title: opts.title || "",
        previewMode: opts.previewMode || "text",
        collapsed: Boolean(opts.collapsed),
        w: Number(opts.w) || 0,
        h: Number(opts.h) || 0
    };
    if (type === "op") {
        node.op = opts.op;
        node.outputType = OPS[opts.op]?.outputType || "string";
        node.values = opts.values ? cloneValue(opts.values) : defaultNodeValues(opts.op);
        // An operation can carry its own input text, typed straight into the node. It is
        // used only when nothing is wired into the main port.
        node.inputText = opts.inputText ?? "";
        node.inputEncoding = opts.inputEncoding || "utf8";
    } else if (type === "input") {
        node.text = opts.text ?? "Hello, World!";
        node.encoding = opts.encoding || "utf8";
    } else if (type === "file") {
        node.fileName = opts.fileName || "";
        node.fileSize = opts.fileSize || 0;
        node.fileData = opts.fileData || "";
        node.mime = opts.mime || "";
    } else if (type === "join") {
        node.joinCount = opts.joinCount || 2;
        node.separator = opts.separator ?? "";
    }
    node._output = null;
    node._error = "";
    node._sig = "";
    node._duration = 0;
    node._reused = false;
    return node;
}

function addEdgeRaw(from, to, toPort) {
    if (!from || !to || from === to) return null;
    return {id: optsEdgeId(), from, to, toPort};
}
function optsEdgeId() { return "e" + (edgeSeq++); }

function blankState() {
    nodeSeq = 1;
    edgeSeq = 1;
    const input = makeNode("input", {id: 1, x: 150, y: 190, text: "Hello, World!", title: "Text input"});
    // A text node on the other end shows what flows in, so the pair reads the same as
    // the old input → Output layout.
    const sink = makeNode("input", {id: 2, x: 610, y: 210, title: "Result", text: ""});
    return {
        version: 1,
        nodes: [input, sink],
        edges: [{id: optsEdgeId(), from: 1, to: 2, toPort: "main"}],
        view: {x: 90, y: 110, zoom: 0.9},
        autoRun: true
    };
}

function exampleState() {
    nodeSeq = 1;
    edgeSeq = 1;
    const plain = makeNode("input", {
        id: 1, x: 33, y: 100, title: "Plain", text: "attack at dawn", encoding: "utf8"
    });
    const key = makeNode("input", {
        id: 2, x: 33, y: 340, title: "Key", text: "0123456789abcdef0123456789abcdef", encoding: "hex"
    });
    const iv = makeNode("input", {
        id: 3, x: 33, y: 548, title: "IV", text: "abcdef9876543210abcdef9876543210", encoding: "hex"
    });
    const encrypt = makeNode("op", {
        id: 4, op: "AES Encrypt", x: 405, y: 100,
        values: nodeValuesWith("AES Encrypt", {
            "Mode": "CBC",
            "Input": "Raw",
            "Output": "Hex",
            "Include IV in output": "Off"
        })
    });
    const decrypt = makeNode("op", {
        id: 5, op: "AES Decrypt", x: 790, y: 100,
        values: nodeValuesWith("AES Decrypt", {
            "IV Length": 16,
            "Mode": "CBC",
            "Input": "Hex",
            "Output": "Raw",
            "IV from input": "Off"
        })
    });
    const output = makeNode("input", {id: 6, x: 1175, y: 150, title: "Roundtrip", text: ""});
    const edges = [
        {id: optsEdgeId(), from: plain.id, to: encrypt.id, toPort: "main"},
        {id: optsEdgeId(), from: key.id, to: encrypt.id, toPort: "arg:" + opArgIndex("AES Encrypt", "Key")},
        {id: optsEdgeId(), from: iv.id, to: encrypt.id, toPort: "arg:" + opArgIndex("AES Encrypt", "IV")},
        {id: optsEdgeId(), from: encrypt.id, to: decrypt.id, toPort: "main"},
        {id: optsEdgeId(), from: key.id, to: decrypt.id, toPort: "arg:" + opArgIndex("AES Decrypt", "Key")},
        {id: optsEdgeId(), from: iv.id, to: decrypt.id, toPort: "arg:" + opArgIndex("AES Decrypt", "IV")},
        {id: optsEdgeId(), from: decrypt.id, to: output.id, toPort: "main"}
    ];
    return {
        version: 1,
        nodes: [plain, key, iv, encrypt, decrypt, output],
        edges,
        view: {x: 40, y: 50, zoom: 0.58},
        autoRun: true
    };
}

// Update ID counters when importing arbitrary files.
function renumberState(s) {
    let maxNode = 0, maxEdge = 0;
    for (const n of s.nodes) maxNode = Math.max(maxNode, Number(n.id) || 0);
    for (const e of s.edges) {
        const numeric = Number(String(e.id).replace(/^e/, ""));
        if (Number.isFinite(numeric)) maxEdge = Math.max(maxEdge, numeric);
    }
    nodeSeq = maxNode + 1;
    edgeSeq = maxEdge + 1;
}

function cleanNodeForSave(n) {
    return {
        id: n.id,
        type: n.type,
        op: n.op,
        x: Math.round(n.x),
        y: Math.round(n.y),
        title: n.title || "",
        text: n.text,
        encoding: n.encoding,
        inputText: n.inputText,
        inputEncoding: n.inputEncoding,
        fileName: n.fileName,
        fileSize: n.fileSize,
        fileData: n.fileData,
        mime: n.mime,
        joinCount: n.joinCount,
        separator: n.separator,
        fileIndex: n.fileIndex || 0,
        previewMode: n.previewMode || "text",
        collapsed: Boolean(n.collapsed),
        w: Math.round(n.w || 0),
        h: Math.round(n.h || 0),
        values: n.values ? cloneValue(n.values) : undefined
    };
}

function serializeGraph() {
    return {
        app: "CipherFlow",
        version: 1,
        engine: META.version,
        exportedAt: new Date().toISOString(),
        nodes: state.nodes.map(cleanNodeForSave),
        edges: state.edges.map(e => ({id: e.id, from: e.from, to: e.to, toPort: e.toPort})),
        view: {...state.view},
        autoRun: state.autoRun
    };
}

function normalizeLoaded(data) {
    if (!data || data.app !== "CipherFlow" && !Array.isArray(data.nodes)) throw new Error("This is not a CipherFlow graph file.");
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error("The graph file is missing nodes or edges.");
    const nodes = [];
    for (const raw of data.nodes) {
        if (!raw) continue;
        // Output nodes no longer exist. Older graphs migrate their sink to a text node,
        // which keeps the wire and shows the same value.
        const wasOutput = raw.type === "output";
        const type = wasOutput ? "input" : raw.type;
        if (!["input", "file", "join", "op"].includes(type)) continue;
        if (type === "op" && (!raw.op || !OPS[raw.op])) continue;
        const n = makeNode(type, {
            id: Number(raw.id),
            x: Number(raw.x) || 40,
            y: Number(raw.y) || 40,
            title: raw.title || "",
            op: raw.op,
            text: wasOutput ? "" : raw.text,
            encoding: raw.encoding,
            inputText: raw.inputText,
            inputEncoding: ["utf8", "hex", "base64", "latin1"].includes(raw.inputEncoding) ? raw.inputEncoding : "utf8",
            fileName: raw.fileName,
            fileSize: raw.fileSize,
            fileData: raw.fileData,
            mime: raw.mime,
            joinCount: clamp(Number(raw.joinCount) || 2, 1, 8),
            separator: raw.separator || "",
            fileIndex: clamp(Number(raw.fileIndex) || 0, 0, 32),
            previewMode: ["hex", "raw", "image", "text"].includes(raw.previewMode) ? raw.previewMode : "text",
            collapsed: Boolean(raw.collapsed),
            w: Number(raw.w) || 0,
            h: Number(raw.h) || 0
        });
        if (raw.values && Array.isArray(raw.values) && raw.values.length === (OPS[raw.op]?.args || []).length) {
            n.values = cloneValue(raw.values);
        }
        nodes.push(n);
    }
    const ids = new Set(nodes.map(n => n.id));
    const edges = [];
    const seenInputs = new Set();
    for (const raw of data.edges || []) {
        if (!raw || !ids.has(Number(raw.from)) || !ids.has(Number(raw.to))) continue;
        if (raw.from === raw.to) continue;
        const target = nodes.find(n => n.id === Number(raw.to));
        if (!target) continue;
        if (target.type === "op" && !(raw.toPort === "main" || /^arg:\d+$/.test(raw.toPort))) continue;
        if (target.type === "join" && !/^join:\d+$/.test(raw.toPort)) continue;
        // Text and file nodes take a single "main" pipe on their left side; anything
        // else into them is not a valid connection.
        if ((target.type === "input" || target.type === "file") && raw.toPort !== "main") continue;
        if (seenInputs.has(`${raw.to}:${raw.toPort}`)) continue;
        if (raw.toPort.startsWith("arg:")) {
            const idx = Number(raw.toPort.slice(4));
            if (!OPS[target.op]?.args?.[idx] || !argTypeWirable(OPS[target.op].args[idx].type)) continue;
        }
        seenInputs.add(`${raw.to}:${raw.toPort}`);
        edges.push({id: String(raw.id || ("e" + edgeSeq++)), from: Number(raw.from), to: Number(raw.to), toPort: String(raw.toPort)});
    }
    return {
        nodes,
        edges,
        view: data.view ? {x: Number(data.view.x) || 0, y: Number(data.view.y) || 0, zoom: clamp(Number(data.view.zoom) || 0.8, 0.2, 2.2)} : null,
        autoRun: data.autoRun !== false
    };
}

function saveLocalNow() {
    if (!state) return;
    try {
        const payload = JSON.stringify(serializeGraph());
        localStorage.setItem(STORAGE_KEY, payload);
        lastSavedAt = Date.now();
    } catch (err) {
        // Large file attachments can exceed localStorage. Keep the graph except file bytes.
        try {
            const payload = serializeGraph();
            payload.nodes = payload.nodes.map(n => n.type === "file" ? {...n, fileData: ""} : n);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            lastSavedAt = Date.now();
            toast("Graph saved locally, but the file payload was too large for autosave.", "error");
        } catch {}
    }
}
const saveLocalSoon = debounce(saveLocalNow, 320);

function loadLocalGraph() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return normalizeLoaded(JSON.parse(raw));
    } catch {
        return null;
    }
}

function applyGraph(data, {fit = true} = {}) {
    state = data;
    state.autoRun = data.autoRun !== false;
    renumberState(state);
    for (const n of state.nodes) {
        n._output = null; n._error = ""; n._sig = ""; n._duration = 0; n._reused = false;
    }
    selected = null;
    renderAllNodes();
    updateAutoSwitch();
    if (fit) requestAnimationFrame(() => fitView());
    saveLocalNow();
    scheduleRun(true, 160);
}

/* ================================================================ DOM refs */
const stage = $("#stage");
const world = $("#world");
const nodesLayer = $("#nodesLayer");
const edgesSvg = $("#edgesSvg");
const edgesLayer = $("#edgesLayer");
const edgeHandlesLayer = $("#edgeHandlesLayer");
const zoomLabel = $("#zoomLabel");
const runStatus = $("#runStatus");
const runStatusText = $("#runStatusText");
let runButton = null;
let autoSwitch = null;
const paletteBody = $("#paletteBody");
const paletteSearch = $("#paletteSearch");
const sidebar = $("#sidebar");
const sidebarBackdrop = $("#sidebarBackdrop");

/* ================================================================ viewport */
function applyView() {
    world.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.zoom})`;
    stage.style.setProperty("--grid-size", `${22 * state.view.zoom}px`);
    stage.style.setProperty("--grid-x", `${state.view.x % (22 * state.view.zoom)}px`);
    stage.style.setProperty("--grid-y", `${state.view.y % (22 * state.view.zoom)}px`);
    zoomLabel.textContent = Math.round(state.view.zoom * 100) + "%";
    scheduleEdges();
}
function screenToWorld(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    return {
        x: (clientX - r.left - state.view.x) / state.view.zoom,
        y: (clientY - r.top - state.view.y) / state.view.zoom
    };
}
function stageCenterWorld() {
    const r = stage.getBoundingClientRect();
    return {
        x: (r.width / 2 - state.view.x) / state.view.zoom,
        y: (r.height / 2 - state.view.y) / state.view.zoom
    };
}
function fitView() {
    if (!state.nodes.length) {
        state.view = {x: 80, y: 90, zoom: 0.9};
        applyView();
        return;
    }
    const rect = stage.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of state.nodes) {
        const el = nodeEl(node.id);
        const w = el?.offsetWidth || 310;
        const h = el?.offsetHeight || 180;
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + w);
        maxY = Math.max(maxY, node.y + h);
    }
    const pad = Math.max(58, Math.min(110, rect.width * 0.07));
    const w = Math.max(1, maxX - minX + pad * 2);
    const h = Math.max(1, maxY - minY + pad * 2);
    const zoom = clamp(Math.min((rect.width - 38) / w, (rect.height - 38) / h), 0.22, 1.02);
    state.view.zoom = zoom;
    state.view.x = (rect.width - (maxX - minX) * zoom) / 2 - minX * zoom;
    state.view.y = (rect.height - (maxY - minY) * zoom) / 2 - minY * zoom;
    applyView();
}
// Bring a node into view by panning the viewport, never by scrolling the stage.
// The stage is an overflow-clip box; letting the browser scroll it would move the
// content without updating view.x/y, leaving nodes and the toolbar off until reload.
function ensureNodeVisible(node, pad = 28) {
    const el = nodeEl(node.id);
    if (!el) return;
    const rect = stage.getBoundingClientRect();
    const zoom = state.view.zoom;
    const w = el.offsetWidth * zoom;
    const h = el.offsetHeight * zoom;
    const sx = node.x * zoom + state.view.x;
    const sy = node.y * zoom + state.view.y;
    let dx = 0, dy = 0;
    if (w > rect.width - pad * 2) dx = pad - sx;
    else if (sx < pad) dx = pad - sx;
    else if (sx + w > rect.width - pad) dx = (rect.width - pad) - (sx + w);
    if (h > rect.height - pad * 2) dy = pad - sy;
    else if (sy < pad) dy = pad - sy;
    else if (sy + h > rect.height - pad) dy = (rect.height - pad) - (sy + h);
    if (dx || dy) {
        state.view.x += dx;
        state.view.y += dy;
        applyView();
        saveLocalSoon();
    }
}
function zoomAt(clientX, clientY, factor) {
    const old = state.view.zoom;
    const next = clamp(old * factor, 0.22, 2.2);
    if (next === old) return;
    const r = stage.getBoundingClientRect();
    const sx = clientX - r.left;
    const sy = clientY - r.top;
    state.view.x = sx - (sx - state.view.x) * (next / old);
    state.view.y = sy - (sy - state.view.y) * (next / old);
    state.view.zoom = next;
    applyView();
    saveLocalSoon();
}

/* ================================================================ nodes DOM */
function nodeEl(id) {
    return nodesLayer.querySelector(`.node[data-id="${id}"]`);
}
function nodeById(id) {
    return state.nodes.find(n => n.id === id) || null;
}
function sourceTitle(node) {
    if (!node) return "Unknown";
    if (node.type === "op") return node.op;
    if (node.type === "input") return node.title || "Text input";
    if (node.type === "file") return node.title || node.fileName || "File input";
    if (node.type === "join") return node.title || "Join";
    return node.title || node.type;
}
function nodeAccent(node) {
    if (node.type === "op") return opAccent(node.op);
    return GRAPH_COLOR;
}
function nodeCategoryLabel(node) {
    if (node.type === "input") return "Input";
    if (node.type === "file") return "File";
    if (node.type === "join") return "Join";
    return categoryOf(node.op);
}
function nodeTypeClass(node) {
    return `type-${node.type}`;
}
function edgeInto(nodeId, port) {
    return state.edges.find(e => e.to === nodeId && e.toPort === port) || null;
}
function edgeSource(edge) {
    return nodeById(edge.from);
}
function chipHtml(source, edge) {
    if (!source) return "";
    return `<span class="chip" title="${esc(sourceTitle(source))}"><span class="chip-text">${esc(sourceTitle(source))}</span><button class="chip-x" data-action="remove-edge" data-edge="${esc(edge.id)}" title="Disconnect">×</button></span>`;
}
function inputPort(name, extraClass = "") {
    return `<span class="port in ${extraClass}" data-port="${esc(name)}"></span>`;
}
function outputPort() {
    return `<span class="port out" data-port="out" title="Drag to an input"></span>`;
}

function renderAllNodes() {
    nodesLayer.innerHTML = "";
    for (const node of state.nodes) {
        const el = buildNode(node);
        nodesLayer.appendChild(el);
    }
    if (selected?.type === "node" && !nodeById(selected.id)) selected = null;
    if (selected?.type === "edge" && !state.edges.some(e => e.id === selected.id)) selected = null;
    syncSelectionClasses();
    scheduleEdges();
}

function buildNode(node) {
    const el = document.createElement("div");
    el.className = `node ${nodeTypeClass(node)}${selected?.type === "node" && selected.id === node.id ? " selected" : ""}${node._error ? " has-error" : ""}`;
    el.dataset.id = String(node.id);
    el.style.left = node.x + "px";
    el.style.top = node.y + "px";
    el.style.setProperty("--node-accent", nodeAccent(node));

    const title = node.type === "op" ? node.op : (node.title || sourceTitle(node));
    const cat = nodeCategoryLabel(node);
    // A resized node keeps its width even when collapsed, but drops its height so the
    // collapsed card stays compact; expanding restores it.
    // The saved height is a floor, never a fixed size: the node still grows to fit its
    // content, so shrinking one can no longer cut controls or a preview off.
    if (node.w) el.style.width = node.w + "px";
    if (node.h && !node.collapsed) el.style.minHeight = node.h + "px";
    if ((node.w || node.h) && !node.collapsed) el.classList.add("resized");
    el.classList.toggle("collapsed", Boolean(node.collapsed));
    el.innerHTML = `
        <div class="node-head">
            <span class="node-dot"></span>
            <span class="node-title" data-node-title>${esc(title)}</span>
            <span class="node-cat">${esc(cat)}</span>
            <button class="node-mini node-collapse" data-action="toggle-collapse" data-node="${node.id}" title="${node.collapsed ? "Expand node" : "Collapse node"}">${iconFill("chevron")}</button>
            <button class="node-close" data-action="delete-node" data-node="${node.id}" title="Delete node">${iconFill("x")}</button>
        </div>
        <div class="node-body"></div>
    `;
    const body = $(".node-body", el);

    if (node.collapsed) {
        // Only the ports are drawn, so the wires stay anchored to the node.
        el.appendChild(collapsedPorts(node));
    } else if (node.type === "op") {
        body.appendChild(mainInputRow(node));
        body.appendChild(opInputControl(node));
        body.appendChild(renderArgs(node));
        body.appendChild(buildPreview(node));
        body.appendChild(buildError(node));
    } else if (node.type === "input") {
        body.appendChild(buildInputNode(node));
    } else if (node.type === "file") {
        body.appendChild(buildFileNode(node));
    } else if (node.type === "join") {
        body.appendChild(buildJoinNode(node));
    }
    el.appendChild(makeOutputPort());
    if (!node.collapsed) {
        const grip = document.createElement("div");
        grip.className = "node-resize";
        grip.title = "Drag to resize";
        grip.addEventListener("pointerdown", ev => startNodeResize(node, ev));
        el.appendChild(grip);
    }

    el.addEventListener("pointerdown", ev => {
        if (ev.target.closest("button") || ev.target.closest("input") || ev.target.closest("select") ||
            ev.target.closest("textarea") || ev.target.closest(".port") || ev.target.isContentEditable) return;
        selectNode(node.id);
    });
    const head = $(".node-head", el);
    head.addEventListener("pointerdown", ev => {
        if (ev.button !== 0 || ev.target.closest("button") || ev.target.isContentEditable) return;
        ev.preventDefault();
        ev.stopPropagation();
        selectNode(node.id);
        startNodeDrag(node, ev);
    });
    const titleEl = $("[data-node-title]", el);
    titleEl.addEventListener("dblclick", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        beginTitleEdit(node, titleEl);
    });
    const close = $(".node-close", el);
    close.innerHTML = `${iconFill("x")}`;
    return el;
}

function makeOutputPort() {
    const span = document.createElement("span");
    span.className = "port out";
    span.dataset.port = "out";
    span.title = "Drag to an input";
    span.addEventListener("pointerdown", startConnectionFromOutput);
    return span;
}

// Collapsed nodes still need every wired input port in the DOM, otherwise drawEdges
// cannot find an anchor and the wires would vanish. Only the wired ports are listed.
function collapsedPorts(node) {
    const wrap = document.createElement("div");
    wrap.className = "collapsed-ports";
    const ports = [];
    if (node.type === "op") {
        ports.push({name: "main", label: "In"});
        (OPS[node.op]?.args || []).forEach((arg, i) => {
            if (!argTypeWirable(arg.type)) return;
            if (!edgeInto(node.id, "arg:" + i)) return;
            ports.push({name: "arg:" + i, label: arg.name});
        });
    } else if (node.type === "join") {
        for (let i = 0; i < node.joinCount; i++) ports.push({name: "join:" + i, label: "In " + (i + 1)});
    } else {
        ports.push({name: "main", label: "In"});
    }
    wrap.innerHTML = ports.map(p => `<div class="io-row">
        <span class="port in${edgeInto(node.id, p.name) ? " connected" : ""}" data-port="${esc(p.name)}"></span>
        <span class="io-label" title="${esc(p.label)}">${esc(p.label)}</span>
    </div>`).join("");
    $$(".port.in", wrap).forEach(p => bindInputPort(p, node.id, p.dataset.port));
    return wrap;
}

// An operation's main input gets a box of its own, exactly like its arguments do: you can
// type a value straight into the node and the run uses it, or wire something into the port
// and the wire takes over (the box dims, as a wired argument's field does).
// What the wire is actually delivering, as a one-line taste for the input box's placeholder:
// enough to recognise the value, cut off when it runs long. Never used for the node's own
// data — the box keeps the text you typed, this is only what the placeholder shows.
const OP_INPUT_HINT_CHARS = 32;
function opInputHint(node) {
    const edge = edgeInto(node.id, "main");
    if (!edge) return "";
    const src = nodeById(edge.from);
    const bytes = src?._output;
    if (!bytes) return "Nothing on the wire yet — press Run";
    if (!bytes.length) return "Empty output on the wire";
    if (looksBinary(bytes)) return `Binary data · ${formatBytes(bytes.length)}`;
    const text = dec.decode(bytes).replace(/\s+/g, " ").trim();
    if (!text) return `Blank text · ${formatBytes(bytes.length)}`;
    return text.length > OP_INPUT_HINT_CHARS ? text.slice(0, OP_INPUT_HINT_CHARS) + "…" : text;
}

function opInputControl(node) {
    const wired = Boolean(edgeInto(node.id, "main"));
    const box = document.createElement("div");
    box.className = "arg-control op-input" + (wired ? " connected" : "");
    const pair = document.createElement("div");
    pair.className = "toggle-pair";
    const input = document.createElement("input");
    input.className = "control";
    input.spellcheck = false;
    input.setAttribute("data-op-input", "");
    input.value = node.inputText || "";
    input.placeholder = (wired ? opInputHint(node) : "") || (wired ? "Fed by the wire" : "Type input text");
    input.title = wired ? "Coming in on the wire feeding this port — the wire wins while it is connected" : "Text this node runs on when nothing is wired in";
    input.addEventListener("input", () => {
        node.inputText = input.value;
        node._sig = "";
        onGraphEdited();
    });
    const select = document.createElement("select");
    select.className = "control";
    select.title = "How to read the text beside it";
    for (const [value, label] of [["utf8", "UTF-8"], ["hex", "Hex"], ["base64", "Base64"], ["latin1", "Latin-1"]]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    }
    select.value = node.inputEncoding || "utf8";
    select.addEventListener("change", () => {
        node.inputEncoding = select.value;
        node._sig = "";
        onGraphEdited();
    });
    pair.appendChild(input);
    pair.appendChild(select);
    box.appendChild(pair);
    return box;
}

function mainInputRow(node, label = "Input") {
    const row = document.createElement("div");
    row.className = "io-row";
    const edge = edgeInto(node.id, "main");
    const src = edge ? edgeSource(edge) : null;
    row.innerHTML = `
        <span class="port in${edge ? " connected" : ""}" data-port="main"></span>
        <span class="io-label">${esc(label)}</span>
        <span class="port-label">${edge ? chipHtml(src, edge) : ""}</span>
    `;
    bindInputPort(row.querySelector(".port.in"), node.id, "main");
    return row;
}

// A text node is both a source and a sink: it has a port on each side. When something
// is piped into the left port that wins and the node shows it; otherwise the little box
// lets you type your own value.
function buildInputNode(node) {
    const wrap = document.createElement("div");
    if (edgeInto(node.id, "main")) {
        wrap.appendChild(mainInputRow(node, "In"));
        wrap.appendChild(buildPreview(node));
        wrap.appendChild(buildError(node));
        return wrap;
    }
    let bytes = new Uint8Array(0);
    try { bytes = inputNodeBytes(node); } catch { bytes = new Uint8Array(0); }
    wrap.innerHTML = `
        <div class="io-row">
            <span class="port in" data-port="main" title="Pipe data in (overrides the text below)"></span>
            <span class="io-label">In</span>
            <select class="control" data-encoding style="width:auto;height:21px;padding:0 4px;font-size:9px;margin-left:auto">
                <option value="utf8">UTF-8</option>
                <option value="hex">Hex</option>
                <option value="base64">Base64</option>
                <option value="latin1">Latin-1</option>
            </select>
        </div>
        <textarea class="control typed-input" data-input-text rows="3" spellcheck="false" placeholder="Nothing piped in — type your own text here">${esc(node.text || "")}</textarea>
        <div class="node-foot"><span class="bytes" data-bytes>${formatBytes(bytes.length)}</span><span>·</span><span>${node.encoding.toUpperCase()}</span><span style="margin-left:auto" class="bytes">${bytes.length ? "ready" : "empty"}</span></div>
        <div class="error-box" data-node-error style="display:${node._error ? "block" : "none"}">${esc(node._error || "")}</div>
    `;
    bindInputPort($(".port.in", wrap), node.id, "main");
    $("[data-encoding]", wrap).value = node.encoding;
    $("[data-encoding]", wrap).addEventListener("change", e => {
        node.encoding = e.target.value;
        node._sig = "";
        updateInputBytes(node);
        onGraphEdited();
    });
    const ta = $("[data-input-text]", wrap);
    ta.addEventListener("input", () => {
        node.text = ta.value;
        node._sig = "";
        updateInputBytes(node);
        onGraphEdited();
    });
    return wrap;
}

function updateInputBytes(node) {
    const el = nodeEl(node.id);
    if (!el) return;
    let bytes;
    try { bytes = inputNodeBytes(node); } catch { bytes = new Uint8Array(0); }
    $$("[data-bytes]", el).forEach(x => x.textContent = formatBytes(bytes.length));
}

// Like the text node, a file node takes a pipe on the left and repeats it on the right;
// with nothing piped in it falls back to the drop zone.
function buildFileNode(node) {
    const wrap = document.createElement("div");
    if (edgeInto(node.id, "main")) {
        wrap.appendChild(mainInputRow(node, "In"));
        wrap.appendChild(buildPreview(node));
        wrap.appendChild(buildError(node));
        return wrap;
    }
    wrap.innerHTML = `
        <div class="io-row">
            <span class="port in" data-port="main" title="Pipe bytes in (overrides the file below)"></span>
            <span class="io-label">In</span>
        </div>
        <div class="file-drop" data-file-drop tabindex="0">
            ${node.fileData ? `<div class="file-name">${esc(node.fileName || "File attached")}</div><div class="bytes">${formatBytes(node.fileSize || 0)} · click to replace</div>` : `<div>${iconFill("file")}</div><div>Click or drop a file here</div><div style="color:var(--faint);font-size:8.5px;margin-top:2px">bytes stay in this page</div>`}
        </div>
        <input type="file" hidden data-file-input>
        <div class="node-foot"><span class="bytes" data-bytes>${formatBytes(node.fileSize || 0)}</span><span style="margin-left:auto" class="bytes">raw bytes</span></div>
        <div class="error-box" data-node-error style="display:${node._error ? "block" : "none"}">${esc(node._error || "")}</div>
    `;
    bindInputPort($(".port.in", wrap), node.id, "main");
    const input = $("[data-file-input]", wrap);
    const drop = $("[data-file-drop]", wrap);
    drop.addEventListener("click", () => input.click());
    drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") input.click(); });
    drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("drag"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
    drop.addEventListener("drop", e => {
        e.preventDefault(); drop.classList.remove("drag");
        const file = e.dataTransfer?.files?.[0];
        if (file) readFileToNode(node, file);
    });
    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (file) readFileToNode(node, file);
    });
    return wrap;
}

async function readFileToNode(node, file) {
    if (file.size > 24 * 1024 * 1024) {
        toast("That file is larger than 24 MB. The page keeps input in memory.", "error");
        return;
    }
    try {
        const buffer = await file.arrayBuffer();
        node.fileData = bytesToB64(new Uint8Array(buffer));
        node.fileName = file.name;
        node.fileSize = file.size;
        node.mime = file.type || "application/octet-stream";
        node._sig = "";
        renderAllNodes();
        onGraphEdited(true);
    } catch (err) {
        toast("Could not read that file: " + err.message, "error");
    }
}

function buildJoinNode(node) {
    const wrap = document.createElement("div");
    let rows = "";
    for (let i = 0; i < node.joinCount; i++) {
        const port = "join:" + i;
        const edge = edgeInto(node.id, port);
        const src = edge ? edgeSource(edge) : null;
        rows += `<div class="io-row join-row">
            <span class="port in${edge ? " connected" : ""}" data-port="${port}"></span>
            <span class="io-label">Input ${i + 1}</span>
            <span class="port-label">${edge ? chipHtml(src, edge) : ""}</span>
            ${node.joinCount > 1 && i === node.joinCount - 1 ? `<button class="join-remove" data-action="remove-join" data-node="${node.id}" title="Remove the last input">${iconFill("x")}</button>` : ""}
        </div>`;
    }
    wrap.innerHTML = `${rows}
        <button class="join-add" data-action="add-join" data-node="${node.id}">${iconFill("plus")}<span>Add input</span></button>
        <div class="arg-row sep-label"><div class="arg-label-row"><span class="arg-name">Separator</span></div><input class="control" data-join-separator value="${esc(node.separator)}" placeholder="Optional separator (\\n works)"></div>
    `;
    // buildPreview/buildError hand back real elements, so they must be appended rather
    // than interpolated into the markup above, where a DOM node stringifies to
    // "[object HTMLDivElement]" and prints that text into the node.
    wrap.appendChild(buildPreview(node));
    wrap.appendChild(buildError(node));
    $$(".port.in", wrap).forEach(p => bindInputPort(p, node.id, p.dataset.port));
    const sep = $("[data-join-separator]", wrap);
    sep.addEventListener("input", () => { node.separator = sep.value; node._sig = ""; onGraphEdited(); });
    return wrap;
}

function renderArgs(node) {
    const wrap = document.createElement("div");
    const args = OPS[node.op]?.args || [];
    if (!args.length) return wrap;
    args.forEach((arg, i) => {
        if (arg.type === "label") return;
        const row = document.createElement("div");
        row.className = "arg-row";
        const portName = "arg:" + i;
        const canWire = argTypeWirable(arg.type);
        const edge = canWire ? edgeInto(node.id, portName) : null;
        const src = edge ? edgeSource(edge) : null;
        const connected = Boolean(edge);
        row.innerHTML = `
            <div class="arg-label-row${connected ? " connected" : ""}">
                ${canWire ? `<span class="port in${connected ? " connected" : ""}" data-port="${portName}" title="Wire data into ${esc(arg.name)}"></span>` : ""}
                <span class="arg-name" title="${esc(arg.name)}">${esc(arg.name)}</span>
                ${connected ? `<span class="port-label" style="margin-left:auto">${chipHtml(src, edge)}</span>` : ""}
            </div>
            <div class="arg-control${connected ? " connected" : ""}"></div>
        `;
        const control = $(".arg-control", row);
        const value = node.values[i];
        control.appendChild(makeArgControl(node, i, arg, value));
        if (canWire) bindInputPort($(".port.in", row), node.id, portName);
        wrap.appendChild(row);
    });
    return wrap;
}

function makeArgControl(node, index, arg, value) {
    const set = val => {
        node.values[index] = val;
        node._sig = "";
        onGraphEdited();
    };
    if (arg.type === "boolean") {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "check-row";
        b.innerHTML = `<span class="check${value ? " on" : ""}"></span><span>${value ? "Enabled" : "Disabled"}</span>`;
        b.addEventListener("click", () => {
            const next = !node.values[index];
            node.values[index] = next;
            b.innerHTML = `<span class="check${next ? " on" : ""}"></span><span>${next ? "Enabled" : "Disabled"}</span>`;
            node._sig = "";
            onGraphEdited();
        });
        return b;
    }
    if (arg.type === "number") {
        const input = document.createElement("input");
        input.type = "number";
        input.className = "control";
        input.step = "any";
        input.value = value ?? "";
        input.addEventListener("input", () => set(input.value === "" ? 0 : Number(input.value)));
        return input;
    }
    if (arg.type === "option" || arg.type === "argSelector") {
        const select = document.createElement("select");
        select.className = "control";
        const values = Array.isArray(arg.value) ? arg.value : [];
        for (const opt of values) {
            const val = typeof opt === "object" ? (arg.type === "argSelector" ? opt.name : opt.value) : opt;
            const label = typeof opt === "object" ? (opt.name ?? opt.value) : opt;
            const o = document.createElement("option");
            o.value = String(val ?? "");
            o.textContent = String(label ?? "");
            select.appendChild(o);
        }
        select.value = String(value ?? "");
        if (select.value === "" && select.options.length) select.selectedIndex = 0;
        select.addEventListener("change", () => set(select.value));
        return select;
    }
    if (arg.type === "editableOption" || arg.type === "editableOptionShort" || arg.type === "populateOption") {
        const input = document.createElement("input");
        input.className = "control";
        input.value = String(value ?? "");
        input.setAttribute("list", "arglist-" + node.id + "-" + index);
        const dl = document.createElement("datalist");
        dl.id = "arglist-" + node.id + "-" + index;
        const values = Array.isArray(arg.value) ? arg.value : [];
        for (const opt of values) {
            const val = typeof opt === "object" ? (opt.value ?? opt.name) : opt;
            const label = typeof opt === "object" ? (opt.name ?? opt.value) : opt;
            const o = document.createElement("option");
            o.value = String(val ?? "");
            o.label = String(label ?? "");
            dl.appendChild(o);
        }
        const frag = document.createDocumentFragment();
        frag.appendChild(input);
        frag.appendChild(dl);
        input.addEventListener("input", () => set(input.value));
        return frag;
    }
    if (arg.type === "toggleString") {
        const wrap = document.createElement("div");
        wrap.className = "toggle-pair";
        const input = document.createElement("input");
        input.className = "control";
        input.spellcheck = false;
        const v = value && typeof value === "object" ? value : {string: "", option: (arg.toggleValues && arg.toggleValues[0]) || "Hex"};
        input.value = v.string ?? "";
        const select = document.createElement("select");
        select.className = "control";
        for (const opt of arg.toggleValues || ["Hex"]) {
            const o = document.createElement("option");
            o.value = opt; o.textContent = opt;
            select.appendChild(o);
        }
        select.value = v.option || "Hex";
        input.addEventListener("input", () => set({string: input.value, option: select.value}));
        select.addEventListener("change", () => set({string: input.value, option: select.value}));
        wrap.appendChild(input);
        wrap.appendChild(select);
        return wrap;
    }
    const long = arg.type === "text" || /headers|body|pem|certificate|code/i.test(arg.name);
    const input = document.createElement(long ? "textarea" : "input");
    input.className = "control";
    input.spellcheck = false;
    if (long) input.rows = 2;
    input.value = String(value ?? "");
    input.addEventListener("input", () => set(input.value));
    return input;
}

function buildPreview(node) {
    const wrap = document.createElement("div");
    wrap.className = "preview" + (node._output ? "" : " empty");
    wrap.dataset.preview = "";
    updatePreviewEl(wrap, node);
    return wrap;
}

// A dish can hold bytes that are really an image, or CyberChef's HTML rendering
// (image operations and List<File> results both come back as HTML). Work out which
// so the node can show the picture or the file listing instead of raw markup.
const IMAGE_MAGIC = [
    {mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47]},
    {mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff]},
    {mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38]},
    {mime: "image/bmp", bytes: [0x42, 0x4d]},
    {mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46]}
];
function imageMimeOf(bytes) {
    if (!bytes || bytes.length < 12) return null;
    for (const sig of IMAGE_MAGIC) {
        if (sig.bytes.every((b, i) => bytes[i] === b)) return sig.mime;
    }
    return null;
}
const DATA_URL_RE = /data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/gi;
function htmlLooksLikeMarkup(text) {
    return /^\s*<(div|p|table|html|body|img|span|pre|h[1-6]|ul|ol|a|style|svg)\b/i.test(text);
}
// Pull the first embedded base64 image out of CyberChef's HTML output, if any.
function firstDataUrlImage(html) {
    const m = String(html).match(DATA_URL_RE);
    return m && m.length ? m[0].replace(/\s+/g, "") : null;
}
function htmlOutputKind(node, bytes) {
    if (!bytes || !bytes.length) return "empty";
    if (imageMimeOf(bytes)) return "image-bytes";
    const text = utf8(bytes.slice(0, 200000)).trimStart();
    // An embedded data-URL image is the common case: CyberChef's image operations and
    // List<File> listings both hand back HTML containing one.
    if (firstDataUrlImage(text)) return "html-image";
    const outType = node.outputType || OPS[node.op]?.outputType || "";
    const hasMarkup = /<[a-z][^>]*>[\s\S]*<\/[a-z]/i.test(text);
    if (outType === "html" ? htmlLooksLikeMarkup(text) : hasMarkup) return "html";
    return "text";
}
function imageDataUrlFor(node, bytes, kind) {
    if (kind === "image-bytes") return toB64DataUrl(bytes, imageMimeOf(bytes) || "image/png");
    if (kind === "html-image") return firstDataUrlImage(utf8(bytes));
    return null;
}
function updatePreviewEl(wrap, node) {
    const bytes = node._output;
    const has = Boolean(bytes && bytes.length);
    const files = node._files?.length ? node._files : null;
    const selected = files ? preferredFileIndex(node, files) : 0;
    const kind = has ? htmlOutputKind(node, bytes) : "empty";
    const isImage = kind === "image-bytes" || kind === "html-image";
    // Image results get an Image / Raw / Hex switch; byte and text results stay Text / Hex.
    let mode = node.previewMode || (isImage ? "image" : "text");
    if (isImage) { if (mode !== "raw" && mode !== "hex") mode = "image"; }
    else if (mode !== "hex") mode = "text";
    const imageUrl = (has && isImage && mode === "image") ? imageDataUrlFor(node, bytes, kind) : null;
    // Text and file nodes are the display side of a graph now, so they get the roomier
    // preview the old Output node had (and its save button, below).
    const isSink = node.type === "input" || node.type === "file" || node.type === "join";
    const pv = has ? previewBytes(bytes, mode === "hex" ? "hex" : "text", isSink ? 1100 : 420) : {text: isSink ? "Run the graph to see the output." : "Not run yet.", binary: false};
    wrap.classList.toggle("empty", !has);
    wrap.dataset.kind = kind;
    let body;
    if (node.op === "Magic" && Array.isArray(node._magic)) {
        body = magicListHtml(node);
    } else if (imageUrl) {
        body = `<div class="preview-media"><img class="preview-img" src="${esc(imageUrl)}" alt="Operation output" loading="lazy"></div>`;
    } else if (has && mode === "text" && kind === "html") {
        const html = utf8(bytes);
        body = `<div class="preview-media preview-html"><iframe class="preview-frame" sandbox="allow-same-origin" referrerpolicy="no-referrer" srcdoc="${esc(html).replace(/"/g, "&quot;")}"></iframe></div>`;
    } else {
        body = `<pre>${esc(pv.text)}</pre>`;
    }
    let fileLabel = files ? `${files[selected].name} · ` : "";
    if (node.op === "Magic" && Array.isArray(node._magic)) {
        const probed = node._magicProbed == null ? node._magic.length : node._magicProbed;
        const ran = node._magicRan == null ? node._magic.length : node._magicRan;
        fileLabel = `${node._magic.length} ranked · ${ran}/${probed} ran · `;
    }
    const fileRows = files
        ? `<div class="file-list" title="Pick the file that flows into the next node">${files.map((f, i) => `<button class="file-row${i === selected ? " on" : ""}" data-file-pick="${i}" data-node="${node.id}"><span class="file-name">${esc(f.name)}</span><span class="file-size">${formatBytes(f.size)}</span></button>`).join("")}</div>`
        : "";
    wrap.innerHTML = `
        <div class="preview-head">
            <span class="bytes">${fileLabel}${has ? formatBytes(bytes.length) : (node._error ? "error" : "—")}</span>
            <span class="spacer"></span>
            <span class="seg">${(isImage ? [["image", "Image"], ["raw", "Raw"], ["hex", "Hex"]] : [["text", "Text"], ["hex", "Hex"]]).map(([m, label]) => `<button data-action="preview-mode" data-node="${node.id}" data-mode="${m}" class="${mode === m ? "on" : ""}">${label}</button>`).join("")}</span>
            ${has ? `<button class="mini-btn" data-action="copy-node" data-node="${node.id}" title="Copy output">${iconFill("copy")}</button>` : ""}
            ${has && isSink ? `<button class="mini-btn" data-action="save-node" data-node="${node.id}" title="Save output">${iconFill("save")}</button>` : ""}
        </div>
        ${body}
        ${fileRows}
    `;
}

// The Magic node shows its ranking: pick a row to make that candidate the node's output.
function magicListHtml(node) {
    if (!node._magic.length) {
        return `<pre>Nothing in the library produced usable output for this input.</pre>`;
    }
    const best = node._magic[0].score || 1;
    const rows = node._magic.map((row, i) => {
        const width = Math.max(3, Math.round(100 * Math.max(0, row.score) / Math.max(1, Math.max(best, 0))));
        return `<button class="magic-row${i === (node.magicChoice || 0) ? " on" : ""}" data-magic-pick="${i}" data-node="${node.id}" title="Use ${esc(row.op)} as this node's output">
            <span class="magic-rank">${i + 1}</span>
            <span class="magic-main">
                <span class="magic-op">${esc(row.op)}</span>
                <span class="magic-preview">${esc(row.preview || "")}</span>
            </span>
            <span class="magic-score"><span class="magic-bar" style="width:${width}%"></span></span>
            <span class="magic-value">${Math.round(row.score)}</span>
        </button>`;
    }).join("");
    const notes = node._magic[clamp(node.magicChoice || 0, 0, node._magic.length - 1)].notes || [];
    const warning = node._magicWarning ? `<div class="magic-warning">${esc(node._magicWarning)}</div>` : "";
    return `${warning}<div class="magic-list" title="Ranked by how much each result looks like real output">${rows}</div>
        <div class="magic-notes">${notes.length ? esc(notes.join(" · ")) : "best result"}</div>`;
}

function buildError(node) {
    const div = document.createElement("div");
    div.className = "error-box";
    div.dataset.nodeError = "";
    div.style.display = node._error ? "block" : "none";
    div.textContent = node._error || "";
    return div;
}

function refreshNodePreview(node) {
    const el = nodeEl(node.id);
    if (!el) return;
    // The input box of an operation shows what its wire is carrying, refreshed on every run.
    const opInput = $("[data-op-input]", el);
    if (opInput) {
        const hint = opInputHint(node);
        opInput.placeholder = hint || (edgeInto(node.id, "main") ? "Fed by the wire" : "Type input text");
    }
    let p = $("[data-preview]", el);
    if (!p) return;
    updatePreviewEl(p, node);
    const err = $("[data-node-error]", el);
    if (err) {
        err.textContent = node._error || "";
        err.style.display = node._error ? "block" : "none";
    }
    el.classList.toggle("has-error", Boolean(node._error));
    updateInputBytes(node);
    scheduleEdges();
}

function refreshAllPreviews() {
    for (const node of state.nodes) refreshNodePreview(node);
}

function beginTitleEdit(node, titleEl) {
    if (node.type === "op") return;
    const original = titleEl.textContent;
    titleEl.contentEditable = "true";
    titleEl.focus();
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const finish = () => {
        titleEl.contentEditable = "false";
        const value = titleEl.textContent.trim();
        node.title = value || original;
        titleEl.textContent = node.title;
        saveLocalSoon();
    };
    titleEl.addEventListener("blur", finish, {once: true});
    titleEl.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); titleEl.blur(); }
        if (e.key === "Escape") { titleEl.textContent = original; titleEl.blur(); }
    });
}

/* ================================================================ edges */
let edgeFrame = 0;
function scheduleEdges() {
    if (edgeFrame) return;
    edgeFrame = requestAnimationFrame(() => {
        edgeFrame = 0;
        drawEdges();
    });
}

function portCenter(portEl) {
    if (!portEl) return null;
    const r = portEl.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    return {
        x: (r.left + r.width / 2 - s.left - state.view.x) / state.view.zoom,
        y: (r.top + r.height / 2 - s.top - state.view.y) / state.view.zoom
    };
}

function pathFor(a, b) {
    const dx = Math.max(65, Math.abs(b.x - a.x) * 0.42);
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${(a.x + dx).toFixed(1)} ${a.y.toFixed(1)}, ${(b.x - dx).toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function edgeMidpoint(a, b) {
    const dx = Math.max(65, Math.abs(b.x - a.x) * 0.42);
    const x = (a.x + 3 * (a.x + dx) + 3 * (b.x - dx) + b.x) / 8;
    const y = (a.y + 3 * a.y + 3 * b.y + b.y) / 8;
    return {x, y};
}

// Where to put the wire's delete handle. The midpoint is the natural spot, but a wire can
// pass underneath a node card, which paints above the wires and would bury the handle.
// So walk outwards from the middle looking for a point that is clear of every node, and
// prefer one where the browser reports the point as this wire. Falls back to a clear
// point, then to the plain midpoint, if the whole wire is hidden.
function handlePointOnEdge(edge, a, b) {
    const mid = edgeMidpoint(a, b);
    const path = edgesLayer.querySelector(`.edge-hit[data-edge="${cssEscape(edge.id)}"]`);
    if (!path || typeof path.getTotalLength !== "function") return mid;
    const total = path.getTotalLength();
    if (!total) return mid;
    const svgPoint = edgesSvg.createSVGPoint();
    const ctm = path.getScreenCTM();
    if (!ctm) return mid;
    const R = 16; // keep the whole handle clear of the window edge
    let clear = null;
    for (const t of [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7, 0.25, 0.75, 0.2, 0.8, 0.15, 0.85, 0.1, 0.9]) {
        const p = path.getPointAtLength(total * t);
        svgPoint.x = p.x; svgPoint.y = p.y;
        const s = svgPoint.matrixTransform(ctm);
        if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
        if (s.x < R || s.y < R || s.x > window.innerWidth - R || s.y > window.innerHeight - R) continue;
        // A node card paints above the wires, so a handle drawn over one would be buried
        // and unclickable. Skip any point a node covers.
        const el = document.elementFromPoint(s.x, s.y);
        if (el && el.closest && el.closest(".node")) continue;
        const own = el && el.classList && el.classList.contains("edge-hit") && el.dataset.edge === edge.id;
        if (own) return {x: p.x, y: p.y};
        if (!clear) clear = {x: p.x, y: p.y};
    }
    // Nothing on the wire is fully visible (it runs under a card); sit it on the part
    // that is uncovered, or fall back to the true midpoint.
    return clear || mid;
}

function drawEdges() {
    if (!state) return;
    edgesLayer.innerHTML = "";
    edgeHandlesLayer.innerHTML = "";
    for (const edge of state.edges) {
        const from = nodeById(edge.from);
        const to = nodeById(edge.to);
        if (!from || !to) continue;
        const outEl = nodeEl(from.id)?.querySelector('.port.out');
        const inEl = nodeEl(to.id)?.querySelector(`.port.in[data-port="${cssEscape(edge.toPort)}"]`);
        if (!outEl || !inEl) continue;
        const a = portCenter(outEl);
        const b = portCenter(inEl);
        if (!a || !b) continue;
        const color = nodeAccent(from);
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "edge-group" + (selected?.type === "edge" && selected.id === edge.id ? " selected" : ""));
        group.style.setProperty("--edge-accent", color);
        const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hit.setAttribute("d", pathFor(a, b));
        hit.setAttribute("class", "edge-hit");
        hit.dataset.edge = edge.id;
        hit.addEventListener("pointerdown", ev => {
            ev.stopPropagation();
            selectEdge(edge.id);
        });
        hit.addEventListener("dblclick", ev => { ev.preventDefault(); removeEdge(edge.id); });
        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        line.setAttribute("d", pathFor(a, b));
        line.setAttribute("class", "edge-line");
        line.setAttribute("stroke", color);
        group.appendChild(hit);
        group.appendChild(line);
        // The group has to be in the document before the handle position is probed, or
        // elementFromPoint cannot see this wire yet.
        edgesLayer.appendChild(group);
        if (selected?.type === "edge" && selected.id === edge.id) {
            const mid = handlePointOnEdge(edge, a, b);
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", "edge-x");
            g.setAttribute("transform", `translate(${mid.x} ${mid.y})`);
            // An invisible disc a little larger than the visible one, so the handle is
            // comfortable to hit without looking bulky.
            const hitDisc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            hitDisc.setAttribute("class", "edge-x-hit");
            hitDisc.setAttribute("r", String(15 / state.view.zoom));
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("class", "edge-x-disc");
            circle.setAttribute("r", String(9 / state.view.zoom));
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("font-size", String(13 / state.view.zoom));
            text.textContent = "×";
            g.appendChild(hitDisc);
            g.appendChild(circle);
            g.appendChild(text);
            const drop = ev => {
                ev.preventDefault();
                ev.stopPropagation();
                removeEdge(edge.id);
            };
            g.addEventListener("pointerdown", drop);
            g.addEventListener("click", ev => ev.stopPropagation());
            // Drawn last and in its own layer, so it always sits above the wires and
            // above the nodes: nothing can swallow the click.
            edgeHandlesLayer.appendChild(g);
        }
    }
}

function cssEscape(v) {
    return String(v).replace(/(["\\])/g, "\\$1");
}

function selectNode(id) {
    selected = {type: "node", id};
    syncSelectionClasses();
    scheduleEdges();
}
function selectEdge(id) {
    selected = {type: "edge", id};
    syncSelectionClasses();
    scheduleEdges();
}
function clearSelection() {
    selected = null;
    syncSelectionClasses();
    scheduleEdges();
}
function syncSelectionClasses() {
    for (const el of $$(".node", nodesLayer)) {
        el.classList.toggle("selected", selected?.type === "node" && Number(el.dataset.id) === selected.id);
    }
}

function removeEdge(id) {
    const before = state.edges.length;
    state.edges = state.edges.filter(e => e.id !== id);
    if (state.edges.length === before) return;
    if (selected?.type === "edge" && selected.id === id) selected = null;
    renderAllNodes();
    onGraphEdited();
}

function connectEdge(fromId, toId, toPort) {
    if (!fromId || !toId || fromId === toId) {
        if (fromId === toId) toast("A node cannot feed directly into itself.", "error");
        return;
    }
    const toNode = nodeById(toId);
    if (!toNode) return;
    // Text/file nodes take one "main" pipe (the left-hand port); ops take main or an arg.
    const accepts = toNode.type === "op"
        ? (toPort === "main" || /^arg:\d+$/.test(toPort))
        : toNode.type === "join" ? /^join:\d+$/.test(toPort) : toPort === "main";
    if (!accepts) return;
    if (toPort.startsWith("arg:")) {
        const idx = Number(toPort.slice(4));
        const arg = OPS[toNode.op]?.args?.[idx];
        if (!arg || !argTypeWirable(arg.type)) { toast("That argument cannot be wired.", "error"); return; }
    }
    state.edges = state.edges.filter(e => !(e.to === toId && e.toPort === toPort));
    state.edges.push({id: "e" + (edgeSeq++), from: fromId, to: toId, toPort});
    renderAllNodes();
    onGraphEdited();
}

function removeChipEdge(id) {
    removeEdge(id);
}

/* ================================================================ connections dragging */
let connection = null;

function startConnectionFromOutput(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const port = ev.currentTarget;
    const node = port.closest(".node");
    if (!node) return;
    beginConnection({fromId: Number(node.dataset.id), fromPort: "out"}, port);
}

function startConnectionFromInput(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const port = ev.currentTarget;
    const node = port.closest(".node");
    if (!node) return;
    beginConnection({fromId: null, toId: Number(node.dataset.id), toPort: port.dataset.port}, port);
}

function beginConnection(start, portEl) {
    connection = {
        ...start,
        temp: document.createElementNS("http://www.w3.org/2000/svg", "path"),
        origin: portCenter(portEl)
    };
    connection.temp.setAttribute("class", "edge-temp");
    edgesLayer.appendChild(connection.temp);
    document.body.classList.add("connecting");
    if (start.fromId !== null) {
        highlightPorts(".port.in", true);
    } else {
        highlightPorts(".port.out", true);
    }
    document.addEventListener("pointermove", onConnectionMove);
    document.addEventListener("pointerup", onConnectionUp, {once: true});
    updateTempConnection(portEl, null);
}

// We need the initial pointer position for the temporary curve. Use the centre of the
// start port; the cursor position is updated immediately on the first pointermove.
let evClient = {x: 0, y: 0};
document.addEventListener("pointermove", e => { evClient = {x: e.clientX, y: e.clientY}; }, {passive: true});

function updateTempConnection(portEl, targetPort) {
    if (!connection) return;
    const stageRect = stage.getBoundingClientRect();
    const cursor = targetPort
        ? portCenter(targetPort)
        : {x: (evClient.x - stageRect.left - state.view.x) / state.view.zoom, y: (evClient.y - stageRect.top - state.view.y) / state.view.zoom};
    let a = connection.origin;
    let b = cursor;
    if (connection.fromId === null) {
        // Input -> output: draw from the output/cursor to the fixed input.
        [a, b] = [cursor, connection.origin];
    }
    if (!a) return;
    connection.temp.setAttribute("d", pathFor(a, b));
}

function onConnectionMove(ev) {
    if (!connection) return;
    const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".port");
    updateTempConnection(null, target && target.classList.contains("in") && connection.fromId !== null ? target :
        target && target.classList.contains("out") && connection.fromId === null ? target : null);
}

function onConnectionUp(ev) {
    if (!connection) return;
    const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".port");
    const c = connection;
    connection = null;
    c.temp.remove();
    document.body.classList.remove("connecting");
    highlightPorts(".port.in", false);
    highlightPorts(".port.out", false);
    document.removeEventListener("pointermove", onConnectionMove);
    if (target) {
        const targetNode = target.closest(".node");
        if (targetNode) {
            const targetId = Number(targetNode.dataset.id);
            if (c.fromId !== null && target.classList.contains("in")) {
                connectEdge(c.fromId, targetId, target.dataset.port);
            } else if (c.fromId === null && target.classList.contains("out")) {
                connectEdge(targetId, c.toId, c.toPort);
            }
        }
    }
}

function highlightPorts(selector, on) {
    for (const p of $$(selector, nodesLayer)) p.classList.toggle("drop-ok", on);
}

function bindInputPort(portEl, nodeId, port) {
    if (!portEl) return;
    portEl.addEventListener("pointerdown", ev => {
        // If the input already has an edge, a plain click disconnects; dragging still starts a new wire.
        const existing = edgeInto(nodeId, port);
        if (existing && ev.altKey) {
            removeChipEdge(existing.id);
            return;
        }
        startConnectionFromInput(ev);
    });
}

/* ================================================================ drag / pan */
function startNodeDrag(node, ev) {
    const el = nodeEl(node.id);
    if (!el) return;
    const startX = ev.clientX, startY = ev.clientY;
    const ox = node.x, oy = node.y;
    let moved = false;
    el.style.zIndex = "5";
    const move = e => {
        const dx = (e.clientX - startX) / state.view.zoom;
        const dy = (e.clientY - startY) / state.view.zoom;
        if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
        node.x = Math.round(ox + dx);
        node.y = Math.round(oy + dy);
        el.style.left = node.x + "px";
        el.style.top = node.y + "px";
        scheduleEdges();
    };
    const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up, {once: true});
        el.style.zIndex = "";
        if (moved) { saveLocalSoon(); scheduleEdges(); }
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, {once: true});
}

// Resize from the bottom-right grip. The size is stored on the node so it survives
// saves, and the wires are re-measured while dragging.
function startNodeResize(node, ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const el = nodeEl(node.id);
    if (!el) return;
    const startX = ev.clientX, startY = ev.clientY;
    const ow = el.offsetWidth, oh = el.offsetHeight;
    const prevMin = el.style.minHeight;
    el.classList.add("resizing", "resized");
    // Measure the smallest the node can be without hiding any of its content, so the
    // drag stops there instead of squeezing the card over its own controls. A resized
    // node shows its full preview, so measure with that styling already applied.
    el.style.minHeight = "0px";
    const naturalH = Math.max(120, el.offsetHeight);
    el.style.minHeight = prevMin;
    const move = e => {
        const dw = (e.clientX - startX) / state.view.zoom;
        const dh = (e.clientY - startY) / state.view.zoom;
        node.w = Math.max(238, Math.round(ow + dw));
        node.h = Math.max(naturalH, Math.round(oh + dh));
        el.style.width = node.w + "px";
        el.style.minHeight = node.h + "px";
        scheduleEdges();
    };
    const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up, {once: true});
        el.classList.remove("resizing");
        // Store what was actually rendered, so the saved size matches the screen and a
        // node too small for its content is corrected on the next load.
        node.w = el.offsetWidth;
        node.h = Math.max(el.offsetHeight, naturalH);
        el.style.minHeight = node.h + "px";
        saveLocalSoon();
        scheduleEdges();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, {once: true});
}

function startPan(ev) {
    if (ev.button !== 0) return;
    const el = ev.target;
    if (el.closest(".node") || el.closest(".port") || el.closest(".toolbar") ||
        el.closest(".stage-controls") || el.closest(".run-status") || el.closest(".edge-group")) return;
    ev.preventDefault();
    const sx = ev.clientX, sy = ev.clientY;
    const ox = state.view.x, oy = state.view.y;
    let moved = false;
    stage.classList.add("panning");
    const move = e => {
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        state.view.x = ox + dx;
        state.view.y = oy + dy;
        applyView();
    };
    const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up, {once: true});
        stage.classList.remove("panning");
        if (moved) saveLocalSoon();
        else if (selected) clearSelection();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, {once: true});
}

/* ================================================================ input parsing */
function textBytes(text, encoding) {
    if (encoding === "hex") return hexToBytes(text);
    if (encoding === "base64") return b64ToBytes(text);
    if (encoding === "latin1") return latin1ToBytes(text);
    return enc.encode(text);
}

function inputNodeBytes(node) {
    return textBytes(node.text ?? "", node.encoding);
}

// The text typed into an operation's own input box, for when no wire feeds it.
function opInputBytes(node) {
    const text = node.inputText ?? "";
    return text ? textBytes(text, node.inputEncoding || "utf8") : new Uint8Array(0);
}

function joinSeparatorString(text) {
    return String(text || "")
        .replace(/\\r/g, "\r")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\");
}

/* ================================================================ graph core */
function buildIncoming(edges) {
    const incoming = new Map();
    for (const e of edges) {
        if (!incoming.has(e.to)) incoming.set(e.to, new Map());
        incoming.get(e.to).set(e.toPort, e);
    }
    return incoming;
}

function topoSort(nodes, edges) {
    const ids = new Set(nodes.map(n => n.id));
    const indeg = new Map(nodes.map(n => [n.id, 0]));
    const out = new Map(nodes.map(n => [n.id, []]));
    for (const e of edges) {
        if (!ids.has(e.from) || !ids.has(e.to)) continue;
        indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
        out.get(e.from).push(e.to);
    }
    const queue = nodes.filter(n => indeg.get(n.id) === 0).map(n => n.id);
    const order = [];
    while (queue.length) {
        const id = queue.shift();
        order.push(nodeByIdIn(nodes, id));
        for (const next of out.get(id) || []) {
            indeg.set(next, indeg.get(next) - 1);
            if (indeg.get(next) === 0) queue.push(next);
        }
    }
    const cycle = nodes.filter(n => !order.includes(n));
    return {order, cycle};
}
function nodeByIdIn(nodes, id) { return nodes.find(n => n.id === id); }

function sourceBytesForPort(incoming, nodeId, port, results) {
    const e = incoming.get(nodeId)?.get(port);
    if (!e) return {bytes: null, error: "", sig: "none", source: null};
    const r = results.get(e.from);
    if (!r) return {bytes: null, error: "Upstream node has not run.", sig: "missing", source: e.from};
    if (r.error) return {bytes: null, error: r.error, sig: r.sig || "err", source: e.from};
    return {bytes: r.bytes || new Uint8Array(0), error: "", sig: r.sig || "0", source: e.from};
}

function resolveNodeArgs(node, incoming, results) {
    const args = OPS[node.op]?.args || [];
    const values = cloneValue(node.values || []);
    let upstreamError = "";
    const sigs = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const e = incoming.get(node.id)?.get("arg:" + i);
        if (!e) continue;
        const src = sourceBytesForPort(incoming, node.id, "arg:" + i, results);
        if (src.error) upstreamError = src.error;
        sigs.push("arg" + i + ":" + src.sig);
        if (!src.bytes) continue;
        if (arg.type === "toggleString") {
            values[i] = {string: bytesToHex(src.bytes), option: "Hex"};
        } else if (arg.type === "string" || arg.type === "binaryString" || arg.type === "binaryShortString" ||
                   arg.type === "shortString" || arg.type === "text") {
            values[i] = utf8(src.bytes);
        }
    }
    return {values: args.map((arg, i) => normalizeArgForRecipe(arg, values[i])), upstreamError, sigs};
}

function normalizeArgForRecipe(arg, value) {
    switch (arg.type) {
        case "number":
            if (typeof value === "string" && value.trim() === "") return 0;
            return Number(value);
        case "boolean":
            return Boolean(value);
        case "toggleString":
            if (value && typeof value === "object") return {string: String(value.string ?? ""), option: String(value.option ?? "Hex")};
            return {string: String(value ?? ""), option: (arg.toggleValues && arg.toggleValues[0]) || "Hex"};
        case "argSelector":
            return String(value ?? "");
        case "populateMultiOption":
            if (Array.isArray(value)) return value;
            if (value && typeof value === "object") return value.value ?? value.name ?? "";
            return String(value ?? "");
        default:
            if (value && typeof value === "object") return value.value ?? value.name ?? String(value);
            return value ?? "";
    }
}

function inputSignature(node, incoming, results) {
    if (node.type === "op") {
        const main = sourceBytesForPort(incoming, node.id, "main", results);
        const argSigs = [];
        for (const port of incoming.get(node.id)?.keys() || []) {
            if (port.startsWith("arg:")) {
                const s = sourceBytesForPort(incoming, node.id, port, results);
                argSigs.push(port + "=" + s.sig);
            }
        }
        return JSON.stringify([node.op, node.values, node.inputText, node.inputEncoding, main.sig, argSigs.sort()]);
    }
    if (node.type === "input") {
        const s = sourceBytesForPort(incoming, node.id, "main", results);
        return JSON.stringify(["input", node.encoding, node.text, s.sig]);
    }
    if (node.type === "file") {
        const s = sourceBytesForPort(incoming, node.id, "main", results);
        return JSON.stringify(["file", node.fileSize, node.fileName, fnvBytes(b64ToBytes(node.fileData || "")), s.sig]);
    }
    if (node.type === "join") {
        const parts = [];
        for (let i = 0; i < node.joinCount; i++) {
            const s = sourceBytesForPort(incoming, node.id, "join:" + i, results);
            parts.push(s.sig);
        }
        return JSON.stringify(["join", node.separator, node.joinCount, parts]);
    }
    return JSON.stringify(node);
}

function createResult(node, bytes, error, sig, extra = {}) {
    return {bytes: bytes || null, error: error || "", sig: sig || sigHash(node.id + ":" + node.type), ...extra};
}

function base64ToArrayBuffer(b64) {
    const bytes = b64ToBytes(b64);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/* ================================================================ Magic
 * Magic runs every operation in the library over one input, scores each result for
 * how much it looks like real, useful output, and hands back the best few. The
 * probing happens inside the engine worker (one message for hundreds of bakes);
 * scoring and ranking happen here, where the heuristics are easy to follow.
 */

// Operations that are slow, random, time dependent or need the network. They are
// skipped unless the node asks for them, so a Magic sweep stays interactive.
const MAGIC_SKIP = new Set([
    "HTTP request", "DNS over HTTPS", "Sleep", "Get Time", "Generate UUID",
    "Generate RSA Key Pair", "Generate ECDSA Key Pair", "Generate PGP Key Pair",
    "Pseudo-Random Prime Generator", "Pseudo-Random Integer Generator", "Pseudo-Random Number Generator",
    "Bcrypt", "Bcrypt compare", "Scrypt", "Argon2", "RSA Sign", "RSA Verify",
    "Bombe", "Colossus", "Multiple Bombe", "Optical Character Recognition",
    "Yara Rules", "Detect File Type", "Extract Files", "Scan for Embedded Files",
    "Magic"
]);

// Operations that only describe or draw their input. They can never be the plaintext a
// Magic sweep is looking for, so they are never probed at all.
const MAGIC_NOISE = new Set([
    "Entropy", "Index of Coincidence", "Frequency distribution", "Scatter chart",
    "Hex Density chart", "Numberwang", "Show Base64 offsets", "Hamming Distance",
    "Convert speed", "Detect File Type", "Scan for Embedded Files", "Render Image",
    "Play Media", "Syntax highlighter", "Generate Lorem Ipsum", "Generate HOTP",
    "Generate TOTP", "Generate UUID", "Generate Image", "Generate QR Code",
    "Generate Barcode", "Magic"
]);

const MAGIC_COMMON_WORDS = new Set("the and for you that with this from have not are was but all can her his one our out day get has him its new now old see two way who did let put say she too use man men world time year people days thing part place work week case point number group problem fact attack dawn secret code cipher hello world test flag message data key text meet bridge midnight eagle lands land north south east west left right door open close under over inside outside house room water fire earth air light dark night morning evening today tomorrow yesterday friend friends family mother father sister brother home school money food game play read write speak listen start stop begin end first last next many much more most some any every each other another same different good bad great small large long short high low young early late real sure free full able best better please thanks thank sorry yes answer question story book page word words letter letters name names place places city town country road street river mountain sea boat ship train car plane walk run jump sit stand sleep wake eat drink buy sell give take find think know want need like love hate help show tell ask call wait try turn keep hold bring look feel seem leave move live believe hope wish plan idea team order line list side top bottom front back hour minute second week month year always never often sometimes maybe perhaps really very quite just only even also still yet about above across after against along among around before behind below beside between beyond during except inside into near since through toward under until upon within without would could should might must shall will may does did done being been having had has".split(/\s+/));

// Words that describe an operation rather than a message: a result built out of these is
// a warning or a parameter list, not the plaintext a sweep is looking for.
const MAGIC_TECH_WORDS = new Set("key keys byte bytes header headers input output data file files operation operations valid invalid character characters check checks error errors unsupported requires required expected parameter parameters argument arguments format formats decode encode cipher ciphers sample samples modify setting settings option options type types length size mode padding alphabet stream block blocks offset range bit bits row rows column columns index indices parse parsed delimiter separator terminator encoding".split(/\s+/));
const MAGIC_BIGRAMS = ["th", "he", "in", "er", "an", "re", "on", "at", "en", "nd", "ti", "es", "or", "te", "of", "ed", "is", "it", "al", "ar", "st", "to", "nt", "ng", "se", "ha", "as", "ou", "io", "le", "ve", "co", "me", "de"];
const EN_FREQ = {A: 8.167, B: 1.492, C: 2.782, D: 4.253, E: 12.702, F: 2.228, G: 2.015, H: 6.094, I: 6.966, J: 0.153, K: 0.772, L: 4.025, M: 2.406, N: 6.749, O: 7.507, P: 1.929, Q: 0.095, R: 5.987, S: 6.327, T: 9.056, U: 2.758, V: 0.978, W: 2.360, X: 0.150, Y: 1.974, Z: 0.074};

// Cosine similarity between the letter histogram of a result and English letter
// frequencies. A short decoded word or two already separates English from noise, and
// the confidence grows with the number of letters present.
function letterFrequencyCosine(text) {
    const counts = Object.create(null);
    let letters = 0;
    for (const ch of text.toUpperCase()) {
        if (ch >= "A" && ch <= "Z") {
            counts[ch] = (counts[ch] || 0) + 1;
            letters++;
        }
    }
    if (letters < 3) return 0;
    let dot = 0;
    let seenSquares = 0;
    let expectedSquares = 0;
    for (let i = 0; i < 26; i++) {
        const ch = String.fromCharCode(65 + i);
        const seen = (counts[ch] || 0) / letters;
        const expected = EN_FREQ[ch] / 100;
        dot += seen * expected;
        seenSquares += seen * seen;
        expectedSquares += expected * expected;
    }
    return dot / (Math.sqrt(seenSquares) * Math.sqrt(expectedSquares) || 1);
}

function shannonEntropy(text) {
    const counts = Object.create(null);
    for (const ch of text) counts[ch] = (counts[ch] || 0) + 1;
    let bits = 0;
    for (const count of Object.values(counts)) {
        const p = count / text.length;
        bits -= p * Math.log2(p);
    }
    return bits;
}

// Warnings and instructions that operations print instead of data. They are full English
// sentences, so the statistics alone would rank them highly.
const MAGIC_MESSAGE = /^(error|sorry|invalid|unknown|cannot|can't|could not|couldn't|unable|failed|malformed|unsupported|no valid|no matches|nothing|you can only|you need|you must|must supply|please|enter |insert |input units|try |the input|the output|the key|the data|unexpected|this operation|file type|pattern|mixed|missing|match|data|input|output|text|key|file|number|not |incorrect|expected|requires?)\b/i;
const MAGIC_MESSAGE_PHRASE = /\b(could not|cannot|unable to|failed to|must|is not valid|is not a valid|not a valid|not enough|need at least|need \d+|is not in|is not a|each row|out of range|too small|too large|you need|please (enter|provide|specify|supply)|enter the|requires? a|is required|are required|invalid\b|unsupported|malformed|truncated|corrupt|overflow|underflow|mismatch|ambiguous|specify|unknown|not found|not supported|no match|no key|no input|no data|no valid|does not|doesn't|isn't|has no|have no)\b/i;

// A labelled record ("Date: …", "Path name: …", "Source MAC: …") is a parser's report
// about the input, not a message behind it.
const MAGIC_LABEL_PREFIX = /^([A-Z][A-Za-z0-9 _-]{1,28}):\s/;
const MAGIC_LABEL_WORDS = /\b(date|time|browser|version|path|name|source|destination|type|length|size|checksum|mode|encoding|format|marker|offset|address|protocol|port|flags|status|user|host|scheme|query|fragment|header)\b/i;

/* How good a result looks. The score is a 0-100 quality measure instead of a pile of
 * bonuses, so a short clean sentence can beat a long artefact: 38% of it is legibility
 * (how much of the text is letters and spaces) and 62% is how English it reads (letter
 * frequencies, common bigrams, dictionary words). */
function scoreMagicResult(text, inputText) {
    const notes = [];
    if (!text) return {score: -999, notes: ["empty"]};
    if (text === inputText) return {score: -500, notes: ["unchanged"]};
    const total = text.length;
    let letters = 0;
    let spaces = 0;
    let printable = 0;
    let control = 0;
    let digits = 0;
    for (const ch of text) {
        const code = ch.codePointAt(0);
        if (code === 9 || code === 10 || code === 13) {
            printable++;
            spaces++;
            continue;
        }
        if (code >= 32 && code !== 127) printable++;
        if (code < 32) control++;
        if (/[A-Za-z]/.test(ch)) letters++;
        else if (/\s/.test(ch)) spaces++;
        else if (/[0-9]/.test(ch)) digits++;
    }

    // Markup, envelopes, warnings and parameter lists are what an operation says about
    // its input, never the plaintext behind it.
    const trimmed = text.trim();
    if (/<\/?[a-z][a-z0-9]*[\s/>]/i.test(trimmed) || /<svg|<!doctype|<span|<canvas/i.test(trimmed)) {
        return {score: -999, notes: ["markup, not data"]};
    }
    if (/-----BEGIN [A-Z ]+-----/.test(trimmed)) {
        return {score: -999, notes: ["envelope, not data"]};
    }
    if (MAGIC_MESSAGE.test(trimmed) || MAGIC_MESSAGE_PHRASE.test(trimmed.slice(0, 90))) {
        return {score: -999, notes: ["message, not data"]};
    }
    const label = MAGIC_LABEL_PREFIX.exec(trimmed);
    if (label && MAGIC_LABEL_WORDS.test(label[1])) {
        return {score: -999, notes: ["parsed record, not data"]};
    }
    const tokens = text.match(/[A-Za-z]{2,}/g) || [];
    const techWords = tokens.filter(word => MAGIC_TECH_WORDS.has(word.toLowerCase())).length;
    if (techWords >= 3 || (techWords >= 2 && techWords / Math.max(1, tokens.length) >= 0.4)) {
        return {score: -999, notes: ["message, not data"]};
    }

    const knownWords = tokens.filter(word => MAGIC_COMMON_WORDS.has(word.toLowerCase())).length;
    const lower = text.toLowerCase();
    let bigramHits = 0;
    for (const bigram of MAGIC_BIGRAMS) {
        let at = -1;
        while ((at = lower.indexOf(bigram, at + 1)) >= 0) bigramHits++;
    }

    const legibility = clamp((letters + Math.min(spaces, letters * 0.6)) / Math.max(1, total), 0, 1);
    const frequency = clamp((letterFrequencyCosine(text) - 0.6) / 0.35, 0, 1);
    const bigramDensity = clamp(bigramHits / Math.max(6, letters) / 0.32, 0, 1);
    const wordDensity = tokens.length >= 2 ? knownWords / tokens.length : (knownWords ? 0.4 : 0);
    const digitPenalty = clamp(1 - (digits / Math.max(1, total)) * 1.8, 0, 1);
    const english = (0.42 * frequency + 0.32 * bigramDensity + 0.26 * wordDensity) * digitPenalty;

    let score = 100 * (0.38 * legibility + 0.62 * english);

    // Real words are the strongest evidence, so longer dictionary words count more.
    const longWords = tokens.filter(word => word.length >= 4 && MAGIC_COMMON_WORDS.has(word.toLowerCase())).length;
    score += Math.min(longWords * 4, 10);
    if (/^[A-Z ]{8,}$/.test(trimmed)) {
        score += 4;
        notes.push("uppercase text");
    }
    if (control > total * 0.1) score -= 60;
    if (printable / total < 0.75) score -= 120;
    // Random-looking bytes carry no message even when every character is printable.
    const entropy = shannonEntropy(text.slice(0, 400));
    if (entropy > 4.5) score -= (entropy - 4.5) * 12;

    // Structured formats are worth suggesting even when they are not prose.
    if (total >= 20 && /^\s*[[{]/.test(text)) {
        try {
            JSON.parse(text);
            score += 14;
            notes.push("valid JSON");
        } catch { /* not JSON after all */ }
    }
    if (/^https?:\/\/[^\s]+$/i.test(text.trim())) { score += 10; notes.push("URL"); }
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(text.trim())) { score += 10; notes.push("email"); }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(text.trim())) { score += 10; notes.push("IPv4 address"); }
    if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?Z?$/.test(text.trim())) { score += 10; notes.push("timestamp"); }
    return {score, notes};
}

function magicCandidates(scope, includeSlow) {
    const loaded = engine.loadedModules();
    const out = [];
    for (const [name, meta] of Object.entries(OPS)) {
        if (meta.flowControl) continue;
        if (MAGIC_NOISE.has(name)) continue;
        if (!includeSlow && MAGIC_SKIP.has(name)) continue;
        if (scope === "Core module only" && meta.module !== "Default") continue;
        if (scope === "Loaded modules only" && !loaded.has(meta.module)) continue;
        out.push({op: name, args: meta.defaults || []});
    }
    return out;
}

function rankMagicResults(results, inputText) {
    const ranked = [];
    for (const result of results) {
        if (!result.ok || !result.text) continue;
        const {score, notes} = scoreMagicResult(String(result.text), inputText);
        if (score <= -400) continue;
        ranked.push({
            op: result.op,
            args: OPS[result.op]?.defaults || [],
            score,
            notes,
            ms: result.ms,
            preview: String(result.text).replace(/\s+/g, " ").slice(0, 120)
        });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked;
}

async function runMagicNode(node, inputBytes, argValues) {
    const topN = clamp(Math.round(Number(argValues[0]) || 10), 1, 40);
    const scope = String(argValues[1] || "Everything (loads every module)");
    const includeSlow = Boolean(argValues[2]);
    const inputText = utf8(inputBytes).slice(0, 4000);
    const buffer = inputBytes.buffer.slice(inputBytes.byteOffset, inputBytes.byteOffset + inputBytes.byteLength);
    if (!inputBytes.length) return {error: "Magic needs an input", rows: []};

    const candidates = magicCandidates(scope, includeSlow);
    if (!candidates.length) return {error: "No operations matched that scope", rows: []};
    // Modules have to be in the worker before their operations can run.
    const modules = [...new Set(candidates.map(c => OPS[c.op]?.module).filter(m => m && m !== "Default"))];
    for (const name of modules) {
        try {
            await engine.sendModule(name);
        } catch (err) {
            setRunStatus("running", `Magic: ${name} could not be loaded (${err.message})`);
        }
    }

    setRunStatus("running", `Magic is testing ${candidates.length} operations…`);
    const probe = await engine.probe(buffer, candidates, {timeout: 120000});
    const ranked = rankMagicResults(probe.results || [], inputText).slice(0, topN);
    node._magicProbed = candidates.length;
    node._magicRan = (probe.results || []).length;
    if (!ranked.length) {
        node._magic = [];
        return {error: "Magic found nothing that produced usable output", rows: []};
    }
    if (node.magicChoice == null) node.magicChoice = 0;
    const choice = clamp(Number(node.magicChoice) || 0, 0, ranked.length - 1);
    node.magicChoice = choice;
    const best = ranked[choice];
    // Say so when nothing looks like real output, instead of presenting noise as an answer.
    const warning = ranked[0].score < 55 ? "Nothing looks convincing: these are the closest matches" : "";
    const response = await engine.bakeOp(best.op, best.args, buffer, {returnType: "ArrayBuffer", timeout: 30000});
    if (response?.error) return {error: response.error.displayStr || String(response.error), rows: ranked, warning};
    const files = await dishFiles(response?.dish);
    const bytes = files
        ? files[preferredFileIndex(node, files)].bytes
        : (dishBytes(response?.dish) || normalizeEngineResult(response?.result, response?.type));
    return {bytes, files, rows: ranked, error: "", warning};
}

async function executeGraph(nodes, edges, opts = {}) {
    const force = Boolean(opts.force);
    const results = new Map();
    const incoming = buildIncoming(edges);
    const {order, cycle} = topoSort(nodes, edges);
    const started = performance.now();
    let reused = 0, ran = 0;
    const errors = [];
    const cycleIds = new Set(cycle.map(n => n.id));

    for (const node of nodes) {
        if (cycleIds.has(node.id)) {
            node._error = "Cycle detected. Break the loop before running.";
            node._output = null;
            results.set(node.id, createResult(node, null, node._error, "cycle"));
        }
    }

    for (const node of order) {
        if (cycleIds.has(node.id)) continue;
        if (opts.onNodeStart) opts.onNodeStart(node);
        const t0 = performance.now();
        let out = null;
        let error = "";
        let countIt = true;
        let sig = "";
        try {
            const takesMain = node.type === "op" || node.type === "input" || node.type === "file";
            const main = takesMain
                ? sourceBytesForPort(incoming, node.id, "main", results)
                : {bytes: null, error: "", sig: "none"};
            if (main.error) error = "Upstream error: " + main.error;
            if (node.type === "op") {
                const resolved = resolveNodeArgs(node, incoming, results);
                if (!error && resolved.upstreamError) error = "Upstream error: " + resolved.upstreamError;
                sig = sigHash(inputSignature(node, incoming, results) + JSON.stringify(resolved.values));
                // Which Magic candidate is selected changes the output, so it is part
                // of the signature and a new pick re-runs the node.
                if (node.op === "Magic") sig += ":" + (node.magicChoice ?? 0);
                if (!force && node._sig === sig && !error && (node._output || node._error)) {
                    out = node._output;
                    error = node._error;
                    reused++;
                    countIt = false;
                } else if (!error) {
                    // A wired input wins; otherwise the text typed into the node is used.
                    const inputBytes = main.bytes != null ? main.bytes : opInputBytes(node);
                    if (node.op === "Magic") {
                        const magic = await runMagicNode(node, inputBytes, resolved.values);
                        if (magic.error && !magic.rows.length) throw new Error(magic.error);
                        node._magic = magic.rows;
                        node._files = magic.files || null;
                        out = magic.bytes || null;
                        node._magicWarning = magic.error || magic.warning || "";
                    } else {
                        const response = await engine.bakeOp(node.op, resolved.values, inputBytes.buffer.slice(inputBytes.byteOffset, inputBytes.byteOffset + inputBytes.byteLength), {
                            returnType: "ArrayBuffer",
                            timeout: opts.timeout || 30000
                        });
                        if (response?.error) throw new Error(response.error.displayStr || String(response.error));
                        const files = await dishFiles(response?.dish);
                        if (files) {
                            node._files = files;
                            out = files[preferredFileIndex(node, files)].bytes;
                        } else {
                            node._files = null;
                            out = dishBytes(response?.dish) || normalizeEngineResult(response?.result, response?.type);
                        }
                    }
                }
            } else if (node.type === "input") {
                sig = sigHash(inputSignature(node, incoming, results));
                if (!force && node._sig === sig && !error) { out = node._output; reused++; countIt = false; }
                else if (!error) {
                    // A piped input overrides the text typed into the node.
                    out = main.bytes != null ? main.bytes : inputNodeBytes(node);
                }
            } else if (node.type === "file") {
                sig = sigHash(inputSignature(node, incoming, results));
                if (error) { /* upstream error already recorded */ }
                else if (main.bytes != null) {
                    if (!force && node._sig === sig) { out = node._output; reused++; countIt = false; }
                    else out = main.bytes;
                }
                else if (!node.fileData) error = "Choose a file (or pipe bytes in) for this node.";
                else if (!force && node._sig === sig) { out = node._output; reused++; countIt = false; }
                else out = b64ToBytes(node.fileData);
            } else if (node.type === "join") {
                sig = sigHash(inputSignature(node, incoming, results));
                if (!force && node._sig === sig) { out = node._output; reused++; countIt = false; }
                else {
                    const parts = [];
                    for (let i = 0; i < node.joinCount; i++) {
                        const src = sourceBytesForPort(incoming, node.id, "join:" + i, results);
                        if (src.error) { error = "Upstream error: " + src.error; break; }
                        if (src.bytes) parts.push(src.bytes);
                    }
                    if (!error) {
                        const sep = enc.encode(joinSeparatorString(node.separator));
                        const withSeps = [];
                        parts.forEach((p, i) => { if (i) withSeps.push(sep); withSeps.push(p); });
                        out = concatBytes(withSeps);
                    }
                }
            }
        } catch (err) {
            error = err?.message || String(err);
            out = null;
        }
        const duration = performance.now() - t0;
        node._sig = sig;
        node._output = error ? null : out;
        if (error) node._files = null;
        node._error = error;
        node._duration = duration;
        node._reused = !countIt;
        if (!error) ran++;
        if (error) errors.push({node, error});
        results.set(node.id, createResult(node, node._output, error, sig, {duration, reused: !countIt}));
        if (opts.onNodeDone) opts.onNodeDone(node, results.get(node.id));
    }
    return {
        results, order, cycle, errors,
        reused, ran,
        duration: performance.now() - started
    };
}

function normalizeEngineResult(result, type) {
    if (result == null) return new Uint8Array(0);
    if (result instanceof Uint8Array) return new Uint8Array(result);
    if (result instanceof ArrayBuffer) return new Uint8Array(result);
    if (ArrayBuffer.isView(result)) return new Uint8Array(result.buffer, result.byteOffset, result.byteLength).slice();
    if (typeof result === "string") return enc.encode(result);
    if (typeof result === "object" && result.value !== undefined) return normalizeEngineResult(result.value, type);
    return new Uint8Array(0);
}

/* ---------------------------------------------------------------- dish values
 * CyberChef presents some results for display (image operations return HTML with an
 * embedded data URL, archive operations return a file listing) while the real payload
 * sits in the unpresented dish the engine also sends back. Nodes must flow the raw
 * payload onwards, otherwise a bit-plane image cannot feed the next image operation.
 */
const DISH_BYTE_ARRAY = 0;
const DISH_STRING = 1;
const DISH_ARRAY_BUFFER = 4;
const DISH_LIST_FILE = 8;

function dishBytes(dish) {
    const value = dish?.value;
    if (value == null) return null;
    if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
    // Byte arrays travel as one character per byte; true strings are text.
    if (typeof value === "string") return dish.type === DISH_BYTE_ARRAY ? latin1ToBytes(value) : enc.encode(value);
    return null;
}

async function dishFiles(dish) {
    const value = dish?.value;
    if (dish?.type !== DISH_LIST_FILE || !Array.isArray(value)) return null;
    const files = [];
    for (const entry of value) {
        if (!entry) continue;
        let bytes = null;
        if (typeof entry.arrayBuffer === "function") bytes = new Uint8Array(await entry.arrayBuffer());
        else bytes = dishBytes({value: entry, type: DISH_ARRAY_BUFFER});
        if (!bytes) continue;
        files.push({name: String(entry.name || `file ${files.length + 1}`), size: bytes.length, bytes});
    }
    return files.length ? files : null;
}

function preferredFileIndex(node, files) {
    const idx = Number(node.fileIndex) || 0;
    return clamp(idx, 0, files.length - 1);
}

function nodeOutputBytes(node) {
    if (node._files?.length) return node._files[preferredFileIndex(node, node._files)].bytes;
    return node._output;
}

// Re-render a node whose file list changed without re-running the engine.
function applyNodeFileSelection(node) {
    if (!node._files?.length) return;
    node._output = node._files[preferredFileIndex(node, node._files)].bytes;
    node._sig = "";
    refreshNodePreview(node);
    onGraphEdited();
}

/* ================================================================ graph execution UI */
function setNodeRunning(node, on) {
    const el = nodeEl(node.id);
    if (el) el.classList.toggle("running", on);
}
function setRunStatus(kind, text) {
    runStatus.classList.remove("ok", "running", "error");
    if (kind) runStatus.classList.add(kind);
    runStatusText.textContent = text;
}
// Total bytes sitting on the graph's outputs right now. Used to tell a real run from a
// cold pass that reported success while every node came back empty.
function graphOutputBytes() {
    let total = 0;
    for (const node of state?.nodes || []) {
        // Only engine-backed nodes matter here: text and file nodes always produce
        // their own bytes, so counting them would hide a pass where no operation ran.
        if (node.type !== "op" && node.type !== "join") continue;
        const bytes = nodeOutputBytes(node);
        if (bytes && bytes.length) total += bytes.length;
    }
    return total;
}
// Is there anything at all for the graph to work with?
function graphHadInput() {
    return (state?.nodes || []).some(node => {
        if (node.type === "input") {
            try { return inputNodeBytes(node).length > 0; } catch { return false; }
        }
        if (node.type === "file") return Boolean(node.fileData);
        return false;
    });
}

function scheduleRun(force = false, delay = 430) {
    if (!state) return;
    if (!state.autoRun && !force) return;
    clearTimeout(runTimer);
    runTimer = setTimeout(() => runGraph(force), delay);
}
async function runGraph(force = false) {
    if (!state) return;
    if (running) { runPending = true; return; }
    if (!state.autoRun && !force) return;
    running = true;
    runPending = false;
    runButton.disabled = true;
    runButton.innerHTML = `${svg("clock")} Running`;
    setRunStatus("running", "Starting embedded engine…");
    const generation = ++runGeneration;
    try {
        await engine.start();
        if (generation !== runGeneration) return;
        setRunStatus("running", `Running ${state.nodes.length} node${state.nodes.length === 1 ? "" : "s"}…`);
        const runOpts = {
            onNodeStart: node => {
                if (generation !== runGeneration) return;
                setNodeRunning(node, true);
            },
            onNodeDone: node => {
                if (generation !== runGeneration) return;
                setNodeRunning(node, false);
                refreshNodePreview(node);
            }
        };
        // While the engine has never yet returned data, an empty pass is a failed pass:
        // the first run straight after a reload can report success with every node
        // blank. Ask once more (forced) before telling the user the graph ran.
        const coldBlank = r => r.errors.length === 0 && !r.cycle.length &&
            engine.bakesWithData === 0 && graphHadInput() && graphOutputBytes() === 0;
        let result = await executeGraph(state.nodes, state.edges, {force, ...runOpts});
        if (generation !== runGeneration) return;
        let blank = coldBlank(result);
        if (blank) {
            setRunStatus("running", "Nothing came back — retrying the run…");
            result = await executeGraph(state.nodes, state.edges, {force: true, ...runOpts});
            if (generation !== runGeneration) return;
            blank = coldBlank(result);
        }
        refreshAllPreviews();
        const errCount = result.errors.length;
        const parts = [`Ran ${result.ran} node${result.ran === 1 ? "" : "s"} in ${Math.max(1, Math.round(result.duration))} ms`];
        if (result.reused) parts.push(`${result.reused} reused`);
        if (errCount) parts.push(`${errCount} error${errCount === 1 ? "" : "s"}`);
        setRunStatus(errCount ? "error" : "ok", parts.join(" · "));
        if (result.cycle.length) {
            setRunStatus("error", "Cycle detected — break the loop to run.");
        }
        if (errCount && !result.cycle.length) {
            const first = result.errors[0];
            setRunStatus("error", `Error in ${sourceTitle(first.node)}: ${first.error.slice(0, 90)}`);
        }
        // Never present a cold blank pass as success.
        if (blank) {
            setRunStatus("error", `Ran ${result.ran} node${result.ran === 1 ? "" : "s"} but no output came back — press Run to try again.`);
        }
    } catch (err) {
        setRunStatus("error", err.message || "The graph could not run.");
    } finally {
        if (generation === runGeneration) {
            running = false;
            runButton.disabled = false;
            runButton.innerHTML = `${iconFill("play")} Run`;
            if (runPending) scheduleRun(false, 80);
        }
        // The first completed pass is the last thing the splash was waiting for.
        hideBoot();
    }
}

function onGraphEdited(immediate = false) {
    if (!state) return;
    saveLocalSoon();
    if (state.autoRun) scheduleRun(immediate, immediate ? 80 : 520);
}
function updateAutoSwitch() {
    autoSwitch.classList.toggle("on", Boolean(state.autoRun));
    autoSwitch.setAttribute("aria-checked", String(Boolean(state.autoRun)));
}

/* ================================================================ palette */
function buildPalette() {
    const graphItems = [
        ["input", "Text input", "text"],
        ["file", "File input", "file"],
        ["join", "Join", "join"]
    ];
    let html = `<div class="palette-section">
        <div class="palette-section-title">Graph</div>
        ${graphItems.map(([type, label, iconName]) => `<button class="graph-item" data-graph-node="${type}"><span class="graph-icon">${iconFill(iconName)}</span>${esc(label)}<small>+</small></button>`).join("")}
    </div>`;
    html += `<div class="palette-section"><div class="palette-section-title">Operations</div>`;
    for (const cat of CATEGORIES) {
        const color = cat.color;
        html += `<div class="cat" data-cat="${esc(cat.name)}" style="--cat-accent:${color}">
            <button class="cat-head" data-cat-toggle="${esc(cat.name)}">
                <span class="cat-dot"></span>
                <span class="cat-name">${esc(cat.name)}</span>
                <span class="cat-count">${cat.ops.length}</span>
                ${iconFill("chevron").replace("<svg", '<svg class="cat-chevron"')}
            </button>
            <div class="cat-items">
                ${cat.ops.map(op => `<button class="op-item" data-op="${esc(op)}" title="${esc(OPS[op]?.description || op)}"><span class="op-name">${esc(op)}</span></button>`).join("")}
            </div>
        </div>`;
    }
    html += `</div>`;
    paletteBody.innerHTML = html;
    for (const name of paletteOpen) {
        const cat = paletteBody.querySelector(`.cat[data-cat="${CSS.escape(name)}"]`);
        if (cat) cat.classList.add("open");
    }
    bindPaletteEvents();
}
function bindPaletteEvents() {
    // delegated on the container; attached once in init instead of every render
}
function setupPaletteDelegation() {
    paletteBody.addEventListener("click", ev => {
        // A drag that ended on the canvas must not also count as a click-to-add.
        if (paletteDrag?.moved || performance.now() < suppressPaletteClickUntil) { ev.preventDefault(); ev.stopPropagation(); return; }
        const toggle = ev.target.closest("[data-cat-toggle]");
        if (toggle) {
            const cat = toggle.closest(".cat");
            cat.classList.toggle("open");
            const name = cat.dataset.cat;
            if (cat.classList.contains("open")) paletteOpen.add(name); else paletteOpen.delete(name);
            return;
        }
        const opItem = ev.target.closest("[data-op]");
        if (opItem) {
            addOperationNode(opItem.dataset.op);
            return;
        }
        const graphItem = ev.target.closest("[data-graph-node]");
        if (graphItem) addGraphNode(graphItem.dataset.graphNode);
    });
    // Pointer-driven drag: works the same in every browser, unlike HTML5 drag events.
    paletteBody.addEventListener("pointerdown", ev => {
        if (ev.button !== 0) return;
        const item = ev.target.closest("[data-op], [data-graph-node]");
        if (!item || item.classList.contains("disabled")) return;
        const payload = item.dataset.op
            ? {type: "op", op: item.dataset.op}
            : {type: "graph", node: item.dataset.graphNode};
        if (payload.type === "op" && OPS[payload.op]?.flowControl) return;
        startPaletteDrag(ev, payload);
    });
}

let paletteDrag = null;
let suppressPaletteClickUntil = 0;
function startPaletteDrag(ev, payload) {
    const start = {x: ev.clientX, y: ev.clientY};
    paletteDrag = {payload, moved: false, ghost: null};
    const onMove = moveEv => {
        if (!paletteDrag) return;
        const dx = moveEv.clientX - start.x;
        const dy = moveEv.clientY - start.y;
        if (!paletteDrag.moved && Math.hypot(dx, dy) < 5) return;
        if (!paletteDrag.moved) {
            paletteDrag.moved = true;
            paletteDrag.ghost = makeDragGhost(payload);
            document.body.classList.add("palette-dragging");
        }
        moveEv.preventDefault();
        paletteDrag.ghost.style.transform = `translate(${moveEv.clientX + 12}px, ${moveEv.clientY + 12}px)`;
        const overStage = hitStage(moveEv.clientX, moveEv.clientY);
        stage.classList.toggle("drop-target", overStage);
    };
    const onUp = upEv => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        const drag = paletteDrag;
        paletteDrag = null;
        stage.classList.remove("drop-target");
        document.body.classList.remove("palette-dragging");
        drag?.ghost?.remove();
        if (!drag || !drag.moved) return;
        suppressPaletteClickUntil = performance.now() + 300;
        const overStage = hitStage(upEv.clientX, upEv.clientY);
        if (!overStage) return;
        const p = screenToWorld(upEv.clientX, upEv.clientY);
        if (drag.payload.type === "op") addOperationNode(drag.payload.op, p.x - 150, p.y - 30);
        else addGraphNode(drag.payload.node, p.x - 140, p.y - 30);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
}
function makeDragGhost(payload) {
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    if (payload.type === "op") {
        ghost.dataset.accent = opAccent(payload.op);
        ghost.style.setProperty("--node-accent", opAccent(payload.op));
        ghost.textContent = payload.op;
    } else {
        ghost.textContent = {input: "Text input", file: "File input", join: "Join"}[payload.node] || payload.node;
    }
    ghost.style.transform = `translate(-500px, -500px)`;
    document.body.appendChild(ghost);
    return ghost;
}
function hitStage(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
}
function renderSearch() {
    const q = searchTerm.trim().toLowerCase();
    $("#searchClear").classList.toggle("show", Boolean(q));
    if (!q) {
        buildPalette();
        return;
    }
    const matches = OP_NAMES.filter(op => {
        if (FLOW_OPS.has(op)) return false;
        const m = OPS[op];
        return op.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || (m.description || "").toLowerCase().includes(q);
    });
    let html = `<div class="search-results"><div class="search-meta">${matches.length} match${matches.length === 1 ? "" : "es"}</div>`;
    if (!matches.length) {
        html += `<div class="search-empty">Nothing matched “${esc(searchTerm)}”.<br>Try a category like “hashing”.</div>`;
    } else {
        for (const op of matches.slice(0, 180)) {
            html += `<div class="search-item" data-op="${esc(op)}"><span class="si-name">${esc(op)}</span><span class="si-cat">${esc(OPS[op].category)}</span></div>`;
        }
        if (matches.length > 180) html += `<div class="search-meta">Showing first 180 matches — refine your search.</div>`;
    }
    html += `</div>`;
    paletteBody.innerHTML = html;
}

function addOperationNode(op, x, y) {
    if (!op || !OPS[op]) return;
    const p = (x === undefined) ? spawnPoint() : {x, y};
    const node = makeNode("op", {op, x: p.x, y: p.y});
    state.nodes.push(node);
    selected = {type: "node", id: node.id};
    renderAllNodes();
    onGraphEdited();
    requestAnimationFrame(() => ensureNodeVisible(node));
    if (window.innerWidth <= 900) closeSidebar();
}
function addGraphNode(type, x, y) {
    const p = (x === undefined) ? spawnPoint() : {x, y};
    if (type === "input") {
        const node = makeNode("input", {x: p.x, y: p.y, title: "Text input", text: "Hello, World!"});
        state.nodes.push(node);
        selected = {type: "node", id: node.id};
    } else if (type === "file") {
        const node = makeNode("file", {x: p.x, y: p.y, title: "File input"});
        state.nodes.push(node);
        selected = {type: "node", id: node.id};
    } else if (type === "join") {
        const node = makeNode("join", {x: p.x, y: p.y, title: "Join"});
        state.nodes.push(node);
        selected = {type: "node", id: node.id};
    }
    renderAllNodes();
    onGraphEdited();
    if (window.innerWidth <= 900) closeSidebar();
}
let spawnIndex = 0;
function spawnPoint() {
    const c = stageCenterWorld();
    const offset = (spawnIndex++ % 6) * 30;
    return {x: Math.round(c.x - 155 + offset), y: Math.round(c.y - 100 + offset)};
}

/* ================================================================ toolbar / actions */
function initToolbar() {
    $("#toolbar").innerHTML = `
        <button class="tb-btn" data-action="new" title="New graph">New</button>
        <button class="tb-btn" data-action="open" title="Open a saved graph">Open</button>
        <button class="tb-btn" data-action="save" title="Download graph JSON">Save</button>
        <button class="tb-btn" data-action="example" title="Load the AES roundtrip example">Example</button>
        <span class="tb-sep"></span>
        <button class="tb-switch" data-action="auto" title="Toggle automatic runs"><span class="switch" id="autoSwitch"></span><span class="switch-label">Auto-run</span></button>
        <button class="btn-run" id="runBtn" data-action="run">${iconFill("play")} Run</button>
        <button class="tb-btn tb-mobile" data-action="sidebar" title="Show node list">${iconFill("nodes")}<span class="tb-label">Nodes</span></button>
    `;
    autoSwitch = $("#autoSwitch");
    runButton = $("#runBtn");
    autoSwitch?.classList.toggle("on", Boolean(state?.autoRun));
    $("#toolbar").addEventListener("click", ev => {
        const btn = ev.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === "new") newGraph();
        if (action === "open") $("#openFileInput").click();
        if (action === "save") saveGraphFile();
        if (action === "example") loadExample();
        if (action === "auto") toggleAutoRun();
        if (action === "run") { clearTimeout(runTimer); runGraph(true); }
        if (action === "sidebar") toggleSidebar();
    });
}

function newGraph() {
    if (state.nodes.length && !confirm("Start a new graph? This replaces the currently saved graph.")) return;
    applyGraph(blankState(), {fit: true});
    setRunStatus("", "Ready");
    toast("New graph");
}
function loadExample() {
    if (state.nodes.length && !confirm("Load the example? This replaces the currently saved graph.")) return;
    applyGraph(exampleState(), {fit: true});
    setRunStatus("", "Ready");
    toast("Loaded the AES multi-input example");
}
function toggleAutoRun() {
    state.autoRun = !state.autoRun;
    updateAutoSwitch();
    saveLocalSoon();
    if (state.autoRun) scheduleRun(false, 160);
    toast(state.autoRun ? "Auto-run on" : "Auto-run off");
}
function saveGraphFile() {
    const data = JSON.stringify(serializeGraph(), null, 2);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    downloadBlob(new Blob([data], {type: "application/json"}), `cipherflow-${stamp}.json`);
    toast("Graph JSON downloaded");
}
async function openGraphFile(file, opts = {}) {
    try {
        const data = JSON.parse(await file.text());
        const normalized = normalizeLoaded(data);
        applyGraph({...normalized, autoRun: normalized.autoRun}, {fit: !normalized.view && !opts.at});
        setRunStatus("", "Ready");
        toast("Graph loaded");
    } catch (err) {
        if (opts.fallbackToFileNode) {
            // Not one of our graphs after all: keep the drop useful and use it as data.
            const at = opts.at || stageCenterWorld();
            const node = makeNode("file", {x: at.x - 140, y: at.y - 50});
            state.nodes.push(node);
            renderAllNodes();
            readFileToNode(node, file);
            return;
        }
        toast("Could not open that graph: " + err.message, "error");
    }
}

/* ================================================================ theme */
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    const btn = $("#themeBtn");
    if (btn) {
        btn.innerHTML = iconFill(theme === "dark" ? "sun" : "moon");
        btn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    }
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#0b0d10" : "#ecece8";
}
function initTheme() {
    let saved = localStorage.getItem(THEME_KEY);
    if (!saved) saved = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(saved);
}

/* ================================================================ verification lab */
const lab = {
    opened: false,
    running: false,
    stopRequested: false,
    tab: "ops",
    filter: "all",
    query: "",
    items: [
        ...TESTPLAN.tests.map((t, i) => ({
            ...t,
            index: i,
            status: "pending",
            actual: null,
            error: "",
            duration: 0,
            opened: false,
            thumbUrl: ""
        })),
        ...(TESTPLAN.roundtrips || []).map((rt, i) => ({
            ...rt,
            kind: "roundtrip",
            index: TESTPLAN.tests.length + i,
            name: `${rt.encoder} → ${rt.decoder} roundtrip`,
            input: rt.sample,
            status: "pending",
            actual: null,
            error: "",
            duration: 0,
            opened: false,
            thumbUrl: ""
        })),
        ...(TESTPLAN.textRoundtrips || []).map((tr, i) => ({
            ...tr,
            kind: "textroundtrip",
            index: TESTPLAN.tests.length + (TESTPLAN.roundtrips || []).length + i,
            name: tr.label,
            input: tr.sample,
            status: "pending",
            actual: null,
            error: "",
            duration: 0,
            opened: false,
            thumbUrl: ""
        }))
    ],
    rowEls: new Map(),
    integration: [],
    integrationRunning: false
};

function initLab() {
    $("#lab").addEventListener("click", ev => {
        if (ev.target.id === "lab") closeLab();
    });
    $("#labClose").addEventListener("click", closeLab);
    $("#labOpenBtn").addEventListener("click", openLab);
    $$(".lab-tab").forEach(tab => tab.addEventListener("click", () => switchLabTab(tab.dataset.labtab)));
    $("#labRun").addEventListener("click", () => runAllTests());
    $("#labStop").addEventListener("click", () => {
        lab.stopRequested = true;
        $("#labRun").disabled = true;
        $("#labStop").disabled = true;
        setLabProgressText("Stopping after the current operation…");
    });
    $("#labCopy").addEventListener("click", copyLabReport);
    $("#labSearch").addEventListener("input", debounce(() => {
        lab.query = $("#labSearch").value;
        renderLabVisible();
    }, 80));
    $("#labFilter").addEventListener("change", () => {
        lab.filter = $("#labFilter").value;
        renderLabVisible();
    });
    $("#labList").addEventListener("click", onLabListClick);
    buildIntegrationCards();
    updateLabSummary();
}

function openLab() {
    lab.opened = true;
    $("#lab").hidden = false;
    if (!lab.rowEls.size) buildLabRows();
    renderLabVisible();
    updateLabSummary();
    setTimeout(() => $("#labSearch").focus(), 60);
}
function closeLab() {
    if (lab.running) {
        lab.stopRequested = true;
    }
    $("#lab").hidden = true;
    lab.opened = false;
}
function switchLabTab(tab) {
    lab.tab = tab;
    $$(".lab-tab").forEach(t => t.classList.toggle("on", t.dataset.labtab === tab));
    const ops = lab.tab === "ops";
    $(".lab-tools").style.display = ops ? "" : "none";
    $("#labSummary").style.display = ops ? "" : "none";
    $("#labList").style.display = ops ? "" : "none";
    $("#integrationWrap").hidden = ops;
    if (!ops) renderIntegration();
}
function statusIcon(status) {
    if (status === "pass") return "✓";
    if (status === "fail") return "!";
    if (status === "probe") return "•";
    if (status === "skip") return "–";
    if (status === "blocked") return "×";
    if (status === "running") return "";
    return "";
}
function buildLabRows() {
    lab.rowEls.clear();
    const frag = document.createDocumentFragment();
    for (const item of lab.items) {
        const row = document.createElement("div");
        row.className = "test-row";
        row.dataset.index = String(item.index);
        const meta = OPS[item.op] || {};
        const kindLabel = item.kind === "official" ? "KAT" : item.kind === "roundtrip" ? "roundtrip" : item.kind === "textroundtrip" ? "pipeline" : "probe";
        const kindClass = item.kind === "official" ? "kat" : "probe";
        const subtitle = item.kind === "official"
            ? `${esc(meta.category || "")} · ${esc(item.name || "")}${item.blockedReason ? " · blocked upstream" : item.drift ? " · known upstream drift" : ""}`
            : item.kind === "roundtrip" ? "Encodes, then decodes, and compares the original bytes"
            : item.kind === "textroundtrip" ? "Runs the pipeline and compares the result to the input text"
            : `${esc(meta.category || "")} · live probe${item.expected !== undefined || item.expectedContains ? " · known expected output" : ""}`;
        row.innerHTML = `
            <div class="test-main" data-test-main>
                <span class="test-status" data-status></span>
                <span class="test-name" data-name>${esc(item.kind === "roundtrip" || item.kind === "textroundtrip" ? item.name : item.op)}<small>${subtitle}</small></span>
                <span class="test-kind ${kindClass}">${kindLabel}</span>
                <span class="test-actual-preview" data-preview></span>
                <span class="test-time" data-time></span>
                <span class="test-chevron">${iconFill("chevron")}</span>
            </div>
            <div class="test-detail" data-detail></div>
        `;
        $(".test-chevron", row).style.cssText = "transition:transform 130ms ease";
        frag.appendChild(row);
        lab.rowEls.set(item.index, row);
        row.addEventListener("click", ev => {
            if (ev.target.closest("[data-action]")) return;
            toggleTestRow(item);
        });
    }
    $("#labList").appendChild(frag);
    for (const item of lab.items) updateTestRow(item);
}

function updateTestRow(item) {
    const row = lab.rowEls.get(item.index);
    if (!row) return;
    const statusEl = $("[data-status]", row);
    statusEl.className = "test-status " + (item.status === "pending" ? "" : item.status);
    statusEl.textContent = item.status === "running" ? "" : statusIcon(item.status);
    $("[data-time]", row).textContent = item.duration ? Math.round(item.duration) + "ms" : "";
    const preview = $("[data-preview]", row);
    if (item.actual) preview.textContent = testPreview(item.actual, 55);
    else if (item.error) preview.textContent = item.error.slice(0, 55);
    else preview.textContent = item.skip ? "not run" : "";
    row.classList.toggle("running", item.status === "running");
    row.classList.toggle("open", item.opened);
    if (item.opened) renderTestDetail(item);
}

function testPreview(value, limit = 400) {
    if (value == null) return "";
    if (typeof value !== "string") value = String(value);
    if (!value.length) return "(empty)";
    if (detectBinaryString(value)) {
        const bytes = latin1ToBytes(value.slice(0, Math.ceil(limit / 3)));
        return `[binary ${formatBytes(value.length)}] hex: ${bytesToHex(bytes, " ")}${value.length > limit / 3 ? " …" : ""}`;
    }
    const t = value.replace(/\r/g, "").replace(/\u0000/g, "·");
    return t.length > limit ? t.slice(0, limit) + " …" : t;
}
function detectBinaryString(s) {
    if (!s.length) return false;
    let bad = 0;
    const n = Math.min(s.length, 500);
    for (let i = 0; i < n; i++) {
        const c = s.charCodeAt(i);
        if (c === 0 || c < 7 || (c > 13 && c < 32) || (c > 126 && c < 160)) bad++;
    }
    return bad / n > 0.16;
}
function toggleTestRow(item) {
    item.opened = !item.opened;
    updateTestRow(item);
}
function renderTestDetail(item) {
    const row = lab.rowEls.get(item.index);
    if (!row) return;
    const detail = $("[data-detail]", row);
    const meta = OPS[item.op] || {};
    if (item.kind === "textroundtrip") {
        detail.innerHTML = `
            <div class="test-grid">
                <div class="test-block"><div class="test-block-label">Pipeline</div><pre class="muted">${esc(item.steps.map(s => s.op).join(" → "))}</pre></div>
                <div class="test-block"><div class="test-block-label">${item.expected ? "Expected output" : "Sample input"}</div><pre class="muted">${esc(item.expected ?? item.sample)}</pre></div>
                <div class="test-block"><div class="test-block-label">Check</div><pre>${item.expected ? "Ends up at the expected output, character for character." : "Ends up back at the sample text, character for character."}</pre></div>
                <div class="test-block"><div class="test-block-label">Result</div><pre class="${item.status === "fail" ? "test-error" : "muted"}">${esc(item.error || item.actual || "Not run.")}</pre></div>
            </div>
            <div class="test-actions"><button class="mini-btn" data-action="run-one" data-index="${item.index}">${iconFill("play")} Run pipeline</button></div>
        `;
        return;
    }
    if (item.kind === "roundtrip") {
        detail.innerHTML = `
            <div class="test-grid">
                <div class="test-block"><div class="test-block-label">Pipeline</div><pre class="muted">${esc(item.encoder)} → ${esc(item.decoder)}</pre></div>
                <div class="test-block"><div class="test-block-label">Sample input</div><pre class="muted">${esc(item.sample)}</pre></div>
                <div class="test-block"><div class="test-block-label">Check</div><pre>${item.extract === "html-text" ? "The decoded file listing must contain the sample text exactly." : "Decoded bytes must equal the sample exactly."}</pre></div>
                <div class="test-block"><div class="test-block-label">Roundtrip result</div><pre class="${item.status === "fail" ? "test-error" : "muted"}">${esc(item.error || item.actual || "Not run.")}</pre></div>
            </div>
            <div class="test-actions"><button class="mini-btn" data-action="run-one" data-index="${item.index}">${iconFill("play")} Run roundtrip</button></div>
        `;
        return;
    }
    const inputText = item.inputBase64 ? `[binary input · ${formatBytes(b64ToBytes(item.inputBase64).length)}]` : testPreview(item.input ?? "", 1200);
    let recipeText = "";
    try { recipeText = JSON.stringify(item.recipe || [], null, 2); } catch { recipeText = String(item.recipe); }
    if (recipeText.length > 1600) recipeText = recipeText.slice(0, 1600) + "\n…";
    const expected = item.kind === "official"
        ? (item.expectedError || item.expectedMatch || item.unexpectedMatch
            ? `Expected ${item.expectedMatch ? "output matching " + item.expectedMatch.source : item.unexpectedMatch ? "output NOT matching " + item.unexpectedMatch.source : "error"}:\n` + (item.expected ?? "")
            : testPreview(item.expected ?? "", 1600))
        : (item.skip ? "Skipped: " + item.skip
            : item.expected !== undefined ? testPreview(item.expected, 1600)
            : item.expectedContains ? "Output must contain: " + item.expectedContains
            : "No fixed expected output. This is a live probe through the embedded engine.");
    const actual = item.actual != null && item.actual !== ""
        ? testPreview(item.actual, 1800)
        : item.error ? "Error:\n" + item.error : (item.skip ? "Not run (see reason)." : "Not run.");
    detail.innerHTML = `
        <div class="test-grid">
            <div class="test-block"><div class="test-block-label">Input</div><pre class="muted">${esc(inputText || "(empty)")}</pre></div>
            <div class="test-block"><div class="test-block-label">Recipe</div><pre class="muted">${esc(recipeText)}</pre></div>
            <div class="test-block"><div class="test-block-label">${item.kind === "official" ? "Expected" : "Check"}</div><pre class="${item.kind === "official" ? "" : "muted"}">${esc(expected)}</pre></div>
            <div class="test-block"><div class="test-block-label">Actual output</div><pre class="${item.error ? "test-error" : "muted"}">${esc(actual)}</pre></div>
        </div>
        ${item.blockedReason ? `<div class="test-note">Blocked by CyberChef's browser build: ${esc(item.blockedReason)}</div>` : ""}
        ${item.drift ? `<div class="test-note">Known upstream drift: ${esc(item.drift.note)} This check asserts the stable prefix: “${esc(item.drift.expectedPrefix)}”.</div>` : ""}
        <div class="test-actions">
            <button class="mini-btn" data-action="run-one" data-index="${item.index}">${iconFill("play")} Run this check</button>
            ${item.actual ? `<button class="mini-btn" data-action="copy-test-output" data-index="${item.index}">${iconFill("copy")} Copy output</button>` : ""}
            ${!meta.flowControl ? `<button class="mini-btn" data-action="add-from-test" data-index="${item.index}">${iconFill("plus")} Add this operation</button>` : ""}
        </div>
        <img class="test-thumb" data-thumb alt="Operation output preview" hidden>
    `;
    const thumb = $("[data-thumb]", detail);
    if (thumb && item.actual) {
        const img = imageUrlForOutput(item.actual);
        if (img) { thumb.src = img; thumb.hidden = false; }
    }
}
function imageUrlForOutput(value) {
    if (typeof value !== "string" || value.length < 12) return "";
    const head = Array.from(value.slice(0, 4)).map(c => c.charCodeAt(0));
    let mime = "";
    if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) mime = "image/png";
    else if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) mime = "image/jpeg";
    else if (value.slice(0, 4) === "GIF8") mime = "image/gif";
    if (!mime) return "";
    try {
        const bytes = latin1ToBytes(value);
        return URL.createObjectURL(new Blob([bytes], {type: mime}));
    } catch { return ""; }
}
function matchesLabFilter(item) {
    if (lab.query) {
        const q = lab.query.toLowerCase();
        const hay = `${item.op || ""} ${OPS[item.op]?.category || ""} ${item.name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
    }
    const f = lab.filter;
    if (f === "official" && item.kind !== "official") return false;
    if (f === "probes" && item.kind !== "probe") return false;
    if (f === "run" && !["pass", "fail", "probe", "blocked"].includes(item.status)) return false;
    if (f === "fail" && item.status !== "fail") return false;
    if (f === "blocked" && item.status !== "blocked") return false;
    if (f === "skip" && item.status !== "skip" && !item.skip) return false;
    if (f === "dcode" && item.kind !== "dcode") return false;
    return true;
}
function renderLabVisible() {
    let visible = 0;
    for (const item of lab.items) {
        const row = lab.rowEls.get(item.index);
        if (!row) continue;
        const show = matchesLabFilter(item);
        row.style.display = show ? "" : "none";
        if (show) visible++;
    }
}
function updateLabSummary() {
    const counts = {pass: 0, fail: 0, probe: 0, skip: 0, pending: 0, running: 0, blocked: 0};
    for (const item of lab.items) {
        if (item.skip && item.status === "pending") counts.skip++;
        else if (item.status === "pending") counts.pending++;
        else counts[item.status] = (counts[item.status] || 0) + 1;
    }
    const summary = $("#labSummary");
    summary.innerHTML = `
        <span class="summary-item"><span class="stat-dot pass"></span><b>${counts.pass || 0}</b> passed</span>
        <span class="summary-item"><span class="stat-dot probe"></span><b>${counts.probe || 0}</b> probes</span>
        <span class="summary-item"><span class="stat-dot fail"></span><b>${counts.fail || 0}</b> failed</span>
        ${counts.blocked ? `<span class="summary-item"><span class="stat-dot blocked"></span><b>${counts.blocked}</b> blocked upstream</span>` : ""}
        <span class="summary-item"><span class="stat-dot skip"></span><b>${counts.skip || 0}</b> skipped</span>
        <span class="summary-item" style="margin-left:auto">${counts.pending + counts.running} remaining</span>
    `;
    const done = counts.pass + counts.probe + counts.fail + counts.skip + counts.blocked;
    const pct = Math.round(done / Math.max(1, lab.items.length) * 100);
    $("#labProgressBar").style.width = pct + "%";
    $("#labProgressLabel").textContent = `${done} / ${lab.items.length}`;
}
function setLabProgressText(text) {
    $("#labProgressLabel").textContent = text;
}
function resetLabItem(item) {
    if (item.thumbUrl) { try { URL.revokeObjectURL(item.thumbUrl); } catch {} item.thumbUrl = ""; }
    item.actual = null;
    item.error = "";
    item.duration = 0;
    item.status = "pending";
    item.opened = false;
}
async function runAllTests() {
    if (lab.running) return;
    lab.running = true;
    lab.stopRequested = false;
    $("#labRun").disabled = true;
    $("#labStop").disabled = false;
    $("#labRun").textContent = "Running…";
    for (const item of lab.items) {
        resetLabItem(item);
        if (item.skip) item.status = "skip";
        updateTestRow(item);
    }
    updateLabSummary();
    let index = 0;
    for (const item of lab.items) {
        if (lab.stopRequested) break;
        index++;
        if (item.skip) continue;
        setLabProgressText(`Running ${index} / ${lab.items.length}`);
        await runTestItem(item, true);
        if (lab.opened) updateLabSummary();
    }
    lab.running = false;
    $("#labRun").disabled = false;
    $("#labStop").disabled = true;
    $("#labRun").textContent = "Run all again";
    setLabProgressText(lab.stopRequested ? "Stopped" : "Complete");
    updateLabSummary();
    const fails = lab.items.filter(i => i.status === "fail").length;
    toast(lab.stopRequested ? "Verification stopped" : fails ? `Verification finished with ${fails} failure${fails === 1 ? "" : "s"}` : "All executed checks passed", fails ? "error" : "");
}
async function runTestItem(item, auto = false) {
    if (item.skip && !auto) {
        // A skipped item can still be deliberately run by the user.
    }
    item.status = "running";
    item.error = "";
    item.duration = 0;
    if (auto === false) item.opened = true;
    updateTestRow(item);
    const t0 = performance.now();
    try {
        if (item.kind === "textroundtrip") {
            // One recipe, so the engine performs its own dish conversions between steps,
            // exactly as it does in the graph.
            const res = await engine.bakeRecipe(item.steps, enc.encode(item.sample).buffer, {
                returnType: "string", timeout: auto ? 15000 : 30000
            });
            if (res?.error) throw new Error(`${res.error.displayStr || res.error}`);
            const finalText = res?.result == null ? "" : String(res.result);
            const ok = finalText === (item.expected ?? item.sample);
            item.duration = performance.now() - t0;
            item.actual = ok ? item.sample : finalText;
            item.status = ok ? "pass" : "fail";
            if (!ok) item.error = `Expected the sample back, got: ${finalText.slice(0, 140) || "(empty)"}`;
            updateTestRow(item);
            if (item.opened) renderTestDetail(item);
            if (lab.opened) updateLabSummary();
            return;
        }
        if (item.kind === "roundtrip") {
            const src = enc.encode(item.sample);
            const encoded = await engine.bakeRecipe([{op: item.encoder, args: item.encoderArgs}], src.buffer, {
                returnType: "ArrayBuffer", timeout: auto ? 15000 : 30000
            });
            if (encoded?.error) throw new Error(`${item.encoder}: ${encoded.error.displayStr || encoded.error}`);
            const encodedBytes = normalizeEngineResult(encoded?.result, encoded?.type);
            const decoded = await engine.bakeRecipe([{op: item.decoder, args: item.decoderArgs}], encodedBytes.buffer, {
                returnType: "ArrayBuffer", timeout: auto ? 15000 : 30000
            });
            if (decoded?.error) throw new Error(`${item.decoder}: ${decoded.error.displayStr || decoded.error}`);
            const decodedBytes = normalizeEngineResult(decoded?.result, decoded?.type);
            let ok;
            if (item.extract === "html-text") {
                // The decoder returns CyberChef's HTML file listing; compare the extracted member.
                const html = utf8(decodedBytes);
                const pre = html.match(/<pre>([\s\S]*?)<\/pre>/);
                const extracted = pre ? unescapeHtml(pre[1]) : "";
                ok = extracted === item.sample;
                item.actual = extracted || (pre ? "(empty file)" : html.slice(0, 300));
            } else {
                ok = decodedBytes.length === src.length && decodedBytes.every((b, i) => b === src[i]);
                item.actual = ok ? item.sample : (looksBinary(decodedBytes) ? bytesToHex(decodedBytes, " ") : utf8(decodedBytes));
            }
            item.duration = performance.now() - t0;
            item.status = ok ? "pass" : "fail";
            if (!ok) item.error = item.extract === "html-text"
                ? `The decoded archive did not hand back the original bytes: ${formatBytes(decodedBytes.length)} of file listing, sample not found intact.`
                : `Roundtrip mismatch: ${encodedBytes.length} compressed bytes decoded to ${decodedBytes.length} (expected ${src.length}).`;
            updateTestRow(item);
            if (item.opened) renderTestDetail(item);
            if (lab.opened) updateLabSummary();
            return;
        }
        const recipe = item.recipe || [{op: item.op, args: OPS[item.op]?.defaults || []}];
        const input = item.inputBase64 ? base64ToArrayBuffer(item.inputBase64) : (item.input ?? "");
        const response = await engine.bakeRecipe(recipe, input, {
            returnType: "string",
            timeout: auto ? 9000 : 20000
        });
        item.duration = performance.now() - t0;
        const asRegex = spec => spec ? new RegExp(spec.source, spec.flags) : null;
        if (response?.error) {
            const msg = response.error.displayStr || String(response.error);
            if (item.drift && msg.startsWith(item.drift.expectedPrefix)) {
                item.status = "pass";
                item.actual = msg;
            } else if (item.kind === "official" && item.expectedError && msg === item.expected) {
                item.status = "pass";
                item.actual = msg;
            } else if (item.kind === "official" && asRegex(item.expectedMatch)?.test(msg)) {
                item.status = "pass";
                item.actual = msg;
            } else {
                item.status = "fail";
                item.error = msg;
            }
        } else {
            const value = response?.result == null ? "" : String(response.result);
            item.actual = value;
            if (item.kind === "official") {
                const expectedMatch = asRegex(item.expectedMatch);
                const unexpectedMatch = asRegex(item.unexpectedMatch);
                if (item.expectedError) {
                    item.status = "fail";
                    item.error = "Expected an error, but the operation returned a result.";
                } else if (expectedMatch) {
                    if (expectedMatch.test(value)) item.status = "pass";
                    else { item.status = "fail"; item.error = "Output did not match the expected pattern " + expectedMatch + " (or the output is binary, which this check reports as text)."; }
                } else if (unexpectedMatch) {
                    if (!unexpectedMatch.test(value)) item.status = "pass";
                    else { item.status = "fail"; item.error = "Output unexpectedly matched " + unexpectedMatch + "."; }
                } else if (item.drift && value.startsWith(item.drift.expectedPrefix)) {
                    item.status = "pass";
                    item.error = "";
                } else if (value === item.expected) {
                    item.status = "pass";
                } else {
                    item.status = "fail";
                    item.error = "Output did not match the expected CyberChef test vector.";
                }
            } else if (item.expected !== undefined) {
                item.status = value === item.expected ? "pass" : "fail";
                if (item.status === "fail") item.error = `Expected the operation to return “${item.expected}”.`;
            } else if (item.expectedContains) {
                item.status = value.includes(item.expectedContains) ? "pass" : "fail";
                if (item.status === "fail") item.error = `Expected the output to contain “${item.expectedContains}”.`;
            } else {
                item.status = "probe";
            }
        }
    } catch (err) {
        item.duration = performance.now() - t0;
        item.status = "fail";
        item.error = err.message || String(err);
    }
    if (item.status === "fail" && item.blockedReason) item.status = "blocked";
    updateTestRow(item);
    if (item.opened) renderTestDetail(item);
    if (lab.opened) updateLabSummary();
}
async function onLabListClick(ev) {
    const actionEl = ev.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === "run-one") {
        ev.stopPropagation();
        const item = lab.items[Number(actionEl.dataset.index)];
        if (!item || lab.running) return;
        lab.running = true;
        $("#labRun").disabled = true;
        $("#labStop").disabled = false;
        await runTestItem(item, false);
        lab.running = false;
        $("#labRun").disabled = false;
        $("#labStop").disabled = true;
        updateLabSummary();
    } else if (action === "copy-test-output") {
        ev.stopPropagation();
        const item = lab.items[Number(actionEl.dataset.index)];
        if (item?.actual != null) {
            const ok = await copyText(item.actual);
            toast(ok ? "Output copied" : "Could not copy output", ok ? "" : "error");
        }
    } else if (action === "add-from-test") {
        ev.stopPropagation();
        const item = lab.items[Number(actionEl.dataset.index)];
        if (item && OPS[item.op] && !OPS[item.op].flowControl) {
            addOperationNode(item.op);
            closeLab();
        }
    }
}
async function copyLabReport() {
    const counts = {};
    for (const item of lab.items) counts[item.status] = (counts[item.status] || 0) + 1;
    const report = {
        app: "CipherFlow",
        engine: ENGINE_LABEL,
        generatedAt: new Date().toISOString(),
        operations: lab.items.length,
        knownAnswerTests: TESTPLAN.official,
        counts,
        failures: lab.items.filter(i => i.status === "fail").map(i => ({op: i.op || i.name, error: i.error})),
        blockedUpstream: lab.items.filter(i => i.status === "blocked").map(i => ({op: i.op, reason: i.blockedReason})),
        knownDrift: lab.items.filter(i => i.drift).map(i => ({op: i.op, expects: i.drift.expectedPrefix, note: i.drift.note})),
        skipped: lab.items.filter(i => i.status === "skip").map(i => ({op: i.op, reason: i.skip}))
    };
    const ok = await copyText(JSON.stringify(report, null, 2));
    toast(ok ? "Verification report copied" : "Could not copy the report", ok ? "" : "error");
}

/* ---------------------------------------------------------- integration tests */
function graphTestNodes() {
    // Utility for building ephemeral node graphs used by the graph-wiring suite.
    return {
        input: (id, text, x, title = "Text") => makeNode("input", {id, x, y: 100, text, title}),
        // Sinks are text nodes now: they take a pipe on the left and repeat it on the right.
        output: (id, x, title = "Result") => makeNode("input", {id, x, y: 100, title, text: ""}),
        op: (id, op, x, overrides) => makeNode("op", {id, op, x, y: 100, values: nodeValuesWith(op, overrides || {})}),
        edge: (id, from, to, toPort) => ({id: "e" + id, from, to, toPort})
    };
}
function integrationDefinitions() {
    const B = graphTestNodes();
    return [
        {
            id: "base64",
            title: "Known encoding through two nodes",
            description: "Text input → To Base64 → Output. Verifies source, operation and sink wiring.",
            expected: "SGVsbG8sIFdvcmxkIQ==",
            build() {
                const nodes = [B.input(1, "Hello, World!", 100), B.op(2, "To Base64", 500), B.output(3, 900)];
                const edges = [B.edge(1, 1, 2, "main"), B.edge(2, 2, 3, "main")];
                return {nodes, edges, outputId: 3};
            }
        },
        {
            id: "aes",
            title: "Multi-input AES roundtrip",
            description: "Plaintext plus separate Key and IV nodes feed AES Encrypt, then AES Decrypt. Verifies argument ports and binary-safe edges.",
            expected: "attack at dawn",
            build() {
                const plain = B.input(1, "attack at dawn", 50, "Plain");
                const key = B.input(2, "0123456789abcdef0123456789abcdef", 50, "Key");
                key.encoding = "hex";
                const iv = B.input(3, "abcdef9876543210abcdef9876543210", 50, "IV");
                iv.encoding = "hex";
                const enc = B.op(4, "AES Encrypt", 430, {"Mode": "CBC", "Input": "Raw", "Output": "Hex", "Include IV in output": "Off"});
                const dec = B.op(5, "AES Decrypt", 810, {"IV Length": 16, "Mode": "CBC", "Input": "Hex", "Output": "Raw", "IV from input": "Off"});
                const out = B.output(6, 1160, "Roundtrip");
                const edges = [
                    B.edge(1, plain.id, enc.id, "main"),
                    B.edge(2, key.id, enc.id, "arg:" + opArgIndex("AES Encrypt", "Key")),
                    B.edge(3, iv.id, enc.id, "arg:" + opArgIndex("AES Encrypt", "IV")),
                    B.edge(4, enc.id, dec.id, "main"),
                    B.edge(5, key.id, dec.id, "arg:" + opArgIndex("AES Decrypt", "Key")),
                    B.edge(6, iv.id, dec.id, "arg:" + opArgIndex("AES Decrypt", "IV")),
                    B.edge(7, dec.id, out.id, "main")
                ];
                return {nodes: [plain, key, iv, enc, dec, out], edges, outputId: out.id};
            }
        },
        {
            id: "join",
            title: "Join with a separator",
            description: "Two independent inputs merge through the Join node. Verifies fan-in, separators and byte concatenation.",
            expected: "alpha | omega",
            build() {
                const a = B.input(1, "alpha", 50, "Left");
                const b = B.input(2, "omega", 50, "Right");
                const j = makeNode("join", {id: 3, x: 480, y: 100, title: "Join", separator: " | "});
                const out = B.output(4, 900, "Joined");
                const edges = [B.edge(1, a.id, j.id, "join:0"), B.edge(2, b.id, j.id, "join:1"), B.edge(3, j.id, out.id, "main")];
                return {nodes: [a, b, j, out], edges, outputId: out.id};
            }
        },
        {
            id: "cycle",
            title: "Cycle guard",
            description: "A loop between two operations must be detected before an operation is executed.",
            expected: "cycle",
            build() {
                const a = B.op(1, "To Base64", 100);
                const b = B.op(2, "To Hex", 500);
                const out = B.output(3, 900);
                const edges = [B.edge(1, a.id, b.id, "main"), B.edge(2, b.id, a.id, "main"), B.edge(3, b.id, out.id, "main")];
                return {nodes: [a, b, out], edges, outputId: 3};
            }
        }
    ];
}
function buildIntegrationCards() {
    lab.integration = integrationDefinitions().map(def => ({...def, status: "pending", detail: "", duration: 0}));
    renderIntegration();
}
function renderIntegration() {
    const wrap = $("#integrationWrap");
    wrap.innerHTML = `<div class="integration-intro">These checks exercise the node runner itself: typed input/output nodes, fan-out to argument ports, fan-in merging, and cycle protection. They run through the same embedded engine as the canvas.</div>`;
    for (const def of lab.integration) {
        const card = document.createElement("div");
        card.className = "integration-card" + (def.status === "pass" || def.status === "fail" ? " ran" : "");
        card.dataset.testId = def.id;
        card.innerHTML = `
            <div class="integration-head">
                <span class="test-status ${def.status}" data-int-status>${statusIcon(def.status)}</span>
                <span class="integration-title">${esc(def.title)}</span>
                <button class="btn-secondary" data-action="run-integration" data-id="${esc(def.id)}">${iconFill("play")} Run</button>
            </div>
            <div class="integration-desc">${esc(def.description)}</div>
            <div class="integration-result" data-int-result>${esc(def.detail || "")}</div>
        `;
        wrap.appendChild(card);
    }
    wrap.querySelectorAll("[data-action=run-integration]").forEach(btn => {
        btn.addEventListener("click", () => runIntegration(btn.dataset.id));
    });
}
async function runIntegration(id) {
    if (lab.integrationRunning) return;
    const def = lab.integration.find(x => x.id === id);
    const card = document.querySelector(`.integration-card[data-test-id="${id}"]`);
    if (!def || !card) return;
    lab.integrationRunning = true;
    def.status = "running";
    def.detail = "";
    const status = card.querySelector("[data-int-status]");
    status.className = "test-status running";
    status.textContent = "";
    const resultEl = card.querySelector("[data-int-result]");
    resultEl.textContent = "Running through the node engine…";
    card.classList.add("ran");
    const t0 = performance.now();
    try {
        const {nodes, edges, outputId} = def.build();
        const result = await executeGraph(nodes, edges, {force: true, timeout: 20000});
        def.duration = performance.now() - t0;
        if (def.id === "cycle") {
            const ok = result.cycle.length >= 2 && result.results.get(outputId)?.error;
            def.status = ok ? "pass" : "fail";
            def.detail = ok ? `Cycle detected in ${result.cycle.length} nodes before execution.` : "The cycle guard did not mark the loop.";
        } else {
            const out = result.results.get(outputId)?.bytes;
            const text = out ? utf8(out) : "";
            const expectedBytes = enc.encode(def.expected);
            const ok = out && out.length === expectedBytes.length && out.every((b, i) => b === expectedBytes[i]);
            def.status = ok ? "pass" : "fail";
            def.detail = ok
                ? `Pass — output: ${JSON.stringify(testPreview(text, 160))} · ${Math.round(def.duration)} ms`
                : `Expected ${JSON.stringify(def.expected)}, got ${JSON.stringify(testPreview(text || (out ? bytesToHex(out) : "(none)"), 160))}. ${result.errors[0]?.error || ""}`;
        }
    } catch (err) {
        def.status = "fail";
        def.detail = err.message || String(err);
    }
    const st = card.querySelector("[data-int-status]");
    st.className = "test-status " + def.status;
    st.textContent = statusIcon(def.status);
    resultEl.textContent = def.detail;
    resultEl.className = "integration-result " + (def.status === "fail" ? "test-error" : "");
    lab.integrationRunning = false;
}

/* ================================================================ sidebar / mobile */
function openSidebar() {
    sidebarOpen = true;
    sidebar.classList.add("open");
    sidebarBackdrop.classList.add("show");
}
function closeSidebar() {
    sidebarOpen = false;
    sidebar.classList.remove("open");
    sidebarBackdrop.classList.remove("show");
}
function toggleSidebar() {
    if (sidebarOpen) closeSidebar(); else openSidebar();
}

/* ================================================================ events */
function bindGlobalEvents() {
    stage.addEventListener("pointerdown", startPan);
    stage.addEventListener("wheel", ev => {
        if (ev.ctrlKey || ev.metaKey || Math.abs(ev.deltaY) > 0) {
            ev.preventDefault();
            zoomAt(ev.clientX, ev.clientY, Math.exp(-ev.deltaY * 0.0014));
        }
    }, {passive: false});
    // Scrolling inside a scrollable part of a node (the Magic ranking, a preview, a
    // text box) must scroll that element, not zoom the canvas underneath it.
    nodesLayer.addEventListener("wheel", ev => {
        if (ev.target.closest(".magic-list, .preview pre, .file-list, .control, .collapsed-ports")) {
            ev.stopPropagation();
        }
    }, {passive: true});

    stage.addEventListener("dragover", ev => {
        if (ev.dataTransfer?.types?.includes("Files")) {
            ev.preventDefault();
            stage.classList.add("file-drag");
        }
    });
    stage.addEventListener("dragleave", () => stage.classList.remove("file-drag"));
    stage.addEventListener("drop", ev => {
        const op = ev.dataTransfer?.getData("application/x-cipherflow-op");
        const type = ev.dataTransfer?.getData("application/x-cipherflow-type");
        const file = ev.dataTransfer?.files?.[0];
        if (op || type) {
            ev.preventDefault();
            const p = screenToWorld(ev.clientX, ev.clientY);
            if (op && !OPS[op]?.flowControl) addOperationNode(op, p.x - 150, p.y - 40);
            else if (type) addGraphNode(type, p.x - 140, p.y - 40);
            stage.classList.remove("file-drag");
        } else if (file) {
            ev.preventDefault();
            // A dropped graph file loads as a graph; anything else becomes a file node.
            const isGraphFile = /\.json$/i.test(file.name || "") || file.type === "application/json";
            const p = screenToWorld(ev.clientX, ev.clientY);
            if (isGraphFile) {
                openGraphFile(file, {at: p, fallbackToFileNode: true});
            } else {
                const node = makeNode("file", {x: p.x - 140, y: p.y - 50});
                state.nodes.push(node);
                renderAllNodes();
                readFileToNode(node, file);
            }
        }
        stage.classList.remove("file-drag");
    });

    $("#zoomOut").addEventListener("click", () => zoomAt(stage.getBoundingClientRect().left + stage.clientWidth / 2, stage.getBoundingClientRect().top + stage.clientHeight / 2, 1 / 1.18));
    $("#zoomIn").addEventListener("click", () => zoomAt(stage.getBoundingClientRect().left + stage.clientWidth / 2, stage.getBoundingClientRect().top + stage.clientHeight / 2, 1.18));
    $("#fitBtn").addEventListener("click", fitView);
    $("#themeBtn").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    $("#sidebarCloseBtn").addEventListener("click", closeSidebar);
    sidebarBackdrop.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", ev => {
        if (ev.key === "Escape") {
            if (helpOpen()) { closeHelp(); return; }
            if (! $("#lab").hidden) { closeLab(); return; }
            if (connection) {
                connection.temp?.remove();
                connection = null;
                document.body.classList.remove("connecting");
                highlightPorts(".port.in", false);
                highlightPorts(".port.out", false);
                document.removeEventListener("pointermove", onConnectionMove);
                return;
            }
            clearSelection();
        }
        const tag = document.activeElement?.tagName;
        const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;
        if (!typing && (ev.key === "Delete" || ev.key === "Backspace")) {
            if (selected?.type === "node") {
                ev.preventDefault();
                deleteNode(selected.id);
            } else if (selected?.type === "edge") {
                ev.preventDefault();
                removeEdge(selected.id);
            }
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
            ev.preventDefault();
            clearTimeout(runTimer);
            runGraph(true);
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
            ev.preventDefault();
            saveGraphFile();
        }
    });

    document.addEventListener("pointerdown", ev => {
        if (connection) return;
        if (ev.target.closest("#app") && !ev.target.closest(".node") && !ev.target.closest(".edge-hit") && !ev.target.closest(".edge-x")) {
            // stage background selection is handled by startPan
        }
    });

    nodesLayer.addEventListener("click", onNodeActionClick);
    nodesLayer.addEventListener("dblclick", ev => {
        // double-click a connected main input chip is not a graph action; handled by buttons
    });

    $("#openFileInput").addEventListener("change", ev => {
        const f = ev.target.files?.[0];
        if (f) openGraphFile(f);
        ev.target.value = "";
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") saveLocalNow();
    });
    window.addEventListener("beforeunload", () => saveLocalNow());
    window.addEventListener("resize", () => {
        scheduleEdges();
        if (window.innerWidth > 900 && sidebarOpen) closeSidebar();
    });

    // Auto-saving viewport after pan/zoom is debounced in those handlers; also persist
    // mouse movement around the canvas is intentionally not saved.
}

function deleteNode(id) {
    const node = nodeById(id);
    if (!node) return;
    state.nodes = state.nodes.filter(n => n.id !== id);
    state.edges = state.edges.filter(e => e.from !== id && e.to !== id);
    if (selected?.type === "node" && selected.id === id) selected = null;
    renderAllNodes();
    onGraphEdited();
    toast(`Removed ${sourceTitle(node)}`);
}

function onNodeActionClick(ev) {
    const magicPick = ev.target.closest("[data-magic-pick]");
    if (magicPick) {
        ev.stopPropagation();
        const node = nodeById(Number(magicPick.dataset.node));
        if (node) {
            node.magicChoice = Number(magicPick.dataset.magicPick) || 0;
            node._sig = "";
            refreshNodePreview(node);
            scheduleRun(true, 30);
        }
        return;
    }
    const pick = ev.target.closest("[data-file-pick]");
    if (pick) {
        ev.stopPropagation();
        const node = nodeById(Number(pick.dataset.node));
        if (node) {
            node.fileIndex = Number(pick.dataset.filePick) || 0;
            applyNodeFileSelection(node);
        }
        return;
    }
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const node = btn.dataset.node ? nodeById(Number(btn.dataset.node)) : null;
    if (action === "delete-node") {
        ev.stopPropagation();
        if (node) deleteNode(node.id);
    } else if (action === "remove-edge") {
        ev.stopPropagation();
        removeChipEdge(btn.dataset.edge);
    } else if (action === "add-join") {
        ev.stopPropagation();
        if (node && node.joinCount < 8) {
            node.joinCount++;
            node._sig = "";
            renderAllNodes();
            onGraphEdited();
        }
    } else if (action === "remove-join") {
        ev.stopPropagation();
        if (node && node.joinCount > 1) {
            node.joinCount--;
            state.edges = state.edges.filter(e => !(e.to === node.id && e.toPort === "join:" + node.joinCount));
            node._sig = "";
            renderAllNodes();
            onGraphEdited();
        }
    } else if (action === "toggle-collapse") {
        ev.stopPropagation();
        if (node) {
            // Collapsing only changes the view: edges and the node's data are untouched.
            node.collapsed = !node.collapsed;
            renderAllNodes();
            saveLocalSoon();
        }
    } else if (action === "preview-mode") {
        ev.stopPropagation();
        if (node) {
            node.previewMode = ["hex", "raw", "image", "text"].includes(btn.dataset.mode) ? btn.dataset.mode : "text";
            refreshNodePreview(node);
            saveLocalSoon();
        }
    } else if (action === "copy-node") {
        ev.stopPropagation();
        if (node?._output) {
            const value = node.previewMode === "hex" ? bytesToHex(node._output, " ") : (looksBinary(node._output) ? bytesToHex(node._output, " ") : utf8(node._output));
            copyText(value).then(ok => toast(ok ? "Output copied" : "Could not copy", ok ? "" : "error"));
        }
    } else if (action === "save-node") {
        ev.stopPropagation();
        if (node?._output) {
            const bin = node.previewMode === "hex" || looksBinary(node._output);
            const blob = new Blob([node._output], {type: bin ? "application/octet-stream" : "text/plain"});
            downloadBlob(blob, `${safeFileName(sourceTitle(node))}.${bin ? "bin" : "txt"}`);
            toast("Output downloaded");
        }
    }
}

/* ================================================================ help */
function initHelp() {
    const modal = $("#help");
    if (!modal) return;
    $("#helpBtn").innerHTML = iconFill("help");
    $("#helpClose").innerHTML = iconFill("x");
    $("#helpBtn").addEventListener("click", () => { modal.hidden = false; });
    $("#helpClose").addEventListener("click", () => { modal.hidden = true; });
    modal.addEventListener("click", ev => { if (ev.target === modal) modal.hidden = true; });
}
function helpOpen() {
    const modal = $("#help");
    return Boolean(modal && !modal.hidden);
}
function closeHelp() {
    const modal = $("#help");
    if (modal) modal.hidden = true;
}

/* ================================================================ boot splash
 * The shell is unusable until the embedded engine has started, so a splash covers it
 * and reports progress. It fades away once the engine is ready and the first run has
 * settled; if the engine cannot start it stays put and explains why.
 */
const boot = {shownAt: performance.now(), done: false, engineReady: false};
function bootStatus(text) {
    const el = $("#bootStatus");
    if (el && text) el.textContent = text;
}
function bootFailed(message) {
    const el = $("#boot");
    if (!el || boot.done) return;
    el.classList.add("error");
    const err = $("#bootError");
    if (err) {
        err.hidden = false;
        err.textContent = message || "The embedded engine could not start.";
    }
    const retry = $("#bootRetry");
    if (retry && retry.hidden) {
        retry.hidden = false;
        retry.addEventListener("click", () => location.reload(), {once: true});
    }
    bootStatus("The embedded engine could not start.");
}
function hideBoot() {
    if (boot.done || !boot.engineReady) return;
    boot.done = true;
    const el = $("#boot");
    if (!el) return;
    // Hold it for a beat so a fast start does not read as a flicker.
    const wait = Math.max(0, 420 - (performance.now() - boot.shownAt));
    setTimeout(() => {
        el.classList.add("done");
        setTimeout(() => el.remove(), 420);
    }, wait);
}

/* ================================================================ init */
async function init() {
    initTheme();
    state = loadLocalGraph();
    const restored = Boolean(state);
    if (!state) state = exampleState();
    if (!state.view) state.view = {x: 40, y: 40, zoom: 0.7};
    renumberState(state);

    initToolbar();
    setupPaletteDelegation();
    buildPalette();
    renderAllNodes();
    updateAutoSwitch();
    initLab();
    initHelp();
    bindGlobalEvents();
    applyView();

    // Populate icons and counts.
    $(".brand-mark").innerHTML = svg("logo");
    $("#searchIcon").innerHTML = svg("search");
    $("#searchClear").innerHTML = svg("x");
    $("#fitBtnIcon").innerHTML = svg("fit");
    $("#themeBtn").innerHTML = iconFill(document.documentElement.dataset.theme === "dark" ? "sun" : "moon");
    $("#labOpenBtn").innerHTML = iconFill("flask");
    $("#sidebarCloseBtn").innerHTML = iconFill("x");
    $("#labClose").innerHTML = iconFill("x");
    $("#labKickerIcon").innerHTML = iconFill("flask");
    $("#opCount").textContent = OP_NAMES.length;
    $("#engineLabel").textContent = ENGINE_LABEL;

    engine.onStatus = (status, detail) => {
        const dot = $("#engineDot");
        const label = $("#engineStatus");
        dot.className = "engine-dot" + (status === "ready" ? " ready" : status === "error" ? " error" : "");
        if (status === "loading") label.innerHTML = "Loading embedded engine…";
        else if (status === "ready") label.innerHTML = `<b>${ENGINE_LABEL}</b> · ${OP_NAMES.length} ops · local only`;
        else label.innerHTML = `<span style="color:var(--danger)">Engine error</span> · ${esc(engine.lastError || "restarting")}`;
        if (status === "error") {
            setRunStatus("error", "Embedded engine error");
            bootFailed(engine.lastError || "The embedded engine reported an error.");
        } else if (status === "ready") {
            boot.engineReady = true;
            bootStatus("Ready");
        } else if (detail) {
            bootStatus(detail);
        }
    };

    const searchHandler = debounce(() => {
        searchTerm = paletteSearch.value;
        renderSearch();
    }, 70);
    paletteSearch.addEventListener("input", searchHandler);
    $("#searchClear").addEventListener("click", () => {
        paletteSearch.value = "";
        searchTerm = "";
        renderSearch();
        paletteSearch.focus();
    });

    // Start the engine; the example graph waits for it and then runs.
    engine.start().then(async () => {
        if (!restored) {
            requestAnimationFrame(() => fitView());
        }
        setRunStatus("", "Ready");
        // With auto-run on, the splash waits for the first pass so the canvas is not
        // shown empty; otherwise there is nothing to wait for.
        if (state.autoRun) scheduleRun(false, 260);
        else hideBoot();
    }).catch(err => {
        setRunStatus("error", "Embedded engine could not start: " + (err.message || err));
        toast("Embedded engine could not start: " + (err.message || err), "error");
        bootFailed(err.message || String(err));
    });

    // Ensure the initial view is fitted after layout.
    requestAnimationFrame(() => {
        if (!restored) fitView();
        else applyView();
    });

    // If a user opens the app with a saved example, still show something useful.
    setTimeout(() => {
        if (!engine.loaded && !engine.lastError) setRunStatus("", "Loading engine…");
    }, 500);
}

window.addEventListener("DOMContentLoaded", init);

})();
