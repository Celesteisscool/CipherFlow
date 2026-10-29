import fs from "node:fs";
import zlib from "node:zlib";
import {MODULE_NAME as DCODE_MODULE, allChecks as dcodeChecks, allOps as dcodeOps, allPairs as dcodePairs} from "./dcode/payload.mjs";

const CONFIG = JSON.parse(fs.readFileSync("node_modules/cyberchef/src/core/config/OperationConfig.json", "utf8"));
const CATEGORIES = JSON.parse(fs.readFileSync("node_modules/cyberchef/src/core/config/Categories.json", "utf8"));
const OFFICIAL = JSON.parse(fs.readFileSync("dev/cc-tests.json", "utf8"));
const VERSION = JSON.parse(fs.readFileSync("node_modules/cyberchef/package.json", "utf8")).version;

/* The recreated dCode operations join OperationConfig, so they are described, tested
 * and rendered exactly like the built-in ones. They live in their own worker module
 * (dev/dcode/payload.mjs generates it) and their own palette categories. */
const DCODE = dcodeOps();
/* A recreated operation that reuses a built-in name (Magic) replaces it outright,
 * so the palette must not keep listing the original under its old category. */
const dcodeNames = new Set(DCODE.map(spec => spec.name));
for (const category of CATEGORIES) {
    category.ops = category.ops.filter(op => !dcodeNames.has(op));
}
for (const spec of DCODE) {
    CONFIG[spec.name] = {
        module: DCODE_MODULE,
        description: spec.description,
        inputType: "string",
        outputType: "string",
        flowControl: false,
        args: spec.args || []
    };
    let category = CATEGORIES.find(c => c.name === spec.group);
    if (!category) {
        category = {name: spec.group, ops: []};
        CATEGORIES.push(category);
    }
    category.ops.push(spec.name);
}

const opNames = Object.keys(CONFIG);
const catOf = new Map();
for (const cat of CATEGORIES) {
    for (const op of cat.ops) catOf.set(op, cat.name);
}

const stripHtml = (html = "") => String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<li[^>]*>/gi, " • ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

function defaultValue(arg) {
    const value = arg.value;
    switch (arg.type) {
        case "toggleString":
            return {
                string: typeof value === "string" ? value : "",
                option: (arg.toggleValues && arg.toggleValues[0]) || "Hex",
            };
        case "option": {
            if (!Array.isArray(value)) return value ?? "";
            const idx = Number.isInteger(arg.defaultIndex) ? arg.defaultIndex : 0;
            const selected = value[idx] ?? value[0] ?? "";
            return typeof selected === "object" ? (selected.value ?? selected.name ?? "") : selected;
        }
        case "editableOption":
        case "editableOptionShort":
        case "populateOption": {
            if (!Array.isArray(value)) return value ?? "";
            const idx = Number.isInteger(arg.defaultIndex) ? arg.defaultIndex : 0;
            const selected = value[idx] ?? value[0];
            if (selected && typeof selected === "object") return selected.value ?? selected.name ?? "";
            return selected ?? "";
        }
        case "populateMultiOption": {
            if (!Array.isArray(value)) return value ?? [];
            const first = value[0];
            if (first && typeof first === "object") {
                if (Array.isArray(first.value)) return first.value.slice(0, 1);
                return first.value ?? first.name ?? "";
            }
            return first ?? "";
        }
        case "argSelector": {
            if (!Array.isArray(value)) return value ?? "";
            const idx = Number.isInteger(arg.defaultIndex) ? arg.defaultIndex : 0;
            const selected = value[idx] ?? value[0];
            return (selected && typeof selected === "object") ? (selected.name ?? selected.value ?? "") : (selected ?? "");
        }
        case "number":
            return Number(value) || 0;
        case "boolean":
            return Boolean(value);
        default:
            return value ?? "";
    }
}

function defaultArgs(op) {
    return (CONFIG[op].args || []).map(defaultValue);
}

const TR = (string, option = "UTF8") => ({ string, option });

/* ---------------------------------------------------------------- fixtures
 * Fixtures for operations without an official vector. They are generated here
 * so every byte (PNG chunks, ZIP CRCs, tar header checksum) is standards-correct
 * instead of hand-picked base64 that a strict decoder may reject.
 */
const crcTable = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();
function crc32(buf) {
    let c = -1;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; }
function pngChunk(type, data) {
    const typeBuf = Buffer.from(type, "ascii");
    return Buffer.concat([u32(data.length), typeBuf, data, u32(crc32(Buffer.concat([typeBuf, data]))) ]);
}
// 8x8 RGBA ramp: every channel varies, so channel-splitting operations differ per
// channel. Colour type 6 is deliberate: the image decoder bundled with the engine
// only accepts RGBA PNGs (an RGB truecolour PNG fails with "unrecognised content at
// end of stream", both here and in the official build).
function makePng(width = 8, height = 8) {
    const channels = 4;
    const stride = 1 + width * channels;
    const raw = Buffer.alloc(height * stride);
    for (let y = 0; y < height; y++) {
        const row = y * stride;
        raw[row] = 0; // filter: none
        for (let x = 0; x < width; x++) {
            const o = row + 1 + x * channels;
            raw[o] = Math.round(255 * x / (width - 1));      // red ramp
            raw[o + 1] = Math.round(255 * y / (height - 1)); // green ramp
            raw[o + 2] = 128;                                // constant blue
            raw[o + 3] = 255;                                // opaque
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // colour type: truecolour with alpha
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk("IHDR", ihdr),
        pngChunk("IDAT", zlib.deflateSync(raw, {level: 9})),
        pngChunk("IEND", Buffer.alloc(0)),
    ]);
}
// Single-member ZIP (deflate), enough for Unzip to list and extract.
function makeZip(name, content) {
    const data = Buffer.from(content, "utf8");
    const compressed = zlib.deflateRawSync(data, {level: 9});
    const crc = crc32(data);
    const nameBuf = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(8, 8);           // method: deflate
    local.writeUInt16LE(0, 10);          // time
    local.writeUInt16LE(0x21, 12);       // date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);          // extra length
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);        // disk number
    central.writeUInt16LE(0, 36);        // internal attributes
    central.writeUInt32LE(0, 38);        // external attributes
    central.writeUInt32LE(0, 42);        // local header offset
    const localPart = Buffer.concat([local, nameBuf, compressed]);
    const centralPart = Buffer.concat([central, nameBuf]);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(centralPart.length, 12);
    eocd.writeUInt32LE(localPart.length, 16);
    eocd.writeUInt16LE(0, 20);
    return Buffer.concat([localPart, centralPart, eocd]);
}
// USTAR archive with one regular file.
function makeTar(name, content) {
    const data = Buffer.from(content, "utf8");
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, "utf8");
    header.write("0000644\0", 100, 8);
    header.write("0000000\0", 108, 8);
    header.write("0000000\0", 116, 8);
    header.write(data.length.toString(8).padStart(11, "0") + "\0", 124, 12);
    header.write("00000000000\0", 136, 12);
    header.write("        ", 148, 8);
    header[156] = 0x30;                  // typeflag: regular file
    header.write("ustar\0", 257, 6);
    header.write("00", 263, 2);
    let sum = 0;
    for (const b of header) sum += b;
    header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
    const padding = Buffer.alloc((512 - (data.length % 512)) % 512);
    return Buffer.concat([header, data, padding, Buffer.alloc(1024)]);
}

const SAMPLE = "The quick brown fox jumps over 13 lazy dogs.";
const PNG_B64 = makePng().toString("base64");
const ZIP_B64 = makeZip("sample.txt", SAMPLE).toString("base64");
const TAR_B64 = makeTar("sample.txt", SAMPLE).toString("base64");
const ZLIB_B64 = zlib.deflateSync(Buffer.from(SAMPLE, "utf8"), {level: 9}).toString("base64");
const RAW_DEFLATE_B64 = zlib.deflateRawSync(Buffer.from(SAMPLE, "utf8"), {level: 9}).toString("base64");
const JPEG_B64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EB//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EB//2Q==";

// Multi-step known-answer probe: the pipeline and the exact expected text output.
const MESSAGEPACK_JSON = '{"name":"Buffy","score":13,"tags":["node","editor"]}';
const MESSAGEPACK_PRETTY = JSON.stringify(JSON.parse(MESSAGEPACK_JSON), null, 4);

const PROBES = {
    "ADD": { input: "Hello, World!", args: { "Key": TR("0f", "Hex") } },
    "SUB": { input: "Hello, World!", args: { "Key": TR("0f", "Hex") } },
    "AND": { input: "Hello, World!", args: { "Key": TR("ff", "Hex") } },
    "OR": { input: "Hello, World!", args: { "Key": TR("20", "Hex") } },
    "NOT": { input: "Hello, World!" },
    "XOR": { input: "Hello, World!", args: { "Key": TR("aa", "Hex") } },
    "Sum": { input: "1 2 3 4", args: { "Delimiter": "Space" } },
    "Mean": { input: "1 2 3 4", args: { "Delimiter": "Space" } },
    "Median": { input: "1 2 3 4", args: { "Delimiter": "Space" } },
    "Standard Deviation": { input: "1 2 3 4", args: { "Delimiter": "Space" } },
    "Multiply": { input: "2 3 4", args: { "Delimiter": "Space" } },
    "Divide": { input: "100 4", args: { "Delimiter": "Space" } },
    "To Upper case": { input: "hello world" },
    "To Lower case": { input: "HELLO WORLD" },
    "Reverse": { input: "hello world", args: { "By": "Character" } },
    "Split": { input: "red,green,blue", args: { "Split delimiter": ",", "Join delimiter": "\\n" } },
    "Unique": { input: "one\ntwo\none\nthree\ntwo", args: { "Delimiter": "Line feed" } },
    "Take bytes": { input: "Hello, World!", args: { "Start": 0, "Length": 5 } },
    "Pad lines": { input: "alpha\nbeta", args: { "Position": "Start", "Length": 8, "Character": " " } },
    "Count occurrences": { input: "hello world, hello node", args: { "Search string": TR("hello") } },
    "Find / Replace": { input: "the quick brown fox", args: { "Find": TR("fox"), "Replace": "cat" } },
    "Swap endianness": { input: "48656c6c6f", args: { "Data format": "Hex", "Word length (bytes)": 4 } },
    "Remove null bytes": { input: "Hello\u0000, World\u0000!" },
    "Strip HTML tags": { input: "<h1>Hello</h1><p>World &amp; friends</p>" },
    "Fletcher-8 Checksum": { input: "Hello, World!" },
    "Adler-32 Checksum": { input: "Hello, World!" },
    "Detect File Type": { input: PNG_B64, binary: true },
    "Entropy": { input: "The quick brown fox jumps over the lazy dog." },
    "To Table": { input: "name,score\nalice,10\nbob,20", args: { "Cell delimiters": ",", "Row delimiters": "\\n", "Format": "ASCII" } },
    "Parse URI": { input: "https://user:pass@example.com:8443/a/b?q=one&x=two#frag" },
    "Parse User Agent": { input: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" },
    "Parse IPv6 address": { input: "2001:0db8:85a3:0000:0000:8a2e:0370:7334" },
    "Parse UNIX file permissions": { input: "754" },
    "Parse colour code": { input: "#1e90ff" },
    "Parse DateTime": { input: "2024-02-29 13:14:15" },
    "Group IP addresses": { input: "192.168.1.1\n10.0.0.1\n192.168.1.1\n172.16.0.1" },
    "Format MAC addresses": { input: "00:1a:2b:3c:4d:5e" },
    "Defang URL": { input: "https://example.com/path?q=1&x=2" },
    "Fang URL": { input: "hxxps://example[.]com/path" },
    "Extract dates": { input: "Meeting on 2024-02-29 and again on 12/31/2025." },
    "Extract domains": { input: "Visit example.com and docs.example.org for details." },
    "Extract file paths": { input: "C:\\Users\\analyst\\sample.txt and /var/log/auth.log" },
    "Extract MAC addresses": { input: "Adapter 1: 00:1a:2b:3c:4d:5e; Adapter 2: aa-bb-cc-dd-ee-ff" },
    "Extract URLs": { input: "See https://example.com/a?b=1 and http://test.local/x." },
    "Expand alphabet range": { input: "a-z" },
    "Remove line numbers": { input: "1. first line\n2. second line\n3. third line" },
    "Add line numbers": { input: "first line\nsecond line\nthird line" },
    "To Base": { input: "Hello, World!" },
    "To Decimal": { input: "Hello, World!" },
    "To Braille": { input: "hello" },
    "From Braille": { input: "⠓⠑⠇⠇⠕" },
    "To Punycode": { input: "münchen", expected: "mnchen-3ya" },
    "From Punycode": { input: "mnchen-3ya", expected: "münchen" },
    "To Quoted Printable": { input: "Hello=World, café!" },
    "From Quoted Printable": { input: "Hello=3DWorld=2C caf=C3=A9!" },
    "To Hex Content": { input: "Hello, World!" },
    "From Hex Content": { input: "48 65 6c 6c 6f 2c 20 57 6f 72 6c 64 21" },
    "To UNIX Timestamp": { input: "2024-02-29 13:14:15" },
    "From UNIX Timestamp": { input: "1709212455" },
    "Hex to Object Identifier": { input: "2a864886f70d010101" },
    "Object Identifier to Hex": { input: "1.2.840.113549.1.1.1" },
    "CSS Beautify": { input: "body{color:red;margin:0}.card{padding:1rem}" },
    "CSS Minify": { input: "body {\n  color: red;\n  margin: 0px;\n}\n.card { padding: 1rem; }" },
    "JavaScript Beautify": { input: "function greet(name){if(name){return `Hello, ${name}!`;}return 'Hello!';}" },
    "JavaScript Minify": { input: "function greet(name) {\n  if (name) {\n    return `Hello, ${name}!`;\n  }\n  return \"Hello!\";\n}" },
    "JavaScript Parser": { input: "const x = 1 + 2 * 3;" },
    "Generic Code Beautify": { input: "if(x){y();}else{z();}" },
    "SQL Minify": { input: "-- greeting\nSELECT id, name\nFROM users\nWHERE active = 1\nORDER BY name;" },
    "XML Beautify": { input: "<root><item id=\"1\">one</item><item id=\"2\">two</item></root>" },
    "XML Minify": { input: "<root>\n  <item id=\"1\">one</item>\n  <item id=\"2\">two</item>\n</root>" },
    "Syntax highlighter": { input: "const answer = 42;" },
    "VarInt Encode": { input: "Hello" },
    "VarInt Decode": { input: "48656c6c6f", binary: true },
    "P-list Viewer": { input: "<?xml version=\"1.0\"?><plist version=\"1.0\"><dict><key>name</key><string>Buffy</string></dict></plist>" },
    "Offset checker": { input: "The quick brown fox" },
    "Frequency distribution": { input: "The quick brown fox jumps over the lazy dog." },
    "Numberwang": { input: "12345" },
    "XKCD Random Number": { input: "" },
    "TCP/IP Checksum": { input: PNG_B64, binary: true },
    "Scan for Embedded Files": { input: PNG_B64, binary: true },
    "Detect File Type": { input: PNG_B64, binary: true },
    "Binary": { input: "Hello, World!" },
    "Hamming Distance": { input: "hello", args: { "Key": TR("hallo") } },
    "Chi Square": { input: "aaaabbbbccccddddeeeeffff" },
    "Strings": { input: "Hello, World! 1234" },
    "Filter": { input: "alpha\nbeta\ngamma", args: { "Regex": "a$" } },
    "Fuzzy Match": { input: "hello world", args: { "Search": "helo wrld" } },
    "To Base": { input: "Hello, World!" },
    "Zlib Deflate": { input: "Hello, World!" },
    "Raw Deflate": { input: "Hello, World!" },
    "Bzip2 Compress": { input: "Hello, World!" },
    "Zip": { input: "Hello, World!" },
    "Tar": { input: "Hello, World!" },
    "Sleep": { input: "Hello", skip: "Useful but deliberately not auto-run: it pauses the verification queue." },
    "HTTP request": { input: "", skip: "Requires network access; run it from a graph with your own endpoint." },
    "DNS over HTTPS": { input: "example.com", skip: "Requires network access." },
    "Generate ECDSA Key Pair": { input: "", skip: "Generates non-deterministic key material." },
    "Generate PGP Key Pair": { input: "", skip: "Generates non-deterministic key material and is slow." },
    "Pseudo-Random Prime Generator": { input: "", skip: "Generates non-deterministic key material and is slow." },
    "Generate RSA Key Pair": { input: "", skip: "Generates non-deterministic key material and is slow." },
    "Generate UUID": { input: "", skip: "Output is intentionally random; use a graph node to inspect it." },
    "Get Time": { input: "", skip: "Output depends on the current time." },
    "Pseudo-Random Integer Generator": { input: "", skip: "Output is intentionally random." },
    "Pseudo-Random Number Generator": { input: "", skip: "Output is intentionally random." },
    "Parse ASN.1 hex string": { input: "3006020101020102", skip: "Needs an ASN.1 schema to be meaningful." },
    "Parse X.509 certificate": { input: "", skip: "Needs a certificate fixture; use the graph with your own PEM." },
    "Hex to PEM": { input: "", skip: "Needs DER key/certificate material." },
    "PGP Encrypt and Sign": { input: "", skip: "Needs PGP keys." },
    "RSA Sign": { input: "", skip: "Needs an RSA private key." },
    "RSA Verify": { input: "", skip: "Needs an RSA key and signature." },
    "Bcrypt": { input: "password", skip: "Deliberately slow password hashing; use the node graph when needed." },
    "Bcrypt parse": { input: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy" },
    "Optical Character Recognition": { input: PNG_B64, binary: true, skip: "Requires the OCR language model, which is not embedded." },
    "Extract EXIF": { input: JPEG_B64, binary: true },
    "Extract ID3": { input: "", skip: "Needs a tagged audio file." },
    "Extract Files": { input: "", skip: "Needs a container fixture." },
    "Convert Image Format": { input: PNG_B64, binary: true },
    "Normalise Image": { input: PNG_B64, binary: true },
    "Add Text To Image": { input: PNG_B64, binary: true },
    "Blur Image": { input: PNG_B64, binary: true },
    "Contain Image": { input: PNG_B64, binary: true },
    "Cover Image": { input: PNG_B64, binary: true },
    "Crop Image": { input: PNG_B64, binary: true },
    "Dither Image": { input: PNG_B64, binary: true },
    "Flip Image": { input: PNG_B64, binary: true },
    "Image Brightness / Contrast": { input: PNG_B64, binary: true },
    "Image Filter": { input: PNG_B64, binary: true },
    "Image Hue/Saturation/Lightness": { input: PNG_B64, binary: true },
    "Image Opacity": { input: PNG_B64, binary: true },
    "Invert Image": { input: PNG_B64, binary: true },
    "Resize Image": { input: PNG_B64, binary: true },
    "Rotate Image": { input: PNG_B64, binary: true },
    "Sharpen Image": { input: PNG_B64, binary: true },
    "Split Colour Channels": { input: PNG_B64, binary: true, expectedContains: "data:image/png;base64" },
    "Raw Inflate": { input: RAW_DEFLATE_B64, binary: true, expected: SAMPLE },
    "Zlib Inflate": { input: ZLIB_B64, binary: true, expected: SAMPLE },
    "Unzip": { input: ZIP_B64, binary: true, expectedContains: "sample.txt" },
    "Untar": { input: TAR_B64, binary: true, expectedContains: "sample.txt" },
};

/* Known answers for probe-only operations, added so those rows can pass or fail instead of
 * only reporting that the engine ran them. Every expectation comes from the operation's
 * documented behaviour, its source formula, or a hand computation — never from copying the
 * output the operation happens to produce today. That keeps the check able to catch a
 * regression. */
Object.assign(PROBES, {
    // Plain string transforms.
    "To Upper case": {...PROBES["To Upper case"], expected: "HELLO WORLD"},
    "To Lower case": {...PROBES["To Lower case"], expected: "hello world"},
    "Reverse": {...PROBES["Reverse"], expected: "dlrow olleh"},
    "Remove null bytes": {...PROBES["Remove null bytes"], expected: "Hello, World!"},
    "Expand alphabet range": {...PROBES["Expand alphabet range"], expected: "abcdefghijklmnopqrstuvwxyz"},
    "Split": {...PROBES["Split"], expected: "red\ngreen\nblue"},
    "Unique": {
        input: "one two one three two",
        args: { "Delimiter": "Space" },
        expected: "one two three"
    },
    "Take bytes": {...PROBES["Take bytes"], expected: "Hello"},
    "Pad lines": {...PROBES["Pad lines"], expected: "        alpha\n        beta"},
    "Count occurrences": {...PROBES["Count occurrences"], expected: "2"},
    "Add line numbers": {...PROBES["Add line numbers"], expected: "1 first line\n2 second line\n3 third line"},

    // Byte and character encodings whose answers are fixed by their definitions.
    // SNORT hex-content format: To Hex Content (All chars) wraps the bytes in pipes, and
    // From Hex Content is documented to turn |3d| back into the raw byte.
    "From Hex Content": { input: "|48 65 6c 6c 6f 2c 20 57 6f 72 6c 64 21|", expected: "Hello, World!" },
    "To Hex Content": {
        input: "Hello, World!",
        args: { "Convert": "All chars" },
        expected: "|48656c6c6f2c20576f726c6421|"
    },
    "To Decimal": {...PROBES["To Decimal"], expected: "72 101 108 108 111 44 32 87 111 114 108 100 33"},
    "To Braille": {...PROBES["To Braille"], expected: "⠓⠑⠇⠇⠕"},
    // The six-dot Braille table maps to uppercase ASCII; Braille itself has no case.
    "From Braille": {...PROBES["From Braille"], expected: "HELLO"},
    // The engine hands string inputs to ArrayBuffer operations as Latin-1 bytes, so the
    // `é` is the single byte 0xE9 and QP escapes it as =E9 (RFC 2045: = followed by the
    // byte's hex). `=` itself is not in the printable range list, so it becomes =3D.
    "To Quoted Printable": {...PROBES["To Quoted Printable"], expected: "Hello=3DWorld, caf=E9!"},
    "From Quoted Printable": {...PROBES["From Quoted Printable"], expected: "Hello=World, café!"},
    // Input bytes 48 65 6c 6c | 6f, four-byte words, padded with zeros, then each word is
    // reversed: 6c 6c 65 48 | 00 00 00 6f. toHex joins bytes with its default space.
    "Swap endianness": {...PROBES["Swap endianness"], expected: "6c 6c 65 48 00 00 00 6f"},

    // Checksums: computed from the published algorithms (Adler-32 mod 65521, Fletcher-8
    // mod 15 nibbles), independently of the operation.
    "Adler-32 Checksum": {...PROBES["Adler-32 Checksum"], expected: "1f9e046a"},
    "Fletcher-8 Checksum": {...PROBES["Fletcher-8 Checksum"], expected: "b4"},

    // Numbers and arithmetic.
    "Sum": {...PROBES["Sum"], expected: "10"},
    "Mean": {...PROBES["Mean"], expected: "2.5"},

    // Extractors: the expected lines are the matches in the fixture, in reading order.
    "Extract domains": {...PROBES["Extract domains"], expected: "example.com\ndocs.example.org"},
    "Extract URLs": {...PROBES["Extract URLs"], expected: "https://example.com/a?b=1\nhttp://test.local/x"},
    "Defang URL": {...PROBES["Defang URL"], expected: "hxxps[://]example[.]com/path?q=1&x=2"},
    "Fang URL": {
        input: "hxxps[://]example[.]com/path",
        args: { "Restore [.]": true, "Restore hxxp": true, "Restore ://": true },
        expected: "https://example.com/path"
    },

    // Identifier and naming formats.
    "Hex to Object Identifier": {...PROBES["Hex to Object Identifier"], expected: "1.2.840.113549.1.1.1"},
    "Object Identifier to Hex": {...PROBES["Object Identifier to Hex"], expected: "2a864886f70d010101"}
});

const MISSING_INPUT = {
    default: "The quick brown fox jumps over 13 lazy dogs.",
};

function officialFor(op) {
    const candidates = OFFICIAL.filter(t => (t.recipeConfig || []).some(r => r.op === op));
    if (!candidates.length) return null;
    const scored = candidates.map(t => {
        const recipe = t.recipeConfig || [];
        const pos = recipe.findIndex(r => r.op === op);
        const single = recipe.length === 1 && pos === 0;
        const first = pos === 0;
        const size = String(t.input || "").length + String(t.expectedOutput || "").length;
        const hasAssertion = Boolean(t.expectedOutput) || t.expectedMatch || t.unexpectedMatch || t.expectedError;
        let score = 0;
        if (single) score += 10000;
        if (first) score += 3000;
        if (!t.expectedError) score += 500;
        if (hasAssertion) score += 900;
        if (t.expectedOutput) score += 100;
        score -= Math.min(size, 9000) / 100;
        score -= recipe.length * 3;
        return { t, score };
    }).sort((a, b) => b.score - a.score);
    return scored[0].t;
}

function makeArgs(op, overrides = {}) {
    const base = defaultArgs(op);
    const argsMeta = CONFIG[op].args || [];
    for (const [name, value] of Object.entries(overrides)) {
        const idx = argsMeta.findIndex(a => a.name === name);
        if (idx >= 0) base[idx] = value;
    }
    return base;
}

// Compression/decompression pairs: run the encoder, then the decoder, and require
// the original bytes back. This gives inverses a real assertion rather than a smoke test.
// `extract` says how to pull the member bytes out of a decoder whose output is a
// file listing (CyberChef renders List<File> results as HTML).
const ROUNDTRIPS = [
    { id: "gzip", encoder: "Gzip", decoder: "Gunzip" },
    { id: "zlib", encoder: "Zlib Deflate", decoder: "Zlib Inflate" },
    { id: "raw", encoder: "Raw Deflate", decoder: "Raw Inflate" },
    { id: "bzip2", encoder: "Bzip2 Compress", decoder: "Bzip2 Decompress" },
    { id: "zip", encoder: "Zip", decoder: "Unzip", extract: "html-text" },
    { id: "tar", encoder: "Tar", decoder: "Untar", extract: "html-text" }
];
// Text pipelines that must return the input string unchanged. These cover the
// encoders whose inverse is a separate operation rather than a byte-level codec.
const TEXT_ROUNDTRIPS = [
    { id: "base64", label: "To Base64 → From Base64", ops: ["To Base64", "From Base64"] },
    { id: "hex", label: "To Hex → From Hex", ops: ["To Hex", "From Hex"] },
    { id: "punycode", label: "To Punycode → From Punycode", ops: ["To Punycode", "From Punycode"] },
    { id: "url", label: "URL Encode → URL Decode", ops: ["URL Encode", "URL Decode"] },
    { id: "htmlentity", label: "To HTML Entity → From HTML Entity", ops: ["To HTML Entity", "From HTML Entity"] },
    { id: "quotedprintable", label: "To Quoted Printable → From Quoted Printable", ops: ["To Quoted Printable", "From Quoted Printable"] },
    { id: "rot13", label: "ROT13 twice", ops: ["ROT13", "ROT13"] },
    // Not an identity pipeline: the decode step pretty-prints the JSON it rebuilds.
    { id: "messagepack", label: "To MessagePack → From MessagePack", ops: ["To MessagePack", "From MessagePack"], sample: MESSAGEPACK_JSON, expected: MESSAGEPACK_PRETTY }
];
const TEXT_ROUNDTRIP_SAMPLE = "Attack at dawn 13 times, node editor! ½ café";
const TEXT_ROUNDTRIP_OPS = new Set(TEXT_ROUNDTRIPS.flatMap(r => r.ops));

/* Upstream limitations, confirmed by running the same input through the official
 * CyberChef build (v11.5.0) in a browser: these operations fail identically there,
 * so the limitation belongs to CyberChef's browser build, not to this harness.
 * They are reported as "blocked" with the engine's own message instead of a failure.
 */
/* Upstream vector drift: the operation still behaves correctly, but a bundled library
 * changed its error text after CyberChef's vector was written. The check asserts the
 * stable prefix and records both strings instead of pretending they match.
 */
const DRIFT = {
    "From MessagePack": {
        expectedPrefix: "Could not decode MessagePack to JSON",
        note: "CyberChef's vector expects 'Error: Could not parse'; the bundled MessagePack decoder now raises 'RangeError: Offset is outside the bounds of the DataView'. The decode-failure path itself is unchanged."
    }
};

const BLOCKED = {
    "JWT Sign": "CyberChef's browser build has no node:crypto KeyObject, so jsonwebtoken throws 'Right-hand side of instanceof is not an object'. Reproduced in the official app.",
    "JWT Verify": "CyberChef's browser build has no node:crypto KeyObject, so jsonwebtoken throws 'Right-hand side of instanceof is not an object'. Reproduced in the official app.",
    "P-list Viewer": "The bundled plist parser reaches for a Node global that does not exist in a browser ('Cannot read properties of undefined (reading indexOf)'). Reproduced in the official app.",
};

function makeProbe(op) {
    const custom = PROBES[op] || {};
    if (custom.skip) {
        return { kind: "probe", skip: custom.skip };
    }
    const args = makeArgs(op, custom.args || {});
    const item = {
        kind: "probe",
        recipe: custom.ops ? custom.ops.map(step => ({ op: step.op, args: makeArgs(step.op, step.args || {}) })) : [{ op, args }],
    };
    if (custom.input !== undefined) {
        if (custom.binary) item.inputBase64 = custom.input;
        else item.input = custom.input;
    } else {
        item.input = MISSING_INPUT.default;
    }
    if (custom.expected !== undefined) item.expected = custom.expected;
    if (custom.expectedContains !== undefined) item.expectedContains = custom.expectedContains;
    return item;
}

const catalog = {
    engine: "CyberChef",
    version: VERSION,
    ops: {},
    categories: CATEGORIES.filter(c => c.name !== "Favourites" && c.ops.length),
};

for (const name of opNames) {
    const meta = CONFIG[name];
    const args = meta.args || [];
    catalog.ops[name] = {
        name,
        module: meta.module,
        category: catOf.get(name) || "Other",
        description: stripHtml(meta.description).slice(0, 420),
        inputType: meta.inputType,
        outputType: meta.outputType,
        flowControl: Boolean(meta.flowControl),
        args,
        defaults: defaultArgs(name),
    };
}

const tests = [];
/* Recreated dCode operations: every known-answer vector becomes one lab check. Ops
 * that only have a roundtrip pair still get a probe so nothing goes unexercised. */
const dcodeTested = new Set();
for (const check of dcodeChecks()) {
    dcodeTested.add(check.name);
    tests.push({
        op: check.name,
        kind: "dcode",
        name: check.name,
        input: check.input,
        args: check.args || {},
        expected: check.expected,
        recipe: [{op: check.name, args: makeArgs(check.name, check.args || {})}]
    });
}
for (const spec of DCODE) {
    if (dcodeTested.has(spec.name)) continue;
    // A probe with no known answer still needs input the operation can accept, so a
    // spec may name its own ("probeInput").
    tests.push({
        op: spec.name,
        kind: "probe",
        recipe: [{op: spec.name, args: defaultArgs(spec.name)}],
        input: spec.probeInput !== undefined ? spec.probeInput : MISSING_INPUT.default
    });
}

for (const name of opNames) {
    if (DCODE.some(spec => spec.name === name)) continue;
    const official = officialFor(name);
    if (official) {
        const item = {
            op: name,
            kind: "official",
            name: official.name,
            input: official.input,
            inputBase64: official.inputBase64,
            recipe: official.recipeConfig,
            expected: official.expectedOutput,
            expectedError: Boolean(official.expectedError),
        };
        if (official.expectedMatch) item.expectedMatch = official.expectedMatch;
        if (official.unexpectedMatch) item.unexpectedMatch = official.unexpectedMatch;
        const drift = DRIFT[name];
        if (drift) item.drift = drift;
        if (BLOCKED[name]) item.blockedReason = BLOCKED[name];
        tests.push(item);
    } else {
        const probe = makeProbe(name);
        const item = { op: name, ...probe };
        if (BLOCKED[name]) item.blockedReason = BLOCKED[name];
        tests.push(item);
    }
}

const roundtripTests = ROUNDTRIPS.map(r => ({
    id: r.id,
    encoder: r.encoder,
    decoder: r.decoder,
    encoderArgs: defaultArgs(r.encoder),
    decoderArgs: defaultArgs(r.decoder),
    extract: r.extract,
    sample: SAMPLE
}));

/* Cipher pairs: encode then decode with the same arguments must return the sample.
 * The pair's arguments are written for the encoder, so a decoder is only given the
 * ones it declares too. A decoder with no arguments at all (Zalgo, Leet) must get an
 * empty list: CyberChef hydrates every ingredient, and a stray value fails the recipe
 * before the decoder ever runs. */
function pairSteps(pair) {
    const encoderArgs = CONFIG[pair.encode]?.args || [];
    const decoderArgs = CONFIG[pair.decode]?.args || [];
    const decoderValues = defaultArgs(pair.decode);
    for (let i = 0; i < pair.args.length && i < decoderArgs.length; i++) {
        if (encoderArgs[i]?.name === decoderArgs[i].name) decoderValues[i] = pair.args[i];
    }
    return [
        {op: pair.encode, args: pair.args},
        {op: pair.decode, args: decoderValues}
    ];
}
const dcodeRoundtripTests = dcodePairs().map(pair => ({
    id: pair.id,
    label: `${pair.encode} → ${pair.decode}`,
    steps: pairSteps(pair),
    sample: pair.sample || TEXT_ROUNDTRIP_SAMPLE,
    expected: pair.expected || pair.sample || TEXT_ROUNDTRIP_SAMPLE
}));

const textRoundtripTests = TEXT_ROUNDTRIPS.map(r => ({
    id: r.id,
    label: r.label,
    steps: r.ops.map(op => ({ op, args: defaultArgs(op) })),
    sample: r.sample || TEXT_ROUNDTRIP_SAMPLE,
    expected: r.expected
})).concat(dcodeRoundtripTests);

catalog.categories = catalog.categories.map(c => ({ name: c.name, ops: c.ops.filter(o => catalog.ops[o]) }));
catalog.totalOps = opNames.length;

fs.writeFileSync("dev/meta.json", JSON.stringify(catalog));
fs.writeFileSync("dev/testplan.json", JSON.stringify({
    engine: "CyberChef",
    version: VERSION,
    official: tests.filter(t => t.kind === "official").length,
    dcode: tests.filter(t => t.kind === "dcode").length,
    // A probe with an expectation is a real pass/fail check now, so it is counted apart
    // from the rows that can still only report that the engine ran them.
    probes: tests.filter(t => t.kind === "probe" && !t.skip && t.expected === undefined && t.expectedContains === undefined).length,
    probeExpected: tests.filter(t => t.kind === "probe" && !t.skip && (t.expected !== undefined || t.expectedContains !== undefined)).length,
    skipped: tests.filter(t => t.skip).length,
    roundtrips: roundtripTests,
    textRoundtrips: textRoundtripTests,
    blocked: BLOCKED,
    tests,
}));

const sizes = {
    meta: fs.statSync("dev/meta.json").size,
    tests: fs.statSync("dev/testplan.json").size,
    official: tests.filter(t => t.kind === "official").length,
    dcode: tests.filter(t => t.kind === "dcode").length,
    dcodeOps: DCODE.length,
    probes: tests.filter(t => t.kind === "probe" && !t.skip && t.expected === undefined && t.expectedContains === undefined).length,
    probeExpected: tests.filter(t => t.kind === "probe" && !t.skip && (t.expected !== undefined || t.expectedContains !== undefined)).length,
    skipped: tests.filter(t => t.skip).length,
    total: tests.length,
};
console.log(sizes);
console.log("uncategorised", opNames.filter(o => !catOf.has(o)).join(", "));
