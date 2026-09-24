import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaStore,
  FaHashtag,
  FaGlobeAmericas,
  FaMapMarkedAlt,
  FaCity,
  FaMapMarkerAlt,
  FaUserTie,
  FaPhoneAlt,
  FaEnvelope,
  FaTimes,
  FaCheck,
  FaPlus,
  FaPen,
  FaExclamationCircle,
} from "react-icons/fa";

import SearchableSelect from "./common/SearchableSelect";
import {
  loadGeo,
  getCountryOptions,
  getStateOptions,
  getCityOptions,
  findCountry,
  findState,
} from "../utils/geoData";

import "../styles/AddStoremodal.css";

const EMPTY_FORM = {
  store_code: "",
  store_name: "",
  country: "",
  state: "",
  city: "",
  address: "",
  manager_name: "",
  contact_number: "",
  email: "",
  status: "Active",
};

const REQUIRED = ["store_code", "store_name", "country", "state", "city"];

const LABELS = {
  store_code: "Store Code",
  store_name: "Store Name",
  country: "Country",
  state: "State",
  city: "City",
};

function AddStoreModal({ store, onSave, onClose }) {
  const isEdit = Boolean(store);

  // Modal is mounted fresh each time it opens, so initialise directly from `store`
  const [form, setForm] = useState(() =>
    store
      ? {
          store_code: String(store.store_code ?? ""),
          store_name: String(store.store_name ?? ""),
          country: String(store.country ?? ""),
          state: String(store.state ?? ""),
          city: String(store.city ?? ""),
          address: String(store.address ?? ""),
          manager_name: String(store.manager_name ?? ""),
          contact_number: String(store.contact_number ?? ""),
          email: String(store.email ?? ""),
          status: String(store.status ?? "Active"),
        }
      : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [geo, setGeo] = useState(null);
  const [geoError, setGeoError] = useState("");

  const bodyRef = useRef(null);

  // =====================================================
  // LOAD COUNTRY / STATE / CITY DATA (lazy chunk)
  // =====================================================

  useEffect(() => {
    let alive = true;
    loadGeo()
      .then((mod) => alive && setGeo(mod))
      .catch(() => alive && setGeoError("Couldn't load location list — you can still type values."));
    return () => {
      alive = false;
    };
  }, []);

  // Esc to close + lock background scroll
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // =====================================================
  // DERIVED LOCATION DATA
  // =====================================================

  const countryOptions = useMemo(() => (geo ? getCountryOptions(geo) : []), [geo]);

  const countryObj = useMemo(
    () => (geo ? findCountry(geo, form.country) : null),
    [geo, form.country]
  );

  const stateOptions = useMemo(
    () => (geo && countryObj ? getStateOptions(geo, countryObj.isoCode) : []),
    [geo, countryObj]
  );

  const stateObj = useMemo(
    () => (geo && countryObj ? findState(geo, countryObj.isoCode, form.state) : null),
    [geo, countryObj, form.state]
  );

  const cityOptions = useMemo(
    () =>
      geo && countryObj && stateObj
        ? getCityOptions(geo, countryObj.isoCode, stateObj.isoCode)
        : [],
    [geo, countryObj, stateObj]
  );

  // For edit mode — map saved values (e.g. "PUNJAB") onto list labels
  const stateValue = stateObj ? stateObj.name : form.state;
  const cityValue = useMemo(() => {
    const m = cityOptions.find((c) => c.value.toLowerCase() === form.city.trim().toLowerCase());
    return m ? m.value : form.city;
  }, [cityOptions, form.city]);

  const countryValue = countryObj ? countryObj.name : form.country;
  const dialCode = countryObj?.phonecode
    ? `+${String(countryObj.phonecode).replace(/^\+/, "")}`
    : "";

  const districtCount = cityOptions.filter((c) => c.badge === "District").length;

  // =====================================================
  // CHANGE HANDLERS
  // =====================================================

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleChange = (e) => setField(e.target.name, e.target.value);

  const handleCountry = (value) => {
    setForm((prev) =>
      prev.country === value ? prev : { ...prev, country: value, state: "", city: "" }
    );
    setErrors((prev) => ({ ...prev, country: "" }));
  };

  const handleState = (value) => {
    setForm((prev) => (prev.state === value ? prev : { ...prev, state: value, city: "" }));
    setErrors((prev) => ({ ...prev, state: "" }));
  };

  const handleCity = (value) => setField("city", value);

  // =====================================================
  // VALIDATION + SUBMIT
  // =====================================================

  const validate = () => {
    const next = {};
    REQUIRED.forEach((k) => {
      if (!String(form[k] ?? "").trim()) next[k] = `${LABELS[k]} is required`;
    });
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (form.contact_number.trim() && !/^[+\d][\d\s()-]{5,}$/.test(form.contact_number.trim())) {
      next.contact_number = "Enter a valid phone number";
    }
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const next = validate();
    setErrors(next);

    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      const el = bodyRef.current?.querySelector(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...form,
        store_code: form.store_code.trim(),
        store_name: form.store_name.trim(),
        country: countryValue.trim(),
        state: stateValue.trim(),
        city: cityValue.trim(),
        address: form.address.trim(),
        manager_name: form.manager_name.trim(),
        contact_number: form.contact_number.trim(),
        email: form.email.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  const filled = REQUIRED.filter((k) => String(form[k] ?? "").trim()).length;
  const progress = Math.round((filled / REQUIRED.length) * 100);

  const locationPreview = [cityValue, stateValue, countryValue].filter(Boolean).join(", ");

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const fieldError = (name) =>
    errors[name] ? (
      <span className="store-field-error">
        <FaExclamationCircle /> {errors[name]}
      </span>
    ) : null;

  // Plain function (not a component) so inputs keep focus between renders
  const TextField = ({ name, label, icon, required, placeholder, type = "text", full }) => (
    <div className={`store-field ${full ? "store-full-width" : ""}`} data-field={name}>
      <label htmlFor={`sf-${name}`}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <div className={`store-input ${errors[name] ? "is-invalid" : ""}`}>
        <span className="store-input-icon">{icon}</span>
        <input
          id={`sf-${name}`}
          type={type}
          name={name}
          value={form[name]}
          onChange={handleChange}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      {fieldError(name)}
    </div>
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="store-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="store-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-modal-title"
      >
        {/* ================= HEADER ================= */}

        <div className="store-modal-header">
          <div className="store-header-content">
            <div className="store-header-icon">{isEdit ? <FaPen /> : <FaStore />}</div>

            <div>
              <span className="store-header-eyebrow">Store Management</span>
              <h2 id="store-modal-title">{isEdit ? "Edit Store" : "Add New Store"}</h2>
              <p>
                {isEdit
                  ? "Update store information, location and contact details."
                  : "Set up a new store with its location and contact details."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="store-close-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <FaTimes />
          </button>

          <div className="store-progress" aria-hidden="true">
            <div className="store-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* ================= FORM ================= */}

        <form onSubmit={handleSubmit} className="store-form" noValidate>
          <div className="store-form-body" ref={bodyRef}>
            {/* ---------- STORE INFORMATION ---------- */}

            <section className="store-section">
              <div className="store-section-heading">
                <span className="store-section-num">1</span>
                <div>
                  <h3>Store Information</h3>
                  <p>Basic identity of this store.</p>
                </div>
              </div>

              <div className="store-form-grid">
                {TextField({
                  name: "store_code",
                  label: "Store Code",
                  icon: <FaHashtag />,
                  required: true,
                  placeholder: "e.g. 502",
                })}

                {TextField({
                  name: "store_name",
                  label: "Store Name",
                  icon: <FaStore />,
                  required: true,
                  placeholder: "e.g. MBRL – Delhi Malviya Nagar",
                })}

                <div className="store-field store-full-width">
                  <label>Status</label>
                  <div className="store-status-toggle" role="radiogroup" aria-label="Status">
                    {["Active", "Inactive"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={form.status === s}
                        className={`store-status-opt ${s.toLowerCase()} ${
                          form.status === s ? "is-on" : ""
                        }`}
                        onClick={() => setField("status", s)}
                      >
                        <span className="dot" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ---------- LOCATION ---------- */}

            <section className="store-section">
              <div className="store-section-heading">
                <span className="store-section-num">2</span>
                <div>
                  <h3>Location</h3>
                  <p>Search and pick country, state and city — or type your own.</p>
                </div>
                {locationPreview && (
                  <span className="store-location-chip" title={locationPreview}>
                    <FaMapMarkerAlt /> {locationPreview}
                  </span>
                )}
              </div>

              {geoError && <div className="store-inline-note">{geoError}</div>}

              <div className="store-form-grid store-grid-3">
                <div className="store-field" data-field="country">
                  <label htmlFor="sf-country">
                    Country<span className="required">*</span>
                  </label>
                  <SearchableSelect
                    id="sf-country"
                    value={countryValue}
                    onChange={handleCountry}
                    options={countryOptions}
                    loading={!geo && !geoError}
                    placeholder="Search country…"
                    icon={<FaGlobeAmericas />}
                    invalid={!!errors.country}
                    countLabel="countries"
                  />
                  {fieldError("country")}
                </div>

                <div className="store-field" data-field="state">
                  <label htmlFor="sf-state">
                    State / Province<span className="required">*</span>
                  </label>
                  <SearchableSelect
                    id="sf-state"
                    value={stateValue}
                    onChange={handleState}
                    options={stateOptions}
                    disabled={!form.country.trim()}
                    disabledText="Select a country first"
                    placeholder={
                      countryObj && stateOptions.length === 0
                        ? "Type state name…"
                        : "Search state…"
                    }
                    icon={<FaMapMarkedAlt />}
                    invalid={!!errors.state}
                    emptyText="No states found — press Enter to use what you typed"
                    countLabel="states"
                  />
                  {fieldError("state")}
                </div>

                <div className="store-field" data-field="city">
                  <label htmlFor="sf-city">
                    City / District<span className="required">*</span>
                  </label>
                  <SearchableSelect
                    id="sf-city"
                    value={cityValue}
                    onChange={handleCity}
                    options={cityOptions}
                    disabled={!form.state.trim()}
                    disabledText="Select a state first"
                    placeholder={
                      stateObj && cityOptions.length === 0 ? "Type city name…" : "Search city…"
                    }
                    icon={<FaCity />}
                    invalid={!!errors.city}
                    emptyText="No cities found — press Enter to use what you typed"
                    countLabel={districtCount ? "cities & districts" : "cities"}
                  />
                  {fieldError("city")}
                </div>

                <div className="store-field store-full-width">
                  <label htmlFor="sf-address">Address</label>
                  <div className="store-input store-textarea">
                    <span className="store-input-icon">
                      <FaMapMarkerAlt />
                    </span>
                    <textarea
                      id="sf-address"
                      name="address"
                      rows="3"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Building, street, landmark, PIN code"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ---------- CONTACT ---------- */}

            <section className="store-section">
              <div className="store-section-heading">
                <span className="store-section-num">3</span>
                <div>
                  <h3>Contact Information</h3>
                  <p>Store manager and contact details.</p>
                </div>
              </div>

              <div className="store-form-grid">
                {TextField({
                  name: "manager_name",
                  label: "Manager Name",
                  icon: <FaUserTie />,
                  placeholder: "Full name",
                })}

                <div className="store-field" data-field="contact_number">
                  <label htmlFor="sf-contact_number">Contact Number</label>
                  <div className={`store-input ${errors.contact_number ? "is-invalid" : ""}`}>
                    <span className="store-input-icon">
                      <FaPhoneAlt />
                    </span>
                    {dialCode && <span className="store-dial">{dialCode}</span>}
                    <input
                      id="sf-contact_number"
                      type="tel"
                      name="contact_number"
                      value={form.contact_number}
                      onChange={handleChange}
                      placeholder="Phone number"
                      autoComplete="off"
                    />
                  </div>
                  {fieldError("contact_number")}
                </div>

                {TextField({
                  name: "email",
                  label: "Email",
                  icon: <FaEnvelope />,
                  placeholder: "store@company.com",
                  type: "email",
                  full: true,
                })}
              </div>
            </section>
          </div>

          {/* ================= FOOTER ================= */}

          <div className="store-modal-footer">
            <span className="store-footer-meta">
              <strong>{filled}</strong>/{REQUIRED.length} required fields
            </span>

            <div className="store-footer-actions">
              <button type="button" className="store-cancel-btn" onClick={onClose}>
                Cancel
              </button>

              <button type="submit" className="store-save-btn" disabled={saving}>
                <span className="store-save-icon">
                  {saving ? <span className="store-btn-spinner" /> : isEdit ? <FaCheck /> : <FaPlus />}
                </span>
                <span>{saving ? "Saving…" : isEdit ? "Update Store" : "Create Store"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddStoreModal;
