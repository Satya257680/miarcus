
/**
 * Zarvis general AI bridge.
 * Uses the existing Gemini environment configuration for broad knowledge,
 * coding help, natural conversation and multilingual answers.
 * Never sends or reveals secrets or raw private source code.
 */
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";
const TIMEOUT_MS = Math.max(8000, Number(process.env.ZARVIS_AI_TIMEOUT_MS) || 45000);

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || "";
const clean = (v, max = 12000) => String(v ?? "").replace(/\u0000/g, "").trim().slice(0, max);

const fetchWithTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try { return await fetch(url, { ...options, signal: controller.signal }); }
    finally { clearTimeout(timer); }
};

const safeHistory = (history) => (
    Array.isArray(history)
        ? history.slice(-8).map((item) => ({
            from: item?.from === "user" ? "user" : "zarvis",
            text: clean(item?.text, 1800),
            module: clean(item?.module, 120)
        })).filter((x) => x.text)
        : []
);

const safeProjectContext = (project = {}) => {
    const parts = [];
    if (project?.module) parts.push(`Relevant Miarcus module: ${clean(project.module, 160)}`);
    if (project?.answer) parts.push(`Project knowledge:\n${clean(project.answer, 10000)}`);
    if (Array.isArray(project?.matches) && project.matches.length) {
        parts.push("Related project knowledge:\n" + project.matches.slice(0, 5).map((m) =>
            `- ${clean(m.title || m.question, 180)}: ${clean(m.answer, 900)}`
        ).join("\n"));
    }
    return parts.join("\n\n").slice(0, 15000);
};

const buildPrompt = ({ question, language = "auto", audience = "employee", history = [], project = {}, verified = null }) => {
    const requestedLanguage = language && language !== "auto"
        ? language
        : "the same natural language and script used by the user. If the user mixes languages, follow the dominant language.";

    return `
You are Zarvis, the helpful AI assistant inside the Miarcus application.
Answer naturally like a strong modern AI assistant.

You can help with:
- Miarcus product usage, workflows, modules and project architecture.
- General knowledge: history, geography, science, mathematics, business and everyday questions.
- Programming/coding: concepts, debugging guidance, examples and architecture.
- Writing, summaries, comparisons and step-by-step explanations.

LANGUAGE:
Answer in ${requestedLanguage}. Understand spelling mistakes, Hinglish and Indian languages such as Hindi, Odia, Punjabi, Tamil, Kannada, Marathi, Bengali, Telugu, Gujarati, Malayalam and Urdu. Preserve important Miarcus names, route names and code identifiers where useful.

MIARCUS RULES:
- If the question is Miarcus-specific, use the supplied project context and do not invent features.
- If an administrator-approved answer is supplied, preserve its facts and expand/translate it clearly.
- You may answer general questions even when no Help Center article exists.
- For "how do I" questions give numbered practical steps.
- For detailed project questions explain purpose, flow, important fields, permissions and safe code locations when known.
- For coding questions explain the idea first and give useful example code; never claim to have changed the user's project.
- Never reveal passwords, API keys, JWTs, cookies, tokens, .env values, private keys, credentials or raw private source code.
- Do not claim live/current facts unless provided in context. Say when live web data would be required.
- Handle greetings, thanks and acknowledgements naturally.
- Be useful even with imperfect wording. Ask one short clarification only when necessary.
- Use concise Markdown headings, bullets and numbered steps.

ADMIN-APPROVED ANSWER:
${verified?.answer ? clean(verified.answer, 9000) : "None matched."}

SAFE MIARCUS PROJECT CONTEXT:
${safeProjectContext(project) || "No specific project context was retrieved."}

CONVERSATION:
${JSON.stringify(safeHistory(history))}

USER QUESTION:
${clean(question, 4000)}
`.trim();
};

const extractText = (payload) => payload?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("").trim() || "";

const requestModel = async (model, prompt) => {
    const apiKey = getApiKey();
    if (!apiKey) return { success: false, unavailable: true, message: "Gemini API key is not configured." };
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    try {
        const response = await fetchWithTimeout(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.35, maxOutputTokens: 2200 }
            })
        });
        const body = await response.text();
        if (!response.ok) {
            let message = "Gemini request failed.";
            try { message = JSON.parse(body)?.error?.message || message; } catch {}
            return { success: false, status: response.status, message };
        }
        let payload;
        try { payload = JSON.parse(body); } catch { return { success: false, message: "Gemini returned an invalid response." }; }
        const text = extractText(payload);
        return text ? { success: true, model, text } : { success: false, message: "Gemini returned an empty response." };
    } catch (error) {
        return { success: false, message: error?.name === "AbortError" ? "Zarvis AI timed out." : "Zarvis AI is temporarily unavailable." };
    }
};

const askGeneralZarvis = async (options = {}) => {
    const prompt = buildPrompt(options);
    const models = [DEFAULT_MODEL, FALLBACK_MODEL].filter((m, i, a) => m && a.indexOf(m) === i);
    let last = null;
    for (const model of models) {
        const result = await requestModel(model, prompt);
        if (result.success) return { success: true, text: result.text, model: result.model };
        last = result;
        if ([400, 401, 403].includes(Number(result.status))) break;
    }
    return { success: false, unavailable: Boolean(last?.unavailable), message: last?.message || "Zarvis AI is temporarily unavailable." };
};

module.exports = { askGeneralZarvis };
