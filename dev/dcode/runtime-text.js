/* Text-cipher helpers (dCode family) ---------------------------------------------
 * Ragbaby, Grandpre, Collon, Bazeries, homophonic substitution, triliteral,
 * slidefair, Swagman, Ubchi, route transposition, three-square, trifid and a
 * recreated Pollux. Embedded into the worker module by dev/dcode/payload.mjs,
 * after the other runtime files, so every function here is available to the
 * operation bodies.
 */

function cfLettersOnly(text) {
    return String(text == null ? "" : text).toUpperCase().split("").filter(ch => /[A-Z]/.test(ch)).join("");
}

/* ------------------------------------------------------------ Ragbaby
 * dCode's Ragbaby: the keyed alphabet is fixed for the whole message, each word is
 * numbered from 1, and the letter at position j of word i is shifted by i + j.
 */
function ragbabyRun(text, alphabet, size, decode) {
    let alpha = String(alphabet == null ? "" : alphabet).toUpperCase().replace(/[^A-Z]/g, "");
    if (!alpha) alpha = CF_ALPHABET;
    let dropped = "";
    if (String(size) === "24") {
        // The original Ragbaby alphabet leaves out J and X.
        dropped = "JX";
        alpha = alpha.split("").filter(c => !dropped.includes(c)).join("");
    }
    if (alpha.length < 2) throw new Error("The alphabet needs at least two letters.");
    const parts = String(text == null ? "" : text).match(/[A-Za-z]+|[^A-Za-z]+/g) || [];
    let word = 0;
    return parts.map(part => {
        if (!/[A-Za-z]/.test(part[0])) return part;
        word++;
        let out = "";
        let pos = 0;
        for (const ch of part) {
            const up = ch.toUpperCase();
            if (dropped.includes(up)) continue;   // the 24-letter alphabet has no J or X
            const idx = alpha.indexOf(up);
            if (idx < 0) continue;
            const shift = (word + pos) % alpha.length;
            const next = alpha[decode ? cfMod(idx - shift, alpha.length) : cfMod(idx + shift, alpha.length)];
            out += cfApplyCase(ch, next);
            pos++;
        }
        return out;
    }).join("");
}

// The letter a square cipher leaves out ("J>I" folds J into I, "Z omitted" drops Z).
function cfMergeFrom(merge) {
    const value = String(merge == null ? "J>I" : merge).toUpperCase();
    if (value.startsWith("Z OMITTED")) return "Z";
    return value.split(">")[0] || "";
}
function cfMergeFold(merge) {
    const value = String(merge == null ? "J>I" : merge).toUpperCase();
    if (value.startsWith("Z OMITTED")) return "";
    return value.split(">")[1] || "";
}

/* ------------------------------------------------------------ Grandpre
 * A 10x10 grid of letters. Each letter is written as the digit of its row followed
 * by the digit of its column, with the labels 1..9 then 0. Several cells can hold
 * the same letter, so the encoder takes the first one it finds (dCode picks among
 * the duplicates instead); the decoder is exact.
 */
function grandpreGrid(text) {
    const rows = String(text == null ? "" : text)
        .split(/[\n;|]+/)
        .map(row => row.toUpperCase().replace(/[^A-Z]/g, ""))
        .filter(row => row.length);
    if (rows.length !== 10 || rows.some(row => row.length !== 10)) {
        throw new Error("The Grandpre grid needs ten rows of ten letters.");
    }
    return rows;
}
function grandpreRun(text, gridText, separator, decode) {
    const rows = grandpreGrid(gridText);
    const labels = "1234567890";
    if (decode) {
        const pairs = String(text == null ? "" : text).match(/[0-9]{2}/g);
        if (!pairs) throw new Error("The Grandpre decoder needs digit pairs, for example 73 09 78.");
        return pairs.map(pair => {
            const row = labels.indexOf(pair[0]);
            const col = labels.indexOf(pair[1]);
            if (row < 0 || col < 0) throw new Error(`“${pair}” is not a valid pair of grid labels.`);
            return rows[row][col];
        }).join("");
    }
    const sep = separator == null ? " " : String(separator);
    const out = [];
    for (const ch of cfLettersOnly(text)) {
        let found = null;
        for (let row = 0; row < 10 && !found; row++) {
            const col = rows[row].indexOf(ch);
            if (col >= 0) found = [row, col];
        }
        if (!found) throw new Error(`“${ch}” is not in the Grandpre grid.`);
        out.push(labels[found[0]] + labels[found[1]]);
    }
    return out.join(sep);
}

/* ------------------------------------------------------------ Collon
 * Each letter of a block is encoded by the letter at the left edge of its row and
 * the letter at the bottom edge of its column; the block's row letters are written
 * first, then its column letters.
 */
function collonGrid(text) {
    const rows = String(text == null ? "" : text)
        .split(/[\n;|]+/)
        .map(row => row.toUpperCase().replace(/[^A-Z]/g, ""))
        .filter(row => row.length);
    if (rows.length !== 5 || rows.some(row => row.length !== 5)) {
        throw new Error("The Collon grid needs five rows of five letters.");
    }
    return rows;
}
function collonRun(text, gridText, n, decode) {
    const rows = collonGrid(gridText);
    const size = Math.max(1, Math.round(cfNumber(n, 2)));
    const letters = cfLettersOnly(text);
    if (decode) {
        const out = [];
        for (let i = 0; i < letters.length; i += size * 2) {
            const block = letters.slice(i, i + size * 2);
            const half = Math.floor(block.length / 2);
            const rowEdges = block.slice(0, half);
            const colEdges = block.slice(half);
            for (let k = 0; k < rowEdges.length; k++) {
                const row = rows.findIndex(letters => letters[0] === rowEdges[k]);
                const col = rows[4].indexOf(colEdges[k]);
                if (row < 0) throw new Error(`“${rowEdges[k]}” is not the first letter of any grid row.`);
                if (col < 0) throw new Error(`“${colEdges[k]}” is not in the bottom row of the grid.`);
                out.push(rows[row][col]);
            }
        }
        return out.join("");
    }
    let out = "";
    for (let i = 0; i < letters.length; i += size) {
        const block = letters.slice(i, i + size);
        let top = "";
        let bottom = "";
        for (const ch of block) {
            let found = null;
            for (let row = 0; row < 5 && !found; row++) {
                const col = rows[row].indexOf(ch);
                if (col >= 0) found = [row, col];
            }
            if (!found) throw new Error(`“${ch}” is not in the Collon grid.`);
            top += rows[found[0]][0];
            bottom += rows[4][found[1]];
        }
        out += top + bottom;
    }
    return out;
}

/* ------------------------------------------------------------ Bazeries
 * Two 25-letter squares. The message is cut into groups whose sizes cycle through
 * the digits of N, every group is reversed, and then each letter is replaced by the
 * letter in the same position of the second square.
 */
function bazeriesSquare(alphabet, byColumns) {
    const alpha = String(alphabet == null ? "" : alphabet).toUpperCase().replace(/[^A-Z]/g, "");
    if (alpha.length !== 25) {
        throw new Error("Grid 1 needs exactly 25 letters: one letter of the alphabet is left out.");
    }
    if (!byColumns) return alpha;
    let out = "";
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) out += alpha[col * 5 + row];
    }
    return out;
}
function bazeriesSizes(text, n) {
    const digits = String(n == null ? "" : n).split("").map(Number).filter(d => d >= 1 && d <= 9);
    if (!digits.length) throw new Error("N must contain at least one digit from 1 to 9 (for example 23).");
    const sizes = [];
    let left = text.length;
    let i = 0;
    while (left > 0) {
        const size = Math.min(digits[i % digits.length], left);
        sizes.push(size);
        left -= size;
        i++;
    }
    return sizes;
}
function bazeriesChunk(text, sizes) {
    const out = [];
    let at = 0;
    for (const size of sizes) {
        out.push(text.slice(at, at + size));
        at += size;
    }
    return out;
}
function bazeriesRun(text, n, gridAlphabet, keyword, decode) {
    const plain = bazeriesSquare(gridAlphabet, true);
    // The second square is built from the same 25-letter alphabet, so both grids
    // leave out the same letter of the alphabet.
    const cipher = cfKeyedAlphabet(String(keyword == null ? "" : keyword), plain.split("").sort().join(""), null);
    if (cipher.length !== 25) throw new Error("The second grid needs exactly 25 letters.");
    const letters = cfLettersOnly(text);
    const sizes = bazeriesSizes(letters, n);
    const groups = bazeriesChunk(letters, sizes).map(group => group.split("").reverse().join(""));
    return groups.map(group => group.split("").map(ch => {
        const from = decode ? cipher : plain;
        const to = decode ? plain : cipher;
        const idx = from.indexOf(ch);
        if (idx < 0) throw new Error(`“${ch}” is not in the ${decode ? "second" : "first"} grid.`);
        return to[idx];
    }).join("")).join("");
}

/* ------------------------------------------------------------ homophonic substitution
 * A correspondence table such as "A(45,96,17), B(37,60), C(05,88)". A letter may have
 * several substitutes; the encoder writes the first one it finds so the output is
 * reproducible, while dCode picks one at random. Decoding is exact.
 */
function homoTable(text) {
    const table = new Map();
    const source = String(text == null ? "" : text).toUpperCase();
    const re = /([A-Z0-9])\s*[([{:=]\s*([0-9][0-9,\s]*)/g;
    let match;
    while ((match = re.exec(source))) {
        const subs = match[2].split(/[^0-9]+/).filter(Boolean);
        if (subs.length) table.set(match[1], subs);
    }
    if (!table.size) throw new Error("The correspondence table is empty. Write it like A(45,96), B(37), C(05,88).");
    return table;
}
function homoRun(text, tableText, separator, decode) {
    const table = homoTable(tableText);
    const sep = separator == null ? "," : String(separator);
    if (decode) {
        const numbers = String(text == null ? "" : text).split(/[^0-9]+/).filter(Boolean);
        if (!numbers.length) throw new Error("The homophonic decoder needs numbers, for example 45,60,88.");
        const lookup = new Map();
        for (const [letter, subs] of table) for (const sub of subs) lookup.set(String(Number(sub)), letter);
        return numbers.map(number => {
            const letter = lookup.get(String(Number(number)));
            if (!letter) throw new Error(`“${number}” is not in the correspondence table.`);
            return letter;
        }).join("");
    }
    const out = [];
    for (const ch of String(text == null ? "" : text).toUpperCase()) {
        if (!table.has(ch)) continue;
        out.push(table.get(ch)[0]);
    }
    return out.join(sep);
}

/* ------------------------------------------------------------ triliteral
 * Every symbol of the alphabet gets a three-symbol code in base 3 (A=0, B=1, C=2).
 */
function triliteralRun(text, alphabet, separator, decode) {
    const symbols = "ABC";
    const alpha = String(alphabet == null || alphabet === "" ? CF_ALPHABET + " " : alphabet);
    if (decode) {
        const codes = String(text == null ? "" : text).toUpperCase().match(/[ABC]{3}/g);
        if (!codes) throw new Error("The triliteral decoder needs groups of three A, B or C.");
        return codes.map(code => {
            const idx = symbols.indexOf(code[0]) * 9 + symbols.indexOf(code[1]) * 3 + symbols.indexOf(code[2]);
            if (idx >= alpha.length) throw new Error(`“${code}” is outside the alphabet.`);
            return alpha[idx];
        }).join("");
    }
    let out = [];
    for (const ch of String(text == null ? "" : text).toUpperCase()) {
        const idx = alpha.indexOf(ch);
        if (idx < 0) throw new Error(`“${ch}” is not in the triliteral alphabet.`);
        out.push(symbols[Math.floor(idx / 9)] + symbols[Math.floor(idx / 3) % 3] + symbols[idx % 3]);
    }
    return out.join(separator == null ? " " : String(separator));
}

/* ------------------------------------------------------------ slidefair
 * Each pair of letters is combined with one key letter: the second letter shifted
 * back by the key becomes the first ciphertext letter, the first letter shifted on
 * by the key becomes the second. Decoding swaps the shifts.
 */
function slidefairRun(text, key, alphabet, filler, decode) {
    const alpha = String(alphabet == null || alphabet === "" ? CF_ALPHABET : alphabet).toUpperCase();
    const size = alpha.length;
    if (size < 2) throw new Error("The alphabet needs at least two letters.");
    const keyLetters = cfKeyLetters(key).map(ch => alpha.indexOf(ch)).filter(idx => idx >= 0);
    if (!keyLetters.length) throw new Error("The slidefair key needs at least one letter that is in the alphabet.");
    const letters = cfLettersOnly(text).split("").filter(ch => alpha.includes(ch));
    if (!letters.length) return "";
    const pairs = [];
    for (let i = 0; i < letters.length; i += 2) {
        const a = letters[i];
        const b = letters[i + 1];
        if (b == null) pairs.push([a, String(filler == null ? "X" : filler).toUpperCase()[0] || "X"]);
        else pairs.push([a, b]);
    }
    let out = "";
    let pos = 0;
    for (const [a, b] of pairs) {
        const k = keyLetters[pos % keyLetters.length];
        pos++;
        const ia = alpha.indexOf(a);
        const ib = alpha.indexOf(b);
        if (ia < 0 || ib < 0) throw new Error(`“${ia < 0 ? a : b}” is not in the alphabet.`);
        // The pair is swapped and shifted, which makes the operation its own inverse:
        // encoding a ciphertext pair with the same key returns the plaintext pair.
        out += alpha[cfMod(ib - k, size)] + alpha[cfMod(ia + k, size)];
    }
    return out;
}

/* ------------------------------------------------------------ Swagman
 * The text is padded to a whole number of columns and written down the columns of a
 * grid; every row is then read in the order given by the key numbers of the row
 * (the key rows repeat if the message is taller than the key).
 */
function swagmanKey(text) {
    const rows = String(text == null ? "" : text)
        .split(/[\n;|]+/)
        .map(row => row.trim().split(/[^0-9]+/).filter(Boolean).map(Number))
        .filter(row => row.length);
    if (!rows.length) throw new Error("The Swagman key needs at least one row of numbers.");
    const size = rows[0].length;
    if (rows.some(row => row.length !== size)) throw new Error("Every row of the Swagman key must be the same length.");
    return rows;
}
function swagmanOrder(row) {
    return row.map((value, index) => ({value, index}))
        .sort((a, b) => (a.value === b.value ? a.index - b.index : a.value - b.value))
        .map(entry => entry.index);
}
function swagmanFill(padded, width) {
    if (padded.length % width) throw new Error("The text could not be padded to whole columns.");
    const height = padded.length / width;
    const grid = Array.from({length: height}, () => new Array(width).fill(""));
    let at = 0;
    for (let col = 0; col < width; col++) {
        for (let row = 0; row < height; row++) grid[row][col] = padded[at++];
    }
    return grid;
}
function swagmanRun(text, keyText, filler, decode) {
    const key = swagmanKey(keyText);
    const width = key[0].length;
    const fill = String(filler == null || filler === "" ? "X" : filler).toUpperCase();
    const source = String(text == null ? "" : text).toUpperCase();
    if (decode) {
        // Every row of the ciphertext was written in key order; scatter it back.
        const rows = cfChunks(source, width);
        if (source.length % width) throw new Error("The ciphertext length is not a whole number of columns.");
        const grid = rows.map((row, index) => {
            const cells = new Array(width).fill("");
            const order = swagmanOrder(key[index % key.length]);
            order.forEach((col, at) => { cells[col] = row[at]; });
            return cells;
        });
        let out = "";
        for (let col = 0; col < width; col++) {
            for (let row = 0; row < grid.length; row++) out += grid[row][col];
        }
        return out;
    }
    const grid = swagmanFill(cfPad(source, width, fill), width);
    return grid.map((row, index) => {
        const order = swagmanOrder(key[index % key.length]);
        return order.map(col => row[col] || "").join("");
    }).join("");
}

/* ------------------------------------------------------------ Ubchi
 * Columnar transposition, null letters appended, then the same transposition again.
 */
function ubchiRun(text, key, nullCount, nullLetter, decode) {
    const count = Math.max(0, Math.round(cfNumber(nullCount, 1)));
    const filler = String(nullLetter == null || nullLetter === "" ? "X" : nullLetter).toUpperCase()[0];
    const source = cfLettersOnly(text);
    const keyText = cfKeyLetters(key).join("");
    if (!keyText.length) throw new Error("Ubchi needs a keyword.");
    // An empty filler keeps the transposition irregular: the last column is short
    // instead of being padded to a full rectangle.
    if (decode) {
        const first = transColumnarDecode(source, keyText, "", false);
        const trimmed = count > 0 ? first.slice(0, Math.max(0, first.length - count)) : first;
        return transColumnarDecode(trimmed, keyText, "", false);
    }
    const once = transColumnarEncode(source, keyText, "", false);
    const padded = once + new Array(count).fill(filler).join("");
    return transColumnarEncode(padded, keyText, "", false);
}

/* ------------------------------------------------------------ route (serpentine columns)
 * The text fills the rows of the grid and is then read down the columns, alternating
 * direction. Empty cells of the last row take the filler.
 */
function routeGridSize(text, columns, rows) {
    const width = Math.max(1, Math.round(cfNumber(columns, 4)));
    const height = Math.round(cfNumber(rows, 0));
    const fit = Math.max(1, Math.ceil(String(text).length / width));
    return {width, height: height > 0 ? Math.max(height, fit) : fit};
}
function routeRun(text, columns, rows, filler, decode) {
    const source = String(text == null ? "" : text);
    const fill = String(filler == null || filler === "" ? "." : filler);
    const {width, height} = routeGridSize(decode ? "" : source, columns, rows);
    const cells = width * height;
    if (!decode && source.length > cells) throw new Error(`The text needs a bigger grid than ${width}x${height}.`);
    if (decode && source.length !== cells) {
        throw new Error(`The ciphertext has ${source.length} characters but the ${width}x${height} grid holds ${cells}.`);
    }
    if (decode) {
        const grid = Array.from({length: height}, () => new Array(width).fill(fill));
        let at = 0;
        for (let col = 0; col < width; col++) {
            const down = col % 2 === 0;
            for (let step = 0; step < height; step++) {
                const row = down ? step : height - 1 - step;
                grid[row][col] = source[at++];
            }
        }
        return grid.map(row => row.join("")).join("");
    }
    const padded = source + new Array(Math.max(0, cells - source.length)).fill(fill).join("");
    const grid = cfChunks(padded, width);
    let out = "";
    for (let col = 0; col < width; col++) {
        const down = col % 2 === 0;
        for (let step = 0; step < height; step++) {
            const row = down ? step : height - 1 - step;
            out += grid[row][col];
        }
    }
    return out;
}

/* ------------------------------------------------------------ three-square
 * Two keyed squares for the plaintext and one in the middle: the first plaintext
 * letter gives a column of the first square, the second gives a row of the second,
 * and the middle square holds the ciphertext pairs.
 */
function threeSquareRun(text, key1, key2, key3, merge, filler, decode) {
    const s1 = pgSquare(key1, merge);
    const s2 = pgSquare(key2, merge);
    const s3 = pgSquare(key3, merge);
    const fill = cfChar(filler, "X");
    const letters = cfLettersOnly(text).split("").filter(ch => ch !== String(merge || "J>I").toUpperCase().split(">")[0]);
    if (decode) {
        let out = "";
        for (let i = 0; i + 2 < letters.length + 1; i += 3) {
            const c1 = letters[i];
            const c2 = letters[i + 1];
            const c3 = letters[i + 2];
            if (c2 == null || c3 == null) throw new Error("A three-square ciphertext comes in groups of three letters.");
            const mid = s3.find(c2);
            const first = s1.find(c1);
            const last = s2.find(c3);
            if (!first || !mid || !last) throw new Error(`“${c1}${c2}${c3}” contains a letter that is not in the squares.`);
            out += s1.at(mid.row, first.col) + s2.at(last.row, mid.col);
        }
        return out;
    }
    // Odd letters are completed with a filler taken from the second square.
    const stream = letters.slice();
    if (stream.length % 2) stream.push(fill);
    const out = [];
    for (let i = 0; i < stream.length; i += 2) {
        const a = stream[i];
        const b = stream[i + 1];
        const pa = s1.find(a);
        const pb = s2.find(b);
        if (!pa || !pb) throw new Error(`“${!pa ? a : b}” is not in the plaintext squares.`);
        const middle = s3.at(pa.row, pb.col);
        // The first ciphertext letter only has to share the column of the first
        // plaintext letter and the third only the row of the second; the first
        // letter of that column and of that row keep the output reproducible.
        out.push(s1.at(0, pa.col) + middle + s2.at(pb.row, 0));
    }
    return out.join("");
}

/* ------------------------------------------------------------ trifid
 * A 27-character cube. Each letter becomes three coordinates, the coordinates of a
 * group are read by rows and cut into new triplets, and each triplet names the
 * ciphertext letter.
 */
function trifidCube(alphabet) {
    const alpha = String(alphabet == null || alphabet === "" ? CF_ALPHABET + "_" : alphabet).toUpperCase();
    if (alpha.length !== 27) {
        throw new Error("The trifid alphabet needs exactly 27 characters (A-Z plus a separator).");
    }
    return alpha;
}
function trifidFromTriple(alpha, triple) {
    const idx = triple[0] * 9 + triple[1] * 3 + triple[2];
    return alpha[idx];
}
function trifidCoordinates(alpha, ch) {
    const idx = alpha.indexOf(ch);
    if (idx < 0) throw new Error(`“${ch}” is not in the trifid alphabet.`);
    return [Math.floor(idx / 9), Math.floor(idx / 3) % 3, idx % 3];
}
function trifidRun(text, period, alphabet, decode) {
    const alpha = trifidCube(alphabet);
    const size = Math.max(1, Math.round(cfNumber(period, 5)));
    const letters = String(text == null ? "" : text).toUpperCase().split("").filter(ch => alpha.includes(ch));
    if (!letters.length) return "";
    let out = "";
    for (let i = 0; i < letters.length; i += size) {
        const group = letters.slice(i, i + size);
        const n = group.length;
        const coords = group.map(ch => trifidCoordinates(alpha, ch));
        let rebuilt;
        if (decode) {
            // The ciphertext letters carry their coordinates in reading order, so put
            // them back into three rows of N before reading the original letters.
            const flat = coords.map(triple => triple.join("")).join("");
            const rows = [flat.slice(0, n), flat.slice(n, n * 2), flat.slice(n * 2)];
            rebuilt = group.map((_, k) => [Number(rows[0][k]), Number(rows[1][k]), Number(rows[2][k])]);
        } else {
            const rows = [[], [], []];
            for (const triple of coords) {
                rows[0].push(triple[0]);
                rows[1].push(triple[1]);
                rows[2].push(triple[2]);
            }
            const flat = rows[0].concat(rows[1], rows[2]).join("");
            rebuilt = cfChunks(flat, 3).map(digits => String(digits).split("").map(Number));
        }
        out += rebuilt.map(triple => trifidFromTriple(alpha, triple)).join("");
    }
    return out;
}

/* ------------------------------------------------------------ Pollux
 * Morse symbols are hidden in pools of characters: one pool for dots, one for
 * dashes and one for the Morse letter separator. dCode chooses a random character
 * from the pool, this recreation takes the first one so the output is stable.
 */
var CF_POLLUX_POOLS = {
    "Alphanumeric pools": {dot: "0378AEFMOPQXYZ", dash: "145BCGJNRTW", space: "269DHIKLSUV"},
    "Numeric pools": {dot: "047", dash: "158", space: "2369"}
};
function polluxRun(text, poolName, decode) {
    const pools = CF_POLLUX_POOLS[poolName] || CF_POLLUX_POOLS["Alphanumeric pools"];
    if (decode) {
        let morse = "";
        for (const ch of String(text == null ? "" : text)) {
            const up = ch.toUpperCase();
            if (pools.dot.includes(up)) morse += ".";
            else if (pools.dash.includes(up)) morse += "-";
            else if (pools.space.includes(up)) morse += " ";
            else if (/\s/.test(ch)) morse += " ";
        }
        return cfFromMorse(morse, " ", "  ");
    }
    const source = String(text == null ? "" : text).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!source) return "";
    const morse = cfToMorse(source, " ", "  ");
    let out = "";
    for (const ch of morse) {
        if (ch === ".") out += pools.dot[0];
        else if (ch === "-") out += pools.dash[0];
        else out += pools.space[0];
    }
    return out;
}
