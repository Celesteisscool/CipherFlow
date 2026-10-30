/* Symbol cipher operations -----------------------------------------------------
 * One operation pair for every drawn symbol alphabet, instead of one operation
 * per cipher. The glyph tables are embedded into the generated worker module by
 * dev/dcode/payload.mjs; these run functions only resolve the selected slug.
 *
 * Encoding writes each glyph as U+E000 + its 1-based index, so the text travels
 * through the graph without pretending the glyphs are real Unicode characters.
 * Downstream text operations see those placeholder code points, not letters.
 * Decoding maps each placeholder back to the glyph's printed label; characters
 * with no glyph pass through unchanged. Homophones encode to the lowest-index
 * glyph for their key, and every homophone decodes back to the same label.
 */

import {allCiphers} from "../symbols/index.mjs";

const GROUP = "Symbol ciphers";
const CIPHERS = allCiphers();
const SLUGS = CIPHERS.map(cipher => cipher.slug);

export const ops = [
    {
        name: "Symbol cipher encode",
        group: GROUP,
        description: "Encodes text with a drawn symbol alphabet. Each glyph becomes U+E000 plus its catalogue index, because the glyphs are artwork rather than characters; unknown characters pass through. Homophones use the lowest-index glyph for their letter.",
        args: [
            {name: "Cipher", type: "option", value: SLUGS}
        ],
        run: (input, args) => cfSymbolEncode(input, args[0])
    },
    {
        name: "Symbol cipher decode",
        group: GROUP,
        description: "Decodes the U+E000 + index placeholders produced by Symbol cipher encode back to the labels printed under the glyphs. Placeholder code points with no glyph, and ordinary text, pass through unchanged.",
        args: [
            {name: "Cipher", type: "option", value: SLUGS}
        ],
        run: (input, args) => cfSymbolDecode(input, args[0])
    }
];

// Every registered alphabet gets a round-trip pair, so a newly drawn cipher is
// covered the moment it joins the registry. The sample is built from the glyph
// labels themselves, which keeps multi-character labels (Aurebesh's CH) and
// numeric alphabets meaningful.
function sampleFor(cipher) {
    const labels = cipher.glyphs
        .map(glyph => String(glyph.label ?? ""))
        .filter(label => /^[A-Za-z]{1,3}$/.test(label))
        .slice(0, 3);
    if (labels.length) return labels.join("");
    return String(cipher.glyphs[0]?.label || cipher.glyphs[0]?.key || "A");
}

export const pairs = CIPHERS.map(cipher => {
    const sample = sampleFor(cipher);
    return {
        id: `symbol-${cipher.slug}`,
        encode: "Symbol cipher encode",
        decode: "Symbol cipher decode",
        args: [cipher.slug],
        sample,
        expected: sample
    };
});

// Pigpen's table is A-Z in order, so ABC must be the first three placeholders.
const PIGPEN_ABC = String.fromCharCode(0xE001, 0xE002, 0xE003);

export const checks = [
    {name: "Symbol cipher encode", input: "ABC", args: {Cipher: "pigpen"}, expected: PIGPEN_ABC},
    {name: "Symbol cipher encode", input: "A!", args: {Cipher: "pigpen"}, expected: String.fromCharCode(0xE001) + "!"},
    {name: "Symbol cipher decode", input: PIGPEN_ABC, args: {Cipher: "pigpen"}, expected: "ABC"},
    {name: "Symbol cipher decode", input: "plain", args: {Cipher: "pigpen"}, expected: "plain"}
];
