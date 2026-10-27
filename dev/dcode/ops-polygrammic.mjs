/* dCode polygrammic and fractionation ciphers -----------------------------------
 * Playfair, two-square, four-square, Hill, ADFGX / ADFGVX, fractionated Morse,
 * tap code and the Polybius square, recreated from the published descriptions.
 */

const GROUP = "dCode · Polygrammic";

const MERGE = {name: "Merge letters", type: "option", value: ["J>I", "I>J", "V>W", "W>V", "Z omitted"]};
const mergeArg = value => cfOption(value, ["J>I", "I>J", "V>W", "W>V", "Z omitted"], "J>I");

export const ops = [
    {
        name: "Playfair Cipher Encode",
        group: GROUP,
        description: "Playfair cipher on a 5x5 square built from the keyword (repeated letters and the merged letter removed). Digraphs are split, a repeated letter is separated with the filler, and each pair is encoded by shifting right, shifting down, or swapping columns. One letter of the alphabet has to be merged away.",
        args: [
            {name: "Keyword", type: "string", value: "PLAYFAIR EXAMPLE"},
            MERGE,
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => playfairRun(input, args[0], cfMergeArg(args[1]), cfChar(args[2], "X"), false)
    },
    {
        name: "Playfair Cipher Decode",
        group: GROUP,
        description: "Playfair decoder: the same square with the shifts reversed.",
        args: [
            {name: "Keyword", type: "string", value: "PLAYFAIR EXAMPLE"},
            MERGE,
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => playfairRun(input, args[0], cfMergeArg(args[1]), cfChar(args[2], "X"), true)
    },
    {
        name: "Two-Square Cipher Encode",
        group: GROUP,
        description: "Two-square cipher: two 5x5 squares, the first plaintext letter is looked up in the first square and the second in the second square, and the ciphertext letters sit in the other's row (horizontal) or column (vertical). Pairs are padded with the filler.",
        args: [
            {name: "Keyword 1", type: "string", value: "KEY"},
            {name: "Keyword 2", type: "string", value: "WORD"},
            {name: "Orientation", type: "option", value: ["Horizontal", "Vertical"]},
            MERGE,
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => twoSquareRun(input, args[0], args[1], cfOption(args[2], ["Horizontal", "Vertical"], "Horizontal"), cfMergeArg(args[3]), cfChar(args[4], "X"), false)
    },
    {
        name: "Two-Square Cipher Decode",
        group: GROUP,
        description: "Two-square decoder: each ciphertext letter is located in the square it came from and the plaintext pair is rebuilt.",
        args: [
            {name: "Keyword 1", type: "string", value: "KEY"},
            {name: "Keyword 2", type: "string", value: "WORD"},
            {name: "Orientation", type: "option", value: ["Horizontal", "Vertical"]},
            MERGE,
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => twoSquareRun(input, args[0], args[1], cfOption(args[2], ["Horizontal", "Vertical"], "Horizontal"), cfMergeArg(args[3]), cfChar(args[4], "X"), true)
    },
    {
        name: "Four-Square Cipher Encode",
        group: GROUP,
        description: "Four-square cipher: four 5x5 squares. The plaintext pair is read from the top-left and bottom-right squares and the ciphertext is taken from the top-right and bottom-left ones, so letter frequencies are flattened. Leave a keyword empty for a plain alphabet square. The keywords map to the squares in reading order (top-left, top-right, bottom-left, bottom-right).",
        args: [
            {name: "Top left keyword", type: "string", value: "JOHN"},
            {name: "Top right keyword", type: "string", value: "GEORGE"},
            {name: "Bottom left keyword", type: "string", value: "PAUL"},
            {name: "Bottom right keyword", type: "string", value: "RINGO"},
            MERGE,
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => fourSquareRun(input, args[0], args[1], args[2], args[3], cfMergeArg(args[4]), cfChar(args[5], "X"), false)
    },
    {
        name: "Four-Square Cipher Decode",
        group: GROUP,
        description: "Four-square decoder: the ciphertext letters are located in the keyed squares and the plaintext pair is read from the two remaining squares.",
        args: [
            {name: "Top left keyword", type: "string", value: "JOHN"},
            {name: "Top right keyword", type: "string", value: "GEORGE"},
            {name: "Bottom left keyword", type: "string", value: "PAUL"},
            {name: "Bottom right keyword", type: "string", value: "RINGO"},
            MERGE,
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => fourSquareRun(input, args[0], args[1], args[2], args[3], cfMergeArg(args[4]), cfChar(args[5], "X"), true)
    },
    {
        name: "Hill Cipher Encode",
        group: GROUP,
        description: "Hill cipher: each block of letters is multiplied by a square matrix modulo the alphabet length. Give the matrix row by row, for example 2,3,5,7 for a 2x2 key.",
        args: [
            {name: "Matrix", type: "string", value: "2,3,5,7"},
            {name: "Size", type: "option", value: ["2", "3"]},
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
            {name: "Filler", type: "string", value: "Z"}
        ],
        run: (input, args) => hillRun(input, args[0], Number(cfOption(args[1], ["2", "3"], "2")), args[2], cfChar(args[3], "Z"), false)
    },
    {
        name: "Hill Cipher Decode",
        group: GROUP,
        description: "Hill decoder: multiplies by the inverse of the matrix modulo the alphabet length. The matrix must be invertible (its determinant coprime with the alphabet length).",
        args: [
            {name: "Matrix", type: "string", value: "2,3,5,7"},
            {name: "Size", type: "option", value: ["2", "3"]},
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
            {name: "Filler", type: "string", value: "Z"}
        ],
        run: (input, args) => hillRun(input, args[0], Number(cfOption(args[1], ["2", "3"], "2")), args[2], cfChar(args[3], "Z"), true)
    },
    {
        name: "ADFGX Cipher Encode",
        group: GROUP,
        description: "ADFGX (German WWI field cipher): each letter is replaced by its row and column labels from a 5x5 square, then the coordinate stream is transposed with a keyword. The 5x5 square merges one letter away, so give the keyword that builds it.",
        probeInput: "ATTACKATDAWN",
        args: [
            {name: "Transposition keyword", type: "string", value: "CODE"},
            {name: "Square keyword", type: "string", value: ""},
            MERGE
        ],
        run: (input, args) => adfgRun(input, args[0], cfMergeAlphabet(cfMergeArg(args[2])), "ADFGX", false)
    },
    {
        name: "ADFGX Cipher Decode",
        group: GROUP,
        description: "ADFGX decoder: undoes the transposition and maps the coordinate pairs back through the square.",
        // dCode's page has no worked ADFGX example, so the probe feeds the decoder the
        // ciphertext this recreation produces for ATTACKATDAWN with the default square.
        probeInput: "AGAAAXGADGAFGAXGAFAGFAGD",
        args: [
            {name: "Transposition keyword", type: "string", value: "CODE"},
            {name: "Square keyword", type: "string", value: ""},
            MERGE
        ],
        run: (input, args) => adfgRun(input, args[0], cfMergeAlphabet(cfMergeArg(args[2])), "ADFGX", true)
    },
    {
        name: "ADFGVX Cipher Encode",
        group: GROUP,
        description: "ADFGVX: the same coordinate substitution over a 6x6 square holding A-Z and 0-9, with the six labels A, D, F, G, V, X, followed by a keyword transposition. dCode's default square is the alphabet followed by the digits.",
        args: [
            {name: "Transposition keyword", type: "string", value: "CODE"},
            {name: "Square alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"}
        ],
        run: (input, args) => adfgRun(input, args[0], String(args[1] || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), "ADFGVX", false)
    },
    {
        name: "ADFGVX Cipher Decode",
        group: GROUP,
        description: "ADFGVX decoder: undoes the transposition and maps the coordinate pairs back through the 6x6 square.",
        args: [
            {name: "Transposition keyword", type: "string", value: "CODE"},
            {name: "Square alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"}
        ],
        run: (input, args) => adfgRun(input, args[0], String(args[1] || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), "ADFGVX", true)
    },
    {
        name: "Fractionated Morse Encode",
        group: GROUP,
        description: "Fractionated Morse: the message becomes Morse with | between letters and || between words, the symbol stream is cut into trigrams of dot, dash and separator, and each trigram indexes one letter of a 27-symbol table (A-Z plus the full separator trigram). A trailing partial trigram is padded with dots.",
        args: [
            {name: "Letter separator", type: "string", value: "|"},
            {name: "Word separator", type: "string", value: "||"},
            {name: "Pad character", type: "string", value: "."}
        ],
        run: (input, args) => fracMorseEncode(input, args[0] || "|", args[1] || "||", cfChar(args[2], "."))
    },
    {
        name: "Fractionated Morse Decode",
        group: GROUP,
        description: "Fractionated Morse decoder: each letter is turned back into a trigram and the reconstructed Morse stream is read as text.",
        args: [
            {name: "Letter separator", type: "string", value: "|"},
            {name: "Word separator", type: "string", value: "||"},
            {name: "Pad character", type: "string", value: "."}
        ],
        run: (input, args) => fracMorseDecode(input, args[0] || "|", args[1] || "||", cfChar(args[2], "."))
    },
    {
        name: "Tap Code Encode",
        group: GROUP,
        description: "Tap code (knock code): each letter is two counts, the row then the column in a 5x5 square, written either as digits or as runs of dots. The default square merges K away, as dCode's example does.",
        args: [
            {name: "Square alphabet", type: "string", value: "ABCDEFGHIJLMNOPQRSTUVWXYZ"},
            {name: "Format", type: "option", value: ["Dots", "Digits"]},
            {name: "Separator", type: "string", value: " "}
        ],
        run: (input, args) => tapRun(input, args[0], cfOption(args[1], ["Dots", "Digits"], "Dots"), args[2] == null || args[2] === "" ? " " : String(args[2]), false)
    },
    {
        name: "Tap Code Decode",
        group: GROUP,
        description: "Tap code decoder: runs of dots or pairs of digits are read as row and column through the same square.",
        args: [
            {name: "Square alphabet", type: "string", value: "ABCDEFGHIJLMNOPQRSTUVWXYZ"},
            {name: "Format", type: "option", value: ["Dots", "Digits"]},
            {name: "Separator", type: "string", value: " "}
        ],
        run: (input, args) => tapRun(input, args[0], cfOption(args[1], ["Dots", "Digits"], "Dots"), args[2] == null || args[2] === "" ? " " : String(args[2]), true)
    },
    {
        name: "Polybius Square Encode",
        group: GROUP,
        description: "Polybius square: each letter becomes its row and column numbers in a 5x5 square (1-based by default, as dCode's example uses). The square can be scrambled with a keyword and one letter is merged away.",
        args: [
            {name: "Keyword", type: "string", value: ""},
            MERGE,
            {name: "Separator", type: "string", value: ","},
            {name: "Coordinate base", type: "option", value: ["1", "0"]}
        ],
        run: (input, args) => polybiusRun(input, args[0], cfMergeArg(args[1]), args[2], cfOption(args[3], ["1", "0"], "1") === "0" ? 0 : 1, false)
    },
    {
        name: "Polybius Square Decode",
        group: GROUP,
        description: "Polybius decoder: pairs of coordinates are read back through the square.",
        args: [
            {name: "Keyword", type: "string", value: ""},
            MERGE,
            {name: "Separator", type: "string", value: ","},
            {name: "Coordinate base", type: "option", value: ["1", "0"]}
        ],
        run: (input, args) => polybiusRun(input, args[0], cfMergeArg(args[1]), args[2], cfOption(args[3], ["1", "0"], "1") === "0" ? 0 : 1, true)
    }
];

const MERGE_OPTS = "J>I";

export const pairs = [
    {id: "playfair", encode: "Playfair Cipher Encode", decode: "Playfair Cipher Decode", args: ["PLAYFAIR EXAMPLE", MERGE_OPTS, "X"], sample: "ATTACKATDAWN"},
    {id: "two-square", encode: "Two-Square Cipher Encode", decode: "Two-Square Cipher Decode", args: ["KEY", "WORD", "Horizontal", MERGE_OPTS, "X"], sample: "DCODES"},
    {id: "four-square", encode: "Four-Square Cipher Encode", decode: "Four-Square Cipher Decode", args: ["JOHN", "GEORGE", "PAUL", "RINGO", MERGE_OPTS, "X"], sample: "BEATLESX"},
    {id: "hill", encode: "Hill Cipher Encode", decode: "Hill Cipher Decode", args: ["2,3,5,7", "2", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "Z"], sample: "DCODES"},
    {id: "adfgx", encode: "ADFGX Cipher Encode", decode: "ADFGX Cipher Decode", args: ["CODE", "", MERGE_OPTS], sample: "ATTACKATDAWN"},
    {id: "adfgvx", encode: "ADFGVX Cipher Encode", decode: "ADFGVX Cipher Decode", args: ["CODE", "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"], sample: "ATTACKATDAWN"},
    {id: "fractionated-morse", encode: "Fractionated Morse Encode", decode: "Fractionated Morse Decode", args: ["|", "||", "."], sample: "DCODE"},
    {id: "polybius", encode: "Polybius Square Encode", decode: "Polybius Square Decode", args: ["", MERGE_OPTS, ",", "1"], sample: "DCODE"}
];

export const checks = [
    // Wikipedia's worked Playfair example (same square as dCode's 5x5 rule).
    {name: "Playfair Cipher Encode", input: "HIDE THE GOLD IN THE TREE STUMP", args: {Keyword: "PLAYFAIR EXAMPLE", "Merge letters": "J>I", Filler: "X"}, expected: "BMODZBXDNABEKUDMUIXMMOUVIF"},
    // The filler X that separated the double E in "TREE" comes back with the
    // decryption, which is inherent to Playfair: the filler is not distinguishable
    // from a real letter in the ciphertext.
    {name: "Playfair Cipher Decode", input: "BMODZBXDNABEKUDMUIXMMOUVIF", args: {Keyword: "PLAYFAIR EXAMPLE", "Merge letters": "J>I", Filler: "X"}, expected: "HIDETHEGOLDINTHETREXESTUMP"},
    // dCode's decryption example for the two-square cipher (keys KEY / WORD).
    {name: "Two-Square Cipher Decode", input: "CDLBAV", args: {"Keyword 1": "KEY", "Keyword 2": "WORD", Orientation: "Horizontal", "Merge letters": "J>I", Filler: "X"}, expected: "DCODEZ"},
    {name: "Two-Square Cipher Encode", input: "DCODEZ", args: {"Keyword 1": "KEY", "Keyword 2": "WORD", Orientation: "Horizontal", "Merge letters": "J>I", Filler: "X"}, expected: "CDLBAV"},
    // dCode's Hill example: DCODE with the matrix [[2,3],[5,7]], padded with Z.
    {name: "Hill Cipher Encode", input: "DCODE", args: {Matrix: "2,3,5,7", Size: "2", Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", Filler: "Z"}, expected: "MDLNFN"},
    // The trailing Z is the block padding the encoder added (5 letters, 2x2 key).
    {name: "Hill Cipher Decode", input: "MDLNFN", args: {Matrix: "2,3,5,7", Size: "2", Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", Filler: "Z"}, expected: "DCODEZ"},
    // dCode's ADFGVX example with the default alphabet square, read back.
    {name: "ADFGVX Cipher Encode", input: "BERLIN", args: {"Transposition keyword": "CODE", "Square alphabet": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"}, expected: "AFDADFVXDDXF"},
    {name: "ADFGVX Cipher Decode", input: "AFDADFVXDDXF", args: {"Transposition keyword": "CODE", "Square alphabet": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"}, expected: "BERLIN"},
    // dCode's four-square example: four squares keyed JOHN / GEORGE / PAUL / RINGO with
    // the letter Z omitted, BEATLES padded to BEATLESX and encrypted to HCASMFSX.
    {name: "Four-Square Cipher Encode", input: "BEATLES", args: {"Top left keyword": "JOHN", "Top right keyword": "GEORGE", "Bottom left keyword": "PAUL", "Bottom right keyword": "RINGO", "Merge letters": "Z omitted", Filler: "X"}, expected: "HCASMFSX"},
    // The filler X that completed the last pair comes back with the decryption.
    {name: "Four-Square Cipher Decode", input: "HCASMFSX", args: {"Top left keyword": "JOHN", "Top right keyword": "GEORGE", "Bottom left keyword": "PAUL", "Bottom right keyword": "RINGO", "Merge letters": "Z omitted", Filler: "X"}, expected: "BEATLESX"},
    // dCode's fractionated Morse example prints a trailing word separator after the
    // last word, which adds a 13th letter (Y). This implementation follows the
    // standard definition and stops the symbol stream at the last letter, so the
    // vector below is the 12 symbols of the same example without that stray letter.
    {name: "Fractionated Morse Encode", input: "DCODE MORSE", args: {"Letter separator": "|", "Word separator": "||", "Pad character": "."}, expected: "JVLNVGZQODSG"},
    {name: "Fractionated Morse Decode", input: "JVLNVGZQODSG", args: {"Letter separator": "|", "Word separator": "||", "Pad character": "."}, expected: "DCODE MORSE"},
    // dCode's Polybius example uses the plain square with 1-based coordinates.
    {name: "Polybius Square Encode", input: "DCODE", args: {Keyword: "", "Merge letters": "J>I", Separator: ",", "Coordinate base": "1"}, expected: "14,13,34,14,15"},
    {name: "Polybius Square Decode", input: "14,13,34,14,15", args: {Keyword: "", "Merge letters": "J>I", Separator: ",", "Coordinate base": "1"}, expected: "DCODE"},
    // dCode's tap code example, written as runs of dots.
    {name: "Tap Code Encode", input: "DCODE", args: {"Square alphabet": "ABCDEFGHIJLMNOPQRSTUVWXYZ", Format: "Dots", Separator: " "}, expected: ". .... . ... ... .... . .... . ....."},
    {name: "Tap Code Decode", input: ". .... . ... ... .... . .... . .....", args: {"Square alphabet": "ABCDEFGHIJLMNOPQRSTUVWXYZ", Format: "Dots", Separator: " "}, expected: "DCODE"},
    {name: "Tap Code Encode", input: "DCODE", args: {"Square alphabet": "ABCDEFGHIJLMNOPQRSTUVWXYZ", Format: "Digits", Separator: " "}, expected: "14 13 34 14 15"}
];
