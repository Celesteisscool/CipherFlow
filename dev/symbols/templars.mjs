// Knights Templar cipher.
//
// Basis: the published Templar key — seven Maltese-cross variants, each carrying four
// letters at the compass points, plus a standalone saltire for N. A letter is marked by
// a dot inside its point; the dotted variants already carry small dots at all four
// points, so the marked point is ringed instead. The crosses are line art so the mark
// stays visible. Original geometric rendition in a 100x100 box.

const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
const FILL = "fill=\"currentColor\"";
const POS = {N: [50, 30], E: [70, 50], S: [50, 70], W: [30, 50]};

const dot = ([x, y], r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" ${FILL}/>`;
const ring = ([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="currentColor" stroke-width="3"/>`;

function star() {
    return `<path d="M50 8L60 34L92 50L60 66L50 92L40 66L8 50L40 34Z" ${STROKE}/>`;
}

function barred() {
    return `<path d="M42 10H58V36H90V64H58V90H42V64H10V36H42Z" ${STROKE}/>` +
        `<path d="M4 34V66M96 34V66" ${STROKE}/>`;
}

function looped() {
    return `<path d="M42 14H58V38H86V62H58V86H42V62H14V38H42Z" ${STROKE}/>` +
        `<path d="M50 2L64 16L50 30L36 16Z M98 50L84 64L70 50L84 36Z M50 98L36 84L50 70L64 84Z M2 50L16 36L30 50L16 64Z" ${STROKE}/>`;
}

function saltire() {
    return `<path d="M22 22L78 78M78 22L22 78" ${STROKE}/>`;
}

function glyphFor(kind, mark, dotted) {
    let svg = kind === "star" ? star() : kind === "barred" ? barred() : kind === "looped" ? looped() : saltire();
    if (dotted) for (const point of Object.values(POS)) svg += dot(point, 3);
    if (mark) svg += dotted ? ring(POS[mark]) : dot(POS[mark]);
    return svg;
}

// The seven groups in the published key: A-D, E-H, I/K/L/M, N, O-R, S-V, W-Z.
const GROUPS = [
    ["star", false, ["A", "B", "C", "D"]],
    ["barred", false, ["H", "F", "G", "E"]],
    ["looped", false, ["I", "K", "L", "M"]],
    ["saltire", false, ["N"]],
    ["star", true, ["O", "P", "Q", "R"]],
    ["barred", true, ["S", "T", "U", "V"]],
    ["looped", true, ["X", "Y", "W", "Z"]]
];
const POINTS = ["N", "E", "S", "W"];

const byLetter = new Map();
for (const [kind, dotted, letters] of GROUPS) {
    letters.forEach((letter, i) => {
        byLetter.set(letter, glyphFor(kind, kind === "saltire" ? null : POINTS[i], dotted));
    });
}
// The published key shares I and J; J reuses the I cross.
byLetter.set("J", byLetter.get("I"));

const glyphs = Array.from({length: 26}, (_, i) => {
    const letter = String.fromCharCode(65 + i);
    return {
        index: i + 1,
        key: letter.toLowerCase(),
        label: letter,
        svg: byLetter.get(letter)
    };
});

export const cipher = {
    slug: "templars",
    name: "Knights Templar",
    source: "both",
    tags: ["templar", "cross", "maltese cross", "masonic", "knight"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Knights Templar key as published (original geometric rendition)",
    glyphs
};
