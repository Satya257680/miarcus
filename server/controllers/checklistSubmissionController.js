const ChecklistSubmission = require(
    "../models/checklistSubmissionModel"
);

const inspectionService = require(
    "../services/inspectionService"
);

// ======================================================
// ACTIVITY + AUDIT
// ======================================================

const Activity = require(
    "../models/activityModel"
);

const Audit = require(
    "../models/auditModel"
);


// ======================================================
// CREATE CHECKLIST SUBMISSION
// POST /api/checklist-submissions
// ======================================================
//
// IMPORTANT
// ------------------------------------------------------
// Checklist Submission is completely independent from
// New Store Opening.
//
// new_store_opening_id is intentionally NOT required.
// The database column can remain for legacy records,
// but new checklist submissions store NULL.
//
// Workflow:
//
// 1. User selects Checklist Type
// 2. User selects Store
// 3. User selects Date
// 4. User answers questions
// 5. Optional attachment can be uploaded
// 6. Submission is saved
// 7. Inspection engine checks answers
// 8. Existing NSO rule is matched OR
//    automatic NSO rule is created when a problem is found
// 9. Action Point is created when required
// 10. Notification/activity is created
// 11. Report/Dashboard can use the submission
// ======================================================

exports.createSubmission = async (req, res) => {

    try {

        // ==================================================
        // REQUEST DATA
        // ==================================================

        const {

            checklist_type_id,

            store_id,

            submission_date,

            latitude,

            longitude,

            device

        } = req.body;


        // ==================================================
        // PARSE ANSWERS
        // ==================================================

        let answers = [];

        try {

            answers = JSON.parse(
                req.body.answers || "[]"
            );

        } catch (error) {

            console.error(
                "ANSWER PARSE ERROR:",
                error
            );

            answers = [];

        }


        // ==================================================
        // ATTACHMENT
        // OPTIONAL
        // ==================================================

        const attachment =
            req.file
                ? req.file.path
                : null;


        // ==================================================
        // DEVICE
        // ==================================================

        const finalDevice =
            device ||
            req.headers["user-agent"] ||
            "Unknown Device";


        // ==================================================
        // VALIDATION
        // ==================================================

        // Checklist Type
        if (!checklist_type_id) {

            return res.status(400).json({

                success: false,

                message:
                    "Checklist Type is required."

            });

        }


        // Store
        if (!store_id) {

            return res.status(400).json({

                success: false,

                message:
                    "Store is required."

            });

        }


        // Submission Date
        if (!submission_date) {

            return res.status(400).json({

                success: false,

                message:
                    "Submission date is required."

            });

        }


        // ==================================================
        // VALIDATE ANSWERS
        // ==================================================

        const validAnswers =
            answers.filter(

                (item) =>
                    item &&
                    item.question_id

            );


        if (validAnswers.length === 0) {

            return res.status(400).json({

                success: false,

                message:
                    "Checklist answers required."

            });

        }


        // ==================================================
        // SUBMISSION DATA
        // ==================================================
        //
        // IMPORTANT:
        //
        // DO NOT require:
        //
        // new_store_opening_id
        //
        // The checklist is independent.
        //
        // We keep the database column as NULL for
        // backward compatibility with old records.
        // ==================================================

        const submissionData = {

            new_store_opening_id:
                null,

            checklist_type_id:
                Number(checklist_type_id),

            store_id:
                Number(store_id),

            submitted_by:
                req.user.id,

            submission_date,

            latitude:
                latitude || null,

            longitude:
                longitude || null,

            device:
                finalDevice,

            attachment,

            // A checklist submission is considered completed once it is
            // successfully submitted. Any Action Point created from an
            // answer has its own independent Open/In Progress/Closed status.
            status:
                "Completed"

        };


        // ==================================================
        // CREATE CHECKLIST SUBMISSION
        // ==================================================

        ChecklistSubmission.create(

            submissionData,

            validAnswers,

            async (err, result) => {

                // ==================================================
                // DATABASE ERROR
                // ==================================================

                if (err) {

                    console.error(
                        "CHECKLIST CREATE ERROR:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Checklist submission failed."

                    });

                }


                // ==================================================
                // SUBMISSION ID
                // ==================================================

                const submissionId =
                    result.submissionId;


                // ==================================================
                // AUTOMATIC INSPECTION
                // ==================================================
                //
                // The inspection service is responsible for:
                //
                // 1. Loading answers
                // 2. Loading active NSO rules
                // 3. Detecting problems
                // 4. Matching existing rules
                // 5. Creating automatic NSO rules
                // 6. Creating Action Points
                // 7. Creating notifications/activity
                // 8. Updating checklist NSO status
                //
                // New Store Opening is NOT required.
                // ==================================================

                let inspectionResult = {

                    score: 0,

                    nso_status:
                        "Closed"

                };


                try {

                    inspectionResult =
                        await inspectionService.runInspection(

                            submissionId,

                            req.user.id

                        );

                } catch (inspectionError) {

                    console.error(
                        "Inspection Error:",
                        inspectionError
                    );

                    // IMPORTANT:
                    // The checklist itself has already been saved.
                    //
                    // Therefore inspection failure should not
                    // make the submission disappear.
                    //
                    // The record remains available for reporting.
                    //
                    // We keep a safe default status.

                    inspectionResult = {

                        score: 0,

                        nso_status:
                            "Closed",

                        inspection_error:
                            inspectionError.message

                    };

                }


                // ==================================================
                // UPDATE INSPECTION RESULT
                // ==================================================

                ChecklistSubmission.updateInspectionResult(

                    submissionId,

                    inspectionResult.score || 0,

                    inspectionResult.nso_status ||
                        "Closed",

                    req.user.id,

                    (updateError) => {

                        if (updateError) {

                            console.error(
                                "INSPECTION RESULT UPDATE ERROR:",
                                updateError
                            );

                        }

                    }

                );


                // ==================================================
                // ACTIVITY CENTER
                // ==================================================

                Activity.create({

                    title:
                        "Checklist Submitted",

                    description:
                        `Checklist submitted for store ${store_id}`,

                    module_name:
                        "Checklist Submission",

                    status:
                        "Open",

                    priority:
                        "Medium",

                    created_by:
                        req.user.id,

                    assigned_to:
                        null

                }, (activityError) => {

                    if (activityError) {

                        console.error(
                            "ACTIVITY CREATE ERROR:",
                            activityError
                        );

                    }

                });


                // ==================================================
                // AUDIT TRAIL
                // ==================================================

                Audit.create({

                    module_name:
                        "Checklist Submission",

                    reference_id:
                        submissionId,

                    action:
                        "CREATE",

                    old_data:
                        null,

                    new_data: {

                        ...submissionData,

                        inspection:
                            inspectionResult

                    },

                    changed_by:
                        req.user.id

                }, (auditError) => {

                    if (auditError) {

                        console.error(
                            "AUDIT CREATE ERROR:",
                            auditError
                        );

                    }

                });


                // ==================================================
                // RESPONSE
                // ==================================================

                return res.status(201).json({

                    success: true,

                    message:
                        "Checklist submitted successfully.",

                    data: {

                        submission_id:
                            submissionId,

                        new_store_opening_id:
                            null,

                        inspection:
                            inspectionResult

                    }

                });

            }

        );

    } catch (error) {

        console.error(
            "CHECKLIST SUBMISSION ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Internal Server Error"

        });

    }

};


// ======================================================
// GET ALL CHECKLIST SUBMISSIONS
// SEARCH + PAGINATION
// GET /api/checklist-submissions
// ======================================================

exports.getAllSubmissions = (req, res) => {

    const filters = {

        search:
            req.query.search || "",

        page:
            Number(req.query.page) || 1,

        limit:
            Number(req.query.limit) || 10

    };


    ChecklistSubmission.getAll(

        filters,

        (err, results) => {

            if (err) {

                console.error(
                    "GET SUBMISSIONS ERROR:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        err.message

                });

            }


            ChecklistSubmission.countAll(

                filters,

                (countErr, countResult) => {

                    if (countErr) {

                        console.error(
                            "COUNT ERROR:",
                            countErr
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                countErr.message

                        });

                    }


                    const total =
                        countResult[0].total;


                    return res.status(200).json({

                        success: true,

                        data:
                            results,

                        pagination: {

                            page:
                                filters.page,

                            limit:
                                filters.limit,

                            total,

                            totalPages:
                                Math.ceil(
                                    total /
                                    filters.limit
                                )

                        }

                    });

                }

            );

        }

    );

};


// ======================================================
// GET SINGLE CHECKLIST SUBMISSION
// GET /api/checklist-submissions/:id
// ======================================================

exports.getSubmissionById = (req, res) => {

    const id =
        req.params.id;


    ChecklistSubmission.getById(

        id,

        (err, submission) => {

            if (err) {

                console.error(
                    "GET SUBMISSION ERROR:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        err.message

                });

            }


            if (
                !submission ||
                submission.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Checklist submission not found."

                });

            }


            ChecklistSubmission.getAnswers(

                id,

                (answerErr, answers) => {

                    if (answerErr) {

                        console.error(
                            "GET ANSWERS ERROR:",
                            answerErr
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                answerErr.message

                        });

                    }


                    const data = {

                        ...submission[0],

                        answers,

                        inspection: {

                            score:
                                submission[0]
                                    .inspection_score,

                            nso_status:
                                submission[0]
                                    .nso_status,

                            processed_at:
                                submission[0]
                                    .processed_at,

                            processed_by:
                                submission[0]
                                    .processed_by,

                            processed_by_name:
                                submission[0]
                                    .processed_by_name

                        }

                    };


                    return res.status(200).json({

                        success: true,

                        data

                    });

                }

            );

        }

    );

};


// ======================================================
// UPDATE CHECKLIST SUBMISSION STATUS
// PUT /api/checklist-submissions/:id/status
// ======================================================

exports.updateStatus = (req, res) => {

    const id =
        req.params.id;

    const {
        status
    } = req.body;


    // ==================================================
    // VALIDATION
    // ==================================================

    if (!status) {

        return res.status(400).json({

            success: false,

            message:
                "Status is required."

        });

    }


    const validStatus = [

        "Submitted",

        "In Progress",

        "Completed",

        "Rejected",

        "Closed"

    ];


    if (
        !validStatus.includes(status)
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid status."

        });

    }


    // ==================================================
    // GET OLD DATA
    // ==================================================

    ChecklistSubmission.getById(

        id,

        (oldErr, oldData) => {

            if (oldErr) {

                console.error(oldErr);

                return res.status(500).json({

                    success: false,

                    message:
                        oldErr.message

                });

            }


            if (
                !oldData ||
                oldData.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Submission not found."

                });

            }


            // ==================================================
            // UPDATE STATUS
            // ==================================================

            ChecklistSubmission.updateStatus(

                id,

                status,

                (err) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message:
                                err.message

                        });

                    }


                    // ==================================================
                    // ACTIVITY
                    // ==================================================

                    Activity.create({

                        title:
                            "Checklist Status Updated",

                        description:
                            `Checklist submission ${id} status changed to ${status}`,

                        module_name:
                            "Checklist Submission",

                        status:
                            "Open",

                        priority:
                            "Medium",

                        created_by:
                            req.user.id,

                        assigned_to:
                            null

                    }, () => {});


                    // ==================================================
                    // AUDIT
                    // ==================================================

                    Audit.create({

                        module_name:
                            "Checklist Submission",

                        reference_id:
                            id,

                        action:
                            "UPDATE_STATUS",

                        old_data:
                            oldData[0],

                        new_data: {

                            status,

                            inspection_score:
                                oldData[0]
                                    .inspection_score,

                            nso_status:
                                oldData[0]
                                    .nso_status

                        },

                        changed_by:
                            req.user.id

                    }, () => {});


                    return res.status(200).json({

                        success: true,

                        message:
                            "Checklist status updated successfully."

                    });

                }

            );

        }

    );

};


// ======================================================
// EXPORT CHECKLIST SUBMISSIONS
// GET /api/checklist-submissions/export
// ======================================================

exports.exportSubmissions = (req, res) => {

    ChecklistSubmission.exportData(

        (err, results) => {

            if (err) {

                console.error(
                    "EXPORT ERROR:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        err.message

                });

            }


            let csv =

                "ID," +
                "Checklist Type," +
                "Store," +
                "Submitted By," +
                "Submission Date," +
                "Status," +
                "Inspection Score," +
                "NSO Status," +
                "Processed At," +
                "Processed By," +
                "Created At\n";


            results.forEach(

                (item) => {

                    csv +=

                        `"${item.id}",` +

                        `"${item.checklist_type}",` +

                        `"${item.store_name}",` +

                        `"${item.submitted_by}",` +

                        `"${item.submission_date}",` +

                        `"${item.status}",` +

                        `"${item.inspection_score}",` +

                        `"${item.nso_status}",` +

                        `"${item.processed_at || ""}",` +

                        `"${item.processed_by || ""}",` +

                        `"${item.created_at}"\n`;

                }

            );


            // ==================================================
            // ACTIVITY
            // ==================================================

            Activity.create({

                title:
                    "Checklist Submissions Exported",

                description:
                    "Checklist submissions exported as CSV",

                module_name:
                    "Checklist Submission",

                status:
                    "Closed",

                priority:
                    "Low",

                created_by:
                    req.user.id,

                assigned_to:
                    null

            }, () => {});


            // ==================================================
            // AUDIT
            // ==================================================

            Audit.create({

                module_name:
                    "Checklist Submission",

                reference_id:
                    null,

                action:
                    "EXPORT",

                old_data:
                    null,

                new_data: {

                    total_records:
                        results.length

                },

                changed_by:
                    req.user.id

            }, () => {});


            // ==================================================
            // CSV RESPONSE
            // ==================================================

            res.setHeader(
                "Content-Type",
                "text/csv"
            );


            res.setHeader(

                "Content-Disposition",

                "attachment; filename=Checklist_Submissions.csv"

            );


            return res
                .status(200)
                .send(csv);

        }

    );

};


// ======================================================
// CONTROLLER EXPORT
// ======================================================

module.exports.createSubmission =
    exports.createSubmission;

module.exports.getAllSubmissions =
    exports.getAllSubmissions;

module.exports.getSubmissionById =
    exports.getSubmissionById;

module.exports.updateStatus =
    exports.updateStatus;

module.exports.exportSubmissions =
    exports.exportSubmissions;