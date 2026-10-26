import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";

const API = (
  import.meta.env.VITE_API_URL ||
  "https://bookeasy-backend-ori1.onrender.com/api"
).replace(/\/+$/, "");

const SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
  "PAST_DUE",
];

const BUSINESS_CATEGORIES = [
  "salon",
  "barber",
  "tutor",
  "gym",
  "repair shop",
  "hospital",
  "dental clinic",
  "doctor / clinic",
  "physiotherapy",
  "spa & wellness",
  "yoga & meditation",
  "pet clinic / veterinary",
  "car & bike service",
  "photography studio",
  "coaching classes",
  "makeup artist",
  "tailor",
  "plumber",
  "electrician",
  "computer repair",
  "consultant",
  "driving school",
  "diagnostic lab",
  "nutritionist / dietitian",
  "laundry & dry cleaning",
  "other",
];
const PLANS = ["FREE", "STARTER"];
const PLAN_PRICES = {
  FREE: 0,
  STARTER: 299,
  monthly: 299,
  yearly: 2990,
};

function normalise(value) {
  return String(value ?? "").trim().toLowerCase();
}

function displayCategory(value) {
  if (!value || !String(value).trim()) return "Missing category";

  return String(value)
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message
    ? error.message
    : fallback;
}

function StatusBadge({ children, tone = "neutral" }) {
  return <span className={`be-badge be-badge--${tone}`}>{children}</span>;
}

function MetricCard({ icon: Icon, label, value, caption, tone = "blue" }) {
  return (
    <article className="be-metric">
      <div className={`be-metric__icon be-metric__icon--${tone}`}>
        <Icon size={19} />
      </div>
      <div className="be-metric__body">
        <span className="be-muted be-metric__label">{label}</span>
        <strong className="be-metric__value">{value}</strong>
        {caption && <span className="be-muted be-metric__caption">{caption}</span>}
      </div>
    </article>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="be-empty">
      <Store size={28} />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="be-alert" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="be-icon-button"
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default function AdminPanel({ user, logout }) {
  const [overview, setOverview] = useState(null);
  const [owners, setOwners] = useState([]);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerCategory, setOwnerCategory] = useState("all");
  const [ownerStatus, setOwnerStatus] = useState("all");
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [ownerError, setOwnerError] = useState("");
  const [ownerUpdatingId, setOwnerUpdatingId] = useState(null);

  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [subscriptionPlanFilter, setSubscriptionPlanFilter] = useState("all");
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] =
    useState("all");
  const [subscriptionPlanDrafts, setSubscriptionPlanDrafts] = useState({});
  const [subscriptionStatusDrafts, setSubscriptionStatusDrafts] = useState({});
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [subscriptionUpdatingId, setSubscriptionUpdatingId] = useState(null);
  const [subscriptionNotice, setSubscriptionNotice] = useState("");

  const [activeTab, setActiveTab] = useState("businesses");
  const [refreshing, setRefreshing] = useState(false);

  const [businessBookingStats, setBusinessBookingStats] = useState([]);
const [totalBookings, setTotalBookings] = useState(0);
const [bookingStatsLoading, setBookingStatsLoading] = useState(false);
const [bookingStatsError, setBookingStatsError] = useState("");

const [revenueStats, setRevenueStats] = useState({
  totalRevenue: 0,
  successfulPayments: 0,
  monthlyRevenue: 0,
  yearlyRevenue: 0,
});
const [revenueLoading, setRevenueLoading] = useState(false);
const [revenueError, setRevenueError] = useState("");

  const isAdmin = user?.role === "ADMIN";

  const ownersRequestId = useRef(0);
const subscriptionsRequestId = useRef(0);

  const adminApi = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem("bookeasy_token");

    if (!token) {
      localStorage.removeItem("bookeasy_user");
      window.location.assign("/business/login");
      throw new Error("Your session has expired. Please log in again.");
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem("bookeasy_token");
      localStorage.removeItem("bookeasy_user");
      window.location.assign("/business/login");
      throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message || `Request failed with status ${response.status}.`
      );
    }

    return data;
  }, []);

  const loadOwners = useCallback(async () => {
    const requestId = ++ownersRequestId.current;
    setOwnerLoading(true);
    setOwnerError("");

    try {
      const params = new URLSearchParams();

      if (ownerSearch.trim()) {
        params.set("search", ownerSearch.trim());
      }

      const query = params.toString();
      const [overviewData, ownersData] = await Promise.all([
        adminApi("/admin/overview"),
        adminApi(`/admin/owners${query ? `?${query}` : ""}`),
      ]);

      if (requestId !== ownersRequestId.current) return;

      setOverview(overviewData.overview ?? overviewData);
      setOwners(
        Array.isArray(ownersData.owners)
          ? ownersData.owners
          : Array.isArray(ownersData.businesses)
            ? ownersData.businesses
            : []
      );
    } catch (error) {
      if (requestId !== ownersRequestId.current) return;
      setOwnerError(getErrorMessage(error, "Unable to load businesses."));
    } finally {
      if (requestId === ownersRequestId.current) {
  setOwnerLoading(false);
}
    }
  }, [adminApi, ownerSearch]);

  const loadSubscriptions = useCallback(async () => {
    setSubscriptionLoading(true);
    setSubscriptionError("");

    try {
      const params = new URLSearchParams();

      if (subscriptionSearch.trim()) {
        params.set("search", subscriptionSearch.trim());
      }
      if (subscriptionPlanFilter !== "all") {
        params.set("plan", subscriptionPlanFilter);
      }
      if (subscriptionStatusFilter !== "all") {
        params.set("status", subscriptionStatusFilter);
      }

      const query = params.toString();
      const data = await adminApi(
        `/admin/subscriptions${query ? `?${query}` : ""}`
      );

      const list = Array.isArray(data.businesses) ? data.businesses : [];
      setSubscriptions(list);

      // Reconcile drafts with the latest server values. Preserve a draft
      // only while it differs from the corresponding server value.
      setSubscriptionPlanDrafts((previous) => {
        const next = {};

        for (const item of list) {
          const id = String(item._id);
          const serverPlan = String(item.plan || "FREE").toUpperCase();
          next[id] =
            previous[id] && previous[id] !== serverPlan
              ? previous[id]
              : serverPlan;
        }

        return next;
      });

      setSubscriptionStatusDrafts((previous) => {
        const next = {};

        for (const item of list) {
          const id = String(item._id);
          const serverStatus = String(
            item.subscriptionStatus || "ACTIVE"
          ).toUpperCase();

          next[id] =
            previous[id] && previous[id] !== serverStatus
              ? previous[id]
              : serverStatus;
        }

        return next;
      });
    } catch (error) {
      setSubscriptionError(
        getErrorMessage(error, "Unable to load subscriptions.")
      );
    } finally {
      setSubscriptionLoading(false);
    }
  }, [
    adminApi,
    subscriptionSearch,
    subscriptionPlanFilter,
    subscriptionStatusFilter,
  ]);

  
const loadBookingStats = useCallback(async () => {
  setBookingStatsLoading(true);
  setBookingStatsError("");

  try {
    const data = await adminApi(
      "/admin/business-booking-stats?period=allTime"
    );

    setTotalBookings(Number(data.totalBookings) || 0);
    setBusinessBookingStats(
      Array.isArray(data.businesses) ? data.businesses : []
    );
  } catch (error) {
    setBookingStatsError(
      error instanceof Error
        ? error.message
        : "Unable to load booking statistics."
    );
  } finally {
    setBookingStatsLoading(false);
  }
}, [adminApi]);

const loadRevenueStats = useCallback(async () => {
  setRevenueLoading(true);
  setRevenueError("");

  try {
    const data = await adminApi("/admin/revenue");

    setRevenueStats({
      totalRevenue: Number(data.totalRevenue) || 0,
      successfulPayments: Number(data.successfulPayments) || 0,
      monthlyRevenue: Number(data.monthlyRevenue) || 0,
      yearlyRevenue: Number(data.yearlyRevenue) || 0,
    });
  } catch (error) {
    setRevenueError(
      getErrorMessage(error, "Unable to load revenue statistics.")
    );
  } finally {
    setRevenueLoading(false);
  }
}, [adminApi]);


useEffect(() => {
  if (!isAdmin) return;

  loadOwners();
  loadBookingStats();
  loadRevenueStats();
}, [isAdmin, loadOwners, loadBookingStats, loadRevenueStats]);

  useEffect(() => {
    if (isAdmin) loadSubscriptions();
  }, [isAdmin, loadSubscriptions]);

const refreshAll = async () => {
  setRefreshing(true);

  try {
    await Promise.all([
      loadOwners(),
      loadSubscriptions(),
      loadBookingStats(),
      loadRevenueStats(),
    ]);
  } finally {
    setRefreshing(false);
  }
};

  const toggleOwner = async (owner) => {
    const id = String(owner._id);
    const nextActive = owner.isActive === false;

    const confirmed = window.confirm(
      `${nextActive ? "Activate" : "Suspend"} ${
        owner.businessName || owner.name || "this business"
      }?`
    );

    if (!confirmed || ownerUpdatingId) return;

    setOwnerUpdatingId(id);
    setOwnerError("");

    try {
      await adminApi(`/admin/owners/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextActive }),
      });

      setOwners((previous) =>
        previous.map((item) =>
          String(item._id) === id ? { ...item, isActive: nextActive } : item
        )
      );

      await loadOwners();
    } catch (error) {
      setOwnerError(getErrorMessage(error, "Unable to update account status."));
    } finally {
      setOwnerUpdatingId(null);
    }
  };

  const updateSubscription = async (business) => {
    const id = String(business._id);
    const plan = subscriptionPlanDrafts[id];
    const subscriptionStatus = subscriptionStatusDrafts[id];

    const currentPlan = String(business.plan || "FREE").toUpperCase();
    const currentStatus = String(
      business.subscriptionStatus || "ACTIVE"
    ).toUpperCase();

    if (
      !PLANS.includes(plan) ||
      !SUBSCRIPTION_STATUSES.includes(subscriptionStatus)
    ) {
      setSubscriptionError("Select a valid plan and subscription status.");
      return;
    }

    if (plan === currentPlan && subscriptionStatus === currentStatus) return;

    const confirmed = window.confirm(
      [
        `Apply manual subscription changes for ${
          business.businessName || business.name || business.email || "this business"
        }?`,
        "",
        `Plan: ${currentPlan} → ${plan}`,
        `Status: ${currentStatus} → ${subscriptionStatus}`,
        "",
        "This admin action does not process a payment through Cashfree.",
        "Continue only if this change is authorised.",
      ].join("\n")
    );

    if (!confirmed || subscriptionUpdatingId) return;

    setSubscriptionUpdatingId(id);
    setSubscriptionError("");
    setSubscriptionNotice("");

    try {
      await adminApi(`/admin/subscriptions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ plan, subscriptionStatus }),
      });

      setSubscriptionNotice("Subscription settings updated successfully.");
      await loadSubscriptions();
      await loadOwners();
    } catch (error) {
      setSubscriptionError(
        getErrorMessage(error, "Unable to update subscription.")
      );
    } finally {
      setSubscriptionUpdatingId(null);
    }
  };

  const filteredOwners = useMemo(() => {
    return owners.filter((owner) => {
      const category = normalise(owner.businessType || "other");
      const status = owner.isActive === false ? "suspended" : "active";

      const matchesCategory =
        ownerCategory === "all" ||
        (ownerCategory === "missing"
          ? !owner.businessType || !String(owner.businessType).trim()
          : ownerCategory === "other"
            ? category === "other"
            : category === ownerCategory);

      const matchesStatus =
        ownerStatus === "all" || status === ownerStatus;

      return matchesCategory && matchesStatus;
    });
  }, [owners, ownerCategory, ownerStatus]);


const categoryOptions = useMemo(() => {
  const present = new Set(
    owners
      .map((owner) => normalise(owner.businessType))
      .filter(Boolean)
  );

  // Include known categories and any category returned by the server.
  return [...new Set([
    ...BUSINESS_CATEGORIES,
    ...present,
  ])]
    .filter((category) => present.has(normalise(category)))
    .sort((a, b) => a.localeCompare(b));
}, [owners]);


  const ownerStats = useMemo(() => {
    const allOwners = Array.isArray(overview?.owners)
      ? overview.owners
      : owners;

    const total =
      overview?.totalOwners ?? overview?.totalBusinesses ?? allOwners.length;

    const active =
      overview?.activeOwners ??
      allOwners.filter((item) => item.isActive !== false).length;

    const suspended =
      overview?.suspendedOwners ??
      allOwners.filter((item) => item.isActive === false).length;

    return { total, active, suspended };
  }, [overview, owners]);

  const subscriptionPlanCounts = useMemo(() => {
    const counts = { FREE: 0, STARTER: 0, BUSINESS: 0, PRO: 0 };

    for (const item of subscriptions) {
      const plan = String(item.plan || "FREE").toUpperCase();
      if (Object.prototype.hasOwnProperty.call(counts, plan)) {
        counts[plan] += 1;
      }
    }

    return counts;
  }, [subscriptions]);

  if (!isAdmin) {
    return (
      <main className="be-access">
        <div className="be-access__card">
          <ShieldCheck size={36} />
          <h1>Admin access required</h1>
          <p>This account does not have permission to access the admin panel.</p>
          <button
            className="be-button be-button--primary"
            onClick={() => (logout ? logout() : window.location.assign("/"))}
          >
            Return to safety
          </button>
        </div>
        <AdminStyles />
      </main>
    );
  }

  return (
    <div className="be-shell">
      <AdminStyles />

      <header className="be-topbar">
        <div className="be-brand">
          <div className="be-brand__mark">
            <Store size={21} />
          </div>
          <div>
            <strong>BookEasy</strong>
            <span>Administration</span>
          </div>
        </div>

        <div className="be-topbar__right">
          <div className="be-admin-identity">
            <div className="be-avatar">
              {(user?.name || user?.email || "A").trim().charAt(0).toUpperCase()}
            </div>
            <div className="be-admin-identity__text">
              <strong>{user?.name || "Administrator"}</strong>
              <span>Admin account</span>
            </div>
          </div>

          <button
            type="button"
            className="be-button be-button--secondary"
            onClick={refreshAll}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "be-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="be-button be-button--secondary"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="be-main">
        <section className="be-page-heading">
          <div>
            <div className="be-eyebrow">WORKSPACE / ADMIN</div>
            <h1>Admin dashboard</h1>
            <p>Manage business accounts and subscription settings in one place.</p>
          </div>
          <div className="be-secure-label">
            <ShieldCheck size={16} />
            Protected admin area
          </div>
        </section>

        <section className="be-metrics-grid">
          <MetricCard
            icon={Building2}
            label="Registered businesses"
            value={ownerStats.total}
            caption="Total registered accounts"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Active accounts"
            value={ownerStats.active}
            caption="Accounts not suspended"
            tone="green"
          />
          <MetricCard
            icon={ShieldCheck}
            label="Suspended accounts"
            value={ownerStats.suspended}
            caption="Accounts currently disabled"
            tone="orange"
          />
          <MetricCard
            icon={CreditCard}
            label="Businesses in subscription view"
            value={subscriptions.length}
            caption="Matches current subscription filters"
            tone="purple"
          />

          
<MetricCard
  icon={CreditCard}
  label="Total BookEasy Revenue"
  value={
    revenueLoading
      ? "Loading..."
      : `₹${revenueStats.totalRevenue.toLocaleString("en-IN")}`
  }
  caption={
    revenueError
      ? "Revenue unavailable"
      : `${revenueStats.successfulPayments} successful payments`
  }
  tone="purple"
/>

<MetricCard
  icon={CheckCircle2}
  label="Total Business Bookings"
  value={
    bookingStatsLoading
      ? "Loading..."
      : totalBookings.toLocaleString("en-IN")
  }
  caption={
    bookingStatsError
      ? "Booking statistics unavailable"
      : "All businesses · All time"
  }
  tone="green"
/>

        </section>

        
<section className="be-panel" style={{ marginBottom: 24 }}>
  <div className="be-section">
    <div className="be-section-heading">
      <div>
        <h2>Business Booking Statistics</h2>
        <p>All-time bookings for each registered business.</p>
      </div>
      <StatusBadge tone="blue">
        {businessBookingStats.length} businesses
      </StatusBadge>
    </div>

    {bookingStatsError && (
      <ErrorBanner message={bookingStatsError} />
    )}

    {bookingStatsLoading ? (
      <div className="be-table-loading">
        <span className="be-loader" />
        Loading booking statistics...
      </div>
    ) : (
      <div className="be-table-wrap">
        <table className="be-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Total</th>
              <th>Pending</th>
              <th>Confirmed</th>
              <th>Completed</th>
              <th>Cancelled</th>
            </tr>
          </thead>
          <tbody>
            {businessBookingStats.map((business) => (
              <tr key={business._id}>
                <td>
                  {business.businessName || "Unnamed Business"}
                </td>
                <td>{business.totalBookings}</td>
                <td>{business.pending}</td>
                <td>{business.confirmed}</td>
                <td>{business.completed}</td>
                <td>{business.cancelled}</td>
              </tr>
            ))}

            {businessBookingStats.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No booking data"
                    description="No business booking statistics are available."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>
</section>


        <section className="be-panel">
          <div className="be-tabs" role="tablist" aria-label="Admin sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "businesses"}
              className={`be-tab ${activeTab === "businesses" ? "is-active" : ""}`}
              onClick={() => setActiveTab("businesses")}
            >
              <Building2 size={17} />
              Businesses
              <span className="be-tab__count">{owners.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "subscriptions"}
              className={`be-tab ${activeTab === "subscriptions" ? "is-active" : ""}`}
              onClick={() => setActiveTab("subscriptions")}
            >
              <CreditCard size={17} />
              Subscriptions
              <span className="be-tab__count">{subscriptions.length}</span>
            </button>
          </div>

          {activeTab === "businesses" ? (
            <section className="be-section" aria-label="Business accounts">
              <div className="be-section-heading">
                <div>
                  <h2>Business accounts</h2>
                  <p>Search businesses, inspect categories and manage account access.</p>
                </div>
                <StatusBadge tone="blue">
                  {filteredOwners.length} shown
                </StatusBadge>
              </div>

              <ErrorBanner
                message={ownerError}
                onDismiss={() => setOwnerError("")}
              />

              <div className="be-toolbar">
                <label className="be-search">
                  <Search size={17} />
                  <input
                    value={ownerSearch}
                    onChange={(event) => setOwnerSearch(event.target.value)}
                    placeholder="Search business, owner or email..."
                    aria-label="Search businesses"
                  />
                  {ownerSearch && (
                    <button
                      type="button"
                      className="be-search__clear"
                      onClick={() => setOwnerSearch("")}
                      aria-label="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>

                <label className="be-select-wrap">
                  <Filter size={16} />
                  <select
                    value={ownerCategory}
                    onChange={(event) => setOwnerCategory(event.target.value)}
                    aria-label="Filter by category"
                  >
                    <option value="all">All categories</option>
                    <option value="missing">Missing category</option>
                    <option value="other">Other</option>
                    {categoryOptions
                      .filter((category) => category !== "other")
                      .map((category) => (
                        <option key={category} value={category}>
                          {displayCategory(category)}
                        </option>
                      ))}
                  </select>
                  <ChevronDown size={15} className="be-select-arrow" />
                </label>

                <label className="be-select-wrap">
                  <select
                    value={ownerStatus}
                    onChange={(event) => setOwnerStatus(event.target.value)}
                    aria-label="Filter by account status"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <ChevronDown size={15} className="be-select-arrow" />
                </label>

                <button
                  type="button"
                  className="be-button be-button--secondary"
                  onClick={() => {
                    setOwnerCategory("all");
                    setOwnerStatus("all");
                    setOwnerSearch("");
                  }}
                >
                  Clear filters
                </button>
              </div>

              <div className="be-category-note">
                <CircleHelp size={16} />
                Category filters use the values returned by the server. Accounts
                with a missing or <strong>other</strong> category are highlighted
                for review. This screen does not edit business categories.
              </div>

              <div className="be-table-wrap">
                <table className="be-table">
                  <thead>
                    <tr>
                      <th>Business / Owner</th>
                      <th>Contact</th>
                      <th>Category</th>
                      <th>Registered</th>
                      <th>Account status</th>
                      <th className="be-th-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerLoading ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="be-table-loading">
                            <span className="be-loader" />
                            Loading business accounts...
                          </div>
                        </td>
                      </tr>
                    ) : filteredOwners.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            title="No businesses found"
                            description="Try another search or clear your filters."
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredOwners.map((owner) => {
                        const id = String(owner._id);
                        const suspended = owner.isActive === false;
                        const category = normalise(owner.businessType);
                        const needsReview = !category || category === "other";
                        const updating = ownerUpdatingId === id;

                        return (
                          <tr key={id}>
                            <td>
                              <div className="be-business-cell">
                                <div className="be-business-avatar">
                                  {(owner.businessName || owner.name || "B")
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div className="be-business-info">
                                  <strong>
                                    {owner.businessName || owner.name || "Unnamed business"}
                                  </strong>
                                  <span>{owner.name || "Owner name unavailable"}</span>
                                  <small className="be-muted">
                                    ID: {id.slice(-8)}
                                  </small>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div className="be-contact-cell">
                                <span>{owner.email || "No email"}</span>
                                <span className="be-muted">
                                  {owner.phone || owner.mobile || "No phone"}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="be-category-cell">
                                <span>{displayCategory(owner.businessType)}</span>
                                {needsReview && (
                                  <StatusBadge tone="orange">
                                    Review
                                  </StatusBadge>
                                )}
                              </div>
                            </td>

                            <td>{formatDate(owner.createdAt)}</td>

                            <td>
                              <StatusBadge tone={suspended ? "red" : "green"}>
                                <span className="be-status-dot" />
                                {suspended ? "Suspended" : "Active"}
                              </StatusBadge>
                            </td>

                            <td className="be-th-action">
                              <button
                                type="button"
                                className={`be-button ${
                                  suspended
                                    ? "be-button--primary"
                                    : "be-button--danger"
                                } be-button--small`}
                                disabled={Boolean(ownerUpdatingId)}
                                onClick={() => toggleOwner(owner)}
                              >
                                {updating ? (
                                  <span className="be-loader be-loader--small" />
                                ) : suspended ? (
                                  <Check size={15} />
                                ) : (
                                  <ShieldCheck size={15} />
                                )}
                                {updating
                                  ? "Saving"
                                  : suspended
                                    ? "Activate"
                                    : "Suspend"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="be-section" aria-label="Subscription management">
              <div className="be-section-heading">
                <div>
                  <h2>Subscription management</h2>
                  <p>
                    Review current plans and statuses. Manual updates do not
                    process payments.
                  </p>
                </div>
                <StatusBadge tone="blue">
                  {subscriptions.length} matches
                </StatusBadge>
              </div>

              <ErrorBanner
                message={subscriptionError}
                onDismiss={() => setSubscriptionError("")}
              />

              {subscriptionNotice && (
                <div className="be-success" role="status">
                  <CheckCircle2 size={17} />
                  {subscriptionNotice}
                  <button
                    type="button"
                    className="be-icon-button"
                    onClick={() => setSubscriptionNotice("")}
                    aria-label="Dismiss success message"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}


<div className="be-plan-grid">
  <article className="be-plan-card">
    <span className="be-muted">FREE plan</span>
    <strong>
      ₹0
      <small>No subscription charge</small>
    </strong>
    <span className="be-plan-card__count">
      {subscriptionPlanCounts.FREE || 0} in current results
    </span>
  </article>

  <article className="be-plan-card be-plan-card--featured">
    <span className="be-muted">PREMIUM plan</span>
    <strong>
      ₹299
      <small>/month</small>
    </strong>
    <strong>
      ₹2,990
      <small>/year</small>
    </strong>
    <span className="be-plan-card__count">
      {subscriptionPlanCounts.STARTER || 0} in current results
    </span>
  </article>
</div>


              <div className="be-toolbar">
                <label className="be-search">
                  <Search size={17} />
                  <input
                    value={subscriptionSearch}
                    onChange={(event) => setSubscriptionSearch(event.target.value)}
                    placeholder="Search business or owner..."
                    aria-label="Search subscriptions"
                  />
                  {subscriptionSearch && (
                    <button
                      type="button"
                      className="be-search__clear"
                      onClick={() => setSubscriptionSearch("")}
                      aria-label="Clear subscription search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>

                <label className="be-select-wrap">
                  <select
                    value={subscriptionPlanFilter}
                    onChange={(event) => setSubscriptionPlanFilter(event.target.value)}
                    aria-label="Filter by plan"
                  >
                    <option value="all">All plans</option>
                    {PLANS.map((plan) => (
                      <option key={plan} value={plan}>{plan}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="be-select-arrow" />
                </label>

                <label className="be-select-wrap">
                  <select
                    value={subscriptionStatusFilter}
                    onChange={(event) => setSubscriptionStatusFilter(event.target.value)}
                    aria-label="Filter by subscription status"
                  >
                    <option value="all">All subscription statuses</option>
                    {SUBSCRIPTION_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="be-select-arrow" />
                </label>
              </div>

              <div className="be-category-note">
                <ShieldCheck size={16} />
                Save only authorised changes. The server remains responsible
                for validating the requested plan and subscription status.
              </div>

              <div className="be-table-wrap">
                <table className="be-table be-table--subscriptions">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Current plan</th>
                      <th>Plan change</th>
                      <th>Subscription status</th>
                      <th>End date</th>
                      <th>Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptionLoading ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="be-table-loading">
                            <span className="be-loader" />
                            Loading subscriptions...
                          </div>
                        </td>
                      </tr>
                    ) : subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            title="No subscriptions found"
                            description="Try another search or adjust the plan and status filters."
                          />
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((business) => {
                        const id = String(business._id);
                        const currentPlan = String(
                          business.plan || "FREE"
                        ).toUpperCase();
                        const currentStatus = String(
                          business.subscriptionStatus || "ACTIVE"
                        ).toUpperCase();
                        const draftPlan = subscriptionPlanDrafts[id] || currentPlan;
                        const draftStatus =
                          subscriptionStatusDrafts[id] || currentStatus;
                        const dirty =
                          draftPlan !== currentPlan ||
                          draftStatus !== currentStatus;
                        const updating = subscriptionUpdatingId === id;

                        return (
                          <tr key={id}>
                            <td>
                              <div className="be-business-info">
                                <strong>
                                  {business.businessName ||
                                    business.name ||
                                    "Unnamed business"}
                                </strong>
                                <span>{business.email || "No email"}</span>
                              </div>
                            </td>

                            <td>
                              <StatusBadge
                                tone={
                                  currentPlan === "BUSINESS"
                                    ? "blue"
                                    : currentPlan === "PRO"
                                      ? "purple"
                                      : "neutral"
                                }
                              >
                                {currentPlan}
                              </StatusBadge>
                            </td>

                            <td>
                              <select
                                className="be-inline-select"
                                value={draftPlan}
                                disabled={Boolean(subscriptionUpdatingId)}
                                onChange={(event) => {
                                  setSubscriptionPlanDrafts((previous) => ({
                                    ...previous,
                                    [id]: event.target.value,
                                  }));
                                  setSubscriptionNotice("");
                                }}
                                aria-label={`Change plan for ${business.businessName || business.name || id}`}
                              >
                                {PLANS.map((plan) => (
                                  <option key={plan} value={plan}>{plan}</option>
                                ))}
                              </select>
                            </td>

                            <td>
                              <select
                                className="be-inline-select"
                                value={draftStatus}
                                disabled={Boolean(subscriptionUpdatingId)}
                                onChange={(event) => {
                                  setSubscriptionStatusDrafts((previous) => ({
                                    ...previous,
                                    [id]: event.target.value,
                                  }));
                                  setSubscriptionNotice("");
                                }}
                                aria-label={`Change subscription status for ${business.businessName || business.name || id}`}
                              >
                                {SUBSCRIPTION_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              {dirty && (
                                <div className="be-unsaved">
                                  Unsaved changes
                                </div>
                              )}
                            </td>

                            <td>
                              {formatDate(
                                business.subscriptionEndDate ||
                                business.currentPeriodEnd ||
                                business.endDate
                              )}
                            </td>

                            <td>
                              <button
                                type="button"
                                className="be-button be-button--primary be-button--small"
                                disabled={!dirty || Boolean(subscriptionUpdatingId)}
                                onClick={() => updateSubscription(business)}
                              >
                                {updating ? (
                                  <span className="be-loader be-loader--small be-loader--white" />
                                ) : (
                                  <Check size={15} />
                                )}
                                {updating ? "Saving" : "Save"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="be-footnote">
                <Activity size={16} />
                <span>
                  Plan counts reflect the current filtered results. If your
                  subscription API paginates results, these counts are for the
                  returned page rather than every business in the database.
                </span>
              </div>
            </section>
          )}
        </section>

        <footer className="be-footer">
          <span>BookEasy Administration</span>
          <span>Business accounts · Subscriptions · Access control</span>
        </footer>
      </main>
    </div>
  );
}

function AdminStyles() {
  return (
    <style>{`
      .be-shell, .be-access {
        --be-blue: #2563eb;
        --be-blue-dark: #1d4ed8;
        --be-blue-light: #eff6ff;
        --be-text: #172033;
        --be-muted: #64748b;
        --be-border: #e5eaf2;
        --be-surface: #ffffff;
        --be-page: #f5f7fb;
        color: var(--be-text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        min-height: 100vh;
        background: var(--be-page);
      }
      .be-shell *, .be-access * { box-sizing: border-box; }
      .be-topbar {
        height: 76px; padding: 0 5vw; background: #fff;
        border-bottom: 1px solid var(--be-border); display: flex;
        justify-content: space-between; align-items: center; gap: 20px;
      }
      .be-brand, .be-topbar__right, .be-admin-identity, .be-button,
      .be-secure-label, .be-tabs, .be-tab, .be-search, .be-select-wrap,
      .be-category-note, .be-success, .be-alert {
        display: flex; align-items: center;
      }
      .be-brand { gap: 12px; }
      .be-brand__mark {
        width: 42px; height: 42px; display: grid; place-items: center;
        border-radius: 13px; color: #fff;
        background: linear-gradient(145deg, #3b82f6, #1d4ed8);
        box-shadow: 0 5px 12px #2563eb25;
      }
      .be-brand strong, .be-brand span, .be-admin-identity strong,
      .be-admin-identity span { display: block; }
      .be-brand strong { font-size: 17px; letter-spacing: -.4px; }
      .be-brand span, .be-admin-identity span { color: var(--be-muted); font-size: 12px; margin-top: 3px; }
      .be-topbar__right { gap: 12px; }
      .be-admin-identity { gap: 10px; padding-right: 12px; }
      .be-avatar, .be-business-avatar {
        display: grid; place-items: center; flex-shrink: 0; font-weight: 700;
        color: #1d4ed8; background: #dbeafe;
      }
      .be-avatar { width: 38px; height: 38px; border-radius: 50%; }
      .be-main { width: min(1480px, 92%); margin: 0 auto; padding: 36px 0 24px; }
      .be-page-heading { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 26px; }
      .be-eyebrow { font-size: 11px; font-weight: 800; color: #2563eb; letter-spacing: 1.5px; margin-bottom: 9px; }
      .be-page-heading h1 { font-size: clamp(26px, 3vw, 34px); line-height: 1.15; letter-spacing: -1px; margin: 0; }
      .be-page-heading p { color: var(--be-muted); margin: 9px 0 0; font-size: 14px; }
      .be-secure-label { gap: 8px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; padding: 10px 13px; border-radius: 999px; font-size: 12px; font-weight: 650; white-space: nowrap; }
      .be-metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
      .be-metric { display: flex; align-items: flex-start; gap: 13px; padding: 21px; border: 1px solid var(--be-border); background: white; border-radius: 15px; box-shadow: 0 2px 6px #0f172a05; min-width: 0; }
      .be-metric__icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
      .be-metric__icon--blue { background: #eff6ff; color: #2563eb; }
      .be-metric__icon--green { background: #ecfdf5; color: #059669; }
      .be-metric__icon--orange { background: #fff7ed; color: #ea580c; }
      .be-metric__icon--purple { background: #f5f3ff; color: #7c3aed; }
      .be-metric__body { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
      .be-muted { color: var(--be-muted); }
      .be-metric__label { font-size: 12px; line-height: 1.4; }
      .be-metric__value { font-size: 28px; letter-spacing: -.8px; line-height: 1.1; overflow-wrap: anywhere; }
      .be-metric__caption { font-size: 11px; }
      .be-panel { background: white; border: 1px solid var(--be-border); border-radius: 17px; overflow: hidden; box-shadow: 0 3px 10px #0f172a05; }
      .be-tabs { gap: 5px; border-bottom: 1px solid var(--be-border); padding: 0 24px; }
      .be-tab { gap: 9px; position: relative; border: 0; background: transparent; color: #64748b; font-size: 13px; font-weight: 650; padding: 19px 14px; cursor: pointer; }
      .be-tab.is-active { color: #2563eb; }
      .be-tab.is-active::after { content: ""; height: 2px; position: absolute; bottom: -1px; left: 12px; right: 12px; background: #2563eb; border-radius: 2px; }
      .be-tab__count { font-size: 11px; padding: 3px 7px; border-radius: 6px; background: #f1f5f9; color: #475569; }
      .be-section { padding: 25px 24px 27px; }
      .be-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 21px; }
      .be-section-heading h2 { margin: 0; font-size: 18px; letter-spacing: -.4px; }
      .be-section-heading p { color: var(--be-muted); font-size: 12px; line-height: 1.5; margin: 6px 0 0; }
      .be-badge { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 9px; font-size: 11px; font-weight: 700; white-space: nowrap; }
      .be-badge--neutral { color: #475569; background: #f1f5f9; }
      .be-badge--blue { color: #1d4ed8; background: #eff6ff; }
      .be-badge--green { color: #047857; background: #ecfdf5; }
      .be-badge--orange { color: #b45309; background: #fff7ed; }
      .be-badge--red { color: #b91c1c; background: #fef2f2; }
      .be-badge--purple { color: #6d28d9; background: #f5f3ff; }
      .be-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .be-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
      .be-search { gap: 9px; padding: 0 12px; height: 42px; min-width: 240px; flex: 1 1 280px; border: 1px solid #dce3ed; border-radius: 9px; color: #94a3b8; background: #fff; }
      .be-search:focus-within { border-color: #60a5fa; box-shadow: 0 0 0 3px #dbeafe80; }
      .be-search input { width: 100%; min-width: 0; border: 0; outline: 0; color: #172033; background: transparent; font: inherit; font-size: 12px; }
      .be-search input::placeholder { color: #94a3b8; }
      .be-search__clear, .be-icon-button { display: grid; place-items: center; border: 0; background: transparent; color: #64748b; cursor: pointer; padding: 4px; }
      .be-select-wrap { position: relative; gap: 8px; height: 42px; padding: 0 11px; border: 1px solid #dce3ed; border-radius: 9px; background: white; color: #64748b; }
      .be-select-wrap select { appearance: none; border: 0; outline: 0; background: transparent; color: #334155; font: inherit; font-size: 12px; padding: 0 18px 0 0; max-width: 220px; cursor: pointer; }
      .be-select-arrow { position: absolute; right: 8px; pointer-events: none; }
      .be-button { justify-content: center; gap: 7px; min-height: 40px; padding: 0 13px; border-radius: 9px; border: 1px solid transparent; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s; }
      .be-button:disabled { opacity: .5; cursor: not-allowed; }
      .be-button--primary { color: white; background: #2563eb; border-color: #2563eb; }
      .be-button--primary:hover:not(:disabled) { background: #1d4ed8; }
      .be-button--secondary { color: #334155; background: white; border-color: #dce3ed; }
      .be-button--secondary:hover:not(:disabled) { background: #f8fafc; }
      .be-button--danger { color: #b91c1c; background: white; border-color: #fecaca; }
      .be-button--danger:hover:not(:disabled) { background: #fef2f2; }
      .be-button--small { min-height: 32px; padding: 0 10px; font-size: 11px; }
      .be-category-note { align-items: flex-start; gap: 9px; padding: 11px 12px; margin-bottom: 17px; background: #f8fafc; border: 1px solid #e8edf4; border-radius: 9px; color: #64748b; font-size: 11px; line-height: 1.55; }
      .be-category-note svg { flex-shrink: 0; color: #2563eb; margin-top: 1px; }
      .be-table-wrap { overflow-x: auto; border: 1px solid var(--be-border); border-radius: 11px; }
      .be-table { width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 12px; }
      .be-table th { background: #f8fafc; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .65px; font-weight: 750; padding: 13px 14px; white-space: nowrap; border-bottom: 1px solid var(--be-border); }
      .be-table td { padding: 14px; border-bottom: 1px solid #edf1f6; vertical-align: middle; color: #334155; }
      .be-table tbody tr:last-child td { border-bottom: 0; }
      .be-table tbody tr:hover td { background: #fbfdff; }
      .be-th-action { text-align: right; }
      .be-business-cell { display: flex; align-items: center; gap: 10px; min-width: 180px; }
      .be-business-avatar { width: 35px; height: 35px; border-radius: 10px; font-size: 12px; }
      .be-business-info, .be-contact-cell, .be-category-cell { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
      .be-business-info strong { color: #172033; font-size: 12px; font-weight: 700; max-width: 220px; overflow-wrap: anywhere; }
      .be-business-info span, .be-contact-cell span { color: #64748b; font-size: 11px; overflow-wrap: anywhere; }
      .be-business-info small { font-size: 10px; }
      .be-category-cell { gap: 7px; }
      .be-table-loading { min-height: 125px; display: flex; align-items: center; justify-content: center; gap: 11px; color: #64748b; }
      .be-loader { width: 18px; height: 18px; display: inline-block; border: 2px solid #dbeafe; border-top-color: #2563eb; border-radius: 50%; animation: be-rotate .7s linear infinite; flex-shrink: 0; }
      .be-loader--small { width: 13px; height: 13px; border-width: 2px; }
      .be-loader--white { border-color: #ffffff60; border-top-color: #fff; }
      .be-spin { animation: be-rotate .8s linear infinite; }
      @keyframes be-rotate { to { transform: rotate(360deg); } }
      .be-empty { min-height: 165px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; text-align: center; color: #94a3b8; padding: 24px; }
      .be-empty strong { color: #334155; font-size: 13px; }
      .be-empty span { font-size: 12px; }
      .be-alert, .be-success { gap: 10px; padding: 12px 13px; margin: 0 0 15px; border-radius: 9px; font-size: 12px; line-height: 1.5; }
      .be-alert { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; }
      .be-success { color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; }
      .be-alert > span, .be-success { flex: 1; }
      .be-alert .be-icon-button, .be-success .be-icon-button { margin-left: auto; }
      .be-plan-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 21px; }
      .be-plan-card { display: flex; flex-direction: column; gap: 9px; padding: 16px; border: 1px solid var(--be-border); border-radius: 12px; background: white; min-width: 0; }
      .be-plan-card--featured { border-color: #93c5fd; background: linear-gradient(160deg, #eff6ff, #fff 75%); }
      .be-plan-card > span:first-child { font-size: 11px; font-weight: 700; }
      .be-plan-card > strong { font-size: 23px; letter-spacing: -.5px; }
      .be-plan-card > strong small { display: block; margin-top: 3px; color: #64748b; font-size: 10px; font-weight: 500; letter-spacing: 0; }
      .be-plan-card__count { font-size: 11px; color: #64748b; }
      .be-inline-select { max-width: 150px; min-width: 105px; padding: 8px 9px; border: 1px solid #dce3ed; border-radius: 7px; color: #334155; background: white; font: inherit; font-size: 11px; }
      .be-inline-select:focus { outline: 2px solid #bfdbfe; border-color: #60a5fa; }
      .be-inline-select:disabled { background: #f8fafc; cursor: not-allowed; }
      .be-unsaved { color: #b45309; font-size: 10px; margin-top: 5px; }
      .be-footnote { display: flex; align-items: flex-start; gap: 9px; margin-top: 14px; color: #64748b; font-size: 11px; line-height: 1.6; }
      .be-footnote svg { color: #2563eb; flex-shrink: 0; margin-top: 1px; }
      .be-footer { display: flex; justify-content: space-between; gap: 16px; color: #94a3b8; font-size: 11px; padding: 23px 3px 0; }
      .be-access { display: grid; place-items: center; padding: 24px; }
      .be-access__card { max-width: 430px; width: 100%; padding: 35px; border: 1px solid var(--be-border); border-radius: 16px; background: white; text-align: center; box-shadow: 0 10px 40px #0f172a0a; }
      .be-access__card > svg { color: #2563eb; }
      .be-access__card h1 { font-size: 22px; }
      .be-access__card p { color: #64748b; font-size: 13px; line-height: 1.6; margin-bottom: 22px; }
      @media (max-width: 1100px) {
        .be-metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .be-plan-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .be-main { width: 94%; }
      }
      @media (max-width: 700px) {
        .be-topbar { height: auto; min-height: 70px; padding: 14px 4%; flex-wrap: wrap; }
        .be-topbar__right { gap: 7px; }
        .be-admin-identity { display: none; }
        .be-button { padding: 0 10px; }
        .be-main { width: 94%; padding-top: 25px; }
        .be-page-heading { align-items: flex-start; flex-direction: column; gap: 14px; }
        .be-metrics-grid { gap: 10px; }
        .be-metric { padding: 14px; gap: 10px; }
        .be-metric__icon { width: 35px; height: 35px; }
        .be-metric__value { font-size: 23px; }
        .be-section { padding: 19px 13px; }
        .be-tabs { padding: 0 9px; }
        .be-tab { padding: 16px 8px; font-size: 12px; gap: 6px; }
        .be-section-heading { align-items: flex-start; }
        .be-toolbar { align-items: stretch; }
        .be-search { flex-basis: 100%; }
        .be-select-wrap { flex: 1 1 135px; justify-content: space-between; }
        .be-select-wrap select { max-width: 100%; min-width: 0; }
        .be-table { min-width: 900px; }
        .be-table--subscriptions { min-width: 850px; }
        .be-plan-grid { gap: 8px; }
        .be-plan-card { padding: 12px; }
        .be-plan-card > strong { font-size: 19px; }
        .be-footer { flex-direction: column; gap: 6px; }
        .be-secure-label { font-size: 11px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .be-spin, .be-loader { animation: none; }
        .be-button { transition: none; }
      }
    `}</style>
  );
}


































