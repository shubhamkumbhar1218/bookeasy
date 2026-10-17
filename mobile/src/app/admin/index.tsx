
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../../api";

type Overview = {
  totalOwners: number;
  activeOwners: number;
  suspendedOwners: number;
  categories: number;
};

type Owner = {
  _id: string;
  name: string;
  email: string;
  businessName: string;
  businessSlug: string;
  businessType: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
  createdAt?: string;
};

type BusinessBookingStat = {
  _id: string;
  name: string;
  businessName: string;
  businessType: string;
  totalBookings: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
};

type BookingPeriod =
  | "today"
  | "thisMonth"
  | "lastMonth"
  | "allTime"
  | "custom";

const BOOKING_PERIODS: { label: string; value: BookingPeriod }[] = [
  { label: "Today", value: "today" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "All Time", value: "allTime" },
];

export default function AdminPanel() {
  const [overview, setOverview] = useState<Overview>({
    totalOwners: 0,
    activeOwners: 0,
    suspendedOwners: 0,
    categories: 0,
  });

  const [owners, setOwners] = useState<Owner[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [bookingStats, setBookingStats] = useState<BusinessBookingStat[]>(
    []
  );
  const [bookingPeriod, setBookingPeriod] =
    useState<BookingPeriod>("thisMonth");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [totalBookings, setTotalBookings] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);

  const loadAdminData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("bookeasy_token");
      const storedUser = await AsyncStorage.getItem("bookeasy_user");

      if (!token || !storedUser) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
          "bookeasy_role",
        ]);
        router.replace("/business/login");
        return;
      }

      let user: { role?: string };

      try {
        user = JSON.parse(storedUser);
      } catch {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
          "bookeasy_role",
        ]);
        router.replace("/business/login");
        return;
      }

      const storedRole = await AsyncStorage.getItem("bookeasy_role");
      const role = String(user.role || storedRole || "").toUpperCase();

      if (role !== "ADMIN") {
        Alert.alert("Access denied", "Admin access is required.");
        router.replace(
          role === "BUSINESS"
            ? "/business/dashboard"
            : "/business/login"
        );
        return;
      }

      if (
        bookingPeriod === "custom" &&
        (!appliedStartDate || !appliedEndDate)
      ) {
        setBookingStats([]);
        setTotalBookings(0);
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const bookingParams = new URLSearchParams({
        period: bookingPeriod,
      });

      if (bookingPeriod === "custom") {
        bookingParams.set("startDate", appliedStartDate);
        bookingParams.set("endDate", appliedEndDate);
      }

      setBookingLoading(true);

      const [overviewResponse, ownersResponse, bookingsResponse] =
        await Promise.all([
          fetch(`${API_URL}/admin/overview`, { headers }),
          fetch(
            `${API_URL}/admin/owners?search=${encodeURIComponent(
              search.trim()
            )}`,
            { headers }
          ),
          fetch(
            `${API_URL}/admin/business-booking-stats?${bookingParams.toString()}`,
            { headers }
          ),
        ]);

      const responses = [
        overviewResponse,
        ownersResponse,
        bookingsResponse,
      ];

      if (responses.some((response) => response.status === 401)) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
          "bookeasy_role",
        ]);
        Alert.alert("Session expired", "Please log in again.");
        router.replace("/business/login");
        return;
      }

      if (responses.some((response) => response.status === 403)) {
        Alert.alert(
          "Access denied",
          "Your account does not have administrator permissions."
        );
        router.replace("/business/login");
        return;
      }

      if (responses.some((response) => !response.ok)) {
        const errorMessages = await Promise.all(
          responses.map(async (response) => {
            if (response.ok) return "";
            return `${response.url}: ${response.status} ${(
              await response.clone().text()
            ).slice(0, 250)}`;
          })
        );

        console.error("Admin API errors:", errorMessages);
        throw new Error("Unable to load admin data. Please try again.");
      }

      const [overviewData, ownersData, bookingsData] = await Promise.all([
        overviewResponse.json(),
        ownersResponse.json(),
        bookingsResponse.json(),
      ]);

      setOverview(overviewData);
      setOwners(ownersData.owners || []);
      setBookingStats(bookingsData.businesses || []);
      setTotalBookings(bookingsData.totalBookings || 0);
    } catch (error) {
      console.error("Mobile admin loading error:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Could not load admin data. Check your internet connection and API URL."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setBookingLoading(false);
    }
  }, [
    search,
    bookingPeriod,
    appliedStartDate,
    appliedEndDate,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, [loadAdminData])
  );

  const applyCustomDates = () => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (
      !datePattern.test(customStartDate.trim()) ||
      !datePattern.test(customEndDate.trim())
    ) {
      Alert.alert(
        "Invalid dates",
        "Enter dates in YYYY-MM-DD format, for example 2026-10-01."
      );
      return;
    }

    const isRealDate = (value: string) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    };

    if (
      !isRealDate(customStartDate.trim()) ||
      !isRealDate(customEndDate.trim())
    ) {
      Alert.alert("Invalid dates", "Please enter real calendar dates.");
      return;
    }

    if (customStartDate.trim() > customEndDate.trim()) {
      Alert.alert(
        "Invalid date range",
        "The start date must be before or equal to the end date."
      );
      return;
    }

    setAppliedStartDate(customStartDate.trim());
    setAppliedEndDate(customEndDate.trim());
    setBookingPeriod("custom");
  };

  const updateOwnerStatus = async (owner: Owner) => {
    const nextStatus = owner.isActive === false;

    Alert.alert(
      nextStatus ? "Activate business?" : "Suspend business?",
      `${owner.businessName || owner.name} will be ${
        nextStatus ? "activated" : "suspended"
      }.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextStatus ? "Activate" : "Suspend",
          style: nextStatus ? "default" : "destructive",
          onPress: async () => {
            try {
              setUpdatingId(owner._id);

              const token = await AsyncStorage.getItem("bookeasy_token");

              if (!token) {
                await AsyncStorage.multiRemove([
                  "bookeasy_token",
                  "bookeasy_user",
                  "bookeasy_role",
                ]);
                router.replace("/business/login");
                return;
              }

              const response = await fetch(
                `${API_URL}/admin/owners/${owner._id}/status`,
                {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ isActive: nextStatus }),
                }
              );

              if (response.status === 401) {
                await AsyncStorage.multiRemove([
                  "bookeasy_token",
                  "bookeasy_user",
                  "bookeasy_role",
                ]);
                Alert.alert("Session expired", "Please log in again.");
                router.replace("/business/login");
                return;
              }

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || "Status update failed.");
              }

              Alert.alert("Success", data.message);
              await loadAdminData();
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error
                  ? error.message
                  : "Unable to update business status."
              );
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([
      "bookeasy_token",
      "bookeasy_user",
      "bookeasy_role",
    ]);
    router.replace("/business/login");
  };

  const renderOwner = ({ item }: { item: Owner }) => {
    const active = item.isActive !== false;
    const updating = updatingId === item._id;

    return (
      <View style={styles.ownerCard}>
        <View style={styles.ownerTop}>
          <View style={styles.ownerInfo}>
            <Text style={styles.businessName}>
              {item.businessName || "Unnamed Business"}
            </Text>
            <Text style={styles.ownerName}>{item.name}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              active ? styles.activeBadge : styles.suspendedBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                active ? styles.activeText : styles.suspendedText,
              ]}
            >
              {active ? "Active" : "Suspended"}
            </Text>
          </View>
        </View>

        <Text style={styles.ownerDetail}>{item.email}</Text>

        {!!item.phone && (
          <Text style={styles.ownerDetail}>{item.phone}</Text>
        )}

        {!!item.businessType && (
          <Text style={styles.ownerDetail}>
            Category: {item.businessType}
          </Text>
        )}

        {!!item.address && (
          <Text style={styles.ownerDetail}>Address: {item.address}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.statusButton,
            active ? styles.suspendButton : styles.activateButton,
            updating && styles.disabledButton,
          ]}
          disabled={updating}
          onPress={() => updateOwnerStatus(item)}
        >
          {updating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.statusButtonText}>
              {active ? "Suspend Business" : "Activate Business"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderBookingStats = () => (
    <View style={styles.bookingSection}>
      <Text style={styles.sectionTitle}>Bookings by Business</Text>
      <Text style={styles.subtitle}>
        {totalBookings} total bookings in selected period
      </Text>

      <View style={styles.periodButtons}>
        {BOOKING_PERIODS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.periodButton,
              bookingPeriod === option.value &&
                styles.selectedPeriodButton,
            ]}
            onPress={() => setBookingPeriod(option.value)}
          >
            <Text
              style={[
                styles.periodButtonText,
                bookingPeriod === option.value &&
                  styles.selectedPeriodButtonText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.dateLabel}>
        Custom date range (YYYY-MM-DD)
      </Text>

      <TextInput
        style={styles.searchInput}
        value={customStartDate}
        onChangeText={setCustomStartDate}
        placeholder="Start date, e.g. 2026-10-01"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.searchInput, styles.dateInput]}
        value={customEndDate}
        onChangeText={setCustomEndDate}
        placeholder="End date, e.g. 2026-10-14"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={styles.searchButton}
        onPress={applyCustomDates}
      >
        <Text style={styles.searchButtonText}>Apply Custom Dates</Text>
      </TouchableOpacity>

      {bookingLoading ? (
        <View style={styles.bookingLoading}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.ownerDetail}>
            Loading booking statistics...
          </Text>
        </View>
      ) : bookingStats.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No businesses found</Text>
          <Text style={styles.emptyText}>
            No registered businesses were returned for this report.
          </Text>
        </View>
      ) : (
        bookingStats.map((business) => (
          <View key={business._id} style={styles.bookingBusinessCard}>
            <Text style={styles.businessName}>
              {business.businessName || "Unnamed Business"}
            </Text>

            {!!business.businessType && (
              <Text style={styles.ownerDetail}>
                Category: {business.businessType}
              </Text>
            )}

            <Text style={styles.bookingTotal}>
              {business.totalBookings} bookings
            </Text>

            <View style={styles.bookingStatusRow}>
              <Text style={styles.bookingStatus}>
                Pending: {business.pending}
              </Text>
              <Text style={styles.bookingStatus}>
                Confirmed: {business.confirmed}
              </Text>
            </View>

            <View style={styles.bookingStatusRow}>
              <Text style={styles.bookingStatus}>
                Completed: {business.completed}
              </Text>
              <Text style={styles.bookingStatus}>
                Cancelled: {business.cancelled}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading Admin Panel...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={owners}
        keyExtractor={(item) => item._id}
        renderItem={renderOwner}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAdminData();
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <Text style={styles.eyebrow}>BOOKEASY MANAGEMENT</Text>
                <Text style={styles.title}>Admin Panel</Text>
                <Text style={styles.subtitle}>
                  Manage businesses and booking statistics
                </Text>
              </View>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={logout}
              >
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                label="Total Owners"
                value={overview.totalOwners}
              />
              <StatCard label="Active" value={overview.activeOwners} />
              <StatCard
                label="Suspended"
                value={overview.suspendedOwners}
              />
              <StatCard
                label="Categories"
                value={overview.categories}
              />
            </View>

            {renderBookingStats()}

            <Text style={styles.sectionTitle}>Business Owners</Text>

            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, email, business..."
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={loadAdminData}
            />

            <TouchableOpacity
              style={styles.searchButton}
              onPress={loadAdminData}
            >
              <Text style={styles.searchButtonText}>Search Owners</Text>
            </TouchableOpacity>

            <Text style={styles.resultsText}>
              {owners.length} owner{owners.length === 1 ? "" : "s"} found
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>
              No business owners found
            </Text>
            <Text style={styles.emptyText}>
              Try another search or pull down to refresh.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    color: "#475569",
  },
  listContent: {
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    gap: 10,
  },
  headerInfo: {
    flex: 1,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: "#0f172a",
    fontSize: 29,
    fontWeight: "900",
    marginTop: 5,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 10,
  },
  logoutText: {
    color: "#334155",
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 26,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statValue: {
    fontSize: 27,
    fontWeight: "900",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 5,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#0f172a",
    fontSize: 14,
  },
  searchButton: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
  },
  searchButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  resultsText: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  ownerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  ownerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  ownerInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  ownerName: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeBadge: {
    backgroundColor: "#dcfce7",
  },
  suspendedBadge: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  activeText: {
    color: "#166534",
  },
  suspendedText: {
    color: "#991b1b",
  },
  ownerDetail: {
    fontSize: 13,
    color: "#475569",
    marginTop: 5,
  },
  statusButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },
  suspendButton: {
    backgroundColor: "#dc2626",
  },
  activateButton: {
    backgroundColor: "#15803d",
  },
  disabledButton: {
    opacity: 0.6,
  },
  statusButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyBox: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginTop: 12,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  bookingSection: {
    marginBottom: 28,
  },
  periodButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  periodButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },
  selectedPeriodButton: {
    backgroundColor: "#2563eb",
  },
  periodButtonText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  selectedPeriodButtonText: {
    color: "#ffffff",
  },
  dateLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
  },
  dateInput: {
    marginTop: 8,
  },
  bookingBusinessCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 15,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bookingTotal: {
    color: "#2563eb",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 10,
  },
  bookingStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  bookingStatus: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  bookingLoading: {
    alignItems: "center",
    padding: 18,
    gap: 8,
  },
});
