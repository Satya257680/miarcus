import { FaMapMarkerAlt, FaExclamationTriangle } from "react-icons/fa";
import usePunchPlace, { placeLabel } from "../../hooks/usePunchPlace";
import { hasCoords, storeMatchesPlace } from "../../utils/reverseGeocode";

// ======================================================
// ATTENDANCE REPORT — STORE CELL
// Store pill + the city where the punch was really made.
// Red warning when that city is not the store's city
// (e.g. store HEAD OFFICE MRC, punch made in Jodhpur).
// ======================================================

export default function AttendanceStoreCell({ row }) {
    const kind = row?.check_in_at ? "check-in" : "check-out";
    const lat = kind === "check-in" ? row?.check_in_latitude : row?.check_out_latitude;
    const lng = kind === "check-in" ? row?.check_in_longitude : row?.check_out_longitude;
    const place = usePunchPlace(row, kind);
    const match = place ? storeMatchesPlace(row?.store_name, row?.store_city, place) : null;
    const label = place ? placeLabel(place) : "";

    return (
        <span className="att-store-cell">
            {row?.store_name ? (
                <span className="pp-pill pp-pill--violet">{row.store_name}</span>
            ) : (
                <span className="pp-dash">—</span>
            )}
            {hasCoords(lat, lng) && (
                <span
                    className={`att-punch-place ${match === false ? "is-away" : ""}`}
                    title={place?.address || ""}
                >
                    {match === false ? <FaExclamationTriangle /> : <FaMapMarkerAlt />}
                    {label ? (
                        match === false ? <span>Punched at <b>{label}</b></span> : <span>{label}</span>
                    ) : place === undefined ? (
                        <span>Finding location…</span>
                    ) : (
                        <span>{Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</span>
                    )}
                </span>
            )}
        </span>
    );
}
