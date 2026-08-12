import {
  FaEdit,
  FaTrash,
  FaBan,
  FaEye,
} from "react-icons/fa";

import "../../../styles/common/ActionButtons.css";

function ActionButtons({
  // ==========================================
  // VIEW
  // ==========================================

  showView = false,
  onView,

  // ==========================================
  // EDIT
  // ==========================================

  showEdit = false,
  onEdit,

  // ==========================================
  // DELETE
  // ==========================================

  showDelete = false,
  onDelete,

  // ==========================================
  // DISABLE
  // ==========================================

  showDisable = false,
  onDisable,
}) {
  return (
    <div className="action-buttons">

      {/* ======================================
          VIEW
      ====================================== */}

      {showView && (
        <button
          type="button"
          className="action-btn view-btn"
          onClick={onView}
          title="View"
          aria-label="View"
        >
          <FaEye />
          <span>View</span>
        </button>
      )}

      {/* ======================================
          EDIT
      ====================================== */}

      {showEdit && (
        <button
          type="button"
          className="action-btn edit-btn"
          onClick={onEdit}
          title="Edit"
          aria-label="Edit"
        >
          <FaEdit />
          <span>Edit</span>
        </button>
      )}

      {/* ======================================
          DISABLE
      ====================================== */}

      {showDisable && (
        <button
          type="button"
          className="action-btn disable-btn"
          onClick={onDisable}
          title="Disable"
          aria-label="Disable"
        >
          <FaBan />
          <span>Disable</span>
        </button>
      )}

      {/* ======================================
          DELETE
      ====================================== */}

      {showDelete && (
        <button
          type="button"
          className="action-btn delete-btn"
          onClick={onDelete}
          title="Delete"
          aria-label="Delete"
        >
          <FaTrash />
          <span>Delete</span>
        </button>
      )}

    </div>
  );
}

export default ActionButtons;