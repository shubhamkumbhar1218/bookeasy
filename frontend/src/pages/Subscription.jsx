
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

const API = (
  import.meta.env.VITE_API_URL ||
  "https://bookeasy-backend-ori1.onrender.com/api"
).replace(/\/$/, "");

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
  whatsapp_automation: "WhatsApp automation",
  automated_reminders: "Automated reminders",
  advanced_analytics: "Advanced analytics",
  payment_features: "Payment features",
  multiple_branches: "Multiple branches",
  advanced_marketing: "Advanced marketing",
  loyalty_program: "Loyalty program",
  advanced_reports: "Advanced reports",
  advanced_automation: "Advanced automation",
};

const formatDate = (date) => {
  if (!date) return "Not started";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleDateString("en-IN", {
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
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState("");

  const [billingPeriod, setBillingPeriod] = useState("yearly");
  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("bookeasy_token");

      if (!token) {
        throw new Error(
          "Please log in again to view your subscription."
        );
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

  const loadCashfreeSDK = async () => {
    if (typeof window.Cashfree === "function") {
      return window.Cashfree;
    }

    let script = document.querySelector(
      'script[data-cashfree-subscriptions="true"]'
    );

    if (script?.dataset.cashfreeFailed === "true") {
      script.remove();
      script = null;
    }

    const existingScript = Boolean(script);

    if (!script) {
      script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.dataset.cashfreeSubscriptions = "true";
    }

    await new Promise((resolve, reject) => {
      let timeoutId;

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
      };

      const onLoad = () => {
        cleanup();

        if (typeof window.Cashfree === "function") {
          resolve();
        } else {
          script.dataset.cashfreeFailed = "true";
          reject(
            new Error(
              "Cashfree script loaded, but its SDK is unavailable."
            )
          );
        }
      };

      const onError = () => {
        cleanup();
        script.dataset.cashfreeFailed = "true";
        reject(
          new Error(
            "Unable to load Cashfree checkout. Check your internet connection or browser extensions."
          )
        );
      };

      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });

      timeoutId = window.setTimeout(() => {
        cleanup();
        script.dataset.cashfreeFailed = "true";

        reject(
          new Error(
            "Cashfree SDK loading timed out after 15 seconds. Check the Network tab for cashfree.js."
          )
        );
      }, 15000);

      if (!existingScript) {
        document.head.appendChild(script);
      }

      // Check again after registering listeners.
      if (typeof window.Cashfree === "function") {
        cleanup();
        resolve();
      }
    });

    if (typeof window.Cashfree !== "function") {
      throw new Error("Cashfree checkout SDK is unavailable.");
    }

    return window.Cashfree;
  };

  const startPlanCheckout = async (plan) => {
    const currentPlan = subscription?.plan || "FREE";

    console.log("CHECKOUT 1: selected plan", plan.id);
    console.log("CHECKOUT: current plan", currentPlan);

    if (plan.id === currentPlan) {
      return;
    }

    if (checkoutLoadingPlan) {
      return;
    }

    if (Number(plan.price) <= 0) {
      setCheckoutError(
        "Switching to the Free plan is not supported by the current backend yet."
      );
      return;
    }

    setCheckoutError("");
    setCheckoutLoadingPlan(plan.id);

    try {
      const token = localStorage.getItem("bookeasy_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      console.log("CHECKOUT 2: loading Cashfree SDK");

      const Cashfree = await loadCashfreeSDK();

      console.log("CHECKOUT 3: Cashfree SDK loaded");
      console.log("CHECKOUT 4: calling backend", API);

      const response = await fetch(
        `${API}/payments/create-subscription`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan: plan.id,
          }),
        }
      );

      console.log("CHECKOUT 5: backend status", response.status);

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message ||
            `Unable to create your subscription (HTTP ${response.status}).`
        );
      }

      const sessionId =
        data.subscriptionSessionId ||
        data.subscription_session_id ||
        data.data?.subscription_session_id ||
        data.data?.subscriptionSessionId;

      if (!sessionId) {
        console.error("Subscription API response:", data);

        throw new Error(
          "The backend did not return a subscription session ID. Check the create-subscription API response."
        );
      }

      const cashfree = Cashfree({
        mode:
          import.meta.env.VITE_CASHFREE_MODE === "production"
            ? "production"
            : "sandbox",
      });

      console.log("CHECKOUT 6: opening Cashfree checkout");

      
console.log(
  "Cashfree checkout mode:",
  import.meta.env.VITE_CASHFREE_MODE === "production"
    ? "production"
    : "sandbox"
);

console.log("Cashfree SDK type:", typeof Cashfree);
console.log("Subscription session ID received:", Boolean(sessionId));
console.log(
  "Subscription session ID prefix:",
  sessionId.slice(0, 8)
);

console.log(
  "Cashfree SDK script:",
  document.querySelector(
    'script[data-cashfree-subscriptions="true"]'
  )?.src
);

console.log(
  "Cashfree checkout options:",
  Object.keys({
    subsSessionId: sessionId,
    redirectTarget: "_self",
  })
);


console.log("CHECKOUT 6: opening Cashfree subscription checkout");

const checkoutResult = await cashfree.subscriptionsCheckout({
  subsSessionId: sessionId,
  redirectTarget: "_self",
});

console.log(
  "Cashfree subscription checkout result:",
  checkoutResult
);

if (checkoutResult?.error) {
  throw new Error(
    checkoutResult.error.message ||
      "Unable to open Cashfree subscription checkout."
  );
}

if (checkoutResult?.redirect) {
  console.log("Cashfree requested a redirect.");
}

    } catch (err) {
      console.error("CHECKOUT FAILED:", err);
      setCheckoutError(
        err.message || "Unable to start checkout."
      );
    } finally {
      setCheckoutLoadingPlan("");
    }
  };

  const startOneTimePlanCheckout = async (plan) => {
  if (checkoutLoadingPlan) return;

  setCheckoutError("");
  setCheckoutLoadingPlan(plan.id);

  try {
    const token = localStorage.getItem("bookeasy_token");

    if (!token) {
      throw new Error("Please log in again.");
    }

    const Cashfree = await loadCashfreeSDK();

    const response = await fetch(`${API}/payments/create-order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan: plan.id,
        billingPeriod: "yearly",
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message ||
          `Unable to create payment order (HTTP ${response.status}).`
      );
    }

    if (
      !data.paymentSessionId ||
      data.billingPeriod !== "yearly" ||
      Number(data.amount) !== 2990
    ) {
      console.error("Unexpected one-time payment response:", data);
      throw new Error(
        "The server returned unexpected annual payment details. Please try again."
      );
    }

    const cashfree = Cashfree({
      mode:
        import.meta.env.VITE_CASHFREE_MODE === "production"
          ? "production"
          : "sandbox",
    });

    const checkoutResult = await cashfree.checkout({
      paymentSessionId: data.paymentSessionId,
      redirectTarget: "_self",
    });

    if (checkoutResult?.error) {
      throw new Error(
        checkoutResult.error.message ||
          "Unable to open Cashfree payment checkout."
      );
    }
  } catch (err) {
    console.error("Annual checkout failed:", err);
    setCheckoutError(err.message || "Unable to start annual checkout.");
  } finally {
    setCheckoutLoadingPlan("");
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
            <RefreshCw size={20} />
            Loading subscription...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <button
            style={styles.button}
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} />
            Dashboard
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
            <button
              style={styles.button}
              onClick={loadSubscription}
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const usage = subscription?.usage || {};
  const limit = usage.bookingLimit;
  const used = usage.bookingsUsed || 0;
  const remaining = usage.remaining;

  const progress =
    limit == null || !limit
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

            <h1 style={{ margin: "6px 0" }}>
              Plans &amp; Subscription
            </h1>

            <p style={styles.muted}>
              Manage your plan and understand your monthly usage.
            </p>
          </div>

          <button
            style={styles.button}
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>
        </header>

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
                {subscription.planName || currentPlan}
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
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginTop: 22,
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                padding: 16,
                borderRadius: 12,
              }}
            >
              <p style={styles.muted}>Bookings this month</p>

              <h2 style={{ margin: "8px 0" }}>
                {used}
                {limit != null ? ` / ${limit}` : ""}
              </h2>

              {limit != null && (
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
                        background:
                          progress >= 90 ? "#dc2626" : "#2563eb",
                      }}
                    />
                  </div>

                  <p style={styles.muted}>
                    {remaining ?? Math.max(0, limit - used)} bookings
                    remaining
                  </p>
                </>
              )}

              {limit == null && (
                <p style={styles.muted}>Unlimited bookings</p>
              )}
            </div>

            <div
              style={{
                background: "#f8fafc",
                padding: 16,
                borderRadius: 12,
              }}
            >
              <p style={styles.muted}>Monthly price</p>
              <h2 style={{ margin: "8px 0" }}>
                ₹{subscription.price ?? 0}
              </h2>
              <p style={styles.muted}>
                {subscription.price === 0
                  ? "No subscription charge"
                  : "Per month"}
              </p>
            </div>

            <div
              style={{
                background: "#f8fafc",
                padding: 16,
                borderRadius: 12,
              }}
            >
              <p style={styles.muted}>Subscription started</p>
              <h3 style={{ margin: "8px 0" }}>
                {formatDate(subscription.subscriptionStartDate)}
              </h3>

<p style={styles.muted}>
  {subscription.subscriptionEndDate
    ? `Expires ${formatDate(subscription.subscriptionEndDate)}`
    : "No expiry date recorded"}
</p>

<p style={styles.muted}>
  Billing:{" "}
  {subscription.subscriptionBillingMode === "AUTOMATIC"
    ? "Automatic monthly renewal"
    : "Manual payment"}
</p>

{subscription.subscriptionBillingMode === "AUTOMATIC" &&
  subscription.subscriptionNextBillingDate && (
    <p style={styles.muted}>
      Next billing date:{" "}
      {formatDate(subscription.subscriptionNextBillingDate)}
    </p>
  )}

{subscription.subscriptionLastPaymentAt && (
  <p style={styles.muted}>
    Last successful payment:{" "}
    {formatDate(subscription.subscriptionLastPaymentAt)}
  </p>
)}

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
                  document
                    .getElementById("available-plans")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
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
                You've used {used} of {limit} bookings. You have{" "}
                {Math.max(0, limit - used)} bookings remaining. Review
                the available plans below if your business needs more.
              </p>
            </div>
          )}
        </section>

        <div id="available-plans" style={{ marginBottom: 18 }}>
          <h2>Choose a plan</h2>

          {checkoutError && (
            <div
              role="alert"
              style={{
                marginBottom: 18,
                padding: 14,
                border: "1px solid #fecaca",
                borderRadius: 10,
                background: "#fef2f2",
                color: "#991b1b",
              }}
            >
              {checkoutError}
            </div>
          )}

          <p style={styles.muted}>
            Customers can book appointments for free. Business plans
            are for business owners.
          </p>

          <div
  role="group"
  aria-label="Premium billing period"
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 16,
    marginBottom: 20,
  }}
>
  <button
    type="button"
    aria-pressed={billingPeriod === "monthly"}
    onClick={() => setBillingPeriod("monthly")}
    style={{
      ...styles.button,
      background:
        billingPeriod === "monthly" ? "#dbeafe" : "#ffffff",
      borderColor:
        billingPeriod === "monthly" ? "#2563eb" : "#cbd5e1",
    }}
  >
    Monthly · ₹299
  </button>

  <button
    type="button"
    aria-pressed={billingPeriod === "yearly"}
    onClick={() => setBillingPeriod("yearly")}
    style={{
      ...styles.button,
      background:
        billingPeriod === "yearly" ? "#dbeafe" : "#ffffff",
      borderColor:
        billingPeriod === "yearly" ? "#2563eb" : "#cbd5e1",
    }}
  >
    Yearly · ₹2,990
  </button>


  {billingPeriod === "yearly" && (
    <span
      style={{
        display: "inline-flex",
        padding: "6px 10px",
        borderRadius: 20,
        background: "#dcfce7",
        color: "#166534",
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      Save ₹598 · 16.7% off
    </span>
  )}

</div>

<p style={{ ...styles.muted, marginTop: -8, marginBottom: 20 }}>
  Yearly billing is one payment of ₹2,990 for 12 months.
  The monthly option is ₹299 per month.
</p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 18,
            alignItems: "stretch",
          }}
        >





          {(subscription.availablePlans || [])
            .filter((plan) =>
              ["FREE", "STARTER"].includes(
                String(plan.id).toUpperCase()
              )
            )
            .map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const isProcessing = checkoutLoadingPlan === plan.id;
              const anyCheckoutRunning = checkoutLoadingPlan !== "";

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

                  <h2 style={{ margin: "12px 0 4px" }}>
                    {plan.name}
                  </h2>

<div style={{ margin: "10px 0 18px" }}>
  {String(plan.id).toUpperCase() === "STARTER" &&
  billingPeriod === "yearly" ? (
    <>
      <div>
        <strong style={{ fontSize: 30 }}>₹2,990</strong>
        <span style={styles.muted}> / year</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 6,
        }}
      >
        <span
          style={{
            color: "#64748b",
            textDecoration: "line-through",
            fontSize: 14,
          }}
        >
          ₹3,588
        </span>

        <span
          style={{
            color: "#15803d",
            background: "#dcfce7",
            padding: "4px 8px",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          SAVE ₹598 · 16.7% OFF
        </span>
      </div>

      <p style={{ ...styles.muted, marginTop: 8 }}>
        Just ₹249.17/month, billed once annually
      </p>
    </>
  ) : (
    <div>
      <strong style={{ fontSize: 30 }}>₹{plan.price}</strong>
<span style={styles.muted}>
  {Number(plan.price) === 0 ? " / month" : " / month"}
</span>
    </div>
  )}
</div>

                  <p style={styles.muted}>
                    {plan.bookingLimit == null
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
                          style={{
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        />
                        {featureLabels[feature] ||
                          feature.replaceAll("_", " ")}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={isCurrent || anyCheckoutRunning}
                    onClick={() => {
  if (
    String(plan.id).toUpperCase() === "STARTER" &&
    billingPeriod === "yearly"
  ) {
    startOneTimePlanCheckout(plan);
  } else {
    startPlanCheckout(plan);
  }
}}
                    style={{
                      ...styles.primary,
                      marginTop: 16,
                      opacity:
                        isCurrent || anyCheckoutRunning ? 0.7 : 1,
                      cursor:
                        isCurrent || anyCheckoutRunning
                          ? "not-allowed"
                          : "pointer",
                      background: isCurrent ? "#e2e8f0" : "#2563eb",
                      color: isCurrent ? "#334155" : "#ffffff",
                    }}
                  >
                    {isCurrent
                      ? "Current Plan"
                      : isProcessing
  ? "Opening checkout..."
  : Number(plan.price) === 0
    ? "Switch to Free"
    : String(plan.id).toUpperCase() === "STARTER" &&
      billingPeriod === "yearly"
      ? "Get Premium — ₹2,990/year"
      : `Upgrade to ${plan.name}`}
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
          <ShieldCheck
            size={24}
            color="#2563eb"
            style={{ flexShrink: 0 }}
          />

          <div>
            <strong>Subscription payment protection</strong>
            <p style={styles.muted}>
              Paid access is not granted by clicking Upgrade. BookEasy
              must verify subscription status with Cashfree on the
              backend before activating a paid plan. Use sandbox mode
              while testing.
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
          <Zap
            size={14}
            style={{ verticalAlign: "middle" }}
          />{" "}
          BookEasy plans
        </p>
      </div>
    </div>
  );
}

export default Subscription;
