import React, { useRef, useState } from "react";

import "../styles/BulkUploadModal.css";

function BulkUploadModal({

    isOpen,

    onClose,

    onSuccess,

    uploadFunction,

    title = "Bulk Upload",

    acceptedFile = ".xlsx,.xls"

}) {

    const [file, setFile] = useState(null);

    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // ==========================================
    // File Change
    // ==========================================

    const handleFileChange = (e) => {

        if (e.target.files.length > 0) {

            setFile(e.target.files[0]);

        }

    };

    // ==========================================
    // Upload
    // ==========================================

    const handleUpload = async () => {

        if (!file) {

            alert("Please choose an Excel file.");

            return;

        }

        try {

            setLoading(true);

            await uploadFunction(file);

            alert("File uploaded successfully.");

            setFile(null);

            onSuccess();

        } catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Upload failed."

            );

        } finally {

            setLoading(false);

        }

    };

    // ==========================================
    // Cancel
    // ==========================================

    const handleCancel = () => {

        setFile(null);

        onClose();

    };

    return (

        <div className="bulk-modal-overlay">

            <div className="bulk-modal">

                {/* ================= Header ================= */}

                <div className="bulk-modal-header">

                    <h2>{title}</h2>

                    <button

                        className="bulk-close-btn"

                        onClick={handleCancel}

                    >

                        ×

                    </button>

                </div>

                {/* ================= Body ================= */}

                <div className="bulk-modal-body">

                    <p>

                        Upload an Excel (.xlsx/.xls) file to import data.

                    </p>

                    <div className="bulk-file-picker">

                        <input

                            type="file"

                            ref={fileInputRef}

                            accept={acceptedFile}

                            onChange={handleFileChange}

                            hidden

                        />

                        <button

                            type="button"

                            className="choose-file-btn"

                            onClick={() => fileInputRef.current.click()}

                        >

                            Choose File

                        </button>

                        <span className="file-name">

                            {file ? file.name : "No file selected"}

                        </span>

                    </div>

                </div>

                {/* ================= Footer ================= */}

                <div className="bulk-modal-footer">

                    <button

                        className="cancel-btn"

                        onClick={handleCancel}

                    >

                        Cancel

                    </button>

                    <button

                        className="upload-btn"

                        onClick={handleUpload}

                        disabled={loading}

                    >

                        {

                            loading

                                ? "Uploading..."

                                : "Upload Excel"

                        }

                    </button>

                </div>

            </div>

        </div>

    );

}

export default BulkUploadModal;