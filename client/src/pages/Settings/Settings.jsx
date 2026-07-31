import React from "react";

import {
    FaUsers,
    FaBuilding,
    FaBriefcase,
    FaStore,
    FaQuestionCircle,
    FaClipboardList,
    FaSitemap
} from "react-icons/fa";

import { SettingsCard } from "./components";

import "../../styles/pages/Settings.css";

function Settings() {

    // ==========================================
    // USER & PERMISSIONS
    // ==========================================

    const user = JSON.parse(
        localStorage.getItem("user") || "{}"
    );

    const permissions = JSON.parse(
        localStorage.getItem("permissions") || "{}"
    );

    const isAdministrator = user?.administrator === true;

    // ==========================================
    // SETTINGS MODULES
    // ==========================================

    const modules = [

        {
            permission: "Users",
            title: "Users",
            description: "Create and manage users.",
            icon: FaUsers,
            path: "/users"
        },

        {
            permission: "Departments",
            title: "Departments",
            description: "Manage departments.",
            icon: FaBuilding,
            path: "/departments"
        },

        {
            permission: "Designations",
            title: "Designations",
            description: "Manage designations.",
            icon: FaBriefcase,
            path: "/designations"
        },

        {
            permission: "Stores",
            title: "Store Management",
            description: "Manage store information.",
            icon: FaStore,
            path: "/stores"
        },

        {
            permission: "Questions",
            title: "Questions",
            description: "Manage checklist questions.",
            icon: FaQuestionCircle,
            path: "/questions"
        },

        {
            permission: "Checklist Types",
            title: "Checklist Types",
            description: "Manage checklist types.",
            icon: FaClipboardList,
            path: "/checklist-types"
        },

        {
            permission: "Reports To",
            title: "Reports To",
            description: "Manage reporting hierarchy.",
            icon: FaSitemap,
            path: "/reports-to"
        }

    ];

    // ==========================================
    // RBAC FILTER
    // ==========================================

    const visibleModules = modules.filter((module) => {

        if (isAdministrator) {
            return true;
        }

        return [
            "View",
            "Add",
            "Edit",
            "Full"
        ].includes(permissions[module.permission]);

    });

    return (

        <div className="settings-page">

            <div className="settings-header">

                <h1>Settings</h1>

                <p>
                    Manage all application configuration from one place.
                </p>

            </div>

            <div className="settings-grid">

                {visibleModules.map((module) => (

                    <SettingsCard
                        key={module.permission}
                        title={module.title}
                        description={module.description}
                        icon={module.icon}
                        path={module.path}
                    />

                ))}

            </div>

        </div>

    );
}

export default Settings;