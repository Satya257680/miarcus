import React from "react";

import "../../../styles/common/PageHeader.css";

function PageHeader({

    title = "",

    subtitle = "",

    actions = null,

    className = "",

}) {

    return (

        <div className={`page-header ${className}`}>

            <div className="page-header-left">

                <h1 className="page-title">

                    {title}

                </h1>

                {subtitle && (

                    <p className="page-subtitle">

                        {subtitle}

                    </p>

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