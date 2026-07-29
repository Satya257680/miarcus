import React, { useEffect, useState } from "react";

import {

    createNewStoreOpening,

    updateNewStoreOpening

} from "../services/newStoreOpeningService";

import "../styles/AddNewStoreOpeningModal.css";

// ======================================================
// INITIAL FORM STATE
// ======================================================

const initialState = {

    location: "",

    city: "",

    sb_area: "",

    carpet_area: "",

    cam: "",

    mg: "",

    electricity_kva: "",

    revenue_share: "",

    escalation: "",

    expected_sale: "",

    possession_date_loi: "",

    broker_name: "",

    operation_head_assigned: "",

    asm_assigned: "",

    deal_days: "",

    approver_name: "",

    construction_vendor: "",

    project_taken_by: ""

};

function AddNewStoreOpeningModal({

    isOpen,

    onClose,

    onSuccess,

    editData

}) {

    const [form, setForm] = useState(initialState);

    const [loading, setLoading] = useState(false);

    // ======================================================
    // LOAD EDIT DATA
    // ======================================================

    useEffect(() => {

        if (editData) {

            setForm({

                ...initialState,

                ...editData

            });

        }

        else {

            setForm(initialState);

        }

    }, [editData, isOpen]);

    // ======================================================
    // HANDLE INPUT CHANGE
    // ======================================================

    const handleChange = (e) => {

        const {

            name,

            value

        } = e.target;

        setForm((prev) => ({

            ...prev,

            [name]: value

        }));

    };

    // ======================================================
    // SUBMIT
    // ======================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            setLoading(true);

            const data = new FormData();

            Object.keys(form).forEach((key) => {

                data.append(key, form[key]);

            });

            if (editData) {

                await updateNewStoreOpening(

                    editData.id,

                    data

                );

            }

            else {

                await createNewStoreOpening(data);

            }

            onSuccess();

        }

        catch (err) {

            console.error(err);

        }

        finally {

            setLoading(false);

        }

    };

    if (!isOpen) return null;

    return (

        <div className="nso-modal-overlay">

            <div className="nso-modal">

                <div className="nso-modal-header">

                    <h2>Add New Store Entry</h2>

                    <button

                        className="close-btn"

                        onClick={onClose}

                    >

                        ×

                    </button>

                </div>

                <form onSubmit={handleSubmit}>

                    <div className="nso-grid">
                        <div className="form-group">

    <label>Location</label>

    <input
        type="text"
        name="location"
        value={form.location}
        onChange={handleChange}
        placeholder="Location"
    />

    <small>

        For names with spaces, use an underscore (_).

        <br />

        Ex:

        <strong>

            GOMTI_NAGAR

        </strong>

    </small>

</div>

<div className="form-group">

    <label>City</label>

    <input
        type="text"
        name="city"
        value={form.city}
        onChange={handleChange}
        placeholder="City"
    />

</div>

<div className="form-group">

    <label>SB Area (sqft)</label>

    <input
        type="number"
        name="sb_area"
        value={form.sb_area}
        onChange={handleChange}
        placeholder="SB Area (sqft)"
    />

</div>

<div className="form-group">

    <label>Carpet Area (sqft)</label>

    <input
        type="number"
        name="carpet_area"
        value={form.carpet_area}
        onChange={handleChange}
        placeholder="Carpet Area (sqft)"
    />

</div>

<div className="form-group">

    <label>CAM</label>

    <input
        type="number"
        name="cam"
        value={form.cam}
        onChange={handleChange}
        placeholder="CAM"
    />

</div>

<div className="form-group">

    <label>MG</label>

    <input
        type="number"
        name="mg"
        value={form.mg}
        onChange={handleChange}
        placeholder="MG"
    />

</div>

<div className="form-group">

    <label>Electricity (KVa)</label>

    <input
        type="text"
        name="electricity_kva"
        value={form.electricity_kva}
        onChange={handleChange}
        placeholder="Electricity (KVa)"
    />

</div>

<div className="form-group">

    <label>Rev Share (%)</label>

    <input
        type="number"
        name="revenue_share"
        value={form.revenue_share}
        onChange={handleChange}
        placeholder="Rev Share (%)"
    />

</div>

<div className="form-group">

    <label>Escalation (%)</label>

    <input
        type="number"
        name="escalation"
        value={form.escalation}
        onChange={handleChange}
        placeholder="Escalation (%)"
    />

</div>

<div className="form-group">

    <label>Expected Sale (INR)</label>

    <input
        type="number"
        name="expected_sale"
        value={form.expected_sale}
        onChange={handleChange}
        placeholder="Expected Sale (INR)"
    />

</div>

<div className="form-group">

    <label>Possession Date (as per LOI)</label>

    <input
        type="date"
        name="possession_date_loi"
        value={form.possession_date_loi}
        onChange={handleChange}
    />

</div>

<div className="form-group">

    <label>Broker Name</label>

    <input
        type="text"
        name="broker_name"
        value={form.broker_name}
        onChange={handleChange}
        placeholder="Broker Name"
    />

</div>

<div className="form-group">

    <label>Operation Head Assigned</label>

    <input
        type="text"
        name="operation_head_assigned"
        value={form.operation_head_assigned}
        onChange={handleChange}
        placeholder="Operation Head Assigned"
    />

</div>

<div className="form-group">

    <label>ASM Assigned</label>

    <input
        type="text"
        name="asm_assigned"
        value={form.asm_assigned}
        onChange={handleChange}
        placeholder="ASM Assigned"
    />

</div>

<div className="form-group">

    <label>Deal Days</label>

    <input
        type="number"
        name="deal_days"
        value={form.deal_days}
        onChange={handleChange}
        placeholder="Deal Days"
    />

</div>

<div className="form-group">

    <label>Approver Name</label>

    <input
        type="text"
        name="approver_name"
        value={form.approver_name}
        onChange={handleChange}
        placeholder="Approver Name"
    />

</div>

<div className="form-group">

    <label>Construction Vendor</label>

    <input
        type="text"
        name="construction_vendor"
        value={form.construction_vendor}
        onChange={handleChange}
        placeholder="Construction Vendor"
    />

</div>

<div className="form-group">

    <label>Project Taken By</label>

    <input
        type="text"
        name="project_taken_by"
        value={form.project_taken_by}
        onChange={handleChange}
        placeholder="Project Taken By"
    />

</div>
                </div>

                {/* ==========================================
                    FOOTER
                ========================================== */}

                <div className="modal-footer">

                    <button

                        type="button"

                        className="cancel-btn"

                        onClick={onClose}

                    >

                        Cancel

                    </button>

                    <button

                        type="submit"

                        className="submit-btn"

                        disabled={loading}

                    >

                        {

                            loading

                                ? "Saving..."

                                : editData

                                    ? "Update Entry"

                                    : "Submit Entry"

                        }

                    </button>

                </div>

            </form>

        </div>

    </div>

);

}

export default AddNewStoreOpeningModal;