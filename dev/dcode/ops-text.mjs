/* dCode text ciphers ------------------------------------------------------------
 * Ragbaby, Grandpre, Collon, Bazeries, homophonic substitution, triliteral,
 * slidefair, Swagman, Ubchi, route transposition, three-square, trifid and Pollux,
 * recreated from the published descriptions on dcode.fr (the site's code is not
 * embedded or fetched).
 *
 * Known-answer vectors come from the worked examples on the dCode pages. Where a
 * page's example depends on a random choice (homophonic substitutes, the random
 * letters of three-square, Pollux's character pools), the vector pins the direction
 * that is deterministic and the other direction is covered by a roundtrip pair.
 */

const SUBSTITUTION = "dCode · Substitution";
const FRACTIONATION = "dCode · Fractionation";
const TRANSPOSITION = "dCode · Transposition";
const POLYGRAMMIC = "dCode · Polygrammic";

const GRANDPRE_GRID = "VOLUPTUEUX\nINQUIETUDE\nMAJESTUEUX\nOBLIGEANCE\nUNIFORMITE\nTWICKENHAM\nINGOLSTADT\nEINSIEDELN\nRYMKIEWICZ\nSHREWSBURY";
const SWAGMAN_KEY = "1 3 2 4\n3 4 1 2\n2 1 4 3\n4 2 3 1";

export const ops = [
    /* ---------------------------------------------------------------- Ragbaby */
    {
        name: "Ragbaby Cipher Encode",
        group: SUBSTITUTION,
        description: "Ragbaby cipher (originally a 24-letter alphabet). Give the keyed alphabet, for example SECRTABDFGHIJKLMNOPQUVWXYZ for the key SECRET: the letter at position j of the i-th word is shifted forward by i + j places in that alphabet, so the same letter encodes differently in every word. Letters outside the alphabet are dropped.",
        args: [
            {name: "Keyed alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
            {name: "Alphabet", type: "option", value: ["26 letters", "24 letters (J and X dropped)"]}
        ],
        run: (input, args) => ragbabyRun(input, args[0], cfOption(args[1], ["26 letters", "24 letters (J and X dropped)"], "26 letters") === "24 letters (J and X dropped)" ? "24" : "26", false)
    },
    {
        name: "Ragbaby Cipher Decode",
        group: SUBSTITUTION,
        description: "Ragbaby decoder: the word number and the letter position are subtracted from each letter instead of added, which needs the same keyed alphabet and alphabet size as the encoder.",
        args: [
            {name: "Keyed alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
            {name: "Alphabet", type: "option", value: ["26 letters", "24 letters (J and X dropped)"]}
        ],
        run: (input, args) => ragbabyRun(input, args[0], cfOption(args[1], ["26 letters", "24 letters (J and X dropped)"], "26 letters") === "24 letters (J and X dropped)" ? "24" : "26", true)
    },

    /* ---------------------------------------------------------------- Grandpre */
    {
        name: "Grandpre Cipher Encode",
        group: SUBSTITUTION,
        description: "Grandpre cipher: every letter is replaced by the two labels of its cell in a 10x10 grid (rows and columns labelled 1-9 then 0). A letter can appear in several cells, so this recreation always takes the first one, while dCode picks among the duplicates.",
        args: [
            {name: "Grid", type: "string", value: GRANDPRE_GRID},
            {name: "Separator", type: "string", value: " "}
        ],
        run: (input, args) => grandpreRun(input, args[0], args[1], false)
    },
    {
        name: "Grandpre Cipher Decode",
        group: SUBSTITUTION,
        description: "Grandpre decoder: each pair of labels is looked up in the grid (row label first, then column label). Decoding is exact, so this is the direction dCode's worked example pins down.",
        args: [
            {name: "Grid", type: "string", value: GRANDPRE_GRID},
            {name: "Separator", type: "string", value: " "}
        ],
        run: (input, args) => grandpreRun(input, args[0], args[1], true)
    },

    /* ---------------------------------------------------------------- Collon */
    {
        name: "Collon Cipher Encode",
        group: SUBSTITUTION,
        description: "Collon cipher: the text is cut into blocks of N letters and each block is written as the first letter of every row it uses, followed by the last letter of every column it uses.",
        args: [
            {name: "Grid", type: "string", value: "ABCDE\nFGHIK\nLMNOP\nQRSTU\nVWXYZ"},
            {name: "Block size", type: "number", value: 2}
        ],
        run: (input, args) => collonRun(input, args[0], args[1], false)
    },
    {
        name: "Collon Cipher Decode",
        group: SUBSTITUTION,
        description: "Collon decoder: every block of 2N ciphertext letters is halved, the first half gives the rows and the second half the columns of the grid.",
        args: [
            {name: "Grid", type: "string", value: "ABCDE\nFGHIK\nLMNOP\nQRSTU\nVWXYZ"},
            {name: "Block size", type: "number", value: 2}
        ],
        run: (input, args) => collonRun(input, args[0], args[1], true)
    },

    /* ---------------------------------------------------------------- Bazeries */
    {
        name: "Bazeries Cipher Encode",
        group: SUBSTITUTION,
        description: "Bazeries cipher: the message is cut into groups whose sizes cycle through the digits of N, each group is reversed, and every letter is then replaced by the letter at the same position of a second, keyword-built square.",
        args: [
            {name: "N (group sizes)", type: "string", value: "23"},
            {name: "Grid 1 alphabet", type: "string", value: "ABCDEFGHIKLMNOPQRSTUVWXYZ"},
            {name: "Grid 2 keyword", type: "string", value: "TWENTYTHREE"}
        ],
        run: (input, args) => bazeriesRun(input, args[0], args[1], args[2], false)
    },
    {
        name: "Bazeries Cipher Decode",
        group: SUBSTITUTION,
        description: "Bazeries decoder: the substitution is read back from the second square into the first, then each group is reversed again using the same group sizes.",
        // A probe needs ciphertext of this cipher: DCODE with the default grids.
        probeInput: "DLSLO",
        args: [
            {name: "N (group sizes)", type: "string", value: "23"},
            {name: "Grid 1 alphabet", type: "string", value: "ABCDEFGHIKLMNOPQRSTUVWXYZ"},
            {name: "Grid 2 keyword", type: "string", value: "TWENTYTHREE"}
        ],
        run: (input, args) => bazeriesRun(input, args[0], args[1], args[2], true)
    },

    /* ---------------------------------------------------------------- homophonic */
    {
        name: "Homophonic Substitution Encode",
        group: SUBSTITUTION,
        description: "Homophonic substitution: every letter of a correspondence table can have several numbers and the encoder picks one, which flattens the frequencies. This recreation always writes the first number of the list so the result is reproducible.",
        args: [
            {name: "Correspondence table", type: "string", value: "A(45,96,17), B(37,60), C(05,88)"},
            {name: "Separator", type: "string", value: ","}
        ],
        run: (input, args) => homoRun(input, args[0], args[1], false)
    },
    {
        name: "Homophonic Substitution Decode",
        group: SUBSTITUTION,
        description: "Homophonic decoder: every number of the ciphertext is looked up in the correspondence table, which is exact because each number belongs to a single letter.",
        args: [
            {name: "Correspondence table", type: "string", value: "A(45,96,17), B(37,60), C(05,88)"},
            {name: "Separator", type: "string", value: ","}
        ],
        run: (input, args) => homoRun(input, args[0], args[1], true)
    },

    /* ---------------------------------------------------------------- triliteral */
    {
        name: "Triliteral Cipher Encode",
        group: FRACTIONATION,
        description: "Triliteral cipher: every symbol of the alphabet is written as three letters of a three-symbol alphabet, counting in base 3 (A=0, B=1, C=2). dCode's example alphabet is the 26 letters followed by a space, so A is AAA and the space is CCC.",
        args: [
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ "},
            {name: "Separator", type: "string", value: " "}
        ],
        run: (input, args) => triliteralRun(input, args[0], args[1], false)
    },
    {
        name: "Triliteral Cipher Decode",
        group: FRACTIONATION,
        description: "Triliteral decoder: every group of three symbols is read as a base 3 number and looked up in the alphabet.",
        args: [
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ "},
            {name: "Separator", type: "string", value: " "}
        ],
        run: (input, args) => triliteralRun(input, args[0], args[1], true)
    },

    /* ---------------------------------------------------------------- slidefair */
    {
        name: "Slidefair Cipher Encode",
        group: "dCode · Poly-alphabetic",
        description: "Slidefair cipher: the message is taken in pairs and one key letter is used per pair. The second letter of the pair, shifted back by the key, becomes the first ciphertext letter, and the first letter shifted on by the key becomes the second.",
        args: [
            {name: "Key", type: "string", value: "ABC"},
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => slidefairRun(input, args[0], args[1], args[2], false)
    },
    {
        name: "Slidefair Cipher Decode",
        group: "dCode · Poly-alphabetic",
        description: "Slidefair decoder: the two shifts are swapped, so the second ciphertext letter shifted back gives the first plaintext letter and the first ciphertext letter shifted on gives the second.",
        args: [
            {name: "Key", type: "string", value: "ABC"},
            {name: "Alphabet", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => slidefairRun(input, args[0], args[1], args[2], true)
    },

    /* ---------------------------------------------------------------- Swagman */
    {
        name: "Swagman Cipher Encode",
        group: TRANSPOSITION,
        description: "Swagman cipher: the text is padded and written down the columns of the grid, then every row is read in the order of the key numbers of that row (the key rows repeat when the message is taller than the key).",
        args: [
            {name: "Key grid", type: "string", value: SWAGMAN_KEY},
            {name: "Null letter", type: "string", value: "X"}
        ],
        run: (input, args) => swagmanRun(input, args[0], args[1], false)
    },
    {
        name: "Swagman Cipher Decode",
        group: TRANSPOSITION,
        description: "Swagman decoder: every ciphertext row is scattered back into the columns named by the key numbers and the plaintext is then read down the columns.",
        args: [
            {name: "Key grid", type: "string", value: SWAGMAN_KEY},
            {name: "Null letter", type: "string", value: "X"}
        ],
        run: (input, args) => swagmanRun(input, args[0], args[1], true)
    },

    /* ---------------------------------------------------------------- Ubchi */
    {
        name: "Ubchi Cipher Encode",
        group: TRANSPOSITION,
        description: "Ubchi cipher (Korean, used by German agents in WWI): the text is written under the keyword and the columns are read in alphabetical order of the key, null letters are appended, and the same transposition is applied a second time.",
        args: [
            {name: "Keyword", type: "string", value: "UBER"},
            {name: "Null letters", type: "number", value: 1},
            {name: "Null letter", type: "string", value: "X"}
        ],
        run: (input, args) => ubchiRun(input, args[0], args[1], args[2], false)
    },
    {
        name: "Ubchi Cipher Decode",
        group: TRANSPOSITION,
        description: "Ubchi decoder: undoes both transpositions and drops the null letters that were appended between them.",
        args: [
            {name: "Keyword", type: "string", value: "UBER"},
            {name: "Null letters", type: "number", value: 1},
            {name: "Null letter", type: "string", value: "X"}
        ],
        run: (input, args) => ubchiRun(input, args[0], args[1], args[2], true)
    },

    /* ---------------------------------------------------------------- route */
    {
        name: "Route Cipher Encode",
        group: TRANSPOSITION,
        description: "Route cipher: the text is written along the rows of the grid and read down the columns alternating direction (a serpentine path), with the filler completing the last row.",
        args: [
            {name: "Columns", type: "number", value: 4},
            {name: "Rows (0 = as many as needed)", type: "number", value: 3},
            {name: "Filler", type: "string", value: "."}
        ],
        run: (input, args) => routeRun(input, args[0], args[1], args[2], false)
    },
    {
        name: "Route Cipher Decode",
        group: TRANSPOSITION,
        description: "Route decoder: the ciphertext is laid along the same serpentine path and the plaintext is read row by row.",
        // A probe needs exactly the cells of the grid: DCODEROUTE on 4x3.
        probeInput: "DETERCOO..UD",
        args: [
            {name: "Columns", type: "number", value: 4},
            {name: "Rows (0 = as many as needed)", type: "number", value: 3},
            {name: "Filler", type: "string", value: "."}
        ],
        run: (input, args) => routeRun(input, args[0], args[1], args[2], true)
    },

    /* ---------------------------------------------------------------- three-square */
    {
        name: "Three-Square Cipher Encode",
        group: POLYGRAMMIC,
        description: "Three-square cipher: the first plaintext letter selects a column of the first square and the second letter a row of the second square; the middle square returns the ciphertext pair. The letters written around that pair are free choices, so this recreation takes the first letter of the column and of the row, while dCode picks them at random.",
        args: [
            {name: "Keyword 1", type: "string", value: "ONE"},
            {name: "Keyword 2", type: "string", value: "TWO"},
            {name: "Keyword 3 (middle)", type: "string", value: "THREE"},
            {name: "Merge letters", type: "option", value: ["J>I", "I>J", "V>W", "W>V", "Z omitted"]},
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => threeSquareRun(input, args[0], args[1], args[2], cfMergeArg(args[3]), args[4], false)
    },
    {
        name: "Three-Square Cipher Decode",
        group: POLYGRAMMIC,
        description: "Three-square decoder: the row of the middle letter and the column of the first give the first plaintext letter, while the row of the third and the column of the middle give the second. Decoding is exact, because only the row of the middle letter matters.",
        args: [
            {name: "Keyword 1", type: "string", value: "ONE"},
            {name: "Keyword 2", type: "string", value: "TWO"},
            {name: "Keyword 3 (middle)", type: "string", value: "THREE"},
            {name: "Merge letters", type: "option", value: ["J>I", "I>J", "V>W", "W>V", "Z omitted"]},
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => threeSquareRun(input, args[0], args[1], args[2], cfMergeArg(args[3]), args[4], true)
    },

    /* ---------------------------------------------------------------- trifid */
    {
        name: "Trifid Cipher Encode",
        group: FRACTIONATION,
        description: "Trifid cipher (Delastelle): a 27-character cube gives every letter three coordinates; the coordinates of a group of N letters are written as three rows, read back by columns and cut into new triplets, which name the ciphertext letters.",
        args: [
            {name: "Group size (N)", type: "number", value: 5},
            {name: "Alphabet (27 characters)", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ_"}
        ],
        run: (input, args) => trifidRun(input, args[0], args[1], false)
    },
    {
        name: "Trifid Cipher Decode",
        group: FRACTIONATION,
        description: "Trifid decoder: the coordinates of a ciphertext group are read back into the three rows and every triplet names a plaintext letter.",
        args: [
            {name: "Group size (N)", type: "number", value: 5},
            {name: "Alphabet (27 characters)", type: "string", value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ_"}
        ],
        run: (input, args) => trifidRun(input, args[0], args[1], true)
    },

    /* ---------------------------------------------------------------- Pollux */
    {
        name: "Pollux Cipher Encode",
        group: FRACTIONATION,
        description: "Pollux cipher: the text is written in Morse, then every dot, dash and letter separator is replaced by a character of its own pool. dCode draws a random character from each pool, this recreation takes the first character of the pool so the output is reproducible.",
        args: [
            {name: "Character pools", type: "option", value: ["Alphanumeric pools", "Numeric pools"]}
        ],
        run: (input, args) => polluxRun(input, cfOption(args[0], ["Alphanumeric pools", "Numeric pools"], "Alphanumeric pools"), false)
    },
    {
        name: "Pollux Cipher Decode",
        group: FRACTIONATION,
        description: "Pollux decoder: every ciphertext character is turned back into a dot, a dash or a separator by the pools, and the Morse stream is read as letters.",
        args: [
            {name: "Character pools", type: "option", value: ["Alphanumeric pools", "Numeric pools"]}
        ],
        run: (input, args) => polluxRun(input, cfOption(args[0], ["Alphanumeric pools", "Numeric pools"], "Alphanumeric pools"), true)
    }
];

const POLLUX_POOLS = ["Alphanumeric pools"];
const TRIFID = [5, "ABCDEFGHIJKLMNOPQRSTUVWXYZ_"];

export const pairs = [
    {id: "ragbaby", encode: "Ragbaby Cipher Encode", decode: "Ragbaby Cipher Decode", args: ["SECRTABDFGHIJKLMNOPQUVWXYZ", "26 letters"], sample: "ATTACKATDAWN"},
    {id: "grandpre", encode: "Grandpre Cipher Encode", decode: "Grandpre Cipher Decode", args: [GRANDPRE_GRID, " "], sample: "GRANDPRE"},
    {id: "collon", encode: "Collon Cipher Encode", decode: "Collon Cipher Decode", args: ["ABCDE\nFGHIK\nLMNOP\nQRSTU\nVWXYZ", 2], sample: "DCODE"},
    {id: "bazeries", encode: "Bazeries Cipher Encode", decode: "Bazeries Cipher Decode", args: ["23", "ABCDEFGHIKLMNOPQRSTUVWXYZ", "TWENTYTHREE"], sample: "DCODEZ"},
    {id: "homophonic", encode: "Homophonic Substitution Encode", decode: "Homophonic Substitution Decode", args: ["A(45,96,17), B(37,60), C(05,88)", ","], sample: "ABC"},
    {id: "triliteral", encode: "Triliteral Cipher Encode", decode: "Triliteral Cipher Decode", args: ["ABCDEFGHIJKLMNOPQRSTUVWXYZ ", " "], sample: "DCODE"},
    {id: "slidefair", encode: "Slidefair Cipher Encode", decode: "Slidefair Cipher Decode", args: ["ABC", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "X"], sample: "MESSAGES"},
    {id: "swagman", encode: "Swagman Cipher Encode", decode: "Swagman Cipher Decode", args: [SWAGMAN_KEY, "X"], sample: "DCODESWAGMANCIPH"},
    {id: "ubchi", encode: "Ubchi Cipher Encode", decode: "Ubchi Cipher Decode", args: ["UBER", 1, "X"], sample: "SECRET"},
    {id: "route", encode: "Route Cipher Encode", decode: "Route Cipher Decode", args: [4, 3, "."], sample: "DCODEROUTEAB"},
    {id: "threesquare", encode: "Three-Square Cipher Encode", decode: "Three-Square Cipher Decode", args: ["ONE", "TWO", "THREE", "Z omitted", "X"], sample: "MESSAGES"},
    {id: "trifid", encode: "Trifid Cipher Encode", decode: "Trifid Cipher Decode", args: TRIFID, sample: "SECRET"},
    {id: "pollux", encode: "Pollux Cipher Encode", decode: "Pollux Cipher Decode", args: POLLUX_POOLS, sample: "CASTOR"}
];

export const checks = [
    // dCode's Ragbaby example, which is printed with the original 24-letter alphabet.
    {name: "Ragbaby Cipher Encode", input: "RAG BABY", args: {"Keyed alphabet": "ALPHBETCDFGIKMNOQRSUVWYZ", "Alphabet": "24 letters (J and X dropped)"}, expected: "SPM THDH"},
    // dCode's Grandpre example grid and its decryption example.
    {name: "Grandpre Cipher Decode", input: "73 09 78 22 29 15 03 88", args: {Grid: GRANDPRE_GRID, Separator: " "}, expected: "GRANDPRE"},
    // dCode's Collon examples (N=2 with one grid, N=3 with another).
    {name: "Collon Cipher Encode", input: "DCODE", args: {Grid: "ABCDE\nFGHIK\nLMNOP\nQRSTU\nVWXYZ", "Block size": 2}, expected: "AAYXLAYYAZ"},
    {name: "Collon Cipher Decode", input: "AKKXZVKKKVZY", args: {Grid: "ABCDE\nFGHIJ\nKLMNO\nPQRST\nUVXYZ", "Block size": 3}, expected: "COLLON"},
    // dCode's Bazeries example (N=23, grids from the alphabet and TWENTYTHREE).
    {name: "Bazeries Cipher Encode", input: "DCODE", args: {"N (group sizes)": "23", "Grid 1 alphabet": "ABCDEFGHIKLMNOPQRSTUVWXYZ", "Grid 2 keyword": "TWENTYTHREE"}, expected: "DLSLO"},
    // dCode's homophonic decryption example.
    {name: "Homophonic Substitution Decode", input: "34,25,10", args: {"Correspondence table": "A(87,34,11), B(25,80), C(10,55)", Separator: ","}, expected: "ABC"},
    // dCode's triliteral example: DCODE is written as base 3 triplets.
    {name: "Triliteral Cipher Encode", input: "DCODE", args: {Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ ", Separator: " "}, expected: "ABA AAC BBC ABA ABB"},
    {name: "Triliteral Cipher Decode", input: "ABA AAC BBC ABA ABB", args: {Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ ", Separator: " "}, expected: "DCODE"},
    // dCode's slidefair example (key ABC, the last pair padded with X).
    {name: "Slidefair Cipher Encode", input: "MESSAGE", args: {Key: "ABC", Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", Filler: "X"}, expected: "EMRTECXE"},
    {name: "Slidefair Cipher Decode", input: "EMRTECXE", args: {Key: "ABC", Alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", Filler: "X"}, expected: "MESSAGEX"},
    // dCode's Swagman example (4x4 key, 18 letters padded to 20 with X).
    {name: "Swagman Cipher Encode", input: "DCODESWAGMANCIPHER", args: {"Key grid": SWAGMAN_KEY, "Null letter": "X"}, expected: "DASHNECWAORCXGIDEPMX"},
    // dCode's trifid example: the coordinates of SECRET in the 27-character cube,
    // read by rows and cut into triplets, spell out SJLKZT (the page prints the same
    // triplets with 1-based digits: 311 211 213 212 332 312).
    {name: "Trifid Cipher Encode", input: "SECRET", args: {"Group size (N)": 5, "Alphabet (27 characters)": "ABCDEFGHIJKLMNOPQRSTUVWXYZ_"}, expected: "SJLKZT"},
    {name: "Trifid Cipher Decode", input: "SJLKZT", args: {"Group size (N)": 5, "Alphabet (27 characters)": "ABCDEFGHIJKLMNOPQRSTUVWXYZ_"}, expected: "SECRET"},
    // dCode's Ubchi example: SECRET under the key UBER with one null letter.
    {name: "Ubchi Cipher Encode", input: "SECRET", args: {Keyword: "UBER", "Null letters": 1, "Null letter": "X"}, expected: "TECXRES"},
    // dCode's route example: DCODEROUTE on a 4x3 grid read as a serpentine column.
    {name: "Route Cipher Encode", input: "DCODEROUTE", args: {Columns: 4, Rows: 3, Filler: "."}, expected: "DETERCOO..UD"},
    // dCode's three-square ciphertext (keys ONE / TWO / THREE) read back. The last
    // letter is the padding the encoder added, which decoding cannot tell apart from
    // a real letter; it is whatever letter of the second square the encoder chose.
    {name: "Three-Square Cipher Decode", input: "TKDGNVSAFRAV", args: {"Keyword 1": "ONE", "Keyword 2": "TWO", "Keyword 3 (middle)": "THREE", "Merge letters": "Z omitted", Filler: "X"}, expected: "MESSAGEY"}
];
