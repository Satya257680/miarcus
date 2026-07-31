import React from "react";

import "../../../styles/common/StatusBadge.css";

function StatusBadge({

    status = "default",

    children,

    className = "",

}) {

    const badgeClass = `status-badge status-${status.toLowerCase()} ${className}`;

    return (

        <span className={badgeClass}>

            {children || status}

        </span>

    );

}

export default StatusBadge;