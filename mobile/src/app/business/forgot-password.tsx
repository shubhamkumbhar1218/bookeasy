import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import API_URL from "../../api";

export default function BusinessForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Required",
        "Please enter your business email."
      );
      return;
    }

    try {
      setLoading(true);

      const url = `${API_URL}/auth/forgot-password`;

      console.log("FORGOT PASSWORD URL:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      console.log(
        "FORGOT PASSWORD STATUS:",
        response.status
      );

      console.log(
        "FORGOT PASSWORD RESPONSE:",
        data
      );

      if (!response.ok) {
        Alert.alert(
          "Request failed",
          data.message ||
            "Could not send password reset email."
        );
        return;
      }

      Alert.alert(
        "Email Sent",
        "If an account exists with this email, a password reset link has been sent.",
        [
          {
            text: "Back to Login",
            onPress: () => {
              router.replace("/business/login");
            },
          },
        ]
      );
    } catch (error) {
      console.log(
        "FORGOT PASSWORD ERROR:",
        error
      );

      Alert.alert(
        "Connection error",
        "Could not connect to the BookEasy server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Forgot Password?
      </Text>

      <Text style={styles.subtitle}>
        Enter your business email and we will send you
        a password reset link.
      </Text>

      <Text style={styles.label}>
        Business Email
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity
        style={[
          styles.button,
          loading && styles.disabledButton,
        ]}
        onPress={handleForgotPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>
            Send Reset Link
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          router.replace("/business/login")
        }
      >
        <Text style={styles.backText}>
          ← Back to Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 24,
    justifyContent: "center",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
  },

  input: {
    height: 52,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#111827",
    marginBottom: 20,
  },

  button: {
    height: 52,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  backButton: {
    marginTop: 20,
    alignItems: "center",
  },

  backText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "700",
  },
});