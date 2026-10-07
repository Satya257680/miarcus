import { useMemo, useState } from "react";
import { FaSearch, FaStore, FaCalendarAlt, FaTimes } from "react-icons/fa";
import { formatDate } from "./salesTeamUtils";

/**
 * Premium, compact store schedule used by both Travel Plan and
 * Travel Plan Approvals. Keeps long store lists inside a scrollable
 * panel and makes every store/date immediately readable.
 */
export default function TravelStoreSchedule({ stores = [], blankDays = [], compact = false, highlightVisit = false }) {
  const [search, setSearch] = useState("");

  const safeStores = Array.isArray(stores) ? stores : [];
  const safeBlankDays = Array.isArray(blankDays) ? blankDays : [];
  const query = search.trim().toLowerCase();

  const filteredStores = useMemo(() => {
    if (!query) return safeStores;

    return safeStores.filter((store) => {
      const haystack = [
        store.store_name,
        store.store_code,
        store.city,
        store.visit_date,
        formatDate(store.visit_date),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [query, safeStores]);

  const filteredBlankDays = useMemo(() => {
    if (!query) return safeBlankDays;

    return safeBlankDays.filter((item) =>
      [item.date, item.reason_type, item.reason, formatDate(item.date)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [query, safeBlankDays]);

  const total = safeStores.length + safeBlankDays.length;
  const visible = filteredStores.length + filteredBlankDays.length;

  return (
    <div className={`travel-store-schedule ${compact ? "travel-store-schedule--compact" : ""} ${highlightVisit ? "travel-store-schedule--highlight-visit" : ""}`}>
      <div className="travel-store-toolbar">
        <div className="travel-store-count">
          <FaStore />
          <strong>{visible}</strong>
          <span>{query ? `of ${total}` : "stores"}</span>
        </div>

        <div className="travel-store-search">
          <FaSearch />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search store or date..."
            aria-label="Search planned stores"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear store search">
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      <div className="travel-store-scroll" role="list" aria-label="Planned stores">
        {filteredStores.map((store) => (
          <div className="travel-store-chip" key={`${store.store_id}-${store.visit_date || "no-date"}`} role="listitem">
            <div className="travel-store-chip-main">
              <span className="travel-store-chip-icon"><FaStore /></span>
              <div>
                <strong title={store.store_name}>{store.store_name || `Store #${store.store_id}`}</strong>
                <span>
                  {store.store_code ? `${store.store_code}` : store.city || "Planned visit"}
                </span>
              </div>
            </div>
            <div className="travel-store-chip-meta">
              {highlightVisit && (
                <span className="travel-store-visit-badge">VISIT</span>
              )}
              {store.visit_date && (
                <span className="travel-store-date">
                  <FaCalendarAlt />
                  {formatDate(store.visit_date)}
                </span>
              )}
            </div>
          </div>
        ))}

        {filteredBlankDays.map((item) => (
          <div className="travel-store-chip travel-store-chip--off" key={`off-${item.date}-${item.reason_type || "day"}`} role="listitem">
            <div className="travel-store-chip-main">
              <span className="travel-store-chip-icon"><FaCalendarAlt /></span>
              <div>
                <strong>No store</strong>
                <span>{item.reason_type || "No visit"}{item.reason ? ` · ${item.reason}` : ""}</span>
              </div>
            </div>
            <div className="travel-store-chip-meta">
              {item.date && (
                <span className="travel-store-date">{formatDate(item.date)}</span>
              )}
            </div>
          </div>
        ))}

        {!visible && (
          <div className="travel-store-empty">
            <FaSearch />
            <span>{query ? "No stores match your search" : "No stores selected"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
