import React from "react";

import "../../../styles/common/Card.css";

function Card({

    title = "",

    subtitle = "",

    actions = null,

    children,

    className = "",

    bodyClassName = "",

    noPadding = false,

}) {

    return (

        <div className={`card ${className}`}>

            {(title || subtitle || actions) && (

                <div className="card-header">

                    <div className="card-header-left">

                        {title && (

                            <h3 className="card-title">

                                {title}

                            </h3>

                        )}

                        {subtitle && (

                            <p className="card-subtitle">

                                {subtitle}

                            </p>

                        )}

                    </div>

                    {actions && (

                        <div className="card-header-actions">

                            {actions}

                        </div>

                    )}

                </div>

            )}

            <div
                className={`card-body ${bodyClassName} ${
                    noPadding ? "card-no-padding" : ""
                }`}
            >

                {children}

            </div>

        </div>

    );

}

export default Card;