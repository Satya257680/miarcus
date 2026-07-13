const ActionPoint = require("../models/actionPointModel");

// ================= Get All Action Points =================

const getActionPoints = (req, res) => {

    ActionPoint.getAllActionPoints((err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch Action Points",
                error: err,
            });
        }

        res.status(200).json(result);

    });

};

// ================= Create Action Point =================

const createActionPoint = (req, res) => {

    console.log("===== REQUEST BODY =====");
    console.log(req.body);

    ActionPoint.createActionPoint(req.body, (err, result) => {

        if (err) {

            console.log("===== MYSQL ERROR =====");
            console.log(err);

            return res.status(500).json({
                success: false,
                message: "Failed to create Action Point",
                error: err,
            });

        }

        res.status(201).json({
            success: true,
            message: "Action Point Created Successfully",
            id: result.insertId,
        });

    });

};

module.exports = {
    getActionPoints,
    createActionPoint,
};