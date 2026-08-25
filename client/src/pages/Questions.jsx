import { useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";

// ======================================================
// COMMON COMPONENTS
// ======================================================

import PageHeader from "../components/common/PageHeader";
import PageToolbar from "../components/common/PageToolbar";
import FilterBar from "../components/common/FilterBar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import ConfirmDialog from "../components/common/ConfirmDialog";
import BulkUploadModal from "../components/common/BulkUploadModal";


// ======================================================
// MODALS
// ======================================================

import AddQuestionModal from "../components/AddQuestionModal";

// ======================================================
// ICONS
// ======================================================

import {
    FaEdit,
    FaUpload,
    FaTrash
} from "react-icons/fa";

// ======================================================
// STYLE
// ======================================================

import "../styles/Questions.css";

// ======================================================
// API
// ======================================================

const API = API_BASE_URL + '/api';

// ======================================================
// COMPONENT
// ======================================================

function Questions() {

    // ======================================================
    // STATES
    // ======================================================

    const [questions, setQuestions] = useState([]);

    const [loading, setLoading] = useState(true);

    // ======================================================
    // SEARCH
    // ======================================================

    const [search, setSearch] = useState("");

    // ======================================================
    // FILTERS
    // ======================================================

    const [typeFilter, setTypeFilter] = useState("");

    const [departmentFilter, setDepartmentFilter] = useState("");

    // ======================================================
    // PAGINATION
    // ======================================================

    const [currentPage, setCurrentPage] = useState(1);

    const [pageSize] = useState(10);

    const [totalRecords, setTotalRecords] = useState(0);

    const [totalPages, setTotalPages] = useState(1);

    // ======================================================
    // MODALS
    // ======================================================

    const [showModal, setShowModal] = useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // ======================================================
    // SELECTED DATA
    // ======================================================

    const [selectedQuestion, setSelectedQuestion] = useState(null);

    const [deleteId, setDeleteId] = useState(null);

    const [showBulkUpload, setShowBulkUpload] = useState(false);

    // ======================================================
    // RBAC
    // ======================================================

    const user = JSON.parse(
        localStorage.getItem("user") || "{}"
    );

    const permissions = JSON.parse(
        localStorage.getItem("permissions") || "{}"
    );

    const isAdmin =
        user.administrator === true ||
        user.administrator === 1;

    const permission = isAdmin
        ? "Full"
        : permissions["Questions"] || "None";

    const canView = [
        "View",
        "Add",
        "Edit",
        "Full"
    ].includes(permission);

    const canAdd = [
        "Add",
        "Edit",
        "Full"
    ].includes(permission);

    const canEdit = [
        "Edit",
        "Full"
    ].includes(permission);

    const canDelete =
        permission === "Full";
            // ======================================================
    // LOAD QUESTIONS
    // ======================================================

    const loadQuestions = async () => {

        try {

            setLoading(true);

            const res = await axios.get(
                `${API}/questions`
            );

            const data = res.data.data || res.data || [];

            setQuestions(data);

            setTotalRecords(data.length);

            setTotalPages(
                Math.ceil(data.length / pageSize) || 1
            );

        }
        catch (err) {

            console.error(err);

            alert(
                err.response?.data?.message ||
                "Failed to load Questions."
            );

            setQuestions([]);

        }
        finally {

            setLoading(false);

        }

    };

    // ======================================================
    // LOAD
    // ======================================================

    useEffect(() => {

        if (!canView) {

            setLoading(false);

            return;

        }

        loadQuestions();

    }, [canView]);

    // ======================================================
    // ADD
    // ======================================================

    const handleAdd = () => {

        if (!canAdd) return;

        setSelectedQuestion(null);

        setShowModal(true);

    };

    // ======================================================
// EDIT
// ======================================================

const handleEdit = async (row) => {

    if (!canEdit) return;

    try {

        const res = await axios.get(
            `${API}/questions/${row.id}`
        );

        setSelectedQuestion(
            res.data.data
        );

        setShowModal(true);

    } catch (err) {

        console.error(err);

        alert(
            err.response?.data?.message ||
            "Failed to load question."
        );

    }

};

    // ======================================================
    // DELETE
    // ======================================================

    const handleDelete = (id) => {

        if (!canDelete) return;

        setDeleteId(id);

        setShowDeleteDialog(true);

    };

    const confirmDelete = async () => {

        try {

            await axios.delete(

                `${API}/questions/${deleteId}`

            );

            alert("Question deleted successfully.");

            loadQuestions();

        }
        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Delete failed."

            );

        }
        finally {

            setDeleteId(null);

            setShowDeleteDialog(false);

        }

    };

   // ======================================================
// DELETE ALL
// ======================================================

const handleDeleteAll = async () => {

    if (!canDelete) return;

    if (!window.confirm("Delete all questions?")) return;

    try {

        await axios.delete(
            `${API}/questions/delete-all`
        );

        alert("All Questions deleted successfully.");

        loadQuestions();

    } catch (err) {

        console.error(err);

        alert(
            err.response?.data?.message ||
            "Delete failed."
        );

    }

};

    // ======================================================
    // EXPORT CSV
    // ======================================================

    const handleExport = () => {

        if (!questions.length) {

            alert("No data available.");

            return;

        }

        const rows = filteredQuestions.map((q) => ({

            "Checklist Type": q.checklist_name,

            Question: q.question,

            Sequence: q.sequence_no,

            "Answer Type": q.answer_type,

            SLA: q.sla_value
                ? `${q.sla_value} ${q.sla_unit}`
                : "",

            Departments: q.departments,

            "Answer Required":
                q.answer_required
                    ? "Yes"
                    : "No",

            Status: q.status

        }));

        const csv = [

            Object.keys(rows[0]).join(","),

            ...rows.map((row) =>

                Object.values(row)

                    .map((item) => `"${item}"`)

                    .join(",")

            )

        ].join("\n");

        const blob = new Blob(

            [csv],

            {

                type:
                    "text/csv;charset=utf-8;"

            }

        );

        const url =
            window.URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download = "Questions.csv";

        link.click();

        window.URL.revokeObjectURL(url);

    };

    // ======================================================
    // SUCCESS
    // ======================================================

    const handleSuccess = () => {

        setShowModal(false);

        setSelectedQuestion(null);

        loadQuestions();

    };

    // ======================================================
    // CLEAR FILTERS
    // ======================================================

    const handleClearFilters = () => {

        setSearch("");

        setTypeFilter("");

        setDepartmentFilter("");

        setCurrentPage(1);

    };

    // ======================================================
// BULK UPLOAD QUESTIONS
// ======================================================

const uploadQuestions = async (file) => {

    if (!canAdd) {

        return {

            success: false,

            message: "You don't have permission."

        };

    }

    const formData = new FormData();

    formData.append("file", file);

    const token = localStorage.getItem("token");

    try {

        const response = await axios.post(

            `${API}/questions/bulk-upload`,

            formData,

            {

                headers: {

                    Authorization: `Bearer ${token}`

                }

            }

        );

        return response.data;

    } catch (err) {

        console.error(err);

        return {

            success: false,

            message:

                err.response?.data?.message ||

                "Bulk upload failed."

        };

    }

};
        // ======================================================
    // FILTER QUESTIONS
    // ======================================================

    const filteredQuestions = useMemo(() => {

        return questions.filter((q) => {

            const matchesSearch =

                !search ||

                q.question
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                q.checklist_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase());

            const matchesType =

                !typeFilter ||

                q.checklist_name === typeFilter;

            const matchesDepartment =

                !departmentFilter ||

                q.departments
                    ?.split(",")
                    .map(d => d.trim())
                    .includes(departmentFilter);

            return (

                matchesSearch &&

                matchesType &&

                matchesDepartment

            );

        });

    }, [

        questions,

        search,

        typeFilter,

        departmentFilter

    ]);

    // ======================================================
    // FILTER DROPDOWNS
    // ======================================================

    const checklistTypes = useMemo(() => (

        [

            ...new Set(

                questions

                    .map(q => q.checklist_name)

                    .filter(Boolean)

            )

        ]

    ), [questions]);

    const departments = useMemo(() => (

        [

            ...new Set(

                questions.flatMap(q =>

                    q.departments

                        ? q.departments

                              .split(",")

                              .map(d => d.trim())

                        : []

                )

            )

        ]

    ), [questions]);

    // ======================================================
    // PAGINATION
    // ======================================================

    const totalFilteredRecords =

        filteredQuestions.length;

    const calculatedTotalPages =

        Math.max(

            1,

            Math.ceil(

                totalFilteredRecords /

                pageSize

            )

        );

    const currentQuestions =

        filteredQuestions.slice(

            (currentPage - 1) * pageSize,

            currentPage * pageSize

        );

    useEffect(() => {

        setCurrentPage(1);

    }, [

        search,

        typeFilter,

        departmentFilter

    ]);

    // ======================================================
    // STATUS
    // ======================================================

    const getStatusClass = (status) => {

        switch (

            (status || "").toLowerCase()

        ) {

            case "active":

                return "active";

            case "inactive":

                return "inactive";

            default:

                return "inactive";

        }

    };

    // ======================================================
    // ACCESS DENIED
    // ======================================================

    if (!canView) {

        return (

            <div className="no-permission">

                <h2>

                    Access Denied

                </h2>

                <p>

                    You don't have permission to
                    view Questions.

                </p>

            </div>

        );

    }

    // ======================================================
    // LOADING
    // ======================================================

    if (loading) {

        return (

            <div className="questions-loading">

                Loading Questions...

            </div>

        );

    }

    // ======================================================
    // TABLE COLUMNS
    // ======================================================
        const columns = [

        // ==================================================
        // CHECKLIST TYPE
        // ==================================================

        {
            key: "checklist_name",
            title: "Checklist Type",
            render: (row) => row.checklist_name || "-"
        },

        // ==================================================
        // QUESTION
        // ==================================================

        {
            key: "question",
            title: "Question",
            render: (row) => (
                <div className="question-cell">
                    {row.question || "-"}
                </div>
            )
        },

        // ==================================================
        // SEQUENCE
        // ==================================================

        {
            key: "sequence_no",
            title: "Seq",
            align: "center",
            render: (row) => row.sequence_no || "-"
        },

        // ==================================================
        // ANSWER TYPE
        // ==================================================

        {
            key: "answer_type",
            title: "Answer Type",
            render: (row) => row.answer_type || "-"
        },

        // ==================================================
        // SLA
        // ==================================================

        {
            key: "sla",
            title: "SLA",
            render: (row) =>

                row.sla_value

                    ? `${row.sla_value} ${row.sla_unit}`

                    : "-"

        },

        // ==================================================
        // DEPARTMENTS
        // ==================================================

        {
            key: "departments",
            title: "Departments",
            render: (row) => (

                <div className="department-cell">

                    {row.departments || "-"}

                </div>

            )
        },

        // ==================================================
        // ANSWER REQUIRED
        // ==================================================

        {
            key: "answer_required",
            title: "Answer Required",
            align: "center",

            render: (row) => (

                <span
                    className={
                        row.answer_required
                            ? "required-badge yes"
                            : "required-badge no"
                    }
                >
                    {row.answer_required ? "Yes" : "No"}
                </span>

            )

        },

        // ==================================================
        // STATUS
        // ==================================================

        {
            key: "status",
            title: "Status",
            align: "center",

            render: (row) => (

                <span
                    className={`status-badge ${getStatusClass(
                        row.status
                    )}`}
                >
                    {row.status || "-"}
                </span>

            )

        },

        // ==================================================
        // ACTIONS
        // ==================================================

        {
            key: "actions",
            title: "Actions",
            width: "280px",
            minWidth:"280px",
            align: "center",

            render: (row) => (

                <div className="action-buttons">

                    {canEdit && (

                        <button
                            className="edit-btn"
                            onClick={() =>
                                handleEdit(row)
                            }
                        >
                            <FaEdit />
                        </button>

                    )}

                    {canDelete && (

                        <button
                            className="delete-btn"
                            onClick={() =>
                                handleDelete(row.id)
                            }
                        >
                            <FaTrash />
                        </button>

                    )}

                </div>

            )

        }

    ];
    return (

    <div className="questions-page">

        {/* ======================================================
            PAGE HEADER
        ====================================================== */}

        <PageHeader
            title="Checklist Questions"
            subtitle="Manage Checklist Questions."
        />

        {/* ======================================================
    PAGE TOOLBAR
====================================================== */}

<PageToolbar

    search={search}

    setSearch={setSearch}

    placeholder="Search Questions..."

    showAdd={canAdd}

    addText="Add Question"

    onAdd={handleAdd}

    showExport={canView}

    onExport={handleExport}

    showBulkUpload={canAdd}

    bulkUploadText="Bulk Upload"

    onBulkUpload={() => setShowBulkUpload(true)}

    showDeleteAll={canDelete}

    onDeleteAll={handleDeleteAll}

/>

        {/* ======================================================
            FILTER BAR
        ====================================================== */}

        <FilterBar
            onClear={handleClearFilters}
        >

            {/* ==========================================
                CHECKLIST TYPE
            ========================================== */}

            <div className="filter-group">

                <label>Checklist Type</label>

                <select
                    value={typeFilter}
                    onChange={(e) =>
                        setTypeFilter(e.target.value)
                    }
                >

                    <option value="">
                        All Checklist Types
                    </option>

                    {checklistTypes.map((type) => (

                        <option
                            key={type}
                            value={type}
                        >
                            {type}
                        </option>

                    ))}

                </select>

            </div>

            {/* ==========================================
                DEPARTMENT
            ========================================== */}

            <div className="filter-group">

                <label>Department</label>

                <select
                    value={departmentFilter}
                    onChange={(e) =>
                        setDepartmentFilter(e.target.value)
                    }
                >

                    <option value="">
                        All Departments
                    </option>

                    {departments.map((dept) => (

                        <option
                            key={dept}
                            value={dept}
                        >
                            {dept}
                        </option>

                    ))}

                </select>

            </div>

        </FilterBar>
                {/* ======================================================
            CARD
        ====================================================== */}

        <Card
            title="Questions List"
        >

            <DataTable

                columns={columns}

                data={currentQuestions}

                loading={loading}

                emptyTitle="No Questions Found"

                emptyDescription="There are no Questions available."

            />

            <Pagination

                currentPage={currentPage}

                totalPages={calculatedTotalPages}

                totalRecords={totalFilteredRecords}

                pageSize={pageSize}

                onPageChange={setCurrentPage}

                onPageSizeChange={() => {

                    // Fixed page size (10)

                    setCurrentPage(1);

                }}

            />

        </Card>
                {/* ======================================================
            ADD / EDIT QUESTION MODAL
        ====================================================== */}

        {(canAdd || canEdit) && showModal && (

            <AddQuestionModal

                question={selectedQuestion}

                onClose={() => {

                    setShowModal(false);

                    setSelectedQuestion(null);

                }}

                onSuccess={handleSuccess}

            />

        )}
{/* ======================================================
    BULK UPLOAD MODAL
====================================================== */}

<BulkUploadModal

    isOpen={showBulkUpload}

    onClose={() => setShowBulkUpload(false)}

    onSuccess={async () => {

        await loadQuestions();

    }}

    uploadFunction={uploadQuestions}

    title="Bulk Upload Questions"

    acceptedFile=".csv,.xlsx,.xls"

    sampleFile="/samples/questions-sample.xlsx"

/>

        {/* ======================================================
            DELETE CONFIRMATION
        ====================================================== */}

        <ConfirmDialog

            open={showDeleteDialog}

            title="Delete Question"

            message="Are you sure you want to delete this Question?"

            confirmText="Delete"

            cancelText="Cancel"

            confirmVariant="danger"

            onConfirm={confirmDelete}

            onCancel={() => {

                setDeleteId(null);

                setShowDeleteDialog(false);

            }}

        />

    </div>

);

}

export default Questions;