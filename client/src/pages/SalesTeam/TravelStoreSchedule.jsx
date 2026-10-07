import { useMemo, useState } from "react";
import {
  FaSearch,
  FaStore,
  FaCalendarAlt,
  FaTimes,
  FaMapMarkerAlt,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlaneDeparture,
} from "react-icons/fa";
import { formatDate } from "./salesTeamUtils";

/**
 * Shared store schedule.
 *
 * `rich` is used by the approved Travel Plan page. It presents each
 * planned store as a premium card with its visit date, visit badge,
 * reason, remarks and actions while keeping the long list scrollable.
 *
 * The normal/compact mode remains intentionally small for the approval
 * detail modal.
 */
export default function TravelStoreSchedule({
  stores = [],
  blankDays = [],
  compact = false,
  highlightVisit = false,
  rich = false,
  visitRate = null,
  visitReason = "Store Visit",
  planRemarks = "",
  onRemarks,
  onHistory,
  onDelete,
  canDeleteAction = false,
}) {
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
        store.state,
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

  if (rich) {
    return (
      <div className="travel-store-schedule travel-store-schedule--rich">
        <div className="travel-store-toolbar travel-store-toolbar--rich">
          <div className="travel-store-count">
            <FaStore />
            <strong>{visible}</strong>
            <span>{query ? `of ${total}` : "stores"}</span>
          </div>

          <div className="travel-store-search travel-store-search--rich">
            <FaSearch />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search store name, code, city or date..."
              aria-label="Search planned stores"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear store search"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        <div
          className="travel-store-rich-scroll"
          role="list"
          aria-label="Approved store visits"
        >
          {filteredStores.map((store, index) => (
            <article
              className="travel-store-rich-card"
              key={`${store.store_id}-${store.visit_date || "no-date"}`}
              role="listitem"
            >
              <div className="travel-store-rich-top">
                <span className="travel-store-number">{index + 1}</span>

                <div className="travel-store-rich-image" aria-hidden="true">
                  <span><FaStore /></span>
                </div>

                <div className="travel-store-rich-main">
                  <h4 title={store.store_name}>
                    {store.store_name || `Store #${store.store_id}`}
                  </h4>

                  <div className="travel-store-rich-location">
                    <span>
                      <FaMapMarkerAlt />
                      {store.city || "City not available"}
                    </span>
                    {store.store_code && (
                      <span>
                        <FaStore />
                        {store.store_code}
                      </span>
                    )}
                  </div>
                </div>

                {visitRate !== null && (
                  <span className={`travel-store-rate ${visitRate >= 100 ? "is-complete" : ""}`}>
                    {visitRate}%
                  </span>
                )}
              </div>

              <div className="travel-store-rich-meta">
                {highlightVisit && (
                  <span className="travel-store-visit-badge travel-store-visit-badge--large">
                    <FaPlaneDeparture />
                    VISIT
                  </span>
                )}

                {store.visit_date && (
                  <span className="travel-store-date travel-store-date--large">
                    <FaCalendarAlt />
                    {formatDate(store.visit_date)}
                  </span>
                )}
              </div>

              <div className="travel-store-rich-details">
                <div>
                  <small>Reason for Visit</small>
                  <strong>{visitReason}</strong>
                </div>

                <div>
                  <small>Remarks</small>
                  <p title={planRemarks || "No remarks added"}>
                    {planRemarks || "No remarks added for this visit."}
                  </p>
                </div>
              </div>

              <div className="travel-store-rich-actions">
                <button type="button" onClick={onHistory}>
                  <FaEye />
                  View
                </button>

                <button type="button" onClick={onRemarks}>
                  <FaEdit />
                  Edit
                </button>

                {canDeleteAction && (
                  <button
                    type="button"
                    className="danger"
                    onClick={onDelete}
                  >
                    <FaTrash />
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}

          {filteredBlankDays.map((item) => (
            <article
              className="travel-store-rich-card travel-store-rich-card--off"
              key={`off-${item.date}-${item.reason_type || "day"}`}
              role="listitem"
            >
              <div className="travel-store-rich-top">
                <span className="travel-store-number">—</span>
                <div className="travel-store-rich-image travel-store-rich-image--off">
                  <span><FaCalendarAlt /></span>
                </div>
                <div className="travel-store-rich-main">
                  <h4>Week off</h4>
                  <div className="travel-store-rich-location">
                    <span>{item.reason_type || "No visit"}</span>
                  </div>
                </div>
              </div>

              <div className="travel-store-rich-details">
                <div>
                  <small>Date</small>
                  <strong>{formatDate(item.date)}</strong>
                </div>
                <div>
                  <small>Reason</small>
                  <p>{item.reason || "No store visit planned."}</p>
                </div>
              </div>
            </article>
          ))}

          {!visible && (
            <div className="travel-store-empty travel-store-empty--rich">
              <FaSearch />
              <span>{query ? "No stores match your search" : "No stores selected"}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`travel-store-schedule ${
        compact ? "travel-store-schedule--compact" : ""
      } ${highlightVisit ? "travel-store-schedule--highlight-visit" : ""}`}
    >
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
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear store search"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      <div className="travel-store-scroll" role="list" aria-label="Planned stores">
        {filteredStores.map((store) => (
          <div
            className="travel-store-chip"
            key={`${store.store_id}-${store.visit_date || "no-date"}`}
            role="listitem"
          >
            <div className="travel-store-chip-main">
              <span className="travel-store-chip-icon"><FaStore /></span>
              <div>
                <strong title={store.store_name}>
                  {store.store_name || `Store #${store.store_id}`}
                </strong>
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
          <div
            className="travel-store-chip travel-store-chip--off"
            key={`off-${item.date}-${item.reason_type || "day"}`}
            role="listitem"
          >
            <div className="travel-store-chip-main">
              <span className="travel-store-chip-icon"><FaCalendarAlt /></span>
              <div>
                <strong>No store</strong>
                <span>
                  {item.reason_type || "No visit"}
                  {item.reason ? ` · ${item.reason}` : ""}
                </span>
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
