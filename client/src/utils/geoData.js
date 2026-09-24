// =====================================================
// Geo data helpers — Country → State → City/District
// -----------------------------------------------------
// Data comes from `country-state-city` (250 countries,
// ~5,000 states/provinces, ~150,000 cities). The package
// is loaded lazily with a dynamic import so its ~8 MB of
// JSON lives in a separate chunk that is only downloaded
// the first time the Add / Edit Store modal opens.
// =====================================================

import { getIndiaDistricts } from "../data/indiaDistricts";

let geoPromise = null;

export function loadGeo() {
  if (!geoPromise) {
    geoPromise = import("country-state-city").catch((err) => {
      geoPromise = null; // allow retry on next open
      throw err;
    });
  }
  return geoPromise;
}

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+district$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const normalizeName = norm;

// ---------- Countries ----------

export function getCountryOptions(geo) {
  return geo.Country.getAllCountries().map((c) => ({
    value: c.name,
    label: c.name,
    iso: c.isoCode,
    flag: c.flag,
    hint: c.phonecode ? `+${c.phonecode.replace(/^\+/, "")}` : "",
    phonecode: c.phonecode,
  }));
}

export function findCountry(geo, name) {
  const key = norm(name);
  if (!key) return null;
  return (
    geo.Country.getAllCountries().find(
      (c) => norm(c.name) === key || c.isoCode.toLowerCase() === key
    ) || null
  );
}

// ---------- States ----------

export function getStateOptions(geo, countryIso) {
  if (!countryIso) return [];
  return geo.State.getStatesOfCountry(countryIso)
    .map((s) => ({ value: s.name, label: s.name, iso: s.isoCode, hint: s.isoCode }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function findState(geo, countryIso, name) {
  const key = norm(name);
  if (!countryIso || !key) return null;
  return (
    geo.State.getStatesOfCountry(countryIso).find(
      (s) => norm(s.name) === key || s.isoCode.toLowerCase() === key
    ) || null
  );
}

// ---------- Cities + Districts ----------

export function getCityOptions(geo, countryIso, stateIso) {
  if (!countryIso || !stateIso) return [];

  const map = new Map();

  // Districts first (India) so they get the "District" tag
  if (countryIso === "IN") {
    getIndiaDistricts(stateIso).forEach((d) => {
      map.set(norm(d), { value: d, label: d, badge: "District" });
    });
  }

  geo.City.getCitiesOfState(countryIso, stateIso).forEach((c) => {
    const isDistrict = /\sdistrict$/i.test(c.name);
    const key = norm(c.name);
    if (map.has(key)) return;
    const clean = isDistrict ? c.name.replace(/\s+district$/i, "") : c.name;
    map.set(key, {
      value: clean,
      label: clean,
      badge: isDistrict ? "District" : "",
    });
  });

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}
