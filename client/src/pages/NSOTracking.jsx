import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    getNSOTracking,
    deleteNSOTracking,
    deleteAllNSOTracking,
    exportNSOTracking,
    updateNSOTrackingStatus
} from "../services/nsoTrackingService";

import "../styles/NSOTracking.css";

import AddNSOTrackingModal
    from "../components/AddNSOTrackingModal";

import EditNSOTrackingModal
    from "../components/EditNSOTrackingModal";


// ======================================================
// COMPONENT
// ======================================================

function NSOTracking() {

    // ==================================================
    // STATES
    // ==================================================

    const [tracking, setTracking] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");

    const [page, setPage] = useState(1);

    const [limit] = useState(10);

    const [totalPages, setTotalPages] = useState(1);

    const [showAddModal, setShowAddModal] =
        useState(false);

    const [showEditModal, setShowEditModal] =
        useState(false);

    const [selectedTracking, setSelectedTracking] =
        useState(null);


    // ==================================================
    // PERMISSIONS
    // ==================================================

    const permissions = useMemo(() => {

        try {

            const storedPermissions =
                localStorage.getItem("permissions");

            if (!storedPermissions) {
                return {};
            }

            return JSON.parse(
                storedPermissions
            );

        }
        catch (error) {

            console.error(
                "Permission Parse Error:",
                error
            );

            return {};

        }

    }, []);


    const nsoPermission =
        permissions["NSO Tracking"] || "None";


    // ==================================================
    // PERMISSION HELPERS
    // ==================================================

    const canView =
        nsoPermission !== "None";

    const canAdd =
        nsoPermission === "Add" ||
        nsoPermission === "Full";

    const canEdit =
        nsoPermission === "Edit" ||
        nsoPermission === "Full";

    const canDelete =
        nsoPermission === "Full";


    // ==================================================
    // FETCH DATA
    // ==================================================

    const fetchTracking = useCallback(
        async () => {

            if (!canView) {

                setTracking([]);

                return;

            }


            try {

                setLoading(true);


                const response =
                    await getNSOTracking({

                        search,

                        page,

                        limit

                    });


                const responseData =
                    response?.data;


                // ======================================
                // SUCCESS RESPONSE
                // ======================================

                if (
                    responseData?.success
                ) {

                    setTracking(
                        Array.isArray(
                            responseData.data
                        )
                            ? responseData.data
                            : []
                    );


                    setTotalPages(
                        Number(
                            responseData.totalPages
                        ) || 1
                    );

                }

                // ======================================
                // FALLBACK RESPONSE
                // ======================================

                else if (
                    Array.isArray(
                        responseData?.data
                    )
                ) {

                    setTracking(
                        responseData.data
                    );


                    setTotalPages(
                        Number(
                            responseData.totalPages
                        ) || 1
                    );

                }

                else {

                    setTracking([]);

                    setTotalPages(1);

                }

            }

            catch (error) {

                console.error(
                    "Fetch NSO Tracking Error:",
                    error
                );

                setTracking([]);

                setTotalPages(1);

            }

            finally {

                setLoading(false);

            }

        },
        [
            canView,
            search,
            page,
            limit
        ]
    );


    // ==================================================
    // INITIAL / FILTER FETCH
    // ==================================================

    useEffect(() => {

        fetchTracking();

    }, [
        fetchTracking
    ]);


    // ==================================================
    // UPDATE STATUS
    // ==================================================

    const handleStatusChange = async (
        id,
        status
    ) => {

        if (!canEdit) {

            return;

        }


        try {

            setLoading(true);


            await updateNSOTrackingStatus(
                id,
                status
            );


            await fetchTracking();

        }

        catch (error) {

            console.error(
                "Status Update Error:",
                error
            );

            alert(
                error?.response?.data?.message ||
                "Failed to update status."
            );

        }

        finally {

            setLoading(false);

        }

    };


    // ==================================================
    // DELETE SINGLE
    // ==================================================

    const handleDelete = async (
        id
    ) => {

        if (!canDelete) {

            return;

        }


        const confirmed =
            window.confirm(
                "Delete this NSO Tracking?"
            );


        if (!confirmed) {

            return;

        }


        try {

            setLoading(true);


            await deleteNSOTracking(id);


            // ======================================
            // IF LAST ITEM ON PAGE WAS DELETED
            // ======================================

            if (
                tracking.length === 1 &&
                page > 1
            ) {

                setPage(
                    previousPage =>
                        previousPage - 1
                );

            }

            else {

                await fetchTracking();

            }

        }

        catch (error) {

            console.error(
                "Delete NSO Tracking Error:",
                error
            );

            alert(
                error?.response?.data?.message ||
                "Failed to delete NSO Tracking."
            );

        }

        finally {

            setLoading(false);

        }

    };


    // ==================================================
    // DELETE ALL
    // ==================================================

    const handleDeleteAll = async () => {

        if (!canDelete) {

            return;

        }


        const confirmed =
            window.confirm(
                "Delete all NSO Tracking records?"
            );


        if (!confirmed) {

            return;

        }


        try {

            setLoading(true);


            await deleteAllNSOTracking();


            setPage(1);


            await fetchTracking();

        }

        catch (error) {

            console.error(
                "Delete All NSO Tracking Error:",
                error
            );

            alert(
                error?.response?.data?.message ||
                "Failed to delete all NSO Tracking records."
            );

        }

        finally {

            setLoading(false);

        }

    };


    // ==================================================
    // EXPORT
    // ==================================================

    const handleExport = async () => {

        if (!canView) {

            return;

        }


        try {

            setLoading(true);


            const response =
                await exportNSOTracking();


            const contentType =
                response?.headers?.[
                    "content-type"
                ] ||
                "text/csv";


            const blob =
                new Blob(
                    [response.data],
                    {
                        type: contentType
                    }
                );


            const url =
                window.URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement("a");


            link.href = url;


            link.setAttribute(
                "download",
                "NSO_Tracking.csv"
            );


            document.body.appendChild(
                link
            );


            link.click();


            link.remove();


            window.URL.revokeObjectURL(
                url
            );

        }

        catch (error) {

            console.error(
                "Export NSO Tracking Error:",
                error
            );

            alert(
                error?.response?.data?.message ||
                "Failed to export NSO Tracking."
            );

        }

        finally {

            setLoading(false);

        }

    };


    // ==================================================
    // SEARCH CHANGE
    // ==================================================

    const handleSearchChange = (
        event
    ) => {

        setSearch(
            event.target.value
        );

        setPage(1);

    };


    // ==================================================
    // ADD MODAL SUCCESS
    // ==================================================

    const handleAddSuccess = async () => {

        setShowAddModal(false);

        setPage(1);

        await fetchTracking();

    };


    // ==================================================
    // EDIT MODAL CLOSE
    // ==================================================

    const handleEditClose = () => {

        setShowEditModal(false);

        setSelectedTracking(null);

    };


    // ==================================================
    // EDIT SUCCESS
    // ==================================================

    const handleEditSuccess = async () => {

        setShowEditModal(false);

        setSelectedTracking(null);

        await fetchTracking();

    };


    // ==================================================
    // PREVIOUS PAGE
    // ==================================================

    const handlePreviousPage = () => {

        setPage(
            previousPage =>
                Math.max(
                    previousPage - 1,
                    1
                )
        );

    };


    // ==================================================
    // NEXT PAGE
    // ==================================================

    const handleNextPage = () => {

        setPage(
            previousPage =>
                Math.min(
                    previousPage + 1,
                    totalPages
                )
        );

    };


    // ==================================================
    // NO VIEW PERMISSION
    // ==================================================

    if (!canView) {

        return (

            <div className="nso-tracking-page">

                <div className="page-header">

                    <h2>
                        NSO Tracking
                    </h2>

                </div>

                <div className="table-container">

                    <div
                        style={{
                            padding: "30px",
                            textAlign: "center"
                        }}
                    >

                        <h3>
                            Access Denied
                        </h3>

                        <p>
                            You do not have permission
                            to view NSO Tracking.
                        </p>

                    </div>

                </div>

            </div>

        );

    }


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="nso-tracking-page">

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="page-header">

                <h2>
                    NSO Tracking
                </h2>


                <div className="actions">

                    {/* ==========================================
                        DELETE ALL
                    ========================================== */}

                    {canDelete && (

                        <button
                            type="button"
                            onClick={
                                handleDeleteAll
                            }
                            className="delete-all-btn"
                            disabled={
                                loading ||
                                tracking.length === 0
                            }
                        >
                            Delete All
                        </button>

                    )}


                    {/* ==========================================
                        EXPORT
                    ========================================== */}

                    <button
                        type="button"
                        onClick={
                            handleExport
                        }
                        className="export-btn"
                        disabled={loading}
                    >
                        Export
                    </button>


                    {/* ==========================================
                        ADD
                    ========================================== */}

                    {canAdd && (

                        <button
                            type="button"
                            className="add-btn"
                            onClick={() =>
                                setShowAddModal(
                                    true
                                )
                            }
                            disabled={loading}
                        >
                            + Add Tracking
                        </button>

                    )}

                </div>

            </div>


            {/* ==================================================
                SEARCH
            ================================================== */}

            <div className="search-container">

                <input
                    type="text"
                    placeholder="Search NSO Tracking..."
                    value={search}
                    onChange={
                        handleSearchChange
                    }
                    className="search-box"
                />

            </div>


            {/* ==================================================
                TABLE
            ================================================== */}

            <div className="table-container">

                {loading ? (

                    <div
                        style={{
                            padding: "30px",
                            textAlign: "center"
                        }}
                    >

                        <h3>
                            Loading...
                        </h3>

                    </div>

                ) : (

                    <table>

                        {/* ======================================
                            TABLE HEADER
                        ====================================== */}

                        <thead>

                            <tr>

                                <th>
                                    ID
                                </th>

                                <th>
                                    New Store Opening
                                </th>

                                <th>
                                    Department
                                </th>

                                <th>
                                    Trigger
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Due Date
                                </th>

                                <th>
                                    Action
                                </th>

                            </tr>

                        </thead>


                        {/* ======================================
                            TABLE BODY
                        ====================================== */}

                        <tbody>

                            {tracking.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="7"
                                        style={{
                                            textAlign:
                                                "center"
                                        }}
                                    >
                                        No Data Found
                                    </td>

                                </tr>

                            ) : (

                                tracking.map(
                                    item => (

                                        <tr
                                            key={
                                                item.id
                                            }
                                        >

                                            {/* ==================
                                                ID
                                            ================== */}

                                            <td>
                                                {
                                                    item.id
                                                }
                                            </td>


                                            {/* ==================
                                                STORE OPENING
                                            ================== */}

                                            <td>
                                                {
                                                    item.new_store_opening_id ??
                                                    "-"
                                                }
                                            </td>


                                            {/* ==================
                                                DEPARTMENT
                                            ================== */}

                                            <td>
                                                {
                                                    item.department_id ??
                                                    "-"
                                                }
                                            </td>


                                            {/* ==================
                                                TRIGGER
                                            ================== */}

                                            <td>
                                                {
                                                    item.trigger_column ??
                                                    "-"
                                                }
                                            </td>


                                            {/* ==================
                                                STATUS
                                            ================== */}

                                            <td>

                                                {canEdit ? (

                                                    <select
                                                        value={
                                                            item.status ||
                                                            "Pending"
                                                        }
                                                        onChange={
                                                            event =>
                                                                handleStatusChange(
                                                                    item.id,
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                        }
                                                        disabled={
                                                            loading
                                                        }
                                                    >

                                                        <option value="Pending">
                                                            Pending
                                                        </option>

                                                        <option value="In Progress">
                                                            In Progress
                                                        </option>

                                                        <option value="Completed">
                                                            Completed
                                                        </option>

                                                        <option value="Hold">
                                                            Hold
                                                        </option>

                                                    </select>

                                                ) : (

                                                    <span>
                                                        {
                                                            item.status ||
                                                            "-"
                                                        }
                                                    </span>

                                                )}

                                            </td>


                                            {/* ==================
                                                DUE DATE
                                            ================== */}

                                            <td>
                                                {
                                                    item.due_date ||
                                                    "-"
                                                }
                                            </td>


                                            {/* ==================
                                                ACTIONS
                                            ================== */}

                                            <td>

                                                {/* ================
                                                    EDIT
                                                ================ */}

                                                {canEdit && (

                                                    <button
                                                        type="button"
                                                        className="edit-btn"
                                                        onClick={() => {

                                                            setSelectedTracking(
                                                                item
                                                            );

                                                            setShowEditModal(
                                                                true
                                                            );

                                                        }}
                                                        disabled={
                                                            loading
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                )}


                                                {/* ================
                                                    DELETE
                                                ================ */}

                                                {canDelete && (

                                                    <button
                                                        type="button"
                                                        className="delete-btn"
                                                        onClick={() =>
                                                            handleDelete(
                                                                item.id
                                                            )
                                                        }
                                                        disabled={
                                                            loading
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                )}

                                            </td>

                                        </tr>

                                    )
                                )

                            )}

                        </tbody>

                    </table>

                )}

            </div>


            {/* ==================================================
                MODALS
            ================================================== */}

            {canAdd && (

                <AddNSOTrackingModal
                    isOpen={
                        showAddModal
                    }
                    onClose={() =>
                        setShowAddModal(
                            false
                        )
                    }
                    onSuccess={
                        handleAddSuccess
                    }
                />

            )}


            {canEdit && (

                <EditNSOTrackingModal
                    isOpen={
                        showEditModal
                    }
                    data={
                        selectedTracking
                    }
                    onClose={
                        handleEditClose
                    }
                    onSuccess={
                        handleEditSuccess
                    }
                />

            )}


            {/* ==================================================
                PAGINATION
            ================================================== */}

            <div className="pagination">

                <button
                    type="button"
                    disabled={
                        page === 1 ||
                        loading
                    }
                    onClick={
                        handlePreviousPage
                    }
                >
                    Previous
                </button>


                <span>
                    Page {page} of {totalPages}
                </span>


                <button
                    type="button"
                    disabled={
                        page === totalPages ||
                        loading
                    }
                    onClick={
                        handleNextPage
                    }
                >
                    Next
                </button>

            </div>

        </div>

    );

}


// ======================================================
// EXPORT
// ======================================================

export default NSOTracking;