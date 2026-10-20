
import { useCallback, useEffect, useState } from "react";
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

      <View style={styles.header}>
        <Text style={styles.eyebrow}>BUSINESS INSIGHTS</Text>
        <Text style={styles.heading}>Advanced Analytics</Text>
        <Text style={styles.muted}>
          Six-month trends, customer retention and service performance.
        </Text>
      </View>

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
  screen: { flex: 1, backgroundColor: "#F7F6F0" },
  content: { padding: 18, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F6F0",
    padding: 24,
  },
  backButton: { paddingVertical: 8, marginBottom: 12 },
  backText: { color: "#2F4F43", fontWeight: "700" },
  header: {
    backgroundColor: "#E9F0E8",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  eyebrow: {
    color: "#2F4F43",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  heading: {
    color: "#243B35",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
  },
  muted: { color: "#64766A", fontSize: 12, lineHeight: 18 },
  refreshButton: {
    alignSelf: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E3D7",
    marginBottom: 18,
  },
  refreshText: { color: "#2F4F43", fontWeight: "700" },
  errorBox: {
    padding: 16,
    backgroundColor: "#FCE9E6",
    borderColor: "#F4D3CE",
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 18,
  },
  errorTitle: { color: "#9B3028", fontWeight: "800", marginBottom: 6 },
  errorText: { color: "#9B3028", fontSize: 13, lineHeight: 19 },
  retry: {
    color: "#9B3028",
    fontWeight: "700",
    textDecorationLine: "underline",
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#243B35",
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  metric: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7DF",
  },
  metricTitle: { color: "#64766A", fontSize: 12, fontWeight: "600" },
  metricValue: {
    color: "#243B35",
    fontSize: 23,
    fontWeight: "800",
    marginVertical: 8,
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7DF",
  },
  trend: { marginBottom: 16 },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  trendLabel: { color: "#243B35", fontSize: 12, fontWeight: "600" },
  barBackground: {
    height: 9,
    backgroundColor: "#E9F0E8",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 5,
  },
  bar: { height: 9, backgroundColor: "#2F4F43", borderRadius: 10 },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  statusLabel: { color: "#64766A", fontSize: 13 },
  statusValue: { color: "#243B35", fontSize: 13, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#E5E7DF", marginVertical: 6 },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7DF",
  },
  serviceInfo: { flex: 1, paddingRight: 10 },
  serviceName: {
    color: "#243B35",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  revenueBox: {
    backgroundColor: "#FFF4D9",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EAD7A5",
    padding: 17,
  },
  revenueTitle: { color: "#765515", fontWeight: "800", fontSize: 14 },
  revenueValue: {
    color: "#765515",
    fontWeight: "900",
    fontSize: 26,
    marginVertical: 8,
  },
  revenueNote: { color: "#765515", fontSize: 12, lineHeight: 18 },
});
