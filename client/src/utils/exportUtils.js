import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// =====================================================
// SHARED EXPORT UTILITY
// Supports CSV, XLSX and PDF export from the same
// headers + rows data so every module can offer all
// three formats from one place.
// =====================================================

/**
 * @param {string} value
 * @returns {string} CSV-safe escaped value
 */
function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadBlob(blob, filename) {
  saveAs(blob, filename);
}

function exportAsCSV(headers, rows, filename) {
  const lines = [];

  if (headers?.length) {
    lines.push(headers.map(csvEscape).join(","));
  }

  rows.forEach((row) => {
    lines.push(row.map(csvEscape).join(","));
  });

  const csvContent = lines.join("\r\n");

  // Prefix with BOM so Excel opens UTF-8 CSVs correctly
  const blob = new Blob(["﻿" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  downloadBlob(blob, `${filename}.csv`);
}

async function exportAsXLSX(headers, rows, filename, sheetName = "Sheet1") {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31) || "Sheet1");

  if (headers?.length) {
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF356D84" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
  }

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  const columnCount = headers?.length || (rows[0] ? rows[0].length : 0);

  for (let i = 1; i <= columnCount; i += 1) {
    const column = worksheet.getColumn(i);
    let maxLength = 10;

    column.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value === null || cell.value === undefined
        ? 0
        : String(cell.value).length;
      if (len > maxLength) maxLength = len;
    });

    column.width = Math.min(maxLength + 2, 45);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  downloadBlob(blob, `${filename}.xlsx`);
}

function exportAsPDF(headers, rows, filename, title) {
  const wide = (headers?.length || 0) > 6;

  const doc = new jsPDF({
    orientation: wide ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  let startY = 40;

  if (title) {
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text(title, 30, startY);
    startY += 16;
  }

  autoTable(doc, {
    head: headers?.length ? [headers] : undefined,
    body: rows,
    startY,
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [53, 109, 132],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 249],
    },
    margin: { left: 24, right: 24 },
  });

  doc.save(`${filename}.pdf`);
}

/**
 * Universal table export.
 *
 * @param {Object} options
 * @param {string[]} options.headers - column headers, in order
 * @param {Array<Array<string|number>>} options.rows - 2D array of row values, matching header order
 * @param {string} [options.filename] - output filename, WITHOUT extension
 * @param {"csv"|"xlsx"|"pdf"} [options.format]
 * @param {string} [options.title] - optional heading shown at the top of the PDF
 * @param {string} [options.sheetName] - optional worksheet name for XLSX
 */
export async function exportTableData({
  headers = [],
  rows = [],
  filename = "export",
  format = "csv",
  title,
  sheetName,
}) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeFilename = (filename || "export").replace(/[\\/:*?"<>|]/g, "-");

  switch (format) {
    case "xlsx":
      await exportAsXLSX(safeHeaders, safeRows, safeFilename, sheetName || title || "Sheet1");
      break;
    case "pdf":
      exportAsPDF(safeHeaders, safeRows, safeFilename, title);
      break;
    case "csv":
    default:
      exportAsCSV(safeHeaders, safeRows, safeFilename);
      break;
  }
}

/**
 * Convenience helper for pages that already have an array of
 * plain objects (e.g. API rows) and just want to export them.
 * Column order follows the `columns` array: [{ key, label }]
 *
 * @param {Object} options
 * @param {Array<{key:string,label:string}>} options.columns
 * @param {Array<Object>} options.data
 * @param {string} [options.filename]
 * @param {"csv"|"xlsx"|"pdf"} [options.format]
 * @param {string} [options.title]
 */
export async function exportObjectsData({
  columns,
  data = [],
  filename = "export",
  format = "csv",
  title,
}) {
  const headers = columns.map((col) => col.label);
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = typeof col.value === "function" ? col.value(item) : item[col.key];
      return value === null || value === undefined ? "" : value;
    })
  );

  await exportTableData({ headers, rows, filename, format, title });
}

/**
 * Parses a CSV string (RFC4180-ish: quoted fields, escaped quotes,
 * embedded commas/newlines) into { headers, rows }.
 * Used so pages that already build a CSV string can offer
 * XLSX / PDF export "for free" by re-parsing that same string
 * instead of duplicating row-building logic.
 *
 * @param {string} text
 * @returns {{headers: string[], rows: Array<Array<string>>}}
 */
export function parseCSV(text) {
  const src = String(text || "").replace(/^﻿/, "");
  const table = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];

    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // ignore, \n handles the line break
    } else if (char === "\n") {
      row.push(field);
      table.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    table.push(row);
  }

  const cleaned = table.filter((r) => !(r.length === 1 && r[0] === ""));
  const [headers = [], ...rows] = cleaned;

  return { headers, rows };
}

/**
 * Export helper for pages that already build a CSV string (or fetch
 * one from the server). For "csv" it downloads that string as-is
 * (byte-identical to today's export). For "xlsx"/"pdf" it re-parses
 * the same string into headers/rows and renders that format, so no
 * per-page row-building duplication is needed.
 *
 * @param {Object} options
 * @param {string} options.csvText
 * @param {string} [options.filename]
 * @param {"csv"|"xlsx"|"pdf"} [options.format]
 * @param {string} [options.title]
 */
export async function exportFromCSV({
  csvText,
  filename = "export",
  format = "csv",
  title,
}) {
  const safeFilename = (filename || "export").replace(/[\\/:*?"<>|]/g, "-");

  if (format === "csv") {
    const blob = new Blob(["﻿" + String(csvText || "")], {
      type: "text/csv;charset=utf-8;",
    });
    downloadBlob(blob, `${safeFilename}.csv`);
    return;
  }

  const { headers, rows } = parseCSV(csvText);

  if (format === "xlsx") {
    await exportAsXLSX(headers, rows, safeFilename, title || "Sheet1");
  } else if (format === "pdf") {
    exportAsPDF(headers, rows, safeFilename, title);
  }
}

/**
 * For modules whose server endpoint already returns a real XLSX
 * workbook (built with ExcelJS on the backend) instead of CSV text.
 * For "xlsx" it saves that binary as-is (exact match with today's
 * download). For "csv"/"pdf" it loads the workbook client-side and
 * re-renders its first sheet in the requested format.
 *
 * @param {Object} options
 * @param {Blob|ArrayBuffer} options.data - the blob/array buffer returned by the server
 * @param {string} [options.filename]
 * @param {"csv"|"xlsx"|"pdf"} [options.format]
 * @param {string} [options.title]
 */
export async function exportFromXLSXBinary({
  data,
  filename = "export",
  format = "csv",
  title,
}) {
  const safeFilename = (filename || "export").replace(/[\\/:*?"<>|]/g, "-");

  if (format === "xlsx") {
    const blob =
      data instanceof Blob
        ? data
        : new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
    downloadBlob(blob, `${safeFilename}.xlsx`);
    return;
  }

  const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];

  const table = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values.slice(1); // exceljs row.values is 1-indexed
    table.push(values.map((v) => (v === null || v === undefined ? "" : v)));
  });

  const [headers = [], ...rows] = table;

  if (format === "pdf") {
    exportAsPDF(headers, rows, safeFilename, title);
  } else {
    exportAsCSV(headers, rows, safeFilename);
  }
}

export default exportTableData;
