const PettyCash = require("../models/pettyCashModel");
const Audit = require("../models/auditModel");

function actorId(req) {
    return Number(req.user?.id || req.user?.user_id || 0);
}

function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function clean(value) {
    return value === undefined || value === null ? "" : String(value).trim();
}

exports.options = async (req, res) => {
    try {
        const data = await PettyCash.getOptions();
        res.json({ success: true, data });
    } catch (error) {
        console.error("Petty Cash options error:", error);
        res.status(500).json({ success: false, message: "Unable to load petty cash options." });
    }
};

exports.summary = async (req, res) => {
    try {
        const data = await PettyCash.getSummary();
        res.json({ success: true, data });
    } catch (error) {
        console.error("Petty Cash summary error:", error);
        res.status(500).json({ success: false, message: "Unable to load petty cash summary." });
    }
};

exports.getAll = async (req, res) => {
    try {
        const data = await PettyCash.getAll(req.query || {});
        res.json({ success: true, data });
    } catch (error) {
        console.error("Petty Cash list error:", error);
        res.status(500).json({ success: false, message: "Unable to load petty cash advances." });
    }
};

exports.getById = async (req, res) => {
    try {
        const data = await PettyCash.getById(req.params.id);
        if (!data) {
            return res.status(404).json({ success: false, message: "Petty cash advance not found." });
        }
        res.json({ success: true, data });
    } catch (error) {
        console.error("Petty Cash detail error:", error);
        res.status(500).json({ success: false, message: "Unable to load petty cash advance." });
    }
};

exports.create = async (req, res) => {
    const userId = actorId(req);

    try {
        const {
            advance_no,
            store_id,
            paid_by,
            received_by,
            advance_amount,
            purpose,
            advance_date
        } = req.body;

        if (!clean(advance_no) || !store_id || !paid_by || !received_by) {
            return res.status(400).json({
                success: false,
                message: "Advance number, store, paid by and received by are required."
            });
        }

        if (number(advance_amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Advance amount must be greater than zero."
            });
        }

        const result = await PettyCash.createAdvance({
            advance_no: clean(advance_no),
            store_id: Number(store_id),
            paid_by: Number(paid_by),
            received_by: Number(received_by),
            advance_amount: number(advance_amount),
            purpose: clean(purpose),
            advance_date: clean(advance_date) || new Date().toISOString().slice(0, 10)
        });

        Audit.create({
            module_name: "Petty Cash",
            reference_id: result.id,
            action: "CREATE_ADVANCE",
            new_data: req.body,
            changed_by: userId
        }, (auditError) => {
            if (auditError) console.error("Petty Cash audit error:", auditError);
        });

        res.status(201).json({
            success: true,
            message: "Petty cash advance created successfully.",
            data: result
        });
    } catch (error) {
        console.error("Petty Cash create error:", error);
        const duplicate = error?.code === "ER_DUP_ENTRY";
        res.status(duplicate ? 409 : 500).json({
            success: false,
            message: duplicate
                ? "Advance number already exists."
                : "Unable to create petty cash advance.",
            error: process.env.NODE_ENV === "production" ? undefined : error.message
        });
    }
};

exports.addExpense = async (req, res) => {
    const userId = actorId(req);

    try {
        const {
            expense_type,
            description,
            amount,
            expense_date
        } = req.body;

        if (!clean(expense_type) || number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Expense type and a valid amount are required."
            });
        }

        const advance = await PettyCash.getById(req.params.id);
        if (!advance) {
            return res.status(404).json({ success: false, message: "Petty cash advance not found." });
        }
        if (advance.status === "SETTLED" || advance.status === "CANCELLED") {
            return res.status(400).json({ success: false, message: "This advance can no longer be changed." });
        }

        const file = req.file;
        const result = await PettyCash.addExpense(req.params.id, {
            expense_type: clean(expense_type),
            description: clean(description),
            amount: number(amount),
            expense_date: clean(expense_date) || new Date().toISOString().slice(0, 10),
            entered_by: userId,
            bill_filename: file?.originalname || null,
            bill_path: file ? `/uploads/${file.filename}` : null
        });

        Audit.create({
            module_name: "Petty Cash",
            reference_id: req.params.id,
            action: "ADD_EXPENSE",
            new_data: { ...req.body, file: file?.originalname || null },
            changed_by: userId
        }, (auditError) => {
            if (auditError) console.error("Petty Cash audit error:", auditError);
        });

        res.status(201).json({ success: true, message: "Expense added successfully.", data: result });
    } catch (error) {
        console.error("Petty Cash expense error:", error);
        res.status(500).json({ success: false, message: "Unable to add petty cash expense." });
    }
};

exports.addDeposit = async (req, res) => {
    const userId = actorId(req);

    try {
        const {
            amount,
            deposited_by,
            received_by,
            deposit_date,
            reference_no
        } = req.body;

        if (number(amount) <= 0 || !deposited_by || !received_by) {
            return res.status(400).json({
                success: false,
                message: "Deposit amount, deposited by and received by are required."
            });
        }

        const advance = await PettyCash.getById(req.params.id);
        if (!advance) {
            return res.status(404).json({ success: false, message: "Petty cash advance not found." });
        }
        if (advance.status === "SETTLED" || advance.status === "CANCELLED") {
            return res.status(400).json({ success: false, message: "This advance can no longer be changed." });
        }

        const file = req.file;
        const result = await PettyCash.addDeposit(req.params.id, {
            amount: number(amount),
            deposited_by: Number(deposited_by),
            received_by: Number(received_by),
            deposit_date: clean(deposit_date) || new Date().toISOString().slice(0, 10),
            reference_no: clean(reference_no),
            receipt_filename: file?.originalname || null,
            receipt_path: file ? `/uploads/${file.filename}` : null
        });

        Audit.create({
            module_name: "Petty Cash",
            reference_id: req.params.id,
            action: "ADD_DEPOSIT",
            new_data: { ...req.body, file: file?.originalname || null },
            changed_by: userId
        }, (auditError) => {
            if (auditError) console.error("Petty Cash audit error:", auditError);
        });

        res.status(201).json({ success: true, message: "Cash deposit recorded successfully.", data: result });
    } catch (error) {
        console.error("Petty Cash deposit error:", error);
        res.status(500).json({ success: false, message: "Unable to record cash deposit." });
    }
};

exports.settle = async (req, res) => {
    const userId = actorId(req);

    try {
        const before = await PettyCash.getById(req.params.id);
        if (!before) {
            return res.status(404).json({ success: false, message: "Petty cash advance not found." });
        }

        const result = await PettyCash.settle(req.params.id, userId);

        Audit.create({
            module_name: "Petty Cash",
            reference_id: req.params.id,
            action: "SETTLE",
            old_data: before,
            new_data: result,
            changed_by: userId
        }, (auditError) => {
            if (auditError) console.error("Petty Cash audit error:", auditError);
        });

        res.json({
            success: true,
            message: "Petty cash advance settled successfully.",
            data: result
        });
    } catch (error) {
        console.error("Petty Cash settle error:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Unable to settle petty cash advance."
        });
    }
};

exports.cancel = async (req, res) => {
    const userId = actorId(req);

    try {
        const before = await PettyCash.getById(req.params.id);
        if (!before) {
            return res.status(404).json({ success: false, message: "Petty cash advance not found." });
        }

        if (before.status === "SETTLED") {
            return res.status(400).json({ success: false, message: "A settled advance cannot be cancelled." });
        }

        await PettyCash.cancel(req.params.id, userId);

        Audit.create({
            module_name: "Petty Cash",
            reference_id: req.params.id,
            action: "CANCEL",
            old_data: before,
            new_data: { status: "CANCELLED" },
            changed_by: userId
        }, (auditError) => {
            if (auditError) console.error("Petty Cash audit error:", auditError);
        });

        res.json({ success: true, message: "Petty cash advance cancelled." });
    } catch (error) {
        console.error("Petty Cash cancel error:", error);
        res.status(500).json({ success: false, message: "Unable to cancel petty cash advance." });
    }
};

exports.audit = (req, res) => {
    Audit.getByReference("Petty Cash", req.params.id, (err, data) => {
        if (err) {
            console.error("Petty Cash audit error:", err);
            return res.status(500).json({ success: false, message: "Unable to load audit history." });
        }
        res.json({ success: true, data });
    });
};
