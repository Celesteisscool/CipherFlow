// Standard Galactic Alphabet (the Commander Keen / "enchanting table" script).
//
// Basis: Tom Hall's published SGA transliteration chart. The glyphs here are an
// original geometric rendition of that chart (straight strokes and dots in a
// 100x100 box), not a traced or embedded font.
//
// Several shapes are deliberately simplified: the source chart is pixel art,
// this is a clean vector restatement. Recorded here so a later pass can refine
// any glyph without changing indices.

const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
const DOT = "fill=\"currentColor\" stroke=\"none\"";

const wrap = inner => `<g ${STROKE}>${inner}</g>`;
const dots = list => list.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="6" ${DOT}/>`).join("");

const art = [
    "M12 85H24V30Q24 16 38 16H50Q62 16 62 30V50",                 // A
    "M42 16V34L64 72H18",                                          // B
    "M48 16V28M48 46V84",                                          // C
    "M24 16H76M32 26L64 64H78",                                    // D
    "M28 16V84H82",                                                // E
    "M26 16H78M34 32V46M50 32V46M66 32V46",                        // F
    "M62 16V84M62 50H34",                                          // G
    "M26 16H74M26 40H74M50 40V84",                                 // H
    "M50 16V34M50 50V84",                                          // I
    "",                                                            // J (dots only)
    "M50 16V84",                                                   // K
    "M40 16V84",                                                   // L
    "M70 16V84H32",                                                // M
    "M64 30L42 76H24",                                             // N
    "M26 18H70L34 78",                                             // O
    "M38 16V84M60 16V58",                                          // P
    "M28 44H70V70H26",                                             // Q
    "",                                                            // R (dots only)
    "M70 34V80H34",                                                // S
    "M24 20H76M24 20V80",                                          // T
    "M26 62H74",                                                   // U
    "M50 16V34M28 42H72M26 66H74",                                 // V
    "",                                                            // W (dots only)
    "M34 78L70 34",                                                // X
    "M38 16V84M62 16V84",                                          // Y
    "M26 82V46L50 16L74 46V82"                                     // Z
];

const dotMap = {
    4: [[76, 22]],
    9: [[50, 20], [50, 50], [50, 80]],
    10: [[30, 50], [70, 50]],
    11: [[66, 28], [66, 66]],
    12: [[30, 24]],
    13: [[32, 22]],
    16: [[44, 22]],
    17: [[34, 36], [66, 36], [34, 68], [66, 68]],
    18: [[70, 22]],
    20: [[38, 30], [62, 30]],
    22: [[50, 30], [34, 66], [66, 66]],
    23: [[34, 24]]
};

const glyphs = art.map((d, i) => ({
    index: i + 1,
    key: String.fromCharCode(97 + i),
    label: String.fromCharCode(65 + i),
    svg: wrap((d ? `<path d="${d}"/>` : "") + dots(dotMap[i] || []))
}));

export const cipher = {
    slug: "standard-galactic",
    name: "Standard Galactic",
    source: "both",
    tags: ["sga", "commander keen", "galactic alphabet", "minecraft", "enchanting table", "star wars"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Tom Hall's Standard Galactic Alphabet transliteration chart (original geometric rendition)",
    glyphs
};
