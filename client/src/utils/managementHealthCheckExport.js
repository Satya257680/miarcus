import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const TEMPLATE_URL = "/templates/Store Health Check Report.xlsx";

const text = (value, fallback = "") => {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
};

const clean = (value) =>
    text(value)
        .toLowerCase()
        .replace(/[’']/g, "'")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const dateText = (value) => {
    if (!value) return "";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return text(value);

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const dateTimeText = (value) => {
    if (!value) return "";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return text(value);

    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

const getStore = (stores, storeId, storeName) =>
    (stores || []).find((store) => String(store.id) === String(storeId)) ||
    (stores || []).find(
        (store) =>
            clean(store.store_name) &&
            clean(store.store_name) === clean(storeName)
    ) ||
    {};

const setCell = (ws, address, value, alignment = {}) => {
    const cell = ws.getCell(address);
    cell.value = value ?? "";
    cell.alignment = {
        ...cell.alignment,
        wrapText: true,
        vertical: cell.alignment?.vertical || "center",
        ...alignment,
    };
};

const copyCellStyle = (sourceCell, targetCell) => {
    targetCell.value = sourceCell.value;
    targetCell.style = { ...sourceCell.style };
    targetCell.numFmt = sourceCell.numFmt;
    targetCell.alignment = { ...sourceCell.alignment };
    targetCell.protection = { ...sourceCell.protection };
};

const copyRowStyle = (sourceWs, sourceRowNumber, targetWs, targetRowNumber) => {
    const sourceRow = sourceWs.getRow(sourceRowNumber);
    const targetRow = targetWs.getRow(targetRowNumber);

    targetRow.height = sourceRow.height;
    targetRow.hidden = sourceRow.hidden;

    for (let col = 1; col <= Math.max(sourceWs.columnCount, 5); col += 1) {
        copyCellStyle(sourceRow.getCell(col), targetRow.getCell(col));
    }
};

const copyWorksheetFrame = (source, target) => {
    target.columns = source.columns.map((column) => ({
        width: column.width,
        hidden: column.hidden,
    }));

    // Keep the management template's page/print settings.
    target.pageSetup = { ...source.pageSetup };
    target.pageMargins = { ...source.pageMargins };
    target.views = (source.views || []).map((view) => ({ ...view }));
    target.properties = { ...source.properties };

    // Copy the title/profile area exactly as a visual frame.
    for (let row = 1; row <= 17; row += 1) {
        copyRowStyle(source, row, target, row);
    }

    // Copy the management-style section/header row and a detail-row style.
    copyRowStyle(source, 18, target, 18);
    copyRowStyle(source, 19, target, 19);

    // Re-create the title merge. The original template has A1:E1 merged.
    target.mergeCells("A1:E1");
};

const applyProfile = (ws, record, stores) => {
    const store = getStore(stores, record?.store_id, record?.store_name);

    const profile = [
        ["Store Name", record?.store_name || store.store_name],
        [
            "Store Address",
            store.address ||
                store.store_address ||
                store.location ||
                store.full_address,
        ],
        [
            "Store Region",
            store.region || store.store_region || store.state || record?.state,
        ],
        ["Date of Visit", dateText(record?.submission_date || record?.date)],
        ["Store In Time", record?.store_in_time || record?.in_time],
        ["Store Out Time", record?.store_out_time || record?.out_time],
        [
            "Store Opening Date",
            dateText(store.opening_date || store.store_opening_date),
        ],
        ["Turnover in 2024-25 (value)", record?.turnover_2024_25_value],
        ["Turnover in 2025-26 (value)", record?.turnover_2025_26_value],
        ["Turnover in 2024-25 (qty)", record?.turnover_2024_25_qty],
        ["Turnover in 2025-26 (qty)", record?.turnover_2025_26_qty],
        ["Target for 2026-27", record?.target_2026_27],
    ];

    // The supplied management format reserves rows 4-15 for profile data.
    profile.forEach(([label, value], index) => {
        const row = 4 + index;
        setCell(ws, `A${row}`, index + 1);
        setCell(ws, `B${row}`, label);
        setCell(ws, `C${row}`, value || "");
        setCell(ws, `D${row}`, "");
        setCell(ws, `E${row}`, "");
    });

    // Clear the unused profile row if the source template has fewer fields.
    for (let row = 16; row <= 17; row += 1) {
        for (let col = 1; col <= 5; col += 1) {
            setCell(ws, `${String.fromCharCode(64 + col)}${row}`, "");
        }
    }
};

const groupRecords = (records, mode) => {
    const grouped = new Map();

    for (const record of records) {
        // Checklist answers from the same submission belong together.
        // Manual Action Points without a submission remain individually traceable.
        const fallback = [
            record?.store_id,
            record?.store_name,
            record?.submission_date || record?.date,
            record?.checklist_name,
        ]
            .filter(Boolean)
            .join("|");

        const key =
            record?.submission_id ||
            (mode === "action" ? record?.id : fallback) ||
            record?.id ||
            "report";

        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(record);
    }

    return [...grouped.values()];
};

const uniqueSheetName = (workbook, preferred, index) => {
    const base = text(preferred, `PVR ${index + 1}`)
        .replace(/[\\/*?:[\]]/g, " ")
        .trim()
        .slice(0, 28) || `PVR ${index + 1}`;

    let name = base;
    let suffix = 2;

    while (workbook.getWorksheet(name)) {
        const tail = ` ${suffix}`;
        name = `${base.slice(0, 31 - tail.length)}${tail}`;
        suffix += 1;
    }

    return name;
};

const remarkText = (record, mode) => {
    if (mode === "action") {
        return [
            record?.remarks,
            record?.comment,
            record?.action_taken,
            record?.assigned_to_name || record?.assigned_to
                ? `Assigned To: ${record.assigned_to_name || record.assigned_to}`
                : "",
            record?.completed_at
                ? `Completed At: ${dateTimeText(record.completed_at)}`
                : "",
        ]
            .filter(Boolean)
            .join(" | ");
    }

    return [
        record?.remarks,
        record?.action_point_comment,
        record?.action_point_remarks,
        record?.action_taken,
        record?.action_point_completed_at
            ? `Completed At: ${dateTimeText(record.action_point_completed_at)}`
            : "",
    ]
        .filter(Boolean)
        .join(" | ");
};

const benchmarkText = (record, mode) => {
    if (mode !== "action") {
        return record?.benchmark || record?.benchmark_value || "";
    }

    return [
        record?.department_name || record?.department
            ? `Department: ${record.department_name || record.department}`
            : "",
        record?.priority ? `Priority: ${record.priority}` : "",
        record?.sla_days !== undefined && record?.sla_days !== null && record?.sla_days !== ""
            ? `SLA: ${record.sla_days}`
            : "",
    ]
        .filter(Boolean)
        .join(" | ");
};

const statusText = (record, mode) => {
    if (mode === "action") {
        return [record?.status, record?.answer ? `Answer: ${record.answer}` : ""]
            .filter(Boolean)
            .join(" | ");
    }

    return text(record?.answer || record?.status, "");
};

const questionText = (record) =>
    text(record?.question || record?.question_text, "Question not available");

const populateDetails = (ws, source, records, mode) => {
    // Start with the management template's section/header appearance.
    copyRowStyle(source, 18, ws, 18);
    copyRowStyle(source, 19, ws, 19);

    setCell(ws, "A18", "I");
    setCell(ws, "B18", mode === "action" ? "Action Point Details" : "Checklist Details");
    setCell(ws, "C18", "Benchmark");
    setCell(ws, "D18", "Status");
    setCell(ws, "E18", "Remark");

    let rowNumber = 19;

    records.forEach((record, index) => {
        if (rowNumber !== 19) copyRowStyle(source, 19, ws, rowNumber);

        setCell(ws, `A${rowNumber}`, index + 1, { horizontal: "center" });
        setCell(ws, `B${rowNumber}`, questionText(record));
        setCell(ws, `C${rowNumber}`, benchmarkText(record, mode));
        setCell(ws, `D${rowNumber}`, statusText(record, mode));
        setCell(ws, `E${rowNumber}`, remarkText(record, mode));

        // Larger questions/remarks should remain readable in Excel.
        ws.getRow(rowNumber).height = 30;
        rowNumber += 1;
    });

    // Keep the management template's Note section in BOTH exports.
    // The note is read from the supplied XLSX template so it stays editable
    // and can be changed later in the template without changing this code.
    const noteSourceRow = (source.getColumn(1)?.values || []).findIndex(
        (value) => clean(value) === "note",
    );
    const sourceNoteHeaderRow = noteSourceRow > 0 ? noteSourceRow : 125;
    const sourceNoteTextRow = sourceNoteHeaderRow + 1;

    const noteHeaderRow = rowNumber + 1;
    const noteTextRow = noteHeaderRow + 1;

    copyRowStyle(source, sourceNoteHeaderRow, ws, noteHeaderRow);
    copyRowStyle(source, sourceNoteTextRow, ws, noteTextRow);

    ws.mergeCells(`A${noteTextRow}:E${noteTextRow}`);
    setCell(ws, `A${noteHeaderRow}`, source.getCell(sourceNoteHeaderRow, 1).value || "Note");
    setCell(
        ws,
        `A${noteTextRow}`,
        source.getCell(sourceNoteTextRow, 1).value || "",
        { horizontal: "left", vertical: "center", wrapText: true },
    );

    // Preserve a readable note area when the management note is long.
    ws.getRow(noteTextRow).height = Math.max(
        source.getRow(sourceNoteTextRow).height || 30,
        42,
    );

    // Generated footer remains below the Note section.
    const footerRow = noteTextRow + 2;
    copyRowStyle(source, 125, ws, footerRow);
    copyRowStyle(source, 126, ws, footerRow + 1);

    ws.mergeCells(`A${footerRow}:E${footerRow}`);
    setCell(ws, `A${footerRow}`, "Generated by Miarcus Management Portal");
    setCell(
        ws,
        `A${footerRow + 1}`,
        `Source: ${mode === "action" ? "Action Points" : "Checklist Reports"}. Questions and answers are taken dynamically from the selected records.`,
    );
    ws.mergeCells(`A${footerRow + 1}:E${footerRow + 1}`);
    ws.getRow(footerRow + 1).height = 28;

    ws.autoFilter = `A18:E${Math.max(18, rowNumber - 1)}`;

    // Do NOT freeze the profile/header rows. The entire management report,
    // including the top profile area and Note section, must scroll normally.
    ws.views = [{ state: "normal", showGridLines: true }];
};

const createSheet = (workbook, source, group, stores, mode, index) => {
    const first = group[0] || {};
    const store = getStore(stores, first?.store_id, first?.store_name);
    const checklistName = text(first?.checklist_name, "Store Health Check");
    const preferredName =
        mode === "action"
            ? `PVR - ${text(first?.store_name, "Action Points")}`
            : `PVR - ${text(first?.store_name, checklistName)}`;

    const ws = workbook.addWorksheet(uniqueSheetName(workbook, preferredName, index));
    copyWorksheetFrame(source, ws);

    // Replace the copied source values with a clean dynamic management report.
    setCell(ws, "A1", "STORE HEALTH CHECK REPORT ( MIARCUS )");
    applyProfile(ws, first, stores);

    // Add report metadata in the otherwise unused profile area.
    setCell(ws, "A16", "Report Type");
    setCell(ws, "B16", mode === "action" ? "Action Points" : "Checklist Reports");
    setCell(ws, "C16", checklistName);
    setCell(ws, "A17", "Store");
    setCell(ws, "B17", first?.store_name || store.store_name || "");
    setCell(ws, "C17", first?.city || store.city || "");
    setCell(ws, "D17", first?.state || store.state || "");
    setCell(ws, "E17", dateTimeText(first?.submission_date || first?.created_at));

    populateDetails(ws, source, group, mode);

    ws.pageSetup = {
        ...source.pageSetup,
        printArea: `A1:E${ws.rowCount}`,
        fitToWidth: 1,
        fitToHeight: 0,
        orientation: "landscape",
    };
    ws.pageMargins = { ...source.pageMargins };

    return ws;
};

export const exportManagementHealthCheck = async ({
    records = [],
    stores = [],
    mode = "checklist",
    filename = "Store_Health_Check_Report.xlsx",
}) => {
    if (!records.length) throw new Error("No records found for export.");

    const response = await fetch(TEMPLATE_URL);
    if (!response.ok) {
        throw new Error("Management export template could not be loaded.");
    }

    const buffer = await response.arrayBuffer();
    const sourceWorkbook = new ExcelJS.Workbook();
    await sourceWorkbook.xlsx.load(buffer);

    const sourceTemplate =
        sourceWorkbook.getWorksheet("PVR ") || sourceWorkbook.worksheets[0];

    if (!sourceTemplate) {
        throw new Error("Management export template is invalid.");
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Miarcus Management Portal";
    workbook.created = new Date();
    workbook.modified = new Date();

    const groups = groupRecords(records, mode);
    groups.forEach((group, index) => {
        createSheet(workbook, sourceTemplate, group, stores, mode, index);
    });

    const output = await workbook.xlsx.writeBuffer();

    saveAs(
        new Blob([output], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename,
    );
};
