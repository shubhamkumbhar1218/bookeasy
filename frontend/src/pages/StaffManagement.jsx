import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  History,
  Pencil,
  Plus,
  RefreshCw,
  UserRound,
  UserX,
} from "lucide-react";
import "../styles/StaffManagement.css";

export default function StaffManagement({ user, api }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [staffHistory, setStaffHistory] = useState({});
const [expandedHistoryId, setExpandedHistoryId] = useState(null);
const [historyLoadingId, setHistoryLoadingId] = useState(null);
const [historyError, setHistoryError] = useState("");

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

  const loadStaffHistory = async (staffId) => {
  if (expandedHistoryId === staffId) {
    setExpandedHistoryId(null);
    return;
  }

  setHistoryLoadingId(staffId);
  setHistoryError("");

  try {
    const data = await api(`/staff/${staffId}/bookings`);

    setStaffHistory((previous) => ({
      ...previous,
      [staffId]: data,
    }));

    setExpandedHistoryId(staffId);
  } catch (error) {
    setHistoryError(
      error.message || "Unable to load staff booking history"
    );
  } finally {
    setHistoryLoadingId(null);
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

    <span
      className={
        person.isActive ? "staff-active" : "staff-inactive"
      }
    >
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

    <button
      type="button"
      onClick={() => loadStaffHistory(person._id)}
      disabled={historyLoadingId === person._id}
    >
      {historyLoadingId === person._id
        ? "Loading history..."
        : expandedHistoryId === person._id
          ? "Hide Work History"
          : "View Work History"}
    </button>
  </div>

  {historyError && expandedHistoryId === person._id && (
    <p role="alert" className="error">
      {historyError}
    </p>
  )}

  {expandedHistoryId === person._id &&
    staffHistory[person._id] && (
      <div className="staff-work-history">
        <h4>Work History — {person.name}</h4>

        <div className="staff-work-summary">
          <p>Total: {staffHistory[person._id].summary.total}</p>
          <p>
            Completed: {staffHistory[person._id].summary.completed}
          </p>
          <p>
            Cancelled: {staffHistory[person._id].summary.cancelled}
          </p>
          <p>Pending: {staffHistory[person._id].summary.pending}</p>
          <p>
            Confirmed: {staffHistory[person._id].summary.confirmed}
          </p>
          <p>No-show: {staffHistory[person._id].summary.noShow}</p>
        </div>

        {staffHistory[person._id].bookings.length === 0 ? (
          <p>No bookings assigned to this staff member yet.</p>
        ) : (
          staffHistory[person._id].bookings.map((booking) => (

<div key={booking._id} className="staff-work-booking">
  <div className="work-booking-header">
    <div className="work-service-icon">
      <CalendarDays size={21} />
    </div>

    <div className="work-booking-title">
      <strong>
        {booking.serviceId?.name || "Service unavailable"}
      </strong>
      <span>Customer: {booking.customerName || "Customer"}</span>
    </div>

    <span
      className={`work-status work-status-${String(
        booking.status || "pending"
      ).toLowerCase()}`}
    >
      {booking.status || "Pending"}
    </span>
  </div>

  <div className="work-appointment-details">
    <div className="work-detail-row">
      <CalendarDays size={16} />
      <span>
        <b>Appointment</b>
        {new Date(booking.bookingDate).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Kolkata",
        })}
      </span>
    </div>

    {(booking.statusHistory || []).length > 0 && (
      <div className="work-activity-heading">
        <History size={17} />
        <span>Activity timeline</span>
        <span className="work-activity-count">
          {booking.statusHistory.length} events
        </span>
      </div>
    )}

    {(booking.statusHistory || []).length > 0 && (
      <div className="work-activity-timeline">
        {booking.statusHistory.map((event, index) => {
          const actionLabel =
            event.action === "rescheduled"
              ? "Appointment rescheduled"
              : event.action === "staff_assigned"
                ? "Staff assigned"
                : event.action === "staff_unassigned"
                  ? "Staff unassigned"
                  : `Status ${event.status || "updated"}`;

          return (
            <div
              className="work-activity-item"
              key={`${booking._id}-event-${index}`}
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <span className="work-timeline-dot" />

              <div className="work-activity-content">
                <strong>{actionLabel}</strong>

                <span className="work-activity-meta">
                  {event.changedByName || "Business owner"}
                  {event.changedAt && (
                    <>
                      {" · "}
                      {new Date(event.changedAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Kolkata",
                      })}
                    </>
                  )}
                </span>

                {event.action === "staff_assigned" && (
                  <span className="work-change-detail">
                    {event.oldStaffName || "Unassigned"}
                    {" → "}
                    {event.newStaffName || "Unassigned"}
                  </span>
                )}

                {event.action === "rescheduled" && (
                  <span className="work-change-detail">
                    {event.oldBookingDate
                      ? new Date(event.oldBookingDate).toLocaleString(
                          "en-IN",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Kolkata",
                          }
                        )
                      : "Previous date unavailable"}
                    {" → "}
                    {event.newBookingDate
                      ? new Date(event.newBookingDate).toLocaleString(
                          "en-IN",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Kolkata",
                          }
                        )
                      : "New date unavailable"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>

          ))
        )}
      </div>
    )}
</article>

//               <article className="staff-card" key={person._id}>
//                 <div className="staff-avatar">
//                   <UserRound size={23} />
//                 </div>

//                 <div className="staff-details">
//                   <strong>{person.name}</strong>
//                   <span>{person.designation || "Staff"}</span>
//                   {person.phone && <small>{person.phone}</small>}
//                   {person.email && <small>{person.email}</small>}
//                   <span className={person.isActive ? "staff-active" : "staff-inactive"}>
//                     {person.isActive ? "Active" : "Inactive"}
//                   </span>
//                 </div>

//                 <div className="staff-card-actions">
//                   <button
//                     type="button"
//                     className="outline"
//                     onClick={() => editStaff(person)}
//                     title="Edit staff"
//                   >
//                     <Pencil size={16} />
//                     Edit
//                   </button>

//                   <button
//                     type="button"
//                     className="outline"
//                     onClick={() => toggleStaff(person)}
//                   >
//                     <UserX size={16} />
//                     {person.isActive ? "Deactivate" : "Activate"}
//                   </button>

//                   <button
//   type="button"
//   onClick={() => loadStaffHistory(person._id)}
//   disabled={historyLoadingId === person._id}
// >
//   {historyLoadingId === person._id
//     ? "Loading history..."
//     : expandedHistoryId === person._id
//       ? "Hide Work History"
//       : "View Work History"}
// </button>

// {historyError && expandedHistoryId === person._id && (
//   <p role="alert">{historyError}</p>
// )}

// {expandedHistoryId === person._id &&
//   staffHistory[person._id] && (
//     <div className="staff-work-history">
//       <h4>Work History — {person.name}</h4>

//       <div className="staff-work-summary">
//         <p>Total: {staffHistory[person._id].summary.total}</p>
//         <p>Completed: {staffHistory[person._id].summary.completed}</p>
//         <p>Cancelled: {staffHistory[person._id].summary.cancelled}</p>
//         <p>Pending: {staffHistory[person._id].summary.pending}</p>
//         <p>Confirmed: {staffHistory[person._id].summary.confirmed}</p>
//         <p>No-show: {staffHistory[person._id].summary.noShow}</p>
//       </div>

//       {staffHistory[person._id].bookings.length === 0 ? (
//         <p>No bookings assigned to this staff member yet.</p>
//       ) : (
//         staffHistory[person._id].bookings.map((booking) => (
//           <div
//             key={booking._id}
//             className="staff-work-booking"
//           >
//             <strong>
//               {booking.serviceId?.name || "Service unavailable"}
//             </strong>

//             <p>Customer: {booking.customerName}</p>

//             <p>
//               Appointment:{" "}
//               {new Date(booking.bookingDate).toLocaleString("en-IN", {
//                 dateStyle: "medium",
//                 timeStyle: "short",
//                 timeZone: "Asia/Kolkata",
//               })}
//             </p>

//             <p>Status: {booking.status}</p>

//             {(booking.statusHistory || []).map((event, index) => (
//               <p key={`${booking._id}-${index}`}>
//                 {event.action === "rescheduled"
//                   ? "Rescheduled"
//                   : event.action === "staff_assigned"
//                     ? "Staff assigned"
//                     : event.action === "staff_unassigned"
//                       ? "Staff unassigned"
//                       : `Status: ${event.status}`}
//                 {" — "}
//                 {event.changedByName || "Business owner"}
//                 {" — "}
//                 {event.changedAt
//                   ? new Date(event.changedAt).toLocaleString("en-IN")
//                   : ""}
//                 {event.action === "rescheduled" && (
//                   <>
//                     {" · "}
//                     {event.oldBookingDate
//                       ? new Date(event.oldBookingDate).toLocaleString(
//                           "en-IN",
//                           { timeZone: "Asia/Kolkata" }
//                         )
//                       : "Previous date unavailable"}
//                     {" → "}
//                     {event.newBookingDate
//                       ? new Date(event.newBookingDate).toLocaleString(
//                           "en-IN",
//                           { timeZone: "Asia/Kolkata" }
//                         )
//                       : "New date unavailable"}
//                   </>
//                 )}
//                 {event.action === "staff_assigned" && (
//                   <> · {event.oldStaffName || "Unassigned"} → {event.newStaffName || "Unassigned"}</>
//                 )}
//               </p>
//             ))}
//           </div>
//         ))
//       )}
//     </div>
//   )}

//                 </div>
//               </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
