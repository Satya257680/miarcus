import React from "react";

import "../../../styles/common/DataTable.css";

import Loading from "../Loading";
import EmptyState from "../EmptyState";

// ==========================================
// EXTRA COLUMNS FROM BULK UPLOAD
// ==========================================
//
// The global bulk-upload engine saves every column of an uploaded
// file that a module has no field for (e.g. "Transport Mode",
// "Travel Cost") in `bulk_extra_data` on the record. Any table that
// shows such records automatically gets one column per extra field,
// placed just before the Actions column, so uploaded columns never
// silently disappear.
// ==========================================

const parseExtra = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
};

const withExtraColumns = (columns, data) => {
    if (!Array.isArray(data) || !data.length) return columns;

    const names = [];
    data.forEach((row) => {
        const extra = parseExtra(row?.bulk_extra_data);
        if (!extra) return;
        Object.keys(extra).forEach((name) => {
            if (!names.includes(name)) names.push(name);
        });
    });

    if (!names.length) return columns;

    const existing = new Set(
        columns.map((c) => String(c.title || c.label || c.name || "").trim().toLowerCase())
    );

    const extraColumns = names
        .filter((name) => !existing.has(name.trim().toLowerCase()))
        .map((name) => ({
            key: `__extra__${name}`,
            title: name,
            minWidth: "130px",
            render: (row) => {
                const value = parseExtra(row?.bulk_extra_data)?.[name];
                return value === undefined || value === null || value === "" ? "-" : String(value);
            }
        }));

    if (!extraColumns.length) return columns;

    const actionIndex = columns.findIndex(
        (c) => c.key === "actions" || c.key === "action" || c.mobile === "actions"
    );

    if (actionIndex === -1) return [...columns, ...extraColumns];

    return [
        ...columns.slice(0, actionIndex),
        ...extraColumns,
        ...columns.slice(actionIndex)
    ];
};

function DataTable({

    columns = [],

    data = [],

    loading = false,

    emptyTitle = "No Data Found",

    emptyDescription = "There is nothing to display.",

    className = "",

    // Phones: every table is shown as app-style cards (see
    // hooks/useMobileTableCards.js + styles/mobile/MobileModules.css).
    // Per column you can pass  mobile: "primary" | "actions" | "hide"
    // and  mobileLabel: "Short label".

}) {

    columns = withExtraColumns(columns, data);

    // ==========================================
    // Loading
    // ==========================================

    if (loading) {

        return <Loading text="Loading data..." />;

    }

    // ==========================================
    // Empty State
    // ==========================================

    if (!data || data.length === 0) {

        return (

            <EmptyState
                title={emptyTitle}
                description={emptyDescription}
            />

        );

    }

    // ==========================================
    // Table
    // ==========================================

    return (

        <div className={`data-table-wrapper ${className}`}>

            <table className="data-table">

                {/* ==========================================
                    HEADER
                ========================================== */}

                <thead>

                    <tr>

                        {columns.map((column) => {

                            const style = {
                                width: column.width || column.minWidth || "160px",
                                minWidth: column.minWidth || column.width || "160px",
                                maxWidth: column.maxWidth || column.width || undefined,
                                textAlign: column.align || "left"
                            };

                            return (

                                <th
                                    key={column.key}
                                    style={style}
                                >
                                    {column.title ||
                                        column.label ||
                                        column.name}
                                </th>

                            );

                        })}

                    </tr>

                </thead>

                {/* ==========================================
                    BODY
                ========================================== */}

                <tbody>

                    {data.map((row, rowIndex) => (

                        <tr key={row.id || rowIndex}>

                            {columns.map((column) => {

                                const style = {
                                    width: column.width || column.minWidth || "160px",
                                    minWidth: column.minWidth || column.width || "160px",
                                    maxWidth: column.maxWidth || column.width || undefined,
                                    textAlign: column.align || "left",
                                    verticalAlign: "middle"
                                };

                                return (

                                    <td
                                        key={column.key}
                                        style={style}
                                        className={column.mobile === "hide" ? "m-hide" : undefined}
                                        data-label={column.mobileLabel ?? (typeof (column.title || column.label || column.name) === "string" ? (column.title || column.label || column.name) : "")}
                                        data-m-role={
                                            column.mobile === "primary" || column.mobile === "actions"
                                                ? column.mobile
                                                : undefined
                                        }
                                    >
                                        {column.render
                                            ? column.render(row)
                                            : row[column.key] ?? "-"}
                                    </td>

                                );

                            })}

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );

}

export default DataTable;