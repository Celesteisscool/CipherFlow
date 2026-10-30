// Babylonian (sexagesimal) numerals, 1-59.
//
// Basis: the two wedge signs of the cuneiform system — a vertical nail worth one and a
// corner wedge worth ten. Values 1-9 are nails in a three-column grid, 10-50 are stacked
// corner wedges. Original vector rendition; solid wedges, one hand throughout.

const FILL = "fill=\"currentColor\" stroke=\"none\"";

const COLS = [26, 46, 66];

function nail(x, y) {
    return `<path d="M${x} ${y}H${x + 12}L${x + 8} ${y + 26}H${x + 4}Z" ${FILL}/>`;
}

function wedge(y) {
    return `<path d="M80 ${y}L24 ${y + 9}L80 ${y + 18}V${y + 12}L52 ${y + 9}L80 ${y + 6}Z" ${FILL}/>`;
}

function units(value) {
    const positions = [];
    if (value <= 3) {
        const xs = value === 1 ? [42] : value === 2 ? [32, 52] : COLS;
        for (const x of xs) positions.push([x, 24]);
    } else {
        for (let i = 0; i < value; i++) {
            positions.push([COLS[i % 3], i < 3 ? 14 : i < 6 ? 44 : 74]);
        }
    }
    return positions.map(([x, y]) => nail(x, y)).join("");
}

function tens(value) {
    let out = "";
    for (let i = 0; i < value; i++) out += wedge(6 + i * 18);
    return out;
}

const glyphs = [];
for (let n = 1; n <= 9; n++) {
    glyphs.push({index: glyphs.length + 1, key: String(n), label: String(n), svg: units(n)});
}
for (let n = 1; n <= 5; n++) {
    const value = n * 10;
    glyphs.push({index: glyphs.length + 1, key: String(value), label: String(value), svg: tens(n)});
}

export const cipher = {
    slug: "babylonian-numerals",
    name: "Babylonian Numerals",
    source: "both",
    tags: ["babylon", "mesopotamia", "cuneiform", "sexagesimal", "wedges", "numerals"],
    direction: "ltr",
    caseSensitive: true,
    credit: "Babylonian nail and corner-wedge signs as published (original vector rendition)",
    glyphs
};
