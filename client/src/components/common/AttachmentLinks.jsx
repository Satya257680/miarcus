import { useState } from "react";
import { createPortal } from "react-dom";
import { FaPaperclip, FaExternalLinkAlt, FaDownload } from "react-icons/fa";
import PremiumModal from "../premium/PremiumModal";
import { attachmentName, hasAttachment, openAttachment } from "../../utils/attachments";
import "../../styles/common/AttachmentLinks.css";

// ======================================================
// ATTACHMENT "VIEW" LINK (shared by every Attachment column)
//
//   • one file   -> "View" opens it straight away (secure /api/files,
//                   new tab; browsers download types they cannot show)
//   • many files -> "View (3)" opens a small list: each file can be
//                   viewed or downloaded on its own
//   • no file    -> the neutral empty marker (default "-"), never a
//                   misleading link
//
// `items` is the server-built list ({ path, name, label, source }) from
// utils/actionPointAttachments.js. `value` is a single raw attachment
// path, for modules that only store one file.
// ======================================================

const normalize = (items, value) => {
    const list = Array.isArray(items)
        ? items
            .map((item) => (typeof item === "string" ? { path: item } : item))
            .filter((item) => item && hasAttachment(item.path))
        : [];

    if (!list.length && hasAttachment(value)) list.push({ path: value });

    const seen = new Set();
    return list.filter((item) => {
        if (seen.has(item.path)) return false;
        seen.add(item.path);
        return true;
    });
};

export default function AttachmentLinks({ items, value, empty = "-", title = "Attachments", subtitle }) {
    const [open, setOpen] = useState(false);
    const files = normalize(items, value);

    if (!files.length) return <span className="att-empty">{empty}</span>;

    if (files.length === 1) {
        const file = files[0];
        return (
            <button
                type="button"
                className="table-link attachment-link-btn"
                onClick={() => openAttachment(file.path)}
                title={file.label ? `${file.label} · ${file.name || attachmentName(file.path)}` : (file.name || attachmentName(file.path))}
            >
                View
            </button>
        );
    }

    return (
        <>
            <button
                type="button"
                className="table-link attachment-link-btn"
                onClick={() => setOpen(true)}
                title={`${files.length} attachments`}
            >
                View <span className="att-count">{files.length}</span>
            </button>

            {/* Portal: the list must not inherit the table cell's styles
                (alignment, colours) or its row click handlers. */}
            {open && createPortal(
                <PremiumModal
                    size="md"
                    eyebrow="Attachments"
                    title={title}
                    subtitle={subtitle || `${files.length} files`}
                    icon={<FaPaperclip />}
                    onClose={() => setOpen(false)}
                >
                    <ul className="att-list">
                        {files.map((file) => (
                            <li key={file.path} className="att-row">
                                <span className="att-icon"><FaPaperclip /></span>
                                <span className="att-text">
                                    <strong>{file.label || "Attachment"}</strong>
                                    <small>
                                        {file.name || attachmentName(file.path)}
                                        {file.source ? ` · ${file.source}` : ""}
                                    </small>
                                </span>
                                <button
                                    type="button"
                                    className="table-link attachment-link-btn"
                                    onClick={() => openAttachment(file.path)}
                                >
                                    View <FaExternalLinkAlt className="att-open" />
                                </button>
                                <button
                                    type="button"
                                    className="att-download"
                                    onClick={() => openAttachment(file.path, { download: true })}
                                    aria-label={`Download ${file.name || attachmentName(file.path)}`}
                                    title="Download"
                                >
                                    <FaDownload />
                                </button>
                            </li>
                        ))}
                    </ul>
                </PremiumModal>,
                document.body
            )}
        </>
    );
}
