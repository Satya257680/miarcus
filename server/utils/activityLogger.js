const db = require("../config/db");

// ======================================================
// DEFAULTS
// ======================================================

const DEFAULT_ACTIVITY_TYPE =
    "NSO Activity";

const DEFAULT_REFERENCE_ID =
    0;

const DEFAULT_TITLE =
    "NSO Activity";

const DEFAULT_DESCRIPTION =
    "";

const DEFAULT_MODULE =
    "New Store Openings";

const DEFAULT_STATUS =
    "Open";

const DEFAULT_PRIORITY =
    "Medium";


// ======================================================
// NORMALIZE USER ID
// ======================================================

const normalizeUserId = (value) => {

    const id = Number(value);

    if (
        Number.isInteger(id) &&
        id > 0
    ) {

        return id;

    }

    return null;

};


// ======================================================
// NORMALIZE REFERENCE ID
// ======================================================

const normalizeReferenceId = (value) => {

    const id = Number(value);

    if (
        Number.isInteger(id) &&
        id >= 0
    ) {

        return id;

    }

    return DEFAULT_REFERENCE_ID;

};


// ======================================================
// LOG ACTIVITY
// ======================================================

const logActivity = async (
    activity = {}
) => {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            // ------------------------------------------
            // NORMALIZE DATA
            // ------------------------------------------

            const activityType =
                activity.activity_type ||
                DEFAULT_ACTIVITY_TYPE;

            const referenceId =
                normalizeReferenceId(
                    activity.reference_id
                );

            const title =
                activity.title ||
                DEFAULT_TITLE;

            const description =
                activity.description ||
                DEFAULT_DESCRIPTION;

            const moduleName =
                activity.module_name ||
                DEFAULT_MODULE;

            const status =
                activity.status ||
                DEFAULT_STATUS;

            const priority =
                activity.priority ||
                DEFAULT_PRIORITY;

            const createdBy =
                normalizeUserId(
                    activity.created_by
                );

            const assignedTo =
                normalizeUserId(
                    activity.assigned_to
                );


            // ------------------------------------------
            // INSERT ACTIVITY
            // ------------------------------------------

            const sql = `
                INSERT INTO activities
                (
                    activity_type,
                    reference_id,
                    title,
                    description,
                    module_name,
                    status,
                    priority,
                    created_by,
                    assigned_to
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;


            db.query(

                sql,

                [

                    activityType,

                    referenceId,

                    title,

                    description,

                    moduleName,

                    status,

                    priority,

                    createdBy,

                    assignedTo

                ],

                (
                    err,
                    result
                ) => {

                    if (err) {

                        console.error(
                            "Activity Log Error:",
                            err
                        );

                        return reject(
                            err
                        );

                    }


                    // ----------------------------------
                    // ACTIVITY ID
                    // ----------------------------------

                    const activityId =
                        result.insertId;


                    // ----------------------------------
                    // TIMELINE
                    // ----------------------------------

                    const timelineSql = `
                        INSERT INTO activity_timeline
                        (
                            activity_id,
                            event_type,
                            event_description,
                            created_by
                        )
                        VALUES (?, ?, ?, ?)
                    `;


                    db.query(

                        timelineSql,

                        [

                            activityId,

                            activityType,

                            description,

                            createdBy

                        ],

                        (
                            timelineErr
                        ) => {

                            if (
                                timelineErr
                            ) {

                                console.error(
                                    "Activity Timeline Error:",
                                    timelineErr
                                );

                            }

                        }

                    );


                    // ----------------------------------
                    // NOTIFICATION
                    // ----------------------------------

                    if (
                        assignedTo !== null
                    ) {

                        const notificationSql = `
                            INSERT INTO activity_notifications
                            (
                                activity_id,
                                user_id,
                                notification
                            )
                            VALUES (?, ?, ?)
                        `;


                        db.query(

                            notificationSql,

                            [

                                activityId,

                                assignedTo,

                                description

                            ],

                            (
                                notificationErr
                            ) => {

                                if (
                                    notificationErr
                                ) {

                                    console.error(
                                        "Activity Notification Error:",
                                        notificationErr
                                    );

                                }

                            }

                        );

                    }


                    // ----------------------------------
                    // SUCCESS
                    // ----------------------------------

                    return resolve(
                        result
                    );

                }

            );

        }
    );

};


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    logActivity

};