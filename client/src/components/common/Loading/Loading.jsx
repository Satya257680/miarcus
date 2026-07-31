import React from "react";

import "../../../styles/common/Loading.css";

function Loading({

    type = "spinner",

    text = "Loading...",

    fullScreen = false,

    className = "",

}) {

    const loadingContent = (

        <div className={`loading loading-${type} ${className}`}>

            <div className="loading-spinner"></div>

            {text && (

                <p>{text}</p>

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