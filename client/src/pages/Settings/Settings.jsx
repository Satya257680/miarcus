import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaUsers,
    FaBuilding,
    FaBriefcase,
    FaStore,
    FaQuestionCircle,
    FaClipboardList,
    FaSitemap,
    FaPalette,
    FaEnvelope,
    FaArrowRight,
    FaCog,
    FaLayerGroup,
    FaSearch,
    FaTimes,
    FaUserShield,
    FaWallet
} from "react-icons/fa";

import "../../styles/pages/Settings.css";
import "../../styles/premium/PagePremium.css";
import "../../styles/premium/AdminPagesPremium.css";
import "../../styles/premium/ModulesPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";
import InsightStrip from "../../components/premium/InsightStrip";

const CATEGORIES = [
    { id: "People & Access", tone: "violet", blurb: "Who can sign in and how they report." },
    { id: "Organization", tone: "blue", blurb: "Departments and job titles." },
    { id: "Operations", tone: "teal", blurb: "Stores and operational email routing." },
    { id: "Checklist & Controls", tone: "amber", blurb: "Checklists, questions and their emails." },
    { id: "Personal", tone: "rose", blurb: "Your own look and feel." }
];

function Settings() {
    const navigate = useNavigate();

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
            path: "/stores",
            adminOnly: true
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
            category: "Operations",
            permission: "Daily Collection Email Routing",
            title: "Daily Collection Email Routing",
            description: "Choose who receives the one daily summary and the store-manager pending, blocked and ready emails.",
            icon: FaEnvelope,
            path: "/settings/daily-collection-email",
            adminOnly: true
        },

        {
            category: "Operations",
            permission: "Petty Cash Email Routing",
            title: "Petty Cash Email Notifications",
            description: "Choose which Petty Cash events send email and exactly who receives them.",
            icon: FaWallet,
            path: "/petty-cash/email-settings",
            adminOnly: true
        },
        {
            category: "Checklist & Controls",
            permission: "Checklist Email Routing",
            title: "Checklist Email Routing",
            description: "Control checklist submission, Action Point and completion email notifications.",
            icon: FaEnvelope,
            path: "/settings/checklist-email",
            adminOnly: true
        },

        {
            category: "Checklist & Controls",
            permission: "Questions",
            title: "Questions",
            description: "Manage checklist questions.",
            icon: FaQuestionCircle,
            path: "/questions",
            adminOnly: true
        },

        {
            category: "Checklist & Controls",
            permission: "Checklist Types",
            title: "Checklist Types",
            description: "Manage checklist types.",
            icon: FaClipboardList,
            path: "/checklist-types",
            adminOnly: true
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

    const totalAllowed = modules.filter((module) =>
        module.personal || isAdministrator || (!module.adminOnly && ["View", "Add", "Edit", "Full"].includes(permissions[module.permission]))
    ).length;
    const emailRoutes = visibleModules.filter((module) => module.path.includes("email")).length;
    const categoryCount = CATEGORIES.filter((cat) => visibleModules.some((module) => module.category === cat.id)).length;

    return (
        <div className="settings-page pp-premium st-page">
            <PremiumHero
                icon={FaCog}
                eyebrow="Administration · Control centre"
                title="Settings"
                badge={isAdministrator ? "Administrator" : "Personal"}
                badgeTone={isAdministrator ? "gold" : "mint"}
                subtitle="Manage all application configuration from one place — people, organisation, stores, email routing and your own appearance."
                meta={[
                    { label: "Options", value: String(totalAllowed) },
                    { label: "Levels", value: String(categoryCount) },
                    { label: "Showing", value: search ? `${visibleModules.length} match` : null }
                ]}
            />

            <InsightStrip
                items={[
                    { key: "all", label: "Settings options", value: totalAllowed, hint: "Available to you", tone: "violet", icon: FaLayerGroup },
                    { key: "people", label: "People & access", value: visibleModules.filter((m) => m.category === "People & Access").length, hint: "Users & hierarchy", tone: "blue", icon: FaUserShield },
                    { key: "email", label: "Email routing", value: emailRoutes, hint: "Notification pages", tone: "green", icon: FaEnvelope },
                    { key: "ops", label: "Operations", value: visibleModules.filter((m) => m.category === "Operations").length, hint: "Stores & emails", tone: "amber", icon: FaStore }
                ]}
            />

            <div className="page-toolbar">
                <div className="toolbar-search">
                    <FaSearch className="toolbar-search-icon" />
                    <input
                        type="text"
                        placeholder="Search settings — e.g. users, email, stores..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {search && (
                    <div className="toolbar-buttons">
                        <button type="button" className="toolbar-btn" onClick={() => setSearch("")}>
                            <FaTimes /> Clear
                        </button>
                    </div>
                )}
            </div>

            {visibleModules.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon"><FaSearch /></div>
                    <h3 className="empty-state-title">No settings match "{search}"</h3>
                    <p className="empty-state-description">Try another word, or clear the search.</p>
                </div>
            )}

            {CATEGORIES.map((category) => {
                const categoryModules = visibleModules.filter(
                    (module) => module.category === category.id
                );

                if (!categoryModules.length) return null;

                return (
                    <section className={`st-section st-tone-${category.tone}`} key={category.id}>
                        <header className="st-section-head">
                            <div>
                                <span className="st-eyebrow">Settings level</span>
                                <h2>{category.id}</h2>
                                <p>{category.blurb}</p>
                            </div>
                            <strong className="st-count">
                                {categoryModules.length} option{categoryModules.length === 1 ? "" : "s"}
                            </strong>
                        </header>

                        <div className="st-grid">
                            {categoryModules.map((module) => {
                                const Icon = module.icon;
                                return (
                                    <button
                                        type="button"
                                        key={module.permission}
                                        className="st-card"
                                        onClick={() => navigate(module.path)}
                                    >
                                        <span className="st-card-icon"><Icon /></span>
                                        <span className="st-card-copy">
                                            <strong>{module.title}</strong>
                                            <small>{module.description}</small>
                                        </span>
                                        <span className="st-card-go"><FaArrowRight /></span>
                                        {module.adminOnly && <span className="st-card-badge">Admin</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

export default Settings;