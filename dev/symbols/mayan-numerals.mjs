// Mayan numerals, 0-19.
//
// Basis: the vigesimal dot-and-bar system — a shell (or a stylised oval) for zero, dots
// worth one and bars worth five, stacked upward. Original vector rendition; the same
// dot and bar shapes are reused for every value so the set reads as one hand.

const FILL = "fill=\"currentColor\" stroke=\"none\"";
const dot = cy => `<circle cx="50" cy="${cy}" r="7" ${FILL}/>`;
const bar = y => `<rect x="24" y="${y}" width="52" height="10" rx="3" ${FILL}/>`;

// A shell is the classic zero: an outlined oval with an inner arc.
const SHELL = `<ellipse cx="50" cy="50" rx="26" ry="18" fill="none" stroke="currentColor" stroke-width="9"/>` +
    `<path d="M32 50Q50 34 68 50" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`;

const BAR_STEP = 16;
const DOT_STEP = 16;

function glyphFor(value) {
    if (value === 0) return SHELL;
    const bars = Math.floor(value / 5);
    const dots = value % 5;
    const parts = [];
    // Bars stack up from the baseline.
    let y = 84;
    for (let i = 0; i < bars; i++) {
        parts.push(bar(y - 10));
        y -= BAR_STEP;
    }
    // Dots sit above the top bar, centred on the same column.
    let cy = (bars ? y + 4 : 50 + (dots - 1) * DOT_STEP / 2) - (bars ? 10 : 0);
    if (!bars) {
        // No bars: centre the run of dots vertically.
        const start = 50 - ((dots - 1) * DOT_STEP) / 2;
        for (let i = 0; i < dots; i++) parts.push(dot(start + i * DOT_STEP));
    } else {
        for (let i = 0; i < dots; i++) {
            parts.push(dot(cy - 6));
            cy -= DOT_STEP;
        }
    }
    return parts.join("");
}

const glyphs = Array.from({length: 20}, (_, value) => ({
    index: value + 1,
    key: String(value),
    label: String(value),
    svg: glyphFor(value)
}));

export const cipher = {
    slug: "mayan-numerals",
    name: "Mayan Numerals",
    source: "both",
    tags: ["mayan", "vigesimal", "dots", "bars", "shell", "numerals"],
    direction: "ltr",
    caseSensitive: true,
    credit: "Mayan vigesimal dot-and-bar numerals (original vector rendition)",
    glyphs
};
