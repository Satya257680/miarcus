const buckets = new Map();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function now() {
    return Date.now();
}

function getClientIp(req) {
    return String(req.ip || req.socket?.remoteAddress || "unknown");
}

function createLimiter({ windowMs, max, keyGenerator, message }) {
    return (req, res, next) => {
        const key = keyGenerator(req);
        const current = now();
        const existing = buckets.get(key);

        if (!existing || current - existing.startedAt >= windowMs) {
            buckets.set(key, { startedAt: current, count: 1 });
            return next();
        }

        existing.count += 1;

        if (existing.count > max) {
            const retryAfter = Math.max(
                1,
                Math.ceil((windowMs - (current - existing.startedAt)) / 1000)
            );

            res.setHeader("Retry-After", String(retryAfter));

            return res.status(429).json({
                success: false,
                message,
                retryAfter,
            });
        }

        return next();
    };
}

setInterval(() => {
    const cutoff = now() - 15 * 60 * 1000;

    for (const [key, value] of buckets.entries()) {
        if (value.startedAt < cutoff) {
            buckets.delete(key);
        }
    }
}, CLEANUP_INTERVAL_MS).unref();

const loginLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) =>
        `login:${getClientIp(req)}:${String(req.body?.email || "")
            .trim()
            .toLowerCase()}`,
    message: "Too many login attempts. Please try again later.",
});

const loginIpLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 40,
    keyGenerator: (req) => `login-ip:${getClientIp(req)}`,
    message: "Too many login attempts from this network. Please try again later.",
});

const passwordResetLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) =>
        `reset:${getClientIp(req)}:${String(req.body?.email || "")
            .trim()
            .toLowerCase()}`,
    message: "Too many password-reset requests. Please try again later.",
});

const otpVerifyLimiter = createLimiter({
    windowMs: 10 * 60 * 1000,
    max: 8,
    keyGenerator: (req) =>
        `otp:${getClientIp(req)}:${String(req.body?.email || "")
            .trim()
            .toLowerCase()}`,
    message: "Too many OTP attempts. Please request a new OTP later.",
});

const signupLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => `signup:${getClientIp(req)}`,
    message: "Too many registration attempts. Please try again later.",
});

const publicSignupGate = (req, res, next) => {
    if (String(process.env.ALLOW_PUBLIC_SIGNUP || "false").toLowerCase() !== "true") {
        return res.status(403).json({
            success: false,
            message: "Public registration is disabled. Please use an administrator invitation."
        });
    }
    return next();
};

module.exports = {
    loginLimiter,
    loginIpLimiter,
    passwordResetLimiter,
    otpVerifyLimiter,
    signupLimiter,
    publicSignupGate,
};
