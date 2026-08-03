import React from "react";

import "../../../styles/common/Loading.css";

function Loading({

    type = "spinner",

    text = "Loading...",

    fullScreen = false,

    size = "medium",

    className = "",

}) {

    const loadingContent = (

        <div
            className={`loading loading-${type} loading-${size} ${className}`}
        >

            <div className="loading-spinner"></div>

            {text && (

                <p className="loading-text">

                    {text}

                </p>

            )}

        </div>

    );

    if (fullScreen) {

        return (

            <div className="loading-overlay">

                {loadingContent}

            </div>

        );

    }

    return loadingContent;

}

export default Loading;