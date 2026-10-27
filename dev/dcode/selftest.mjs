/* Runs every dCode recreation in Node, exactly as the worker will ------------------
 * The generated module text is evaluated with a stub `self`, the operation classes
 * are instantiated through the same registry lookup the engine uses, and each
 * known-answer check plus each encode/decode roundtrip is executed. This is the
 * fast development loop for the cipher algorithms: `node dev/dcode/selftest.mjs`.
 */
import {MODULE_NAME, allChecks, allOps, allPairs, renderModule} from "./payload.mjs";

const source = renderModule();
globalThis.self = {OperationConfig: {}, OpModules: {}, postMessage() {}};
(0, eval)(source);

const registry = globalThis.self.OpModules[MODULE_NAME];
if (!registry) throw new Error("The generated module did not register any operations.");
const config = globalThis.self.OperationConfig;

const byName = new Map(allOps().map(spec => [spec.name, spec]));

function argsFor(spec, overrides = {}) {
    return spec.args.map(arg => (arg.name in overrides ? overrides[arg.name] : arg.value));
}

function call(name, input, overrides) {
    const spec = byName.get(name);
    if (!spec) throw new Error(`Unknown operation ${name}`);
    const cls = registry[name];
    if (!cls) throw new Error(`${name} was not registered by the module`);
    return new cls().run(String(input), argsFor(spec, overrides));
}

const filter = process.argv[2] || "";
let failures = 0;
let executed = 0;

function report(kind, name, detail) {
    failures++;
    console.log(`FAIL  [${kind}] ${name}\n      ${detail}`);
}

console.log(`module: ${MODULE_NAME} — ${allOps().length} operations, ${allChecks().length} known-answer checks`);

for (const check of allChecks()) {
    if (filter && !check.name.toLowerCase().includes(filter.toLowerCase())) continue;
    executed++;
    let actual;
    try {
        actual = call(check.name, check.input, check.args || {});
    } catch (err) {
        report("check", check.name, `threw ${err.message}`);
        continue;
    }
    if (actual !== check.expected) {
        report("check", check.name, `input ${JSON.stringify(check.input)} args ${JSON.stringify(check.args)} → ${JSON.stringify(actual)}, expected ${JSON.stringify(check.expected)}`);
    }
}

const SAMPLE = "Attack at dawn 13 times, node editor! Café";
for (const pair of allPairs()) {
    if (filter && !pair.id.includes(filter.toLowerCase())) continue;
    executed++;
    const spec = byName.get(pair.encode);
    const overrides = {};
    (spec.args || []).forEach((arg, i) => { overrides[arg.name] = pair.args[i]; });
    const sample = pair.sample || SAMPLE;
    let encoded;
    try {
        encoded = call(pair.encode, sample, overrides);
        const decoded = call(pair.decode, encoded, overrides);
        const expected = pair.expected || sample;
        if (decoded !== expected) {
            report("roundtrip", pair.id, `${JSON.stringify(sample)} → ${JSON.stringify(encoded)} → ${JSON.stringify(decoded)}, expected ${JSON.stringify(expected)}`);
        }
    } catch (err) {
        report("roundtrip", pair.id, `threw ${err.message}`);
    }
}

for (const spec of allOps()) {
    if (!config[spec.name]) report("config", spec.name, "missing from OperationConfig");
    if (!spec.description || spec.description.length < 30) report("config", spec.name, "description is too short");
    if (spec.host) continue;  // host-run operations (Magic) are checked by the page
    const checked = allChecks().some(c => c.name === spec.name) || allPairs().some(p => p.encode === spec.name || p.decode === spec.name);
    if (!checked) report("coverage", spec.name, "no known-answer check and no roundtrip pair");
}

console.log(failures ? `\n${failures} problem(s) across ${executed} executed check(s)` : `\nall ${executed} checks passed`);
process.exit(failures ? 1 : 0);
