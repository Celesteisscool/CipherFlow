/* Runs the steganography module in Node, the same text the worker evaluates ------
 *   node dev/stego/selftest.mjs
 *
 * Checks the primitives against independent vectors (MD5, a DES FIPS vector, Java
 * Random's published seed-0 sequence), then runs the real operation classes over
 * OpenStego fixtures built here, over the committed vendor JPHide 0.3 and 0.51
 * fixtures, over the committed vendor StegoShare 1.01 carriers, and over a fresh
 * JPEG hidden by the reference jphide from the original JPHS package when
 * /tmp/jphs-ref is present.
 *
 * The OpenStego fixtures are embedded with an independent writer that follows the
 * Java classes, and the encryption branch is produced with Node's OpenSSL 3DES in
 * single-DES mode (K1=K2=K3), not with this runtime. PNG encoding/decoding is the
 * pngjs package the CyberChef build already depends on.
 */
import fs from "node:fs";
import zlib from "node:zlib";
import crypto from "node:crypto";
import {execFileSync} from "node:child_process";
import {PNG} from "pngjs";
import {MODULE_NAME, allOps, renderModule} from "./payload.mjs";

globalThis.self = {OperationConfig: {}, OpModules: {}, postMessage() {}};
(0, eval)(renderModule({exposeInternals: true}));
const T = globalThis.self.CipherFlowStegoTest;
const registry = globalThis.self.OpModules[MODULE_NAME];
const config = globalThis.self.OperationConfig;

let failures = 0;
let executed = 0;

function pass(name, detail = "") {
    executed++;
    console.log(`ok    ${name}${detail ? "  " + detail : ""}`);
}

function report(name, detail) {
    failures++;
    console.log(`FAIL  ${name}\n      ${detail}`);
}

function check(name, condition, detail) {
    if (condition) pass(name);
    else report(name, detail || "condition was false");
}

function bytes(name, actual, expected) {
    const a = Buffer.from(actual);
    const e = Buffer.from(expected);
    if (a.equals(e)) {
        pass(name, `${a.length} bytes`);
    } else {
        let at = 0;
        while (at < a.length && at < e.length && a[at] === e[at]) at++;
        report(name, `${a.length} bytes, expected ${e.length}; first difference at ${at}: ${a.subarray(at, at + 8).toString("hex")} vs ${e.subarray(at, at + 8).toString("hex")}`);
    }
}

function throws(name, fn) {
    try {
        const value = fn();
        if (value && typeof value.then === "function") {
            return value.then(
                () => report(name, "did not throw"),
                () => pass(name)
            );
        }
        report(name, "did not throw");
    } catch (err) {
        pass(name);
    }
    return Promise.resolve();
}

// Both formats rely on a padding check or a 24-bit length, not an authentication
// tag, so a wrong password may fail loudly or return different bytes. What it must
// never do is hand back the hidden file.
async function wrongSecret(name, fn, expected) {
    try {
        const got = await fn();
        check(name, !Buffer.from(got).equals(Buffer.from(expected)), "returned the hidden payload");
    } catch (err) {
        pass(name);
    }
}

function arrayBuffer(buf) {
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function toBuffer(value) {
    if (value instanceof ArrayBuffer) return Buffer.from(value);
    if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    if (Array.isArray(value)) return Buffer.from(value);
    return Buffer.from(String(value), "utf8");
}

async function runOp(name, input, args) {
    const cls = registry[name];
    if (!cls) throw new Error(`${name} was not registered`);
    const raw = await new cls().run(arrayBuffer(Buffer.from(input)), args);
    // CyberChef's byteArray dish accepts a Uint8Array (or a plain array), not an
    // ArrayBuffer. Catch the boundary here as well as in the browser.
    if (!(raw instanceof Uint8Array) && !Array.isArray(raw)) {
        throw new Error(`${name} returned ${Object.prototype.toString.call(raw)}, not a byteArray`);
    }
    return toBuffer(raw);
}

/* ---------------------------------------------------------------- primitives */
check("module registers every operation", Object.keys(registry).length === allOps().length, JSON.stringify(Object.keys(registry)));
for (const spec of allOps()) {
    check(`${spec.name} has operation config`, Boolean(config[spec.name]), "missing from OperationConfig");
    check(`${spec.name} takes ArrayBuffer and returns bytes`,
        config[spec.name] && config[spec.name].inputType === "ArrayBuffer" && config[spec.name].outputType === "byteArray",
        JSON.stringify(config[spec.name] && {input: config[spec.name].inputType, output: config[spec.name].outputType}));
}

const md5 = value => Buffer.from(T.md5(Buffer.from(value))).toString("hex");
check("MD5 empty", md5("") === "d41d8cd98f00b204e9800998ecf8427e", md5(""));
check("MD5 abc", md5("abc") === "900150983cd24fb0d6963f7d28e17f72", md5("abc"));
check("MD5 long", md5("The quick brown fox jumps over the lazy dog") === "9e107d9d372bb6826bd81d3542a419d6");

const desKeys = T.desSubkeys(Buffer.from("133457799BBCDFF1", "hex"));
bytes("DES FIPS 81 decrypt vector",
    T.desDecryptBlock(Buffer.from("85E813540F0AB405", "hex"), desKeys),
    Buffer.from("0123456789ABCDEF", "hex"));

// The B_ (big-endian block) vectors from the bf.c self-test JPHS ships.
for (const vector of [
    {key: "abcdefghijklmnopqrstuvwxyz", plain: "424c4f5746495348", cipher: "324ed0fef413a203"},
    {key: "Who is John Galt?", plain: "fedcba9876543210", cipher: "cc91732b8022f684"}
]) {
    const key = T.bfExpandKey(Buffer.from(vector.key));
    const state = Buffer.from(vector.plain, "hex");
    T.bfEncryptBytes(state, key);
    check(`Blowfish encrypt (${vector.key})`, state.toString("hex") === vector.cipher, state.toString("hex"));
    T.bfDecryptBytes(state, key);
    bytes(`Blowfish decrypt (${vector.key})`, state, Buffer.from(vector.plain, "hex"));
}

check("JPHide 0.51 keeps a 50-byte passphrase",
    Buffer.from(T.jphideV05Pass("a".repeat(50))).equals(Buffer.from("a".repeat(50))));
check("JPHide 0.51 folds a passphrase over 50 bytes",
    Buffer.from(T.jphideV05Pass("0123456789".repeat(6))).equals(
        Buffer.concat([Buffer.alloc(10), Buffer.from("0123456789".repeat(4))])),
    Buffer.from(T.jphideV05Pass("0123456789".repeat(6))).toString("hex"));
check("JPHide 0.51 allows an empty passphrase", T.jphideV05Pass("").length === 0);

check("Java Random seed 0 next()", T.javaRandom(0n).next() === -1155484576, String(T.javaRandom(0n).next()));
const jr = T.javaRandom(0n);
const sequence = [jr.nextInt(100), jr.nextInt(100), jr.nextInt(100), jr.nextInt(100), jr.nextInt(100)];
check("Java Random seed 0 nextInt(100)", sequence.join(",") === "60,48,29,47,15", sequence.join(","));
check("Java Random empty-password seed", T.passwordSeed("") === 98234782n, String(T.passwordSeed("")));

/* ------------------------------------------------------------ OpenStego fixtures */
const SALT = Buffer.from([0x28, 0x5f, 0x71, 0xc9, 0x1e, 0x35, 0x0a, 0x62]);

// Node's OpenSSL exposes des-ede3-cbc; K1=K2=K3 is exactly single DES.
function pbeEncrypt(data, password) {
    const pass = Buffer.alloc(password.length);
    for (let i = 0; i < password.length; i++) pass[i] = password.charCodeAt(i) & 0xff;
    let hash = crypto.createHash("md5").update(Buffer.concat([pass, SALT])).digest();
    for (let i = 1; i < 7; i++) hash = crypto.createHash("md5").update(hash).digest();
    const key = Buffer.concat([hash.subarray(0, 8), hash.subarray(0, 8), hash.subarray(0, 8)]);
    const cipher = crypto.createCipheriv("des-ede3-cbc", key, hash.subarray(8, 16));
    cipher.setAutoPadding(true);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

function makeRgba(width, height) {
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
        rgba[i * 4] = (i * 37 + 11) & 0xff;
        rgba[i * 4 + 1] = (i * 73 + 29) & 0xff;
        rgba[i * 4 + 2] = (i * 101 + 7) & 0xff;
        rgba[i * 4 + 3] = 255;
    }
    return rgba;
}

function headerFor(dataLength, channelBits, fileName, compression, encryption) {
    const name = Buffer.from(fileName, "utf8");
    const out = Buffer.alloc(18 + name.length);
    out.write("OPENSTEGO", 0, "ascii");
    out[9] = 1;
    out[10] = dataLength & 0xff;
    out[11] = (dataLength >> 8) & 0xff;
    out[12] = (dataLength >> 16) & 0xff;
    out[13] = 0; // OpenStego's byteToInt(...) << 32 is a shift by 0, so this byte is written as 0
    out[14] = channelBits;
    out[15] = name.length;
    out[16] = compression ? 1 : 0;
    out[17] = encryption ? 1 : 0;
    name.copy(out, 18);
    return out;
}

function channelBitsFor(width, height, headerSize, dataLength) {
    let channelBits = 1;
    while ((width * height * 3 * channelBits) / 8 < headerSize + dataLength) {
        channelBits++;
        if (channelBits > 8) throw new Error("fixture image is too small");
    }
    return channelBits;
}

function prepare(width, height, payload, fileName, password, compression, encryption) {
    let data = Buffer.from(payload);
    if (compression) data = zlib.gzipSync(data);
    if (encryption) data = pbeEncrypt(data, password);
    const headerSize = 18 + Buffer.byteLength(fileName, "utf8");
    const channelBits = channelBitsFor(width, height, headerSize, data.length);
    return {
        header: headerFor(data.length, channelBits, fileName, compression, encryption),
        data,
        channelBits
    };
}

function embedSequential(rgba, width, height, fixture) {
    let x = 0, y = 0, currBit = 0, channelBits = 1;

    function putByte(byte) {
        for (let i = 0; i < 8; i++) {
            const bit = (byte >> (7 - i)) & 1;
            const pixel = (y * width + x) * 4;
            const group = Math.floor(currBit / channelBits);
            const groupBit = currBit % channelBits;
            const shift = channelBits - groupBit - 1;
            rgba[pixel + group] = (rgba[pixel + group] & ~(1 << shift)) | (bit << shift);
            currBit++;
            if (currBit === 3 * channelBits) {
                currBit = 0;
                x++;
                if (x === width) {
                    x = 0;
                    y++;
                    if (y === height) throw new Error("fixture overflow");
                }
            }
        }
    }

    for (const byte of fixture.header) putByte(byte);
    if (currBit !== 0) {
        currBit = 0;
        x++;
        if (x === width) { x = 0; y++; }
    }
    channelBits = fixture.channelBits;
    for (const byte of fixture.data) putByte(byte);
}

function embedRandom(rgba, width, height, fixture, password) {
    const rand = T.javaRandom(T.passwordSeed(password));
    const used = new Uint8Array(width * height * 3); // bitset: eight bit slots per RGB channel
    let channelBits = 1;

    function putBit(bit) {
        for (;;) {
            const x = rand.nextInt(width);
            const y = rand.nextInt(height);
            const channel = rand.nextInt(3);
            const slot = rand.nextInt(channelBits);
            const index = ((y * width + x) * 3 + channel) * 8 + slot;
            if ((used[index >> 3] >>> (index & 7)) & 1) continue;
            used[index >> 3] |= 1 << (index & 7);
            const offset = (y * width + x) * 4 + [2, 1, 0][channel];
            rgba[offset] = (rgba[offset] & ~(1 << slot)) | (bit << slot);
            return;
        }
    }

    for (const byte of fixture.header) {
        for (let i = 0; i < 8; i++) putBit((byte >> (7 - i)) & 1);
    }
    channelBits = fixture.channelBits;
    for (const byte of fixture.data) {
        for (let i = 0; i < 8; i++) putBit((byte >> (7 - i)) & 1);
    }
}

function pngOf(rgba, width, height) {
    return PNG.sync.write({width, height, data: rgba}, {colorType: 6});
}

globalThis.cfStegoDecodeImage = bytes => {
    const png = PNG.sync.read(Buffer.from(bytes));
    return {width: png.width, height: png.height, data: png.data};
};

const SHORT = Buffer.from("OpenStego fixture: the quick brown fox jumps over 13 lazy dogs.\n", "utf8");
// Incompressible on purpose: the GZIP fixture needs to stay large enough to force
// OpenStego past one channel bit even on a small cover image.
const LONG = crypto.randomBytes(9000);

const sequentialSmall = prepare(160, 120, SHORT, "note.txt", "", false, false);
check("sequential fixture uses one channel bit", sequentialSmall.channelBits === 1, String(sequentialSmall.channelBits));
{
    const width = 160, height = 120;
    const rgba = makeRgba(width, height);
    embedSequential(rgba, width, height, sequentialSmall);
    const png = pngOf(rgba, width, height);
    const got = await runOp("OpenStego Extract", png, ["Auto", ""]);
    bytes("OpenStego LSB extract (Auto)", got, SHORT);
    bytes("OpenStego LSB extract (explicit)", await runOp("OpenStego Extract", png, ["LSB", ""]), SHORT);
}

const sequentialBig = prepare(64, 64, LONG, "café.bin", "s3cret", true, true);
check("compressed fixture uses more than one channel bit", sequentialBig.channelBits > 1, String(sequentialBig.channelBits));
{
    const width = 64, height = 64;
    const rgba = makeRgba(width, height);
    embedSequential(rgba, width, height, sequentialBig);
    const png = pngOf(rgba, width, height);
    bytes("OpenStego LSB extract (GZIP + password, multi-bit)", await runOp("OpenStego Extract", png, ["LSB", "s3cret"]), LONG);
    await wrongSecret("OpenStego LSB does not accept a wrong password", () => runOp("OpenStego Extract", png, ["LSB", "wrong"]), LONG);
}

const randomFixture = prepare(96, 96, SHORT, "random.txt", "rand-pass", true, true);
{
    const width = 96, height = 96;
    const rgba = makeRgba(width, height);
    embedRandom(rgba, width, height, randomFixture, "rand-pass");
    const png = pngOf(rgba, width, height);
    bytes("OpenStego RandomLSB extract (Auto)", await runOp("OpenStego Extract", png, ["Auto", "rand-pass"]), SHORT);
    bytes("OpenStego RandomLSB extract (explicit)", await runOp("OpenStego Extract", png, ["RandomLSB", "rand-pass"]), SHORT);
    await wrongSecret("OpenStego RandomLSB does not accept a wrong password", () => runOp("OpenStego Extract", png, ["RandomLSB", "wrong"]), SHORT);
}

{
    const plain = PNG.sync.write({width: 20, height: 20, data: makeRgba(20, 20)}, {colorType: 6});
    await throws("OpenStego rejects an image with no header", () => runOp("OpenStego Extract", plain, ["Auto", ""]));
}

/* ------------------------------------------------------- vendor JPHide fixtures */
{
    const fixtureDir = new URL("./fixtures/", import.meta.url);
    const fixtureManifest = JSON.parse(fs.readFileSync(new URL("manifest.json", fixtureDir), "utf8"));
    for (const fixture of fixtureManifest.fixtures || []) {
        if (fixture.operation !== "JPHide / JPSeek Extract" && fixture.operation !== "StegoShare Extract") continue;
        try {
            const carrier = fs.readFileSync(new URL(fixture.carrier, fixtureDir));
            const expected = fs.readFileSync(new URL(fixture.payload, fixtureDir));
            bytes(`${fixture.id} · ${fixture.tool}`, await runOp(fixture.operation, carrier, fixture.values), expected);
            await wrongSecret(`${fixture.id} does not accept a wrong passphrase`,
                () => runOp(fixture.operation, carrier, ["wrong-" + fixture.id]), expected);
        } catch (err) {
            report(`${fixture.id} · ${fixture.tool}`, String(err && err.message ? err.message : err));
        }
    }
}

/* -------------------------------------------------------------------- JPHide */
const jphsDir = "/tmp/jphs-ref";
const jphide = `${jphsDir}/jphide`;
const jpseek = `${jphsDir}/jpseek`;
const cover = "/tmp/boxA.jpg";
if (fs.existsSync(jphide) && fs.existsSync(jpseek) && fs.existsSync(cover)) {
    const payload = Buffer.from("JPHide fixture payload — CipherFlow self-test — 0123456789.\n".repeat(5), "utf8");
    const payloadPath = "/tmp/cipherflow-jphide-payload.bin";
    const stegoPath = "/tmp/cipherflow-jphide-stego.jpg";
    const seekPath = "/tmp/cipherflow-jphide-seek.bin";
    fs.writeFileSync(payloadPath, payload);
    try {
        execFileSync(jphide, [cover, stegoPath, payloadPath], {
            input: "selftest-pass\nselftest-pass\n",
            stdio: ["pipe", "ignore", "pipe"]
        });
        execFileSync(jpseek, [stegoPath, seekPath], {
            input: "selftest-pass\n",
            stdio: ["pipe", "ignore", "pipe"]
        });
        fs.chmodSync(seekPath, 0o644);
        bytes("reference jpseek reads its own fixture", fs.readFileSync(seekPath), payload);
        const got = await runOp("JPHide / JPSeek Extract", fs.readFileSync(stegoPath), ["selftest-pass"]);
        bytes("JPHide extract from a real jphide JPEG", got, payload);
        await wrongSecret("JPHide does not accept a wrong passphrase", () => runOp("JPHide / JPSeek Extract", fs.readFileSync(stegoPath), ["not-the-passphrase"]), payload);
    } catch (err) {
        report("JPHide reference fixture", String(err && err.message ? err.message : err));
    }
} else {
    console.log(`skip  JPHide reference fixture (${jphsDir}, or ${cover}, is not present)`);
}

/* ------------------------------------------------------------- StegoShare */
{
    const dir = new URL("./fixtures/", import.meta.url);
    const single = fs.readFileSync(new URL("stegoshare-single.png", dir));
    const setFirst = fs.readFileSync(new URL("stegoshare-set-1.png", dir));
    const setSecond = fs.readFileSync(new URL("stegoshare-set-2.png", dir));
    const empty = fs.readFileSync(new URL("stegoshare-empty.png", dir));
    const emptyPayload = fs.readFileSync(new URL("stegoshare-empty.payload.txt", dir));

    check("StegoShare treats an empty password as the zero key",
        Buffer.from(T.stegoshareKey("")).equals(Buffer.alloc(16)));
    check("StegoShare treats the literal Empty as the zero key",
        Buffer.from(T.stegoshareKey("Empty")).equals(Buffer.alloc(16)));
    check("StegoShare derives a 16-byte MD5 key",
        Buffer.from(T.stegoshareKey("vendor-single-pass")).toString("hex") ===
            crypto.createHash("md5").update("vendor-single-pass").digest("hex"));

    bytes("StegoShare accepts the literal Empty for an unprotected carrier",
        await runOp("StegoShare Extract", empty, ["Empty"]), emptyPayload);
    await throws("StegoShare rejects a later share on its own",
        () => runOp("StegoShare Extract", setSecond, ["vendor-set-pass"]));
    await throws("StegoShare rejects a full first share on its own",
        () => runOp("StegoShare Extract", setFirst, ["vendor-set-pass"]));
    const emptyZip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x05, 0x06]), Buffer.alloc(18)]);
    await throws("StegoShare rejects a ZIP with no PNGs",
        () => runOp("StegoShare Extract", emptyZip, [""]));
    const plain = PNG.sync.write({width: 20, height: 20, data: makeRgba(20, 20)}, {colorType: 6});
    await throws("StegoShare rejects an ordinary PNG",
        () => runOp("StegoShare Extract", plain, [""]));
    check("StegoShare reads the 16-bit index and 32-bit length",
        (() => {
            const png = PNG.sync.read(single);
            const share = T.stegoshareReadImage(png.data, png.width, png.height, T.stegoshareKey("vendor-single-pass"));
            return share.index === 0 && share.size === 336 && share.capacity === png.width * png.height - 6;
        })(),
        "header did not decode as expected");
}

console.log(failures ? `\n${failures} problem(s) across ${executed} executed check(s)` : `\nall ${executed} checks passed`);
process.exit(failures ? 1 : 0);
