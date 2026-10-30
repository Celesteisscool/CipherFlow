// Hexahue, Josh Cramer's colour alphabet.
//
// Basis: the published Hexahue table. A glyph is a 2x3 grid of coloured squares:
// letters use the six bright colours once each, digits use white/grey/black twice
// each, and the comma and period use three black and three white squares. A space
// is an all-black block (the table also allows an all-white block). The colour
// combinations below were read from the published table, not copied from artwork.
//
// This is the one cipher whose glyphs must not follow the theme: the colours carry
// the information, so every square keeps a fixed fill.

const COLORS = {
    R: "#ff0000", // red
    L: "#65ff00", // green (the table's chartreuse)
    B: "#0000ff", // blue
    C: "#00ffff", // cyan
    M: "#ff00ff", // magenta
    Y: "#ffff00", // yellow
    W: "#ffffff", // white
    A: "#808080", // grey
    K: "#000000" // black
};

const CELL_W = 36;
const CELL_H = 27;
const X0 = 10;
const Y0 = 8;
const GAP_X = 8;
const GAP_Y = 4;

function rect(col, row, color) {
    const x = X0 + col * (CELL_W + GAP_X);
    const y = Y0 + row * (CELL_H + GAP_Y);
    return `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" rx="2" fill="${COLORS[color]}"/>`;
}

function grid(cells) {
    const rows = cells.match(/../g) || [];
    return `<g>${rows.map((row, y) => [...row].map((color, x) => rect(x, y, color)).join("")).join("")}</g>`;
}

// Catalogue order: A-Z, 0-9, full stop, comma, space.
const TABLE = [
    ["a", "A", "MRLYBC"], ["b", "B", "RMLYBC"], ["c", "C", "RLMYBC"],
    ["d", "D", "RLYMBC"], ["e", "E", "RLYBMC"], ["f", "F", "RLYBCM"],
    ["g", "G", "LRYBCM"], ["h", "H", "LYRBCM"], ["i", "I", "LYBRCM"],
    ["j", "J", "LYBCRM"], ["k", "K", "LYBCMR"], ["l", "L", "YLBCMR"],
    ["m", "M", "YBLCMR"], ["n", "N", "YBCLMR"], ["o", "O", "YBCMLR"],
    ["p", "P", "YBCMRL"], ["q", "Q", "BYCMRL"], ["r", "R", "BCYMRL"],
    ["s", "S", "BCMYRL"], ["t", "T", "BCMRYL"], ["u", "U", "BCMRLY"],
    ["v", "V", "CBMRLY"], ["w", "W", "CMBRLY"], ["x", "X", "CMRBLY"],
    ["y", "Y", "CMRLBY"], ["z", "Z", "CMRLYB"],
    ["0", "0", "KAWKAW"], ["1", "1", "AKWKAW"], ["2", "2", "AWKKAW"],
    ["3", "3", "AWKAKW"], ["4", "4", "AWKAWK"], ["5", "5", "WAKAWK"],
    ["6", "6", "WKAAWK"], ["7", "7", "WKAWAK"], ["8", "8", "WKAWKA"],
    ["9", "9", "KWAWKA"],
    [".", ".", "KWWKKW"], [",", ",", "WKKWWK"],
    [" ", "␣", "KKKKKK"]
];

const glyphs = TABLE.map(([key, label, cells], i) => ({
    index: i + 1,
    key,
    label,
    svg: grid(cells)
}));

export const cipher = {
    slug: "hexahue",
    name: "Hexahue",
    source: "cachesleuth",
    tags: ["colour", "color", "blocks", "pixels", "josh cramer", "hexasquare"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Hexahue by Josh Cramer, colour table as published on dCode.fr",
    glyphs
};
