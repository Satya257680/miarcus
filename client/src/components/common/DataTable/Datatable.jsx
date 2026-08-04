import React from "react";

import "../../../styles/common/DataTable.css";

import Loading from "../Loading";
import EmptyState from "../EmptyState";

function DataTable({

    columns = [],

    data = [],

    loading = false,

    emptyTitle = "No Data Found",

    emptyDescription = "There is nothing to display.",

    className = "",

}) {

    // ==========================================
    // Loading
    // ==========================================

    if (loading) {

        return (

            <Loading
                text="Loading data..."
            />

        );

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

        <div
            className={`data-table-wrapper ${className}`}
            style={{
                width: "100%",
                maxWidth: "100%",
                overflowX: "auto",
                overflowY: "auto",
            }}
        >

            <table
                className="data-table"
                style={{
                    minWidth: `${columns.length * 170}px`,
                    tableLayout: "fixed",
                }}
            >

                {/* ========================================== */}
                {/* HEADER */}
                {/* ========================================== */}

                <thead>

                    <tr>

                        {columns.map((column) => (

                            <th
                                key={column.key}
                                style={{
                                    width: column.width || "170px",
                                    minWidth: column.width || "170px",
                                    textAlign: column.align || "left",
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 10,
                                    whiteSpace: "normal",
                                    wordBreak: "break-word",
                                }}
                            >

                                {column.title ||
                                    column.label ||
                                    column.name}

                            </th>

                        ))}

                    </tr>

                </thead>

                {/* ========================================== */}
                {/* BODY */}
                {/* ========================================== */}

                <tbody>

                    {data.map((row, rowIndex) => (

                        <tr key={row.id || rowIndex}>

                            {columns.map((column) => (

                                <td
                                    key={column.key}
                                    style={{
                                        width: column.width || "170px",
                                        minWidth: column.width || "170px",
                                        textAlign: column.align || "left",
                                        verticalAlign: "top",
                                        whiteSpace: "normal",
                                        wordBreak: "break-word",
                                    }}
                                >

                                    {column.render
                                        ? column.render(row)
                                        : row[column.key] ?? "-"}

                                </td>

                            ))}

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );

}

export default DataTable;