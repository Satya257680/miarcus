import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";

function ModuleCard({ module }) {

    return (

        <Link
            to={module.link}
            className="dashboard-card"
        >

            <div className="card-icon-box">

                <div className="card-icon">

                    {module.icon}

                </div>

            </div>

            <h3>

                {module.title}

            </h3>

            <p>

                {module.description || "Open module"}

            </p>

            <div className="card-arrow">

                <FaArrowRight />

            </div>

        </Link>

    );

}

export default ModuleCard;