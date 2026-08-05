import { useState, useEffect, useRef } from "react";
import {
    FaCloudUploadAlt,
    FaFileExcel,
    FaFileCsv,
    FaUpload,
    FaDownload,
    FaTimes
} from "react-icons/fa";

import "../../../styles/common/BulkUploadModal.css";

function BulkUploadModal({

    isOpen,

    onClose,

    onSuccess,

    uploadFunction,

    title = "Bulk Upload",

    acceptedFile = ".csv,.xlsx,.xls",

    sampleFile = null,

    maxFileSize = 10 * 1024 * 1024 // 10 MB

}) {

    // ======================================================
    // STATES
    // ======================================================

    const [file, setFile] = useState(null);

    const [loading, setLoading] = useState(false);

    const [dragging, setDragging] = useState(false);

    const inputRef = useRef(null);

    // ======================================================
    // RESET
    // ======================================================

    useEffect(() => {

        if (!isOpen) {

            setFile(null);

            setLoading(false);

            setDragging(false);

        }

    }, [isOpen]);

    if (!isOpen) return null;

    // ======================================================
    // VALIDATE FILE
    // ======================================================

    const validateFile = (selectedFile) => {

        if (!selectedFile) return false;

        const extension = selectedFile.name

            .split(".")

            .pop()

            .toLowerCase();

        const allowed = [

            "csv",

            "xlsx",

            "xls"

        ];

        if (!allowed.includes(extension)) {

            alert(

                "Only CSV, XLSX and XLS files are allowed."

            );

            return false;

        }

        if (selectedFile.size > maxFileSize) {

            alert(

                "Maximum file size is 10 MB."

            );

            return false;

        }

        return true;

    };

    // ======================================================
    // FILE CHANGE
    // ======================================================

    const handleFileChange = (e) => {

        const selected = e.target.files[0];

        if (!validateFile(selected)) {

            e.target.value = "";

            return;

        }

        setFile(selected);

    };

    // ======================================================
    // DROP
    // ======================================================

    const handleDrop = (e) => {

        e.preventDefault();

        setDragging(false);

        const dropped = e.dataTransfer.files[0];

        if (!validateFile(dropped)) return;

        setFile(dropped);

    };

    const handleDragOver = (e) => {

        e.preventDefault();

        setDragging(true);

    };

    const handleDragLeave = () => {

        setDragging(false);

    };
        // ======================================================
    // UPLOAD
    // ======================================================

    const handleUpload = async () => {

        if (!file) {

            alert("Please select a file.");

            return;

        }

        try {

            setLoading(true);

            // Pass File only.
            // Each page creates its own FormData.

            const result = await uploadFunction(file);

            if (result?.success) {

                alert(

                    result.message ||

                    "Bulk upload completed successfully."

                );

                setFile(null);

                inputRef.current.value = "";

                if (onSuccess) {

                    await onSuccess();

                }

                onClose();

            } else {

                alert(

                    result?.message ||

                    "Upload failed."

                );

            }

        } catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                err.message ||

                "Upload failed."

            );

        } finally {

            setLoading(false);

        }

    };

    // ======================================================
    // REMOVE FILE
    // ======================================================

    const removeFile = () => {

        setFile(null);

        if (inputRef.current) {

            inputRef.current.value = "";

        }

    };

    // ======================================================
    // RETURN
    // ======================================================

    return (

        <div className="bulk-modal-overlay">

            <div className="bulk-modal">

                {/* =====================================
                    HEADER
                ===================================== */}

                <div className="bulk-header">

                    <h2>{title}</h2>

                    <button

                        className="bulk-close"

                        onClick={onClose}

                        disabled={loading}

                    >

                        <FaTimes />

                    </button>

                </div>

                {/* =====================================
                    BODY
                ===================================== */}

                <div className="bulk-body">

                    <div

                        className={`bulk-dropzone ${dragging ? "dragging" : ""}`}

                        onDrop={handleDrop}

                        onDragOver={handleDragOver}

                        onDragLeave={handleDragLeave}

                    >

                        <FaCloudUploadAlt className="bulk-upload-icon" />

                        <h3>

                            Drag & Drop your file here

                        </h3>

                        <p>

                            or click below to browse

                        </p>

                        <input

                            ref={inputRef}

                            type="file"

                            accept={acceptedFile}

                            hidden

                            onChange={handleFileChange}

                        />

                        <button

                            type="button"

                            className="browse-btn"

                            onClick={() =>

                                inputRef.current.click()

                            }

                        >

                            Browse File

                        </button>

                        <small>

                            Supported:

                            CSV, XLSX, XLS

                        </small>

                    </div>

                    {

                        file && (

                            <div className="selected-file">

                                {

                                    file.name.endsWith(".csv")

                                        ?

                                        <FaFileCsv />

                                        :

                                        <FaFileExcel />

                                }

                                <div className="selected-file-info">

                                    <strong>

                                        {file.name}

                                    </strong>

                                    <span>

                                        {(file.size / 1024).toFixed(2)} KB

                                    </span>

                                </div>

                                <button

                                    className="remove-file-btn"

                                    onClick={removeFile}

                                    disabled={loading}

                                >

                                    <FaTimes />

                                </button>

                            </div>

                        )

                    }
                                        {/* =====================================
                        SAMPLE FILE
                    ===================================== */}

                    {

                        sampleFile && (

                            <div className="bulk-sample">

                                <a

                                    href={sampleFile}

                                    download

                                    className="sample-btn"

                                >

                                    <FaDownload />

                                    Download Sample File

                                </a>

                            </div>

                        )

                    }

                </div>

                {/* =====================================
                    FOOTER
                ===================================== */}

                <div className="bulk-footer">

                    <button

                        type="button"

                        className="cancel-btn"

                        disabled={loading}

                        onClick={() => {

                            removeFile();

                            onClose();

                        }}

                    >

                        Cancel

                    </button>

                    <button

                        type="button"

                        className="upload-btn"

                        disabled={loading || !file}

                        onClick={handleUpload}

                    >

                        <FaUpload />

                        {

                            loading

                                ? "Uploading..."

                                : "Upload"

                        }

                    </button>

                </div>

            </div>

        </div>

    );

}

export default BulkUploadModal;