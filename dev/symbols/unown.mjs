// Unown, the 28-form Pokémon alphabet (Pokédex #201).
//
// Basis: the published 28-form table — A-Z plus ? and !. Every Unown is built
// around the same eye, so each glyph here shares one eye primitive and varies the
// surrounding appendages. This is an original geometric rendition of the forms,
// not a copy of the sprite or font artwork.

const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
const FILL = "fill=\"currentColor\" stroke=\"none\"";

function eye(cx, cy, r = 13) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" ${STROKE}/><circle cx="${cx}" cy="${cy}" r="4.5" ${FILL}/>`;
}

const glyph = (key, label, art) => ({key, label, art});

// [key, label, eye position, appendage path(s)]
const FORMS = [
    ["a", "A", "50 46", "M38 58L28 90M62 58L72 90M50 33V20M50 20L36 12"],
    ["b", "B", "50 34", "M50 47V88M38 70Q50 82 62 70"],
    ["c", "C", "56 42", "M44 26Q16 36 24 60Q32 84 58 82"],
    ["d", "D", "44 42", "M56 26Q86 38 78 62Q70 84 48 84"],
    ["e", "E", "42 48", "M55 48H88M55 36L84 26M55 60L84 72"],
    ["f", "F", "42 44", "M54 38L86 30L58 52M42 56V84M54 56L62 84"],
    ["g", "G", "50 34", "M40 66Q24 72 36 84Q48 96 64 84"],
    ["h", "H", "50 48", "M28 66L18 90M72 66L82 90"],
    ["i", "I", "50 28", "M50 41V78Q50 90 64 86"],
    ["j", "J", "38 38", "M50 50Q70 60 58 78Q46 94 30 84"],
    ["k", "K", "42 48", "M54 40L82 26M54 56L82 72M42 60V88"],
    ["l", "L", "46 30", "M46 43V68Q46 84 30 82"],
    ["m", "M", "50 42", "M24 40Q18 12 50 12Q82 12 76 40M24 50L14 74M76 50L86 74"],
    ["n", "N", "50 44", "M24 22H76M32 22V62M68 22V62"],
    ["o", "O", "50 46", "M50 18A28 28 0 1 0 50 74A28 28 0 1 0 50 18M78 56L90 78"],
    ["p", "P", "46 34", "M58 34Q86 46 68 64M46 47V84"],
    ["q", "Q", "50 40", "M22 54Q20 88 50 88Q80 88 78 54"],
    ["r", "R", "50 38", "M50 51V88M30 22Q50 4 70 22"],
    ["s", "S", "58 28", "M58 41Q32 48 32 68Q32 86 54 86"],
    ["t", "T", "50 46", "M22 18H78M50 18V33M28 82H72"],
    ["u", "U", "50 38", "M20 54Q20 88 50 88Q80 88 80 54"],
    ["v", "V", "50 44", "M36 57L24 86M64 57L76 86M36 34L20 22M64 34L80 22"],
    ["w", "W", "50 50", "M26 34L10 26M74 34L90 26M50 63V90"],
    ["x", "X", "50 48", "M36 60L22 86M64 60L78 86M50 35V16M36 34L22 24M64 34L78 24"],
    ["y", "Y", "50 42", "M50 55V82M38 82H62M38 28L24 16M62 28L76 16"],
    ["z", "Z", "42 38", "M48 50L62 74Q74 90 56 92"],
    ["?", "?", "50 32", "M36 22Q50 4 64 22Q64 38 50 46V54M50 66V70"],
    ["!", "!", "50 50", "M50 66V88M50 96V97"]
];

const glyphs = FORMS.map(([key, label, at, path], i) => {
    const [cx, cy] = at.split(" ").map(Number);
    return {
        index: i + 1,
        key,
        label,
        svg: `<g>${eye(cx, cy)}<path d="${path}" ${STROKE}/></g>`
    };
});

export const cipher = {
    slug: "unown",
    name: "Unown",
    source: "both",
    tags: ["pokemon", "pokémon", "zarbi", "ruins", "201"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Unown forms (Pokémon #201) from the published 28-form alphabet; original geometric rendition",
    glyphs
};
