import * as esbuild from "esbuild";
import path from "node:path";
const stub = path.resolve("dev/testregister-stub.mjs");
await esbuild.build({
    entryPoints: ["dev/collect-entry.mjs"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: "dev/collect-bundle.mjs",
    target: "node22",
    logLevel: "warning",
    loader: {".png": "dataurl", ".jpg": "dataurl", ".jpeg": "dataurl", ".gif": "dataurl", ".wasm": "binary"},
    plugins: [{
        name: "stubs",
        setup(build) {
            build.onResolve({filter: /TestRegister\.mjs$/}, () => ({path: stub}));
            build.onResolve({filter: /tests\/lib\/utils\.mjs$/}, () => ({path: stub}));
        }
    }]
});
console.log("bundled");
