const Activity = require("../models/activityModel");

// ======================================================
// GET ALL ACTIVITIES
// ======================================================

exports.getAllActivities = (req, res) => {

    const filters = {
        search: req.query.search || "",
        module_name: req.query.module_name || "",
        status: req.query.status || "",
        priority: req.query.priority || "",
        new_store_opening_id: req.query.new_store_opening_id || "",
        page: req.query.page || 1,
        limit: req.query.limit || 10
    };

    Activity.getAll(

    filters,

    req.user,

    (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: "Failed to fetch activities"

            });

        }

        res.json({

            success: true,

            data: results

        });

    }

);
};

// ======================================================
// GET ACTIVITY BY ID
// ======================================================

exports.getActivityById = (req, res) => {

    const { id } = req.params;

Activity.getById(

    id,

    req.user,

    (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch activity"
            });

        }

        if (results.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Activity not found"
            });

        }

        res.json({
            success: true,
            data: results[0]
        });

    });

};

// ======================================================
// GET ACTIVITY DETAILS
// ======================================================

exports.getActivityDetails = (req, res) => {

    const { id } = req.params;

    Activity.getDetails(

    id,

    req.user,

    (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch activity details"
            });

        }

        if (results.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Activity not found"
            });

        }

        res.json({
            success: true,
            data: results[0]
        });

    });

};

// ======================================================
// GET ACTIVITY COMMENTS
// ======================================================

exports.getActivityComments = (req, res) => {

    const { id } = req.params;

    Activity.getComments(id, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: "Failed to fetch comments"

            });

        }

        res.json({

            success: true,

            data: results

        });

    });

};
// ======================================================
// GET ACTIVITY FILES
// ======================================================

exports.getActivityFiles = (req, res) => {

    const { id } = req.params;

    Activity.getFiles(id, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch files"
            });

        }

        res.json({
            success: true,
            data: results
        });

    });

};

// ======================================================
// GET ACTIVITY NOTIFICATIONS
// ======================================================

exports.getActivityNotifications = (req, res) => {

    const { id } = req.params;

    Activity.getNotifications(id, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch notifications"
            });

        }

        res.json({
            success: true,
            data: results
        });

    });

};

// ======================================================
// GET ACTIVITY MENTIONS
// ======================================================

exports.getActivityMentions = (req, res) => {

    const { id } = req.params;

    Activity.getMentions(id, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch mentions"
            });

        }

        res.json({
            success: true,
            data: results
        });

    });

};
// ======================================================
// GET ACTIVITY TIMELINE
// ======================================================

exports.getActivityTimeline = (req, res) => {

    const { id } = req.params;

    Activity.hasAccess(id, req.user, (err, allowed) => {

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

        Activity.getTimeline(id, (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to fetch activity timeline"

                });

            }

            res.json({

                success: true,

                data: results

            });

        });

    });

};
// ======================================================
// ADD ACTIVITY COMMENT
// ======================================================

exports.addComment = (req, res) => {

    const { id } = req.params;

    const { comment } = req.body;

    const userId = req.user.id;

    if (!comment || !comment.trim()) {

        return res.status(400).json({

            success: false,

            message: "Comment is required"

        });

    }

    Activity.addComment(

        id,

        userId,

        comment,

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to add comment"

                });

            }

            res.status(201).json({

                success: true,

                message: "Comment added successfully",

                data: {

                    id: result.insertId

                }

            });

        }

    );

};
// ======================================================
// UPLOAD ACTIVITY FILE
// ======================================================

exports.uploadActivityFile = (req, res) => {

    const { id } = req.params;

    const userId = req.user.id;

    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "Please select a file."

        });

    }

    Activity.uploadFile(

        id,

        userId,

        req.file.originalname,

        req.file.filename,

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to upload file"

                });

            }

            res.status(201).json({

                success: true,

                message: "File uploaded successfully",

                data: {

                    id: result.insertId

                }

            });

        }

    );

};

// ======================================================
// DELETE ACTIVITY FILE
// ======================================================

exports.deleteActivityFile = (req, res) => {

    const { fileId } = req.params;

    Activity.deleteFile(

        fileId,

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to delete file"

                });

            }

            res.json({

                success: true,

                message: "File deleted successfully"

            });

        }

    );

};