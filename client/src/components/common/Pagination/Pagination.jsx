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

    const start = Math.max(1, currentPage - 2);

    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {

        pages.push(i);

    }

    return (

        <div className={`pagination ${className}`}>

            {/* Left */}

            <div className="pagination-left">

                <span>

                    Total Records :
                    <strong> {totalRecords}</strong>

                </span>

            </div>

            {/* Center */}

            <div className="pagination-center">

                <button
                    type="button"
                    className="page-btn"
                    disabled={currentPage === 1}
                    onClick={() =>
                        onPageChange(currentPage - 1)
                    }
                >
                    Previous
                </button>

                {start > 1 && (

                    <>
                        <button
                            className="page-btn"
                            onClick={() =>
                                onPageChange(1)
                            }
                        >
                            1
                        </button>

                        {start > 2 && (

                            <span className="page-dots">

                                ...

                            </span>

                        )}

                    </>

                )}

                {pages.map((page) => (

                    <button
                        key={page}
                        type="button"
                        className={`page-btn ${
                            page === currentPage
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            onPageChange(page)
                        }
                    >
                        {page}
                    </button>

                ))}

                {end < totalPages && (

                    <>
                        {end < totalPages - 1 && (

                            <span className="page-dots">

                                ...

                            </span>

                        )}

                        <button
                            className="page-btn"
                            onClick={() =>
                                onPageChange(totalPages)
                            }
                        >
                            {totalPages}
                        </button>

                    </>

                )}

                <button
                    type="button"
                    className="page-btn"
                    disabled={
                        currentPage === totalPages
                    }
                    onClick={() =>
                        onPageChange(currentPage + 1)
                    }
                >
                    Next
                </button>

            </div>

            {/* Right */}

            <div className="pagination-right">

                <label>

                    Rows :

                    <select
                        value={pageSize}
                        onChange={(e) =>
                            onPageSizeChange(
                                Number(
                                    e.target.value
                                )
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