import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../../api";
import RazorpayCheckout from "react-native-razorpay";

type Plan = {
  id: string;
  name: string;
  price: number;
  bookingLimit: number | null;
  features: string[];
};

type SubscriptionData = {
  plan: string;
  planName: string;
  price: number;
  subscriptionStatus: string;
  subscriptionStartDate?: string | null;
subscriptionEndDate?: string | null;
subscriptionBillingMode?: string;
subscriptionNextBillingDate?: string | null;
subscriptionLastPaymentAt?: string | null;
cashfreeSubscriptionStatus?: string | null;
  usage: {
    bookingsUsed: number;
    bookingLimit: number | null;
    unlimited: boolean;
    remaining: number | null;
    resetsAt: string;
  };
  features: string[];
  availablePlans: Plan[];
};

const featureLabels: Record<string, string> = {
  booking_link: "Online booking link",
  basic_bookings: "Basic appointment management",
  basic_dashboard: "Business dashboard",
  basic_notifications: "Booking notifications",
  unlimited_bookings: "Unlimited bookings",
  customer_management: "Customer management",
  reviews: "Customer reviews",
  analytics: "Business analytics",
  qr_code: "Booking QR code",
  whatsapp_automation: "WhatsApp automation",
  automated_reminders: "Automated reminders",
  advanced_analytics: "Advanced analytics",
  payment_features: "Payment features",
  multiple_branches: "Multiple branches",
  advanced_marketing: "Advanced marketing",
  loyalty_program: "Loyalty program",
  advanced_reports: "Advanced reports",
  advanced_automation: "Advanced automation",
};



function formatSubscriptionDate(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}


export default function BusinessSubscription() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
  "yearly"
);



  const loadSubscription = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        router.replace("/business/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/business/subscription/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

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
          result.message || "Unable to load subscription."
        );
      }

      setData(result);
    } catch (error) {
      console.log("Subscription loading error:", error);
      Alert.alert(
        "Subscription",
        error instanceof Error
          ? error.message
          : "Unable to load subscription. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSubscription();
    }, [loadSubscription])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void loadSubscription();
  };



  const handleUpgrade = async (plan: Plan) => {
    if (upgradingPlan) return;

    if (plan.price <= 0) {
      Alert.alert("Plan", "This plan does not require a payment.");
      return;
    }

    if (plan.id !== "STARTER") {
      Alert.alert(
        "Plan unavailable",
        "Razorpay checkout currently supports the STARTER plan only."
      );
      return;
    }

    const selectedBillingPeriod = billingPeriod;
    setUpgradingPlan(plan.id);

    const pendingKeys = [
      "bookeasy_pending_order_id",
      "bookeasy_razorpay_order_id",
      "bookeasy_razorpay_payment_id",
      "bookeasy_razorpay_signature",
    ];

    try {
      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        router.replace("/business/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/payments/razorpay/create-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan: "STARTER",
            billingPeriod: selectedBillingPeriod,
          }),
        }
      );

      const result = await response.json();

      console.log("Razorpay create-order response:", {
  success: result.success,
  keyPrefix: String(result.keyId || "").slice(0, 8),
  hasOrderId: Boolean(result.razorpayOrderId),
  amount: result.amount,
  currency: result.currency,
  message: result.message,
}); 
      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to create a Razorpay order."
        );
      }

      if (
        !result.orderId ||
        !result.razorpayOrderId ||
        !result.keyId ||
        !Number.isFinite(result.amount) ||
        result.amount <= 0
      ) {
        throw new Error("The server returned an invalid Razorpay order.");
      }

      // Save the internal BookEasy order ID before opening checkout.
      await AsyncStorage.multiRemove(pendingKeys);
      await AsyncStorage.setItem(
        "bookeasy_pending_order_id",
        result.orderId
      );

      if (
  !RazorpayCheckout ||
  typeof RazorpayCheckout.open !== "function"
) {
  throw new Error(
    "Razorpay native checkout is unavailable in this app build. " +
    "Please install a development build containing the Razorpay native module."
  );
}

      const paymentData = await RazorpayCheckout.open({
        description: `BookEasy STARTER ${selectedBillingPeriod} plan`,
        name: "BookEasy",
        currency: result.currency || "INR",
        key: result.keyId,
        amount: result.amount,
        order_id: result.razorpayOrderId,
        prefill: {},
        theme: { color: "#2F4F43" },
      });

      if (
        !paymentData.razorpay_order_id ||
        !paymentData.razorpay_payment_id ||
        !paymentData.razorpay_signature
      ) {
        throw new Error(
          "Razorpay did not return all payment verification details."
        );
      }

      await AsyncStorage.multiSet([
        ["bookeasy_razorpay_order_id", paymentData.razorpay_order_id],
        ["bookeasy_razorpay_payment_id", paymentData.razorpay_payment_id],
        ["bookeasy_razorpay_signature", paymentData.razorpay_signature],
      ]);

      router.replace({
        pathname: "/business/orderPaymentReturn",
        params: { order_id: result.orderId },
      });
    } catch (error: unknown) {
      // A user closing checkout is not proof of payment failure.
      const message =
        error instanceof Error
          ? error.message
          : "Checkout was not completed.";

      console.log("Razorpay checkout result:", message);

      Alert.alert(
        "Razorpay checkout",
        message || "Checkout was closed or could not be completed."
      );
    } finally {
      setUpgradingPlan(null);
    }
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F4F43" />
        <Text style={styles.muted}>Loading subscription...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.heading}>Unable to load subscription</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setLoading(true);
            void loadSubscription();
          }}
        >
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const usage = data.usage;
  const usagePercent =
    usage.unlimited || !usage.bookingLimit
      ? 0
      : Math.min(
          100,
          (usage.bookingsUsed / usage.bookingLimit) * 100
        );

    
  const isFreePlan = data.plan === "FREE";

  const hasBookingLimit =
    isFreePlan &&
    !usage.unlimited &&
    usage.bookingLimit != null &&
    usage.bookingLimit > 0;

  const limitReached =
    hasBookingLimit &&
    usage.bookingsUsed >= usage.bookingLimit!;

  const approachingLimit =
    hasBookingLimit &&
    usage.bookingsUsed >= Math.ceil(usage.bookingLimit! * 0.8) &&
    usage.bookingsUsed < usage.bookingLimit!;



  const resetDate = usage.resetsAt
    ? new Date(usage.resetsAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "Not available";


  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backCircle}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backCircleText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.heading}>Subscription</Text>
            <Text style={styles.muted}>
              Manage your BookEasy plan
            </Text>
          </View>
          <Text style={styles.crown}>*</Text>
        </View>

        <View style={styles.currentCard}>
          <Text style={styles.eyebrow}>YOUR CURRENT PLAN</Text>
          <View style={styles.currentPlanRow}>
            <View style={styles.planTitleContainer}>
              <Text style={styles.currentPlanName}>
                {data.planName || data.plan}
              </Text>
              <Text style={styles.status}>
                Status: {data.subscriptionStatus || "ACTIVE"}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>
                Rs.{data.price}
              </Text>
              <Text style={styles.pricePeriod}>
                {data.price === 0 ? "forever" : "/ month"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          
<View style={{ marginBottom: 16 }}>
  <Text style={styles.usageTitle}>Plan started</Text>
  <Text style={styles.resetText}>
    {formatSubscriptionDate(data.subscriptionStartDate)}
  </Text>

  <Text style={[styles.usageTitle, { marginTop: 12 }]}>
    Plan expiry
  </Text>
  <Text style={styles.resetText}>
    {formatSubscriptionDate(data.subscriptionEndDate)}
  </Text>

  <Text style={[styles.usageTitle, { marginTop: 12 }]}>
    Billing
  </Text>
  <Text style={styles.resetText}>
    {data.subscriptionBillingMode === "AUTOMATIC"
      ? "Automatic monthly renewal"
      : "Manual payment"}
  </Text>

  {data.subscriptionBillingMode === "AUTOMATIC" &&
  data.subscriptionNextBillingDate ? (
    <>
      <Text style={[styles.usageTitle, { marginTop: 12 }]}>
        Next billing date
      </Text>
      <Text style={styles.resetText}>
        {formatSubscriptionDate(data.subscriptionNextBillingDate)}
      </Text>
    </>
  ) : null}

  {data.subscriptionLastPaymentAt ? (
    <>
      <Text style={[styles.usageTitle, { marginTop: 12 }]}>
        Last successful payment
      </Text>
      <Text style={styles.resetText}>
        {formatSubscriptionDate(data.subscriptionLastPaymentAt)}
      </Text>
    </>
  ) : null}
</View>


          <Text style={styles.usageTitle}>Monthly booking usage</Text>
          <Text style={styles.usageCount}>
            {usage.bookingsUsed}{" "}
            <Text style={styles.usageTotal}>
              {usage.unlimited || !usage.bookingLimit
                ? "bookings used - Unlimited"
                : `of ${usage.bookingLimit} bookings`}
            </Text>
          </Text>

          {!usage.unlimited && usage.bookingLimit ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${usagePercent}%` },
                ]}
              />
            </View>
          ) : null}

          
          <Text style={styles.resetText}>
            {usage.unlimited || !usage.bookingLimit
              ? "Your plan includes unlimited bookings."
              : `${usage.remaining ?? 0} bookings remaining - Resets ${resetDate}`}
          </Text>

          {limitReached ? (
            <View
              accessibilityRole="alert"
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#fecaca",
                backgroundColor: "#fef2f2",
              }}
            >
              <Text
                style={{
                  color: "#991b1b",
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 6,
                }}
              >
                Monthly booking limit reached
              </Text>
              <Text style={{ color: "#991b1b", lineHeight: 21 }}>
                You've used {usage.bookingsUsed} of {usage.bookingLimit} bookings
                this month. Review the plans below to find an option for your
                business. New bookings remain blocked until the limit resets
                or your plan changes.
              </Text>
            </View>
          ) : null}

          {approachingLimit ? (
            <View
              accessibilityRole="alert"
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#fde68a",
                backgroundColor: "#fffbeb",
              }}
            >
              <Text
                style={{
                  color: "#92400e",
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 6,
                }}
              >
                You're approaching your monthly limit
              </Text>
              <Text style={{ color: "#92400e", lineHeight: 21 }}>
                You've used {usage.bookingsUsed} of {usage.bookingLimit} bookings.
                You have {usage.remaining ?? 0} bookings remaining. Review the
                plans below if your business needs more.
              </Text>
            </View>
          ) : null}
        </View>


        <Text style={styles.sectionHeading}>Choose your plan</Text>
        <Text style={styles.sectionDescription}>
          Find the right plan for your business.
        </Text>

        
<View style={styles.billingToggle}>
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{ selected: billingPeriod === "monthly" }}
    style={[
      styles.billingOption,
      billingPeriod === "monthly" && styles.billingOptionSelected,
    ]}
    onPress={() => setBillingPeriod("monthly")}
  >
    <Text
      style={[
        styles.billingOptionText,
        billingPeriod === "monthly" && styles.billingOptionTextSelected,
      ]}
    >
      Monthly
    </Text>
    <Text style={styles.billingPrice}>Rs. 299/month</Text>
  </TouchableOpacity>

  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{ selected: billingPeriod === "yearly" }}
    style={[
      styles.billingOption,
      billingPeriod === "yearly" && styles.billingOptionSelected,
    ]}
    onPress={() => setBillingPeriod("yearly")}
  >
    <Text
      style={[
        styles.billingOptionText,
        billingPeriod === "yearly" && styles.billingOptionTextSelected,
      ]}
    >
      Yearly
    </Text>
    <Text style={styles.billingPrice}>Rs. 2,990/year</Text>
    <Text style={styles.savingsBadge}>SAVE Rs. 598 - 16.7% OFF</Text>
  </TouchableOpacity>
</View>


        {/* {data.availablePlans?.map((plan) => { */}

{data.availablePlans
  ?.filter((plan) =>
    ["FREE", "STARTER"].includes(
      String(plan.id).toUpperCase()
    )
  )
  .map((plan) => {

          const isCurrent = plan.id === data.plan;

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                isCurrent && styles.selectedPlanCard,
              ]}
            >
              <View style={styles.planHeader}>
                <View style={styles.planTitleContainer}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {isCurrent ? (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>
                        CURRENT PLAN
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.priceContainer}>
                  
<Text style={styles.planPrice}>
  Rs.{plan.id === "STARTER" && billingPeriod === "yearly"
    ? "2,990"
    : plan.price}
</Text>

<Text style={styles.pricePeriod}>
  {plan.price === 0
    ? "forever"
    : plan.id === "STARTER" && billingPeriod === "yearly"
      ? "/ year"
      : "/ month"}
</Text>

{plan.id === "STARTER" && billingPeriod === "yearly" ? (
  <Text style={styles.savingsBadge}>Save Rs.598 - 16.7% off</Text>
) : null}

                </View>
              </View>

              <Text style={styles.bookingLimit}>
                {plan.bookingLimit == null
                  ? "Unlimited bookings"
                  : `${plan.bookingLimit} bookings per month`}
              </Text>

              {(plan.features || []).map((feature) => (
                <View style={styles.featureRow} key={feature}>
                  <Text style={styles.check}>✓</Text>
                  <Text style={styles.featureText}>
                    {featureLabels[feature] || feature.replace(/_/g, " ")}
                  </Text>
                </View>
              ))}

              {isCurrent ? (
                <View style={styles.currentPlanButton}>
                  <Text style={styles.currentPlanButtonText}>
                    Your Current Plan
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
  style={[
    styles.upgradeButton,
    upgradingPlan !== null && { opacity: 0.6 },
  ]}
  activeOpacity={0.8}
  disabled={upgradingPlan !== null}
  onPress={() => void handleUpgrade(plan)}
>
  {upgradingPlan === plan.id ? (
    <ActivityIndicator color="#FFFFFF" />
  ) : (
    <Text style={styles.upgradeButtonText}>
      Upgrade to {plan.name}
    </Text>
  )}
</TouchableOpacity>
              )}
            </View>
          );
        })}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Secure subscription checkout</Text>
<Text style={styles.noteText}>
  Complete your payment securely through Razorpay. Your plan will
  update after BookEasy verifies the payment.
</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F6F0",
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F7F6F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    gap: 12,
  },
  backCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9F0E8",
  },
backCircleText: {
  fontSize: 12,
  fontWeight: "700",
  color: "#243B35",
},
  headerText: {
    flex: 1,
  },
  heading: {
    color: "#243B35",
    fontSize: 22,
    fontWeight: "800",
  },
  muted: {
    color: "#64766A",
    fontSize: 13,
    marginTop: 5,
  },
  crown: {
    fontSize: 27,
  },
  currentCard: {
    backgroundColor: "#243B35",
    padding: 20,
    borderRadius: 22,
    marginBottom: 28,
  },
  eyebrow: {
    color: "#D7E2D9",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  currentPlanRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  planTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  currentPlanName: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },
  status: {
    color: "#CDE9D2",
    fontSize: 12,
    marginTop: 6,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  currentPrice: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
  },
  pricePeriod: {
    color: "#64766A",
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#49675A",
    marginVertical: 18,
  },
  usageTitle: {
    color: "#D7E2D9",
    fontSize: 13,
    fontWeight: "600",
  },
  usageCount: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 7,
  },
  usageTotal: {
    color: "#D7E2D9",
    fontSize: 13,
    fontWeight: "500",
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "#49675A",
    overflow: "hidden",
    marginTop: 14,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#B9D6B5",
    borderRadius: 8,
  },
  resetText: {
    color: "#D7E2D9",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  sectionHeading: {
    color: "#243B35",
    fontSize: 20,
    fontWeight: "800",
  },
  sectionDescription: {
    color: "#64766A",
    fontSize: 13,
    marginTop: 5,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7DF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  selectedPlanCard: {
    borderColor: "#2F4F43",
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planName: {
    color: "#243B35",
    fontSize: 20,
    fontWeight: "800",
  },
  currentBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E9F0E8",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 7,
  },
  currentBadgeText: {
    color: "#2F4F43",
    fontSize: 9,
    fontWeight: "800",
  },
  planPrice: {
    color: "#243B35",
    fontSize: 23,
    fontWeight: "800",
  },
  bookingLimit: {
    color: "#64766A",
    fontSize: 12,
    marginTop: 12,
    marginBottom: 13,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  check: {
    color: "#2F7D52",
    fontSize: 16,
    fontWeight: "800",
    marginRight: 9,
  },
  featureText: {
    flex: 1,
    color: "#46584F",
    fontSize: 13,
    lineHeight: 19,
    textTransform: "capitalize",
  },
  currentPlanButton: {
    backgroundColor: "#E9F0E8",
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    marginTop: 10,
  },
  currentPlanButtonText: {
    color: "#2F4F43",
    fontSize: 13,
    fontWeight: "800",
  },
  upgradeButton: {
    backgroundColor: "#2F4F43",
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    marginTop: 10,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  noteCard: {
    backgroundColor: "#E9F0E8",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  noteTitle: {
    color: "#243B35",
    fontSize: 14,
    fontWeight: "800",
  },
  noteText: {
    color: "#64766A",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: "#2F4F43",
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  backButton: {
    padding: 12,
    marginTop: 4,
  },
  backText: {
    color: "#2F4F43",
    fontWeight: "700",
  },

  
billingToggle: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 18,
},
billingOption: {
  flex: 1,
  padding: 14,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#E5E7DF",
  backgroundColor: "#FFFFFF",
  alignItems: "center",
  justifyContent: "center",
},
billingOptionSelected: {
  borderColor: "#2F4F43",
  borderWidth: 2,
  backgroundColor: "#E9F0E8",
},
billingOptionText: {
  color: "#64766A",
  fontSize: 14,
  fontWeight: "700",
},
billingOptionTextSelected: {
  color: "#243B35",
},
billingPrice: {
  color: "#243B35",
  fontSize: 13,
  fontWeight: "800",
  marginTop: 5,
},
savingsBadge: {
  color: "#166534",
  backgroundColor: "#DCFCE7",
  fontSize: 9,
  fontWeight: "800",
  paddingHorizontal: 7,
  paddingVertical: 5,
  borderRadius: 8,
  overflow: "hidden",
  marginTop: 8,
  textAlign: "center",
},


});

