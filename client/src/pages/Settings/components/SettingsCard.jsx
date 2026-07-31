import React from "react";
import { useNavigate } from "react-router-dom";

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

            <div className="settings-card-content">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
        </div>
    );
}

export default SettingsCard;