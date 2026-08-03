import {
  FaEdit,
  FaTrash,
  FaBan,
  FaEye,
} from "react-icons/fa";

import "../../../styles/common/ActionButtons.css";

function ActionButtons({

  // ==========================================
  // View
  // ==========================================

  showView = false,
  onView,

  // ==========================================
  // Edit
  // ==========================================

  showEdit = false,
  onEdit,

  // ==========================================
  // Delete
  // ==========================================

  showDelete = false,
  onDelete,

  // ==========================================
  // Disable
  // ==========================================

  showDisable = false,
  onDisable,

}) {

  return (

    <div className="action-buttons">

      {showView && (

        <button
          type="button"
          className="view-btn"
          onClick={onView}
        >
          <FaEye />
        </button>

      )}

      {showEdit && (

        <button
          type="button"
          className="edit-btn"
          onClick={onEdit}
        >
          <FaEdit />
          Edit
        </button>

      )}

      {showDisable && (

        <button
          type="button"
          className="disable-btn"
          onClick={onDisable}
        >
          <FaBan />
          Disable
        </button>

      )}

      {showDelete && (

        <button
          type="button"
          className="delete-btn"
          onClick={onDelete}
        >
          <FaTrash />
        </button>

      )}

    </div>

  );

}

export default ActionButtons;