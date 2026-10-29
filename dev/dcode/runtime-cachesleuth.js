/* CacheSleuth cipher helpers ---------------------------------------------------
 * Recreated from the published descriptions and worked examples on
 * cachesleuth.com (the site's code is not embedded or fetched). These helpers
 * are concatenated into the same worker module as the dCode runtime, so they
 * can use cfMod, cfLettersOnly, cfKeyedAlphabet, cfMorse and the other shared
 * helpers.
 *
 * Conventions, matching the CacheSleuth tools where they differ from dCode:
 *   - most substitution tools fold letters to upper case;
 *   - transposition tools keep the whole text, including spaces and punctuation;
 *   - every tool is deterministic. Where CacheSleuth offers random choices
 *     (homophonic tokens, key-pair shuffles) this recreation takes the first
 *     value so a graph re-run is stable.
 */

/* ------------------------------------------------------------ shared helpers */
function csAlpha(value, fallback) {
    const alpha = String(value == null || value === "" ? (fallback || CF_ALPHABET) : value).toUpperCase();
    if (!/^[A-Z]+$/.test(alpha) || alpha.length < 2) {
        throw new Error("The alphabet needs at least two different letters.");
    }
    if (new Set(alpha).size !== alpha.length) throw new Error("The alphabet has a repeated letter.");
    return alpha;
}

function csSubstituteLetters(text, from, to) {
    return String(text).split("").map(ch => {
        const up = ch.toUpperCase();
        const idx = from.indexOf(up);
        if (idx < 0 || idx >= to.length) return ch;
        return cfApplyCase(ch, to[idx]);
    }).join("");
}

/* ------------------------------------------------------------ Albam
 * Both cases are mapped, because the CacheSleuth tool keeps the source case.
 * The map is reciprocal: A<->L, B<->M, ... Z<->K.
 */
var CS_ALBAM_FROM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
var CS_ALBAM_TO = "LMNOPQRSTUVWXYZABCDEFGHIJKlmnopqrstuvwxyzabcdefghijk";
function albamRun(text) {
    return String(text).split("").map(ch => {
        const idx = CS_ALBAM_FROM.indexOf(ch);
        return idx < 0 ? ch : CS_ALBAM_TO[idx];
    }).join("");
}

/* ------------------------------------------------------------ Carbonaro
 * CacheSleuth's Carbonaro alphabet is an involution, so encoding and decoding
 * are the same substitution.
 */
var CS_CARBONARO = "OPGTIVCHEJKRNMABQLZDUFWXYS";
function carbonaroRun(text) {
    return csSubstituteLetters(text, CF_ALPHABET, CS_CARBONARO);
}

/* ------------------------------------------------------------ Kamasutra
 * Thirteen reciprocal pairs. The default is the classic Atbash pairing used by
 * the CacheSleuth example: AZ BY CX ... MN. A custom pair list is accepted as
 * 13 two-letter groups (spaces, commas or newlines between them).
 */
var CS_KAMASUTRA_PAIRS = "AZ BY CX DW EV FU GT HS IR JQ KP LO MN";
function csKamasutraTable(value) {
    let tokens = String(value == null || value === "" ? CS_KAMASUTRA_PAIRS : value)
        .toUpperCase().split(/[^A-Z]+/).filter(Boolean);
    if (tokens.length === 1 && tokens[0].length === 26) tokens = cfChunks(tokens[0], 2);
    if (tokens.length !== 13 || tokens.some(token => token.length !== 2)) {
        throw new Error("Kamasutra needs 13 letter pairs, for example AZ BY CX DW EV FU GT HS IR JQ KP LO MN.");
    }
    const all = tokens.join("");
    if (new Set(all).size !== 26) throw new Error("Every letter must appear exactly once in the Kamasutra pairs.");
    return tokens.join("").split("");
}
function kamasutraRun(text, pairs) {
    const table = csKamasutraTable(pairs);
    return String(text).split("").map(ch => {
        const up = ch.toUpperCase();
        const idx = table.indexOf(up);
        if (idx < 0) return ch;
        return cfApplyCase(ch, table[idx % 2 === 0 ? idx + 1 : idx - 1]);
    }).join("");
}

/* ------------------------------------------------------------ Pizzini
 * A = 4, B = 5, ... Z = 29, written with no separator. The decoder follows the
 * CacheSleuth reader: a leading 1 or 2 consumes the next digit before the
 * table lookup, which is what makes the concatenated numbers unambiguous.
 */
var CS_PIZZINI = ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29"];
/* Decoding looks only at the final digit: 10-19 are reached with a 1 prefix and
 * 20-29 with a 2 prefix, so A-I and J-S and T-Z each repeat 4-9,0-9. */
var CS_PIZZINI_DIGITS = CS_PIZZINI.map(value => value[value.length - 1]);
function pizziniRun(text, decode) {
    if (!decode) {
        let out = "";
        for (const ch of String(text).toUpperCase()) {
            const idx = CF_ALPHABET.indexOf(ch);
            out += idx < 0 ? ch : CS_PIZZINI[idx];
        }
        return out;
    }
    const source = String(text) + "*";
    let out = "";
    for (let i = 0; i < source.length - 1; i++) {
        let ch = source[i];
        let start = 0;
        if (ch === "1") {
            start = 6;
            ch = source[++i];
        } else if (ch === "2") {
            start = 16;
            ch = source[++i];
        }
        if (ch === undefined) break;
        let found = false;
        for (let x = start; x < 26; x++) {
            if (ch === CS_PIZZINI_DIGITS[x]) {
                out += CF_ALPHABET[x];
                found = true;
                break;
            }
        }
        if (!found) out += ch;
    }
    return out;
}

/* ------------------------------------------------------------ Keyed Caesar
 * The keyword moves its letters to the front of the alphabet, then the whole
 * alphabet is rotated right by the shift before substitution.
 */
function keyedCaesarRun(text, shift, keyword, alphabet, decode) {
    const alpha = csAlpha(alphabet, CF_ALPHABET);
    const keyed = cfKeyedAlphabet(keyword, alpha, null);
    const size = keyed.length;
    const amount = cfMod(Math.round(cfNumber(shift, 13)), size);
    const rotated = keyed.slice(amount) + keyed.slice(0, amount);
    return csSubstituteLetters(text, decode ? rotated : alpha, decode ? alpha : rotated);
}

/* ------------------------------------------------------------ Additive / Caesar
 * The CacheSleuth additive tool assigns A = 0 and shifts modulo the alphabet.
 * Non-letters are copied through; the tool upper-cases the letter output.
 */
function additiveRun(text, key, alphabet, decode) {
    const alpha = csAlpha(alphabet, CF_ALPHABET);
    const amount = Math.round(cfNumber(key, 0));
    let out = "";
    for (const ch of String(text).toUpperCase()) {
        const idx = alpha.indexOf(ch);
        out += idx < 0 ? ch : alpha[cfMod(idx + (decode ? -amount : amount), alpha.length)];
    }
    return out;
}

/* ------------------------------------------------------------ Running Key
 * Vigenere with a passage instead of a repeating word. CacheSleuth requires the
 * passage to cover every letter, so a short key is rejected rather than cycled.
 */
function runningKeyRun(text, key, alphabet, decode) {
    const alpha = csAlpha(alphabet, CF_ALPHABET);
    const keyLetters = String(key == null ? "" : key).toUpperCase().split("").filter(ch => alpha.includes(ch));
    const needed = cfLetterCount(text);
    if (!keyLetters.length) throw new Error("Provide a running key made of letters.");
    if (keyLetters.length < needed) {
        throw new Error(`A running key must cover every letter (${needed} needed, ${keyLetters.length} given).`);
    }
    let pos = 0;
    return cfMapLetters(text, p => {
        const shift = alpha.indexOf(keyLetters[pos++]);
        const letter = alpha[cfMod(p + (decode ? -shift : shift), alpha.length)];
        return letter;
    });
}

/* ------------------------------------------------------------ Keyboard
 * QWERTY/QWERTZ/AZERTY key rows mapped onto A-Z. The tool lower-cases output.
 */
var CS_KEYBOARDS = {
    QWERTY: "qwertyuiopasdfghjklzxcvbnm",
    QWERTZ: "qwertzuiopasdfghjklyxcvbnm",
    AZERTY: "azertyuiopqsdfghjklwxcvbnm"
};
function keyboardRun(text, layout, decode) {
    const name = cfOption(layout, Object.keys(CS_KEYBOARDS), "QWERTY");
    const map = CS_KEYBOARDS[name];
    const plain = CF_ALPHABET.toLowerCase();
    const from = decode ? map : plain;
    const to = decode ? plain : map;
    let out = "";
    for (const ch of String(text)) {
        const lower = ch.toLowerCase();
        const idx = from.indexOf(lower);
        out += idx < 0 ? ch : to[idx];
    }
    return out;
}

/* ------------------------------------------------------------ Scream
 * xkcd #3054: every letter is an A carrying a different diacritic. CacheSleuth
 * normalises to NFC on the way out and accepts NFD or precomposed marks on the
 * way back.
 */
var CS_SCREAM_MARKS = {
    B: "\u0307", C: "\u0327", D: "\u0331", E: "\u0301", F: "\u032E",
    G: "\u030B", H: "\u0330", I: "\u0309", J: "\u0313", K: "\u0323",
    L: "\u0306", M: "\u030C", N: "\u0302", O: "\u030A", P: "\u032F",
    Q: "\u0324", R: "\u0311", S: "\u0303", T: "\u0304", U: "\u0308",
    V: "\u0300", W: "\u030F", X: "\u033D", Y: "\u0326"
};
var CS_SCREAM_REVERSE = {};
for (const letter of Object.keys(CS_SCREAM_MARKS)) CS_SCREAM_REVERSE[CS_SCREAM_MARKS[letter]] = letter;
function screamRun(text, decode) {
    if (!decode) {
        let out = "";
        for (const ch of String(text)) {
            const up = ch.toUpperCase();
            if (up === "A") out += "A";
            else if (up === "Z") out += "\u023A";
            else if (CS_SCREAM_MARKS[up]) out += ("A" + CS_SCREAM_MARKS[up]).normalize("NFC");
            else out += ch;
        }
        return out;
    }
    const chars = Array.from(String(text).normalize("NFD"));
    let out = "";
    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (ch === "\u023A" || ch === "\u2C65") {
            out += ch === "\u2C65" ? "z" : "Z";
            continue;
        }
        if (ch !== "A" && ch !== "a") {
            out += ch;
            continue;
        }
        let marks = "";
        while (i + 1 < chars.length && /\p{M}/u.test(chars[i + 1])) marks += chars[++i];
        const letter = marks === "" ? "A" : CS_SCREAM_REVERSE[marks];
        if (letter === undefined) out += ch + marks;
        else out += ch === "a" ? letter.toLowerCase() : letter;
    }
    return out;
}

/* ------------------------------------------------------------ Digraph numbers
 * A number names a letter pair in an alphabet-by-alphabet grid. CacheSleuth
 * defaults to AA=1 through ZZ=676, row first; 0-based and column-first modes are
 * also supported. Dashes join pairs into a word, pipes separate words.
 */
function digraphNumberRun(text, alphabet, numbering, order, decode) {
    const alpha = csAlpha(alphabet, CF_ALPHABET);
    const oneBased = cfOption(numbering, ["AA = 1", "AA = 0"], "AA = 1") === "AA = 1";
    const colFirst = cfOption(order, ["Row first", "Column first"], "Row first") === "Column first";
    const size = alpha.length;
    const offset = oneBased ? 1 : 0;
    if (decode) {
        return String(text).split(/\r?\n/).map(line =>
            line.split(/[|/]/).map(segment => {
                const numbers = segment.match(/\d+/g) || [];
                if (!numbers.length) return "";
                const chars = numbers.map(raw => {
                    const value = Number(raw) - offset;
                    if (value < 0 || value >= size * size) return "??";
                    const a = colFirst ? value % size : Math.floor(value / size);
                    const b = colFirst ? Math.floor(value / size) : value % size;
                    return alpha[a] + alpha[b];
                });
                return chars.join("");
            }).filter(Boolean).join(" ")
        ).join("\n");
    }
    const pad = alpha.includes("X") ? "X" : alpha[alpha.length - 1];
    return String(text).toUpperCase().split(/\r?\n/).map(line =>
        line.split(/\s+/).filter(Boolean).map(word => {
            let clean = word.split("").filter(ch => alpha.includes(ch)).join("");
            if (!clean) return "";
            if (clean.length % 2) clean += pad;
            const numbers = [];
            for (let i = 0; i < clean.length; i += 2) {
                const a = alpha.indexOf(clean[i]);
                const b = alpha.indexOf(clean[i + 1]);
                numbers.push(String((colFirst ? b * size + a : a * size + b) + offset));
            }
            return numbers.join("-");
        }).filter(Boolean).join(" | ")
    ).join("\n");
}

/* ------------------------------------------------------------ Double transposition
 * Repeated columnar transposition with irregular columns (the text is dealt out
 * a character at a time, so the final column can be short). Text is kept verbatim.
 */
function csColumnOrder(key) {
    return cfKeyOrder(cfLettersOnly(key));
}
function csColumnarEncode(text, key) {
    const order = csColumnOrder(key);
    if (!order.length) throw new Error("A transposition key is required.");
    const columns = new Array(order.length).fill("");
    for (let i = 0; i < text.length; i++) columns[i % order.length] += text[i];
    return order.map(col => columns[col]).join("");
}
function csColumnarDecode(text, key) {
    const order = csColumnOrder(key);
    if (!order.length) throw new Error("A transposition key is required.");
    const columns = new Array(order.length).fill("");
    const base = Math.floor(text.length / order.length);
    const extra = text.length % order.length;
    let at = 0;
    for (let i = 0; i < order.length; i++) {
        const col = order[i];
        const length = base + (col < extra ? 1 : 0);
        columns[col] = text.slice(at, at + length);
        at += length;
    }
    let out = "";
    for (let i = 0; i < text.length; i++) {
        const col = i % order.length;
        out += columns[col][Math.floor(i / order.length)] || "";
    }
    return out;
}
function doubleTranspositionRun(text, key1, key2, decode) {
    const first = cfLettersOnly(key1);
    if (first.length < 2) throw new Error("Keyword #1 should be at least two letters long.");
    const second = cfLettersOnly(key2) || first;
    if (decode) return csColumnarDecode(csColumnarDecode(text, second), first);
    return csColumnarEncode(csColumnarEncode(text, first), second);
}

/* ------------------------------------------------------------ Rotation grid
 * Write the text into rows of `columns`, rotate the grid, read it back out.
 * CacheSleuth re-inserts newlines at their original positions; this recreation
 * does the same on encode and accepts a newline-free ciphertext on decode.
 */
function rotationGridEncode(text, direction, columns, pad) {
    const source = String(text);
    const cols = Math.max(1, Math.floor(cfNumber(columns, 8)));
    let clean = source.replace(/[\r\n]/g, "");
    const fill = cfChar(pad, "X");
    while (clean.length % cols) clean += fill;
    const columnsOut = new Array(cols).fill("");
    for (let i = 0; i < clean.length; i++) columnsOut[i % cols] += clean[i];
    let rotated = "";
    if (Number(direction) > 0) {
        for (let i = cols - 1; i >= 0; i--) rotated += columnsOut[i];
    } else {
        for (let i = 0; i < cols; i++) rotated += columnsOut[i].split("").reverse().join("");
    }
    let out = "";
    let at = 0;
    for (const ch of source) {
        if (ch === "\n" || ch === "\r") out += ch;
        else out += rotated[at++] || "";
    }
    while (at < rotated.length) out += rotated[at++];
    return out;
}
function rotationGridDecode(text, direction, columns) {
    const clean = String(text).replace(/[\r\n]/g, "");
    const cols = Math.max(1, Math.floor(cfNumber(columns, 8)));
    if (!clean.length) return "";
    if (clean.length % cols) throw new Error("The ciphertext length is not a whole number of columns.");
    const rows = clean.length / cols;
    const chunks = cfChunks(clean, rows);
    const columnsOut = new Array(cols).fill("");
    if (Number(direction) > 0) {
        for (let i = 0; i < cols; i++) columnsOut[i] = chunks[cols - 1 - i];
    } else {
        for (let i = 0; i < cols; i++) columnsOut[i] = chunks[i].split("").reverse().join("");
    }
    let out = "";
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) out += columnsOut[col][row] || "";
    }
    return out;
}
function csRotationDirection(value) {
    return String(value).toLowerCase().startsWith("right") ? 1 : -1;
}
function rotationGridRun(text, direction, columns, pad, decode) {
    return decode ? rotationGridDecode(text, direction, columns) : rotationGridEncode(text, direction, columns, pad);
}

/* ------------------------------------------------------------ Burrows-Wheeler
 * Append the EOF marker, sort every rotation, and write the last column. The
 * decoder rebuilds the rotation table and finds the row ending in the marker,
 * exactly as CacheSleuth does.
 */
function burrowsWheelerRun(text, eof, decode) {
    const marker = cfChar(eof, "$");
    if (decode) {
        const source = String(text);
        let seen = 0;
        for (const ch of source) if (ch === marker) seen++;
        if (seen !== 1) throw new Error("The ciphertext must contain the EOF character exactly once.");
        let rows = new Array(source.length).fill("");
        for (let i = 0; i < source.length; i++) {
            for (let j = 0; j < source.length; j++) rows[j] = source[j] + rows[j];
            rows.sort();
        }
        const row = rows.find(value => value.endsWith(marker));
        if (!row) throw new Error("The EOF character was not found in the transform.");
        return row.slice(0, -1);
    }
    const source = String(text);
    if (source.includes(marker)) throw new Error("The EOF character must not appear in the source text.");
    const data = source + marker;
    const rows = [];
    for (let i = 0; i < data.length; i++) rows.push(data.slice(i) + data.slice(0, i));
    rows.sort();
    return rows.map(row => row[row.length - 1]).join("");
}

/* ------------------------------------------------------------ Morbit
 * Morse is written with x as the letter separator (xx between words), then each
 * pair of symbols is replaced by the digit at that position in the key's rank.
 */
var CS_MORBIT_PAIRS = ["..", ".-", ".x", "-.", "--", "-x", "x.", "x-", "xx"];
function csMorbitKey(value) {
    const raw = String(value == null ? "" : value).trim();
    const digits = raw.replace(/\s+/g, "");
    if (/^[1-9]{9}$/.test(digits) && new Set(digits).size === 9) return digits;
    const letters = raw.toUpperCase().replace(/[^A-Z]/g, "");
    if (letters.length !== 9) throw new Error("The Morbit key must be exactly nine letters, or the digits 1-9 once each.");
    const ranked = letters.split("").map((letter, index) => ({letter, index}))
        .sort((a, b) => (a.letter === b.letter ? a.index - b.index : a.letter < b.letter ? -1 : 1));
    const permutation = new Array(9);
    ranked.forEach((entry, index) => { permutation[entry.index] = String(index + 1); });
    return permutation.join("");
}
function morbitRun(text, key, decode) {
    const permutation = csMorbitKey(key);
    const toDigit = {};
    const toPair = {};
    for (let i = 0; i < 9; i++) {
        toDigit[CS_MORBIT_PAIRS[i]] = permutation[i];
        toPair[permutation[i]] = CS_MORBIT_PAIRS[i];
    }
    if (decode) {
        const digits = String(text).replace(/[^1-9]/g, "");
        if (!digits) return "";
        let stream = "";
        for (const digit of digits) stream += toPair[digit] || "";
        const words = [];
        for (const word of stream.split("xx")) {
            if (!word) continue;
            const letters = [];
            for (const code of word.split("x")) {
                if (!code) continue;
                letters.push(CF_MORSE_REVERSE[code] || "?");
            }
            if (letters.length) words.push(letters.join(""));
        }
        return words.join(" ");
    }
    const parts = [];
    for (const word of String(text).toUpperCase().split(/\s+/)) {
        if (!word) continue;
        let codes = [];
        for (const ch of word) if (CF_MORSE[ch]) codes.push(CF_MORSE[ch]);
        if (codes.length) parts.push(codes.join("x") + "x");
    }
    let stream = parts.join("x");
    if (stream.length % 2) stream += "x";
    let out = "";
    for (let i = 0; i < stream.length; i += 2) out += toDigit[stream.slice(i, i + 2)] || "";
    return out.replace(/(.{5})/g, "$1 ").trim();
}
var CF_MORSE_REVERSE = (() => {
    const reverse = {};
    for (const [ch, code] of Object.entries(CF_MORSE)) reverse[code] = ch;
    return reverse;
})();

/* ------------------------------------------------------------ Nihilist
 * Additive keyword and message letters are Polybius coordinates written as a
 * two-digit number; the two numbers are added for the ciphertext.
 */
function csNihilistSquare(keyword, size) {
    const alphabet = size === 6 ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" : "ABCDEFGHIKLMNOPQRSTUVWXYZ";
    let keywordText = String(keyword == null ? "" : keyword).toUpperCase();
    keywordText = size === 6
        ? keywordText.replace(/[^A-Z0-9]/g, "")
        : keywordText.replace(/J/g, "I").replace(/[^A-Z]/g, "");
    const letters = cfKeyedAlphabet(keywordText, alphabet, null);
    const lookup = new Map();
    const reverse = new Map();
    for (let i = 0; i < letters.length; i++) {
        const code = (Math.floor(i / size) + 1) * 10 + (i % size + 1);
        lookup.set(letters[i], code);
        reverse.set(code, letters[i]);
    }
    return {letters, lookup, reverse};
}
function csNihilistKey(text, square, size) {
    let clean = String(text == null ? "" : text).toUpperCase();
    clean = size === 6 ? clean.replace(/[^A-Z0-9]/g, "") : clean.replace(/J/g, "I").replace(/[^A-Z]/g, "");
    const codes = [];
    for (const ch of clean) if (square.lookup.has(ch)) codes.push(square.lookup.get(ch));
    return codes;
}
function nihilistRun(text, additiveKey, polybiusKey, grid, decode) {
    const size = cfOption(grid, ["5x5", "6x6"], "5x5") === "6x6" ? 6 : 5;
    const square = csNihilistSquare(polybiusKey, size);
    const key = csNihilistKey(additiveKey, square, size);
    if (!key.length) throw new Error("Enter an additive keyword before using the Nihilist cipher.");
    if (decode) {
        const numbers = String(text).match(/\d+/g) || [];
        let out = "";
        for (let i = 0; i < numbers.length; i++) out += square.reverse.get(Number(numbers[i]) - key[i % key.length]) || "?";
        return out;
    }
    let clean = String(text).toUpperCase();
    clean = size === 6 ? clean.replace(/[^A-Z0-9]/g, "") : clean.replace(/J/g, "I").replace(/[^A-Z]/g, "");
    const out = [];
    for (let i = 0; i < clean.length; i++) {
        const code = square.lookup.get(clean[i]);
        if (code !== undefined) out.push(code + key[i % key.length]);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Numeric homophonic
 * Each letter owns one or more numeric tokens. Tokens match exactly, so 04 and
 * 4 are different values. The encoder takes the first token of each list, which
 * keeps a graph re-run stable; CacheSleuth can pick randomly instead.
 */
function csHomophonicKey(value) {
    const byLetter = new Map();
    const owners = new Map();
    for (const line of String(value == null ? "" : value).split(/[\r\n;]+/)) {
        const match = line.trim().match(/^([A-Z])\s*[:=]?\s*(.+)$/i);
        if (!match) continue;
        const letter = match[1].toUpperCase();
        const tokens = match[2].match(/\d+/g) || [];
        if (!tokens.length) continue;
        for (const token of tokens) {
            const owner = owners.get(token);
            if (owner && owner !== letter) throw new Error(`Token ${token} is assigned to both ${owner} and ${letter}.`);
            owners.set(token, letter);
        }
        byLetter.set(letter, tokens);
    }
    if (!byLetter.size) throw new Error("Enter at least one letter and its numeric tokens, for example A: 04 24 55.");
    return {byLetter, owners};
}
function numericHomophonicRun(text, keyText, separator, wordGaps, decode) {
    const {byLetter, owners} = csHomophonicKey(keyText);
    const sep = cfOption(separator, ["Space", "Comma", "Newline"], "Space");
    const joiner = sep === "Comma" ? ", " : sep === "Newline" ? "\n" : " ";
    if (decode) {
        const parts = String(text).match(/\d+|\//g) || [];
        let out = "";
        for (const part of parts) {
            if (part === "/") {
                if (!out.endsWith(" ")) out += " ";
                continue;
            }
            out += owners.get(part) || "?";
        }
        return out.replace(/\s+/g, " ").trim();
    }
    const pieces = [];
    for (const ch of String(text)) {
        const up = ch.toUpperCase();
        if (byLetter.has(up)) pieces.push(byLetter.get(up)[0]);
        else if (wordGaps && /\s/.test(ch) && pieces[pieces.length - 1] !== "/") pieces.push("/");
    }
    return pieces.join(joiner);
}

/* ------------------------------------------------------------ Straddle checkerboard
 * Eight letters use the top digits, ten use spare position 1 and eight use
 * spare position 2. The two spare digits are removed from the top row, which is
 * what makes the digit stream decodable without separators.
 */
function csStraddleTable(key, spare1, spare2) {
    const alpha = cfKeyedAlphabet(String(key || "").toUpperCase().replace(/[^A-Z]/g, ""), CF_ALPHABET, null);
    const one = Number(spare1);
    const two = Number(spare2);
    if (!Number.isInteger(one) || !Number.isInteger(two) || one < 0 || one > 9 || two < 0 || two > 9) {
        throw new Error("Spare positions must be digits from 0 to 9.");
    }
    if (one === two) throw new Error("Spare positions must be different.");
    if (one === 0 && two === 0) throw new Error("At least one spare position must be greater than zero.");
    const top = [];
    for (let digit = 0; digit <= 9; digit++) if (digit !== one && digit !== two) top.push(String(digit));
    const encode = new Map();
    const decode = new Map();
    for (let i = 0; i < 8; i++) {
        encode.set(alpha[i], top[i]);
        decode.set(top[i], alpha[i]);
    }
    for (let i = 0; i < 10; i++) {
        encode.set(alpha[8 + i], String(one) + i);
        decode.set(String(one) + i, alpha[8 + i]);
    }
    for (let i = 0; i < 8; i++) {
        encode.set(alpha[18 + i], String(two) + i);
        decode.set(String(two) + i, alpha[18 + i]);
    }
    return {spares: [one, two], encode, decode};
}
function straddleRun(text, key, spare1, spare2, decode) {
    const table = csStraddleTable(key, spare1, spare2);
    if (decode) {
        const digits = String(text).replace(/[^0-9]/g, "");
        let out = "";
        for (let i = 0; i < digits.length; i++) {
            const digit = digits[i];
            if (Number(digit) === table.spares[0] || Number(digit) === table.spares[1]) {
                if (i + 1 >= digits.length) {
                    out += "?";
                    break;
                }
                out += table.decode.get(digit + digits[++i]) || "?";
            } else {
                out += table.decode.get(digit) || "?";
            }
        }
        return out;
    }
    let out = "";
    for (const ch of String(text).toUpperCase()) {
        if (table.encode.has(ch)) out += table.encode.get(ch);
    }
    return out;
}

/* ------------------------------------------------------------ VIC checkerboard
 * CacheSleuth's VIC tool covers the straddling checkerboard and the optional
 * numeric over-encryption (not the two transpositions of the full field cipher).
 * The alphabet is A-Z plus / and ., giving 28 cells.
 */
function csVicTable(key, spare1, spare2) {
    const base = CF_ALPHABET + "/.";
    let keyword = String(key == null ? "" : key).toUpperCase().replace(/[^A-Z/.]/g, "");
    let alpha = "";
    for (const ch of keyword + base) if (base.includes(ch) && !alpha.includes(ch)) alpha += ch;
    if (alpha.length !== 28) throw new Error("The VIC alphabet must contain 28 symbols: A-Z plus / and .");
    const one = Number(spare1);
    const two = Number(spare2);
    if (!Number.isInteger(one) || !Number.isInteger(two) || one < 1 || one > 9 || two < 1 || two > 9) {
        throw new Error("VIC spare positions must be digits from 1 to 9.");
    }
    if (one === two) throw new Error("VIC spare positions must be different.");
    const top = [];
    for (let digit = 0; digit <= 9; digit++) if (digit !== one && digit !== two) top.push(String(digit));
    const encode = new Map();
    const decode = new Map();
    for (let i = 0; i < 8; i++) {
        encode.set(alpha[i], top[i]);
        decode.set(top[i], alpha[i]);
    }
    for (let i = 0; i < 10; i++) {
        encode.set(alpha[8 + i], String(one) + i);
        decode.set(String(one) + i, alpha[8 + i]);
    }
    for (let i = 0; i < 10; i++) {
        encode.set(alpha[18 + i], String(two) + i);
        decode.set(String(two) + i, alpha[18 + i]);
    }
    return {spares: [one, two], encode, decode};
}
function csVicNumeric(value) {
    return String(value == null ? "" : value).replace(/[^0-9]/g, "") || "0";
}
function csVicAdd(digits, key, decode) {
    const numeric = csVicNumeric(key);
    let out = "";
    for (let i = 0; i < digits.length; i++) {
        const digit = Number(digits[i]);
        const shift = Number(numeric[i % numeric.length]);
        out += String((digit + (decode ? -shift : shift) + 10) % 10);
    }
    return out;
}
function vicRun(text, key, spare1, spare2, numericKey, decode) {
    const table = csVicTable(key, spare1, spare2);
    if (decode) {
        const digits = csVicAdd(String(text).replace(/[^0-9]/g, ""), numericKey, true);
        let out = "";
        for (let i = 0; i < digits.length; i++) {
            const digit = digits[i];
            if (Number(digit) === table.spares[0] || Number(digit) === table.spares[1]) {
                if (i + 1 >= digits.length) {
                    out += "?";
                    break;
                }
                out += table.decode.get(digit + digits[++i]) || "?";
            } else {
                out += table.decode.get(digit) || "?";
            }
        }
        return out;
    }
    let digits = "";
    for (const ch of String(text).toUpperCase()) {
        if (table.encode.has(ch)) digits += table.encode.get(ch);
    }
    return csVicAdd(digits, numericKey, false);
}

/* ------------------------------------------------------------ Book cipher
 * Reference groups are numbers whose parts mean page, line, word or character.
 * `---PAGE---` separates pages. This is the decoder half of the CacheSleuth
 * tool: encoding would have to choose one of many possible references.
 */
function csBookExtract(source, type, index, start) {
    const at = index - start;
    if (!Number.isFinite(at) || at < 0) return "";
    if (type === "page") return String(source).split("---PAGE---")[at] || "";
    if (type === "line") return String(source).split(/[\r\n]+/)[at] || "";
    if (type === "word") return String(source).trim().split(/\s+/)[at] || "";
    if (type === "char") return String(source).charAt(at);
    return source;
}
function bookCipherRun(codes, source, format, numberingStart, ignoreSpaces, firstLetterOnly) {
    const parts = String(format || "line:word").split(":").map(part => part.trim().toLowerCase());
    if (parts.some(part => !["page", "line", "word", "char"].includes(part))) {
        throw new Error("A book cipher format uses page, line, word and character, for example line:word.");
    }
    const start = Number(numberingStart) || 1;
    let text = String(source == null ? "" : source);
    let out = "";
    for (const group of String(codes).split(/\s+/).filter(Boolean)) {
        const numbers = (group.match(/\d+/g) || []).map(Number);
        let value = text;
        for (const type of ["page", "line", "word", "char"]) {
            const index = parts.indexOf(type);
            if (index < 0) continue;
            value = csBookExtract(value, type, numbers[index], start);
        }
        if (ignoreSpaces) value = String(value).replace(/\s+/g, "");
        if (!value) out += "*";
        else if (firstLetterOnly || value.length === 1) out += value.charAt(0);
        else {
            const word = value.match(/[^\s]+/);
            out += (word ? word[0] : "*") + " ";
        }
    }
    return out.trimEnd();
}
