import React, { useEffect, useState } from "react";

import {
    FaBullhorn,
    FaCalendarAlt,
    FaChevronLeft,
    FaDownload,
    FaEdit,
    FaFile,
    FaImage,
    FaPaperclip,
    FaPrint,
    FaSearch,
    FaThumbtack,
    FaTimes,
    FaTrash,
    FaUser,
    FaUsers,
} from "react-icons/fa";

import announcementService from "../services/announcementService";

import PageToolbar from "../components/common/PageToolbar";
import BulkUploadModal from "../components/common/BulkUploadModal";

import "../styles/Announcements.css";

// ======================================================
// CONSTANTS
// ======================================================

const IMAGE_RE =
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;

const API_BASE = (
    import.meta.env.VITE_API_URL?.trim() ||
    (
        import.meta.env.PROD
            ? "https://miarcus-backend.onrender.com"
            : "http://localhost:5000"
    )
).replace(/\/+$/, "");

// ======================================================
// FILE HELPERS
// ======================================================

const isImage = (name) =>
    IMAGE_RE.test(String(name || ""));

const isPdf = (name) =>
    String(name || "")
        .toLowerCase()
        .endsWith(".pdf");

// ======================================================
// MAIN COMPONENT
// ======================================================

function Announcements() {

    // ==================================================
    // USER / RBAC
    // ==================================================

    const user = JSON.parse(
        localStorage.getItem("user") || "{}"
    );

    const isAdmin =
        user?.administrator === true ||
        user?.administrator === 1 ||
        user?.is_admin === true ||
        user?.is_admin === 1;

    const permissions = JSON.parse(
        localStorage.getItem("permissions") || "{}"
    );

    const announcementPermission =
        permissions["Announcements"] || "None";

    const canView =
        isAdmin ||
        [
            "View",
            "Add",
            "Edit",
            "Full",
        ].includes(announcementPermission);

    const canAdd =
        isAdmin ||
        [
            "Add",
            "Edit",
            "Full",
        ].includes(announcementPermission);

    const canEdit =
        isAdmin ||
        [
            "Edit",
            "Full",
        ].includes(announcementPermission);

    const canDelete =
        isAdmin ||
        announcementPermission === "Full";

    // ==================================================
    // STATES
    // ==================================================

    const [announcements, setAnnouncements] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [startDate, setStartDate] =
        useState("");

    const [endDate, setEndDate] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [selected, setSelected] =
        useState(null);

    const [editing, setEditing] =
        useState(null);

    const [showCreate, setShowCreate] =
        useState(false);

    const [showBulkUpload, setShowBulkUpload] =
        useState(false);

    // ==================================================
    // LOAD ANNOUNCEMENTS
    // ==================================================

    const load = async () => {

        try {

            setLoading(true);

            const data =
                await announcementService.getAll({
                    search,
                    startDate,
                    endDate,
                });

            setAnnouncements(
                Array.isArray(data?.announcements)
                    ? data.announcements
                    : []
            );

        } catch (error) {

            console.error(
                "Announcements load:",
                error
            );

        } finally {

            setLoading(false);
        }
    };

    // ==================================================
    // LOAD WHEN FILTER CHANGES
    // ==================================================

    useEffect(() => {

        load();

        // Search/date filtering is handled by backend.
        // eslint-disable-next-line react-hooks/exhaustive-deps

    }, [
        search,
        startDate,
        endDate,
    ]);

    // ==================================================
    // PINNED ANNOUNCEMENT
    // ==================================================

    const pinned =
        announcements.find(
            (item) =>
                Number(item.is_pinned) === 1
        );

    // ==================================================
    // LATEST ANNOUNCEMENTS
    //
    // IMPORTANT:
    // NO PAGE SIZE
    // NO SLICE
    // NO PAGINATION
    //
    // ALL ANNOUNCEMENTS ARE DISPLAYED.
    // CSS / INLINE FLEX CONTAINER PROVIDES
    // HORIZONTAL SCROLLING.
    // ==================================================

    const latest =
        announcements.filter(
            (item) =>
                item.id !== pinned?.id
        );

    // ==================================================
    // FILE URL
    // ==================================================

    const fileUrl = (item) => {

        if (!item?.attachment_path) {
            return null;
        }

        return `${API_BASE}/uploads/${encodeURIComponent(
            String(item.attachment_path)
                .split("/")
                .pop()
        )}`;
    };

    // ==================================================
    // OPEN ANNOUNCEMENT
    // ==================================================

    const openAnnouncement = async (item) => {

        setSelected(item);

        if (
            item.in_app_status !== "read"
        ) {

            try {

                await announcementService.markRead(
                    item.id
                );

                setAnnouncements((prev) =>
                    prev.map((announcement) =>
                        announcement.id === item.id
                            ? {
                                  ...announcement,
                                  in_app_status: "read",
                                  read_at:
                                      new Date().toISOString(),
                              }
                            : announcement
                    )
                );

            } catch (error) {

                console.error(
                    "Mark announcement read:",
                    error
                );
            }
        }
    };

    // ==================================================
    // EDIT ANNOUNCEMENT
    //
    // For pinned announcement:
    // Edit -> uncheck "Pin" -> Save
    // = Unpin
    // ==================================================

    const openEdit = (item) => {

        if (!canEdit) {
            return;
        }

        setSelected(null);
        setEditing(item);
    };

    // ==================================================
    // PRINT
    // ==================================================

    const printAnnouncement = (item) => {

        const w = window.open(
            "",
            "_blank",
            "width=900,height=700"
        );

        if (!w) {
            return;
        }

        const safeTitle =
            String(
                item.title ||
                    "Announcement"
            )
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

        const safeContent =
            String(item.content || "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, "<br/>");

        const attachment =
            fileUrl(item);

        const attachmentHtml =
            attachment
                ? `
                    <div style="
                        margin-top:30px;
                        border:1px solid #d8e4e8;
                        padding:20px;
                        border-radius:12px;
                    ">
                        ${
                            isImage(
                                item.attachment_original_name
                            )
                                ? `
                                    <img
                                        src="${attachment}"
                                        style="
                                            max-width:100%;
                                            max-height:700px;
                                            object-fit:contain;
                                            display:block;
                                            margin:auto;
                                        "
                                    />
                                `
                                : isPdf(
                                      item.attachment_original_name
                                  )
                                ? `
                                    <p>
                                        Attachment:
                                        ${
                                            item.attachment_original_name ||
                                            "PDF"
                                        }
                                    </p>
                                `
                                : `
                                    <p>
                                        Attachment:
                                        ${
                                            item.attachment_original_name ||
                                            "File"
                                        }
                                    </p>
                                `
                        }
                    </div>
                `
                : "";

        w.document.write(`
            <!DOCTYPE html>

            <html>

                <head>

                    <title>
                        ${safeTitle}
                    </title>

                    <style>

                        body {
                            font-family:
                                Arial,
                                Helvetica,
                                sans-serif;

                            padding:40px;

                            color:#294851;
                        }

                        h1 {
                            margin-bottom:12px;
                        }

                        .meta {
                            color:#708991;
                            margin-bottom:25px;
                            font-size:14px;
                        }

                        .content {
                            line-height:1.7;
                            white-space:normal;
                        }

                    </style>

                </head>

                <body>

                    <h1>
                        ${safeTitle}
                    </h1>

                    <div class="meta">
                        ${
                            formatAudience(
                                item.audience
                            )
                        }
                        &nbsp; • &nbsp;
                        ${
                            new Date(
                                item.published_at ||
                                    item.created_at
                            ).toLocaleString()
                        }
                    </div>

                    <div class="content">
                        ${safeContent}
                    </div>

                    ${attachmentHtml}

                </body>

            </html>
        `);

        w.document.close();

        w.focus();

        w.print();
    };

    // ==================================================
    // DELETE SINGLE ANNOUNCEMENT
    // ==================================================

    const deleteAnnouncement = async (
        id
    ) => {

        if (!canDelete) {
            return;
        }

        const confirmed =
            window.confirm(
                "Delete this announcement?"
            );

        if (!confirmed) {
            return;
        }

        try {

            await announcementService.delete(
                id
            );

            setSelected(null);

            await load();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                    "Unable to delete announcement"
            );
        }
    };

    // ==================================================
    // DELETE ALL
    // ==================================================

    const handleDeleteAll = async () => {

        if (!canDelete) {
            return;
        }

        if (!announcements.length) {

            alert(
                "There are no announcements to delete."
            );

            return;
        }

        const confirmed =
            window.confirm(
                "Are you sure you want to delete ALL announcements? This cannot be undone."
            );

        if (!confirmed) {
            return;
        }

        try {

            await announcementService.deleteAll();

            setSelected(null);

            setEditing(null);

            await load();

            alert(
                "All announcements deleted successfully."
            );

        } catch (error) {

            alert(
                error.response?.data?.message ||
                    "Failed to delete all announcements."
            );
        }
    };

    // ==================================================
    // EXPORT
    // ==================================================

    const handleExport = async () => {

        try {

            const response =
                await announcementService.export();

            const url =
                window.URL.createObjectURL(
                    new Blob(
                        [response.data],
                        {
                            type:
                                "text/csv;charset=utf-8;",
                        }
                    )
                );

            const link =
                document.createElement("a");

            link.href = url;

            link.download =
                "Announcements.csv";

            document.body.appendChild(link);

            link.click();

            link.remove();

            window.URL.revokeObjectURL(
                url
            );

        } catch (error) {

            alert(
                error.response?.data?.message ||
                    "Failed to export announcements."
            );
        }
    };

    // ==================================================
    // CLEAR FILTERS
    // ==================================================

    const clearFilters = () => {

        setSearch("");

        setStartDate("");

        setEndDate("");
    };

    // ==================================================
    // PERMISSION CHECK
    // ==================================================

    if (!canView) {

        return (
            <div className="announcements-page">

                <div className="announcement-empty">

                    <FaBullhorn />

                    <h3>
                        Announcements
                    </h3>

                    <p>
                        You don't have permission
                        to view announcements.
                    </p>

                </div>

            </div>
        );
    }

    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="announcements-page">

            {/* ==================================================
                PAGE HEADER
            ================================================== */}

            <div className="announcement-header">

                <div className="announcement-title-row">

                    <div className="announcement-title-icon">
                        <FaBullhorn />
                    </div>

                    <div>

                        <h1>
                            Announcements
                        </h1>

                        <p>
                            Share important updates
                            with the right people.
                        </p>

                    </div>

                </div>

            </div>

            {/* ==================================================
                TOOLBAR
            ================================================== */}

            <PageToolbar

                search={search}

                setSearch={(value) => {
                    setSearch(value);
                }}

                searchPlaceholder={
                    "Search announcement history..."
                }

                showAdd={canAdd}

                addText="New Announcement"

                onAdd={() =>
                    setShowCreate(true)
                }

                showExport={canView}

                onExport={handleExport}

                showBulk={canAdd}

                onBulk={() =>
                    setShowBulkUpload(true)
                }

                showDeleteAll={canDelete}

                onDeleteAll={
                    handleDeleteAll
                }
            >

                <button
                    type="button"
                    className="toolbar-btn announcement-clear-toolbar-btn"
                    onClick={clearFilters}
                    disabled={
                        !search &&
                        !startDate &&
                        !endDate
                    }
                >

                    <FaTimes />

                    Clear Filters

                </button>

            </PageToolbar>

            {/* ==================================================
                DATE FILTERS
            ================================================== */}

            <div className="announcement-filters">

                <label>

                    <span>
                        Start Date
                    </span>

                    <div className="date-field">

                        <FaCalendarAlt />

                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(
                                    e.target.value
                                );
                            }}
                        />

                    </div>

                </label>


                <label>

                    <span>
                        End Date
                    </span>

                    <div className="date-field">

                        <FaCalendarAlt />

                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(
                                    e.target.value
                                );
                            }}
                        />

                    </div>

                </label>

            </div>

            {/* ==================================================
                CONTENT
            ================================================== */}

            {loading ? (

                <div className="announcement-empty">

                    Loading announcements...

                </div>

            ) : announcements.length === 0 ? (

                <div className="announcement-empty">

                    <FaBullhorn />

                    <h3>
                        No announcements yet
                    </h3>

                    <p>
                        Published announcements
                        will appear here.
                    </p>

                </div>

            ) : (

                <>

                    {/* ==================================================
                        PINNED ANNOUNCEMENT
                    ================================================== */}

                    {pinned && (

                        <section className="announcement-section">

                            <div className="section-heading">

                                <span>
                                    <FaThumbtack />
                                    Pinned Announcement
                                </span>

                            </div>

                            <AnnouncementCard

                                item={pinned}

                                featured={true}

                                fileUrl={
                                    fileUrl(pinned)
                                }

                                canEdit={canEdit}

                                canDelete={
                                    canDelete
                                }

                                onOpen={
                                    openAnnouncement
                                }

                                onPrint={
                                    printAnnouncement
                                }

                                onEdit={
                                    openEdit
                                }

                                onDelete={
                                    deleteAnnouncement
                                }

                            />

                        </section>

                    )}

                    {/* ==================================================
                        LATEST
                        
                        IMPORTANT:
                        ALL announcements are rendered.
                        
                        No:
                        PAGE_SIZE
                        slice()
                        pagination
                        
                        Horizontal scrolling is used.
                    ================================================== */}

                    <section className="announcement-section">

                        <div className="section-heading">

                            <span>
                                <FaBullhorn />
                                Latest
                            </span>

                            <small>
                                {latest.length}
                                {" "}
                                announcement
                                {latest.length === 1
                                    ? ""
                                    : "s"}
                            </small>

                        </div>


                        {/* ==================================================
                            HORIZONTAL SCROLL CONTAINER
                        ================================================== */}

                        <div
                            className="announcement-grid announcement-horizontal-scroll"

                            style={{
                                display:
                                    "flex",

                                flexDirection:
                                    "row",

                                flexWrap:
                                    "nowrap",

                                overflowX:
                                    "auto",

                                overflowY:
                                    "hidden",

                                gap:
                                    "24px",

                                width:
                                    "100%",

                                paddingBottom:
                                    "18px",

                                scrollBehavior:
                                    "smooth",

                                WebkitOverflowScrolling:
                                    "touch",
                            }}
                        >

                            {latest.map(
                                (item) => (

                                    <AnnouncementCard

                                        key={
                                            item.id
                                        }

                                        item={
                                            item
                                        }

                                        fileUrl={
                                            fileUrl(
                                                item
                                            )
                                        }

                                        canEdit={
                                            canEdit
                                        }

                                        canDelete={
                                            canDelete
                                        }

                                        onOpen={
                                            openAnnouncement
                                        }

                                        onPrint={
                                            printAnnouncement
                                        }

                                        onEdit={
                                            openEdit
                                        }

                                        onDelete={
                                            deleteAnnouncement
                                        }

                                        horizontal
                                    />

                                )
                            )}

                        </div>

                    </section>


                    {/* ==================================================
                        HISTORY
                    ================================================== */}

                    <section className="announcement-section">

                        <div className="section-heading">

                            <span>
                                History
                            </span>

                            <small>
                                {announcements.length}
                                {" "}
                                total
                            </small>

                        </div>


                        <div className="announcement-history">

                            {announcements.map(
                                (item) => (

                                    <button
                                        key={
                                            item.id
                                        }

                                        type="button"

                                        className="history-row"

                                        onClick={() =>
                                            openAnnouncement(
                                                item
                                            )
                                        }
                                    >

                                        <span className="history-icon">

                                            {isImage(
                                                item.attachment_original_name
                                            ) ? (

                                                <FaImage />

                                            ) : item.attachment_path ? (

                                                <FaFile />

                                            ) : (

                                                <FaBullhorn />

                                            )}

                                        </span>


                                        <span className="history-main">

                                            <strong>
                                                {item.title}
                                            </strong>

                                            <small>
                                                {new Date(
                                                    item.published_at ||
                                                        item.created_at
                                                ).toLocaleString()}
                                            </small>

                                        </span>


                                        <span className="history-audience">

                                            {formatAudience(
                                                item.audience
                                            )}

                                        </span>


                                        <span
                                            className={`read-state ${
                                                item.in_app_status ===
                                                "read"
                                                    ? "read"
                                                    : ""
                                            }`}
                                        >

                                            {item.in_app_status ===
                                            "read"
                                                ? "Read"
                                                : "Unread"}

                                        </span>


                                        {Number(
                                            item.is_pinned
                                        ) === 1 && (

                                            <FaThumbtack
                                                className="history-pin"
                                                title="Pinned"
                                            />

                                        )}

                                    </button>

                                )
                            )}

                        </div>

                    </section>

                </>

            )}


            {/* ==================================================
                VIEW MODAL
            ================================================== */}

            {selected && (

                <AnnouncementView

                    item={
                        selected
                    }

                    fileUrl={
                        fileUrl(selected)
                    }

                    canEdit={
                        canEdit
                    }

                    canDelete={
                        canDelete
                    }

                    onClose={() =>
                        setSelected(null)
                    }

                    onPrint={() =>
                        printAnnouncement(
                            selected
                        )
                    }

                    onEdit={() =>
                        openEdit(
                            selected
                        )
                    }

                    onDelete={() =>
                        deleteAnnouncement(
                            selected.id
                        )
                    }

                />

            )}


            {/* ==================================================
                CREATE / EDIT MODAL
            ================================================== */}

            {(showCreate || editing) && (

                <CreateAnnouncementModal

                    editingItem={
                        editing
                    }

                    onClose={() => {

                        setShowCreate(
                            false
                        );

                        setEditing(
                            null
                        );

                    }}

                    onSuccess={async () => {

                        setShowCreate(
                            false
                        );

                        setEditing(
                            null
                        );

                        await load();

                    }}

                />

            )}


            {/* ==================================================
                BULK UPLOAD
            ================================================== */}

            {canAdd && (

                <BulkUploadModal

                    isOpen={
                        showBulkUpload
                    }

                    onClose={() =>
                        setShowBulkUpload(
                            false
                        )
                    }

                    onSuccess={async () => {

                        setShowBulkUpload(
                            false
                        );

                        await load();

                    }}

                    uploadFunction={
                        announcementService.bulkUpload
                    }

                    title={
                        "Bulk Upload Announcements"
                    }

                    acceptedFile={
                        ".csv,.xlsx,.xls"
                    }

                    sampleFile={
                        "/announcement-bulk-template.csv"
                    }

                />

            )}

        </div>
    );
}

// ======================================================
// AUDIENCE FORMAT
// ======================================================

function formatAudience(
    audience
) {

    const map = {

        everyone:
            "Everyone",

        managers:
            "Managers",

        users:
            "Users",

        specific:
            "Specific Users",

    };

    return (
        map[audience] ||
        audience ||
        "Everyone"
    );
}

// ======================================================
// ANNOUNCEMENT CARD
//
// NEW STRUCTURE:
//
// ┌──────────────────────────────┐
// │                              │
// │       IMAGE / PDF            │
// │       FULL WIDTH             │
// │                              │
// ├──────────────────────────────┤
// │ Pinned / New                 │
// │                              │
// │ Title                        │
// │ Message                      │
// │                              │
// │ Date  Audience  Created By   │
// │                              │
// │ View Download Print Edit    │
// │ Delete                       │
// └──────────────────────────────┘
//
// ======================================================

function AnnouncementCard({
    item,
    featured,
    fileUrl,
    canEdit,
    canDelete,
    onOpen,
    onPrint,
    onEdit,
    onDelete,
    horizontal,
}) {

    return (

        <article
            className={`
                announcement-card
                ${featured ? "featured" : ""}
                ${horizontal ? "horizontal-announcement-card" : ""}
                ${
                    item.in_app_status !==
                    "read"
                        ? "unread"
                        : ""
                }
            `}

            style={
                horizontal
                    ? {
                          flex:
                              "0 0 calc(50% - 12px)",

                          minWidth:
                              "calc(50% - 12px)",

                          maxWidth:
                              "calc(50% - 12px)",

                          height:
                              "620px",

                          display:
                              "flex",

                          flexDirection:
                              "column",

                          overflow:
                              "hidden",

                          boxSizing:
                              "border-box",
                      }
                    : {
                          width:
                              "100%",

                          display:
                              "flex",

                          flexDirection:
                              "column",

                          overflow:
                              "hidden",
                      }
            }
        >

            {/* ==================================================
                FULL WIDTH PREVIEW
            ================================================== */}

            <div
                className="announcement-card-preview"

                style={{
                    width:
                        "100%",

                    flexShrink:
                        0,

                    overflow:
                        "hidden",
                }}
            >

                {fileUrl &&
                isImage(
                    item.attachment_original_name
                ) ? (

                    <img
                        className="announcement-image-preview"

                        src={
                            fileUrl
                        }

                        alt={
                            item.attachment_original_name ||
                            item.title
                        }

                        style={{
                            width:
                                "100%",

                            height:
                                horizontal
                                    ? "360px"
                                    : "500px",

                            display:
                                "block",

                            objectFit:
                                "contain",

                            background:
                                "#eef3f5",
                        }}
                    />

                ) : fileUrl &&
                  isPdf(
                      item.attachment_original_name
                  ) ? (

                    <iframe

                        title={
                            item.title
                        }

                        src={`${fileUrl}#toolbar=1&navpanes=0`}

                        style={{
                            width:
                                "100%",

                            height:
                                horizontal
                                    ? "360px"
                                    : "520px",

                            display:
                                "block",

                            border:
                                "none",

                            background:
                                "#eef3f5",
                        }}

                    />

                ) : (

                    <div
                        className="announcement-document"

                        style={{
                            width:
                                "100%",

                            height:
                                horizontal
                                    ? "360px"
                                    : "300px",

                            display:
                                "flex",

                            flexDirection:
                                "column",

                            alignItems:
                                "center",

                            justifyContent:
                                "center",

                            gap:
                                "12px",

                            background:
                                "#eef3f5",
                        }}
                    >

                        {fileUrl ? (
                            <FaFile />
                        ) : (
                            <FaBullhorn />
                        )}

                        <span>
                            {
                                item.attachment_original_name ||
                                "Announcement"
                            }
                        </span>

                    </div>

                )}

            </div>


            {/* ==================================================
                CONTENT BELOW IMAGE / PDF
            ================================================== */}

            <div
                className="announcement-card-body"

                style={{
                    width:
                        "100%",

                    flex:
                        "1",

                    display:
                        "flex",

                    flexDirection:
                        "column",

                    boxSizing:
                        "border-box",

                    overflow:
                        "hidden",
                }}
            >

                {/* ==================================================
                    BADGES
                ================================================== */}

                <div className="announcement-card-top">

                    {Number(
                        item.is_pinned
                    ) === 1 && (

                        <span className="pinned-badge">

                            <FaThumbtack />

                            Pinned

                        </span>

                    )}

                    {item.in_app_status !==
                        "read" && (

                        <span className="new-badge">

                            New

                        </span>

                    )}

                </div>


                {/* ==================================================
                    TITLE
                ================================================== */}

                <h3>
                    {item.title}
                </h3>


                {/* ==================================================
                    MESSAGE
                ================================================== */}

                <p
                    style={{
                        overflow:
                            "auto",

                        maxHeight:
                            horizontal
                                ? "100px"
                                : "180px",
                    }}
                >
                    {
                        item.content ||
                        "No description provided."
                    }
                </p>


                {/* ==================================================
                    META
                ================================================== */}

                <div className="announcement-meta">

                    <span>
                        {new Date(
                            item.published_at ||
                                item.created_at
                        ).toLocaleDateString()}
                    </span>

                    <span>
                        {formatAudience(
                            item.audience
                        )}
                    </span>

                    <span>
                        {
                            item.created_by_name ||
                            "MIARCUS"
                        }
                    </span>

                </div>


                {/* ==================================================
                    ACTIONS
                ================================================== */}

                <div
                    className="announcement-actions"

                    style={{
                        marginTop:
                            "auto",

                        flexWrap:
                            "wrap",
                    }}
                >

                    {/* VIEW */}

                    <button
                        type="button"
                        className="primary-action"
                        onClick={() =>
                            onOpen(item)
                        }
                    >
                        View
                    </button>


                    {/* DOWNLOAD */}

                    {fileUrl && (

                        <a
                            href={
                                fileUrl
                            }

                            target="_blank"

                            rel="noreferrer"

                            download={
                                item.attachment_original_name ||
                                true
                            }
                        >

                            <FaDownload />

                            Download

                        </a>

                    )}


                    {/* PRINT */}

                    <button
                        type="button"
                        onClick={() =>
                            onPrint(item)
                        }
                    >

                        <FaPrint />

                        Print

                    </button>


                    {/* EDIT */}

                    {canEdit && (

                        <button
                            type="button"
                            className="edit-action"

                            onClick={() =>
                                onEdit(item)
                            }
                        >

                            <FaEdit />

                            Edit

                        </button>

                    )}


                    {/* DELETE */}

                    {canDelete && (

                        <button
                            type="button"
                            className="delete-action"

                            onClick={() =>
                                onDelete(
                                    item.id
                                )
                            }
                        >

                            <FaTrash />

                            Delete

                        </button>

                    )}

                </div>

            </div>

        </article>
    );
}

// ======================================================
// VIEW MODAL
// ======================================================

function AnnouncementView({
    item,
    fileUrl,
    canEdit,
    canDelete,
    onClose,
    onPrint,
    onEdit,
    onDelete,
}) {

    return (

        <div
            className="announcement-overlay"
            onMouseDown={
                onClose
            }
        >

            <div
                className="announcement-view-modal"
                onMouseDown={(e) =>
                    e.stopPropagation()
                }
            >

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="announcement-view-header">

                    <div>

                        <span className="modal-eyebrow">

                            <FaBullhorn />

                            Announcement

                        </span>

                        <h2>
                            {item.title}
                        </h2>

                        <div className="view-submeta">

                            <span>
                                {formatAudience(
                                    item.audience
                                )}
                            </span>

                            <span>
                                {new Date(
                                    item.published_at ||
                                        item.created_at
                                ).toLocaleString()}
                            </span>

                        </div>

                    </div>


                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >

                        <FaTimes />

                    </button>

                </div>


                {/* ==================================================
                    IMAGE
                ================================================== */}

                {fileUrl &&
                    isImage(
                        item.attachment_original_name
                    ) && (

                        <div className="announcement-full-image-wrap">

                            <img
                                className="announcement-full-image"

                                src={
                                    fileUrl
                                }

                                alt={
                                    item.attachment_original_name ||
                                    item.title
                                }
                            />

                        </div>

                    )}


                {/* ==================================================
                    PDF
                ================================================== */}

                {fileUrl &&
                    isPdf(
                        item.attachment_original_name
                    ) && (

                        <iframe
                            className="announcement-full-pdf"

                            title={
                                item.title
                            }

                            src={
                                fileUrl
                            }
                        />

                    )}


                {/* ==================================================
                    CONTENT
                ================================================== */}

                <div className="announcement-view-content">

                    <p>
                        {
                            item.content ||
                            "No description provided."
                        }
                    </p>


                    {item.attachment_original_name &&
                        fileUrl && (

                            <a
                                className="attachment-chip"

                                href={
                                    fileUrl
                                }

                                target="_blank"

                                rel="noreferrer"
                            >

                                {isImage(
                                    item.attachment_original_name
                                ) ? (
                                    <FaImage />
                                ) : (
                                    <FaPaperclip />
                                )}

                                {
                                    item.attachment_original_name
                                }

                            </a>

                        )}

                </div>


                {/* ==================================================
                    FOOTER ACTIONS
                ================================================== */}

                <div className="announcement-view-footer">

                    <span>
                        Published by{" "}
                        {
                            item.created_by_name ||
                            "MIARCUS"
                        }
                    </span>


                    <div>

                        {/* DOWNLOAD */}

                        {fileUrl && (

                            <a
                                className="secondary-btn"

                                href={
                                    fileUrl
                                }

                                target="_blank"

                                rel="noreferrer"

                                download={
                                    item.attachment_original_name ||
                                    true
                                }
                            >

                                <FaDownload />

                                Download

                            </a>

                        )}


                        {/* PRINT */}

                        <button
                            type="button"
                            className="secondary-btn"

                            onClick={
                                onPrint
                            }
                        >

                            <FaPrint />

                            Print

                        </button>


                        {/* EDIT / UNPIN */}

                        {canEdit && (

                            <button
                                type="button"

                                className="secondary-btn edit-view-btn"

                                onClick={
                                    onEdit
                                }
                            >

                                <FaEdit />

                                Edit / Unpin

                            </button>

                        )}


                        {/* DELETE */}

                        {canDelete && (

                            <button
                                type="button"

                                className="danger-btn"

                                onClick={
                                    onDelete
                                }
                            >

                                <FaTrash />

                                Delete

                            </button>

                        )}

                    </div>

                </div>

            </div>

        </div>

    );
}

// ======================================================
// CREATE / EDIT MODAL
// ======================================================

function CreateAnnouncementModal({
    editingItem,
    onClose,
    onSuccess,
}) {

    const isEditing =
        Boolean(editingItem);

    const [title, setTitle] =
        useState(
            editingItem?.title || ""
        );

    const [content, setContent] =
        useState(
            editingItem?.content || ""
        );

    const [audience, setAudience] =
        useState(
            editingItem?.audience ||
                "everyone"
        );

    const [specificUsers, setSpecificUsers] =
        useState([]);

    const [userSearch, setUserSearch] =
        useState("");

    const [users, setUsers] =
        useState([]);

    const [file, setFile] =
        useState(null);

    const [removeAttachment, setRemoveAttachment] =
        useState(false);

    const [isPinned, setIsPinned] =
        useState(
            Number(
                editingItem?.is_pinned
            ) === 1
        );

    const [saving, setSaving] =
        useState(false);

    // ==================================================
    // LOAD SELECTED USERS
    // ==================================================

    useEffect(() => {

        let active = true;

        const loadSelectedUsers =
            async () => {

                if (
                    !editingItem ||
                    editingItem.audience !==
                        "specific"
                ) {
                    return;
                }

                try {

                    const data =
                        await announcementService.getRecipients(
                            editingItem.id
                        );

                    if (active) {

                        setSpecificUsers(
                            data.users || []
                        );
                    }

                } catch (error) {

                    console.error(
                        "Announcement recipients:",
                        error
                    );
                }
            };

        loadSelectedUsers();

        return () => {
            active = false;
        };

    }, [editingItem]);

    // ==================================================
    // LOAD USERS
    // ==================================================

    useEffect(() => {

        if (
            audience !== "specific"
        ) {
            return;
        }

        const timer =
            setTimeout(
                async () => {

                    try {

                        const data =
                            await announcementService.getUsers(
                                userSearch
                            );

                        setUsers(
                            data.users || []
                        );

                    } catch (error) {

                        console.error(
                            "Announcement users:",
                            error
                        );
                    }

                },
                250
            );

        return () =>
            clearTimeout(timer);

    }, [
        audience,
        userSearch,
    ]);

    // ==================================================
    // SELECT USER
    // ==================================================

    const toggleUser =
        (selectedUser) => {

            setSpecificUsers(
                (prev) =>
                    prev.some(
                        (u) =>
                            u.id ===
                            selectedUser.id
                    )
                        ? prev.filter(
                              (u) =>
                                  u.id !==
                                  selectedUser.id
                          )
                        : [
                              ...prev,
                              selectedUser,
                          ]
            );
        };

    // ==================================================
    // SUBMIT
    // ==================================================

    const submit = async (e) => {

        e.preventDefault();

        if (!title.trim()) {

            alert(
                "Title is required"
            );

            return;
        }

        if (
            audience === "specific" &&
            !specificUsers.length
        ) {

            alert(
                "Select at least one user"
            );

            return;
        }

        const form =
            new FormData();

        form.append(
            "title",
            title
        );

        form.append(
            "content",
            content
        );

        form.append(
            "audience",
            audience
        );

        form.append(
            "specificUserIds",
            JSON.stringify(
                specificUsers.map(
                    (u) => u.id
                )
            )
        );

        form.append(
            "isPinned",
            String(isPinned)
        );

        form.append(
            "removeAttachment",
            String(
                removeAttachment
            )
        );

        if (file) {

            form.append(
                "attachment",
                file
            );
        }

        try {

            setSaving(true);

            if (isEditing) {

                await announcementService.update(
                    editingItem.id,
                    form
                );

            } else {

                await announcementService.create(
                    form
                );
            }

            onSuccess();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                    (
                        isEditing
                            ? "Unable to update announcement"
                            : "Unable to publish announcement"
                    )
            );

        } finally {

            setSaving(false);
        }
    };

    // ==================================================
    // MODAL
    // ==================================================

    return (

        <div
            className="announcement-overlay"
            onMouseDown={
                onClose
            }
        >

            <form
                className="announcement-create-modal"

                onSubmit={
                    submit
                }

                onMouseDown={(e) =>
                    e.stopPropagation()
                }
            >

                {/* HEADER */}

                <div className="announcement-view-header">

                    <div>

                        <span className="modal-eyebrow">

                            <FaBullhorn />

                            {
                                isEditing
                                    ? "Edit Announcement"
                                    : "New Announcement"
                            }

                        </span>

                        <h2>

                            {
                                isEditing
                                    ? "Edit Announcement"
                                    : "Create Announcement"
                            }

                        </h2>

                    </div>


                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >

                        <FaTimes />

                    </button>

                </div>


                {/* FORM */}

                <div className="form-grid">

                    <label className="full">

                        <span>
                            Title *
                        </span>

                        <input
                            value={
                                title
                            }

                            onChange={(e) =>
                                setTitle(
                                    e.target.value
                                )
                            }

                            placeholder={
                                "Announcement title"
                            }
                        />

                    </label>


                    <label className="full">

                        <span>
                            Message
                        </span>

                        <textarea
                            value={
                                content
                            }

                            onChange={(e) =>
                                setContent(
                                    e.target.value
                                )
                            }

                            rows={6}

                            placeholder={
                                "Write your announcement..."
                            }
                        />

                    </label>


                    <label>

                        <span>
                            Send To *
                        </span>

                        <select
                            value={
                                audience
                            }

                            onChange={(e) =>
                                setAudience(
                                    e.target.value
                                )
                            }
                        >

                            <option value="everyone">
                                Everyone
                            </option>

                            <option value="managers">
                                Managers
                            </option>

                            <option value="users">
                                Users
                            </option>

                            <option value="specific">
                                Specific Users
                            </option>

                        </select>

                    </label>


                    <label>

                        <span>

                            {
                                isEditing
                                    ? "Replace Attachment"
                                    : "Attachment"
                            }

                        </span>

                        <input
                            type="file"

                            accept="
                                .pdf,
                                .doc,
                                .docx,
                                .xls,
                                .xlsx,
                                .csv,
                                .jpg,
                                .jpeg,
                                .png,
                                .gif,
                                .webp,
                                .bmp,
                                .svg
                            "

                            onChange={(e) => {

                                setFile(
                                    e.target.files?.[0] ||
                                        null
                                );

                                setRemoveAttachment(
                                    false
                                );

                            }}
                        />

                    </label>

                </div>


                {/* CURRENT ATTACHMENT */}

                {isEditing &&
                    editingItem?.attachment_original_name &&
                    !file && (

                        <div className="current-attachment-box">

                            <div>

                                <span className="current-attachment-icon">

                                    {isImage(
                                        editingItem.attachment_original_name
                                    ) ? (
                                        <FaImage />
                                    ) : (
                                        <FaPaperclip />
                                    )}

                                </span>

                                <div>

                                    <strong>
                                        Current attachment
                                    </strong>

                                    <small>
                                        {
                                            editingItem.attachment_original_name
                                        }
                                    </small>

                                </div>

                            </div>


                            <label className="remove-attachment-check">

                                <input
                                    type="checkbox"

                                    checked={
                                        removeAttachment
                                    }

                                    onChange={(e) =>
                                        setRemoveAttachment(
                                            e.target.checked
                                        )
                                    }
                                />

                                Remove attachment

                            </label>

                        </div>

                    )}


                {/* SPECIFIC USERS */}

                {audience ===
                    "specific" && (

                    <div className="specific-users-box">

                        <div className="specific-users-title">

                            <span>

                                <FaUsers />

                                Select Users

                            </span>

                            <strong>
                                {
                                    specificUsers.length
                                }{" "}
                                selected
                            </strong>

                        </div>


                        <div className="announcement-search compact">

                            <FaSearch />

                            <input
                                value={
                                    userSearch
                                }

                                onChange={(e) =>
                                    setUserSearch(
                                        e.target.value
                                    )
                                }

                                placeholder={
                                    "Search users..."
                                }
                            />

                        </div>


                        <div className="user-picker-list">

                            {users.map(
                                (user) => {

                                    const selected =
                                        specificUsers.some(
                                            (u) =>
                                                u.id ===
                                                user.id
                                        );

                                    return (

                                        <button
                                            type="button"

                                            key={
                                                user.id
                                            }

                                            className={`user-picker-row ${
                                                selected
                                                    ? "selected"
                                                    : ""
                                            }`}

                                            onClick={() =>
                                                toggleUser(
                                                    user
                                                )
                                            }
                                        >

                                            <span className="user-avatar">

                                                <FaUser />

                                            </span>


                                            <span>

                                                <strong>
                                                    {
                                                        user.name
                                                    }
                                                </strong>

                                                <small>

                                                    {
                                                        user.email
                                                    }

                                                    {
                                                        user.designation
                                                            ? ` • ${user.designation}`
                                                            : ""
                                                    }

                                                </small>

                                            </span>


                                            <span className="user-check">

                                                {
                                                    selected
                                                        ? "Selected"
                                                        : "Select"
                                                }

                                            </span>

                                        </button>

                                    );
                                }
                            )}

                        </div>

                    </div>

                )}


                {/* PIN */}

                <label className="pin-checkbox">

                    <input
                        type="checkbox"

                        checked={
                            isPinned
                        }

                        onChange={(e) =>
                            setIsPinned(
                                e.target.checked
                            )
                        }
                    />

                    <span>

                        <FaThumbtack />

                        {
                            isEditing &&
                            Number(
                                editingItem?.is_pinned
                            ) === 1
                                ? "Keep this announcement pinned"
                                : "Pin this announcement"
                        }

                    </span>

                </label>


                {/* UNPIN INFORMATION */}

                {isEditing &&
                    Number(
                        editingItem?.is_pinned
                    ) === 1 && (

                        <div className="unpin-hint">

                            Uncheck the pin option
                            and save to{" "}

                            <strong>
                                unpin
                            </strong>

                            {" "}this announcement.

                        </div>

                    )}


                {/* FOOTER */}

                <div className="create-footer">

                    <button
                        type="button"
                        className="secondary-btn"
                        onClick={
                            onClose
                        }
                    >

                        Cancel

                    </button>


                    <button
                        type="submit"
                        className="announcement-primary-btn"
                        disabled={
                            saving
                        }
                    >

                        {
                            saving
                                ? "Saving..."
                                : isEditing
                                ? "Save Changes"
                                : "Publish Announcement"
                        }

                    </button>

                </div>

            </form>

        </div>

    );
}

export default Announcements;