// ======================================================
// MIARCUS — realtime / gallery hardening tests
// Run: node --test test/realtime.test.js   (from /server)
// Uses only Node built-ins and the new utilities, so it runs
// without a database or network.
// ======================================================

process.env.JWT_SECRET =
    process.env.JWT_SECRET || "test-secret-for-realtime-tests-0123456789abcdef";

const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const crypto = require("node:crypto");

const tickets = require("../utils/streamTicket");
const sse = require("../utils/sseStream");
const thumbs = require("../utils/galleryThumbnail");

// ------------------------------------------------------
// Stream tickets
// ------------------------------------------------------

test("stream ticket: valid ticket verifies once for its purpose", () => {
    tickets._resetUsedTickets();
    const { ticket, expiresIn } = tickets.issueStreamTicket({ userId: 42, tokenVersion: 3, purpose: "notifications" });
    assert.ok(expiresIn > 0 && expiresIn <= 300);
    const payload = tickets.verifyStreamTicket(ticket, "notifications");
    assert.equal(payload.uid, 42);
    assert.equal(payload.tv, 3);
});

test("stream ticket: replay is rejected (single use)", () => {
    tickets._resetUsedTickets();
    const { ticket } = tickets.issueStreamTicket({ userId: 7, purpose: "chat" });
    assert.ok(tickets.verifyStreamTicket(ticket, "chat"));
    assert.equal(tickets.verifyStreamTicket(ticket, "chat"), null);
});

test("stream ticket: wrong purpose is rejected", () => {
    tickets._resetUsedTickets();
    const { ticket } = tickets.issueStreamTicket({ userId: 7, purpose: "chat" });
    assert.equal(tickets.verifyStreamTicket(ticket, "notifications"), null);
});

test("stream ticket: expired ticket is rejected", () => {
    tickets._resetUsedTickets();
    const past = Date.now() - 10 * 60 * 1000;
    const { ticket } = tickets.issueStreamTicket({ userId: 5, purpose: "notifications" }, past);
    assert.equal(tickets.verifyStreamTicket(ticket, "notifications"), null);
});

test("stream ticket: tampered payload / signature is rejected", () => {
    tickets._resetUsedTickets();
    const { ticket } = tickets.issueStreamTicket({ userId: 5, purpose: "notifications" });
    const [body, sig] = ticket.split(".");
    const forged = JSON.parse(Buffer.from(body, "base64url").toString());
    forged.uid = 1; // try to become user 1
    const forgedBody = Buffer.from(JSON.stringify(forged)).toString("base64url");
    assert.equal(tickets.verifyStreamTicket(`${forgedBody}.${sig}`, "notifications"), null);
    assert.equal(tickets.verifyStreamTicket(`${body}.${sig.slice(0, -2)}xx`, "notifications"), null);
    assert.equal(tickets.verifyStreamTicket("", "notifications"), null);
    assert.equal(tickets.verifyStreamTicket("a.b.c", "notifications"), null);
});

test("stream ticket: a login-style JWT is never accepted as a ticket", () => {
    tickets._resetUsedTickets();
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ id: 1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
    const sig = crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
    assert.equal(tickets.verifyStreamTicket(`${header}.${payload}.${sig}`, "notifications"), null);
});

test("stream ticket: issuing requires a valid user and purpose", () => {
    assert.throws(() => tickets.issueStreamTicket({ userId: 0, purpose: "chat" }));
    assert.throws(() => tickets.issueStreamTicket({ userId: 1, purpose: "admin" }));
});

test("stream ticket: user re-check rejects inactive / revoked users", async () => {
    const make = () => tickets.issueStreamTicket({ userId: 9, tokenVersion: 2, purpose: "notifications" }).ticket;
    tickets._resetUsedTickets();

    const active = { id: 9, status: "Active", is_activated: 1, token_version: 2 };
    assert.ok(await tickets.authenticateStreamTicket(make(), "notifications", async () => active));

    assert.equal(
        await tickets.authenticateStreamTicket(make(), "notifications", async () => ({ ...active, status: "Inactive" })),
        null
    );
    assert.equal(
        await tickets.authenticateStreamTicket(make(), "notifications", async () => ({ ...active, is_activated: 0 })),
        null
    );
    assert.equal(
        await tickets.authenticateStreamTicket(make(), "notifications", async () => ({ ...active, token_version: 3 })),
        null
    );
    assert.equal(await tickets.authenticateStreamTicket(make(), "notifications", async () => null), null);
});

test("legacy ?token= stream auth is OFF unless explicitly enabled", () => {
    const saved = process.env.SSE_ALLOW_LOGIN_TOKEN;
    delete process.env.SSE_ALLOW_LOGIN_TOKEN;
    assert.equal(tickets.legacyQueryTokenAllowed(), false);
    process.env.SSE_ALLOW_LOGIN_TOKEN = "true";
    assert.equal(tickets.legacyQueryTokenAllowed(), true);
    if (saved === undefined) delete process.env.SSE_ALLOW_LOGIN_TOKEN;
    else process.env.SSE_ALLOW_LOGIN_TOKEN = saved;
});

// ------------------------------------------------------
// SSE helper
// ------------------------------------------------------

const fakeReqRes = () => {
    const req = new EventEmitter();
    req.socket = { setKeepAlive() {}, setNoDelay() {}, setTimeout() {} };
    const res = new EventEmitter();
    res.headers = {};
    res.chunks = [];
    res.statusCode = 0;
    res.writableEnded = false;
    res.destroyed = false;
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.setHeader = (k, v) => {
        res.headers[k.toLowerCase()] = v;
    };
    res.flushHeaders = () => {};
    res.write = (chunk) => {
        res.chunks.push(String(chunk));
        return true;
    };
    res.end = () => {
        res.writableEnded = true;
    };
    return { req, res };
};

test("sse: correct headers, padding, retry and events", () => {
    const { req, res } = fakeReqRes();
    const stream = sse.openSseStream(req, res, { channel: "t1", userId: 1 });

    assert.equal(res.statusCode, 200);
    assert.match(res.headers["content-type"], /text\/event-stream/);
    assert.match(res.headers["cache-control"], /no-transform/);
    assert.equal(res.headers["x-accel-buffering"], "no");
    assert.ok(res.chunks[0].length >= 2048, "first chunk is >= 2 KB padding");
    assert.ok(res.chunks.some((c) => c.startsWith("retry: ")));

    assert.equal(stream.send("notification", { id: 5 }), true);
    assert.ok(res.chunks.at(-1).startsWith("event: notification\ndata: {\"id\":5}"));

    stream.close();
});

test("sse: client disconnect cleans up registry and calls onClose once", () => {
    const { req, res } = fakeReqRes();
    let closed = 0;
    sse.openSseStream(req, res, { channel: "t2", userId: 2, onClose: () => { closed += 1; } });
    assert.equal(sse.streamCount("t2"), 1);

    req.emit("close");
    req.emit("close");
    assert.equal(closed, 1);
    assert.equal(sse.streamCount("t2"), 0);
    assert.equal(res.writableEnded, true);
});

test("sse: per-user stream cap closes the oldest stream", () => {
    const opened = [];
    for (let i = 0; i < sse.MAX_STREAMS_PER_USER + 2; i += 1) {
        const pair = fakeReqRes();
        opened.push(pair);
        sse.openSseStream(pair.req, pair.res, { channel: "t3", userId: 3 });
    }
    assert.equal(sse.streamCount("t3"), sse.MAX_STREAMS_PER_USER);
    assert.equal(opened[0].res.writableEnded, true);
    assert.equal(opened.at(-1).res.writableEnded, false);
    sse.closeAllStreams();
    assert.equal(sse.streamCount("t3"), 0);
});

test("sse: send after close is a no-op", () => {
    const { req, res } = fakeReqRes();
    const stream = sse.openSseStream(req, res, { channel: "t4", userId: 4 });
    stream.close();
    const before = res.chunks.length;
    assert.equal(stream.send("x", {}), false);
    assert.equal(res.chunks.length, before);
});

// ------------------------------------------------------
// Gallery thumbnail cache
// ------------------------------------------------------

test("thumbnail LRU stays within its byte budget", () => {
    const lru = new thumbs.ByteLru(100);
    lru.set("a", Buffer.alloc(40));
    lru.set("b", Buffer.alloc(40));
    lru.get("a"); // a is now most recent
    lru.set("c", Buffer.alloc(40)); // evicts b
    assert.ok(lru.bytes <= 100);
    assert.ok(lru.get("a"));
    assert.equal(lru.get("b"), null);
    assert.ok(lru.get("c"));
    lru.set("huge", Buffer.alloc(500)); // larger than budget: ignored
    assert.equal(lru.get("huge"), null);
});

test("thumbnails never attempted for SVG / non-images", () => {
    assert.equal(thumbs.isThumbnailable("image/svg+xml"), false);
    assert.equal(thumbs.isThumbnailable("application/pdf"), false);
    assert.equal(thumbs.isThumbnailable("video/mp4"), false);
});

test("forgetThumbnail removes cached entries for that record", () => {
    thumbs._cache.set("77:100", Buffer.alloc(10));
    thumbs._cache.set("78:100", Buffer.alloc(10));
    thumbs.forgetThumbnail(77);
    assert.equal(thumbs.getCachedThumbnail(77, 100), null);
    assert.ok(thumbs.getCachedThumbnail(78, 100));
});

test("buildThumbnail returns null (fallback to original) for unsupported input", async () => {
    assert.equal(await thumbs.buildThumbnail(1, 10, Buffer.alloc(0), "image/jpeg"), null);
    assert.equal(await thumbs.buildThumbnail(1, 10, Buffer.from("x"), "application/pdf"), null);
});
