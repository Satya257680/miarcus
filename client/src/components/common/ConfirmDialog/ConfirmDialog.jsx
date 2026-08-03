import React from "react";

import "../../../styles/common/ConfirmDialog.css";

import Button from "../Button";

function ConfirmDialog({

    // ==========================================
    // OPEN
    // ==========================================

    open = false,

    isOpen = false,

    // ==========================================
    // CONTENT
    // ==========================================

    title = "Confirm Action",

    message = "Are you sure you want to continue?",

    confirmText = "Confirm",

    cancelText = "Cancel",

    // ==========================================
    // BUTTON STYLE
    // ==========================================

    confirmVariant = "danger",

    confirmType,

    // ==========================================
    // STATE
    // ==========================================

    loading = false,

    closeOnOverlay = true,

    // ==========================================
    // EVENTS
    // ==========================================

    onConfirm,

    onCancel,

}) {

    const visible = open || isOpen;

    const buttonVariant = confirmType || confirmVariant;

    if (!visible) return null;

    const handleOverlayClick = (e) => {

        if (

            closeOnOverlay &&

            e.target.classList.contains("confirm-overlay")

        ) {

            onCancel?.();

        }

    };

    return (

        <div

            className="confirm-overlay"

            onClick={handleOverlayClick}

        >

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

                        variant={buttonVariant}

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