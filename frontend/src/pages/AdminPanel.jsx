
import React, { useCallback, useEffect, useState } from "react";
import {
  Users,
  Store,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Search,
  RefreshCw,
  LogOut,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function adminApi(path, options = {}) {
  const token = localStorage.getItem("bookeasy_token");

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("bookeasy_token");
    localStorage.removeItem("bookeasy_user");
    window.location.replace("/business/login");
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export default function AdminPanel({ user, logout }) {
  const [overview, setOverview] = useState({
    totalOwners: 0,
    activeOwners: 0,
    suspendedOwners: 0,
    categories: 0,
  });

  const [owners, setOwners] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [subscriptionPlanFilter, setSubscriptionPlanFilter] = useState("");
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState("");
  const [planDrafts, setPlanDrafts] = useState({});
  const [statusDrafts, setStatusDrafts] = useState({});
  const [updatingSubscriptionId, setUpdatingSubscriptionId] = useState("");
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionPlanCounts, setSubscriptionPlanCounts] = useState([]);

  const loadData = useCallback(async (searchText = search) => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (searchText.trim()) query.set("search", searchText.trim());

      const [stats, ownerData] = await Promise.all([
        adminApi("/admin/overview"),
        adminApi(`/admin/owners?${query.toString()}`),
      ]);

      setOverview(stats);
      setOwners(ownerData.owners || []);
    } catch (err) {
      setError(err.message || "Unable to load admin data");
    } finally {
      setLoading(false);
    }
  }, [search]);

  
  const loadSubscriptions = useCallback(async () => {
    try {
      setSubscriptionLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (subscriptionSearch.trim()) {
        query.set("search", subscriptionSearch.trim());
      }
      if (subscriptionPlanFilter) {
        query.set("plan", subscriptionPlanFilter);
      }
      if (subscriptionStatusFilter) {
        query.set("status", subscriptionStatusFilter);
      }

      const data = await adminApi(
        `/admin/subscriptions?${query.toString()}`
      );

      const businesses = data.businesses || [];
      setSubscriptionPlanCounts(data.plans || []);

      setSubscriptions(businesses);

      setPlanDrafts((previous) => {
        const next = { ...previous };
        businesses.forEach((business) => {
          if (next[business._id] === undefined) {
            next[business._id] = business.plan || "FREE";
          }
        });
        return next;
      });

      setStatusDrafts((previous) => {
        const next = { ...previous };
        businesses.forEach((business) => {
          if (next[business._id] === undefined) {
            next[business._id] =
              business.subscriptionStatus || "ACTIVE";
          }
        });
        return next;
      });
    } catch (err) {
      setError(err.message || "Unable to load subscriptions");
    } finally {
      setSubscriptionLoading(false);
    }
  }, [
    subscriptionSearch,
    subscriptionPlanFilter,
    subscriptionStatusFilter,
  ]);


  useEffect(() => {
  loadData("");
}, []);

useEffect(() => {
  loadSubscriptions();
}, [loadSubscriptions]);

  const toggleOwner = async (owner) => {
    const nextActive = owner.isActive === false;

    const confirmed = window.confirm(
      nextActive
        ? `Activate ${owner.businessName}?`
        : `Suspend ${owner.businessName}? The owner will lose access to protected APIs.`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(owner._id);
      setError("");
      setMessage("");

      await adminApi(`/admin/owners/${owner._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextActive }),
      });

      setMessage(
        nextActive
          ? "Business owner activated."
          : "Business owner suspended."
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to update account");
    } finally {
      setUpdatingId("");
    }
  };

  
  const updateSubscription = async (business) => {
    const plan = planDrafts[business._id] || business.plan || "FREE";
    const subscriptionStatus =
      plan === "FREE"
        ? "ACTIVE"
        : statusDrafts[business._id] || "ACTIVE";

    const confirmed = window.confirm(
      `Assign ${plan} to ${business.businessName || business.name}?\n\n` +
      "This is a manual admin assignment. It does not process a payment."
    );

    if (!confirmed) return;

    try {
      setUpdatingSubscriptionId(business._id);
      setError("");
      setMessage("");

      const result = await adminApi(
        `/admin/subscriptions/${business._id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ plan, subscriptionStatus }),
        }
      );

      setMessage(result.message || "Subscription updated successfully.");

      // Refresh the subscription list from the server.
      await loadSubscriptions();
    } catch (err) {
      setError(err.message || "Unable to update subscription");
    } finally {
      setUpdatingSubscriptionId("");
    }
  };


  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 20,
  };

  if (user?.role !== "ADMIN") {
    return (
      <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
        <h2>Access denied</h2>
        <p>This page is only available to administrators.</p>
        <button onClick={() => (window.location.href = "/")}>
          Return home
        </button>
      </main>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f5f9",
        color: "#111827",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          background: "#111827",
          color: "#fff",
          padding: "18px 5%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ShieldCheck size={28} />
          <div>
            <strong style={{ fontSize: 21 }}>BookEasy Admin</strong>
            <div style={{ color: "#cbd5e1", fontSize: 13 }}>
              Platform management
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span>{user?.name || "Administrator"}</span>
          <button
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid #64748b",
              borderRadius: 8,
              padding: "9px 12px",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 5%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 8px" }}>Business owners</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              Review and manage registered BookEasy businesses.
            </p>
          </div>

          <button
            onClick={() => loadData()}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ ...cardStyle, marginBottom: 16, color: "#b91c1c" }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ ...cardStyle, marginBottom: 16, color: "#166534" }}>
            {message}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            { label: "Total owners", value: overview.totalOwners, icon: Users },
            { label: "Active owners", value: overview.activeOwners, icon: CheckCircle2 },
            { label: "Suspended owners", value: overview.suspendedOwners, icon: Ban },
            { label: "Business categories", value: overview.categories, icon: Store },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#64748b",
                  fontSize: 14,
                }}
              >
                {label}
                <Icon size={20} />
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 14 }}>
                {value}
              </div>
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <h2 style={{ margin: 0 }}>Registered businesses</h2>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                loadData(search);
              }}
              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: "0 10px",
                }}
              >
                <Search size={17} color="#64748b" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search owners or businesses"
                  style={{
                    border: 0,
                    outline: 0,
                    padding: "11px 0",
                    minWidth: 220,
                    maxWidth: "100%",
                  }}
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                style={{
                  border: 0,
                  borderRadius: 8,
                  padding: "10px 16px",
                  background: "#2563eb",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  loadData("");
                }}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: "10px 12px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </form>
          </div>

          {loading ? (
            <p>Loading business owners...</p>
          ) : owners.length === 0 ? (
            <p style={{ color: "#64748b" }}>No business owners found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 850,
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {[
                      "Business",
                      "Owner",
                      "Email",
                      "Phone",
                      "Category",
                      "Registered",
                      "Status",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #e5e7eb",
                          fontSize: 13,
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => {
                    const active = owner.isActive !== false;

                    return (
                      <tr key={owner._id}>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          <strong>{owner.businessName}</strong>
                          <div style={{ color: "#64748b", fontSize: 12 }}>
                            {owner.businessSlug}
                          </div>
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          {owner.name}
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          {owner.email}
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          {owner.phone || "—"}
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          {owner.businessType || "other"}
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          {owner.createdAt
                            ? new Date(owner.createdAt).toLocaleDateString("en-IN")
                            : "—"}
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          <span
                            style={{
                              display: "inline-block",
                              borderRadius: 20,
                              padding: "5px 9px",
                              background: active ? "#dcfce7" : "#fee2e2",
                              color: active ? "#166534" : "#991b1b",
                              fontSize: 12,
                            }}
                          >
                            {active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                          <button
                            disabled={updatingId === owner._id}
                            onClick={() => toggleOwner(owner)}
                            style={{
                              border: "1px solid #d1d5db",
                              borderRadius: 7,
                              padding: "8px 10px",
                              background: "#fff",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {updatingId === owner._id
                              ? "Updating..."
                              : active
                                ? "Suspend"
                                : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 0 }}>
            Showing up to 500 matching business owners, newest registrations first.
          </p>
        </section>

        
  <section style={{ ...cardStyle, marginTop: 24 }}>
    <h2 style={{ marginTop: 0 }}>Subscription Management</h2>
    <p style={{ color: "#64748b", marginTop: -6 }}>
      Review plans and manually manage subscription access.
      Plan changes do not collect payments.
    </p>


    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}
    >
      {subscriptionPlanCounts.map((plan) => (
        <div
          key={plan.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 14,
            background: "#f8fafc",
          }}
        >
          <div style={{ color: "#64748b", fontSize: 13 }}>
            {plan.name}
          </div>

          <strong style={{ fontSize: 20 }}>
            {plan.price === 0 ? "₹0" : `₹${plan.price}/month`}
          </strong>

          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: 6,
            }}
          >
            {plan.count} business{plan.count === 1 ? "" : "es"}
          </div>
        </div>
      ))}
    </div>


    <form
      onSubmit={(event) => {
        event.preventDefault();
        loadSubscriptions();
      }}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 18,
      }}
    >
      <input
        value={subscriptionSearch}
        onChange={(event) => setSubscriptionSearch(event.target.value)}
        placeholder="Search business, owner, email..."
        style={{
          flex: "1 1 220px",
          minWidth: 0,
          padding: 11,
          border: "1px solid #d1d5db",
          borderRadius: 8,
        }}
      />

      <select
        value={subscriptionPlanFilter}
        onChange={(event) => setSubscriptionPlanFilter(event.target.value)}
        style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 8 }}
      >
        <option value="">All plans</option>
        <option value="FREE">Free</option>
        <option value="STARTER">Starter</option>
        <option value="BUSINESS">Business</option>
        <option value="PRO">Pro</option>
      </select>

      <select
        value={subscriptionStatusFilter}
        onChange={(event) => setSubscriptionStatusFilter(event.target.value)}
        style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 8 }}
      >
        <option value="">All subscription statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="EXPIRED">Expired</option>
        <option value="PAST_DUE">Past due</option>
      </select>

      <button
        type="submit"
        disabled={subscriptionLoading}
        style={{
          padding: "10px 15px",
          background: "#2563eb",
          color: "#fff",
          border: 0,
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Search
      </button>
    </form>

    {subscriptionLoading ? (
      <p>Loading subscriptions...</p>
    ) : subscriptions.length === 0 ? (
      <p style={{ color: "#64748b" }}>No matching subscriptions found.</p>
    ) : (
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1000,
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Business / Owner",
                "Email",
                "Current Plan",
                "Subscription Status",
                "Start Date",
                "Expiry Date",
                "Change Plan",
                "Action",
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding: 12,
                    borderBottom: "1px solid #e5e7eb",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((business) => {
              const selectedPlan =
                planDrafts[business._id] || business.plan || "FREE";
              const selectedStatus =
                statusDrafts[business._id] ||
                business.subscriptionStatus ||
                "ACTIVE";
              const isUpdating =
                updatingSubscriptionId === business._id;

              return (
                <tr key={business._id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                    <strong>{business.businessName || "Unnamed business"}</strong>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {business.name} · {business.businessSlug || ""}
                    </div>
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                    {business.email}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                    <strong>{business.plan || "FREE"}</strong>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {business.planDetails?.price === 0
                        ? "Free"
                        : `₹${business.planDetails?.price ?? "—"}/month`}
                    </div>
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                    {business.subscriptionStatus || "ACTIVE"}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                    {business.subscriptionStartDate
                      ? new Date(business.subscriptionStartDate).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                    {business.subscriptionEndDate
                      ? new Date(business.subscriptionEndDate).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                    <select
                      value={selectedPlan}
                      onChange={(event) => {
                        const nextPlan = event.target.value;
                        setPlanDrafts((previous) => ({
                          ...previous,
                          [business._id]: nextPlan,
                        }));
                        if (nextPlan === "FREE") {
                          setStatusDrafts((previous) => ({
                            ...previous,
                            [business._id]: "ACTIVE",
                          }));
                        }
                      }}
                      style={{
                        padding: 8,
                        border: "1px solid #d1d5db",
                        borderRadius: 7,
                      }}
                    >
                      <option value="FREE">Free</option>
                      <option value="STARTER">Starter</option>
                      <option value="BUSINESS">Business</option>
                      <option value="PRO">Pro</option>
                    </select>

                    {selectedPlan !== "FREE" && (
                      <select
                        value={selectedStatus}
                        onChange={(event) =>
                          setStatusDrafts((previous) => ({
                            ...previous,
                            [business._id]: event.target.value,
                          }))
                        }
                        style={{
                          display: "block",
                          marginTop: 6,
                          padding: 8,
                          border: "1px solid #d1d5db",
                          borderRadius: 7,
                        }}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="PAST_DUE">Past due</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                    <button
                      disabled={isUpdating}
                      onClick={() => updateSubscription(business)}
                      style={{
                        padding: "9px 11px",
                        border: 0,
                        borderRadius: 7,
                        background: "#2563eb",
                        color: "#fff",
                        cursor: isUpdating ? "wait" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isUpdating ? "Updating..." : "Save Plan"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 0 }}>
      Only businesses matching the selected filters are shown. The backend
      returns up to 500 records.
    </p>
  </section>

      </main>
    </div>
  );
}
