/* Browser test for the steganography nodes ------------------------------------
 *   node dev/stego/browser-test.mjs
 *
 * The fixtures are carriers produced by OpenStego and JPHide themselves; see
 * fixtures/manifest.json for the exact commands. This test serves the built app,
 * imports a File node -> operation -> text result graph for each fixture and lets
 * the import-triggered run execute, then reads the payload from the real node
 * preview in Chromium. That means the OpenStego path exercises
 * createImageBitmap/OffscreenCanvas and Web Crypto in the worker, and the JPHide
 * path exercises the JPEG DCT decoder there.
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const ROOT = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const FIXTURES = path.join(ROOT, "dev/stego/fixtures");
const MANIFEST = path.join(FIXTURES, "manifest.json");
const BOOT_TIMEOUT = 90_000;
const RUN_TIMEOUT = 60_000;

function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const {port} = server.address();
            server.close(() => resolve(port));
        });
    });
}

function startServer(port) {
    const child = spawn(process.execPath, [path.join(ROOT, "dev/serve.mjs"), String(port)], {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    let output = "";
    let errors = "";
    child.stderr.on("data", chunk => { errors += chunk; });
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`dev/serve.mjs did not start:\n${output}${errors}`));
        }, 15_000);
        child.stdout.on("data", chunk => {
            output += chunk;
            if (output.includes("serving")) {
                clearTimeout(timer);
                resolve(child);
            }
        });
        child.once("exit", code => {
            clearTimeout(timer);
            reject(new Error(`dev/serve.mjs exited with ${code}:\n${output}${errors}`));
        });
    });
}

function stopServer(child) {
    if (!child || child.killed) return;
    child.kill("SIGTERM");
}

function fixturePath(fixture, key) {
    return path.join(FIXTURES, fixture[key]);
}

function makeGraph(fixture, carrier) {
    return {
        app: "CipherFlow",
        version: 1,
        nodes: [
            {
                id: 1,
                type: "file",
                x: 40,
                y: 60,
                title: `Carrier · ${fixture.id}`,
                fileName: fixture.carrier,
                fileSize: carrier.length,
                fileData: carrier.toString("base64"),
                mime: fixture.mime
            },
            {
                id: 2,
                type: "op",
                x: 410,
                y: 50,
                op: fixture.operation,
                values: fixture.values
            },
            {
                id: 3,
                type: "input",
                x: 820,
                y: 60,
                title: `Result · ${fixture.id}`,
                text: "",
                encoding: "utf8"
            }
        ],
        edges: [
            {id: "e1", from: 1, to: 2, toPort: "main"},
            {id: "e2", from: 2, to: 3, toPort: "main"}
        ],
        functions: [],
        autoRun: false
    };
}

async function diagnostics(page) {
    const status = await page.locator("#runStatusText").textContent().catch(() => "");
    const errors = await page.locator("[data-node-error]").evaluateAll(nodes =>
        nodes.filter(node => node.offsetParent !== null && node.textContent.trim())
            .map(node => node.textContent.trim())
    ).catch(() => []);
    const nodes = await page.locator(".node").evaluateAll(items => items.map(node => ({
        id: node.dataset.id,
        title: node.querySelector("[data-node-title]")?.textContent || "",
        preview: node.querySelector(".preview pre")?.textContent ?? null,
        bytes: node.querySelector(".preview-head .bytes")?.textContent || ""
    }))).catch(() => []);
    return `status: ${status || "(none)"}; nodes: ${JSON.stringify(nodes)}${errors.length ? `\nerrors: ${errors.join(" | ")}` : ""}`;
}

async function testFixture(page, fixture) {
    const carrier = fs.readFileSync(fixturePath(fixture, "carrier"));
    const payload = fs.readFileSync(fixturePath(fixture, "payload"));
    const payloadText = fixture.binary ? null : payload.toString("utf8");
    const graph = makeGraph(fixture, carrier);
    const title = `Result · ${fixture.id}`;

    await page.setInputFiles("#openFileInput", {
        name: `${fixture.id}.json`,
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(graph))
    });

    try {
        await page.waitForFunction(expected => [...document.querySelectorAll("[data-node-title]")]
            .some(node => node.textContent === expected), title, {timeout: 30_000});
        if (fixture.binary) {
            await page.waitForFunction(() => {
                const image = document.querySelector('.node[data-id="3"] .preview-img');
                return Boolean(image) && image.complete && image.naturalWidth > 0;
            }, null, {timeout: RUN_TIMEOUT});
        } else {
            await page.waitForFunction(expected => {
                const preview = document.querySelector('.node[data-id="3"] .preview pre');
                return Boolean(preview) && preview.textContent === expected;
            }, payloadText, {timeout: RUN_TIMEOUT});
        }
    } catch (err) {
        throw new Error(`${fixture.id} did not decode.\n${await diagnostics(page)}`);
    }

    if (fixture.binary) {
        const src = await page.locator('.node[data-id="3"] .preview-img').getAttribute("src");
        const actual = Buffer.from(String(src || "").split(",")[1] || "", "base64");
        if (!actual.equals(payload)) {
            throw new Error(`${fixture.id}: revealed image bytes differ from ${fixture.payload}`);
        }
    } else {
        const actual = await page.locator('.node[data-id="3"] .preview pre').textContent();
        if (actual !== payloadText) {
            throw new Error(`${fixture.id}: preview differs from ${fixture.payload}\n${JSON.stringify(actual)}`);
        }
    }
    const attached = (await page.locator('.node[data-id="1"] .file-name').textContent()).trim();
    if (attached !== fixture.carrier) {
        throw new Error(`${fixture.id}: File node shows ${JSON.stringify(attached)}, expected ${fixture.carrier}`);
    }
    const bytes = (await page.locator('.node[data-id="3"] .preview-head .bytes').textContent()).trim();
    const byteLabel = payload.length < 1024
        ? `${payload.length} byte${payload.length === 1 ? "" : "s"}`
        : `${(payload.length / 1024).toFixed(1)} KB`;
    if (!bytes.includes(byteLabel)) {
        throw new Error(`${fixture.id}: result reports ${JSON.stringify(bytes)} for ${payload.length} bytes`);
    }
    const status = (await page.locator("#runStatusText").textContent()).trim();
    if (!status.startsWith("Ran 3 nodes")) {
        throw new Error(`${fixture.id}: run status ${JSON.stringify(status)}`);
    }
    return fixture.binary
        ? `${payload.length} bytes image`
        : `${payloadText.length} characters / ${payload.length} bytes`;
}

async function main() {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
    if (!fixtures.length) throw new Error("No fixtures in dev/stego/fixtures/manifest.json");

    const port = await freePort();
    let server;
    let browser;
    let failures = 0;
    const pageErrors = [];
    const consoleErrors = [];

    try {
        server = await startServer(port);
        try {
            browser = await chromium.launch({headless: true});
        } catch (err) {
            throw new Error(`Could not launch Chromium. Run "npx playwright install chromium" first.\n${err.message}`);
        }
        const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
        await context.addInitScript(() => {
            try { localStorage.setItem("cipherflow.tour.v1", "done"); } catch { /* storage disabled */ }
        });
        const page = await context.newPage();
        page.on("pageerror", err => pageErrors.push(String(err)));
        page.on("console", message => {
            if (message.type() === "error") consoleErrors.push(message.text());
        });

        await page.goto(`http://127.0.0.1:${port}/index.html`, {waitUntil: "domcontentloaded"});
        await page.waitForFunction(() => {
            const run = document.querySelector("#runBtn");
            return Boolean(window.__bootApp) && Boolean(run) && !run.disabled &&
                !document.querySelector("#boot");
        }, null, {timeout: BOOT_TIMEOUT});

        console.log(`CipherFlow stego browser test · Chromium ${browser.version()}`);
        for (const fixture of fixtures) {
            try {
                const detail = await testFixture(page, fixture);
                console.log(`ok    ${fixture.id} · ${fixture.operation} · ${detail}`);
            } catch (err) {
                failures++;
                console.error(`FAIL  ${fixture.id} · ${fixture.operation}\n      ${String(err.message || err).replace(/\n/g, "\n      ")}`);
            }
        }
    } finally {
        if (browser) await browser.close().catch(() => {});
        stopServer(server);
    }

    if (pageErrors.length) {
        failures += pageErrors.length;
        console.error(`FAIL  ${pageErrors.length} page error(s):\n      ${pageErrors.join("\n      ")}`);
    }
    if (consoleErrors.length) {
        console.warn(`warn  ${consoleErrors.length} console error(s):\n      ${consoleErrors.join("\n      ")}`);
    }
    if (failures) {
        console.error(`\n${failures} browser check(s) failed`);
        process.exit(1);
    }
    console.log(`\nall ${fixtures.length} browser checks passed`);
}

main().catch(err => {
    console.error(`FAIL  ${err.message || err}`);
    process.exit(1);
});
