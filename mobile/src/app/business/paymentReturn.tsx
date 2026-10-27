
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckCircle2, CircleAlert, RefreshCw } from "lucide-react-native";
import API_URL from "../../api";

type VerificationResult = {
  success?: boolean;
  message?: string;
  plan?: string;
  planActivated?: boolean;
  authorizationStatus?: string;
  subscriptionStatus?: string;
  cashfreeSubscriptionStatus?: string;
};

type ScreenStatus = "loading" | "active" | "pending" | "failed";

export default function PaymentReturnScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    subscription_id?: string | string[];
    subscriptionId?: string | string[];
  }>();

  const rawId = params.subscription_id ?? params.subscriptionId;
  const subscriptionId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [screenStatus, setScreenStatus] =
    useState<ScreenStatus>("loading");
  const [message, setMessage] = useState(
    "Verifying your subscription with Cashfree..."
  );
  const [plan, setPlan] = useState("");
  const [checking, setChecking] = useState(false);

  // Prevent overlapping verification requests.
  const requestInProgress = useRef(false);

  const verifySubscription = useCallback(async () => {
    console.log("PAYMENT RETURN: verifySubscription called");
    if (!subscriptionId) {
      setScreenStatus("failed");
      setMessage(
        "The subscription reference is missing. Return to the subscription page and try again."
      );
      return;
    }

    if (requestInProgress.current) return;

    requestInProgress.current = true;
    setChecking(true);
    setScreenStatus("loading");
    setMessage("Verifying your subscription with Cashfree...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        setScreenStatus("failed");
        setMessage(
          "Your login session was not found. Sign in again, then return to the subscription page."
        );
        return;
      }

      console.log("VERIFY: sending request", `${API_URL}/payments/verify-subscription`);
      const response = await fetch(
        `${API_URL}/payments/verify-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscriptionId }),
          signal: controller.signal,
        }
      );
      console.log("VERIFY: response received", response.status);

      const data = (await response.json()) as VerificationResult;
      console.log("VERIFY: response data", JSON.stringify(data));

      if (!response.ok || data.success === false) {
        if (response.status === 401) {
          setScreenStatus("failed");
          setMessage(
            data.message || "Your session has expired. Please sign in again."
          );
          return;
        }

        throw new Error(
          data.message || `Verification failed (HTTP ${response.status}).`
        );
      }

      if (data.plan) {
        setPlan(data.plan);
      }


      // Only the backend can confirm plan activation.
      const authorizationStatus = String(
        data.authorizationStatus || ""
      ).toUpperCase();

      const subscriptionStatus = String(
        data.subscriptionStatus || ""
      ).toUpperCase();

      if (
        authorizationStatus === "ACTIVE" &&
        subscriptionStatus === "ACTIVE" &&
        data.planActivated === true
      ) {
        setScreenStatus("active");

        await AsyncStorage.removeItem(
          "bookeasy_pending_subscription_id"
        );

        setMessage(
          data.message ||
            "Your subscription is active. You can continue to your dashboard."
        );

        // Refresh the cached user plan.
        const cachedUser = await AsyncStorage.getItem("bookeasy_user");

        if (cachedUser) {
          try {
            const user = JSON.parse(cachedUser);

            await AsyncStorage.setItem(
              "bookeasy_user",
              JSON.stringify({
                ...user,
                plan: data.plan || user.plan,
                subscriptionStatus: "ACTIVE",
              })
            );
          } catch (cacheError) {
            console.warn(
              "Could not update cached subscription details:",
              cacheError
            );
          }
        }

        return;
      }

      const cashfreeStatus = String(
        data.cashfreeSubscriptionStatus || ""
      ).toUpperCase();

      const isFailed =
        ["FAILED", "FAILURE"].includes(authorizationStatus) ||
        [
          "FAILED",
          "CANCELLED",
          "CUSTOMER_CANCELLED",
          "EXPIRED",
          "COMPLETED",
          "ON_HOLD",
        ].includes(subscriptionStatus) ||
        [
          "CANCELLED",
          "CUSTOMER_CANCELLED",
          "EXPIRED",
          "COMPLETED",
          "ON_HOLD",
        ].includes(cashfreeStatus);

      if (isFailed) {
        setScreenStatus("failed");
        setMessage(
          data.message ||
            "The subscription is not active. Check the subscription status before trying again."
        );
      } else {
        setScreenStatus("pending");
        setMessage(
          data.message ||
            "Cashfree has not confirmed authorization yet. Please wait briefly and check again."
        );
      }
    } catch (error) {
      setScreenStatus("pending");

      if (error instanceof Error && error.name === "AbortError") {
        setMessage(
          "Verification took too long. Your payment status has not been confirmed by this screen. Check again shortly."
        );
      } else {
        setMessage(
          error instanceof Error
            ? error.message
            : "A network error occurred while verifying your subscription."
        );
      }
    } finally {
      clearTimeout(timeoutId);
      requestInProgress.current = false;
      setChecking(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    void verifySubscription();
  }, [verifySubscription]);

  const isActive = screenStatus === "active";
  const isFailed = screenStatus === "failed";

  console.log("PAYMENT RETURN SCREEN RENDERED", {
  subscriptionId,
  screenStatus,
  checking,
});

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: "Subscription Status",
          headerBackTitle: "Back",
        }}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View
            style={[
              styles.iconCircle,
              isActive && styles.successCircle,
              isFailed && styles.errorCircle,
            ]}
          >
            {screenStatus === "loading" ? (
              <ActivityIndicator size="large" color="#2563eb" />
            ) : isActive ? (
              <CheckCircle2 size={42} color="#15803d" />
            ) : (
              <CircleAlert
                size={42}
                color={isFailed ? "#dc2626" : "#d97706"}
              />
            )}
          </View>

          <Text style={styles.title}>
            {screenStatus === "loading"
              ? "Checking subscription"
              : isActive
                ? "Subscription Active"
                : isFailed
                  ? "Verification Needs Attention"
                  : "Verification Pending"}
          </Text>

          <Text style={styles.description}>{message}</Text>

          {plan ? (
            <View style={styles.planBox}>
              <Text style={styles.planLabel}>Selected plan</Text>
              <Text style={styles.planName}>{plan}</Text>
            </View>
          ) : null}

          <View style={styles.referenceBox}>
            <Text style={styles.referenceLabel}>
              Subscription reference
            </Text>
            <Text selectable style={styles.referenceValue}>
              {subscriptionId || "Not available"}
            </Text>
          </View>

          
{screenStatus !== "active" && (
  <TouchableOpacity
    style={[
      styles.primaryButton,
      checking && styles.disabledButton,
    ]}
    onPress={() => void verifySubscription()}
    disabled={checking}
    activeOpacity={0.8}
  >
    {checking ? (
      <ActivityIndicator color="#ffffff" />
    ) : (
      <>
        <RefreshCw size={18} color="#ffffff" />
        <Text style={styles.primaryButtonText}>Check again</Text>
      </>
    )}
  </TouchableOpacity>
)}


          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/business/dashboard" as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              Go to Business Dashboard
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            Your plan becomes active when the backend confirms subscription
            authorization. This verification does not confirm that a recurring
            subscription charge has been collected.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },
  successCircle: {
    backgroundColor: "#dcfce7",
  },
  errorCircle: {
    backgroundColor: "#fee2e2",
  },
  title: {
    fontSize: 23,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: "#475569",
    textAlign: "center",
    marginBottom: 22,
  },
  planBox: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    marginBottom: 16,
  },
  planLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 5,
  },
  planName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#166534",
  },
  referenceBox: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    marginBottom: 20,
  },
  referenceLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 6,
  },
  referenceValue: {
    fontSize: 12,
    lineHeight: 18,
    color: "#334155",
  },
  primaryButton: {
    width: "100%",
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  secondaryButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748b",
    textAlign: "center",
    marginTop: 20,
  },
});
