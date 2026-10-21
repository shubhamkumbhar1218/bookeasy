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
      <LinearGradient
        colors={["#A78BFA", "#8B5CF6", "#6D4AFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.metricAccent}
      />

      <Text style={styles.metricTitle}>{title}</Text>

      <Text
        style={styles.metricValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text style={styles.metricHint}>{hint}</Text>
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
<View style={styles.topBar}>
  <Text style={styles.topBarLabel}>Analytics</Text>

  <TouchableOpacity
    style={styles.dashboardButton}
    onPress={() => router.replace("/business/dashboard" as any)}
    activeOpacity={0.8}
  >
    <Text style={styles.dashboardButtonText}>
      ← Dashboard
    </Text>
  </TouchableOpacity>
</View>

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
  {
    label: "Completed",
    value: overview.completedBookings,
    color: "#34D399",
  },
  {
    label: "Confirmed",
    value: overview.confirmedBookings,
    color: "#60A5FA",
  },
  {
    label: "Pending",
    value: overview.pendingBookings,
    color: "#FBBF24",
  },
  {
    label: "Cancelled",
    value: overview.cancelledBookings,
    color: "#FB7185",
  },
  {
    label: "No-show",
    value: overview.noShowBookings,
    color: "#9CA3AF",
  },
].map((item) => {
  const percentage = overview.totalBookings
    ? Math.min(
        100,
        (Number(item.value) / overview.totalBookings) * 100
      )
    : 0;

  return (
    <View key={item.label} style={styles.statusItem}>
      <View style={styles.statusRow}>
        <View style={styles.statusNameContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.color },
            ]}
          />
          <Text style={styles.statusLabel}>{item.label}</Text>
        </View>

        <Text style={styles.statusValue}>
          {number(item.value)}
        </Text>
      </View>

      <View style={styles.statusProgressBackground}>
        <View
          style={[
            styles.statusProgress,
            {
              width: `${percentage}%`,
              backgroundColor: item.color,
            },
          ]}
        />
      </View>
    </View>
  );
})}


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

  // Back navigation
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderRadius: 14,
    backgroundColor: "#1B1728",
    borderWidth: 1,
    borderColor: "#352B49",
  },

  backText: {
    color: "#C4B5FD",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.1,
  },

  // Premium analytics header
  header: {
    borderRadius: 25,
    padding: 23,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#49315F",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5,
  },

  eyebrow: {
    color: "#E0C5FF",
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
    lineHeight: 36,
    marginBottom: 10,
  },

  headerDescription: {
    color: "#D0C6E4",
    fontSize: 13,
    lineHeight: 21,
  },

  // Refresh action
  refreshButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 43,
    paddingVertical: 11,
    paddingHorizontal: 17,
    borderRadius: 14,
    backgroundColor: "#211B31",
    borderWidth: 1,
    borderColor: "#514071",
    marginBottom: 24,
  },

  refreshText: {
    color: "#C4B5FD",
    fontWeight: "800",
    fontSize: 13,
  },

  // Error state
  errorBox: {
    padding: 18,
    backgroundColor: "#251522",
    borderColor: "#713147",
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 22,
  },

  errorTitle: {
    color: "#FF8CA8",
    fontWeight: "900",
    marginBottom: 8,
    fontSize: 15,
  },

  errorText: {
    color: "#E8B8C8",
    fontSize: 13,
    lineHeight: 21,
  },

  retry: {
    color: "#C4B5FD",
    fontWeight: "800",
    textDecorationLine: "underline",
    marginTop: 13,
    fontSize: 13,
  },

  // Section headings
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#F5F0FF",
    letterSpacing: -0.4,
    lineHeight: 25,
    marginBottom: 17,
  },

  // Overview metrics
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  metric: {
    width: "48.2%",
    minHeight: 151,
    backgroundColor: "#191524",
    borderRadius: 20,
    padding: 15,
    paddingTop: 19,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#39304C",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },

  metricAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },

  metricTitle: {
    color: "#B7ADC9",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 17,
    minHeight: 34,
    marginBottom: 7,
  },

  metricValue: {
    color: "#C4B5FD",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginBottom: 8,
  },

  metricHint: {
    color: "#9186A8",
    fontSize: 10,
    lineHeight: 16,
  },

  muted: {
    color: "#A49BB9",
    fontSize: 12,
    lineHeight: 19,
  },

  // Analytics panels
  panel: {
    backgroundColor: "#171321",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#352B45",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 13,
    elevation: 3,
  },

  // Monthly booking trends
  trend: {
    marginBottom: 23,
  },

  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
    gap: 8,
  },

  trendLabel: {
    color: "#E5DDF5",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },

  barBackground: {
    height: 10,
    backgroundColor: "#30253F",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 9,
  },

  bar: {
    height: 10,
    backgroundColor: "#8B5CF6",
    borderRadius: 10,
  },

  // Booking status
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    gap: 12,
  },

  statusLabel: {
    color: "#B7ADC9",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  statusValue: {
    color: "#F5F0FF",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
    flexShrink: 0,
  },

  divider: {
    height: 1,
    backgroundColor: "#393047",
    marginVertical: 10,
  },

  // Popular services
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
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
    marginBottom: 6,
  },

  // Estimated revenue
  revenueBox: {
    backgroundColor: "#251735",
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#65417D",
    padding: 21,
    marginBottom: 18,
    shadowColor: "#8B45D5",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },

  revenueTitle: {
    color: "#E0C5FF",
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },

  revenueValue: {
    color: "#D8B4FE",
    fontWeight: "900",
    fontSize: 30,
    letterSpacing: -0.8,
    marginVertical: 9,
  },

  revenueNote: {
    color: "#C1B0D2",
    fontSize: 12,
    lineHeight: 20,
  },

  
statusItem: {
  marginBottom: 10,
},

statusNameContainer: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  gap: 9,
},

statusDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
},

statusProgressBackground: {
  height: 6,
  borderRadius: 10,
  backgroundColor: "#30253F",
  overflow: "hidden",
  marginBottom: 7,
},

statusProgress: {
  height: 6,
  borderRadius: 10,
},


topBar: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  gap: 12,
},

topBarLabel: {
  color: "#F5F0FF",
  fontSize: 17,
  fontWeight: "800",
  flex: 1,
},

dashboardButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 11,
  paddingHorizontal: 15,
  borderRadius: 14,
  backgroundColor: "#211B31",
  borderWidth: 1,
  borderColor: "#514071",
},

dashboardButtonText: {
  color: "#C4B5FD",
  fontSize: 13,
  fontWeight: "800",
},

});
