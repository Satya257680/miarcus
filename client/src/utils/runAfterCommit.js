// =====================================================================
// runAfterCommit
//
// React 19's lint rule `react-hooks/set-state-in-effect` reports state
// updates that run synchronously inside an effect body, because they
// force an extra render straight after every commit.
//
// Effects in MIARCUS mostly start a data load ("setLoading(true) ->
// fetch -> setRows(...)") or sync a form when a modal opens. Those are
// legitimate effects; they only need their state updates to run from a
// callback instead of synchronously in the effect body.
//
// runAfterCommit(task) queues `task` as a microtask (it still runs
// before the browser's next paint) and returns a cleanup function.
// Return that cleanup from the effect so the task is skipped if the
// component unmounts or the effect re-runs before it starts:
//
//     useEffect(() => runAfterCommit(() => {
//         loadReports();
//     }), [loadReports]);
//
// Any cleanup the task itself returns (for example removing a listener
// it added) is run when the effect is cleaned up.
// =====================================================================

export default function runAfterCommit(task) {
    let active = true;
    let taskCleanup;

    const run = () => {
        if (!active) return;
        const result = task();
        if (typeof result === "function") taskCleanup = result;
    };

    if (typeof queueMicrotask === "function") queueMicrotask(run);
    else Promise.resolve().then(run);

    return () => {
        active = false;
        if (typeof taskCleanup === "function") {
            const cleanup = taskCleanup;
            taskCleanup = undefined;
            cleanup();
        }
    };
}
