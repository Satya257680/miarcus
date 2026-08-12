import { useEffect, useState } from "react";
import "../styles/AddStoremodal.css";

function AddStoreModal({ store, onSave, onClose }) {
  const isEdit = Boolean(store);

  // =====================================================
  // EMPTY FORM
  // =====================================================

  const emptyForm = {
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

  const [form, setForm] = useState(emptyForm);

  // =====================================================
  // LOAD STORE DATA
  // =====================================================

  useEffect(() => {
    if (store) {
      setForm({
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
      });
    } else {
      setForm({ ...emptyForm });
    }
  }, [store]);

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.store_code.trim()) {
      alert("Store Code is required.");
      return;
    }

    if (!form.store_name.trim()) {
      alert("Store Name is required.");
      return;
    }

    if (!form.country.trim()) {
      alert("Country is required.");
      return;
    }

    if (!form.state.trim()) {
      alert("State is required.");
      return;
    }

    if (!form.city.trim()) {
      alert("City is required.");
      return;
    }

    onSave({
      ...form,
      store_code: form.store_code.trim(),
      store_name: form.store_name.trim(),
      country: form.country.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      manager_name: form.manager_name.trim(),
      contact_number: form.contact_number.trim(),
      email: form.email.trim(),
    });
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    onClose();
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="store-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="store-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-modal-title"
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="store-modal-header">
          <div className="store-header-content">
            <div className="store-header-icon">
              <span>{isEdit ? "✎" : "+"}</span>
            </div>

            <div>
              <h2 id="store-modal-title">
                {isEdit ? "Edit Store" : "Add Store"}
              </h2>

              <p>
                {isEdit
                  ? "Update store information and contact details."
                  : "Create a new store and add its information."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="store-close-btn"
            onClick={handleClose}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="store-form"
        >
          {/* =================================================
              STORE INFORMATION
          ================================================= */}

          <section className="store-section">
            <div className="store-section-heading">
              <span className="store-section-line" />

              <div>
                <h3>Store Information</h3>
                <p>
                  Enter the basic information for this store.
                </p>
              </div>
            </div>

            <div className="store-form-grid">
              {/* Store Code */}

              <div className="store-field">
                <label htmlFor="store-code">
                  Store Code
                  <span className="required">*</span>
                </label>

                <input
                  id="store-code"
                  type="text"
                  name="store_code"
                  value={form.store_code}
                  onChange={handleChange}
                  placeholder="Enter store code"
                  autoComplete="off"
                />
              </div>

              {/* Store Name */}

              <div className="store-field">
                <label htmlFor="store-name">
                  Store Name
                  <span className="required">*</span>
                </label>

                <input
                  id="store-name"
                  type="text"
                  name="store_name"
                  value={form.store_name}
                  onChange={handleChange}
                  placeholder="Enter store name"
                  autoComplete="off"
                />
              </div>

              {/* Country */}

              <div className="store-field">
                <label htmlFor="store-country">
                  Country
                  <span className="required">*</span>
                </label>

                <input
                  id="store-country"
                  type="text"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  placeholder="Enter country"
                />
              </div>

              {/* State */}

              <div className="store-field">
                <label htmlFor="store-state">
                  State
                  <span className="required">*</span>
                </label>

                <input
                  id="store-state"
                  type="text"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                />
              </div>

              {/* City */}

              <div className="store-field">
                <label htmlFor="store-city">
                  City
                  <span className="required">*</span>
                </label>

                <input
                  id="store-city"
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              </div>

              {/* Status */}

              <div className="store-field">
                <label htmlFor="store-status">
                  Status
                </label>

                <div className="store-select-wrapper">
                  <select
                    id="store-status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </div>
              </div>

              {/* Address */}

              <div className="store-field store-full-width">
                <label htmlFor="store-address">
                  Address
                </label>

                <textarea
                  id="store-address"
                  name="address"
                  rows="3"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter complete store address"
                />
              </div>
            </div>
          </section>

          {/* =================================================
              CONTACT INFORMATION
          ================================================= */}

          <section className="store-section">
            <div className="store-section-heading">
              <span className="store-section-line" />

              <div>
                <h3>Contact Information</h3>

                <p>
                  Add manager and store contact details.
                </p>
              </div>
            </div>

            <div className="store-form-grid">
              {/* Manager */}

              <div className="store-field">
                <label htmlFor="manager-name">
                  Manager Name
                </label>

                <input
                  id="manager-name"
                  type="text"
                  name="manager_name"
                  value={form.manager_name}
                  onChange={handleChange}
                  placeholder="Enter manager name"
                />
              </div>

              {/* Contact */}

              <div className="store-field">
                <label htmlFor="contact-number">
                  Contact Number
                </label>

                <input
                  id="contact-number"
                  type="text"
                  name="contact_number"
                  value={form.contact_number}
                  onChange={handleChange}
                  placeholder="Enter contact number"
                />
              </div>

              {/* Email */}

              <div className="store-field store-full-width">
                <label htmlFor="store-email">
                  Email
                </label>

                <input
                  id="store-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />
              </div>
            </div>
          </section>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="store-modal-footer">
            <button
              type="button"
              className="store-cancel-btn"
              onClick={handleClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="store-save-btn"
            >
              <span className="store-save-icon">
                {isEdit ? "✓" : "+"}
              </span>

              <span>
                {isEdit
                  ? "Update Store"
                  : "Create Store"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddStoreModal;