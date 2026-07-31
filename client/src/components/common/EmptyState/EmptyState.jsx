import React from "react";
import { FaInbox } from "react-icons/fa";

import "../../../styles/common/EmptyState.css";

function EmptyState({

    icon,

    title = "No Data Found",

    description = "There is nothing to display at the moment.",

    action = null,

    className = "",

}) {

    return (

        <div className={`empty-state ${className}`}>

            <div className="empty-state-icon">

                {icon || <FaInbox />}

            </div>

            <h3>{title}</h3>

            <p>{description}</p>

            {action && (

                <div className="empty-state-action">

                    {action}

                </div>

            )}

        </div>

    );

}

export default EmptyState;