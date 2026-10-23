// Run with:  npm test  (node --test)
import { test } from "node:test";
import assert from "node:assert/strict";

import runAfterCommit from "./runAfterCommit.js";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("runs the task after the current tick", async () => {
    let ran = 0;
    runAfterCommit(() => { ran += 1; });
    assert.equal(ran, 0, "not synchronous");
    await flush();
    assert.equal(ran, 1);
});

test("cleanup before the task starts skips it", async () => {
    let ran = 0;
    const cleanup = runAfterCommit(() => { ran += 1; });
    cleanup();
    await flush();
    assert.equal(ran, 0);
});

test("cleanup returned by the task runs on effect cleanup", async () => {
    let cleaned = 0;
    const cleanup = runAfterCommit(() => () => { cleaned += 1; });
    await flush();
    cleanup();
    cleanup();
    assert.equal(cleaned, 1, "only once");
});
