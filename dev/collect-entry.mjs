import fs from "node:fs";

globalThis.__TESTS = [];
await import("../node_modules/cyberchef/tests/operations/index.mjs");

// Preserve regex assertions (expectedMatch / unexpectedMatch) which are common in
// CyberChef's suite and would otherwise be lost when serialising to JSON.
const serialised = globalThis.__TESTS.map(t => {
    const out = {...t};
    for (const key of ["expectedMatch", "unexpectedMatch"]) {
        if (t[key] instanceof RegExp) {
            out[key] = {source: t[key].source, flags: t[key].flags};
        }
    }
    if (typeof out.input !== "string") out.input = String(out.input ?? "");
    return out;
});
fs.writeFileSync("dev/cc-tests.json", JSON.stringify(serialised));
console.log("COLLECTED", serialised.length);
