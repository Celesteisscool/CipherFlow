// Flag semaphore, A-Z.
//
// Basis: the letter table published by the Australian National Botanic Gardens
// ("Semaphore Flag Signalling System", Jim Croft), which names both arms for every
// letter: down, low, out, high, up, and the two cross-body positions. Positions are
// drawn as the signaller faces the reader, matching the usual chart orientation.
// Original vector rendition: a pivot dot, two straight arms at 45-degree steps, and
// a filled flag at each hand.

const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"9\" stroke-linecap=\"round\"";
const FLAG = "fill=\"currentColor\" stroke=\"none\"";

const CX = 50;
const CY = 52;
const REACH = 40;
const DEG = Math.PI / 180;

// Screen angles (0 = right, 90 = down) for each named arm position. The left hand is
// mirrored, and its cross-body positions reach to the right.
const ANGLES = {
    left: {down: 90, low: 135, out: 180, high: 225, up: 270, acrossHigh: 315, acrossLow: 45},
    right: {down: 90, low: 45, out: 0, high: -45, up: -90, acrossHigh: -135, acrossLow: 135}
};

const LETTERS = [
    ["a", "A", "down", "low"],
    ["b", "B", "down", "out"],
    ["c", "C", "down", "high"],
    ["d", "D", "down", "up"],
    ["e", "E", "high", "down"],
    ["f", "F", "out", "down"],
    ["g", "G", "low", "down"],
    ["h", "H", "acrossLow", "out"],
    ["i", "I", "acrossLow", "up"],
    ["j", "J", "out", "up"],
    ["k", "K", "up", "low"],
    ["l", "L", "high", "low"],
    ["m", "M", "out", "low"],
    ["n", "N", "low", "low"],
    ["o", "O", "acrossHigh", "out"],
    ["p", "P", "up", "out"],
    ["q", "Q", "high", "out"],
    ["r", "R", "out", "out"],
    ["s", "S", "low", "out"],
    ["t", "T", "up", "high"],
    ["u", "U", "high", "high"],
    ["v", "V", "low", "up"],
    ["w", "W", "out", "acrossHigh"],
    ["x", "X", "low", "acrossHigh"],
    ["y", "Y", "out", "high"],
    ["z", "Z", "out", "acrossLow"]
];

function endpoint(side, position) {
    const angle = ANGLES[side][position] * DEG;
    return [CX + Math.cos(angle) * REACH, CY + Math.sin(angle) * REACH];
}

const glyphs = LETTERS.map(([key, label, left, right], i) => {
    const [lx, ly] = endpoint("left", left);
    const [rx, ry] = endpoint("right", right);
    const round = n => Math.round(n * 10) / 10;
    return {
        index: i + 1,
        key,
        label,
        svg: `<g ${STROKE}><path d="M${CX} ${CY}L${round(lx)} ${round(ly)} M${CX} ${CY}L${round(rx)} ${round(ry)}"/></g>` +
            `<circle cx="${round(lx)}" cy="${round(ly)}" r="6" ${FLAG}/>` +
            `<circle cx="${round(rx)}" cy="${round(ry)}" r="6" ${FLAG}/>` +
            `<circle cx="${CX}" cy="${CY}" r="4" ${FLAG}/>`
    };
});

export const cipher = {
    slug: "flag-semaphore",
    name: "Flag semaphore",
    source: "both",
    tags: ["flags", "semaphore", "signals", "arms", "navy"],
    direction: "ltr",
    caseSensitive: false,
    credit: "ANBG Semaphore Flag Signalling System letter table (original vector rendition)",
    glyphs
};
