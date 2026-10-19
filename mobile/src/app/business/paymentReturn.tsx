
import React, { useCallback, useEffect, useState } from "react";
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

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  "https://bookeasy-backend-ori1.onrender.com/api"
).replace(/\/+$/, "");

type VerificationResult = {
  success?: boolean;
  message?: string;
  status?: string;
  plan?: string;
  planActivated?: boolean;
  authorizationStatus?: string;
  subscriptionStatus?: string;
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

  const verifySubscription = useCallback(async () => {
    if (!subscriptionId) {
      setScreenStatus("failed");
      setMessage(
        "The subscription reference is missing. Return to the subscription page and try again."
      );
      return;
    }

    if (checking) return;

    setChecking(true);
    setScreenStatus("loading");
    setMessage("Verifying your subscription with Cashfree...");

    try {
      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        setScreenStatus("failed");
        setMessage(
          "Your business login session was not found. Please sign in again, then return to the subscription page to verify your payment."
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/payments/verify-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscriptionId }),
        }
      );

      const data: VerificationResult = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to verify the subscription."
        );
      }

      if (data.plan) {
        setPlan(data.plan);
      }

      if (data.planActivated === true) {
        setScreenStatus("active");
        setMessage(
          data.message ||
            "Your subscription is active. You can continue to your business dashboard."
        );

        // Update the locally cached user plan when the API supplies it.
        const cachedUser = await AsyncStorage.getItem("bookeasy_user");

        if (cachedUser && data.plan) {
          try {
            const user = JSON.parse(cachedUser);
            await AsyncStorage.setItem(
              "bookeasy_user",
              JSON.stringify({
                ...user,
                plan: data.plan,
                subscriptionStatus: "ACTIVE",
              })
            );
          } catch {
            // The server remains the source of truth.
          }
        }
      } else {
        const status = String(
          data.subscriptionStatus || data.status || ""
        ).toUpperCase();

        if (
          status.includes("CANCEL") ||
          status.includes("EXPIRED") ||
          status.includes("FAILED")
        ) {
          setScreenStatus("failed");
          setMessage(
            data.message ||
              "The subscription could not be activated. Please check its status or try again."
          );
        } else {
          setScreenStatus("pending");
          setMessage(
            data.message ||
              "Your subscription is still being verified. Please check again in a moment."
          );
        }
      }
    } catch (error) {
      setScreenStatus("pending");
      setMessage(
        error instanceof Error
          ? error.message
          : "A network error occurred while verifying your subscription."
      );
    } finally {
      setChecking(false);
    }
  }, [subscriptionId, checking]);

  useEffect(() => {
    verifySubscription();
    // Verify once when this screen opens. Manual retry uses the same function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId]);

  const isActive = screenStatus === "active";
  const isFailed = screenStatus === "failed";

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

          {!isActive && (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (checking || screenStatus === "loading") &&
                  styles.disabledButton,
              ]}
              onPress={verifySubscription}
              disabled={checking || screenStatus === "loading"}
              activeOpacity={0.8}
            >
              {checking ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <RefreshCw size={18} color="#ffffff" />
                  <Text style={styles.primaryButtonText}>
                    Check again
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/business" as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              Go to Business Dashboard
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            Your plan is activated only when the backend confirms it.
            A UPI mandate authorization alone does not confirm that a
            recurring subscription fee has been collected.
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
