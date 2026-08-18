import { useEffect, useMemo, useState } from "react";
import axios from "./expenseApi";

import {
    FaCheck,
    FaTimes,
    FaEye,
    FaShieldAlt,
    FaSearch,
    FaExclamationTriangle
} from "react-icons/fa";

import ExpenseDetails from "./ExpensesDetails";
import "../../styles/pages/Expenses.css";

// ======================================================
// HELPERS
// ======================================================

function riskClass(value) {
    return String(value || "Review Required")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function getExpenseDate(item) {
    const value =
        item?.created_at ||
        item?.bill_date ||
        item?.submitted_at ||
        item?.updated_at;

    const time = value
        ? new Date(value).getTime()
        : 0;

    return Number.isNaN(time) ? 0 : time;
}

function normalizeExpense(item) {
    if (!item || !item.id) {
        return null;
    }

    return {
        ...item,
        id: item.id,
        status: item.status || "Review Required"
    };
}

// ======================================================
// COMPONENT
// ======================================================

function ApproveExpenses() {
    const [expenses, setExpenses] = useState([]);

    const [selected, setSelected] = useState([]);

    const [search, setSearch] = useState("");

    const [detailsId, setDetailsId] = useState(null);

    const [loading, setLoading] = useState(true);

    const [busy, setBusy] = useState(false);

    const [error, setError] = useState("");

    // ==================================================
    // LOAD REVIEW QUEUE
    //
    // IMPORTANT:
    // Do NOT use /api/expenses/review-queue.
    //
    // The existing backend already supports:
    // GET /api/expenses?status=Pending
    // GET /api/expenses?status=Review Required
    //
    // We combine both results here.
    // ==================================================

    const load = async () => {
        try {
            setLoading(true);
            setError("");

            // Load both statuses independently.
            const [pendingResponse, reviewResponse] =
                await Promise.all([
                    axios.get("/api/expenses", {
                        params: {
                            status: "Pending"
                        }
                    }),

                    axios.get("/api/expenses", {
                        params: {
                            status: "Review Required"
                        }
                    })
                ]);

            const pendingExpenses =
                Array.isArray(
                    pendingResponse?.data?.expenses
                )
                    ? pendingResponse.data.expenses
                    : [];

            const reviewExpenses =
                Array.isArray(
                    reviewResponse?.data?.expenses
                )
                    ? reviewResponse.data.expenses
                    : [];

            // Combine both queues.
            const combined = [
                ...pendingExpenses,
                ...reviewExpenses
            ];

            // Remove duplicate IDs.
            const uniqueMap = new Map();

            combined.forEach((item) => {
                const normalized =
                    normalizeExpense(item);

                if (!normalized) {
                    return;
                }

                uniqueMap.set(
                    String(normalized.id),
                    normalized
                );
            });

            // Final review queue.
            const rows = Array.from(
                uniqueMap.values()
            )
                .filter((item) =>
                    [
                        "Pending",
                        "Review Required"
                    ].includes(item.status)
                )
                .sort(
                    (a, b) =>
                        getExpenseDate(b) -
                        getExpenseDate(a)
                );

            setExpenses(rows);

            // Remove selections that no longer exist.
            setSelected((current) =>
                current.filter((id) =>
                    rows.some(
                        (item) =>
                            String(item.id) ===
                            String(id)
                    )
                )
            );

            // If the currently opened detail no longer
            // exists in the queue, close it.
            if (
                detailsId !== null &&
                !rows.some(
                    (item) =>
                        String(item.id) ===
                        String(detailsId)
                )
            ) {
                setDetailsId(null);
            }
        } catch (err) {
            console.error(
                "Approve expenses load error:",
                err
            );

            setExpenses([]);

            setSelected([]);

            setError(
                err?.response?.data?.message ||
                "Unable to load review queue."
            );
        } finally {
            setLoading(false);
        }
    };

    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {
        load();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==================================================
    // SEARCH
    // ==================================================

    const filtered = useMemo(() => {
        const q = search
            .trim()
            .toLowerCase();

        if (!q) {
            return expenses;
        }

        return expenses.filter((item) => {
            const values = [
                item.submitted_by_name,
                item.submitted_by_employee_id,
                item.invoice_number,
                item.vendor_name,
                item.expense_type,
                item.store_name,
                item.store_code,
                item.store_location,
                item.status
            ];

            return values.some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(q)
            );
        });
    }, [expenses, search]);

    // ==================================================
    // TOGGLE ONE
    // ==================================================

    const toggle = (id) => {
        setSelected((current) => {
            const exists = current.some(
                (item) =>
                    String(item) === String(id)
            );

            if (exists) {
                return current.filter(
                    (item) =>
                        String(item) !==
                        String(id)
                );
            }

            return [
                ...current,
                id
            ];
        });
    };

    // ==================================================
    // TOGGLE ALL
    // ==================================================

    const toggleAll = () => {
        const ids = filtered
            .map((item) => item.id)
            .filter(Boolean);

        if (!ids.length) {
            return;
        }

        const allSelected = ids.every((id) =>
            selected.some(
                (selectedId) =>
                    String(selectedId) ===
                    String(id)
            )
        );

        if (allSelected) {
            setSelected((current) =>
                current.filter(
                    (selectedId) =>
                        !ids.some(
                            (id) =>
                                String(id) ===
                                String(selectedId)
                        )
                )
            );

            return;
        }

        setSelected((current) => [
            ...new Set([
                ...current,
                ...ids
            ])
        ]);
    };

    // ==================================================
    // SELECTED IDS VISIBLE IN CURRENT FILTER
    // ==================================================

    const selectedVisibleCount = useMemo(() => {
        return filtered.filter((item) =>
            selected.some(
                (id) =>
                    String(id) ===
                    String(item.id)
            )
        ).length;
    }, [filtered, selected]);

    // ==================================================
    // APPROVE / REJECT SELECTED
    // ==================================================

    const reviewSelected = async (status) => {
        if (
            !selected.length ||
            busy
        ) {
            return;
        }

        let reason = "";

        // ------------------------------------------------
        // REJECTION REASON
        // ------------------------------------------------

        if (status === "Rejected") {
            reason =
                window.prompt(
                    "Enter rejection reason:"
                ) || "";

            if (!reason.trim()) {
                return;
            }
        }

        // ------------------------------------------------
        // CONFIRM APPROVAL
        // ------------------------------------------------

        if (status === "Approved") {
            const confirmed =
                window.confirm(
                    `Approve ${selected.length} selected expense${selected.length === 1 ? "" : "s"}?`
                );

            if (!confirmed) {
                return;
            }
        }

        try {
            setBusy(true);

            setError("");

            // ------------------------------------------------
            // UPDATE EACH EXPENSE
            // ------------------------------------------------

            const results =
                await Promise.allSettled(
                    selected.map((id) =>
                        axios.patch(
                            `/api/expenses/${id}/review`,
                            {
                                status,
                                reason:
                                    reason.trim() ||
                                    null
                            }
                        )
                    )
                );

            const failed =
                results.filter(
                    (result) =>
                        result.status ===
                        "rejected"
                );

            const successful =
                results.filter(
                    (result) =>
                        result.status ===
                        "fulfilled"
                );

            // ------------------------------------------------
            // COMPLETE SUCCESS
            // ------------------------------------------------

            if (
                failed.length === 0
            ) {
                setSelected([]);

                await load();

                return;
            }

            // ------------------------------------------------
            // PARTIAL SUCCESS
            // ------------------------------------------------

            if (
                successful.length > 0
            ) {
                setError(
                    `${successful.length} expense${successful.length === 1 ? "" : "s"} updated successfully, but ${failed.length} could not be updated.`
                );
            } else {
                const firstError =
                    failed[0]?.reason;

                setError(
                    firstError?.response
                        ?.data
                        ?.message ||
                    `Unable to ${status.toLowerCase()} the selected expenses.`
                );
            }

            // Reload the actual database state.
            await load();
        } catch (err) {
            console.error(
                "Expense review error:",
                err
            );

            setError(
                err?.response?.data?.message ||
                `Unable to ${status.toLowerCase()} the selected expenses.`
            );
        } finally {
            setBusy(false);
        }
    };

    // ==================================================
    // COUNTS
    // ==================================================

    const highRisk = useMemo(
        () =>
            filtered.filter(
                (item) =>
                    String(
                        item.risk_level || ""
                    ).toLowerCase() ===
                    "high risk"
            ).length,
        [filtered]
    );

    const reviewRisk = useMemo(
        () =>
            filtered.filter(
                (item) =>
                    String(
                        item.risk_level || ""
                    ).toLowerCase() ===
                    "review required"
            ).length,
        [filtered]
    );

    const pendingCount = useMemo(
        () =>
            filtered.filter(
                (item) =>
                    item.status ===
                    "Pending"
            ).length,
        [filtered]
    );

    // ==================================================
    // RENDER
    // ==================================================

    return (
        <div className="expense-page">

            {/* ==================================================
                PAGE HEADING
            ================================================== */}

            <div className="expense-page-heading">

                <div>
                    <div className="expense-eyebrow">
                        Expenses
                    </div>

                    <h1>
                        Approve Expenses
                    </h1>

                    <p>
                        Review verified bills before
                        finance or manager approval.
                    </p>
                </div>

                <div className="expense-heading-badge">
                    <FaShieldAlt />
                    Finance review queue
                </div>

            </div>

            {/* ==================================================
                REVIEW ALERTS
            ================================================== */}

            <div className="expense-review-alerts">

                <div className="expense-review-alert warning">

                    <FaExclamationTriangle />

                    <span>
                        <strong>
                            {reviewRisk}
                        </strong>{" "}
                        bills need review.
                    </span>

                </div>

                <div className="expense-review-alert danger">

                    <FaShieldAlt />

                    <span>
                        <strong>
                            {highRisk}
                        </strong>{" "}
                        bills are high risk.
                    </span>

                </div>

            </div>

            {/* ==================================================
                SEARCH + BULK ACTIONS
            ================================================== */}

            <div className="expense-card expense-approval-toolbar">

                <div className="expense-search">

                    <FaSearch />

                    <input
                        type="text"
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                        placeholder="Search by name, ID, invoice or vendor..."
                    />

                </div>

                <div className="expense-bulk-actions">

                    <button
                        type="button"
                        className="expense-approve-btn"
                        disabled={
                            !selected.length ||
                            busy
                        }
                        onClick={() =>
                            reviewSelected(
                                "Approved"
                            )
                        }
                    >
                        <FaCheck />

                        {busy
                            ? "Updating..."
                            : "Approve Selected"}
                    </button>

                    <button
                        type="button"
                        className="expense-reject-btn"
                        disabled={
                            !selected.length ||
                            busy
                        }
                        onClick={() =>
                            reviewSelected(
                                "Rejected"
                            )
                        }
                    >
                        <FaTimes />

                        Reject Selected
                    </button>

                </div>

            </div>

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
                <div className="expense-error page-error">
                    {error}
                </div>
            )}

            {/* ==================================================
                QUEUE TABLE
            ================================================== */}

            <div className="expense-card expense-table-card">

                <div className="expense-table-header">

                    <div>

                        <h2>
                            Finance / Manager Queue
                        </h2>

                        <p>
                            Select one or more bills
                            and approve or reject them.
                        </p>

                    </div>

                    <span className="expense-selection-count">
                        {selected.length} selected
                    </span>

                </div>

                <div className="expense-table-wrap">

                    <table className="expense-table">

                        <thead>

                            <tr>

                                <th>

                                    <input
                                        type="checkbox"
                                        checked={
                                            filtered.length > 0 &&
                                            selectedVisibleCount ===
                                                filtered.length
                                        }
                                        onChange={
                                            toggleAll
                                        }
                                        disabled={
                                            loading ||
                                            !filtered.length
                                        }
                                    />

                                </th>

                                <th>
                                    Employee
                                </th>

                                <th>
                                    Date
                                </th>

                                <th>
                                    Store
                                </th>

                                <th>
                                    Invoice #
                                </th>

                                <th>
                                    Vendor
                                </th>

                                <th>
                                    Amount
                                </th>

                                <th>
                                    Risk
                                </th>

                                <th>
                                    Actions
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {/* ==================================================
                                LOADING
                            ================================================== */}

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan="9"
                                        className="expense-table-empty"
                                    >
                                        Loading review queue...
                                    </td>

                                </tr>

                            ) : filtered.length === 0 ? (

                                /* ==================================================
                                    EMPTY
                                ================================================== */

                                <tr>

                                    <td
                                        colSpan="9"
                                        className="expense-table-empty"
                                    >
                                        No expenses are waiting
                                        for review.
                                    </td>

                                </tr>

                            ) : (

                                /* ==================================================
                                    DATA
                                ================================================== */

                                filtered.map(
                                    (item) => {

                                        const isSelected =
                                            selected.some(
                                                (id) =>
                                                    String(
                                                        id
                                                    ) ===
                                                    String(
                                                        item.id
                                                    )
                                            );

                                        return (
                                            <tr
                                                key={
                                                    item.id
                                                }
                                            >

                                                {/* CHECKBOX */}

                                                <td>

                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            isSelected
                                                        }
                                                        onChange={() =>
                                                            toggle(
                                                                item.id
                                                            )
                                                        }
                                                        disabled={
                                                            busy
                                                        }
                                                    />

                                                </td>

                                                {/* EMPLOYEE */}

                                                <td>

                                                    <strong>
                                                        {
                                                            item.submitted_by_name ||
                                                            "Unknown User"
                                                        }
                                                    </strong>

                                                    <small>
                                                        {
                                                            item.submitted_by_employee_id ||
                                                            "—"
                                                        }
                                                    </small>

                                                </td>

                                                {/* DATE */}

                                                <td>
                                                    {
                                                        item.bill_date ||
                                                        "—"
                                                    }
                                                </td>

                                                {/* STORE */}

                                                <td>

                                                    <strong>
                                                        {
                                                            item.store_name ||
                                                            "Not selected"
                                                        }
                                                    </strong>

                                                    <small>
                                                        {
                                                            item.store_location ||
                                                            item.store_code ||
                                                            "Location not available"
                                                        }
                                                    </small>

                                                </td>

                                                {/* INVOICE */}

                                                <td>
                                                    {
                                                        item.invoice_number ||
                                                        "—"
                                                    }
                                                </td>

                                                {/* VENDOR */}

                                                <td>
                                                    {
                                                        item.vendor_name ||
                                                        "Not detected"
                                                    }
                                                </td>

                                                {/* AMOUNT */}

                                                <td>

                                                    <strong>
                                                        ₹
                                                        {Number(
                                                            item.total_amount ||
                                                            0
                                                        ).toLocaleString(
                                                            "en-IN",
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            }
                                                        )}
                                                    </strong>

                                                </td>

                                                {/* RISK */}

                                                <td>

                                                    <span
                                                        className={`expense-mini-risk ${riskClass(
                                                            item.risk_level
                                                        )}`}
                                                    >

                                                        <FaShieldAlt />

                                                        {
                                                            item.risk_level ||
                                                            "Review Required"
                                                        }

                                                    </span>

                                                </td>

                                                {/* ACTIONS */}

                                                <td>

                                                    <button
                                                        type="button"
                                                        className="expense-view-btn"
                                                        onClick={() =>
                                                            setDetailsId(
                                                                item.id
                                                            )
                                                        }
                                                        disabled={
                                                            busy
                                                        }
                                                    >

                                                        <FaEye />

                                                        View

                                                    </button>

                                                </td>

                                            </tr>
                                        );
                                    }
                                )
                            )}

                        </tbody>

                    </table>

                </div>

                {/* ==================================================
                    FOOTER
                ================================================== */}

                <div className="expense-table-footer">

                    <span>
                        Awaiting review:{" "}
                        <strong>
                            {filtered.length}
                        </strong>
                    </span>

                    <span>
                        Pending:{" "}
                        <strong>
                            {pendingCount}
                        </strong>
                    </span>

                    <span>
                        Selected:{" "}
                        <strong>
                            {selected.length}
                        </strong>
                    </span>

                </div>

            </div>

            {/* ==================================================
                EXPENSE DETAILS
            ================================================== */}

            {detailsId && (
                <ExpenseDetails
                    id={detailsId}
                    onClose={() =>
                        setDetailsId(null)
                    }
                />
            )}

        </div>
    );
}

export default ApproveExpenses;