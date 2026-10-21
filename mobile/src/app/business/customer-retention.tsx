import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  ArrowLeft,
  CalendarCheck,
  Clock3,
  RefreshCw,
  Repeat2,
  Search,
  Users,
  UserRoundX,
} from "lucide-react-native";
import API_URL from "../../api";

type Segment =
  | "all"
  | "new"
  | "active"
  | "repeat"
  | "upcoming"
  | "inactive_30"
  | "inactive_60"
  | "inactive_90";

type Overview = {
  totalCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
  completedVisits: number;
  inactiveCustomers: number;
  inactive30Days: number;
  inactive60Days: number;
  inactive90Days: number;
  upcomingCustomers: number;
};

type Customer = {
  customerName?: string;
  customerPhone: string;
  totalBookings: number;
  completedVisits: number;
  cancelledBookings: number;
  noShowBookings: number;
  upcomingBookings: number;
  lastVisit: string | null;
  nextBooking: string | null;
  daysSinceVisit: number | null;
  segment: Segment;
};

const SEGMENTS: { label: string; value: Segment }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Repeat", value: "repeat" },
  { label: "Active", value: "active" },
  { label: "Upcoming", value: "upcoming" },
  { label: "30+ days", value: "inactive_30" },
  { label: "60+ days", value: "inactive_60" },
  { label: "90+ days", value: "inactive_90" },
];

const EMPTY_OVERVIEW: Overview = {
  totalCustomers: 0,
  repeatCustomers: 0,
  repeatCustomerRate: 0,
  completedVisits: 0,
  inactiveCustomers: 0,
  inactive30Days: 0,
  inactive60Days: 0,
  inactive90Days: 0,
  upcomingCustomers: 0,
};

export default function CustomerRetentionScreen() {
  const [overview, setOverview] = useState<Overview>(EMPTY_OVERVIEW);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [segment, setSegment] = useState<Segment>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        router.replace("/business/login");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const [overviewResponse, customersResponse] = await Promise.all([
        fetch(`${API_URL}/retention/overview`, { headers }),
        fetch(
          `${API_URL}/retention/customers?segment=${encodeURIComponent(segment)}`,
          { headers }
        ),
      ]);

      if (
        overviewResponse.status === 401 ||
        customersResponse.status === 401
      ) {
        await AsyncStorage.removeItem("bookeasy_token");
        await AsyncStorage.removeItem("bookeasy_user");
        router.replace("/business/login");
        return;
      }

      const overviewData = await overviewResponse.json();
      const customersData = await customersResponse.json();

      if (!overviewResponse.ok || !customersResponse.ok) {
        const message =
          overviewData.message ||
          customersData.message ||
          "Unable to load customer retention data.";

        if (
          overviewResponse.status === 403 ||
          customersResponse.status === 403
        ) {
          setError(
            "Customer Retention requires an eligible subscription. Check your BookEasy plan."
          );
        } else {
          setError(message);
        }

        return;
      }

      setOverview(overviewData.overview ?? EMPTY_OVERVIEW);
      setCustomers(
        Array.isArray(customersData.customers)
          ? customersData.customers
          : []
      );
    } catch {
      setError(
        "Unable to connect to BookEasy. Check your internet connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [segment]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleCustomers = customers.filter((customer) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      (customer.customerName ?? "").toLowerCase().includes(query) ||
      customer.customerPhone.toLowerCase().includes(query)
    );
  });

  const formatDate = (value: string | null) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const segmentLabel = (value: Segment) =>
    SEGMENTS.find((item) => item.value === value)?.label ?? value;

  const stats = [
    {
      label: "Total customers",
      value: overview.totalCustomers,
      icon: Users,
      color: "#6558e8",
      background: "#efedff",
    },
    {
      label: "Repeat customers",
      value: overview.repeatCustomers,
      icon: Repeat2,
      color: "#168653",
      background: "#e8f9f0",
    },
    {
      label: "Inactive 30+ days",
      value: overview.inactiveCustomers,
      icon: UserRoundX,
      color: "#c24f35",
      background: "#fff0ec",
    },
    {
      label: "Upcoming customers",
      value: overview.upcomingCustomers,
      icon: CalendarCheck,
      color: "#2867bd",
      background: "#eaf3ff",
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(true)}
            tintColor="#6558e8"
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={21} color="#171b3b" />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Customer Retention</Text>
            <Text style={styles.subtitle}>
              Understand customer visits and re-engagement opportunities.
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() => void loadData(true)}
            accessibilityLabel="Refresh retention data"
          >
            <RefreshCw size={18} color="#6558e8" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#6558e8" />
            <Text style={styles.mutedText}>
              Loading customer insights...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn't load retention</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => void loadData()}
            >
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.metricGrid}>
              {stats.map((item) => {
                const Icon = item.icon;

                return (
                  <View key={item.label} style={styles.metricCard}>
                    <View
                      style={[
                        styles.metricIcon,
                        { backgroundColor: item.background },
                      ]}
                    >
                      <Icon size={20} color={item.color} />
                    </View>
                    <Text style={styles.metricValue}>{item.value}</Text>
                    <Text style={styles.metricLabel}>{item.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.insightCard}>
              <View style={styles.insightHeading}>
                <Clock3 size={19} color="#6558e8" />
                <Text style={styles.sectionTitle}>Retention insights</Text>
              </View>

              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>
                  Repeat customer rate
                </Text>
                <Text style={styles.insightValue}>
                  {overview.repeatCustomerRate}%
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.max(0, overview.repeatCustomerRate)
                      )}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>
                  No completed visit for 60+ days
                </Text>
                <Text style={styles.insightValue}>
                  {overview.inactive60Days}
                </Text>
              </View>

              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>
                  No completed visit for 90+ days
                </Text>
                <Text style={styles.insightValue}>
                  {overview.inactive90Days}
                </Text>
              </View>
            </View>

            <View style={styles.customerPanel}>
              <Text style={styles.sectionTitle}>Customer directory</Text>
              <Text style={styles.panelSubtitle}>
                Filter customers by visit history and booking status.
              </Text>

              <View style={styles.searchBox}>
                <Search size={18} color="#858ba3" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search name or phone"
                  placeholderTextColor="#858ba3"
                  style={styles.searchInput}
                  autoCapitalize="none"
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.segmentList}
              >
                {SEGMENTS.map((item) => {
                  const selected = segment === item.value;

                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => setSegment(item.value)}
                      style={[
                        styles.segmentChip,
                        selected && styles.segmentChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          selected && styles.segmentTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.resultCount}>
                {visibleCustomers.length} customer
                {visibleCustomers.length === 1 ? "" : "s"}
              </Text>

              {visibleCustomers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users size={30} color="#a1a5bd" />
                  <Text style={styles.emptyTitle}>No customers found</Text>
                  <Text style={styles.mutedText}>
                    Try another segment or search term.
                  </Text>
                </View>
              ) : (
                visibleCustomers.map((customer, index) => (
                  <View
                    key={`${customer.customerPhone}-${index}`}
                    style={styles.customerCard}
                  >
                    <View style={styles.customerTop}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(customer.customerName || "C")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>
                          {customer.customerName || "Customer"}
                        </Text>
                        <Text style={styles.customerPhone}>
                          {customer.customerPhone}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.customerDetails}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Completed visits</Text>
                        <Text style={styles.detailValue}>
                          {customer.completedVisits}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Last visit</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(customer.lastVisit)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.customerBottom}>
                      <View
                        style={[
                          styles.statusChip,
                          customer.segment.startsWith("inactive")
                            ? styles.inactiveChip
                            : customer.segment === "repeat"
                              ? styles.repeatChip
                              : customer.segment === "upcoming"
                                ? styles.upcomingChip
                                : styles.defaultChip,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {segmentLabel(customer.segment)}
                        </Text>
                      </View>

                      {customer.nextBooking ? (
                        <Text style={styles.nextBooking}>
                          Next: {formatDate(customer.nextBooking)}
                        </Text>
                      ) : customer.daysSinceVisit != null ? (
                        <Text style={styles.nextBooking}>
                          {customer.daysSinceVisit} days since visit
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.privacyNote}>
              Customer information is shown only for your business. Use
              customer contact details responsibly and follow applicable
              privacy requirements.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f8fc",
  },
  content: {
    padding: 18,
    paddingTop: 22,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 22,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9eaf4",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#171b3b",
  },
  subtitle: {
    marginTop: 5,
    color: "#747b98",
    fontSize: 13,
    lineHeight: 19,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#efedff",
    alignItems: "center",
    justifyContent: "center",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  metricCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "44%",
    padding: 16,
    borderRadius: 17,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9eaf4",
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  metricValue: {
    fontSize: 27,
    fontWeight: "800",
    color: "#171b3b",
  },
  metricLabel: {
    marginTop: 5,
    fontSize: 12,
    color: "#747b98",
    lineHeight: 17,
  },
  insightCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#e9eaf4",
    marginBottom: 18,
  },
  insightHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#171b3b",
  },
  insightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
  },
  insightLabel: {
    flex: 1,
    color: "#747b98",
    fontSize: 13,
  },
  insightValue: {
    color: "#171b3b",
    fontSize: 13,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    borderRadius: 20,
    backgroundColor: "#efedff",
    overflow: "hidden",
    marginTop: 11,
  },
  progressFill: {
    height: "100%",
    borderRadius: 20,
    backgroundColor: "#6558e8",
  },
  customerPanel: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#e9eaf4",
  },
  panelSubtitle: {
    marginTop: 6,
    color: "#858ba3",
    fontSize: 12,
    lineHeight: 18,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "#e1e4f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 17,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    color: "#171b3b",
    fontSize: 14,
  },
  segmentList: {
    gap: 8,
    paddingVertical: 15,
  },
  segmentChip: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#e1e4f0",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  segmentChipSelected: {
    backgroundColor: "#6558e8",
    borderColor: "#6558e8",
  },
  segmentText: {
    color: "#555b78",
    fontWeight: "600",
    fontSize: 12,
  },
  segmentTextSelected: {
    color: "#fff",
  },
  resultCount: {
    color: "#858ba3",
    fontSize: 12,
    marginBottom: 10,
  },
  customerCard: {
    borderWidth: 1,
    borderColor: "#eef0f7",
    borderRadius: 14,
    padding: 13,
    marginBottom: 11,
  },
  customerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#efedff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#5145cd",
    fontSize: 17,
    fontWeight: "800",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#242846",
  },
  customerPhone: {
    marginTop: 4,
    fontSize: 12,
    color: "#858ba3",
  },
  customerDetails: {
    flexDirection: "row",
    gap: 12,
    marginTop: 17,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#f0f1f7",
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    color: "#858ba3",
    fontSize: 11,
  },
  detailValue: {
    marginTop: 5,
    color: "#242846",
    fontSize: 12,
    fontWeight: "700",
  },
  customerBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 30,
  },
  defaultChip: {
    backgroundColor: "#efedff",
  },
  repeatChip: {
    backgroundColor: "#e8f9f0",
  },
  upcomingChip: {
    backgroundColor: "#eaf3ff",
  },
  inactiveChip: {
    backgroundColor: "#fff0ec",
  },
  statusText: {
    color: "#5145cd",
    fontSize: 11,
    fontWeight: "700",
  },
  nextBooking: {
    color: "#747b98",
    fontSize: 11,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 65,
    gap: 13,
  },
  mutedText: {
    color: "#858ba3",
    fontSize: 13,
    textAlign: "center",
  },
  errorCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f3d7d1",
    alignItems: "center",
  },
  errorTitle: {
    color: "#b33b2b",
    fontSize: 17,
    fontWeight: "800",
  },
  errorText: {
    color: "#747b98",
    textAlign: "center",
    marginTop: 9,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 17,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#6558e8",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 9,
  },
  emptyTitle: {
    fontWeight: "800",
    color: "#242846",
  },
  privacyNote: {
    marginTop: 16,
    color: "#858ba3",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
});