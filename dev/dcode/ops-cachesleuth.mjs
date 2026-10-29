/* CacheSleuth text ciphers -----------------------------------------------------
 * Recreated from the published descriptions and worked examples on
 * cachesleuth.com. The site is not embedded, fetched, or called at runtime: each
 * operation below is a local implementation. Ciphers already supplied by
 * CyberChef or the earlier dCode set (ADFGX, ADFGVX, Affine, AMSCO, Atbash,
 * Bacon, Beaufort, Bifid, Caesar Box, Chaocipher, columnar, Enigma, four-square,
 * fractionated Morse, Grandpre, Gronsfeld, Hill, multiplicative, Playfair,
 * Polybius, Porta, Ragbaby, Rail Fence, route, Scytale, Solitaire, Tap Code,
 * Trifid, Trithemius, Ubchi and Vigenere) are deliberately not duplicated.
 */

const SUBSTITUTION = "CacheSleuth · Substitution";
const TRANSPOSITION = "CacheSleuth · Transposition";
const FRACTIONATION = "CacheSleuth · Fractionation";
const POLYALPHABETIC = "CacheSleuth · Poly-alphabetic";
const TOOLS = "CacheSleuth · Tools";

const KAMASUTRA_PAIRS = "AZ BY CX DW EV FU GT HS IR JQ KP LO MN";
const HOMO_KEY = Array.from({length: 26}, (_, i) =>
    `${String.fromCharCode(65 + i)}: ${String(i + 1).padStart(2, "0")}`
).join("\n");
const BOOK_SOURCE = "The quick brown fox\njumps over the lazy dog\nCache Sleuth solves puzzles";
const BOOK_FORMATS = ["line:word", "line:character", "word:character", "page:line:word", "page:line:character"];
const ROTATION_DIRECTIONS = ["Left (-90°)", "Right (90°)"];

export const ops = [
    /* ---------------------------------------------------------------- reciprocal substitutions */
    {
        name: "Albam Cipher",
        group: SUBSTITUTION,
        description: "Albam cipher: the alphabet is split in half and each letter is swapped with the letter eleven places away, so A becomes L, B becomes M, and Z becomes K. The substitution is reciprocal, so the same operation encodes and decodes. Case is preserved.",
        args: [],
        run: (input) => albamRun(input)
    },
    {
        name: "Carbonaro Cipher",
        group: SUBSTITUTION,
        description: "Carbonaro cipher: a reciprocal substitution used by the nineteenth-century Carbonari, mapping the standard alphabet onto OPGTIVCHEJKRNMABQLZDUFWXYS. Each pair swaps back, so the same operation encodes and decodes. Case is preserved.",
        args: [],
        run: (input) => carbonaroRun(input)
    },
    {
        name: "Kamasutra Cipher",
        group: SUBSTITUTION,
        description: "Kamasutra cipher: the alphabet is arranged into thirteen reciprocal pairs, and each letter is replaced by its partner. The default is the classic Atbash pairing AZ BY CX ... MN; a custom list of thirteen two-letter pairs can be supplied. Case is preserved.",
        args: [
            {name: "Key pairs", type: "string", value: KAMASUTRA_PAIRS}
        ],
        run: (input, args) => kamasutraRun(input, args[0])
    },
    {
        name: "Pizzini Cipher Encode",
        group: SUBSTITUTION,
        description: "Pizzini cipher: A is numbered 4, B is 5, and so on through Z as 29, following the Italian note cipher. Numbers are written with no separator, exactly as the CacheSleuth tool produces them; non-letters pass through.",
        args: [],
        run: (input) => pizziniRun(input, false)
    },
    {
        name: "Pizzini Cipher Decode",
        group: SUBSTITUTION,
        description: "Pizzini decoder: reads the concatenated numbers back to letters. A leading 1 or 2 consumes the next digit before the lookup, which is how values 10-29 remain unambiguous without separators.",
        args: [],
        run: (input) => pizziniRun(input, true)
    },
    {
        name: "Scream Cipher Encode",
        group: SUBSTITUTION,
        description: "Scream cipher from xkcd #3054: every letter becomes an A wearing its own diacritic, so B is Ȧ, E is Á and Z is Ⱥ. Letters are upper-cased and non-letters are copied through; output is normalized to precomposed characters.",
        args: [],
        run: (input) => screamRun(input, false)
    },
    {
        name: "Scream Cipher Decode",
        group: SUBSTITUTION,
        description: "Scream decoder: accepts precomposed accented A characters or an A followed by a separate combining mark, then maps each mark back to its letter. A plain A is A, Ⱥ is Z, and lowercase marks decode to lowercase letters.",
        args: [],
        run: (input) => screamRun(input, true)
    },
    {
        name: "Keyboard Cipher Encode",
        group: SUBSTITUTION,
        description: "Keyboard cipher: maps A-Z onto the first twenty-six letter keys of a QWERTY, QWERTZ or AZERTY keyboard, so with QWERTY A becomes Q, B becomes W, and so on. Output is lower-case and non-letters are unchanged.",
        args: [
            {name: "Layout", type: "option", value: ["QWERTY", "QWERTZ", "AZERTY"]}
        ],
        run: (input, args) => keyboardRun(input, args[0], false)
    },
    {
        name: "Keyboard Cipher Decode",
        group: SUBSTITUTION,
        description: "Keyboard decoder: maps the letter keys of the chosen layout back onto A-Z. Use the same layout that produced the ciphertext; non-letters are unchanged.",
        args: [
            {name: "Layout", type: "option", value: ["QWERTY", "QWERTZ", "AZERTY"]}
        ],
        run: (input, args) => keyboardRun(input, args[0], true)
    },

    /* ---------------------------------------------------------------- poly-alphabetic */
    {
        name: "Additive Cipher Encode",
        group: POLYALPHABETIC,
        description: "Additive cipher: every letter is shifted forward by a fixed numeric key modulo the alphabet, with A counted as zero. It is the general Caesar shift with a configurable alphabet; non-letters are copied through.",
        args: [
            {name: "Key", type: "number", value: 16},
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
        ],
        run: (input, args) => additiveRun(input, args[0], args[1], false)
    },
    {
        name: "Additive Cipher Decode",
        group: POLYALPHABETIC,
        description: "Additive decoder: subtracts the numeric key modulo the alphabet instead of adding it. Use the same alphabet and key as the encoder; non-letters are copied through.",
        args: [
            {name: "Key", type: "number", value: 16},
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
        ],
        run: (input, args) => additiveRun(input, args[0], args[1], true)
    },
    {
        name: "Keyed Caesar Cipher Encode",
        group: POLYALPHABETIC,
        description: "Keyed Caesar: the keyword's unique letters move to the front of the alphabet, the rest follow in order, and that keyed alphabet is rotated right by the shift before substitution. Case and non-letters are preserved.",
        args: [
            {name: "Shift", type: "number", value: 13},
            {name: "Keyword", type: "string", value: "CACHE"},
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
        ],
        run: (input, args) => keyedCaesarRun(input, args[0], args[1], args[2], false)
    },
    {
        name: "Keyed Caesar Cipher Decode",
        group: POLYALPHABETIC,
        description: "Keyed Caesar decoder: looks each ciphertext letter up in the rotated keyed alphabet and returns the matching standard-alphabet letter. Use the same keyword, shift and alphabet as the encoder.",
        args: [
            {name: "Shift", type: "number", value: 13},
            {name: "Keyword", type: "string", value: "CACHE"},
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
        ],
        run: (input, args) => keyedCaesarRun(input, args[0], args[1], args[2], true)
    },
    {
        name: "Running Key Cipher Encode",
        group: POLYALPHABETIC,
        description: "Running key cipher: a Vigenere addition where the key is a passage of natural text instead of a repeated word. The passage must cover every letter of the message; non-letters pass through and do not consume key.",
        args: [
            {name: "Running key", type: "text", value: "THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG"},
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
        ],
        run: (input, args) => runningKeyRun(input, args[0], args[1], false)
    },
    {
        name: "Running Key Cipher Decode",
        group: POLYALPHABETIC,
        description: "Running key decoder: subtracts the passage letter at each position. The key must be at least as long as the message; a short passage is rejected rather than silently repeated.",
        args: [
            {name: "Running key", type: "text", value: "THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG"},
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
        ],
        run: (input, args) => runningKeyRun(input, args[0], args[1], true)
    },

    /* ---------------------------------------------------------------- numeric pairs */
    {
        name: "Digraph Number Encode",
        group: SUBSTITUTION,
        description: "Digraph numbers: every pair of letters is numbered in an alphabet-by-alphabet grid, with AA=1 and ZZ=676 by default. Dashes join pairs into one word and pipes separate words, so DOGS becomes 93-175.",
        args: [
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
            {name: "Numbering", type: "option", value: ["AA = 1", "AA = 0"]},
            {name: "Reading order", type: "option", value: ["Row first", "Column first"]}
        ],
        run: (input, args) => digraphNumberRun(input, args[0], args[1], args[2], false)
    },
    {
        name: "Digraph Number Decode",
        group: SUBSTITUTION,
        description: "Digraph number decoder: turns each number back into a letter pair using the chosen alphabet, numbering and reading order. A dash joins pairs into a word, a pipe separates words, and an out-of-range value becomes ??.",
        args: [
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
            {name: "Numbering", type: "option", value: ["AA = 1", "AA = 0"]},
            {name: "Reading order", type: "option", value: ["Row first", "Column first"]}
        ],
        run: (input, args) => digraphNumberRun(input, args[0], args[1], args[2], true)
    },
    {
        name: "Numeric Homophonic Encode",
        group: FRACTIONATION,
        description: "Numeric homophonic substitution: each letter can own several numeric tokens, and the encoder writes the first token in its list so runs are reproducible. Write one letter per line as A: 04 24 55; leading zeros are significant.",
        args: [
            {name: "Key (letter: tokens)", type: "text", value: HOMO_KEY},
            {name: "Token separator", type: "option", value: ["Space", "Comma", "Newline"]},
            {name: "Mark word gaps", type: "boolean", value: true}
        ],
        run: (input, args) => numericHomophonicRun(input, args[0], args[1], args[2], false)
    },
    {
        name: "Numeric Homophonic Decode",
        group: FRACTIONATION,
        description: "Numeric homophonic decoder: matches each numeric token exactly to its letter, so 04 and 4 are different values. A slash marks a word gap; unknown tokens become question marks rather than failing the whole run.",
        args: [
            {name: "Key (letter: tokens)", type: "text", value: HOMO_KEY},
            {name: "Token separator", type: "option", value: ["Space", "Comma", "Newline"]},
            {name: "Mark word gaps", type: "boolean", value: true}
        ],
        run: (input, args) => numericHomophonicRun(input, args[0], args[1], args[2], true)
    },

    /* ---------------------------------------------------------------- transposition */
    {
        name: "Double Transposition Encode",
        group: TRANSPOSITION,
        description: "Double transposition: deals the text into irregular columns under a keyword, reads the columns in keyword order, then repeats the whole transposition with a second keyword. Spaces and punctuation stay in the text; if the second keyword is blank the first is reused.",
        args: [
            {name: "Keyword #1", type: "string", value: "CACHE"},
            {name: "Keyword #2", type: "string", value: "SLEUTH"}
        ],
        run: (input, args) => doubleTranspositionRun(input, args[0], args[1], false)
    },
    {
        name: "Double Transposition Decode",
        group: TRANSPOSITION,
        description: "Double transposition decoder: unscrambles the second keyword's columns first, then the first keyword's, using the same irregular column lengths as the encoder. It is deterministic, so no padding is added or removed.",
        args: [
            {name: "Keyword #1", type: "string", value: "CACHE"},
            {name: "Keyword #2", type: "string", value: "SLEUTH"}
        ],
        run: (input, args) => doubleTranspositionRun(input, args[0], args[1], true)
    },
    {
        name: "Rotation Grid Encode",
        group: TRANSPOSITION,
        description: "Rotation grid: writes the text into rows of the chosen width, rotates the grid ninety degrees left or right, then reads it back out. Spaces rotate with the letters and newlines are kept at their original positions; the last row is padded to fill the grid.",
        args: [
            {name: "Direction", type: "option", value: ROTATION_DIRECTIONS},
            {name: "Columns", type: "number", value: 8},
            {name: "Pad character", type: "string", value: "X"}
        ],
        run: (input, args) => rotationGridRun(input, csRotationDirection(args[0]), args[1], args[2], false)
    },
    {
        name: "Rotation Grid Decode",
        group: TRANSPOSITION,
        description: "Rotation grid decoder: rotates the ciphertext the opposite way and reads the rows back. The ciphertext must fill whole columns, because the pad character is not guessed or removed.",
        args: [
            {name: "Direction", type: "option", value: ROTATION_DIRECTIONS},
            {name: "Columns", type: "number", value: 8},
            {name: "Pad character", type: "string", value: "X"}
        ],
        run: (input, args) => rotationGridRun(input, csRotationDirection(args[0]), args[1], args[2], true)
    },
    {
        name: "Burrows-Wheeler Encode",
        group: TRANSPOSITION,
        description: "Burrows-Wheeler transform: appends a unique end-of-file character, sorts every rotation of the text, and returns the last column. The marker is what lets the decoder rebuild the original without a stored row index.",
        args: [
            {name: "EOF character", type: "string", value: "$"}
        ],
        run: (input, args) => burrowsWheelerRun(input, args[0], false)
    },
    {
        name: "Burrows-Wheeler Decode",
        group: TRANSPOSITION,
        description: "Burrows-Wheeler decoder: rebuilds the rotation table from the last column and finds the row ending in the end-of-file character. The ciphertext must contain that marker exactly once.",
        args: [
            {name: "EOF character", type: "string", value: "$"}
        ],
        run: (input, args) => burrowsWheelerRun(input, args[0], true)
    },

    /* ---------------------------------------------------------------- fractionation */
    {
        name: "Morbit Cipher Encode",
        group: FRACTIONATION,
        description: "Morbit cipher: writes the text in Morse with x between letters and xx between words, pairs the symbols, and replaces each pair with a digit from the ranked nine-letter key. Output is grouped in fives for readability.",
        args: [
            {name: "Key", type: "string", value: "SECRETKEY"}
        ],
        run: (input, args) => morbitRun(input, args[0], false)
    },
    {
        name: "Morbit Cipher Decode",
        group: FRACTIONATION,
        description: "Morbit decoder: maps each digit back to its Morse pair, rebuilds the x-separated stream, and reads the letters. The same nine-letter key or 1-9 digit permutation must be used.",
        args: [
            {name: "Key", type: "string", value: "SECRETKEY"}
        ],
        run: (input, args) => morbitRun(input, args[0], true)
    },
    {
        name: "Nihilist Cipher Encode",
        group: FRACTIONATION,
        description: "Nihilist cipher: a Polybius square built from one keyword numbers the message and a second, additive keyword; the two row-column numbers are added to produce each ciphertext number. The 5x5 mode merges I and J, while 6x6 includes digits.",
        args: [
            {name: "Additive keyword", type: "string", value: "RUSSIAN"},
            {name: "Polybius keyword", type: "string", value: "KEYWORD"},
            {name: "Grid", type: "option", value: ["5x5", "6x6"]}
        ],
        run: (input, args) => nihilistRun(input, args[0], args[1], args[2], false)
    },
    {
        name: "Nihilist Cipher Decode",
        group: FRACTIONATION,
        description: "Nihilist decoder: subtracts the additive keyword's Polybius numbers from each ciphertext number, then looks the result up in the shared square. Unknown values become question marks.",
        args: [
            {name: "Additive keyword", type: "string", value: "RUSSIAN"},
            {name: "Polybius keyword", type: "string", value: "KEYWORD"},
            {name: "Grid", type: "option", value: ["5x5", "6x6"]}
        ],
        run: (input, args) => nihilistRun(input, args[0], args[1], args[2], true)
    },
    {
        name: "Straddle Checkerboard Encode",
        group: FRACTIONATION,
        description: "Straddling checkerboard: eight letters take one top-row digit, ten take a spare digit plus a second digit, and eight take the other spare digit plus a second digit. The two spare digits are removed from the top row so the stream stays decodable.",
        args: [
            {name: "Alphabet key", type: "string", value: "GEOCACHING"},
            {name: "Spare digit 1", type: "number", value: 2},
            {name: "Spare digit 2", type: "number", value: 6}
        ],
        run: (input, args) => straddleRun(input, args[0], args[1], args[2], false)
    },
    {
        name: "Straddle Checkerboard Decode",
        group: FRACTIONATION,
        description: "Straddling checkerboard decoder: a spare digit consumes the next digit for a two-digit cell; every other digit is a one-digit cell. Use the same alphabet and spare positions as the encoder.",
        args: [
            {name: "Alphabet key", type: "string", value: "GEOCACHING"},
            {name: "Spare digit 1", type: "number", value: 2},
            {name: "Spare digit 2", type: "number", value: 6}
        ],
        run: (input, args) => straddleRun(input, args[0], args[1], args[2], true)
    },
    {
        name: "VIC Cipher Encode",
        group: FRACTIONATION,
        description: "VIC checkerboard: the A-Z plus / and . alphabet is written into a straddling checkerboard, and an optional numeric key is added digit by digit modulo ten. This recreates CacheSleuth's checkerboard and over-encryption stage, not the full transposition cipher.",
        args: [
            {name: "Alphabet key", type: "string", value: "GEOCACHING/."},
            {name: "Spare digit 1", type: "number", value: 2},
            {name: "Spare digit 2", type: "number", value: 6},
            {name: "Numeric key", type: "string", value: "314159"}
        ],
        run: (input, args) => vicRun(input, args[0], args[1], args[2], args[3], false)
    },
    {
        name: "VIC Cipher Decode",
        group: FRACTIONATION,
        description: "VIC checkerboard decoder: subtracts the numeric key digit by digit, then reads the straddling checkerboard. Use the same alphabet, spare positions and numeric key as the encoder.",
        args: [
            {name: "Alphabet key", type: "string", value: "GEOCACHING/."},
            {name: "Spare digit 1", type: "number", value: 2},
            {name: "Spare digit 2", type: "number", value: 6},
            {name: "Numeric key", type: "string", value: "314159"}
        ],
        run: (input, args) => vicRun(input, args[0], args[1], args[2], args[3], true)
    },

    /* ---------------------------------------------------------------- reference tool */
    {
        name: "Book Cipher Decode",
        group: TOOLS,
        description: "Book cipher decoder: reads numeric references against a pasted source text. The format chooses what each part means (page, line, word or character), numbering can start at zero, and ---PAGE--- separates pages.",
        args: [
            {name: "Book text", type: "text", value: BOOK_SOURCE},
            {name: "Format", type: "option", value: BOOK_FORMATS},
            {name: "Numbering starts at", type: "number", value: 1},
            {name: "Ignore spaces", type: "boolean", value: false},
            {name: "First letter only", type: "boolean", value: false}
        ],
        run: (input, args) => bookCipherRun(input, args[0], args[1], args[2], args[3], args[4])
    }
];

export const pairs = [
    {id: "pizzini", encode: "Pizzini Cipher Encode", decode: "Pizzini Cipher Decode", args: [], sample: "ABCZ"},
    {id: "scream", encode: "Scream Cipher Encode", decode: "Scream Cipher Decode", args: [], sample: "ABZ"},
    {id: "keyboard", encode: "Keyboard Cipher Encode", decode: "Keyboard Cipher Decode", args: ["QWERTY"], sample: "abc"},
    {id: "additive", encode: "Additive Cipher Encode", decode: "Additive Cipher Decode", args: [16, "ABCDEFGHIJKLMNOPQRSTUVWXYZ"], sample: "MESSAGE"},
    {id: "keyed-caesar", encode: "Keyed Caesar Cipher Encode", decode: "Keyed Caesar Cipher Decode", args: [13, "CACHE", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"], sample: "ATTACKATDAWN"},
    {id: "running-key", encode: "Running Key Cipher Encode", decode: "Running Key Cipher Decode", args: ["THEQUICKBROWNFOX", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"], sample: "HELLO"},
    {id: "digraph-number", encode: "Digraph Number Encode", decode: "Digraph Number Decode", args: ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "AA = 1", "Row first"], sample: "DOGS"},
    {id: "double-transposition", encode: "Double Transposition Encode", decode: "Double Transposition Decode", args: ["CACHE", "SLEUTH"], sample: "WEAREDISCOVEREDFLEEATONCE"},
    {id: "rotation-grid", encode: "Rotation Grid Encode", decode: "Rotation Grid Decode", args: [ROTATION_DIRECTIONS[0], 4, "X"], sample: "ABCDEFGH"},
    {id: "burrows-wheeler", encode: "Burrows-Wheeler Encode", decode: "Burrows-Wheeler Decode", args: ["$"], sample: "banana"},
    {id: "morbit", encode: "Morbit Cipher Encode", decode: "Morbit Cipher Decode", args: ["SECRETKEY"], sample: "ONCE"},
    {id: "nihilist", encode: "Nihilist Cipher Encode", decode: "Nihilist Cipher Decode", args: ["RUSSIAN", "KEYWORD", "5x5"], sample: "ATTACKATDAWN"},
    {id: "numeric-homophonic", encode: "Numeric Homophonic Encode", decode: "Numeric Homophonic Decode", args: [HOMO_KEY, "Space", false], sample: "ABC"},
    {id: "straddle", encode: "Straddle Checkerboard Encode", decode: "Straddle Checkerboard Decode", args: ["GEOCACHING", 2, 6], sample: "ABC"},
    {id: "vic", encode: "VIC Cipher Encode", decode: "VIC Cipher Decode", args: ["GEOCACHING/.", 2, 6, "314159"], sample: "ABC"}
];

export const checks = [
    {name: "Albam Cipher", input: "ABC XYZ", args: {}, expected: "LMN IJK"},
    {name: "Carbonaro Cipher", input: "ABC", args: {}, expected: "OPG"},
    {name: "Kamasutra Cipher", input: "ABCXYZ", args: { "Key pairs": KAMASUTRA_PAIRS }, expected: "ZYXCBA"},
    {name: "Pizzini Cipher Encode", input: "ABCZ", args: {}, expected: "45629"},
    {name: "Pizzini Cipher Decode", input: "45629", args: {}, expected: "ABCZ"},
    {name: "Scream Cipher Encode", input: "ABZ", args: {}, expected: "AȦȺ"},
    {name: "Scream Cipher Decode", input: "AȦȺ", args: {}, expected: "ABZ"},
    {name: "Keyboard Cipher Encode", input: "ABC", args: {Layout: "QWERTY"}, expected: "qwe"},
    {name: "Keyboard Cipher Decode", input: "qwe", args: {Layout: "QWERTY"}, expected: "abc"},
    {name: "Additive Cipher Encode", input: "M", args: {Key: 16, Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}, expected: "C"},
    {name: "Additive Cipher Decode", input: "C", args: {Key: 16, Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}, expected: "M"},
    {name: "Keyed Caesar Cipher Encode", input: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", args: {Shift: 13, Keyword: "CACHE", Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}, expected: "NOPQRSTUVWXYZCAHEBDFGIJKLM"},
    {name: "Keyed Caesar Cipher Decode", input: "NOPQRSTUVWXYZCAHEBDFGIJKLM", args: {Shift: 13, Keyword: "CACHE", Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}, expected: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    {name: "Running Key Cipher Encode", input: "HELLO", args: {"Running key": "THEQUICKBROWNFOX", Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}, expected: "ALPBI"},
    {name: "Running Key Cipher Decode", input: "ALPBI", args: {"Running key": "THEQUICKBROWNFOX", Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}, expected: "HELLO"},
    {name: "Digraph Number Encode", input: "DOGS", args: {Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", Numbering: "AA = 1", "Reading order": "Row first"}, expected: "93-175"},
    {name: "Digraph Number Decode", input: "93-175", args: {Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", Numbering: "AA = 1", "Reading order": "Row first"}, expected: "DOGS"},
    {name: "Double Transposition Encode", input: "WEAREDISCOVEREDFLEEATONCE", args: {"Keyword #1": "CACHE", "Keyword #2": "SLEUTH"}, expected: "EFNRWSDEIVEEEDRACOAOELTEC"},
    {name: "Double Transposition Decode", input: "EFNRWSDEIVEEEDRACOAOELTEC", args: {"Keyword #1": "CACHE", "Keyword #2": "SLEUTH"}, expected: "WEAREDISCOVEREDFLEEATONCE"},
    {name: "Rotation Grid Encode", input: "ABCDEFGH", args: {Direction: ROTATION_DIRECTIONS[0], Columns: 4, "Pad character": "X"}, expected: "EAFBGCHD"},
    {name: "Rotation Grid Decode", input: "EAFBGCHD", args: {Direction: ROTATION_DIRECTIONS[0], Columns: 4, "Pad character": "X"}, expected: "ABCDEFGH"},
    {name: "Burrows-Wheeler Encode", input: "banana", args: {"EOF character": "$"}, expected: "annb$aa"},
    {name: "Burrows-Wheeler Decode", input: "annb$aa", args: {"EOF character": "$"}, expected: "banana"},
    {name: "Morbit Cipher Encode", input: "ONCE", args: {Key: "SECRETKEY"}, expected: "38642 11"},
    {name: "Morbit Cipher Decode", input: "38642 11", args: {Key: "SECRETKEY"}, expected: "ONCE"},
    {name: "Nihilist Cipher Encode", input: "ATTACK AT DAWN", args: {"Additive keyword": "RUSSIAN", "Polybius keyword": "KEYWORD", Grid: "5x5"}, expected: "44 103 96 68 59 34 65 72 74 68 59 76"},
    {name: "Nihilist Cipher Decode", input: "44 103 96 68 59 34 65 72 74 68 59 76", args: {"Additive keyword": "RUSSIAN", "Polybius keyword": "KEYWORD", Grid: "5x5"}, expected: "ATTACKATDAWN"},
    {name: "Numeric Homophonic Encode", input: "ABC", args: {"Key (letter: tokens)": "A: 04 24 55\nB: 18 60\nC: 03", "Token separator": "Space", "Mark word gaps": false}, expected: "04 18 03"},
    {name: "Numeric Homophonic Decode", input: "04 18 03", args: {"Key (letter: tokens)": "A: 04 24 55\nB: 18 60\nC: 03", "Token separator": "Space", "Mark word gaps": false}, expected: "ABC"},
    {name: "Straddle Checkerboard Encode", input: "ABC", args: {"Alphabet key": "GEOCACHING", "Spare digit 1": 2, "Spare digit 2": 6}, expected: "5204"},
    {name: "Straddle Checkerboard Decode", input: "5204", args: {"Alphabet key": "GEOCACHING", "Spare digit 1": 2, "Spare digit 2": 6}, expected: "ABC"},
    {name: "VIC Cipher Encode", input: "ABC", args: {"Alphabet key": "GEOCACHING/.", "Spare digit 1": 2, "Spare digit 2": 6, "Numeric key": "314159"}, expected: "8365"},
    {name: "VIC Cipher Decode", input: "8365", args: {"Alphabet key": "GEOCACHING/.", "Spare digit 1": 2, "Spare digit 2": 6, "Numeric key": "314159"}, expected: "ABC"},
    {name: "Book Cipher Decode", input: "1:2 2:3", args: {"Book text": "alpha beta gamma\ndelta epsilon zeta", Format: "line:word", "Numbering starts at": 1, "Ignore spaces": false, "First letter only": false}, expected: "beta zeta"}
];
