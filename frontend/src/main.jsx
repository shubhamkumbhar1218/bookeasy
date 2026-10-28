import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  // Keep all your existing icons
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import BookingPages from "./pages/BookingPages";
import CustomerBookings from "./CustomerBookings";
import CustomerDashboard from "./pages/CustomerDashboard";
import WelcomePage from "./pages/WelcomePage";
import ResetPassword from "./pages/ResetPassword";
import BusinessReports from "./pages/BusinessReports";
import AdminPanel from "./pages/AdminPanel";
import Subscription from "./pages/Subscription";
import PaymentReturn from "./pages/PaymentReturn";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import LegalPages from "./pages/LegalPages";
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
  Crown,
} from "lucide-react";

import "./style.css";

// ===============================
// API
// ===============================

const API =
  import.meta.env.VITE_API_URL ||
  "https://bookeasy-backend-ori1.onrender.com/api";

const api = async (path, options = {}) => {
  const currentToken = localStorage.getItem("bookeasy_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  // Automatically redirect when the session expires
  if (
    res.status === 401 &&
    currentToken &&
    !path.startsWith("/auth/")
  ) {
    localStorage.removeItem("bookeasy_token");
    localStorage.removeItem("bookeasy_user");

    window.location.replace("/business/login");

    throw new Error("Session expired. Please log in again.");
  }

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
  <option value="salon">Salon</option>
  <option value="barber">Barber</option>
  <option value="tutor">Tutor</option>
  <option value="gym">Gym</option>
  <option value="repair shop">Repair Shop</option>
  <option value="hospital">Hospital</option>
  <option value="dental clinic">Dental Clinic</option>
  <option value="doctor / clinic">Doctor / Clinic</option>
  <option value="physiotherapy">Physiotherapy</option>
  <option value="spa & wellness">Spa & Wellness</option>
  <option value="yoga & meditation">Yoga & Meditation</option>
  <option value="pet clinic / veterinary">Pet Clinic / Veterinary</option>
  <option value="car & bike service">Car & Bike Service</option>
  <option value="photography studio">Photography Studio</option>
  <option value="coaching classes">Coaching Classes</option>
  <option value="makeup artist">Makeup Artist</option>
  <option value="tailor">Tailor</option>
  <option value="plumber">Plumber</option>
  <option value="electrician">Electrician</option>
  <option value="computer repair">Computer Repair</option>
  <option value="consultant">Consultant</option>
  <option value="driving school">Driving School</option>
  <option value="diagnostic lab">Diagnostic Lab</option>
  <option value="nutritionist / dietitian">Nutritionist / Dietitian</option>
  <option value="laundry & dry cleaning">Laundry & Dry Cleaning</option>
  <option value="other">Other</option>
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
  const [qrCopied, setQrCopied] = useState(false);

  const [profilePhoto, setProfilePhoto] = useState(
  user?.profilePhoto || ""
);
const [uploadingPhoto, setUploadingPhoto] = useState(false);
const [photoMessage, setPhotoMessage] = useState("");
const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await api("/business/profile/me");

        setProfilePhoto(
  data.user?.profilePhoto ||
  data.profilePhoto ||
  data.user?.business?.profilePhoto ||
  data.profile?.profilePhoto ||
  data.profilePhotoUrl ||
  user?.profilePhoto ||
  ""
);

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


const savePhotoToUser = (photoUrl, publicId = "") => {
  const savedUser = JSON.parse(
    localStorage.getItem("bookeasy_user") || "{}"
  );

  const updatedUser = {
    ...savedUser,
    ...user,
    profilePhoto: photoUrl,
    profilePhotoPublicId: publicId,
  };

  localStorage.setItem(
    "bookeasy_user",
    JSON.stringify(updatedUser)
  );

  onUserUpdate(updatedUser);
};

const handlePhotoUpload = async (event) => {
  const file = event.target.files?.[0];

  // Allow selecting the same file again later.
  event.target.value = "";

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setPhotoError("Please select an image file.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setPhotoError("Image size must be 5 MB or less.");
    return;
  }

  const token = localStorage.getItem("bookeasy_token");

  if (!token) {
    setPhotoError("Session expired. Please log in again.");
    window.location.replace("/business/login");
    return;
  }

  try {
    setUploadingPhoto(true);
    setPhotoMessage("");
    setPhotoError("");

    const formData = new FormData();
    formData.append("profilePhoto", file);

    const response = await fetch(
      `${API}/business/profile/photo`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to upload business photo."
      );
    }

const photoUrl =
  data.user?.profilePhoto ||
  data.profilePhoto ||
  data.user?.business?.profilePhoto ||
  data.profile?.profilePhoto ||
  data.profilePhotoUrl ||
  "";

    if (!photoUrl) {
      throw new Error(
        "Upload response did not contain the photo URL."
      );
    }

    const publicId =
      data.user?.profilePhotoPublicId ||
      data.profilePhotoPublicId ||
      user?.profilePhotoPublicId ||
      "";

    setProfilePhoto(photoUrl);
    savePhotoToUser(photoUrl, publicId);
    setPhotoMessage("Business photo updated successfully.");
  } catch (error) {
    console.error("Business photo upload error:", error);
    setPhotoError(
      error.message || "Unable to upload business photo."
    );
  } finally {
    setUploadingPhoto(false);
  }
};

const handleRemovePhoto = async () => {
  if (!profilePhoto || uploadingPhoto) return;

  const confirmed = window.confirm(
    "Are you sure you want to remove your business photo?"
  );

  if (!confirmed) return;

  const token = localStorage.getItem("bookeasy_token");

  if (!token) {
    setPhotoError("Session expired. Please log in again.");
    window.location.replace("/business/login");
    return;
  }

  try {
    setUploadingPhoto(true);
    setPhotoMessage("");
    setPhotoError("");

    const response = await fetch(
      `${API}/business/profile/photo`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to remove business photo."
      );
    }

    setProfilePhoto("");
    savePhotoToUser("", "");
    setPhotoMessage("Business photo removed successfully.");
  } catch (error) {
    console.error("Business photo removal error:", error);
    setPhotoError(
      error.message || "Unable to remove business photo."
    );
  } finally {
    setUploadingPhoto(false);
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

  const downloadQRCode = () => {
  const canvas = document.getElementById("bookeasy-qr-code");

  if (!canvas) {
    return;
  }

  const pngUrl = canvas
    .toDataURL("image/png")
    .replace("image/png", "image/octet-stream");

  const downloadLink = document.createElement("a");

  downloadLink.href = pngUrl;
  downloadLink.download = `${user.businessSlug}-bookeasy-qr.png`;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

const copyQRBookingLink = async () => {
  const bookingLink =
    `${window.location.origin}/book/${user.businessSlug}`;

  try {
    await navigator.clipboard.writeText(bookingLink);

    setQrCopied(true);

    setTimeout(() => {
      setQrCopied(false);
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
  <option value="repair shop">Repair Shop</option>
  <option value="hospital">Hospital</option>
  <option value="dental clinic">Dental Clinic</option>
  <option value="doctor / clinic">Doctor / Clinic</option>
  <option value="physiotherapy">Physiotherapy</option>
  <option value="spa & wellness">Spa & Wellness</option>
  <option value="yoga & meditation">Yoga & Meditation</option>
  <option value="pet clinic / veterinary">Pet Clinic / Veterinary</option>
  <option value="car & bike service">Car & Bike Service</option>
  <option value="photography studio">Photography Studio</option>
  <option value="coaching classes">Coaching Classes</option>
  <option value="makeup artist">Makeup Artist</option>
  <option value="tailor">Tailor</option>
  <option value="plumber">Plumber</option>
  <option value="electrician">Electrician</option>
  <option value="computer repair">Computer Repair</option>
  <option value="consultant">Consultant</option>
  <option value="driving school">Driving School</option>
  <option value="diagnostic lab">Diagnostic Lab</option>
  <option value="nutritionist / dietitian">Nutritionist / Dietitian</option>
  <option value="laundry & dry cleaning">Laundry & Dry Cleaning</option>
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


{/* BUSINESS PROFILE PHOTO */}

<section className="settings-card">
  <div className="settings-card-header">
    <div>
      <p className="step-number">BUSINESS PROFILE PHOTO</p>
      <h3>Your business image</h3>
      <p className="muted">
        Upload a photo to represent your business.
        JPG, PNG, and WebP images up to 5 MB.
      </p>
    </div>
  </div>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "20px",
      flexWrap: "wrap",
      marginTop: "16px",
    }}
  >
    <div
      style={{
        width: "120px",
        height: "120px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        background: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {profilePhoto ? (
        <img
          src={profilePhoto}
          alt="Business profile"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <Store size={42} color="#9ca3af" />
      )}
    </div>

    <div style={{ flex: "1 1 220px" }}>
      <p style={{ fontWeight: 600, marginTop: 0 }}>
        {profilePhoto
          ? "Business photo uploaded"
          : "No business photo yet"}
      </p>

      <p className="muted">
        {profilePhoto
          ? "You can change or remove your current photo."
          : "Choose a clear image of your business or logo."}
      </p>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "12px",
        }}
      >
        <label
          className="primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: uploadingPhoto ? "wait" : "pointer",
            opacity: uploadingPhoto ? 0.6 : 1,
          }}
        >
          {uploadingPhoto
            ? "Please wait..."
            : profilePhoto
              ? "Change Photo"
              : "Upload Photo"}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
            style={{ display: "none" }}
          />
        </label>

        {profilePhoto && (
          <button
            className="secondary"
            type="button"
            onClick={handleRemovePhoto}
            disabled={uploadingPhoto}
          >
            Remove Photo
          </button>
        )}
      </div>
    </div>
  </div>

  {photoMessage && (
    <div className="success settings-alert" role="status">
      {photoMessage}
    </div>
  )}

  {photoError && (
    <div className="error settings-alert" role="alert">
      {photoError}
    </div>
  )}
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

          {/* BOOKING LINK + QR CODE */}

<section className="settings-card">
  <div className="settings-card-header">
    <div>
      <p className="step-number">
        BOOKING LINK
      </p>

      <h3>
        Share with customers
      </h3>

      <p className="muted">
        Customers can use this link or scan the QR
        code to book an appointment.
      </p>
    </div>

    <Copy size={22} />
  </div>

  {/* BOOKING LINK */}

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

  {/* QR CODE */}

  <div className="qr-section">

    <div className="qr-content">

      <div className="qr-info">
        <p className="step-number">
          QR CODE
        </p>

        <h3>
          Let customers scan and book
        </h3>

        <p className="muted">
          Print this QR code and place it at your
          reception, counter, door, posters, or
          business cards.
        </p>

        <div className="qr-actions">

          <button
            className="primary"
            type="button"
            onClick={downloadQRCode}
          >
            Download QR
          </button>

          <button
            className="secondary"
            type="button"
            onClick={copyQRBookingLink}
          >
            {qrCopied ? (
              <>
                <Check size={17} />
                Copied
              </>
            ) : (
              <>
                <Copy size={17} />
                Copy Booking Link
              </>
            )}
          </button>

        </div>
      </div>

      <div className="qr-preview">
        <QRCodeCanvas
          id="bookeasy-qr-code"
          value={`${window.location.origin}/book/${user.businessSlug}`}
          size={220}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          includeMargin={true}
        />

        <strong>
          {form.businessName || user.businessName}
        </strong>

        <span>
          Scan to book an appointment
        </span>
      </div>

    </div>

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
  // Get today's date in Indian Standard Time (IST)
  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // ===============================
  // STATES
  // ===============================
  // STATES
  // ===============================

  const [notifications, setNotifications] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);
const [showNotifications, setShowNotifications] = useState(false);

const [updatingBookingId, setUpdatingBookingId] = useState(null);

  const [services, setServices] =
    useState([]);

  const [bookings, setBookings] =
    useState([]);

  const [bookingDateFilter, setBookingDateFilter] =
  useState("");

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

const [editSlotInterval, setEditSlotInterval] =
  useState("30");

const [editBuffer, setEditBuffer] =
  useState("0");

const [form, setForm] = useState({
  name: "",
  price: "",
  duration: "30",
  slotIntervalMinutes: "30",
  bufferMinutes: "0",
  description: "",
});

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  // ===============================
  // START EDIT SERVICE
  // ===============================

  const [profilePhoto, setProfilePhoto] = useState(
  user?.profilePhoto || ""
);

const [showHelpFaq, setShowHelpFaq] = useState(false);
const [expandedHelpFaq, setExpandedHelpFaq] = useState(null);

const businessFaqs = [
  {
    question: "How do I add or edit a service?",
    answer:
      "Use the Add Service section to enter a service name, price, duration, and description. Existing services can be edited or deleted from the service list.",
  },
  {
    question: "How do I manage appointments?",
    answer:
      "Use the Appointments section to review customer bookings. Pending appointments can be confirmed or cancelled. Confirmed appointments can be rescheduled, completed, or cancelled.",
  },
  {
    question: "How can I reschedule an appointment?",
    answer:
      "Find a confirmed appointment and click Reschedule. Select a new date, choose an available time slot, and click Confirm Reschedule. The new time must be available.",
  },
  {
    question: "How do I assign staff to an appointment?",
    answer:
      "If Staff Management is included in your plan, use the staff assignment option on the relevant booking to select an active staff member. If you do not see this option, check your plan and staff management access.",
  },
  {
    question: "How do customers book my services online?",
    answer:
      "Open Settings and find the Booking Link section. Copy your booking link and share it with customers. Customers can also scan your downloadable QR code to open your booking page.",
  },
  {
    question: "How do I change my business information?",
    answer:
      "Open Settings to update your business name, owner name, business type, phone number, address, profile photo, and working hours. Save your changes when finished.",
  },
  {
    question: "Where can I see business reports?",
    answer:
      "Use Reports & Analytics to view the reports available to your account. Advanced Analytics is available separately, subject to your plan's feature access.",
  },
  {
    question: "How do I manage my subscription?",
    answer:
      "Open the Subscription page from your dashboard to review your plan and subscription options. Features available to you depend on your current plan.",
  },
  {
    question: "Why can't I access a feature?",
    answer:
      "Some features require a specific subscription plan. Check your current plan and the feature's requirements. If you believe you should already have access, contact BookEasy support through your established support channel.",
  },
  {
    question: "What should I do if a booking is missing?",
    answer:
      "Refresh the dashboard and check the appointment date filter. Choose All bookings to remove the date filter. If the appointment is still missing, contact BookEasy support.",
  },
  {
    question: "How do I refresh my dashboard?",
    answer:
      "Click the Refresh button near the top of the dashboard to reload your services and appointments.",
  },
  {
    question: "How can I get further help?",
    answer:
      "Review the questions above first. For account-specific issues, contact BookEasy support using your existing support contact details.",
  },
];

useEffect(() => {
  const loadBusinessPhoto = async () => {
    try {
      const data = await api("/business/profile/me");

const photo =
  data.user?.profilePhoto ||
  data.profilePhoto ||
  data.user?.business?.profilePhoto ||
  data.profile?.profilePhoto ||
  data.profilePhotoUrl ||
  user?.profilePhoto ||
  "";

      setProfilePhoto(photo);

      // Refresh the cached website user data too.
      const savedUser = JSON.parse(
        localStorage.getItem("bookeasy_user") || "{}"
      );

localStorage.setItem(
  "bookeasy_user",
  JSON.stringify({
    ...savedUser,
    profilePhoto: photo,
  })
);
    } catch (error) {
      console.error("Unable to load business photo:", error);
    }
  };

  loadBusinessPhoto();
}, []);



const startEditService = (service) => {
  setEditingService(service._id);
  setEditName(service.name);
  setEditDescription(service.description || "");
  setEditPrice(String(service.price));
  setEditDuration(String(service.duration ?? 30));
  setEditSlotInterval(
    String(service.slotIntervalMinutes ?? 30)
  );
  setEditBuffer(
    String(service.bufferMinutes ?? 0)
  );
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
  setEditDuration("30");
  setEditSlotInterval("30");
  setEditBuffer("0");
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
  description: editDescription.trim(),
  price: Number(editPrice),
  duration: Number(editDuration),
  slotIntervalMinutes: Number(editSlotInterval),
  bufferMinutes: Number(editBuffer),
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
  slotIntervalMinutes: "30",
  bufferMinutes: "0",
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


const status = async (id, value) => {
  const endpointByStatus = {
    confirmed: `/bookings/${id}/confirm`,
    cancelled: `/bookings/${id}/cancel`,
    completed: `/bookings/${id}/complete`,
  };

  const endpoint = endpointByStatus[value];

  if (!endpoint || updatingBookingId !== null) {
    return;
  }

  try {
    setError("");
    setUpdatingBookingId(id);

    await api(endpoint, {
      method: "PATCH",
    });

    await load();
  } catch (error) {
    console.error("Booking status update failed:", error);
    setError(error.message || "Unable to update appointment.");
  } finally {
    setUpdatingBookingId(null);
  }
};


  // ===============================
  // BOOKING SORTING AND DATE FILTER
  // ===============================

  const getAppointmentDateKey = (bookingDate) => {
    if (!bookingDate) return "";

    const date = new Date(bookingDate);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const values = {};

    parts.forEach((part) => {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    });

    return `${values.year}-${values.month}-${values.day}`;
  };

  // Most recently created bookings first
  const sortedBookings = [...bookings].sort((a, b) => {
    const dateA = new Date(
      a.createdAt || a.bookingDate || 0
    ).getTime();

    const dateB = new Date(
      b.createdAt || b.bookingDate || 0
    ).getTime();

    return dateB - dateA;
  });

  // All dates on which appointments are scheduled
  const appointmentDateOptions = [
    ...new Set(
      bookings
        .map((booking) =>
          getAppointmentDateKey(booking.bookingDate)
        )
        .filter(Boolean)
    ),
  ].sort();

  // Apply the selected appointment date
  const filteredBookings = sortedBookings.filter((booking) => {
    if (!bookingDateFilter) return true;

    return (
      getAppointmentDateKey(booking.bookingDate) ===
      bookingDateFilter
    );
  });


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
  {profilePhoto ? (
    <img
      src={profilePhoto}
      alt={`${user.businessName || "Business"} profile`}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
      style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        objectFit: "cover",
        border: "2px solid #e5e7eb",
      }}
    />
  ) : (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
      }}
    >
      <Store size={22} />
    </div>
  )}

  <span>{user.businessName}</span>


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
  className="primary"
  type="button"
  onClick={() => {
    localStorage.setItem("bookeasy_role", "customer");
    window.location.href = "/customer";
  }}
>
  <CalendarDays size={17} />
  Book as Customer
</button>


    <button
  className="outline"
  type="button"
  onClick={() => {
    window.location.href = "/advanced-analytics";
  }}
>
  <BarChart3 size={17} />
  Advanced Analytics
</button>

<button
  className="outline"
  type="button"
  onClick={() => {
    window.location.href = "/subscription";
  }}
>
  <Crown size={17} />
  Subscription
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


<select
  value={form.duration}
  onChange={(e) =>
    setForm({ ...form, duration: e.target.value })
  }
  required
>
  <option value="15">Duration: 15 minutes</option>
  <option value="20">Duration: 20 minutes</option>
  <option value="30">Duration: 30 minutes</option>
  <option value="45">Duration: 45 minutes</option>
  <option value="60">Duration: 60 minutes</option>
</select>

<select
  value={form.slotIntervalMinutes}
  onChange={(e) =>
    setForm({
      ...form,
      slotIntervalMinutes: e.target.value,
    })
  }
  required
>
  <option value="5">Slot interval: 5 minutes</option>
  <option value="10">Slot interval: 10 minutes</option>
  <option value="15">Slot interval: 15 minutes</option>
  <option value="20">Slot interval: 20 minutes</option>
  <option value="30">Slot interval: 30 minutes</option>
</select>

<select
  value={form.bufferMinutes}
  onChange={(e) =>
    setForm({ ...form, bufferMinutes: e.target.value })
  }
  required
>
  <option value="0">Buffer after appointment: 0 minutes</option>
  <option value="5">Buffer after appointment: 5 minutes</option>
  <option value="10">Buffer after appointment: 10 minutes</option>
  <option value="15">Buffer after appointment: 15 minutes</option>
</select>


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

<select
  value={editDuration}
  onChange={(e) => setEditDuration(e.target.value)}
  required
>
  <option value="15">Duration: 15 minutes</option>
  <option value="20">Duration: 20 minutes</option>
  <option value="30">Duration: 30 minutes</option>
  <option value="45">Duration: 45 minutes</option>
  <option value="60">Duration: 60 minutes</option>
</select>

<select
  value={editSlotInterval}
  onChange={(e) => setEditSlotInterval(e.target.value)}
  required
>
  <option value="5">Slot interval: 5 minutes</option>
  <option value="10">Slot interval: 10 minutes</option>
  <option value="15">Slot interval: 15 minutes</option>
  <option value="20">Slot interval: 20 minutes</option>
  <option value="30">Slot interval: 30 minutes</option>
</select>

<select
  value={editBuffer}
  onChange={(e) => setEditBuffer(e.target.value)}
  required
>
  <option value="0">Buffer after appointment: 0 minutes</option>
  <option value="5">Buffer after appointment: 5 minutes</option>
  <option value="10">Buffer after appointment: 10 minutes</option>
  <option value="15">Buffer after appointment: 15 minutes</option>
</select>


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

            <div className="booking-filter-row">
  <label className="booking-filter-control">
    <CalendarDays size={17} />

    <span>Appointment date</span>

    <input
      type="date"
      value={bookingDateFilter}
      onChange={(e) =>
        setBookingDateFilter(e.target.value)
      }
    />
  </label>

  <button
    type="button"
    className="outline"
    onClick={() => setBookingDateFilter("")}
    disabled={!bookingDateFilter}
  >
    All bookings
  </button>
</div>

<p className="booking-count">
  {bookingDateFilter
    ? `Bookings on ${new Date(
        `${bookingDateFilter}T12:00:00`
      ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`
    : "All bookings — newest first"}

  {" · "}

  {filteredBookings.length} booking
  {filteredBookings.length === 1 ? "" : "s"}
</p>





<div className="booking-list">
  {filteredBookings.length === 0 && !loading ? (
    <div className="appointments-empty">
      <CalendarDays size={32} />
      <h3>No appointments found</h3>
      <p>
        {bookingDateFilter
          ? "Try selecting another date."
          : "New customer bookings will appear here."}
      </p>
    </div>
  ) : (
    filteredBookings.map((booking) => {
      const statusLabel = {
        pending: "Pending",
        confirmed: "Confirmed",
        completed: "Completed",
        cancelled: "Cancelled",
      };

      const bookingDate = booking.bookingDate
        ? new Date(booking.bookingDate)
        : null;

      const validBookingDate =
        bookingDate &&
        !Number.isNaN(bookingDate.getTime());

      return (
        <article
          className="appointment-card"
          key={booking._id}
        >
          {/* Customer and status */}
          <div className="appointment-card-top">
            <div className="appointment-customer">
              <div className="appointment-avatar">
                {(booking.customerName || "C")
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <h3>
                  {booking.customerName || "Customer"}
                </h3>
                <p>
                  {booking.serviceId?.name || "Service"}
                </p>
              </div>
            </div>

            <span
              className={`appointment-status status-${
                booking.status || "pending"
              }`}
            >
              {statusLabel[booking.status] ||
                booking.status ||
                "Pending"}
            </span>
          </div>

          {/* Appointment details */}
          <div className="appointment-details">
            <div>
              <CalendarDays size={16} />
              <span>
                {validBookingDate
                  ? bookingDate.toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Date unavailable"}
              </span>
            </div>

            <div>
              <Clock3 size={16} />
              <span>
                {validBookingDate
                  ? bookingDate.toLocaleTimeString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "Time unavailable"}
              </span>
            </div>

            <div>
              <IndianRupee size={16} />
              <span>
                {booking.serviceId?.price != null
                  ? `₹${booking.serviceId.price}`
                  : "Price unavailable"}
              </span>
            </div>

            {booking.customerPhone && (
              <div>
                <span className="appointment-phone">
                  {booking.customerPhone}
                </span>
              </div>
            )}
          </div>

          {/* Appointment actions */}
          <div className="appointment-actions">
            {booking.status === "pending" && (
              <>
                <button
                  type="button"
                  className="appointment-btn confirm-btn"
                  disabled={updatingBookingId !== null}
                  onClick={() =>
                    status(booking._id, "confirmed")
                  }
                >
                  <CheckCircle2 size={16} />
                  Confirm
                </button>

                <button
                  type="button"
                  className="appointment-btn cancel-btn"
                  disabled={updatingBookingId !== null}
                  onClick={() =>
                    status(booking._id, "cancelled")
                  }
                >
                  <XCircle size={16} />
                  Cancel
                </button>
              </>
            )}

            {booking.status === "confirmed" && (
              <>
                <button
                  type="button"
                  className="appointment-btn reschedule-btn"
                  disabled={updatingBookingId !== null}
                  onClick={() => startReschedule(booking)}
                >
                  <RefreshCw size={16} />
                  Reschedule
                </button>

                <button
                  type="button"
                  className="appointment-btn complete-btn"
                  disabled={updatingBookingId !== null}
                  onClick={() =>
                    status(booking._id, "completed")
                  }
                >
                  <CheckCircle2 size={16} />
                  Complete
                </button>

                <button
                  type="button"
                  className="appointment-btn cancel-btn"
                  disabled={updatingBookingId !== null}
                  onClick={() =>
                    status(booking._id, "cancelled")
                  }
                >
                  <XCircle size={16} />
                  Cancel
                </button>
              </>
            )}

            {booking.status === "completed" && (
              <span className="appointment-final-state">
                <CheckCircle2 size={16} />
                Appointment completed
              </span>
            )}

            {booking.status === "cancelled" && (
              <span className="appointment-final-state cancelled-text">
                <XCircle size={16} />
                Appointment cancelled
              </span>
            )}

            {![
              "pending",
              "confirmed",
              "completed",
              "cancelled",
            ].includes(booking.status) && (
              <span className="appointment-final-state">
                Status: {booking.status || "Unknown"}
              </span>
            )}
          </div>
        </article>
      );
    })
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
                  min={todayIST}
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

      {/* BUSINESS HELP & FAQ */}

<div className="business-help-widget">
  {showHelpFaq && (
    <section
      className="business-help-panel"
      aria-label="Business Help and FAQs"
    >
      <div className="business-help-header">
        <div className="business-help-heading">
          <HelpCircle size={23} />

          <div>
            <h2>Business Help</h2>
            <p>Answers for your business</p>
          </div>
        </div>

        <button
          type="button"
          className="business-help-close"
          onClick={() => setShowHelpFaq(false)}
          aria-label="Close help panel"
        >
          <XCircle size={20} />
        </button>
      </div>

      <div className="business-help-intro">
        Find quick answers about managing your BookEasy business.
      </div>

      <div className="business-help-faq-list">
        {businessFaqs.map((faq, index) => {
          const isExpanded = expandedHelpFaq === index;

          return (
            <div
              className={`business-help-faq ${
                isExpanded ? "expanded" : ""
              }`}
              key={faq.question}
            >
              <button
                type="button"
                className="business-help-question"
                aria-expanded={isExpanded}
                onClick={() =>
                  setExpandedHelpFaq(
                    isExpanded ? null : index
                  )
                }
              >
                <span>{faq.question}</span>

                <ChevronDown
                  size={18}
                  className={
                    isExpanded
                      ? "business-help-chevron open"
                      : "business-help-chevron"
                  }
                />
              </button>

              {isExpanded && (
                <div className="business-help-answer">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="business-help-footer">
        <strong>Still need help?</strong>
        <p>
          Contact BookEasy support through your existing
          support channel for account-specific assistance.
        </p>
      </div>
    </section>
  )}

  <button
    type="button"
    className={`business-help-toggle ${
      showHelpFaq ? "active" : ""
    }`}
    onClick={() => setShowHelpFaq((current) => !current)}
    aria-expanded={showHelpFaq}
    aria-label={
      showHelpFaq
        ? "Close business help"
        : "Open business help and FAQs"
    }
  >
    {showHelpFaq ? (
      <XCircle size={22} />
    ) : (
      <HelpCircle size={23} />
    )}

    <span>{showHelpFaq ? "Close Help" : "Help & FAQ"}</span>
  </button>
</div>
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

{/* Login for Business Owners and Admin */}
<Route
  path="/business/login"
  element={
    user ? (
      <Navigate
        to={user.role === "ADMIN" ? "/admin" : "/dashboard"}
        replace
      />
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
  <Navigate
    to={user.role === "ADMIN" ? "/admin" : "/dashboard"}
    replace
  />
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
    !user ? (
      <Navigate to="/business/login" replace />
    ) : user.role === "ADMIN" ? (
      <Navigate to="/admin" replace />
    ) : (
      <Dashboard user={user} logout={logout} />
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


  {/* Advanced Analytics — separate from Business Analytics */}
<Route
  path="/advanced-analytics"
  element={
    !user ? (
      <Navigate to="/business/login" replace />
    ) : user.role === "ADMIN" ? (
      <Navigate to="/admin" replace />
    ) : (
      <AdvancedAnalytics user={user} api={api} />
    )
  }
/>



    <Route
  path="/subscription"
  element={
    user && user.role !== "ADMIN" ? (
      <Subscription user={user} />
    ) : (
      <Navigate to="/business/login" replace />
    )
  }
/>

  {/* Admin Panel */}
<Route
  path="/admin"
  element={
    user?.role === "ADMIN" ? (
      <AdminPanel user={user} logout={logout} />
    ) : user && user.role !== "ADMIN" ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <Navigate to="/business/login" replace />
    )
  }
/>

<Route
  path="/payment/return"
  element={<PaymentReturn />}
/>

<Route path="/terms" element={<LegalPages />} />
<Route path="/privacy" element={<LegalPages />} />
<Route path="/refund-policy" element={<LegalPages />} />

{/* Unknown route */}
<Route
  path="*"
  element={<Navigate to="/" replace />}
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
