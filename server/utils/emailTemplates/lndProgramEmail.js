// ======================================================
// L&D — "training assigned" / "training updated" email
// Uses the shared MIARCUS baseTemplate (logo, buttons, footer).
// Contains only the learner's own name and the program details —
// never other learners' data.
// ======================================================

const baseTemplate = require("./baseTemplate");
const { getAppUrl } = require("../../config/appUrl");

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const lndProgramEmail = ({ kind = "invite", learnerName, program, moduleCount = 0, message = "" }) => {
    const link = `${String(getAppUrl() || "").replace(/\/+$/, "")}/learning-development/program/${program.id}`;
    const isUpdate = kind === "update";
    const title = isUpdate ? "Your Training Has Been Updated" : "New Training Assigned to You";

    const intro = isUpdate
        ? `The training program <strong style="color:#5F39FF;">${escapeHtml(program.title)}</strong> has new or updated learning content.`
        : `You have been assigned the training program <strong style="color:#5F39FF;">${escapeHtml(program.title)}</strong> in Mi Arcus Learning &amp; Development.`;

    const details = [
        program.description ? `<p style="margin:0 0 10px;">${escapeHtml(program.description)}</p>` : "",
        moduleCount ? `<p style="margin:0;"><strong>${moduleCount}</strong> module${moduleCount === 1 ? "" : "s"} · complete them in order, pass the assessments, and get your certificate.</p>` : "",
    ].join("");

    const html = baseTemplate({
        title,
        greeting: `Hello <span style="color:#5F39FF;font-weight:bold;">${escapeHtml(learnerName || "there")}</span>,`,
        intro,
        message: details,
        buttonText: isUpdate ? "Open My Training" : "Start Learning",
        buttonLink: link,
        infoBoxTitle: isUpdate ? "What changed" : "How it works",
        infoBoxMessage: isUpdate
            ? escapeHtml(message || "New or updated modules are available. Your completed modules and certificates are kept.")
            : "Modules unlock one after another. Finish the lesson, pass the assessment (if there is one) and your certificate is issued automatically.",
        bottomMessage: "You received this email because this training is assigned to you in Mi Arcus.",
        showButton: true,
        showInfoBox: true,
    });

    const subject = isUpdate
        ? `Training updated: ${program.title}`
        : `New training assigned: ${program.title}`;

    const text = `${title}\n\n${isUpdate ? "Updated" : "Assigned"}: ${program.title}\n${program.description || ""}\n${isUpdate && message ? `\nWhat changed: ${message}\n` : ""}\nOpen: ${link}`;

    return { subject, html, text };
};

module.exports = lndProgramEmail;
