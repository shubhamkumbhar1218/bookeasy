import { useCallback, useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import API_URL from "../../api";

type Overview = {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  noShowBookings: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  completionRate: number;
  noShowRate: number;
  repeatCustomerRate: number;
  estimatedCompletedRevenue: number;
};

type MonthlyTrend = {
  month: string;
  bookings: number;
  completed: number;
  cancelled: number;
};

type PopularService = {
  serviceId: string;
  name: string;
  bookings: number;
  completed: number;
};

type AnalyticsData = {
  overview: Overview;
  monthlyTrends: MonthlyTrend[];
  popularServices: PopularService[];
  revenueNote: string;
};

const number = (value: number | undefined) =>
  Number(value || 0).toLocaleString("en-IN");

const money = (value: number | undefined) =>
  `₹${number(value)}`;

function Metric({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.muted}>{hint}</Text>
    </View>
  );
}

export default function AdvancedAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setError("");

    try {
      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        router.replace("/business/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/bookings/advanced-analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
          "bookeasy_role",
        ]);
        router.replace("/business/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            (response.status === 403
              ? "Advanced Analytics requires a Business or Pro plan."
              : "Unable to load analytics.")
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analytics. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const overview = data?.overview;
  const maxBookings = Math.max(
    1,
    ...(data?.monthlyTrends || []).map((item) => item.bookings)
  );

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2F4F43" />
        <Text style={styles.muted}>Loading advanced analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadAnalytics();
          }}
        />
      }
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>← Back to Dashboard</Text>
      </TouchableOpacity>

<LinearGradient
  colors={["#7567F0", "#5145CD", "#39318F"]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.header}
>
  <Text style={styles.eyebrow}>BUSINESS INSIGHTS</Text>
  <Text style={styles.heading}>Advanced Analytics</Text>
  <Text style={styles.headerDescription}>
    Six-month trends, customer retention and service performance.
  </Text>
</LinearGradient>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={() => {
          setRefreshing(true);
          void loadAnalytics();
        }}
        disabled={refreshing}
      >
        <Text style={styles.refreshText}>
          {refreshing ? "Refreshing..." : "↻ Refresh"}
        </Text>
      </TouchableOpacity>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Unable to show analytics</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void loadAnalytics()}>
            <Text style={styles.retry}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/business/subscription" as any)}
          >
            <Text style={styles.retry}>View subscription plans</Text>
          </TouchableOpacity>
        </View>
      )}

      {overview && (
        <>
          <Text style={styles.sectionTitle}>Overview · Last six months</Text>

          <View style={styles.grid}>
            <Metric
              title="Bookings"
              value={number(overview.totalBookings)}
              hint="Total bookings"
            />
            <Metric
              title="Completion rate"
              value={`${overview.completionRate}%`}
              hint={`${number(overview.completedBookings)} completed`}
            />
            <Metric
              title="Repeat customer rate"
              value={`${overview.repeatCustomerRate}%`}
              hint={`${number(overview.repeatCustomers)} repeat customers`}
            />
            <Metric
              title="Unique customers"
              value={number(overview.uniqueCustomers)}
              hint="Identified by phone"
            />
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Monthly booking trends</Text>

            {data?.monthlyTrends.map((item) => (
              <View key={item.month} style={styles.trend}>
                <View style={styles.trendHeader}>
                  <Text style={styles.trendLabel}>
                    {new Date(`${item.month}-02T12:00:00`).toLocaleDateString(
                      "en-IN",
                      { month: "short", year: "numeric" }
                    )}
                  </Text>
                  <Text style={styles.trendLabel}>
                    {number(item.bookings)} total
                  </Text>
                </View>

                <View style={styles.barBackground}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${Math.min(
                          100,
                          (item.bookings / maxBookings) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.muted}>
                  {number(item.completed)} completed ·{" "}
                  {number(item.cancelled)} cancelled
                </Text>
              </View>
            ))}

            {!data?.monthlyTrends.length && (
              <Text style={styles.muted}>No booking trends available yet.</Text>
            )}
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Booking status</Text>

            {[
              { label: "Completed", value: overview.completedBookings },
              { label: "Confirmed", value: overview.confirmedBookings },
              { label: "Pending", value: overview.pendingBookings },
              { label: "Cancelled", value: overview.cancelledBookings },
              { label: "No-show", value: overview.noShowBookings },
            ].map((item) => (
              <View key={item.label} style={styles.statusRow}>
                <Text style={styles.statusLabel}>{item.label}</Text>
                <Text style={styles.statusValue}>{number(item.value)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>No-show rate</Text>
              <Text style={styles.statusValue}>{overview.noShowRate}%</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Top services</Text>

            {data?.popularServices.map((service) => (
              <View key={service.serviceId} style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.muted}>
                    {number(service.completed)} completed
                  </Text>
                </View>
                <Text style={styles.statusValue}>
                  {number(service.bookings)} bookings
                </Text>
              </View>
            ))}

            {!data?.popularServices.length && (
              <Text style={styles.muted}>
                No service booking data in this period.
              </Text>
            )}
          </View>

          <View style={styles.revenueBox}>
            <Text style={styles.revenueTitle}>
              Estimated completed-service value
            </Text>
            <Text style={styles.revenueValue}>
              {money(overview.estimatedCompletedRevenue)}
            </Text>
            <Text style={styles.revenueNote}>
              {data?.revenueNote} This is an estimate, not verified payment or
              accounting revenue.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}



const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0915",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 44,
    backgroundColor: "#0B0915",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0915",
    padding: 24,
  },

  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 15,
    marginBottom: 18,
    borderRadius: 14,
    backgroundColor: "#1B1728",
    borderWidth: 1,
    borderColor: "#352B49",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 3,
  },

  backText: {
    color: "#B7A5FF",
    fontWeight: "800",
    fontSize: 13,
  },

  header: {
    borderRadius: 25,
    padding: 23,
    marginBottom: 20,
    overflow: "hidden",
    backgroundColor: "#21142F",
    borderWidth: 1,
    borderColor: "#49315F",
    shadowColor: "#8B45D5",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },

  eyebrow: {
    color: "#D8B8FF",
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: "uppercase",
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
    lineHeight: 35,
    marginBottom: 10,
  },

  headerDescription: {
    color: "#C8BFD9",
    fontSize: 13,
    lineHeight: 21,
  },

  muted: {
    color: "#A49BB9",
    fontSize: 12,
    lineHeight: 19,
  },

  refreshButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 17,
    borderRadius: 14,
    backgroundColor: "#211B31",
    borderWidth: 1,
    borderColor: "#423459",
    marginBottom: 21,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 2,
  },

  refreshText: {
    color: "#C2B2FF",
    fontWeight: "800",
    fontSize: 13,
  },

  errorBox: {
    padding: 17,
    backgroundColor: "#321823",
    borderColor: "#713147",
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 18,
  },

  errorTitle: {
    color: "#FF8CA8",
    fontWeight: "900",
    marginBottom: 7,
    fontSize: 14,
  },

  errorText: {
    color: "#F1B7C7",
    fontSize: 13,
    lineHeight: 20,
  },

  retry: {
    color: "#C2B2FF",
    fontWeight: "800",
    textDecorationLine: "underline",
    marginTop: 13,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#F4F0FF",
    letterSpacing: -0.4,
    marginBottom: 15,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  metric: {
    width: "48.3%",
    backgroundColor: "#1B1728",
    borderRadius: 20,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#342B45",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },

  metricTitle: {
    color: "#AAA1BE",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 17,
  },

  metricValue: {
    color: "#C0A8FF",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginVertical: 10,
  },

  panel: {
    backgroundColor: "#191524",
    borderRadius: 22,
    padding: 18,
    marginBottom: 17,
    borderWidth: 1,
    borderColor: "#332940",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 13,
    elevation: 3,
  },

  trend: {
    marginBottom: 21,
  },

  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },

  trendLabel: {
    color: "#E4DCF5",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },

  barBackground: {
    height: 10,
    backgroundColor: "#30253F",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
  },

  bar: {
    height: 10,
    backgroundColor: "#8A54F5",
    borderRadius: 10,
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    gap: 12,
  },

  statusLabel: {
    color: "#AAA1BE",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },

  statusValue: {
    color: "#F1ECFF",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },

  divider: {
    height: 1,
    backgroundColor: "#342B43",
    marginVertical: 9,
  },

  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#30263D",
    gap: 12,
  },

  serviceInfo: {
    flex: 1,
    paddingRight: 8,
  },

  serviceName: {
    color: "#F1ECFF",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 5,
  },

  revenueBox: {
    backgroundColor: "#251735",
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#53346B",
    padding: 21,
    marginBottom: 14,
    shadowColor: "#8B45D5",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },

  revenueTitle: {
    color: "#D6B7FF",
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 3,
  },

  revenueValue: {
    color: "#D4B5FF",
    fontWeight: "900",
    fontSize: 29,
    letterSpacing: -0.8,
    marginVertical: 10,
  },

  revenueNote: {
    color: "#BCAACF",
    fontSize: 12,
    lineHeight: 20,
  },
});


