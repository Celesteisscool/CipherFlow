/* Polygrammic / fractionation helpers (dCode family) -----------------------------
 * Embedded into the worker module by dev/dcode/payload.mjs, after the other
 * runtime files.
 */

/* ------------------------------------------------------------ shared square work */
// Read the "merge letters" dropdown ("J>I" means J is folded into I).
function cfMergeArg(value) {
    return cfOption(value, ["J>I", "I>J", "V>W", "W>V", "Z omitted"], "J>I");
}
function pgSquare(keyword, merge) {
    const alphabet = cfMergeAlphabet(merge);
    const square = cfSquare(cfKeyedAlphabet(keyword || "", alphabet, null), 5);
    if (!square) throw new Error("Could not build a 5x5 square from that keyword.");
    return square;
}
function pgPairs(text, filler, merge) {
    const mergeFrom = cfMergeFrom(merge);
    const letters = String(text).toUpperCase().split("").filter(ch => /[A-Z]/.test(ch) && ch !== mergeFrom).join("");
    const out = [];
    for (let i = 0; i < letters.length; i += 2) {
        const a = letters[i];
        let b = letters[i + 1];
        if (b == null) {
            b = filler;
            out.push([a, b]);
            continue;
        }
        if (a === b) {
            out.push([a, filler]);
            i--;  // the second letter is consumed by the next pair
        } else {
            out.push([a, b]);
        }
    }
    return out;
}
function pgUnpair(pairs) {
    return pairs.map(([a, b]) => a + b).join("");
}

/* ------------------------------------------------------------ Playfair */
function playfairShift(square, letter, rowStep, colStep) {
    const at = square.find(letter);
    if (!at) throw new Error(`${letter} is not in the square.`);
    return square.at(at.row + rowStep, at.col + colStep);
}
function playfairRun(text, keyword, merge, filler, decode) {
    const square = pgSquare(keyword, merge);
    const pairs = pgPairs(text, filler, merge);
    const out = pairs.map(([a, b]) => {
        const pa = square.find(a);
        const pb = square.find(b);
        if (pa.row === pb.row) {
            return playfairShift(square, a, 0, decode ? -1 : 1) + playfairShift(square, b, 0, decode ? -1 : 1);
        }
        if (pa.col === pb.col) {
            return playfairShift(square, a, decode ? -1 : 1, 0) + playfairShift(square, b, decode ? -1 : 1, 0);
        }
        return square.at(pa.row, pb.col) + square.at(pb.row, pa.col);
    });
    return pgUnpair(out);
}

/* ------------------------------------------------------------ Two-square
 * Horizontal (default): the plaintext letter of a pair is looked up in the first
 * square and the second letter in the second square; each ciphertext letter sits
 * in the other's row.
 */
function twoSquareRun(text, key1, key2, direction, merge, filler, decode) {
    const s1 = pgSquare(key1, merge);
    const s2 = pgSquare(key2, merge);
    const pairs = pgPairs(text, filler, merge);
    const out = pairs.map(([a, b]) => {
        if (decode) {
            // C1 sits in square 2, C2 in square 1; each ciphertext letter carries
            // one coordinate of each plaintext letter.
            const c1 = s2.find(a);
            const c2 = s1.find(b);
            return direction === "Vertical"
                ? s1.at(c2.row, c1.col) + s2.at(c1.row, c2.col)
                : s1.at(c1.row, c2.col) + s2.at(c2.row, c1.col);
        }
        const pa = s1.find(a);
        const pb = s2.find(b);
        return direction === "Vertical"
            ? s2.at(pb.row, pa.col) + s1.at(pa.row, pb.col)
            : s2.at(pa.row, pb.col) + s1.at(pb.row, pa.col);
    });
    return pgUnpair(out);
}

/* ------------------------------------------------------------ Four-square
 * Grids: top-left and bottom-right are the plain alphabets, top-right and
 * bottom-left are keyed. A digraph (a,b) maps to (TR[ra][cb], BL[rb][ca]).
 */
function fourSquareRun(text, keyTL, keyTR, keyBL, keyBR, merge, filler, decode) {
    const sTL = pgSquare(keyTL, merge);
    const sTR = pgSquare(keyTR, merge);
    const sBL = pgSquare(keyBL, merge);
    const sBR = pgSquare(keyBR, merge);
    const pairs = pgPairs(text, filler, merge);
    const out = pairs.map(([a, b]) => {
        if (decode) {
            const ca = sTR.find(a);
            const cb = sBL.find(b);
            return sTL.at(ca.row, cb.col) + sBR.at(cb.row, ca.col);
        }
        const pa = sTL.find(a);
        const pb = sBR.find(b);
        return sTR.at(pa.row, pb.col) + sBL.at(pb.row, pa.col);
    });
    return pgUnpair(out);
}

/* ------------------------------------------------------------ Hill */
function hillMatrix(text, size) {
    const nums = String(text == null ? "" : text).split(/[^0-9]+/).filter(Boolean).map(Number);
    if (nums.length !== size * size) {
        throw new Error(`The matrix needs ${size * size} numbers for a ${size}x${size} key, for example 2,3,5,7.`);
    }
    return Array.from({length: size}, (_, r) => nums.slice(r * size, r * size + size));
}
function hillDet(matrix) {
    const n = matrix.length;
    if (n === 1) return matrix[0][0];
    if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    let det = 0;
    for (let c = 0; c < n; c++) {
        const minor = matrix.slice(1).map(row => row.filter((_, i) => i !== c));
        det += ((-1) ** c) * matrix[0][c] * hillDet(minor);
    }
    return det;
}
function hillInverse(matrix, modulus) {
    const n = matrix.length;
    const det = cfMod(hillDet(matrix), modulus);
    let inv = null;
    for (let x = 1; x < modulus; x++) if ((det * x) % modulus === 1) { inv = x; break; }
    if (inv == null) throw new Error(`This matrix is not invertible modulo ${modulus}, so it cannot be decoded.`);
    const cofactors = matrix.map((row, r) => row.map((_, c) => {
        const minor = matrix.filter((_, i) => i !== r).map(line => line.filter((_, j) => j !== c));
        const sign = ((r + c) % 2 === 0 ? 1 : -1);
        return cfMod(sign * hillDet(minor), modulus);
    }));
    // adjugate = transpose of the cofactor matrix
    return Array.from({length: n}, (_, r) => Array.from({length: n}, (_, c) => cfMod(cofactors[c][r] * inv, modulus)));
}
function hillMultiply(matrix, vector, modulus) {
    return matrix.map(row => cfMod(row.reduce((sum, value, i) => sum + value * vector[i], 0), modulus));
}
function hillRun(text, matrixText, size, alphabet, filler, decode) {
    const alpha = String(alphabet || CF_ALPHABET).toUpperCase();
    if (alpha.length < 2) throw new Error("The alphabet needs at least two characters.");
    const matrix = hillMatrix(matrixText, size);
    const used = decode ? hillInverse(matrix, alpha.length) : matrix;
    const letters = String(text).toUpperCase().split("").filter(ch => alpha.includes(ch));
    while (letters.length % size !== 0) letters.push(filler);
    let out = "";
    for (let i = 0; i < letters.length; i += size) {
        const vector = letters.slice(i, i + size).map(ch => alpha.indexOf(ch));
        const product = hillMultiply(used, vector, alpha.length);
        out += product.map(index => alpha[index]).join("");
    }
    return out;
}

/* ------------------------------------------------------------ ADFGX / ADFGVX
 * Substitution with coordinate letters, followed by a columnar transposition.
 */
function adfgRun(text, keyword, alphabet, labels, decode) {
    const alpha = String(alphabet);
    const size = Math.round(Math.sqrt(alpha.length));
    if (size * size !== alpha.length) throw new Error("The alphabet length must be a perfect square (25 for ADFGX, 36 for ADFGVX).");
    const square = cfSquare(alpha, size);
    const key = cfKeyLetters(keyword).join("");
    if (!key) throw new Error("Provide a transposition keyword.");
    if (decode) {
        const decoded = transColumnarDecode(text, key, "X", true);
        let out = "";
        for (let i = 0; i + 1 < decoded.length; i += 2) {
            const r = labels.indexOf(decoded[i]);
            const c = labels.indexOf(decoded[i + 1]);
            if (r < 0 || c < 0) throw new Error(`“${decoded[i]}${decoded[i + 1]}” is not a valid coordinate pair for ${labels}.`);
            out += square.at(r, c);
        }
        return out;
    }
    let coordinates = "";
    for (const ch of String(text).toUpperCase()) {
        const at = square.find(ch);
        if (!at) continue;
        coordinates += labels[at.row] + labels[at.col];
    }
    return transColumnarEncode(coordinates, key, "X", true);
}

/* ------------------------------------------------------------ Fractionated Morse
 * The Morse stream (with | between letters and || between words) is cut into
 * trigrams of . - | which index the 27-symbol table.
 */
function fracMorseTable() {
    const symbols = [".", "-", "|"];
    const table = [];
    for (const a of symbols) for (const b of symbols) for (const c of symbols) table.push(a + b + c);
    return table;
}
function fracMorseEncode(text, letterSep, wordSep, filler) {
    const stream = cfToMorse(text, letterSep, wordSep);
    const padded = cfPad(stream, 3, filler);
    const table = fracMorseTable();
    let out = "";
    for (let i = 0; i < padded.length; i += 3) {
        const index = table.indexOf(padded.substr(i, 3));
        out += index < 26 ? cfLetter(index) : ".";
    }
    return out;
}
function fracMorseDecode(text, letterSep, wordSep, filler) {
    const table = fracMorseTable();
    let stream = "";
    for (const ch of String(text).toUpperCase()) {
        if (ch === ".") stream += filler;
        else if (/[A-Z]/.test(ch)) stream += table[cfIndex(ch)];
    }
    return cfFromMorse(stream, letterSep, wordSep);
}

/* ------------------------------------------------------------ Tap code
 * Two tap counts per letter (row then column), either as digits or as dots.
 */
function tapGrid(alphabet) {
    const alpha = String(alphabet || "ABCDEFGHIJLMNOPQRSTUVWXYZ").toUpperCase();
    const grid = cfSquare(cfKeyedAlphabet("", alpha, null), 5);
    if (!grid) throw new Error("The tap code alphabet must have 25 letters (one letter is merged away).");
    return grid;
}
function tapRun(text, alphabet, format, separator, decode) {
    const grid = tapGrid(alphabet);
    if (decode) {
        const source = String(text);
        let out = "";
        if (format === "Dots") {
            // runs of dots: first run = row, second run = column, blank line = space
            const tokens = source.trim().split(/\s{2,}|\n/);
            for (const token of tokens) {
                const runs = token.trim().split(/\s+/).map(run => run.replace(/[^.]/g, "").length).filter(Boolean);
                for (let i = 0; i + 1 < runs.length; i += 2) {
                    const letter = grid.at(runs[i] - 1, runs[i + 1] - 1);
                    if (letter) out += letter;
                }
                out += " ";
            }
            return out.trim();
        }
        // Two digits per letter (row then column), whatever the separator.
        const digits = source.replace(/[^0-9]/g, "");
        for (let i = 0; i + 1 < digits.length; i += 2) {
            const letter = grid.at(Number(digits[i]) - 1, Number(digits[i + 1]) - 1);
            if (letter) out += letter;
        }
        return out;
    }
    const sep = separator == null || separator === "" ? " " : separator;
    const toDots = count => Array.from({length: count}, () => ".").join("");
    const parts = [];
    for (const ch of String(text).toUpperCase()) {
        const at = grid.find(ch);
        if (!at) continue;
        parts.push(format === "Dots" ? `${toDots(at.row + 1)} ${toDots(at.col + 1)}` : `${at.row + 1}${at.col + 1}`);
    }
    return parts.join(format === "Dots" ? sep : sep);
}

/* ------------------------------------------------------------ Polybius square */
function polybiusRun(text, keyword, merge, separator, base, decode) {
    const alphabet = cfMergeAlphabet(merge);
    const square = cfSquare(cfKeyedAlphabet(keyword || "", alphabet, null), 5);
    if (!square) throw new Error("Could not build the Polybius square.");
    const b = base === 0 ? 0 : 1;
    const sep = separator == null || separator === "" ? "," : separator;
    if (decode) {
        // Coordinates are written two digits per letter ("14" = row 1, column 4),
        // so every digit is read in turn whatever the separator is.
        const digits = String(text).replace(/[^0-9]/g, "");
        let out = "";
        for (let i = 0; i + 1 < digits.length; i += 2) {
            const letter = square.at(Number(digits[i]) - b, Number(digits[i + 1]) - b);
            if (letter) out += letter;
        }
        return out;
    }
    const parts = [];
    for (const ch of String(text).toUpperCase()) {
        const at = square.find(ch);
        if (!at) continue;
        parts.push(`${at.row + b}${at.col + b}`);
    }
    return parts.join(sep);
}
