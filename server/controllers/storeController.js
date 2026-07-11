const Store = require("../models/storeModel");

const getStores = (req, res) => {

    Store.getAllStores((err, result) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.status(200).json(result);

    });

};

module.exports = {
    getStores,
};