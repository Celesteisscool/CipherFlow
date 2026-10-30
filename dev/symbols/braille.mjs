// Braille (English grade-1 letters).
//
// Basis: the standard six-dot cell. Dots are numbered 1-6 down the left column
// then the right: 1 4 / 2 5 / 3 6. Original vector rendition.

const ATTRS = "fill=\"currentColor\" stroke=\"none\"";

// Dot number -> centre. The cell is inset in the 100x100 box so tiles and the
// preview have even margins.
const POS = {
    1: [32, 22], 2: [32, 50], 3: [32, 78],
    4: [68, 22], 5: [68, 50], 6: [68, 78]
};

const wrap = inner => `<g ${ATTRS}>${inner}</g>`;
const dot = n => {
    const [cx, cy] = POS[n];
    return `<circle cx="${cx}" cy="${cy}" r="9"/>`;
};

const sets = [
    [1], [1, 2], [1, 4], [1, 4, 5], [1, 5], [1, 2, 4], [1, 2, 4, 5], [1, 2, 5],
    [2, 4], [2, 4, 5], [1, 3], [1, 2, 3], [1, 3, 4], [1, 3, 4, 5], [1, 3, 5],
    [1, 2, 3, 4], [1, 2, 3, 4, 5], [1, 2, 3, 5], [2, 3, 4], [2, 3, 4, 5],
    [1, 3, 6], [1, 2, 3, 6], [2, 4, 5, 6], [1, 3, 4, 6], [1, 3, 4, 5, 6], [1, 3, 5, 6]
];

const glyphs = sets.map((dots, i) => ({
    index: i + 1,
    key: String.fromCharCode(97 + i),
    label: String.fromCharCode(65 + i),
    svg: wrap(dots.map(dot).join(""))
}));

export const cipher = {
    slug: "braille",
    name: "Braille",
    source: "both",
    tags: ["grade-1", "six-dot", "dots", "blind", "louis braille"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Standard six-dot Braille cell, English grade-1 letter assignments",
    glyphs
};
