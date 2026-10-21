import React, { useCallback, useEffect, useState } from "react";
import "../styles/AdvancedAnalytics.css";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  Repeat2,
  TrendingUp,
  Users,
} from "lucide-react";

const API = (
  import.meta.env.VITE_API_URL ||
  "https://bookeasy-backend-ori1.onrender.com/api"
).replace(/\/$/, "");

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const number = (value) =>
  Number(value || 0).toLocaleString("en-IN");

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <Icon size={20} className="text-indigo-600" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {hint && <p className="mt-2 text-sm text-gray-500">{hint}</p>}
    </article>
  );
}

export default function AdvancedAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("bookeasy_token");

      if (!token) {
        window.location.href = "/business/login";
        return;
      }

      const response = await fetch(`${API}/bookings/advanced-analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("bookeasy_token");
        localStorage.removeItem("bookeasy_user");
        window.location.href = "/business/login";
        return;
      }

      if (!response.ok) {
        if (result.upgradeRequired) {
          throw new Error(
            "Advanced Analytics requires an active Business or Pro subscription. Please check your plan."
          );
        }
        throw new Error(result.message || "Unable to load analytics.");
      }

      setData(result);
    } catch (err) {
      setError(err.message || "Unable to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const overview = data?.overview;
  const trends = data?.monthlyTrends || [];
  const services = data?.popularServices || [];
  const maxBookings = Math.max(1, ...trends.map((item) => item.bookings));

  return (
    <main className="analytics-page">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-indigo-600">
              <Activity size={20} />
              <span className="text-sm font-semibold">BUSINESS INSIGHTS</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Advanced Analytics
            </h1>
            <p className="mt-2 text-gray-500">
              Six-month trends, customer retention and service performance.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading && !data && (
          <div className="rounded-2xl border bg-white p-10 text-center text-gray-600">
            Loading advanced analytics…
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to show analytics</p>
                <p className="mt-1 text-sm">{error}</p>
                <button
                  type="button"
                  onClick={loadAnalytics}
                  className="mt-3 font-semibold underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {data && overview && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                icon={CalendarDays}
                label="Bookings"
                value={number(overview.totalBookings)}
                hint="Last six months"
              />
              <Metric
                icon={CheckCircle2}
                label="Completion rate"
                value={`${overview.completionRate}%`}
                hint={`${number(overview.completedBookings)} completed bookings`}
              />
              <Metric
                icon={Repeat2}
                label="Repeat customer rate"
                value={`${overview.repeatCustomerRate}%`}
                hint={`${number(overview.repeatCustomers)} repeat customers`}
              />
              <Metric
                icon={Users}
                label="Unique customers"
                value={number(overview.uniqueCustomers)}
                hint="Identified by customer phone"
              />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-600" />
                  <h2 className="text-lg font-bold text-gray-900">
                    Monthly booking trends
                  </h2>
                </div>

                {trends.length === 0 ? (
                  <p className="text-gray-500">No booking trends available yet.</p>
                ) : (
                  <div className="space-y-4">
                    {trends.map((item) => (
                      <div key={item.month}>
                        <div className="mb-1 flex justify-between gap-3 text-sm">
                          <span className="font-medium text-gray-700">
                            {new Date(`${item.month}-02T12:00:00`).toLocaleDateString(
                              "en-IN",
                              { month: "short", year: "numeric" }
                            )}
                          </span>
                          <span className="text-gray-600">
                            {number(item.bookings)} total
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{
                              width: `${(item.bookings / maxBookings) * 100}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {number(item.completed)} completed · {number(item.cancelled)} cancelled
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <BarChart3 size={20} className="text-indigo-600" />
                  <h2 className="text-lg font-bold text-gray-900">
                    Booking status
                  </h2>
                </div>

                {[
                  ["Completed", overview.completedBookings, "bg-emerald-500"],
                  ["Confirmed", overview.confirmedBookings, "bg-blue-500"],
                  ["Pending", overview.pendingBookings, "bg-amber-500"],
                  ["Cancelled", overview.cancelledBookings, "bg-red-500"],
                  ["No-show", overview.noShowBookings, "bg-gray-500"],
                ].map(([label, value, color]) => (
                  <div key={label} className="mb-4">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-semibold text-gray-900">
                        {number(value)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{
                          width: `${
                            overview.totalBookings
                              ? (Number(value) / overview.totalBookings) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}

                <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
                  <div>
                    <p className="text-sm text-gray-500">No-show rate</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {overview.noShowRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Repeat customers</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {number(overview.repeatCustomers)}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                Top services
              </h2>

              {services.length === 0 ? (
                <p className="text-gray-500">No service booking data in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-gray-500">
                        <th className="py-3 pr-4 font-medium">Service</th>
                        <th className="py-3 pr-4 font-medium">Bookings</th>
                        <th className="py-3 font-medium">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service) => (
                        <tr key={service.serviceId} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium text-gray-900">
                            {service.name}
                          </td>
                          <td className="py-3 pr-4">{number(service.bookings)}</td>
                          <td className="py-3">{number(service.completed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-amber-900">
                Estimated completed-service value:{" "}
                {money(overview.estimatedCompletedRevenue)}
              </h2>
              <p className="mt-2 text-sm text-amber-800">
                {data.revenueNote} This is an estimate based on current service prices,
                not verified payment or accounting revenue.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
