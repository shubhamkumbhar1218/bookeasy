import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import API_URL from "../../api";

type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

type WorkingHours = {
  Monday: DayHours;
  Tuesday: DayHours;
  Wednesday: DayHours;
  Thursday: DayHours;
  Friday: DayHours;
  Saturday: DayHours;
  Sunday: DayHours;
};

const defaultDay = (): DayHours => ({
  open: "09:00",
  close: "18:00",
  closed: false,
});

const defaultWorkingHours: WorkingHours = {
  Monday: defaultDay(),
  Tuesday: defaultDay(),
  Wednesday: defaultDay(),
  Thursday: defaultDay(),
  Friday: defaultDay(),
  Saturday: defaultDay(),
  Sunday: {
    open: "09:00",
    close: "18:00",
    closed: true,
  },
};

const days: (keyof WorkingHours)[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function BusinessSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

 const [name, setName] = useState("");
const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");

  const [workingHours, setWorkingHours] =
    useState<WorkingHours>(defaultWorkingHours);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        Alert.alert("Session expired", "Please login again.");
        router.replace("/business/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/business/profile/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load business profile"
        );
      }

      setName(data.name || "");
      setBusinessName(data.businessName || "");
      setBusinessType(data.businessType || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
      setBusinessSlug(data.businessSlug || "");

      if (data.workingHours) {
        setWorkingHours(normalizeWorkingHours(data.workingHours));
      }
    } catch (error: any) {
      console.log("Profile loading error:", error);

      Alert.alert(
        "Error",
        error.message || "Unable to load business profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const normalizeWorkingHours = (
    hours: any
  ): WorkingHours => {
    const result: any = {};

    days.forEach((day) => {
      const value = hours?.[day];

      if (!value) {
        result[day] = defaultDay();
        return;
      }

      if (typeof value === "string") {
        if (
          value.toLowerCase() === "closed" ||
          value.toLowerCase() === "close"
        ) {
          result[day] = {
            open: "09:00",
            close: "18:00",
            closed: true,
          };
        } else {
          const parts = value.split("-");

          result[day] = {
            open: parts[0]?.trim() || "09:00",
            close: parts[1]?.trim() || "18:00",
            closed: false,
          };
        }

        return;
      }

      result[day] = {
        open: value.open || "09:00",
        close: value.close || "18:00",
        closed: value.closed === true,
      };
    });

    return result;
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateDay = (
    day: keyof WorkingHours,
    field: keyof DayHours,
    value: string | boolean
  ) => {
    setWorkingHours((previous) => ({
      ...previous,
      [day]: {
        ...previous[day],
        [field]: value,
      },
    }));
  };

  const saveSettings = async () => {
if (!name.trim()) {
  Alert.alert("Required", "Owner name is required.");
  return;
}

if (!businessName.trim()) {
  Alert.alert("Required", "Business name is required.");
  return;
}

if (!phone.trim()) {
  Alert.alert("Required", "Phone number is required.");
  return;
}

    if (!address.trim()) {
      Alert.alert("Required", "Address is required.");
      return;
    }

    try {
      setSaving(true);

      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        Alert.alert("Session expired", "Please login again.");
        router.replace("/business/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/business/profile/me`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
             name: name.trim(),
            businessName: businessName.trim(),
            phone: phone.trim(),
            address: address.trim(),
            workingHours,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save settings"
        );
      }

      // Update saved business information locally.
      const savedUser = await AsyncStorage.getItem(
        "bookeasy_user"
      );

      if (savedUser) {
        const user = JSON.parse(savedUser);

        await AsyncStorage.setItem(
          "bookeasy_user",
          JSON.stringify({
            ...user,
            businessName:
              data.businessName || businessName.trim(),
            phone: data.phone || phone.trim(),
            address: data.address || address.trim(),
            businessSlug:
              data.businessSlug || businessSlug,
          })
        );
      }

      Alert.alert(
        "Success",
        "Business settings updated successfully."
      );

      await loadProfile();
    } catch (error: any) {
      console.log("Save settings error:", error);

      Alert.alert(
        "Error",
        error.message || "Unable to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const getBookingLink = () => {
    if (!businessSlug) {
      Alert.alert(
        "Booking link unavailable",
        "Business slug is not available yet."
      );
      return "";
    }

   return `http://192.168.206.233:5173/book/${businessSlug}`;
  };

  const copyBookingLink = async () => {
    const link = getBookingLink();

    if (!link) return;

    await Clipboard.setStringAsync(link);

    Alert.alert(
      "Copied",
      "Booking link copied to clipboard."
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Business Settings
        </Text>

        <View style={styles.headerSpace} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Business Information
          </Text>

<Text style={styles.label}>
  Owner Name
</Text>

<TextInput
  value={name}
  onChangeText={setName}
  placeholder="Enter owner name"
  style={styles.input}
/>

          <Text style={styles.label}>
            Business Type
          </Text>

          <TextInput
            value={businessType}
            editable={false}
            style={[
              styles.input,
              styles.disabledInput,
            ]}
          />

          <Text style={styles.label}>
            Phone Number
          </Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.label}>
            Address
          </Text>

          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Enter business address"
            multiline
            numberOfLines={3}
            style={[
              styles.input,
              styles.addressInput,
            ]}
          />
        </View>

        {/* Working Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Working Hours
          </Text>

          <Text style={styles.sectionDescription}>
            Set your opening and closing time for each day.
          </Text>

          {days.map((day) => {
            const dayData = workingHours[day];

            return (
              <View
                key={day}
                style={styles.dayCard}
              >
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>
                    {day}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.closedButton,
                      dayData.closed &&
                        styles.closedButtonActive,
                    ]}
                    onPress={() =>
                      updateDay(
                        day,
                        "closed",
                        !dayData.closed
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.closedText,
                        dayData.closed &&
                          styles.closedTextActive,
                      ]}
                    >
                      {dayData.closed
                        ? "Closed"
                        : "Open"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {!dayData.closed && (
                  <View style={styles.timeRow}>
                    <View style={styles.timeBox}>
                      <Text style={styles.timeLabel}>
                        Opening
                      </Text>

                      <TextInput
                        value={dayData.open}
                        onChangeText={(value) =>
                          updateDay(
                            day,
                            "open",
                            value
                          )
                        }
                        placeholder="09:00"
                        style={styles.timeInput}
                      />
                    </View>

                    <Text style={styles.toText}>
                      to
                    </Text>

                    <View style={styles.timeBox}>
                      <Text style={styles.timeLabel}>
                        Closing
                      </Text>

                      <TextInput
                        value={dayData.close}
                        onChangeText={(value) =>
                          updateDay(
                            day,
                            "close",
                            value
                          )
                        }
                        placeholder="18:00"
                        style={styles.timeInput}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Booking Link */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Customer Booking Link
          </Text>

          <Text style={styles.sectionDescription}>
            Share this link with customers so they can
            book an appointment directly.
          </Text>

          <View style={styles.linkBox}>
            <Text
              style={styles.linkText}
              numberOfLines={2}
            >
              {getBookingLink() ||
                "Booking link unavailable"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.copyButton}
            onPress={copyBookingLink}
          >
            <Text style={styles.copyButtonText}>
              📋 Copy Booking Link
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && styles.disabledButton,
          ]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  header: {
    minHeight: 90,
    paddingTop: 42,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    fontSize: 36,
    lineHeight: 40,
    color: "#111827",
  },

  headerTitle: {
    flex: 1,
    fontSize: 21,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 4,
  },

  headerSpace: {
    width: 40,
  },

  content: {
    padding: 16,
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
    marginBottom: 14,
  },

  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6b7280",
    marginTop: -5,
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#ffffff",
  },

  disabledInput: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },

  addressInput: {
    minHeight: 85,
    textAlignVertical: "top",
    paddingTop: 12,
  },

  dayCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dayName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  closedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#dcfce7",
  },

  closedButtonActive: {
    backgroundColor: "#fee2e2",
  },

  closedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },

  closedTextActive: {
    color: "#b91c1c",
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 12,
  },

  timeBox: {
    flex: 1,
  },

  timeLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 5,
  },

  timeInput: {
    height: 42,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 9,
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#111827",
  },

  toText: {
    marginHorizontal: 8,
    marginBottom: 12,
    color: "#6b7280",
    fontSize: 13,
  },

  linkBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f9fafb",
  },

  linkText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#374151",
  },

  copyButton: {
    marginTop: 10,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
  },

  copyButtonText: {
    color: "#3730a3",
    fontSize: 14,
    fontWeight: "700",
  },

  saveButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.6,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
  },

  loadingText: {
    marginTop: 10,
    color: "#6b7280",
    fontSize: 14,
  },

  bottomSpace: {
    height: 30,
  },
});