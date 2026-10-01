// ==========================================================
// MI ARCUS — BULK UPLOAD MODULE REGISTRY
// ==========================================================
//
// One place that describes the columns of EVERY bulk upload in the
// app. The same definition drives:
//   - header matching (aliases, case/space/punctuation-insensitive)
//   - required-column validation and per-row "X is required" errors
//   - the Column Validation screen    (POST /api/bulk-upload/modules/:key/inspect)
//   - the "Required Columns" table     (GET  /api/bulk-upload/modules/:key)
//   - the sample Excel / CSV download  (GET  /api/bulk-upload/modules/:key/sample)
//   - where extra (unmapped) columns are stored (`table`)
//
// Column options:
//   aliases   other header spellings accepted for this column
//   required  true            -> column must have a value
//             "group-name"    -> at least ONE column of that group
//                                 must have a value (e.g. Employee ID
//                                 OR Employee Name)
//   sample    example values for the sample file (one per sample row)
//   help      short guideline shown under the sample file
// ==========================================================

const MODULES = {};

function col(aliases = [], options = {}) {
    return { aliases, ...options };
}

function defineBulkModule(key, spec) {
    MODULES[key] = { key, ...spec };
    return MODULES[key];
}

function getBulkModule(key) {
    return MODULES[key] || null;
}

function listBulkModules() {
    return Object.values(MODULES).map((m) => ({ key: m.key, title: m.title }));
}

// Columns MIARCUS itself adds to its Error Reports. When a corrected
// error report is uploaded again these are recognised and skipped —
// they are never treated as data or saved as extra columns.
const REPORT_COLUMNS = {
    "__error_reason": ["error reason", "error reasons", "errors", "failure reason", "reason for failure"],
    "__excel_row": ["excel row", "source row", "file row", "original row", "csv row", "pdf row", "word row", "photo row"],
    "__upload_status": ["upload status", "upload result"],
    "__error_column": ["error column", "failed column"]
};

function aliasesOf(spec) {
    const out = {};
    Object.entries(spec.columns || {}).forEach(([name, c]) => {
        out[name] = c.aliases || [];
    });
    Object.entries(REPORT_COLUMNS).forEach(([name, aliases]) => {
        if (!out[name]) out[name] = aliases;
    });
    return out;
}

// Public description (no internals) for the client.
function describeBulkModule(key) {
    const spec = getBulkModule(key);
    if (!spec) return null;

    const groups = {};
    const visible = Object.entries(spec.columns).filter(([name]) => !name.startsWith("__"));

    visible.forEach(([name, c]) => {
        if (typeof c.required === "string") {
            groups[c.required] = groups[c.required] || [];
            groups[c.required].push(name);
        }
    });

    return {
        key: spec.key,
        title: spec.title,
        description: spec.description || "",
        columns: visible.map(([name, c]) => ({
            name,
            required: Boolean(c.required),
            requiredGroup: typeof c.required === "string" ? groups[c.required] : null,
            aliases: (c.aliases || []).slice(0, 6),
            help: c.help || "",
            sample: Array.isArray(c.sample) ? c.sample : c.sample !== undefined ? [c.sample] : []
        })),
        guidelines: spec.guidelines || [],
        sampleRowCount: Math.max(
            1,
            ...visible.map(([, c]) => (Array.isArray(c.sample) ? c.sample.length : c.sample !== undefined ? 1 : 0))
        )
    };
}

const COMMON_GUIDELINES = [
    "Column names are matched automatically (not case-sensitive, spaces and symbols ignored).",
    "Columns can be in any order. A title/banner row above the header row is skipped automatically.",
    "Extra columns are NOT ignored — they are saved with the record under their exact column name.",
    "Every row is checked on its own: valid rows are uploaded even if other rows fail.",
    "Failed rows are listed with the exact Excel row number, column, value and reason.",
    "Dates can be DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, 1 Oct 2026 or an Excel date.",
    "Any number of rows and columns can be uploaded (Excel, CSV, Word, PDF or a photo of the list)."
];

// ==========================================================
// SALES TEAM — VISIT PLANNER / TRAVEL PLAN
// ==========================================================

defineBulkModule("visit-plans", {
    title: "Visit Planner",
    table: "sales_visit_plans",
    description: "One row per store visit. Rows of the same employee, date range and reason are grouped into one visit plan.",
    columns: {
        "Employee ID": col(["employeeid", "empid", "emp code", "employee code", "employee_id", "staff id", "user id"], { required: "employee", sample: ["40310", "40310", "40234"], help: "Employee ID or Employee Name (at least one)." }),
        "Employee Name": col(["employee", "employeename", "name", "staff name", "sales person", "salesperson"], { required: "employee", sample: ["Gulshad Muhammad", "Gulshad Muhammad", "Ravi Kumar"] }),
        "From Date": col(["from", "fromdate", "start date", "startdate", "plan from", "date from", "period from"], { required: "date", sample: ["01/10/2026", "01/10/2026", "02/10/2026"], help: "Start of the plan. Single day: From Date = To Date." }),
        "To Date": col(["to", "todate", "end date", "enddate", "plan to", "date to", "period to"], { sample: ["10/10/2026", "10/10/2026", "05/10/2026"] }),
        "Store Code": col(["storecode", "store id", "storeid", "outlet code", "code"], { required: "store", sample: ["556", "509", "558"], help: "Store Code or Store Name (at least one). Not needed for Week Off rows." }),
        "Store Name": col(["store", "storename", "outlet", "outlet name", "planned store", "planned stores", "planned store names", "stores", "store names", "shop"], { required: "store", sample: ["MRPL - HISAR", "MRPL - HOSHIARPUR", "MRPL - SOLAN"], help: "One store per row, or several stores in one cell separated by commas." }),
        "Store Visit Schedule": col(["store visit schedule", "visit schedule", "store schedule", "stores and dates", "stores & dates", "planned stores & dates", "planned stores and dates"], { required: "store", sample: ["", "", ""], help: "Optional. Several stores with their own dates in one cell: \"MRPL - HISAR (556) - 01/10/2026; MRPL - SOLAN (558) - 02/10/2026\" (the Visit Planner export format)." }),
        "City": col(["city", "town", "location"], { sample: ["Hisar", "Hoshiarpur", "Solan"] }),
        "Visit Date": col(["visitdate", "date", "visit on", "store visit date", "planned date", "visit_date"], { required: "date", sample: ["01/10/2026", "02/10/2026", "03/10/2026"], help: "Date of this store's visit — must be within From Date and To Date." }),
        "Reason to Travel": col(["reason", "reasontotravel", "purpose", "reason for travel", "travel reason"], { sample: ["STORE VISIT", "STORE VISIT", "COLLECTION"] }),
        "Remarks": col(["remark", "remarks", "notes", "comment", "comments"], { sample: ["-", "", ""] }),
        "Week Off": col(["weekoff", "week off (yes/no)", "leave", "week off/leave", "is leave", "on leave"], { sample: ["No", "No", "No"], help: "Yes or No. Week Off rows need no store." }),
        // Columns of the Visit Planner EXPORT that the system calculates
        // itself — recognised so an exported file uploads as it is.
        "__plan_id": col(["plan id", "planid", "visit plan id"]),
        "__total_days": col(["total days", "no of days", "number of days"]),
        "__approval_status": col(["approval status", "approval", "approved status"]),
        "__department": col(["department", "dept", "department name"]),
        "__designation": col(["designation"])
    },
    // Store is only required for non week-off rows — checked by the importer.
    skipAutoRequired: ["Store Code", "From Date"],
    dbLabels: { employee_id: "Employee ID", store_id: "Store Code", visit_date: "Visit Date", end_date: "To Date", city: "City", reason_to_travel: "Reason to Travel" },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("sales-review", {
    title: "Sales Review",
    table: "sales_review_records",
    columns: {
        "Store Name": col(["store_name", "store", "shop name", "outlet", "outlet name", "shop_name"], { required: true, sample: "MRPL - HISAR" }),
        "Store ID": col(["store_id", "storeid"], { sample: "" }),
        "Year": col(["year", "fiscal year"], { sample: "2026" }),
        "Month": col(["month"], { sample: "October" }),
        "Week": col(["week"], { sample: "Week 1" }),
        "Target": col(["target"], { sample: "500000" }),
        "MTD": col(["mtd"], { sample: "120000" }),
        "MRP Sale": col(["mrp_sale", "mrp", "mrpsale"], { sample: "150000" }),
        "Last Month Sale": col(["last_month_sale", "lastmonthsale"], { sample: "480000" }),
        "LYSM": col(["lysm"], { sample: "450000" }),
        "Projection": col(["projection"], { sample: "520000" }),
        "Projection For Remaining Days": col(["projection_remaining", "projection remaining", "projection_for_remaining_days"], { sample: "400000" }),
        "Projection (by selected week)": col(["projection_selected_week", "projection selected week", "projectionbyselectedweek"], { sample: "130000" }),
        "Discount Amount (MRP)": col(["discount_amount", "discount amount", "discountamountmrp"], { sample: "30000" }),
        "Discount %": col(["discount_percent", "discount percent", "discountpercent", "discount"], { sample: "20" }),
        "UPT": col(["upt"], { sample: "2.1" }),
        "ABV": col(["abv"], { sample: "1850" }),
        "ASP": col(["asp"], { sample: "880" }),
        "Bill Count": col(["bill_count", "bills", "billcount"], { sample: "65" }),
        "Qty Sold": col(["qty_sold", "quantity sold", "qty", "qtysold"], { sample: "136" }),
        "Reports To": col(["reports_to", "manager", "reportsto"], { sample: "Regional Head" }),
        "ASM": col(["asm"], { sample: "ASM North" }),
        "Remarks": col(["remarks", "remark"], { sample: "" })
    },
    guidelines: COMMON_GUIDELINES
});

// ==========================================================
// USERS / ORGANISATION
// ==========================================================

defineBulkModule("users", {
    title: "Users",
    table: "users",
    columns: {
        "Employee ID": col(["employeeid", "empid", "employee id", "id", "staffid", "employeecode", "empcode"], { required: true, sample: "40310" }),
        "Name": col(["name", "fullname", "employeename", "staffname"], { required: true, sample: "Gulshad Muhammad" }),
        "Email": col(["email", "emailaddress", "mail", "emailid"], { required: true, sample: "gulshad@example.com" }),
        "Call Contact": col(["callcontact", "contact", "phone", "mobile", "mobilenumber", "phonenumber", "contactnumber"], { sample: "9876543210" }),
        "WhatsApp Contact": col(["whatsappcontact", "whatsapp", "whatsappnumber"], { sample: "9876543210" }),
        "Department": col(["department", "dept", "departmentname"], { required: true, sample: "Sales" }),
        "Designation": col(["designation", "role", "position", "title", "designationname"], { required: true, sample: "Area Sales Manager" }),
        "Reports To": col(["reportsto", "reporting", "manager", "supervisor", "reportingmanager"], { sample: "Regional Head" }),
        "Status": col(["status", "active"], { sample: "Active", help: "Active or Inactive." })
    },
    dbLabels: { email: "Email", employee_id: "Employee ID", department_id: "Department", designation_id: "Designation" },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("departments", {
    title: "Departments",
    table: "departments",
    columns: {
        "Department Name": col(["departmentname", "department", "dept", "name"], { required: true, sample: ["Sales", "Operations"] }),
        "Description": col(["description", "desc", "details"], { sample: ["Field sales team", "Store operations"] }),
        "Status": col(["status", "active"], { sample: ["Active", "Active"] }),
        "Employee ID": col(["employeeid", "empid", "employee id", "staffid", "head employee id"], { sample: ["40310", ""] })
    },
    dbLabels: { department_name: "Department Name" },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("designations", {
    title: "Designations",
    table: "designations",
    columns: {
        "Designation Name": col(["designation_name", "designation", "designationname", "name", "title"], { required: true, sample: ["Area Sales Manager", "Store Manager"] }),
        "Department": col(["department_name", "department", "departmentname", "dept", "department_id", "department id"], { required: true, sample: ["Sales", "Operations"], help: "Department name or ID." }),
        "Description": col(["description", "desc"], { sample: ["", ""] }),
        "Status": col(["status"], { sample: ["Active", "Active"] })
    },
    dbLabels: { designation_name: "Designation Name", department_id: "Department" },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("reports-to", {
    title: "Reports To",
    table: "reports_to",
    columns: {
        "Manager Name": col(["manager_name", "manager", "managername", "name", "reports to"], { required: true, sample: "Regional Head" }),
        "Department": col(["department", "dept"], { sample: "Sales" }),
        "Designation": col(["designation", "role"], { sample: "Regional Manager" }),
        "Status": col(["status"], { sample: "Active" })
    },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("stores", {
    title: "Stores",
    table: "stores",
    columns: {
        "Store Name": col(["store_name", "storename", "store", "outlet", "outlet name"], { required: true, sample: "MRPL - HISAR" }),
        "Store Code": col(["store_code", "storecode", "code", "outlet code"], { required: true, sample: "556" }),
        "Country": col(["country"], { sample: "India" }),
        "State": col(["state"], { sample: "Haryana" }),
        "City": col(["city", "town"], { sample: "Hisar" }),
        "Address": col(["address", "store address"], { sample: "Main Market, Hisar" }),
        "Manager Name": col(["manager_name", "manager", "store manager"], { sample: "Rohit Singh" }),
        "Contact Number": col(["contact_number", "contact", "phone", "mobile"], { sample: "9876543210" }),
        "Email": col(["email", "store email"], { sample: "hisar@example.com" }),
        "Status": col(["status"], { sample: "Active" })
    },
    dbLabels: { store_code: "Store Code", store_name: "Store Name" },
    guidelines: COMMON_GUIDELINES
});

// ==========================================================
// CHECKLISTS
// ==========================================================

defineBulkModule("checklist-types", {
    title: "Checklist Types",
    table: "checklist_types",
    columns: {
        "Checklist Name": col(["checklist_name", "checklist", "checklistname", "name", "checklist type"], { required: true, sample: "Opening Checklist" }),
        "Allow Past Submission": col(["allow_past_submission", "past submission", "allowpastsubmission"], { sample: "No", help: "Yes or No." }),
        "Cutoff Time": col(["cutoff_time", "cutoff", "cut off time"], { sample: "11:00" }),
        "Status": col(["status"], { sample: "Active" }),
        "Departments": col(["departments", "department"], { sample: "Operations, Sales", help: "Comma separated department names." })
    },
    dbLabels: { checklist_name: "Checklist Name" },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("questions", {
    title: "Questions",
    table: "questions",
    columns: {
        "Checklist Type": col(["checklistTypeName", "checklist_type_name", "checklist type name", "checklistName", "checklist_name", "checklist"], { required: true, sample: "Opening Checklist" }),
        "Question": col(["questionText", "question_text", "question text", "question"], { required: true, sample: "Is the store clean?" }),
        "Answer Type": col(["answerType", "answer_type", "answertype", "type"], { required: true, sample: "Yes/No" }),
        "Answer Required": col(["answerRequired", "answer_required", "required", "mandatory"], { sample: "Yes" }),
        "SLA Value": col(["slaValue", "sla_value", "sla"], { sample: "2" }),
        "SLA Unit": col(["slaUnit", "sla_unit"], { sample: "Days" }),
        "Sequence": col(["sequence", "sequenceNo", "sequence_no", "order", "sr no"], { sample: "1" }),
        "Department": col(["questionDepartmentName", "question_department_name", "departmentName", "department_name", "department", "departments"], { sample: "Operations" }),
        "Photo Requirement": col(["photoRequirement", "photo_requirement", "photoEvidence", "photo evidence", "photoRequired", "photo required", "photo", "remarks"], { sample: "Auto", help: "Auto (or empty) (Yes / No: photo only for the unexpected answer). Or Required, Optional, Required on No, None." }),
        "Expected Answer": col(["expectedAnswer", "expected_answer", "expected answer", "normal answer", "normalAnswer", "correct answer", "correctAnswer", "ideal answer"], { sample: "Yes", help: "Yes / No questions only: the normal answer. A photo is required when the other answer is given. Empty = suggested from the question." })
    },
    guidelines: COMMON_GUIDELINES
});

// Checklist Reports / Action Points are registered by their controllers
// (they reuse their long-standing alias maps) — see
// controllers/checklistReportController.js and actionPointController.js.

// ==========================================================
// ANNOUNCEMENTS / NSO
// ==========================================================

defineBulkModule("announcements", {
    title: "Announcements",
    table: "announcements",
    columns: {
        "Title": col(["title", "subject", "heading"], { required: true, sample: "Diwali timings" }),
        "Content": col(["content", "message", "body", "description"], { sample: "Stores will open at 9 AM." }),
        "Audience": col(["audience", "send_to", "send to", "recipients"], { sample: "everyone", help: "everyone, managers, users or specific." }),
        "Pinned": col(["is_pinned", "pinned", "pin"], { sample: "No" }),
        "Specific User IDs": col(["specific_user_ids", "specificUserIds", "user_ids", "user ids", "users"], { sample: "", help: "Needed only when Audience is specific. Separate with commas." })
    },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("nso-rules", {
    title: "NSO Rules",
    table: "nso_rules",
    columns: {
        "Trigger Column": col(["trigger_column", "trigger", "column", "field"], { required: true, sample: "Layout by NSO" }),
        "Expected Answer": col(["expected_answer", "expected", "answer"], { sample: "No" }),
        "Priority": col(["priority"], { sample: "Medium", help: "Low, Medium, High or Critical." }),
        "SLA Days": col(["sla_days", "sla", "sladays"], { sample: "3" }),
        "Create Action Point": col(["create_action_point", "action point", "createactionpoint"], { sample: "Yes" }),
        "Mandatory": col(["mandatory", "required"], { sample: "Yes" }),
        "Status": col(["status", "is_active", "active"], { sample: "Active" }),
        "Departments": col(["departments", "department"], { sample: "Operations", help: "Comma separated department names." })
    },
    guidelines: COMMON_GUIDELINES
});

// New Store Openings is registered by its controller (alias map lives there).

// ==========================================================
// LISTING TRACKER / ASSETS / COLLECTION TRACKING
// ==========================================================

defineBulkModule("listing-tracker", {
    title: "Listing Tracker",
    table: "listing_tracker_products",
    columns: {
        "PPK Code": col(["ppk_code", "ppkcode", "productcode", "product code"], { required: true, sample: "PPK1001" }),
        "SKU": col(["sku"], { required: true, sample: "SKU-1001-M" }),
        "Shopify Handle": col(["shopify_handle", "shopifyhandle", "handle"], { sample: "blue-bear-tshirt" }),
        "Product Name": col(["product_name", "productname", "name"], { sample: "Blue Bear T-Shirt" }),
        "Category": col(["category"], { sample: "T-Shirts" }),
        "Barcode": col(["barcode", "ean"], { sample: "8901234567890" }),
        "MRP": col(["mrp", "price"], { sample: "799" }),
        "Season": col(["season"], { sample: "AW26" }),
        "Collection Name": col(["collection_name", "collection", "collectionname"], { sample: "Winter Basics" }),
        "Image Link": col(["image_link", "imageurl", "image url", "image"], { sample: "" }),
        "Photoshoot": col(["photoshoot", "photoshootcompleted", "photoshoot completed"], { sample: "No" }),
        "Product Listed": col(["product_listed", "listed", "productlisted"], { sample: "No" }),
        "Remark": col(["remark", "remarks"], { sample: "" })
    },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("assets-marketing", {
    title: "Marketing Assets",
    table: "marketing_assets",
    columns: {
        "Particular Name": col(["particular_name", "particularname", "name", "asset name"], { required: true, sample: "Window Standee" }),
        "Store Name": col(["store_name", "storename", "store"], { sample: "MRPL - HISAR" }),
        "Department": col(["department", "department_name", "departmentname"], { sample: "Marketing" }),
        "Category": col(["category"], { sample: "Visual Merchandising" }),
        "Type": col(["type"], { sample: "Standee" }),
        "Rate": col(["rate", "price", "cost"], { sample: "2500" }),
        "Size": col(["size"], { sample: "6x3 ft" }),
        "Color": col(["color", "colour"], { sample: "Blue" }),
        "Brand": col(["brand"], { sample: "MRPL" }),
        "Location/Address": col(["location_address", "locationaddress", "location", "address"], { sample: "Main Market, Hisar" }),
        "Email": col(["email"], { sample: "" }),
        "Mobile": col(["mobile", "phone"], { sample: "" }),
        "Buy Date": col(["buy_date", "buydate", "purchase date"], { sample: "01/10/2026" }),
        "Expiry Date": col(["expiry_date", "expirydate", "expiry"], { sample: "31/03/2027" }),
        "Remark": col(["remark", "remarks"], { sample: "" })
    },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("assets-legal", {
    title: "Legal Assets",
    table: "legal_assets",
    columns: {
        "Name": col(["name", "document name", "license name"], { required: true, sample: "Shop & Establishment License" }),
        "Store Name": col(["store_name", "storename", "store"], { sample: "MRPL - HISAR" }),
        "Department": col(["department", "department_name", "departmentname"], { sample: "Legal" }),
        "Location/Address": col(["location_address", "locationaddress", "location", "address"], { sample: "Main Market, Hisar" }),
        "Remark": col(["remark", "remarks"], { sample: "" }),
        "Short Description": col(["short_description", "shortdescription", "description"], { sample: "Annual renewal" }),
        "Date of Issue": col(["date_of_issue", "dateofissue", "issue date"], { sample: "01/04/2026" }),
        "Status": col(["status"], { sample: "Unresolved" }),
        "Custom Field Name": col(["custom_field_name", "customfieldname"], { sample: "" }),
        "Custom Field Value": col(["custom_field_value", "customfieldvalue", "customfield", "custom field"], { sample: "" })
    },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("collection-products", {
    title: "Collection Tracking",
    table: "collection_products",
    columns: {
        "Product Code": col(["product_code", "productcode", "sku", "sku code", "style code"], { sample: "CT-1001", help: "Leave blank to auto-generate a code." }),
        "Product Name": col(["product_name", "productname", "name", "style name"], { sample: "Blue Bear T-Shirt" })
    },
    dbLabels: { product_code: "Product Code" },
    guidelines: [
        ...COMMON_GUIDELINES,
        "Every column of the file is saved with the product (Designer stage data)."
    ]
});

// ==========================================================
// FINANCE / OPERATIONS
// ==========================================================

defineBulkModule("daily-collections", {
    title: "Daily Collection",
    table: "daily_collection_reports",
    columns: {
        "Report Date": col(["report_date", "reportdate", "date", "collectiondate", "collection date"], { required: true, sample: "01/10/2026" }),
        "Store Code": col(["store_code", "storecode", "code"], { required: "store", sample: "556" }),
        "Store Name": col(["store_name", "storename", "store", "outlet", "shop"], { required: "store", sample: "MRPL - HISAR" }),
        "Store ID": col(["store_id", "storeid"], { required: "store", sample: "" }),
        "UPI Amount": col(["upi_amount", "upiamount", "upi"], { sample: "12000" }),
        "Cash Amount": col(["cash_amount", "cashamount", "cash"], { sample: "8000" }),
        "Bank Transfer Amount": col(["bank_transfer_amount", "banktransferamount", "banktransfer", "bank"], { sample: "0" }),
        "Card Amount": col(["card_amount", "cardamount", "card"], { sample: "5000" }),
        "Notes": col(["notes", "note", "remarks", "remark"], { sample: "" })
    },
    guidelines: COMMON_GUIDELINES
});

defineBulkModule("erp-sales", {
    title: "ERP Historical Sales",
    table: "inventory_historical_sales",
    columns: {
        "Store Name": col(["store_name", "storename", "store", "outlet", "shop"], { required: true, sample: "MRPL - HISAR" }),
        "Store ID": col(["store_id", "storeid"], { sample: "" }),
        "Year": col(["year", "sale_year", "saleyear", "fiscalyear"], { required: true, sample: "2025" }),
        "Month": col(["month", "sale_month", "salemonth", "period"], { required: true, sample: "October" }),
        "Category": col(["category", "categoryname", "productcategory"], { required: true, sample: "T-Shirts" }),
        "Sales Amount": col(["sales", "sales_amount", "salesamount", "revenue", "netsales"], { required: true, sample: "250000" }),
        "Units Sold": col(["units", "units_sold", "unitssold", "quantity", "qty", "salesunits"], { required: true, sample: "320" }),
        "Discount %": col(["discount", "discount_percent", "discountpercent", "discountpercentage"], { sample: "15" })
    },
    guidelines: COMMON_GUIDELINES
});

module.exports = {
    defineBulkModule,
    getBulkModule,
    listBulkModules,
    describeBulkModule,
    aliasesOf,
    col,
    REPORT_COLUMNS,
    COMMON_GUIDELINES
};
