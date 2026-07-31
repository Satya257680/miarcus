import React from "react";

import { ModuleCard } from "./index";

function ModuleGrid({ modules }) {

    return (

        <div className="dashboard-grid">

            {modules.map((module, index) => (

                <ModuleCard
                    key={index}
                    module={module}
                />

            ))}

        </div>

    );

}

export default ModuleGrid;