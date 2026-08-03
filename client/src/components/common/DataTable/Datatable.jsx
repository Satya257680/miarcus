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
    // Empty
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

                <thead>

                    <tr>

                        {columns.map((column) => (

                            <th
                                key={column.key}
                                style={{
                                    width: column.width || "auto",
                                    textAlign: column.align || "left",
                                }}
                            >
                                {column.title || column.label || column.name}
                            </th>

                        ))}

                    </tr>

                </thead>

                <tbody>

                    {data.map((row, rowIndex) => (

                        <tr key={row.id || rowIndex}>

                            {columns.map((column) => (

                                <td
                                    key={column.key}
                                    style={{
                                        textAlign: column.align || "left",
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