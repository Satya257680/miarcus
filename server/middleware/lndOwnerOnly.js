const { isOwner } = require("../utils/lndAccess");

// Only the L&D owner may pass. Administrators are NOT enough.
const lndOwnerOnly = async (req, res, next) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (await isOwner(req.user.id)) return next();

        return res.status(403).json({
            success: false,
            message: "Only the Learning & Development owner can manage access.",
        });
    } catch (error) {
        console.error("L&D owner check failed:", error);
        return res.status(500).json({ success: false, message: "Permission Check Failed" });
    }
};

module.exports = lndOwnerOnly;
