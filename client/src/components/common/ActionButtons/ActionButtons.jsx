import {
    FaEdit,
    FaTrash,
    FaBan,
    FaEye
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
    onDisable

}) {

    return (

        <div className="action-buttons">

            {showView && (

                <button
                    type="button"
                    className="view-btn"
                    onClick={onView}
                    title="View"
                >
                    <FaEye />
                </button>

            )}

            {showEdit && (

                <button
                    type="button"
                    className="edit-btn"
                    onClick={onEdit}
                    title="Edit"
                >
                    <FaEdit />
                    <span>Edit</span>
                </button>

            )}

            {showDisable && (

                <button
                    type="button"
                    className="disable-btn"
                    onClick={onDisable}
                    title="Disable"
                >
                    <FaBan />
                    <span>Disable</span>
                </button>

            )}

            {showDelete && (

                <button
                    type="button"
                    className="delete-btn"
                    onClick={onDelete}
                    title="Delete"
                >
                    <FaTrash />
                    <span>Delete</span>
                </button>

            )}

        </div>

    );

}

export default ActionButtons;