const axios = require("axios");
const Location = require("../models/locationModel");

const API_URL = String(process.env.MOBILE_LOCATION_API_URL || "").trim();
const API_KEY = String(process.env.MOBILE_LOCATION_API_KEY || "").trim();
const PROVIDER_NAME = String(process.env.MOBILE_LOCATION_PROVIDER || "mobile-network").trim();

const normalize = (value) => String(value || "").replace(/[^0-9+]/g, "");

const syncFromCarrier = async () => {
    if (!API_URL || !API_KEY) return { configured: false, locations: 0 };

    const targets = await Location.getMobileTargets();
    const phoneNumbers = targets
        .map((target) => normalize(target.phone_number || target.mobile))
        .filter(Boolean);

    if (!phoneNumbers.length) return { configured: true, locations: 0 };

    const response = await axios.post(
        API_URL,
        { phoneNumbers },
        {
            timeout: 15000,
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );

    const locations = Array.isArray(response.data?.locations)
        ? response.data.locations
        : Array.isArray(response.data)
            ? response.data
            : [];

    let saved = 0;

    for (const location of locations) {
        const phone = normalize(location.phoneNumber || location.phone || location.msisdn);
        const target = targets.find(
            (item) => normalize(item.phone_number || item.mobile) === phone
        );

        if (!target) continue;

        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

        const capturedAt = location.capturedAt || location.timestamp || new Date().toISOString();

        await Location.saveRecord({
            employee_id: target.employee_id,
            latitude,
            longitude,
            accuracy: Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : null,
            source: "mobile-network",
            captured_at: new Date(capturedAt)
        });

        saved += 1;
    }

    return { configured: true, locations: saved };
};

module.exports = {
    providerName: PROVIDER_NAME,
    async sync() {
        try {
            return await syncFromCarrier();
        } catch (error) {
            console.error("Mobile network location provider sync failed:", error.message);
            return { configured: true, locations: 0, error: error.message };
        }
    },
    async getCurrentLocations(options = {}) {
        await syncFromCarrier();
        return Location.getCurrentLocations(options);
    },
    async getHistory(employeeId, date) {
        return Location.getHistory(employeeId, date);
    }
};
