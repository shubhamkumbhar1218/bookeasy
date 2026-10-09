// import { useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { router } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// import API_URL from "../../api";

// export default function BusinessLogin() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

// const handleLogin = async () => {
//   if (!email.trim() || !password.trim()) {
//     Alert.alert(
//       "Required",
//       "Please enter email and password."
//     );
//     return;
//   }

//   try {
//     setLoading(true);

// const loginUrl = `${API_URL}/auth/login`;

// console.log("LOGIN URL:", loginUrl);

// const response = await fetch(loginUrl, {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json",
//   },
//   body: JSON.stringify({
//     email: email.trim(),
//     password,
//   }),
// });

//     const data = await response.json();

//     console.log("LOGIN STATUS:", response.status);
//     console.log("LOGIN RESPONSE:", data);

//     if (!response.ok) {
//       Alert.alert(
//         "Login failed",
//         data.message || "Invalid email or password."
//       );
//       return;
//     }

//     if (!data.token) {
//       Alert.alert(
//         "Login error",
//         "Server did not return an authentication token."
//       );
//       return;
//     }

//     if (!data.user || !data.user.id) {
//       Alert.alert(
//         "Login error",
//         "Server did not return the business ID."
//       );
//       return;
//     }

//     await AsyncStorage.setItem(
//       "bookeasy_token",
//       data.token
//     );

//     const user = {
//       id: data.user.id,
//       name: data.user.name || "",
//       email: data.user.email || "",
//       businessName: data.user.businessName || "",
//       businessSlug: data.user.businessSlug || "",
//       businessType: data.user.businessType || "",
//     };

//     await AsyncStorage.setItem(
//       "bookeasy_user",
//       JSON.stringify(user)
//     );

//     await AsyncStorage.setItem(
//       "bookeasy_role",
//       "BUSINESS"
//     );

//     console.log(
//       "SAVED USER:",
//       await AsyncStorage.getItem("bookeasy_user")
//     );

//     Alert.alert(
//       "Success",
//       "Login successful.",
//       [
//         {
//           text: "Continue",
//           onPress: () => {
//             router.replace("/business/dashboard");
//           },
//         },
//       ]
//     );
//   } catch (error) {
//     console.log("LOGIN ERROR:", error);

//     Alert.alert(
//       "Connection error",
//       "Could not connect to the BookEasy server."
//     );
//   } finally {
//     setLoading(false);
//   }
// };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>
//         Business Login
//       </Text>

//       <Text style={styles.subtitle}>
//         Login to manage your business
//       </Text>

//       <Text style={styles.label}>
//         Email
//       </Text>

//       <TextInput
//         style={styles.input}
//         placeholder="Enter email"
//         placeholderTextColor="#9ca3af"
//         value={email}
//         onChangeText={setEmail}
//         autoCapitalize="none"
//         keyboardType="email-address"
//       />

//       <Text style={styles.label}>
//         Password
//       </Text>

//       <TextInput
//         style={styles.input}
//         placeholder="Enter password"
//         placeholderTextColor="#9ca3af"
//         value={password}
//         onChangeText={setPassword}
//         secureTextEntry
//       />

//       <TouchableOpacity
//         style={[
//           styles.loginButton,
//           loading && styles.disabledButton,
//         ]}
//         onPress={handleLogin}
//         disabled={loading}
//       >
//         {loading ? (
//           <ActivityIndicator color="#ffffff" />
//         ) : (
//           <Text style={styles.loginText}>
//             Login
//           </Text>
//         )}
//       </TouchableOpacity>

//       <TouchableOpacity
//         style={styles.registerButton}
//         onPress={() =>
//           router.push("/business/register")
//         }
//       >
//         <Text style={styles.registerText}>
//           Create Business Account
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f8fafc",
//     padding: 24,
//     justifyContent: "center",
//   },

//   title: {
//     fontSize: 30,
//     fontWeight: "800",
//     color: "#111827",
//     textAlign: "center",
//   },

//   subtitle: {
//     fontSize: 14,
//     color: "#6b7280",
//     textAlign: "center",
//     marginTop: 8,
//     marginBottom: 30,
//   },

//   label: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#374151",
//     marginBottom: 7,
//   },

//   input: {
//     height: 52,
//     backgroundColor: "#ffffff",
//     borderWidth: 1,
//     borderColor: "#d1d5db",
//     borderRadius: 12,
//     paddingHorizontal: 15,
//     fontSize: 15,
//     color: "#111827",
//     marginBottom: 17,
//   },

//   loginButton: {
//     height: 52,
//     backgroundColor: "#2563eb",
//     borderRadius: 12,
//     justifyContent: "center",
//     alignItems: "center",
//     marginTop: 5,
//   },

//   disabledButton: {
//     opacity: 0.6,
//   },

//   loginText: {
//     color: "#ffffff",
//     fontSize: 16,
//     fontWeight: "800",
//   },

//   registerButton: {
//     marginTop: 18,
//     alignItems: "center",
//   },

//   registerText: {
//     color: "#2563eb",
//     fontSize: 14,
//     fontWeight: "700",
//   },
// });


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

import API_URL from "../../api";

export default function BusinessLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Required",
        "Please enter email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const loginUrl = `${API_URL}/auth/login`;

      console.log("LOGIN URL:", loginUrl);

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      console.log("LOGIN STATUS:", response.status);
      console.log("LOGIN RESPONSE:", data);

      if (!response.ok) {
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
          "Server did not return the business ID."
        );
        return;
      }

      await AsyncStorage.setItem(
        "bookeasy_token",
        data.token
      );

      const user = {
        id: data.user.id,
        name: data.user.name || "",
        email: data.user.email || "",
        businessName: data.user.businessName || "",
        businessSlug: data.user.businessSlug || "",
        businessType: data.user.businessType || "",
      };

      await AsyncStorage.setItem(
        "bookeasy_user",
        JSON.stringify(user)
      );

      await AsyncStorage.setItem(
        "bookeasy_role",
        "BUSINESS"
      );

      Alert.alert(
        "Success",
        "Login successful.",
        [
          {
            text: "Continue",
            onPress: () => {
              router.replace("/business/dashboard");
            },
          },
        ]
      );
    } catch (error) {
      console.log("LOGIN ERROR:", error);

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
        Business Login
      </Text>

      <Text style={styles.subtitle}>
        Login to manage your business
      </Text>

      <Text style={styles.label}>
        Email
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter email"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>
        Password
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter password"
        placeholderTextColor="#9ca3af"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.forgotButton}
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
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.loginText}>
            Login
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.registerButton}
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