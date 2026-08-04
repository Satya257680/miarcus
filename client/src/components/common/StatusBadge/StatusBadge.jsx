import React from "react";

import "../../../styles/common/StatusBadge.css";

function StatusBadge({

    status = "Default",

    children,

    className = "",

}) {

    const badgeStatus = String(status)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

    return (

        <span
            className={`status-badge status-${badgeStatus} ${className}`}
        >
            {children || status}
        </span>

    );

}

export default StatusBadge;