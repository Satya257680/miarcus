import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";

function SettingsCard({
    title,
    description,
    icon: Icon,
    path
}) {

    const navigate = useNavigate();

    return (

        <div
            className="settings-card"
            onClick={() => navigate(path)}
        >

            <div className="settings-card-icon">

                <Icon />

            </div>

            <h3 className="settings-card-title">

                {title}

            </h3>

            <p className="settings-card-description">

                {description}

            </p>

            <button
                className="settings-card-arrow"
                type="button"
            >

                <FaArrowRight />

            </button>

        </div>

    );

}

export default SettingsCard;