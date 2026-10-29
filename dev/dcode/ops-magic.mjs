/* CipherFlow's own Magic operation -----------------------------------------------
 * Magic is not a transform: the host page intercepts this node, runs every other
 * operation in the library over its input inside the engine worker, scores the
 * results and lists as many as the node asks for (see the Magic section of
 * dev/app.js). The operation below exists so the node has metadata, a palette entry and a harmless
 * fallback: if it is ever run directly it simply passes its input through.
 */

const GROUP = "CipherFlow · Magic";

export const ops = [
    {
        name: "Magic",
        host: true,
        group: GROUP,
        description: "Runs every operation in the library against the input — plus every Caesar shift from 1 to 25 — scores each result for how much it reads like real output (printable text, English letter statistics, common letter pairs, real words, how its letters are grouped, JSON, URLs, addresses, timestamps) and ranks them. Show top is the row count: the node lists exactly that many ranked results, with findings and reading decodes first and less likely results filling the tail. Two operations that land on the same text share one row, and encoders rank below decoders. Click a row to feed that result into the rest of the graph. Analysis and chart operations are never probed, brute-force tables are never offered as an answer, and the slow, random or network operations are skipped unless they are switched on here.",
        args: [
            {name: "Show top", type: "number", value: 10},
            {name: "Scope", type: "option", value: ["Everything (loads every module)", "Loaded modules only", "Core module only"]},
            {name: "Include slow operations", type: "boolean", value: false}
        ],
        run: (input, args) => input
    }
];

export const pairs = [];
export const checks = [];
