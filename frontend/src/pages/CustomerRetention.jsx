import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Users,
  Repeat2,
  UserRoundX,
  CalendarCheck,
  RefreshCw,
  Search,
  Clock3,
  Phone,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import "../styles/CustomerRetention.css";

const SEGMENTS = [
  { value: "all", label: "All customers" },
  { value: "new", label: "New customers" },
  { value: "repeat", label: "Repeat customers" },
  { value: "active", label: "Active customers" },
  { value: "upcoming", label: "Upcoming bookings" },
  { value: "inactive_30", label: "Inactive 30+ days" },
  { value: "inactive_60", label: "Inactive 60+ days" },
  { value: "inactive_90", label: "Inactive 90+ days" },
];

const formatDate = (date) => {
  if (!date) return "No completed visit";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "Unknown";

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const formatSegment = (segment) => ({
  new: "New",
  active: "Active",
  repeat: "Repeat",
  upcoming: "Upcoming",
  inactive_30: "Inactive 30+ days",
  inactive_60: "Inactive 60+ days",
  inactive_90: "Inactive 90+ days",
}[segment] || segment || "Unknown");

export default function CustomerRetention({ api }) {
  const [overview, setOverview] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [segment, setSegment] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [overviewData, customerData] = await Promise.all([
        api("/retention/overview"),
        api(`/retention/customers?segment=${encodeURIComponent(segment)}`),
      ]);

      setOverview(overviewData.overview || null);
      setCustomers(
        Array.isArray(customerData.customers)
          ? customerData.customers
          : []
      );
    } catch (err) {
      setError(err.message || "Unable to load customer retention.");
    } finally {
      setLoading(false);
    }
  }, [api, segment]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCustomers = customers.filter((customer) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      String(customer.customerName || "").toLowerCase().includes(query) ||
      String(customer.customerPhone || "").includes(query)
    );
  });

  const metrics = [
    {
      label: "Total customers",
      value: overview?.totalCustomers ?? "—",
      icon: Users,
      detail: "Unique customer phone numbers",
    },
    {
      label: "Repeat customers",
      value: overview?.repeatCustomers ?? "—",
      icon: Repeat2,
      detail: `${overview?.repeatCustomerRate ?? 0}% repeat rate`,
    },
    {
      label: "Inactive customers",
      value: overview?.inactiveCustomers ?? "—",
      icon: UserRoundX,
      detail: "Customers needing follow-up",
    },
    {
      label: "Upcoming customers",
      value: overview?.upcomingCustomers ?? "—",
      icon: CalendarCheck,
      detail: "Customers with future bookings",
    },
  ];

  return (
    <div className="retention-page">
      <header className="retention-header">
        <div>
          <button
            className="retention-back"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            type="button"
          >
            <ArrowLeft size={17} />
            Back to dashboard
          </button>

          <p className="retention-eyebrow">CUSTOMER RELATIONSHIPS</p>
          <h1>Customer Retention</h1>
          <p className="retention-subtitle">
            Understand repeat visits, identify inactive customers,
            and build stronger customer relationships.
          </p>
        </div>

        <button
          className="retention-refresh"
          type="button"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="retention-error" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Unable to load retention data</strong>
            <p>{error}</p>
            <button type="button" onClick={loadData}>
              Try again
            </button>
          </div>
        </div>
      )}

      <section className="retention-metrics">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="retention-metric" key={metric.label}>
              <div className="retention-metric-top">
                <span>{metric.label}</span>
                <div className="retention-metric-icon">
                  <Icon size={20} />
                </div>
              </div>

              <strong>
                {loading ? "…" : metric.value}
              </strong>

              <p>{metric.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="retention-insight">
        <div className="retention-insight-icon">
          <TrendingUp size={22} />
        </div>

        <div>
          <h2>Customer activity</h2>
          <p>
            {overview
              ? `${overview.completedVisits} completed visits recorded across your customer base. Review inactive customers and use appropriate follow-ups to encourage return visits.`
              : "Your customer activity insights will appear here when data is available."}
          </p>
        </div>
      </section>

      <section className="retention-customer-panel">
        <div className="retention-panel-heading">
          <div>
            <h2>Customer directory</h2>
            <p>Review booking history and identify customers who may need attention.</p>
          </div>

          <span className="retention-count">
            {filteredCustomers.length} customers
          </span>
        </div>

        <div className="retention-filters">
          <label className="retention-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search name or phone number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter customers"
            value={segment}
            onChange={(event) => setSegment(event.target.value)}
          >
            {SEGMENTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="retention-empty">
            <RefreshCw size={24} />
            <p>Loading customer information…</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="retention-empty">
            <Users size={28} />
            <h3>No customers found</h3>
            <p>Try a different filter or search term.</p>
          </div>
        ) : (
          <div className="retention-table-wrap">
            <table className="retention-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Visits</th>
                  <th>Last completed visit</th>
                  <th>Next booking</th>
                  <th>Segment</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.customerPhone}>
                    <td>
                      <div className="retention-customer-name">
                        <strong>
                          {customer.customerName || "Customer"}
                        </strong>
                        <span>
                          <Phone size={13} />
                          {customer.customerPhone}
                        </span>
                      </div>
                    </td>

                    <td>
                      <strong>{customer.completedVisits ?? 0}</strong>
                      <small className="retention-secondary">
                        {customer.totalBookings ?? 0} total bookings
                      </small>
                    </td>

                    <td>
                      <span className="retention-date">
                        <Clock3 size={14} />
                        {formatDate(customer.lastVisit)}
                      </span>
                      {customer.daysSinceVisit != null && (
                        <small className="retention-secondary">
                          {customer.daysSinceVisit} days ago
                        </small>
                      )}
                    </td>

                    <td>{formatDate(customer.nextBooking)}</td>

                    <td>
                      <span
                        className={`retention-segment retention-segment-${customer.segment}`}
                      >
                        {formatSegment(customer.segment)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="retention-privacy">
          Customer contact information is displayed for authorized business use.
          Contact customers only in accordance with their preferences and applicable
          privacy and messaging requirements.
        </p>
      </section>
    </div>
  );
}
