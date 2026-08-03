import React from "react";
import { FaInbox } from "react-icons/fa";

import "../../../styles/common/EmptyState.css";

function EmptyState({

    icon = <FaInbox />,

    title = "No Data Found",

    description = "There is nothing to display at the moment.",

    action = null,

    className = "",

}) {

    return (

        <div className={`empty-state ${className}`}>

            <div className="empty-state-icon">

                {icon}

            </div>

            <h3 className="empty-state-title">

                {title}

            </h3>

            <p className="empty-state-description">

                {description}

            </p>

            {action && (

                <div className="empty-state-action">

                    {action}

                </div>

            )}

        </div>

    );

}

export default EmptyState;