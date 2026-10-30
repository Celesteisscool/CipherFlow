// Elder Futhark, the 24-rune Germanic alphabet.
//
// Basis: the Kylver-stone row f u þ a r k g w / h n i j ï p z s / t b e m l ŋ d o
// and the standard transliterations listed for each rune. Original angular
// rendition in a 100x100 box: three stroke directions, round joins, one width.
//
// Multi-letter keys are kept as digraphs (th, ae, ng) so the click contract and
// the preview's longest-match rule both behave.

const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
const wrap = inner => `<g ${STROKE}>${inner}</g>`;

const RUNES = [
    // f
    ["f", "F", "M40 16V84 M40 18L70 38 M40 46L66 62"],
    // u
    ["u", "U", "M30 24V78H70V30"],
    // th
    ["th", "TH", "M38 14V86 M38 32L72 50L38 68Z"],
    // a
    ["a", "A", "M40 14V86 M40 16L70 44 M40 16L68 22"],
    // r
    ["r", "R", "M36 14V86 M36 14H64V42H36 M36 42L72 82"],
    // k
    ["k", "K", "M68 18L30 50L68 82"],
    // g
    ["g", "G", "M28 18L72 82 M72 18L28 82"],
    // w
    ["w", "W", "M34 14V86 M34 14H66L34 46"],
    // h
    ["h", "H", "M30 14V86 M70 14V86 M30 18L70 82"],
    // n
    ["n", "N", "M34 14V86 M34 14L70 82"],
    // i
    ["i", "I", "M50 12V88"],
    // j
    ["j", "J", "M64 16H38V82"],
    // ï / æ
    ["ae", "AE", "M50 14V86 M50 34L26 14 M50 34L74 14 M50 54L26 76 M50 54L74 76"],
    // p
    ["p", "P", "M34 18V82 M34 18H62V48H34"],
    // z
    ["z", "Z", "M50 32V86 M50 32L28 10 M50 32L72 10"],
    // s
    ["s", "S", "M64 14L38 32L64 50L38 68L64 86"],
    // t
    ["t", "T", "M50 18V86 M50 18L30 4 M50 18L70 4"],
    // b
    ["b", "B", "M34 14V86 M34 14H60V42H34 M34 44H60V70H34"],
    // e
    ["e", "E", "M24 82V22L50 54L76 22V82"],
    // m
    ["m", "M", "M26 22V82 M74 22V82 M26 22L50 52L74 22"],
    // l
    ["l", "L", "M40 14V84 M40 84L72 58"],
    // ŋ
    ["ng", "NG", "M50 12L80 50L50 88L20 50Z"],
    // d
    ["d", "D", "M22 16H78L22 84H78"],
    // o
    ["o", "O", "M50 12L80 44L50 76L20 44Z M20 44L14 88 M80 44L86 88"]
];

const glyphs = RUNES.map(([key, label, d], i) => ({
    index: i + 1,
    key,
    label,
    svg: wrap(`<path d="${d}"/>`)
}));

export const cipher = {
    slug: "elder-futhark",
    name: "Elder Futhark",
    source: "both",
    tags: ["runes", "runic", "norse", "viking", "kylver", "futhark"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Elder Futhark row and transliterations as published (original angular rendition)",
    glyphs
};
