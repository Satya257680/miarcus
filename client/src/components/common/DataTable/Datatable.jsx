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