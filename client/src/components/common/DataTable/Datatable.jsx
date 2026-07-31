import React from "react";

import "../../../styles/common/DataTable.css";

import Loading from "../Loading/Loading";
import EmptyState from "../EmptyState/EmptyState";

function DataTable({

    columns = [],

    data = [],

    loading = false,

    emptyTitle = "No Data Found",

    emptyDescription = "There is nothing to display.",

    className = "",

}) {

    if (loading) {

        return (

            <Loading text="Loading data..." />

        );

    }

    if (!data.length) {

        return (

            <EmptyState
                title={emptyTitle}
                description={emptyDescription}
            />

        );

    }

    return (

        <div className={`data-table-wrapper ${className}`}>

            <table className="data-table">

                <thead>

                    <tr>

                        {columns.map((column) => (

                            <th key={column.key}>

                                {column.title}

                            </th>

                        ))}

                    </tr>

                </thead>

                <tbody>

                    {data.map((row, rowIndex) => (

                        <tr key={row.id || rowIndex}>

                            {columns.map((column) => (

                                <td key={column.key}>

                                    {column.render
                                        ? column.render(row)
                                        : row[column.key]}

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