// Ogham (Beith-luis-nin), the twenty-letter "orthodox" alphabet.
//
// Basis: the four aicmi described on the Ogham article — B group (right of the
// stemline), H group (left), M group (crossing), A group (vowel notches on the
// line) — with stroke counts 1-5 in each group. Original vector rendition; the
// stemline and stroke widths are shared so every glyph reads as the same hand.
//
// Direction note: real inscriptions run bottom-to-top, left-to-right. The glyph
// box here keeps the stemline vertical and the notches in their canonical
// positions; the node's catalogue direction is ltr, matching the other alphabets.

const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"7\" stroke-linecap=\"round\"";
const wrap = inner => `<g ${STROKE}>${inner}</g>`;
const STEM = `<path d="M50 8V92"/>`;

// Notch rows for a run of 1-5 strokes, centred on the stemline.
const ROWS = {
    1: [50],
    2: [44, 56],
    3: [38, 50, 62],
    4: [32, 44, 56, 68],
    5: [26, 38, 50, 62, 74]
};

const bar = (y, x1, x2) => `<path d="M${x1} ${y}H${x2}"/>`;
const group = (count, x1, x2) => ROWS[count].map(y => bar(y, x1, x2)).join("");

const glyph = (index, key, label, inner) => ({
    index,
    key,
    label,
    svg: wrap(STEM + inner)
});

// Aicme beithe — right-side strokes: B L F S N.
const B_GROUP = [
    ["b", "B", 1], ["l", "L", 2], ["f", "F", 3], ["s", "S", 4], ["n", "N", 5]
];
// Aicme hÚatha — left-side strokes: H D T C Q.
const H_GROUP = [
    ["h", "H", 1], ["d", "D", 2], ["t", "T", 3], ["c", "C", 4], ["q", "Q", 5]
];
// Aicme muine — strokes crossing the stemline: M G NG ST R.
const M_GROUP = [
    ["m", "M", 1], ["g", "G", 2], ["ng", "NG", 3], ["st", "ST", 4], ["r", "R", 5]
];
// Aicme ailme — vowel notches on the stemline: A O U E I.
const A_GROUP = [
    ["a", "A", 1], ["o", "O", 2], ["u", "U", 3], ["e", "E", 4], ["i", "I", 5]
];

const glyphs = [];
let index = 1;
for (const [key, label, count] of B_GROUP) {
    glyphs.push(glyph(index++, key, label, group(count, 50, 88)));
}
for (const [key, label, count] of H_GROUP) {
    glyphs.push(glyph(index++, key, label, group(count, 12, 50)));
}
for (const [key, label, count] of M_GROUP) {
    glyphs.push(glyph(index++, key, label, group(count, 12, 88)));
}
for (const [key, label, count] of A_GROUP) {
    glyphs.push(glyph(index++, key, label, group(count, 40, 60)));
}

export const cipher = {
    slug: "ogham",
    name: "Ogham",
    source: "both",
    tags: ["celtic", "irish", "tree alphabet", "notches", "beith-luis-nin"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Ogham beith-luis-nin: four aicmi with 1-5 strokes (original geometric rendition)",
    glyphs
};
