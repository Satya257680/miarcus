import { useEffect, useState } from "react";
import "../styles/AddStoreModal.css";

function AddStoreModal({ store, onSave, onClose }) {
  const isEdit = Boolean(store);

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
      setForm(emptyForm);
    }
  }, [store]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.store_code.toString().trim()) {
      alert("Store Code is required.");
      return;
    }

    if (!form.store_name.toString().trim()) {
      alert("Store Name is required.");
      return;
    }

    if (!form.country.toString().trim()) {
      alert("Country is required.");
      return;
    }

    if (!form.state.toString().trim()) {
      alert("State is required.");
      return;
    }

    if (!form.city.toString().trim()) {
      alert("City is required.");
      return;
    }

    onSave(form);
  };

  return (
    <div className="modal-overlay">
      <div className="store-modal">

        <div className="modal-header">
          <h2>{isEdit ? "Edit Store" : "Add Store"}</h2>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-grid">

            <div>
              <label>Store Code *</label>
              <input
                type="text"
                name="store_code"
                value={form.store_code}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Store Name *</label>
              <input
                type="text"
                name="store_name"
                value={form.store_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Country *</label>
              <input
                type="text"
                name="country"
                value={form.country}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>State *</label>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>City *</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="full-width">
              <label>Address</label>
              <textarea
                rows="3"
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Manager Name</label>
              <input
                type="text"
                name="manager_name"
                value={form.manager_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Contact Number</label>
              <input
                type="text"
                name="contact_number"
                value={form.contact_number}
                onChange={handleChange}
              />
            </div>

            <div className="full-width">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>

          </div>

          <div className="modal-buttons">

            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-btn"
            >
              {isEdit ? "Update Store" : "Save Store"}
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}

export default AddStoreModal;