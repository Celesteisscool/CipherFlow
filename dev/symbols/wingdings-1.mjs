// Wingdings 1, the Microsoft dingbat font's A-Z positions.
//
// Basis: the published Wingdings 1 letter table (A-Z), which maps each letter to
// a pictogram: hand gestures, faces, a bomb, a skull, flags, an airplane, a sun,
// a droplet, a snowflake, crosses and a crescent. The shapes below are original
// geometric renditions of those common symbols, not font outlines; no Wingdings
// font data is shipped.

const S = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
const F = "fill=\"currentColor\" stroke=\"none\"";

const ART = [
    // A — victory hand.
    `<path d="M34 48L28 16M50 46L62 14" ${S}/><path d="M30 46Q28 68 46 80Q64 68 66 46Z" ${S}/><path d="M32 52L18 42" ${S}/>`,
    // B — OK hand.
    `<circle cx="40" cy="34" r="12" ${S}/><path d="M34 46L30 74Q32 88 48 88Q64 86 64 70V48M58 48V28M68 52V32" ${S}/>`,
    // C — thumbs up.
    `<path d="M28 84V52Q28 42 38 42H50V24Q50 12 60 12Q68 12 68 24V52Q68 64 58 72L48 84Z" ${S}/>`,
    // D — thumbs down.
    `<path d="M28 16V48Q28 58 38 58H50V76Q50 88 60 88Q68 88 68 76V48Q68 36 58 28L48 16Z" ${S}/>`,
    // E — pointing left.
    `<path d="M72 44V80H40L14 64L20 54L40 62V52Q40 44 48 44Z" ${S}/>`,
    // F — pointing right.
    `<path d="M28 44V80H60L86 64L80 54L60 62V52Q60 44 52 44Z" ${S}/>`,
    // G — pointing up.
    `<path d="M42 86V54H64V30Q64 18 56 18Q48 18 48 30V44H42M40 86H62" ${S}/>`,
    // H — raised hand, thumb out.
    `<path d="M30 86V50Q30 40 38 40H64Q72 40 72 50V70Q72 86 56 86Z" ${S}/><path d="M34 52L20 38" ${S}/>`,
    // I — open hand.
    `<path d="M30 86V44Q30 34 38 34H64Q72 34 72 44V86M36 36V16M48 36V14M60 38V18" ${S}/>`,
    // J — smiley face.
    `<circle cx="50" cy="50" r="34" ${S}/><circle cx="38" cy="42" r="4" ${F}/><circle cx="62" cy="42" r="4" ${F}/><path d="M34 62Q50 76 66 62" ${S}/>`,
    // K — neutral face.
    `<circle cx="50" cy="50" r="34" ${S}/><circle cx="38" cy="42" r="4" ${F}/><circle cx="62" cy="42" r="4" ${F}/><path d="M36 64H64" ${S}/>`,
    // L — frowning face.
    `<circle cx="50" cy="50" r="34" ${S}/><circle cx="38" cy="42" r="4" ${F}/><circle cx="62" cy="42" r="4" ${F}/><path d="M34 70Q50 54 66 70" ${S}/>`,
    // M — bomb with a lit fuse.
    `<circle cx="44" cy="62" r="26" ${F}/><path d="M58 36Q70 18 82 24" ${S}/><path d="M78 16L84 24M84 16L78 24" ${S}/>`,
    // N — skull and crossbones.
    `<path d="M18 22L82 78M82 22L18 78" ${S}/><circle cx="50" cy="42" r="22" ${S}/><path d="M40 60V74H60V60M44 40H44.1M56 40H56.1M44 50H56" ${S}/>`,
    // O — white flag.
    `<path d="M28 10V90" ${S}/><path d="M28 16H74V44H28Z" ${S}/>`,
    // P — black flag.
    `<path d="M28 10V90" ${S}/><path d="M28 16H74V44H28Z" ${F}/>`,
    // Q — airplane.
    `<path d="M10 54L50 44L90 54L50 64Z" ${S}/><path d="M50 44V14M50 64V86M26 50L18 34M74 50L82 34" ${S}/>`,
    // R — sun.
    `<circle cx="50" cy="50" r="20" ${S}/><path d="M50 8V20M50 80V92M8 50H20M80 50H92M20 20L29 29M71 71L80 80M80 20L71 29M29 71L20 80" ${S}/>`,
    // S — droplet.
    `<path d="M50 12Q74 44 74 62Q74 86 50 86Q26 86 26 62Q26 44 50 12Z" ${F}/>`,
    // T — snowflake.
    `<path d="M50 8V92M14 29L86 71M86 29L14 71M50 26L38 16M50 26L62 16M50 74L38 84M50 74L62 84M26 38L14 32M26 38L20 26M74 62L86 68M74 62L80 74" ${S}/>`,
    // U — Latin cross.
    `<path d="M50 12V88M26 34H74" ${S}/>`,
    // V — Orthodox cross.
    `<path d="M50 8V90M30 28H70M36 44H64M30 78L70 68" ${S}/>`,
    // W — circled cross.
    `<circle cx="50" cy="50" r="34" ${S}/><path d="M50 20V80M24 50H76" ${S}/>`,
    // X — Maltese cross.
    `<path d="M50 8L60 36L90 26L66 50L90 74L60 64L50 92L40 64L10 74L34 50L10 26L40 36Z" ${F}/>`,
    // Y — Star of David.
    `<path d="M50 10L86 74H14ZM50 90L14 26H86Z" ${S}/>`,
    // Z — crescent and star.
    `<path d="M64 12A38 38 0 1 0 64 88" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/><path d="M78 32L82 42L92 42L84 48L87 58L78 52L69 58L72 48L64 42L74 42Z" ${F}/>`
];

const glyphs = ART.map((svg, i) => ({
    index: i + 1,
    key: String.fromCharCode(97 + i),
    label: String.fromCharCode(65 + i),
    svg: `<g>${svg}</g>`
}));

export const cipher = {
    slug: "wingdings-1",
    name: "Wingdings 1",
    source: "both",
    tags: ["dingbats", "symbols", "font", "microsoft", "pictograms", "wingdings"],
    direction: "ltr",
    caseSensitive: false,
    credit: "Wingdings 1 A-Z letter table; original geometric rendition of the assigned pictograms",
    glyphs
};
