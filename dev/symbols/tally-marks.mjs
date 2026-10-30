// Tally marks, 1-5.
//
// Basis: the everyday counting marks — one upright stroke per unit, a fifth stroke drawn
// diagonally across the group of four. Original vector rendition.

const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"9\" stroke-linecap=\"round\"";
const wrap = inner => `<g ${STROKE}>${inner}</g>`;

const COLUMNS = [26, 40, 54, 68];

function marks(value) {
    let out = "";
    for (let i = 0; i < Math.min(value, 4); i++) out += `<path d="M${COLUMNS[i]} 16V86"/>`;
    if (value === 5) out += `<path d="M18 74L78 28"/>`;
    return wrap(out);
}

const glyphs = Array.from({length: 5}, (_, i) => ({
    index: i + 1,
    key: String(i + 1),
    label: String(i + 1),
    svg: marks(i + 1)
}));

export const cipher = {
    slug: "tally-marks",
    name: "Tally Marks",
    source: "both",
    tags: ["tally", "counting", "strokes", "five-bar", "numerals"],
    direction: "ltr",
    caseSensitive: true,
    credit: "Standard tally-mark groups (original vector rendition)",
    glyphs
};
