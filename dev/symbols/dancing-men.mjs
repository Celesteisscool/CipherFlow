// Dancing Men, the Sherlock Holmes stick-figure cipher.
//
// Basis: the 26-letter variant of the published key — a head, body, two arms and two
// legs, with the pose distinguishing each letter; a few letters carry a pennant.
// Original vector rendition in a 100x100 box, one stroke weight throughout.

const STROKE = "stroke=\"currentColor\" stroke-width=\"7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
const FILL = "fill=\"currentColor\"";

const HEAD = `<circle cx="50" cy="18" r="8" ${FILL}/>`;
const BODY = `<path d="M50 26V58"/>`;

function pennant(x, y) {
    return `<path d="M${x} ${y}V${y - 18}M${x} ${y - 18}L${x + 15} ${y - 12}L${x} ${y - 6}Z"/>`;
}

// [arms: [left hand, right hand], legs: [left foot, right foot], flag: ""|"L"|"R"]
const POSES = [
    [[[24, 52], [76, 24]], [[30, 90], [70, 86]], ""],
    [[[28, 10], [72, 48]], [[32, 90], [68, 90]], "R"],
    [[[28, 6], [72, 6]], [[30, 90], [70, 90]], ""],
    [[[20, 18], [80, 18]], [[32, 90], [68, 90]], ""],
    [[[18, 34], [82, 54]], [[34, 90], [66, 90]], "L"],
    [[[26, 6], [74, 54]], [[34, 90], [66, 74]], ""],
    [[[24, 60], [76, 60]], [[64, 88], [36, 78]], ""],
    [[[24, 60], [76, 60]], [[28, 90], [72, 90]], ""],
    [[[26, 10], [74, 50]], [[30, 90], [70, 90]], "L"],
    [[[30, 8], [70, 8]], [[60, 90], [40, 90]], ""],
    [[[22, 56], [78, 56]], [[34, 80], [66, 90]], ""],
    [[[16, 32], [84, 32]], [[34, 80], [66, 90]], ""],
    [[[28, 8], [72, 8]], [[28, 90], [72, 90]], ""],
    [[[16, 32], [84, 32]], [[28, 90], [72, 90]], ""],
    [[[28, 8], [72, 8]], [[62, 90], [38, 90]], ""],
    [[[24, 10], [76, 56]], [[32, 90], [68, 90]], ""],
    [[[20, 20], [80, 20]], [[30, 90], [70, 90]], "R"],
    [[[20, 24], [80, 24]], [[30, 90], [70, 90]], ""],
    [[[26, 58], [74, 58]], [[28, 90], [72, 90]], ""],
    [[[28, 10], [72, 10]], [[62, 90], [38, 90]], ""],
    [[[16, 34], [84, 34]], [[62, 90], [38, 90]], ""],
    [[[24, 8], [76, 8]], [[34, 90], [66, 90]], ""],
    [[[18, 32], [82, 32]], [[34, 90], [66, 90]], ""],
    [[[30, 12], [70, 12]], [[30, 90], [70, 90]], ""],
    [[[28, 8], [72, 8]], [[30, 90], [70, 80]], ""],
    [[[16, 34], [84, 34]], [[60, 90], [40, 80]], ""]
];

function figure([arms, legs, flag]) {
    let inner = BODY;
    for (const [x, y] of arms) inner += `<path d="M50 34L${x} ${y}"/>`;
    for (const [x, y] of legs) inner += `<path d="M50 58L${x} ${y}"/>`;
    if (flag) inner += pennant(...arms[flag === "L" ? 0 : 1]);
    return HEAD + `<g fill="none" ${STROKE}>${inner}</g>`;
}

const glyphs = POSES.map((pose, i) => {
    const letter = String.fromCharCode(65 + i);
    return {
        index: i + 1,
        key: letter.toLowerCase(),
        label: letter,
        svg: figure(pose)
    };
});

export const cipher = {
    slug: "dancing-men",
    name: "Dancing Men",
    source: "both",
    tags: ["sherlock", "holmes", "stick figures", "conan doyle", "dancing"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Dancing Men key as published (original stick-figure rendition)",
    glyphs
};
