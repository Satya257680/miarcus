import React from "react";

import "../../../styles/common/Card.css";

function Card({

    title,

    subtitle,

    actions,

    children,

    className = "",

}) {

    return (

        <div className={`card ${className}`}>

            {(title || subtitle || actions) && (

                <div className="card-header">

                    <div className="card-header-left">

                        {title && (

                            <h3>{title}</h3>

                        )}

                        {subtitle && (

                            <p>{subtitle}</p>

                        )}

                    </div>

                    {actions && (

                        <div className="card-header-actions">

                            {actions}

                        </div>

                    )}

                </div>

            )}

            <div className="card-body">

                {children}

            </div>

        </div>

    );

}

export default Card;