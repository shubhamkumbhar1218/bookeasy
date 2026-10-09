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
import { router, useLocalSearchParams } from "expo-router";

import API_URL from "../../../api";

export default function BusinessResetPassword() {
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Required", "Please enter both passwords.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Invalid Password",
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Error", "Passwords do not match.");
      return;
    }

    if (!token) {
      Alert.alert(
        "Invalid Link",
        "The password reset link is invalid."
      );
      return;
    }

    try {
      setLoading(true);

      const url = `${API_URL}/auth/reset-password/${token}`;

      console.log("RESET PASSWORD URL:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });

      const data = await response.json();

      console.log("RESET PASSWORD STATUS:", response.status);
      console.log("RESET PASSWORD RESPONSE:", data);

      if (!response.ok) {
        Alert.alert(
          "Reset Failed",
          data.message || "Unable to reset password."
        );
        return;
      }

      Alert.alert(
        "Success",
        "Your password has been reset successfully.",
        [
          {
            text: "Go to Login",
            onPress: () => {
              router.replace("/business/login");
            },
          },
        ]
      );
    } catch (error) {
      console.log("RESET PASSWORD ERROR:", error);

      Alert.alert(
        "Connection Error",
        "Could not connect to the BookEasy server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔐</Text>

        <Text style={styles.title}>Reset Password</Text>

        <Text style={styles.subtitle}>
          Create a new password for your BookEasy account.
        </Text>

        <Text style={styles.label}>New Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter new password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>Confirm Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#9ca3af"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.disabledButton,
          ]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>
              Reset Password
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/business/login")}
        >
          <Text style={styles.backText}>
            ← Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    padding: 24,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    elevation: 4,
  },

  icon: {
    fontSize: 42,
    textAlign: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#111827",
    marginBottom: 18,
    backgroundColor: "#ffffff",
  },

  button: {
    height: 52,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
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