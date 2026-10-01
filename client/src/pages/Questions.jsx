import PremiumLoader from "../components/premium/PremiumLoader";
import { collectIds, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";
import { useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";

// ======================================================
// COMMON COMPONENTS
// ======================================================

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
import "../styles/premium/PagePremium.css";
import "../styles/premium/AdminPagesPremium.css";
import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import { FaQuestionCircle, FaClipboardList, FaAsterisk, FaStopwatch } from "react-icons/fa";
import { formatCount } from "../utils/premiumFormat";
import { exportTableData } from "../utils/exportUtils.js";

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

    // Search / checklist type / department filter applied -> only the
    // questions in the filtered list are deleted.
    const filtered = hasActiveFilters({ search, typeFilter, departmentFilter });
    const ids = collectIds(filteredQuestions);

    if (filtered && !ids.length) {
        alert("No questions match the selected filters.");
        return;
    }

    if (!window.confirm(deleteAllMessage(filtered, ids.length, "questions"))) return;

    try {

        const response = await axios.delete(
            `${API}/questions/delete-all`,
            filtered ? { data: { scope: "filtered", ids } } : undefined
        );

        alert(response.data?.message || "Questions deleted successfully.");

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

    const handleExport = async (format = "csv") => {

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

        await exportTableData({
            headers: Object.keys(rows[0]),
            rows: rows.map((row) => Object.values(row)),
            filename: "Questions",
            format,
            title: "Questions",
        });

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

            <div className="questions-loading"><PremiumLoader title="Loading Questions" /></div>

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
            render: (row) =>
                row.checklist_name
                    ? <span className="pp-pill pp-pill--violet">{row.checklist_name}</span>
                    : <span className="pp-dash">—</span>
        },

        // ==================================================
        // QUESTION
        // ==================================================

        {
            key: "question",
            title: "Question",
            render: (row) => (
                <div className="question-cell pp-wrap pp-cell-title">
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
            render: (row) =>
                row.sequence_no
                    ? <span className="pp-seq">{row.sequence_no}</span>
                    : <span className="pp-dash">—</span>
        },

        // ==================================================
        // ANSWER TYPE
        // ==================================================

        {
            key: "answer_type",
            title: "Answer Type",
            render: (row) =>
                row.answer_type
                    ? <span className="pp-pill pp-pill--blue">{row.answer_type}</span>
                    : <span className="pp-dash">—</span>
        },

        // ==================================================
        // SLA
        // ==================================================

        {
            key: "sla",
            title: "SLA",
            render: (row) =>

                row.sla_value

                    ? <span className="pp-sla"><strong>{row.sla_value}</strong><span>{row.sla_unit}</span></span>

                    : <span className="pp-dash">—</span>

        },

        // ==================================================
        // DEPARTMENTS
        // ==================================================

        {
            key: "departments",
            title: "Departments",
            render: (row) => (

                <div className="department-cell pp-chip-list">

                    {row.departments
                        ? String(row.departments).split(",").map((d) => d.trim()).filter(Boolean).map((d) => (
                            <span key={d} className="pp-pill pp-pill--xs pp-pill--slate">{d}</span>
                        ))
                        : <span className="pp-dash">—</span>}

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
                            ? "pp-pill pp-pill--green"
                            : "pp-pill pp-pill--red"
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
                    className={`pp-pill pp-pill--dot ${
                        getStatusClass(row.status) === "active"
                            ? "pp-pill--green"
                            : "pp-pill--slate"
                    }`}
                >
                    {row.status || "Inactive"}
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
                            <span>Edit</span>
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
                            <span>Delete</span>
                        </button>

                    )}

                </div>

            )

        }

    ];
    return (

    <div className="questions-page pp-premium">

        {/* ======================================================
            PREMIUM HERO + KPIs
        ====================================================== */}

        <PremiumHero
            icon={FaQuestionCircle}
            eyebrow="Settings · Checklists"
            title="Checklist Questions"
            badge="Admin only"
            tone="indigo"
            subtitle="The questions inside every checklist — order, answer type, SLA and which departments see them."
            meta={[
                { label: "Questions", value: formatCount(questions.length) },
                { label: "Showing", value: filteredQuestions.length !== questions.length ? `${formatCount(filteredQuestions.length)} filtered` : null }
            ]}
        />

        <InsightStrip
            loading={loading}
            items={[
                { key: "all", label: "All questions", value: formatCount(questions.length), hint: "Across all checklists", tone: "violet", icon: FaQuestionCircle },
                { key: "types", label: "Checklist types", value: formatCount(checklistTypes.length), hint: "With questions", tone: "blue", icon: FaClipboardList },
                { key: "required", label: "Answer required", value: formatCount(questions.filter((q) => q.answer_required).length), hint: "Mandatory answers", tone: "green", icon: FaAsterisk },
                { key: "sla", label: "With SLA", value: formatCount(questions.filter((q) => q.sla_value).length), hint: "Time-bound follow-up", tone: "amber", icon: FaStopwatch }
            ]}
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

    deleteAllText={deleteAllLabel(hasActiveFilters({ search, typeFilter, departmentFilter }), filteredQuestions.length)}

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
            subtitle={`${formatCount(filteredQuestions.length)} questions`}
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
    moduleKey="questions"
    uploadUrl={"/api/questions/bulk-upload"}

    isOpen={showBulkUpload}

    onClose={() => setShowBulkUpload(false)}

    onSuccess={async () => {

        await loadQuestions();

    }}

    uploadFunction={uploadQuestions}

    title="Bulk Upload Questions"sampleFile="/samples/questions-sample.xlsx"

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