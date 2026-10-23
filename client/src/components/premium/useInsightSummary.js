import { useEffect, useState } from "react";
import axios from "../../axiosConfig.js";
import runAfterCommit from "../../utils/runAfterCommit";

// ======================================================
// useInsightSummary
// Loads KPI numbers from a /summary endpoint. `refreshKey` should
// change whenever the page reloads its table data so the tiles stay
// in sync with the list below.
// ======================================================
export function useInsightSummary(url, params = {}, refreshKey = null) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const paramsKey = JSON.stringify(params || {});

    useEffect(() => runAfterCommit(() => {
        let alive = true;
        setLoading(true);
        axios.get(url, { params: JSON.parse(paramsKey) })
            .then(({ data: res }) => { if (alive) setData(res?.data || null); })
            .catch(() => { if (alive) setData(null); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }), [url, paramsKey, refreshKey]);

    return { data, loading };
}

export default useInsightSummary;
