const ActionPoint = require("../models/actionPointModel");

// ================= Get All Action Points =================

const getActionPoints = (req, res) => {

    ActionPoint.getAllActionPoints((err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.status(200).json(result);

    });

};

// ================= Create Action Point =================

const createActionPoint = (req, res) => {

    ActionPoint.createActionPoint(req.body, (err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.status(201).json({
            message: "Action Point Created Successfully",
        });

    });

};

module.exports = {
    getActionPoints,
    createActionPoint,
};