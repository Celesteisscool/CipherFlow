// Younger Futhark, the 16-rune Scandinavian alphabet of the Viking Age.
//
// Basis: the long-branch (Danish) row f u þ ą r k h n i a s t b m l ʀ with the
// transliterations published for each rune. Several runes carry more than one Latin
// value (ᚢ = u/v/w/y/o, ᚴ = k/g, ᛏ = t/d); the keys below stay with the common
// transliteration, and duplicated keys are intentional — clicking either rune still
// types a readable letter. Original angular rendition in a 100x100 box.

const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
const wrap = inner => `<g ${STROKE}>${inner}</g>`;

const RUNES = [
    // ᚠ fé
    ["f", "F", "M38 12V88 M38 20L70 8 M38 44L66 32"],
    // ᚢ úr
    ["u", "U", "M32 16V66L50 86L68 66V16"],
    // ᚦ þurs
    ["th", "TH", "M38 12V88 M38 30L70 50L38 68Z"],
    // ᚬ ąss (a/o/æ)
    ["a", "Ą", "M40 12V88 M40 14C58 14 68 24 68 40"],
    // ᚱ reið
    ["r", "R", "M36 12V88 M36 12H62V42H36 M36 42L72 84"],
    // ᚴ kaun (k/g)
    ["k", "K", "M68 14L32 50L68 86"],
    // ᚼ hagall
    ["h", "H", "M32 12V88 M68 12V88 M32 48H68"],
    // ᚾ nauðr
    ["n", "N", "M34 12V88 M34 12L70 84"],
    // ᛁ íss (i/e)
    ["i", "I", "M50 10V90"],
    // ᛅ ár (a/æ/e)
    ["a", "A", "M40 12V88 M40 20L70 44"],
    // ᛋ sól
    ["s", "S", "M64 12L38 38L64 60L38 86"],
    // ᛏ Týr (t/d)
    ["t", "T", "M50 14V88 M50 14L28 4 M50 14L72 4"],
    // ᛒ bjǫrk (b/p)
    ["b", "B", "M36 12V88 M36 12H60V42H36 M36 44H60V72H36"],
    // ᛘ maðr
    ["m", "M", "M28 20V88 M72 20V88 M28 20L50 56L72 20"],
    // ᛚ lǫgr
    ["l", "L", "M38 12V86 M38 86L70 58"],
    // ᛦ ýr (ʀ)
    ["r", "ʀ", "M50 26V88 M50 26L26 6 M50 26L74 6"]
];

const glyphs = RUNES.map(([key, label, d], i) => ({
    index: i + 1,
    key,
    label,
    svg: wrap(`<path d="${d}"/>`)
}));

export const cipher = {
    slug: "younger-futhark",
    name: "Younger Futhark",
    source: "both",
    tags: ["runes", "runic", "norse", "viking", "scandinavian", "futhark"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Long-branch Younger Futhark row and transliterations as published (original angular rendition)",
    glyphs
};
