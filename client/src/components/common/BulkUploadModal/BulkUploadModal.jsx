import { useState, useEffect } from "react";
import {
  FaFileExcel,
  FaUpload,
  FaDownload,
} from "react-icons/fa";

import "../../../styles/common/BulkUploadModal.css";

function BulkUploadModal({

  isOpen,

  onClose,

  onSuccess,

  uploadFunction,

  title = "Bulk Upload",

  acceptedFile = ".csv,.xlsx,.xls",

  sampleFile,

}) {

  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);

  // ==========================================
  // Reset Modal
  // ==========================================

  useEffect(() => {

    if (!isOpen) {

      setFile(null);

      setLoading(false);

    }

  }, [isOpen]);

  if (!isOpen) return null;

  // ==========================================
  // Handle File Selection
  // ==========================================

  const handleFileChange = (e) => {

    const selectedFile = e.target.files[0];

    if (!selectedFile) return;

    const extension = selectedFile.name
      .split(".")
      .pop()
      .toLowerCase();

    const allowedExtensions = [

      "csv",

      "xlsx",

      "xls",

    ];

    if (!allowedExtensions.includes(extension)) {

      alert("Please select a CSV or Excel file.");

      e.target.value = "";

      return;

    }

    setFile(selectedFile);

  };

  // ==========================================
// Upload File
// ==========================================

const handleUpload = async () => {

    if (!file) {

        alert("Please select a CSV or Excel file.");

        return;

    }

    try {

        setLoading(true);

        const formData = new FormData();

        formData.append("file", file);

        const response = await uploadFunction(formData);

        const result = response.data || response;

        if (result.success) {

            alert(

                result.message ||

                "Upload completed successfully."

            );

            setFile(null);

            onSuccess?.();

            onClose();

        } else {

            alert(

                result.message ||

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

return (
    <div className="bulk-modal-overlay">

      <div className="bulk-modal">

        {/* ======================================
            Header
        ====================================== */}

        <div className="bulk-header">

          <h2>{title}</h2>

        </div>

        {/* ======================================
            Body
        ====================================== */}

        <div className="bulk-body">

          <label className="bulk-upload-box">

            <FaFileExcel className="excel-icon" />

            <p>

              {

                file

                  ? file.name

                  : "Choose CSV or Excel File"

              }

            </p>

            <small>

              Supported formats:

              CSV, XLSX, XLS

            </small>

            <input

              type="file"

              accept={acceptedFile}

              onChange={handleFileChange}

            />

          </label>

          {sampleFile && (

            <a

              href={sampleFile}

              download

              className="sample-btn"

            >

              <FaDownload />

              Download Sample

            </a>

          )}

        </div>

        {/* ======================================
            Footer
        ====================================== */}

        <div className="bulk-footer">

          <button

            type="button"

            className="cancel-btn"

            disabled={loading}

            onClick={() => {

              setFile(null);

              onClose();

            }}

          >

            Cancel

          </button>

          <button

            type="button"

            className="upload-btn"

            disabled={loading}

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