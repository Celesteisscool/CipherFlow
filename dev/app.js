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
// The text and file nodes carry a plug on each side, so their names say so. One constant per
// node keeps the palette, the defaults, the drag ghost and the title tooltips in step.
const TEXT_NODE_TITLE = "Text Input / Output";
const FILE_NODE_TITLE = "File Input / Output";
// The names these nodes shipped with, renamed on load so an existing graph reads correctly.
const LEGACY_TITLES = {input: "Text input", file: "File input"};

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
    edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11.2 2.4l2.4 2.4L6 12.4l-3 .6.6-3z"/><path d="M3 14h10"/></svg>',
    fn: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10.6 2.7c-1.9 0-2.6 1.2-2.6 2.9v4.2c0 1.7-.6 2.6-2.1 2.9"/><path d="M4.6 8h4.7"/></svg>',
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
    const host = $("#toasts");
    // Popups belong over the canvas being worked on, not the middle of the window: the
    // node list takes a column of its own, so the window's centre sits off to one side
    // of the graph. `stage` is whatever canvas is active — the graph, or a function's.
    try {
        const r = stage.getBoundingClientRect();
        if (r.width) host.style.left = Math.round(r.left + r.width / 2) + "px";
    } catch { /* before the canvas exists */ }
    host.appendChild(el);
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
// Function blocks get their own accent so an instance reads differently from an operation.
const FUNCTION_COLOR = "#0f8f8f";

// Every argument a node has can take a wire. The control stays where it is for typing, but
// a value arriving on the port wins while the wire is connected — a number is parsed, a
// switch is read as on/off, and a dropdown is matched against its own options. Only a
// label row has no value to feed.
function argTypeWirable(type) {
    return type !== "label";
}

// Does this argument's control have somewhere to show what is arriving on the wire? A
// number field takes no placeholder, and a dropdown or a switch shows no text at all, so
// those rows get a line of their own instead.
function argPreviewField(control) {
    return [...control.querySelectorAll("input, textarea")].find(f => f.type !== "number") || null;
}

/* ================================================================ function blocks
 * A function is a named subgraph with its own canvas: a Function Input node declares the
 * ports an instance offers on the left, a Function Output node declares the ports it offers
 * on the right, and whatever is wired between them runs when an instance runs. Definitions
 * live in the graph file, so a shared graph carries its functions with it.
 */
function functionById(id, functions = state?.functions) {
    return (functions || []).find(f => f.id === id) || null;
}
function functionPorts(def) {
    const source = def?.nodes?.find(n => n.type === "fnin");
    const sink = def?.nodes?.find(n => n.type === "fnout");
    return {
        // `preset` is the definition's test sample as a short label: what the input runs on
        // when an instance leaves its box alone, shown in that box as the default. A sample
        // fed by a wire has no fixed value to show, so it is flagged instead of guessed at.
        inputs: (source?.ports || []).map((p, i) => {
            const piped = (def?.edges || []).some(e => e.to === source.id && e.toPort === "sample:" + i);
            return {
                key: "fn:" + i,
                name: p.name || `Input ${i + 1}`,
                typed: Boolean(p.typed),
                piped,
                preset: piped ? "" : fnPortDefaultLabel(p)
            };
        }),
        outputs: (sink?.ports || []).map((p, i) => ({key: "out:" + i, name: p.name || `Output ${i + 1}`}))
    };
}
function instancePorts(node, lookup) {
    const def = (lookup || (id => functionById(id)))(node?.fnId);
    return def ? functionPorts(def) : {inputs: [], outputs: []};
}
// The ports a node takes wires on.
function nodeInPorts(node, lookup) {
    switch (node.type) {
        case "op":
            return ["main", ...(OPS[node.op]?.args || []).map((a, i) => argTypeWirable(a.type) ? "arg:" + i : null).filter(Boolean)];
        case "join":
            return Array.from({length: node.joinCount || 0}, (_, i) => "join:" + i);
        case "fn":
            return instancePorts(node, lookup).inputs.map(p => p.key);
        case "fnout":
            return (node.ports || []).map((_, i) => "in:" + i);
        case "fnin":
            // One port per declared input, for feeding that input's test sample from a node
            // in the body instead of typing or attaching it.
            return (node.ports || []).map((_, i) => "sample:" + i);
        default:
            return ["main"];
    }
}
// The ports a node hands data out of.
function nodeOutPorts(node, lookup) {
    switch (node.type) {
        case "fnin":
            return (node.ports || []).map((_, i) => "out:" + i);
        case "fn":
            return instancePorts(node, lookup).outputs.map(p => p.key);
        case "fnout":
            return [];
        default:
            return ["out"];
    }
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
// Selection holds any number of node ids plus at most one selected wire, so shift-click
// and marquee selection can gather several nodes before a copy, a drag or a delete.
let selection = new Set();
let selectedEdge = null;
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
    } else if (type === "fnin") {
        // A function's declared inputs. Each port carries the name shown on every instance
        // and a sample value, so the definition can be run on its own inside the editor.
        node.ports = opts.ports ? cloneValue(opts.ports) : [{name: "Input 1", sample: "", encoding: "utf8", sampleMode: "text", typed: false}];
    } else if (type === "fnout") {
        node.ports = opts.ports ? cloneValue(opts.ports) : [{name: "Output 1"}];
    } else if (type === "fn") {
        // An instance: one input port per declared input, one output port per declared output.
        node.fnId = opts.fnId || "";
        node.portPick = Number(opts.portPick) || 0;
        // Values typed straight onto the instance, keyed by port ("fn:0"); used for any
        // declared input the definition marked as typeable and nothing is wired into.
        node.typedInputs = opts.typedInputs ? cloneValue(opts.typedInputs) : {};
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
    const input = makeNode("input", {id: 1, x: 150, y: 190, text: "Hello, World!", title: TEXT_NODE_TITLE});
    // A text node on the other end shows what flows in, so the pair reads the same as
    // the old input → Output layout.
    const sink = makeNode("input", {id: 2, x: 610, y: 210, title: "Result", text: ""});
    return {
        version: 1,
        nodes: [input, sink],
        edges: [{id: optsEdgeId(), from: 1, to: 2, toPort: "main", fromPort: "out"}],
        functions: [],
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
        functions: [],
        view: {x: 40, y: 50, zoom: 0.58},
        autoRun: true
    };
}

// Update ID counters when importing arbitrary files.
// Function definitions share the node and edge id spaces with the graph that carries them,
// so pasting a definition in can never collide with a node already on the canvas.
function renumberState(s) {
    let maxNode = 0, maxEdge = 0;
    const scan = (nodes, edges) => {
        for (const n of nodes || []) maxNode = Math.max(maxNode, Number(n.id) || 0);
        for (const e of edges || []) {
            const numeric = Number(String(e.id).replace(/^e/, ""));
            if (Number.isFinite(numeric)) maxEdge = Math.max(maxEdge, numeric);
        }
    };
    scan(s.nodes, s.edges);
    for (const def of s.functions || []) scan(def.nodes, def.edges);
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
        ports: n.ports ? cloneValue(n.ports) : undefined,
        fnId: n.fnId,
        portPick: n.portPick,
        typedInputs: n.typedInputs ? cloneValue(n.typedInputs) : undefined,
        fileIndex: n.fileIndex || 0,
        previewMode: n.previewMode || "text",
        collapsed: Boolean(n.collapsed),
        w: Math.round(n.w || 0),
        h: Math.round(n.h || 0),
        values: n.values ? cloneValue(n.values) : undefined
    };
}

// What a saved graph looks like. The graph is passed in rather than read from `state`
// because a function's editor temporarily points the canvas at a definition.
function serializeGraph(graph = state) {
    return {
        app: "CipherFlow",
        version: 1,
        engine: META.version,
        exportedAt: new Date().toISOString(),
        nodes: graph.nodes.map(cleanNodeForSave),
        edges: graph.edges.map(e => ({id: e.id, from: e.from, to: e.to, toPort: e.toPort, fromPort: e.fromPort || "out"})),
        // Function definitions travel with the graph, so a shared file keeps working.
        functions: (graph.functions || []).map(cleanFunctionForSave),
        view: {...graph.view},
        autoRun: graph.autoRun
    };
}

// The graph to save right now: the canvas graph, or — while a function's editor is open —
// the graph that carries it. A definition is edited in place, so its latest state is
// already inside the graph's own functions list.
function graphToSave() {
    return editingFunctionId && mainGraph ? mainGraph : state;
}

function cleanFunctionForSave(def) {
    return {
        id: def.id,
        name: def.name || "Function",
        continueOnError: Boolean(def.continueOnError),
        view: def.view ? {...def.view} : null,
        nodes: (def.nodes || []).map(cleanNodeForSave),
        edges: (def.edges || []).map(e => ({id: e.id, from: e.from, to: e.to, toPort: e.toPort, fromPort: e.fromPort || "out"}))
    };
}

// An instance's typed values, keyed by port ("fn:0"), read back from a file or a paste.
// Anything that is not a string is dropped, so a hand-edited file cannot inject objects.
function readTypedInputs(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
        if (/^fn:\d+$/.test(key) && typeof value === "string") out[key] = value;
    }
    return Object.keys(out).length ? out : undefined;
}

// Rebuild one saved node. Shared by Open and by paste, so a pasted fragment is validated
// by exactly the same rules as a file on disk.
function nodeFromRaw(raw, {freshIds = false, localId = 0} = {}) {
    if (!raw) return null;
    // Output nodes no longer exist. Older graphs migrate their sink to a text node,
    // which keeps the wire and shows the same value.
    const wasOutput = raw.type === "output";
    const type = wasOutput ? "input" : raw.type;
    if (!["input", "file", "join", "op", "fn", "fnin", "fnout"].includes(type)) return null;
    if (type === "op" && (!raw.op || !OPS[raw.op])) return null;
    if (type === "fn" && !raw.fnId) return null;
    // The text and file nodes were renamed once they grew a port on each side. A saved title
    // is only rewritten when it is still the old default, so a name the user typed survives.
    const title = LEGACY_TITLES[type] && raw.title === LEGACY_TITLES[type]
        ? (type === "input" ? TEXT_NODE_TITLE : FILE_NODE_TITLE)
        : (raw.title || "");
    const n = makeNode(type, {
            // Pasting hands out fresh ids so a copy never collides with what it came from;
            // a cloned function body gets ids from its own small private range.
            id: localId ? localId : (freshIds ? undefined : Number(raw.id)),
            x: Number(raw.x) || 40,
            y: Number(raw.y) || 40,
            title,
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
            ports: Array.isArray(raw.ports) && raw.ports.length ? raw.ports.map(p => ({...p})) : undefined,
            fnId: raw.fnId ? String(raw.fnId) : "",
            portPick: Number(raw.portPick) || 0,
            typedInputs: readTypedInputs(raw.typedInputs),
            fileIndex: clamp(Number(raw.fileIndex) || 0, 0, 32),
            previewMode: ["hex", "raw", "image", "text"].includes(raw.previewMode) ? raw.previewMode : "text",
            collapsed: Boolean(raw.collapsed),
            w: Number(raw.w) || 0,
            h: Number(raw.h) || 0
    });
    if (raw.values && Array.isArray(raw.values) && raw.values.length === (OPS[raw.op]?.args || []).length) {
        n.values = cloneValue(raw.values);
    }
    return n;
}

function normalizeLoaded(data) {
    if (!data || data.app !== "CipherFlow" && !Array.isArray(data.nodes)) throw new Error("This is not a CipherFlow graph file.");
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error("The graph file is missing nodes or edges.");
    const nodes = [];
    for (const raw of data.nodes) {
        const n = nodeFromRaw(raw);
        if (n) nodes.push(n);
    }
    // Function definitions are read first: an instance's ports depend on the definition it
    // names, so the wire check below has to know them already.
    const functions = [];
    for (const raw of data.functions || []) {
        if (!raw || !Array.isArray(raw.nodes)) continue;
        const defNodes = [];
        for (const n of raw.nodes) {
            const made = nodeFromRaw(n);
            if (made) defNodes.push(made);
        }
        if (!defNodes.length) continue;
        const defIds = new Set(defNodes.map(n => n.id));
        const defEdges = [];
        for (const e of raw.edges || []) {
            if (!e || !defIds.has(Number(e.from)) || !defIds.has(Number(e.to))) continue;
            defEdges.push({id: String(e.id || ("e" + edgeSeq++)), from: Number(e.from), to: Number(e.to),
                toPort: String(e.toPort), fromPort: String(e.fromPort || "out")});
        }
        functions.push({
            id: String(raw.id || ("f" + (functions.length + 1))),
            name: String(raw.name || "Function"),
            continueOnError: Boolean(raw.continueOnError),
            view: raw.view ? {x: Number(raw.view.x) || 0, y: Number(raw.view.y) || 0, zoom: clamp(Number(raw.view.zoom) || 0.8, 0.2, 2.2)} : null,
            nodes: defNodes,
            edges: defEdges
        });
    }
    const lookup = id => functions.find(f => f.id === id) || null;
    const ids = new Set(nodes.map(n => n.id));
    const edges = [];
    const seenInputs = new Set();
    for (const raw of data.edges || []) {
        if (!raw || !ids.has(Number(raw.from)) || !ids.has(Number(raw.to))) continue;
        if (raw.from === raw.to) continue;
        const target = nodes.find(n => n.id === Number(raw.to));
        if (!target) continue;
        const toPort = String(raw.toPort);
        // Each node type accepts a fixed set of input ports: an operation's main pipe or a
        // wirable argument, a join slot, a function input, a function body's output slot.
        if (!nodeInPorts(target, lookup).includes(toPort)) continue;
        if (seenInputs.has(`${raw.to}:${toPort}`)) continue;
        seenInputs.add(`${raw.to}:${toPort}`);
        edges.push({id: String(raw.id || ("e" + edgeSeq++)), from: Number(raw.from), to: Number(raw.to), toPort, fromPort: String(raw.fromPort || "out")});
    }
    return {
        nodes,
        edges,
        functions,
        view: data.view ? {x: Number(data.view.x) || 0, y: Number(data.view.y) || 0, zoom: clamp(Number(data.view.zoom) || 0.8, 0.2, 2.2)} : null,
        autoRun: data.autoRun !== false
    };
}

function saveLocalNow() {
    if (!state) return;
    try {
        const payload = JSON.stringify(serializeGraph(graphToSave()));
        localStorage.setItem(STORAGE_KEY, payload);
        lastSavedAt = Date.now();
    } catch (err) {
        // Large file attachments can exceed localStorage. Keep the graph except file bytes.
        try {
            const payload = serializeGraph(graphToSave());
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
    // A graph arriving from a file or the example replaces everything, so leave any
    // function editor first rather than editing a definition that is about to vanish.
    if (editingFunctionId) closeFunctionEditor();
    state = data;
    state.functions = state.functions || [];
    state.autoRun = data.autoRun !== false;
    renumberState(state);
    for (const n of state.nodes) {
        n._output = null; n._error = ""; n._sig = ""; n._duration = 0; n._reused = false;
    }
    selection.clear();
    selectedEdge = null;
    renderAllNodes();
    // A loaded graph brings its own functions, so the node list has to be rebuilt.
    buildPalette();
    updateAutoSwitch();
    if (fit) requestAnimationFrame(() => fitView());
    saveLocalNow();
    scheduleRun(true, 160);
}

/* ================================================================ DOM refs */
// These six are swappable: a function's editor window is the same canvas pointed at a
// definition, so every node, wire and gesture works there without a second implementation.
let stage = $("#stage");
let world = $("#world");
let nodesLayer = $("#nodesLayer");
let edgesSvg = $("#edgesSvg");
let edgesLayer = $("#edgesLayer");
let edgeHandlesLayer = $("#edgeHandlesLayer");
let zoomLabel = $("#zoomLabel");
let runStatus = $("#runStatus");
let runStatusText = $("#runStatusText");
let runButton = null;
let autoSwitch = null;
// The node list normally lives in the sidebar, but a function's editor window covers the
// whole page, sidebar included. That window therefore carries its own copy of the list and
// these two bindings are swapped while it is open, so buildPalette() and the search fill
// whichever list is on screen. Exactly the same trick as the canvas bindings above.
const sidebarPalette = {body: $("#paletteBody"), search: $("#paletteSearch")};
let paletteBody = sidebarPalette.body;
let paletteSearch = sidebarPalette.search;
const sidebar = $("#sidebar");
const sidebarBackdrop = $("#sidebarBackdrop");

function setPaletteTarget(body, search) {
    paletteBody = body;
    paletteSearch = search;
}
function bindPaletteSearch(input, clear) {
    const handler = debounce(() => {
        searchTerm = input.value;
        renderSearch();
    }, 70);
    input.addEventListener("input", handler);
    clear.addEventListener("click", () => {
        input.value = "";
        searchTerm = "";
        renderSearch();
        input.focus();
    });
}
// Each list starts clean, so a search typed into one does not follow you into the other.
function resetPaletteSearch() {
    searchTerm = "";
    if (paletteSearch) paletteSearch.value = "";
    renderSearch();
}

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
    if (node.type === "input") return node.title || TEXT_NODE_TITLE;
    if (node.type === "file") return node.title || node.fileName || FILE_NODE_TITLE;
    if (node.type === "join") return node.title || "Join";
    if (node.type === "fn") return node.title || functionById(node.fnId)?.name || "Function";
    if (node.type === "fnin") return "Function input";
    if (node.type === "fnout") return "Function output";
    return node.title || node.type;
}
function nodeAccent(node) {
    if (node.type === "op") return opAccent(node.op);
    if (node.type === "fn" || node.type === "fnin" || node.type === "fnout") return FUNCTION_COLOR;
    return GRAPH_COLOR;
}
function nodeCategoryLabel(node) {
    if (node.type === "input") return "Input";
    if (node.type === "file") return "File";
    if (node.type === "join") return "Join";
    if (node.type === "fn") return "Function";
    if (node.type === "fnin") return "Fn input";
    if (node.type === "fnout") return "Fn output";
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
    for (const id of [...selection]) if (!nodeById(id)) selection.delete(id);
    if (selectedEdge && !state.edges.some(e => e.id === selectedEdge)) selectedEdge = null;
    syncSelectionClasses();
    updateSelectionBar();
    // The editor's header counts what the definition holds, so it follows every change.
    if (editingFunctionId && fnEditor.meta) {
        fnEditor.meta.textContent = `${state.nodes.length} node${state.nodes.length === 1 ? "" : "s"}`;
    }
    scheduleEdges();
}

function buildNode(node) {
    const el = document.createElement("div");
    const isFunctionNode = node.type === "fn" || node.type === "fnin" || node.type === "fnout";
    el.className = `node ${nodeTypeClass(node)}${isFunctionNode ? " fn-node" : ""}${selection.has(node.id) ? " selected" : ""}${node._error ? " has-error" : ""}`;
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
    } else if (node.type === "fn") {
        body.appendChild(buildFunctionNode(node));
    } else if (node.type === "fnin") {
        body.appendChild(buildFnInputNode(node));
    } else if (node.type === "fnout") {
        body.appendChild(buildFnOutputNode(node));
    }
    // Most nodes have a single output on the right edge. A function's input declaration and
    // an instance of a multi-output function put each port in the row it belongs to instead.
    for (const portName of nodeOutPorts(node)) {
        const portEl = makeOutputPort(portName);
        const slot = $(".out-slot[data-port-slot=\"" + cssEscape(portName) + "\"]", el);
        (slot || el).appendChild(portEl);
    }
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
        // Shift adds to the selection; a plain press on one of several selected nodes keeps
        // the group together so the drag can move all of them.
        if (ev.shiftKey) selectNode(node.id, true);
        else if (!selection.has(node.id)) selectNode(node.id);
    });
    const head = $(".node-head", el);
    head.addEventListener("pointerdown", ev => {
        if (ev.button !== 0 || ev.target.closest("button") || ev.target.isContentEditable) return;
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.shiftKey) selectNode(node.id, true);
        else if (!selection.has(node.id)) selectNode(node.id);
        startNodeDrag(node, ev);
    });
    const titleEl = $("[data-node-title]", el);
    titleEl.addEventListener("dblclick", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        // Double-clicking a function opens it; anything else renames in place.
        if (node.type === "fn" && functionById(node.fnId)) openFunctionEditor(functionById(node.fnId));
        else beginTitleEdit(node, titleEl);
    });
    const close = $(".node-close", el);
    close.innerHTML = `${iconFill("x")}`;
    return el;
}

function makeOutputPort(name = "out") {
    const span = document.createElement("span");
    span.className = "port out";
    span.dataset.port = name;
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
    } else if (node.type === "fn") {
        for (const p of instancePorts(node).inputs) ports.push({name: p.key, label: p.name});
    } else if (node.type === "fnout") {
        (node.ports || []).forEach((p, i) => ports.push({name: "in:" + i, label: p.name || `Out ${i + 1}`}));
    } else if (node.type === "fnin") {
        // A declared input only hands data outwards; the only wires it takes are the ones
        // feeding its test samples, and only those need an anchor while it is collapsed.
        (node.ports || []).forEach((p, i) => {
            if (edgeInto(node.id, "sample:" + i)) ports.push({name: "sample:" + i, label: `${p.name || `Input ${i + 1}`} sample`});
        });
    } else {
        ports.push({name: "main", label: "In"});
    }
    wrap.innerHTML = ports.map(p => `<div class="io-row">
        <span class="port in${edgeInto(node.id, p.name) ? " connected" : ""}" data-port="${esc(p.name)}"></span>
        <span class="io-label" title="${esc(p.label)}">${esc(p.label)}</span>
    </div>`).join("");
    // A collapsed node with several outputs still needs an anchor for each wire, or those
    // wires would have nowhere to land and would disappear while it is shut. Each row is
    // named the way the declaration names it — a function's declared output, a definition's
    // declared input — rather than by its bare port key, which would read as "out:0".
    const outs = nodeOutPorts(node);
    if (outs.length > 1) {
        const named = node.type === "fn"
            ? instancePorts(node).outputs
            : node.type === "fnin"
                ? (node.ports || []).map((p, i) => ({key: "out:" + i, name: p.name || `Input ${i + 1}`}))
                : outs.map(key => ({key, name: key}));
        wrap.innerHTML += named.map(o => `<div class="io-row io-out-row" title="${esc(o.name)}">
            <span class="io-label" style="margin-left:auto">${esc(o.name)}</span>
            <span class="out-slot" data-port-slot="${esc(o.key)}"></span>
        </div>`).join("");
    }
    $$(".port.in", wrap).forEach(p => bindInputPort(p, node.id, p.dataset.port));
    return wrap;
}

// An operation's main input gets a box of its own, exactly like its arguments do: you can
// type a value straight into the node and the run uses it, or wire something into the port
// and the wire takes over (the box dims, as a wired argument's field does).
// What a wire is actually delivering, as a one-line taste: enough to recognise the value,
// cut off when it runs long. Never used for the node's own data — a box keeps the text you
// typed and this is only what its placeholder reads. Every wired port gets this treatment,
// the operation's own input and each piped argument alike.
const WIRE_HINT_CHARS = 32;
function wireHintFor(node, port) {
    const edge = edgeInto(node.id, port);
    if (!edge) return "";
    const src = nodeById(edge.from);
    const bytes = src ? nodeOutputBytes(src) : null;
    if (!bytes) return "Nothing on the wire yet — press Run";
    if (!bytes.length) return "Empty output on the wire";
    if (looksBinary(bytes)) return `Binary data · ${formatBytes(bytes.length)}`;
    const text = dec.decode(bytes).replace(/\s+/g, " ").trim();
    if (!text) return `Blank text · ${formatBytes(bytes.length)}`;
    return text.length > WIRE_HINT_CHARS ? text.slice(0, WIRE_HINT_CHARS) + "…" : text;
}

// Give a wired control the same look as the operation's own input box: dimmed, with the
// incoming value where its placeholder would be. The typed value stays underneath.
// One dimmed line explaining what a port is being fed, for the rows whose control cannot
// hold a placeholder.
function wireHintLine(node, port) {
    const div = document.createElement("div");
    div.className = "wire-hint";
    div.dataset.hintPort = port;
    div.title = "What this input is carrying";
    div.textContent = wireHintFor(node, port);
    return div;
}

function applyWireHint(control, node, port) {
    if (!control) return;
    const hint = wireHintFor(node, port);
    const fields = control.matches?.("input, textarea") ? [control] : [...control.querySelectorAll("input, textarea")];
    for (const field of fields) {
        if (field.type === "number") continue;
        field.placeholder = hint || "Fed by the wire";
        field.title = "Coming in on the wire feeding this port — the wire wins while it is connected";
    }
    const line = control.parentElement?.querySelector?.(".wire-hint");
    if (line) line.textContent = hint;
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
    input.placeholder = (wired ? wireHintFor(node, "main") : "") || (wired ? "Fed by the wire" : "Type input text");
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

// Attach a file to one declared input as its test sample.
async function readFileToSample(node, port, file) {
    if (file.size > 24 * 1024 * 1024) {
        toast("That file is larger than 24 MB. The page keeps samples in memory.", "error");
        return;
    }
    try {
        const buffer = await file.arrayBuffer();
        port.sampleMode = "file";
        port.sampleFileName = file.name;
        port.sampleFileSize = file.size;
        port.sampleFileMime = file.type || "application/octet-stream";
        port.sampleFileData = bytesToB64(new Uint8Array(buffer));
        node._sig = "";
        renderAllNodes();
        onGraphEdited(true);
        toast(`Test sample: ${file.name}`);
    } catch (err) {
        toast("Could not read that file: " + err.message, "error");
    }
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
        </div>${edge ? `<div class="wire-hint" data-hint-port="${port}" title="What this input is carrying">${esc(wireHintFor(node, port))}</div>` : ""}`;
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

/* ------------------------------------------------------- function nodes */
// A one-line explanation inside the nodes that only exist while editing a function.
function fnNote(text) {
    const div = document.createElement("div");
    div.className = "fn-note";
    div.textContent = text;
    return div;
}

// How many nodes inside a function failed while it was set to keep going.
function fnErrorLabel(count) {
    return `${count} error${count === 1 ? "" : "s"} in function`;
}

// An instance: the definition's inputs on the left, its outputs on the right.
function buildFunctionNode(node) {
    const wrap = document.createElement("div");
    const def = functionById(node.fnId);
    if (!def) {
        const warn = document.createElement("div");
        warn.className = "fn-missing";
        warn.textContent = "This graph has no function by that name. Open the graph that defines it, or delete this node.";
        wrap.appendChild(warn);
        return wrap;
    }
    const ports = functionPorts(def);
    wrap.appendChild(fnNote(`${esc(def.name)} · ${ports.inputs.length} in · ${ports.outputs.length} out`));
    for (const port of ports.inputs) {
        const edge = edgeInto(node.id, port.key);
        const src = edge ? edgeSource(edge) : null;
        const row = document.createElement("div");
        row.className = "io-row fn-row";
        row.innerHTML = `
            <span class="port in${edge ? " connected" : ""}" data-port="${esc(port.key)}"></span>
            <span class="io-label" title="${esc(port.name)}">${esc(port.name)}</span>
            <span class="port-label">${edge ? chipHtml(src, edge) : ""}</span>
        `;
        bindInputPort($(".port.in", row), node.id, port.key);
        wrap.appendChild(row);
        // A declared input can offer a box on every instance, so a value can be typed here
        // instead of needing a node wired into the port. A wire still wins over the box.
        if (port.typed) wrap.appendChild(typedInputRow(node, port, edge));
    }
    wrap.appendChild(buildPreview(node));
    wrap.appendChild(buildError(node));
    // With "keep going on errors" switched on, a body that hit trouble still hands back an
    // output, so this count is the only sign anything went wrong.
    if (def.continueOnError) {
        const badge = document.createElement("div");
        badge.className = "fn-error-count";
        badge.dataset.fnErrors = "";
        badge.textContent = fnErrorLabel(node._fnErrors || 0);
        badge.hidden = !node._fnErrors;
        wrap.appendChild(badge);
    }
    // With more than one output, each gets a row: the number picks which value the preview
    // shows, and the row anchors that output's port.
    if (ports.outputs.length > 1) {
        const outs = document.createElement("div");
        outs.className = "fn-outs";
        ports.outputs.forEach((port, i) => {
            const edge = null;
            const row = document.createElement("div");
            row.className = "io-row fn-out-row" + ((node.portPick || 0) === i ? " on" : "");
            row.innerHTML = `
                <button class="fn-out-pick" data-action="fn-pick" data-node="${node.id}" data-pick="${i}" title="Show this output in the preview">${i + 1}</button>
                <span class="io-label" title="${esc(port.name)}">${esc(port.name)}</span>
                <span class="out-slot" data-port-slot="${esc(port.key)}"></span>
            `;
            outs.appendChild(row);
        });
        wrap.appendChild(outs);
    }
    return wrap;
}

// What an input runs on when the instance box is left alone: the definition's test sample.
// Shown in the box as its default, so the value actually in use is visible without having
// to open the function — while the box itself stays empty, so an untouched box keeps
// following the definition even if the sample is changed later.
function fnPortDefaultLabel(port) {
    if (!port) return "";
    if (port.sampleMode === "file" && port.sampleFileData) {
        return `${port.sampleFileName || "attached file"} · ${formatBytes(port.sampleFileSize || 0)}`;
    }
    const text = String(port.sample ?? "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > WIRE_HINT_CHARS ? text.slice(0, WIRE_HINT_CHARS) + "…" : text;
}

// The typed-value box an instance shows for one declared input. It behaves exactly like an
// operation's own input box or a text node's: typed text runs the function, a wire into the
// port overrides it and dims the box, and left alone it shows the function's default.
function typedInputRow(node, port, edge) {
    const holder = document.createElement("div");
    holder.className = "fn-typed";
    holder.dataset.typedPort = port.key;
    const control = document.createElement("div");
    control.className = "arg-control" + (edge ? " connected" : "");
    const input = document.createElement("input");
    input.className = "control";
    input.spellcheck = false;
    input.value = node.typedInputs?.[port.key] ?? "";
    // Kept so a refresh can put the box's own wording back once nothing feeds the port.
    const preset = port.preset || "";
    input.dataset.ownPlaceholder = preset
        ? `${preset} · default`
        : port.piped
            ? "Fed by a node inside the function · default"
            : `Type ${port.name.toLowerCase()} here, or pipe it in`;
    input.dataset.ownTitle = preset
        ? `Left alone, this input uses the function's default (${preset}). Type here to override it.`
        : port.piped
            ? "Left alone, this input takes the value the function pipes into its own test sample. Type here to override it."
            : `Used when nothing is wired into ${port.name}`;
    input.placeholder = edge ? wireHintFor(node, port.key) : input.dataset.ownPlaceholder;
    input.title = edge ? "Coming in on the wire feeding this port — the wire wins while it is connected" : input.dataset.ownTitle;
    input.addEventListener("input", () => {
        node.typedInputs = node.typedInputs || {};
        node.typedInputs[port.key] = input.value;
        node._sig = "";
        onGraphEdited();
    });
    control.appendChild(input);
    holder.appendChild(control);
    if (edge) applyWireHint(control, node, port.key);
    return holder;
}

// The definition's inputs: rename them, give each a sample, and wire them into the body.
function buildFnInputNode(node) {
    const wrap = document.createElement("div");
    wrap.appendChild(fnNote("The function's inputs. Each row becomes an input port on every instance of this function."));
    (node.ports || []).forEach((port, i) => {
        // Each declared input is a block of its own — name, typed-in switch, test sample — and
        // without a break between them the second input reads as part of the first one's
        // sample. Only between blocks: no trailing line above "Add input".
        if (i > 0) {
            const sep = document.createElement("div");
            sep.className = "fn-sep";
            wrap.appendChild(sep);
        }
        const row = document.createElement("div");
        row.className = "io-row fn-row";
        // The port slot comes last so its dot lands on the node's right edge like every
        // other output port; ahead of the remove button it sat on top of it instead.
        row.innerHTML = `
            <span class="io-label">In ${i + 1}</span>
            <input class="control fn-port-name" data-port-name="${i}" value="${esc(port.name || "")}" placeholder="Input ${i + 1}" spellcheck="false">
            ${(node.ports || []).length > 1 ? `<button class="join-remove" data-action="fn-remove-port" data-node="${node.id}" data-index="${i}" title="Remove this input">${iconFill("x")}</button>` : ""}
            <span class="out-slot" data-port-slot="out:${i}"></span>
        `;
        const nameInput = $("[data-port-name]", row);
        nameInput.addEventListener("input", () => { port.name = nameInput.value; node._sig = ""; onGraphEdited(); });
        wrap.appendChild(row);
        // Tick this and every instance of the function grows a text box for this input, so a
        // constant can be typed on the canvas without a node feeding it.
        const typed = document.createElement("label");
        typed.className = "fn-typed-toggle";
        typed.title = "Show a box on every instance where this input can be typed in, instead of needing a wire";
        typed.innerHTML = `<input type="checkbox" data-port-typed="${i}"${port.typed ? " checked" : ""}><span>Can be typed in</span>`;
        $("[data-port-typed]", typed).addEventListener("change", ev => {
            ev.stopPropagation();
            port.typed = Boolean(ev.target.checked);
            node._sig = "";
            // The ports are part of the definition's stamp, so re-render rather than patch
            // just this one control by hand.
            renderAllNodes();
            onGraphEdited();
        });
        wrap.appendChild(typed);
        // The sample is what this input is fed with when the function is test-run on its
        // own; an instance that has something wired into the port overrides it. A sample is
        // either text typed in here or a whole file, so a function that works on images or
        // archives can still be tested from the editor.
        const kind = port.sampleMode === "file" ? "file" : "text";
        // The sample can be typed, attached, or piped in from a node in the body. A wire on
        // the port takes over from both controls, which is how a derived fixture is made.
        const fed = edgeInto(node.id, "sample:" + i);
        const fedSrc = fed ? edgeSource(fed) : null;
        const sample = document.createElement("div");
        sample.className = "fn-sample";
        sample.innerHTML = `
            <div class="fn-sample-head io-row">
                <span class="port in${fed ? " connected" : ""}" data-port="sample:${i}" title="Pipe a value in to use as this input's test sample"></span>
                <span class="fn-sample-label">Test sample</span>
                ${fed ? `<span class="port-label">${chipHtml(fedSrc, fed)}</span>` : ""}
                <span class="seg fn-sample-kind">
                    <button data-sample-mode="text" class="${kind === "text" ? "on" : ""}">Text</button>
                    <button data-sample-mode="file" class="${kind === "file" ? "on" : ""}">File</button>
                </span>
            </div>
            <div class="fn-sample-body" data-sample-body>
                <div class="toggle-pair" data-sample-text hidden>
                    <input class="control" data-sample value="${esc(port.sample || "")}" placeholder="Sample value for a test run" spellcheck="false">
                    <select class="control" data-sample-encoding>
                        <option value="utf8">UTF-8</option><option value="hex">Hex</option>
                        <option value="base64">Base64</option><option value="latin1">Latin-1</option>
                    </select>
                </div>
                <div data-sample-file hidden>
                    <button class="fn-file-drop" data-sample-drop>${port.sampleFileData
                        ? `<b>${esc(port.sampleFileName || "File attached")}</b><span>${formatBytes(port.sampleFileSize || 0)} · click to replace</span>`
                        : `<b>Choose a file</b><span>bytes stay in this page</span>`}</button>
                    <input type="file" hidden data-sample-input>
                </div>
            </div>
            ${fed ? `<div class="wire-hint" data-hint-port="sample:${i}" title="What the sample is being fed">${esc(wireHintFor(node, "sample:" + i))}</div>` : ""}
        `;
        $("[data-sample-text]", sample).hidden = kind !== "text";
        $("[data-sample-file]", sample).hidden = kind !== "file";
        $("[data-sample-body]", sample).classList.toggle("connected", Boolean(fed));
        bindInputPort($(".port.in", sample), node.id, "sample:" + i);
        const sampleInput = $("[data-sample]", sample);
        sampleInput.addEventListener("input", () => { port.sample = sampleInput.value; node._sig = ""; onGraphEdited(); });
        const encoding = $("[data-sample-encoding]", sample);
        encoding.value = port.encoding || "utf8";
        encoding.addEventListener("change", () => { port.encoding = encoding.value; node._sig = ""; onGraphEdited(); });
        for (const btn of $$("[data-sample-mode]", sample)) {
            btn.addEventListener("click", ev => {
                ev.stopPropagation();
                const next = btn.dataset.sampleMode === "file" ? "file" : "text";
                if (port.sampleMode === next) return;
                port.sampleMode = next;
                node._sig = "";
                // Only the sample matters to a test run, but the definition's stamp covers
                // the ports, so re-render rather than patching the two boxes by hand.
                renderAllNodes();
                onGraphEdited();
            });
        }
        const fileInput = $("[data-sample-input]", sample);
        const drop = $("[data-sample-drop]", sample);
        drop.addEventListener("click", ev => { ev.stopPropagation(); fileInput.click(); });
        fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (file) readFileToSample(node, port, file);
        });
        drop.addEventListener("dragover", ev => { ev.preventDefault(); drop.classList.add("drag"); });
        drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
        drop.addEventListener("drop", ev => {
            ev.preventDefault();
            drop.classList.remove("drag");
            const file = ev.dataTransfer?.files?.[0];
            if (file) readFileToSample(node, port, file);
        });
        wrap.appendChild(sample);
    });
    const add = document.createElement("button");
    add.className = "join-add";
    add.dataset.action = "fn-add-port";
    add.dataset.node = node.id;
    add.innerHTML = `${iconFill("plus")}<span>Add input</span>`;
    wrap.appendChild(add);
    return wrap;
}

// The definition's outputs: name each one and wire a body node into it.
function buildFnOutputNode(node) {
    const wrap = document.createElement("div");
    wrap.appendChild(fnNote("Wire body nodes in here. Each row becomes an output port on every instance of this function."));
    (node.ports || []).forEach((port, i) => {
        const edge = edgeInto(node.id, "in:" + i);
        const src = edge ? edgeSource(edge) : null;
        const row = document.createElement("div");
        row.className = "io-row fn-row";
        row.innerHTML = `
            <span class="port in${edge ? " connected" : ""}" data-port="in:${i}"></span>
            <span class="io-label">Out ${i + 1}</span>
            <input class="control fn-port-name" data-port-name="${i}" value="${esc(port.name || "")}" placeholder="Output ${i + 1}" spellcheck="false">
            <span class="port-label">${edge ? chipHtml(src, edge) : ""}</span>
            ${(node.ports || []).length > 1 ? `<button class="join-remove" data-action="fn-remove-port" data-node="${node.id}" data-index="${i}" title="Remove this output">${iconFill("x")}</button>` : ""}
        `;
        const nameInput = $("[data-port-name]", row);
        nameInput.addEventListener("input", () => { port.name = nameInput.value; node._sig = ""; onGraphEdited(); });
        bindInputPort($(".port.in", row), node.id, "in:" + i);
        wrap.appendChild(row);
        if (edge) {
            const hint = document.createElement("div");
            hint.className = "wire-hint";
            hint.dataset.hintPort = "in:" + i;
            hint.textContent = wireHintFor(node, "in:" + i);
            wrap.appendChild(hint);
        }
    });
    const add = document.createElement("button");
    add.className = "join-add";
    add.dataset.action = "fn-add-port";
    add.dataset.node = node.id;
    add.innerHTML = `${iconFill("plus")}<span>Add output</span>`;
    wrap.appendChild(add);
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
        row.dataset.argPort = portName;
        const control = $(".arg-control", row);
        const value = node.values[i];
        control.appendChild(makeArgControl(node, i, arg, value));
        // A wired argument reads exactly like the operation's own input box: dimmed, with
        // what is arriving on the wire where its placeholder would be — or, when the
        // control has no text of its own to overwrite, on a line just below it.
        if (connected) {
            if (!argPreviewField(control)) row.appendChild(wireHintLine(node, portName));
            applyWireHint(control, node, portName);
        }
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
    const isSink = node.type === "input" || node.type === "file" || node.type === "join" || node.type === "fn";
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
        const label = row.label || row.op;
        return `<button class="magic-row${i === (node.magicChoice || 0) ? " on" : ""}" data-magic-pick="${i}" data-node="${node.id}" title="Use ${esc(label)} as this node's output">
            <span class="magic-rank">${i + 1}</span>
            <span class="magic-main">
                <span class="magic-op">${esc(label)}</span>
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
        const hint = wireHintFor(node, "main");
        opInput.placeholder = hint || (edgeInto(node.id, "main") ? "Fed by the wire" : "Type input text");
    }
    // Every piped argument previews its arriving value too, refreshed on each run. Only the
    // wired ones: an argument with nothing on its port keeps its own placeholder.
    for (const row of $$("[data-arg-port]", el)) {
        if (!edgeInto(node.id, row.dataset.argPort)) continue;
        applyWireHint($(".arg-control", row), node, row.dataset.argPort);
    }
    // A typed box on a function instance follows its wire the same way, and goes back to its
    // own wording when the wire is taken away.
    for (const row of $$("[data-typed-port]", el)) {
        const port = row.dataset.typedPort;
        const control = $(".arg-control", row);
        const field = control ? $("input", control) : null;
        if (!field) continue;
        const wired = Boolean(edgeInto(node.id, port));
        control.classList.toggle("connected", wired);
        if (wired) {
            applyWireHint(control, node, port);
        } else {
            field.placeholder = field.dataset.ownPlaceholder || "";
            field.title = field.dataset.ownTitle || "";
        }
    }
    for (const line of $$("[data-hint-port]", el)) {
        line.textContent = wireHintFor(node, line.dataset.hintPort);
    }
    let p = $("[data-preview]", el);
    if (!p) return;
    updatePreviewEl(p, node);
    const err = $("[data-node-error]", el);
    if (err) {
        err.textContent = node._error || "";
        err.style.display = node._error ? "block" : "none";
    }
    const fnErrors = $("[data-fn-errors]", el);
    if (fnErrors) {
        const count = node._fnErrors || 0;
        fnErrors.textContent = fnErrorLabel(count);
        fnErrors.hidden = !count;
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
        const outEl = nodeEl(from.id)?.querySelector(`.port.out[data-port="${cssEscape(edge.fromPort || "out")}"]`);
        const inEl = nodeEl(to.id)?.querySelector(`.port.in[data-port="${cssEscape(edge.toPort)}"]`);
        if (!outEl || !inEl) continue;
        const a = portCenter(outEl);
        const b = portCenter(inEl);
        if (!a || !b) continue;
        const color = nodeAccent(from);
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "edge-group" + (selectedEdge === edge.id ? " selected" : ""));
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
        if (selectedEdge === edge.id) {
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

function selectedNodes() {
    return state ? state.nodes.filter(n => selection.has(n.id)) : [];
}
function onlySelectedNode() {
    return selection.size === 1 ? nodeById([...selection][0]) : null;
}
function setSelection(ids) {
    selection = new Set(ids.map(Number));
    selectedEdge = null;
    syncSelectionClasses();
    updateSelectionBar();
    scheduleEdges();
}
function selectNode(id, additive = false) {
    const n = Number(id);
    if (additive) {
        // Shift-click toggles a single node in or out of the selection.
        if (selection.has(n)) selection.delete(n); else selection.add(n);
        selectedEdge = null;
        syncSelectionClasses();
        updateSelectionBar();
        scheduleEdges();
        return;
    }
    setSelection([n]);
}
function selectEdge(id) {
    selection.clear();
    selectedEdge = id;
    syncSelectionClasses();
    updateSelectionBar();
    scheduleEdges();
}
function clearSelection() {
    if (!selection.size && !selectedEdge) return;
    selection.clear();
    selectedEdge = null;
    syncSelectionClasses();
    updateSelectionBar();
    scheduleEdges();
}
function syncSelectionClasses() {
    for (const el of $$(".node", nodesLayer)) {
        el.classList.toggle("selected", selection.has(Number(el.dataset.id)));
    }
}

function removeEdge(id) {
    const before = state.edges.length;
    state.edges = state.edges.filter(e => e.id !== id);
    if (state.edges.length === before) return;
    if (selectedEdge === id) selectedEdge = null;
    renderAllNodes();
    onGraphEdited();
}

function connectEdge(fromId, toId, toPort, fromPort = "out") {
    if (!fromId || !toId || fromId === toId) {
        if (fromId === toId) toast("A node cannot feed directly into itself.", "error");
        return;
    }
    const toNode = nodeById(toId);
    if (!toNode) return;
    if (!nodeInPorts(toNode).includes(toPort)) {
        toast("That port cannot take a wire.", "error");
        return;
    }
    if (toPort.startsWith("arg:")) {
        const idx = Number(toPort.slice(4));
        const arg = OPS[toNode.op]?.args?.[idx];
        if (!arg || !argTypeWirable(arg.type)) { toast("That argument cannot be wired.", "error"); return; }
    }
    state.edges = state.edges.filter(e => !(e.to === toId && e.toPort === toPort));
    state.edges.push({id: "e" + (edgeSeq++), from: fromId, to: toId, toPort, fromPort: fromPort || "out"});
    renderAllNodes();
    onGraphEdited();
}

function removeChipEdge(id) {
    removeEdge(id);
}

/* ================================================================ clipboard
 * Copy takes the selected nodes and every wire that runs between them. The same JSON also
 * goes to the system clipboard, so a fragment can be pasted into a chat or another tab —
 * and a fragment produced anywhere can be pasted back in as nodes.
 */
const CLIP_KEY = "cipherflow.clipboard.v1";
let clipboard = null;
let pasteSteps = 0;

// Filled in with the function blocks below: a copied fragment carries the definitions its
// instances depend on, so it still runs wherever it is pasted.
function functionDefsForNodes() { return []; }
function adoptFunctionDefs() {}

function selectionFragment() {
    const picked = new Set([...selection]);
    if (!picked.size) return null;
    const nodes = state.nodes.filter(n => picked.has(n.id));
    if (!nodes.length) return null;
    return {
        app: "CipherFlow",
        kind: "fragment",
        version: 1,
        nodes: nodes.map(cleanNodeForSave),
        edges: state.edges
            .filter(e => picked.has(e.from) && picked.has(e.to))
            .map(e => ({id: e.id, from: e.from, to: e.to, toPort: e.toPort, fromPort: e.fromPort || "out"})),
        functions: functionDefsForNodes(nodes)
    };
}

function copySelection({cut = false} = {}) {
    const fragment = selectionFragment();
    if (!fragment) {
        toast("Select a node to copy first.", "error");
        return null;
    }
    clipboard = fragment;
    pasteSteps = 0;
    try { localStorage.setItem(CLIP_KEY, JSON.stringify(fragment)); } catch {}
    // Best effort — a blocked clipboard still leaves the in-app copy working.
    copyText(JSON.stringify(fragment, null, 2));
    if (cut) deleteSelectedNodes();
    else toast(`Copied ${fragment.nodes.length} node${fragment.nodes.length === 1 ? "" : "s"}`);
    return fragment;
}

function validFragment(data) {
    return data && Array.isArray(data.nodes) && data.nodes.length ? data : null;
}

// The in-app copy is checked first, then the copy saved with the page, then whatever else
// is on the system clipboard — which is how a fragment from another tab comes in.
async function fragmentForPaste() {
    const local = validFragment(clipboard);
    if (local) return local;
    try {
        const stored = validFragment(JSON.parse(localStorage.getItem(CLIP_KEY) || "null"));
        if (stored) return stored;
    } catch {}
    try {
        return validFragment(JSON.parse(await navigator.clipboard.readText()));
    } catch {
        return null;
    }
}

async function pasteClipboard() {
    const fragment = await fragmentForPaste();
    if (!fragment) {
        toast("Nothing to paste — copy a node or a graph fragment first.", "error");
        return;
    }
    // Land the fragment at the pointer when it is over the canvas, otherwise step each
    // paste down and right so repeated pastes do not stack on one another.
    const at = hitStage(evClient.x, evClient.y) ? screenToWorld(evClient.x, evClient.y) : null;
    pasteFragment(fragment, at);
}

function pasteFragment(fragment, at) {
    const idMap = new Map();
    const placed = [];
    for (const raw of fragment.nodes || []) {
        const node = nodeFromRaw(raw, {freshIds: true});
        if (!node) continue;
        idMap.set(Number(raw.id), node.id);
        placed.push(node);
    }
    if (!placed.length) {
        toast("That fragment had nothing this graph understands.", "error");
        return;
    }
    const dx = at ? Math.round(at.x - Math.min(...placed.map(n => n.x))) : (pasteSteps++) * 26;
    const dy = at ? Math.round(at.y - Math.min(...placed.map(n => n.y))) : (pasteSteps++ - 1) * 26;
    for (const n of placed) {
        n.x = Math.round(n.x + dx);
        n.y = Math.round(n.y + dy);
    }
    const edges = [];
    for (const raw of fragment.edges || []) {
        const from = idMap.get(Number(raw.from));
        const to = idMap.get(Number(raw.to));
        if (!from || !to) continue;
        edges.push({id: "e" + (edgeSeq++), from, to, toPort: String(raw.toPort), fromPort: String(raw.fromPort || "out")});
    }
    adoptFunctionDefs(fragment.functions || []);
    state.nodes.push(...placed);
    state.edges.push(...edges);
    setSelection(placed.map(n => n.id));
    renderAllNodes();
    onGraphEdited(true);
    toast(`Pasted ${placed.length} node${placed.length === 1 ? "" : "s"}`);
}

/* ================================================================ connections dragging */
let connection = null;

function startConnectionFromOutput(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const port = ev.currentTarget;
    const node = port.closest(".node");
    if (!node) return;
    // Which output port the wire leaves from travels with the drag, so a function with
    // several outputs keeps them apart.
    beginConnection({fromId: Number(node.dataset.id), fromPort: port.dataset.port || "out"}, port);
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
                connectEdge(c.fromId, targetId, target.dataset.port, c.fromPort || "out");
            } else if (c.fromId === null && target.classList.contains("out")) {
                connectEdge(targetId, c.toId, c.toPort, target.dataset.port || "out");
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
// Dragging a node carries the whole selection with it, so a group move keeps the graph's
// shape intact instead of rearranging the wires one node at a time.
function startNodeDrag(node, ev) {
    const el = nodeEl(node.id);
    if (!el) return;
    // One undo step per drag: the pending snapshot would otherwise capture a mid-drag
    // position and split the gesture into two.
    clearTimeout(historyTimer);
    const startX = ev.clientX, startY = ev.clientY;
    const moving = selection.has(node.id) && selection.size > 1 ? selectedNodes() : [node];
    const origins = moving.map(n => ({node: n, el: nodeEl(n.id), x: n.x, y: n.y}));
    let moved = false;
    for (const o of origins) if (o.el) o.el.style.zIndex = "5";
    const move = e => {
        const dx = (e.clientX - startX) / state.view.zoom;
        const dy = (e.clientY - startY) / state.view.zoom;
        if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
        for (const o of origins) {
            o.node.x = Math.round(o.x + dx);
            o.node.y = Math.round(o.y + dy);
            if (o.el) {
                o.el.style.left = o.node.x + "px";
                o.el.style.top = o.node.y + "px";
            }
        }
        scheduleEdges();
    };
    const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up, {once: true});
        for (const o of origins) if (o.el) o.el.style.zIndex = "";
        if (moved) { saveLocalSoon(); scheduleEdges(); pushHistory(); }
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
    clearTimeout(historyTimer);
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
        pushHistory();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, {once: true});
}

/* Marquee selection: shift-drag on the empty canvas gathers every node the box touches.
 * It lives in screen space and tests nodes in world space, so it stays correct at any
 * zoom and never fights the pan handler for the same gesture. */
let marqueeEl = null;
function marqueeBox() {
    if (!marqueeEl || marqueeEl.parentElement !== stage) {
        marqueeEl?.remove();
        marqueeEl = document.createElement("div");
        marqueeEl.className = "marquee";
        marqueeEl.hidden = true;
        stage.appendChild(marqueeEl);
    }
    return marqueeEl;
}
function startMarquee(ev) {
    ev.preventDefault();
    const box = marqueeBox();
    const rect = stage.getBoundingClientRect();
    const startX = ev.clientX - rect.left, startY = ev.clientY - rect.top;
    // A shift-drag started on top of a selection adds to it; elsewhere it starts fresh.
    const base = ev.shiftKey && selection.size ? new Set(selection) : new Set();
    box.hidden = false;
    const draw = (x, y) => {
        box.style.left = Math.min(startX, x) + "px";
        box.style.top = Math.min(startY, y) + "px";
        box.style.width = Math.abs(x - startX) + "px";
        box.style.height = Math.abs(y - startY) + "px";
    };
    draw(startX, startY);
    const move = e => {
        draw(e.clientX - rect.left, e.clientY - rect.top);
        const a = screenToWorld(rect.left + startX, rect.top + startY);
        const b = screenToWorld(e.clientX, e.clientY);
        const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
        const hits = [];
        for (const node of state.nodes) {
            const el = nodeEl(node.id);
            const w = el?.offsetWidth || 300, h = el?.offsetHeight || 160;
            if (node.x + w < minX || node.x > maxX || node.y + h < minY || node.y > maxY) continue;
            hits.push(node.id);
        }
        setSelection([...base, ...hits]);
    };
    const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up, {once: true});
        box.hidden = true;
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, {once: true});
}

/* The selection bar: what is selected, and the things you can do with it. */
let selBar = null;
function selectionBar() {
    if (!selBar || selBar.parentElement !== stage) {
        selBar?.remove();
        selBar = document.createElement("div");
        selBar.className = "selection-bar";
        selBar.hidden = true;
        selBar.addEventListener("click", ev => {
            const btn = ev.target.closest("[data-sel-action]");
            if (!btn) return;
            ev.stopPropagation();
            const action = btn.dataset.selAction;
            if (action === "copy") copySelection();
            else if (action === "delete") deleteSelectedNodes();
            else if (action === "fn") createFunctionFromSelection();
        });
        stage.appendChild(selBar);
    }
    return selBar;
}
function updateSelectionBar() {
    const bar = selectionBar();
    if (!selection.size) {
        bar.hidden = true;
        bar.innerHTML = "";
        return;
    }
    bar.hidden = false;
    const nodes = selectedNodes();
    // Grouping into a function is a graph action, so it is not offered from inside one.
    const canGroup = !editingFunctionId && nodes.length > 0 && typeof createFunctionFromSelection === "function";
    bar.innerHTML = `
        <span class="sel-count">${selection.size} node${selection.size === 1 ? "" : "s"} selected</span>
        <button class="sel-btn" data-sel-action="copy" title="Copy the selection (Ctrl+C)">${iconFill("copy")} Copy</button>
        ${canGroup ? `<button class="sel-btn" data-sel-action="fn" title="Move the selection into a new function">${iconFill("flask")} Function</button>` : ""}
        <button class="sel-btn" data-sel-action="delete" title="Delete the selection (Delete)">${iconFill("trash")} Delete</button>
    `;
}

function startPan(ev) {
    if (ev.button !== 0) return;
    const el = ev.target;
    if (el.closest(".node") || el.closest(".port") || el.closest(".toolbar") || el.closest(".marquee") ||
        el.closest(".selection-bar") || el.closest(".stage-controls") || el.closest(".run-status") || el.closest(".edge-group")) return;
    // Shift on empty canvas is the marquee gesture, not a pan.
    if (ev.shiftKey) { startMarquee(ev); return; }
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
        else if (selection.size || selectedEdge) clearSelection();
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
    // A node with several outputs — a function instance, or a definition's input node —
    // hands out a different value on each port; every other node has the one.
    if (r.portOutputs) {
        const key = e.fromPort || "out";
        return {bytes: r.portOutputs.get(key) || new Uint8Array(0), error: "", sig: (r.sig || "0") + ":" + key, source: e.from};
    }
    return {bytes: r.bytes || new Uint8Array(0), error: "", sig: r.sig || "0", source: e.from};
}

/* ------------------------------------------------------------ running a function */
// A definition's worth of nodes, copied so a run never disturbs the ones the editor is
// showing. The copy uses its own small id range, so it cannot be confused with the graph.
function cloneDefinitionGraph(def) {
    const idMap = new Map();
    const nodes = [];
    let k = 0;
    for (const raw of def.nodes || []) {
        const made = nodeFromRaw(cleanNodeForSave(raw), {localId: ++k});
        if (!made) continue;
        idMap.set(raw.id, made.id);
        nodes.push(made);
    }
    const edges = [];
    let m = 0;
    for (const e of def.edges || []) {
        const from = idMap.get(e.from);
        const to = idMap.get(e.to);
        if (!from || !to) continue;
        edges.push({id: "e" + (++m), from, to, toPort: e.toPort, fromPort: e.fromPort || "out"});
    }
    return {nodes, edges};
}

// What a definition's content looks like, for the instance signature: editing the body or
// renaming a port has to re-run every instance, while moving nodes around must not.
function definitionStamp(def) {
    if (!def) return "missing";
    return sigHash(JSON.stringify([
        Boolean(def.continueOnError),
        (def.nodes || []).map(n => {
            const {x, y, w, h, collapsed, previewMode, ...rest} = cleanNodeForSave(n);
            return rest;
        }),
        (def.edges || []).map(e => [e.from, e.to, e.toPort, e.fromPort || "out"])
    ]));
}

// What a Function Input port hands the body, in order of who wins:
//  1. the value the instance supplied — its wire, or a value typed on the instance;
//  2. a value piped into the port's sample port from a node in the body;
//  3. the sample itself, as text typed in the row or a file attached to it.
// Steps 2 and 3 are the definition's default, which is what an instance falls back to.
function fninPortBytes(node, index, seedPorts, piped) {
    const seed = seedPorts ? seedPorts.get("out:" + index) : null;
    if (seed) return seed;
    if (piped != null) return piped;
    const port = (node.ports || [])[index] || {sample: "", encoding: "utf8"};
    if (port.sampleMode === "file" && port.sampleFileData) return b64ToBytes(port.sampleFileData);
    return textBytes(port.sample || "", port.encoding || "utf8");
}

// Run a function body for one instance and hand back what arrived at its output node.
async function runFunctionDefinition(def, instance, incoming, results, opts = {}) {
    // A definition set to keep going hands each failure down the wire as its message, so the
    // rest of the body runs and the instance reports how many there were.
    const continueOnError = Boolean(def.continueOnError);
    const ports = functionPorts(def);
    const seedPorts = new Map();
    for (let i = 0; i < ports.inputs.length; i++) {
        const key = "fn:" + i;
        const src = sourceBytesForPort(incoming, instance.id, key, results);
        if (src.error) return {error: "Upstream error: " + src.error, portOutputs: new Map()};
        if (src.bytes) seedPorts.set("out:" + i, src.bytes);
        // Nothing on the wire: a value typed on the instance wins over the definition's test
        // sample. An empty box is not an override — it falls back to the sample, which is
        // what the box shows as its default, so what you see is always what runs.
        else if (ports.inputs[i].typed && instance.typedInputs?.[key]) {
            seedPorts.set("out:" + i, enc.encode(instance.typedInputs[key]));
        }
    }
    const clone = cloneDefinitionGraph(def);
    const inner = await executeGraph(clone.nodes, clone.edges, {
        force: true,
        timeout: opts.timeout,
        seedPorts,
        continueOnError,
        fnStack: [...(opts.fnStack || []), def.id]
    });
    const sink = clone.nodes.find(n => n.type === "fnout");
    const portOutputs = new Map();
    for (const [key, bytes] of sink?._portOutputs || []) portOutputs.set("out:" + key.slice(3), bytes);
    return {error: inner.errors[0]?.error || "", portOutputs, softErrors: inner.softErrors?.length || 0};
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
        values[i] = wireArgValue(arg, src.bytes);
    }
    return {values: args.map((arg, i) => normalizeArgForRecipe(arg, values[i])), upstreamError, sigs};
}

// Read one argument's value out of the bytes arriving on its wire. Text-ish arguments take
// the bytes as text; a number is parsed; a switch reads as on/off; a dropdown is matched
// against its own options (by value or by label) so a wire can pick a mode as well as
// supply a key. Anything that matches nothing is handed over as the raw text.
function wireArgValue(arg, bytes) {
    const text = utf8(bytes);
    switch (arg.type) {
        case "number": {
            const n = Number(text.trim());
            return Number.isFinite(n) ? n : 0;
        }
        case "boolean": {
            const v = text.trim().toLowerCase();
            return !(v === "" || v === "0" || v === "false" || v === "no" || v === "off" || v === "disabled");
        }
        case "toggleString":
            return {string: bytesToHex(bytes), option: "Hex"};
        case "option":
        case "argSelector":
        case "editableOption":
        case "editableOptionShort":
        case "populateOption": {
            const wanted = text.trim().toLowerCase();
            for (const opt of Array.isArray(arg.value) ? arg.value : []) {
                const value = typeof opt === "object" ? (opt.value ?? opt.name) : opt;
                const label = typeof opt === "object" ? (opt.name ?? opt.value) : opt;
                if (String(value).toLowerCase() === wanted || String(label).toLowerCase() === wanted) {
                    return String(arg.type === "argSelector" ? label : value);
                }
            }
            return text;
        }
        default:
            return text;
    }
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

function inputSignature(node, incoming, results, opts) {
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
    if (node.type === "fnin") {
        // A piped sample changes what the body receives, so its wire is part of the
        // signature; without this the node would keep handing out the value it cached.
        const parts = (node.ports || []).map((p, i) => {
            const seed = opts?.seedPorts?.get("out:" + i);
            if (seed) return "out:" + i + ":p" + fnvBytes(seed);
            const fed = sourceBytesForPort(incoming, node.id, "sample:" + i, results);
            return "out:" + i + ":" + (fed.bytes != null ? "w" + fed.sig : "s" + fnvBytes(fninPortBytes(node, i, null)));
        });
        return JSON.stringify(["fnin", parts]);
    }
    if (node.type === "fnout") {
        const parts = [];
        for (let i = 0; i < (node.ports || []).length; i++) {
            parts.push("in:" + i + "=" + sourceBytesForPort(incoming, node.id, "in:" + i, results).sig);
        }
        return JSON.stringify(["fnout", parts]);
    }
    if (node.type === "fn") {
        const ports = instancePorts(node).inputs.map(p => p.key + "=" + sourceBytesForPort(incoming, node.id, p.key, results).sig);
        return JSON.stringify(["fn", node.fnId, definitionStamp(functionById(node.fnId)), node.portPick || 0, ports, node.typedInputs || null]);
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
    // Every casing, spelling and accent of the input: 2^n entries, so a 60-character input
    // is a 24-second wait inside the worker and a wall of near-duplicates after it.
    "Get All Casings",
    "Play Media", "Syntax highlighter", "Generate Lorem Ipsum", "Generate HOTP",
    "Generate TOTP", "Generate UUID", "Generate Image", "Generate QR Code",
    "Generate Barcode", "Magic"
]);

const MAGIC_COMMON_WORDS = new Set("the and for you that with this from have not are was but all can her his one our out day get has him its new now old see two way who did let put say she too use man men world time year people days thing part place work week case point number group problem fact attack dawn secret code cipher hello world test flag message data key text meet bridge midnight eagle lands land north south east west left right door open close under over inside outside house room water fire earth air light dark night morning evening today tomorrow yesterday friend friends family mother father sister brother home school money food game play read write speak listen start stop begin end first last next many much more most some any every each other another same different good bad great small large long short high low young early late real sure free full able best better please thanks thank sorry yes answer question story book page word words letter letters name names place places city town country road street river mountain sea boat ship train car plane walk run jump sit stand sleep wake eat drink buy sell give take find think know want need like love hate help show tell ask call wait try turn keep hold bring look feel seem leave move live believe hope wish plan idea team order line list side top bottom front back hour minute second week month year always never often sometimes maybe perhaps really very quite just only even also still yet about above across after against along among around before behind below beside between beyond during except inside into near since through toward under until upon within without would could should might must shall will may does did done being been having had has".split(/\s+/));

// Everyday English beyond the list above, in blocks so it stays readable. Scoring only asks
// whether a word is in the set, so a word repeated above costs nothing.
const MAGIC_MORE_WORDS = [
    "about above across act add after again against age ago agree air allow almost alone along already although always among amount another anyone anything appear apply area argue army around arrive art article ask away baby back bad bag ball bank bar base beat beautiful become bed before behind believe below beyond bill bit black blood blue board body born both box boy break bring brother build burn business call camera capital card care carry catch cause cell center century certain chair chance change charge child choice choose church city civil claim class clear close coach cold college color come common company compare computer concern condition conference consider consumer contain continue cost country couple course court cover create crime culture cup current customer cut dark",
    "daughter dead deal death debate decade decide decision deep defense degree describe design despite detail determine develop difference difficult dinner direction director discover discuss disease doctor dog down draw dream drive drop drug during early east easy eat economic edge education effect effort eight either election else employee energy enjoy enough enter entire environment especially establish evening event ever everyone everything evidence exactly example experience explain eye face fact factor fail fall family far fast father fear federal feeling few field fight figure fill film final finally financial find fine finger finish fire firm fish five floor fly focus follow food foot force foreign forget form former forward four free friend front full fund future",
    "game garden general generation girl give glass goal good government great green ground grow growth guess gun guy hair half hand hang happen happy hard head health hear heart heat heavy help herself high himself history hit hold home hope hospital hot hotel hour house however huge human hundred husband idea identify image imagine impact important improve include increase indeed individual industry information inside instead institution interest international interview investment involve issue itself job join keep kid kill kind kitchen know knowledge land language large last late later laugh law lawyer lead leader learn least leave leg legal less letter level lie life light likely line little live local long lose loss love low machine main maintain major manage manager many market material matter maybe mean measure media medical meeting member memory mention method middle might million mind minute miss mission model modern moment money month morning mother mouth move movement movie much music myself",
    "name nation national natural nature near nearly necessary need network never news newspaper next nice night none north note nothing notice number occur offer office officer official often once only open operation opportunity option order organization other outside owner page pain painting paper parent part particular partner party pass past patient pattern pay peace people perfect perform perhaps period person personal phone physical pick picture piece place plan plant play player point police policy political poor popular population position possible power practice prepare present president pressure pretty prevent price private probably problem process produce product program project property protect prove provide public pull purpose push put quality question quickly quite race radio raise range rate rather reach ready real reality realize reason receive recent recently recognize record reduce reflect region relate relationship religious remain remember remove report represent require research resource respond response rest result return reveal rich right rise risk road rock role room rule safe same save scene school science score sea season seat second section security seek seem sell send senior sense series serious serve service set seven several shake share she shoot short shoulder show side sign significant similar simple simply since sing single sister sit site situation six size skill skin small smile social society soldier somebody someone something sometimes son song soon sort sound source south space speak special specific speech spend sport spring staff stage stand standard star start state statement station stay step still stock stop store story strategy street strong structure student study stuff style subject success such suddenly suffer suggest summer support sure surface system",
    "table take talk task tax teach teacher team technology television tell ten tend term test than thank themselves theory there these they thing think third those though thought thousand threat three through throughout throw thus time today together tonight too top total tough toward town trade traditional training travel treat treatment tree trial trip trouble true truth try turn two type under understand unit until upon us usually value various very victim view violence visit voice vote wait walk wall want war watch water way weapon wear week weight well west whatever when where whether which while white whole whom whose why wide wife win wind window wish within without woman wonder word work worker world worry would write writer wrong yard year yes yet young yourself",
    "quick brown fox jumps lazy cat hat bat rat sat ran sun moon sky bird leaf leaves grass hill river ocean stone gold silver copper iron steel sword shield castle king queen prince princess magic spell witch wizard dragon knight horse lock hidden find search look secret message cipher attack dawn midnight eagle lands bridge meet enemy battle fight peace love hate fear hope dream night light fire earth air storm rain snow cloud",
    "password passphrase hunter admin administrator login logout account access granted denied allowed forbidden permission privileges root sudo terminal command script payload exploit vulnerability secure insecure encryption decryption encrypted decrypted ciphertext plaintext hash salt digest signature certificate token session cookie server client database query table column record field value buffer overflow stack heap memory pointer address register kernel process thread socket packet protocol header footer checksum verify verified correct incorrect true false hidden visible reveal answer question solve solved puzzle challenge score vault safe code combination unlocked locked sealed welcome goodbye congratulations success failure warning alert notice info debug trace clue hint riddle mystery treasure map compass treasure hunt"
].join(" ").split(/\s+/);
for (const word of MAGIC_MORE_WORDS) MAGIC_COMMON_WORDS.add(word);

// Words that describe an operation rather than a message: a result built out of these is
// a warning or a parameter list, not the plaintext a sweep is looking for.
const MAGIC_TECH_WORDS = new Set("key keys byte bytes header headers input output data file files operation operations valid invalid character characters check checks error errors unsupported requires required expected parameter parameters argument arguments format formats decode encode cipher ciphers sample samples modify setting settings option options type types length size mode padding alphabet stream block blocks offset range bit bits row rows column columns index indices parse parsed delimiter separator terminator encoding".split(/\s+/));
const MAGIC_BIGRAMS = ["th", "he", "in", "er", "an", "re", "on", "at", "en", "nd", "ti", "es", "or", "te", "of", "ed", "is", "it", "al", "ar", "st", "to", "nt", "ng", "se", "ha", "as", "ou", "io", "le", "ve", "co", "me", "de"];
const EN_FREQ = {A: 8.167, B: 1.492, C: 2.782, D: 4.253, E: 12.702, F: 2.228, G: 2.015, H: 6.094, I: 6.966, J: 0.153, K: 0.772, L: 4.025, M: 2.406, N: 6.749, O: 7.507, P: 1.929, Q: 0.095, R: 5.987, S: 6.327, T: 9.056, U: 2.758, V: 0.978, W: 2.360, X: 0.150, Y: 1.974, Z: 0.074};

/* How English a letter mix is, as 0-1. This is the mean surprise of the letters actually
 * present, measured against English frequencies — not a cosine of two histograms. A cosine
 * flatters short strings (a run that happens to avoid rare letters looks close to English),
 * while surprise charges for every rare letter: real prose costs about 4.2 bits per letter,
 * J/Q/X/Z-heavy ciphertext costs far more. */
function monogramScore(text) {
    const counts = Object.create(null);
    let letters = 0;
    for (const ch of text.toUpperCase()) {
        if (ch >= "A" && ch <= "Z") {
            counts[ch] = (counts[ch] || 0) + 1;
            letters++;
        }
    }
    if (letters < 3) return 0;
    let bits = 0;
    for (let i = 0; i < 26; i++) {
        const ch = String.fromCharCode(65 + i);
        const seen = counts[ch] || 0;
        if (!seen) continue;
        bits -= (seen / letters) * Math.log2(EN_FREQ[ch] / 100);
    }
    // Prose averages 4.0-4.5 bits per letter over a paragraph, but a short sentence that
    // mentions a quiet fox costs 5.2, and a Caesar shift of the same sentence costs 6.1. So
    // this stays a corroborating signal with a low weight, mapped over the range that
    // actually shows up in results rather than trusted as a discriminator on its own.
    return clamp(1 - (bits - 4.4) / 1.4, 0, 1);
}

// Words as a reader would see them: runs of letters, so a cipher string is one "word".
const MAGIC_WORD = /[A-Za-z][A-Za-z']*/g;

/* Whether letters are grouped the way language groups them. English words average about
 * 4.7 letters and are separated by spaces; a 16-letter run with no break is ciphertext or
 * an encoded blob, whatever its letters look like. This is the signal a histogram cannot
 * give, and it is what separates a decoded sentence from random-looking encoder output. */
function wordShapeScore(tokens, spaces, total) {
    if (!tokens.length) return 0;
    const letters = tokens.reduce((sum, token) => sum + token.length, 0);
    const average = letters / tokens.length;
    const lengthFit = clamp(1 - Math.abs(average - 4.7) / 6.5, 0, 1);
    const longRuns = tokens.filter(token => token.length > 13).length;
    // One word carries no boundary evidence at all: fine for a short answer, weak for a long one.
    const boundary = tokens.length >= 2
        ? clamp((spaces / Math.max(1, total)) / 0.09, 0, 1)
        : (total <= 10 ? 0.6 : 0.2);
    return clamp(lengthFit * (0.45 + 0.55 * boundary) - longRuns * 0.3, 0, 1);
}

/* Whether a token is a word a reader would know. A dictionary of base forms still has to
 * recognise the inflections that carry a sentence — "dogs", "jumped", "quickly" — or a
 * perfectly good decode gets dismissed as gibberish for no reason but a missing "s". */
function magicKnownWord(token) {
    const word = String(token).toLowerCase().replace(/['\u2019]s$/, "");
    if (word.length < 2) return false;
    if (MAGIC_COMMON_WORDS.has(word)) return true;
    const stems = [
        word.replace(/ies$/, "y"),
        word.replace(/es$/, ""), word.replace(/s$/, ""),
        word.replace(/ed$/, ""), word.replace(/ed$/, "e"),
        word.replace(/ing$/, ""), word.replace(/ing$/, "e"),
        word.replace(/ly$/, ""), word.replace(/er$/, ""), word.replace(/est$/, ""),
        word.replace(/([b-df-hj-np-tv-z])\1(?:ed|ing|er|est)$/, "$1")
    ];
    return stems.some(stem => stem.length >= 2 && MAGIC_COMMON_WORDS.has(stem));
}

// The share of words that are real English. This is the strongest single signal there is.
function wordEvidenceScore(tokens) {
    if (!tokens.length) return 0;
    let evidence = 0;
    for (const token of tokens) {
        if (magicKnownWord(token)) evidence += token.length >= 4 ? 1 : 0.75;
        else if (MAGIC_TECH_WORDS.has(token.toLowerCase())) evidence += 0.05;
        // A run of letters that is not a word anywhere is not neutral: "Hello, Puwld!" is a
        // substitution that half worked, and it has to read worse than "Hello, World!"
        // rather than the same. Proper nouns pay this too, so it stays small.
        else if (token.length >= 3) evidence -= 0.35;
    }
    return clamp(evidence / tokens.length, 0, 1);
}

// What an operation does to its input: reveals it, presents it another way, or neither.
// A sweep hunting for a hidden message should rank a decoder over an encoder, because an
// encoder can only ever show the same bytes spelled differently.
function magicOpClass(name) {
    const op = String(name || "");
    if (/^(from|un|de)/i.test(op) || /(decod|decrypt|decompress|unescape|extract|brute)/i.test(op)) return "decode";
    if (/^(to |convert to )/i.test(op) || /(encod|encrypt|compress|escape)/i.test(op) || /^generate /i.test(op)) return "encode";
    return "other";
}

// Does a JSON document carry prose, or only the numbers and hex a parser reports back?
// `{ "marker": 85 }` is a parser talking about its input, not a message behind it.
function jsonCarriesProse(text) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        return false;
    }
    const strings = [];
    const walk = value => {
        if (typeof value === "string") strings.push(value);
        else if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === "object") Object.values(value).forEach(walk);
    };
    walk(parsed);
    return strings.some(str => {
        const words = (str.match(MAGIC_WORD) || []).filter(w => w.length >= 3 && MAGIC_COMMON_WORDS.has(w.toLowerCase()));
        return words.length >= 2;
    });
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
const MAGIC_MESSAGE_START = /^(error|sorry|invalid|unknown|cannot|can't|could not|couldn't|unable|failed|malformed|unsupported|no valid|no matches|nothing|you can only|you need|you must|must supply|please|enter |insert |try |unexpected|this operation|incorrect|expected|not |requires?|missing|input|output|the input|the output|the key|the data|the file)\b/i;
// Phrasing that is only ever an operation talking, so it is rejected at any length — a unit
// list can run to a thousand characters of perfectly good English and still be a complaint.
const MAGIC_MESSAGE_ANY = /\b(one of the following|must be one of|is not a valid|not a valid|does not appear to be|must in the format|invalid key length|invalid nonce length|no key (entered|provided)|exceeds the maximum|must be at least|must be at most|must be less than|is not supported|could not be decoded|cannot be decoded|failed to decode)\b/i;
const MAGIC_MESSAGE_PHRASE = /\b(does not|doesn't|do not|is not in|is not a\b|is not an\b|are not|was not|must be|must in\b|must contain|must match|appear to be|appears to be|not a valid|is not valid|not enough|need at least|need \d+ (bytes|bits|characters|arguments?)|could not|cannot|can't|unable to|failed to|must supply|must use|each row|out of range|too small|too large|please (enter|provide|specify|supply)|is required|are required|is unsupported|not supported|no match|no key|no input|no data|no valid|invalid|unsupported|malformed|truncated|overflow|underflow|ambiguous|not found|unknown|missing|unexpected|0 bytes|\d+ bytes long)\b/i;

// A labelled record ("Date: …", "Path name: …", "Source MAC: …") is a parser's report
// about the input, not a message behind it.
const MAGIC_LABEL_PREFIX = /^([A-Z][A-Za-z0-9 _-]{1,28}):\s/;
const MAGIC_LABEL_WORDS = /\b(date|time|browser|version|path|name|source|destination|type|length|size|checksum|mode|encoding|format|marker|offset|address|protocol|port|flags|status|user|host|scheme|query|fragment|header|score|scores|keyword|keywords|index|position|count|result|results|output|input|line|column|key|value|values|number|numbers)\b/i;

/* How good a result looks. The score is a 0-100 quality measure instead of a pile of
 * bonuses, so a short clean sentence can beat a long artefact: 38% of it is legibility
 * (how much of the text is letters and spaces) and 62% is how English it reads (letter
 * frequencies, common bigrams, dictionary words). */
/* How much each piece of evidence counts, in one place so the ranking can be read and
 * adjusted as a whole instead of hunting numbers through the function below. */
const MAGIC_WEIGHTS = {
    readable: 0.14,   // share of characters a reader can see
    monogram: 0.08,   // letter mix against English frequencies
    bigram: 0.18,     // density of common English letter pairs
    words: 0.34,      // share of tokens that are real words
    shape: 0.20,      // letters grouped into word-sized runs with spaces between
    structure: 0.06   // sentence punctuation and capitalisation
};

function scoreMagicResult(text, inputText, opName = "") {
    const notes = [];
    if (!text) return {score: -999, notes: ["empty"]};
    if (text === inputText) return {score: -500, notes: ["unchanged"]};
    // A case change, an added line number, a stripped punctuation mark: the same letters,
    // rearranged by presentation rather than revealed. Scoring those as findings is how a
    // sweep ends up recommending "To Upper case".
    if (inputText) {
        const bare = value => value.toLowerCase().replace(/[^a-z]/g, "");
        const mine = bare(text), theirs = bare(inputText);
        if (mine.length >= 4 && mine === theirs) return {score: -500, notes: ["same letters"]};
    }
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
    // An operation's complaint ("Invalid key length: 0 bytes. AES uses a key of …") is a
    // full English sentence, so the statistics alone would rank it highly. The tell is how it
    // opens — an error names the thing it is objecting to — plus the stock phrasing of a
    // validation failure. Only short results get the phrase test, so a long decoded message
    // that happens to say "there is no key" is not mistaken for a warning.
    if (MAGIC_MESSAGE_START.test(trimmed) || MAGIC_MESSAGE_ANY.test(trimmed)
        || (trimmed.length < 600 && MAGIC_MESSAGE_PHRASE.test(trimmed.slice(0, 400)))) {
        return {score: -999, notes: ["message, not data"]};
    }
    // A slice of the input is not a finding: "Take bytes", "Strip IPv4 header", "Head" all
    // hand back a piece of what came in, and a piece of a cipher is still a cipher.
    if (inputText && text.length >= 2 && text.length < inputText.length && inputText.includes(text)) {
        return {score: -500, notes: ["slice of the input"]};
    }
    const label = MAGIC_LABEL_PREFIX.exec(trimmed);
    if (label && MAGIC_LABEL_WORDS.test(label[1])) {
        return {score: -999, notes: ["parsed record, not data"]};
    }
    const tokens = text.match(MAGIC_WORD) || [];
    const techWords = tokens.filter(word => MAGIC_TECH_WORDS.has(word.toLowerCase())).length;
    if (techWords >= 3 || (techWords >= 2 && techWords / Math.max(1, tokens.length) >= 0.4)) {
        return {score: -999, notes: ["message, not data"]};
    }

    const lower = text.toLowerCase();
    let bigramHits = 0;
    for (const bigram of MAGIC_BIGRAMS) {
        let at = -1;
        while ((at = lower.indexOf(bigram, at + 1)) >= 0) bigramHits++;
    }

    // Six independent signals, weighted, so no single lucky measurement can carry a result:
    // readable characters, an English letter mix, common letter pairs, real words, letters
    // grouped into words at all, and sentence shape.
    const readable = clamp(printable / total, 0, 1);
    const monogram = monogramScore(text);
    const bigramDensity = clamp(bigramHits / Math.max(6, letters) / 0.32, 0, 1);
    const words = wordEvidenceScore(tokens);
    const shape = wordShapeScore(tokens, spaces, total);
    const structure = clamp(
        (tokens.length >= 2 ? 0.4 : 0) +
        (tokens.length >= 2 && spaces >= tokens.length - 1 ? 0.2 : 0) +
        (/[.!?]/.test(trimmed) ? 0.2 : 0) +
        (/^[A-Z][a-z]/.test(trimmed) || /[.!?]\s+[A-Z]/.test(trimmed) ? 0.2 : 0), 0, 1);
    const digitPenalty = clamp(1 - (digits / Math.max(1, total)) * 1.8, 0, 1);

    let score = 100 * (
        MAGIC_WEIGHTS.readable * readable +
        MAGIC_WEIGHTS.monogram * monogram +
        MAGIC_WEIGHTS.bigram * bigramDensity +
        MAGIC_WEIGHTS.words * words +
        MAGIC_WEIGHTS.shape * shape +
        MAGIC_WEIGHTS.structure * structure
    ) * digitPenalty;

    // Real words are the strongest evidence, so longer dictionary words count more.
    const longWords = tokens.filter(word => word.length >= 4 && magicKnownWord(word)).length;
    score += Math.min(longWords * 4, 10);
    // Shouting is evidence only when it is several words: one long run of capitals is a
    // cipher string, not a headline.
    if (/^[A-Z ]{8,}$/.test(trimmed) && tokens.length >= 2) {
        score += 3;
        notes.push("uppercase text");
    }
    if (control > total * 0.1) score -= 60;
    if (printable / total < 0.75) score -= 120;
    // Random-looking bytes carry no message even when every character is printable.
    const entropy = shannonEntropy(text.slice(0, 400));
    if (entropy > 4.5) score -= (entropy - 4.5) * 12;

    // A JSON document is worth suggesting when it carries prose. One built only from
    // numbers, flags and hex is a parser reporting on its input, which is noise here.
    // A recognisable structure counts as evidence in its own right: a URL or a timestamp is
    // often the answer even when it holds no English word.
    let structural = false;
    if (trimmed.length >= 8 && /^[[{]/.test(trimmed)) {
        if (!jsonCarriesProse(text)) return {score: -999, notes: ["parsed record, not data"]};
        score += 8;
        structural = true;
        notes.push("JSON");
    }
    if (/^https?:\/\/[^\s]+$/i.test(trimmed)) { score += 10; structural = true; notes.push("URL"); }
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(trimmed)) { score += 10; structural = true; notes.push("email"); }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) { score += 10; structural = true; notes.push("IPv4 address"); }
    if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?Z?$/.test(trimmed)) { score += 10; structural = true; notes.push("timestamp"); }

    // A result much longer than the input is usually a listing or an expansion — NATO
    // spelling, a brute-force table, an escaped dump — rather than a message that was
    // hiding in it. Capped, so a genuinely expanded decompression still ranks.
    if (inputText) {
        const expansion = total / Math.max(1, inputText.length);
        if (expansion > 1.5) score -= Math.min(30, 14 * Math.log2(expansion / 1.5));
    }
    // Encoders present the same bytes another way and can never reveal a message, so a
    // sweep that hunts for one ranks them below the decoders.
    if (magicOpClass(opName) === "encode") score -= 12;

    // Real words are what makes a result worth offering. Letters that contain not one English
    // word of three letters or more are a shape, not a message: "Rntsu, Bsune!" has perfect
    // word structure and letter frequencies and says nothing. Such a result cannot outrank
    // text that actually reads.
    const knownWords = tokens.filter(token => token.length >= 3 && magicKnownWord(token)).length;
    if (!knownWords) {
        score = Math.min(score, letters >= 12 ? 45 : 35);
        notes.push("no real words");
    } else if (knownWords >= 2) {
        notes.push(`${knownWords} real words`);
    }
    // A handful of characters cannot be a hidden message, whatever it happens to spell;
    // "NaN" and "08:30" were outranking real decodes on nothing but legibility.
    if (trimmed.length < 8) score = Math.min(score, 20);
    return {score, notes, knownWords, structural};
}

// ROT13 with another amount is a Caesar shift, and the amount is exactly the part its author
// picks. Sweeping 1-25 as well as the default is what lets Magic actually crack one, instead
// of only ever trying the 13 that happens to be the default.
function magicShiftVariants(name, meta) {
    if (name !== "ROT13") return [];
    const defaults = meta.defaults || [];
    const out = [];
    for (let amount = 1; amount <= 25; amount++) {
        if (amount === Number(defaults[3])) continue;
        out.push({op: name, args: [defaults[0], defaults[1], defaults[2], amount], label: `${name} (shift ${amount})`});
    }
    return out;
}

function magicCandidates(scope, includeSlow) {
    const loaded = engine.loadedModules();
    const out = [];
    for (const [name, meta] of Object.entries(OPS)) {
        if (meta.flowControl) continue;
        if (MAGIC_NOISE.has(name)) continue;
        // "… Brute Force" and Substitute print a table of every possibility. Magic is the
        // brute force here, and such a table is never the answer it is looking for.
        if (/brute.?force/i.test(name) || name === "Substitute") continue;
        if (!includeSlow && MAGIC_SKIP.has(name)) continue;
        if (scope === "Core module only" && meta.module !== "Default") continue;
        if (scope === "Loaded modules only" && !loaded.has(meta.module)) continue;
        out.push({op: name, args: meta.defaults || []});
        out.push(...magicShiftVariants(name, meta));
    }
    return out;
}

// A candidate has to read better than the input it came from to count as a find; anything
// that only presents the same bytes another way scores at or below it.
const MAGIC_MIN_GAIN = 2;

// The input's own quality, measured the same way as a result. An input that is itself noise
// (a message, markup) scores below zero there, and is treated as zero rather than handing
// every candidate a free pass.
function magicInputQuality(inputText) {
    const {score} = scoreMagicResult(inputText, "", "");
    return score > -400 ? score : 0;
}

function rankMagicResults(results, inputText) {
    const baseline = magicInputQuality(inputText);
    const best = new Map();
    for (const result of results) {
        if (!result.ok || !result.text) continue;
        const text = String(result.text);
        const {score, notes, knownWords, structural} = scoreMagicResult(text, inputText, result.op);
        if (score <= -400) continue;
        // Different operations routinely land on the same text — two base64 dialects, a decode
        // and its twin. One row per distinct result, keeping whichever scored highest.
        const key = text.trim().replace(/\s+/g, " ").toLowerCase();
        const row = {
            op: result.op,
            label: result.label || result.op,
            args: result.args || OPS[result.op]?.defaults || [],
            score,
            gain: score - baseline,
            notes,
            // A result with a real word, or a recognisable shape, is a finding. One with
            // neither is a shape that happens to look like language, so it only fills in
            // when there is nothing better to show.
            solid: knownWords > 0 || structural,
            ms: result.ms,
            preview: text.replace(/\s+/g, " ").slice(0, 120)
        };
        const seen = best.get(key);
        if (!seen || seen.score < score) best.set(key, row);
    }
    const ranked = [...best.values()].sort((a, b) => b.score - a.score || a.ms - b.ms);
    // Findings first: results that read better than their input and carry some evidence of
    // being language. Below them the runners-up still earn a place — a list that stops after
    // the two operations that happened to contain a dictionary word tells the user less than
    // one that also shows what came close. Scores stay honest, so the order is still visible.
    const findings = ranked.filter(row => row.solid && row.gain >= MAGIC_MIN_GAIN);
    const alsoRan = ranked.filter(row => !row.solid && row.gain >= MAGIC_MIN_GAIN);
    // Runners-up are worth listing only while they are close enough to be interesting; a 30
    // beside an 83 is noise with a rank number in front of it.
    const nearMisses = alsoRan.filter(row => row.score >= 30 && row.preview.length >= 10).slice(0, 6);
    const list = findings.length ? findings.concat(nearMisses) : alsoRan;
    return list.length ? list : ranked.slice(0, 6);
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
    // Failures a definition was told to carry on past: still recorded on their node, but they
    // do not stop the graph and do not block the nodes downstream of them.
    const softErrors = [];
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
                sig = sigHash(inputSignature(node, incoming, results, opts) + JSON.stringify(resolved.values));
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
                sig = sigHash(inputSignature(node, incoming, results, opts));
                if (!force && node._sig === sig && !error) { out = node._output; reused++; countIt = false; }
                else if (!error) {
                    // A piped input overrides the text typed into the node.
                    out = main.bytes != null ? main.bytes : inputNodeBytes(node);
                }
            } else if (node.type === "file") {
                sig = sigHash(inputSignature(node, incoming, results, opts));
                if (error) { /* upstream error already recorded */ }
                else if (main.bytes != null) {
                    if (!force && node._sig === sig) { out = node._output; reused++; countIt = false; }
                    else out = main.bytes;
                }
                else if (!node.fileData) error = "Choose a file (or pipe bytes in) for this node.";
                else if (!force && node._sig === sig) { out = node._output; reused++; countIt = false; }
                else out = b64ToBytes(node.fileData);
            } else if (node.type === "join") {
                sig = sigHash(inputSignature(node, incoming, results, opts));
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
            } else if (node.type === "fnin") {
                // Declares the function's inputs. One value per port, taking the top of this
                // order: the value wired into the instance, then a value piped into the
                // sample port from a node in the body, then the sample typed or attached.
                sig = sigHash(inputSignature(node, incoming, results, opts));
                if (!force && node._sig === sig && node._portOutputs) {
                    out = node._output;
                    reused++;
                    countIt = false;
                } else {
                    const outputs = new Map();
                    for (let i = 0; i < (node.ports || []).length; i++) {
                        const fed = sourceBytesForPort(incoming, node.id, "sample:" + i, results);
                        if (fed.error) { error = "Upstream error: " + fed.error; break; }
                        outputs.set("out:" + i, fninPortBytes(node, i, opts.seedPorts, fed.bytes));
                    }
                    if (!error) {
                        node._portOutputs = outputs;
                        out = outputs.get("out:0") || new Uint8Array(0);
                    }
                }
            } else if (node.type === "fnout") {
                // Collects what the body wired in: one value per declared output.
                sig = sigHash(inputSignature(node, incoming, results, opts));
                if (!force && node._sig === sig && node._portOutputs) {
                    out = node._output;
                    reused++;
                    countIt = false;
                } else {
                    const outputs = new Map();
                    for (let i = 0; i < (node.ports || []).length; i++) {
                        const src = sourceBytesForPort(incoming, node.id, "in:" + i, results);
                        if (src.error) { error = "Upstream error: " + src.error; break; }
                        outputs.set("in:" + i, src.bytes || new Uint8Array(0));
                    }
                    if (!error) {
                        node._portOutputs = outputs;
                        out = outputs.get("in:0") || null;
                    }
                }
            } else if (node.type === "fn") {
                // An instance: run the definition with the piped values and report what its
                // output node collected, one value per output port.
                sig = sigHash(inputSignature(node, incoming, results, opts));
                if (!force && node._sig === sig && !node._error && node._portOutputs) {
                    out = node._output;
                    reused++;
                    countIt = false;
                } else {
                    const def = functionById(node.fnId);
                    if (!def) {
                        node._fnErrors = 0;
                        error = "This graph has no function by that name — open a file that defines it.";
                    } else if ((opts.fnStack || []).includes(def.id)) {
                        node._fnErrors = 0;
                        error = `“${def.name}” cannot use itself.`;
                    } else {
                        const run = await runFunctionDefinition(def, node, incoming, results, opts);
                        node._portOutputs = run.portOutputs;
                        // How many nodes inside kept going on an error; shown under the node.
                        node._fnErrors = run.softErrors || 0;
                        error = run.error;
                        const keys = functionPorts(def).outputs.map(p => p.key);
                        const key = keys[clamp(node.portPick || 0, 0, Math.max(0, keys.length - 1))];
                        out = key ? (run.portOutputs.get(key) || new Uint8Array(0)) : null;
                    }
                }
            }
        } catch (err) {
            error = err?.message || String(err);
            out = null;
        }
        const duration = performance.now() - t0;
        node._sig = sig;
        // Continue-on-error: the message a node failed with becomes its output text, so the
        // nodes after it still have something to work on. The node keeps its error to show,
        // and results carry no error, which is what lets the rest of the graph run.
        const soft = Boolean(error) && Boolean(opts.continueOnError);
        if (soft) {
            out = enc.encode(error);
            softErrors.push({node, error});
        }
        node._output = error && !soft ? null : out;
        if (error && !soft) node._files = null;
        node._error = error;
        node._duration = duration;
        node._reused = !countIt;
        if (!error) ran++;
        if (error && !soft) errors.push({node, error});
        results.set(node.id, createResult(node, node._output, soft ? "" : error, sig, {duration, reused: !countIt, portOutputs: node._portOutputs || null}));
        if (opts.onNodeDone) opts.onNodeDone(node, results.get(node.id));
    }
    return {
        results, order, cycle, errors, softErrors,
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
    scheduleHistory();
    if (state.autoRun) scheduleRun(immediate, immediate ? 80 : 520);
}
function updateAutoSwitch() {
    autoSwitch.classList.toggle("on", Boolean(state.autoRun));
    autoSwitch.setAttribute("aria-checked", String(Boolean(state.autoRun)));
}

/* ================================================================ undo / redo
 * History is kept as whole snapshots of the graph and the functions it carries. That is
 * what makes it safe: an undo can never leave a definition half-restored or a wire pointing
 * at a node that came back differently. Only the parts that describe the document take part
 * in the comparison, so panning and zooming the canvas never count as edits.
 *
 * Snapshotting is debounced, and the state *before* a burst is what gets pushed, so typing
 * a long value into a box undoes in one step rather than one character at a time.
 */
const HISTORY_LIMIT = 80;
const HISTORY_MAX_BYTES = 24 * 1024 * 1024;
let undoStack = [];
let redoStack = [];
let historyBaseline = null;
let historyTimer = 0;

function historyParts(graph) {
    return {
        nodes: graph.nodes.map(cleanNodeForSave),
        edges: graph.edges.map(e => ({id: e.id, from: e.from, to: e.to, toPort: e.toPort, fromPort: e.fromPort || "out"})),
        functions: (graph.functions || []).map(cleanFunctionForSave),
        autoRun: graph.autoRun !== false
    };
}
function historySnapshot() {
    const graph = graphToSave();
    if (!graph) return null;
    const parts = historyParts(graph);
    // The view rides along so an undo puts the canvas back where it was, but it stays out of
    // the comparison key.
    return {key: JSON.stringify(parts), json: JSON.stringify({...parts, view: {...graph.view}})};
}
function historyBytes() {
    let n = 0;
    for (const snap of undoStack) n += snap.json.length;
    return n;
}
function pushHistory() {
    const snap = historySnapshot();
    if (!snap) return false;
    if (historyBaseline && snap.key === historyBaseline.key) return false;
    if (historyBaseline) undoStack.push(historyBaseline);
    // A graph carrying attached files can make each snapshot huge, so old steps are dropped
    // once the stack gets long enough — by count, and by the memory it is holding.
    while (undoStack.length > 1 && (undoStack.length > HISTORY_LIMIT || historyBytes() > HISTORY_MAX_BYTES)) {
        undoStack.shift();
    }
    redoStack = [];
    historyBaseline = snap;
    return true;
}
function scheduleHistory() {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(pushHistory, 420);
}
// A brand new document starts with a clean history: there is nothing before it to go back to.
function resetHistory() {
    clearTimeout(historyTimer);
    undoStack = [];
    redoStack = [];
    historyBaseline = historySnapshot();
}
function restoreSnapshot(json) {
    const keepFunction = editingFunctionId;
    let data;
    try {
        data = normalizeLoaded(JSON.parse(json));
    } catch {
        return;
    }
    applyGraph(data, {fit: false});
    // Undoing something done inside a function should leave you in that function.
    if (keepFunction) {
        const def = functionById(keepFunction);
        if (def) openFunctionEditor(def);
    }
}
function undo() {
    clearTimeout(historyTimer);
    pushHistory();
    if (!undoStack.length) {
        toast("Nothing to undo");
        return;
    }
    const prev = undoStack.pop();
    if (historyBaseline) redoStack.push(historyBaseline);
    historyBaseline = prev;
    restoreSnapshot(prev.json);
    toast("Undo");
}
function redo() {
    clearTimeout(historyTimer);
    pushHistory();
    if (!redoStack.length) {
        toast("Nothing to redo");
        return;
    }
    const next = redoStack.pop();
    if (historyBaseline) undoStack.push(historyBaseline);
    historyBaseline = next;
    restoreSnapshot(next.json);
    toast("Redo");
}

/* ================================================================ function blocks */
// Read a definition back from a saved file (or a pasted fragment).
function functionDefFromRaw(raw) {
    if (!raw || !Array.isArray(raw.nodes)) return null;
    const defNodes = [];
    for (const n of raw.nodes) {
        const made = nodeFromRaw(n);
        if (made) defNodes.push(made);
    }
    if (!defNodes.length) return null;
    const ids = new Set(defNodes.map(n => n.id));
    const defEdges = [];
    for (const e of raw.edges || []) {
        if (!e || !ids.has(Number(e.from)) || !ids.has(Number(e.to))) continue;
        defEdges.push({id: String(e.id || ("e" + edgeSeq++)), from: Number(e.from), to: Number(e.to),
            toPort: String(e.toPort), fromPort: String(e.fromPort || "out")});
    }
    return {
        id: String(raw.id || ("f" + (edgeSeq++))),
        name: String(raw.name || "Function"),
        continueOnError: Boolean(raw.continueOnError),
        view: raw.view ? {x: Number(raw.view.x) || 0, y: Number(raw.view.y) || 0, zoom: clamp(Number(raw.view.zoom) || 0.8, 0.2, 2.2)} : null,
        nodes: defNodes,
        edges: defEdges
    };
}

// Bring the definitions a pasted fragment needs into this graph, and report what each one
// became — a definition whose id is taken by a different function arrives under a new one.
function adoptFunctionDefs(defs) {
    const map = new Map();
    if (!defs?.length) return map;
    state.functions = state.functions || [];
    for (const raw of defs) {
        const def = functionDefFromRaw(raw);
        if (!def) continue;
        const existing = functionById(def.id);
        if (existing) {
            if (JSON.stringify(cleanFunctionForSave(existing).nodes) === JSON.stringify(cleanFunctionForSave(def).nodes)) {
                map.set(raw.id, existing.id);
                continue;
            }
            const fresh = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
            map.set(raw.id, fresh);
            def.id = fresh;
        } else {
            map.set(raw.id, def.id);
        }
        state.functions.push(def);
    }
    return map;
}

// A copied instance needs the definition it names, and any definition that one uses.
function functionDefsForNodes(nodes) {
    const wanted = new Map();
    const visit = def => {
        if (!def || wanted.has(def.id)) return;
        wanted.set(def.id, def);
        for (const n of def.nodes || []) if (n.type === "fn") visit(functionById(n.fnId));
    };
    for (const n of nodes) if (n.type === "fn") visit(functionById(n.fnId));
    return [...wanted.values()].map(cleanFunctionForSave);
}

function createFunction(name) {
    const def = {
        id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name: name || `Function ${(state.functions || []).length + 1}`,
        continueOnError: false,
        view: null,
        nodes: [
            makeNode("fnin", {x: 40, y: 140, title: "Function input"}),
            makeNode("fnout", {x: 640, y: 140, title: "Function output"})
        ],
        edges: []
    };
    state.functions = [...(state.functions || []), def];
    return def;
}

function newFunction() {
    if (!state) return;
    const def = createFunction();
    toast(`Created ${def.name}`);
    openFunctionEditor(def);
}

function deleteFunction(id) {
    const def = functionById(id);
    if (!def) return;
    const users = (state.nodes || []).filter(n => n.type === "fn" && n.fnId === id);
    if (users.length && !window.confirm(`“${def.name}” is used by ${users.length} node${users.length === 1 ? "" : "s"} on the canvas. Delete the function and those nodes too?`)) return;
    state.functions = (state.functions || []).filter(f => f.id !== id);
    if (users.length) {
        const doomed = new Set(users.map(n => n.id));
        state.nodes = state.nodes.filter(n => !doomed.has(n.id));
        state.edges = state.edges.filter(e => !doomed.has(e.from) && !doomed.has(e.to));
    }
    buildPalette();
    renderAllNodes();
    onGraphEdited(true);
    toast(`Deleted ${def.name}`);
}

function addFunctionNode(fnId, x, y) {
    const def = functionById(fnId);
    if (!def) return;
    const p = (x === undefined) ? spawnPoint() : {x, y};
    const node = makeNode("fn", {fnId, x: p.x, y: p.y});
    state.nodes.push(node);
    setSelection([node.id]);
    renderAllNodes();
    onGraphEdited();
    requestAnimationFrame(() => ensureNodeVisible(node));
    if (window.innerWidth <= 900) closeSidebar();
}

/* ---------------------------------------------------- the editor window
 * The editor is the same canvas pointed at a definition. Swapping which graph and which
 * DOM layers the canvas renders is all it takes for every node type, wire and gesture to
 * work inside a function exactly as it does on the main graph.
 */
let mainGraph = null;
let editingFunctionId = null;
const mainCanvas = {};

function canvasBindings() {
    return {stage, world, nodesLayer, edgesSvg, edgesLayer, edgeHandlesLayer, runStatus, runStatusText, zoomLabel};
}
function applyCanvasBindings(b) {
    ({stage, world, nodesLayer, edgesSvg, edgesLayer, edgeHandlesLayer, runStatus, runStatusText, zoomLabel} = b);
}

const fnEditor = {};
function functionEditorEl() {
    if (fnEditor.el) return fnEditor.el;
    const el = document.createElement("div");
    el.className = "modal fn-editor";
    el.hidden = true;
    el.innerHTML = `
        <div class="fn-card" id="fnCard">
            <div class="fn-head">
                <button class="btn-secondary" id="fnBack">Back to graph</button>
                <input class="fn-name" id="fnName" spellcheck="false" placeholder="Function name" aria-label="Function name">
                <span class="fn-meta" id="fnMeta"></span>
                <span class="spacer"></span>
                <label class="fn-continue" title="When a node in the body fails, pass its error message down the wire as text and keep running, instead of stopping the function">
                    <input type="checkbox" id="fnContinue"><span>Keep going on errors</span>
                </label>
                <button class="btn-secondary fn-nodes-btn" id="fnNodesBtn" title="Show or hide the node list">${iconFill("nodes")}<span>Nodes</span></button>
                <button class="btn-secondary" id="fnFit">Fit</button>
                <button class="btn-secondary" id="fnRunTest">Run test</button>
                <button class="btn-primary" id="fnDone">Done</button>
            </div>
            <div class="fn-body">
                <aside class="sidebar fn-sidebar" id="fnSidebar" aria-label="Node list">
                    <div class="sidebar-head">
                        <div class="brand"><span class="brand-mark"></span><span>Node list</span></div>
                        <div class="search-wrap">
                            <span id="fnSearchIcon"></span>
                            <input id="fnPaletteSearch" class="search-input" placeholder="Search operations" autocomplete="off" spellcheck="false" aria-label="Search operations">
                            <button class="search-clear" id="fnSearchClear" title="Clear search"></button>
                        </div>
                        <p class="sidebar-hint">Click a node to add it to this function, or drag one onto the canvas. Its <b>Function input</b> and <b>Function output</b> nodes declare the ports every instance gets.</p>
                    </div>
                    <div class="sidebar-body" id="fnPaletteBody"></div>
                </aside>
                <div class="stage fn-stage" id="fnStage">
                    <div class="world" id="fnWorld">
                        <svg class="edges-svg" id="fnEdgesSvg" aria-hidden="true"><g id="fnEdgesLayer"></g></svg>
                        <div class="nodes-layer" id="fnNodesLayer"></div>
                        <svg class="edge-handles-svg" id="fnEdgeHandlesSvg" aria-hidden="true"><g id="fnEdgeHandlesLayer"></g></svg>
                    </div>
                    <div class="fn-hint">Wire the <b>Function input</b> node into your body, and your body into the <b>Function output</b> node. Use <b>Run test</b> to try the body on its own.</div>
                    <div class="run-status" id="fnStatus"><span class="status-dot"></span><span id="fnStatusText">Ready</span></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(el);
    fnEditor.el = el;
    fnEditor.card = $("#fnCard", el);
    fnEditor.sidebar = $("#fnSidebar", el);
    fnEditor.name = $("#fnName", el);
    fnEditor.meta = $("#fnMeta", el);
    fnEditor.stage = $("#fnStage", el);
    fnEditor.statusText = $("#fnStatusText", el);
    fnEditor.paletteBody = $("#fnPaletteBody", el);
    fnEditor.paletteSearch = $("#fnPaletteSearch", el);
    fnEditor.paletteClear = $("#fnSearchClear", el);
    $("#fnSearchIcon", el).innerHTML = svg("search");
    fnEditor.paletteClear.innerHTML = iconFill("x");
    $(".brand-mark", el).innerHTML = svg("logo");
    // The copy of the node list inside this window behaves exactly like the sidebar's.
    bindPaletteSearch(fnEditor.paletteSearch, fnEditor.paletteClear);
    $("#fnNodesBtn", el).addEventListener("click", () => {
        fnEditor.card.classList.toggle("nodes-hidden");
    });
    bindCanvasEvents(fnEditor.stage, $("#fnNodesLayer", el));
    fnEditor.name.addEventListener("input", () => {
        const def = state?.editingFunctionId ? functionById(state.editingFunctionId) : null;
        if (def) def.name = fnEditor.name.value;
        renderAllNodes();
        saveLocalSoon();
    });
    fnEditor.continueBox = $("#fnContinue", el);
    fnEditor.continueBox.addEventListener("change", () => {
        const def = state?.editingFunctionId ? functionById(state.editingFunctionId) : null;
        if (!def) return;
        def.continueOnError = fnEditor.continueBox.checked;
        // The flag is part of the definition's stamp, so every instance re-runs when the
        // window is shut rather than keeping an output produced under the old setting.
        saveLocalSoon();
    });
    $("#fnBack", el).addEventListener("click", closeFunctionEditor);
    $("#fnDone", el).addEventListener("click", closeFunctionEditor);
    $("#fnFit", el).addEventListener("click", () => fitView());
    $("#fnRunTest", el).addEventListener("click", runFunctionTest);
    return el;
}

function openFunctionEditor(def) {
    if (!def || !state) return;
    functionEditorEl();
    if (!editingFunctionId) {
        mainGraph = state;
        Object.assign(mainCanvas, canvasBindings());
    }
    const el = fnEditor.el;
    applyCanvasBindings({
        stage: fnEditor.stage,
        world: $("#fnWorld", el),
        nodesLayer: $("#fnNodesLayer", el),
        edgesSvg: $("#fnEdgesSvg", el),
        edgesLayer: $("#fnEdgesLayer", el),
        edgeHandlesLayer: $("#fnEdgeHandlesLayer", el),
        runStatus: $("#fnStatus", el),
        runStatusText: fnEditor.statusText,
        // The editor has no zoom readout; give applyView somewhere harmless to write it.
        zoomLabel: document.createElement("span")
    });
    editingFunctionId = def.id;
    selection.clear();
    selectedEdge = null;
    state = {
        version: 1,
        nodes: def.nodes,
        edges: def.edges,
        functions: mainGraph.functions,
        autoRun: false,
        editingFunctionId: def.id,
        view: def.view ? {...def.view} : {x: 60, y: 60, zoom: 0.8}
    };
    el.hidden = false;
    document.body.classList.add("fn-editing");
    // On a narrow screen the list would crowd the canvas, so it starts tucked away and the
    // Nodes button in the header brings it over the top.
    fnEditor.card.classList.toggle("nodes-hidden", window.innerWidth < 900);
    fnEditor.name.value = def.name;
    fnEditor.continueBox.checked = Boolean(def.continueOnError);
    fnEditor.meta.textContent = `${def.nodes.length} node${def.nodes.length === 1 ? "" : "s"}`;
    // Point the node list at this window's copy, so operations and the Function port nodes
    // can be added to the definition even though the sidebar is behind the window.
    setPaletteTarget(fnEditor.paletteBody, fnEditor.paletteSearch);
    renderAllNodes();
    applyView();
    requestAnimationFrame(() => fitView());
    resetPaletteSearch();
    setRunStatus("", "Editing a function — press Run test to try it");
}

function closeFunctionEditor() {
    if (!editingFunctionId) return;
    const def = functionById(editingFunctionId, mainGraph?.functions);
    if (def) {
        def.nodes = state.nodes;
        def.edges = state.edges;
        def.view = {...state.view};
        def.name = (fnEditor.name.value || "").trim() || def.name;
    }
    state = mainGraph;
    mainGraph = null;
    editingFunctionId = null;
    applyCanvasBindings(mainCanvas);
    fnEditor.el.hidden = true;
    // The definition's nodes are objects; their elements go, so nothing stale is left in
    // the document once the window is shut.
    for (const sel of ["#fnNodesLayer", "#fnEdgesLayer", "#fnEdgeHandlesLayer"]) $(sel, fnEditor.el).innerHTML = "";
    document.body.classList.remove("fn-editing");
    selection.clear();
    selectedEdge = null;
    renderAllNodes();
    applyView();
    setPaletteTarget(sidebarPalette.body, sidebarPalette.search);
    resetPaletteSearch();
    saveLocalNow();
    // Every instance of the function has a new signature, so the graph re-runs.
    scheduleRun(true, 60);
}

// Run the body on its own, using the sample values typed into its input node.
async function runFunctionTest() {
    if (!editingFunctionId) return;
    try {
        await engine.start();
        setRunStatus("running", "Running the function on its sample inputs…");
        const def = functionById(editingFunctionId);
        const result = await executeGraph(state.nodes, state.edges, {
            force: true,
            timeout: 30000,
            continueOnError: Boolean(def?.continueOnError)
        });
        refreshAllPreviews();
        const count = result.errors.length;
        const soft = result.softErrors.length;
        const parts = [`Ran ${result.ran} node${result.ran === 1 ? "" : "s"} in ${Math.max(1, Math.round(result.duration))} ms`];
        if (soft) parts.push(`${soft} error${soft === 1 ? "" : "s"} carried through`);
        if (result.cycle.length) setRunStatus("error", "Cycle detected — break the loop to run.");
        else if (count) setRunStatus("error", `Error in ${sourceTitle(result.errors[0].node)}: ${result.errors[0].error.slice(0, 90)}`);
        else setRunStatus("ok", parts.join(" · "));
    } catch (err) {
        setRunStatus("error", err.message || "The function could not run.");
    }
}

/* ---------------------------------------------------- from a selection */
// Take the selected nodes into a new function: every wire that entered or left the
// selection becomes a declared port, and an instance takes their place on the canvas.
function createFunctionFromSelection() {
    const nodes = selectedNodes();
    if (!nodes.length || editingFunctionId) return;
    const picked = new Set(nodes.map(n => n.id));
    const entering = state.edges.filter(e => picked.has(e.to) && !picked.has(e.from));
    const leaving = state.edges.filter(e => picked.has(e.from) && !picked.has(e.to));
    const def = createFunction();
    const source = def.nodes[0];
    const sink = def.nodes[1];
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const shiftX = 300 - minX;
    const shiftY = 120 - minY;
    for (const node of nodes) {
        node.x = Math.round(node.x + shiftX);
        node.y = Math.round(node.y + shiftY);
        def.nodes.push(node);
    }
    const moved = new Set();
    for (const e of state.edges) {
        if (picked.has(e.from) && picked.has(e.to)) {
            def.edges.push({...e});
            moved.add(e.id);
        }
    }
    // One declared input per incoming wire, one declared output per outgoing one.
    const inPorts = [];
    entering.forEach((e, i) => {
        const target = nodeById(e.to);
        const label = e.toPort === "main" ? sourceTitle(target) : (OPS[target.op]?.args?.[Number(e.toPort.slice(4))]?.name || sourceTitle(target));
        source.ports.push({name: label || `Input ${i + 1}`, sample: "", encoding: "utf8", sampleMode: "text", typed: false});
        def.edges.push({id: "e" + (edgeSeq++), from: source.id, to: e.to, toPort: e.toPort, fromPort: "out:" + i});
        inPorts.push(i);
    });
    const outPorts = [];
    leaving.forEach((e, i) => {
        const from = nodeById(e.from);
        sink.ports.push({name: sourceTitle(from) || `Output ${i + 1}`});
        def.edges.push({id: "e" + (edgeSeq++), from: e.from, to: sink.id, toPort: "in:" + i, fromPort: e.fromPort || "out"});
        outPorts.push(i);
    });
    // The instance takes the selection's place in the graph, wired to whatever fed it.
    const instance = makeNode("fn", {fnId: def.id, x: Math.round(minX), y: Math.round(minY)});
    const rewired = [];
    entering.forEach((e, i) => rewired.push({id: "e" + (edgeSeq++), from: e.from, to: instance.id, toPort: "fn:" + i, fromPort: e.fromPort || "out"}));
    leaving.forEach((e, i) => rewired.push({id: "e" + (edgeSeq++), from: instance.id, fromPort: "out:" + i, to: e.to, toPort: e.toPort}));
    state.nodes = state.nodes.filter(n => !picked.has(n.id));
    state.edges = state.edges.filter(e => !picked.has(e.from) && !picked.has(e.to)).concat(rewired);
    state.nodes.push(instance);
    renderAllNodes();
    onGraphEdited(true);
    toast(`${def.name} created from ${nodes.length} node${nodes.length === 1 ? "" : "s"}`);
    openFunctionEditor(def);
}

/* ================================================================ palette */
function buildPalette() {
    const graphItems = [
        ["input", TEXT_NODE_TITLE, "input"],
        ["file", FILE_NODE_TITLE, "file"],
        ["join", "Join", "join"]
    ];
    const functions = state?.functions || [];
    let html = `<div class="palette-section">
        <div class="palette-section-title">Functions</div>
        <button class="graph-item fn-new" data-new-function><span class="graph-icon">${iconFill("plus")}</span>New function<small>+</small></button>
        ${functions.map(f => `<div class="fn-item-wrap"><button class="graph-item fn-item" data-fn="${esc(f.id)}" title="Add an instance of ${esc(f.name)}"><span class="graph-icon">${iconFill("fn")}</span><span class="fn-item-name">${esc(f.name)}</span><small>+</small></button><button class="fn-item-del" data-fn-edit="${esc(f.id)}" title="Edit this function">${iconFill("edit")}</button><button class="fn-item-del" data-fn-delete="${esc(f.id)}" title="Delete this function">${iconFill("trash")}</button></div>`).join("")}
    </div>`;
    if (editingFunctionId) {
        html += `<div class="palette-section">
            <div class="palette-section-title">Function ports</div>
            <button class="graph-item" data-graph-node="fnin"><span class="graph-icon">${iconFill("input")}</span>Function input<small>+</small></button>
            <button class="graph-item" data-graph-node="fnout"><span class="graph-icon">${iconFill("output")}</span>Function output<small>+</small></button>
        </div>`;
    }
    html += `<div class="palette-section">
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
    // Delegated on the document rather than on one list, so the sidebar's list and the copy
    // a function editor carries both work; the guard picks whichever is on screen now.
    document.addEventListener("click", ev => {
        if (ev.target.closest?.(".sidebar-body") !== paletteBody) return;
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
        const fnDelete = ev.target.closest("[data-fn-delete]");
        if (fnDelete) {
            deleteFunction(fnDelete.dataset.fnDelete);
            return;
        }
        const fnEdit = ev.target.closest("[data-fn-edit]");
        if (fnEdit) {
            const def = functionById(fnEdit.dataset.fnEdit);
            if (def) openFunctionEditor(def);
            return;
        }
        const fnItem = ev.target.closest("[data-fn]");
        if (fnItem) {
            addFunctionNode(fnItem.dataset.fn);
            return;
        }
        if (ev.target.closest("[data-new-function]")) {
            newFunction();
            return;
        }
        const graphItem = ev.target.closest("[data-graph-node]");
        if (graphItem) addGraphNode(graphItem.dataset.graphNode);
    });
    // Pointer-driven drag: works the same in every browser, unlike HTML5 drag events.
    document.addEventListener("pointerdown", ev => {
        if (ev.button !== 0) return;
        if (ev.target.closest?.(".sidebar-body") !== paletteBody) return;
        const item = ev.target.closest("[data-op], [data-graph-node], [data-fn]");
        if (!item || item.classList.contains("disabled")) return;
        const payload = item.dataset.op
            ? {type: "op", op: item.dataset.op}
            : item.dataset.fn ? {type: "fn", fnId: item.dataset.fn}
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
        else if (drag.payload.type === "fn") addFunctionNode(drag.payload.fnId, p.x - 140, p.y - 30);
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
    } else if (payload.type === "fn") {
        ghost.style.setProperty("--node-accent", FUNCTION_COLOR);
        ghost.textContent = functionById(payload.fnId)?.name || "Function";
    } else {
        ghost.textContent = {input: TEXT_NODE_TITLE, file: FILE_NODE_TITLE, join: "Join", fnin: "Function input", fnout: "Function output"}[payload.node] || payload.node;
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
    setSelection([node.id]);
    renderAllNodes();
    onGraphEdited();
    requestAnimationFrame(() => ensureNodeVisible(node));
    if (window.innerWidth <= 900) closeSidebar();
}
function addGraphNode(type, x, y) {
    const p = (x === undefined) ? spawnPoint() : {x, y};
    let added = null;
    if (type === "input") {
        added = makeNode("input", {x: p.x, y: p.y, title: TEXT_NODE_TITLE, text: "Hello, World!"});
        state.nodes.push(added);
    } else if (type === "file") {
        added = makeNode("file", {x: p.x, y: p.y, title: FILE_NODE_TITLE});
        state.nodes.push(added);
    } else if (type === "join") {
        added = makeNode("join", {x: p.x, y: p.y, title: "Join"});
        state.nodes.push(added);
    } else if (type === "fnin" || type === "fnout") {
        // Only meaningful inside a function: these declare the ports of a definition.
        if (!editingFunctionId) {
            toast("Function input and output nodes only belong inside a function.", "error");
            return;
        }
        added = makeNode(type, {x: p.x, y: p.y, title: type === "fnin" ? "Function input" : "Function output"});
        state.nodes.push(added);
    }
    if (added) setSelection([added.id]);
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
    if (editingFunctionId) closeFunctionEditor();
    applyGraph(blankState(), {fit: true});
    resetHistory();
    setRunStatus("", "Ready");
    toast("New graph");
}
function loadExample() {
    if (state.nodes.length && !confirm("Load the example? This replaces the currently saved graph.")) return;
    if (editingFunctionId) closeFunctionEditor();
    applyGraph(exampleState(), {fit: true});
    resetHistory();
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
    const data = JSON.stringify(serializeGraph(graphToSave()), null, 2);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    downloadBlob(new Blob([data], {type: "application/json"}), `cipherflow-${stamp}.json`);
    toast("Graph JSON downloaded");
}
async function openGraphFile(file, opts = {}) {
    try {
        const data = JSON.parse(await file.text());
        const normalized = normalizeLoaded(data);
        applyGraph({...normalized, autoRun: normalized.autoRun}, {fit: !normalized.view && !opts.at});
        resetHistory();
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
        },
        {
            id: "selection",
            title: "Multi-select and group delete",
            description: "Shift-click adds to the selection, and deleting a selection removes every chosen node together with the wires that touched them.",
            run: () => withScratchGraph(async s => {
                s.nodes.push(
                    makeNode("input", {id: 1, x: 0, y: 0, text: "a"}),
                    makeNode("input", {id: 2, x: 320, y: 0, text: "b"}),
                    makeNode("input", {id: 3, x: 640, y: 0, text: "c"})
                );
                s.edges.push(
                    {id: "e1", from: 1, to: 2, toPort: "main", fromPort: "out"},
                    {id: "e2", from: 2, to: 3, toPort: "main", fromPort: "out"}
                );
                setSelection([1]);
                selectNode(2, true);
                selectNode(3, true);
                selectNode(3, true); // shift-clicking twice takes it back out
                const picked = [...selection].sort((a, b) => a - b).join(",");
                deleteSelectedNodes();
                const left = [...s.nodes].map(n => n.id).join(",");
                return {
                    ok: picked === "1,2" && left === "3" && s.edges.length === 0,
                    detail: `selection ${picked || "empty"}, left ${left || "nothing"}, wires left ${s.edges.length}`
                };
            })
        },
        {
            id: "clipboard",
            title: "Copy and paste a wired pair",
            description: "Copy takes the selected nodes and the wire between them; paste hands out fresh ids and the pasted chain runs to the same output.",
            run: () => withScratchGraph(async s => {
                s.nodes.push(
                    makeNode("input", {id: 1, x: 0, y: 0, text: "Hello, World!"}),
                    makeNode("op", {id: 2, x: 320, y: 0, op: "To Base64"})
                );
                s.edges.push({id: "e1", from: 1, to: 2, toPort: "main", fromPort: "out"});
                setSelection([1, 2]);
                const fragment = selectionFragment();
                pasteFragment(fragment, {x: 900, y: 500});
                const pasted = s.nodes.slice(2);
                const ids = pasted.map(n => n.id);
                const wires = s.edges.filter(e => ids.includes(e.from) && ids.includes(e.to)).length;
                const res = await executeGraph(s.nodes, s.edges, {force: true, timeout: 15000});
                const sink = pasted.find(n => n.type === "op");
                const bytes = sink ? res.results.get(sink.id)?.bytes : null;
                const text = bytes ? utf8(bytes) : "";
                const fresh = ids.length === 2 && !ids.includes(1) && !ids.includes(2);
                return {
                    ok: fresh && wires === 1 && text === "SGVsbG8sIFdvcmxkIQ==",
                    detail: `${ids.length} node(s) pasted as ${ids.join(",")}, ${wires} wire kept, output ${JSON.stringify(text)}`
                };
            })
        },
        {
            id: "wirehint",
            title: "A piped argument previews its value",
            description: "A wired key shows what is arriving on the wire as its placeholder, in the same style as an operation's own input box.",
            run: () => withScratchGraph(async s => {
                const key = makeNode("input", {id: 1, x: 0, y: 0, text: "hunter2"});
                const aes = makeNode("op", {id: 2, x: 320, y: 0, op: "AES Encrypt", values: nodeValuesWith("AES Encrypt", {"Input": "Raw", "Output": "Hex"})});
                s.nodes.push(key, aes);
                const port = "arg:" + opArgIndex("AES Encrypt", "Key");
                s.edges.push({id: "e1", from: 1, to: 2, toPort: port, fromPort: "out"});
                // What a hint reads is the source's last output, so give the key one.
                key._output = enc.encode("hunter2");
                const control = document.createElement("div");
                control.className = "arg-control connected";
                const field = document.createElement("input");
                control.appendChild(field);
                applyWireHint(control, aes, port);
                const plain = document.createElement("div");
                plain.className = "arg-control";
                const plainField = document.createElement("input");
                plainField.placeholder = "its own";
                plain.appendChild(plainField);
                return {
                    ok: field.placeholder === "hunter2" && plainField.placeholder === "its own",
                    detail: `wired Key reads ${JSON.stringify(field.placeholder)}; an unwired field keeps ${JSON.stringify(plainField.placeholder)}`
                };
            })
        },
        {
            id: "function-run",
            title: "A function runs its body",
            description: "An instance feeds its declared input through the definition's body and reports what the output node collected.",
            run: () => withScratchGraph(async s => {
                const def = createFunction("Encode");
                const [source, sink] = def.nodes;
                const op = makeNode("op", {id: 3, x: 320, y: 140, op: "To Base64"});
                def.nodes.push(op);
                def.edges.push(
                    {id: "e1", from: source.id, to: op.id, toPort: "main", fromPort: "out:0"},
                    {id: "e2", from: op.id, to: sink.id, toPort: "in:0", fromPort: "out"}
                );
                const input = makeNode("input", {id: 101, x: 0, y: 0, text: "hello"});
                const inst = makeNode("fn", {id: 102, x: 500, y: 0, fnId: def.id});
                s.nodes.push(input, inst);
                s.edges.push({id: "e3", from: 101, to: 102, toPort: "fn:0", fromPort: "out"});
                const res = await executeGraph(s.nodes, s.edges, {force: true, timeout: 15000});
                const bytes = res.results.get(102)?.bytes;
                const text = bytes ? utf8(bytes) : "";
                return {ok: text === "aGVsbG8=", detail: `“hello” through the function came out as ${JSON.stringify(text)}`};
            })
        },
        {
            id: "function-outputs",
            title: "Every function output carries its own value",
            description: "A function with two declared outputs hands a different value out on each port, and each port can feed a different branch.",
            run: () => withScratchGraph(async s => {
                const def = createFunction("Both ways");
                const [source, sink] = def.nodes;
                sink.ports.push({name: "Output 2"});
                const op = makeNode("op", {id: 3, x: 320, y: 140, op: "To Base64"});
                def.nodes.push(op);
                def.edges.push(
                    {id: "e1", from: source.id, to: op.id, toPort: "main", fromPort: "out:0"},
                    {id: "e2", from: op.id, to: sink.id, toPort: "in:0", fromPort: "out"},
                    {id: "e3", from: source.id, to: sink.id, toPort: "in:1", fromPort: "out:0"}
                );
                const input = makeNode("input", {id: 201, x: 0, y: 0, text: "plain"});
                const inst = makeNode("fn", {id: 202, x: 420, y: 0, fnId: def.id});
                const sinkA = makeNode("input", {id: 203, x: 800, y: 0, text: ""});
                const sinkB = makeNode("input", {id: 204, x: 800, y: 260, text: ""});
                s.nodes.push(input, inst, sinkA, sinkB);
                s.edges.push(
                    {id: "e4", from: 201, to: 202, toPort: "fn:0", fromPort: "out"},
                    {id: "e5", from: 202, fromPort: "out:0", to: 203, toPort: "main"},
                    {id: "e6", from: 202, fromPort: "out:1", to: 204, toPort: "main"}
                );
                const res = await executeGraph(s.nodes, s.edges, {force: true, timeout: 15000});
                const a = res.results.get(203)?.bytes;
                const b = res.results.get(204)?.bytes;
                const textA = a ? utf8(a) : "";
                const textB = b ? utf8(b) : "";
                return {
                    ok: textA === "cGxhaW4=" && textB === "plain",
                    detail: `output 1 = ${JSON.stringify(textA)}, output 2 = ${JSON.stringify(textB)}`
                };
            })
        },
        {
            id: "function-recursion",
            title: "A function cannot call itself",
            description: "An instance of a function placed inside its own body is refused with a clear error instead of running away.",
            run: () => withScratchGraph(async s => {
                const def = createFunction("Loop");
                const [source, sink] = def.nodes;
                const inner = makeNode("fn", {id: 3, x: 320, y: 140, fnId: def.id});
                def.nodes.push(inner);
                def.edges.push(
                    {id: "e1", from: source.id, to: inner.id, toPort: "fn:0", fromPort: "out:0"},
                    {id: "e2", from: inner.id, fromPort: "out:0", to: sink.id, toPort: "in:0"}
                );
                const inst = makeNode("fn", {id: 301, x: 400, y: 0, fnId: def.id});
                s.nodes.push(inst);
                const res = await executeGraph(s.nodes, s.edges, {force: true, timeout: 15000});
                const error = res.results.get(301)?.error || "";
                return {ok: /cannot use itself/.test(error), detail: error ? `reported: ${error}` : "no error was raised"};
            })
        },
        {
            id: "argwire",
            title: "Every argument takes a wire",
            description: "A number, a switch and a dropdown are each driven from their own port: the amount comes through as a number, \"off\" turns a switch off, and \"Comma\" picks a delimiter out of the dropdown's own options.",
            run: () => withScratchGraph(async s => {
                const five = makeNode("input", {id: 1, x: 0, y: 0, text: "5", title: "amount"});
                const rot = makeNode("op", {id: 2, x: 320, y: 0, op: "ROT13"});
                rot.inputText = "Hello, World!";
                const rotSink = makeNode("input", {id: 3, x: 700, y: 0, text: ""});
                const off = makeNode("input", {id: 4, x: 0, y: 300, text: "off", title: "switch"});
                const rot2 = makeNode("op", {id: 5, x: 320, y: 300, op: "ROT13"});
                rot2.inputText = "Hello, World!";
                const rot2Sink = makeNode("input", {id: 6, x: 700, y: 300, text: ""});
                const comma = makeNode("input", {id: 7, x: 0, y: 600, text: "Comma", title: "delimiter"});
                const hex = makeNode("op", {id: 8, x: 320, y: 600, op: "To Hex"});
                hex.inputText = "Hello";
                const hexSink = makeNode("input", {id: 9, x: 700, y: 600, text: ""});
                s.nodes.push(five, rot, rotSink, off, rot2, rot2Sink, comma, hex, hexSink);
                s.edges.push(
                    {id: "e1", from: 1, to: 2, toPort: "arg:3", fromPort: "out"},
                    {id: "e2", from: 2, to: 3, toPort: "main", fromPort: "out"},
                    {id: "e3", from: 4, to: 5, toPort: "arg:0", fromPort: "out"},
                    {id: "e4", from: 1, to: 5, toPort: "arg:3", fromPort: "out"},
                    {id: "e5", from: 5, to: 6, toPort: "main", fromPort: "out"},
                    {id: "e6", from: 7, to: 8, toPort: "arg:0", fromPort: "out"},
                    {id: "e7", from: 8, to: 9, toPort: "main", fromPort: "out"}
                );
                // Every argument is offered a port, including the ones with a control of
                // their own: a main input plus one per argument.
                const ports = nodeInPorts(hex).length;
                const wanted = (OPS["To Hex"].args || []).length + 1;
                const res = await executeGraph(s.nodes, s.edges, {force: true, timeout: 15000});
                const text = id => { const b = res.results.get(id)?.bytes; return b ? utf8(b) : ""; };
                const a = text(3), b = text(6), c = text(9);
                const ok = ports === wanted && a === "Mjqqt, Btwqi!" && b === "Mello, Borld!" && c === "48,65,6c,6c,6f";
                return {
                    ok,
                    detail: `${ports}/${wanted} ports · number → ${JSON.stringify(a)}, switch → ${JSON.stringify(b)}, dropdown → ${JSON.stringify(c)}`
                };
            })
        },
        {
            id: "undoredo",
            title: "Undo and redo a change",
            description: "Adding a node is one step back and one step forward again. The check works on the real canvas and puts the graph back exactly as it found it.",
            run: async () => {
                const baseline = historySnapshot();
                const before = state.nodes.length;
                resetHistory();
                addOperationNode("To Base64", 40, 600);
                pushHistory();
                const added = state.nodes.length;
                undo();
                const afterUndo = state.nodes.length;
                redo();
                const afterRedo = state.nodes.length;
                restoreSnapshot(baseline.json);
                resetHistory();
                const restored = state.nodes.length;
                return {
                    ok: added === before + 1 && afterUndo === before && afterRedo === before + 1 && restored === before,
                    detail: `${before} nodes → added ${added} → undo ${afterUndo} → redo ${afterRedo}, canvas handed back at ${restored}`
                };
            }
        },
        {
            id: "fnsample",
            title: "A function input can be tested with a file",
            description: "A declared input carries an attached file as its test sample, and the body receives those exact bytes when the function is run on its own.",
            run: () => withScratchGraph(async s => {
                const def = createFunction("From file");
                const [source, sink] = def.nodes;
                source.ports[0] = {
                    name: "Bytes", sample: "", encoding: "utf8", sampleMode: "file",
                    sampleFileName: "t.bin", sampleFileSize: 4, sampleFileMime: "application/octet-stream",
                    sampleFileData: bytesToB64(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
                };
                const op = makeNode("op", {id: 3, x: 320, y: 140, op: "To Hex"});
                def.nodes.push(op);
                def.edges.push(
                    {id: "e1", from: source.id, to: op.id, toPort: "main", fromPort: "out:0"},
                    {id: "e2", from: op.id, to: sink.id, toPort: "in:0", fromPort: "out"}
                );
                const inst = makeNode("fn", {id: 402, x: 500, y: 0, fnId: def.id});
                s.nodes.push(inst);
                const res = await executeGraph(s.nodes, s.edges, {force: true, timeout: 15000});
                const bytes = res.results.get(402)?.bytes;
                const text = bytes ? utf8(bytes) : "";
                // A file sample has to survive a save, or a shared graph would test on nothing.
                const saved = cleanFunctionForSave(def).nodes[0].ports[0];
                const roundTrips = saved.sampleMode === "file" && saved.sampleFileData === source.ports[0].sampleFileData;
                return {
                    ok: text === "de ad be ef" && roundTrips,
                    detail: `attached 4 bytes came out as ${JSON.stringify(text)}${roundTrips ? ", sample survives a save" : ", sample was lost on save"}`
                };
            })
        },
        {
            id: "fntyped",
            title: "A function input can be typed in without a wire",
            description: "An input the definition marks as typeable gives every instance a box; typed text reaches the body with nothing wired to the port, and a wire still overrides it.",
            run: () => withScratchGraph(async s => {
                const def = createFunction("Constant");
                const [source, sink] = def.nodes;
                source.ports[0] = {name: "Value", sample: "preset text", encoding: "utf8", sampleMode: "text", typed: true};
                const op = makeNode("op", {id: 3, x: 320, y: 140, op: "To Base64"});
                def.nodes.push(op);
                def.edges.push(
                    {id: "e1", from: source.id, to: op.id, toPort: "main", fromPort: "out:0"},
                    {id: "e2", from: op.id, to: sink.id, toPort: "in:0", fromPort: "out"}
                );
                const typed = makeNode("fn", {id: 501, x: 500, y: 0, fnId: def.id});
                typed.typedInputs = {"fn:0": "hello"};
                const wired = makeNode("fn", {id: 502, x: 500, y: 300, fnId: def.id});
                wired.typedInputs = {"fn:0": "ignored"};
                const feed = makeNode("input", {id: 503, x: 0, y: 300, text: "from wire"});
                // An emptied box is not an override: it falls back to the default shown in it.
                const cleared = makeNode("fn", {id: 505, x: 500, y: 600, fnId: def.id});
                cleared.typedInputs = {"fn:0": ""};
                s.nodes.push(typed, wired, feed, cleared);
                s.edges.push({id: "e3", from: 503, to: 502, toPort: "fn:0", fromPort: "out"});
                // The instance has to actually render the box for a typeable input.
                const node = makeNode("fn", {id: 504, x: 0, y: 600, fnId: def.id, typedInputs: {"fn:0": "x"}});
                s.nodes.push(node);
                const built = buildFunctionNode(node);
                const boxes = built.querySelectorAll("[data-typed-port] input").length;
                // The box shows the definition's sample as its default, so the value an
                // untouched instance will run on is visible without opening the function.
                const shown = built.querySelector("[data-typed-port] input").placeholder;
                s.nodes.pop();
                const res = await executeGraph(s.nodes, s.edges, {force: true, timeout: 15000});
                const text = id => { const b = res.results.get(id)?.bytes; return b ? utf8(b) : ""; };
                const a = text(501), b = text(502), c = text(505);
                return {
                    ok: boxes === 1 && shown === "preset text · default" &&
                        a === "aGVsbG8=" && b === "ZnJvbSB3aXJl" && c === "cHJlc2V0IHRleHQ=",
                    detail: `${boxes} typed box showing ${JSON.stringify(shown)} · typed "hello" → ${JSON.stringify(a)}, wire beat the typed value → ${JSON.stringify(b)}, emptied box fell back to the default → ${JSON.stringify(c)}`
                };
            })
        },
        {
            id: "fnsamplepipe",
            title: "A function's test sample can be piped in",
            description: "A node in the body feeds the declared input's sample port, so the input runs on that value instead of the typed sample — and a value typed on the instance still beats it.",
            run: () => withScratchGraph(async s => {
                const def = createFunction("Derived");
                const [source, sink] = def.nodes;
                // The typed sample says one thing; the wire into the sample port says another.
                source.ports[0] = {name: "Value", sample: "typed-sample", encoding: "utf8", sampleMode: "text", typed: true};
                const fixture = makeNode("input", {id: 3, x: 40, y: 320, text: "Piped!"});
                const op = makeNode("op", {id: 4, x: 430, y: 140, op: "To Base64"});
                def.nodes.push(fixture, op);
                def.edges.push(
                    {id: "e1", from: fixture.id, to: source.id, toPort: "sample:0", fromPort: "out"},
                    {id: "e2", from: source.id, to: op.id, toPort: "main", fromPort: "out:0"},
                    {id: "e3", from: op.id, to: sink.id, toPort: "in:0", fromPort: "out"}
                );
                const plain = makeNode("fn", {id: 601, x: 500, y: 0, fnId: def.id});
                const typed = makeNode("fn", {id: 602, x: 500, y: 300, fnId: def.id});
                typed.typedInputs = {"fn:0": "mine"};
                s.nodes.push(plain, typed);
                const built = buildFunctionNode(plain);
                const shown = built.querySelector("[data-typed-port] input").placeholder;
                const res = await executeGraph(s.nodes, s.edges, {force: true, timeout: 15000});
                const text = id => { const b = res.results.get(id)?.bytes; return b ? utf8(b) : ""; };
                const a = text(601), b = text(602);
                return {
                    ok: a === "UGlwZWQh" && b === "bWluZQ==" && /inside the function/.test(shown),
                    detail: `piped sample → ${JSON.stringify(a)}, typed value beat it → ${JSON.stringify(b)}, instance box reads ${JSON.stringify(shown)}`
                };
            })
        },
        {
            id: "magic",
            title: "Magic ranks the answer first",
            description: "Three inputs a sweep should crack — a Caesar shift, base64 and hex — must each put the right operation at the top with the plaintext as the node's output, and a brute-force table must never be offered as the answer.",
            run: async () => {
                const cases = [
                    // A Caesar shift is named by the rotation that undoes it, so the number
                    // itself is not the contract — the plaintext it produces is.
                    {input: "Khoor, Zruog!", expect: "Hello, World!", top: /^ROT13 \(shift \d+\)$/},
                    {input: "VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIDEzIGxhenkgZG9ncy4=", expect: "The quick brown fox jumps over 13 lazy dogs.", top: /^From Base64$/},
                    {input: "48656c6c6f2c20576f726c6421", expect: "Hello, World!", top: /^From Hex$/}
                ];
                const report = [];
                for (const item of cases) {
                    const nodes = [B.input(1, item.input, 0), B.op(2, "Magic", 500)];
                    const edges = [B.edge(1, 1, 2, "main")];
                    await executeGraph(nodes, edges, {force: true, timeout: 120000});
                    const rows = nodes[1]._magic || [];
                    const label = rows[0] ? (rows[0].label || rows[0].op) : "none";
                    const out = nodes[1]._output ? utf8(nodes[1]._output) : "";
                    const table = rows.some(row => /brute.?force/i.test(row.op));
                    const ok = item.top.test(label) && out === item.expect && !table;
                    // The ranking itself is the diagnosis when this fails, so always report it.
                    const listed = rows.slice(0, 5).map(row => `${row.label || row.op} ${Math.round(row.score)}`).join(", ");
                    report.push(`${ok ? "ok" : "no"} ${JSON.stringify(label)} → ${JSON.stringify(out.slice(0, 40))} [${listed}]`);
                    if (!ok) return {ok: false, detail: report.join(" · ")};
                }
                return {ok: true, detail: report.join(" · ")};
            }
        }
    ];
}

// A scratch graph for the feature checks: they exercise the real editor and the real runner,
// then hand the canvas back exactly as they found it.
async function withScratchGraph(fn) {
    const savedState = state;
    const savedSelection = selection;
    const savedEdge = selectedEdge;
    state = {version: 1, nodes: [], edges: [], functions: [], autoRun: false, view: {...(savedState?.view || {x: 0, y: 0, zoom: 0.8})}};
    selection = new Set();
    selectedEdge = null;
    try {
        return await fn(state);
    } finally {
        state = savedState;
        selection = savedSelection;
        selectedEdge = savedEdge;
        renderAllNodes();
        applyView();
    }
}
function buildIntegrationCards() {
    lab.integration = integrationDefinitions().map(def => ({...def, status: "pending", detail: "", duration: 0}));
    renderIntegration();
}
function renderIntegration() {
    const wrap = $("#integrationWrap");
    wrap.innerHTML = `<div class="integration-intro">These checks exercise the node runner and the editor itself: typed input/output nodes, fan-out to argument ports, fan-in merging, cycle protection, multi-select, the clipboard, wired-value previews, function blocks, wires into numbers, switches and dropdowns, undo/redo, file-backed function test samples, test samples piped in from inside a function, and values typed straight onto a function instance. They run through the same embedded engine as the canvas.</div>`;
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
        if (def.run) {
            // Feature checks drive the editor itself and report their own verdict.
            const res = await def.run();
            def.duration = performance.now() - t0;
            def.status = res && res.ok ? "pass" : "fail";
            def.detail = `${res && res.ok ? "Pass" : "Fail"} — ${res?.detail || ""} · ${Math.round(def.duration)} ms`;
            const st = card.querySelector("[data-int-status]");
            st.className = "test-status " + def.status;
            st.textContent = statusIcon(def.status);
            resultEl.textContent = def.detail;
            resultEl.className = "integration-result " + (def.status === "fail" ? "test-error" : "");
            lab.integrationRunning = false;
            return;
        }
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
// Everything that makes a canvas a canvas: panning, zooming and node actions. The graph
// and a function's editor are both wired with this.
function bindCanvasEvents(stageEl, layerEl) {
    stageEl.addEventListener("pointerdown", startPan);
    stageEl.addEventListener("wheel", ev => {
        if (ev.ctrlKey || ev.metaKey || Math.abs(ev.deltaY) > 0) {
            ev.preventDefault();
            zoomAt(ev.clientX, ev.clientY, Math.exp(-ev.deltaY * 0.0014));
        }
    }, {passive: false});
    // Scrolling inside a scrollable part of a node (the Magic ranking, a preview, a
    // text box) must scroll that element, not zoom the canvas underneath it.
    layerEl.addEventListener("wheel", ev => {
        if (ev.target.closest(".magic-list, .preview pre, .file-list, .control, .collapsed-ports")) {
            ev.stopPropagation();
        }
    }, {passive: true});
    layerEl.addEventListener("click", onNodeActionClick);
}

// Whether the user has a stretch of text selected inside a node's output. Copy, cut and
// delete belong to that selection, so the graph's shortcuts stand aside for it.
function previewTextSelected() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return false;
    const anchor = sel.anchorNode;
    const el = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
    return Boolean(el?.closest?.(".preview pre"));
}

function bindGlobalEvents() {
    bindCanvasEvents(stage, nodesLayer);

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
            if (editingFunctionId) { closeFunctionEditor(); return; }
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
        // A stretch of output the user has selected belongs to them, not to the graph: copy,
        // cut and delete should act on that text, never on the nodes behind it.
        const textSelected = !typing && previewTextSelected();
        if (!typing && !textSelected && (ev.key === "Delete" || ev.key === "Backspace")) {
            if (selection.size) {
                ev.preventDefault();
                deleteSelectedNodes();
            } else if (selectedEdge) {
                ev.preventDefault();
                removeEdge(selectedEdge);
            }
        }
        if (!typing && !textSelected && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "c") {
            ev.preventDefault();
            copySelection();
        }
        if (!typing && !textSelected && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "x") {
            ev.preventDefault();
            copySelection({cut: true});
        }
        if (!typing && !textSelected && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "v") {
            ev.preventDefault();
            pasteClipboard();
        }
        if (!typing && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
            ev.preventDefault();
            if (ev.shiftKey) redo(); else undo();
            return;
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

    // Node actions are bound per canvas in bindCanvasEvents.

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
    selection.delete(Number(id));
    renderAllNodes();
    onGraphEdited();
    toast(`Removed ${sourceTitle(node)}`);
}

function deleteSelectedNodes() {
    const ids = [...selection];
    if (!ids.length) return;
    const doomed = new Set(ids);
    state.nodes = state.nodes.filter(n => !doomed.has(n.id));
    state.edges = state.edges.filter(e => !doomed.has(e.from) && !doomed.has(e.to));
    selection.clear();
    selectedEdge = null;
    renderAllNodes();
    onGraphEdited();
    toast(ids.length === 1 ? "Removed 1 node" : `Removed ${ids.length} nodes`);
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
    } else if (action === "fn-edit") {
        ev.stopPropagation();
        const def = node ? functionById(node.fnId) : null;
        if (def) openFunctionEditor(def);
    } else if (action === "fn-pick") {
        ev.stopPropagation();
        if (node) {
            node.portPick = Number(btn.dataset.pick) || 0;
            node._sig = "";
            refreshNodePreview(node);
            renderAllNodes();
            scheduleRun(true, 60);
        }
    } else if (action === "fn-add-port" || action === "fn-remove-port") {
        ev.stopPropagation();
        if (node) {
            const adding = action === "fn-add-port";
            const index = Number(btn.dataset.index) || 0;
            const isInput = node.type === "fnin";
            if (adding) {
                if ((node.ports || []).length >= 8) { toast("Eight ports is the limit for one function.", "error"); return; }
                node.ports = [...(node.ports || []), isInput ? {name: `Input ${node.ports.length + 1}`, sample: "", encoding: "utf8", sampleMode: "text", typed: false} : {name: `Output ${node.ports.length + 1}`}];
            } else {
                if ((node.ports || []).length <= 1) return;
                node.ports = node.ports.filter((_, i) => i !== index);
                // Removing a port takes its wires, and slides the later ports down.
                const prefix = isInput ? "in:" : "out:";
                state.edges = state.edges.filter(e => !(e.to === node.id && e.fromPort === prefix + index) && !(e.to === node.id && e.toPort === prefix + index));
                state.edges = state.edges.map(e => {
                    const shift = key => {
                        if (!key || !key.startsWith(prefix)) return key;
                        const n = Number(key.slice(prefix.length));
                        return Number.isFinite(n) && n > index ? prefix + (n - 1) : key;
                    };
                    return {...e, toPort: shift(e.toPort), fromPort: shift(e.fromPort)};
                });
            }
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
            scheduleHistory();
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
    resetHistory();

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

    bindPaletteSearch(paletteSearch, $("#searchClear"));

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
