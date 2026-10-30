// Pigpen (masonic / tic-tac-toe) cipher.
//
// Basis: the 3x3 grid, grid-with-dot, X and X-with-dot key shown on the
// Wikipedia "Pigpen cipher" article. Each letter is the portion of the frame
// that borders its cell; the second grid repeats the first with a dot, the
// two X sets are the four quadrants of a saltire, the second set dotted.
// Original vector rendition, not traced from any cipher tool's artwork.

const R = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
const DOT = "fill=\"currentColor\" stroke=\"none\"";

const wrap = inner => `<g ${R}>${inner}</g>`;
const dot = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="6" ${DOT}/>`;

const grid = [
    "M85 15V85H15",     // A
    "M15 15V85H85V15",  // B
    "M15 15V85H85",     // C
    "M15 15H85V85H15",  // D
    "M15 15H85V85H15Z", // E
    "M85 15H15V85H85",  // F
    "M15 15H85V85",     // G
    "M15 85V15H85V85",  // H
    "M85 15H15V85"      // I
];

const saltire = [
    "M50 50L15 15M50 50L85 15", // S top
    "M50 50L15 15M50 50L15 85", // T left
    "M50 50L85 15M50 50L85 85", // U right
    "M50 50L15 85M50 50L85 85"  // V bottom
];

const saltireDots = [[50, 32], [32, 50], [68, 50], [50, 68]];

const glyphs = [];
let index = 1;

for (const [i, d] of grid.entries()) {
    glyphs.push({index, key: String.fromCharCode(97 + i), label: String.fromCharCode(65 + i), svg: wrap(`<path d="${d}"/>`)});
    index++;
}
for (const [i, d] of grid.entries()) {
    glyphs.push({
        index,
        key: String.fromCharCode(106 + i),
        label: String.fromCharCode(74 + i),
        svg: wrap(`<path d="${d}"/>` + dot(50, 50))
    });
    index++;
}
for (const [i, d] of saltire.entries()) {
    glyphs.push({index, key: String.fromCharCode(115 + i), label: String.fromCharCode(83 + i), svg: wrap(`<path d="${d}"/>`)});
    index++;
}
for (const [i, d] of saltire.entries()) {
    const [cx, cy] = saltireDots[i];
    glyphs.push({index, key: String.fromCharCode(119 + i), label: String.fromCharCode(87 + i), svg: wrap(`<path d="${d}"/>` + dot(cx, cy))});
    index++;
}

export const cipher = {
    slug: "pigpen",
    name: "Pigpen",
    source: "both",
    tags: ["masonic", "freemason", "franc-macon", "rosicrucian", "tic-tac-toe", "geometric"],
    variantOf: undefined,
    direction: "ltr",
    caseSensitive: false,
    credit: "Wikipedia, Pigpen cipher key (grid, grid-with-dot, saltire, saltire-with-dot)",
    glyphs
};
