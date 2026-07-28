// ======================================================
// Email Queue
// Sends one email at a time to avoid SMTP connection issues
// ======================================================

const queue = [];

let processing = false;

// ======================================================
// Process Queue
// ======================================================

async function processQueue() {

    // Already processing
    if (processing) return;

    processing = true;

    try {

        while (queue.length > 0) {

            const job = queue.shift();

            try {

                await job();

            } catch (err) {

                console.error(
                    "Email Queue Error:",
                    err.message || err
                );

            }

        }

    } finally {

        processing = false;

    }

}

// ======================================================
// Add Job to Queue
// ======================================================

async function addToQueue(job) {

    if (typeof job !== "function") {

        throw new Error(
            "Queue job must be a function."
        );

    }

    queue.push(job);

    await processQueue();

}

// ======================================================
// Queue Status (Optional)
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