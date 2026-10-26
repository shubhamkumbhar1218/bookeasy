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


type RevenueStats = {
  totalRevenue: number;
  successfulPayments: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
};

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
] as const;

type OwnerStatusFilter = "all" | "active" | "suspended";

const normalizeCategory = (value?: string) =>
  (value || "other")
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ");

const formatCategory = (value?: string) =>
  normalizeCategory(value)
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDate = (value?: string) => {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN");
};


const formatStatus = (value?: string) =>
  value === "PAST_DUE"
    ? "Past Due"
    : value
      ? value.charAt(0) + value.slice(1).toLowerCase()
      : "Active";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;




type SubscriptionPlan = "FREE" | "STARTER" | "BUSINESS" | "PRO";

type SubscriptionStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "EXPIRED"
  | "PAST_DUE";

type SubscriptionBusiness = {
  _id: string;
  name: string;
  email: string;
  businessName: string;
  businessSlug?: string;
  businessType?: string;
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  isActive?: boolean;
  planDetails?: {
    price?: number;
    bookingLimit?: number;
  };
};

type SubscriptionPlanCount = {
  id: SubscriptionPlan;
  name: string;
  price: number;
  bookingLimit: number;
  count: number;
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
const [ownerSearchDraft, setOwnerSearchDraft] = useState("");

const [ownerCategoryFilter, setOwnerCategoryFilter] =
  useState<string>("all");

const [ownerStatusFilter, setOwnerStatusFilter] =
  useState<OwnerStatusFilter>("all");

const [ownerError, setOwnerError] = useState<string | null>(null);
const [bookingError, setBookingError] = useState<string | null>(null);
const [subscriptionError, setSubscriptionError] =
  useState<string | null>(null);

const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [updatingId, setUpdatingId] = useState<string | null>(null);
const [savingOwnerId, setSavingOwnerId] = useState<string | null>(null);


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
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
  totalRevenue: 0,
  successfulPayments: 0,
  monthlyRevenue: 0,
  yearlyRevenue: 0,
});

const [revenueLoading, setRevenueLoading] = useState(false);
const [revenueError, setRevenueError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  
const [subscriptions, setSubscriptions] = useState<
  SubscriptionBusiness[]
>([]);

const [subscriptionPlans, setSubscriptionPlans] = useState<
  SubscriptionPlanCount[]
>([]);

const [subscriptionSearch, setSubscriptionSearch] = useState("");
const [subscriptionPlanFilter, setSubscriptionPlanFilter] =
  useState<SubscriptionPlan | "">("");
const [subscriptionStatusFilter, setSubscriptionStatusFilter] =
  useState<SubscriptionStatus | "">("");

const [subscriptionLoading, setSubscriptionLoading] = useState(false);
const [updatingSubscriptionId, setUpdatingSubscriptionId] =
  useState<string | null>(null);

const [planDrafts, setPlanDrafts] = useState<
  Record<string, SubscriptionPlan>
>({});

const [statusDrafts, setStatusDrafts] = useState<
  Record<string, SubscriptionStatus>
>({});


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

  
  const loadSubscriptions = useCallback(
    async (filters?: {
      search?: string;
      plan?: SubscriptionPlan | "";
      status?: SubscriptionStatus | "";
    }) => {
      setSubscriptionError(null);
setSubscriptionLoading(true);
      try {
        setSubscriptionLoading(true);

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

        const query = new URLSearchParams();

        if (filters?.search?.trim()) {
          query.set("search", filters.search.trim());
        }
        if (filters?.plan) query.set("plan", filters.plan);
        if (filters?.status) query.set("status", filters.status);

        const response = await fetch(
          `${API_URL}/admin/subscriptions?${query.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 401) {
          await AsyncStorage.multiRemove([
            "bookeasy_token",
            "bookeasy_user",
            "bookeasy_role",
          ]);
          router.replace("/business/login");
          return;
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load subscriptions."
          );
        }

        const businesses: SubscriptionBusiness[] =
          data.businesses || [];

        setSubscriptions(businesses);
        setSubscriptionPlans(data.plans || []);


setPlanDrafts((previous) => {
  const next = { ...previous };

  businesses.forEach((business) => {
    if (next[business._id] === undefined) {
      next[business._id] = business.plan || "FREE";
    }
  });

  return next;
});

setStatusDrafts((previous) => {
  const next = { ...previous };

  businesses.forEach((business) => {
    if (next[business._id] === undefined) {
      next[business._id] =
        business.subscriptionStatus || "ACTIVE";
    }
  });

  return next;
});

      } catch (error) {setSubscriptionError(
  getErrorMessage(error, "Unable to load subscriptions.")
);
      } finally {
        setSubscriptionLoading(false);
      }
    },
    []
  );


  const loadRevenueStats = useCallback(async () => {
  setRevenueLoading(true);
  setRevenueError("");

  try {
    const token = await AsyncStorage.getItem("bookeasy_token");

    if (!token) {
      throw new Error("Please log in again.");
    }

    const response = await fetch(`${API_URL}/admin/revenue`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Unable to load revenue.");
    }

    setRevenueStats({
      totalRevenue: Number(data.totalRevenue) || 0,
      successfulPayments: Number(data.successfulPayments) || 0,
      monthlyRevenue: Number(data.monthlyRevenue) || 0,
      yearlyRevenue: Number(data.yearlyRevenue) || 0,
    });
  } catch (error) {
    setRevenueError(
      error instanceof Error
        ? error.message
        : "Unable to load revenue statistics."
    );
  } finally {
    setRevenueLoading(false);
  }
}, []);


  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, [loadAdminData])
  );

  useFocusEffect(
  useCallback(() => {
    loadRevenueStats();
  }, [loadRevenueStats])
);

  
  useFocusEffect(
    useCallback(() => {
      loadSubscriptions();
    }, [loadSubscriptions])
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

  
  const updateSubscription = (business: SubscriptionBusiness) => {
    const plan = planDrafts[business._id] || business.plan || "FREE";
    const subscriptionStatus: SubscriptionStatus =
      plan === "FREE"
        ? "ACTIVE"
        : statusDrafts[business._id] || "ACTIVE";

    Alert.alert(
      "Confirm plan change",
      `Assign ${plan} to ${
        business.businessName || business.name
      }?\n\nThis is a manual admin assignment. No payment will be collected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save Plan",
          onPress: async () => {
            try {
              setUpdatingSubscriptionId(business._id);

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
                `${API_URL}/admin/subscriptions/${business._id}`,
                {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    plan,
                    subscriptionStatus,
                  }),
                }
              );

              if (response.status === 401) {
                await AsyncStorage.multiRemove([
                  "bookeasy_token",
                  "bookeasy_user",
                  "bookeasy_role",
                ]);
                router.replace("/business/login");
                return;
              }

              const data = await response.json().catch(() => ({}));

              if (!response.ok) {
                throw new Error(
                  data.message || "Unable to update subscription."
                );
              }

setPlanDrafts((previous) => ({
  ...previous,
  [business._id]: plan,
}));

setStatusDrafts((previous) => ({
  ...previous,
  [business._id]: subscriptionStatus,
}));

Alert.alert(
  "Success",
  data.message || "Subscription updated successfully."
);

await loadSubscriptions({
  search: subscriptionSearch,
  plan: subscriptionPlanFilter,
  status: subscriptionStatusFilter,
});
            } catch (error) {
              Alert.alert(
                "Update failed",
                error instanceof Error
                  ? error.message
                  : "Unable to update subscription."
              );
            } finally {
              setUpdatingSubscriptionId(null);
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

  
const filteredOwners = owners.filter((owner) => {
  const categoryMatches =
    ownerCategoryFilter === "all" ||
    normalizeCategory(owner.businessType) === ownerCategoryFilter;

  const statusMatches =
    ownerStatusFilter === "all" ||
    (ownerStatusFilter === "active"
      ? owner.isActive !== false
      : owner.isActive === false);

  return categoryMatches && statusMatches;
});


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

<Text style={styles.ownerDetail}>
  Category: {formatCategory(item.businessType)}
</Text>

<Text style={styles.ownerDetail}>
  Registered: {formatDate(item.createdAt)}
</Text>

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

  
  const renderSubscriptions = () => {
    const planOptions: SubscriptionPlan[] = [
      "FREE",
      "STARTER",
      "BUSINESS",
      "PRO",
    ];

    const statusOptions: SubscriptionStatus[] = [
      "ACTIVE",
      "CANCELLED",
      "EXPIRED",
      "PAST_DUE",
    ];

    const formatDate = (date?: string) =>
      date ? new Date(date).toLocaleDateString("en-IN") : "—";

    return (
      <View style={styles.subscriptionSection}>
        <Text style={styles.sectionTitle}>Subscription Management</Text>
        <Text style={styles.subtitle}>
          View business plans and manually manage subscription access.
          Plan changes do not process payments.
        </Text>

        {subscriptionError && (
  <View style={styles.errorBox}>
    <Text style={styles.errorText}>{subscriptionError}</Text>

    <TouchableOpacity
      onPress={() =>
        loadSubscriptions({
          search: subscriptionSearch,
          plan: subscriptionPlanFilter,
          status: subscriptionStatusFilter,
        })
      }
    >
      <Text style={styles.retryText}>Try Again</Text>
    </TouchableOpacity>
  </View>
)}

        <View style={styles.subscriptionPlanGrid}>
          {subscriptionPlans.map((plan) => (
            <View key={plan.id} style={styles.subscriptionPlanCard}>
              <Text style={styles.subscriptionPlanName}>{plan.name}</Text>
<Text style={styles.subscriptionPlanPrice}>
  {plan.id === "FREE"
    ? "₹0"
    : plan.id === "STARTER"
      ? "₹299/mo"
      : `₹${plan.price}/mo`}
</Text>

{plan.id === "STARTER" && (
  <Text style={styles.ownerDetail}>
    ₹2,990/year
  </Text>
)}
              <Text style={styles.ownerDetail}>
                {plan.count} business{plan.count === 1 ? "" : "es"}
              </Text>
            </View>
          ))}
        </View>

        <TextInput
          style={styles.searchInput}
          value={subscriptionSearch}
          onChangeText={setSubscriptionSearch}
          placeholder="Search business, owner or email..."
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() =>
            loadSubscriptions({
              search: subscriptionSearch,
              plan: subscriptionPlanFilter,
              status: subscriptionStatusFilter,
            })
          }
        />

        <Text style={styles.filterLabel}>Filter by plan</Text>
        <View style={styles.periodButtons}>
          {(["", "FREE", "STARTER", "BUSINESS", "PRO"] as const).map(
            (plan) => (
              <TouchableOpacity
                key={plan || "ALL_PLANS"}
                style={[
                  styles.periodButton,
                  subscriptionPlanFilter === plan &&
                    styles.selectedPeriodButton,
                ]}
                onPress={() => setSubscriptionPlanFilter(plan)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    subscriptionPlanFilter === plan &&
                      styles.selectedPeriodButtonText,
                  ]}
                >
                  {plan || "All"}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        <Text style={styles.filterLabel}>Filter by status</Text>
        <View style={styles.periodButtons}>
          {(["", ...statusOptions] as const).map((status) => (
            <TouchableOpacity
              key={status || "ALL_STATUSES"}
              style={[
                styles.periodButton,
                subscriptionStatusFilter === status &&
                  styles.selectedPeriodButton,
              ]}
              onPress={() => setSubscriptionStatusFilter(status)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  subscriptionStatusFilter === status &&
                    styles.selectedPeriodButtonText,
                ]}
              >
                {status || "All"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          disabled={subscriptionLoading}
          onPress={() =>
            loadSubscriptions({
              search: subscriptionSearch,
              plan: subscriptionPlanFilter,
              status: subscriptionStatusFilter,
            })
          }
        >
          <Text style={styles.searchButtonText}>
            {subscriptionLoading ? "Loading..." : "Search Subscriptions"}
          </Text>
        </TouchableOpacity>

        {subscriptionLoading ? (
          <ActivityIndicator
            style={{ marginTop: 20 }}
            size="large"
            color="#2563eb"
          />
        ) : subscriptions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No subscriptions found</Text>
            <Text style={styles.emptyText}>
              Try changing the search or filters.
            </Text>
          </View>
        ) : (
          subscriptions.map((business) => {
            const selectedPlan =
              planDrafts[business._id] || business.plan || "FREE";

            const selectedStatus =
              statusDrafts[business._id] ||
              business.subscriptionStatus ||
              "ACTIVE";

            const effectiveStatus: SubscriptionStatus =
  selectedPlan === "FREE"
    ? "ACTIVE"
    : selectedStatus;

const hasUnsavedChanges =
  selectedPlan !== (business.plan || "FREE") ||
  effectiveStatus !== (business.subscriptionStatus || "ACTIVE");

            const updating =
              updatingSubscriptionId === business._id;

            return (
              <View
                key={business._id}
                style={styles.subscriptionBusinessCard}
              >
                <Text style={styles.businessName}>
                  {business.businessName || "Unnamed Business"}
                </Text>

                <Text style={styles.ownerDetail}>{business.name}</Text>
                <Text style={styles.ownerDetail}>{business.email}</Text>

                <View style={styles.subscriptionInfoRow}>
                  <Text style={styles.subscriptionInfoLabel}>
                    Current plan
                  </Text>
                  <Text style={styles.subscriptionInfoValue}>
                    {business.plan || "FREE"}
                    {" · "}
                    {business.planDetails?.price === 0
                      ? "₹0"
                      : `₹${business.planDetails?.price ?? "—"}/month`}
                  </Text>
                </View>

                <View style={styles.subscriptionInfoRow}>
                  <Text style={styles.subscriptionInfoLabel}>
                    Status
                  </Text>
                  <Text style={styles.subscriptionInfoValue}>
                    {business.subscriptionStatus || "ACTIVE"}
                  </Text>
                </View>

                <View style={styles.subscriptionInfoRow}>
                  <Text style={styles.subscriptionInfoLabel}>
                    Start date
                  </Text>
                  <Text style={styles.subscriptionInfoValue}>
                    {formatDate(business.subscriptionStartDate)}
                  </Text>
                </View>

                <View style={styles.subscriptionInfoRow}>
                  <Text style={styles.subscriptionInfoLabel}>
                    Expiry date
                  </Text>
                  <Text style={styles.subscriptionInfoValue}>
                    {formatDate(business.subscriptionEndDate)}
                  </Text>
                </View>

                <Text style={styles.filterLabel}>Assign plan</Text>
                <View style={styles.periodButtons}>
                  {planOptions.map((plan) => (
                    <TouchableOpacity
                      key={plan}
                      style={[
                        styles.periodButton,
                        selectedPlan === plan &&
                          styles.selectedPeriodButton,
                      ]}
                      onPress={() => {
                        setPlanDrafts((previous) => ({
                          ...previous,
                          [business._id]: plan,
                        }));

                        if (plan === "FREE") {
                          setStatusDrafts((previous) => ({
                            ...previous,
                            [business._id]: "ACTIVE",
                          }));
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.periodButtonText,
                          selectedPlan === plan &&
                            styles.selectedPeriodButtonText,
                        ]}
                      >
                        {plan}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedPlan !== "FREE" && (
                  <>
                    <Text style={styles.filterLabel}>
                      Subscription status
                    </Text>
                    <View style={styles.periodButtons}>
                      {statusOptions.map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.periodButton,
                            selectedStatus === status &&
                              styles.selectedPeriodButton,
                          ]}
                          onPress={() =>
                            setStatusDrafts((previous) => ({
                              ...previous,
                              [business._id]: status,
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.periodButtonText,
                              selectedStatus === status &&
                                styles.selectedPeriodButtonText,
                            ]}
                          >
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

<TouchableOpacity
  style={[
    styles.statusButton,
    styles.subscriptionSaveButton,
    (!hasUnsavedChanges || updating) && styles.disabledButton,
  ]}
  disabled={!hasUnsavedChanges || updating}
  onPress={() => updateSubscription(business)}
>
  {updating ? (
    <ActivityIndicator color="#ffffff" />
  ) : (
    <Text style={styles.statusButtonText}>
      {hasUnsavedChanges ? "Save Changes" : "No Changes"}
    </Text>
  )}
</TouchableOpacity>
              </View>
            );
          })
        )}
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
        data={filteredOwners}
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

  <StatCard
    label="Active"
    value={overview.activeOwners}
  />

  <StatCard
    label="Suspended"
    value={overview.suspendedOwners}
  />

  <StatCard
    label="Categories"
    value={overview.categories}
  />

  <StatCard
    label="Total Bookings"
    value={totalBookings}
  />

  <View style={styles.statCard}>
    <Text style={styles.statValue}>
      {revenueLoading
        ? "..."
        : `₹${revenueStats.totalRevenue.toLocaleString("en-IN")}`}
    </Text>

    <Text style={styles.statLabel}>
      Total BookEasy Revenue
    </Text>

    <Text style={styles.ownerDetail}>
      {revenueStats.successfulPayments} successful payments
    </Text>

    {revenueError !== "" && (
      <TouchableOpacity onPress={loadRevenueStats}>
        <Text style={styles.retryText}>Retry revenue</Text>
      </TouchableOpacity>
    )}
  </View>
</View>


<View style={styles.revenueBreakdown}>
  <View style={styles.revenueItem}>
    <Text style={styles.ownerDetail}>Monthly revenue</Text>
    <Text style={styles.revenueValue}>
      {revenueLoading
        ? "Loading..."
        : `₹${revenueStats.monthlyRevenue.toLocaleString("en-IN")}`}
    </Text>
  </View>

  <View style={styles.revenueItem}>
    <Text style={styles.ownerDetail}>Yearly revenue</Text>
    <Text style={styles.revenueValue}>
      {revenueLoading
        ? "Loading..."
        : `₹${revenueStats.yearlyRevenue.toLocaleString("en-IN")}`}
    </Text>
  </View>
</View>

            {renderBookingStats()}

            {renderSubscriptions()}

            
<Text style={styles.filterLabel}>Filter by category</Text>

<View style={styles.periodButtons}>
  <TouchableOpacity
    style={[
      styles.periodButton,
      ownerCategoryFilter === "all" && styles.selectedPeriodButton,
    ]}
    onPress={() => setOwnerCategoryFilter("all")}
  >
    <Text
      style={[
        styles.periodButtonText,
        ownerCategoryFilter === "all" &&
          styles.selectedPeriodButtonText,
      ]}
    >
      All Categories
    </Text>
  </TouchableOpacity>

  {BUSINESS_CATEGORIES.map((category) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.periodButton,
        ownerCategoryFilter === category &&
          styles.selectedPeriodButton,
      ]}
      onPress={() => setOwnerCategoryFilter(category)}
    >
      <Text
        style={[
          styles.periodButtonText,
          ownerCategoryFilter === category &&
            styles.selectedPeriodButtonText,
        ]}
      >
        {formatCategory(category)}
      </Text>
    </TouchableOpacity>
  ))}
</View>

<Text style={styles.filterLabel}>Filter by account status</Text>

<View style={styles.periodButtons}>
  {(
    [
      { label: "All", value: "all" },
      { label: "Active", value: "active" },
      { label: "Suspended", value: "suspended" },
    ] as const
  ).map((option) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.periodButton,
        ownerStatusFilter === option.value &&
          styles.selectedPeriodButton,
      ]}
      onPress={() => setOwnerStatusFilter(option.value)}
    >
      <Text
        style={[
          styles.periodButtonText,
          ownerStatusFilter === option.value &&
            styles.selectedPeriodButtonText,
        ]}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  ))}
</View>


            <Text style={styles.sectionTitle}>Business Owners</Text>


<TextInput
  style={styles.searchInput}
  value={ownerSearchDraft}
  onChangeText={setOwnerSearchDraft}
  placeholder="Search name, email, business..."
  placeholderTextColor="#9ca3af"
  autoCapitalize="none"
  autoCorrect={false}
  returnKeyType="search"
  onSubmitEditing={() => {
    setSearch(ownerSearchDraft.trim());
  }}
/>

<TouchableOpacity
  style={[
    styles.searchButton,
    loading && styles.disabledButton,
  ]}
  disabled={loading}
  onPress={() => {
    setSearch(ownerSearchDraft.trim());
  }}
>
  <Text style={styles.searchButtonText}>Search Owners</Text>
</TouchableOpacity>


<Text style={styles.resultsText}>
  {filteredOwners.length} owner
  {filteredOwners.length === 1 ? "" : "s"} shown
  {" · "}
  {owners.length} loaded
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

  
  subscriptionSection: {
    marginBottom: 28,
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  subscriptionPlanGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
    marginBottom: 18,
  },
  subscriptionPlanCard: {
    flexGrow: 1,
    flexBasis: "40%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  subscriptionPlanName: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
  },
  subscriptionPlanPrice: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "900",
    marginVertical: 6,
  },
  subscriptionBusinessCard: {
    backgroundColor: "#ffffff",
    borderRadius: 13,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  subscriptionInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
  },
  subscriptionInfoLabel: {
    color: "#64748b",
    fontSize: 12,
    flex: 1,
  },
  subscriptionInfoValue: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  filterLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 7,
  },
  subscriptionSaveButton: {
    backgroundColor: "#2563eb",
  },

  unsavedChangesText: {
  color: "#b45309",
  backgroundColor: "#fef3c7",
  alignSelf: "flex-start",
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 8,
  fontSize: 11,
  fontWeight: "800",
  marginTop: 10,
},


errorBox: {
  backgroundColor: "#fef2f2",
  borderWidth: 1,
  borderColor: "#fecaca",
  borderRadius: 10,
  padding: 12,
  marginTop: 10,
},
errorText: {
  color: "#b91c1c",
  fontSize: 13,
},
retryText: {
  color: "#1d4ed8",
  fontWeight: "800",
  marginTop: 8,
},

revenueBreakdown: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 24,
},
revenueItem: {
  flex: 1,
  minWidth: 140,
  backgroundColor: "#ffffff",
  borderRadius: 14,
  padding: 14,
  borderWidth: 1,
  borderColor: "#e2e8f0",
},
revenueValue: {
  fontSize: 20,
  fontWeight: "900",
  color: "#0f172a",
  marginTop: 6,
},

});
