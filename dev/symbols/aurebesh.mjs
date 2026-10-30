// Aurebesh, the Star Wars "Galactic Basic" alphabet.
//
// Basis: the published 34-letter chart — the 26 Latin letters plus the digraphs
// CH, AE, EO, KH, NG, OO, SH and TH. The chart's shapes are angular, mostly one
// thick stroke, so every glyph here is drawn in a 100x100 box with the same
// stroke weight. This is an original geometric rendition, not a copy of the
// chart's outlines.

const STROKE = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
const wrap = inner => `<g ${STROKE}>${inner}</g>`;

const shapes = [
    // A AUREK — top bar, left stem, diagonal leg.
    "M10 20H62L84 80H56L36 42H10",
    // B BESH — hexagonal frame with a crossbar.
    "M30 18H70L86 50L70 82H30L14 50ZM30 50H70",
    // C CRESH — a stem with two short arms.
    "M28 16V84M28 30H60M28 52H60",
    // CH CHEREK — angular seven with a crossbar.
    "M18 20H80L46 82M34 52H72",
    // D DORN — top bar and a long diagonal.
    "M14 20H82L46 82H20",
    // E ESK — two peaks and a trough.
    "M14 82L26 20L50 56L74 20L86 82",
    // AE ENTH — house-like frame.
    "M20 20H80V60L58 80H20Z",
    // EO ONITH — pointed house with a sill.
    "M50 16L82 44V80H18V44ZM32 60H68",
    // F FORN — box with a stem and a top-left step.
    "M18 22H70V78H30V38H18ZM48 22V78",
    // G GREK — triangle with a hooked foot.
    "M50 18L84 80H16ZM16 80V58H40",
    // H HERF — three bars.
    "M16 24H84M16 50H84M16 76H84",
    // I ISK — a flag and a stem.
    "M34 32L56 18V82M56 82H78",
    // J JENTH — swept flag over a diagonal.
    "M20 32Q52 16 76 38L38 82",
    // K KRILL — square bracket.
    "M70 18H32V82H70",
    // KH KRENTH — upright H with a slanted left leg.
    "M18 18L34 82M34 50H70M70 18V82",
    // L LETH — one long diagonal with a short counter-stroke.
    "M18 20L58 82M58 18L40 52",
    // M MERN — a bent L.
    "M20 82L54 18H78",
    // N NERN — zigzag.
    "M20 82V26L54 74L80 20",
    // NG NEN — a frame with a diagonal.
    "M18 20V82M18 20H78V82M18 20L78 82",
    // O OSK — narrow triangle.
    "M50 24L78 78H22Z",
    // OO ORENTH — two facing brackets.
    "M28 18H14V82H28M72 18H86V82H72",
    // P PETH — rounded vessel with a foot.
    "M20 84V40Q20 20 42 20H70V68Q70 84 54 84H34",
    // Q QEK — frame with a cut corner.
    "M18 20H68L82 34V80H18Z",
    // R RESH — seven with a crossbar.
    "M18 20H82L48 82M32 50H70",
    // S SENTH — an N crossed by a diagonal.
    "M18 18V82M78 18V82M18 82L78 18",
    // SH SHEN — Z with a marked centre (the dot is appended below).
    "M20 20H80L20 80H80",
    // T TRILL — down arrow.
    "M26 18H74M50 18V82M34 64L50 82L66 64",
    // TH THESH — frame with an upper bar.
    "M18 20H82V80H18ZM18 50H50",
    // U USK — L with a full top bar.
    "M18 20H68V82H18",
    // V VEV — Y.
    "M20 20L50 50L80 20M50 50V84",
    // W WESK — rectangle.
    "M16 26H84V74H16Z",
    // X XESH — wide triangle.
    "M50 16L86 82H14Z",
    // Y YIRT — V with a crossbar and stem.
    "M18 20L50 52L82 20M50 52V82M26 70H74",
    // Z ZEREK — frame with a diagonal.
    "M18 20H82V80H18ZM18 20L82 80"
];

// Catalogue order: the chart's own A-Z-with-digraphs order.
const ORDER = [
    ["a", "A"], ["b", "B"], ["c", "C"], ["ch", "CH"], ["d", "D"], ["e", "E"],
    ["ae", "AE"], ["eo", "EO"], ["f", "F"], ["g", "G"], ["h", "H"], ["i", "I"],
    ["j", "J"], ["k", "K"], ["kh", "KH"], ["l", "L"], ["m", "M"], ["n", "N"],
    ["ng", "NG"], ["o", "O"], ["oo", "OO"], ["p", "P"], ["q", "Q"], ["r", "R"],
    ["s", "S"], ["sh", "SH"], ["t", "T"], ["th", "TH"], ["u", "U"], ["v", "V"],
    ["w", "W"], ["x", "X"], ["y", "Y"], ["z", "Z"]
];

const EXTRA = {
    sh: `<circle cx="50" cy="50" r="5" fill="currentColor" stroke="none"/>`
};

const glyphs = ORDER.map(([key, label], i) => ({
    index: i + 1,
    key,
    label,
    svg: wrap(`<path d="${shapes[i]}"/>` + (EXTRA[key] || ""))
}));

export const cipher = {
    slug: "aurebesh",
    name: "Aurebesh",
    source: "both",
    tags: ["star wars", "galactic basic", "digraphs", "aurek", "besh", "outer rim"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Aurebesh as published in the 34-letter Star Wars chart; original geometric rendition",
    glyphs
};
