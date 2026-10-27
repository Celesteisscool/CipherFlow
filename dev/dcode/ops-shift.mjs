/* dCode poly-alphabetic ciphers -------------------------------------------------
 * Recreated from the published algorithm descriptions on dcode.fr (the tools
 * themselves are not embedded or fetched). Every `run` is self-contained: it may
 * only use the helpers from dev/dcode/runtime.js plus its own arguments, because
 * these functions are serialised into the worker module at build time.
 *
 * Checks are known-answer vectors. Where dCode's FAQ example contradicts the
 * alphabet table printed on the same page, the vector follows the table and the
 * description says so.
 */

const GROUP = "dCode · Poly-alphabetic";

export const ops = [
    {
        name: "Porta Cipher Encode",
        group: GROUP,
        description: "Porta cipher (Giambattista della Porta). The key letter selects one of 13 reversible alphabets; the substitution is its own inverse. Default alphabets are the ones printed on dcode.fr (first half rotated right); the ACA variant rotates left instead. Non-letters pass through and do not advance the key.",
        args: [
            {name: "Key", type: "string", value: "PORTA"},
            {name: "Alphabets", type: "option", value: ["Default (dCode)", "ACA variant"]}
        ],
        run: (input, args) => portaRun(input, args, cfOption(args[1], ["Default (dCode)", "ACA variant"], "Default (dCode)"))
    },
    {
        name: "Porta Cipher Decode",
        group: GROUP,
        description: "Porta decoder. Unlike the classic double-rotation table, dCode's default alphabets are not involutions, so each ciphertext letter is looked up inside the key's row.",
        args: [
            {name: "Key", type: "string", value: "PORTA"},
            {name: "Alphabets", type: "option", value: ["Default (dCode)", "ACA variant"]}
        ],
        run: (input, args) => portaRun(input, args, cfOption(args[1], ["Default (dCode)", "ACA variant"], "Default (dCode)"), true)
    },
    {
        name: "Beaufort Cipher Encode",
        group: GROUP,
        description: "Beaufort cipher: each ciphertext letter is (key - plaintext) modulo 26. Reciprocal, so the decoder is the same operation.",
        args: [{name: "Key", type: "string", value: "KEY"}],
        run: (input, args) => beaufortRun(input, args)
    },
    {
        name: "Beaufort Cipher Decode",
        group: GROUP,
        description: "Beaufort decoder. Reciprocal: identical to the encoder.",
        args: [{name: "Key", type: "string", value: "KEY"}],
        run: (input, args) => beaufortRun(input, args)
    },
    {
        name: "Variant Beaufort Cipher Encode",
        group: GROUP,
        description: "Variant Beaufort cipher: ciphertext = (plaintext - key) modulo 26.",
        args: [{name: "Key", type: "string", value: "KEY"}],
        run: (input, args) => variantBeaufortRun(input, args, false)
    },
    {
        name: "Variant Beaufort Cipher Decode",
        group: GROUP,
        description: "Variant Beaufort decoder: plaintext = (ciphertext + key) modulo 26.",
        args: [{name: "Key", type: "string", value: "KEY"}],
        run: (input, args) => variantBeaufortRun(input, args, true)
    },
    {
        name: "Gronsfeld Cipher Encode",
        group: GROUP,
        description: "Gronsfeld cipher: Vigenere with a numeric key. Each letter is shifted forward by the matching key digit, cycling the digits over the letters.",
        args: [{name: "Numeric key", type: "string", value: "1234"}],
        run: (input, args) => gronsfeldRun(input, args, false)
    },
    {
        name: "Gronsfeld Cipher Decode",
        group: GROUP,
        description: "Gronsfeld decoder: each letter is shifted back by the matching key digit.",
        args: [{name: "Numeric key", type: "string", value: "1234"}],
        run: (input, args) => gronsfeldRun(input, args, true)
    },
    {
        name: "Autoclave Cipher Encode",
        group: GROUP,
        description: "Autoclave (Vigenere autokey): the keystream is the initial key followed by the plaintext itself, so the key must be shorter than the message.",
        args: [{name: "Initial key", type: "string", value: "SECRET"}],
        run: (input, args) => autoclaveRun(input, args, false)
    },
    {
        name: "Autoclave Cipher Decode",
        group: GROUP,
        description: "Autoclave decoder: each recovered plaintext letter extends the keystream.",
        args: [{name: "Initial key", type: "string", value: "SECRET"}],
        run: (input, args) => autoclaveRun(input, args, true)
    },
    {
        name: "Trithemius Cipher Encode",
        group: GROUP,
        description: "Trithemius cipher: the first letter is shifted by 0, the next by 1, then 2, and so on, wrapping at 26.",
        args: [],
        run: (input, args) => progressiveRun(input, [1], false, false)
    },
    {
        name: "Trithemius Cipher Decode",
        group: GROUP,
        description: "Trithemius decoder: shifts of 0, 1, 2 ... are subtracted instead of added.",
        args: [],
        run: (input, args) => progressiveRun(input, [1], true, false)
    },
    {
        name: "Progressive Caesar Cipher Encode",
        group: GROUP,
        description: "Progressive Caesar: the shift grows by a fixed increment for every letter, starting from an initial shift.",
        args: [
            {name: "Increment", type: "number", value: 1},
            {name: "Initial shift", type: "number", value: 3}
        ],
        run: (input, args) => progressiveRun(input, args, false, true)
    },
    {
        name: "Progressive Caesar Cipher Decode",
        group: GROUP,
        description: "Progressive Caesar decoder: the growing shift is subtracted.",
        args: [
            {name: "Increment", type: "number", value: 1},
            {name: "Initial shift", type: "number", value: 3}
        ],
        run: (input, args) => progressiveRun(input, args, true, true)
    },
    {
        name: "Multiplicative Cipher Encode",
        group: GROUP,
        description: "Multiplicative cipher: each letter index is multiplied by the key modulo 26 (A = 0). Only keys coprime with 26 can be decoded.",
        args: [{name: "Key", type: "number", value: 17}],
        run: (input, args) => multiplicativeRun(input, args, false)
    },
    {
        name: "Multiplicative Cipher Decode",
        group: GROUP,
        description: "Multiplicative decoder: multiplies each letter index by the modular inverse of the key.",
        args: [{name: "Key", type: "number", value: 17}],
        run: (input, args) => multiplicativeRun(input, args, true)
    },
    {
        name: "Vigenere Multiplicative Cipher Encode",
        group: GROUP,
        description: "Vigenere multiplicative: the message numbers are multiplied by the key numbers, cycling the key. Input and key are plain numbers separated by any non-digit character.",
        args: [
            {name: "Numeric key", type: "string", value: "11,5,25"},
            {name: "Separator", type: "string", value: ","}
        ],
        run: (input, args) => vigenereMultiplicativeRun(input, args, false)
    },
    {
        name: "Vigenere Multiplicative Cipher Decode",
        group: GROUP,
        description: "Vigenere multiplicative decoder: each number is divided by the matching key number; every division must be exact.",
        args: [
            {name: "Numeric key", type: "string", value: "11,5,25"},
            {name: "Separator", type: "string", value: ","}
        ],
        run: (input, args) => vigenereMultiplicativeRun(input, args, true)
    },
    {
        name: "Vernam Cipher Encode",
        group: GROUP,
        description: "Vernam cipher / one-time pad over letters: the key (at least as long as the message) is added letter by letter modulo 26. Reusing a key breaks the pad, so keep it random and single-use.",
        args: [{name: "One-time key", type: "string", value: "KEYWO"}],
        run: (input, args) => vernamRun(input, args, false)
    },
    {
        name: "Vernam Cipher Decode",
        group: GROUP,
        description: "Vernam decoder: the key is subtracted letter by letter modulo 26.",
        args: [{name: "One-time key", type: "string", value: "KEYWO"}],
        run: (input, args) => vernamRun(input, args, true)
    },
    {
        name: "Chaocipher Encode",
        group: GROUP,
        description: "Chaocipher (John F. Byrne, 1918): two 26-letter alphabets that are re-shuffled after every letter — rotate the used letter to the front, then move position 2 (left alphabet) or 3 (right alphabet) to position 14.",
        args: [
            {name: "Left alphabet (cipher)", type: "string", value: "CHAOBDEFGIJKLMNPQRSTUVWXYZ"},
            {name: "Right alphabet (plain)", type: "string", value: "CIPHERABDFGJKLMNOQSTUVWXYZ"}
        ],
        run: (input, args) => chaocipher(input, args, false)
    },
    {
        name: "Chaocipher Decode",
        group: GROUP,
        description: "Chaocipher decoder: the same alphabet shuffling runs on the ciphertext instead of the plaintext.",
        args: [
            {name: "Left alphabet (cipher)", type: "string", value: "CHAOBDEFGIJKLMNPQRSTUVWXYZ"},
            {name: "Right alphabet (plain)", type: "string", value: "CIPHERABDFGJKLMNOQSTUVWXYZ"}
        ],
        run: (input, args) => chaocipher(input, args, true)
    },
    {
        name: "Solitaire Cipher Encode",
        group: GROUP,
        description: "Solitaire cipher (Bruce Schneier's deck cipher, used by the novel Cryptonomicon): a keystream is generated from a 54-card deck by moving the jokers, a triple cut, a count cut and an output card. The deck is listed by card value 1-52 plus jokers A and B.",
        args: [{name: "Deck", type: "string", value: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,A,B"}],
        run: (input, args) => solitaireRun(input, args, false)
    },
    {
        name: "Solitaire Cipher Decode",
        group: GROUP,
        description: "Solitaire decoder: the same deck keystream is subtracted instead of added.",
        args: [{name: "Deck", type: "string", value: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,A,B"}],
        run: (input, args) => solitaireRun(input, args, true)
    }
];

export const pairs = [
    {id: "porta", encode: "Porta Cipher Encode", decode: "Porta Cipher Decode", args: ["PORTA", "Default (dCode)"]},
    {id: "beaufort", encode: "Beaufort Cipher Encode", decode: "Beaufort Cipher Decode", args: ["KEY"]},
    {id: "variant-beaufort", encode: "Variant Beaufort Cipher Encode", decode: "Variant Beaufort Cipher Decode", args: ["KEY"]},
    {id: "gronsfeld", encode: "Gronsfeld Cipher Encode", decode: "Gronsfeld Cipher Decode", args: ["1234"]},
    {id: "autoclave", encode: "Autoclave Cipher Encode", decode: "Autoclave Cipher Decode", args: ["SECRET"]},
    {id: "trithemius", encode: "Trithemius Cipher Encode", decode: "Trithemius Cipher Decode", args: []},
    {id: "progressive-caesar", encode: "Progressive Caesar Cipher Encode", decode: "Progressive Caesar Cipher Decode", args: [1, 3]},
    {id: "multiplicative", encode: "Multiplicative Cipher Encode", decode: "Multiplicative Cipher Decode", args: [17]},
    {id: "vigenere-multiplicative", encode: "Vigenere Multiplicative Cipher Encode", decode: "Vigenere Multiplicative Cipher Decode", args: ["11,5,25", ","], sample: "4,3,15,4,5", expected: "4,3,15,4,5"},
    {id: "vernam", encode: "Vernam Cipher Encode", decode: "Vernam Cipher Decode", args: ["KEYWO"], sample: "DCODE"},
    {id: "chaocipher", encode: "Chaocipher Encode", decode: "Chaocipher Decode", args: ["CHAOBDEFGIJKLMNPQRSTUVWXYZ", "CIPHERABDFGJKLMNOQSTUVWXYZ"]},
    {id: "solitaire", encode: "Solitaire Cipher Encode", decode: "Solitaire Cipher Decode", args: ["1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,A,B"]}
];

export const checks = [
    // dCode's FAQ example for Porta (DCODE + PORTA) contradicts the alphabet table
    // printed on that same page, so this vector is derived from the table.
    {name: "Porta Cipher Encode", input: "DCODE", args: {Key: "PORTA", Alphabets: "Default (dCode)"}, expected: "WVBUR"},
    {name: "Porta Cipher Encode", input: "DCODE", args: {Key: "PORTA", Alphabets: "ACA variant"}, expected: "XWBZR"},
    {name: "Porta Cipher Decode", input: "XWBZR", args: {Key: "PORTA", Alphabets: "ACA variant"}, expected: "DCODE"},
    {name: "Porta Cipher Decode", input: "WVBUR", args: {Key: "PORTA", Alphabets: "Default (dCode)"}, expected: "DCODE"},
    {name: "Beaufort Cipher Encode", input: "DCODE", args: {Key: "KEY"}, expected: "HCKHA"},
    {name: "Beaufort Cipher Decode", input: "HCKHA", args: {Key: "KEY"}, expected: "DCODE"},
    {name: "Variant Beaufort Cipher Encode", input: "DCODE", args: {Key: "KEY"}, expected: "TYQTA"},
    {name: "Variant Beaufort Cipher Decode", input: "TYQTA", args: {Key: "KEY"}, expected: "DCODE"},
    {name: "Gronsfeld Cipher Encode", input: "GRONSFELD", args: {"Numeric key": "1234"}, expected: "HTRRTHHPE"},
    {name: "Gronsfeld Cipher Decode", input: "HTRRTHHPE", args: {"Numeric key": "1234"}, expected: "GRONSFELD"},
    {name: "Autoclave Cipher Encode", input: "AUTOCLAVE", args: {"Initial key": "SECRET"}, expected: "SYVFGEAPX"},
    {name: "Autoclave Cipher Decode", input: "SYVFGEAPX", args: {"Initial key": "SECRET"}, expected: "AUTOCLAVE"},
    {name: "Trithemius Cipher Encode", input: "DCODE", args: {}, expected: "DDQGI"},
    {name: "Trithemius Cipher Decode", input: "DDQGI", args: {}, expected: "DCODE"},
    {name: "Progressive Caesar Cipher Encode", input: "AAA", args: {Increment: 1, "Initial shift": 3}, expected: "DEF"},
    {name: "Progressive Caesar Cipher Decode", input: "DEF", args: {Increment: 1, "Initial shift": 3}, expected: "AAA"},
    {name: "Multiplicative Cipher Encode", input: "DCODE", args: {Key: 17}, expected: "ZIEZQ"},
    {name: "Multiplicative Cipher Decode", input: "ZIEZQ", args: {Key: 17}, expected: "DCODE"},
    {name: "Vigenere Multiplicative Cipher Encode", input: "4,3,15,4,5", args: {"Numeric key": "11,5,25", Separator: ","}, expected: "44,15,375,44,25"},
    {name: "Vigenere Multiplicative Cipher Decode", input: "44,15,375,44,25", args: {"Numeric key": "11,5,25", Separator: ","}, expected: "4,3,15,4,5"},
    {name: "Vernam Cipher Encode", input: "DCODE", args: {"One-time key": "KEYWO"}, expected: "NGMZS"},
    {name: "Vernam Cipher Decode", input: "NGMZS", args: {"One-time key": "KEYWO"}, expected: "DCODE"},
    {name: "Chaocipher Encode", input: "DCODE", args: {"Left alphabet (cipher)": "CHAOBDEFGIJKLMNPQRSTUVWXYZ", "Right alphabet (plain)": "CIPHERABDFGJKLMNOQSTUVWXYZ"}, expected: "GZNDZ"},
    {name: "Chaocipher Decode", input: "GZNDZ", args: {"Left alphabet (cipher)": "CHAOBDEFGIJKLMNPQRSTUVWXYZ", "Right alphabet (plain)": "CIPHERABDFGJKLMNOQSTUVWXYZ"}, expected: "DCODE"},
    {name: "Solitaire Cipher Encode", input: "CRYPTONOMICON", args: {Deck: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,A,B"}, expected: "GOINBNFUQPWBG"},
    {name: "Solitaire Cipher Decode", input: "GOINBNFUQPWBG", args: {Deck: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,A,B"}, expected: "CRYPTONOMICON"}
];
