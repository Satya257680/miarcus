import { FaFileExport } from "react-icons/fa";

import "../../../styles/common/ExportButton.css";

function ExportButton({

  onClick,

  loading = false,

  text = "Export",

  disabled = false,

}) {

  return (

    <button
      className="export-button"
      onClick={onClick}
      disabled={loading || disabled}
    >

      <FaFileExport />

      {loading ? "Exporting..." : text}

    </button>

  );

}

export default ExportButton;