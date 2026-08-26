const provider = require("./locationProvider");
const controller = require("../controllers/locationController");

let running = false;

const runMobileLocationSync = async () => {
    if (running) return;
    running = true;
    try {
        if (await controller.isWithinWorkingHours()) {
            const result = await provider.sync();
            if (result?.configured) {
                console.log(`📍 Mobile location sync: ${result.locations || 0} location(s) received.`);
            }
        }
    } catch (error) {
        console.error("Mobile location scheduler failed:", error.message);
    } finally {
        running = false;
    }
};

const startMobileLocationScheduler = () => {
    const intervalMs = 5 * 60 * 1000;
    setTimeout(runMobileLocationSync, 20000);
    setInterval(runMobileLocationSync, intervalMs);
    console.log("📍 Mobile-network location scheduler enabled (09:00-21:00 IST).");
};

module.exports = { startMobileLocationScheduler, runMobileLocationSync };
