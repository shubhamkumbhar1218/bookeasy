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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerPushTokenWithBackend } from "../../services/notifications";
import API_URL from "../../api";

export default function BusinessLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        "Required",
        "Please enter email and password."
      );
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      const loginUrl = `${API_URL}/auth/login`;
      const loginStartedAt = Date.now();

      console.log("LOGIN URL:", loginUrl);
      console.log("LOGIN: Request started");

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      console.log(
        "LOGIN: Response received in",
        Date.now() - loginStartedAt,
        "ms; status:",
        response.status
      );

      const responseText = await response.text();

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(
          "LOGIN: Non-JSON server response:",
          responseText.slice(0, 300)
        );

        Alert.alert(
          "Server error",
          "The server returned an invalid response. Please try again."
        );
        return;
      }

      console.log(
        "LOGIN: Response parsed in",
        Date.now() - loginStartedAt,
        "ms"
      );

      
      console.log("LOGIN STATUS:", response.status);
      if (response.ok) {
  console.log("SUCCESS RESPONSE KEYS:", Object.keys(data || {}));
  console.log("SUCCESS USER KEYS:", Object.keys(data?.user || {}));
  console.log("SUCCESS USER ID:", data?.user?.id || data?.user?._id || "MISSING");
  console.log("SUCCESS ROLE:", data?.user?.role || "MISSING");
  console.log("SUCCESS HAS TOKEN:", Boolean(data?.token));
}

      console.log(
  "LOGIN RESPONSE KEYS:",
  Object.keys(data || {})
);

console.log(
  "LOGIN USER KEYS:",
  Object.keys(data?.user || {})
);

console.log(
  "LOGIN ROLE:",
  data?.user?.role
);

console.log(
  "LOGIN HAS TOKEN:",
  Boolean(data?.token)
);

      if (!response.ok) {
  console.log("LOGIN FAILURE MESSAGE:", data.message);

  Alert.alert(
    "Login failed",
    data.message || "Invalid email or password."
  );
  return;
}

      if (!data.token) {
        Alert.alert(
          "Login error",
          "Server did not return an authentication token."
        );
        return;
      }

      if (!data.user || !data.user.id) {
        Alert.alert(
          "Login error",
          "Server did not return the user ID."
        );
        return;
      }

      const role = String(
        data.user.role || ""
      ).toUpperCase();

      if (role !== "ADMIN" && role !== "BUSINESS") {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
          "bookeasy_role",
        ]);

        Alert.alert(
          "Login error",
          "Your account role is invalid."
        );
        return;
      }

      const user = {
        id: data.user.id,
        name: data.user.name || "",
        email: data.user.email || "",
        role,
        businessName: data.user.businessName || "",
        businessSlug: data.user.businessSlug || "",
        businessType: data.user.businessType || "",
      };

      await AsyncStorage.multiSet([
        ["bookeasy_token", data.token],
        ["bookeasy_user", JSON.stringify(user)],
        ["bookeasy_role", role],
      ]);

      // Register push token after the business owner logs in
if (role === "BUSINESS") {
  await registerPushTokenWithBackend("business");
}

      console.log("LOGIN: Session saved; role:", role);
      console.log(
        "LOGIN: Total time before navigation:",
        Date.now() - loginStartedAt,
        "ms"
      );

      const destination =
        role === "ADMIN"
          ? "/admin"
          : "/business/dashboard";

      router.replace(destination as any);
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      Alert.alert(
        "Connection error",
        "Could not connect to the BookEasy server. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Business Login</Text>

      <Text style={styles.subtitle}>
        Login to manage your business
      </Text>

      <Text style={styles.label}>Email</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter email"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!loading}
      />

      <Text style={styles.label}>Password</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter password"
        placeholderTextColor="#9ca3af"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        editable={!loading}
        onSubmitEditing={handleLogin}
        returnKeyType="go"
      />

      <TouchableOpacity
        style={styles.forgotButton}
        disabled={loading}
        onPress={() =>
          router.push("/business/forgot-password")
        }
      >
        <Text style={styles.forgotText}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.loginButton,
          loading && styles.disabledButton,
        ]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.loginText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.registerButton}
        disabled={loading}
        onPress={() =>
          router.push("/business/register")
        }
      >
        <Text style={styles.registerText}>
          Create Business Account
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
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
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
    marginBottom: 17,
  },

  forgotButton: {
    alignItems: "flex-end",
    marginTop: -8,
    marginBottom: 15,
  },

  forgotText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "700",
  },

  loginButton: {
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

  loginText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  registerButton: {
    marginTop: 18,
    alignItems: "center",
  },

  registerText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "700",
  },
});
