/* dCode transposition ciphers ----------------------------------------------------
 * Recreated from the published descriptions on dcode.fr: columnar transposition
 * (padded and irregular), AMSCO, Redefence, Skip, Scytale, Spiral and the turning
 * grille. Myszkowski, Cadenus and Route are deliberately absent: dCode has no page
 * for the first two, and the Route tool depends on an arbitrary write/read path
 * that cannot be reproduced without its path notation.
 */

const GROUP = "dCode · Transposition";

export const ops = [
    {
        name: "Columnar Transposition Encode (padded)",
        group: GROUP,
        description: "Columnar transposition with filler padding: the message is written in rows under the keyword, the last row is padded with the filler character, and the columns are read out in alphabetical order of the keyword letters.",
        args: [
            {name: "Key", type: "string", value: "COL"},
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => transColumnarEncode(input, cfKeyLetters(args[0]).join("") || "A", cfChar(args[1], "X"), true)
    },
    {
        name: "Columnar Transposition Decode (padded)",
        group: GROUP,
        description: "Inverse of the padded columnar transposition: the ciphertext is dealt back into the columns in keyword order and the grid is read row-wise.",
        args: [
            {name: "Key", type: "string", value: "COL"},
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => transColumnarDecode(input, cfKeyLetters(args[0]).join("") || "A", cfChar(args[1], "X"), true)
    },
    {
        name: "Columnar Transposition Encode (irregular)",
        group: GROUP,
        description: "Columnar transposition without padding (dCode's \"Transposition Cipher\"): empty cells of the last row are skipped when the columns are read, so the ciphertext keeps the plaintext length.",
        args: [{name: "Key", type: "string", value: "CODE"}],
        run: (input, args) => transColumnarEncode(input, cfKeyLetters(args[0]).join("") || "A", "", false)
    },
    {
        name: "Columnar Transposition Decode (irregular)",
        group: GROUP,
        description: "Inverse of the unpadded columnar transposition.",
        args: [{name: "Key", type: "string", value: "CODE"}],
        run: (input, args) => transColumnarDecode(input, cfKeyLetters(args[0]).join("") || "A", "", false)
    },
    {
        name: "AMSCO Cipher Encode",
        group: GROUP,
        description: "AMSCO transposition: cells are filled row-wise with alternating group sizes (the cut sequence, normally 1,2), then the columns are read in keyword order. No padding is added.",
        args: [
            {name: "Key", type: "string", value: "KEY"},
            {name: "Cut sequence", type: "string", value: "1,2"}
        ],
        run: (input, args) => amscoEncode(input, cfKeyLetters(args[0]).join("") || "A", cfCuts(args[1]))
    },
    {
        name: "AMSCO Cipher Decode",
        group: GROUP,
        description: "AMSCO decoder: the cell sizes are recomputed from the cut sequence and the letters are dealt back into the grid.",
        args: [
            {name: "Key", type: "string", value: "KEY"},
            {name: "Cut sequence", type: "string", value: "1,2"}
        ],
        run: (input, args) => amscoDecode(input, cfKeyLetters(args[0]).join("") || "A", cfCuts(args[1]))
    },
    {
        name: "Redefence Cipher Encode",
        group: GROUP,
        description: "Redefence (keyed rail fence): the message is written in a zig-zag across as many rails as the key has letters, then the rails are read out in alphabetical order of the key letters.",
        args: [{name: "Key", type: "string", value: "ZIG"}],
        run: (input, args) => redefenceEncode(input, cfKeyLetters(args[0]).join("") || "A")
    },
    {
        name: "Redefence Cipher Decode",
        group: GROUP,
        description: "Redefence decoder: the rails are refilled in key order and the zig-zag is walked again.",
        args: [{name: "Key", type: "string", value: "ZIG"}],
        run: (input, args) => redefenceDecode(input, cfKeyLetters(args[0]).join("") || "A")
    },
    {
        name: "Skip Cipher Encode",
        group: GROUP,
        description: "Skip / jump cipher: starting at the given index, every n-th character is taken, wrapping around the text. With a skip value coprime with the length this is a complete permutation; otherwise the walk steps on to the next free slot.",
        args: [
            {name: "Skip", type: "number", value: 3},
            {name: "Start index", type: "number", value: 0}
        ],
        run: (input, args) => skipEncode(input, cfNumber(args[0], 3), cfNumber(args[1], 0))
    },
    {
        name: "Skip Cipher Decode",
        group: GROUP,
        description: "Skip decoder: the same walk rebuilds the original order.",
        args: [
            {name: "Skip", type: "number", value: 3},
            {name: "Start index", type: "number", value: 0}
        ],
        run: (input, args) => skipDecode(input, cfNumber(args[0], 3), cfNumber(args[1], 0))
    },
    {
        name: "Scytale Cipher Encode",
        group: GROUP,
        description: "Scytale: the message is wrapped around a rod with the given number of letters per turn and then read down the columns.",
        args: [
            {name: "Letters per turn", type: "number", value: 3},
            {name: "Filler", type: "string", value: "_"}
        ],
        run: (input, args) => scytaleEncode(input, cfNumber(args[0], 3), cfChar(args[1], "_"))
    },
    {
        name: "Scytale Cipher Decode",
        group: GROUP,
        description: "Scytale decoder: the columns are refilled and read row-wise, then trailing filler is removed.",
        args: [
            {name: "Letters per turn", type: "number", value: 3},
            {name: "Filler", type: "string", value: "_"}
        ],
        run: (input, args) => scytaleDecode(input, cfNumber(args[0], 3), cfChar(args[1], "_"))
    },
    {
        name: "Spiral Cipher Encode",
        group: GROUP,
        description: "Spiral cipher: dCode's worked example writes the message along an inward clockwise spiral from the top left and reads the grid by columns. Counter-clockwise spirals, the other three starting corners and a row-wise read are also available.",
        args: [
            {name: "Direction", type: "option", value: ["Clockwise", "Counter-clockwise"]},
            {name: "Start corner", type: "option", value: ["Top left", "Top right", "Bottom right", "Bottom left"]},
            {name: "Read", type: "option", value: ["Columns", "Rows"]},
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => spiralEncode(input, cfOption(args[0], ["Clockwise", "Counter-clockwise"], "Clockwise"), cfOption(args[1], ["Top left", "Top right", "Bottom right", "Bottom left"], "Top left"), cfOption(args[2], ["Columns", "Rows"], "Columns"), cfChar(args[3], "X"))
    },
    {
        name: "Spiral Cipher Decode",
        group: GROUP,
        description: "Spiral decoder: the ciphertext is written back in the read order and then collected along the spiral.",
        args: [
            {name: "Direction", type: "option", value: ["Clockwise", "Counter-clockwise"]},
            {name: "Start corner", type: "option", value: ["Top left", "Top right", "Bottom right", "Bottom left"]},
            {name: "Read", type: "option", value: ["Columns", "Rows"]},
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => spiralDecode(input, cfOption(args[0], ["Clockwise", "Counter-clockwise"], "Clockwise"), cfOption(args[1], ["Top left", "Top right", "Bottom right", "Bottom left"], "Top left"), cfOption(args[2], ["Columns", "Rows"], "Columns"), cfChar(args[3], "X"))
    },
    {
        name: "Turning Grille Encode",
        group: GROUP,
        description: "Turning grille (Fleissner grille): a square mask with holes is rotated a quarter turn four times and the message fills the visible cells in reading order; the grid is then read row-wise. The mask must expose every cell exactly once across the four rotations, which is verified before use. Write holes as # and closed cells as .",
        args: [
            {name: "Grille mask", type: "string", value: "###.\n.#..\n....\n...."},
            {name: "Rotation", type: "option", value: ["Clockwise", "Counter-clockwise"]},
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => grilleEncode(input, args[0], cfOption(args[1], ["Clockwise", "Counter-clockwise"], "Clockwise"), cfChar(args[2], "X"))
    },
    {
        name: "Turning Grille Decode",
        group: GROUP,
        description: "Turning grille decoder: the grid is rebuilt from the ciphertext and the four grille orientations are read in order.",
        args: [
            {name: "Grille mask", type: "string", value: "###.\n.#..\n....\n...."},
            {name: "Rotation", type: "option", value: ["Clockwise", "Counter-clockwise"]},
            {name: "Filler", type: "string", value: "X"}
        ],
        run: (input, args) => grilleDecode(input, args[0], cfOption(args[1], ["Clockwise", "Counter-clockwise"], "Clockwise"), cfChar(args[2], "X"))
    }
];

const MASK = "###.\n.#..\n....\n....";

export const pairs = [
    {id: "columnar-padded", encode: "Columnar Transposition Encode (padded)", decode: "Columnar Transposition Decode (padded)", args: ["COL", "X"]},
    {id: "columnar-irregular", encode: "Columnar Transposition Encode (irregular)", decode: "Columnar Transposition Decode (irregular)", args: ["CODE"]},
    {id: "amsco", encode: "AMSCO Cipher Encode", decode: "AMSCO Cipher Decode", args: ["KEY", "1,2"]},
    {id: "redefence", encode: "Redefence Cipher Encode", decode: "Redefence Cipher Decode", args: ["ZIG"]},
    {id: "skip", encode: "Skip Cipher Encode", decode: "Skip Cipher Decode", args: [3, 0]},
    {id: "scytale", encode: "Scytale Cipher Encode", decode: "Scytale Cipher Decode", args: [3, "_"]},
    {id: "spiral", encode: "Spiral Cipher Encode", decode: "Spiral Cipher Decode", args: ["Clockwise", "Top left", "Columns", "X"]},
    {id: "grille", encode: "Turning Grille Encode", decode: "Turning Grille Decode", args: [MASK, "Clockwise", "X"], sample: "ATTACKATDAWN1234"}
];

export const checks = [
    {name: "Columnar Transposition Encode (padded)", input: "COLUMNS", args: {Key: "COL", Filler: "X"}, expected: "CUSLNXOMX"},
    {name: "Columnar Transposition Decode (padded)", input: "CUSLNXOMX", args: {Key: "COL", Filler: "X"}, expected: "COLUMNS"},
    {name: "Columnar Transposition Encode (irregular)", input: "MESSAGE", args: {Key: "CODE"}, expected: "MASESEG"},
    {name: "Columnar Transposition Decode (irregular)", input: "MASESEG", args: {Key: "CODE"}, expected: "MESSAGE"},
    {name: "AMSCO Cipher Encode", input: "DCODEAMSCO", args: {Key: "KEY", "Cut sequence": "1,2"}, expected: "COMDEAODSC"},
    {name: "AMSCO Cipher Decode", input: "COMDEAODSC", args: {Key: "KEY", "Cut sequence": "1,2"}, expected: "DCODEAMSCO"},
    {name: "Redefence Cipher Encode", input: "DCODEZIGZAG", args: {Key: "ZIG"}, expected: "OIGCDZGADEZ"},
    {name: "Redefence Cipher Decode", input: "OIGCDZGADEZ", args: {Key: "ZIG"}, expected: "DCODEZIGZAG"},
    {name: "Skip Cipher Encode", input: "DCODE", args: {Skip: 3, "Start index": 0}, expected: "DDCEO"},
    {name: "Skip Cipher Decode", input: "DDCEO", args: {Skip: 3, "Start index": 0}, expected: "DCODE"},
    {name: "Scytale Cipher Encode", input: "DCODE", args: {"Letters per turn": 3, Filler: "_"}, expected: "DDCEO_"},
    {name: "Scytale Cipher Decode", input: "DDCEO_", args: {"Letters per turn": 3, Filler: "_"}, expected: "DCODE"},
    {name: "Spiral Cipher Encode", input: "SPIRALS99", args: {Direction: "Clockwise", "Start corner": "Top left", Read: "Columns", Filler: "X"}, expected: "S9SP9LIRA"},
    {name: "Spiral Cipher Decode", input: "S9SP9LIRA", args: {Direction: "Clockwise", "Start corner": "Top left", Read: "Columns", Filler: "X"}, expected: "SPIRALS99"},
    // Worked by hand from the mask: the four rotations expose cells
    // 0,1,2,5 / 3,6,7,11 / 10,13,14,15 / 4,8,9,12 in that fill order.
    {name: "Turning Grille Encode", input: "ATTACKATDAWN", args: {"Grille mask": MASK, Rotation: "Clockwise", Filler: "X"}, expected: "ATTCXAKAXXDTXAWN"},
    {name: "Turning Grille Decode", input: "ATTCXAKAXXDTXAWN", args: {"Grille mask": MASK, Rotation: "Clockwise", Filler: "X"}, expected: "ATTACKATDAWN"}
];
