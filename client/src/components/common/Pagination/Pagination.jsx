import React from "react";

import "../../../styles/common/Pagination.css";

function Pagination({

    currentPage = 1,

    totalPages = 1,

    totalRecords = 0,

    pageSize = 10,

    pageSizeOptions = [10, 25, 50, 100],

    onPageChange = () => {},

    onPageSizeChange = () => {},

    className = "",

}) {

    const pages = [];

    for (let i = 1; i <= totalPages; i++) {

        pages.push(i);

    }

    return (

        <div className={`pagination ${className}`}>

            <div className="pagination-left">

                <span>

                    Total Records: <strong>{totalRecords}</strong>

                </span>

            </div>

            <div className="pagination-center">

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </button>

                {pages.map((page) => (

                    <button
                        key={page}
                        type="button"
                        className={
                            page === currentPage
                                ? "active"
                                : ""
                        }
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </button>

                ))}

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </button>

            </div>

            <div className="pagination-right">

                <label>

                    Rows:

                    <select
                        value={pageSize}
                        onChange={(e) =>
                            onPageSizeChange(
                                Number(e.target.value)
                            )
                        }
                    >

                        {pageSizeOptions.map((size) => (

                            <option
                                key={size}
                                value={size}
                            >
                                {size}
                            </option>

                        ))}

                    </select>

                </label>

            </div>

        </div>

    );

}

export default Pagination;