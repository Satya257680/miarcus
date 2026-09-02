const db = require("../config/db");

let ensureTablesPromise = null;

const ensureTables = async () => {
    // The Help Center loads several endpoints at once and React StrictMode
    // may invoke the initial effect twice in development. Share one schema
    // initialization promise so concurrent requests do not repeatedly execute
    // CREATE TABLE statements against the same database connection.
    if (ensureTablesPromise) return ensureTablesPromise;

    ensureTablesPromise = (async () => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS help_articles (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                question TEXT NOT NULL,
                answer LONGTEXT NOT NULL,
                category VARCHAR(100) NOT NULL DEFAULT 'General',
                keywords VARCHAR(1000) NULL,
                audience ENUM('employee','customer','both') NOT NULL DEFAULT 'both',
                status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
                sort_order INT NOT NULL DEFAULT 0,
                views_count INT UNSIGNED NOT NULL DEFAULT 0,
                created_by INT NULL,
                updated_by INT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_help_articles_status_audience (status, audience),
                INDEX idx_help_articles_category (category),
                INDEX idx_help_articles_updated (updated_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS help_tickets (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id INT NOT NULL,
                subject VARCHAR(255) NOT NULL,
                status ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
                priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
                assigned_to INT NULL,
                last_message_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_help_ticket_user_status (user_id, status),
                INDEX idx_help_ticket_queue (status, priority, last_message_at),
                INDEX idx_help_ticket_assignee (assigned_to)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS help_ticket_messages (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                ticket_id BIGINT UNSIGNED NOT NULL,
                sender_id INT NULL,
                sender_type ENUM('user','admin','zarvis') NOT NULL DEFAULT 'user',
                message LONGTEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_help_ticket_messages_ticket (ticket_id, id),
                INDEX idx_help_ticket_messages_sender (sender_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    })().catch((error) => {
        // Retry on a later request if the database was temporarily unavailable.
        ensureTablesPromise = null;
        throw error;
    });

    return ensureTablesPromise;
};

const mapArticle = (row) => ({
    ...row,
    id: Number(row.id),
    sort_order: Number(row.sort_order || 0),
    views_count: Number(row.views_count || 0),
});

const mapTicket = (row) => ({
    ...row,
    id: Number(row.id),
    user_id: Number(row.user_id),
    assigned_to: row.assigned_to == null ? null : Number(row.assigned_to),
});

const getPublishedArticles = async (audience = "employee") => {
    const normalized = ["employee", "customer", "both"].includes(audience) ? audience : "employee";
    const rows = await db.query(`
        SELECT id, title, question, answer, category, keywords, audience, status, sort_order, views_count, updated_at
        FROM help_articles
        WHERE status = 'published' AND audience IN (?, 'both')
        ORDER BY sort_order ASC, updated_at DESC, id DESC
    `, [normalized]);
    return rows.map(mapArticle);
};

const getAllArticles = async () => {
    const rows = await db.query(`
        SELECT a.*, creator.name AS creator_name, updater.name AS updater_name
        FROM help_articles a
        LEFT JOIN users creator ON creator.id = a.created_by
        LEFT JOIN users updater ON updater.id = a.updated_by
        ORDER BY a.sort_order ASC, a.updated_at DESC, a.id DESC
    `);
    return rows.map(mapArticle);
};

const getArticle = async (id) => {
    const rows = await db.query("SELECT * FROM help_articles WHERE id = ? LIMIT 1", [id]);
    return rows.length ? mapArticle(rows[0]) : null;
};

const createArticle = async (data) => {
    const result = await db.query(`
        INSERT INTO help_articles
            (title, question, answer, category, keywords, audience, status, sort_order, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        data.title, data.question, data.answer, data.category, data.keywords,
        data.audience, data.status, data.sort_order, data.userId, data.userId
    ]);
    return getArticle(result.insertId);
};

const updateArticle = async (id, data) => {
    await db.query(`
        UPDATE help_articles
        SET title = ?, question = ?, answer = ?, category = ?, keywords = ?, audience = ?,
            status = ?, sort_order = ?, updated_by = ?
        WHERE id = ?
    `, [
        data.title, data.question, data.answer, data.category, data.keywords,
        data.audience, data.status, data.sort_order, data.userId, id
    ]);
    return getArticle(id);
};

const deleteArticle = async (id) => {
    await db.query("DELETE FROM help_articles WHERE id = ?", [id]);
};

const incrementArticleViews = async (id) => {
    await db.query("UPDATE help_articles SET views_count = views_count + 1 WHERE id = ?", [id]);
};

const helpWords = (value) => String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

const helpDistance = (a, b) => {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
        let previous = row[0]; row[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
            const current = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
            previous = current;
        }
    }
    return row[b.length];
};

const rankHelpArticleCandidates = (rows, term) => {
    const queryWords = helpWords(term);
    const query = String(term || "").toLowerCase().trim();
    return rows.map((row) => {
        const question = String(row.question || "").toLowerCase();
        const title = String(row.title || "").toLowerCase();
        const keywords = String(row.keywords || "").toLowerCase();
        const answer = String(row.answer || "").toLowerCase();
        const haystack = `${question} ${title} ${keywords} ${answer}`;
        let score = Number(row.score || 0) * 2;
        if (query && question.includes(query)) score += 18;
        if (query && title.includes(query)) score += 14;
        if (query && keywords.includes(query)) score += 12;
        for (const word of queryWords) {
            if (haystack.includes(word)) { score += 3; continue; }
            const candidates = helpWords(haystack);
            if (candidates.some((candidate) => word.length >= 4 && helpDistance(word, candidate) <= 2)) score += 1.8;
        }
        return { ...row, score };
    }).sort((a, b) => b.score - a.score);
};

const searchArticles = async (term, audience = "employee") => {
    const normalized = ["employee", "customer", "both"].includes(audience) ? audience : "employee";
    const q = `%${String(term || "").trim().slice(0, 150)}%`;
    const exactRows = await db.query(`
        SELECT id, title, question, answer, category, keywords, audience, status, sort_order, views_count,
               (
                    (CASE WHEN LOWER(question) LIKE LOWER(?) THEN 8 ELSE 0 END) +
                    (CASE WHEN LOWER(title) LIKE LOWER(?) THEN 6 ELSE 0 END) +
                    (CASE WHEN LOWER(keywords) LIKE LOWER(?) THEN 5 ELSE 0 END) +
                    (CASE WHEN LOWER(answer) LIKE LOWER(?) THEN 1 ELSE 0 END)
               ) AS score
        FROM help_articles
        WHERE status = 'published'
          AND audience IN (?, 'both')
          AND (question LIKE ? OR title LIKE ? OR keywords LIKE ? OR answer LIKE ?)
        ORDER BY score DESC, sort_order ASC, updated_at DESC
        LIMIT 12
    `, [q, q, q, q, normalized, q, q, q, q]);

    // Natural-language fallback: retrieve a bounded set of approved articles and rank them
    // locally. This makes paraphrases and small spelling mistakes work without requiring an
    // external AI service or sending private Help Center content outside Miarcus.
    const candidates = exactRows.length >= 4 ? exactRows : await db.query(`
        SELECT id, title, question, answer, category, keywords, audience, status, sort_order, views_count,
               0 AS score
        FROM help_articles
        WHERE status = 'published'
          AND audience IN (?, 'both')
        ORDER BY sort_order ASC, updated_at DESC
        LIMIT 250
    `, [normalized]);

    return rankHelpArticleCandidates(candidates, term).slice(0, 8).map((row) => ({ ...mapArticle(row), score: Number(row.score || 0) }));
};

const createTicket = async ({ userId, subject, question, priority = "normal" }) => {
    const result = await db.query(`
        INSERT INTO help_tickets (user_id, subject, priority, last_message_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, subject, priority]);
    const ticketId = Number(result.insertId);
    await addTicketMessage(ticketId, userId, "user", question);
    return getTicket(ticketId, userId, false);
};

const addTicketMessage = async (ticketId, senderId, senderType, message) => {
    const result = await db.query(`
        INSERT INTO help_ticket_messages (ticket_id, sender_id, sender_type, message)
        VALUES (?, ?, ?, ?)
    `, [ticketId, senderId || null, senderType, message]);
    await db.query(`
        UPDATE help_tickets
        SET last_message_at = CURRENT_TIMESTAMP,
            status = CASE WHEN ? = 'admin' THEN 'in_progress' WHEN status IN ('resolved','closed') THEN 'open' ELSE status END
        WHERE id = ?
    `, [senderType, ticketId]);
    return Number(result.insertId);
};

const getTicket = async (id, userId = null, admin = false) => {
    const params = [id];
    let where = "t.id = ?";
    if (!admin && userId) {
        where += " AND t.user_id = ?";
        params.push(userId);
    }
    const rows = await db.query(`
        SELECT t.*, u.name AS user_name, u.email AS user_email,
               assignee.name AS assignee_name
        FROM help_tickets t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users assignee ON assignee.id = t.assigned_to
        WHERE ${where}
        LIMIT 1
    `, params);
    if (!rows.length) return null;
    const ticket = mapTicket(rows[0]);
    const messages = await db.query(`
        SELECT m.id, m.ticket_id, m.sender_id, m.sender_type, m.message, m.created_at,
               COALESCE(u.name, 'Zarvis') AS sender_name
        FROM help_ticket_messages m
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.ticket_id = ?
        ORDER BY m.id ASC
    `, [id]);
    ticket.messages = messages.map((m) => ({ ...m, id: Number(m.id), ticket_id: Number(m.ticket_id), sender_id: m.sender_id == null ? null : Number(m.sender_id) }));
    return ticket;
};

const getTicketsForUser = async (userId) => {
    const rows = await db.query(`
        SELECT t.*, u.name AS user_name, assignee.name AS assignee_name,
               (SELECT COUNT(*) FROM help_ticket_messages m WHERE m.ticket_id = t.id) AS message_count
        FROM help_tickets t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users assignee ON assignee.id = t.assigned_to
        WHERE t.user_id = ?
        ORDER BY t.last_message_at DESC, t.id DESC
    `, [userId]);
    return rows.map((row) => ({ ...mapTicket(row), message_count: Number(row.message_count || 0) }));
};

const getTicketsForAdmin = async (status = "all") => {
    const allowed = ["open", "in_progress", "resolved", "closed"];
    const params = [];
    let condition = "";
    if (allowed.includes(status)) {
        condition = "WHERE t.status = ?";
        params.push(status);
    }
    const rows = await db.query(`
        SELECT t.*, u.name AS user_name, u.email AS user_email, assignee.name AS assignee_name,
               (SELECT COUNT(*) FROM help_ticket_messages m WHERE m.ticket_id = t.id) AS message_count
        FROM help_tickets t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users assignee ON assignee.id = t.assigned_to
        ${condition}
        ORDER BY FIELD(t.priority, 'urgent','high','normal','low'), t.last_message_at DESC, t.id DESC
        LIMIT 250
    `, params);
    return rows.map((row) => ({ ...mapTicket(row), message_count: Number(row.message_count || 0) }));
};

const updateTicket = async (id, data) => {
    await db.query(`
        UPDATE help_tickets
        SET status = ?, priority = ?, assigned_to = ?
        WHERE id = ?
    `, [data.status, data.priority, data.assignedTo || null, id]);
    return getTicket(id, null, true);
};

module.exports = {
    ensureTables,
    getPublishedArticles,
    getAllArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    incrementArticleViews,
    searchArticles,
    createTicket,
    addTicketMessage,
    getTicket,
    getTicketsForUser,
    getTicketsForAdmin,
    updateTicket,
};
