// Circular Glyphs (Irolan).
//
// Basis: the Circular Glyphs table drawn by Irolan and transcribed by dCode.
// Every glyph is a cross with quarter-circle arcs in the four quadrants: A-M use
// the outer ring, N-Z add an inner ring, and 0-9 use the outer ring alone.
// Original vector rendition from that arc table, one stroke weight throughout.
//
// The published table also has an empty "spacing" glyph; it is not drawn here, so
// spaces pass through the operation unchanged.

const CROSS = "M8 50H92M50 8V92";
const OUTER = {
    TL: "M50 14A36 36 0 0 0 14 50",
    TR: "M50 14A36 36 0 0 1 86 50",
    BR: "M86 50A36 36 0 0 1 50 86",
    BL: "M50 86A36 36 0 0 1 14 50"
};
const INNER = {
    TL: "M50 32A18 18 0 0 0 32 50",
    TR: "M50 32A18 18 0 0 1 68 50",
    BR: "M68 50A18 18 0 0 1 50 68",
    BL: "M50 68A18 18 0 0 1 32 50"
};
const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"8\" stroke-linecap=\"round\"";

// [key, label, outer quadrants, inner quadrants]
const LETTERS = [
    ["a", "A", "TL", ""],
    ["b", "B", "TR", ""],
    ["c", "C", "BR", ""],
    ["d", "D", "BL", ""],
    ["e", "E", "TL TR", ""],
    ["f", "F", "TR BR", ""],
    ["g", "G", "BR BL", ""],
    ["h", "H", "BL TL", ""],
    ["i", "I", "TL TR BR", ""],
    ["j", "J", "TR BR BL", ""],
    ["k", "K", "TL BR", ""],
    ["l", "L", "TL TR BL", ""],
    ["m", "M", "TL TR BR BL", ""],
    ["n", "N", "TL TR BR BL", "TL"],
    ["o", "O", "TL TR BR BL", "TR"],
    ["p", "P", "TL TR BR BL", "BR"],
    ["q", "Q", "TL TR BR BL", "BL"],
    ["r", "R", "TL TR BR BL", "TL TR"],
    ["s", "S", "TL TR BR BL", "TR BR"],
    ["t", "T", "TL TR BR BL", "BR BL"],
    ["u", "U", "TL TR BR BL", "BL TL"],
    ["v", "V", "TL TR BR BL", "TL TR BR"],
    ["w", "W", "TL TR BR BL", "TR BR BL"],
    ["x", "X", "TL TR BR BL", "BR BL TL"],
    ["y", "Y", "TL TR BR BL", "TL TR BL"],
    ["z", "Z", "TL TR BR BL", "TL TR BR BL"]
];

// The digits reuse the outer ring: 1-4 are one quadrant clockwise from the top
// right, 5-8 the adjacent pairs, 9 the full ring, 0 the opposite pair.
const DIGITS = [
    ["0", "0", "TR BL"],
    ["1", "1", "TR"],
    ["2", "2", "BR"],
    ["3", "3", "BL"],
    ["4", "4", "TL"],
    ["5", "5", "TL TR"],
    ["6", "6", "BR BL"],
    ["7", "7", "TL BL"],
    ["8", "8", "TR BR"],
    ["9", "9", "TL TR BR BL"]
];

const arcs = (table, spec) => spec
    ? spec.split(" ").filter(Boolean).map(quadrant => table[quadrant]).join("")
    : "";

const glyph = (index, key, label, outer, inner) => ({
    index,
    key,
    label,
    svg: `<g ${STROKE}><path d="${CROSS}${arcs(OUTER, outer)}${arcs(INNER, inner)}"/></g>`
});

const glyphs = [
    ...LETTERS.map(([key, label, outer, inner], i) => glyph(i + 1, key, label, outer, inner)),
    ...DIGITS.map(([key, label, outer], i) => glyph(LETTERS.length + i + 1, key, label, outer, ""))
];

export const cipher = {
    slug: "circular-glyphs-alphabet",
    name: "Circular Glyphs",
    source: "dcode",
    tags: ["arcs", "circles", "quadrants", "irolan", "geometric", "substitution"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Circular Glyphs by Irolan; arc assignments transcribed from the dCode table and redrawn as quarter-circle paths",
    glyphs
};
