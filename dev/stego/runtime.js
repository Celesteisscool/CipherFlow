/* CipherFlow steganography runtime ------------------------------------------------
 * Plain script, concatenated into the generated CipherFlowStego worker module. It is
 * deliberately import-free: operation bodies are serialized into worker text, so every
 * helper they call has to travel in the same string. The Node self-test evaluates this
 * exact generated module, which is why nothing here touches the DOM.
 *
 * Decoders:
 *   OpenStego  RandomLSB and sequential LSB, header v1/v2, optional password
 *              (PBEWithMD5AndDES or PBES2/HMAC-SHA256/AES) and optional GZIP
 *              compression.
 *   JPHide     JPSeek's coefficient scan for JPHide 0.3 on Linux (big-endian
 *              streams) and JPHide/JPSeek 0.5/0.51 on Windows (native
 *              little-endian streams, mode selector bit, LZO1X payloads), for
 *              3-component JPEGs.
 *   StegoShare StegoShare 1.01's multi-image LSB layout, MD5-keyed by pixel bits
 *              the embedder leaves untouched, for PNG carriers and ZIP sets.
 *
 * Each format is reconstructed from its published source: OpenStego
 * (LSBInputStream / RandomLSBInputStream / OpenStegoCrypto), Allan Latham's
 * JPHide/JPSeek 0.3 and 0.5/0.51 (jpseek.c, bf.c, ltable.h), and StegoShare
 * 1.01 (Stego.java).
 */
var CF_STEGO = (function () {
    "use strict";

    var MAX_OUTPUT = 512 * 1024 * 1024;

    function fail(message) {
        throw new Error(message);
    }

    function toBytes(input) {
        if (input instanceof ArrayBuffer) return new Uint8Array(input);
        if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(input)) {
            return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        }
        if (typeof input === "string") {
            var out = new Uint8Array(input.length);
            for (var i = 0; i < input.length; i++) out[i] = input.charCodeAt(i) & 0xff;
            return out;
        }
        if (input && input.buffer instanceof ArrayBuffer) {
            return new Uint8Array(input.buffer, input.byteOffset || 0, input.byteLength || input.buffer.byteLength);
        }
        fail("Expected binary input (an image or a JPEG file).");
    }

    function toByteArray(bytes) {
        // CyberChef's byteArray dish accepts a plain numeric array as well as a
        // Uint8Array. Use a fresh array so the value does not carry a foreign
        // typed-array realm across the operation boundary.
        return Array.from(bytes);
    }

    function utf8Encode(text) {
        return new TextEncoder().encode(String(text));
    }

    function utf8Decode(bytes) {
        return new TextDecoder().decode(bytes);
    }

    function writeLE32(out, offset, value) {
        out[offset] = value & 0xff;
        out[offset + 1] = (value >>> 8) & 0xff;
        out[offset + 2] = (value >>> 16) & 0xff;
        out[offset + 3] = (value >>> 24) & 0xff;
    }

    function writeBE32(out, offset, value) {
        out[offset] = (value >>> 24) & 0xff;
        out[offset + 1] = (value >>> 16) & 0xff;
        out[offset + 2] = (value >>> 8) & 0xff;
        out[offset + 3] = value & 0xff;
    }

    function readLE32(bytes, offset) {
        return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
    }

    function readBE32(bytes, offset) {
        return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
    }

    /* ------------------------------------------------------------------ MD5
     * Used twice: for OpenStego's RandomLSB seed (MD5 of the password's UTF-8
     * bytes, first 15 hex digits parsed as a Java long) and for the
     * PBEWithMD5AndDES key derivation. A browser WebCrypto MD5 does not exist,
     * so the 64-round function is here.
     */
    var MD5_S = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ];
    var MD5_K = (function () {
        var k = new Int32Array(64);
        for (var i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
        return k;
    })();

    function md5(bytes) {
        var length = bytes.length;
        var blocks = ((length + 8) >> 6) + 1;
        var words = new Int32Array(blocks * 16);
        for (var i = 0; i < length; i++) words[i >> 2] |= (bytes[i] & 0xff) << ((i & 3) * 8);
        words[length >> 2] |= 0x80 << ((length & 3) * 8);
        words[blocks * 16 - 2] = (length * 8) >>> 0;
        words[blocks * 16 - 1] = Math.floor(length / 536870912) >>> 0;

        var a0 = 0x67452301 | 0;
        var b0 = 0xefcdab89 | 0;
        var c0 = 0x98badcfe | 0;
        var d0 = 0x10325476 | 0;

        for (var off = 0; off < words.length; off += 16) {
            var a = a0, b = b0, c = c0, d = d0;
            for (var n = 0; n < 64; n++) {
                var f, g;
                if (n < 16) {
                    f = (b & c) | (~b & d);
                    g = n;
                } else if (n < 32) {
                    f = (d & b) | (~d & c);
                    g = (5 * n + 1) & 15;
                } else if (n < 48) {
                    f = b ^ c ^ d;
                    g = (3 * n + 5) & 15;
                } else {
                    f = c ^ (b | ~d);
                    g = (7 * n) & 15;
                }
                f = (f + a + MD5_K[n] + words[off + g]) | 0;
                a = d;
                d = c;
                c = b;
                var shift = MD5_S[n];
                b = (b + ((f << shift) | (f >>> (32 - shift)))) | 0;
            }
            a0 = (a0 + a) | 0;
            b0 = (b0 + b) | 0;
            c0 = (c0 + c) | 0;
            d0 = (d0 + d) | 0;
        }

        var out = new Uint8Array(16);
        var state = [a0, b0, c0, d0];
        for (var w = 0; w < 4; w++) {
            out[w * 4] = state[w] & 0xff;
            out[w * 4 + 1] = (state[w] >>> 8) & 0xff;
            out[w * 4 + 2] = (state[w] >>> 16) & 0xff;
            out[w * 4 + 3] = (state[w] >>> 24) & 0xff;
        }
        return out;
    }

    /* ------------------------------------------------------------------ DES
     * PBEWithMD5AndDES is plain single DES in CBC mode with PKCS#5 padding.
     * Only decryption is needed. The tables are the FIPS 46-3 ones.
     */
    var DES_PC1 = [
        57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18,
        10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36,
        63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22,
        14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4
    ];
    var DES_SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
    var DES_PC2 = [
        14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4,
        26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40,
        51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32
    ];
    var DES_IP = [
        58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
        62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
        57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
        61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7
    ];
    var DES_FP = [
        40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31,
        38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29,
        36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27,
        34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25
    ];
    var DES_E = [
        32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11,
        12, 13, 12, 13, 14, 15, 16, 17, 16, 17, 18, 19, 20, 21, 20, 21,
        22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1
    ];
    var DES_P = [
        16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
        2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25
    ];
    var DES_S = [
        [
            14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7,
            0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8,
            4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0,
            15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13
        ],
        [
            15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10,
            3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5,
            0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15,
            13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9
        ],
        [
            10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8,
            13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1,
            13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7,
            1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12
        ],
        [
            7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15,
            13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9,
            10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4,
            3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14
        ],
        [
            2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9,
            14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6,
            4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14,
            11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3
        ],
        [
            12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11,
            10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8,
            9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6,
            4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13
        ],
        [
            4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1,
            13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6,
            1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2,
            6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12
        ],
        [
            13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7,
            1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2,
            7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8,
            2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11
        ]
    ];

    function permute64(hi, lo, table) {
        var out = new Uint8Array(table.length);
        for (var i = 0; i < table.length; i++) {
            var src = table[i] - 1;
            out[i] = src < 32 ? ((hi >>> (31 - src)) & 1) : ((lo >>> (63 - src)) & 1);
        }
        return out;
    }

    function permute32(value, table) {
        var out = 0;
        for (var i = 0; i < table.length; i++) {
            out = (out << 1) | ((value >>> (32 - table[i])) & 1);
        }
        return out >>> 0;
    }

    function desRotate28(list, count) {
        var out = new Uint8Array(28);
        for (var i = 0; i < 28; i++) out[i] = list[(i + count) % 28];
        return out;
    }

    function desSubkeys(key) {
        var hi = readBE32(key, 0);
        var lo = readBE32(key, 4);
        var cd = permute64(hi, lo, DES_PC1);
        var c = cd.subarray(0, 28);
        var d = cd.subarray(28, 56);
        var keys = [];
        for (var round = 0; round < 16; round++) {
            c = desRotate28(c, DES_SHIFTS[round]);
            d = desRotate28(d, DES_SHIFTS[round]);
            var combined = new Uint8Array(56);
            combined.set(c, 0);
            combined.set(d, 28);
            var bits = new Uint8Array(48);
            for (var i = 0; i < 48; i++) bits[i] = combined[DES_PC2[i] - 1];
            var sub = new Uint8Array(8);
            for (var group = 0; group < 8; group++) {
                var value = 0;
                for (var k = 0; k < 6; k++) value = (value << 1) | bits[group * 6 + k];
                sub[group] = value;
            }
            keys.push(sub);
        }
        return keys;
    }

    function desF(r, sub) {
        var out = 0;
        for (var group = 0; group < 8; group++) {
            var value = 0;
            for (var k = 0; k < 6; k++) {
                value = (value << 1) | ((r >>> (32 - DES_E[group * 6 + k])) & 1);
            }
            value ^= sub[group];
            var row = (((value >> 5) & 1) << 1) | (value & 1);
            var col = (value >> 1) & 15;
            out = (out << 4) | DES_S[group][row * 16 + col];
        }
        return permute32(out, DES_P);
    }

    function desDecryptBlock(block, keys) {
        var hi = readBE32(block, 0);
        var lo = readBE32(block, 4);
        var ip = permute64(hi, lo, DES_IP);
        var l = 0, r = 0;
        for (var i = 0; i < 32; i++) {
            r = (r << 1) | ip[i];
            l = (l << 1) | ip[32 + i];
        }
        for (var round = 15; round >= 0; round--) {
            var next = (r ^ desF(l, keys[round])) >>> 0;
            r = l;
            l = next;
        }
        var fp = permute64(l, r, DES_FP);
        var out = new Uint8Array(8);
        for (var n = 0; n < 8; n++) {
            out[n] = 0;
            for (var b = 0; b < 8; b++) out[n] = (out[n] << 1) | fp[n * 8 + b];
        }
        return out;
    }

    function desCbcDecrypt(cipher, key, iv) {
        if (!cipher.length || cipher.length % 8) fail("The encrypted OpenStego data has an invalid length.");
        var keys = desSubkeys(key);
        var out = new Uint8Array(cipher.length);
        var prev = iv;
        for (var off = 0; off < cipher.length; off += 8) {
            var block = cipher.subarray(off, off + 8);
            var plain = desDecryptBlock(block, keys);
            for (var i = 0; i < 8; i++) out[off + i] = plain[i] ^ prev[i];
            prev = block;
        }
        var pad = out[out.length - 1];
        if (pad < 1 || pad > 8 || pad > out.length) fail("Invalid password: the OpenStego data could not be decrypted.");
        for (var check = out.length - pad; check < out.length; check++) {
            if (out[check] !== pad) fail("Invalid password: the OpenStego data could not be decrypted.");
        }
        return out.subarray(0, out.length - pad);
    }

    /* ---------------------------------------------------------- Java Random
     * RandomLSB's coordinates come from java.util.Random, including its
     * nextInt(bound) rejection loop. A 48-bit state needs BigInt: the seed is a
     * Java long made from 15 hex digits, more than a double can hold exactly.
     */
    var JAVA_MULT = 0x5deece66dn;
    var JAVA_ADD = 0xbn;
    var JAVA_MASK = 0xffffffffffffn;

    function javaRandom(seed) {
        var state = ((typeof seed === "bigint" ? seed : BigInt(seed)) ^ JAVA_MULT) & JAVA_MASK;

        function next(bits) {
            if (bits == null) bits = 32; // java.util.Random.nextInt() calls next(32)
            state = (state * JAVA_MULT + JAVA_ADD) & JAVA_MASK;
            var value = Number(state >> BigInt(48 - bits));
            return bits === 32 ? value | 0 : value; // java.util.Random.next(32) is a signed int
        }

        function nextInt(bound) {
            if (!Number.isInteger(bound) || bound <= 0) fail("Invalid random bound " + bound + ".");
            var r = next(31);
            if ((bound & (bound - 1)) === 0) {
                return Number((BigInt(bound) * BigInt(r)) >> 31n);
            }
            var m = bound - 1;
            for (;;) {
                var reduced = r % bound;
                // Java's int arithmetic wraps; the retry exists to reject the
                // short top slice when u - reduced + m does not fit in 31 bits.
                if (r - reduced + m < 0x80000000) return reduced;
                r = next(31);
            }
        }

        return {next: next, nextInt: nextInt};
    }

    function passwordSeed(password) {
        if (password == null) password = "";
        password = String(password);
        if (password === "") return 98234782n;
        var hash = md5(utf8Encode(password));
        var hex = "";
        for (var i = 0; i < 16; i++) hex += (hash[i] < 16 ? "0" : "") + hash[i].toString(16);
        return BigInt("0x" + hex.slice(0, 15));
    }

    var OPENSTEGO_PBE_SALT = new Uint8Array([0x28, 0x5f, 0x71, 0xc9, 0x1e, 0x35, 0x0a, 0x62]);

    function pbeDecrypt(cipher, password) {
        if (password == null) password = "";
        password = String(password);
        var pass = new Uint8Array(password.length);
        for (var i = 0; i < password.length; i++) pass[i] = password.charCodeAt(i) & 0xff;
        var seed = new Uint8Array(pass.length + OPENSTEGO_PBE_SALT.length);
        seed.set(pass, 0);
        seed.set(OPENSTEGO_PBE_SALT, pass.length);
        var hash = md5(seed);
        for (var round = 1; round < 7; round++) hash = md5(hash);
        return desCbcDecrypt(cipher, hash.subarray(0, 8), hash.subarray(8, 16));
    }

    // OpenStego 0.7 and later write a version 2 header: the fixed header is
    // followed by the eight-byte encryption name, then the file name. Their
    // default encryption is PBES2 (PBKDF2-HMAC-SHA256, seven rounds, AES-CBC),
    // and the ciphertext is prefixed with Java's DER-encoded algorithm
    // parameters. The DER blob is only needed for the IV; the salt and iteration
    // count are the same constants as the older DES scheme.
    function derFindIv(params) {
        var iv = null;
        function walk(start, end) {
            var i = start;
            while (i < end) {
                var tag = params[i++];
                if (i >= end) return;
                var len = params[i++];
                if (len & 0x80) {
                    var count = len & 0x7f;
                    if (!count || count > 4 || i + count > end) return;
                    len = 0;
                    for (var n = 0; n < count; n++) len = (len << 8) | params[i++];
                }
                if (i + len > end) return;
                if (tag === 0x04 && len === 16) iv = params.subarray(i, i + len);
                if (tag & 0x20) walk(i, i + len);
                i += len;
            }
        }
        walk(0, params.length);
        if (!iv) fail("The OpenStego AES parameters do not contain an IV.");
        return iv;
    }

    async function aesPbeDecrypt(payload, password, algorithm) {
        var paramLength = payload[0];
        if (!paramLength || paramLength + 1 >= payload.length) fail("The OpenStego AES parameters are missing.");
        var params = payload.subarray(1, 1 + paramLength);
        var ciphertext = payload.subarray(1 + paramLength);
        if (!ciphertext.length || ciphertext.length % 16) fail("The OpenStego AES payload is not a whole number of blocks.");
        var iv = derFindIv(params);
        var webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : null;
        if (!webCrypto || !webCrypto.subtle) fail("This browser cannot decrypt OpenStego's AES payload (Web Crypto is missing).");
        var pass = utf8Encode(String(password == null ? "" : password));
        var keyBits = algorithm === "AES256" ? 256 : 128;
        try {
            var material = await webCrypto.subtle.importKey("raw", pass, "PBKDF2", false, ["deriveKey"]);
            var key = await webCrypto.subtle.deriveKey(
                {name: "PBKDF2", salt: OPENSTEGO_PBE_SALT, iterations: 7, hash: "SHA-256"},
                material,
                {name: "AES-CBC", length: keyBits},
                false,
                ["decrypt"]
            );
            var plain = await webCrypto.subtle.decrypt({name: "AES-CBC", iv: iv}, key, ciphertext);
            return new Uint8Array(plain);
        } catch (err) {
            fail("Could not decrypt the OpenStego AES payload. Check the password.");
        }
    }

    async function decryptOpenStegoV2(payload, password, algorithm) {
        var algo = String(algorithm || "").toUpperCase();
        if (algo === "AES128" || algo === "AES256") return aesPbeDecrypt(payload, password, algo);
        if (algo === "" || algo === "DES") {
            var paramLength = payload.length ? payload[0] : 0;
            if (paramLength + 1 > payload.length) fail("The OpenStego DES parameters are missing.");
            return pbeDecrypt(payload.subarray(1 + paramLength), password);
        }
        fail("Unsupported OpenStego encryption algorithm \"" + algorithm + "\".");
    }

    /* --------------------------------------------------------------- images
     * The worker has no DOM, so image pixels come from createImageBitmap plus an
     * OffscreenCanvas. The Node self-test substitutes a decoder through a global
     * hook; nothing in the browser path uses that hook.
     */
    async function decodeImage(bytes) {
        if (typeof globalThis !== "undefined" && typeof globalThis.cfStegoDecodeImage === "function") {
            return globalThis.cfStegoDecodeImage(bytes);
        }
        if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") {
            fail("This browser cannot decode image pixels in a worker (createImageBitmap/OffscreenCanvas are missing).");
        }
        var bitmap;
        try {
            bitmap = await createImageBitmap(new Blob([bytes]));
        } catch (err) {
            fail("Could not decode the input as an image. PNG, BMP, GIF and JPEG files are supported.");
        }
        if (bitmap.width * bitmap.height > 100 * 1000 * 1000) {
            fail("That image is too large to scan (" + bitmap.width + "×" + bitmap.height + ").");
        }
        var canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        var context = canvas.getContext("2d", {willReadFrequently: true});
        context.drawImage(bitmap, 0, 0);
        var pixels = context.getImageData(0, 0, bitmap.width, bitmap.height);
        if (bitmap.close) bitmap.close();
        return {width: pixels.width, height: pixels.height, data: pixels.data};
    }

    /* ------------------------------------------------------------- OpenStego
     * Header layout (LSBDataHeader): "OPENSTEGO", version 1, then 8 bytes:
     * data length (LE32), data channel bits, file-name length, gzip flag,
     * encryption flag, then the UTF-8 file name. Header bits always use one bit
     * per channel; the data that follows uses the channel-bits value.
     */
    var OPENSTEGO_STAMP = "OPENSTEGO";

    function readExact(readByte, count) {
        var out = new Uint8Array(count);
        for (var i = 0; i < count; i++) {
            var byte = readByte();
            if (byte < 0) fail("The image ends before the OpenStego header is complete.");
            out[i] = byte;
        }
        return out;
    }

    function readOpenStegoHeader(readByte) {
        var stamp = readExact(readByte, 9);
        var text = "";
        for (var i = 0; i < stamp.length; i++) text += String.fromCharCode(stamp[i]);
        if (text !== OPENSTEGO_STAMP) fail("No OpenStego header in this image.");
        var version = readExact(readByte, 1);
        if (version[0] !== 1 && version[0] !== 2) fail("Unsupported OpenStego header version " + version[0] + ".");
        var fixed = readExact(readByte, 8);
        var dataLength = fixed[0] + fixed[1] * 0x100 + fixed[2] * 0x10000 + fixed[3] * 0x1000000;
        var channelBits = fixed[4];
        var fileNameLength = fixed[5];
        var compression = fixed[6] === 1;
        var encryption = fixed[7] === 1;
        if (channelBits < 1 || channelBits > 8) fail("Invalid OpenStego channel-bit count " + channelBits + ".");
        if (dataLength > MAX_OUTPUT) fail("The OpenStego payload is larger than this page will decode.");
        var cryptAlgorithm = "";
        if (version[0] === 2) {
            var algoBytes = readExact(readByte, 8);
            for (var a = 0; a < algoBytes.length; a++) {
                if (algoBytes[a]) cryptAlgorithm += String.fromCharCode(algoBytes[a]);
            }
            cryptAlgorithm = cryptAlgorithm.replace(/\s+$/, "");
        }
        var nameBytes = readExact(readByte, fileNameLength);
        var fileName = fileNameLength ? utf8Decode(nameBytes) : "";
        return {
            version: version[0],
            dataLength: dataLength,
            channelBits: channelBits,
            fileName: fileName,
            compression: compression,
            encryption: encryption,
            cryptAlgorithm: cryptAlgorithm
        };
    }

    function readOpenStegoSequential(rgba, width, height) {
        var x = 0, y = 0, currBit = 0, channelBits = 1;

        function readByte() {
            if (y >= height) return -1;
            var value = 0;
            for (var i = 0; i < 8; i++) {
                var pixel = (y * width + x) * 4;
                var group = (currBit / channelBits) | 0;
                var groupBit = currBit % channelBits;
                var bit = (rgba[pixel + group] >>> (channelBits - groupBit - 1)) & 1;
                value = (value << 1) | bit;
                currBit++;
                if (currBit === 3 * channelBits) {
                    currBit = 0;
                    x++;
                    if (x === width) {
                        x = 0;
                        y++;
                        if (y === height) return -1;
                    }
                }
            }
            return value;
        }

        var header = readOpenStegoHeader(readByte);
        channelBits = header.channelBits;
        if (currBit !== 0) {
            currBit = 0;
            x++;
            if (x === width) {
                x = 0;
                y++;
            }
        }
        var remaining = y >= height ? 0 : ((height - y) * width - x) * 3 * channelBits;
        if (header.dataLength * 8 > remaining) {
            fail("The OpenStego header says " + header.dataLength + " bytes, but the image is too small to hold them.");
        }
        var data = new Uint8Array(header.dataLength);
        for (var n = 0; n < data.length; n++) {
            var byte = readByte();
            if (byte < 0) fail("The image ended while reading the OpenStego payload.");
            data[n] = byte;
        }
        return {header: header, data: data};
    }

    function readOpenStegoRandom(rgba, width, height, password) {
        var rand = javaRandom(passwordSeed(password));
        // One bit per (pixel, channel, bit slot). Eight slots fit in one byte per RGB
        // channel, so a 12-megapixel image needs 36 MB rather than 288 MB.
        var used = new Uint8Array(width * height * 3);
        var channelBits = 1;
        var usedCount = 0;

        function index(x, y, channel, bit) {
            return ((y * width + x) * 3 + channel) * 8 + bit;
        }

        function isUsed(index) {
            return (used[index >> 3] >>> (index & 7)) & 1;
        }

        function markUsed(index) {
            used[index >> 3] |= 1 << (index & 7);
        }

        function readByte() {
            var value = 0;
            var total = width * height * 3 * channelBits;
            for (var i = 0; i < 8; i++) {
                if (usedCount >= total) fail("The image has no unused OpenStego bits left.");
                var x, y, channel, bit;
                var attempts = 0;
                var limit = total * 4 + 1000;
                do {
                    x = rand.nextInt(width);
                    y = rand.nextInt(height);
                    channel = rand.nextInt(3);
                    bit = rand.nextInt(channelBits);
                    if (++attempts > limit) fail("Could not find an unused OpenStego bit in this image.");
                } while (isUsed(index(x, y, channel, bit)));
                markUsed(index(x, y, channel, bit));
                usedCount++;
                // Java's getRGB channel order is blue, green, red for 0, 1, 2.
                var offset = (y * width + x) * 4 + [2, 1, 0][channel];
                value = (value << 1) | ((rgba[offset] >>> bit) & 1);
            }
            return value;
        }

        var header = readOpenStegoHeader(readByte);
        channelBits = header.channelBits;
        if (usedCount + header.dataLength * 8 > width * height * 3 * channelBits) {
            fail("The OpenStego header says " + header.dataLength + " bytes, but the image is too small to hold them.");
        }
        var data = new Uint8Array(header.dataLength);
        for (var n = 0; n < data.length; n++) data[n] = readByte();
        return {header: header, data: data};
    }

    async function gunzip(bytes) {
        if (typeof DecompressionStream !== "function") {
            fail("This browser cannot decompress the GZIP data OpenStego used (DecompressionStream is missing).");
        }
        try {
            var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
            return new Uint8Array(await new Response(stream).arrayBuffer());
        } catch (err) {
            fail("The OpenStego data is marked as compressed but is not valid GZIP: " + (err && err.message ? err.message : err));
        }
    }

    async function openStegoFromRgba(rgba, width, height, password, plugin) {
        if (plugin !== "Auto" && plugin !== "RandomLSB" && plugin !== "LSB") plugin = "Auto";
        var order = plugin === "Auto" ? ["RandomLSB", "LSB"] : [plugin];
        var lastError = null;

        for (var i = 0; i < order.length; i++) {
            var parsed;
            try {
                parsed = order[i] === "RandomLSB"
                    ? readOpenStegoRandom(rgba, width, height, password)
                    : readOpenStegoSequential(rgba, width, height);
            } catch (err) {
                lastError = err;
                continue; // no header: try the other layout, or report the failure below
            }

            var data = parsed.data;
            if (parsed.header.encryption) {
                data = parsed.header.version >= 2
                    ? await decryptOpenStegoV2(data, password, parsed.header.cryptAlgorithm)
                    : pbeDecrypt(data, password);
            }
            if (parsed.header.compression) data = await gunzip(data);
            return {
                data: data,
                fileName: parsed.header.fileName,
                plugin: order[i],
                compression: parsed.header.compression,
                encryption: parsed.header.encryption
            };
        }

        if (password) {
            fail("No OpenStego header found. " + (plugin === "Auto" ? "Check the password and the plugin" : "Check the password") + ".");
        }
        fail("No OpenStego header found. This is not an OpenStego RandomLSB or LSB image" +
            (lastError ? " (" + lastError.message + ")" : "") + ".");
    }

    /* ------------------------------------------------------------ StegoShare
     * StegoShare 1.01 (Digital Equality Foundation) spreads one file over a set
     * of PNGs. Every pixel carries one payload byte in the low bits of blue
     * (0-2), green (0-1) and red (0-2), least-significant hidden bit first. The
     * byte is XORed with one of the 16 bytes of MD5(password); the byte is picked
     * by pixel bits 3, 10, 11 and 19, which the embedder never changes. The first
     * six pixels hold the image's 16-bit index and 32-bit payload length, both
     * big-endian. Image 0 begins its payload with a 256-byte name block whose
     * last byte is 0x0A. No password (or the tool's literal "Empty") means a
     * zero key rather than an MD5. The shares are joined in index order.
     */
    var STEGOSHARE_NAME_BYTES = 256;
    var STEGOSHARE_BITS = [0, 1, 2, 8, 9, 16, 17, 18];

    function stegoshareKey(password) {
        var text = password == null ? "" : String(password);
        if (!text || text === "Empty") return new Uint8Array(16);
        return md5(utf8Encode(text));
    }

    function stegoshareReadImage(rgba, width, height, key) {
        var pixels = width * height;
        if (pixels < 6) fail("The image is too small to hold a StegoShare header.");
        function readByteAt(index) {
            var offset = index * 4;
            // Java's getRGB packs 0xAARRGGBB; the alpha byte is never touched.
            var pixel = (rgba[offset] << 16) | (rgba[offset + 1] << 8) | rgba[offset + 2];
            var keyIndex = (((pixel >>> 3) & 1) << 3) | (((pixel >>> 10) & 3) << 1) | ((pixel >>> 19) & 1);
            var value = 0;
            for (var b = 0; b < 8; b++) value |= ((pixel >>> STEGOSHARE_BITS[b]) & 1) << b;
            return (value ^ key[keyIndex]) & 0xff;
        }
        var index = (readByteAt(0) << 8) | readByteAt(1);
        var size = 0;
        for (var s = 2; s <= 5; s++) size = size * 256 + readByteAt(s);
        var capacity = pixels - 6;
        if (size > capacity) {
            fail("StegoShare image " + index + " says it carries " + size +
                " bytes, but a " + width + "×" + height + " image can carry only " + capacity + ".");
        }
        var data = new Uint8Array(size);
        for (var i = 0; i < size; i++) data[i] = readByteAt(i + 6);
        return {index: index, size: size, capacity: capacity, data: data};
    }

    function stegoshareName(share) {
        if (share.size < STEGOSHARE_NAME_BYTES) {
            fail("The first StegoShare image has no 256-byte file-name block.");
        }
        if (share.data[STEGOSHARE_NAME_BYTES - 1] !== 10) {
            fail("The StegoShare file-name block is invalid. Check the password, or the image was not written by StegoShare.");
        }
        var end = 0;
        while (end < STEGOSHARE_NAME_BYTES && share.data[end] !== 10) end++;
        var name = "";
        for (var i = 0; i < end; i++) {
            var byte = share.data[i];
            if (byte >= 32 && byte < 127) name += String.fromCharCode(byte);
        }
        return name;
    }

    function stegoshareAssemble(shares) {
        if (!shares.length) fail("No StegoShare images were found.");
        shares.sort(function (a, b) { return a.index - b.index; });
        for (var i = 0; i < shares.length; i++) {
            if (i && shares[i].index === shares[i - 1].index) {
                fail("The StegoShare set contains two images with index " + shares[i].index + ".");
            }
            if (shares[i].index !== i) {
                fail("The StegoShare set is incomplete: image " + i + " is missing. Add every image the tool wrote.");
            }
        }
        var fileName = stegoshareName(shares[0]);
        var total = 0;
        for (i = 0; i < shares.length; i++) total += shares[i].size - (i === 0 ? STEGOSHARE_NAME_BYTES : 0);
        if (total > MAX_OUTPUT) fail("The StegoShare file is larger than this page will decode.");
        var out = new Uint8Array(total);
        var at = 0;
        for (i = 0; i < shares.length; i++) {
            var part = i === 0 ? shares[i].data.subarray(STEGOSHARE_NAME_BYTES) : shares[i].data;
            out.set(part, at);
            at += part.length;
        }
        return {data: out, fileName: fileName, shares: shares.length};
    }

    /* A StegoShare set is a folder of PNGs, and this editor hands one file to an
     * operation, so the whole set arrives as a ZIP. Only the PNG entries are
     * carriers; StegoShare always writes PNG. Stored and deflated entries are
     * supported, which covers the usual archivers and "zip -0". */
    function isZipInput(bytes) {
        return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b &&
            ((bytes[2] === 3 && bytes[3] === 4) || (bytes[2] === 5 && bytes[3] === 6));
    }

    function isPng(bytes) {
        return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
            bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
    }

    function zipU16(bytes, offset) {
        return bytes[offset] | (bytes[offset + 1] << 8);
    }

    function zipU32(bytes, offset) {
        return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
    }

    function zipEnd(bytes) {
        var start = Math.max(0, bytes.length - 66000);
        for (var i = bytes.length - 22; i >= start; i--) {
            if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
        }
        return -1;
    }

    async function inflateRaw(bytes) {
        if (typeof DecompressionStream !== "function") {
            fail("This browser cannot decompress the ZIP's DEFLATE entries (DecompressionStream is missing).");
        }
        try {
            var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
            return new Uint8Array(await new Response(stream).arrayBuffer());
        } catch (err) {
            fail("Could not decompress a ZIP entry: " + (err && err.message ? err.message : err));
        }
    }

    async function readZipEntries(bytes) {
        var end = zipEnd(bytes);
        if (end < 0) fail("The input starts like a ZIP but has no end-of-central-directory record.");
        var count = zipU16(bytes, end + 10);
        var directory = zipU32(bytes, end + 16);
        if (count === 0xffff || directory === 0xffffffff) {
            fail("ZIP64 archives are not supported; use a normal ZIP of the images.");
        }
        if (directory + 4 > bytes.length) fail("The ZIP central directory is outside the file.");
        var entries = [];
        var at = directory;
        for (var i = 0; i < count; i++) {
            if (at + 46 > bytes.length || zipU32(bytes, at) !== 0x02014b50) {
                fail("The ZIP central directory is damaged.");
            }
            var flags = zipU16(bytes, at + 8);
            var method = zipU16(bytes, at + 10);
            var compressedSize = zipU32(bytes, at + 20);
            var uncompressedSize = zipU32(bytes, at + 24);
            var nameLength = zipU16(bytes, at + 28);
            var extraLength = zipU16(bytes, at + 30);
            var commentLength = zipU16(bytes, at + 32);
            var localOffset = zipU32(bytes, at + 42);
            var nameStart = at + 46;
            if (nameStart + nameLength > bytes.length) fail("A ZIP entry name is outside the file.");
            var name = utf8Decode(bytes.subarray(nameStart, nameStart + nameLength));
            at = nameStart + nameLength + extraLength + commentLength;
            if (flags & 1) fail("The ZIP entry \"" + name + "\" is encrypted; StegoShare does not encrypt its images.");
            if (name.charAt(name.length - 1) === "/") continue;
            if (localOffset + 30 > bytes.length || zipU32(bytes, localOffset) !== 0x04034b50) {
                fail("The ZIP entry \"" + name + "\" has a damaged local header.");
            }
            var dataStart = localOffset + 30 + zipU16(bytes, localOffset + 26) + zipU16(bytes, localOffset + 28);
            if (dataStart + compressedSize > bytes.length) fail("The ZIP entry \"" + name + "\" runs past the end of the file.");
            var compressed = bytes.subarray(dataStart, dataStart + compressedSize);
            var data;
            if (method === 0) data = compressed;
            else if (method === 8) data = await inflateRaw(compressed);
            else continue; // an archiver may use an algorithm we cannot read; skip it
            if (uncompressedSize && data.length !== uncompressedSize) {
                fail("The ZIP entry \"" + name + "\" shrank to " + data.length + " bytes, not the recorded " + uncompressedSize + ".");
            }
            if (data.length > MAX_OUTPUT) fail("The ZIP entry \"" + name + "\" is larger than this page will decode.");
            entries.push({name: name, data: data});
        }
        return entries;
    }

    async function stegoshareExtract(input, password) {
        var bytes = toBytes(input);
        var zip = isZipInput(bytes);
        var carriers;
        if (zip) {
            var entries = await readZipEntries(bytes);
            carriers = entries.filter(function (entry) { return isPng(entry.data); });
            if (!carriers.length) {
                fail("The ZIP contains no PNG images. StegoShare always writes its carriers as PNG.");
            }
        } else {
            carriers = [{name: "", data: bytes}];
        }

        var images = [];
        for (var i = 0; i < carriers.length; i++) {
            try {
                var image = await decodeImage(carriers[i].data);
            } catch (err) {
                if (!zip) throw err;
                fail("Could not decode the ZIP entry \"" + carriers[i].name + "\" as an image: " +
                    (err && err.message ? err.message : err));
            }
            images.push({data: image.data, width: image.width, height: image.height});
        }

        var key = stegoshareKey(password);
        var shares = [];
        for (i = 0; i < images.length; i++) {
            shares.push(stegoshareReadImage(images[i].data, images[i].width, images[i].height, key));
        }
        if (!zip) {
            if (shares[0].index !== 0) {
                fail("This is StegoShare share " + shares[0].index + " of a set, not the start of the file. Zip every image in the set and pass the archive.");
            }
            if (shares[0].size === shares[0].capacity) {
                fail("This share fills its image, so the file may continue in later shares. Zip every image in the set and pass the archive.");
            }
        }
        return toByteArray(stegoshareAssemble(shares).data);
    }

    /* --------------------------------------------------------------- Blowfish
     * JPHS ships Olaf Titz's bf.c. Its bf_config.h selects the big-endian block
     * entry points ("real" Blowfish) by default; only data blocks use that byte
     * order. Blowfish_ExpandUserKey always calls _N_Blowfish_Encrypt, the native
     * little-endian routine on the x86 machines JPHS files come from, so the key
     * schedule is built with native words. Both are implemented separately here.
     */
    function bfF(x, key) {
        var a = key[18 + (x >>> 24)];
        var b = key[274 + ((x >>> 16) & 0xff)];
        var c = key[530 + ((x >>> 8) & 0xff)];
        var d = key[786 + (x & 0xff)];
        return ((((a + b) >>> 0) ^ c) + d) >>> 0;
    }

    function bfEncryptWords(l, r, key) {
        l = (l ^ key[0]) >>> 0;
        for (var i = 1; i <= 16; i++) {
            if (i & 1) r = (r ^ key[i] ^ bfF(l, key)) >>> 0;
            else l = (l ^ key[i] ^ bfF(r, key)) >>> 0;
        }
        return [(r ^ key[17]) >>> 0, l];
    }

    function bfDecryptWords(l, r, key) {
        l = (l ^ key[17]) >>> 0;
        for (var i = 16; i >= 1; i--) {
            if (i & 1) l = (l ^ key[i] ^ bfF(r, key)) >>> 0;
            else r = (r ^ key[i] ^ bfF(l, key)) >>> 0;
        }
        return [(r ^ key[0]) >>> 0, l];
    }

    // Native little-endian words, used while expanding the key and by the
    // Windows 0.5/0.51 streams; the 0.3 Linux streams use the big-endian pair.
    function bfEncryptNativeLE(state, key) {
        var out = bfEncryptWords(readLE32(state, 0), readLE32(state, 4), key);
        writeLE32(state, 0, out[0]);
        writeLE32(state, 4, out[1]);
    }

    function bfDecryptNativeLE(state, key) {
        var out = bfDecryptWords(readLE32(state, 0), readLE32(state, 4), key);
        writeLE32(state, 0, out[0]);
        writeLE32(state, 4, out[1]);
    }

    // The big-endian block functions JPHS uses for the stream and the length.
    function bfEncryptBytes(state, key) {
        var out = bfEncryptWords(readBE32(state, 0), readBE32(state, 4), key);
        writeBE32(state, 0, out[0]);
        writeBE32(state, 4, out[1]);
    }

    function bfDecryptBytes(state, key) {
        var out = bfDecryptWords(readBE32(state, 0), readBE32(state, 4), key);
        writeBE32(state, 0, out[0]);
        writeBE32(state, 4, out[1]);
    }

    function bfExpandKey(pass) {
        var key = CF_BF_INIT.slice();
        var len = pass.length;
        if (!len) fail("JPHide needs the passphrase that was used to hide the file.");
        var j = 0;
        for (var i = 0; i < 18; i++) {
            var u = 0;
            for (var k = 0; k < 4; k++) {
                u = ((u << 8) | pass[j]) >>> 0;
                j++;
                if (j >= len) j = 0;
            }
            key[i] = (key[i] ^ u) >>> 0;
        }
        var state = new Uint8Array(8);
        for (var n = 0; n < 1042; n += 2) {
            bfEncryptNativeLE(state, key);
            key[n] = readLE32(state, 0);
            key[n + 1] = readLE32(state, 4);
        }
        return key;
    }

    var JPH_TAIL1 = 12000;
    var JPH_TAIL2 = 1200;
    var JPH_TAIL3 = 120;

    function jphidePass(passphrase, maxLength, allowEmpty) {
        var pass = utf8Encode(String(passphrase == null ? "" : passphrase));
        if (!pass.length && !allowEmpty) fail("JPHide needs the passphrase that was used to hide the file.");
        if (pass.length > maxLength) pass = pass.slice(0, maxLength);
        return pass;
    }

    function jphideIv(decoded) {
        var first = decoded.components[0].blocks[0][0];
        if (!first) fail("This JPEG has no readable DCT coefficients.");
        var iv = new Uint8Array(8);
        for (var i = 0; i < 8; i++) iv[i] = first[i] & 0xff;
        return iv;
    }

    function jphideCapacity(decoded) {
        var comps = decoded.components;
        var capacity = 0;
        for (var c = 0; c < 3; c++) capacity += comps[c].blocksPerColumn * comps[c].blocksPerLine * 64;
        return capacity;
    }

    // JPSeek's coefficient walk, shared by 0.3 and 0.5/0.51. The two Windows
    // versions use the native little-endian block functions and can spend one
    // extra stream-2 selector bit per accepted word when header mode bit 0 is
    // set. The 0.3 Linux version uses the big-endian blocks and has no such bit.
    function jphideScanner(decoded, key, iv, headerMode, blockEncrypt) {
        var comps = decoded.components;
        var blocks = comps.map(function (component) { return component.blocks; });
        var hib = comps.map(function (component) { return component.blocksPerColumn; });
        var wib = comps.map(function (component) { return 64 * component.blocksPerLine - 1; });
        if (!blocks[0] || !blocks[0][0] || !blocks[0][0][0]) fail("This JPEG has no readable DCT coefficients.");

        var cdata = [];
        var cpos = [0, 0, 0, 0];
        var seed = new Uint8Array(iv);
        for (var s = 0; s < 4; s++) {
            cdata[s] = new Uint8Array(seed);
            blockEncrypt(cdata[s], key);
            var carry = seed[0];
            seed.copyWithin(0, 1);
            seed[7] = carry;
        }

        function getCodeBit(stream) {
            var bit = cpos[stream] & 63;
            if (bit === 0) blockEncrypt(cdata[stream], key);
            var byte = cdata[stream][bit >> 3];
            var shift = bit & 7;
            var value = (((byte << shift) & 0xff) >>> 7);
            cpos[stream]++;
            return value;
        }

        var coef = CF_JPH_LTAB[0];
        var spos = CF_JPH_LTAB[1];
        var mode = CF_JPH_LTAB[2];
        var lh = 0;
        var lw = spos - 64;
        var lt = 0;
        var tail = 0;
        var tailOn = 0;
        var lastY = 0;

        function getWord() {
            var attempts = 0;
            for (;;) {
                if (++attempts > 50000000) fail("JPHide scan did not find enough usable coefficients.");
                lw += 64;
                if (lw > wib[coef]) {
                    lw = spos;
                    lh++;
                    if (!(lh < hib[coef])) {
                        lt += 3;
                        if (CF_JPH_LTAB[lt] < 0) return 1;
                        if (tail < 0) {
                            if (tailOn === 2) { tailOn = 3; tail = 999999; }
                            if (tailOn === 1) { tailOn = 2; tail = JPH_TAIL3; }
                            if (tailOn === 0) { tailOn = 1; tail = JPH_TAIL2; }
                        }
                        coef = CF_JPH_LTAB[lt];
                        lw = spos = CF_JPH_LTAB[lt + 1];
                        lh = 0;
                        mode = CF_JPH_LTAB[lt + 2];
                    }
                }
                var row = blocks[coef][lh];
                var block = row ? row[(lw / 64) | 0] : null;
                if (!block) return 1;
                var y = block[lw & 63] | 0;
                var ok;
                if (coef || lh || lw > 7) ok = 1;
                else ok = 0;
                if (ok) {
                    if (mode < 0) {
                        if ((y > -mode) || (y < mode)) {
                            ok = getCodeBit(0);
                            ok = ok << 1;
                            ok |= getCodeBit(0);
                        } else {
                            ok = 0;
                        }
                    } else {
                        if (mode === 3) ok = getCodeBit(0);
                        else ok = 1;
                        if (ok) {
                            if ((y > 1) || (y < -1)) {
                                ok = 0;
                            } else {
                                ok = getCodeBit(0);
                                if (mode) {
                                    ok = ok << 1;
                                    ok |= getCodeBit(0);
                                }
                            }
                            if (ok) {
                                ok = 0;
                            } else if (mode > 1) {
                                ok = getCodeBit(0);
                            } else {
                                ok = 1;
                            }
                        }
                    }
                }
                if (ok && headerMode) ok = getCodeBit(2);
                if (ok && tailOn > 0) ok = getCodeBit(2);
                if (ok && tailOn > 1) ok = getCodeBit(2);
                if (ok && tailOn > 2) ok = getCodeBit(2);
                if (ok) {
                    lastY = y;
                    return 0;
                }
            }
        }

        function getBit() {
            if (getWord()) return -1;
            var y = lastY;
            if (y < 0) y = -y;
            if (mode < 0) return (y & 2) >> 1;
            return y & 1;
        }

        function raw(n) {
            var out = new Uint8Array(n);
            for (var b = 0; b < n; b++) {
                var value = 0;
                for (var j = 0; j < 8; j++) {
                    var bit = getBit();
                    if (bit < 0) fail("JPHide data ended inside its header.");
                    value |= bit << j;
                }
                out[b] = value;
            }
            return out;
        }

        function payload(n) {
            var out = new Uint8Array(n);
            for (var byte = 0; byte < n; byte++) {
                var v = 0;
                for (var k = 0; k < 8; k++) {
                    var dataBit = getBit();
                    if (dataBit < 0) fail("The JPEG ended before the whole JPHide payload was recovered.");
                    dataBit ^= getCodeBit(1);
                    v = (v << 1) | dataBit;
                    tail--;
                }
                out[byte] = v;
            }
            return out;
        }

        return {
            rotatedIv: new Uint8Array(seed),
            setMode: function (value) { headerMode = value ? 1 : 0; },
            setLength: function (length) { tail = length * 8 - JPH_TAIL1; tailOn = 0; },
            raw: raw,
            payload: payload
        };
    }

    // JPHide 0.3 / JPSeek on Linux: eight-byte header, big-endian streams.
    function jphideFromCoefficients(decoded, passphrase) {
        if (!decoded || !decoded.components || decoded.components.length !== 3) {
            fail("JPHide needs a three-component (colour) JPEG.");
        }
        var pass = jphidePass(passphrase, 120);
        var iv = jphideIv(decoded);
        var key = bfExpandKey(pass);
        var scanner = jphideScanner(decoded, key, iv, 0, bfEncryptBytes);
        var lendata = scanner.raw(8);
        bfDecryptBytes(lendata, key);
        var length = (lendata[0] << 16) | (lendata[1] << 8) | lendata[2];

        var capacity = jphideCapacity(decoded);
        if (length > Math.floor(capacity / 8) + 1) {
            fail("JPHide found a nonsense payload length (" + length + " bytes): the passphrase is wrong or the JPEG was not hidden with JPHide.");
        }
        if (length > MAX_OUTPUT) fail("The JPHide payload is larger than this page will decode.");

        scanner.setLength(length);
        return scanner.payload(length);
    }

    function failV05(message) {
        var err = new Error(message);
        err.jphideV05 = true;
        throw err;
    }

    // The 0.51 reader keeps at most 100 bytes, then folds anything longer than
    // 50 by XORing byte i with byte i+50 and using the first 50 bytes.
    function jphideV05Pass(passphrase) {
        var pass = jphidePass(passphrase, 100, true);
        if (pass.length > 50) {
            var folded = pass.slice(0, 50);
            for (var i = 50; i < pass.length; i++) folded[i - 50] ^= pass[i];
            pass = folded;
        }
        return pass;
    }

    // JPHide/JPSeek 0.5 and 0.51 on Windows. The key is the first six IV bytes
    // followed by the passphrase; the two eight-byte header blocks, the streams
    // and the payload all use the native little-endian Blowfish blocks. Returns
    // null when the sixteen-byte header does not verify, so the caller can try
    // 0.3.
    function jphideV05FromCoefficients(decoded, passphrase) {
        if (!decoded || !decoded.components || decoded.components.length !== 3) {
            fail("JPHide needs a three-component (colour) JPEG.");
        }
        var pass = jphideV05Pass(passphrase);
        var iv = jphideIv(decoded);
        var keyBytes = new Uint8Array(6 + pass.length);
        keyBytes.set(iv.subarray(0, 6), 0);
        keyBytes.set(pass, 6);
        var key = bfExpandKey(keyBytes);
        var scanner = jphideScanner(decoded, key, iv, 0, bfEncryptNativeLE);

        var p1, p2;
        try {
            p1 = scanner.raw(8);
            p2 = scanner.raw(8);
        } catch (err) {
            return null; // too few coefficients for a 0.5 header; try 0.3
        }
        bfDecryptNativeLE(p1, key);
        bfDecryptNativeLE(p2, key);

        var length = (p1[0] << 16) | (p1[1] << 8) | p1[2];
        if (p1[3] > 3 || length <= 0 || length > MAX_OUTPUT) return null;
        if (p2[1] !== p1[1] || p2[2] !== p1[2]) return null;

        var iv1 = new Uint8Array(scanner.rotatedIv);
        bfEncryptNativeLE(iv1, key);
        if (iv1[5] !== p1[5] || iv1[6] !== p1[6] || iv1[7] !== p1[7]) return null;
        var iv2 = new Uint8Array(iv1);
        bfEncryptNativeLE(iv2, key);
        if (iv2[4] !== p2[4] || iv2[5] !== p2[5] || iv2[6] !== p2[6] || iv2[7] !== p2[7]) return null;

        var rlen = (p1[4] << 16) | (p2[0] << 8) | p2[3];
        if (rlen > MAX_OUTPUT) return null;
        var capacity = jphideCapacity(decoded);
        if (length > Math.floor(capacity / 8) + 1) return null;

        scanner.setMode(p1[3] & 1);
        scanner.setLength(length);
        var data;
        try {
            data = scanner.payload(length);
        } catch (err) {
            failV05("The JPEG ended before the whole JPHide/JPSeek payload was recovered.");
        }
        if (rlen) {
            try {
                data = lzo1xDecompress(data, rlen);
            } catch (err) {
                failV05("The JPHide/JPSeek 0.5 payload is marked as LZO-compressed but could not be decompressed: " + (err && err.message ? err.message : err));
            }
        }
        return data;
    }

    /* ------------------------------------------------------------------- LZO1X
     * JPHide 0.5/0.51 stores the original length in its header and the payload
     * as a raw LZO1X-1 stream (LZO 1.01) when compression helped. This decodes
     * the published LZO1X wire format; it is not lzop's block framing.
     */
    function lzo1xDecompress(input, expectedLength) {
        var src = input instanceof Uint8Array ? input : new Uint8Array(input);
        var expected = expectedLength >>> 0;
        var ip = 0;
        var op = 0;
        var out = new Uint8Array(expected);

        function needInput(n) { if (ip + n > src.length) throw new Error("the LZO1X stream ended early"); }
        function needOutput(n) { if (op + n > expected) throw new Error("the LZO1X output is longer than the header says"); }
        function readByte() { needInput(1); return src[ip++]; }
        function copyLiterals(n) {
            needInput(n);
            needOutput(n);
            for (var i = 0; i < n; i++) out[op + i] = src[ip + i];
            ip += n;
            op += n;
        }
        function copyMatch(offset, n) {
            if (offset <= 0 || offset > op) throw new Error("invalid LZO1X back-reference " + offset + " at " + op);
            needOutput(n);
            var from = op - offset;
            for (var i = 0; i < n; i++) out[op + i] = out[from + i];
            op += n;
        }
        function literals(n) { copyLiterals(n); return n; }

        var state = 0;
        if (src.length && src[0] > 17) {
            var firstLength = src[0] - 17;
            ip = 1;
            if (firstLength < 4) state = literals(firstLength);
            else { copyLiterals(firstLength); state = 4; }
        }
        for (;;) {
            var t = readByte();
            var next, offset, length;
            if (t < 16) {
                if (state === 0) {
                    if (t === 0) {
                        for (;;) {
                            var b = readByte();
                            if (b !== 0) { t += 15 + b; break; }
                            t += 255;
                        }
                    }
                    copyLiterals(t + 3);
                    state = 4;
                    continue;
                }
                if (state !== 4) {
                    next = t & 3;
                    offset = 1 + (t >> 2) + (readByte() << 2);
                    copyMatch(offset, 2);
                    state = literals(next);
                    continue;
                }
                next = t & 3;
                offset = 1 + 0x0800 + (t >> 2) + (readByte() << 2);
                copyMatch(offset, 3);
                state = literals(next);
                continue;
            }
            if (t >= 64) {
                next = t & 3;
                offset = 1 + ((t >> 2) & 7) + (readByte() << 3);
                length = (t >> 5) + 1;
                copyMatch(offset, length);
                state = literals(next);
                continue;
            }
            if (t >= 32) {
                length = (t & 31) + 2;
                if (length === 2) {
                    for (;;) {
                        var b2 = readByte();
                        if (b2 !== 0) { length += 31 + b2; break; }
                        length += 255;
                    }
                }
                next = readByte();
                next |= readByte() << 8;
                offset = 1 + (next >> 2);
                next &= 3;
                copyMatch(offset, length);
                state = literals(next);
                continue;
            }
            var offsetHigh = (t & 8) << 11;
            length = (t & 7) + 2;
            if (length === 2) {
                for (;;) {
                    var b3 = readByte();
                    if (b3 !== 0) { length += 7 + b3; break; }
                    length += 255;
                }
            }
            next = readByte();
            next |= readByte() << 8;
            offset = offsetHigh + (next >> 2);
            next &= 3;
            if (offset === 0) {
                if (length !== 3) throw new Error("the LZO1X end marker has the wrong length");
                if (next !== 0) throw new Error("the LZO1X end marker has trailing literals");
                break;
            }
            offset += 0x4000;
            copyMatch(offset, length);
            state = literals(next);
        }
        if (op !== expected) throw new Error("the LZO1X output is " + op + " bytes, but the header says " + expected);
        return out;
    }

    function jphideFromJpeg(input, passphrase) {
        var bytes = toBytes(input);
        if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) fail("JPHide needs a JPEG file (no SOI marker).");
        var decoded;
        try {
            decoded = cfDecodeJpegCoefficients(bytes);
        } catch (err) {
            fail("Could not read the JPEG's DCT coefficients: " + (err && err.message ? err.message : err));
        }
        var v05 = jphideV05FromCoefficients(decoded, passphrase);
        if (v05) return v05;
        try {
            return jphideFromCoefficients(decoded, passphrase);
        } catch (err) {
            fail("No JPHide/JPSeek data could be read from this JPEG. Check the passphrase, or the file may have been re-saved (JPHide needs the original JPEG)." +
                (err && err.message ? " (" + err.message + ")" : ""));
        }
    }

    async function openStegoExtract(input, plugin, password) {
        var image = await decodeImage(toBytes(input));
        var result = await openStegoFromRgba(image.data, image.width, image.height, password, plugin);
        return toByteArray(result.data);
    }

    function jphideExtract(input, passphrase) {
        return toByteArray(jphideFromJpeg(input, passphrase));
    }

    return {
        toBytes: toBytes,
        md5: md5,
        desDecryptBlock: desDecryptBlock,
        desSubkeys: desSubkeys,
        pbeDecrypt: pbeDecrypt,
        javaRandom: javaRandom,
        passwordSeed: passwordSeed,
        openStegoFromRgba: openStegoFromRgba,
        jphideFromCoefficients: jphideFromCoefficients,
        jphideV05FromCoefficients: jphideV05FromCoefficients,
        jphideV05Pass: jphideV05Pass,
        jphideFromJpeg: jphideFromJpeg,
        lzo1xDecompress: lzo1xDecompress,
        bfExpandKey: bfExpandKey,
        bfEncryptBytes: bfEncryptBytes,
        bfDecryptBytes: bfDecryptBytes,
        bfDecryptNativeLE: bfDecryptNativeLE,
        extractOpenStego: openStegoExtract,
        extractJphide: jphideExtract,
        extractStegoShare: stegoshareExtract,
        stegoshareKey: stegoshareKey,
        stegoshareReadImage: stegoshareReadImage,
        stegoshareAssemble: stegoshareAssemble
    };
})();
