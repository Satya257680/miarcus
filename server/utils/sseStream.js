// ======================================================
// MIARCUS — SERVER-SENT EVENTS (SSE) HELPER
// ------------------------------------------------------
// One place that opens an event stream correctly behind IIS / ARR (or any
// reverse proxy) and cleans it up reliably.
//
//   • text/event-stream + no-cache, no-transform + X-Accel-Buffering: no
//   • 2 KB comment padding first, so proxies / AV gateways that buffer the
//     first few KB release the stream immediately
//   • "retry:" hint so the browser waits before reconnecting
//   • keep-alive comment every SSE_KEEPALIVE_MS (15 s default) — shorter
//     than common proxy / NAT / mobile-carrier idle timeouts
//   • TCP keep-alive + no-delay on the socket
//   • every timer and listener removed on close / error / shutdown
//   • bounded number of streams per user per channel (oldest closed)
//   • closeAllStreams() for graceful shutdown
// ======================================================

const KEEPALIVE_MS = Math.min(
    Math.max(Number(process.env.SSE_KEEPALIVE_MS) || 15000, 5000),
    55000
);
const RETRY_MS = Math.min(Math.max(Number(process.env.SSE_RETRY_MS) || 10000, 1000), 60000);
const MAX_STREAMS_PER_USER = Math.min(
    Math.max(Number(process.env.SSE_MAX_STREAMS_PER_USER) || 6, 1),
    50
);

// channel -> userId -> Set(stream)
const registry = new Map();
const allStreams = new Set();

const PADDING = `:${" ".repeat(2048)}\n\n`;

function getUserSet(channel, userId) {
    if (!registry.has(channel)) registry.set(channel, new Map());
    const byUser = registry.get(channel);
    if (!byUser.has(userId)) byUser.set(userId, new Set());
    return byUser.get(userId);
}

/**
 * Open an SSE stream.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {{ channel: string, userId: number, onClose?: Function }} options
 * @returns {{ send: (event: string, data: any) => boolean, close: Function }}
 */
function openSseStream(req, res, { channel, userId, onClose } = {}) {
    const uid = Number(userId);
    let closed = false;

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    // Tell IIS / intermediaries not to compress (compression buffers events).
    res.setHeader("Content-Encoding", "identity");
    res.flushHeaders?.();

    try {
        req.socket?.setKeepAlive?.(true, KEEPALIVE_MS);
        req.socket?.setNoDelay?.(true);
        req.socket?.setTimeout?.(0);
    } catch {
        // ignore — best effort
    }

    const write = (chunk) => {
        if (closed || res.writableEnded || res.destroyed) return false;
        try {
            res.write(chunk);
            return true;
        } catch {
            close();
            return false;
        }
    };

    const stream = {
        channel,
        userId: uid,
        send(event, data) {
            return write(`event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`);
        },
        close,
        res,
    };

    const keepAlive = setInterval(() => {
        // A comment line is ignored by EventSource but keeps every hop busy.
        write(`: keep-alive ${Date.now()}\n\n`);
    }, KEEPALIVE_MS);
    keepAlive.unref?.();

    function close() {
        if (closed) return;
        closed = true;
        clearInterval(keepAlive);
        req.off?.("close", close);
        res.off?.("error", close);
        res.off?.("close", close);

        const set = registry.get(channel)?.get(uid);
        if (set) {
            set.delete(stream);
            if (set.size === 0) registry.get(channel).delete(uid);
        }
        allStreams.delete(stream);

        try {
            onClose?.();
        } catch {
            // ignore
        }

        try {
            if (!res.writableEnded) res.end();
        } catch {
            // ignore
        }
    }

    req.on("close", close);
    res.on("error", close);
    res.on("close", close);

    // Bound concurrent streams per user (duplicate tabs, remounts, retries).
    const set = getUserSet(channel, uid);
    while (set.size >= MAX_STREAMS_PER_USER) {
        const oldest = set.values().next().value;
        oldest.close();
    }
    set.add(stream);
    allStreams.add(stream);

    write(PADDING);
    write(`retry: ${RETRY_MS}\n\n`);

    return stream;
}

/** Number of open streams (diagnostics / tests). */
function streamCount(channel) {
    if (!channel) return allStreams.size;
    let total = 0;
    for (const set of registry.get(channel)?.values() || []) total += set.size;
    return total;
}

/** Close every open stream — used on graceful shutdown. */
function closeAllStreams() {
    for (const stream of [...allStreams]) stream.close();
}

module.exports = {
    openSseStream,
    closeAllStreams,
    streamCount,
    KEEPALIVE_MS,
    RETRY_MS,
    MAX_STREAMS_PER_USER,
};
