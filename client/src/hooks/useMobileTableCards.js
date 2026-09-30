import { useEffect } from "react";

// ==========================================================
// useMobileTableCards
// ----------------------------------------------------------
// Phones only. Every module in the portal shows its records in
// a wide <table> (8–12 columns). On a 360px screen that table
// either scrolls sideways or squeezes the columns until the
// names are cut off ("Poo…", "Sal…") — see Attendance Reports,
// NSO Rules, Checklist Tracker, Users, Billing, etc.
//
// Instead of rewriting 30+ pages, this hook turns every table
// on the page into app-style cards on phones:
//
//   • each <td> gets data-label="<column header>"  (shown by CSS)
//   • the first real column becomes the card title  (.m-primary)
//   • the "Actions" column becomes the card footer   (.m-actions)
//   • an empty-header column holding only a button
//     (expand / select) floats in the card corner   (.m-tool)
//   • colSpan cells (empty states / detail rows) go full width
//
// All visual rules live in styles/mobile/MobileModules.css and
// are scoped to `.layout--mobile`, so laptops / desktops /
// tablets are untouched.
//
// Opt-out for a specific table: add class "m-keep-table" to the
// <table> (or any ancestor with data-m-keep).
// ==========================================================

const ACTIONS_RE = /^(actions?|action|options|manage|operations?)$/i;

const headerCells = (table) => {
    const thead = table.tHead;
    if (!thead || thead.rows.length !== 1) return null;

    const labels = [];
    for (const th of Array.from(thead.rows[0].cells)) {
        if (th.rowSpan > 1) return null;
        const text = (th.innerText || th.textContent || "").replace(/\s+/g, " ").trim();
        const span = Math.max(1, th.colSpan || 1);
        for (let i = 0; i < span; i += 1) labels.push(i === 0 ? text : "");
    }
    return labels;
};

const isBlankCell = (td) =>
    !td.querySelector("img, svg, button, input, select, textarea, a, video, canvas") &&
    !(td.textContent || "").trim();

const onlyControl = (td) => {
    const controls = td.querySelectorAll("button, input[type='checkbox'], input[type='radio']");
    if (controls.length !== 1) return false;
    const clone = (td.textContent || "").trim();
    return clone.length <= 2;
};

function processTable(table) {
    if (table.classList.contains("m-keep-table") || table.closest("[data-m-keep]")) return;

    const labels = headerCells(table);
    if (!labels || labels.length < 2) return;

    const signature = labels.join("|");
    if (table.dataset.mSig !== signature) {
        table.dataset.mSig = signature;
        table.classList.add("m-cards");
        // force every row to be re-labelled when headers change
        table.querySelectorAll("tbody tr[data-m-done]").forEach((tr) => tr.removeAttribute("data-m-done"));
    }

    const primaryIndex = labels.findIndex((label) => label && !ACTIONS_RE.test(label));

    Array.from(table.tBodies).forEach((tbody) => {
        Array.from(tbody.rows).forEach((tr) => {
            const cells = Array.from(tr.cells);
            const key = `${cells.length}`;
            if (tr.dataset.mDone === key && !cells.some((td) => !td.hasAttribute("data-m-cell"))) return;

            let col = 0;
            let visibleCount = 0;

            cells.forEach((td) => {
                const span = Math.max(1, td.colSpan || 1);
                const label = labels[col] || "";
                td.setAttribute("data-m-cell", "");

                td.classList.remove("m-primary", "m-actions", "m-tool", "m-full", "m-empty");

                if (span > 1 && (span >= labels.length - 1 || cells.length <= 2)) {
                    td.classList.add("m-full");
                    td.removeAttribute("data-label");
                } else {
                    if (!td.hasAttribute("data-label") || td.dataset.mAuto === "1") {
                        td.setAttribute("data-label", label);
                        td.dataset.mAuto = "1";
                    }
                    const role = td.dataset.mRole;
                    if (role === "primary" || (!role && col === primaryIndex)) td.classList.add("m-primary");
                    else if (role === "actions" || (!role && ACTIONS_RE.test(label))) td.classList.add("m-actions");
                    else if (!label && onlyControl(td)) td.classList.add("m-tool");
                    else if (!label && isBlankCell(td)) td.classList.add("m-empty");
                }

                if (!td.classList.contains("m-empty")) visibleCount += 1;
                col += span;
            });

            tr.classList.toggle("m-row-single", visibleCount <= 1);
            tr.dataset.mDone = key;
        });
    });
}

export default function useMobileTableCards(enabled) {
    useEffect(() => {
        if (!enabled || typeof MutationObserver === "undefined") return undefined;

        let frame = 0;

        const run = () => {
            frame = 0;
            document.querySelectorAll(".layout--mobile table, .m-sheet table, .modal-overlay table").forEach((table) => {
                try {
                    processTable(table);
                } catch {
                    /* never break a page because of a layout helper */
                }
            });
        };

        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(run);
        };

        const observer = new MutationObserver(schedule);
        observer.observe(document.body, { childList: true, subtree: true });
        schedule();

        return () => {
            observer.disconnect();
            if (frame) window.cancelAnimationFrame(frame);
            document.querySelectorAll("table.m-cards").forEach((table) => {
                table.classList.remove("m-cards");
                table.removeAttribute("data-m-sig");
            });
        };
    }, [enabled]);
}
