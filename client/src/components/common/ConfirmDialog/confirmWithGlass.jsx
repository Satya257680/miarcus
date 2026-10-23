import { createRoot } from "react-dom/client";
import GlassConfirmDialog from "./GlassConfirmDialog.jsx";

// ======================================================
// confirmWithGlass(options) -> Promise<boolean>
// Opens the glass confirmation dialog imperatively and resolves
// true (confirmed) or false (cancelled / failed). The dialog UI is in
// GlassConfirmDialog.jsx so this file only exports this helper, which
// keeps React Fast Refresh working (react-refresh/only-export-components).
// ======================================================

export default function confirmWithGlass(input = {}) {
  const options =
    typeof input === "string" ? { message: input } : input || {};

  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.className = "confirm-dialog-root";
    document.body.appendChild(container);

    const root = createRoot(container);
    let settled = false;

    const cleanup = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);

      requestAnimationFrame(() => {
        root.unmount();
        container.remove();
      });
    };

    root.render(
      <GlassConfirmDialog
        {...options}
        onCancel={() => cleanup(false)}
        onConfirm={async () => {
          try {
            if (options.onConfirm) await options.onConfirm();
            cleanup(true);
          } catch (error) {
            console.error("Delete/confirmation failed:", error);
            cleanup(false);
          }
        }}
      />
    );
  });
}
