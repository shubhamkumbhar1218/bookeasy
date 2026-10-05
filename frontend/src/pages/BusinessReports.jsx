import React, { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  XCircle,
  IndianRupee,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const BusinessReports = ({ user }) => {
  const navigate = useNavigate();

  const today = new Date();

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const [view, setView] = useState("running");

  const [report, setReport] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==================================================
  // LOAD REPORT
  // ==================================================

  const loadReport = async (
    selectedYear = year,
    selectedMonth = month
  ) => {
    if (!user?.id) {
      setError(
        "Business information not found. Please login again."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("bookeasy_token");

      const response = await fetch(
        `${API}/bookings/stats/${user.id}?year=${selectedYear}&month=${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load business report."
        );
      }

      setReport(data);

      // Automatically determine whether this is
      // the current month or a past month.
      if (
        Number(selectedYear) === currentYear &&
        Number(selectedMonth) === currentMonth
      ) {
        setView("running");
      } else {
        setView("past");
      }
    } catch (error) {
      console.error(
        "Business reports error:",
        error
      );

      setError(
        error.message ||
          "Unable to load business report."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadReport(currentYear, currentMonth);
  }, [user?.id]);

  // ==================================================
  // YEAR CHANGE
  // ==================================================

  const handleYearChange = (value) => {
    const selectedYear = Number(value);

    setYear(selectedYear);

    loadReport(
      selectedYear,
      month
    );
  };

  // ==================================================
  // MONTH CHANGE
  // ==================================================

  const handleMonthChange = (value) => {
    const selectedMonth = Number(value);

    setMonth(selectedMonth);

    loadReport(
      year,
      selectedMonth
    );
  };

  // ==================================================
  // RUNNING PERIOD
  // ==================================================

  const showRunning = () => {
    setYear(currentYear);
    setMonth(currentMonth);
    setView("running");

    loadReport(
      currentYear,
      currentMonth
    );
  };

  // ==================================================
  // PAST PERIOD
  // ==================================================

  const showPast = () => {
    let previousMonth =
      currentMonth - 1;

    let previousYear =
      currentYear;

    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear--;
    }

    setYear(previousYear);
    setMonth(previousMonth);
    setView("past");

    loadReport(
      previousYear,
      previousMonth
    );
  };

  // ==================================================
  // YEAR OPTIONS
  // ==================================================

  const years = [];

for (
  let y = currentYear;
  y >= 2026;
  y--
) {
  years.push(y);
}

  // ==================================================
  // MONTHS
  // ==================================================

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  // ==================================================
  // LOADING
  // ==================================================

  if (loading && !report) {
    return (
      <div className="reports-page">
        <div className="reports-loading">
          <RefreshCw
            size={24}
            className="spin"
          />

          <p>
            Loading reports...
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="reports-page">

      {/* ==========================================
          HEADER
      ========================================== */}

      <div className="reports-header">

        <button
          type="button"
          className="reports-back-button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <ArrowLeft size={18} />

          Dashboard
        </button>

        <div>
          <div className="reports-title-row">

            <BarChart3 size={28} />

            <h1>
              Reports & Analytics
            </h1>

          </div>

          <p>
            Track your business performance,
            bookings and revenue.
          </p>
        </div>

        <button
          type="button"
          className="reports-refresh-button"
          onClick={() =>
            loadReport(
              year,
              month
            )
          }
        >
          <RefreshCw
            size={17}
            className={
              loading ? "spin" : ""
            }
          />

          Refresh
        </button>

      </div>

      {/* ==========================================
          RUNNING / PAST
      ========================================== */}

      <div className="report-view-switch">

        <button
          type="button"
          className={
            view === "running"
              ? "active"
              : ""
          }
          onClick={showRunning}
        >
          <Clock3 size={17} />

          Running
        </button>

        <button
          type="button"
          className={
            view === "past"
              ? "active"
              : ""
          }
          onClick={showPast}
        >
          <CalendarDays size={17} />

          Past
        </button>

      </div>

      {/* ==========================================
          FILTERS
      ========================================== */}

      <div className="reports-filters">

        <div className="report-filter">

          <label>
            Year
          </label>

          <select
            value={year}
            onChange={(e) =>
              handleYearChange(
                e.target.value
              )
            }
          >
            {years.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

        </div>

        <div className="report-filter">

          <label>
            Month
          </label>

          <select
            value={month}
            onChange={(e) =>
              handleMonthChange(
                e.target.value
              )
            }
          >
            {months.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>

        </div>

      </div>

      {/* ==========================================
          ERROR
      ========================================== */}

      {error && (
        <div className="reports-error">
          {error}
        </div>
      )}

      {/* ==========================================
          REPORT
      ========================================== */}

      {report && (
        <>

          {/* PERIOD */}

          <div className="report-period">

            <div>
              <span>
                Selected Period
              </span>

              <h2>
                {report.period?.label ||
                  `${months.find(
                    (item) =>
                      item.value === month
                  )?.label} ${year}`}
              </h2>
            </div>

            <div
              className={
                view === "running"
                  ? "period-badge current"
                  : "period-badge past"
              }
            >
              {view === "running"
                ? "Current Running Period"
                : "Past Period"}
            </div>

          </div>

          {/* ======================================
              MAIN SUMMARY
          ====================================== */}

          <div className="report-summary-grid">

            <div className="report-main-card revenue-card">

              <div className="report-card-icon">
                <IndianRupee size={22} />
              </div>

              <div>

                <span>
                  Period Revenue
                </span>

                <strong>
                  ₹
                  {Number(
                    report.periodRevenue || 0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

                <small>
                  Completed appointments
                </small>

              </div>

            </div>

            <div className="report-main-card">

              <div className="report-card-icon">
                <CalendarDays size={22} />
              </div>

              <div>

                <span>
                  Period Bookings
                </span>

                <strong>
                  {report.periodBookings || 0}
                </strong>

                <small>
                  Total appointments
                </small>

              </div>

            </div>

          </div>

          {/* ======================================
              STATUS
          ====================================== */}

          <section className="report-section">

            <div className="report-section-header">

              <div>

                <h2>
                  Booking Status
                </h2>

                <p>
                  Appointment status for{" "}
                  {report.period?.label ||
                    `${year}-${month}`}.
                </p>

              </div>

            </div>

            <div className="status-report-grid">

              <div className="status-report-card pending">

                <Clock3 size={22} />

                <span>
                  Pending
                </span>

                <strong>
                  {report.pendingBookings || 0}
                </strong>

              </div>

              <div className="status-report-card confirmed">

                <CheckCircle2 size={22} />

                <span>
                  Confirmed
                </span>

                <strong>
                  {report.confirmedBookings || 0}
                </strong>

              </div>

              <div className="status-report-card completed">

                <CheckCircle2 size={22} />

                <span>
                  Completed
                </span>

                <strong>
                  {report.completedBookings || 0}
                </strong>

              </div>

              <div className="status-report-card cancelled">

                <XCircle size={22} />

                <span>
                  Cancelled
                </span>

                <strong>
                  {report.cancelledBookings || 0}
                </strong>

              </div>

            </div>

          </section>

          {/* ======================================
              BUSINESS OVERVIEW
          ====================================== */}

          <section className="report-section">

            <div className="report-section-header">

              <div>

                <h2>
                  Business Overview
                </h2>

                <p>
                  Compare this period with
                  your overall business performance.
                </p>

              </div>

            </div>

            <div className="overview-report-grid">

              <div className="overview-item">

                <span>
                  Today's Bookings
                </span>

                <strong>
                  {report.todayBookings || 0}
                </strong>

              </div>

              <div className="overview-item">

                <span>
                  Today's Revenue
                </span>

                <strong>
                  ₹
                  {Number(
                    report.todayRevenue || 0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              <div className="overview-item">

                <span>
                  Current Month Bookings
                </span>

                <strong>
                  {report.monthlyBookings || 0}
                </strong>

              </div>

              <div className="overview-item">

                <span>
                  Current Month Revenue
                </span>

                <strong>
                  ₹
                  {Number(
                    report.monthlyRevenue || 0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              <div className="overview-item">

                <span>
                  Lifetime Bookings
                </span>

                <strong>
                  {report.totalBookings || 0}
                </strong>

              </div>

              <div className="overview-item">

                <span>
                  Lifetime Revenue
                </span>

                <strong>
                  ₹
                  {Number(
                    report.totalRevenue || 0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

            </div>

          </section>

        </>
      )}

    </div>
  );
};

export default BusinessReports;