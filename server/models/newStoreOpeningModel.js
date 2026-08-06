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

        VALUES

        (

            ?,?,?,?,?,?,?,?,?,?,

            ?,?,?,?,?,?,?,?,?,?,

            ?,?,?,?,?,?,?,?,?,?,

            ?,?,?,?,?,?,?,?,?,?,

            ?,?,?,?

        )

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

            data.operation_head_assigned,

            data.asm_assigned,

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

            data.construction_vendor,

            data.project_taken_by,

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

        callback

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

            location=?,

            city=?,

            sb_area=?,

            carpet_area=?,

            cam=?,

            mg=?,

            electricity_kva=?,

            revenue_share=?,

            escalation=?,

            expected_sale=?,

            possession_date_loi=?,

            possession_date_broker=?,

            broker_name=?,

            operation_head_assigned=?,

            asm_assigned=?,

            deal_days=?,

            actual_possession_date=?,

            remarks=?,

            attachment=?,

            delay_loi_vs_broker=?,

            possession_delay=?,

            received_by_nso=?,

            layout_by_nso=?,

            revised_layout_by_nso=?,

            approval_deadline=?,

            approver_name=?,

            construction_vendor=?,

            project_taken_by=?,

            visit_by_op_team=?,

            gst_deadline=?,

            hr_hiring_deadline=?,

            team_training_deadline=?,

            visit_by_nso_team_deadline=?,

            plan_of_stock_deadline=?,

            plan_of_collaterals_deadline=?,

            on_field_training_deadline=?,

            dispatch_stock_deadline=?,

            nso_handover_deadline=?,

            vm_handover_deadline=?,

            scanning_deadline=?,

            billing_start_date=?,

            status=?,

            updated_by=?

        WHERE id=?

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

            data.operation_head_assigned,

            data.asm_assigned,

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

            data.construction_vendor,

            data.project_taken_by,

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

            data.status,

            data.updated_by,

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
// MODULE EXPORTS
// ======================================================

module.exports = NewStoreOpening;