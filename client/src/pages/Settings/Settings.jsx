import React, { useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";

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
    // SEARCH
    // ==========================================

    const [search, setSearch] = useState("");

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
    // FILTER MODULES
    // ==========================================

    const visibleModules = useMemo(() => {

        return modules.filter((module) => {

            const hasPermission =
                isAdministrator ||
                ["View", "Add", "Edit", "Full"].includes(
                    permissions[module.permission]
                );

            const matchesSearch =
                module.title
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                module.description
                    .toLowerCase()
                    .includes(search.toLowerCase());

            return hasPermission && matchesSearch;

        });

    }, [modules, permissions, isAdministrator, search]);

    return (

        <div className="settings-page">

            <PageHeader
                title="Settings"
                subtitle="Manage all application configuration from one place."
            />

            {/* Search */}

            <div className="settings-search">

                <input
                    type="text"
                    placeholder="Search settings..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

            </div>

            {/* Cards */}

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