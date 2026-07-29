const db = require("../config/db");

const NewStoreOpening = {};
// ======================================================
// GET ALL NEW STORE OPENINGS
// SEARCH + PAGINATION
// ======================================================

NewStoreOpening.getAll = (filters, callback) => {

    let sql = `

        SELECT *

        FROM new_store_openings

        WHERE 1=1

    `;

    const values = [];

    // ==========================================
    // SEARCH
    // ==========================================

    if (filters.search) {

        sql += `

            AND (

                location LIKE ?

                OR city LIKE ?

                OR broker_name LIKE ?

                OR operation_head_assigned LIKE ?

                OR asm_assigned LIKE ?

            )

        `;

        const key = `%${filters.search}%`;

        values.push(

            key,

            key,

            key,

            key,

            key

        );

    }

    // ==========================================
    // ORDER
    // ==========================================

    sql += `

        ORDER BY id DESC

        LIMIT ?, ?

    `;

    values.push(

        filters.offset,

        filters.limit

    );

    db.query(

        sql,

        values,

        callback

    );

};
// ======================================================
// COUNT
// ======================================================

NewStoreOpening.count = (filters, callback) => {

    let sql = `

        SELECT COUNT(*) AS total

        FROM new_store_openings

        WHERE 1=1

    `;

    const values = [];

    if (filters.search) {

        sql += `

            AND (

                location LIKE ?

                OR city LIKE ?

                OR broker_name LIKE ?

                OR operation_head_assigned LIKE ?

                OR asm_assigned LIKE ?

            )

        `;

        const key = `%${filters.search}%`;

        values.push(

            key,

            key,

            key,

            key,

            key

        );

    }

    db.query(

        sql,

        values,

        callback

    );

};
// ======================================================
// GET BY ID
// ======================================================

NewStoreOpening.getById = (id, callback) => {

    db.query(

        `

        SELECT *

        FROM new_store_openings

        WHERE id = ?

        `,

        [id],

        callback

    );

};
// ======================================================
// CREATE NEW STORE OPENING
// ======================================================

NewStoreOpening.create = (data, callback) => {

    const sql = `

        INSERT INTO new_store_openings (

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

            created_by,
            updated_by

        )

        VALUES (

            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?

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

            data.created_by,
            data.updated_by

        ],

        callback

    );

};
// ======================================================
// UPDATE NEW STORE OPENING
// ======================================================

NewStoreOpening.update = (id, data, callback) => {

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

            data.updated_by,

            id

        ],

        callback

    );

};
// ======================================================
// DELETE NEW STORE OPENING
// ======================================================

NewStoreOpening.delete = (id, callback) => {

    db.query(

        `

        DELETE

        FROM new_store_openings

        WHERE id=?

        `,

        [id],

        callback

    );

};
module.exports = NewStoreOpening;