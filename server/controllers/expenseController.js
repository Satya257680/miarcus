
const fs = require("fs");
const path = require("path");
const Expense = require("../models/expenseModel");

const MAX_AI_BYTES = 18 * 1024 * 1024;

function clean(value) {
    return value === undefined || value === null
        ? ""
        : String(value).trim();
}

function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function parseJson(value, fallback = null) {
    if (typeof value !== "string") return value;

    const text = value.trim();

    try {
        return JSON.parse(text);
    } catch {}

    const cleaned = text
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {}

    const start = Math.min(
        ...[cleaned.indexOf("{"), cleaned.indexOf("[")].filter(index => index >= 0)
    );

    if (Number.isFinite(start)) {
        const endObject = cleaned.lastIndexOf("}");
        const endArray = cleaned.lastIndexOf("]");
        const end = Math.max(endObject, endArray);

        if (end > start) {
            try {
                return JSON.parse(cleaned.slice(start, end + 1));
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

function normalizeItems(items) {
    if (!Array.isArray(items)) return [];

    return items.map(item => {
        const quantity = num(item.quantity, 1);
        const unitPrice = num(item.unit_price ?? item.unitPrice, 0);
        const lineTotal = num(
            item.line_total ?? item.lineTotal,
            quantity * unitPrice
        );

        return {
            description: clean(item.description ?? item.item_description),
            quantity: quantity > 0 ? quantity : 1,
            unit_price: unitPrice,
            tax_rate: num(item.tax_rate ?? item.taxRate, 0),
            tax_amount: num(item.tax_amount ?? item.taxAmount, 0),
            line_total: lineTotal
        };
    }).filter(item => item.description || item.line_total > 0);
}

function normalizeAiResult(raw) {
    const data = raw || {};

    return {
        vendor_name: clean(data.vendor_name || data.vendor || data.supplier_name),
        vendor_gstin: clean(data.vendor_gstin || data.gstin || data.gst_number),
        invoice_number: clean(data.invoice_number || data.invoice_no || data.bill_number),
        bill_date: normalizeDate(data.bill_date || data.invoice_date || data.date),
        currency: clean(data.currency || "INR").toUpperCase(),
        subtotal: num(data.subtotal ?? data.sub_total),
        tax_amount: num(data.tax_amount ?? data.tax ?? data.gst_amount),
        total_amount: num(data.total_amount ?? data.total ?? data.grand_total),
        ocr_confidence: Math.max(0, Math.min(100, num(data.ocr_confidence ?? data.confidence, 0))),
        items: normalizeItems(data.items),
        manipulation_signals: Array.isArray(data.manipulation_signals) ? data.manipulation_signals : [],
        ai_generated_signals: Array.isArray(data.ai_generated_signals) ? data.ai_generated_signals : [],
        image_inconsistencies: Array.isArray(data.image_inconsistencies) ? data.image_inconsistencies : [],
        notes: clean(data.notes),
        raw_text: clean(data.raw_text)
    };
}

function makeCheck(type, status, score, details) {
    return {
        check_type: type,
        check_status: status,
        score: Math.max(0, Math.min(100, score)),
        details
    };
}

async function analyzeWithGemini(file) {
    const apiKey = clean(
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GEMINI_API_KEY
    );

    if (!apiKey) {
        throw new Error("Gemini API key is not configured. Add GEMINI_API_KEY to server/.env.");
    }

    if (!file || !fs.existsSync(file.path)) {
        throw new Error("Uploaded bill file could not be read.");
    }

    const stat = fs.statSync(file.path);
    if (stat.size > MAX_AI_BYTES) {
        throw new Error("Bill file is too large for AI analysis. Please upload a file up to 18 MB.");
    }

    const bytes = fs.readFileSync(file.path);
    const base64 = bytes.toString("base64");

    const model = clean(process.env.GEMINI_MODEL || "gemini-2.5-flash");

    const prompt = `
You are the MI ARCUS expense verification engine.

Analyze the uploaded bill/invoice image or PDF carefully.

Return ONLY valid JSON. No markdown.

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
- items: description, quantity, unit_price, tax_rate, tax_amount, line_total
- manipulation_signals: suspicious editing/compositing/copy-paste/metadata/visual artifacts
- ai_generated_signals: signs the document may be AI-generated or synthetically produced
- image_inconsistencies: mismatched fonts, alignment, shadows, compression, logo, numbers, dates or other visual inconsistencies
- notes
- raw_text

Important:
1. Never invent a value. Use empty string or 0 when not readable.
2. Keep invoice_number exactly as printed when possible.
3. Dates must be represented as YYYY-MM-DD when confidently known.
4. Calculate item line totals only when quantity and unit price are visible.
5. Do not decide approval. Only provide evidence/signals.
`;

    const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: file.mimetype || "application/octet-stream",
                            data: base64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json"
            }
        })
    });

    const text = await response.text();

    if (!response.ok) {
        console.error("Gemini expense analysis error:", response.status, text);
        throw new Error("AI bill analysis failed.");
    }

    let payload;
    try {
        payload = JSON.parse(text);
    } catch {
        throw new Error("AI bill analysis returned an invalid response.");
    }

    const output =
        payload?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

    if (!output) {
        throw new Error("AI bill analysis returned no result.");
    }

    return parseJson(output, null);
}

function calculateChecks(ai, duplicateCount) {
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
            hasCoreFields ? 5 : 45,
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
            { matching_records: duplicateCount }
        )
    );

    const itemSum = ai.items.reduce(
        (sum, item) => sum + num(item.line_total),
        0
    );

    const expectedTotal = num(ai.subtotal) + num(ai.tax_amount);
    const itemMismatch =
        ai.items.length > 0 &&
        ai.subtotal > 0 &&
        Math.abs(itemSum - ai.subtotal) > Math.max(1, ai.subtotal * 0.02);

    const totalMismatch =
        ai.total_amount > 0 &&
        expectedTotal > 0 &&
        Math.abs(expectedTotal - ai.total_amount) > Math.max(1, ai.total_amount * 0.02);

    checks.push(
        makeCheck(
            "Arithmetic check",
            itemMismatch || totalMismatch ? "FAIL" : "PASS",
            itemMismatch || totalMismatch ? 75 : 0,
            {
                item_sum: Number(itemSum.toFixed(2)),
                subtotal: ai.subtotal,
                tax_amount: ai.tax_amount,
                expected_total: Number(expectedTotal.toFixed(2)),
                total_amount: ai.total_amount,
                item_mismatch: itemMismatch,
                total_mismatch: totalMismatch
            }
        )
    );

    const gstinValid =
        !ai.vendor_gstin ||
        /^[0-9]{2}[A-Z0-9]{13}$/.test(ai.vendor_gstin.toUpperCase());

    checks.push(
        makeCheck(
            "GST / tax check",
            gstinValid ? "PASS" : "REVIEW",
            gstinValid ? 0 : 45,
            { gstin: ai.vendor_gstin || null }
        )
    );

    const manipulationCount =
        ai.manipulation_signals.length +
        ai.ai_generated_signals.length +
        ai.image_inconsistencies.length;

    checks.push(
        makeCheck(
            "Image / AI analysis",
            manipulationCount === 0 ? "PASS" : "REVIEW",
            Math.min(100, manipulationCount * 20),
            {
                manipulation_signals: ai.manipulation_signals,
                ai_generated_signals: ai.ai_generated_signals,
                image_inconsistencies: ai.image_inconsistencies
            }
        )
    );

    return checks;
}

async function externalVerification(ai, expenseId) {
    const endpoint = clean(process.env.EXPENSE_VERIFICATION_URL);

    if (!endpoint) {
        return {
            status: "NOT_CONFIGURED",
            verified: false,
            provider: null,
            message: "External verification endpoint is not configured.",
            checked_at: new Date().toISOString()
        };
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(process.env.EXPENSE_VERIFICATION_TOKEN
                    ? { Authorization: `Bearer ${process.env.EXPENSE_VERIFICATION_TOKEN}` }
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
        });

        const text = await response.text();
        let body = parseJson(text, { raw: text });

        return {
            status: response.ok ? "VERIFIED" : "REVIEW",
            verified: response.ok && body?.verified !== false,
            provider: endpoint,
            response: body,
            checked_at: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: "ERROR",
            verified: false,
            provider: endpoint,
            message: error.message,
            checked_at: new Date().toISOString()
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
        score += Number(check.score || 0) * (weights[check.check_type] || 0.1);
    }

    const coreFieldsMissing =
        !ai.invoice_number ||
        !ai.vendor_name ||
        !ai.bill_date ||
        ai.total_amount <= 0;

    if (coreFieldsMissing) score += 25;

    const signalCount =
        ai.manipulation_signals.length +
        ai.ai_generated_signals.length +
        ai.image_inconsistencies.length;

    score += Math.min(45, signalCount * 15);

    if (ai.ocr_confidence > 0 && ai.ocr_confidence < 70) {
        score += 12;
    }

    if (verification.status === "REVIEW" || verification.status === "ERROR") {
        score += 10;
    }

    if (verification.status === "NOT_CONFIGURED") {
        score += 5;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    let risk_level = "Low Risk";
    if (score > 60) risk_level = "High Risk";
    else if (score > 25) risk_level = "Review Required";

    return { score, risk_level };
}

async function submitExpense(req, res) {
    let file = req.file;
    let expenseCreated = false;

    try {
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "Upload a bill or invoice first."
            });
        }

        const aiRaw = await analyzeWithGemini(file);
        const ai = normalizeAiResult(aiRaw);

        const duplicateRows = await require("../config/db").query(`
            SELECT COUNT(*) AS count
            FROM expenses
            WHERE invoice_number IS NOT NULL
              AND invoice_number <> ''
              AND invoice_number = ?
              AND (
                    vendor_name = ?
                    OR vendor_name IS NULL
                    OR ? = ''
              )
              AND status <> 'Rejected'
        `, [ai.invoice_number, ai.vendor_name, ai.vendor_name]);

        const duplicateCount = Number(
            duplicateRows?.[0]?.count || 0
        );

        const checks = calculateChecks(ai, duplicateCount);

        const verificationPreview = {
            status: "PENDING",
            verified: false,
            message: "Verification is performed after the expense record is created."
        };

        const expenseId = await Expense.create({
            submitted_by: req.user.id,
            expense_type: clean(req.body.expense_type || "Other"),
            invoice_number: ai.invoice_number,
            vendor_name: ai.vendor_name,
            vendor_gstin: ai.vendor_gstin,
            bill_date: ai.bill_date,
            subtotal: ai.subtotal,
            tax_amount: ai.tax_amount,
            total_amount: ai.total_amount,
            currency: ai.currency,
            status: "Review Required",
            risk_level: "Review Required",
            risk_score: 50,
            ocr_confidence: ai.ocr_confidence,
            attachment_path: `/uploads/${path.basename(file.path)}`,
            original_filename: file.originalname,
            mime_type: file.mimetype,
            ai_analysis: ai,
            verification: verificationPreview
        });

        // Prevent catch() from deleting the uploaded bill after
        // the database record has already been created.
        expenseCreated = true;

        await Expense.addItems(expenseId, ai.items);
        await Expense.addChecks(expenseId, checks);

        const verification = await externalVerification(ai, expenseId);
        const risk = calculateRisk(checks, ai, verification);

        const db = require("../config/db");
        await db.query(`
            UPDATE expenses
            SET
                risk_level = ?,
                risk_score = ?,
                status = ?,
                verification_json = ?
            WHERE id = ?
        `, [
            risk.risk_level,
            risk.score,
            risk.risk_level === "Low Risk" ? "Pending" : "Review Required",
            JSON.stringify(verification),
            expenseId
        ]);

        const expense = await Expense.getById(expenseId);

        return res.status(201).json({
            success: true,
            message: "Bill uploaded and analyzed successfully.",
            expense
        });
    } catch (error) {
        console.error("Expense submit error:", error);

        if (file?.path && fs.existsSync(file.path)) {
            // Keep the attachment if an expense was created; otherwise remove it.
            // The controller does not know the insert result after a failed operation,
            // so failed AI analysis is safe to clean up.
            if (!expenseCreated) {
                try { fs.unlinkSync(file.path); } catch {}
            }
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Unable to process expense."
        });
    }
}

async function getExpenses(req, res) {
    try {
        const rows = await Expense.getAll({
            status: clean(req.query.status),
            type: clean(req.query.type),
            userId: clean(req.query.userId),
            search: clean(req.query.search)
        });

        return res.json({ success: true, expenses: rows });
    } catch (error) {
        console.error("Get expenses error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load expenses."
        });
    }
}

async function getExpenseById(req, res) {
    try {
        const expense = await Expense.getById(req.params.id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found."
            });
        }

        return res.json({ success: true, expense });
    } catch (error) {
        console.error("Get expense error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load expense."
        });
    }
}

async function reviewExpense(req, res) {
    try {
        const id = Number(req.params.id);
        const status = clean(req.body.status);

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be Approved or Rejected."
            });
        }

        if (status === "Rejected" && !clean(req.body.reason)) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required."
            });
        }

        await Expense.updateReview(
            id,
            req.user.id,
            status,
            clean(req.body.reason) || null
        );

        return res.json({
            success: true,
            message: `Expense ${status.toLowerCase()} successfully.`
        });
    } catch (error) {
        console.error("Review expense error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update expense."
        });
    }
}

async function getExpenseTypes(req, res) {
    try {
        return res.json({
            success: true,
            types: await Expense.getTypes()
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to load expense types."
        });
    }
}

module.exports = {
    submitExpense,
    getExpenses,
    getExpenseById,
    reviewExpense,
    getExpenseTypes
};
