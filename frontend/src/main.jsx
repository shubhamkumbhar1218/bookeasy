import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import BookingPages from "./pages/BookingPages";
import CustomerBookings from "./CustomerBookings";
import CustomerDashboard from "./pages/CustomerDashboard";
import WelcomePage from "./pages/WelcomePage";
import ResetPassword from "./pages/ResetPassword";
import BusinessReports from "./pages/BusinessReports";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  IndianRupee,
  LogIn,
  Plus,
  Store,
  UserPlus,
  XCircle,
  RefreshCw,
  Settings,
  Copy,
  Check,
  ArrowLeft,
  Bell,
  BarChart3,
} from "lucide-react";

import "./style.css";

// ===============================
// API
// ===============================

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const token = () =>
  localStorage.getItem("bookeasy_token");

const api = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token()) {
    headers.Authorization = `Bearer ${token()}`;
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.message || "Something went wrong"
    );
  }

  return data;
};

// ===============================
// AUTH
// ===============================

function Auth({ onLogin, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    password: "",
    category: "salon",
    phone: "",
    address: "",
  });

  const [error, setError] = useState("");

  // ===============================
  // FORGOT PASSWORD
  // ===============================

  const forgotPassword = async (e) => {
    e.preventDefault();

    setError("");
    setForgotMessage("");

    try {
      const data = await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: forgotEmail,
        }),
      });

      setForgotMessage(data.message);
    } catch (error) {
      console.log(error);
      setError(error.message);
    }
  };

  // ===============================
  // LOGIN / REGISTER
  // ===============================

  const submit = async (e) => {
    e.preventDefault();

    setError("");

    try {
      const data = await api(`/auth/${mode}`, {
        method: "POST",

        body: JSON.stringify(
          mode === "register"
            ? {
                name: form.ownerName,
                email: form.email,
                password: form.password,
                businessName: form.businessName,
                businessType: form.category,
                phone: form.phone,
                address: form.address,
              }
            : {
                email: form.email,
                password: form.password,
              }
        ),
      });

      localStorage.setItem(
        "bookeasy_token",
        data.token
      );

      localStorage.setItem(
        "bookeasy_user",
        JSON.stringify(data.user)
      );

      onLogin(data.user);
    } catch (error) {
      console.log(error);
      setError(error.message);
    }
  };

  // ===============================
  // FORGOT PASSWORD PAGE
  // ===============================

  if (mode === "forgot") {
    return (
      <div className="auth-page">
        <div className="auth-card">

          <div className="brand">
            <Store size={28} />
            <span>BookEasy</span>
          </div>

          <h1>Forgot Password?</h1>

          <p className="muted">
            Enter your registered email address
            and we'll send you a password reset link.
          </p>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {forgotMessage && (
            <div className="success">
              {forgotMessage}
            </div>
          )}

          <form onSubmit={forgotPassword}>
            <input
              type="email"
              placeholder="Enter your email"
              value={forgotEmail}
              onChange={(e) =>
                setForgotEmail(e.target.value)
              }
              required
            />

            <button
              className="primary"
              type="submit"
            >
              Send Reset Link
            </button>
          </form>

          <button
            type="button"
            className="link"
            onClick={() => {
              setMode("login");
              setError("");
              setForgotMessage("");
            }}
          >
            ← Back to Login
          </button>

        </div>
      </div>
    );
  }

  // ===============================
  // LOGIN / REGISTER PAGE
  // ===============================

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="brand">
          <Store size={28} />
          <span>BookEasy</span>
        </div>

        <h1>
          {mode === "login"
            ? "Welcome back"
            : "Create your business"}
        </h1>

        <p className="muted">
          Simple online booking for local
          businesses.
        </p>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <form onSubmit={submit}>

          {mode === "register" && (
            <>
              <input
                placeholder="Business name"
                value={form.businessName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    businessName: e.target.value,
                  })
                }
                required
              />

              <input
                placeholder="Owner name"
                value={form.ownerName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ownerName: e.target.value,
                  })
                }
                required
              />

              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value,
                  })
                }
              >
                <option value="salon">
                  Salon
                </option>

                <option value="barber">
                  Barber
                </option>

                <option value="tutor">
                  Tutor
                </option>

                <option value="gym">
                  Gym
                </option>

                <option value="repair shop">
                  Repair Shop
                </option>

                <option value="hospital">
                  Hospital
                </option>

                <option value="other">
                  Other
                </option>
              </select>

              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value,
                  })
                }
                required
              />

              <textarea
                placeholder="Business address"
                value={form.address}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: e.target.value,
                  })
                }
                rows="3"
                required
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
            required
          />

          <button
            className="primary"
            type="submit"
          >
            {mode === "login" ? (
              <>
                <LogIn size={18} />
                Login
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Create account
              </>
            )}
          </button>
        </form>

       {mode === "login" ? (
  <div className="auth-links-row">

    <button
      type="button"
      className="auth-link forgot-link"
      onClick={() => {
        setMode("forgot");
        setError("");
        setForgotMessage("");
      }}
    >
      Forgot Password?
    </button>

    <button
      type="button"
      className="auth-link register-link"
      onClick={() => {
        setMode("register");
        setError("");
      }}
    >
      Create new account
    </button>

  </div>
) : (
  <button
    type="button"
    className="auth-link back-login-link"
    onClick={() => {
      setMode("login");
      setError("");
    }}
  >
    Already have an account? Login
  </button>
)}


      </div>
    </div>
  );
}

// setting
function SettingsPage({ user, onUserUpdate, onBack }) {
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    businessType: "other",
    phone: "",
    address: "",
  });

  const [workingHours, setWorkingHours] = useState({
    monday: {
      open: "09:00",
      close: "18:00",
      closed: false,
    },
    tuesday: {
      open: "09:00",
      close: "18:00",
      closed: false,
    },
    wednesday: {
      open: "09:00",
      close: "18:00",
      closed: false,
    },
    thursday: {
      open: "09:00",
      close: "18:00",
      closed: false,
    },
    friday: {
      open: "09:00",
      close: "18:00",
      closed: false,
    },
    saturday: {
      open: "10:00",
      close: "16:00",
      closed: false,
    },
    sunday: {
      open: "10:00",
      close: "16:00",
      closed: true,
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await api("/business/profile/me");

        setForm({
          name: data.name || "",
          businessName: data.businessName || "",
          businessType: data.businessType || "other",
          phone: data.phone || "",
          address: data.address || "",
        });

        if (data.workingHours) {
          setWorkingHours((current) => ({
            ...current,
            ...data.workingHours,
          }));
        }
      } catch (error) {
        console.log(error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateWorkingHour = (day, field, value) => {
    setWorkingHours((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const data = await api("/business/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          workingHours,
        }),
      });

      const updatedUser = {
        ...user,
        ...data.user,
        workingHours,
      };

      localStorage.setItem(
        "bookeasy_user",
        JSON.stringify(updatedUser)
      );

      onUserUpdate(updatedUser);

      setMessage("Settings saved successfully.");
    } catch (error) {
      console.log(error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyBookingLink = async () => {
    const bookingLink = `${window.location.origin}/book/${user.businessSlug}`;

    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.log(error);
    }
  };

  const days = [
    ["monday", "Monday"],
    ["tuesday", "Tuesday"],
    ["wednesday", "Wednesday"],
    ["thursday", "Thursday"],
    ["friday", "Friday"],
    ["saturday", "Saturday"],
    ["sunday", "Sunday"],
  ];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Store size={20} />
          </div>

          <div>
            <h1>BookEasy</h1>
            <span>Business Settings</span>
          </div>
        </div>

        <button
          className="secondary"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>
      </header>

      <main className="settings-page">
        <div className="settings-heading">
          <div>
            <p className="eyebrow">BUSINESS SETTINGS</p>
            <h2>Manage your business</h2>
            <p>
              Update your business information and working hours.
            </p>
          </div>
        </div>

        {message && (
          <div className="success settings-alert">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {error && (
          <div className="error settings-alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* BUSINESS INFORMATION */}

          <section className="settings-card">
            <div className="settings-card-header">
              <div>
                <p className="step-number">BUSINESS INFORMATION</p>
                <h3>Basic details</h3>
                <p className="muted">
                  These details are visible to your customers.
                </p>
              </div>
            </div>

            <div className="settings-grid">
              <label>
                Your name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Business name
                <input
                  type="text"
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Business type
                <select
                  name="businessType"
                  value={form.businessType}
                  onChange={handleChange}
                >
                  <option value="salon">Salon</option>
                  <option value="barber">Barber</option>
                  <option value="tutor">Tutor</option>
                  <option value="gym">Gym</option>
                  <option value="repair">Repair</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label>
                Phone
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              </label>

              <label className="full-width">
                Address
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows="3"
                />
              </label>
            </div>
          </section>

          {/* WORKING HOURS */}

          <section className="settings-card">
            <div className="settings-card-header">
              <div>
                <p className="step-number">WORKING HOURS</p>
                <h3>Business availability</h3>
                <p className="muted">
                  Customers will only see booking slots inside
                  these hours.
                </p>
              </div>
            </div>

            <div className="working-hours-list">
              {days.map(([dayKey, dayName]) => {
                const day = workingHours[dayKey];

                return (
                  <div
                    className={`working-hour-row ${
                      day.closed ? "closed" : ""
                    }`}
                    key={dayKey}
                  >
                    <div className="working-day">
                      <strong>{dayName}</strong>

                      {day.closed && (
                        <span>Closed</span>
                      )}
                    </div>

                    <div className="working-time">
                      <label>
                        <span>Open</span>

                        <input
                          type="time"
                          value={day.open}
                          disabled={day.closed}
                          onChange={(e) =>
                            updateWorkingHour(
                              dayKey,
                              "open",
                              e.target.value
                            )
                          }
                        />
                      </label>

                      <span className="time-separator">
                        to
                      </span>

                      <label>
                        <span>Close</span>

                        <input
                          type="time"
                          value={day.close}
                          disabled={day.closed}
                          onChange={(e) =>
                            updateWorkingHour(
                              dayKey,
                              "close",
                              e.target.value
                            )
                          }
                        />
                      </label>
                    </div>

                    <label className="closed-toggle">
                      <input
                        type="checkbox"
                        checked={day.closed}
                        onChange={(e) =>
                          updateWorkingHour(
                            dayKey,
                            "closed",
                            e.target.checked
                          )
                        }
                      />

                      <span>Closed</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </section>

          {/* BOOKING LINK */}

          <section className="settings-card">
            <div className="settings-card-header">
              <div>
                <p className="step-number">BOOKING LINK</p>
                <h3>Share with customers</h3>
                <p className="muted">
                  Send this link to customers so they can book
                  appointments.
                </p>
              </div>
              <Copy size={22} />
            </div>

            <div className="booking-link-box">
              <input
                type="text"
                value={`${window.location.origin}/book/${user.businessSlug}`}
                readOnly
              />

              <button
                className="secondary"
                type="button"
                onClick={copyBookingLink}
              >
                {copied ? (
                  <>
                    <Check size={17} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={17} />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </section>

          {/* SAVE */}

          <div className="settings-actions">
            <button
              className="primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// ===============================
// DASHBOARD
// ===============================

function Dashboard({ user, logout }) {
  // ===============================
  // STATES
  // ===============================

  const [notifications, setNotifications] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);
const [showNotifications, setShowNotifications] = useState(false);


  const [services, setServices] =
    useState([]);

  const [bookings, setBookings] =
    useState([]);

  const [reschedulingBooking, setReschedulingBooking] =
  useState(null);

const [rescheduleDate, setRescheduleDate] =
  useState("");

const [rescheduleSlots, setRescheduleSlots] =
  useState([]);

const [selectedRescheduleSlot, setSelectedRescheduleSlot] =
  useState("");

const [rescheduleLoading, setRescheduleLoading] =
  useState(false);

  const [editingService, setEditingService] =
    useState(null);

  const [editName, setEditName] =
    useState("");

  const [editDescription, setEditDescription] =
    useState("");

  const [editPrice, setEditPrice] =
    useState("");

  const [editDuration, setEditDuration] =
    useState("");

  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "30",
    description: "",
  });

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  // ===============================
  // START EDIT SERVICE
  // ===============================

  const startEditService = (service) => {
    setEditingService(service._id);

    setEditName(service.name);

    setEditDescription(
      service.description || ""
    );

    setEditPrice(service.price);

    setEditDuration(service.duration);

    setError("");
  };

  // ===============================
  // CANCEL EDIT
  // ===============================

  const cancelEditService = () => {
    setEditingService(null);

    setEditName("");
    setEditDescription("");
    setEditPrice("");
    setEditDuration("");
  };

  //notification loader

  const loadNotifications = async () => {
  try {
    const data = await api("/notifications");

    setNotifications(data);

    const unread = data.filter(
      (notification) => !notification.isRead
    ).length;

    setUnreadCount(unread);
  } catch (error) {
    console.log("Notification error:", error);
  }
};


  // ===============================
  // SAVE EDITED SERVICE
  // ===============================

  const saveEditedService = async (
    serviceId
  ) => {
    if (!editName.trim()) {
      setError(
        "Service name is required."
      );
      return;
    }

    if (
      editPrice === "" ||
      Number(editPrice) < 0
    ) {
      setError(
        "Please enter a valid price."
      );
      return;
    }

    if (
      editDuration === "" ||
      Number(editDuration) <= 0
    ) {
      setError(
        "Please enter a valid duration."
      );
      return;
    }

    try {
      setError("");

      const updatedService = await api(
        `/services/${serviceId}`,
        {
          method: "PATCH",

          body: JSON.stringify({
            name: editName.trim(),

            description:
              editDescription.trim(),

            price: Number(editPrice),

            duration: Number(
              editDuration
            ),
          }),
        }
      );

      setServices(
        (currentServices) =>
          currentServices.map(
            (service) =>
              service._id === serviceId
                ? updatedService.service
                : service
          )
      );

      cancelEditService();
    } catch (e) {
      console.log(e);
      setError(e.message);
    }
  };

  // ===============================
  // DELETE SERVICE
  // ===============================

  const deleteService = async (
    serviceId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this service?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api(
        `/services/${serviceId}`,
        {
          method: "DELETE",
        }
      );

      setServices(
        (currentServices) =>
          currentServices.filter(
            (service) =>
              service._id !== serviceId
          )
      );

      if (
        editingService === serviceId
      ) {
        cancelEditService();
      }
    } catch (e) {
      console.log(e);
      setError(e.message);
    }
  };

  // ===============================
  // LOAD DATA
  // ===============================

  const load = async () => {
    try {
      setError("");
      setLoading(true);

      if (!user?.id) {
        throw new Error(
          "Business ID not found. Please login again."
        );
      }

      console.log(
        "Loading dashboard for:",
        user.id
      );

      const servicesData =
        await api(
          `/services/${user.id}`
        );

      const bookingsData =
        await api(
          `/bookings/business/${user.id}`
        );

      console.log(
        "Services:",
        servicesData
      );

      console.log(
        "Bookings:",
        bookingsData
      );

      setServices(
        Array.isArray(servicesData)
          ? servicesData
          : servicesData.services ||
              []
      );

      setBookings(
        Array.isArray(bookingsData)
          ? bookingsData
          : bookingsData.bookings ||
              []
      );
    } catch (e) {
      console.log(
        "Dashboard error:",
        e
      );

      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (!user?.id) {
    return;
  }

  // Load dashboard data
  load();

  // Load notifications
  loadNotifications();

  // Check for new notifications every 10 seconds
  const notificationInterval = setInterval(() => {
    loadNotifications();
  }, 10000);

  return () => {
    clearInterval(notificationInterval);
  };
}, [user?.id]);


  const markNotificationRead = async (id) => {
  try {
    await api(`/notifications/${id}/read`, {
      method: "PATCH",
    });

    setNotifications((current) =>
      current.map((notification) =>
        notification._id === id
          ? {
              ...notification,
              isRead: true,
            }
          : notification
      )
    );

    setUnreadCount((current) =>
      Math.max(current - 1, 0)
    );
  } catch (error) {
    console.log(error);
  }
};

const markAllNotificationsRead = async () => {
  try {
    await api("/notifications/read-all", {
      method: "PATCH",
    });

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        isRead: true,
      }))
    );

    setUnreadCount(0);
  } catch (error) {
    console.log(error);
  }
};


  // ===============================
  // ADD SERVICE
  // ===============================

  const add = async (e) => {
    e.preventDefault();

    try {
      setError("");

      await api("/services", {
        method: "POST",

        body: JSON.stringify({
          businessId: user.id,

          name: form.name.trim(),

          price: Number(form.price),

          duration: Number(
            form.duration
          ),

          description:
            form.description.trim(),
        }),
      });

      setForm({
        name: "",
        price: "",
        duration: "30",
        description: "",
      });

      await load();
    } catch (e) {
      console.log(e);
      setError(e.message);
    }
  };

  // ===============================
  // BOOKING STATUS
  // ===============================

  const status = async (
    id,
    value
  ) => {
    try {
      setError("");

      let endpoint = "";

      if (value === "confirmed") {
        endpoint =
          `/bookings/${id}/confirm`;
      }

      if (value === "cancelled") {
        endpoint =
          `/bookings/${id}/cancel`;
      }

      if (value === "completed") {
        endpoint =
          `/bookings/${id}/complete`;
      }

      if (!endpoint) {
        return;
      }

      await api(endpoint, {
        method: "PATCH",
      });

      await load();
    } catch (e) {
      console.log(e);
      setError(e.message);
    }
  };


  // ===============================
// RESCHEDULE BOOKING
// ===============================

const startReschedule = (booking) => {
  setReschedulingBooking(booking);
  setRescheduleDate("");
  setRescheduleSlots([]);
  setSelectedRescheduleSlot("");
  setError("");
};

const closeReschedule = () => {
  setReschedulingBooking(null);
  setRescheduleDate("");
  setRescheduleSlots([]);
  setSelectedRescheduleSlot("");
};

const loadRescheduleSlots = async (date) => {
  if (!date || !reschedulingBooking) {
    return;
  }

  try {
    setRescheduleLoading(true);
    setError("");

    const serviceId =
      reschedulingBooking.serviceId?._id ||
      reschedulingBooking.serviceId;

    if (!serviceId) {
      throw new Error(
        "Service information not found for this booking."
      );
    }

    console.log(
      "Reschedule Booking:",
      reschedulingBooking
    );

    console.log(
      "Service ID:",
      serviceId
    );

    console.log(
      "Date:",
      date
    );

    const data = await api(
      `/bookings/availability?businessId=${user.id}&serviceId=${serviceId}&date=${date}&excludeBookingId=${reschedulingBooking._id}`
    );

    console.log(
      "Available reschedule slots:",
      data
    );

    setRescheduleSlots(
      data.slots || []
    );

    setSelectedRescheduleSlot("");
  } catch (e) {
    console.log(
      "Reschedule slots error:",
      e
    );

    setError(e.message);

    setRescheduleSlots([]);
  } finally {
    setRescheduleLoading(false);
  }
};

const rescheduleBooking = async () => {
  if (!reschedulingBooking) {
    setError("Booking not found.");
    return;
  }

  if (!selectedRescheduleSlot) {
    setError(
      "Please select a new time slot."
    );
    return;
  }

  try {
    setRescheduleLoading(true);
    setError("");

    console.log(
      "Rescheduling booking:",
      reschedulingBooking._id
    );

    console.log(
      "New booking date:",
      selectedRescheduleSlot
    );

    const data = await api(
      `/bookings/${reschedulingBooking._id}/reschedule`,
      {
        method: "PATCH",
        body: JSON.stringify({
          bookingDate:
            selectedRescheduleSlot,
        }),
      }
    );

    console.log(
      "Reschedule response:",
      data
    );

    closeReschedule();

    await load();

  } catch (e) {
    console.log(
      "Reschedule booking error:",
      e
    );

    setError(e.message);
  } finally {
    setRescheduleLoading(false);
  }
};

  // ===============================
  // DASHBOARD UI
  // ===============================

  return (
    <div className="app">
      <header>
        <div className="brand">
          <Store size={25} />

          <span>
            BookEasy
          </span>
        </div>

        <div className="header-right">
  <span>
    {user.businessName}
  </span>

  <div className="notification-wrapper">
  <button
    type="button"
    className="notification-button"
    onClick={() =>
      setShowNotifications(
        (current) => !current
      )
    }
  >
    <Bell size={20} />

    {unreadCount > 0 && (
      <span className="notification-badge">
        {unreadCount > 9
          ? "9+"
          : unreadCount}
      </span>
    )}
  </button>

  {showNotifications && (
    <div className="notification-dropdown">
      <div className="notification-header">
        <div>
          <strong>Notifications</strong>
          <span>
            {unreadCount} unread
          </span>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="mark-all-button"
            onClick={markAllNotificationsRead}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="empty-notifications">
            <Bell size={24} />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map(
            (notification) => (
              <button
                type="button"
                key={notification._id}
                className={`notification-item ${
                  !notification.isRead
                    ? "unread"
                    : ""
                }`}
                onClick={() =>
                  !notification.isRead &&
                  markNotificationRead(
                    notification._id
                  )
                }
              >
                <div className="notification-dot">
                  <Bell size={16} />
                </div>

                <div className="notification-content">
                  <strong>
                    {notification.title}
                  </strong>

                  <p>
                    {notification.message}
                  </p>

                  <small>
                    {new Date(
                      notification.createdAt
                    ).toLocaleString("en-IN")}
                  </small>
                </div>
              </button>
            )
          )
        )}
      </div>
    </div>
  )}
</div>

  <button
    className="outline"
    onClick={() => {
      window.location.href = "/settings";
    }}
  >
    <Settings size={17} />
    Settings
  </button>

  <button
    className="outline"
    onClick={logout}
  >
    Logout
  </button>
</div>
      </header>

      <main>
        {/* HERO */}

<div className="hero">
  <div>
    <p className="eyebrow">
      BUSINESS DASHBOARD
    </p>

    <h1>
      Good morning,{" "}
      {user.name || "Business Owner"}
    </h1>

    <p className="muted">
      Manage services and appointments from one place.
    </p>
  </div>

  <div className="hero-actions">

    <button
      className="outline"
      type="button"
      onClick={() => {
        window.location.href = "/reports";
      }}
    >
      <BarChart3 size={17} />
      Reports & Analytics
    </button>

    <button
      className="outline"
      type="button"
      onClick={load}
      title="Refresh dashboard"
    >
      <RefreshCw size={17} />
      Refresh
    </button>

  </div>
</div>

        {/* ERROR */}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <p className="muted">
            Loading dashboard...
          </p>
        )}


        <div className="grid">
          {/* SERVICES */}

          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>
                  Add service
                </h2>

                <p className="muted">
                  What customers can
                  book.
                </p>
              </div>

              <Plus />
            </div>

            {/* ADD SERVICE FORM */}

            <form
              className="service-form"
              onSubmit={add}
            >
              <input
                placeholder="Service name"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name:
                      e.target.value,
                  })
                }
                required
              />

              <input
                type="number"
                min="0"
                placeholder="Price"
                value={form.price}
                onChange={(e) =>
                  setForm({
                    ...form,
                    price:
                      e.target.value,
                  })
                }
                required
              />

              <input
                type="number"
                min="5"
                placeholder="Duration (minutes)"
                value={form.duration}
                onChange={(e) =>
                  setForm({
                    ...form,
                    duration:
                      e.target.value,
                  })
                }
                required
              />

              <input
                placeholder="Description (optional)"
                value={
                  form.description
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    description:
                      e.target.value,
                  })
                }
              />

              <button
                className="primary"
                type="submit"
              >
                <Plus size={18} />

                Add service
              </button>
            </form>

            {/* SERVICE LIST */}

            <div className="service-list">
              {services.length ===
              0 ? (
                <p className="empty">
                  No services added
                  yet.
                </p>
              ) : (
                services.map(
                  (service) => (
                    <div
                      className="service"
                      key={
                        service._id
                      }
                    >
                      {editingService ===
                      service._id ? (
                        // ===============================
                        // EDIT SERVICE
                        // ===============================

                        <div className="service-edit-form">
                          <input
                            type="text"
                            value={
                              editName
                            }
                            onChange={(
                              e
                            ) =>
                              setEditName(
                                e.target
                                  .value
                              )
                            }
                            placeholder="Service name"
                          />

                          <input
                            type="text"
                            value={
                              editDescription
                            }
                            onChange={(
                              e
                            ) =>
                              setEditDescription(
                                e.target
                                  .value
                              )
                            }
                            placeholder="Description"
                          />

                          <input
                            type="number"
                            min="0"
                            value={
                              editPrice
                            }
                            onChange={(
                              e
                            ) =>
                              setEditPrice(
                                e.target
                                  .value
                              )
                            }
                            placeholder="Price"
                          />

                          <input
                            type="number"
                            min="5"
                            value={
                              editDuration
                            }
                            onChange={(
                              e
                            ) =>
                              setEditDuration(
                                e.target
                                  .value
                              )
                            }
                            placeholder="Duration in minutes"
                          />

                          <div className="service-edit-actions">
                            <button
                              className="primary"
                              type="button"
                              onClick={() =>
                                saveEditedService(
                                  service._id
                                )
                              }
                            >
                              Save
                            </button>

                            <button
                              className="outline"
                              type="button"
                              onClick={
                                cancelEditService
                              }
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // ===============================
                        // NORMAL SERVICE
                        // ===============================

                        <>
                          <div>
                            <strong>
                              {
                                service.name
                              }
                            </strong>

                            <small>
                              ₹
                              {
                                service.price
                              }{" "}
                              ·{" "}
                              {
                                service.duration
                              }{" "}
                              min
                            </small>

                            {service.description && (
                              <small>
                                {
                                  service.description
                                }
                              </small>
                            )}
                          </div>

                          <div className="service-actions">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() =>
                                startEditService(
                                  service
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="delete-button"
                              onClick={() =>
                                deleteService(
                                  service._id
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                )
              )}
            </div>
          </section>

          {/* APPOINTMENTS */}

          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>
                  Appointments
                </h2>

                <p className="muted">
                  Your latest customer
                  bookings.
                </p>
              </div>

              <CalendarDays />
            </div>

            <div className="booking-list">
              {bookings.map(
                (booking) => (
                  <div
                    className="booking"
                    key={
                      booking._id
                    }
                  >
                    <div className="booking-main">
                      <b>
                        {
                          booking.customerName
                        }
                      </b>

                      <span>
                        {booking
                          .serviceId
                          ?.name ||
                          "Service"}

                        {" · "}

                        {booking.bookingDate
  ? new Date(
      booking.bookingDate
    ).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  : "No date"}

{" at "}

{booking.bookingDate
  ? new Date(
      booking.bookingDate
    ).toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  : "No time"}
                      </span>

                      <small>
                        {
                          booking.customerPhone
                        }
                      </small>
                    </div>

                    <div className="booking-actions">
                      <span
                        className={`badge ${booking.status}`}
                      >
                        {
                          booking.status
                        }
                      </span>


{/* PENDING ACTIONS */}

{booking.status === "pending" && (
  <>
    <button
      type="button"
      title="Confirm"
      onClick={() =>
        status(
          booking._id,
          "confirmed"
        )
      }
    >
      <CheckCircle2 size={18} />
    </button>

    <button
      type="button"
      title="Cancel"
      onClick={() =>
        status(
          booking._id,
          "cancelled"
        )
      }
    >
      <XCircle size={18} />
    </button>
  </>
)}

{/* CONFIRMED ACTIONS */}

{booking.status === "confirmed" && (
  <>
    <button
      type="button"
      title="Reschedule"
      onClick={() => startReschedule(booking)}
    >
      Reschedule
    </button>

    <button
      type="button"
      title="Complete"
      onClick={() =>
        status(booking._id, "completed")
      }
    >
      Complete
    </button>
  </>
)}
                    </div>
                  </div>
                )
              )}

              {!bookings.length &&
                !loading && (
                  <p className="empty">
                    No bookings yet.
                  </p>
                )}
            </div>
          </section>
        </div>
            </main>

      {/* RESCHEDULE MODAL */}

      {reschedulingBooking && (
        <div className="modal-overlay">
          <div className="modal-card">

            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  RESCHEDULE BOOKING
                </p>

                <h2>
                  Choose new appointment time
                </h2>

                <p className="muted">
                  Customer:{" "}
                  {reschedulingBooking.customerName}
                </p>
              </div>

              <button
                className="outline"
                type="button"
                onClick={closeReschedule}
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="reschedule-form">

              {/* DATE */}

              <label>
                New date

                <input
                  type="date"
                  value={rescheduleDate}
                  min={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                  onChange={(e) => {
                    setRescheduleDate(
                      e.target.value
                    );

                    loadRescheduleSlots(
                      e.target.value
                    );
                  }}
                />
              </label>

              {/* TIME SLOTS */}

              {rescheduleDate && (
                <div className="reschedule-slots">

                  <label>
                    Available time slots
                  </label>

                  {rescheduleLoading ? (
                    <p className="muted">
                      Loading available slots...
                    </p>
                  ) : rescheduleSlots.length === 0 ? (
                    <p className="empty">
                      No available slots for this date.
                    </p>
                  ) : (
                    <div className="slot-grid">

                      {rescheduleSlots.map(
                        (slot) => (
                          <button
                            key={slot.value}
                            type="button"
                            className={
                              selectedRescheduleSlot ===
                              slot.value
                                ? "slot selected"
                                : "slot"
                            }
                            onClick={() =>
                              setSelectedRescheduleSlot(
                                slot.value
                              )
                            }
                          >
                            {slot.label}
                          </button>
                        )
                      )}

                    </div>
                  )}

                </div>
              )}

              {/* MODAL BUTTONS */}

              <div className="modal-actions">

                <button
                  className="outline"
                  type="button"
                  onClick={closeReschedule}
                >
                  Cancel
                </button>

                <button
                  className="primary"
                  type="button"
                  disabled={
                    !selectedRescheduleSlot ||
                    rescheduleLoading
                  }
                  onClick={
                    rescheduleBooking
                  }
                >
                  {rescheduleLoading
                    ? "Rescheduling..."
                    : "Confirm Reschedule"}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ===============================
// APP
// ===============================

function App() {
  const [user, setUser] =
    useState(() =>
      JSON.parse(
        localStorage.getItem(
          "bookeasy_user"
        ) || "null"
      )
    );

  const logout = () => {
    localStorage.removeItem(
      "bookeasy_token"
    );

    localStorage.removeItem(
      "bookeasy_user"
    );

    setUser(null);
  };

  return (
    <BrowserRouter>

      <Routes>

  {/* Welcome page */}
  <Route
    path="/"
    element={<WelcomePage />}
  />

  {/* Customer */}
  <Route
    path="/customer"
    element={<CustomerDashboard />}
  />

  {/* Business Login */}
  <Route
    path="/business/login"
    element={
      user ? (
        <Navigate to="/dashboard" />
      ) : (
        <Auth
          onLogin={setUser}
          initialMode="login"
        />
      )
    }
  />

  {/* Business Register */}
  <Route
    path="/business/register"
    element={
      user ? (
        <Navigate to="/dashboard" />
      ) : (
        <Auth
          onLogin={setUser}
          initialMode="register"
        />
      )
    }
  />

  {/* Business Dashboard */}
  <Route
    path="/dashboard"
    element={
      user ? (
        <Dashboard
          user={user}
          logout={logout}
        />
      ) : (
        <Navigate to="/business/login" />
      )
    }
  />

  {/* Customer booking status */}
  <Route
    path="/book/:businessSlug/status"
    element={<CustomerBookings />}
  />

  {/* Customer booking page */}
  <Route
    path="/book/:businessSlug"
    element={<BookingPages />}
  />

  {/* Business Settings */}
  <Route
    path="/settings"
    element={
      user ? (
        <SettingsPage
          user={user}
          onUserUpdate={setUser}
          onBack={() => {
            window.location.href = "/dashboard";
          }}
        />
      ) : (
        <Navigate to="/business/login" />
      )
    }
  />

  {/* Password Reset */}
  <Route
    path="/reset-password/:token"
    element={<ResetPassword />}
  />

  {/* Business Reports & Analytics */}
  <Route
    path="/reports"
    element={
      user ? (
        <BusinessReports user={user} />
      ) : (
        <Navigate to="/business/login" />
      )
    }
  />

  {/* Unknown route */}
  <Route
    path="*"
    element={<Navigate to="/" />}
  />

</Routes>
    </BrowserRouter>
  );
}

// ===============================
// START REACT
// ===============================

createRoot(
  document.getElementById("root")
).render(
  <App />
);