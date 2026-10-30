// Seven-segment display, digits 0-9.
//
// Basis: the standard calculator/LED segment layout (a top, b upper-right, c lower-right,
// d bottom, e lower-left, f upper-left, g middle) with the conventional digit masks.
// Original vector rendition: rounded stroke segments on a 100x100 box.

const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"10\" stroke-linecap=\"round\"";
const wrap = inner => `<g ${STROKE}>${inner}</g>`;

const SEGMENTS = {
    a: "M28 16H72",
    b: "M76 20V46",
    c: "M76 54V80",
    d: "M28 84H72",
    e: "M24 54V80",
    f: "M24 20V46",
    g: "M28 50H72"
};

const DIGITS = [
    ["0", "abcdef"],
    ["1", "bc"],
    ["2", "abged"],
    ["3", "abgcd"],
    ["4", "fgbc"],
    ["5", "afgcd"],
    ["6", "afgedc"],
    ["7", "abc"],
    ["8", "abcdefg"],
    ["9", "abcdfg"]
];

const glyphs = DIGITS.map(([digit, mask], i) => ({
    index: i + 1,
    key: digit,
    label: digit,
    svg: wrap(mask.split("").map(seg => `<path d="${SEGMENTS[seg]}"/>`).join(""))
}));

export const cipher = {
    slug: "7-segment-display",
    name: "7-Segment Display",
    source: "both",
    tags: ["calculator", "led", "segments", "digital", "digits"],
    direction: "ltr",
    caseSensitive: true,
    credit: "Standard seven-segment digit masks (original vector rendition)",
    glyphs
};
