const db = require("../config/db");

const NewStoreOpening = {};

// ======================================================
// GET ALL NEW STORE OPENINGS
// SEARCH + PAGINATION
// ======================================================

NewStoreOpening.getAll = (

    filters = {},

    callback

) => {

    let sql = `

        SELECT

            nso.*

        FROM new_store_openings nso

        WHERE 1 = 1

    `;

    const values = [];

    // ==================================================
    // SEARCH
    // ==================================================

    if (

        filters.search?.trim()

    ) {

        sql += `

            AND (

                nso.location LIKE ?

                OR nso.city LIKE ?

                OR nso.broker_name LIKE ?

                OR nso.operation_head_assigned LIKE ?

                OR nso.asm_assigned LIKE ?

                OR nso.status LIKE ?

            )

        `;

        const keyword = `%${filters.search.trim()}%`;

        values.push(

            keyword,

            keyword,

            keyword,

            keyword,

            keyword,

            keyword

        );

    }

    // ==================================================
    // ORDER + PAGINATION
    // ==================================================

    sql += `

        ORDER BY nso.id DESC

        LIMIT ?, ?

    `;

    values.push(

        Number(filters.offset) || 0,

        Number(filters.limit) || 10

    );

    db.query(

        sql,

        values,

        callback

    );

};

// ======================================================
// COUNT NEW STORE OPENINGS
// ======================================================

NewStoreOpening.count = (

    filters = {},

    callback

) => {

    let sql = `

        SELECT

            COUNT(*) AS total

        FROM new_store_openings nso

        WHERE 1 = 1

    `;

    const values = [];

    // ==================================================
    // SEARCH
    // ==================================================

    if (

        filters.search?.trim()

    ) {

        sql += `

            AND (

                nso.location LIKE ?

                OR nso.city LIKE ?

                OR nso.broker_name LIKE ?

                OR nso.operation_head_assigned LIKE ?

                OR nso.asm_assigned LIKE ?

                OR nso.status LIKE ?

            )

        `;

        const keyword = `%${filters.search.trim()}%`;

        values.push(

            keyword,

            keyword,

            keyword,

            keyword,

            keyword,

            keyword

        );

    }

    db.query(

        sql,

        values,

        callback

    );

};



// ======================================================
// GET NEW STORE OPENING BY ID
// ======================================================

NewStoreOpening.getById = (

    id,

    callback

) => {

    const sql = `

        SELECT

            nso.*

        FROM new_store_openings nso

        WHERE nso.id = ?

    `;

    db.query(

        sql,

        [

            id

        ],

        (

            err,

            rows

        ) => {

            if (

                err

            ) {

                return callback(

                    err

                );

            }

            if (

                !rows ||

                rows.length === 0

            ) {

                return callback(

                    new Error(

                        "Project not found."

                    )

                );

            }

            callback(

                null,

                rows

            );

        }

    );

};

// ======================================================
// CREATE NEW STORE OPENING
// ======================================================

NewStoreOpening.create = (

    data,

    callback

) => {

    // ==================================================
    // SQL QUERY
    // ==================================================

    const sql = `

        INSERT INTO new_store_openings

        (

            location,

            city,

            sb_area,

            carpet_area,

            cam,

            mg,

            electricity_kva,

            revenue_share,

            escalation,

            expected_sale,

            possession_date_loi,

            possession_date_broker,

            broker_name,

            broker_email,

            operation_head_assigned,

            operation_head_email,

            asm_assigned,

            asm_email,

            deal_days,

            actual_possession_date,

            remarks,

            attachment,

            delay_loi_vs_broker,

            possession_delay,

            received_by_nso,

            layout_by_nso,

            revised_layout_by_nso,

            approval_deadline,

            approver_name,

            approver_email,

            construction_vendor,

            construction_vendor_email,

            project_taken_by,

            project_taken_by_email,

            timeline_mode,

            visit_by_op_team,

            gst_deadline,

            hr_hiring_deadline,

            team_training_deadline,

            visit_by_nso_team_deadline,

            plan_of_stock_deadline,

            plan_of_collaterals_deadline,

            on_field_training_deadline,

            dispatch_stock_deadline,

            nso_handover_deadline,

            vm_handover_deadline,

            scanning_deadline,

            billing_start_date,

            status,

            created_by,

            updated_by

        )

        VALUES

        (

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            ?

        )

    `;


    // ==================================================
    // VALUES
    // ==================================================

    const values = [

        // ----------------------------------------------
        // BASIC DETAILS
        // ----------------------------------------------

        data.location ?? null,

        data.city ?? null,

        data.sb_area ?? null,

        data.carpet_area ?? null,

        // ----------------------------------------------
        // FINANCIAL DETAILS
        // ----------------------------------------------

        data.cam ?? null,

        data.mg ?? null,

        data.electricity_kva ?? null,

        data.revenue_share ?? null,

        data.escalation ?? null,

        data.expected_sale ?? null,

        // ----------------------------------------------
        // POSSESSION DETAILS
        // ----------------------------------------------

        data.possession_date_loi ?? null,

        data.possession_date_broker ?? null,

        // ----------------------------------------------
        // ASSIGNMENT
        // ----------------------------------------------

        data.broker_name ?? null,

        data.broker_email ?? null,

        data.operation_head_assigned ?? null,

        data.operation_head_email ?? null,

        data.asm_assigned ?? null,

        data.asm_email ?? null,

        // ----------------------------------------------
        // DEAL INFORMATION
        // ----------------------------------------------

        data.deal_days ?? null,

        data.actual_possession_date ?? null,

        data.remarks ?? null,

        data.attachment ?? null,

        // ----------------------------------------------
        // DELAY INFORMATION
        // ----------------------------------------------

        data.delay_loi_vs_broker ?? null,

        data.possession_delay ?? null,

        // ----------------------------------------------
        // NSO TIMELINE
        // ----------------------------------------------

        data.received_by_nso ?? null,

        data.layout_by_nso ?? null,

        data.revised_layout_by_nso ?? null,

        // ----------------------------------------------
        // APPROVAL
        // ----------------------------------------------

        data.approval_deadline ?? null,

        data.approver_name ?? null,

        data.approver_email ?? null,

        // ----------------------------------------------
        // CONSTRUCTION
        // ----------------------------------------------

        data.construction_vendor ?? null,

        data.construction_vendor_email ?? null,

        data.project_taken_by ?? null,

        data.project_taken_by_email ?? null,

        data.timeline_mode ?? "automatic",

        data.visit_by_op_team ?? null,

        // ----------------------------------------------
        // DEADLINES
        // ----------------------------------------------

        data.gst_deadline ?? null,

        data.hr_hiring_deadline ?? null,

        data.team_training_deadline ?? null,

        data.visit_by_nso_team_deadline ?? null,

        data.plan_of_stock_deadline ?? null,

        data.plan_of_collaterals_deadline ?? null,

        data.on_field_training_deadline ?? null,

        data.dispatch_stock_deadline ?? null,

        data.nso_handover_deadline ?? null,

        data.vm_handover_deadline ?? null,

        data.scanning_deadline ?? null,

        data.billing_start_date ?? null,

        // ----------------------------------------------
        // STATUS
        // ----------------------------------------------

        data.status ?? "Planning",

        // ----------------------------------------------
        // AUDIT FIELDS
        // ----------------------------------------------

        data.created_by ?? null,

        data.updated_by ?? null

    ];


    // ==================================================
    // DEBUG INFORMATION
    // ==================================================

    console.log(
        "=============================================="
    );

    console.log(
        "NEW STORE OPENING - CREATE"
    );

    console.log(
        "=============================================="
    );

    console.log(
        "created_by:",
        data.created_by
    );

    console.log(
        "updated_by:",
        data.updated_by
    );

    console.log(
        "Total SQL Values:",
        values.length
    );

    console.log(
        "=============================================="
    );


    // ==================================================
    // EXECUTE QUERY
    // ==================================================
db.query(
    sql,
    [
        data.location,
        data.city,
        data.sb_area,
        data.carpet_area,
        data.cam,
        data.mg,
        data.electricity_kva,
        data.revenue_share,
        data.escalation,
        data.expected_sale,

        data.possession_date_loi,
        data.possession_date_broker,
        data.broker_name,
        data.broker_email,
        data.operation_head_assigned,
        data.operation_head_email,
        data.asm_assigned,
        data.asm_email,
        data.deal_days,
        data.actual_possession_date,
        data.remarks,
        data.attachment,
        data.delay_loi_vs_broker,

        data.possession_delay,
        data.received_by_nso,
        data.layout_by_nso,
        data.revised_layout_by_nso,
        data.approval_deadline,
        data.approver_name,
        data.approver_email,
        data.construction_vendor,
        data.construction_vendor_email,
        data.project_taken_by,
        data.project_taken_by_email,
        data.timeline_mode ?? "automatic",
        data.visit_by_op_team,
        data.gst_deadline,

        data.hr_hiring_deadline,
        data.team_training_deadline,
        data.visit_by_nso_team_deadline,
        data.plan_of_stock_deadline,
        data.plan_of_collaterals_deadline,
        data.on_field_training_deadline,
        data.dispatch_stock_deadline,
        data.nso_handover_deadline,
        data.vm_handover_deadline,
        data.scanning_deadline,

        data.billing_start_date,
        data.status ?? "Planning",
        data.created_by,
        data.updated_by
    ],
    (err, result) => {

        if (err) {

            console.error("========================================");
            console.error("❌ NEW STORE OPENING CREATE SQL ERROR");
            console.error("========================================");

            console.error("ERROR MESSAGE:", err.message);
            console.error("ERROR CODE:", err.code);
            console.error("SQL STATE:", err.sqlState);
            console.error("FAILED SQL:", err.sql);

            console.error("========================================");

            return callback(err);
        }

        console.log("========================================");
        console.log("✅ NEW STORE OPENING CREATED");
        console.log("Inserted ID:", result.insertId);
        console.log("========================================");

        callback(null, result);
    }
);

    

};
// ======================================================
// UPDATE NEW STORE OPENING
// ======================================================

NewStoreOpening.update = (

    id,

    data,

    callback

) => {

    const sql = `

        UPDATE new_store_openings

        SET

            location = ?,

            city = ?,

            sb_area = ?,

            carpet_area = ?,

            cam = ?,

            mg = ?,

            electricity_kva = ?,

            revenue_share = ?,

            escalation = ?,

            expected_sale = ?,

            possession_date_loi = ?,

            possession_date_broker = ?,

            broker_name = ?,

            broker_email = ?,

            operation_head_assigned = ?,

            operation_head_email = ?,

            asm_assigned = ?,

            asm_email = ?,

            deal_days = ?,

            actual_possession_date = ?,

            remarks = ?,

            attachment = ?,

            delay_loi_vs_broker = ?,

            possession_delay = ?,

            received_by_nso = ?,

            layout_by_nso = ?,

            revised_layout_by_nso = ?,

            approval_deadline = ?,

            approver_name = ?,

            approver_email = ?,

            construction_vendor = ?,

            construction_vendor_email = ?,

            project_taken_by = ?,

            project_taken_by_email = ?,

            timeline_mode = ?,

            visit_by_op_team = ?,

            gst_deadline = ?,

            hr_hiring_deadline = ?,

            team_training_deadline = ?,

            visit_by_nso_team_deadline = ?,

            plan_of_stock_deadline = ?,

            plan_of_collaterals_deadline = ?,

            on_field_training_deadline = ?,

            dispatch_stock_deadline = ?,

            nso_handover_deadline = ?,

            vm_handover_deadline = ?,

            scanning_deadline = ?,

            billing_start_date = ?,

            status = ?,

            updated_by = ?

        WHERE id = ?

    `;

   db.query(
    sql,
    [
        data.location,
        data.city,
        data.sb_area,
        data.carpet_area,
        data.cam,
        data.mg,
        data.electricity_kva,
        data.revenue_share,
        data.escalation,
        data.expected_sale,

        data.possession_date_loi,
        data.possession_date_broker,
        data.broker_name,
        data.broker_email,
        data.operation_head_assigned,
        data.operation_head_email,
        data.asm_assigned,
        data.asm_email,
        data.deal_days,
        data.actual_possession_date,
        data.remarks,
        data.attachment,
        data.delay_loi_vs_broker,

        data.possession_delay,
        data.received_by_nso,
        data.layout_by_nso,
        data.revised_layout_by_nso,
        data.approval_deadline,
        data.approver_name,
        data.approver_email,
        data.construction_vendor,
        data.construction_vendor_email,
        data.project_taken_by,
        data.project_taken_by_email,
        data.timeline_mode ?? "automatic",
        data.visit_by_op_team,
        data.gst_deadline,

        data.hr_hiring_deadline,
        data.team_training_deadline,
        data.visit_by_nso_team_deadline,
        data.plan_of_stock_deadline,
        data.plan_of_collaterals_deadline,
        data.on_field_training_deadline,
        data.dispatch_stock_deadline,
        data.nso_handover_deadline,
        data.vm_handover_deadline,
        data.scanning_deadline,

        data.billing_start_date,
        data.status ?? "Planning",
        data.updated_by
    ],
    (err, result) => {

        if (err) {

            console.error("========================================");
            console.error("❌ NEW STORE OPENING CREATE SQL ERROR");
            console.error("========================================");

            console.error("ERROR MESSAGE:", err.message);
            console.error("ERROR CODE:", err.code);
            console.error("SQL STATE:", err.sqlState);
            console.error("FAILED SQL:", err.sql);

            console.error("========================================");

            return callback(err);
        }

        console.log("========================================");
        console.log("✅ NEW STORE OPENING CREATED");
        console.log("Inserted ID:", result.insertId);
        console.log("========================================");

        callback(null, result);
    }
);
        

};




// ======================================================
// DELETE NEW STORE OPENING
// ======================================================

NewStoreOpening.delete = (

    id,

    callback

) => {

    db.query(

        `

        DELETE FROM new_store_openings

        WHERE id = ?

        `,

        [

            id

        ],

        (

            err,

            result

        ) => {

            if (

                err

            ) {

                return callback(

                    err

                );

            }

            if (

                result.affectedRows === 0

            ) {

                return callback(

                    new Error(

                        "Project not found."

                    )

                );

            }

            callback(

                null,

                result

            );

        }

    );

};

// ======================================================
// DELETE ALL NEW STORE OPENINGS
// ======================================================

NewStoreOpening.deleteAll = (

    callback

) => {

    db.query(

        `

        DELETE FROM new_store_openings

        `,

        callback

    );

};

// ======================================================
// EXPORT NEW STORE OPENINGS
// ======================================================

NewStoreOpening.getForExport = (

    callback

) => {

    const sql = `

        SELECT

            location,

            city,

            sb_area,

            carpet_area,

            broker_name,

            operation_head_assigned,

            asm_assigned,

            status,

            possession_date_loi,

            possession_date_broker,

            actual_possession_date,

            expected_sale,

            deal_days,

            delay_loi_vs_broker,

            possession_delay,

            billing_start_date,

            remarks,

            created_at,

            updated_at

        FROM new_store_openings

        ORDER BY id DESC

    `;

    db.query(

        sql,

        callback

    );

};


// ======================================================
// IMPORT BULK INSERT
// ======================================================

NewStoreOpening.bulkCreate = (

    records,

    callback

) => {

    if (

        !Array.isArray(

            records

        ) ||

        records.length === 0

    ) {

        return callback(

            new Error(

                "No records found for bulk import."

            )

        );

    }

    const sql = `

        INSERT INTO new_store_openings

        (

            location,

            city,

            sb_area,

            carpet_area,

            cam,

            mg,

            electricity_kva,

            revenue_share,

            escalation,

            expected_sale,

            possession_date_loi,

            possession_date_broker,

            broker_name,

            operation_head_assigned,

            asm_assigned,

            deal_days,

            actual_possession_date,

            remarks,

            attachment,

            delay_loi_vs_broker,

            possession_delay,

            received_by_nso,

            layout_by_nso,

            revised_layout_by_nso,

            approval_deadline,

            approver_name,

            construction_vendor,

            project_taken_by,

            visit_by_op_team,

            gst_deadline,

            hr_hiring_deadline,

            team_training_deadline,

            visit_by_nso_team_deadline,

            plan_of_stock_deadline,

            plan_of_collaterals_deadline,

            on_field_training_deadline,

            dispatch_stock_deadline,

            nso_handover_deadline,

            vm_handover_deadline,

            scanning_deadline,

            billing_start_date,

            status,

            created_by,

            updated_by

        )

        VALUES ?

    `;

    const values = records.map(

        (

            item

        ) => [

            item.location,

            item.city,

            item.sb_area,

            item.carpet_area,

            item.cam,

            item.mg,

            item.electricity_kva,

            item.revenue_share,

            item.escalation,

            item.expected_sale,

            item.possession_date_loi,

            item.possession_date_broker,

            item.broker_name,

            item.operation_head_assigned,

            item.asm_assigned,

            item.deal_days,

            item.actual_possession_date,

            item.remarks,

            item.attachment,

            item.delay_loi_vs_broker,

            item.possession_delay,

            item.received_by_nso,

            item.layout_by_nso,

            item.revised_layout_by_nso,

            item.approval_deadline,

            item.approver_name,

            item.construction_vendor,

            item.project_taken_by,

            item.visit_by_op_team,

            item.gst_deadline,

            item.hr_hiring_deadline,

            item.team_training_deadline,

            item.visit_by_nso_team_deadline,

            item.plan_of_stock_deadline,

            item.plan_of_collaterals_deadline,

            item.on_field_training_deadline,

            item.dispatch_stock_deadline,

            item.nso_handover_deadline,

            item.vm_handover_deadline,

            item.scanning_deadline,

            item.billing_start_date,

            item.status ?? "Planning",

            item.created_by,

            item.updated_by

        ]

    );

    db.query(

        sql,

        [

            values

        ],

        callback

    );

};

// ======================================================
// GET CREATED STORE FOR NSO TRACKING
// ======================================================

NewStoreOpening.getNSOTrackingData = (

    id,

    callback

) => {

    const sql = `

        SELECT

            nso.id,

            nso.location,

            nso.city,

            nso.status,

            nso.layout_by_nso,

            nso.gst_deadline,

            nso.hr_hiring_deadline,

            nso.team_training_deadline,

            nso.nso_handover_deadline

        FROM new_store_openings nso

        WHERE nso.id = ?

    `;

    db.query(

        sql,

        [

            id

        ],

        (

            err,

            rows

        ) => {

            if (

                err

            ) {

                return callback(

                    err

                );

            }

            if (

                !rows ||

                rows.length === 0

            ) {

                return callback(

                    new Error(

                        "Project not found."

                    )

                );

            }

            callback(

                null,

                rows

            );

        }

    );

};

// ======================================================
// NSO CONTACT + TIMELINE SCHEMA MIGRATION
// ======================================================
NewStoreOpening.ensureColumns = async () => {
    const columns = [
        ["broker_email", "VARCHAR(255) NULL"],
        ["operation_head_email", "VARCHAR(255) NULL"],
        ["asm_email", "VARCHAR(255) NULL"],
        ["approver_email", "VARCHAR(255) NULL"],
        ["construction_vendor_email", "VARCHAR(255) NULL"],
        ["project_taken_by_email", "VARCHAR(255) NULL"],
        ["timeline_mode", "VARCHAR(20) NOT NULL DEFAULT 'automatic'"]
    ];
    for (const [column, definition] of columns) {
        try {
            await db.query(`ALTER TABLE new_store_openings ADD COLUMN ${column} ${definition}`);
        } catch (error) {
            if (error?.code !== "ER_DUP_FIELDNAME") throw error;
        }
    }
};

// ======================================================
// UPDATE PROJECT STATUS ONLY
// ======================================================
//
// Phase 1C: the New Store Opening record is the
// authoritative source of the business status.  Inspection
// and workflow services should use this method instead of
// updating status with ad-hoc SQL in different places.
// ======================================================
NewStoreOpening.updateStatus = (
    id,
    status,
    updatedBy,
    callback
) => {

    if (typeof updatedBy === "function") {
        callback = updatedBy;
        updatedBy = null;
    }

    const sql = `
        UPDATE new_store_openings
        SET
            status = ?,
            updated_by = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            status,
            updatedBy ?? null,
            id
        ],
        callback
    );
};


// ======================================================
// MODULE EXPORTS
// ======================================================

module.exports = NewStoreOpening;