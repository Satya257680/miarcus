import { useEffect, useState } from "react";
import {
    reverseGeocode,
    getCachedPlace,
    hasCoords,
    normalizePlace,
} from "../utils/reverseGeocode";

// ======================================================
// WHERE A PUNCH REALLY HAPPENED
// ------------------------------------------------------
// New punches carry check_in_city / check_in_address from the
// server. Older punches only have GPS, so the place is looked
// up in the browser (cached, throttled).
//
// Returns: place object · undefined (looking up) ·
//          false (lookup failed) · null (no GPS)
// ======================================================

const storedPlace = (row, kind) => {
    const isIn = kind !== "check-out";
    const city = isIn ? row?.check_in_city : row?.check_out_city;
    const address = isIn ? row?.check_in_address : row?.check_out_address;
    if (!city && !address) return null;
    const cityParts = String(city || "").split(",").map((p) => p.trim()).filter(Boolean);
    return {
        city: cityParts[0] || "",
        state: cityParts[1] || "",
        address: address || city || "",
        places: cityParts.slice(0, 1).map(normalizePlace).filter((p) => p.length >= 3),
    };
};

export default function usePunchPlace(row, kind = "check-in") {
    const isIn = kind !== "check-out";
    const lat = isIn ? row?.check_in_latitude : row?.check_out_latitude;
    const lng = isIn ? row?.check_in_longitude : row?.check_out_longitude;
    const stored = storedPlace(row, kind);
    const hasStored = Boolean(stored);
    const [, setTick] = useState(0);

    useEffect(() => {
        if (hasStored || !hasCoords(lat, lng) || getCachedPlace(lat, lng) !== undefined) return undefined;
        let alive = true;
        reverseGeocode(lat, lng).then(() => alive && setTick((t) => t + 1));
        return () => {
            alive = false;
        };
    }, [hasStored, lat, lng]);

    if (stored) return stored;
    if (!hasCoords(lat, lng)) return null;
    const cached = getCachedPlace(lat, lng);
    // undefined → still looking up · null → lookup failed
    return cached === undefined ? undefined : cached || false;
}

export const placeLabel = (place) =>
    place ? [place.city, place.state].filter(Boolean).join(", ") || place.address : "";

