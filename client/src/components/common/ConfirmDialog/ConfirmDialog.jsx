import React from "react";

import "../../../styles/common/ConfirmDialog.css";

import Button from "../Button/Button";

function ConfirmDialog({

    open = false,

    title = "Confirm Action",

    message = "Are you sure you want to continue?",

    confirmText = "Confirm",

    cancelText = "Cancel",

    confirmVariant = "danger",

    loading = false,

    onConfirm,

    onCancel,

}) {

    if (!open) return null;

    return (

        <div className="confirm-overlay">

            <div className="confirm-dialog">

                <div className="confirm-header">

                    <h2>{title}</h2>

                </div>

                <div className="confirm-body">

                    <p>{message}</p>

                </div>

                <div className="confirm-footer">

                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>

                    <Button
                        variant={confirmVariant}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </Button>

                </div>

            </div>

        </div>

    );

}

export default ConfirmDialog;