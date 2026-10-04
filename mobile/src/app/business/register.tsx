import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import API_URL from "../../api";

const categories = [
  "salon",
  "barber",
  "tutor",
  "gym",
  "repair shop",
  "hospital",
  "beauty parlour",
  "other",
];

export default function BusinessRegister() {
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [showCategories, setShowCategories] = useState(false);
  const [loading, setLoading] = useState(false);

  const registerBusiness = async () => {
    if (
      !ownerName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !businessName.trim() ||
      !businessType ||
      !phone.trim() ||
      !address.trim()
    ) {
      Alert.alert(
        "Missing information",
        "Please fill in all fields."
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Invalid password",
        "Password must contain at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: ownerName.trim(),
            email: email.trim().toLowerCase(),
            password,
            businessName: businessName.trim(),
            businessType,
            phone: phone.trim(),
            address: address.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed"
        );
      }

      Alert.alert(
        "Registration successful 🎉",
        "Your business account has been created. You can now login.",
        [
          {
            text: "Go to Login",
            onPress: () => {
              router.replace("/business/login");
            },
          },
        ]
      );
    } catch (error: any) {
      console.log("Registration error:", error);

      Alert.alert(
        "Registration failed",
        error.message || "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>
              Create Business Account
            </Text>

            <Text style={styles.subtitle}>
              Start accepting online appointments with BookEasy.
            </Text>
          </View>
        </View>

        {/* Owner Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Owner Information
          </Text>

          <Text style={styles.label}>
            Owner Name
          </Text>

          <TextInput
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="Enter your name"
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>
            Password
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 6 characters"
            style={styles.input}
            secureTextEntry
          />
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Business Information
          </Text>

          <Text style={styles.label}>
            Business Name
          </Text>

          <TextInput
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. Test Salon"
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={styles.label}>
            Business Category
          </Text>

          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() =>
              setShowCategories(!showCategories)
            }
          >
            <Text
              style={[
                styles.categoryText,
                !businessType &&
                  styles.placeholderText,
              ]}
            >
              {businessType
                ? businessType
                : "Select category"}
            </Text>

            <Text style={styles.arrow}>
              {showCategories ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {showCategories && (
            <View style={styles.categoryList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryItem,
                    businessType === category &&
                      styles.selectedCategory,
                  ]}
                  onPress={() => {
                    setBusinessType(category);
                    setShowCategories(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      businessType === category &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {category
                      .split(" ")
                      .map(
                        (word) =>
                          word.charAt(0).toUpperCase() +
                          word.slice(1)
                      )
                      .join(" ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>
            Phone Number
          </Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            style={styles.input}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>
            Business Address
          </Text>

          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Enter complete business address"
            style={[
              styles.input,
              styles.addressInput,
            ]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[
            styles.registerButton,
            loading && styles.disabledButton,
          ]}
          onPress={registerBusiness}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.registerButtonText}>
              Create Business Account
            </Text>
          )}
        </TouchableOpacity>

        {/* Login */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>
            Already have an account?
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.replace("/business/login")
            }
          >
            <Text style={styles.loginLink}>
              Login
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  content: {
    padding: 20,
    paddingTop: 50,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
  },

  backText: {
    fontSize: 36,
    lineHeight: 40,
    color: "#111827",
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    maxWidth: 300,
  },

  section: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 12,
    marginBottom: 6,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#ffffff",
  },

  addressInput: {
    height: 95,
    paddingTop: 12,
  },

  categorySelector: {
    height: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
  },

  categoryText: {
    fontSize: 15,
    color: "#111827",
  },

  placeholderText: {
    color: "#9ca3af",
  },

  arrow: {
    fontSize: 12,
    color: "#6b7280",
  },

  categoryList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
  },

  categoryItem: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  selectedCategory: {
    backgroundColor: "#eff6ff",
  },

  categoryItemText: {
    fontSize: 14,
    color: "#374151",
  },

  selectedCategoryText: {
    color: "#2563eb",
    fontWeight: "700",
  },

  registerButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },

  registerButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },

  loginText: {
    fontSize: 14,
    color: "#6b7280",
  },

  loginLink: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
  },

  bottomSpace: {
    height: 30,
  },
});