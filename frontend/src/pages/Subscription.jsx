
import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const featureLabels = {
  booking_link: "Online booking link",
  basic_bookings: "Basic appointment management",
  basic_dashboard: "Business dashboard",
  basic_notifications: "Booking notifications",
  unlimited_bookings: "Unlimited bookings",
  customer_management: "Customer management",
  reviews: "Customer reviews",
  analytics: "Business analytics",
  qr_code: "Booking QR code",
  staff_management: "Staff management",
  whatsapp_automation: "WhatsApp automation",
  automated_reminders: "Automated reminders",
  advanced_analytics: "Advanced analytics",
  payment_features: "Payment features",
  customer_retention: "Customer retention tools",
  multiple_branches: "Multiple branches",
  advanced_marketing: "Advanced marketing",
  loyalty_program: "Loyalty program",
  advanced_reports: "Advanced reports",
  advanced_automation: "Advanced automation",
};

const formatDate = (date) => {
  if (!date) return "Not started";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

function Subscription({ user }) {
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("bookeasy_token");

      if (!token) {
        throw new Error("Please log in again to view your subscription.");
      }

      const response = await fetch(
        `${API}/business/subscription/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load subscription details."
        );
      }

      setSubscription(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  const currentPlan = subscription?.plan || "FREE";

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f8fafc",
      padding: "24px",
      color: "#0f172a",
      boxSizing: "border-box",
    },
    container: {
      maxWidth: "1100px",
      margin: "0 auto",
    },
    card: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "16px",
      padding: "22px",
      boxSizing: "border-box",
    },
    button: {
      border: "1px solid #cbd5e1",
      background: "#ffffff",
      padding: "10px 14px",
      borderRadius: "9px",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      color: "#0f172a",
      fontWeight: 600,
    },
    primary: {
      border: "none",
      background: "#2563eb",
      color: "#ffffff",
      padding: "12px 16px",
      borderRadius: "9px",
      fontWeight: 600,
      width: "100%",
    },
    muted: {
      color: "#64748b",
      fontSize: "14px",
      lineHeight: 1.6,
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <RefreshCw size={20} /> Loading subscription...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <button style={styles.button} onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={17} /> Dashboard
          </button>

          <div
            role="alert"
            style={{
              ...styles.card,
              marginTop: 24,
              borderColor: "#fecaca",
            }}
          >
            <h2>Unable to load subscription</h2>
            <p>{error}</p>
            <button style={styles.button} onClick={loadSubscription}>
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const usage = subscription.usage || {};
  const limit = usage.bookingLimit;
  const used = usage.bookingsUsed || 0;
  const remaining = usage.remaining;
  const progress =
    limit === null || !limit
      ? 0
      : Math.min(100, (used / limit) * 100);

      const isFreePlan = currentPlan === "FREE";
  const hasBookingLimit =
    isFreePlan && limit != null && limit > 0;

  const limitReached =
    hasBookingLimit && used >= limit;

  const approachingLimit =
    hasBookingLimit &&
    used >= Math.ceil(limit * 0.8) &&
    used < limit;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div>
            <p
              style={{
                color: "#2563eb",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              BOOKEASY BILLING
            </p>
            <h1 style={{ margin: "6px 0" }}>Plans & Subscription</h1>
            <p style={styles.muted}>
              Manage your plan and understand your monthly usage.
            </p>
          </div>

          <button
            style={styles.button}
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} /> Dashboard
          </button>
        </header>

        {/* CURRENT PLAN */}
        <section style={{ ...styles.card, marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <p style={styles.muted}>YOUR CURRENT PLAN</p>
              <h2
                style={{
                  fontSize: 30,
                  margin: "8px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Crown size={27} color="#2563eb" />
                {subscription.planName}
              </h2>
              <p style={styles.muted}>
                {subscription.price === 0
                  ? "You are currently using the free plan."
                  : `₹${subscription.price} per month`}
              </p>
            </div>

            <span
              style={{
                padding: "7px 12px",
                borderRadius: 20,
                background: "#dcfce7",
                color: "#166534",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {subscription.subscriptionStatus || "ACTIVE"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginTop: 22,
            }}
          >
            <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12 }}>
              <p style={styles.muted}>Bookings this month</p>
              <h2 style={{ margin: "8px 0" }}>
                {used}
                {limit !== null && limit !== undefined ? ` / ${limit}` : ""}
              </h2>
              {limit !== null && limit !== undefined && (
                <>
                  <div
                    style={{
                      height: 8,
                      background: "#e2e8f0",
                      borderRadius: 8,
                      overflow: "hidden",
                      marginTop: 12,
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        background: progress >= 90 ? "#dc2626" : "#2563eb",
                      }}
                    />
                  </div>
                  <p style={styles.muted}>
                    {remaining ?? Math.max(0, limit - used)} bookings remaining
                  </p>
                </>
              )}
              {limit === null && (
                <p style={styles.muted}>Unlimited bookings</p>
              )}
            </div>

            <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12 }}>
              <p style={styles.muted}>Monthly price</p>
              <h2 style={{ margin: "8px 0" }}>
                ₹{subscription.price}
              </h2>
              <p style={styles.muted}>
                {subscription.price === 0 ? "No subscription charge" : "Per month"}
              </p>
            </div>

            <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12 }}>
              <p style={styles.muted}>Subscription started</p>
              <h3 style={{ margin: "8px 0" }}>
                {formatDate(subscription.subscriptionStartDate)}
              </h3>
              <p style={styles.muted}>
                {subscription.subscriptionEndDate
                  ? `Ends ${formatDate(subscription.subscriptionEndDate)}`
                  : "No end date recorded"}
              </p>
            </div>
          </div>

          
          <p style={{ ...styles.muted, marginTop: 18 }}>
            Usage period resets: {formatDate(usage.resetsAt)}
          </p>

          {limitReached && (
            <div
              role="alert"
              style={{
                marginTop: 18,
                padding: 16,
                border: "1px solid #fecaca",
                borderRadius: 12,
                background: "#fef2f2",
                color: "#991b1b",
              }}
            >
              <h3 style={{ margin: "0 0 8px" }}>
                Monthly booking limit reached
              </h3>
              <p style={{ margin: "0 0 12px" }}>
                You have used {used} of {limit} bookings this month.
                Compare the available plans below to find one that fits
                your business.
              </p>
              <button
                type="button"
                style={styles.button}
                onClick={() =>
                  document.getElementById("available-plans")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                View available plans
              </button>
            </div>
          )}

          {approachingLimit && (
            <div
              role="status"
              style={{
                marginTop: 18,
                padding: 16,
                border: "1px solid #fde68a",
                borderRadius: 12,
                background: "#fffbeb",
                color: "#92400e",
              }}
            >
              <h3 style={{ margin: "0 0 8px" }}>
                You're approaching your monthly limit
              </h3>
              <p style={{ margin: 0 }}>
                You've used {used} of {limit} bookings.
                You have {Math.max(0, limit - used)} bookings remaining.
                Review the available plans below if your business needs more.
              </p>
            </div>
          )}
        </section>

{/* AVAILABLE PLANS */}
<div id="available-plans" style={{ marginBottom: 18 }}>
  <h2>Choose a plan</h2>
  <p style={styles.muted}>
    Customers can book appointments for free. Business plans are for business owners.
  </p>
</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          {(subscription.availablePlans || []).map((plan) => {
            const isCurrent = plan.id === currentPlan;

            return (
              <section
                key={plan.id}
                style={{
                  ...styles.card,
                  border: isCurrent
                    ? "2px solid #2563eb"
                    : "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {isCurrent && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "#1d4ed8",
                      fontWeight: 700,
                    }}
                  >
                    CURRENT PLAN
                  </span>
                )}

                <h2 style={{ margin: "12px 0 4px" }}>{plan.name}</h2>

                <div style={{ margin: "10px 0 18px" }}>
                  <strong style={{ fontSize: 30 }}>
                    ₹{plan.price}
                  </strong>
                  <span style={styles.muted}> / month</span>
                </div>

                <p style={styles.muted}>
                  {plan.bookingLimit === null
                    ? "Unlimited bookings"
                    : `${plan.bookingLimit} bookings per month`}
                </p>

                <div
                  style={{
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: 16,
                    marginTop: 8,
                    flex: 1,
                  }}
                >
                  {(plan.features || []).map((feature) => (
                    <div
                      key={feature}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 9,
                        marginBottom: 12,
                        fontSize: 14,
                        lineHeight: 1.45,
                      }}
                    >
                      <CheckCircle2
                        size={17}
                        color="#16a34a"
                        style={{ flexShrink: 0, marginTop: 1 }}
                      />
                      {featureLabels[feature] ||
                        feature.replaceAll("_", " ")}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled
                  style={{
                    ...styles.primary,
                    marginTop: 16,
                    opacity: 0.7,
                    cursor: "not-allowed",
                    background: isCurrent ? "#e2e8f0" : "#2563eb",
                    color: isCurrent ? "#334155" : "#ffffff",
                  }}
                  title="Online subscription payments are not enabled yet"
                >
                  {isCurrent ? "Current Plan" : "Upgrade — Coming Soon"}
                </button>
              </section>
            );
          })}
        </div>

        <div
          style={{
            ...styles.card,
            marginTop: 24,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <ShieldCheck size={24} color="#2563eb" />
          <div>
            <strong>Subscription payment protection</strong>
            <p style={styles.muted}>
              Plan changes and paid upgrades are not enabled from this page yet.
              We will connect a payment gateway and verify payments on the backend
              before activating paid plans.
            </p>
          </div>
        </div>

        <p
          style={{
            ...styles.muted,
            textAlign: "center",
            marginTop: 24,
          }}
        >
          <Zap size={14} style={{ verticalAlign: "middle" }} /> BookEasy plans
        </p>
      </div>
    </div>
  );
}

export default Subscription;
