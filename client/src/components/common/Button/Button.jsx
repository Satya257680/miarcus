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

    fullWidth = false,

    title = "",

    onClick,

    className = "",

}) {

    const buttonClass = `
        btn
        btn-${variant}
        btn-${size}
        ${fullWidth ? "btn-full" : ""}
        ${className}
    `.trim();

    const handleClick = (e) => {

        if (loading || disabled) return;

        if (onClick) {

            onClick(e);

        }

    };

    return (

        <button
            type={type}
            title={title}
            disabled={disabled || loading}
            onClick={handleClick}
            className={buttonClass}
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

                    <span className="btn-text">

                        {children}

                    </span>

                </>

            )}

        </button>

    );

}

export default Button;