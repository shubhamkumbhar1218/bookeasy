
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../../api";

export default function OrderPaymentReturn() {
  const { order_id } = useLocalSearchParams<{
    order_id?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Verifying your payment...");
  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const verifyPayment = async () => {
      try {
        const token = await AsyncStorage.getItem("bookeasy_token");

        if (!token) {
          router.replace("/business/login");
          return;
        }

        const orderId =
          order_id ||
          (await AsyncStorage.getItem("bookeasy_pending_order_id"));

        if (!orderId) {
          throw new Error(
            "Payment order ID was not found. Please refresh your subscription page."
          );
        }

        const response = await fetch(`${API_URL}/payments/verify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId }),
        });

        const result = await response.json();

        if (!response.ok || result.success !== true || result.paid !== true) {
          throw new Error(
            result.message || "Payment has not been confirmed yet."
          );
        }

        await AsyncStorage.removeItem("bookeasy_pending_order_id");

        setVerified(true);
        setMessage(
          result.message || "Your yearly plan is now active."
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to verify your payment.";

        setErrorMessage(message);
        setMessage("We couldn't confirm your payment.");
      } finally {
        setLoading(false);
      }
    };

    void verifyPayment();
  }, [order_id]);

  const goToSubscription = () => {
    router.replace("/business/subscription");
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2F4F43" />
      ) : (
        <Text style={styles.icon}>
          {verified ? "✓" : "!"}
        </Text>
      )}

      <Text style={styles.title}>
        {loading
          ? "Verifying payment"
          : verified
            ? "Payment successful"
            : "Payment verification pending"}
      </Text>

      <Text style={styles.message}>{message}</Text>

      {!loading && !verified && errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : null}

      {!loading ? (
        <TouchableOpacity
          style={styles.button}
          onPress={goToSubscription}
        >
          <Text style={styles.buttonText}>
            {verified ? "View my plan" : "Return to subscription"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F6F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  icon: {
    fontSize: 48,
    fontWeight: "800",
    color: "#2F4F43",
    marginBottom: 16,
  },
  title: {
    color: "#243B35",
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 18,
  },
  message: {
    color: "#64766A",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
    marginTop: 12,
  },
  error: {
    color: "#B91C1C",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },
  button: {
    backgroundColor: "#2F4F43",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 24,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
