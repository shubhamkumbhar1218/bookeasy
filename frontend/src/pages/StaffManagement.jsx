import React, { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, RefreshCw, UserRound, UserX } from "lucide-react";
import "../styles/StaffManagement.css";

export default function StaffManagement({ user, api }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    name: "",
    phone: "",
    email: "",
    designation: "Staff",
  };

  const [form, setForm] = useState(emptyForm);

  const loadStaff = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api("/staff");
      setStaff(Array.isArray(data.staff) ? data.staff : []);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load staff. Check your subscription and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveStaff = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const editing = Boolean(editingId);

      const data = await api(
        editing ? `/staff/${editingId}` : "/staff",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(form),
        }
      );

      if (editing) {
        setStaff((current) =>
          current.map((person) =>
            person._id === editingId ? data.staff : person
          )
        );
        setMessage("Staff details updated successfully.");
      } else {
        setStaff((current) => [data.staff, ...current]);
        setMessage("Staff member added successfully.");
      }

      resetForm();
    } catch (err) {
      setError(err.message || "Unable to save staff member.");
    } finally {
      setSaving(false);
    }
  };

  const editStaff = (person) => {
    setEditingId(person._id);
    setForm({
      name: person.name || "",
      phone: person.phone || "",
      email: person.email || "",
      designation: person.designation || "Staff",
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleStaff = async (person) => {
    setError("");
    setMessage("");

    try {
      const data = await api(`/staff/${person._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !person.isActive }),
      });

      setStaff((current) =>
        current.map((item) =>
          item._id === person._id ? data.staff : item
        )
      );

      setMessage(
        data.staff.isActive
          ? "Staff member activated."
          : "Staff member deactivated."
      );
    } catch (err) {
      setError(err.message || "Unable to update staff status.");
    }
  };

  return (
    <main className="staff-page">
      <div className="staff-page-header">
        <button
          type="button"
          className="outline"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          <ArrowLeft size={17} />
          Dashboard
        </button>

        <button
          type="button"
          className="outline"
          onClick={loadStaff}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <section className="panel staff-panel">
        <p className="eyebrow">TEAM MANAGEMENT</p>
        <h1>Staff Management</h1>
        <p className="muted">
          {user?.businessName || user?.name || "Your business"} ·
          Manage your team and their booking assignments.
        </p>

        {error && <div className="error">{error}</div>}
        {message && <p role="status" className="staff-message">{message}</p>}

        <h2>{editingId ? "Edit staff member" : "Add staff member"}</h2>

        <form className="staff-form" onSubmit={saveStaff}>
          <label>
            Full name *
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              maxLength={100}
              required
              placeholder="Enter staff name"
            />
          </label>

          <label>
            Phone
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={updateField}
              maxLength={20}
              placeholder="Phone number"
            />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              maxLength={254}
              placeholder="staff@example.com"
            />
          </label>

          <label>
            Designation
            <input
              name="designation"
              value={form.designation}
              onChange={updateField}
              maxLength={100}
              placeholder="e.g. Hair Stylist"
            />
          </label>

          <div className="staff-form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : <><Plus size={17} /> {editingId ? "Save changes" : "Add staff"}</>}
            </button>

            {editingId && (
              <button
                type="button"
                className="outline"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel staff-panel">
        <div className="staff-list-heading">
          <div>
            <h2>Your team</h2>
            <p className="muted">{staff.length} staff member(s)</p>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading staff...</p>
        ) : staff.length === 0 ? (
          <p className="empty">No staff members added yet.</p>
        ) : (
          <div className="staff-list">
            {staff.map((person) => (
              <article className="staff-card" key={person._id}>
                <div className="staff-avatar">
                  <UserRound size={23} />
                </div>

                <div className="staff-details">
                  <strong>{person.name}</strong>
                  <span>{person.designation || "Staff"}</span>
                  {person.phone && <small>{person.phone}</small>}
                  {person.email && <small>{person.email}</small>}
                  <span className={person.isActive ? "staff-active" : "staff-inactive"}>
                    {person.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="staff-card-actions">
                  <button
                    type="button"
                    className="outline"
                    onClick={() => editStaff(person)}
                    title="Edit staff"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>

                  <button
                    type="button"
                    className="outline"
                    onClick={() => toggleStaff(person)}
                  >
                    <UserX size={16} />
                    {person.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
