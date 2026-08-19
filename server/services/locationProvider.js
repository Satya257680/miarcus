const Location = require("../models/locationModel");

module.exports = {
    providerName: "browser-gps",
    async getCurrentLocations(options = {}) {
        return Location.getCurrentLocations(options);
    },
    async getHistory(employeeId, date) {
        return Location.getHistory(employeeId, date);
    }
};
