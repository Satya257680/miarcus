import React, { useEffect, useState } from "react";

import {
    getNewStoreOpenings,
    deleteNewStoreOpening,
    exportNewStoreOpenings
} from "../services/newStoreOpeningService";

import AddNewStoreOpeningModal from "../components/AddNewStoreOpeningModal";

import "../styles/NewStoreOpenings.css";

function NewStoreOpenings() {

    // ==========================================
    // STATES
    // ==========================================

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);

    // ==========================================
    // LOAD DATA
    // ==========================================

    const loadData = async () => {

        try {

            setLoading(true);

            const res = await getNewStoreOpenings({

                page,
                limit,
                search

            });

            setData(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
            setTotal(res.data.total || 0);

        }

        catch (err) {

            console.error(err);

        }

        finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        loadData();

    }, [page, limit, search]);

    // ==========================================
    // DELETE
    // ==========================================

    const handleDelete = async (id) => {

        if (!window.confirm("Delete this record?")) return;

        try {

            await deleteNewStoreOpening(id);

            loadData();

        }

        catch (err) {

            console.error(err);

        }

    };

    // ==========================================
    // EXPORT
    // ==========================================

    const handleExport = async () => {

    try {

        const response = await exportNewStoreOpenings({

            search

        });

        const url = window.URL.createObjectURL(
            new Blob([response.data])
        );

        const link = document.createElement("a");

        link.href = url;
        link.download = "new_store_openings.csv";

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

    }

    catch (err) {

        console.log("Export Error:", err);

        if (err.response) {

            console.log("Status:", err.response.status);
            console.log("Data:", err.response.data);

        }

    }

};

    return (

        <div className="new-store-page">

            {/* ==========================================
                HEADER
            ========================================== */}

            <div className="page-header">

                <h2>New Store Openings</h2>

                <button
                    onClick={() => {

                        setEditData(null);
                        setShowModal(true);

                    }}
                >
                    + Add Entry
                </button>

            </div>

            {/* ==========================================
                TOOLBAR
            ========================================== */}

            <div className="toolbar">

                <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => {

                        setPage(1);
                        setSearch(e.target.value);

                    }}
                />

                <button
                    onClick={() => {

                        setSearch("");
                        setPage(1);

                    }}
                >
                    Clear
                </button>

                <button
                    onClick={handleExport}
                >
                    Export CSV
                </button>

            </div>

            {loading ? (

                <p>Loading...</p>

            ) : (

                <div className="table-wrapper">

                    <table>

                                               <thead>

                            <tr>

                                <th>Location</th>

                                <th>City</th>

                                <th>SB Area</th>

                                <th>Carpet Area</th>

                                <th>CAM</th>

                                <th>MG</th>

                                <th>Electricity (KVA)</th>

                                <th>Revenue Share</th>

                                <th>Escalation</th>

                                <th>Expected Sale</th>

                                <th>Possession Date (LOI)</th>

                                <th>Broker Name</th>

                                <th>Operation Head Assigned</th>

                                <th>ASM Assigned</th>

                                <th>Deal Days</th>

                                <th>Approver Name</th>

                                <th>Construction Vendor</th>

                                <th>Project Taken By</th>

                                <th>Actual Possession Date</th>

                                <th>Possession Date (Broker)</th>

                                <th>Delay</th>

                                <th>Layout by NSO</th>

                                <th>Revised Layout</th>

                                <th>Approval Deadline</th>

                                <th>Visit by Operation Team</th>

                                <th>GST</th>

                                <th>HR Hiring</th>

                                <th>Team Training</th>

                                <th>Visit by NSO Team</th>

                                <th>Stock Planning</th>

                                <th>Collaterals Planning</th>

                                <th>Field Training</th>

                                <th>Dispatch Stock</th>

                                <th>NSO Handover</th>

                                <th>VM Handover</th>

                                <th>Scanning</th>

                                <th>Billing Start</th>

                                <th>Remarks</th>

                                <th>Attachment</th>

                                <th>Actions</th>

                            </tr>

                        </thead>

                        <tbody>

                            {data.length === 0 ? (

                                <tr>

                                    <td colSpan="40">

                                        No Records Found

                                    </td>

                                </tr>

                            ) : (

                                data.map((item) => (
<tr key={item.id}>

    <td>{item.location}</td>

    <td>{item.city}</td>

    <td>{item.sb_area}</td>

    <td>{item.carpet_area}</td>

    <td>{item.cam}</td>

    <td>{item.mg}</td>

    <td>{item.electricity_kva}</td>

    <td>{item.revenue_share}</td>

    <td>{item.escalation}</td>

    <td>{item.expected_sale}</td>

    <td>{item.possession_date_loi}</td>

    <td>{item.broker_name}</td>

    <td>{item.operation_head_assigned}</td>

    <td>{item.asm_assigned}</td>

    <td>{item.deal_days}</td>

    <td>{item.approver_name}</td>

    <td>{item.construction_vendor}</td>

    <td>{item.project_taken_by}</td>

    <td>{item.actual_possession_date || "-"}</td>

    <td>{item.possession_date_broker || "-"}</td>

    <td>{item.delay_loi_vs_broker || "-"}</td>

    <td>{item.layout_by_nso || "-"}</td>

    <td>{item.revised_layout_by_nso || "-"}</td>

    <td>{item.approval_deadline || "-"}</td>

    <td>{item.visit_by_op_team || "-"}</td>

    <td>{item.gst_deadline || "-"}</td>

    <td>{item.hr_hiring_deadline || "-"}</td>

    <td>{item.team_training_deadline || "-"}</td>

    <td>{item.visit_by_nso_team_deadline || "-"}</td>

    <td>{item.plan_of_stock_deadline || "-"}</td>

    <td>{item.plan_of_collaterals_deadline || "-"}</td>

    <td>{item.on_field_training_deadline || "-"}</td>

    <td>{item.dispatch_stock_deadline || "-"}</td>

    <td>{item.nso_handover_deadline || "-"}</td>

    <td>{item.vm_handover_deadline || "-"}</td>

    <td>{item.scanning_deadline || "-"}</td>

    <td>{item.billing_start_date || "-"}</td>

    <td>{item.remarks || "-"}</td>

    <td>

        {item.attachment ? (

            <a
                href={item.attachment}
                target="_blank"
                rel="noreferrer"
            >
                View
            </a>

        ) : (

            "-"

        )}

    </td>

    <td className="action-buttons">

        <button
            className="edit-btn"
            onClick={() => {

                setEditData(item);

                setShowModal(true);

            }}
        >
            Edit
        </button>

        <button
            className="delete-btn"
            onClick={() => handleDelete(item.id)}
        >
            Delete
        </button>

    </td>

</tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>

            )}
            <div className="pagination">

                <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                >
                    Previous
                </button>

                <span>
                    Page {page} of {totalPages}
                </span>

                <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                >
                    Next
                </button>

                <select
                    value={limit}
                    onChange={(e) => {

                        setLimit(Number(e.target.value));
                        setPage(1);

                    }}
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>

                <span>

                    Total Records : {total}

                </span>

            </div>

            <AddNewStoreOpeningModal

                isOpen={showModal}

                onClose={() => {

                    setShowModal(false);

                    setEditData(null);

                }}

                onSuccess={() => {

                    setShowModal(false);

                    setEditData(null);

                    loadData();

                }}

                editData={editData}

            />

        </div>

    );

}

export default NewStoreOpenings;
