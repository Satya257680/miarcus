const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const db = require("../config/db");
const Expense = require("../models/expenseModel");
const { sendGenericEmail } = require("../services/emailService");

const MAX_AI_BYTES = 18 * 1024 * 1024;

// ======================================================
// GEMINI AI CONFIGURATION
// ======================================================

// Render environment variables are used when present.
// Safe production defaults are kept for local development.
const AI_TIMEOUT_MS = Math.max(
    10000,
    Number(process.env.GEMINI_TIMEOUT_MS) || 60000
);

const AI_MAX_RETRIES = Math.max(
    0,
    Math.min(
        5,
        Number(process.env.GEMINI_MAX_RETRIES) || 2
    )
);

const GEMINI_DEFAULT_MODEL =
    "gemini-2.5-flash";

const GEMINI_FALLBACK_MODEL =
    String(
        process.env.GEMINI_FALLBACK_MODEL ||
        "gemini-2.5-flash-lite"
    ).trim();

const VERIFICATION_TIMEOUT_MS = 15000;

function clean(value) {
    return value === undefined || value === null
        ? ""
        : String(value).trim();
}

// ======================================================
// EXPENSE ACCESS CONTROL
// ======================================================
// Administrator and Expenses = Full can see every user's
// expenses. View/Add/Edit users can only see their own.
// The decision is made on the server from the authenticated
// user and database permissions; query-string userId is
// never trusted for restricted users.
// ======================================================

async function getExpenseAccess(req) {
    const userId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return {
            authenticated: false,
            canViewAll: false,
            permission: null,
            userId: null
        };
    }

    let userRows = [];
    let permissionRows = [];

    // Miarcus stores the administrator flag as `is_admin`.
    // Do NOT query `administrator` here because that column does
    // not exist in the current users table.
    userRows = await db.query(
        `
            SELECT is_admin
            FROM users
            WHERE id = ?
            LIMIT 1
        `,
        [userId]
    );

    permissionRows = await db.query(
        `
            SELECT permission
            FROM user_permissions
            WHERE user_id = ?
              AND LOWER(module_name) = LOWER(?)
        `,
        [userId, "Expenses"]
    );

    const user = Array.isArray(userRows) ? userRows[0] : null;

    const isAdministrator =
        user?.is_admin === true ||
        user?.is_admin === 1 ||
        String(user?.is_admin || "") === "1" ||
        req.user?.administrator === true ||
        req.user?.administrator === 1 ||
        String(req.user?.administrator || "") === "1";

    const permissions = Array.isArray(permissionRows)
        ? permissionRows.map((row) =>
            String(row?.permission || "").trim()
        )
        : [];

    const fullPermission = permissions.find(
        (permission) =>
            permission.toLowerCase() === "full"
    );

    const effectivePermission =
        fullPermission ||
        permissions[0] ||
        null;

    return {
        authenticated: true,
        canViewAll: isAdministrator || Boolean(fullPermission),
        permission: effectivePermission,
        userId
    };
}

function escapeHtml(value) {
    return clean(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function parseJson(value, fallback = null) {
    if (typeof value !== "string") {
        return value ?? fallback;
    }

    const text = value.trim();
    if (!text) return fallback;

    const candidates = [
        text,
        text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
    ];

    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate);
        } catch {}
    }

    const starts = [
        text.indexOf("{"),
        text.indexOf("[")
    ].filter((index) => index >= 0);

    if (starts.length) {
        const start = Math.min(...starts);
        const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));

        if (end > start) {
            try {
                return JSON.parse(text.slice(start, end + 1));
            } catch {}
        }
    }

    return fallback;
}

function normalizeDate(value) {
    const text = clean(value);
    if (!text) return null;

    const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (iso) {
        return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`;
    }

    const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) {
        return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.toISOString().slice(0, 10);
}

function arrayOfStrings(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => clean(item))
            .filter(Boolean);
    }

    const text = clean(value);
    return text ? [text] : [];
}

function normalizeItems(items) {
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
        const quantity = num(item.quantity, 1);
        const unitPrice = num(
            item.unit_price ?? item.unitPrice,
            0
        );

        const lineTotal = num(
            item.line_total ?? item.lineTotal,
            quantity * unitPrice
        );

        return {
            description: clean(
                item.description ??
                item.item_description ??
                item.name
            ),
            quantity: quantity > 0 ? quantity : 1,
            unit_price: unitPrice,
            tax_rate: num(
                item.tax_rate ?? item.taxRate,
                0
            ),
            tax_amount: num(
                item.tax_amount ?? item.taxAmount,
                0
            ),
            line_total: lineTotal
        };
    }).filter(
        (item) =>
            item.description ||
            item.line_total > 0
    );
}

function normalizeAiResult(raw) {
    const data = raw || {};

    return {
        vendor_name: clean(
            data.vendor_name ||
            data.vendor ||
            data.supplier_name
        ),

        vendor_gstin: clean(
            data.vendor_gstin ||
            data.gstin ||
            data.gst_number
        ),

        invoice_number: clean(
            data.invoice_number ||
            data.invoice_no ||
            data.bill_number
        ),

        bill_date: normalizeDate(
            data.bill_date ||
            data.invoice_date ||
            data.date
        ),

        currency: clean(
            data.currency || "INR"
        ).toUpperCase(),

        subtotal: num(
            data.subtotal ??
            data.sub_total
        ),

        tax_amount: num(
            data.tax_amount ??
            data.tax ??
            data.gst_amount
        ),

        total_amount: num(
            data.total_amount ??
            data.total ??
            data.grand_total
        ),

        ocr_confidence: Math.max(
            0,
            Math.min(
                100,
                num(
                    data.ocr_confidence ??
                    data.confidence
                )
            )
        ),

        items: normalizeItems(data.items),

        manipulation_signals:
            arrayOfStrings(
                data.manipulation_signals
            ),

        ai_generated_signals:
            arrayOfStrings(
                data.ai_generated_signals
            ),

        image_inconsistencies:
            arrayOfStrings(
                data.image_inconsistencies
            ),

        document_authenticity: clean(
            data.document_authenticity ||
            data.authenticity ||
            data.bill_authenticity
        ).toUpperCase(),

        ai_generated_probability: Math.max(
            0,
            Math.min(
                100,
                num(
                    data.ai_generated_probability ??
                    data.synthetic_probability ??
                    data.ai_probability
                )
            )
        ),

        authenticity_confidence: Math.max(
            0,
            Math.min(
                100,
                num(data.authenticity_confidence)
            )
        ),

        notes: clean(data.notes),

        raw_text: clean(data.raw_text)
    };
}

function makeCheck(type, status, score, details) {
    return {
        check_type: type,
        check_status: status,
        score: Math.max(
            0,
            Math.min(100, Number(score || 0))
        ),
        details
    };
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(
        () => controller.abort(),
        timeoutMs
    );

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

async function analyzeWithGemini(file) {
    const apiKey = clean(
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GEMINI_API_KEY
    );

    if (!apiKey) {
        throw new Error(
            "Gemini API key is not configured. Add GEMINI_API_KEY to the server environment."
        );
    }

    if (!file || !fs.existsSync(file.path)) {
        throw new Error(
            "Uploaded bill file could not be read."
        );
    }

    const stat = fs.statSync(file.path);

    if (stat.size > MAX_AI_BYTES) {
        throw new Error(
            "Bill file is too large for AI analysis. Please upload a file up to 18 MB."
        );
    }

    const bytes = fs.readFileSync(file.path);
    const base64 = bytes.toString("base64");

    // ======================================================
    // PRIMARY + FALLBACK MODELS
    // ======================================================

    const configuredModel = clean(
        process.env.GEMINI_MODEL
    );

    const primaryModel =
        configuredModel ||
        GEMINI_DEFAULT_MODEL;

    const fallbackModel =
        GEMINI_FALLBACK_MODEL &&
        GEMINI_FALLBACK_MODEL !== primaryModel
            ? GEMINI_FALLBACK_MODEL
            : null;

    const models = [
        primaryModel,
        fallbackModel
    ].filter(Boolean);

    const prompt = `
You are the MI ARCUS bill authenticity and expense verification engine.

Analyze the uploaded bill/invoice image or PDF as a forensic document reviewer.

Return ONLY valid JSON.
Do not return markdown.
Do not invent values.

Extract:

- vendor_name
- vendor_gstin
- invoice_number
- bill_date
- currency
- subtotal
- tax_amount
- total_amount
- ocr_confidence (0-100)

Extract line items:

- description
- quantity
- unit_price
- tax_rate
- tax_amount
- line_total

Also assess authenticity using visible evidence only:

- document_authenticity:
  AUTHENTIC
  SUSPICIOUS
  AI_GENERATED
  UNKNOWN

- ai_generated_probability: 0-100
- authenticity_confidence: 0-100
- manipulation_signals: array
- ai_generated_signals: array
- image_inconsistencies: array
- notes
- raw_text

Look specifically for:

- unnatural font rendering
- inconsistent character shapes
- impossible text spacing
- repeated/generated patterns
- mismatched logos
- inconsistent compression/noise
- warped tables
- inconsistent alignment
- impossible shadows
- synthetic-looking seals/signatures
- copied invoice layouts
- image manipulation
- suspicious editing
- other visible evidence that the document may have been generated or manipulated

IMPORTANT:

1. Do not call a bill AI-generated merely because it looks clean or professional.

2. Only add AI-generated signals when there is actual visible evidence.

3. If evidence is weak, use SUSPICIOUS or UNKNOWN rather than AI_GENERATED.

4. Never invent vendor, invoice number, date, amount or GST information.

5. Always return arrays for:
   manipulation_signals
   ai_generated_signals
   image_inconsistencies

6. If a field cannot be determined from the document, use:
   ""
   0
   null
   or an empty array as appropriate.

7. Keep monetary values numeric.

8. Return valid JSON only.
`;

    // ======================================================
    // GEMINI REQUEST FUNCTION
    // ======================================================

    const requestModel = async (model) => {
        const endpoint =
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

        let lastError = null;

        for (
            let attempt = 0;
            attempt <= AI_MAX_RETRIES;
            attempt++
        ) {
            try {
                console.log(
                    `Gemini bill analysis: model=${model}, attempt=${attempt + 1}/${AI_MAX_RETRIES + 1}`
                );

                const requestBody = {
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                },
                                {
                                    inline_data: {
                                        mime_type:
                                            file.mimetype ||
                                            "application/octet-stream",
                                        data: base64
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType:
                            "application/json"
                    }
                };

                // Gemini 2.5 supports temperature. Newer Gemini 3.x
                // models may reject deprecated sampling parameters.
                if (!model.startsWith("gemini-3.")) {
                    requestBody.generationConfig.temperature = 0.1;
                }

                const response =
                    await fetchWithTimeout(
                        endpoint,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify(
                                requestBody
                            )
                        },
                        AI_TIMEOUT_MS
                    );

                const text =
                    await response.text();

                if (response.ok) {
                    return {
                        success: true,
                        model,
                        text
                    };
                }

                let errorPayload = null;

                try {
                    errorPayload = JSON.parse(text);
                } catch {
                    errorPayload = null;
                }

                const errorCode =
                    Number(
                        errorPayload?.error?.code
                    ) || response.status;

                const errorStatus =
                    String(
                        errorPayload?.error?.status ||
                        ""
                    ).toUpperCase();

                const errorMessage =
                    clean(
                        errorPayload?.error?.message ||
                        text
                    );

                console.error(
                    "Gemini request failed:",
                    {
                        model,
                        attempt: attempt + 1,
                        status: response.status,
                        code: errorCode,
                        errorStatus,
                        message: errorMessage
                    }
                );

                lastError = {
                    status: response.status,
                    code: errorCode,
                    errorStatus,
                    message: errorMessage
                };

                // Authentication errors are not retryable.
                if (
                    response.status === 401 ||
                    response.status === 403
                ) {
                    throw new Error(
                        `Gemini authentication failed (${response.status}). Check GEMINI_API_KEY.`
                    );
                }

                // Invalid request/model configuration should not be
                // retried repeatedly. A 404 will allow the fallback
                // model to be tried by the outer loop.
                if (response.status === 400) {
                    throw new Error(
                        `Gemini rejected the bill request: ${errorMessage || "Invalid request."}`
                    );
                }

                const retryable =
                    response.status === 429 ||
                    response.status === 500 ||
                    response.status === 502 ||
                    response.status === 503 ||
                    response.status === 504 ||
                    errorStatus === "UNAVAILABLE" ||
                    errorStatus === "RESOURCE_EXHAUSTED" ||
                    errorStatus === "DEADLINE_EXCEEDED";

                if (
                    !retryable ||
                    attempt >= AI_MAX_RETRIES
                ) {
                    break;
                }

                const delayMs =
                    Math.min(
                        10000,
                        2000 * Math.pow(2, attempt)
                    );

                console.warn(
                    `Gemini temporary failure (${response.status}). Retrying in ${delayMs}ms...`
                );

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            delayMs
                        )
                );
            } catch (error) {
                if (error?.name === "AbortError") {
                    lastError = {
                        timeout: true,
                        message:
                            "Gemini request timed out."
                    };

                    console.warn(
                        `Gemini timeout: model=${model}, attempt=${attempt + 1}/${AI_MAX_RETRIES + 1}`
                    );
                } else {
                    // A deliberate configuration/authentication error
                    // should move to the outer model loop rather than
                    // being hidden behind a generic message.
                    lastError = {
                        network: true,
                        message:
                            error?.message ||
                            "Gemini network request failed."
                    };

                    console.warn(
                        `Gemini request error: model=${model}, attempt=${attempt + 1}/${AI_MAX_RETRIES + 1}`,
                        error?.message
                    );

                    // Do not retry permanent configuration errors.
                    if (
                        error?.message?.includes("authentication failed") ||
                        error?.message?.includes("rejected the bill request")
                    ) {
                        break;
                    }
                }

                if (
                    attempt >= AI_MAX_RETRIES
                ) {
                    break;
                }

                const delayMs =
                    Math.min(
                        10000,
                        2000 * Math.pow(2, attempt)
                    );

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            delayMs
                        )
                );
            }
        }

        return {
            success: false,
            model,
            error: lastError
        };
    };

    // ======================================================
    // TRY PRIMARY MODEL THEN FALLBACK MODEL
    // ======================================================

    let successfulResponse = null;
    let lastModelError = null;

    for (
        let modelIndex = 0;
        modelIndex < models.length;
        modelIndex++
    ) {
        const model = models[modelIndex];

        console.log(
            `Starting Gemini bill analysis with model: ${model}`
        );

        const result =
            await requestModel(model);

        if (result.success) {
            successfulResponse = result;
            break;
        }

        lastModelError = result.error;

        if (
            modelIndex < models.length - 1
        ) {
            console.warn(
                `Gemini model ${model} unavailable. Switching to fallback model ${models[modelIndex + 1]}.`
            );
        }
    }

    if (!successfulResponse) {
        console.error(
            "All Gemini bill-analysis attempts failed:",
            {
                models,
                error: lastModelError
            }
        );

        if (
            lastModelError?.status === 429 ||
            lastModelError?.errorStatus ===
                "RESOURCE_EXHAUSTED"
        ) {
            throw new Error(
                "Gemini is temporarily rate-limited. Please try again shortly."
            );
        }

        if (
            lastModelError?.status === 503 ||
            lastModelError?.errorStatus ===
                "UNAVAILABLE"
        ) {
            throw new Error(
                "Gemini is temporarily unavailable. The AI service is experiencing high demand. Please try again shortly."
            );
        }

        if (lastModelError?.timeout) {
            throw new Error(
                "Gemini bill analysis timed out after multiple attempts. Please try again."
            );
        }

        if (lastModelError?.network) {
            throw new Error(
                `Unable to complete Gemini bill analysis after multiple attempts. ${clean(lastModelError?.message)}`
            );
        }

        throw new Error(
            `Gemini bill analysis failed after trying the configured models. ${clean(lastModelError?.message)}`
        );
    }

    // ======================================================
    // PARSE GEMINI RESPONSE
    // ======================================================

    let payload;

    try {
        payload = JSON.parse(
            successfulResponse.text
        );
    } catch {
        throw new Error(
            "Gemini returned an invalid API response."
        );
    }

    const output =
        payload?.candidates?.[0]
            ?.content?.parts
            ?.map(
                (part) => part.text || ""
            )
            .join("")
            .trim();

    if (!output) {
        throw new Error(
            "Gemini bill analysis returned no result."
        );
    }

    const parsed =
        parseJson(output, null);

    if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
    ) {
        throw new Error(
            "Gemini bill analysis returned invalid JSON."
        );
    }

    console.log(
        `Gemini bill analysis successful using model: ${successfulResponse.model}`
    );

    return parsed;
}

function calculateChecks(ai, duplicateCount, exactDuplicateCount = 0, duplicateRows = []) {
    const checks = [];

    const hasCoreFields =
        Boolean(ai.invoice_number) &&
        Boolean(ai.vendor_name) &&
        Boolean(ai.bill_date) &&
        ai.total_amount > 0;

    checks.push(
        makeCheck(
            "OCR extraction",
            hasCoreFields ? "PASS" : "REVIEW",
            hasCoreFields
                ? Math.max(0, 100 - ai.ocr_confidence)
                : 45,
            {
                invoice_number: ai.invoice_number,
                vendor_name: ai.vendor_name,
                bill_date: ai.bill_date,
                total_amount: ai.total_amount,
                confidence: ai.ocr_confidence
            }
        )
    );

    const duplicate = duplicateCount > 0;

    checks.push(
        makeCheck(
            "Duplicate check",
            duplicate ? "FAIL" : "PASS",
            duplicate ? 90 : 0,
            {
                matching_records: duplicateCount,
                exact_file_matches: exactDuplicateCount,
                matches: duplicateRows.map((row) => ({
                    id: row.id,
                    invoice_number: row.invoice_number,
                    vendor_name: row.vendor_name,
                    store_name: row.store_name,
                    created_at: row.created_at
                }))
            }
        )
    );

    const itemSum = ai.items.reduce(
        (sum, item) =>
            sum + num(item.line_total),
        0
    );

    const hasArithmeticData =
        ai.total_amount > 0 ||
        ai.subtotal > 0 ||
        ai.tax_amount > 0 ||
        ai.items.length > 0;

    const expectedTotal =
        num(ai.subtotal) +
        num(ai.tax_amount);

    const itemMismatch =
        ai.items.length > 0 &&
        ai.subtotal > 0 &&
        Math.abs(
            itemSum - ai.subtotal
        ) > Math.max(
            1,
            ai.subtotal * 0.02
        );

    const totalMismatch =
        ai.total_amount > 0 &&
        expectedTotal > 0 &&
        Math.abs(
            expectedTotal - ai.total_amount
        ) > Math.max(
            1,
            ai.total_amount * 0.02
        );

    const arithmeticStatus =
        !hasArithmeticData
            ? "REVIEW"
            : itemMismatch || totalMismatch
                ? "FAIL"
                : "PASS";

    checks.push(
        makeCheck(
            "Arithmetic check",
            arithmeticStatus,
            arithmeticStatus === "FAIL"
                ? 75
                : arithmeticStatus === "REVIEW"
                    ? 35
                    : 0,
            {
                item_sum: Number(
                    itemSum.toFixed(2)
                ),
                subtotal: ai.subtotal,
                tax_amount: ai.tax_amount,
                expected_total: Number(
                    expectedTotal.toFixed(2)
                ),
                total_amount: ai.total_amount,
                item_mismatch: itemMismatch,
                total_mismatch: totalMismatch
            }
        )
    );

    const gstinValid =
        !ai.vendor_gstin ||
        /^[0-9]{2}[A-Z0-9]{13}$/.test(
            ai.vendor_gstin.toUpperCase()
        );

    checks.push(
        makeCheck(
            "GST / tax check",
            gstinValid ? "PASS" : "FAIL",
            gstinValid ? 0 : 60,
            {
                gstin: ai.vendor_gstin || null
            }
        )
    );

    const manipulationCount =
        ai.manipulation_signals.length +
        ai.ai_generated_signals.length +
        ai.image_inconsistencies.length;

    const aiRisk =
        ai.document_authenticity === "AI_GENERATED" ||
        ai.ai_generated_probability >= 70;

    checks.push(
        makeCheck(
            "Image / AI analysis",
            manipulationCount === 0
                ? "PASS"
                : aiRisk
                    ? "FAIL"
                    : "REVIEW",
            Math.min(
                100,
                manipulationCount * 20 + (aiRisk ? 40 : 0)
            ),
            {
                manipulation_signals:
                    ai.manipulation_signals,
                ai_generated_signals:
                    ai.ai_generated_signals,
                image_inconsistencies:
                    ai.image_inconsistencies
            }
        )
    );

    return checks;
}

async function externalVerification(ai, expenseId) {
    const endpoint = clean(
        process.env.EXPENSE_VERIFICATION_URL
    );

    if (!endpoint) {
        return {
            status: "NOT_CONFIGURED",
            verified: false,
            provider: null,
            message:
                "External verification endpoint is not configured.",
            checked_at:
                new Date().toISOString()
        };
    }

    try {
        const response =
            await fetchWithTimeout(
                endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        ...(process.env.EXPENSE_VERIFICATION_TOKEN
                            ? {
                                Authorization:
                                    `Bearer ${process.env.EXPENSE_VERIFICATION_TOKEN}`
                            }
                            : {})
                    },
                    body: JSON.stringify({
                        expense_id: expenseId,
                        vendor_name: ai.vendor_name,
                        vendor_gstin: ai.vendor_gstin,
                        invoice_number: ai.invoice_number,
                        bill_date: ai.bill_date,
                        subtotal: ai.subtotal,
                        tax_amount: ai.tax_amount,
                        total_amount: ai.total_amount
                    })
                },
                VERIFICATION_TIMEOUT_MS
            );

        const text =
            await response.text();

        const body =
            parseJson(text, {
                raw: text
            });

        return {
            status:
                response.ok
                    ? "VERIFIED"
                    : "REVIEW",
            verified:
                response.ok &&
                body?.verified !== false,
            provider: endpoint,
            response: body,
            message:
                response.ok
                    ? "External verification completed."
                    : "External verification requires review.",
            checked_at:
                new Date().toISOString()
        };
    } catch (error) {
        return {
            status: "ERROR",
            verified: false,
            provider: endpoint,
            message:
                error.name === "AbortError"
                    ? "External verification timed out."
                    : error.message,
            checked_at:
                new Date().toISOString()
        };
    }
}

function calculateRisk(checks, ai, verification) {
    let score = 0;

    const weights = {
        "OCR extraction": 0.20,
        "Duplicate check": 0.30,
        "Arithmetic check": 0.20,
        "GST / tax check": 0.10,
        "Image / AI analysis": 0.20
    };

    for (const check of checks) {
        score +=
            Number(check.score || 0) *
            (weights[check.check_type] || 0.1);
    }

    const coreFieldsMissing =
        !ai.invoice_number ||
        !ai.vendor_name ||
        !ai.bill_date ||
        ai.total_amount <= 0;

    if (coreFieldsMissing) {
        score += 25;
    }

    const signalCount =
        ai.manipulation_signals.length +
        ai.ai_generated_signals.length +
        ai.image_inconsistencies.length;

    score += Math.min(
        45,
        signalCount * 15
    );

    if (
        ai.ocr_confidence > 0 &&
        ai.ocr_confidence < 70
    ) {
        score += 12;
    }

    if (
        verification.status === "REVIEW" ||
        verification.status === "ERROR"
    ) {
        score += 10;
    }

    if (
        verification.status === "NOT_CONFIGURED"
    ) {
        score += 5;
    }

    score = Math.max(
        0,
        Math.min(
            100,
            Math.round(score)
        )
    );

    let risk_level = "Low Risk";

    if (score >= 61) {
        risk_level = "High Risk";
    } else if (score >= 26) {
        risk_level = "Review Required";
    }

    return {
        score,
        risk_level
    };
}

async function submitExpense(req, res) {
    const file = req.file;
    let expenseCreated = false;

    try {
        if (!file) {
            return res.status(400).json({
                success: false,
                message:
                    "Upload a bill or invoice first."
            });
        }

        const expenseType = clean(req.body.expense_type);
        const storeId = Number(req.body.store_id);

        if (!expenseType) {
            return res.status(400).json({
                success: false,
                message: "Expense type is required."
            });
        }

        if (!Number.isInteger(storeId) || storeId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Store is required."
            });
        }

        const storeRows = await db.query(`
            SELECT id, store_name, store_code, status
            FROM stores
            WHERE id = ?
            LIMIT 1
        `, [storeId]);

        if (!Array.isArray(storeRows) || storeRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Selected store was not found."
            });
        }

        if (String(storeRows[0].status || "Active").toLowerCase() === "inactive") {
            return res.status(400).json({
                success: false,
                message: "Selected store is inactive."
            });
        }

        const fileBytes = fs.readFileSync(file.path);
        const fileHash = crypto.createHash("sha256").update(fileBytes).digest("hex");

        const exactDuplicateRows = await Expense.getDuplicateInfo({ fileHash });

        const aiRaw =
            await analyzeWithGemini(file);

        const ai =
            normalizeAiResult(aiRaw);

        // Duplicate detection uses both the exact file hash and invoice + vendor.
        // This catches an identical re-upload even when the filename changes.
        const duplicateRows = await Expense.getDuplicateInfo({
            fileHash,
            invoiceNumber: ai.invoice_number,
            vendorName: ai.vendor_name
        });

        const duplicateCount = duplicateRows.length;
        const exactDuplicateCount = exactDuplicateRows.length;

        if (
            ["AI_GENERATED", "SUSPICIOUS", "FAKE", "SYNTHETIC"].includes(ai.document_authenticity) &&
            ai.ai_generated_signals.length === 0
        ) {
            ai.ai_generated_signals.push(
                ai.document_authenticity === "AI_GENERATED"
                    ? "AI-generated or synthetic document characteristics detected."
                    : "Suspicious document authenticity characteristics detected."
            );
        }

        if (
            ai.ai_generated_probability >= 70 &&
            ai.ai_generated_signals.length === 0
        ) {
            ai.ai_generated_signals.push(
                "High AI-generation probability reported by image analysis."
            );
        }

        const checks =
            calculateChecks(
                ai,
                duplicateCount,
                exactDuplicateCount,
                duplicateRows
            );

        const verificationPreview = {
            status: "PENDING",
            verified: false,
            provider: null,
            message:
                "Verification is performed after the expense record is created."
        };

        const expenseId =
            await Expense.create({
                submitted_by:
                    req.user.id,

                store_id:
                    storeId,

                expense_type:
                    expenseType,

                invoice_number:
                    ai.invoice_number,

                vendor_name:
                    ai.vendor_name,

                vendor_gstin:
                    ai.vendor_gstin,

                bill_date:
                    ai.bill_date,

                subtotal:
                    ai.subtotal,

                tax_amount:
                    ai.tax_amount,

                total_amount:
                    ai.total_amount,

                currency:
                    ai.currency,

                status:
                    "Review Required",

                risk_level:
                    "Review Required",

                risk_score:
                    50,

                ocr_confidence:
                    ai.ocr_confidence,

                attachment_path:
                    `/uploads/${path.basename(file.path)}`,

                original_filename:
                    file.originalname,

                mime_type:
                    file.mimetype,

                file_hash:
                    fileHash,

                ai_analysis:
                    ai,

                verification:
                    verificationPreview
            });

        if (!expenseId) {
            throw new Error(
                "Expense could not be created."
            );
        }

        expenseCreated = true;

        await Expense.addItems(
            expenseId,
            ai.items
        );

        await Expense.addChecks(
            expenseId,
            checks
        );

        const verification =
            await externalVerification(
                ai,
                expenseId
            );

        const risk =
            calculateRisk(
                checks,
                ai,
                verification
            );

        const finalStatus =
            risk.risk_level === "Low Risk"
                ? "Pending"
                : "Review Required";

        await Expense.updateAnalysis(
            expenseId,
            {
                risk_level:
                    risk.risk_level,

                risk_score:
                    risk.score,

                status:
                    finalStatus,

                verification
            }
        );

        const expense =
            await Expense.getById(
                expenseId
            );

        return res.status(201).json({
            success: true,
            message:
                "Bill uploaded and analyzed successfully.",
            expense
        });
    } catch (error) {
        console.error(
            "Expense submit error:",
            error
        );

        if (
            file?.path &&
            fs.existsSync(file.path) &&
            !expenseCreated
        ) {
            try {
                fs.unlinkSync(file.path);
            } catch {}
        }

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to process expense."
        });
    }
}

async function getExpenses(req, res) {
    try {
        const access = await getExpenseAccess(req);

        if (!access.authenticated) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user is required."
            });
        }

        // IMPORTANT:
        // Administrator / Expenses = Full -> all expenses.
        // View / Add / Edit -> ONLY the logged-in user's expenses.
        //
        // Any userId supplied by the browser is ignored for
        // restricted users so it cannot be used to expose another
        // employee's expenses.
        const userId = access.canViewAll
            ? clean(req.query.userId)
            : access.userId;

        const rows =
            await Expense.getAll({
                status:
                    clean(req.query.status),

                type:
                    clean(req.query.type),

                userId,

                search:
                    clean(req.query.search)
            });

        return res.json({
            success: true,
            expenses: rows
        });
    } catch (error) {
        console.error(
            "Get expenses error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load expenses."
        });
    }
}

async function getExpenseById(req, res) {
    try {
        const access = await getExpenseAccess(req);

        if (!access.authenticated) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user is required."
            });
        }

        const expense =
            await Expense.getById(
                req.params.id
            );

        if (!expense) {
            return res.status(404).json({
                success: false,
                message:
                    "Expense not found."
            });
        }

        // Restricted users may only open their own expense.
        // Administrator / Expenses = Full may open any expense.
        if (
            !access.canViewAll &&
            Number(expense.submitted_by) !== Number(access.userId)
        ) {
            return res.status(403).json({
                success: false,
                message: "You do not have access to this expense."
            });
        }

        return res.json({
            success: true,
            expense
        });
    } catch (error) {
        console.error(
            "Get expense error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load expense."
        });
    }
}

async function reviewExpense(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid expense ID."
            });
        }

        const status = clean(req.body.status);
        const reason = clean(req.body.reason);

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be Approved or Rejected."
            });
        }

        if (status === "Rejected" && !reason) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required."
            });
        }

        // Read the expense before updating it so the notification contains
        // the original submitter, store and bill information.
        const expense = await Expense.getById(id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        await Expense.updateReview(
            id,
            req.user.id,
            status,
            reason || null
        );

        // Email failure must NOT roll back a successful finance decision.
        // The review is already stored; notification is best-effort.
        let notification = "not_sent";

        if (expense.submitted_by_email) {
            const employeeName = escapeHtml(expense.submitted_by_name || "Employee");
            const storeName = escapeHtml(expense.store_name || "Not selected");
            const amount = `₹${Number(expense.total_amount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
            const invoice = escapeHtml(expense.invoice_number || "Not detected");
            const billType = escapeHtml(expense.expense_type || "Expense");

            const aiAnalysis = expense.ai_analysis || {};
            const aiGenerated =
                aiAnalysis.document_authenticity === "AI_GENERATED" ||
                Number(aiAnalysis.ai_generated_probability || 0) >= 70 ||
                Array.isArray(aiAnalysis.ai_generated_signals) && aiAnalysis.ai_generated_signals.length > 0;
            const duplicateCheck = Array.isArray(expense.checks)
                ? expense.checks.find((check) => check.check_type === "Duplicate check")
                : null;
            const duplicateEvidence = duplicateCheck ? parseJson(duplicateCheck.details_json, {}) : null;
            const duplicateDetected = Number(duplicateEvidence?.matching_records || 0) > 0;

            const emailReason = status === "Rejected"
                ? (aiGenerated
                    ? "AI-generated or synthetic bill characteristics were detected during MI ARCUS image analysis."
                    : duplicateDetected
                        ? "A duplicate bill was detected during MI ARCUS verification."
                        : (reason || "The bill did not pass the required verification/review."))
                : "";

            const subject = status === "Approved"
                ? `MI ARCUS Expense Approved - Invoice ${invoice}`
                : `MI ARCUS Expense Rejected - Invoice ${invoice}`;

            const html = status === "Approved"
                ? `
                    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#17324d;line-height:1.6">
                        <h2 style="color:#168a58">Expense Approved</h2>
                        <p>Hi <strong>${employeeName}</strong>,</p>
                        <p>Your expense bill has been <strong style="color:#168a58">approved</strong> by the administrator/finance reviewer.</p>
                        <div style="background:#f5f8fb;border:1px solid #dbe5ed;border-radius:10px;padding:16px;margin:18px 0">
                            <p><strong>Expense Type:</strong> ${billType}</p>
                            <p><strong>Store:</strong> ${storeName}</p>
                            <p><strong>Invoice:</strong> ${invoice}</p>
                            <p><strong>Vendor:</strong> ${escapeHtml(expense.vendor_name || "Not detected")}</p>
                            <p><strong>Amount:</strong> ${amount}</p>
                        </div>
                        <p>You can open MI ARCUS to view the complete verification report.</p>
                        <p>If you have any questions, please contact your administrator.</p>
                        <p>Regards,<br><strong>MI ARCUS Team</strong></p>
                    </div>
                `
                : `
                    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#17324d;line-height:1.6">
                        <h2 style="color:#c93636">Expense Rejected</h2>
                        <p>Hi <strong>${employeeName}</strong>,</p>
                        <p>Your expense bill has been <strong style="color:#c93636">rejected</strong> by the administrator/finance reviewer.</p>
                        <div style="background:#fff5f5;border:1px solid #f0caca;border-radius:10px;padding:16px;margin:18px 0">
                            <p><strong>Expense Type:</strong> ${billType}</p>
                            <p><strong>Store:</strong> ${storeName}</p>
                            <p><strong>Invoice:</strong> ${invoice}</p>
                            <p><strong>Vendor:</strong> ${escapeHtml(expense.vendor_name || "Not detected")}</p>
                            <p><strong>Amount:</strong> ${amount}</p>
                            <p><strong>Reason:</strong> ${escapeHtml(emailReason)}</p>
                        </div>
                        <p>If this bill was rejected because of an AI-generated, duplicate, manipulated or otherwise invalid document, please do not resubmit the same document. Contact your administrator for further assistance.</p>
                        <p>Regards,<br><strong>MI ARCUS Team</strong></p>
                    </div>
                `;

            const text = status === "Approved"
                ? `Hi ${employeeName},\n\nYour MI ARCUS expense bill has been approved.\nStore: ${storeName}\nInvoice: ${invoice}\nAmount: ${amount}\n\nPlease contact your administrator if you have questions.\n\nMI ARCUS Team`
                : `Hi ${employeeName},\n\nYour MI ARCUS expense bill has been rejected by the administrator.\nStore: ${storeName}\nInvoice: ${invoice}\nAmount: ${amount}\nReason: ${emailReason}\n\nIf you believe this decision is incorrect, contact your administrator for further assistance.\n\nMI ARCUS Team`;

            try {
                await sendGenericEmail({
                    to: expense.submitted_by_email,
                    subject,
                    html,
                    text
                });
                notification = "sent";
            } catch (mailError) {
                console.error("Expense review email failed:", mailError.message);
                notification = "failed";
            }
        }

        return res.json({
            success: true,
            message: `Expense ${status.toLowerCase()} successfully.`,
            notification
        });
    } catch (error) {
        console.error("Review expense error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update expense."
        });
    }
}

async function deleteExpense(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid expense ID." });
        }

        const result = await Expense.deleteById(id);

        if (!result.deleted) {
            return res.status(404).json({ success: false, message: "Expense not found." });
        }

        if (result.attachment_path) {
            const filename = path.basename(result.attachment_path);
            const filePath = path.join(process.cwd(), "uploads", filename);
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (fileError) {
                console.warn("Expense attachment cleanup failed:", fileError.message);
            }
        }

        return res.json({ success: true, message: "Expense deleted successfully." });
    } catch (error) {
        console.error("Delete expense error:", error);
        return res.status(500).json({ success: false, message: "Unable to delete expense." });
    }
}

async function deleteAllExpenses(req, res) {
    try {
        const result = await Expense.deleteAll();
        const uploadFolder = path.join(process.cwd(), "uploads");

        for (const attachment of result.attachments) {
            const filename = path.basename(attachment);
            const filePath = path.join(uploadFolder, filename);
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (fileError) {
                console.warn("Expense attachment cleanup failed:", fileError.message);
            }
        }

        return res.json({
            success: true,
            deleted: result.count,
            message: `${result.count} expense record(s) deleted successfully.`
        });
    } catch (error) {
        console.error("Delete all expenses error:", error);
        return res.status(500).json({ success: false, message: "Unable to delete all expenses." });
    }
}

async function getExpenseTypes(req, res) {
    try {
        return res.json({
            success: true,
            types:
                await Expense.getTypes()
        });
    } catch (error) {
        console.error(
            "Get expense types error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load expense types."
        });
    }
}

module.exports = {
    submitExpense,
    getExpenses,
    getExpenseById,
    reviewExpense,
    getExpenseTypes,
    deleteExpense,
    deleteAllExpenses
};
