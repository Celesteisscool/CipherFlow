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
 *   JSteg      Derek Upham's JPEG v4 patch: the LSBs of quantised DCT
 *              coefficients in scan order (skipping 0 and +1), with the 5-bit
 *              length-width header.
 *   StegoShare StegoShare 1.01's multi-image LSB layout, MD5-keyed by pixel bits
 *              the embedder leaves untouched, for PNG carriers and ZIP sets.
 *   StegFS     StegFS 2015.08 and 202X.XX volume blocks: path/name-derived
 *              inode locations, AES-256-CBC with SHA-256 block checks, and
 *              PBKDF2/HMAC-SHA256 for the 202X.XX format.
 *   OutGuess   OutGuess 0.2's coefficient-parity bitmap, MD5-prefixed RC4
 *              iterator and streams, default/custom keys, and optional
 *              (23,12,7) Golay error correction.
 *   SNOW       Matthew Kwan's trailing-whitespace carriers: a tab starts the
 *              message, each group of 0-7 spaces carries 3 bits, and the
 *              optional -C Huffman layer and -p ICE/CFB encryption are undone
 *              after the bits are read.
 *   WavSteg    stego-lsb 1.7.4's headerless PCM layout: the low bits of the
 *              interleaved little-endian samples, MSB first, with the -n and
 *              -b settings supplied by the caller.
 *
 * Each format is reconstructed from its published source: OpenStego
 * (LSBInputStream / RandomLSBInputStream / OpenStegoCrypto), Allan Latham's
 * JPHide/JPSeek 0.3 and 0.5/0.51 (jpseek.c, bf.c, ltable.h), JSteg
 * (bitsource.c / bitsink.c from the jpeg-jsteg-v4 patch), StegoShare
 * 1.01 (Stego.java), StegFS (stegfs.c, mkfs.c), OutGuess 0.2
 * (jpg.c, iterator.c, arc.c, golay.c), SNOW 20130616 (encode.c,
 * compress.c, encrypt.c, ice.c, huffcode.h), and stego-lsb 1.7.4
 * (WavSteg.py, bit_manipulation.py).
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

    function readLE16(bytes, offset) {
        return bytes[offset] | (bytes[offset + 1] << 8);
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

    /* ------------------------------------------------------------------ JSTEG
     * Derek Upham's JSteg is an IJG JPEG v4 patch. After quantisation, each
     * coefficient whose value is neither 0 nor +1 carries one message bit in
     * its LSB (bitsource.c: (value & 1) != value). The encoder walks the
     * image in JPEG scan order: MCU by MCU, each component's v×h blocks, and
     * within a block the DC coefficient then the AC coefficients in zigzag
     * order (jcmcu.c writes block[ZAG[i]]). The header is five bits giving the
     * width of the length field, then that many bits of length in bytes, then
     * the file, all MSB first; a JPEG written by JSteg-Shell adds a name and
     * RC4-40 on top and is not this format. There is no password or magic.
     */
    var JSTEG_ZIGZAG = [
        0, 1, 8, 16, 9, 2, 3, 10,
        17, 24, 32, 25, 18, 11, 4, 5,
        12, 19, 26, 33, 40, 48, 41, 34,
        27, 20, 13, 6, 7, 14, 21, 28,
        35, 42, 49, 56, 57, 50, 43, 36,
        29, 22, 15, 23, 30, 37, 44, 51,
        58, 59, 52, 45, 38, 31, 39, 46,
        53, 60, 61, 54, 47, 55, 62, 63
    ];

    // Lazy walker over the usable coefficient bits, so a large JPEG does not
    // have to materialise a bit array before the header is even read.
    function jstegBitReader(decoded) {
        if (!decoded || !decoded.components || !decoded.components.length) {
            fail("JSteg needs a JPEG with DCT coefficients.");
        }
        var components = decoded.components;
        // A grayscale JPEG is a non-interleaved scan: libjpeg gives it one block
        // per MCU in raster order, with no MCU grouping or padded blocks, even
        // when its sampling factors are larger than 1x1.
        if (components.length === 1) {
            var only = components[0];
            var rowIndex = 0, colIndex = 0, bitIndex = 0;
            return function nextBit() {
                while (rowIndex < only.blocksPerColumn) {
                    if (bitIndex >= 64) {
                        bitIndex = 0; colIndex++;
                        if (colIndex >= only.blocksPerLine) { colIndex = 0; rowIndex++; }
                        continue;
                    }
                    var blockRow = only.blocks[rowIndex];
                    var block = blockRow ? blockRow[colIndex] : null;
                    if (!block) { bitIndex = 64; continue; }
                    var value = block[JSTEG_ZIGZAG[bitIndex]] | 0;
                    bitIndex++;
                    if ((value & 1) !== value) return value & 1;
                }
                return -1;
            };
        }
        var maxH = 1, maxV = 1;
        for (var c = 0; c < components.length; c++) {
            if (components[c].h > maxH) maxH = components[c].h;
            if (components[c].v > maxV) maxV = components[c].v;
        }
        var mcusPerLine = Math.ceil(decoded.width / 8 / maxH);
        var mcusPerColumn = Math.ceil(decoded.height / 8 / maxV);
        var mcuRow = 0, mcuCol = 0, compIndex = 0, blockY = 0, blockX = 0, k = 0;

        return function nextBit() {
            while (mcuRow < mcusPerColumn) {
                var component = components[compIndex];
                // Include the MCU-padded blocks at the right and bottom edges. The
                // encoder fills those blocks by replicating edge pixels, so their DCT
                // coefficients are not zero and JSteg writes bits into them. Limiting
                // the walk to blocksPerLine/blocksPerColumn drops those bits and
                // desynchronises the stream on carriers whose dimensions are not a
                // whole number of MCUs.
                if (blockY >= component.v) {
                    blockY = 0; blockX = 0; compIndex++;
                    if (compIndex >= components.length) {
                        compIndex = 0; mcuCol++;
                        if (mcuCol >= mcusPerLine) { mcuCol = 0; mcuRow++; }
                    }
                    k = 0;
                    continue;
                }
                if (blockX >= component.h) { blockX = 0; blockY++; k = 0; continue; }
                if (k < 64) {
                    var row = component.blocks[mcuRow * component.v + blockY];
                    var block = row ? row[mcuCol * component.h + blockX] : null;
                    if (!block) { k = 64; continue; }
                    var value = block[JSTEG_ZIGZAG[k]] | 0;
                    k++;
                    // Skip 0 and +1; -1 and every other value carry a bit.
                    if ((value & 1) !== value) return value & 1;
                    continue;
                }
                k = 0; blockX++; continue;
            }
            return -1;
        };
    }

    function jstegFromJpeg(input) {
        var bytes = toBytes(input);
        if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
            fail("JSteg needs a JPEG file (no SOI marker).");
        }
        var decoded;
        try {
            decoded = cfDecodeJpegCoefficients(bytes);
        } catch (err) {
            fail("Could not read the JPEG's DCT coefficients: " + (err && err.message ? err.message : err));
        }
        var nextBit = jstegBitReader(decoded);

        function readBits(count) {
            var value = 0;
            for (var i = 0; i < count; i++) {
                var bit = nextBit();
                if (bit < 0) return -1;
                value = (value << 1) | bit;
            }
            return value;
        }

        var width = readBits(5);
        if (width < 0) fail("This JPEG has no JSteg data (it ran out of usable DCT coefficients).");
        if (width === 0) {
            fail("This JPEG has no JSteg payload: its 5-bit length-field width is zero, which JSteg writes only for an empty file.");
        }
        var length = readBits(width);
        if (length < 0) fail("The JPEG ended before the JSteg length field was complete.");
        if (length > MAX_OUTPUT) fail("The JSteg payload is larger than this page will decode.");
        var data = new Uint8Array(length);
        for (var n = 0; n < length; n++) {
            var value = readBits(8);
            if (value < 0) {
                fail("The JPEG ended before the whole JSteg payload was recovered (the header says " + length + " bytes).");
            }
            data[n] = value;
        }
        return data;
    }

    /* ---------------------------------------------------------------------- F5
     * F5 (Andreas Westfeld, 2001) hides data in the quantised DCT coefficients
     * of a JPEG. Its generator is Java's sun.security.provider.SecureRandom
     * (SHA1PRNG) seeded with the raw password bytes, so the state starts as
     * SHA-1(password) and each 20-byte block advances it by
     * state = state + digest + 1 with Java's signed-byte arithmetic. The same
     * stream drives a Fisher-Yates permutation of every coefficient and the
     * XOR pads on the header and payload. Coefficients are visited in scan
     * order, skipping DC and zero values; negative coefficients use their
     * absolute value's parity. A 32-bit header carries k in its top byte and
     * the byte count in the low 23 bits; k=0 means plain LSBs, otherwise a
     * (1, 2^k-1, k) matrix code carries k bits per group of 2^k-1 values.
     * F5 has no magic bytes, so a wrong password normally fails the header's
     * k/length checks but cannot be ruled out completely.
     */

    function f5Sha1(data) {
        var length = data.length;
        var padded = new Uint8Array(Math.ceil((length + 9) / 64) * 64);
        padded.set(data);
        padded[length] = 0x80;
        var high = Math.floor(length / 536870912);
        var low = (length * 8) >>> 0;
        var end = padded.length;
        padded[end - 8] = (high >>> 24) & 0xff;
        padded[end - 7] = (high >>> 16) & 0xff;
        padded[end - 6] = (high >>> 8) & 0xff;
        padded[end - 5] = high & 0xff;
        padded[end - 4] = (low >>> 24) & 0xff;
        padded[end - 3] = (low >>> 16) & 0xff;
        padded[end - 2] = (low >>> 8) & 0xff;
        padded[end - 1] = low & 0xff;

        function rotl(value, bits) {
            return (value << bits) | (value >>> (32 - bits));
        }

        var h0 = 0x67452301 | 0, h1 = 0xefcdab89 | 0, h2 = 0x98badcfe | 0;
        var h3 = 0x10325476 | 0, h4 = 0xc3d2e1f0 | 0;
        var words = new Int32Array(80);
        for (var offset = 0; offset < end; offset += 64) {
            var i;
            for (i = 0; i < 16; i++) {
                var at = offset + i * 4;
                words[i] = (padded[at] << 24) | (padded[at + 1] << 16) |
                    (padded[at + 2] << 8) | padded[at + 3];
            }
            for (i = 16; i < 80; i++) {
                words[i] = rotl(words[i - 3] ^ words[i - 8] ^ words[i - 14] ^ words[i - 16], 1);
            }
            var a = h0, b = h1, c = h2, d = h3, e = h4;
            for (i = 0; i < 80; i++) {
                var f, k;
                if (i < 20) {
                    f = (b & c) | (~b & d); k = 0x5a827999;
                } else if (i < 40) {
                    f = b ^ c ^ d; k = 0x6ed9eba1;
                } else if (i < 60) {
                    f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc;
                } else {
                    f = b ^ c ^ d; k = 0xca62c1d6;
                }
                var temp = (rotl(a, 5) + f + e + k + words[i]) | 0;
                e = d; d = c; c = rotl(b, 30); b = a; a = temp;
            }
            h0 = (h0 + a) | 0;
            h1 = (h1 + b) | 0;
            h2 = (h2 + c) | 0;
            h3 = (h3 + d) | 0;
            h4 = (h4 + e) | 0;
        }
        var out = new Uint8Array(20);
        var hashes = [h0, h1, h2, h3, h4];
        for (i = 0; i < 5; i++) {
            out[i * 4] = (hashes[i] >>> 24) & 0xff;
            out[i * 4 + 1] = (hashes[i] >>> 16) & 0xff;
            out[i * 4 + 2] = (hashes[i] >>> 8) & 0xff;
            out[i * 4 + 3] = hashes[i] & 0xff;
        }
        return out;
    }

    function f5Signed(value) {
        return value > 127 ? value - 256 : value;
    }

    function f5Random(passwordBytes) {
        var state = f5Sha1(passwordBytes);
        var buffer = null;
        var at = 0;

        function step() {
            var digest = f5Sha1(state);
            // sun.security.provider.SecureRandom.updateState(). The JDK adds
            // bytes as signed values and keeps an arithmetic carry, so this is
            // deliberately not an unsigned 160-bit addition.
            var last = 1;
            var changed = false;
            for (var i = 0; i < state.length; i++) {
                var value = f5Signed(state[i]) + f5Signed(digest[i]) + last;
                var next = value & 0xff;
                if (next !== state[i]) changed = true;
                state[i] = next;
                last = value >> 8;
            }
            if (!changed) state[0] = (state[0] + 1) & 0xff;
            buffer = digest;
            at = 0;
        }

        function nextByte() {
            if (buffer === null || at >= buffer.length) step();
            return buffer[at++];
        }

        function nextValue(maxValue) {
            // Java's getNextValue() sign-extends each byte before shifting.
            var value = f5Signed(nextByte()) | (f5Signed(nextByte()) << 8) |
                (f5Signed(nextByte()) << 16) | (f5Signed(nextByte()) << 24);
            var result = value % maxValue;
            if (result < 0) result += maxValue;
            return result;
        }

        return {nextByte: nextByte, nextValue: nextValue};
    }

    function f5Permutation(size, random) {
        var shuffled = new Int32Array(size);
        for (var i = 0; i < size; i++) shuffled[i] = i;
        var maxRandom = size;
        for (i = 0; i < size; i++) {
            var randomIndex = random.nextValue(maxRandom--);
            var swap = shuffled[randomIndex];
            shuffled[randomIndex] = shuffled[maxRandom];
            shuffled[maxRandom] = swap;
        }
        return shuffled;
    }

    // F5's Huffman decoder stores each 8x8 block in zigzag order and maps the
    // shuffled index through deZigZag before reading, which is exactly reading
    // the coefficient at that natural position. jpeg-coeff keeps blocks in
    // natural order already, so the flat array below is walk order + natural
    // block position, with the same MCU padding the vendor decoder sees.
    function f5Coefficients(decoded) {
        var components = decoded.components;
        if (!components || !components.length) fail("F5 needs a JPEG with DCT coefficients.");
        var maxH = 1, maxV = 1;
        for (var c = 0; c < components.length; c++) {
            if (components[c].h > maxH) maxH = components[c].h;
            if (components[c].v > maxV) maxV = components[c].v;
        }
        var mcusPerLine = Math.ceil(decoded.width / 8 / maxH);
        var mcusPerColumn = Math.ceil(decoded.height / 8 / maxV);
        var perMcu = 0;
        for (c = 0; c < components.length; c++) perMcu += components[c].h * components[c].v;
        var coefficients = new Int32Array(mcusPerLine * mcusPerColumn * perMcu * 64);
        var at = 0;
        for (var mcuRow = 0; mcuRow < mcusPerColumn; mcuRow++) {
            for (var mcuCol = 0; mcuCol < mcusPerLine; mcuCol++) {
                for (c = 0; c < components.length; c++) {
                    var component = components[c];
                    for (var y = 0; y < component.v; y++) {
                        for (var x = 0; x < component.h; x++) {
                            var row = component.blocks[mcuRow * component.v + y];
                            var block = row ? row[mcuCol * component.h + x] : null;
                            for (var k = 0; k < 64; k++) {
                                coefficients[at++] = block ? (block[k] | 0) : 0;
                            }
                        }
                    }
                }
            }
        }
        return coefficients;
    }

    function f5FromCoefficients(coefficients, password) {
        var size = coefficients.length;
        if (!size) fail("F5 needs a JPEG with DCT coefficients.");
        var random = f5Random(utf8Encode(password == null ? "" : String(password)));
        var permutation = f5Permutation(size, random);

        var header = 0, bits = 0, pos = 0;
        while (bits < 32) {
            if (pos >= size) {
                fail("This JPEG ran out of usable coefficients before completing an F5 header; it may not be an F5 carrier, or the password may be wrong.");
            }
            var index = permutation[pos++];
            if ((index & 63) === 0) continue;
            var value = coefficients[index] | 0;
            if (value === 0) continue;
            header |= (value > 0 ? value & 1 : 1 - (value & 1)) << bits;
            bits++;
        }

        header ^= f5Signed(random.nextByte());
        header ^= f5Signed(random.nextByte()) << 8;
        header ^= f5Signed(random.nextByte()) << 16;
        header ^= f5Signed(random.nextByte()) << 24;
        var k = (header >> 24) % 32;
        var length = header & 0x007fffff;
        if (k < 0 || k > 7) {
            fail("This JPEG does not contain a readable F5 header (matrix parameter " + k +
                "); it may not be an F5 carrier, or the password may be wrong.");
        }
        if (length <= 0) {
            fail("This JPEG has no F5 payload: the header's length field is zero.");
        }
        if (length > MAX_OUTPUT) fail("The F5 payload is larger than this page will decode.");
        if (length > Math.floor(size / 8)) {
            fail("The F5 header claims " + length + " bytes, more than this JPEG's coefficients can carry; it may not be an F5 carrier, or the password may be wrong.");
        }

        var output = new Uint8Array(length);
        var outAt = 0;
        var current = 0;
        var available = 0;
        var n = k === 0 ? 0 : (1 << k) - 1;

        if (n > 0) {
            var startOfN = pos;
            while (outAt < length) {
                var hash = 0;
                var code = 1;
                while (code <= n) {
                    if (startOfN >= size) {
                        fail("The JPEG ended before the whole F5 payload was recovered (the header claims " + length + " bytes).");
                    }
                    var at = permutation[startOfN++];
                    if ((at & 63) === 0) continue;
                    var value = coefficients[at] | 0;
                    if (value === 0) continue;
                    var coefficientBit = value > 0 ? value & 1 : 1 - (value & 1);
                    if (coefficientBit === 1) hash ^= code;
                    code++;
                }
                for (var j = 0; j < k && outAt < length; j++) {
                    current |= ((hash >> j) & 1) << available;
                    if (++available === 8) {
                        current ^= random.nextByte() & 0xff;
                        output[outAt++] = current & 0xff;
                        current = 0;
                        available = 0;
                    }
                }
            }
        } else {
            while (outAt < length) {
                if (pos >= size) {
                    fail("The JPEG ended before the whole F5 payload was recovered (the header claims " + length + " bytes).");
                }
                var index = permutation[pos++];
                if ((index & 63) === 0) continue;
                var value = coefficients[index] | 0;
                if (value === 0) continue;
                var coefficientBit = value > 0 ? value & 1 : 1 - (value & 1);
                current |= coefficientBit << available;
                if (++available === 8) {
                    current ^= random.nextByte() & 0xff;
                    output[outAt++] = current & 0xff;
                    current = 0;
                    available = 0;
                }
            }
        }
        return output;
    }

    function f5FromJpeg(input, password) {
        var bytes = toBytes(input);
        if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
            fail("F5 needs a JPEG file (no SOI marker).");
        }
        var decoded;
        try {
            decoded = cfDecodeJpegCoefficients(bytes);
        } catch (err) {
            fail("Could not read the JPEG's DCT coefficients: " + (err && err.message ? err.message : err));
        }
        return f5FromCoefficients(f5Coefficients(decoded), password);
    }

    /* --------------------------------------------------------------- OUTGUESS
     * OutGuess 0.2 (Niels Provos) hides a message in the parity of quantised
     * JPEG DCT coefficients. Its libjpeg hook visits coefficients in MCU order,
     * component scan order, then natural coefficient order, and skips the
     * values 0 and 1; negative coefficients are kept. A 16-bit seed and a
     * 16-bit message length travel first, and the body is read with a
     * skip-averaging iterator seeded by that value. Both the header and body
     * are RC4-encrypted with MD5-prefixed keys, and the optional -e mode wraps
     * the data in the published (23,12,7) Golay code.
     */

    function outguessBitmap(decoded) {
        if (!decoded || !decoded.components || !decoded.components.length) {
            fail("OutGuess needs a JPEG with DCT coefficients.");
        }
        var components = decoded.components;
        var maxH = 1, maxV = 1;
        for (var c = 0; c < components.length; c++) {
            if (components[c].h > maxH) maxH = components[c].h;
            if (components[c].v > maxV) maxV = components[c].v;
        }
        var mcusPerLine = Math.ceil(decoded.width / 8 / maxH);
        var mcusPerColumn = Math.ceil(decoded.height / 8 / maxV);
        var capacity = 0;
        for (c = 0; c < components.length; c++) {
            capacity += components[c].blocksPerLine * components[c].blocksPerColumn * 64;
        }
        var bits = new Uint8Array(capacity);
        var count = 0;

        for (var mcuRow = 0; mcuRow < mcusPerColumn; mcuRow++) {
            for (var mcuCol = 0; mcuCol < mcusPerLine; mcuCol++) {
                for (c = 0; c < components.length; c++) {
                    var component = components[c];
                    var usefulWidth = Math.min(component.h, component.blocksPerLine - mcuCol * component.h);
                    var usefulHeight = Math.min(component.v, component.blocksPerColumn - mcuRow * component.v);
                    for (var y = 0; y < usefulHeight; y++) {
                        for (var x = 0; x < usefulWidth; x++) {
                            var block = component.blocks[mcuRow * component.v + y][mcuCol * component.h + x];
                            for (var k = 0; k < 64; k++) {
                                var temp = block[k];
                                // steg_use_bit() skips 0 and +1; negatives keep
                                // their two's-complement parity.
                                if ((temp & 1) === temp) continue;
                                bits[count++] = temp & 1;
                            }
                        }
                    }
                }
            }
        }
        return bits.subarray(0, count);
    }

    function outguessRc4Init() {
        var state = new Uint8Array(256);
        for (var i = 0; i < 256; i++) state[i] = i;
        return {s: state, i: 0, j: 0};
    }

    function outguessAddRandom(as, data) {
        as.i = (as.i - 1) & 0xff;
        for (var n = 0; n < 256; n++) {
            as.i = (as.i + 1) & 0xff;
            var si = as.s[as.i];
            as.j = (as.j + si + data[n % data.length]) & 0xff;
            as.s[as.i] = as.s[as.j];
            as.s[as.j] = si;
        }
    }

    // arc4_initkey() hashes the purpose string followed by the key with MD5,
    // then mixes the digest into a fresh RC4 state. OutGuess uses the stream
    // from its first byte; there is no RC4 drop here.
    function outguessRc4Key(type, keyBytes) {
        var prefix = utf8Encode(type);
        var input = new Uint8Array(prefix.length + keyBytes.length);
        input.set(prefix, 0);
        input.set(keyBytes, prefix.length);
        var as = outguessRc4Init();
        outguessAddRandom(as, md5(input));
        return as;
    }

    function outguessRc4Byte(as) {
        as.i = (as.i + 1) & 0xff;
        var si = as.s[as.i];
        as.j = (as.j + si) & 0xff;
        var sj = as.s[as.j];
        as.s[as.i] = sj;
        as.s[as.j] = si;
        return as.s[(si + sj) & 0xff];
    }

    function outguessRc4Word(as) {
        return ((outguessRc4Byte(as) << 24) |
            (outguessRc4Byte(as) << 16) |
            (outguessRc4Byte(as) << 8) |
            outguessRc4Byte(as)) >>> 0;
    }

    function outguessIterator(keyBytes) {
        var as = outguessRc4Key("Seeding", keyBytes);
        return {as: as, skipmod: 32, off: outguessRc4Word(as) % 32};
    }

    function outguessReadByte(bitmap, iter) {
        var value = 0;
        for (var bit = 0; bit < 8; bit++) {
            if (iter.off < 0 || iter.off >= bitmap.length) {
                fail("This JPEG does not hold an OutGuess 0.2 payload for that key (the coefficient bitmap ended early).");
            }
            value |= bitmap[iter.off] << bit;
            iter.off += (outguessRc4Word(iter.as) % iter.skipmod) + 1;
        }
        return value;
    }

    function outguessSeedIterator(iter, seed) {
        outguessAddRandom(iter.as, Uint8Array.of(seed & 0xff, (seed >>> 8) & 0xff));
    }

    // iterator_adapt(): the average skip grows towards 2 early in the image and
    // fades below it near the end, keeping the body spread over the bitmap.
    function outguessAdapt(iter, bits, remaining) {
        var left = bits - iter.off;
        var thirtySecond = Math.floor(bits / 32);
        var adjust = thirtySecond > 0 && left > thirtySecond ? 2 : 2 - (thirtySecond - left) / thirtySecond;
        iter.skipmod = Math.trunc(adjust * left / (8 * remaining));
        if (!(iter.skipmod > 0)) {
            fail("This JPEG does not hold an OutGuess 0.2 payload for that key (the coefficient bitmap ran out).");
        }
    }

    /* The (23,12,7) Golay decoder from OutGuess's golay.c. Only the syndrome
     * table is needed for extraction: every error pattern of weight up to three
     * maps to its syndrome, and correcting a codeword means XORing that pattern
     * back out. */
    var OUTGUESS_GOLAY = null;

    function outguessGolaySyndrome(pattern) {
        var aux = 0x400000; // X^22
        if (pattern >= 0x800) { // X^11
            while (pattern & 0x7ff800) {
                while (!(aux & pattern)) aux >>>= 1;
                pattern ^= Math.floor(aux / 0x800) * 0xc75;
            }
        }
        return pattern;
    }

    function outguessGolayTable() {
        if (OUTGUESS_GOLAY) return OUTGUESS_GOLAY;
        var table = new Uint32Array(2048);
        function add(pattern) {
            table[outguessGolaySyndrome(pattern)] = pattern;
        }
        add(0);
        for (var i = 0; i < 23; i++) add(1 << i);
        for (i = 0; i < 23; i++) {
            for (var j = i + 1; j < 23; j++) add((1 << i) | (1 << j));
        }
        for (i = 0; i < 23; i++) {
            for (j = i + 1; j < 23; j++) {
                for (var k = j + 1; k < 23; k++) add((1 << i) | (1 << j) | (1 << k));
            }
        }
        OUTGUESS_GOLAY = table;
        return table;
    }

    function outguessGolayCorrect(word) {
        var table = outguessGolayTable();
        return (word ^ table[outguessGolaySyndrome(word)]) & 0x7fffff;
    }

    function outguessGolayDecode(bytes) {
        var declen = Math.floor(bytes.length * 12 / 23);
        var out = new Uint8Array(declen);
        var bit = 0;
        var n = 0;
        var acc = 0;
        var accBits = 0;

        while (n < declen) {
            var word = 0;
            for (var k = 0; k < 23; k++) {
                var at = bit >> 3;
                if (at >= bytes.length) {
                    fail("This OutGuess payload is marked as error-corrected but is too short for its Golay blocks.");
                }
                word |= ((bytes[at] >> (bit & 7)) & 1) << k;
                bit++;
            }
            acc |= (outguessGolayCorrect(word) >>> 11) << accBits;
            accBits += 12;
            while (accBits >= 8 && n < declen) {
                out[n++] = acc & 0xff;
                acc >>>= 8;
                accBits -= 8;
            }
        }

        var padding = out[declen - 1];
        if (padding > 2) fail("This OutGuess payload has invalid Golay padding; the key or error-correction setting is wrong.");
        for (var p = 0; p <= padding; p++) {
            if (out[declen - 1 - p] !== padding - p) {
                fail("This OutGuess payload has invalid Golay padding; the key or error-correction setting is wrong.");
            }
        }
        return out.subarray(0, declen - padding - 1);
    }

    function outguessDecrypt(bytes, as) {
        var out = new Uint8Array(bytes.length);
        for (var i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ outguessRc4Byte(as);
        return out;
    }

    function outguessFromJpeg(input, key, errorCorrection) {
        var bytes = toBytes(input);
        if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
            fail("OutGuess needs a JPEG file (no SOI marker).");
        }
        var decoded;
        try {
            decoded = cfDecodeJpegCoefficients(bytes);
        } catch (err) {
            fail("Could not read the JPEG's DCT coefficients: " + (err && err.message ? err.message : err));
        }
        var bitmap = outguessBitmap(decoded);
        var keyText = key == null || String(key).length === 0 ? "Default key" : String(key);
        var keyBytes = utf8Encode(keyText);
        var headerStream = outguessRc4Key("Encryption", keyBytes);
        var bodyStream = {s: new Uint8Array(headerStream.s), i: headerStream.i, j: headerStream.j};
        var iter = outguessIterator(keyBytes);

        // The header is four bytes, or twelve bytes of Golay-coded data under
        // -e. steg_retrieve() reads it with the iterator's initial skip of 32.
        var header = new Uint8Array(errorCorrection ? 12 : 4);
        for (var h = 0; h < header.length; h++) header[h] = outguessReadByte(bitmap, iter);
        header = outguessDecrypt(header, headerStream);
        if (errorCorrection) header = outguessGolayDecode(header);
        if (header.length < 4) fail("This OutGuess payload has a short header.");

        var seed = header[0] | (header[1] << 8);
        var length = header[2] | (header[3] << 8);
        if (length > Math.ceil(bitmap.length / 8)) {
            fail("This JPEG does not hold an OutGuess 0.2 payload for that key (the header length is larger than the coefficient bitmap).");
        }
        if (length === 0) return [];

        outguessSeedIterator(iter, seed);
        var encrypted = new Uint8Array(length);
        for (var i = 0; i < length; i++) {
            outguessAdapt(iter, bitmap.length, length - i);
            encrypted[i] = outguessReadByte(bitmap, iter);
        }
        var data = outguessDecrypt(encrypted, bodyStream);
        if (errorCorrection) data = outguessGolayDecode(data);
        return toByteArray(data);
    }

    /* ------------------------------------------------------------- AES-256
     * StegFS uses libgcrypt's CBC mode with no padding and keeps the CBC
     * chaining state across the blocks of one file copy. WebCrypto's AES-CBC
     * always applies and strips PKCS#7 padding, so decrypting a StegFS block
     * with it fails unless the random tail happens to look like padding. A
     * compact raw AES-256 decryptor keeps the format exact. The S-box and the
     * key schedule are the FIPS-197 ones; only decryption is needed.
     */
    var AES_SBOX = new Uint8Array([
        0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
        0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
        0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
        0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
        0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
        0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
        0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
        0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
        0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
        0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
        0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
        0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
        0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
        0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
        0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
        0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
    ]);
    var AES_INV_SBOX = (function () {
        var table = new Uint8Array(256);
        for (var i = 0; i < 256; i++) table[AES_SBOX[i]] = i;
        return table;
    })();

    function aesXtime(value) {
        return ((value << 1) ^ ((value & 0x80) ? 0x1b : 0)) & 0xff;
    }

    function aesSubWord(word) {
        return (AES_SBOX[(word >>> 24) & 0xff] << 24) |
            (AES_SBOX[(word >>> 16) & 0xff] << 16) |
            (AES_SBOX[(word >>> 8) & 0xff] << 8) |
            AES_SBOX[word & 0xff];
    }

    function aesExpandKey(key) {
        if (key.length !== 32) fail("StegFS needs a 32-byte AES-256 key.");
        var words = new Uint32Array(60);
        for (var i = 0; i < 8; i++) words[i] = readBE32(key, i * 4);
        var rcon = 1;
        for (i = 8; i < 60; i++) {
            var temp = words[i - 1];
            if ((i & 7) === 0) {
                temp = aesSubWord(((temp << 8) | (temp >>> 24)) >>> 0) ^ (rcon << 24);
                rcon = aesXtime(rcon);
            } else if ((i & 7) === 4) {
                temp = aesSubWord(temp);
            }
            words[i] = (words[i - 8] ^ temp) >>> 0;
        }
        return words;
    }

    function aesAddRoundKey(state, words, round) {
        for (var column = 0; column < 4; column++) {
            var word = words[round * 4 + column];
            var at = column * 4;
            state[at] ^= (word >>> 24) & 0xff;
            state[at + 1] ^= (word >>> 16) & 0xff;
            state[at + 2] ^= (word >>> 8) & 0xff;
            state[at + 3] ^= word & 0xff;
        }
    }

    function aesInvShiftRows(state) {
        var copy = new Uint8Array(state);
        state[1] = copy[13]; state[5] = copy[1]; state[9] = copy[5]; state[13] = copy[9];
        state[2] = copy[10]; state[6] = copy[14]; state[10] = copy[2]; state[14] = copy[6];
        state[3] = copy[7]; state[7] = copy[11]; state[11] = copy[15]; state[15] = copy[3];
    }

    function aesInvSubBytes(state) {
        for (var i = 0; i < 16; i++) state[i] = AES_INV_SBOX[state[i]];
    }

    function aesGmul(a, b) {
        var product = 0;
        for (var i = 0; i < 8; i++) {
            if (b & 1) product ^= a;
            var high = a & 0x80;
            a = (a << 1) & 0xff;
            if (high) a ^= 0x1b;
            b >>>= 1;
        }
        return product & 0xff;
    }

    function aesInvMixColumns(state) {
        for (var col = 0; col < 4; col++) {
            var at = col * 4;
            var a0 = state[at], a1 = state[at + 1], a2 = state[at + 2], a3 = state[at + 3];
            state[at] = aesGmul(a0, 14) ^ aesGmul(a1, 11) ^ aesGmul(a2, 13) ^ aesGmul(a3, 9);
            state[at + 1] = aesGmul(a0, 9) ^ aesGmul(a1, 14) ^ aesGmul(a2, 11) ^ aesGmul(a3, 13);
            state[at + 2] = aesGmul(a0, 13) ^ aesGmul(a1, 9) ^ aesGmul(a2, 14) ^ aesGmul(a3, 11);
            state[at + 3] = aesGmul(a0, 11) ^ aesGmul(a1, 13) ^ aesGmul(a2, 9) ^ aesGmul(a3, 14);
        }
    }

    function aesDecryptBlock(block, roundKeys) {
        var state = new Uint8Array(block);
        aesAddRoundKey(state, roundKeys, 14);
        for (var round = 13; round >= 1; round--) {
            aesInvShiftRows(state);
            aesInvSubBytes(state);
            aesAddRoundKey(state, roundKeys, round);
            aesInvMixColumns(state);
        }
        aesInvShiftRows(state);
        aesInvSubBytes(state);
        aesAddRoundKey(state, roundKeys, 0);
        return state;
    }

    // Raw CBC: no padding is added, removed or checked. The caller keeps the
    // returned next Iv when a file's data blocks continue one cipher stream.
    function aes256CbcDecrypt(ciphertext, key, iv) {
        if (!ciphertext.length || ciphertext.length % 16) fail("The StegFS AES data is not a whole number of blocks.");
        var roundKeys = aesExpandKey(key);
        var out = new Uint8Array(ciphertext.length);
        var previous = iv;
        for (var offset = 0; offset < ciphertext.length; offset += 16) {
            var block = ciphertext.subarray(offset, offset + 16);
            var plain = aesDecryptBlock(block, roundKeys);
            for (var i = 0; i < 16; i++) out[offset + i] = plain[i] ^ previous[i];
            previous = block;
        }
        return out;
    }

    /* -------------------------------------------------------------- UTF-8
     * Small byte helpers shared by the StegFS hashes and key derivations.
     */
    function concatBytes() {
        var total = 0;
        for (var i = 0; i < arguments.length; i++) total += arguments[i].length;
        var out = new Uint8Array(total);
        var at = 0;
        for (i = 0; i < arguments.length; i++) {
            out.set(arguments[i], at);
            at += arguments[i].length;
        }
        return out;
    }

    function equalBytes(a, b) {
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
    }

    function readU64BE(bytes, offset) {
        var value = 0n;
        for (var i = 0; i < 8; i++) value = (value << 8n) | BigInt(bytes[offset + i]);
        return value;
    }

    function readU64LE(bytes, offset) {
        var value = 0n;
        for (var i = 7; i >= 0; i--) value = (value << 8n) | BigInt(bytes[offset + i]);
        return value;
    }

    function stegfsNormalize(value, blocks) {
        var reduced = value % BigInt(blocks);
        return Number(reduced);
    }

    function webCryptoSubtle() {
        var webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : null;
        if (!webCrypto || !webCrypto.subtle) fail("This browser cannot decrypt StegFS volumes (Web Crypto is missing).");
        return webCrypto.subtle;
    }

    async function sha256(bytes) {
        return new Uint8Array(await webCryptoSubtle().digest("SHA-256", bytes));
    }

    async function sha512(bytes) {
        return new Uint8Array(await webCryptoSubtle().digest("SHA-512", bytes));
    }

    async function pbkdf2Sha256(seed, salt, iterations, length) {
        var subtle = webCryptoSubtle();
        var material = await subtle.importKey("raw", seed, "PBKDF2", false, ["deriveBits"]);
        return new Uint8Array(await subtle.deriveBits(
            {name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256"},
            material, length * 8
        ));
    }

    async function hmacSha256(key, data) {
        var subtle = webCryptoSubtle();
        var material = await subtle.importKey("raw", key, {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
        return new Uint8Array(await subtle.sign("HMAC", material, data));
    }

    /* --------------------------------------------------------------- StegFS
     * A 2015.08/202X.XX StegFS volume is a sequence of 2,048-byte blocks. A
     * hidden file has no directory entry: SHA-512 of its directory path and
     * name (rotated one byte for each copy) gives the little-endian block
     * numbers to try for its inode. The AES-256 key is SHA-256 of
     * path+name+password in 2015.08, or PBKDF2-HMAC-SHA-256 over
     * SHA-256(name+password) with SHA-256(path) as salt in 202X.XX. The IV is
     * SHA-256(password+name+path+copyNumber). Each block's first 32 bytes are
     * a plaintext path hash; the rest is one continuous raw-CBC stream, with
     * the SHA-256 of the 1,976-byte data area stored after it. Inode data
     * holds the file size, one first-data-block address per copy, an optional
     * HMAC, and up to (1,976-headerOffset) inline bytes.
     */
    var STEGFS_BLOCK_SIZE = 2048;
    var STEGFS_PATH_BYTES = 32;
    var STEGFS_DATA_BYTES = 1976;
    var STEGFS_HASH_BYTES = 32;
    var STEGFS_NEXT_BYTES = 8;
    var STEGFS_MAGIC_0 = 0x5287505e71e039dfn;
    var STEGFS_MAGIC_1 = 0xebccb02ab09ba26fn;
    var STEGFS_MAGIC_2 = 0x089e07f0da733557n;
    var STEGFS_MAGIC_201508_2 = 0x8c9b291a9e55c137n;
    var STEGFS_MAGIC_201001_0 = 0xa157afa602cc9d1bn;
    var STEGFS_MAGIC_201001_1 = 0x33be2b298b76f2acn;
    var STEGFS_MAGIC_201001_2 = 0xc903284d7c593af6n;

    function stegfsText(bytes) {
        var out = "";
        for (var i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
        return out;
    }

    function stegfsSplitPath(value) {
        var path = value == null ? "" : String(value).trim();
        if (!path) fail("Enter the hidden file's path inside the StegFS volume, for example /notes.txt.");
        if (path.charAt(0) !== "/") path = "/" + path;
        if (path.length > 1 && path.charAt(path.length - 1) === "/") {
            fail("The StegFS path must name a file, not end with a slash.");
        }
        var slash = path.lastIndexOf("/");
        var name = path.slice(slash + 1);
        if (!name) fail("Enter the hidden file's full path inside the StegFS volume, for example /notes.txt.");
        return {path: slash === 0 ? "/" : path.slice(0, slash), name: name};
    }

    function stegfsParseSuperblock(bytes) {
        if (bytes.length < 2 * STEGFS_BLOCK_SIZE || bytes.length % STEGFS_BLOCK_SIZE) {
            fail("A StegFS volume must be a whole number of 2,048-byte blocks (at least two).");
        }
        var magic0 = readU64BE(bytes, STEGFS_PATH_BYTES + STEGFS_DATA_BYTES);
        var magic1 = readU64BE(bytes, STEGFS_PATH_BYTES + STEGFS_DATA_BYTES + 8);
        var magic2 = readU64BE(bytes, STEGFS_PATH_BYTES + STEGFS_DATA_BYTES + 16);
        if (magic0 === STEGFS_MAGIC_201001_0 && magic1 === STEGFS_MAGIC_201001_1 && magic2 === STEGFS_MAGIC_201001_2) {
            fail("This is the older 2010.01 StegFS format, which this node cannot read. Recover it with StegFS 2010.01 first.");
        }
        if (magic0 !== STEGFS_MAGIC_0 || magic1 !== STEGFS_MAGIC_1) {
            fail("Not a StegFS volume: the superblock signature is missing.");
        }
        var data = bytes.subarray(STEGFS_PATH_BYTES, STEGFS_PATH_BYTES + STEGFS_DATA_BYTES);
        var tags;
        var offset;
        if (magic2 === STEGFS_MAGIC_201508_2) {
            tags = 8;
            offset = 0;
        } else if (magic2 === STEGFS_MAGIC_2) {
            if (data.length < 8) fail("The StegFS superblock is too short for its tag count.");
            tags = Number(readU64BE(data, 0));
            offset = 8;
        } else {
            fail("Not a StegFS volume: the superblock layout version is unknown.");
        }
        if (tags > 16) fail("The StegFS superblock has an invalid tag count.");
        var values = {};
        for (var index = 0; index < tags; index++) {
            if (offset + 3 > data.length) fail("The StegFS superblock ends in the middle of a tag.");
            var tag = data[offset++];
            var length = (data[offset] << 8) | data[offset + 1];
            offset += 2;
            if (offset + length > data.length) fail("A StegFS superblock tag runs past the end of the block.");
            values[tag] = data.subarray(offset, offset + length);
            offset += length;
        }
        function value(tag) { return values[tag] == null ? null : values[tag]; }
        function text(tag) { var v = value(tag); return v == null ? "" : stegfsText(v); }
        var stegfs = value(0);
        if (!stegfs || stegfsText(stegfs) !== "stegfs") fail("Not a StegFS volume: the filesystem name tag is missing.");
        var version = text(1);
        if (version !== "2015.08" && version !== "202X.XX") {
            fail("Unsupported StegFS format version \"" + version + "\". This node reads 2015.08 and 202X.XX.");
        }
        var cipher = text(2) || "RIJNDAEL256";
        if (!/^(?:RIJNDAEL|AES)256$/i.test(cipher)) {
            fail("This StegFS volume uses cipher \"" + cipher + "\"; this node only reads the default AES-256 (RIJNDAEL256).");
        }
        var mode = text(4) || "CBC";
        if (mode.toUpperCase() !== "CBC") fail("This StegFS volume uses \"" + mode + "\" mode; this node only reads CBC.");
        var hash = text(3) || "SHA256";
        if (hash.toUpperCase() !== "SHA256") {
            fail("This StegFS volume uses hash \"" + hash + "\"; this node only reads SHA-256.");
        }
        var blockTag = value(5);
        var headerTag = value(6);
        if (!blockTag || blockTag.length !== 4) fail("The StegFS superblock has no valid block size.");
        if (!headerTag || headerTag.length !== 4) fail("The StegFS superblock has no valid header offset.");
        var blocksize = readBE32(blockTag, 0);
        var headOffset = readBE32(headerTag, 0);
        if (blocksize !== STEGFS_BLOCK_SIZE) fail("Unsupported StegFS block size " + blocksize + ".");
        var copies = 8;
        var copyTag = value(7);
        if (copyTag) {
            if (version === "202X.XX") {
                if (copyTag.length !== 1) fail("The StegFS copy count has an invalid length.");
                copies = copyTag[0];
            } else {
                if (copyTag.length !== 4) fail("The StegFS copy count has an invalid length.");
                copies = readBE32(copyTag, 0);
            }
        }
        if (!copies || copies > 64) fail("The StegFS volume has an invalid number of file copies.");
        if (headOffset > STEGFS_DATA_BYTES || headOffset < (copies + 1) * 8 + STEGFS_HASH_BYTES) {
            fail("The StegFS volume has an invalid inline-data offset.");
        }
        var kdf = 32768;
        var kdfTag = value(9);
        if (kdfTag) {
            if (kdfTag.length !== 8) fail("The StegFS key-derivation count has an invalid length.");
            kdf = Number(readU64BE(kdfTag, 0));
            if (!Number.isSafeInteger(kdf) || kdf <= 0) fail("The StegFS key-derivation count is invalid.");
        }
        var totalBlocks = bytes.length / STEGFS_BLOCK_SIZE;
        var next = readU64BE(bytes, STEGFS_BLOCK_SIZE - STEGFS_NEXT_BYTES);
        if (next !== BigInt(totalBlocks)) {
            fail("The StegFS volume size does not match its superblock (it may be truncated or resized).");
        }
        var mac = text(8) || "HMAC_SHA256";
        if (version === "202X.XX" && !/^HMAC[-_]SHA256$/i.test(mac)) {
            fail("This StegFS volume uses MAC \"" + mac + "\"; this node only reads HMAC-SHA-256.");
        }
        return {
            version: version,
            copies: copies,
            headOffset: headOffset,
            kdf: kdf,
            mac: mac,
            totalBlocks: totalBlocks
        };
    }

    async function stegfsReadBlock(bytes, index, key, state, pathHash, root) {
        if (!Number.isInteger(index) || index <= 0 || index >= state.blocks) return null;
        var offset = index * STEGFS_BLOCK_SIZE;
        var raw = bytes.subarray(offset, offset + STEGFS_BLOCK_SIZE);
        if (!root && !equalBytes(raw.subarray(0, STEGFS_PATH_BYTES), pathHash)) return null;
        var ciphertext = raw.subarray(STEGFS_PATH_BYTES);
        var plain = aes256CbcDecrypt(ciphertext, key, state.iv);
        state.iv = ciphertext.subarray(ciphertext.length - 16);
        var blockData = plain.subarray(0, STEGFS_DATA_BYTES);
        var storedHash = plain.subarray(STEGFS_DATA_BYTES, STEGFS_DATA_BYTES + STEGFS_HASH_BYTES);
        if (!equalBytes(await sha256(blockData), storedHash)) return null;
        return {data: blockData, next: readU64BE(plain, STEGFS_DATA_BYTES + STEGFS_HASH_BYTES)};
    }

    async function stegfsTryCopy(bytes, config, key, macKey, pathHash, root, iv, inodeIndex, copyIndex) {
        var inodeState = {iv: iv, blocks: config.totalBlocks};
        var inode = await stegfsReadBlock(bytes, inodeIndex, key, inodeState, pathHash, root);
        if (!inode) return null;
        var sizeBig = inode.next;
        if (sizeBig > BigInt(bytes.length) || sizeBig > BigInt(MAX_OUTPUT)) return null;
        var size = Number(sizeBig);
        if (!Number.isSafeInteger(size)) return null;
        var inlineCapacity = STEGFS_DATA_BYTES - config.headOffset;
        var inline = Math.min(size, inlineCapacity);
        var blocks = Math.ceil((size - inline) / STEGFS_DATA_BYTES);
        if (blocks > config.totalBlocks) return null;
        var out = new Uint8Array(size);
        if (inline) out.set(inode.data.subarray(config.headOffset, config.headOffset + inline), 0);
        var address = readU64BE(inode.data, (copyIndex + 1) * 8);
        var dataState = {iv: iv, blocks: config.totalBlocks};
        var at = inline;
        var macParts = null;
        if (config.version === "202X.XX") {
            macParts = new Uint8Array(blocks * STEGFS_DATA_BYTES);
        }
        for (var j = 0; j < blocks; j++) {
            var blockIndex = stegfsNormalize(address, config.totalBlocks);
            if (!blockIndex) return null;
            var block = await stegfsReadBlock(bytes, blockIndex, key, dataState, pathHash, root);
            if (!block) return null;
            var take = Math.min(STEGFS_DATA_BYTES, size - at);
            out.set(block.data.subarray(0, take), at);
            if (macParts) macParts.set(block.data, j * STEGFS_DATA_BYTES);
            at += take;
            address = block.next;
        }
        if (config.version === "202X.XX") {
            var macOffset = (config.copies + 1) * 8;
            var storedMac = inode.data.subarray(macOffset, macOffset + 32);
            if (storedMac.length !== 32 || !equalBytes(await hmacSha256(macKey, macParts), storedMac)) return null;
        }
        return out;
    }

    async function stegfsExtract(input, pathArg, passwordArg) {
        var bytes = toBytes(input);
        var config = stegfsParseSuperblock(bytes);
        var file = stegfsSplitPath(pathArg);
        var password = passwordArg == null ? "" : String(passwordArg);
        var pathBytes = utf8Encode(file.path);
        var nameBytes = utf8Encode(file.name);
        var passBytes = utf8Encode(password);
        var pathHash = await sha256(pathBytes);
        var key;
        var macKey = null;
        if (config.version === "2015.08") {
            key = await sha256(concatBytes(pathBytes, nameBytes, passBytes));
        } else {
            var seed = await sha256(concatBytes(nameBytes, passBytes));
            key = await pbkdf2Sha256(seed, pathHash, config.kdf, 32);
            // HMAC-SHA-256 asks libgcrypt for a 64-byte key, not the AES size.
            macKey = await pbkdf2Sha256(seed, pathHash, config.kdf, 64);
        }
        var digest = await sha512(concatBytes(pathBytes, nameBytes));
        var root = file.path === "/";
        for (var copy = 0; copy < config.copies; copy++) {
            var inodeIndex = stegfsNormalize(readU64LE(digest, 0), config.totalBlocks);
            var ivHash = await sha256(concatBytes(passBytes, nameBytes, pathBytes, new Uint8Array([copy])));
            var found = await stegfsTryCopy(bytes, config, key, macKey, pathHash, root, ivHash.subarray(0, 16), inodeIndex, copy);
            if (found) return toByteArray(found);
            var first = digest[0];
            digest.copyWithin(0, 1);
            digest[digest.length - 1] = first;
        }
        fail("No readable StegFS file at " + (root ? "" : file.path + "/") + file.name +
            ". Check the path and password, and make sure the volume is not truncated.");
    }

    /* --------------------------------------------------------------- SNOW
     * SNOW 20130616 (Matthew Kwan, Apache-2.0) appends the message to lines as
     * trailing tabs and spaces. A tab on the first usable line marks the start;
     * after it each group of 0-7 spaces is three data bits, low bit first, and a
     * tab terminates the group. The optional -C layer is a fixed Huffman code
     * (snow-huffman.js), and -p runs the resulting bits through ICE in 1-bit
     * CFB mode. The format has no length, checksum or magic, so the settings
     * have to match the tool's command line; a wrong password cannot be
     * detected, only a wrong -C setting usually produces invalid Huffman codes.
     */
    var CF_SNOW_SMOD = [
        [333, 313, 505, 369],
        [379, 375, 319, 391],
        [361, 445, 451, 397],
        [397, 425, 395, 505]
    ];
    var CF_SNOW_SXOR = [
        [0x83, 0x85, 0x9b, 0xcd],
        [0xcc, 0xa7, 0xad, 0x41],
        [0x4b, 0x2e, 0xd4, 0x33],
        [0xea, 0xcb, 0x2e, 0x04]
    ];
    var CF_SNOW_PBOX = [
        0x00000001, 0x00000080, 0x00000400, 0x00002000,
        0x00080000, 0x00200000, 0x01000000, 0x40000000,
        0x00000008, 0x00000020, 0x00000100, 0x00004000,
        0x00010000, 0x00800000, 0x04000000, 0x20000000,
        0x00000004, 0x00000010, 0x00000200, 0x00008000,
        0x00020000, 0x00400000, 0x08000000, 0x10000000,
        0x00000002, 0x00000040, 0x00000800, 0x00001000,
        0x00040000, 0x00100000, 0x02000000, 0x80000000
    ];
    var CF_SNOW_KEYROT = [0, 1, 2, 3, 2, 1, 3, 0, 1, 3, 2, 0, 3, 1, 0, 2];
    var CF_SNOW_SBOXES = null;

    function snowGfMult(a, b, m) {
        var result = 0;
        while (b) {
            if (b & 1) result ^= a;
            a <<= 1;
            b >>= 1;
            if (a >= 256) a ^= m;
        }
        return result >>> 0;
    }

    function snowGfExp7(b, m) {
        if (b === 0) return 0;
        var x = snowGfMult(b, b, m);
        x = snowGfMult(b, x, m);
        x = snowGfMult(x, x, m);
        return snowGfMult(b, x, m);
    }

    function snowPerm32(value) {
        var result = 0;
        value = value >>> 0;
        for (var i = 0; i < 32; i++) {
            if (value & 1) result = (result | CF_SNOW_PBOX[i]) >>> 0;
            value >>>= 1;
        }
        return result >>> 0;
    }

    function snowIceSboxes() {
        if (CF_SNOW_SBOXES) return CF_SNOW_SBOXES;
        var boxes = [new Uint32Array(1024), new Uint32Array(1024), new Uint32Array(1024), new Uint32Array(1024)];
        for (var i = 0; i < 1024; i++) {
            var col = (i >>> 1) & 0xff;
            var row = (i & 1) | ((i & 0x200) >>> 8);
            boxes[0][i] = snowPerm32((snowGfExp7(col ^ CF_SNOW_SXOR[0][row], CF_SNOW_SMOD[0][row]) << 24) >>> 0);
            boxes[1][i] = snowPerm32((snowGfExp7(col ^ CF_SNOW_SXOR[1][row], CF_SNOW_SMOD[1][row]) << 16) >>> 0);
            boxes[2][i] = snowPerm32((snowGfExp7(col ^ CF_SNOW_SXOR[2][row], CF_SNOW_SMOD[2][row]) << 8) >>> 0);
            boxes[3][i] = snowPerm32(snowGfExp7(col ^ CF_SNOW_SXOR[3][row], CF_SNOW_SMOD[3][row]));
        }
        CF_SNOW_SBOXES = boxes;
        return boxes;
    }

    function snowIceSchedBuild(keys, kb, n, rotation) {
        for (var i = 0; i < 8; i++) {
            var subkey = keys[n + i];
            var kr = rotation[i];
            for (var j = 0; j < 15; j++) {
                var word = subkey[j % 3];
                for (var k = 0; k < 4; k++) {
                    var index = (kr + k) & 3;
                    var bit = kb[index] & 1;
                    word = ((word << 1) | bit) >>> 0;
                    kb[index] = ((kb[index] >>> 1) | ((bit ^ 1) << 15)) & 0xffff;
                }
                subkey[j % 3] = word;
            }
        }
    }

    function snowIceKey(password) {
        var pass = utf8Encode(password == null ? "" : String(password));
        var level = Math.ceil(pass.length * 7 / 64);
        if (level < 1) level = 1;
        if (level > 128) level = 128;
        var material = new Uint8Array(1024);
        var i = 0;
        for (var p = 0; p < pass.length; p++) {
            var c = pass[p] & 0x7f;
            var index = (i / 8) | 0;
            var bit = i & 7;
            if (bit === 0) {
                material[index] = (c << 1) & 0xff;
            } else if (bit === 1) {
                material[index] |= c;
            } else {
                material[index] |= c >>> (bit - 1);
                if (index + 1 < material.length) material[index + 1] = (c << (9 - bit)) & 0xff;
            }
            i += 7;
            if (i > 8184) break;
        }

        var rounds = level * 16;
        var keys = new Array(rounds);
        for (var n = 0; n < rounds; n++) keys[n] = [0, 0, 0];
        for (var block = 0; block < level; block++) {
            var kb = [0, 0, 0, 0];
            for (var j = 0; j < 4; j++) {
                kb[3 - j] = (material[block * 8 + j * 2] << 8) | material[block * 8 + j * 2 + 1];
            }
            snowIceSchedBuild(keys, kb, block * 8, CF_SNOW_KEYROT);
            snowIceSchedBuild(keys, kb, rounds - 8 - block * 8, CF_SNOW_KEYROT.slice(8));
        }
        return {rounds: rounds, keys: keys, material: material};
    }

    function snowIceF(p, subkey) {
        var tl = ((p >>> 16) & 0x3ff) | (((p >>> 14) | (p << 18)) & 0xffc00);
        var tr = (p & 0x3ff) | ((p << 2) & 0xffc00);
        var al = (subkey[2] & (tl ^ tr)) >>> 0;
        var ar = (al ^ tr) >>> 0;
        al = (al ^ tl ^ subkey[0]) >>> 0;
        ar = (ar ^ subkey[1]) >>> 0;
        var boxes = snowIceSboxes();
        return (boxes[0][al >>> 10] | boxes[1][al & 0x3ff] | boxes[2][ar >>> 10] | boxes[3][ar & 0x3ff]) >>> 0;
    }

    function snowIceEncryptBlock(key, block) {
        var l = readBE32(block, 0);
        var r = readBE32(block, 4);
        for (var i = 0; i < key.rounds; i += 2) {
            l = (l ^ snowIceF(r, key.keys[i])) >>> 0;
            r = (r ^ snowIceF(l, key.keys[i + 1])) >>> 0;
        }
        var out = new Uint8Array(8);
        for (var n = 0; n < 4; n++) {
            out[3 - n] = r & 0xff;
            out[7 - n] = l & 0xff;
            r >>>= 8;
            l >>>= 8;
        }
        return out;
    }

    function snowDecryptor(password) {
        var text = password == null ? "" : String(password);
        if (!text) return function (bit) { return bit; };
        var key = snowIceKey(text);
        var iv = snowIceEncryptBlock(key, key.material.subarray(0, 8));
        return function (bit) {
            var stream = snowIceEncryptBlock(key, iv);
            var plain = (stream[0] & 0x80) ? (bit ^ 1) : bit;
            for (var i = 0; i < 7; i++) {
                iv[i] = ((iv[i] << 1) | ((iv[i + 1] & 0x80) ? 1 : 0)) & 0xff;
            }
            iv[7] = ((iv[7] << 1) | bit) & 0xff;
            return plain;
        };
    }

    var CF_SNOW_HUFFMAP = (function () {
        var map = Object.create(null);
        for (var i = 0; i < 256; i++) map[CF_SNOW_HUFFCODE[i]] = i;
        return map;
    })();

    function snowExtract(input, password, compressed) {
        var text = typeof input === "string" ? input : utf8Decode(toBytes(input));
        var lines = text.split(/\r\n|\n|\r/);
        var decrypt = snowDecryptor(password);
        var output = [];
        var outputValue = 0;
        var outputBits = 0;
        var huffmanCode = "";

        function emitByte(byte) {
            for (var i = 0; i < 8; i++) outputBit((byte >>> (7 - i)) & 1);
        }

        function outputBit(bit) {
            outputValue = (outputValue << 1) | bit;
            if (++outputBits === 8) {
                if (output.length >= MAX_OUTPUT) fail("The SNOW payload is larger than this page will decode.");
                output.push(outputValue);
                outputValue = 0;
                outputBits = 0;
            }
        }

        function plainBit(bit) {
            if (!compressed) return outputBit(bit);
            huffmanCode += bit ? "1" : "0";
            if (CF_SNOW_HUFFMAP[huffmanCode] !== undefined) {
                emitByte(CF_SNOW_HUFFMAP[huffmanCode]);
                huffmanCode = "";
            } else if (huffmanCode.length >= 21) {
                fail("The SNOW data does not match its Huffman codes. Check the Compressed (-C) setting and the password.");
            }
        }

        function cipherBit(bit) {
            plainBit(decrypt(bit));
        }

        function emitGroup(spaces) {
            if (spaces > 7) {
                fail("Invalid SNOW whitespace: a group of " + spaces + " spaces (the format allows at most 7).");
            }
            cipherBit(spaces & 1);
            cipherBit((spaces >>> 1) & 1);
            cipherBit((spaces >>> 2) & 1);
        }

        var started = false;
        for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            var line = lines[lineIndex];
            var end = line.length;
            while (end > 0) {
                var code = line.charCodeAt(end - 1);
                if (code !== 32 && code !== 9) break;
                end--;
            }
            if (end === line.length) continue;
            var run = line.slice(end);
            if (!started) {
                if (run.charAt(0) === " ") continue;
                started = true;
                run = run.slice(1);
                if (!run.length) continue;
            }
            var spaces = 0;
            for (var i = 0; i < run.length; i++) {
                if (run.charAt(i) === " ") {
                    spaces++;
                } else {
                    emitGroup(spaces);
                    spaces = 0;
                }
            }
            if (spaces > 0) emitGroup(spaces);
        }

        if (!started) {
            fail("No SNOW start tab found. Keep the carrier's trailing tabs and spaces intact; this operation reads SNOW's text output, not the cover text alone.");
        }
        return utf8Decode(Uint8Array.from(output));
    }

    /* --------------------------------------------------------------- WavSteg
     * stego-lsb 1.7.4's WavSteg hides payload bytes in the least-significant
     * bits of the interleaved PCM samples. Its bit reader walks each sample's
     * raw little-endian bytes, takes the last n bits of the group (the low bits
     * of the most-significant byte, not of the sample integer), and packs them
     * most-significant bit first; Python's wave module means RIFF/WAVE integer
     * PCM only (8/16/24/32-bit samples, mono or multichannel). There is no
     * header, magic or length, so the -n and -b settings used to hide have to
     * be given to recovery. The default -n is 2; a -b of 0 here means the
     * carrier's whole LSB capacity, which is useful only as a scan.
     */
    function wavFourCC(bytes, offset) {
        return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    }

    function wavStegParse(input) {
        var bytes = toBytes(input);
        if (bytes.length < 12 || wavFourCC(bytes, 0) !== "RIFF" || wavFourCC(bytes, 8) !== "WAVE") {
            fail("WavSteg needs a RIFF/WAVE file. Attach the WAV carrier written by stego-lsb, not a converted or re-exported copy.");
        }

        var format = null;
        var dataOffset = -1;
        var dataSize = 0;
        var at = 12;
        while (at + 8 <= bytes.length) {
            var id = wavFourCC(bytes, at);
            var size = readLE32(bytes, at + 4);
            var start = at + 8;
            if (start + size > bytes.length) {
                fail("The WAV file is truncated inside its \"" + id + "\" chunk.");
            }
            if (id === "fmt " && !format) {
                if (size < 16) fail("The WAV fmt chunk is too short to describe its samples.");
                var audioFormat = readLE16(bytes, start);
                var channels = readLE16(bytes, start + 2);
                var sampleRate = readLE32(bytes, start + 4);
                var blockAlign = readLE16(bytes, start + 12);
                var bitsPerSample = readLE16(bytes, start + 14);
                if (audioFormat === 0xfffe) {
                    if (size < 40 || readLE16(bytes, start + 16) < 22) {
                        fail("The WAV extensible format chunk is too short.");
                    }
                    var pcmGuid = [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00,
                        0x80, 0x00, 0x00, 0xaa, 0x00, 0x38, 0x9b, 0x71];
                    for (var g = 0; g < pcmGuid.length; g++) {
                        if (bytes[start + 24 + g] !== pcmGuid[g]) {
                            fail("This WAV uses an extensible sub-format other than integer PCM. WavSteg reads PCM samples only.");
                        }
                    }
                    audioFormat = 1;
                }
                if (audioFormat !== 1) {
                    fail("This WAV uses audio format 0x" + audioFormat.toString(16) + ". WavSteg reads integer PCM samples only (not float, A-law, mu-law or ADPCM).");
                }
                if (bitsPerSample !== 8 && bitsPerSample !== 16 && bitsPerSample !== 24 && bitsPerSample !== 32) {
                    fail("WavSteg supports 8, 16, 24 or 32 bits per sample; this WAV uses " + bitsPerSample + ".");
                }
                if (!channels || blockAlign !== channels * (bitsPerSample / 8)) {
                    fail("The WAV's channel count and block alignment do not agree with its sample width.");
                }
                format = {
                    channels: channels,
                    sampleRate: sampleRate,
                    bitsPerSample: bitsPerSample,
                    sampleBytes: bitsPerSample / 8,
                    blockAlign: blockAlign
                };
            } else if (id === "data" && dataOffset < 0) {
                dataOffset = start;
                dataSize = size;
            }
            at = start + size + (size & 1);
        }

        if (!format) fail("The WAV has no fmt chunk.");
        if (dataOffset < 0) fail("The WAV has no data chunk.");
        var frames = Math.floor(dataSize / format.blockAlign);
        if (!frames) fail("The WAV data chunk contains no complete sample frames.");
        return {
            bytes: bytes,
            dataOffset: dataOffset,
            dataSize: dataSize,
            sampleBytes: format.sampleBytes,
            sampleCount: frames * format.channels,
            channels: format.channels,
            sampleRate: format.sampleRate,
            bitsPerSample: format.bitsPerSample
        };
    }

    function wavStegFromWav(input, lsbArg, byteCountArg) {
        var wav = wavStegParse(input);
        var lsb = Number(lsbArg);
        if (!isFinite(lsb) || Math.floor(lsb) !== lsb || lsb < 1 || lsb > 8) {
            fail("Choose 1 to 8 LSBs per sample.");
        }
        var capacity = Math.floor(wav.sampleCount * lsb / 8);
        var count = byteCountArg == null ? 0 : Number(byteCountArg);
        if (!isFinite(count) || count < 0) fail("Bytes to recover must be zero or a positive whole number.");
        count = Math.floor(count);
        if (count === 0) count = capacity;
        if (!count) fail("This WAV has no complete sample frames to read.");
        if (count > capacity) {
            fail("This WAV carries at most " + capacity + " bytes at " + lsb +
                " LSBs per sample; the request was " + count + ".");
        }
        if (count > MAX_OUTPUT) fail("The requested WavSteg output is larger than this page will decode.");

        var out = new Uint8Array(count);
        var outAt = 0;
        var bitBuffer = 0;
        var bitCount = 0;
        for (var i = 0; i < wav.sampleCount && outAt < count; i++) {
            // WavSteg slices the last n bits off the raw little-endian sample
            // group, so for 16/24/32-bit audio this is the most-significant
            // byte's low bits, not the sample integer's least-significant bits.
            var low = wav.bytes[wav.dataOffset + (i + 1) * wav.sampleBytes - 1];
            for (var b = lsb - 1; b >= 0; b--) {
                bitBuffer = (bitBuffer << 1) | ((low >>> b) & 1);
                if (++bitCount === 8) {
                    out[outAt++] = bitBuffer;
                    bitBuffer = 0;
                    bitCount = 0;
                    if (outAt === count) break;
                }
            }
        }
        if (outAt !== count) {
            fail("The WAV data ended before the requested byte count could be read.");
        }
        return toByteArray(out);
    }

    async function openStegoExtract(input, plugin, password) {
        var image = await decodeImage(toBytes(input));
        var result = await openStegoFromRgba(image.data, image.width, image.height, password, plugin);
        return toByteArray(result.data);
    }

    function jphideExtract(input, passphrase) {
        return toByteArray(jphideFromJpeg(input, passphrase));
    }

    function jstegExtract(input) {
        return toByteArray(jstegFromJpeg(input));
    }

    function f5Extract(input, password) {
        return toByteArray(f5FromJpeg(input, password));
    }

    function wavstegExtract(input, lsb, byteCount) {
        return wavStegFromWav(input, lsb, byteCount);
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
        jstegFromJpeg: jstegFromJpeg,
        jstegBitReader: jstegBitReader,
        f5Sha1: f5Sha1,
        f5Random: f5Random,
        f5Permutation: f5Permutation,
        f5Coefficients: f5Coefficients,
        f5FromCoefficients: f5FromCoefficients,
        f5FromJpeg: f5FromJpeg,
        snowExtract: snowExtract,
        wavStegParse: wavStegParse,
        wavStegFromWav: wavStegFromWav,
        snowIceKey: snowIceKey,
        snowIceEncryptBlock: snowIceEncryptBlock,
        lzo1xDecompress: lzo1xDecompress,
        bfExpandKey: bfExpandKey,
        bfEncryptBytes: bfEncryptBytes,
        bfDecryptBytes: bfDecryptBytes,
        bfDecryptNativeLE: bfDecryptNativeLE,
        extractOpenStego: openStegoExtract,
        extractJphide: jphideExtract,
        extractJsteg: jstegExtract,
        extractF5: f5Extract,
        extractWavSteg: wavstegExtract,
        extractSnow: snowExtract,
        extractStegoShare: stegoshareExtract,
        extractStegFS: stegfsExtract,
        outguessFromJpeg: outguessFromJpeg,
        aes256CbcDecrypt: aes256CbcDecrypt,
        aesExpandKey: aesExpandKey,
        aesDecryptBlock: aesDecryptBlock,
        stegoshareKey: stegoshareKey,
        stegoshareReadImage: stegoshareReadImage,
        stegoshareAssemble: stegoshareAssemble
    };
})();
