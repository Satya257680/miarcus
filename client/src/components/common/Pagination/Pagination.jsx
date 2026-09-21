import React from "react";

import "../../../styles/common/Pagination.css";

// ======================================================
// PAGINATION
//
// REDESIGN: this used to render a numbered page-button strip
// ("Previous 1 ... 3024 3025 3026 Next") that, on a list with
// thousands of pages (e.g. Checklist Reports with 30,000+ rows),
// became a huge, confusing wall of buttons and "..." — nothing like
// the rest of the app's own "Previous / Page X of Y / Next" pattern
// (see client/src/pages/StoreManagement.jsx's pagination). This now
// matches that same simple, page-count-independent style everywhere
// this shared component is used, instead of every page needing its
// own bespoke pagination markup just to get it.
// ======================================================

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

    const safeTotalPages = Math.max(totalPages || 1, 1);

    return (

        <div className={`pagination ${className}`}>

            {/* Left */}

            <div className="pagination-left">

                <span>

                    Total Records :
                    <strong> {totalRecords}</strong>

                </span>

            </div>

            {/* Rows per page */}

            <div className="pagination-right">

                <label>

                    Rows Per Page :

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

            {/* Center — Previous / Page X of Y / Next */}

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

                <span className="page-info">

                    Page {currentPage} of {safeTotalPages}

                </span>

                <button
                    type="button"
                    className="page-btn"
                    disabled={
                        currentPage === safeTotalPages
                    }
                    onClick={() =>
                        onPageChange(currentPage + 1)
                    }
                >
                    Next
                </button>

            </div>

        </div>

    );

}

export default Pagination;