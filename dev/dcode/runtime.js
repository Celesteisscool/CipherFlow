/* CipherFlow dCode runtime ----------------------------------------------------
 * Plain ES5/ES2015 helpers. This file is embedded verbatim at the top of the
 * generated worker module (see dev/dcode/payload.mjs), so every `run` function in
 * dev/dcode/ops-*.mjs can call these by name. Keep it dependency-free and free of
 * imports: the same text is evaluated inside the CyberChef worker and inside the
 * Node self-test.
 *
 * Conventions shared by every cipher in this directory:
 *   - The transform is applied to A-Z only. Letters are folded to upper case, the
 *     case of the source character is restored on output.
 *   - Characters that are not letters are copied through untouched and do NOT
 *     advance the key (this is the usual "keep the key aligned to the message"
 *     behaviour of classical cipher tools).
 *   - `cfMapLetters` implements exactly that; `cfWalk` does the same for the
 *     numeric ciphers that transform digits.
 */

var CF_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function cfMod(n, m) {
    return ((n % m) + m) % m;
}

function cfIndex(letter) {
    return String(letter).toUpperCase().charCodeAt(0) - 65;
}

function cfLetter(index) {
    return CF_ALPHABET[cfMod(index, 26)];
}

function cfIsLetter(ch) {
    return ch.length === 1 && /[A-Za-z]/.test(ch);
}

// Restore the source case on a single-character replacement.
function cfApplyCase(source, replacement) {
    if (typeof replacement !== "string" || replacement.length !== 1) return replacement;
    if (source === source.toLowerCase()) return replacement.toLowerCase();
    return replacement.toUpperCase();
}

// Walk the text, calling fn(letterIndex, letterPosition) for every letter.
function cfMapLetters(text, fn) {
    let out = "";
    let pos = 0;
    for (const ch of String(text)) {
        if (cfIsLetter(ch)) {
            const rep = fn(cfIndex(ch), pos);
            out += rep == null ? ch : cfApplyCase(ch, rep);
            pos++;
        } else {
            out += ch;
        }
    }
    return out;
}

// Same walk, but fn also receives the original character, and the replacement is
// used verbatim (used by the ciphers that emit digits or multi-character tokens).
function cfWalk(text, fn) {
    let out = "";
    let pos = 0;
    for (const ch of String(text)) {
        if (cfIsLetter(ch)) {
            const rep = fn(ch, cfIndex(ch), pos);
            out += rep == null ? ch : rep;
            pos++;
        } else {
            out += ch;
        }
    }
    return out;
}

// Repeat the key over the letters of the text (non-letters do not consume key).
function cfKeyLetters(key) {
    return String(key == null ? "" : key).toUpperCase().split("").filter(cfIsLetter);
}

// Key letter at message position, or null when the key is empty.
function cfKeyAt(keyLetters, pos) {
    if (!keyLetters.length) return null;
    return keyLetters[pos % keyLetters.length];
}

// Keyword alphabet: keyword letters first (deduplicated), then the rest of the
// alphabet in order. `merge` is a "from>to" pair such as "J>I", applied to both.
function cfKeyedAlphabet(keyword, alphabet, merge) {
    let alpha = String(alphabet || CF_ALPHABET).toUpperCase();
    if (merge) {
        const [from, to] = String(merge).toUpperCase().split(">");
        alpha = alpha.split("").filter(c => c !== from).join("");
        keyword = String(keyword || "").toUpperCase().split("").filter(c => c !== from).join("");
    }
    const seen = new Set();
    let out = "";
    for (const ch of (String(keyword || "").toUpperCase() + alpha)) {
        if (!alpha.includes(ch) || seen.has(ch)) continue;
        seen.add(ch);
        out += ch;
    }
    for (const ch of alpha) if (!seen.has(ch)) out += ch;
    return out;
}

// Square built from a keyed alphabet, row-major. Returns null when the alphabet
// length is not a perfect square of the requested size.
function cfSquare(alphabet, size) {
    const alpha = String(alphabet);
    if (alpha.length !== size * size) return null;
    return {
        size,
        alphabet: alpha,
        rows: Array.from({length: size}, (_, r) => alpha.slice(r * size, r * size + size)),
        at(r, c) {
            return alpha[cfMod(r, size) * size + cfMod(c, size)];
        },
        find(ch) {
            const idx = alpha.indexOf(String(ch).toUpperCase());
            if (idx < 0) return null;
            return {row: Math.floor(idx / size), col: idx % size};
        }
    };
}

// Polybius-style square with digits starting at `base` (1 for the classic 1-5).
function cfPolybius(alphabet, size, base) {
    const sq = cfSquare(alphabet, size);
    if (!sq) return null;
    const b = base == null ? 1 : base;
    return {
        square: sq,
        digits(ch) {
            const pos = sq.find(ch);
            return pos ? [pos.row + b, pos.col + b] : null;
        },
        letter(row, col) {
            const r = row - b;
            const c = col - b;
            if (r < 0 || c < 0 || r >= sq.size || c >= sq.size) return null;
            return sq.at(r, c);
        }
    };
}

// Stable column order from a keyword: "CODE" -> [1, 3, 0, 2] (C, D, E, O).
function cfKeyOrder(keyword) {
    const letters = String(keyword || "").toUpperCase().split("");
    return letters
        .map((ch, i) => ({ch, i}))
        .sort((a, b) => (a.ch === b.ch ? a.i - b.i : a.ch < b.ch ? -1 : 1))
        .map(entry => entry.i);
}

function cfChars(text) {
    return String(text).split("");
}

// Split into chunks of n characters (last chunk may be short).
function cfChunks(text, n) {
    const s = String(text);
    const out = [];
    for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
    return out;
}

function cfPad(text, multiple, filler) {
    const s = String(text);
    const fill = filler == null || filler === "" ? "" : filler;
    if (!fill || !multiple) return s;
    let out = s;
    while (out.length % multiple !== 0) out += fill;
    return out;
}

// Grid helpers used by the transposition ciphers.
function cfFillRows(text, width, filler) {
    const padded = cfPad(text, width, filler == null ? "X" : filler);
    const rows = [];
    for (let i = 0; i < padded.length; i += width) rows.push(cfChars(padded.slice(i, i + width)));
    return rows;
}

function cfReadColumns(rows, order) {
    const width = rows.length ? rows[0].length : 0;
    let out = "";
    for (const col of order) {
        for (const row of rows) {
            if (col < row.length && row[col] != null && row[col] !== "") out += row[col];
        }
    }
    return out;
}

// Standard 5x5 alphabet: the Latin alphabet with one letter merged away.
function cfMergeAlphabet(merge) {
    // cfMergeFrom also understands "Z omitted", where no letter is folded in.
    const from = cfMergeFrom(merge);
    return CF_ALPHABET.split("").filter(c => c !== from).join("");
}

// Morse table: letters and digits only (the ciphers that need Morse use this).
var CF_MORSE = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
    I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
    Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..",
    "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
    "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----."
};

function cfToMorse(text, letterSep, wordSep) {
    const ls = letterSep == null ? "|" : letterSep;
    const ws = wordSep == null ? "||" : wordSep;
    const words = String(text).toUpperCase().split(/\s+/).filter(Boolean);
    return words.map(word => word.split("").map(ch => CF_MORSE[ch] || "").join(ls)).join(ws);
}

function cfFromMorse(code, letterSep, wordSep) {
    const ls = letterSep == null ? "|" : letterSep;
    const ws = wordSep == null ? "||" : wordSep;
    const reverse = {};
    for (const [ch, seq] of Object.entries(CF_MORSE)) reverse[seq] = ch;
    return String(code).trim().split(ws).map(word =>
        word.split(ls).map(seq => reverse[seq.trim()] || "").join("")
    ).join(" ");
}

// Options helper: read a dropdown argument, falling back to its default.
function cfOption(value, allowed, fallback) {
    const v = String(value == null ? "" : value);
    for (const option of allowed) if (option.toLowerCase() === v.toLowerCase()) return option;
    return fallback;
}

function cfChar(value, fallback) {
    const v = String(value == null ? "" : value);
    return v.length ? v[0] : fallback;
}

function cfNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

// Parse "1,2,3" / "1 2 3" / "123" into a list of numbers (single digits by default).
function cfNumbers(value, mode) {
    const raw = String(value == null ? "" : value).trim();
    if (!raw) return [];
    if (mode === "tokens") {
        return raw.split(/[^0-9]+/).filter(Boolean).map(Number);
    }
    return raw.replace(/[^0-9]/g, "").split("").map(Number);
}

// Position of every character that is a letter, used by the layout ciphers.
function cfLetterCount(text) {
    let n = 0;
    for (const ch of String(text)) if (cfIsLetter(ch)) n++;
    return n;
}

// The periodic table, used by the element cipher and the Magic scorer's hints.
var CF_ELEMENTS = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
    "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr",
    "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce",
    "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt",
    "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf",
    "Es", "Fm", "Md", "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"];

/* ---------------------------------------------------------- cipher families */
/* ---------------------------------------------------------------- Porta
 * 13 reversible alphabets selected by the key letter pair (AB, CD, ... YZ).
 * Row k's first half is "NOPQRSTUVWXYZ" rotated (dCode default: right, ACA: left);
 * the second half is always "ABCDEFGHIJKLM". Every row is an involution, so the
 * decoder is the encoder.
 */
function portaRow(k, variant) {
    const base = "NOPQRSTUVWXYZ";
    const rot = ((variant === "ACA variant" ? k : -k) % 13 + 13) % 13;
    const first = base.slice(rot) + base.slice(0, rot);
    return first + "ABCDEFGHIJKLM";
}
function portaRun(input, args, variant, decode) {
    const key = cfKeyLetters(args[0]);
    if (!key.length) throw new Error("Provide a key made of letters.");
    return cfMapLetters(input, (p, pos) => {
        const row = portaRow(Math.floor(cfIndex(key[pos % key.length]) / 2), variant);
        // dCode's default alphabet set is not involutive, so decoding looks the
        // ciphertext letter up in the row instead of indexing it.
        return decode ? cfLetter(row.indexOf(cfLetter(p))) : row[p];
    });
}

/* ---------------------------------------------------------------- Beaufort family
 * Beaufort:        C = (K - P) mod 26   (reciprocal)
 * Variant Beaufort: C = (P - K) mod 26  (decode adds the key back)
 */
function beaufortRun(input, args) {
    const key = cfKeyLetters(args[0]);
    if (!key.length) throw new Error("Provide a key made of letters.");
    return cfMapLetters(input, (p, pos) => cfLetter(cfIndex(key[pos % key.length]) - p));
}
function variantBeaufortRun(input, args, decode) {
    const key = cfKeyLetters(args[0]);
    if (!key.length) throw new Error("Provide a key made of letters.");
    return cfMapLetters(input, (p, pos) => cfLetter(decode ? p + cfIndex(key[pos % key.length]) : p - cfIndex(key[pos % key.length])));
}

/* ---------------------------------------------------------------- Gronsfeld
 * Vigenere with a numeric key: shift forward by the digit to encode.
 */
function gronsfeldRun(input, args, decode) {
    const digits = cfNumbers(args[0]);
    if (!digits.length) throw new Error("Provide a numeric key, for example 1234.");
    return cfMapLetters(input, (p, pos) => cfLetter(decode ? p - digits[pos % digits.length] : p + digits[pos % digits.length]));
}

/* ---------------------------------------------------------------- Autoclave (Vigenere autokey)
 * Keystream = initial key followed by the plaintext itself.
 */
function autoclaveRun(input, args, decode) {
    const key = cfKeyLetters(args[0]);
    if (!key.length) throw new Error("Provide an initial key made of letters.");
    let stream = key.slice();
    let seen = 0;
    return cfMapLetters(input, (p, pos) => {
        const k = stream[pos];
        if (k === undefined) throw new Error("The initial key must be shorter than the text.");
        const shift = cfIndex(k);
        const outIndex = decode ? p - shift : p + shift;
        const letter = cfLetter(outIndex);
        // Autokey: the keystream continues with the plaintext, not the ciphertext.
        stream.push(decode ? letter : cfLetter(p));
        seen++;
        return letter;
    });
}

/* ---------------------------------------------------------------- Trithemius / progressive Caesar
 * Shift the i-th letter by (start + i * increment).
 */
function progressiveRun(input, args, decode, useStart) {
    const inc = cfNumber(args[0], 1);
    const start = useStart ? cfNumber(args[1], 0) : 0;
    return cfMapLetters(input, (p, pos) => {
        const shift = start + pos * inc;
        return cfLetter(decode ? p - shift : p + shift);
    });
}

/* ---------------------------------------------------------------- Multiplicative
 * C = P * k mod 26; decode multiplies by the modular inverse of k.
 */
function modInverse(a, m) {
    a = cfMod(a, m);
    for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x;
    return null;
}
function multiplicativeRun(input, args, decode) {
    const k = cfNumber(args[0], 5);
    if (decode) {
        const inv = modInverse(k, 26);
        if (inv == null) throw new Error(`The key ${k} has no inverse modulo 26, so it cannot be decoded. Use a key that is coprime with 26.`);
        return cfMapLetters(input, p => cfLetter(p * inv));
    }
    return cfMapLetters(input, p => cfLetter(p * k));
}

/* ---------------------------------------------------------------- Vigenere multiplicative
 * Numbers only: the message numbers are multiplied by the key numbers, cycled.
 */
function vigenereMultiplicativeRun(input, args, decode) {
    const sep = args[2] || ",";
    const message = String(input).split(/[^0-9]+/).filter(Boolean).map(Number);
    const key = String(args[0] == null ? "" : args[0]).split(/[^0-9]+/).filter(Boolean).map(Number);
    if (!message.length) throw new Error("Give a list of numbers to multiply, for example 4,3,15,4,5.");
    if (!key.length) throw new Error("Give a numeric key, for example 11,5,25.");
    const out = message.map((n, i) => {
        const k = key[i % key.length];
        if (decode) {
            if (k === 0) throw new Error("A zero in the key cannot be divided by.");
            const q = n / k;
            if (!Number.isInteger(q)) throw new Error(`${n} is not divisible by ${k}, so the key does not fit this ciphertext.`);
            return q;
        }
        return n * k;
    });
    return out.join(sep);
}

/* ---------------------------------------------------------------- Vernam / one-time pad
 * Letter-wise addition modulo 26 with a key at least as long as the message.
 */
function vernamRun(input, args, decode) {
    const key = cfKeyLetters(args[0]);
    const letters = cfLetterCount(input);
    if (!key.length) throw new Error("Provide a key made of letters.");
    if (key.length < letters) throw new Error(`A one-time pad key must be at least as long as the message (${letters} letters needed, ${key.length} given).`);
    return cfMapLetters(input, (p, pos) => cfLetter(decode ? p - cfIndex(key[pos]) : p + cfIndex(key[pos])));
}

/* ---------------------------------------------------------------- Chaocipher
 * Two 26-letter alphabets (left = cipher, right = plain). After every letter both
 * alphabets are permuted: rotate the used letter to the front, then take the
 * letter at position 2 (left) / 3 (right) and reinsert it at position 14.
 */
function chaocipherPermuteLeft(alpha, letter) {
    const idx = alpha.indexOf(letter);
    let arr = alpha.slice(idx) + alpha.slice(0, idx);
    const moved = arr[1];
    arr = arr.slice(0, 1) + arr.slice(2);
    return arr.slice(0, 13) + moved + arr.slice(13);
}
function chaocipherPermuteRight(alpha, letter) {
    const idx = alpha.indexOf(letter);
    const rotate = (idx + 1) % 26;
    let arr = alpha.slice(rotate) + alpha.slice(0, rotate);
    const moved = arr[2];
    arr = arr.slice(0, 2) + arr.slice(3);
    return arr.slice(0, 13) + moved + arr.slice(13);
}
function chaocipher(input, args, decode) {
    const left = String(args[0] || "").toUpperCase();
    const right = String(args[1] || "").toUpperCase();
    const valid = a => a.length === 26 && new Set(a).size === 26 && /^[A-Z]+$/.test(a);
    if (!valid(left) || !valid(right)) throw new Error("Both alphabets must be 26 different letters.");
    let l = left;
    let r = right;
    return cfMapLetters(input, ch => {
        const out = decode ? r[l.indexOf(cfLetter(ch))] : l[r.indexOf(cfLetter(ch))];
        l = chaocipherPermuteLeft(l, decode ? cfLetter(ch) : out);
        r = chaocipherPermuteRight(r, decode ? out : cfLetter(ch));
        return out;
    });
}

/* ---------------------------------------------------------------- Solitaire
 * Schneier's deck keystream. Card values 1-52 (clubs to spades) plus two jokers
 * worth 53. Deck default is the ordered deck "1..52, A, B".
 */
/* The two jokers are tracked separately (53 = A, 54 = B) because the moves refer
 * to them by name, but both count as 53 when a card value is needed. */
function solitaireDeck(value) {
    const cards = String(value || "").split(/[^0-9A-Za-z]+/).filter(Boolean).map(t => {
        if (/^[Aa]$/.test(t)) return 53;
        if (/^[Bb]$/.test(t)) return 54;
        const n = Number(t);
        return Number.isFinite(n) && n >= 1 && n <= 52 ? n : NaN;
    });
    if (cards.length !== 54 || cards.some(Number.isNaN)) {
        throw new Error("The deck must list 52 cards (1-52) and two jokers (A and B).");
    }
    if (cards.filter(c => c === 53).length !== 1 || cards.filter(c => c === 54).length !== 1) {
        throw new Error("The deck needs exactly one A joker and one B joker.");
    }
    return cards;
}
function solitaireCardValue(card) {
    return card >= 53 ? 53 : card;
}
// Move a joker one position down; from the bottom it wraps to just below the top
// card. Each of the "down two" moves is made as two of these single steps.
function solitaireStepDown(deck, joker) {
    const idx = deck.indexOf(joker);
    const card = deck.splice(idx, 1)[0];
    const target = idx + 1 > deck.length ? 1 : idx + 1;
    deck.splice(target, 0, card);
}
function solitaireStep(deck) {
    // 1. Joker A down one, joker B down two.
    solitaireStepDown(deck, 53);
    solitaireStepDown(deck, 54);
    solitaireStepDown(deck, 54);
    // 2. Triple cut: everything above the topmost joker swaps with everything
    //    below the bottommost one.
    const jokers = [];
    deck.forEach((c, i) => { if (c >= 53) jokers.push(i); });
    const top = jokers[0];
    const bottom = jokers[jokers.length - 1];
    const cut = deck.slice(bottom + 1).concat(deck.slice(top, bottom + 1), deck.slice(0, top));
    deck.length = 0;
    deck.push(...cut);
    // 3. Count cut: the bottom card's value says how many cards move from the top
    //    to just above the bottom card.
    const countValue = solitaireCardValue(deck[deck.length - 1]);
    const moved = deck.splice(0, countValue);
    deck.splice(deck.length - 1, 0, ...moved);
    // 4. Output card: count down from the top card (which counts as one).
    const wanted = deck[solitaireCardValue(deck[0])];
    if (wanted == null || solitaireCardValue(wanted) === 53) return null;
    return wanted > 26 ? wanted - 26 : wanted;
}
function solitaireKeystream(value, length) {
    const deck = solitaireDeck(value);
    const stream = [];
    let guard = 0;
    while (stream.length < length) {
        if (++guard > 20000) throw new Error("The deck did not produce enough keystream values.");
        const step = solitaireStep(deck);
        if (step != null) stream.push(step);
    }
    return stream;
}
function solitaireRun(input, args, decode) {
    const letters = cfLetterCount(input);
    const stream = solitaireKeystream(args[0], letters);
    // Keystream values are 1-26 (A = 1); cfLetter takes a zero-based index, so the
    // shift is applied directly to the letter index.
    return cfMapLetters(input, (p, pos) => cfLetter(decode ? p - stream[pos] : p + stream[pos]));
}


