#!/usr/bin/env node
// Publishes the built app to the orphan `gh-pages` branch, which is the branch GitHub Pages
// serves. Only `index.html` and `.nojekyll` go in it: the repository's docs, dev sources,
// symbol art and report notes must not be reachable at the Pages origin.
//
// Run from the repo root after `node dev/build.mjs`:
//   node dev/publish-pages.mjs            publish
//   node dev/publish-pages.mjs --dry-run  report the commit it would make
//
// The branch is built with plumbing from a throwaway work tree, so this checkout, its index
// and its working tree are never touched.
import {execFileSync} from "node:child_process";
import {copyFileSync, mkdtempSync, rmSync, statSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const BRANCH = "gh-pages";
const dryRun = process.argv.includes("--dry-run");

function git(args, {cwd, env, allowFail = false} = {}) {
    try {
        return execFileSync("git", args, {
            cwd: cwd || process.cwd(),
            env: env || process.env,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"]
        }).trim();
    } catch (err) {
        if (allowFail) return "";
        throw new Error(`git ${args.join(" ")} failed: ${String(err.stderr || err.message).trim()}`);
    }
}

const gitDir = git(["rev-parse", "--absolute-git-dir"]);
const work = mkdtempSync(join(tmpdir(), "cipherflow-pages-"));
// The index has to live outside the work tree: git keeps an index.lock next to it while it
// runs, and `git add .` would otherwise stage that lock into the published commit.
const indexDir = mkdtempSync(join(tmpdir(), "cipherflow-pages-index-"));
try {
    copyFileSync("index.html", join(work, "index.html"));
    writeFileSync(join(work, ".nojekyll"), "");
    const env = {...process.env, GIT_DIR: gitDir, GIT_WORK_TREE: work, GIT_INDEX_FILE: join(indexDir, "index")};
    git(["add", "--all", "--force", "."], {cwd: work, env});
    const tree = git(["write-tree"], {env});
    // Keep the branch linear: the previous published commit is the parent, wherever it lives.
    const parent = git(["rev-parse", "--quiet", "--verify", `refs/heads/${BRANCH}`], {allowFail: true})
        || git(["ls-remote", "--heads", "origin", BRANCH], {allowFail: true}).split(/\s+/)[0]
        || "";
    const source = git(["rev-parse", "--short", "HEAD"]);
    const args = ["commit-tree", tree, "-m", `Publish index.html from ${source}`];
    if (parent) args.push("-p", parent);
    const commit = git(args);
    const size = (statSync("index.html").size / 1048576).toFixed(2);
    if (dryRun) {
        console.log(`would publish ${commit.slice(0, 7)} to ${BRANCH}: index.html (${size} MB) + .nojekyll`);
    } else {
        git(["update-ref", `refs/heads/${BRANCH}`, commit]);
        git(["push", "origin", `${BRANCH}:${BRANCH}`]);
        console.log(`published ${commit.slice(0, 7)} to ${BRANCH}: index.html (${size} MB) + .nojekyll`);
    }
} finally {
    rmSync(work, {recursive: true, force: true});
    rmSync(indexDir, {recursive: true, force: true});
}
