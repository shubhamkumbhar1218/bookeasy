
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../../api";

type StaffMember = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  designation?: string;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  designation: "",
};

export default function StaffManagementScreen() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [staffHistory, setStaffHistory] = useState<Record<string, any>>({});
const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
const [historyError, setHistoryError] = useState("");

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        router.replace("/business/login" as any);
        return;
      }

      const response = await fetch(`${API_URL}/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
        ]);
        router.replace("/business/login" as any);
        return;
      }

      if (response.status === 403) {
        Alert.alert(
          "Staff Management unavailable",
          data.message ||
            "Your current subscription may not include staff management.",
          [
            { text: "Go Back", onPress: () => router.back() },
            {
              text: "View Plans",
              onPress: () =>
                router.push("/business/subscription" as any),
            },
          ]
        );
        setStaff([]);
        return;
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to load staff.");
      }

      setStaff(Array.isArray(data.staff) ? data.staff : []);
    } catch (error: any) {
      Alert.alert(
        "Unable to load staff",
        error?.message || "Please check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStaffHistory = async (staffId: string) => {
  if (expandedHistoryId === staffId) {
    setExpandedHistoryId(null);
    return;
  }

  setHistoryLoadingId(staffId);
  setHistoryError("");

  try {
    const token = await AsyncStorage.getItem("bookeasy_token");

    if (!token) {
      throw new Error("Your session has expired. Please log in again.");
    }

    const response = await fetch(
      `${API_URL}/staff/${staffId}/bookings`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load staff history");
    }

    setStaffHistory((previous) => ({
      ...previous,
      [staffId]: data,
    }));

    setExpandedHistoryId(staffId);
  } catch (error: any) {
    setHistoryError(error.message || "Unable to load staff history");
  } finally {
    setHistoryLoadingId(null);
  }
};


  useFocusEffect(
    useCallback(() => {
      loadStaff();
    }, [loadStaff])
  );

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormVisible(true);
  };

  const openEditForm = (member: StaffMember) => {
    setEditingId(member._id);
    setForm({
      name: member.name || "",
      phone: member.phone || "",
      email: member.email || "",
      designation: member.designation || "",
    });
    setFormVisible(true);
  };

  const updateField = (
    field: keyof typeof emptyForm,
    value: string
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const saveStaff = async () => {
    if (!form.name.trim()) {
      Alert.alert("Name required", "Enter the staff member's name.");
      return;
    }

    try {
      setSaving(true);

      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        router.replace("/business/login" as any);
        return;
      }

      const isEditing = Boolean(editingId);
      const endpoint = isEditing
        ? `${API_URL}/staff/${editingId}`
        : `${API_URL}/staff`;

      const response = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          designation: form.designation.trim() || "Staff",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
        ]);
        router.replace("/business/login" as any);
        return;
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to save staff member."
        );
      }

      setFormVisible(false);
      setEditingId(null);
      setForm(emptyForm);

      Alert.alert(
        "Success",
        data.message || "Staff member saved successfully."
      );

      await loadStaff();
    } catch (error: any) {
      Alert.alert(
        "Unable to save staff",
        error?.message || "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const changeActiveStatus = async (
    member: StaffMember,
    activate: boolean
  ) => {
    try {
      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        router.replace("/business/login" as any);
        return;
      }

      const response = await fetch(`${API_URL}/staff/${member._id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: activate }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
        ]);
        router.replace("/business/login" as any);
        return;
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to update staff status.");
      }

      await loadStaff();
    } catch (error: any) {
      Alert.alert(
        "Update failed",
        error?.message || "Please try again."
      );
    }
  };

  const deactivateStaff = (member: StaffMember) => {
    Alert.alert(
      "Deactivate staff member?",
      `${member.name} will be marked inactive. Their record will be kept.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem(
                "bookeasy_token"
              );

              if (!token) {
                router.replace("/business/login" as any);
                return;
              }

              const response = await fetch(
                `${API_URL}/staff/${member._id}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              const data = await response.json().catch(() => ({}));

              if (response.status === 401) {
                await AsyncStorage.multiRemove([
                  "bookeasy_token",
                  "bookeasy_user",
                ]);
                router.replace("/business/login" as any);
                return;
              }

              if (!response.ok || data.success === false) {
                throw new Error(
                  data.message || "Unable to deactivate staff."
                );
              }

              await loadStaff();
            } catch (error: any) {
              Alert.alert(
                "Deactivation failed",
                error?.message || "Please try again."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹  Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadStaff}
            disabled={loading}
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.eyebrow}>YOUR BUSINESS</Text>
        <Text style={styles.title}>Staff Management</Text>
        <Text style={styles.subtitle}>
          Add team members and keep their details up to date.
        </Text>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Team members</Text>
            <Text style={styles.summaryNumber}>{staff.length}</Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>Active members</Text>
            <Text style={styles.summaryNumber}>
              {staff.filter((member) => member.isActive).length}
            </Text>
          </View>
          <Text style={styles.teamIcon}>👥</Text>
        </View>

        {!formVisible ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddForm}
            activeOpacity={0.85}
          >
            <Text style={styles.addButtonText}>＋  Add staff member</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingId ? "Edit staff member" : "Add staff member"}
            </Text>

            <Text style={styles.label}>Full name *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(value) => updateField("name", value)}
              placeholder="Enter full name"
              placeholderTextColor="#8A968F"
              maxLength={100}
            />

            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(value) => updateField("phone", value)}
              placeholder="Enter phone number"
              placeholderTextColor="#8A968F"
              keyboardType="phone-pad"
              maxLength={20}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              placeholder="Enter email address"
              placeholderTextColor="#8A968F"
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={254}
            />

            <Text style={styles.label}>Designation</Text>
            <TextInput
              style={styles.input}
              value={form.designation}
              onChangeText={(value) =>
                updateField("designation", value)
              }
              placeholder="e.g. Hair Stylist, Trainer"
              placeholderTextColor="#8A968F"
              maxLength={100}
            />

            <TouchableOpacity
              style={[styles.addButton, saving && styles.disabledButton]}
              onPress={saveStaff}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>
                  {editingId ? "Save changes" : "Add staff member"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setFormVisible(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Your team</Text>
          <Text style={styles.countText}>{staff.length} total</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#243B35" />
            <Text style={styles.loadingText}>Loading team members...</Text>
          </View>
        ) : staff.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🧑‍🤝‍🧑</Text>
            <Text style={styles.emptyTitle}>No staff members yet</Text>
            <Text style={styles.emptyText}>
              Add your first team member to keep your staff details organized.
            </Text>
          </View>
        ) : (
          staff.map((member) => (
            <View key={member._id} style={styles.staffCard}>
              <View style={styles.staffTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name.trim().charAt(0).toUpperCase() || "S"}
                  </Text>
                </View>

                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.designation}>
                    {member.designation || "Staff"}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      member.isActive
                        ? styles.activePill
                        : styles.inactivePill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        member.isActive
                          ? styles.activeText
                          : styles.inactiveText,
                      ]}
                    >
                      {member.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
              </View>

              {member.phone ? (
                <Text style={styles.contactText}>
                  Phone: {member.phone}
                </Text>
              ) : null}

              {member.email ? (
                <Text style={styles.contactText}>
                  Email: {member.email}
                </Text>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditForm(member)}
                >
                  <Text style={styles.editButtonText}>Edit details</Text>
                </TouchableOpacity>

                {member.isActive ? (
                  <TouchableOpacity
                    style={styles.deactivateButton}
                    onPress={() => deactivateStaff(member)}
                  >
                    <Text style={styles.deactivateText}>Deactivate</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.activateButton}
                    onPress={() => changeActiveStatus(member, true)}
                  >
                    <Text style={styles.activateText}>Reactivate</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Pressable
  onPress={() => loadStaffHistory(member._id)}
  disabled={historyLoadingId === member._id}
  style={{
    padding: 12,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: "#E8EEFF",
  }}
>
  <Text style={{ color: "#2447A8", fontWeight: "600" }}>
    {historyLoadingId === member._id
      ? "Loading history..."
      : expandedHistoryId === member._id
        ? "Hide Work History"
        : "View Work History"}
  </Text>
</Pressable>

{historyError && historyLoadingId === member._id ? (
  <Text>{historyError}</Text>
) : null}

{historyError && expandedHistoryId === null ? (
  <Text style={{ color: "red", marginTop: 8 }}>{historyError}</Text>
) : null}

{expandedHistoryId === member._id && staffHistory[member._id] && (
  <View style={{ marginTop: 12, gap: 8 }}>
    <Text style={{ fontSize: 17, fontWeight: "700" }}>
      Work History — {member.name}
    </Text>

    <Text>
      Total: {staffHistory[member._id].summary.total}
      {" · "}Completed: {staffHistory[member._id].summary.completed}
      {" · "}Cancelled: {staffHistory[member._id].summary.cancelled}
    </Text>

    <Text>
      Pending: {staffHistory[member._id].summary.pending}
      {" · "}Confirmed: {staffHistory[member._id].summary.confirmed}
      {" · "}No-show: {staffHistory[member._id].summary.noShow}
    </Text>

    {staffHistory[member._id].bookings.length === 0 ? (
      <Text>No bookings assigned yet.</Text>
    ) : (
      staffHistory[member._id].bookings.map((booking: any) => (
        <View
          key={booking._id}
          style={{
            padding: 10,
            borderWidth: 1,
            borderColor: "#D7DCE5",
            borderRadius: 8,
            gap: 4,
          }}
        >
          <Text style={{ fontWeight: "700" }}>
            {booking.serviceId?.name || "Service unavailable"}
          </Text>

          <Text>Customer: {booking.customerName}</Text>

          <Text>
            Appointment:{" "}
            {new Date(booking.bookingDate).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}
          </Text>

          <Text>Status: {booking.status}</Text>

          {(booking.statusHistory || []).map(
            (event: any, index: number) => (
              <Text key={`${booking._id}-${index}`} style={{ fontSize: 12 }}>
                {event.action === "rescheduled"
                  ? "Rescheduled"
                  : event.action === "staff_assigned"
                    ? "Staff assigned"
                    : event.action === "staff_unassigned"
                      ? "Staff unassigned"
                      : `Status: ${event.status}`}
                {" · "}
                {event.changedByName || "Business owner"}
                {" · "}
                {event.changedAt
                  ? new Date(event.changedAt).toLocaleString("en-IN")
                  : ""}
              </Text>
            )
          )}
        </View>
        
      ))
    )}
    
  </View>
)}

            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F6F0",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    color: "#243B35",
    fontSize: 16,
    fontWeight: "700",
  },
  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#E9F0E8",
    borderRadius: 10,
  },
  refreshText: {
    color: "#243B35",
    fontWeight: "700",
  },
  eyebrow: {
    color: "#64766A",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    color: "#243B35",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    color: "#64766A",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: "#243B35",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  summaryLabel: {
    color: "#D6E1D8",
    fontSize: 12,
    marginBottom: 8,
  },
  summaryNumber: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
  },
  teamIcon: {
    fontSize: 34,
  },
  addButton: {
    backgroundColor: "#243B35",
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 17,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E7DF",
  },
  formTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#243B35",
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#34483F",
    marginBottom: 7,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#FAFBF8",
    borderWidth: 1,
    borderColor: "#DCE4DC",
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#243B35",
    fontSize: 15,
  },
  cancelButton: {
    alignItems: "center",
    padding: 12,
    marginTop: 4,
  },
  cancelText: {
    color: "#64766A",
    fontWeight: "700",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 13,
  },
  sectionTitle: {
    color: "#243B35",
    fontSize: 20,
    fontWeight: "800",
  },
  countText: {
    color: "#64766A",
    fontSize: 13,
  },
  center: {
    alignItems: "center",
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    color: "#64766A",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E7DF",
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#243B35",
    fontSize: 17,
    fontWeight: "800",
  },
  emptyText: {
    color: "#64766A",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  staffCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E0E7DF",
  },
  staffTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 47,
    height: 47,
    borderRadius: 24,
    backgroundColor: "#E9F0E8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    color: "#243B35",
    fontWeight: "800",
  },
  staffInfo: {
    flex: 1,
    alignItems: "flex-start",
  },
  staffName: {
    color: "#243B35",
    fontSize: 17,
    fontWeight: "800",
  },
  designation: {
    color: "#64766A",
    fontSize: 13,
    marginTop: 3,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 7,
  },
  activePill: {
    backgroundColor: "#E4F5E7",
  },
  inactivePill: {
    backgroundColor: "#F1E7E7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  activeText: {
    color: "#24723A",
  },
  inactiveText: {
    color: "#9A3B3B",
  },
  contactText: {
    color: "#52645A",
    fontSize: 13,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 15,
  },
  editButton: {
    backgroundColor: "#E9F0E8",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 9,
  },
  editButtonText: {
    color: "#243B35",
    fontSize: 12,
    fontWeight: "800",
  },
  deactivateButton: {
    backgroundColor: "#FBEAEA",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 9,
  },
  deactivateText: {
    color: "#A33434",
    fontSize: 12,
    fontWeight: "800",
  },
  activateButton: {
    backgroundColor: "#E4F5E7",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 9,
  },
  activateText: {
    color: "#24723A",
    fontSize: 12,
    fontWeight: "800",
  },
});
