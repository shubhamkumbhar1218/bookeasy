import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import { router } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import API_URL from "../../api";

type Report = {
  period: {
    year: number;
    month: number | null;
    label: string;
    isCurrent: boolean;
  };

  periodBookings: number;
  periodRevenue: number;

  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;

  todayBookings: number;
  todayRevenue: number;

  monthlyBookings: number;
  monthlyRevenue: number;

  totalBookings: number;
  totalRevenue: number;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function BusinessReports() {
  const [report, setReport] =
    useState<Report | null>(null);

  const [year, setYear] = useState(
    new Date().getFullYear()
  );

  const [month, setMonth] = useState(
    new Date().getMonth() + 1
  );

  const [view, setView] =
    useState<"running" | "past">("running");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ======================================================
  // LOAD REPORT
  // ======================================================

  const loadReport = async (
    selectedYear: number,
    selectedMonth: number
  ) => {
    try {
      setLoading(true);
      setError("");

      const savedUser =
        await AsyncStorage.getItem(
          "bookeasy_user"
        );

      const savedToken =
        await AsyncStorage.getItem(
          "bookeasy_token"
        );

      const user = savedUser
        ? JSON.parse(savedUser)
        : null;

      console.log(
        "BOOKEASY USER:",
        user
      );

      console.log(
        "BOOKEASY TOKEN EXISTS:",
        !!savedToken
      );

      // Support both id and _id
      const businessId =
        user?.id || user?._id;

      if (!businessId) {
        throw new Error(
          "Business information not found. Please login again."
        );
      }

      if (!savedToken) {
        throw new Error(
          "Login session expired. Please login again."
        );
      }

      const url =
        `${API_URL}/bookings/stats/${businessId}` +
        `?year=${selectedYear}` +
        `&month=${selectedMonth}`;

      console.log(
        "REPORT API:",
        url
      );

      const response =
        await fetch(url, {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${savedToken}`,
            "Content-Type":
              "application/json",
          },
        });

      const data =
        await response.json();

      console.log(
        "REPORT STATUS:",
        response.status
      );

      console.log(
        "REPORT DATA:",
        data
      );

      // --------------------------------------------------
      // UNAUTHORIZED
      // --------------------------------------------------

      if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
          "bookeasy_role",
        ]);

        router.replace(
          "/business/login"
        );

        return;
      }

      // --------------------------------------------------
      // OTHER ERROR
      // --------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to load business report"
        );
      }

      // --------------------------------------------------
      // SAVE REPORT
      // --------------------------------------------------

      setReport(data);
    } catch (error: any) {
      console.log(
        "REPORT ERROR:",
        error
      );

      setError(
        error?.message ||
          "Unable to load business reports"
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    loadReport(
      new Date().getFullYear(),
      new Date().getMonth() + 1
    );
  }, []);

  // ======================================================
  // RUNNING
  // ======================================================

  const handleRunning = () => {
    const now = new Date();

    const currentYear =
      now.getFullYear();

    const currentMonth =
      now.getMonth() + 1;

    setView("running");
    setYear(currentYear);
    setMonth(currentMonth);

    loadReport(
      currentYear,
      currentMonth
    );
  };

  // ======================================================
  // PAST
  // ======================================================

  const handlePast = () => {
    const now = new Date();

    let previousMonth =
      now.getMonth();

    let previousYear =
      now.getFullYear();

    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear--;
    }

    setView("past");
    setYear(previousYear);
    setMonth(previousMonth);

    loadReport(
      previousYear,
      previousMonth
    );
  };

  // ======================================================
  // CHANGE YEAR
  // ======================================================

  const changeYear = (
    value: number
  ) => {
    setYear(value);

    loadReport(
      value,
      month
    );
  };

  // ======================================================
  // CHANGE MONTH
  // ======================================================

  const changeMonth = (
    value: number
  ) => {
    setMonth(value);

    loadReport(
      year,
      value
    );
  };

  // ======================================================
  // MONEY FORMAT
  // ======================================================

  const formatMoney = (
    amount: number
  ) => {
    return `₹${Number(
      amount || 0
    ).toLocaleString("en-IN")}`;
  };

  // ======================================================
  // YEARS
  // Minimum year = 2026
  // ======================================================

  const years: number[] = [];

  const currentYear =
    new Date().getFullYear();

  for (
    let y = currentYear;
    y >= 2026;
    y--
  ) {
    years.push(y);
  }

  // ======================================================
  // LOADING
  // ======================================================

  if (loading && !report) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading reports...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ← Dashboard
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Reports & Analytics
        </Text>

        <Text
          style={styles.subtitle}
        >
          Track your business
          performance
        </Text>
      </View>

      {/* ==================================================
          RUNNING / PAST
      ================================================== */}

      <View
        style={
          styles.switchContainer
        }
      >
        <TouchableOpacity
          style={[
            styles.switchButton,
            view === "running" &&
              styles.switchActive,
          ]}
          onPress={
            handleRunning
          }
        >
          <Text
            style={[
              styles.switchText,
              view === "running" &&
                styles.switchTextActive,
            ]}
          >
            Running
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.switchButton,
            view === "past" &&
              styles.switchActive,
          ]}
          onPress={handlePast}
        >
          <Text
            style={[
              styles.switchText,
              view === "past" &&
                styles.switchTextActive,
            ]}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* ==================================================
          FILTERS
      ================================================== */}

      <View
        style={styles.filterCard}
      >
        <Text
          style={styles.filterLabel}
        >
          Year
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
        >
          {years.map(
            (item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterOption,
                  year === item &&
                    styles.filterOptionActive,
                ]}
                onPress={() =>
                  changeYear(
                    item
                  )
                }
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    year === item &&
                      styles.filterOptionTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        <Text
          style={[
            styles.filterLabel,
            {
              marginTop: 18,
            },
          ]}
        >
          Month
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
        >
          {months.map(
            (
              item,
              index
            ) => {
              const monthValue =
                index + 1;

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.filterOption,
                    month ===
                      monthValue &&
                      styles.filterOptionActive,
                  ]}
                  onPress={() =>
                    changeMonth(
                      monthValue
                    )
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      month ===
                        monthValue &&
                        styles.filterOptionTextActive,
                    ]}
                  >
                    {item.substring(
                      0,
                      3
                    )}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>
      </View>

      {/* ==================================================
          ERROR
      ================================================== */}

      {error ? (
        <View
          style={styles.errorBox}
        >
          <Text
            style={styles.errorText}
          >
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() =>
              loadReport(
                year,
                month
              )
            }
          >
            <Text
              style={
                styles.retryText
              }
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ==================================================
          REPORT
      ================================================== */}

      {report && (
        <>
          {/* ==================================================
              PERIOD
          ================================================== */}

          <View
            style={styles.periodCard}
          >
            <View>
              <Text
                style={
                  styles.periodLabel
                }
              >
                Selected Period
              </Text>

              <Text
                style={
                  styles.periodTitle
                }
              >
                {report.period?.label}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                report.period
                  ?.isCurrent
                  ? styles.currentBadge
                  : styles.pastBadge,
              ]}
            >
              <Text
                style={
                  report.period
                    ?.isCurrent
                    ? styles.currentBadgeText
                    : styles.pastBadgeText
                }
              >
                {report.period
                  ?.isCurrent
                  ? "Running"
                  : "Past"}
              </Text>
            </View>
          </View>

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <View
            style={styles.summaryRow}
          >
            <View
              style={[
                styles.summaryCard,
                styles.summaryCardLeft,
              ]}
            >
              <Text
                style={
                  styles.cardLabel
                }
              >
                Period Revenue
              </Text>

              <Text
                style={styles.money}
              >
                {formatMoney(
                  report.periodRevenue
                )}
              </Text>

              <Text
                style={
                  styles.cardHint
                }
              >
                Completed appointments
              </Text>
            </View>

            <View
              style={[
                styles.summaryCard,
                styles.summaryCardRight,
              ]}
            >
              <Text
                style={
                  styles.cardLabel
                }
              >
                Period Bookings
              </Text>

              <Text
                style={
                  styles.bigNumber
                }
              >
                {report.periodBookings ||
                  0}
              </Text>

              <Text
                style={
                  styles.cardHint
                }
              >
                Total appointments
              </Text>
            </View>
          </View>

          {/* ==================================================
              BOOKING STATUS
          ================================================== */}

          <View
            style={styles.section}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Booking Status
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Appointments for{" "}
              {report.period?.label}
            </Text>

            <View
              style={
                styles.statusGrid
              }
            >
              <StatusBox
                label="Pending"
                value={
                  report.pendingBookings ||
                  0
                }
                type="pending"
              />

              <StatusBox
                label="Confirmed"
                value={
                  report.confirmedBookings ||
                  0
                }
                type="confirmed"
              />

              <StatusBox
                label="Completed"
                value={
                  report.completedBookings ||
                  0
                }
                type="completed"
              />

              <StatusBox
                label="Cancelled"
                value={
                  report.cancelledBookings ||
                  0
                }
                type="cancelled"
              />
            </View>
          </View>

          {/* ==================================================
              BUSINESS OVERVIEW
          ================================================== */}

          <View
            style={styles.section}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Business Overview
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Overall business
              performance
            </Text>

            <OverviewRow
              label="Today's Bookings"
              value={
                report.todayBookings ||
                0
              }
            />

            <OverviewRow
              label="Today's Revenue"
              value={formatMoney(
                report.todayRevenue
              )}
            />

            <OverviewRow
              label="Current Month Bookings"
              value={
                report.monthlyBookings ||
                0
              }
            />

            <OverviewRow
              label="Current Month Revenue"
              value={formatMoney(
                report.monthlyRevenue
              )}
            />

            <OverviewRow
              label="Lifetime Bookings"
              value={
                report.totalBookings ||
                0
              }
            />

            <OverviewRow
              label="Lifetime Revenue"
              value={formatMoney(
                report.totalRevenue
              )}
            />
          </View>

          {/* ==================================================
              REFRESH
          ================================================== */}

          <TouchableOpacity
            style={
              styles.refreshButton
            }
            onPress={() =>
              loadReport(
                year,
                month
              )
            }
          >
            <Text
              style={
                styles.refreshText
              }
            >
              Refresh Reports
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ======================================================
// STATUS BOX
// ======================================================

function StatusBox({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type: string;
}) {
  return (
    <View
      style={[
        styles.statusBox,
        type === "pending" &&
          styles.pendingBox,
        type === "confirmed" &&
          styles.confirmedBox,
        type === "completed" &&
          styles.completedBox,
        type === "cancelled" &&
          styles.cancelledBox,
      ]}
    >
      <Text
        style={styles.statusLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.statusValue}
      >
        {value || 0}
      </Text>
    </View>
  );
}

// ======================================================
// OVERVIEW ROW
// ======================================================

function OverviewRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View
      style={styles.overviewRow}
    >
      <Text
        style={styles.overviewLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.overviewValue}
      >
        {value}
      </Text>
    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f8fc",
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f8fc",
  },

  loadingText: {
    marginTop: 10,
    color: "#6b7280",
  },

  header: {
    marginBottom: 20,
  },

  back: {
    color: "#374151",
    fontWeight: "600",
    marginBottom: 15,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 14,
  },

  switchContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },

  switchButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 9,
  },

  switchActive: {
    backgroundColor: "#111827",
  },

  switchText: {
    color: "#6b7280",
    fontWeight: "700",
  },

  switchTextActive: {
    color: "#ffffff",
  },

  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 17,
    marginBottom: 18,
  },

  filterLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "700",
    marginBottom: 9,
  },

  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },

  filterOptionActive: {
    backgroundColor: "#111827",
  },

  filterOptionText: {
    color: "#374151",
    fontWeight: "600",
  },

  filterOptionTextActive: {
    color: "#ffffff",
  },

  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },

  errorText: {
    color: "#991b1b",
    marginBottom: 10,
  },

  retryButton: {
    backgroundColor: "#991b1b",
    alignSelf: "flex-start",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 8,
  },

  retryText: {
    color: "#ffffff",
    fontWeight: "700",
  },

  periodCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  periodLabel: {
    color: "#9ca3af",
    fontSize: 12,
  },

  periodTitle: {
    color: "#ffffff",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 4,
  },

  badge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  currentBadge: {
    backgroundColor: "#dcfce7",
  },

  pastBadge: {
    backgroundColor: "#e5e7eb",
  },

  currentBadgeText: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 12,
  },

  pastBadgeText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 12,
  },

  summaryRow: {
    flexDirection: "row",
    marginBottom: 18,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 15,
  },

  summaryCardLeft: {
    marginRight: 7,
  },

  summaryCardRight: {
    marginLeft: 7,
  },

  cardLabel: {
    color: "#6b7280",
    fontSize: 13,
  },

  money: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
    marginTop: 7,
  },

  bigNumber: {
    fontSize: 29,
    fontWeight: "800",
    color: "#111827",
    marginTop: 7,
  },

  cardHint: {
    color: "#9ca3af",
    fontSize: 11,
    marginTop: 4,
  },

  section: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 18,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  sectionSubtitle: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },

  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statusBox: {
    width: "48%",
    padding: 15,
    borderRadius: 11,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  pendingBox: {
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },

  confirmedBox: {
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },

  completedBox: {
    borderLeftWidth: 4,
    borderLeftColor: "#22c55e",
  },

  cancelledBox: {
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },

  statusLabel: {
    color: "#6b7280",
    fontSize: 13,
  },

  statusValue: {
    color: "#111827",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 4,
  },

  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  overviewLabel: {
    color: "#6b7280",
    fontSize: 13,
    flex: 1,
  },

  overviewValue: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 15,
  },

  refreshButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },

  refreshText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});