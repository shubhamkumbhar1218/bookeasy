import React, { useEffect, useState } from "react";
import "../styles/TeamManagement.css";
import {
  ArrowLeft,
  Users,
  Plus,
  Pencil,
  UserCheck,
  UserX,
  Save,
  X,
  Clock3,
  History,
  Trash2,
} from "lucide-react";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const createDefaultHours = () =>
  DAYS.map((_, dayOfWeek) => ({
    dayOfWeek,
    isAvailable: dayOfWeek !== 0,
    startTime: "09:00",
    endTime: "18:00",
  }));

const emptyForm = () => ({
  name: "",
  designation: "",
  phone: "",
  email: "",
  notes: "",
  serviceIds: [],
  workingHours: createDefaultHours(),
});

export default function TeamManagement({ api, businessId }) {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [historyData, setHistoryData] = useState(null);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState("");
const [services, setServices] = useState([]);
const [servicesLoading, setServicesLoading] = useState(false);
const [deletingId, setDeletingId] = useState(null);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await api("/staff");

      setStaff(
        Array.isArray(data)
          ? data
          : Array.isArray(data.staff)
            ? data.staff
            : []
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to load team members. Check your subscription and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
  try {
    setServicesLoading(true);

    const data = await api(`/services/${businessId}`);

    setServices(
      Array.isArray(data)
        ? data
        : Array.isArray(data.services)
          ? data.services
          : []
    );
  } catch (err) {
    setError(err.message || "Unable to load services.");
  } finally {
    setServicesLoading(false);
  }
};

useEffect(() => {
  if (businessId) {
    loadStaff();
    loadServices();
  }
}, [businessId]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateWorkingHour = (dayOfWeek, field, value) => {
    setForm((current) => ({
      ...current,
      workingHours: current.workingHours.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, [field]: value }
          : day
      ),
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const openEditForm = (member) => {
    const workingHours =
      Array.isArray(member.workingHours) &&
      member.workingHours.length > 0
        ? DAYS.map((_, dayOfWeek) => {
            const saved = member.workingHours.find(
              (item) => item.dayOfWeek === dayOfWeek
            );

            return saved
              ? {
                  dayOfWeek,
                  isAvailable: saved.isAvailable,
                  startTime: saved.startTime || "09:00",
                  endTime: saved.endTime || "18:00",
                }
              : {
                  dayOfWeek,
                  isAvailable: false,
                  startTime: "09:00",
                  endTime: "18:00",
                };
          })
        : createDefaultHours();

    setEditingId(member._id);
const assignedServiceIds = services
  .filter((service) =>
    (service.staffIds || []).some(
      (id) => String(id?._id || id) === String(member._id)
    )
  )
  .map((service) => String(service._id));

setForm({
  name: member.name || "",
  designation: member.designation || "",
  phone: member.phone || "",
  email: member.email || "",
  notes: member.notes || "",
  serviceIds: assignedServiceIds,
  workingHours,
});
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const saveStaff = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Team member name is required.");
      return;
    }

    for (const day of form.workingHours) {
      if (
        day.isAvailable &&
        day.startTime >= day.endTime
      ) {
        setError(
          `End time must be later than start time on ${DAYS[day.dayOfWeek]}.`
        );
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

const payload = {
  name: form.name.trim(),
  designation: form.designation.trim(),
  phone: form.phone.trim(),
  email: form.email.trim(),
  notes: form.notes.trim(),
  serviceIds: form.serviceIds,
  workingHours: form.workingHours,
};

      if (editingId) {
        await api(`/staff/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        setMessage("Team member updated successfully.");
      } else {
        await api("/staff", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setMessage("Team member added successfully.");
      }

      closeForm();
      await loadStaff();
    } catch (err) {
      setError(err.message || "Unable to save team member.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (member) => {
    const action = member.isActive ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${member.name}?`
    );

    if (!confirmed) return;

    try {
      setChangingId(member._id);
      setError("");
      setMessage("");

      await api(`/staff/${member._id}/${action}`, {
        method: "PATCH",
      });

      setMessage(
        `${member.name} ${action}d successfully.`
      );

      await loadStaff();
    } catch (err) {
      setError(
        err.message || `Unable to ${action} team member.`
      );
    } finally {
      setChangingId(null);
    }
  };

  const deleteStaff = async (member) => {
  const confirmed = window.confirm(
    `Permanently delete ${member.name}?\n\n` +
    "This action cannot be undone.\n\n" +
    "Their future pending and confirmed appointments will be unassigned. " +
    "Existing appointment records and work history will be preserved."
  );

  if (!confirmed) return;

  try {
    setDeletingId(member._id);
    setError("");
    setMessage("");

    const data = await api(`/staff/${member._id}`, {
      method: "DELETE",
    });

    setStaff((current) =>
      current.filter((item) => item._id !== member._id)
    );

    // Refresh services because the backend removes this staff ID
    // from Service.staffIds.
    await loadServices();

    setMessage(
      data.message ||
      `${member.name} was permanently deleted.`
    );
  } catch (err) {
    setError(
      err.message || "Unable to permanently delete team member."
    );
  } finally {
    setDeletingId(null);
  }
};

  const openWorkHistory = async (member) => {
  try {
    setHistoryLoading(true);
    setHistoryError("");
    setHistoryData(null);

    const data = await api(
      `/bookings/staff/${member._id}/work-history`
    );

    setHistoryData(data);
  } catch (err) {
    setHistoryError(
      err.message || "Unable to load work history."
    );
  } finally {
    setHistoryLoading(false);
  }
};

const closeWorkHistory = () => {
  setHistoryData(null);
  setHistoryError("");
};

  const activeCount = staff.filter(
    (member) => member.isActive
  ).length;

  return (
    <div className="app-shell team-management-page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Users size={21} />
          </div>
          <div>
            <h1>BookEasy</h1>
            <span>Team Management</span>
          </div>
        </div>

        <button
          className="secondary"
          type="button"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>
      </header>

      <main className="settings-page">
        <div className="settings-heading">
          <div>
            <p className="eyebrow">TEAM MANAGEMENT</p>
            <h2>Manage your team</h2>
            <p>
              Add team members and configure their working
              availability.
            </p>
          </div>

          <button
            className="primary"
            type="button"
            onClick={openAddForm}
          >
            <Plus size={18} />
            Add Team Member
          </button>
        </div>

        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <p className="step-number">TEAM OVERVIEW</p>
              <h3>Your team members</h3>
              <p className="muted">
                {activeCount} active · {staff.length} total
              </p>
            </div>
            <Users size={25} />
          </div>

          <div className="muted" style={{ marginBottom: 18 }}>
            <Clock3 size={16} style={{ verticalAlign: "middle" }} />{" "}
            BookEasy automatically assigns appointments to eligible
            available team members. Customers do not select a team
            member.
          </div>

          {error && (
            <div className="error settings-alert" role="alert">
              {error}
              <p style={{ marginBottom: 0 }}>
                Team Management requires a plan with staff-management
                access. If your plan includes it, refresh and try again.
              </p>
            </div>
          )}

          {message && (
            <div className="success settings-alert" role="status">
              {message}
            </div>
          )}

          {loading ? (
            <p className="muted">Loading team members...</p>
          ) : staff.length === 0 ? (
            <p className="empty">
              No team members added yet. Select Add Team Member to
              create your first team member.
            </p>
          ) : (
            <div className="service-list">
              {staff.map((member) => (
                <div className="service" key={member._id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{member.name}</strong>

                    {member.designation && (
                      <small>{member.designation}</small>
                    )}

                    {member.phone && (
                      <small>Phone: {member.phone}</small>
                    )}

                    {member.email && (
                      <small>Email: {member.email}</small>
                    )}

                    <small>
                      {member.isActive ? "Active" : "Inactive"}
                    </small>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >

                    <button
  className="outline"
  type="button"
  onClick={() => openWorkHistory(member)}
>
  <History size={16} />
  Work History
</button>

                    <button
                      className="outline"
                      type="button"
                      onClick={() => openEditForm(member)}
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      className={
                        member.isActive ? "secondary" : "primary"
                      }
                      type="button"
                      disabled={changingId === member._id}
                      onClick={() => changeStatus(member)}
                    >
                      {member.isActive ? (
                        <UserX size={16} />
                      ) : (
                        <UserCheck size={16} />
                      )}
                      {changingId === member._id
                        ? "Please wait..."
                        : member.isActive
                          ? "Deactivate"
                          : "Activate"}
                    </button>

                    <button
  className="danger"
  type="button"
  disabled={
    deletingId === member._id ||
    changingId === member._id
  }
  onClick={() => deleteStaff(member)}
>
  <Trash2 size={16} />
  {deletingId === member._id
    ? "Deleting..."
    : "Delete"}
</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {(historyLoading || historyError || historyData) && (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="work-history-title"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      overflowY: "auto",
    }}
  >
    <div
      className="settings-card"
      style={{
        width: "100%",
        maxWidth: 750,
        maxHeight: "90vh",
        overflowY: "auto",
        margin: "auto",
      }}
    >
      <div className="settings-card-header">
        <div>
          <p className="step-number">TEAM MEMBER RECORD</p>
          <h3 id="work-history-title">
            Work History
          </h3>
          {historyData?.staff && (
            <p className="muted">
              {historyData.staff.name}
              {historyData.staff.designation
                ? ` · ${historyData.staff.designation}`
                : ""}
              {!historyData.staff.isActive
                ? " · Inactive"
                : ""}
            </p>
          )}
        </div>

        <button
          className="outline"
          type="button"
          onClick={closeWorkHistory}
          aria-label="Close work history"
        >
          <X size={18} />
        </button>
      </div>

      {historyLoading && (
        <p className="muted">Loading work history...</p>
      )}

      {historyError && (
        <div className="error settings-alert" role="alert">
          {historyError}
        </div>
      )}

      {historyData && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 12,
              marginBottom: 22,
            }}
          >
            {[
              ["Total", historyData.summary?.total],
              ["Completed", historyData.summary?.completed],
              ["Cancelled", historyData.summary?.cancelled],
              ["No-show", historyData.summary?.noShow],
              ["Upcoming", historyData.summary?.upcoming],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: 14,
                  border: "1px solid var(--border-color, #ddd)",
                  borderRadius: 10,
                }}
              >
                <strong style={{ fontSize: 22 }}>
                  {value ?? 0}
                </strong>
                <small
                  style={{
                    display: "block",
                    marginTop: 4,
                  }}
                >
                  {label}
                </small>
              </div>
            ))}
          </div>

          <h3>Appointments</h3>

          {!historyData.appointments?.length ? (
            <p className="empty">
              No appointment history found for this team member.
            </p>
          ) : (
            <div className="service-list">
              {historyData.appointments.map((appointment) => (
                <div
                  className="service"
                  key={appointment._id}
                  style={{
                    display: "block",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>
                      {appointment.customerName || "Customer"}
                    </strong>

                    <strong>
                      {(appointment.status || "unknown")
                        .replace("_", " ")
                        .toUpperCase()}
                    </strong>
                  </div>

                  <small>
                    Service:{" "}
                    {appointment.serviceId?.name || "Unavailable"}
                  </small>

                  <small>
                    Date:{" "}
                    {appointment.bookingDate
                      ? new Date(
                          appointment.bookingDate
                        ).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Kolkata",
                        })
                      : "Unavailable"}
                  </small>

                  {appointment.customerPhone && (
                    <small>
                      Phone: {appointment.customerPhone}
                    </small>
                  )}

                  {appointment.staffAssignmentHistory?.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <small>
                        Staff assignment events
                      </small>

                      {appointment.staffAssignmentHistory.map(
                        (event, index) => (
                          <small key={`${event._id || event.changedAt || "event"}-${index}`}>
                            {event.action} ·{" "}
                            {event.assignmentType || "manual"} ·{" "}
                            {event.changedAt
                              ? new Date(
                                  event.changedAt
                                ).toLocaleString("en-IN")
                              : ""}
                          </small>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  </div>
)}

        {showForm && (
          <section className="settings-card">
            <div className="settings-card-header">
              <div>
                <p className="step-number">
                  {editingId ? "EDIT TEAM MEMBER" : "NEW TEAM MEMBER"}
                </p>
                <h3>
                  {editingId ? "Update team member" : "Add team member"}
                </h3>
              </div>

              <button
                className="outline"
                type="button"
                onClick={closeForm}
                aria-label="Close form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveStaff}>
              <div className="settings-grid">
                <label>
                  Name *
                  <input
                    value={form.name}
                    onChange={(e) =>
                      updateField("name", e.target.value)
                    }
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  Designation
                  <input
                    value={form.designation}
                    onChange={(e) =>
                      updateField("designation", e.target.value)
                    }
                    maxLength={100}
                    placeholder="e.g. Hair Stylist, Doctor, Trainer"
                  />
                </label>

                <label>
                  Phone
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      updateField("phone", e.target.value)
                    }
                    maxLength={20}
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      updateField("email", e.target.value)
                    }
                  />
                </label>

                <label className="full-width">
                  Notes
                  <textarea
                    rows="3"
                    value={form.notes}
                    onChange={(e) =>
                      updateField("notes", e.target.value)
                    }
                    maxLength={1000}
                    placeholder="Optional notes about this team member"
                  />
                </label>

                <div className="full-width" style={{ marginTop: 20 }}>
  <h3>Assign services</h3>

  <p className="muted">
    Select the services this team member can handle.
  </p>

  {servicesLoading ? (
    <p className="muted">Loading services...</p>
  ) : services.length === 0 ? (
    <p className="muted">
      No services available. Add services before assigning them.
    </p>
  ) : (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 10,
      }}
    >
      {services.map((service) => {
        const serviceId = String(service._id);
        const selected = form.serviceIds.includes(serviceId);

        return (
          <label
            key={service._id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 12,
              border: "1px solid var(--border-color, #ddd)",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => {
                const nextIds = e.target.checked
                  ? [...form.serviceIds, serviceId]
                  : form.serviceIds.filter(
                      (id) => id !== serviceId
                    );

                updateField("serviceIds", nextIds);
              }}
            />

            <span>
              <strong>{service.name}</strong>
              {service.price != null && (
                <small style={{ display: "block" }}>
                  ₹{service.price}
                </small>
              )}
            </span>
          </label>
        );
      })}
    </div>
  )}
</div>

              </div>

              <div style={{ marginTop: 24 }}>
                <h3>Working hours</h3>
                <p className="muted">
                  Set the days and times when this team member is
                  available for automatic appointment assignment.
                </p>

                <div className="working-hours-list">
                  {form.workingHours.map((day) => (
                    <div
                      className={`working-hour-row ${
                        !day.isAvailable ? "closed" : ""
                      }`}
                      key={day.dayOfWeek}
                    >
                      <div className="working-day">
                        <strong>{DAYS[day.dayOfWeek]}</strong>
                        {!day.isAvailable && <span>Unavailable</span>}
                      </div>

                      <div className="working-time">
                        <label>
                          <span>Start</span>
                          <input
                            type="time"
                            value={day.startTime}
                            disabled={!day.isAvailable}
                            onChange={(e) =>
                              updateWorkingHour(
                                day.dayOfWeek,
                                "startTime",
                                e.target.value
                              )
                            }
                          />
                        </label>

                        <span className="time-separator">to</span>

                        <label>
                          <span>End</span>
                          <input
                            type="time"
                            value={day.endTime}
                            disabled={!day.isAvailable}
                            onChange={(e) =>
                              updateWorkingHour(
                                day.dayOfWeek,
                                "endTime",
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>

                      <label className="closed-toggle">
                        <input
                          type="checkbox"
                          checked={!day.isAvailable}
                          onChange={(e) =>
                            updateWorkingHour(
                              day.dayOfWeek,
                              "isAvailable",
                              !e.target.checked
                            )
                          }
                        />
                        <span>Day off</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="error settings-alert" role="alert">
                  {error}
                </div>
              )}

              <div
                className="settings-actions"
                style={{ display: "flex", gap: 10 }}
              >
                <button
                  className="primary"
                  type="submit"
                  disabled={saving}
                >
                  <Save size={17} />
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Add Team Member"}
                </button>

                <button
                  className="secondary"
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
