import React, { useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";

import {
    FaUsers,
    FaBuilding,
    FaBriefcase,
    FaStore,
    FaQuestionCircle,
    FaClipboardList,
    FaSitemap,
    FaPalette,
    FaEnvelope
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

    const isAdministrator = [true, 1, "1"].includes(user?.administrator) || [true, 1, "1"].includes(user?.is_admin);

    // ==========================================
    // SEARCH
    // ==========================================

    const [search, setSearch] = useState("");

    // ==========================================
    // SETTINGS MODULES
    // ==========================================

    const modules = [

        {
            category: "Personal",
            permission: "Appearance",
            title: "Appearance",
            description: "Personalize your theme and display preferences.",
            icon: FaPalette,
            path: "/settings/appearance",
            personal: true
        },

        {
            category: "People & Access",
            permission: "Users",
            title: "Users",
            description: "Create and manage users.",
            icon: FaUsers,
            path: "/users"
        },

        {
            category: "Organization",
            permission: "Departments",
            title: "Departments",
            description: "Manage departments.",
            icon: FaBuilding,
            path: "/departments"
        },

        {
            category: "Organization",
            permission: "Designations",
            title: "Designations",
            description: "Manage designations.",
            icon: FaBriefcase,
            path: "/designations"
        },

        {
            category: "Operations",
            permission: "Stores",
            title: "Store Management",
            description: "Manage store information.",
            icon: FaStore,
            path: "/stores"
        },

        {
            category: "Operations",
            permission: "NSO Email Routing",
            title: "NSO Email Routing",
            description: "Set New Store Opening email recipients, roles and Select All/Specific routing.",
            icon: FaEnvelope,
            path: "/settings/new-store-openings-email",
            adminOnly: true
        },

        {
            category: "Checklist & Controls",
            permission: "Questions",
            title: "Questions",
            description: "Manage checklist questions.",
            icon: FaQuestionCircle,
            path: "/questions"
        },

        {
            category: "Checklist & Controls",
            permission: "Checklist Types",
            title: "Checklist Types",
            description: "Manage checklist types.",
            icon: FaClipboardList,
            path: "/checklist-types"
        },

        {
            category: "People & Access",
            permission: "Hierarchy",
            title: "Hierarchy",
            description: "Manage reporting hierarchy and organizational levels.",
            icon: FaSitemap,
            path: "/settings/hierarchy"
        }

    ];

    // ==========================================
    // FILTER MODULES
    // ==========================================

    const visibleModules = useMemo(() => {

        return modules.filter((module) => {

            const hasPermission =
                module.personal ||
                isAdministrator ||
                (module.adminOnly ? false : ["View", "Add", "Edit", "Full"].includes(permissions[module.permission]));

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

            {/* Hierarchical settings groups */}

            <div className="settings-hierarchy">

                {["People & Access", "Organization", "Operations", "Checklist & Controls", "Personal"].map((category) => {

                    const categoryModules = visibleModules.filter(
                        (module) => module.category === category
                    );

                    if (!categoryModules.length) return null;

                    return (
                        <section className="settings-section" key={category}>
                            <div className="settings-section-heading">
                                <div>
                                    <span>Settings level</span>
                                    <h2>{category}</h2>
                                </div>
                                <strong>{categoryModules.length} option{categoryModules.length === 1 ? "" : "s"}</strong>
                            </div>

                            <div className="settings-grid">
                                {categoryModules.map((module) => (
                                    <SettingsCard
                                        key={module.permission}
                                        title={module.title}
                                        description={module.description}
                                        icon={module.icon}
                                        path={module.path}
                                    />
                                ))}
                            </div>
                        </section>
                    );
                })}

            </div>

        </div>

    );

}

export default Settings;