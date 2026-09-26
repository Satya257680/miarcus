import PremiumLoader from "../../premium/PremiumLoader";

// ======================================================
// LOADING
// Every loading state in the portal uses the MIARCUS premium
// loader (see components/premium/PremiumLoader.jsx).
//   <Loading />                    → compact loader in place
//   <Loading fullScreen />         → full-screen overlay
//   <Loading text="Loading data" /> → custom title
// ======================================================

function Loading({
    text = "Loading...",
    fullScreen = false,
    size = "medium",
    className = "",
    progress,
    processed,
    total,
}) {
    const title = String(text || "Processing Your Data...").replace(/…/g, "").replace(/\.+$/, "");

    return (
        <PremiumLoader
            title={title || "Processing Your Data"}
            compact={!fullScreen && size !== "large"}
            overlay={fullScreen}
            className={className}
            progress={progress}
            processed={processed}
            total={total}
        />
    );
}

export default Loading;
