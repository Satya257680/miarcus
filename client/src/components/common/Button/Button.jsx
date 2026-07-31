import React from "react";

import "../../../styles/common/Button.css";

function Button({

    children,

    type = "button",

    variant = "primary",

    size = "medium",

    icon = null,

    disabled = false,

    loading = false,

    onClick,

    className = "",

}) {

    return (

        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={`btn btn-${variant} btn-${size} ${className}`}
        >

            {loading ? (

                <span className="btn-loader"></span>

            ) : (

                <>
                    {icon && (
                        <span className="btn-icon">
                            {icon}
                        </span>
                    )}

                    <span>{children}</span>
                </>

            )}

        </button>

    );

}

export default Button;