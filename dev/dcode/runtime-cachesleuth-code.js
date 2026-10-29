/* CacheSleuth text code helpers ------------------------------------------------
 * Local reimplementations of the text-only Code Tools on cachesleuth.com.
 * The site is not embedded or fetched: the tables below are the published
 * alphabets, transcribed so the worker can run them offline.
 *
 * Conventions:
 *   - codes that use space-separated groups keep that spacing on encode;
 *   - fixed-width codes (Backslash, Spirit DVD) are written as one stream;
 *   - unknown characters are skipped or marked with "?" as the site does.
 */

/* ------------------------------------------------------------ Abaddon */
var CS_CODE_ABADDON = [
    "¥¥µ", "¥þ¥", "þµµ", "µµþ", "µ¥µ", "µµ¥", "µþþ", "þµ¥", "¥¥¥",
    "µþµ", "¥þµ", "µ¥¥", "þ¥¥", "¥¥þ", "þþþ", "þþ¥", "¥þþ", "þþµ",
    "þµþ", "þ¥µ", "µµµ", "¥µ¥", "µþ¥", "µ¥þ", "¥µþ", "þ¥þ"
];
function csAbaddonRun(text, decode) {
    if (decode) {
        const map = new Map(CS_CODE_ABADDON.map((code, i) => [code, CF_ALPHABET[i]]));
        map.set("¥µµ", " ");
        return String(text).split(/\s+/).filter(Boolean).map(code => map.get(code) || "?").join("");
    }
    return String(text).toUpperCase().split("").map(ch => {
        if (ch === " ") return "¥µµ";
        const i = CF_ALPHABET.indexOf(ch);
        return i < 0 ? "?" : CS_CODE_ABADDON[i];
    }).join(" ");
}

/* ------------------------------------------------------------ Backslash */
var CS_CODE_BACKSLASH = String.raw`||| ||/ ||\ |/| |// |/\ |\| |\/ |\\ /|| /|/ /|\ //| /// //\ /\| /\/ /\\ \|| \|/ \|\ \/| \// \/\ \\| \\/`.split(" ");
function csBackslashRun(text, decode) {
    if (decode) {
        const map = new Map(CS_CODE_BACKSLASH.map((code, i) => [code, CF_ALPHABET[i]]));
        const clean = String(text).replace(/\s+/g, "");
        let out = "";
        for (let i = 0; i + 3 <= clean.length; i += 3) out += map.get(clean.slice(i, i + 3)) || "?";
        return out;
    }
    let out = "";
    for (const ch of String(text).toUpperCase()) {
        const i = CF_ALPHABET.indexOf(ch);
        if (i >= 0) out += CS_CODE_BACKSLASH[i];
    }
    return out;
}

/* ------------------------------------------------------------ Chinese code */
var CS_CODE_CHINESE = [
    "-", "|", "|-", "||-", "--", "|--", "||--", "|||--", "---", "|---",
    "||---", "|||---", "||||---", "----", "|----", "||----", "|||----",
    "||||----", "|||||----", "-----", "|-----", "||-----", "|||-----",
    "------", "|------", "||------"
];
function csChineseRun(text, decode) {
    if (decode) {
        const map = new Map(CS_CODE_CHINESE.map((code, i) => [code, CF_ALPHABET[i]]));
        return String(text).split(/\s+/).filter(Boolean).map(code => map.get(code) || "?").join("");
    }
    let out = [];
    for (const ch of String(text).toUpperCase()) {
        const i = CF_ALPHABET.indexOf(ch);
        if (i >= 0) out.push(CS_CODE_CHINESE[i]);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Slash and pipe */
var CS_CODE_SLASH = String.raw`| |\ || |/ \ ||\ ||| \\ / |\\ //|| |\/ |\| |/| ||/| |\|\ /\\ \/ /| |// // ||\\ \/|| ||/ |||\ ||||`.split(" ");
function csSlashPipeRun(text, decode) {
    if (decode) {
        const map = new Map(CS_CODE_SLASH.map((code, i) => [code, CF_ALPHABET[i]]));
        return String(text).split(/\s+/).filter(Boolean).map(code => map.get(code) || "?").join("");
    }
    const out = [];
    for (const ch of String(text).toUpperCase()) {
        const i = CF_ALPHABET.indexOf(ch);
        if (i >= 0) out.push(CS_CODE_SLASH[i]);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Spirit DVD */
var CS_CODE_SPIRIT = [
    "-|-", "|-|||-", "||-||-", "||-|--", "--|", "|-|-|-", "|-|-||", "||--||",
    "||---|", "|-||||-|-", "|-||||--|", "||-|-|", "|-|---", "||--|-", "-||",
    "|-||-|", "|-|||||--", "|--", "|||", "||----", "||-|||", "|-||||---",
    "|-|--|", "|-||||-||", "|-||--", "|-|||||-|"
];
function csSpiritRun(text, decode) {
    if (decode) {
        const pairs = CS_CODE_SPIRIT.map((code, i) => [code, CF_ALPHABET[i]])
            .sort((a, b) => b[0].length - a[0].length);
        const source = String(text).replace(/\s+/g, "");
        let out = "";
        for (let i = 0; i < source.length;) {
            let hit = "";
            for (const [code, letter] of pairs) {
                if (source.startsWith(code, i)) { hit = letter; i += code.length; break; }
            }
            out += hit || "?";
            if (!hit) i++;
        }
        return out;
    }
    let out = "";
    for (const ch of String(text).toUpperCase()) {
        const i = CF_ALPHABET.indexOf(ch);
        if (i >= 0) out += CS_CODE_SPIRIT[i];
    }
    return out;
}

/* ------------------------------------------------------------ Decabit */
var CS_CODE_DECABIT = [
    "++-+++----", "++++--+---", "+--++++---", "-+-++++---", "++-+--+-+-",
    "-++---+++-", "+---+-+++-", "--+-+-+++-", "+----++++-", "--+--++++-",
    "+++---+-+-", "+-++---++-", "+--+--+++-", "--++--+++-", "+-+---+-++",
    "-+++--+-+-", "-+-++-+-+-", "-+++---++-", "-+-++--++-", "-+---++++-",
    "-++++--+--", "-++-++-+--", "--++++-+--", "--++-+++--", "--++-+-++-",
    "+-++++----", "++--+--++-", "+--+-+-++-", "++++----+-", "++-++---+-",
    "+-+++---+-", "-++++---+-", "+-+-+---++", "+++-++----", "+++-+-+---",
    "+-+-+--++-"
];
function csDecabitRun(text, decode) {
    if (decode) {
        const map = new Map(CS_CODE_DECABIT.map((code, i) => [code, i < 26 ? CF_ALPHABET[i] : String(i - 26)]));
        return String(text).split(/\s+/).filter(Boolean).map(code => map.get(code) || "?").join("");
    }
    const out = [];
    for (const ch of String(text).toUpperCase()) {
        const i = CF_ALPHABET.indexOf(ch);
        const n = i >= 0 ? i : (ch >= "0" && ch <= "9" ? 26 + Number(ch) : -1);
        if (n >= 0) out.push(CS_CODE_DECABIT[n]);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Quadoo */
var CS_CODE_QUADOO = [
    "25", "1235", "35", "235", "134", "14", "16", "24", "5", "23",
    "345", "34", "1245", "246", "1234", "145", "12346", "146", "36", "12",
    "234", "45", "2345", "56", "236", "135",
    "12345", "2", "123", "125", "156", "136", "1346", "15", "1356", "1236"
];
function csQuadooRun(text, decode) {
    if (decode) {
        const map = new Map(CS_CODE_QUADOO.map((code, i) => [code, i < 26 ? CF_ALPHABET[i] : String(i - 26)]));
        return String(text).split(/\s+/).filter(Boolean).map(code => map.get(code) || "?").join("");
    }
    const out = [];
    for (const ch of String(text).toUpperCase()) {
        const i = CF_ALPHABET.indexOf(ch);
        const n = i >= 0 ? i : (ch >= "0" && ch <= "9" ? 26 + Number(ch) : -1);
        if (n >= 0) out.push(CS_CODE_QUADOO[n]);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Seven-segment */
var CS_CODE_SEG7 = [
    "ABCEFG", "CDEFG", "ADEF", "BCDEG", "ADEFG", "AEFG", "ACDEF", "BCEFG",
    "EF", "BCD", "ACEFG", "DEF", "ACEG", "ABCEF", "CDEG", "ABEFG", "ABCFG",
    "EG", "DEFG", "BCDEF", "BEFG", "BDFG", "BCEF", "BCDFG", "ABDE", "ABCDEF",
    "ABCDEF", "BC", "ABDEG", "ABCDG", "BCFG", "ACDFG", "ACDEFG", "ABC",
    "ABCDEFG", "ABCDFG"
];
function csSegmentRun(text, decode) {
    if (decode) {
        const map = new Map(CS_CODE_SEG7.map((code, i) => [code, i < 26 ? CF_ALPHABET[i] : String(i - 26)]));
        return String(text).split(/\s+/).filter(Boolean).map(code => map.get(code) || "?").join("");
    }
    const out = [];
    for (const ch of String(text).toUpperCase()) {
        const i = CF_ALPHABET.indexOf(ch);
        const n = i >= 0 ? i : (ch >= "0" && ch <= "9" ? 26 + Number(ch) : -1);
        if (n >= 0) out.push(CS_CODE_SEG7[n]);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ DTMF */
var CS_DTMF = {
    "1": [697, 1209], "2": [697, 1336], "3": [697, 1477], "A": [697, 1633],
    "4": [770, 1209], "5": [770, 1336], "6": [770, 1477], "B": [770, 1633],
    "7": [852, 1209], "8": [852, 1336], "9": [852, 1477], "C": [852, 1633],
    "*": [941, 1209], "0": [941, 1336], "#": [941, 1477], "D": [941, 1633]
};
function csDtmfRun(text, decode) {
    if (decode) {
        const inverse = new Map(Object.entries(CS_DTMF).map(([ch, pair]) => [pair.join(" "), ch]));
        const digits = String(text).trim().split(/\s+/).filter(Boolean);
        let out = "";
        for (let i = 0; i + 1 < digits.length; i += 2) out += inverse.get(digits[i] + " " + digits[i + 1]) || "?";
        return out;
    }
    const out = [];
    for (const ch of String(text).toUpperCase()) {
        const pair = CS_DTMF[ch];
        if (pair) out.push(pair[0], pair[1]);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Dvorak / Qwerty */
var CS_QWERTY_ROWS = ["`1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./"];
var CS_DVORAK_ROWS = ["`1234567890[]", "',.pyfgcrl/=\\", "aoeuidhtns-", ";qjkxbmwvz"];
function csKeyboardSwap(text, fromRows, toRows) {
    let out = "";
    for (const ch of String(text)) {
        const lower = ch.toLowerCase();
        let hit = ch;
        for (let r = 0; r < fromRows.length; r++) {
            const at = fromRows[r].indexOf(lower);
            if (at >= 0) { hit = toRows[r][at] || lower; break; }
        }
        out += ch !== lower ? hit.toUpperCase() : hit;
    }
    return out;
}
function csDvorakRun(text, decode) {
    return decode
        ? csKeyboardSwap(text, CS_DVORAK_ROWS, CS_QWERTY_ROWS)
        : csKeyboardSwap(text, CS_QWERTY_ROWS, CS_DVORAK_ROWS);
}

/* ------------------------------------------------------------ Qwerty coordinates */
var CS_QWERTY_LETTER_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
var CS_QWERTY_BASES = ["Start at letters", "Start at numbers", "Start at functions"];
function csQwertyCoordRun(text, base, decode) {
    const start = Math.max(1, Math.min(3, cfOption(base, CS_QWERTY_BASES, CS_QWERTY_BASES[0]) === CS_QWERTY_BASES[2] ? 3 : (cfOption(base, CS_QWERTY_BASES, CS_QWERTY_BASES[0]) === CS_QWERTY_BASES[1] ? 2 : 1)));
    if (decode) {
        const map = new Map();
        CS_QWERTY_LETTER_ROWS.forEach((row, r) => {
            for (let c = 0; c < row.length; c++) map.set(String(start + r) + String(c + 2), row[c]);
        });
        return String(text).trim().split(/\s+/).filter(Boolean).map(code => (map.get(code) || "?").toUpperCase()).join("");
    }
    const out = [];
    for (const ch of String(text).toLowerCase()) {
        let hit = "";
        CS_QWERTY_LETTER_ROWS.forEach((row, r) => {
            const c = row.indexOf(ch);
            if (c >= 0) hit = String(start + r) + String(c + 2);
        });
        if (hit) out.push(hit);
        else if (/\s/.test(ch)) out.push(ch);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Qwerty shifter */
var CS_QWERTY_PLAIN = "1234567890qwertyuiopasdfghjklzxcvbnm";
var CS_QWERTY_FULL = "1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./";
function csQwertyShiftRun(text, direction, amount, specials, decode) {
    const line = specials ? CS_QWERTY_FULL : CS_QWERTY_PLAIN;
    let step = Math.round(cfNumber(amount, 1)) || 1;
    if (decode) step = -step;
    if (String(direction).toLowerCase().startsWith("left")) step = -step;
    let out = "";
    for (const ch of String(text)) {
        const lower = ch.toLowerCase();
        const at = line.indexOf(lower);
        if (at < 0) { out += ch; continue; }
        const replaced = line[cfMod(at + step, line.length)];
        out += ch !== lower ? replaced.toUpperCase() : replaced;
    }
    return out;
}

/* ------------------------------------------------------------ Letters and numbers
 * A=1 ... Z=26. Word gaps are written as two spaces; decoding accepts any
 * whitespace between tokens and turns 0 back into 0 rather than A.
 */
function csLettersRun(text, decode) {
    if (decode) {
        let out = "";
        for (const token of String(text).split(" ")) {
            if (token === "") { out += " "; continue; }
            const n = Number(token);
            out += n >= 1 && n <= 26 ? CF_ALPHABET[n - 1] : token;
        }
        return out.replace(/ +/g, " ").trim();
    }
    const out = [];
    for (const ch of String(text).toUpperCase()) {
        if (ch === " ") { out.push(" "); continue; }
        const i = CF_ALPHABET.indexOf(ch);
        if (i >= 0) out.push(String(i + 1));
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Vanity / phone keypad
 * mode 0 repeats the digit, mode 1 appends the key position, mode 2 is the raw
 * T9 key. Space is written as a lone 0 in every mode.
 */
var CS_VANITY_KEYS = {"2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL", "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ"};
function csVanityRun(text, mode, decode) {
    const kind = cfOption(mode, ["Repeated key presses", "Key + position", "T9 keys only"], "Repeated key presses");
    if (decode) {
        return String(text).trim().split(/\s+/).filter(Boolean).map(token => {
            if (token === "0") return " ";
            if (kind === "T9 keys only") return (CS_VANITY_KEYS[token[0]] || "?")[0] || "?";
            const key = token[0];
            const letters = CS_VANITY_KEYS[key];
            if (!letters) return "?";
            const pos = kind === "Key + position" ? Number(token.slice(1)) - 1 : token.length - 1;
            return letters[pos] || "?";
        }).join("");
    }
    const out = [];
    for (const ch of String(text).toUpperCase()) {
        if (ch === " ") { out.push("0"); continue; }
        let found = "";
        for (const [key, letters] of Object.entries(CS_VANITY_KEYS)) {
            const at = letters.indexOf(ch);
            if (at < 0) continue;
            found = kind === "Repeated key presses" ? key.repeat(at + 1) : (kind === "Key + position" ? key + String(at + 1) : key);
            break;
        }
        if (found) out.push(found);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Beghilos */
var CS_BEGHILOS = {"B": "8", "E": "3", "G": "9", "H": "4", "I": "1", "L": "7", "O": "0", "S": "5"};
var CS_BEGHILOS_REVERSE = {"8": "B", "3": "E", "9": "G", "6": "g", "4": "H", "1": "I", "7": "L", "0": "O", "5": "S"};
function csBeghilosRun(text, decode) {
    if (decode) return String(text).split("").reverse().map(ch => CS_BEGHILOS_REVERSE[ch] || "?").join("");
    return String(text).toUpperCase().split("").reverse().map(ch => CS_BEGHILOS[ch] || "?").join("");
}

/* ------------------------------------------------------------ Upside-down text */
var CS_FLIP = {
    "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ", "6": "9", "7": "ㄥ", "8": "8", "9": "6",
    "A": "∀", "B": "ᗺ", "C": "Ɔ", "D": "ᗡ", "E": "Ǝ", "F": "Ⅎ", "G": "⅁", "H": "H", "I": "I", "J": "ſ",
    "K": "⋊", "L": "⅂", "M": "W", "N": "N", "O": "O", "P": "Ԁ", "Q": "Ò", "R": "ᴚ", "S": "S", "T": "⊥",
    "U": "∩", "V": "Λ", "W": "M", "X": "X", "Y": "⅄", "Z": "Z",
    "a": "ɐ", "b": "q", "c": "ɔ", "d": "p", "e": "ǝ", "f": "ɟ", "g": "ƃ", "h": "ɥ", "i": "ᴉ", "j": "ɾ",
    "k": "ʞ", "l": "l", "m": "ɯ", "n": "u", "o": "o", "p": "d", "q": "b", "r": "ɹ", "s": "s", "t": "ʇ",
    "u": "n", "v": "ʌ", "w": "ʍ", "x": "x", "y": "ʎ", "z": "z",
    ".": "˙", ",": "'", "!": "¡", "?": "¿", "'": ",", "\"": "„", "(": ")", ")": "(",
    "[": "]", "]": "[", "{": "}", "}": "{", "<": "<", ">": ">", "_": "‾", "/": "/", "\\": "\\",
    "@": "@", "#": "#", "$": "$", "%": "%", "^": "^", "&": "⅋", "*": "*", "-": "-", "+": "+", "=": "="
};
var CS_FLIP_REVERSE = Object.fromEntries(Object.entries(CS_FLIP).map(([a, b]) => [b, a]));
function csUpsideDownRun(text, decode) {
    const map = decode ? CS_FLIP_REVERSE : CS_FLIP;
    return String(text).split("").reverse().map(ch => map[ch] || ch).join("");
}

/* ------------------------------------------------------------ Zalgo */
var CS_ZALGO_MARKS = ["\u0301", "\u0300", "\u0308", "\u0302", "\u0330", "\u0331", "\u0316", "\u0317"];
function csZalgoRun(text, intensity, decode) {
    if (decode) return String(text).replace(/[\u0300-\u036f\u0488\u0489\u20d0-\u20ff]/g, "");
    const levels = {mild: 1, medium: 3, wild: 8};
    const depth = levels[cfOption(intensity, Object.keys(levels), "medium")] || 3;
    let out = "";
    for (const ch of String(text)) {
        out += ch;
        if (/\s/.test(ch)) continue;
        for (let i = 0; i < depth; i++) out += CS_ZALGO_MARKS[(out.length + i) % CS_ZALGO_MARKS.length];
    }
    return out;
}

/* ------------------------------------------------------------ Spelling alphabet */
var CS_SPELLING = {
    "NATO / ICAO": "Alfa Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey X-ray Yankee Zulu",
    "APCO / Police": "Adam Boy Charles David Edward Frank George Henry Ida John King Lincoln Mary Nora Ocean Paul Queen Robert Sam Tom Union Victor William X-ray Young Zebra",
    "US Joint Army/Navy": "Able Baker Charlie Dog Easy Fox George How Item Jig King Love Mike Nan Oboe Peter Queen Roger Sugar Tare Uncle Victor William X-ray Yoke Zebra"
};
// The spellings people actually type: Alpha for Alfa, Juliet for Juliett, Whisky for
// Whiskey, and X-ray / Xray both strip to the same key. Only applied when the canonical
// word belongs to the selected alphabet, so one alphabet's spelling never leaks into another.
var CS_SPELLING_ALIASES = { "alpha": "alfa", "juliet": "juliett", "whisky": "whiskey" };
function csSpellingRun(text, alphabet, decode) {
    const name = cfOption(alphabet, Object.keys(CS_SPELLING), "NATO / ICAO");
    const words = CS_SPELLING[name].split(" ");
    if (decode) {
        const map = new Map(words.map((word, i) => [word.toLowerCase().replace(/[^a-z]/g, ""), CF_ALPHABET[i]]));
        const lookup = key => {
            if (map.has(key)) return map.get(key);
            const canonical = CS_SPELLING_ALIASES[key];
            return canonical && map.has(canonical) ? map.get(canonical) : null;
        };
        // A single space separates spelling words; a run of two or more is where the
        // original text had a space (CyberChef's Convert to NATO alphabet leaves the literal
        // space while spelling the letters around it, which is exactly this shape).
        const out = [];
        for (const part of String(text).trim().split(/(\s{2,})/)) {
            if (!part) continue;
            if (/^\s{2,}$/.test(part)) { out.push(" "); continue; }
            for (const word of part.split(/\s+/)) {
                if (!word) continue;
                if (/^\(space\)$/i.test(word)) { out.push(" "); continue; }
                const key = word.toLowerCase().replace(/[^a-z]/g, "");
                const exact = lookup(key);
                if (exact) { out.push(exact); continue; }
                // Hyphen-separated spellings (Hotel-Echo-Lima) are the same words with a
                // different separator; split only when every part resolves, so a stray hyphen
                // in prose cannot turn into a confident decode.
                const pieces = word.includes("-")
                    ? word.split("-").filter(Boolean).map(piece => lookup(piece.toLowerCase().replace(/[^a-z]/g, "")))
                    : [];
                out.push(pieces.length > 1 && pieces.every(Boolean) ? pieces.join("") : "?");
            }
        }
        return out.join("");
    }
    const out = [];
    for (const ch of String(text).toUpperCase()) {
        if (ch === " ") { out.push("(space)"); continue; }
        const i = CF_ALPHABET.indexOf(ch);
        if (i >= 0) out.push(words[i]);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Enclosed areas */
var CS_ENCLOSED = {"A": 1, "B": 2, "D": 1, "O": 1, "P": 1, "Q": 1, "R": 1, "a": 1, "b": 1, "d": 1, "e": 1, "g": 1, "o": 1, "p": 1, "q": 1, "0": 1, "6": 1, "8": 2, "9": 1};
function csEnclosedAreasRun(text, closedFour) {
    const openFour = String(closedFour).toLowerCase() === "open 4 = 0";
    let total = 0;
    const counts = [];
    for (const ch of String(text)) {
        let n = CS_ENCLOSED[ch] || 0;
        if (ch === "4") n = openFour ? 0 : 1;
        total += n;
        counts.push(n);
    }
    return counts.join(" ") + "\n\nGrand Total: " + total;
}

/* ------------------------------------------------------------ Baudot */
var CS_BAUDOT = {
    "Baudot-Murray (ITA2)": {
        letters: ["*NUL*", "E", "\n", "A", " ", "S", "I", "U", "\r", "D", "R", "J", "N", "F", "C", "K", "T", "Z", "L", "W", "H", "Y", "P", "Q", "O", "B", "G", "*FIGURES*", "M", "X", "V", "*LETTERS*"],
        figures: ["*NUL*", "3", "\n", "-", " ", "'", "8", "7", "\r", "*ENQUIRY*", "4", "*BELL*", ",", "!", ":", "(", "5", "+", ")", "2", "$", "6", "0", "1", "9", "?", "&", "*FIGURES*", ".", "/", ";", "*LETTERS*"],
        toLetters: "11111",
        toFigures: "11011"
    },
    "Baudot (ITA1)": {
        letters: ["*NUL*", "A", "E", "\r", "Y", "U", "I", "O", "*FIGURES*", "J", "G", "H", "B", "C", "F", "D", " ", "\n", "X", "Z", "S", "T", "W", "V", "*DEL*", "K", "M", "L", "R", "Q", "N", "P"],
        figures: ["*NUL*", "1", "2", "\r", "3", "4", "", "5", " ", "6", "7", "+", "8", "9", "", "0", "*LETTERS*", "\n", ",", ":", ".", "", "?", "'", "*DEL*", "(", ")", "=", "-", "/", "", "%"],
        toLetters: "10000",
        toFigures: "01000"
    }
};
function csBaudotBin(n) {
    return ("0000" + n.toString(2)).slice(-5);
}
function csBaudotRun(text, variant, decode) {
    const table = CS_BAUDOT[cfOption(variant, Object.keys(CS_BAUDOT), "Baudot-Murray (ITA2)")];
    if (decode) {
        const bits = String(text).replace(/[^01]/g, "");
        let figures = false;
        let out = "";
        for (let i = 0; i + 5 <= bits.length; i += 5) {
            const code = bits.slice(i, i + 5);
            if (code === table.toFigures) figures = true;
            else if (code === table.toLetters) figures = false;
            else out += (figures ? table.figures : table.letters)[parseInt(code, 2)] || "";
        }
        return out;
    }
    let figures = false;
    let out = "";
    let sep = "";
    for (const ch of String(text)) {
        const upper = ch.toUpperCase();
        let index = table.letters.indexOf(upper);
        if (index >= 0) {
            if (figures) { out += sep + table.toLetters; sep = " "; figures = false; }
            out += sep + csBaudotBin(index);
            sep = " ";
            continue;
        }
        index = table.figures.indexOf(upper);
        if (index >= 0) {
            if (!figures) { out += sep + table.toFigures; sep = " "; figures = true; }
            out += sep + csBaudotBin(index);
            sep = " ";
        }
    }
    return out;
}

/* ------------------------------------------------------------ GoldBug */
var CS_GOLDBUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
var CS_GOLDBUG_SYMBOLS = ["5", "2", "-", "\u2020", "8", "1", "3", "4", "6", ",", "7", "0", "9", "*", "\u2021", ".", "$", "(", ")", ";", "?", "\u00b6", "]", "\u00a2", ":", "["];
function csGoldbugRun(text, decode) {
    if (decode) {
        return String(text).split(" ").map(group => {
            let out = "";
            for (const ch of group) {
                const i = CS_GOLDBUG_SYMBOLS.indexOf(ch);
                out += i >= 0 ? CS_GOLDBUG_ALPHABET[i] : ch;
            }
            return out;
        }).join(" ");
    }
    let out = "";
    for (const ch of String(text)) {
        const i = CS_GOLDBUG_ALPHABET.indexOf(ch.toLowerCase());
        out += i >= 0 ? CS_GOLDBUG_SYMBOLS[i] : ch;
    }
    return out;
}

/* ------------------------------------------------------------ Hodor */
var CS_HODOR = {
    a: "HODOR", b: "Hodor!", c: "hodor", e: "hodor?", f: "HODOR!", g: "hodor!",
    i: "Hodor?", j: "HODOR?!", k: "hodor?!", l: "Hodor!?", m: "Hodor.", n: "HODOR?",
    p: "HODOR.", q: "Hodor!?!", s: "Hodor", t: "hodor.", u: "hodor!?", v: "Hodor?!",
    w: "HODOR!?", x: "Hodor?!?", y: "HODOR!?!", z: "hodor!?!", A: "hodor?!?",
    B: "HODOR-", C: "Hodor...", E: "HooodorrHodor", F: "hodor-", G: "HoOodoOorHodor",
    I: "HoOodoOorHODOR", J: "hodorHooodorr", K: "HodorHoOodoOor", L: "HooodorrHODOR",
    M: "HODOR...", N: "HoOodoOorhodor", P: "hodor...", Q: "HODORHoOodoOor", S: "HODOR?!?",
    T: "Hodor-", U: "HodorHooodorr", V: "HODORHooodorr", W: "Hooodorrhodor",
    X: "HoOodoOorHooodorrHODOR", Y: "hodorHoOodoOor", Z: "HoOodoOorHooodorrHodor"
};
var CS_HODOR_REVERSE = Object.fromEntries(Object.entries(CS_HODOR).map(([letter, word]) => [word, letter]));
function csHodorRun(text, decode) {
    if (decode) {
        const clean = String(text).replace(/[^HDORhdor!.\s?-]+/g, "");
        let out = "";
        for (const word of clean.split(/\s+/).filter(Boolean)) out += CS_HODOR_REVERSE[word] || "";
        return out;
    }
    let out = "";
    for (const ch of String(text).replace(/[HODRhodr]+/g, "")) {
        if (Object.prototype.hasOwnProperty.call(CS_HODOR, ch)) out += CS_HODOR[ch] + " ";
    }
    return out.trim();
}

/* ------------------------------------------------------------ Nak Nak */
var CS_NAK = {
    "0": "Nak", "1": "Nanak", "2": "Nananak", "3": "Nanananak", "4": "Nak?",
    "5": "nak?", "6": "Naknak", "7": "Naknaknak", "8": "Nak.", "9": "Naknak.",
    a: "Naknaknaknak", b: "nanak", c: "naknak", d: "nak!", e: "nak.", f: "naknaknak"
};
var CS_NAK_REVERSE = Object.fromEntries(Object.entries(CS_NAK).map(([digit, word]) => [word, digit]));
function csNakRun(text, decode) {
    if (decode) {
        const words = String(text).replace(/[^NAKnak!.\s?]+/g, "").trim().split(/\s+/).filter(Boolean);
        let out = "";
        for (let i = 0; i + 1 < words.length; i += 2) {
            const high = CS_NAK_REVERSE[words[i]];
            const low = CS_NAK_REVERSE[words[i + 1]];
            if (high !== undefined && low !== undefined) out += String.fromCharCode(parseInt(high + low, 16));
            else out += "[?" + [high === undefined ? words[i] : "", low === undefined ? words[i + 1] : ""].filter(Boolean).join(" ") + "?]";
        }
        return out;
    }
    const hex = String(text).split("").map(ch => ch.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    return hex.split("").map(ch => CS_NAK[ch] || "").filter(Boolean).join(" ");
}

/* ------------------------------------------------------------ Navajo code talkers */
var CS_NAVAJO = {
    A: [["Wol-La-Chee", "Ant"], ["Be-La-Sana", "Apple"], ["Tse-Nill", "Axe"]],
    B: [["Shush", "Bear"], ["Na-Hash-Chid", "Badger"], ["Toish-Jeh", "Barrel"]],
    C: [["Moasi", "Cat"], ["Tla-Gin", "Coal"], ["Ba-Goshi", "Cow"]],
    D: [["Be", "Deer"], ["Chindi", "Devil"], ["Lha-Cha-Eh", "Dog"]],
    E: [["Dzeh", "Elk"], ["Ah-Jah", "Ear"], ["Ah-Nah", "Eye"]],
    F: [["Ma-E", "Fox"], ["Chuo", "Fir"], ["Tsa-E-Donin-Ee", "Fly"]],
    G: [["Klizzie", "Goat"], ["Ah-Tad", "Girl"], ["Jeha", "Gum"]],
    H: [["Lin", "Horse"], ["Tse-Gah", "Hair"], ["Cha", "Hat"]],
    I: [["Tkin", "Ice"], ["Yeh-Hes", "Itch"], ["A-Chi", "Intestine"]],
    J: [["Tkele-Cho-G", "Jackass"], ["Ah-Ya-Tsinne", "Jaw"], ["Yil-Doi", "Jerk"]],
    K: [["Jad-Ho-Loni", "Kettle"], ["Ba-Ah-Ne-Di-Tinin", "Key"], ["Klizzie-Yazzie", "Kid"]],
    L: [["Dibeh-Yazzie", "Lamb"], ["Ah-Jad", "Leg"], ["Nash-Doie-Tso", "Lion"]],
    M: [["Tsin-Tliti", "Match"], ["Be-Tas-Tni", "Mirror"], ["Na-As-Tso-Si", "Mouse"]],
    N: [["Tsah", "Needle"], ["A-Chin", "Nose"]],
    O: [["A-Kha", "Oil"], ["Tlo-Chin", "Onion"], ["Ne-Ahs-Jah", "Owl"]],
    P: [["Cla-Gi-Aih", "Pant"], ["Bi-So-Dih", "Pig"], ["Ne-Zhoni", "Pretty"]],
    Q: [["Ca-Yeilth", "Quiver"]],
    R: [["Gah", "Rabbit"], ["Dah-Nes-Tsa", "Ram"], ["Ah-Losz", "Rice"]],
    S: [["Dibeh", "Sheep"], ["Klesh", "Snake"]],
    T: [["Than-Zie", "Turkey"], ["D-Ah", "Tea"], ["A-Woh", "Tooth"]],
    U: [["No-Da-Ih", "Ute"], ["Shi-Da", "Uncle"]],
    V: [["A-Keh-Di-Glini", "Victor"]],
    W: [["Gloe-Ih", "Weasel"]],
    X: [["Al-Na-As-Dzoh", "Cross"]],
    Y: [["Tsah-As-Zih", "Yucca"]],
    Z: [["Besh-Do-Gliz", "Zinc"]]
};
var CS_NAVAJO_REVERSE = {};
for (const [letter, words] of Object.entries(CS_NAVAJO)) {
    for (const [word] of words) CS_NAVAJO_REVERSE[word.toLowerCase().replace(/[^a-z]/g, "")] = letter;
}
function csNavajoRun(text, decode) {
    if (decode) {
        let out = "";
        for (const part of String(text).split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) {
                if (/\n/.test(part)) out += "\n";
                else if (part.length >= 2) out += " ";
                continue;
            }
            const key = part.toLowerCase().replace(/[^a-z]/g, "");
            out += CS_NAVAJO_REVERSE[key] || part;
        }
        return out;
    }
    let out = "";
    for (const ch of String(text)) {
        const upper = ch.toUpperCase();
        if (CS_NAVAJO[upper]) {
            if (out && !/\s$/.test(out)) out += " ";
            out += CS_NAVAJO[upper][0][0] + " ";
        } else {
            out += ch;
        }
    }
    return out.replace(/[ \t]+\n/g, "\n").replace(/[ \t]+$/, "");
}

/* ------------------------------------------------------------ Tap / knock code */
var CS_TAP_GRIDS = {
    "5 x 5 (A-Z, C/K)": "abcdefghijlmnopqrstuvwxyz",
    "6 x 6 (A-Z, 0-9)": "abcdefghijklmnopqrstuvwxyz0123456789"
};
function csTapRun(text, format, grid, decode) {
    const alphabet = CS_TAP_GRIDS[cfOption(grid, Object.keys(CS_TAP_GRIDS), "5 x 5 (A-Z, C/K)")];
    const dots = String(format).toLowerCase().startsWith("dots");
    const size = alphabet.length === 25 ? 5 : 6;
    if (decode) {
        const raw = String(text).trim();
        let tokens;
        if (dots) tokens = raw.split(/\s{2,}|\s*\/\s*|\s*,\s*/).filter(Boolean);
        else tokens = raw.split(/[^0-9]+/).filter(Boolean);
        let out = "";
        for (const token of tokens) {
            let row = 0;
            let col = 0;
            if (dots) {
                const m = token.match(/^(\.+)\s+(\.+)$/);
                if (!m) { out += "?"; continue; }
                row = m[1].length;
                col = m[2].length;
            } else {
                if (token.length !== 2) { out += "?"; continue; }
                row = Number(token[0]);
                col = Number(token[1]);
            }
            if (row < 1 || row > size || col < 1 || col > size) { out += "?"; continue; }
            out += alphabet[(row - 1) * size + (col - 1)];
        }
        return out;
    }
    const clean = (size === 5 ? String(text).toLowerCase().replace(/k/g, "c").replace(/[^a-jl-z]/g, "") : String(text).toLowerCase().replace(/[^a-z0-9]/g, ""));
    const tokens = [];
    for (const ch of clean) {
        const index = alphabet.indexOf(ch);
        if (index < 0) continue;
        const row = Math.floor(index / size) + 1;
        const col = (index % size) + 1;
        tokens.push(dots ? ".".repeat(row) + " " + ".".repeat(col) : String(row) + String(col));
    }
    return tokens.join(dots ? "  " : " ");
}

/* ------------------------------------------------------------ Number pad lines */
var CS_NUMPAD_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
var CS_NUMPAD_CODES = ["7295", "71354597", "32489", "178621", "3145479", "314547", "317965", "174639", "132879", "3984", "174349", "179", "71539", "7193", "71397", "71354", "971395", "7135459", "3245687", "1328", "1793", "183", "17593", "19537", "15358", "1379", "713973", "539", "136479", "1365697", "14639", "314697", "317964", "137", "3179364", "793146"];
function csNumberPadRun(text, decode) {
    if (decode) {
        return String(text).split(/\s+/).filter(Boolean).map(token => {
            const lower = token.toLowerCase();
            let index = CS_NUMPAD_CODES.indexOf(lower);
            if (index >= 0) return CS_NUMPAD_CHARS[index];
            index = CS_NUMPAD_CHARS.indexOf(lower);
            return index >= 0 ? lower : "?";
        }).join("");
    }
    const out = [];
    for (const ch of String(text).toLowerCase()) {
        const index = CS_NUMPAD_CHARS.indexOf(ch);
        if (index >= 0) out.push(CS_NUMPAD_CODES[index]);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Brainfuck / Ook! */
var CS_BF_OOK = {
    ">": "Ook. Ook? ", "<": "Ook? Ook. ", "+": "Ook. Ook. ", "-": "Ook! Ook! ",
    ".": "Ook! Ook. ", ",": "Ook. Ook! ", "[": "Ook! Ook? ", "]": "Ook? Ook! "
};
var CS_BF_SHORT = {
    ">": ".?", "<": "?.", "+": "..", "-": "!!", ".": "!.", ",": ".!", "[": "!?", "]": "?!"
};
var CS_OOK_BF = Object.fromEntries(Object.entries(CS_BF_OOK).map(([cmd, code]) => [code.trim(), cmd]));
var CS_SHORT_BF = Object.fromEntries(Object.entries(CS_BF_SHORT).map(([cmd, code]) => [code, cmd]));
function csBrainfuckCompile(text) {
    let out = "";
    for (const ch of String(text)) {
        const code = ch.charCodeAt(0);
        if (code > 255) continue;
        out += ">" + "+".repeat(code) + ".";
    }
    return out;
}
function csBrainfuckFilter(text) {
    return String(text).replace(/[^><+\-.,[\]]/g, "");
}
function csOokToBrainfuck(text) {
    const tokens = String(text).match(/Ook[.!?]/g) || [];
    let out = "";
    for (let i = 0; i + 1 < tokens.length; i += 2) {
        out += CS_OOK_BF[tokens[i] + " " + tokens[i + 1]] || "";
    }
    return out;
}
function csShortOokToBrainfuck(text) {
    const clean = String(text).replace(/\s+/g, "");
    let out = "";
    for (let i = 0; i + 1 < clean.length; i += 2) out += CS_SHORT_BF[clean.slice(i, i + 2)] || "";
    return out;
}
function csBrainfuckToOok(code, short) {
    return csBrainfuckFilter(code).split("").map(cmd => short ? CS_BF_SHORT[cmd] || "" : CS_BF_OOK[cmd] || "").join("");
}
function csBrainfuckRun(code, input) {
    const program = csBrainfuckFilter(code);
    const cells = new Uint8Array(30000);
    const jumps = new Map();
    const stack = [];
    for (let i = 0; i < program.length; i++) {
        if (program[i] === "[") stack.push(i);
        else if (program[i] === "]") {
            const start = stack.pop();
            if (start !== undefined) { jumps.set(start, i); jumps.set(i, start); }
        }
    }
    let pointer = 0;
    let inputAt = 0;
    let out = "";
    const limit = 1000000;
    for (let i = 0, steps = 0; i < program.length && steps < limit; i++, steps++) {
        switch (program[i]) {
            case ">": pointer = (pointer + 1) % cells.length; break;
            case "<": pointer = (pointer - 1 + cells.length) % cells.length; break;
            case "+": cells[pointer]++; break;
            case "-": cells[pointer]--; break;
            case ".": out += String.fromCharCode(cells[pointer]); break;
            case ",": cells[pointer] = inputAt < input.length ? input.charCodeAt(inputAt++) & 255 : 0; break;
            case "[": if (cells[pointer] === 0) i = jumps.get(i); break;
            case "]": if (cells[pointer] !== 0) i = jumps.get(i); break;
        }
    }
    return out;
}
function csBfOokRun(text, mode, decode) {
    if (decode) {
        return mode === "Ook!" ? csBrainfuckRun(csOokToBrainfuck(text), "") : mode === "Short Ook!" ? csBrainfuckRun(csShortOokToBrainfuck(text), "") : csBrainfuckRun(text, "");
    }
    const code = csBrainfuckCompile(text);
    return mode === "Ook!" ? csBrainfuckToOok(code, false) : mode === "Short Ook!" ? csBrainfuckToOok(code, true) : code;
}

/* ------------------------------------------------------------ Cow */
var CS_COW_COMMANDS = ["moo", "mOo", "moO", "mOO", "Moo", "MOo", "MoO", "MOO", "OOO", "MMM", "OOM", "oom"];
var CS_COW_PRELUDE = "OOOMoOMoOMoOMoOMoOMoOMoOMoOMMMmoOMMMMMMmoOMMMMOOMOomOoMoOmoOmoomOoMMMmoOMMMMMMmoOMMMMOOMOomOoMoOmoOmoomOoMMMmoOMMMMMMmoOMMMMOOMOomOoMoOmoOmoo";
function csCowDecode(text) {
    const commands = [];
    let window = "   ";
    const source = String(text);
    for (let i = 0; i < source.length; i++) {
        window = window.slice(1) + source.charAt(i);
        for (let j = 0; j < CS_COW_COMMANDS.length; j++) {
            if (CS_COW_COMMANDS[j] === window) { commands.push(j); window = "   "; break; }
        }
    }
    let out = "";
    let cell = 0;
    const tape = [0];
    let pointer = 0;
    let storage = 0;
    let stored = false;
    let steps = 0;
    const limit = 1000000;
    let at = 0;
    function runOne(command) {
        if (++steps > limit) return false;
        switch (command) {
            case 0: if (cell === 0) return false; cell--; return runLoopEnd();
            case 1: if (pointer === 0) return false; pointer--; break;
            case 2: pointer++; if (pointer === tape.length) tape.push(0); break;
            case 3: if (tape[pointer] === 3) return false; return runOne(tape[pointer]);
            case 4: if (tape[pointer] !== 0) out += String.fromCharCode(tape[pointer]); else tape[pointer] = at < source.length ? source.charCodeAt(at++) : 0; break;
            case 5: tape[pointer]--; break;
            case 6: tape[pointer]++; break;
            case 7: if (tape[pointer] === 0 && !skipBlock()) return false; break;
            case 8: tape[pointer] = 0; break;
            case 9: if (stored) { tape[pointer] = storage; stored = false; } else { storage = tape[pointer]; stored = true; } break;
            case 10: out += String(tape[pointer]) + "\n"; break;
            case 11: tape[pointer] = 0; break;
            default: return false;
        }
        cell++;
        return true;
    }
    function runLoopEnd() {
        let depth = 1;
        for (; depth > 0 && cell !== 0;) {
            cell--;
            if (commands[cell] === 0) depth++;
            else if (commands[cell] === 7) depth--;
        }
        return depth !== 0 ? false : runOne(commands[cell]);
    }
    function skipBlock() {
        let depth = 1;
        let command = 0;
        if (cell++, cell === commands.length) return true;
        for (; depth > 0 && ((command = commands[cell]), cell++, cell !== commands.length);) {
            if (commands[cell] === 7) depth++;
            else if (commands[cell] === 0) { depth--; if (command === 7) depth--; }
        }
        return depth === 0;
    }
    while (cell !== commands.length && runOne(commands[cell])) {}
    return out;
}
function csCowEncode(text) {
    let code = CS_COW_PRELUDE;
    const source = String(text);
    for (let i = 0; i < source.length; i++) {
        let value = source.charCodeAt(i);
        if (value > 127) continue;
        code += "OOOmoOOOOmOo";
        for (let bit = 6; bit > 3; bit--) {
            const power = 1 << bit;
            if (value > power) {
                if (bit === 6) code += "mOoMMMmoOMMM";
                if (bit === 5) code += "mOomOoMMMmoOmoOMMM";
                if (bit === 4) code += "mOomOomOoMMMmoOmoOmoOMMM";
                code += "MOOMOomoOMoOmOomoo";
                value -= power;
            }
        }
        code += "moO" + "MoO".repeat(value) + "MoomOo";
    }
    let out = "";
    while (code.length > 66) { out += code.slice(0, 66) + "\n"; code = code.slice(66); }
    return out + code + "\n";
}

/* ------------------------------------------------------------ Clock code
 * Each character is written as a clock value: A is AM, B through Y are the
 * hours 1-24, Z is PM and a word gap is 00. The site separates the values with
 * a colon; the trailing colon is omitted.
 */
var CS_CLOCK_CHARS = "abcdefghijklmnopqrstuvwxyz ".split("");
var CS_CLOCK_VALUES = ["AM", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "PM", "00"];
function csClockRun(text, decode) {
    if (decode) {
        const values = String(text).toUpperCase().replace(/[^0-9APM:]/g, "").split(":");
        let out = "";
        for (const value of values) {
            const at = CS_CLOCK_VALUES.indexOf(value);
            out += at >= 0 ? CS_CLOCK_CHARS[at] : value;
        }
        return out;
    }
    const out = [];
    for (const ch of String(text)) {
        const at = CS_CLOCK_CHARS.indexOf(ch.toLowerCase());
        if (at >= 0) out.push(CS_CLOCK_VALUES[at]);
    }
    return out.join(":");
}

/* ------------------------------------------------------------ Five Needle Telegraph
 * Cooke and Wheatstone's five-needle layout. The alphabet omits C, J, Q, V, X
 * and Z; every other letter is a five-symbol group of slashes, pipes and
 * backslashes.
 */
var CS_FIVE_ALPHABET = "abdefghiklmnoprstuwy".split("");
var CS_FIVE_CODES = [
    "/|||\\", "/||\\|", "|/||\\", "/|\\||", "|/|\\|", "||/|\\", "/\\|||", "|/\\||",
    "||/\\|", "|||/\\", "\\/|||", "|\\/||", "||\\/|", "|||\\/", "\\|/||", "|\\|/|",
    "||\\|/", "\\||/|", "|\\||/", "\\|||/"
];
function csFiveNeedleRun(text, decode) {
    if (decode) {
        const map = new Map(CS_FIVE_CODES.map((code, i) => [code, CS_FIVE_ALPHABET[i].toUpperCase()]));
        const clean = String(text).replace(/[^\\|/]/g, "");
        let out = "";
        for (let i = 0; i + 5 <= clean.length; i += 5) out += map.get(clean.slice(i, i + 5)) || "?";
        return out;
    }
    const out = [];
    for (const ch of String(text).toLowerCase()) {
        const at = CS_FIVE_ALPHABET.indexOf(ch);
        if (at >= 0) out.push(CS_FIVE_CODES[at]);
    }
    return out.join(" ");
}

/* ------------------------------------------------------------ Kenny
 * Kenny's three-syllable alphabet: every letter is one of the 27 m/f/p
 * combinations (mmm through ffp), written as one continuous stream.
 */
var CS_KENNY_ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
var CS_KENNY_CODES = ["mmm", "mmp", "mmf", "mpm", "mpp", "mpf", "mfm", "mfp", "mff", "pmm", "pmp", "pmf", "ppm", "ppp", "ppf", "pfm", "pfp", "pff", "fmm", "fmp", "fmf", "fpm", "fpp", "fpf", "ffm", "ffp"];
function csKennyRun(text, decode) {
    if (decode) {
        const map = new Map(CS_KENNY_CODES.map((code, i) => [code, CS_KENNY_ALPHABET[i].toUpperCase()]));
        return String(text).replace(/[mfp]{3}/gi, group => map.get(group.toLowerCase()) || "?");
    }
    let out = "";
    for (const ch of String(text).toLowerCase()) {
        const at = CS_KENNY_ALPHABET.indexOf(ch);
        out += at >= 0 ? CS_KENNY_CODES[at] : ch;
    }
    return out;
}

/* ------------------------------------------------------------ Leet / visual substitution
 * The site's four encode styles, plus a preferred-reading decoder. Leet is
 * deliberately ambiguous, so the decoder takes the longest matching symbol and
 * the most common letter for it rather than enumerating every ranked variant.
 */
var CS_LEET_LIGHT = {A: "4", E: "3", I: "1", O: "0", S: "5", T: "7"};
var CS_LEET_CLASSIC = {A: "4", B: "8", C: "(", D: "|)", E: "3", G: "6", I: "1", O: "0", R: "\u042F", S: "5", T: "7", X: "><", Y: "\u04B0", Z: "2"};
var CS_LEET_ADVANCED = {A: "4", B: "8", C: "(", D: "|)", E: "3", F: "|=", G: "6", H: "|-|", I: "1", J: "_/", K: "|<", L: "|_", M: "/\\/\\", N: "|\\|", O: "0", P: "|*", Q: "[,]", R: "\u042F", S: "5", T: "7", U: "|_|", V: "\\./", W: "\\X/", X: "><", Y: "\u04B0", Z: "2"};
var CS_LEET_HTMLSAFE = Object.assign({}, CS_LEET_ADVANCED, {X: "}{"});
var CS_LEET_STYLES = {"Light": CS_LEET_LIGHT, "Classic": CS_LEET_CLASSIC, "Advanced": CS_LEET_ADVANCED, "HTML-safe": CS_LEET_HTMLSAFE};
var CS_LEET_DECODE = [
    ["|-|", "H"], ["|_|", "U"], ["|\\|", "N"], ["/\\/\\", "M"], ["\\X/", "W"], ["\\./", "V"],
    ["[,]", "Q"], ["|)", "D"], ["|=", "F"], ["|<", "K"], ["|*", "P"], ["|_", "L"], ["_/", "J"],
    ["><", "X"], ["}{", "X"], ["\u04B0", "Y"], ["\u042F", "R"], ["(", "C"], ["4", "A"], ["8", "B"],
    ["3", "E"], ["6", "G"], ["1", "I"], ["0", "O"], ["5", "S"], ["7", "T"], ["2", "Z"]
];
function csLeetRun(text, style, decode) {
    if (decode) {
        const source = String(text)
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/&amp;/gi, "&");
        const pairs = CS_LEET_DECODE.slice().sort((a, b) => b[0].length - a[0].length);
        let out = "";
        for (let i = 0; i < source.length;) {
            let hit = "";
            for (const [symbol, letter] of pairs) {
                if (source.startsWith(symbol, i)) { hit = letter; i += symbol.length; break; }
            }
            if (hit) out += hit;
            else { out += source[i]; i++; }
        }
        return out;
    }
    const name = cfOption(style, Object.keys(CS_LEET_STYLES), "Classic");
    const map = CS_LEET_STYLES[name];
    let out = "";
    for (const ch of String(text)) {
        const upper = ch.toUpperCase();
        out += Object.prototype.hasOwnProperty.call(map, upper) ? map[upper] : ch;
    }
    if (name === "HTML-safe") out = out.replace(/[&<>]/g, ch => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"})[ch]);
    return out;
}

/* ------------------------------------------------------------ Morse
 * International Morse with the site's three puzzle variants. A single
 * separator marks a letter and a doubled separator marks a word gap.
 */
var CS_MORSE = {
    a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....", i: "..", j: ".---",
    k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-",
    u: "..-", v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--..",
    1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.", 0: "-----",
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--", "/": "-..-.",
    "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-",
    "+": ".-.-.", "-": "-....-", "_": "..--.-", "\"": ".-..-.", "$": "...-..-", "@": ".--.-."
};
var CS_MORSE_VARIANTS = ["Standard", "Reverse sequence", "Swap dots and dashes", "Reverse and swap"];
function csMorseVariant(text, name) {
    let out = String(text);
    if (name === "Reverse sequence" || name === "Reverse and swap") out = out.split("").reverse().join("");
    if (name === "Swap dots and dashes" || name === "Reverse and swap") out = out.replace(/[.-]/g, ch => ch === "." ? "-" : ".");
    return out;
}
function csMorseRun(text, variant, separator, decode) {
    const name = cfOption(variant, CS_MORSE_VARIANTS, "Standard");
    const sep = String(separator == null || separator === "" ? "/" : separator).slice(0, 1) || "/";
    if (decode) {
        let source = String(text)
            .replace(/[*\u00b7\u2022]/g, ".")
            .replace(/[\u2013\u2014]/g, "-")
            .replace(/[\\|]/g, sep)
            .replace(/\s+/g, sep);
        if (sep !== "/") source = source.split(sep).join("/");
        source = source.replace(/\/+/g, match => match.length >= 2 ? "//" : "/");
        source = csMorseVariant(source, name);
        const reverse = new Map(Object.entries(CS_MORSE).map(([ch, code]) => [code, ch]));
        return source.split("//").map(word => word.split("/").filter(Boolean).map(code => reverse.get(code) || "").join("")).join(" ").trim();
    }
    const words = String(text).toLowerCase().split(/\s+/).filter(Boolean).map(word => {
        const parts = [];
        for (const ch of word) if (CS_MORSE[ch] !== undefined) parts.push(CS_MORSE[ch]);
        return parts.join(sep);
    }).filter(Boolean);
    return csMorseVariant(words.join(sep + sep), name);
}

/* ------------------------------------------------------------ UnMorse
 * Run-on Morse has no separators, so every segmentation is legal. The site
 * branches the possibilities; this returns the best-scoring readings instead.
 * A beam keeps long inputs bounded while still surfacing plausible phrases.
 */
var CS_MORSE_BIGRAMS = new Set("th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce li ch ll be ma si om ur".split(" "));
var CS_MORSE_TRIGRAMS = new Set("the and ing ion ent for tio ere her ate ver ter tha ati hat ers his res ill are con not eve had dth our out wit you was whi all ear est ove oth ith nth sth".split(" "));
var CS_MORSE_FREQ = {e: 12, t: 9, a: 8, o: 8, i: 7, n: 7, s: 6, h: 6, r: 6, d: 4, l: 4, u: 3, c: 3, m: 3, f: 2, w: 2, g: 2, y: 2, p: 2, b: 1, v: 1, k: 1, j: 1, x: 1, q: 1, z: 1};
function csUnmorseScore(letter, before, digitBias) {
    const lower = String(letter).toLowerCase();
    // Digits are common answers in geocaching puzzles, so a short number token is
    // worth keeping in view; punctuation is neutral. The bias option raises them
    // above ordinary words when a run is more likely to be a coordinate than prose.
    if (/[0-9]/.test(lower)) return digitBias ? 60 : 3;
    if (!/^[a-z]$/.test(lower)) return 2;
    let score = CS_MORSE_FREQ[lower] || 0;
    if (CS_MORSE_BIGRAMS.has(before.slice(-1).toLowerCase() + lower)) score += 6;
    if (CS_MORSE_TRIGRAMS.has(before.slice(-2).toLowerCase() + lower)) score += 18;
    // A run like TTTTT is technically valid Morse but never a likely reading.
    if (before.slice(-1).toLowerCase() === lower) score -= 14;
    if (before.slice(-2).toLowerCase() === lower + lower) score -= 14;
    return score;
}
function csUnmorseRun(text, maxResults, format, bias) {
    const source = String(text).replace(/[^.-]/g, "");
    if (!source) return "";
    const limit = Math.max(1, Math.min(50, Math.round(cfNumber(maxResults, 10))));
    const bestOnly = String(format || "").toLowerCase().startsWith("best");
    const digitBias = String(bias || "").toLowerCase().startsWith("digit");
    const tokens = Object.entries(CS_MORSE).map(([ch, code]) => [code, ch]);
    const beam = 160;
    const layers = new Map();
    layers.set(0, [{text: "", score: 0}]);
    for (let pos = 0; pos < source.length; pos++) {
        const states = layers.get(pos);
        if (!states) continue;
        for (const state of states) {
            for (const [code, ch] of tokens) {
                if (!source.startsWith(code, pos)) continue;
                const nextPos = pos + code.length;
                const next = {text: state.text + ch, score: state.score + csUnmorseScore(ch, state.text, digitBias)};
                let bucket = layers.get(nextPos);
                if (!bucket) { bucket = []; layers.set(nextPos, bucket); }
                bucket.push(next);
                if (bucket.length > beam * 2) {
                    bucket.sort((a, b) => b.score - a.score || a.text.length - b.text.length);
                    bucket.length = beam;
                }
            }
        }
    }
    const finals = (layers.get(source.length) || []).slice().sort((a, b) => b.score - a.score || a.text.localeCompare(b.text));
    const out = [];
    const seen = new Set();
    for (const item of finals) {
        if (seen.has(item.text)) continue;
        seen.add(item.text);
        out.push(item);
        if (out.length >= limit) break;
    }
    if (!out.length) return "";
    if (bestOnly) return out[0].text;
    return out.map((item, i) => `${i + 1}. ${item.text}  (${Math.round(item.score)})`).join("\n");
}

/* ------------------------------------------------------------ PLANET / POSTNET
 * Both postal barcodes use five bars per digit, framed by a tall bar. The site
 * accepts i/I, .|", "0/1 as the two bar symbols; the decoder accepts the same
 * aliases and drops the frame before reading five bars at a time.
 */
var CS_PLANET_CODE = {0: "iiIII", 1: "IIIii", 2: "IIiIi", 3: "IIiiI", 4: "IiIIi", 5: "IiIiI", 6: "IiiII", 7: "iIIIi", 8: "iIIiI", 9: "iIiII"};
var CS_POSTNET_CODE = {0: "IIiii", 1: "iiiII", 2: "iiIiI", 3: "iiIIi", 4: "iIiiI", 5: "iIiIi", 6: "iIIii", 7: "IiiiI", 8: "IiiIi", 9: "IiIii"};
function csBarcodeRun(text, table, decode) {
    const inverse = new Map(Object.entries(table).map(([digit, code]) => [code, digit]));
    if (decode) {
        let clean = String(text)
            .replace(/\./g, "i")
            .replace(/\|/g, "I")
            .replace(/0/g, "i")
            .replace(/1/g, "I")
            .replace(/[^iI]/g, "");
        if (clean.length % 5 === 2 && clean.charAt(0) === "I" && clean.charAt(clean.length - 1) === "I") clean = clean.slice(1, -1);
        let out = "";
        for (let i = 0; i + 5 <= clean.length; i += 5) out += inverse.get(clean.slice(i, i + 5)) || "";
        return out;
    }
    const digits = String(text).replace(/\D/g, "");
    if (!digits) return "";
    return "I" + digits.split("").map(digit => table[digit] || "").join("") + "I";
}
function csPlanetCodeRun(text, decode) { return csBarcodeRun(text, CS_PLANET_CODE, decode); }
function csPostnetCodeRun(text, decode) { return csBarcodeRun(text, CS_POSTNET_CODE, decode); }

/* ------------------------------------------------------------ Punycode
 * RFC 3492. The site converts every label that contains a non-ASCII character,
 * prefixing it with xn--; decoding reverses labels that already carry the
 * prefix. Lines are processed independently.
 */
var CS_PUNY_MAX = 2147483647;
function csPunyAdapt(delta, numPoints, firstTime) {
    let k = 0;
    delta = firstTime ? Math.floor(delta / 700) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    for (; delta > 455; k += 36) delta = Math.floor(delta / 35);
    return Math.floor(k + (36 * delta) / (delta + 38));
}
function csPunyDigitToBasic(digit) { return digit + 22 + (digit < 26 ? 75 : 0); }
function csPunyBasicToDigit(codePoint) {
    if (codePoint - 48 < 10) return codePoint - 22;
    if (codePoint - 65 < 26) return codePoint - 65;
    if (codePoint - 97 < 26) return codePoint - 97;
    return 36;
}
function csPunyEncode(input) {
    const codePoints = Array.from(String(input), ch => ch.codePointAt(0));
    const output = [];
    let n = 128;
    let delta = 0;
    let bias = 72;
    let basicLength = 0;
    for (const cp of codePoints) if (cp < 128) { output.push(cp); basicLength++; }
    let handled = basicLength;
    if (basicLength) output.push(45);
    while (handled < codePoints.length) {
        let m = CS_PUNY_MAX;
        for (const cp of codePoints) if (cp >= n && cp < m) m = cp;
        if (m - n > Math.floor((CS_PUNY_MAX - delta) / (handled + 1))) throw new RangeError("overflow");
        delta += (m - n) * (handled + 1);
        n = m;
        for (const cp of codePoints) {
            if (cp < n && ++delta > CS_PUNY_MAX) throw new RangeError("overflow");
            if (cp === n) {
                let q = delta;
                for (let k = 36; ; k += 36) {
                    const t = k <= bias ? 1 : (k >= bias + 26 ? 26 : k - bias);
                    if (q < t) break;
                    const qMinusT = q - t;
                    const baseMinusT = 36 - t;
                    output.push(csPunyDigitToBasic(t + (qMinusT % baseMinusT)));
                    q = Math.floor(qMinusT / baseMinusT);
                }
                output.push(csPunyDigitToBasic(q));
                bias = csPunyAdapt(delta, handled + 1, handled === basicLength);
                delta = 0;
                handled++;
            }
        }
        delta++;
        n++;
    }
    return output.map(cp => String.fromCharCode(cp)).join("");
}
function csPunyDecode(input) {
    const output = [];
    let n = 128;
    let i = 0;
    let bias = 72;
    const basic = String(input).lastIndexOf("-");
    let index = 0;
    if (basic > 0) {
        for (let j = 0; j < basic; j++) {
            const cp = input.charCodeAt(j);
            if (cp >= 128) throw new RangeError("not-basic");
            output.push(cp);
        }
        index = basic + 1;
    }
    while (index < input.length) {
        const oldi = i;
        let w = 1;
        for (let k = 36; ; k += 36) {
            if (index >= input.length) throw new RangeError("invalid-input");
            const digit = csPunyBasicToDigit(input.charCodeAt(index++));
            if (digit >= 36) throw new RangeError("invalid-input");
            if (digit > Math.floor((CS_PUNY_MAX - i) / w)) throw new RangeError("overflow");
            i += digit * w;
            const t = k <= bias ? 1 : (k >= bias + 26 ? 26 : k - bias);
            if (digit < t) break;
            const baseMinusT = 36 - t;
            if (w > Math.floor(CS_PUNY_MAX / baseMinusT)) throw new RangeError("overflow");
            w *= baseMinusT;
        }
        const outLength = output.length + 1;
        bias = csPunyAdapt(i - oldi, outLength, oldi === 0);
        if (Math.floor(i / outLength) > CS_PUNY_MAX - n) throw new RangeError("overflow");
        n += Math.floor(i / outLength);
        i %= outLength;
        output.splice(i++, 0, n);
    }
    return output.map(cp => String.fromCodePoint(cp)).join("");
}
function csPunycodeRun(text, decode) {
    return String(text).split("\n").map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        try {
            return trimmed.split(".").map(label => decode
                ? (/^xn--/i.test(label) ? csPunyDecode(label.slice(4)) : label)
                : (/[^\x00-\x7F]/.test(label) ? "xn--" + csPunyEncode(label) : label)
            ).join(".");
        } catch (err) {
            return trimmed + "  (error: " + err.message + ")";
        }
    }).join("\n");
}

/* ------------------------------------------------------------ TAPIR
 * The DDR MfS/NVA straddling table. A, E, I, N and R are single digits; the
 * remaining letters use two. 82 enters digit/punctuation mode and 81 returns to
 * letters. The finished digit string is grouped in fives for reading.
 */
var CS_TAPIR_LETTERS = [
    ["A", "0"], ["E", "1"], ["I", "2"], ["N", "3"], ["R", "4"], ["B", "50"], ["BE", "51"],
    ["C", "52"], ["CH", "53"], ["D", "54"], ["DE", "55"], ["F", "56"], ["G", "57"], ["GE", "58"],
    ["H", "59"], ["J", "60"], ["K", "61"], ["L", "62"], ["M", "63"], ["O", "64"], ["P", "67"],
    ["Q", "68"], ["S", "69"], ["T", "70"], ["TE", "71"], ["U", "72"], ["UN", "73"], ["V", "74"],
    ["W", "76"], ["X", "77"], ["Y", "78"], ["Z", "79"], [" ", "83"]
];
var CS_TAPIR_DIGITS = [
    ["0", "00"], ["1", "11"], ["2", "22"], ["3", "33"], ["4", "44"], ["5", "55"],
    ["6", "66"], ["7", "77"], ["8", "88"], ["9", "99"], [" ", "83"], [".", "89"],
    [":", "90"], [",", "91"], ["-", "92"], ["/", "93"], ["(", "94"], [")", "95"],
    ["+", "96"], ["=", "97"], ["\"", "98"]
];
var CS_TAPIR_LETTER_ENCODE = new Map(CS_TAPIR_LETTERS);
var CS_TAPIR_LETTER_DECODE = new Map(CS_TAPIR_LETTERS.map(([letter, code]) => [code, letter]));
var CS_TAPIR_DIGIT_ENCODE = new Map(CS_TAPIR_DIGITS);
var CS_TAPIR_DIGIT_DECODE = new Map(CS_TAPIR_DIGITS.map(([ch, code]) => [code, ch]));
var CS_TAPIR_LETTER_TOKENS = CS_TAPIR_LETTERS.map(([letter]) => letter).filter(letter => letter !== " ").sort((a, b) => b.length - a.length);
function csTapirRun(text, decode) {
    if (decode) {
        const digits = String(text).replace(/\D/g, "");
        let mode = "letters";
        let out = "";
        for (let i = 0; i < digits.length;) {
            const pair = digits.slice(i, i + 2);
            if (mode === "letters") {
                if (pair === "82") { mode = "numeric"; i += 2; continue; }
                if (pair === "84") { out += "#CODE#"; i += 2; continue; }
                if (pair === "85") { out += "#RPT#"; i += 2; continue; }
                if (pair === "81") { i += 2; continue; }
                if (CS_TAPIR_LETTER_DECODE.has(pair)) { out += CS_TAPIR_LETTER_DECODE.get(pair); i += 2; continue; }
                const single = digits.charAt(i);
                if (CS_TAPIR_LETTER_DECODE.has(single)) { out += CS_TAPIR_LETTER_DECODE.get(single); i++; continue; }
                out += "?";
                i++;
            } else {
                if (pair === "81") { mode = "letters"; i += 2; continue; }
                if (CS_TAPIR_DIGIT_DECODE.has(pair)) { out += CS_TAPIR_DIGIT_DECODE.get(pair); i += 2; continue; }
                out += "?";
                i += 2;
            }
        }
        return out;
    }
    const source = String(text).replace(/\r\n?/g, "\n").replace(/\u00df/g, "SS").toUpperCase();
    let out = "";
    for (let i = 0; i < source.length;) {
        const ch = source.charAt(i);
        if (ch === "\n") { i++; continue; }
        if (ch !== " " && CS_TAPIR_DIGIT_ENCODE.has(ch)) {
            out += "82";
            while (i < source.length && CS_TAPIR_DIGIT_ENCODE.has(source.charAt(i))) {
                out += CS_TAPIR_DIGIT_ENCODE.get(source.charAt(i));
                i++;
            }
            if (i < source.length) out += "81";
            continue;
        }
        let token = "";
        for (const candidate of CS_TAPIR_LETTER_TOKENS) {
            if (source.startsWith(candidate, i)) { token = candidate; break; }
        }
        if (token) {
            out += CS_TAPIR_LETTER_ENCODE.get(token);
            i += token.length;
            continue;
        }
        if (ch === " ") out += "83";
        i++;
    }
    return out.replace(/(.{5})(?=.)/g, "$1 ");
}

/* ------------------------------------------------------------ Tomtom
 * Talking-drum code: each letter is a slash/backslash pattern, separated by a
 * space. Decoding reads the longest known pattern first, then passes through
 * any character it does not recognise.
 */
var CS_TOMTOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
var CS_TOMTOM_CODES = [
    "/", "//", "///", "////", "/\\", "//\\", "///\\", "/\\\\", "/\\\\\\", "\\/", "\\\\/", "\\\\\\/", "\\//", "\\///", "/\\/", "//\\/", "/\\\\/", "/\\//", "\\/\\", "\\\\/\\", "\\//\\", "\\/\\\\", "//\\\\", "\\\\//", "\\/\\/", "/\\/\\"
];
var CS_TOMTOM_MATCH = CS_TOMTOM_CODES.map((code, i) => [code, CS_TOMTOM_ALPHABET[i].toUpperCase()]).sort((a, b) => b[0].length - a[0].length);
function csTomtomRun(text, decode) {
    if (decode) {
        return String(text).trim().split(/ +/).filter(Boolean).map(token => {
            let out = "";
            for (let i = 0; i < token.length;) {
                let hit = "";
                for (const [code, letter] of CS_TOMTOM_MATCH) {
                    if (token.startsWith(code, i)) { hit = letter; i += code.length; break; }
                }
                if (hit) out += hit;
                else { out += token.charAt(i); i++; }
            }
            return out;
        }).join("");
    }
    const out = [];
    for (const ch of String(text).toLowerCase()) {
        const at = CS_TOMTOM_ALPHABET.indexOf(ch);
        if (at >= 0) out.push(CS_TOMTOM_CODES[at]);
    }
    return out.join(" ");
}
