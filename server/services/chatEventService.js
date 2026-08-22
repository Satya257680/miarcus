const clients = new Map();

const normalizeId = (id) => Number(id);

function addClient(userId, res) {
    const id = normalizeId(userId);
    if (!clients.has(id)) clients.set(id, new Set());

    const set = clients.get(id);
    set.add(res);

    return () => {
        set.delete(res);
        if (!set.size) clients.delete(id);
    };
}

function emitToUser(userId, event, payload) {
    const set = clients.get(normalizeId(userId));
    if (!set) return;

    const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const response of [...set]) {
        try {
            response.write(data);
        } catch {
            set.delete(response);
        }
    }
}

function emitToUsers(userIds, event, payload) {
    [...new Set((userIds || []).map(normalizeId).filter(Boolean))]
        .forEach(id => emitToUser(id, event, payload));
}

module.exports = {
    addClient,
    emitToUser,
    emitToUsers
};
