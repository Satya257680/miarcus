const https = require("https");

// ======================================================
// LOCATION SERVICE
// ------------------------------------------------------
// Turns the GPS point of an attendance punch into a real
// place (address + city) and picks the store that is
// actually in that city.
//
// Why: Attendance used to stamp every punch with the
// employee's assigned store (administrators / Full
// Attendance users were always forced to HEAD OFFICE MRC),
// so a punch made in Jodhpur was reported as
// "HEAD OFFICE MRC" (Ludhiana).
//
// Reverse geocoding uses OpenStreetMap Nominatim (free, no
// key). Every failure is silent — attendance never fails
// because the address lookup is slow or offline.
// ======================================================

const cache = new Map();
const CACHE_LIMIT = 2000;
const TIMEOUT_MS = Number(process.env.GEOCODE_TIMEOUT_MS) || 4500;

const round = (n) => Number(n).toFixed(4);

const normalize = (value) =>
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

const getJson = (url) =>
    new Promise((resolve) => {
        const request = https.get(
            url,
            {
                headers: {
                    "User-Agent": process.env.GEOCODE_USER_AGENT || "MiarcusPortal/1.0 (attendance)",
                    "Accept": "application/json",
                    "Accept-Language": "en"
                },
                timeout: TIMEOUT_MS
            },
            (response) => {
                if (response.statusCode !== 200) {
                    response.resume();
                    return resolve(null);
                }
                let body = "";
                response.setEncoding("utf8");
                response.on("data", (chunk) => {
                    body += chunk;
                    if (body.length > 200000) request.destroy();
                });
                response.on("end", () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch {
                        resolve(null);
                    }
                });
            }
        );
        request.on("timeout", () => request.destroy());
        request.on("error", () => resolve(null));
    });

// → { address, city, state, places: ["jodhpur", "sardarpura", ...] } | null
const reverseGeocode = async (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        return null;
    }

    if (process.env.GEOCODE_DISABLED === "1") return null;

    const key = `${round(lat)},${round(lng)}`;
    if (cache.has(key)) return cache.get(key);

    const data = await getJson(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
    );

    if (!data || !data.address) return null;

    const a = data.address;

    const city =
        a.city ||
        a.town ||
        a.municipality ||
        a.village ||
        a.city_district ||
        a.county ||
        a.state_district ||
        "";

    const result = {
        address: String(data.display_name || "")
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
            .slice(0, 6)
            .join(", ")
            .slice(0, 480),
        city: String(city).slice(0, 140),
        state: String(a.state || "").slice(0, 140),
        places: [
            a.city,
            a.town,
            a.municipality,
            a.village,
            a.suburb,
            a.neighbourhood,
            a.city_district,
            a.county,
            a.state_district
        ]
            .map(normalize)
            .filter((value) => value.length >= 3)
    };

    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(key, result);

    return result;
};

// Does this store sit in (one of) the geocoded places?
const storeMatchesPlace = (store, geo) => {
    if (!store || !geo || !geo.places?.length) return false;

    const storeCity = canonicalCity(normalize(store.city));
    const storeName = normalize(store.store_name).split(" ").map((w) => CITY_ALIASES[w] || w).join(" ");

    return geo.places.map(canonicalCity).some(
        (place) =>
            (storeCity.length >= 3 && (storeCity === place || storeCity.includes(place) || place.includes(storeCity))) ||
            (place.length >= 4 && ` ${storeName} `.includes(` ${place} `))
    );
};

// Pick the best store for a punch.
//   1. an assigned store in the punch city
//   2. the default store (assigned / Head Office) if it is in that city
//   3. any active store in the punch city (exactly the city, first by id)
//   4. otherwise the default store (as before)
const pickStoreForLocation = ({ geo, assignedStores = [], allStores = [], defaultStore = null }) => {
    if (!geo) return { store: defaultStore, matched: false };

    const assigned = assignedStores.find((store) => storeMatchesPlace(store, geo));
    if (assigned) return { store: assigned, matched: true };

    if (defaultStore && storeMatchesPlace(defaultStore, geo)) {
        return { store: defaultStore, matched: true };
    }

    const cityStores = allStores.filter((store) => storeMatchesPlace(store, geo));
    if (cityStores.length) {
        const places = geo.places.map(canonicalCity);
        const exactCity = cityStores.find((store) => places.includes(canonicalCity(normalize(store.city))));
        return { store: exactCity || cityStores[0], matched: true };
    }

    return { store: defaultStore, matched: false };
};

module.exports = {
    reverseGeocode,
    storeMatchesPlace,
    pickStoreForLocation,
    normalize
};
