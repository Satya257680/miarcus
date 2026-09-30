// ======================================================
// REVERSE GEOCODE (browser)
// ------------------------------------------------------
// GPS point → { address, city, state, places[] } using
// OpenStreetMap Nominatim. Used for attendance punches that
// were saved before the server started storing the address.
// Requests are cached and spaced ~1 per second (Nominatim
// usage policy). Every failure resolves to null.
// ======================================================

const cache = new Map();
const pending = new Map();
const queue = [];
let running = false;

export const normalizePlace = (value) =>
    String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();


// Renamed / alternate Indian city names → one spelling
const CITY_ALIASES = {
    prayagraj: "allahabad",
    gurugram: "gurgaon",
    bengaluru: "bangalore",
    mumbai: "bombay",
    kolkata: "calcutta",
    chennai: "madras",
    mysuru: "mysore",
    "sahibzada ajit singh nagar": "mohali",
    "sas nagar": "mohali",
    "s a s nagar": "mohali",
    puducherry: "pondicherry",
    thiruvananthapuram: "trivandrum",
    vadodara: "baroda",
    kochi: "cochin",
    ernakulam: "cochin",
    varanasi: "banaras",
    belagavi: "belgaum",
    kalaburagi: "gulbarga",
    mangaluru: "mangalore",
    hubballi: "hubli",
    shivamogga: "shimoga",
    "new delhi": "delhi",
    "navi mumbai": "bombay",
};

const canonicalCity = (value) => {
    const text = String(value || "").replace(/ (district|tehsil|city|municipal corporation)$/g, "").trim();
    return CITY_ALIASES[text] || text;
};

const keyOf = (lat, lng) => `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;

export const hasCoords = (lat, lng) =>
    lat !== null && lat !== undefined && lat !== "" &&
    lng !== null && lng !== undefined && lng !== "" &&
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
    !(Number(lat) === 0 && Number(lng) === 0);

const fetchOne = async (lat, lng) => {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
            { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const a = data?.address;
        if (!a) return null;
        const city = a.city || a.town || a.municipality || a.village || a.city_district || a.county || a.state_district || "";
        return {
            address: String(data.display_name || "").split(",").map((p) => p.trim()).filter(Boolean).slice(0, 6).join(", "),
            city,
            state: a.state || "",
            places: [a.city, a.town, a.municipality, a.village, a.suburb, a.neighbourhood, a.city_district, a.county, a.state_district]
                .map(normalizePlace)
                .filter((p) => p.length >= 3),
        };
    } catch {
        return null;
    }
};

const pump = async () => {
    if (running) return;
    running = true;
    while (queue.length) {
        const { key, lat, lng } = queue.shift();
        const result = await fetchOne(lat, lng);
        cache.set(key, result);
        const waiters = pending.get(key) || [];
        pending.delete(key);
        waiters.forEach((resolve) => resolve(result));
        if (queue.length) await new Promise((r) => setTimeout(r, 1100));
    }
    running = false;
};

export const getCachedPlace = (lat, lng) =>
    hasCoords(lat, lng) ? cache.get(keyOf(lat, lng)) : null;

export const reverseGeocode = (lat, lng) => {
    if (!hasCoords(lat, lng)) return Promise.resolve(null);
    const key = keyOf(lat, lng);
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    return new Promise((resolve) => {
        if (pending.has(key)) {
            pending.get(key).push(resolve);
            return;
        }
        pending.set(key, [resolve]);
        queue.push({ key, lat, lng });
        pump();
    });
};

// Is the store in the place where the punch happened?
//   true  → same city
//   false → punched somewhere else
//   null  → unknown (no store city / no place yet)
export const storeMatchesPlace = (storeName, storeCity, place) => {
    const places = place?.places?.length
        ? place.places
        : [normalizePlace(String(place?.city || "").split(",")[0])].filter((p) => p.length >= 3);
    if (!places.length) return null;
    const sc = canonicalCity(normalizePlace(storeCity));
    const sn = ` ${normalizePlace(storeName).split(" ").map((w) => CITY_ALIASES[w] || w).join(" ")} `;
    if (!sc && sn.trim().length < 3) return null;
    return places.map(canonicalCity).some(
        (p) =>
            (sc.length >= 3 && (sc === p || sc.includes(p) || p.includes(sc))) ||
            (p.length >= 4 && sn.includes(` ${p} `))
    );
};
