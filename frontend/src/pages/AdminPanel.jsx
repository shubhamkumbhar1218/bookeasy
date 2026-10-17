
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

  useEffect(() => {
    loadData("");
  }, []);

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
      </main>
    </div>
  );
}
