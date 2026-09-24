import { useNavigate } from "react-router-dom";
import { LuShieldOff, LuArrowRight, LuLifeBuoy } from "react-icons/lu";

import { getFirstAllowedPath } from "../../utils/rbac";
import "../../styles/rbac.css";

// Shown when a user opens a page (link, bookmark, typed URL) that
// their role does not include.
function AccessDenied() {
  const navigate = useNavigate();
  const fallback = getFirstAllowedPath();

  return (
    <section className="rbac-denied" role="alert">
      <div className="rbac-denied-card">
        <div className="rbac-denied-icon">
          <LuShieldOff />
        </div>

        <span className="rbac-denied-eyebrow">Restricted</span>

        <h2>You don't have access to this page</h2>

        <p>
          Your role doesn't include this module or page. If you need it for
          your work, ask an administrator to update your access from
          Settings → Users.
        </p>

        <div className="rbac-denied-actions">
          <button
            type="button"
            className="rbac-denied-primary"
            data-rbac="ignore"
            onClick={() => navigate(fallback, { replace: true })}
          >
            Go to my workspace
            <LuArrowRight />
          </button>

          <button
            type="button"
            className="rbac-denied-secondary"
            data-rbac="ignore"
            onClick={() => navigate("/help-center")}
          >
            <LuLifeBuoy />
            Help Center
          </button>
        </div>
      </div>
    </section>
  );
}

export default AccessDenied;
