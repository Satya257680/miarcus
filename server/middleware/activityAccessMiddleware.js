const Activity = require("../models/activityModel");

// ======================================================
// CHECK ACTIVITY OWNERSHIP
// ======================================================

const activityAccessMiddleware = (req, res, next) => {

    // ======================================================
    // NORMAL ACTIVITY ROUTES
    // /activities/:id/*
    // ======================================================

    if (req.params.id) {

        return Activity.hasAccess(

            req.params.id,

            req.user,

            (err, allowed) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: "Permission Check Failed"

                    });

                }

                if (!allowed) {

                    return res.status(403).json({

                        success: false,

                        message: "Access Denied"

                    });

                }

                next();

            }

        );

    }

    // ======================================================
    // DELETE FILE
    // /activities/files/:fileId
    // ======================================================

    if (req.params.fileId) {

        return Activity.getActivityIdByFileId(

            req.params.fileId,

            (err, result) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: "Permission Check Failed"

                    });

                }

                if (result.length === 0) {

                    return res.status(404).json({

                        success: false,

                        message: "File Not Found"

                    });

                }

                const activityId = result[0].activity_id;

                Activity.hasAccess(

                    activityId,

                    req.user,

                    (err, allowed) => {

                        if (err) {

                            console.error(err);

                            return res.status(500).json({

                                success: false,

                                message: "Permission Check Failed"

                            });

                        }

                        if (!allowed) {

                            return res.status(403).json({

                                success: false,

                                message: "Access Denied"

                            });

                        }

                        next();

                    }

                );

            }

        );

    }

    return res.status(400).json({

        success: false,

        message: "Invalid Request"

    });

};

module.exports = activityAccessMiddleware;