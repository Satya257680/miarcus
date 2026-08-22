// ======================================================
// MIARCUS EMAIL QUEUE
// Sends one email at a time and propagates failures back
// to the caller instead of silently swallowing them.
// ======================================================

const queue = [];
let processing = false;

// ======================================================
// Process Queue
// ======================================================

async function processQueue() {

    if (processing) return;

    processing = true;

    try {

        while (queue.length > 0) {

            const item = queue.shift();

            if (!item) continue;

            try {

                const result = await item.job();
                item.resolve(result);

            } catch (err) {

                console.error(
                    "❌ Email Queue Error:",
                    err?.message || err
                );

                item.reject(err);

            }
        }

    } finally {

        processing = false;

        // A job can be added immediately after the final while check.
        // Make sure it is not left waiting.
        if (queue.length > 0) {
            void processQueue();
        }

    }
}

// ======================================================
// Add Job to Queue
// ======================================================

function addToQueue(job) {

    if (typeof job !== "function") {
        return Promise.reject(
            new Error("Queue job must be a function.")
        );
    }

    return new Promise((resolve, reject) => {

        queue.push({
            job,
            resolve,
            reject
        });

        void processQueue();

    });
}

// ======================================================
// Queue Status
// ======================================================

function getQueueLength() {
    return queue.length;
}

// ======================================================
// Export
// ======================================================

module.exports = {
    addToQueue,
    getQueueLength
};
