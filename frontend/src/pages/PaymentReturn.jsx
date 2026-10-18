import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API = (
  import.meta.env.VITE_API_URL ||
  "https://bookeasy-backend-ori1.onrender.com/api"
).replace(/\/+$/, "");

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const subscriptionId =
    searchParams.get("subscription_id") ||
    searchParams.get("subscriptionId");

  const [status, setStatus] = useState("VERIFYING");
  const [message, setMessage] = useState(
    "Checking your subscription status with Cashfree..."
  );

  async function verifySubscription() {
    const token = localStorage.getItem("bookeasy_token");

    if (!token) {
      setStatus("LOGIN_REQUIRED");
      setMessage("Please log in to check your subscription status.");
      return;
    }

    if (!subscriptionId) {
      setStatus("NO_REFERENCE");
      setMessage(
        "Cashfree did not return a subscription reference. Open your subscription page to check the status."
      );
      return;
    }

    setStatus("VERIFYING");
    setMessage("Checking your subscription status with Cashfree...");

    try {
      const response = await fetch(`${API}/payments/verify-subscription`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setStatus("LOGIN_REQUIRED");
        setMessage("Your session has expired. Please log in again.");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to verify your subscription right now."
        );
      }
      
    
    if (
  data.authorizationStatus === "ACTIVE" &&
  data.subscriptionStatus === "ACTIVE"
) {
if (data.planActivated === true) {
  setStatus("AUTHORIZED");
  setMessage(
    "Your BookEasy paid plan is active. Open your dashboard to confirm your updated plan."
  );
} else {
    setStatus("PENDING");
    setMessage(
      "UPI authorization is successful, but BookEasy has not yet confirmed plan activation. Please check again shortly."
    );
  }
}
    else if (
        data.authorizationStatus === "FAILURE" ||
        data.authorizationStatus === "FAILED"
      ) {
        setStatus("FAILED");
        setMessage(
          "Cashfree reports that subscription authorization failed. Please check the authorization process before trying again."
        );
      } else {
        setStatus("PENDING");
        setMessage(
          "Your subscription is not yet confirmed as authorized. You can check again shortly or return to your subscription page."
        );
      }
    } catch (error) {
      setStatus("ERROR");
      setMessage(
        error.message || "Could not verify the subscription. Please try again."
      );
    }
  }

  useEffect(() => {
    verifySubscription();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        color: "#0f172a",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 28,
          boxSizing: "border-box",
        }}
      >
        <h1>BookEasy Subscription</h1>

        <h2>
          {status === "VERIFYING"
            ? "Verifying status..."
            : status === "AUTHORIZED"
              ? "Authorization confirmed"
              : status === "FAILED"
                ? "Authorization failed"
                : status === "PENDING"
                  ? "Status pending"
                  : status === "LOGIN_REQUIRED"
                    ? "Login required"
                    : status === "NO_REFERENCE"
                      ? "Reference missing"
                      : "Verification issue"}
        </h2>

        <p style={{ lineHeight: 1.7 }}>{message}</p>

        {status === "VERIFYING" && <p>Please wait...</p>}

      
{(status === "ERROR" || status === "PENDING") && (
  <button
    type="button"
    onClick={verifySubscription}
    disabled={status === "VERIFYING"}
    style={{
      padding: "11px 16px",
      marginTop: 8,
      border: 0,
      borderRadius: 8,
      background: "#2563eb",
      color: "#fff",
      cursor: "pointer",
      opacity: status === "VERIFYING" ? 0.6 : 1,
    }}
  >
    {status === "VERIFYING" ? "Checking..." : "Check again"}
  </button>
)}

{status === "NO_REFERENCE" && (
  <p style={{ marginTop: 16, color: "#64748b", lineHeight: 1.6 }}>
    This page has no subscription reference to verify. Open your subscription
    plans and check your subscription status there. Return here after
    Cashfree redirects you with a subscription reference.
  </p>
)}


        <p style={{ marginTop: 24 }}>
          <Link to="/subscription">View subscription plans</Link>
        </p>

        <p>
          <Link to="/dashboard">Go to dashboard</Link>
        </p>
      </section>
    </main>
  );
}
