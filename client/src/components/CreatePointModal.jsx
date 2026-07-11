import { useState } from "react";
import "../styles/CreatePointModal.css";

function CreatePointModal({ isOpen, onClose, stores = [] }) {

    const [formData, setFormData] = useState({
        store: "",
        department: "",
        question: "",
        slaValue: "",
        slaType: "Hours",
        answer: "",
        comment: "",
        attachment: null,
    });

    if (!isOpen) return null;

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

    };

    const handleFile = (e) => {

        setFormData((prev) => ({
            ...prev,
            attachment: e.target.files[0],
        }));

    };

    const handleSubmit = (e) => {

        e.preventDefault();

        console.log(formData);

        // Backend API call will be added next

        onClose();

    };

    return (

        <div className="modal-overlay">

            <div className="create-modal">

                <h2>Create Point</h2>

                <form onSubmit={handleSubmit}>

                    {/* Store */}

                    <select
                        name="store"
                        value={formData.store}
                        onChange={handleChange}
                        required
                    >

                        <option value="">
                            Select Store/Location
                        </option>

                        {stores.map((store) => (

                            <option
                                key={store.id}
                                value={store.id}
                            >
                                {store.store_name} ({store.store_code})
                            </option>

                        ))}

                    </select>

                    {/* Question */}

                    <input
                        type="text"
                        name="question"
                        placeholder="Action Point Question/Description"
                        value={formData.question}
                        onChange={handleChange}
                        required
                    />

                    {/* Department */}

                    <select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required
                    >

                        <option value="">
                            Select Departments
                        </option>

                        <option value="Management">
                            Management
                        </option>

                        <option value="HR">
                            HR
                        </option>

                        <option value="Accounts">
                            Accounts
                        </option>

                        <option value="Sales">
                            Sales
                        </option>

                    </select>

                    {/* SLA */}

                    <div className="sla-row">

                        <input
                            type="number"
                            name="slaValue"
                            placeholder="SLA Value"
                            value={formData.slaValue}
                            onChange={handleChange}
                            required
                        />

                        <select
                            name="slaType"
                            value={formData.slaType}
                            onChange={handleChange}
                        >

                            <option value="Hours">
                                Hours
                            </option>

                            <option value="Days">
                                Days
                            </option>

                        </select>

                    </div>

                    {/* Answer */}

                    <input
                        type="text"
                        name="answer"
                        placeholder="Answer (optional)"
                        value={formData.answer}
                        onChange={handleChange}
                    />

                    {/* Comment */}

                    <textarea
                        rows="4"
                        name="comment"
                        placeholder="Comment (optional)"
                        value={formData.comment}
                        onChange={handleChange}
                    />

                    {/* Attachment */}

                    <label className="upload-label">
                        Attachment (optional)
                    </label>

                    <input
                        type="file"
                        onChange={handleFile}
                    />

                    {/* Buttons */}

                    <div className="modal-buttons">

                        <button
                            type="button"
                            className="cancel-btn"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="save-btn"
                        >
                            Create Point
                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

}

export default CreatePointModal;