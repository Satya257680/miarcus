import React from "react";

import "../../../styles/common/PageHeader.css";

function PageHeader({
    title,
    subtitle,
    actions
}) {

    return (

        <div className="page-header">

            <div className="page-header-left">

                <h1>{title}</h1>

                {subtitle && (
                    <p>{subtitle}</p>
                )}

            </div>

            {actions && (

                <div className="page-header-actions">

                    {actions}

                </div>

            )}

        </div>

    );

}

export default PageHeader;