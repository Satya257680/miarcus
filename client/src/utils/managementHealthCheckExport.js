import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const TEMPLATE_URL = "/templates/Store Health Check Report.xlsx";

const TEMPLATE_QUESTION_ROWS = [
    ...Array.from({ length: 24 }, (_, i) => 19 + i),
    ...Array.from({ length: 6 }, (_, i) => 45 + i),
    ...Array.from({ length: 9 }, (_, i) => 54 + i),
    ...Array.from({ length: 5 }, (_, i) => 65 + i),
    ...Array.from({ length: 11 }, (_, i) => 72 + i),
    ...Array.from({ length: 8 }, (_, i) => 86 + i),
    ...Array.from({ length: 6 }, (_, i) => 96 + i),
    ...Array.from({ length: 8 }, (_, i) => 104 + i),
    ...Array.from({ length: 10 }, (_, i) => 114 + i),
];

const clean = (value) =>
    String(value ?? "")
        .toLowerCase()
        .replace(/[’']/g, "'")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const text = (value, fallback = "") => {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
};

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

const similarity = (a, b) => {
    const left = clean(a);
    const right = clean(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) return 0.9;
    const aTokens = new Set(left.split(" "));
    const bTokens = new Set(right.split(" "));
    const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
    return (2 * intersection) / (aTokens.size + bTokens.size);
};

const findTemplateQuestionRow = (question, questionMap) => {
    const key = clean(question);
    if (!key) return null;
    if (questionMap.has(key)) return questionMap.get(key);

    let best = { row: null, score: 0 };
    for (const [templateQuestion, row] of questionMap.entries()) {
        const score = similarity(key, templateQuestion);
        if (score > best.score) best = { row, score };
    }
    return best.score >= 0.86 ? best.row : null;
};

const getStore = (stores, storeId) =>
    (stores || []).find((store) => String(store.id) === String(storeId)) || {};

const setCell = (ws, address, value) => {
    const cell = ws.getCell(address);
    cell.value = value ?? "";
    cell.alignment = {
        ...cell.alignment,
        wrapText: true,
        vertical: cell.alignment?.vertical || "center",
    };
};

const buildQuestionMap = (ws) => {
    const map = new Map();
    for (const row of TEMPLATE_QUESTION_ROWS) {
        const question = ws.getCell(`B${row}`).value;
        if (question) map.set(clean(question), row);
    }
    return map;
};

const applyProfile = (ws, record, stores) => {
    const store = getStore(stores, record?.store_id);
    const profile = {
        4: record?.store_name || store.store_name,
        5: store.address || store.store_address || store.location || store.full_address,
        6: store.region || store.store_region || store.state || record?.state,
        7: record?.submission_date || record?.date,
        8: record?.store_in_time || record?.in_time,
        9: record?.store_out_time || record?.out_time,
        10: store.opening_date || store.store_opening_date,
        11: record?.turnover_2024_25_value,
        12: record?.turnover_2025_26_value,
        13: record?.turnover_2024_25_qty,
        14: record?.turnover_2025_26_qty,
        15: record?.target_2026_27,
    };

    Object.entries(profile).forEach(([row, value]) => {
        if (row === "7") value = dateText(value);
        setCell(ws, `C${row}`, value || "");
    });

};

const putRows = (ws, records, mode) => {
    const questionMap = buildQuestionMap(ws);
    const unmatched = [];

    for (const record of records) {
        const row = findTemplateQuestionRow(record?.question, questionMap);
        if (!row) {
            unmatched.push(record);
            continue;
        }

        const answer = mode === "action"
            ? (record?.answer ?? record?.status ?? "")
            : (record?.answer ?? "");

        const remarks = mode === "action"
            ? [
                record?.comment,
                record?.remarks,
                record?.action_taken,
                record?.status ? `Action Status: ${record.status}` : "",
                record?.priority ? `Priority: ${record.priority}` : "",
                record?.assigned_to_name || record?.assigned_to ? `Assigned To: ${record.assigned_to_name || record.assigned_to}` : "",
            ].filter(Boolean).join(" | ")
            : [
                record?.remarks,
                record?.action_point_comment,
                record?.action_point_remarks,
                record?.action_taken,
            ].filter(Boolean).join(" | ");

        setCell(ws, `D${row}`, answer);
        setCell(ws, `E${row}`, remarks);
    }

    return unmatched;
};

const addUnmatchedSheet = (workbook, unmatched, mode) => {
    if (!unmatched.length || mode !== "action") return;
    const ws = workbook.addWorksheet("Action Point Details");
    ws.columns = [
        { header: "Question", key: "question", width: 70 },
        { header: "Answer", key: "answer", width: 24 },
        { header: "Status", key: "status", width: 20 },
        { header: "Priority", key: "priority", width: 14 },
        { header: "Comment", key: "comment", width: 45 },
        { header: "Remarks", key: "remarks", width: 45 },
        { header: "Assigned To", key: "assigned", width: 28 },
        { header: "Completed At", key: "completed", width: 24 },
    ];
    ws.addRows(unmatched.map((row) => ({
        question: row.question || "",
        answer: row.answer || "",
        status: row.status || row.action_point_status || "",
        priority: row.priority || "",
        comment: row.comment || row.action_point_comment || "",
        remarks: row.remarks || row.action_point_remarks || "",
        assigned: row.assigned_to_name || row.assigned_to || "",
        completed: row.completed_at || row.action_point_completed_at || "",
    })));
    ws.getRow(1).font = { bold: true };
    ws.autoFilter = "A1:H1";
    ws.views = [{ state: "frozen", ySplit: 1 }];
};

const makeSheet = (sourceTemplate, targetTemplate, workbook, records, stores, mode, index) => {
    const target = index === 0
        ? targetTemplate
        : workbook.addWorksheet(`PVR ${index + 1}`);

    if (index !== 0) copyWorksheet(sourceTemplate, target);

    applyProfile(target, records[0], stores);
    return putRows(target, records, mode);
};

const copyWorksheet = (source, target) => {
    target.columns = source.columns.map((column) => ({
        width: column.width,
        hidden: column.hidden,
    }));

    for (let rowNumber = 1; rowNumber <= source.rowCount; rowNumber += 1) {
        const sourceRow = source.getRow(rowNumber);
        const targetRow = target.getRow(rowNumber);
        targetRow.height = sourceRow.height;
        targetRow.hidden = sourceRow.hidden;

        for (let col = 1; col <= source.columnCount; col += 1) {
            const sourceCell = sourceRow.getCell(col);
            const targetCell = targetRow.getCell(col);
            targetCell.value = sourceCell.value;
            targetCell.style = { ...sourceCell.style };
            targetCell.numFmt = sourceCell.numFmt;
            targetCell.alignment = { ...sourceCell.alignment };
            targetCell.protection = { ...sourceCell.protection };
        }
    }

    const merges = source.model?.merges || [];
    for (const range of merges) {
        target.mergeCells(range);
    }

    target.pageSetup = { ...source.pageSetup };
    target.pageMargins = { ...source.pageMargins };
    target.views = source.views.map((view) => ({ ...view }));
};

export const exportManagementHealthCheck = async ({
    records = [],
    stores = [],
    mode = "checklist",
    filename = "Store_Health_Check_Report.xlsx",
}) => {
    if (!records.length) throw new Error("No records found for export.");

    const grouped = new Map();
    for (const record of records) {
        const key = record?.submission_id || record?.id || record?.store_id || "report";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(record);
    }

    const response = await fetch(TEMPLATE_URL);
    if (!response.ok) throw new Error("Management export template could not be loaded.");

    const buffer = await response.arrayBuffer();
    const sourceWorkbook = new ExcelJS.Workbook();
    await sourceWorkbook.xlsx.load(buffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    workbook.creator = "Miarcus Management Portal";
    workbook.created = new Date();
    workbook.modified = new Date();

    const sourceTemplate = sourceWorkbook.getWorksheet("PVR ") || sourceWorkbook.worksheets[0];
    const targetTemplate = workbook.getWorksheet("PVR ") || workbook.worksheets[0];
    if (!sourceTemplate || !targetTemplate) throw new Error("Management export template is invalid.");

    const groups = [...grouped.values()];
    const unmatched = [];

    groups.forEach((group, index) => {
        const missing = makeSheet(sourceTemplate, targetTemplate, workbook, group, stores, mode, index);
        if (missing.length) unmatched.push(...missing);
    });

    if (unmatched.length && mode === "action") {
        addUnmatchedSheet(workbook, unmatched, mode);
    }

    const output = await workbook.xlsx.writeBuffer();
    saveAs(
        new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        filename
    );
};
