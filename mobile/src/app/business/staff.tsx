
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

type StaffHistoryEvent = {
  action?: string;
  status?: string;
  changedByName?: string;
  changedAt?: string;
  oldStaffName?: string;
  newStaffName?: string;
  oldBookingDate?: string;
  newBookingDate?: string;
};

type StaffHistoryBooking = {
  _id: string;
  status?: string;
  serviceId?: {
    name?: string;
  };
  customerName?: string;
  bookingDate?: string;
  statusHistory?: StaffHistoryEvent[];
};

type StaffHistoryData = {
  summary: {
    total?: number;
    completed?: number;
    confirmed?: number;
    pending?: number;
    cancelled?: number;
    noShow?: number;
  };
  bookings: StaffHistoryBooking[];
};

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  designation: "",
};

const formatDateTime = (value?: string) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getStatusStyle = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return { backgroundColor: "#E5F7EC", color: "#16803D" };
    case "confirmed":
      return { backgroundColor: "#E8EEFF", color: "#3457C5" };
    case "pending":
      return { backgroundColor: "#FFF4D8", color: "#986400" };
    case "cancelled":
      return { backgroundColor: "#FDEAEA", color: "#B42318" };
    case "no-show":
    case "noshow":
      return { backgroundColor: "#F1E8FF", color: "#7542A8" };
    default:
      return { backgroundColor: "#EEF1F5", color: "#526071" };
  }
};

export default function StaffManagementScreen() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [staffHistory, setStaffHistory] = useState<
    Record<string, StaffHistoryData>
  >({});
  const [expandedHistoryId, setExpandedHistoryId] =
    useState<string | null>(null);
  const [historyLoadingId, setHistoryLoadingId] =
    useState<string | null>(null);
  const [historyError, setHistoryError] = useState<{
    staffId: string;
    message: string;
  } | null>(null);

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
      setHistoryError(null);
      return;
    }

    setExpandedHistoryId(null);
    setHistoryLoadingId(staffId);
    setHistoryError(null);

    try {
      const token = await AsyncStorage.getItem("bookeasy_token");

      if (!token) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
        ]);
        router.replace("/business/login" as any);
        return;
      }

      const response = await fetch(
        `${API_URL}/staff/${staffId}/bookings`,
        {
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

      if (response.status === 403) {
        throw new Error(
          data.message ||
            "Your current subscription does not allow staff management."
        );
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to load staff work history."
        );
      }

      if (
        !Array.isArray(data.bookings) ||
        typeof data.summary !== "object" ||
        data.summary === null
      ) {
        throw new Error(
          "The server returned an unexpected work history response."
        );
      }

      setStaffHistory((previous) => ({
        ...previous,
        [staffId]: data as StaffHistoryData,
      }));

      setExpandedHistoryId(staffId);
    } catch (error: any) {
      setHistoryError({
        staffId,
        message:
          error?.message || "Unable to load staff work history.",
      });
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
        throw new Error(
          data.message || "Unable to update staff status."
        );
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
            <Text style={styles.loadingText}>
              Loading team members...
            </Text>
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
                    <Text style={styles.deactivateText}>
                      Deactivate
                    </Text>
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
                style={[
                  styles.historyToggle,
                  expandedHistoryId === member._id &&
                    styles.historyToggleActive,
                  historyLoadingId === member._id &&
                    styles.disabledButton,
                ]}
              >
                <View style={styles.historyToggleContent}>
                  <Text style={styles.historyToggleIcon}>
                    {expandedHistoryId === member._id ? "−" : "+"}
                  </Text>

                  <Text
                    style={[
                      styles.historyToggleText,
                      expandedHistoryId === member._id &&
                        styles.historyToggleTextActive,
                    ]}
                  >
                    {historyLoadingId === member._id
                      ? "Loading work history..."
                      : expandedHistoryId === member._id
                        ? "Hide Work History"
                        : "View Work History"}
                  </Text>
                </View>

                <Text style={styles.historyToggleArrow}>
                  {expandedHistoryId === member._id ? "⌃" : "⌄"}
                </Text>
              </Pressable>

              {historyError?.staffId === member._id ? (
                <Text style={styles.historyError}>
                  {historyError.message}
                </Text>
              ) : null}

              {expandedHistoryId === member._id &&
                staffHistory[member._id] && (
                  <View style={styles.historyContainer}>
                    {(() => {
                      const history = staffHistory[member._id];
                      const summary = history.summary || {};
                      const bookings = Array.isArray(history.bookings)
                        ? history.bookings
                        : [];

                      const stats = [
                        {
                          label: "Total",
                          value: summary.total ?? 0,
                          color: "#3457C5",
                          background: "#E8EEFF",
                        },
                        {
                          label: "Completed",
                          value: summary.completed ?? 0,
                          color: "#16803D",
                          background: "#E5F7EC",
                        },
                        {
                          label: "Confirmed",
                          value: summary.confirmed ?? 0,
                          color: "#087E8B",
                          background: "#DDF7F7",
                        },
                        {
                          label: "Pending",
                          value: summary.pending ?? 0,
                          color: "#986400",
                          background: "#FFF4D8",
                        },
                        {
                          label: "Cancelled",
                          value: summary.cancelled ?? 0,
                          color: "#B42318",
                          background: "#FDEAEA",
                        },
                        {
                          label: "No-show",
                          value: summary.noShow ?? 0,
                          color: "#7542A8",
                          background: "#F1E8FF",
                        },
                      ];

                      return (
                        <>
                          <View style={styles.historyHeading}>
                            <View style={styles.historyHeadingIcon}>
                              <Text style={styles.historyHeadingIconText}>
                                ↗
                              </Text>
                            </View>

                            <View style={styles.historyHeadingText}>
                              <Text style={styles.historyTitle}>
                                Work History
                              </Text>
                              <Text style={styles.historySubtitle}>
                                Appointments assigned to {member.name}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.historyStatsGrid}>
                            {stats.map((stat) => (
                              <View
                                key={stat.label}
                                style={[
                                  styles.historyStatCard,
                                  {
                                    backgroundColor: stat.background,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.historyStatValue,
                                    { color: stat.color },
                                  ]}
                                >
                                  {stat.value}
                                </Text>

                                <Text style={styles.historyStatLabel}>
                                  {stat.label}
                                </Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.historyBookingHeader}>
                            <Text
                              style={styles.historyBookingHeaderTitle}
                            >
                              Appointment activity
                            </Text>

                            <View style={styles.historyCountBadge}>
                              <Text style={styles.historyCountText}>
                                {bookings.length}
                              </Text>
                            </View>
                          </View>

                          {bookings.length === 0 ? (
                            <View style={styles.historyEmpty}>
                              <Text style={styles.historyEmptyIcon}>
                                📅
                              </Text>
                              <Text style={styles.historyEmptyTitle}>
                                No appointment history
                              </Text>
                              <Text style={styles.historyEmptyText}>
                                Appointments assigned to this staff member
                                will appear here.
                              </Text>
                            </View>
                          ) : (
                            bookings.map((booking) => {
                              const statusStyle = getStatusStyle(
                                booking.status
                              );

                              return (
                                <View
                                  key={booking._id}
                                  style={styles.historyBookingCard}
                                >
                                  <View style={styles.bookingAccent} />

                                  <View
                                    style={styles.historyBookingContent}
                                  >
                                    <View style={styles.bookingTitleRow}>
                                      <View
                                        style={styles.bookingServiceIcon}
                                      >
                                        <Text
                                          style={
                                            styles.bookingServiceIconText
                                          }
                                        >
                                          ✦
                                        </Text>
                                      </View>

                                      <View
                                        style={styles.bookingTitleContent}
                                      >
                                        <Text
                                          style={styles.bookingServiceName}
                                        >
                                          {booking.serviceId?.name ||
                                            "Service unavailable"}
                                        </Text>

                                        <Text
                                          style={styles.bookingCustomer}
                                        >
                                          Customer:{" "}
                                          {booking.customerName || "Unknown"}
                                        </Text>
                                      </View>

                                      <View
                                        style={[
                                          styles.bookingStatusBadge,
                                          {
                                            backgroundColor:
                                              statusStyle.backgroundColor,
                                          },
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.bookingStatusText,
                                            { color: statusStyle.color },
                                          ]}
                                        >
                                          {booking.status || "Unknown"}
                                        </Text>
                                      </View>
                                    </View>

                                    <View style={styles.bookingInfoRow}>
                                      <Text
                                        style={styles.bookingInfoIcon}
                                      >
                                        ◷
                                      </Text>

                                      <View
                                        style={styles.bookingInfoContent}
                                      >
                                        <Text
                                          style={styles.bookingInfoLabel}
                                        >
                                          APPOINTMENT
                                        </Text>

                                        <Text
                                          style={styles.bookingInfoValue}
                                        >
                                          {formatDateTime(
                                            booking.bookingDate
                                          )}
                                        </Text>
                                      </View>
                                    </View>

                                    {Array.isArray(
                                      booking.statusHistory
                                    ) &&
                                      booking.statusHistory.length > 0 && (
                                        <View
                                          style={styles.timelineSection}
                                        >
                                          <Text
                                            style={styles.timelineTitle}
                                          >
                                            Activity timeline
                                          </Text>

                                          {booking.statusHistory.map(
                                            (event, index) => {
                                              const actionLabel =
                                                event.action ===
                                                "rescheduled"
                                                  ? "Appointment rescheduled"
                                                  : event.action ===
                                                      "staff_assigned"
                                                    ? "Staff assigned"
                                                    : event.action ===
                                                        "staff_unassigned"
                                                      ? "Staff unassigned"
                                                      : `Status: ${
                                                          event.status ||
                                                          "Updated"
                                                        }`;

                                              return (
                                                <View
                                                  key={`${booking._id}-${index}`}
                                                  style={
                                                    styles.timelineItem
                                                  }
                                                >
                                                  <View
                                                    style={
                                                      styles.timelineMarkerColumn
                                                    }
                                                  >
                                                    <View
                                                      style={[
                                                        styles.timelineDot,
                                                        index === 0 &&
                                                          styles.timelineDotLatest,
                                                      ]}
                                                    />

                                                    {index <
                                                      booking.statusHistory!
                                                        .length -
                                                        1 && (
                                                      <View
                                                        style={
                                                          styles.timelineLine
                                                        }
                                                      />
                                                    )}
                                                  </View>

                                                  <View
                                                    style={
                                                      styles.timelineContent
                                                    }
                                                  >
                                                    <Text
                                                      style={
                                                        styles.timelineAction
                                                      }
                                                    >
                                                      {actionLabel}
                                                    </Text>

                                                    <Text
                                                      style={
                                                        styles.timelineMeta
                                                      }
                                                    >
                                                      {event.changedByName ||
                                                        "Business owner"}
                                                    </Text>

                                                    <Text
                                                      style={
                                                        styles.timelineDate
                                                      }
                                                    >
                                                      {formatDateTime(
                                                        event.changedAt
                                                      )}
                                                    </Text>

                                                    {event.action ===
                                                      "staff_assigned" && (
                                                      <Text
                                                        style={
                                                          styles.timelineChange
                                                        }
                                                      >
                                                        {event.oldStaffName ||
                                                          "Unassigned"}
                                                        {"  →  "}
                                                        {event.newStaffName ||
                                                          "Unassigned"}
                                                      </Text>
                                                    )}

                                                    {event.action ===
                                                      "staff_unassigned" && (
                                                      <Text
                                                        style={
                                                          styles.timelineChange
                                                        }
                                                      >
                                                        {event.oldStaffName ||
                                                          member.name}
                                                        {"  →  Unassigned"}
                                                      </Text>
                                                    )}

                                                    {event.action ===
                                                      "rescheduled" && (
                                                      <View
                                                        style={
                                                          styles.rescheduleBox
                                                        }
                                                      >
                                                        <Text
                                                          style={
                                                            styles.rescheduleLabel
                                                          }
                                                        >
                                                          Previous appointment
                                                        </Text>

                                                        <Text
                                                          style={
                                                            styles.rescheduleDate
                                                          }
                                                        >
                                                          {formatDateTime(
                                                            event.oldBookingDate
                                                          )}
                                                        </Text>

                                                        <Text
                                                          style={
                                                            styles.rescheduleArrow
                                                          }
                                                        >
                                                          ↓ Rescheduled to
                                                        </Text>

                                                        <Text
                                                          style={
                                                            styles.rescheduleDate
                                                          }
                                                        >
                                                          {formatDateTime(
                                                            event.newBookingDate
                                                          )}
                                                        </Text>
                                                      </View>
                                                    )}
                                                  </View>
                                                </View>
                                              );
                                            }
                                          )}
                                        </View>
                                      )}
                                  </View>
                                </View>
                              );
                            })
                          )}
                        </>
                      );
                    })()}
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

  // Work history expand/collapse
  historyToggle: {
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#F4F6FF",
    borderWidth: 1,
    borderColor: "#DCE3FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyToggleActive: {
    backgroundColor: "#E8EEFF",
    borderColor: "#C8D5FF",
  },
  historyToggleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyToggleIcon: {
    fontSize: 21,
    fontWeight: "700",
    color: "#4657C8",
  },
  historyToggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4657C8",
  },
  historyToggleTextActive: {
    color: "#293C9C",
  },
  historyToggleArrow: {
    color: "#4657C8",
    fontSize: 20,
    fontWeight: "700",
  },
  historyError: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FDEAEA",
    color: "#B42318",
    fontSize: 13,
    lineHeight: 19,
  },

  // History container and heading
  historyContainer: {
    marginTop: 14,
    padding: 14,
    backgroundColor: "#F8FAFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E7F5",
  },
  historyHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 11,
  },
  historyHeadingIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#E8EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  historyHeadingIconText: {
    color: "#4657C8",
    fontSize: 24,
    fontWeight: "800",
  },
  historyHeadingText: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172B4D",
  },
  historySubtitle: {
    fontSize: 12,
    color: "#71809A",
    lineHeight: 18,
    marginTop: 3,
  },

  // Summary grid
  historyStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 20,
  },
  historyStatCard: {
    width: "31%",
    minHeight: 79,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  historyStatValue: {
    fontSize: 23,
    fontWeight: "800",
  },
  historyStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#526071",
    marginTop: 4,
    textAlign: "center",
  },

  // Appointment list
  historyBookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  historyBookingHeaderTitle: {
    color: "#172B4D",
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  historyCountBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#E8EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  historyCountText: {
    color: "#3457C5",
    fontSize: 12,
    fontWeight: "800",
  },
  historyEmpty: {
    padding: 22,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5EAF3",
  },
  historyEmptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  historyEmptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#24334D",
  },
  historyEmptyText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    color: "#71809A",
    marginTop: 6,
  },

  // Individual booking card
  historyBookingCard: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E9F2",
    marginBottom: 12,
  },
  bookingAccent: {
    width: 4,
    backgroundColor: "#6978E8",
  },
  historyBookingContent: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    gap: 14,
  },
  bookingTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  bookingServiceIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: "#F0F2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingServiceIconText: {
    color: "#5966D8",
    fontSize: 20,
    fontWeight: "800",
  },
  bookingTitleContent: {
    flex: 1,
    minWidth: 0,
  },
  bookingServiceName: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    color: "#172B4D",
  },
  bookingCustomer: {
    fontSize: 12,
    lineHeight: 18,
    color: "#71809A",
    marginTop: 3,
  },
  bookingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    maxWidth: 100,
  },
  bookingStatusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  bookingInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 11,
    borderRadius: 10,
    backgroundColor: "#F7F9FC",
  },
  bookingInfoIcon: {
    color: "#5966D8",
    fontSize: 19,
    fontWeight: "800",
  },
  bookingInfoContent: {
    flex: 1,
  },
  bookingInfoLabel: {
    color: "#8995A9",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  bookingInfoValue: {
    color: "#344563",
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "600",
    marginTop: 4,
  },

  // Activity timeline
  timelineSection: {
    borderTopWidth: 1,
    borderTopColor: "#EDF0F6",
    paddingTop: 13,
  },
  timelineTitle: {
    color: "#24334D",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 14,
  },
  timelineItem: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: 10,
  },
  timelineMarkerColumn: {
    width: 13,
    alignItems: "center",
  },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#B9C4D7",
    marginTop: 4,
  },
  timelineDotLatest: {
    backgroundColor: "#5966D8",
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: "#E0E6F0",
    marginTop: 4,
    marginBottom: 3,
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 17,
  },
  timelineAction: {
    color: "#24334D",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  timelineMeta: {
    color: "#63728A",
    fontSize: 11,
    marginTop: 4,
  },
  timelineDate: {
    color: "#8A96A8",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 3,
  },
  timelineChange: {
    color: "#4657C8",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 7,
    backgroundColor: "#F0F2FF",
    padding: 8,
    borderRadius: 7,
    overflow: "hidden",
  },
  rescheduleBox: {
    backgroundColor: "#F7F9FC",
    borderRadius: 9,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5EAF3",
  },
  rescheduleLabel: {
    color: "#8995A9",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  rescheduleDate: {
    color: "#344563",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
    marginTop: 5,
  },
  rescheduleArrow: {
    color: "#5966D8",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },
});
















// import React, { useCallback, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { router, useFocusEffect } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import API_URL from "../../api";

// type StaffMember = {
//   _id: string;
//   name: string;
//   phone?: string;
//   email?: string;
//   designation?: string;
//   isActive: boolean;
// };

// const emptyForm = {
//   name: "",
//   phone: "",
//   email: "",
//   designation: "",
// };

// const formatDateTime = (value?: string) => {
//   if (!value) return "Date unavailable";

//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) {
//     return "Date unavailable";
//   }

//   return date.toLocaleString("en-IN", {
//     timeZone: "Asia/Kolkata",
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
// };

// const getStatusStyle = (status?: string) => {
//   switch (status?.toLowerCase()) {
//     case "completed":
//       return { backgroundColor: "#E5F7EC", color: "#16803D" };
//     case "confirmed":
//       return { backgroundColor: "#E8EEFF", color: "#3457C5" };
//     case "pending":
//       return { backgroundColor: "#FFF4D8", color: "#986400" };
//     case "cancelled":
//       return { backgroundColor: "#FDEAEA", color: "#B42318" };
//     case "no-show":
//     case "noshow":
//       return { backgroundColor: "#F1E8FF", color: "#7542A8" };
//     default:
//       return { backgroundColor: "#EEF1F5", color: "#526071" };
//   }
// };

// export default function StaffManagementScreen() {
//   const [staff, setStaff] = useState<StaffMember[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [formVisible, setFormVisible] = useState(false);
//   const [editingId, setEditingId] = useState<string | null>(null);
//   const [form, setForm] = useState(emptyForm);

//   const [staffHistory, setStaffHistory] = useState<Record<string, any>>({});
// const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
// const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
// const [historyError, setHistoryError] = useState<{
//   staffId: string;
//   message: string;
// } | null>(null);

//   const loadStaff = useCallback(async () => {
//     try {
//       setLoading(true);

//       const token = await AsyncStorage.getItem("bookeasy_token");

//       if (!token) {
//         router.replace("/business/login" as any);
//         return;
//       }

//       const response = await fetch(`${API_URL}/staff`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const data = await response.json().catch(() => ({}));

//       if (response.status === 401) {
//         await AsyncStorage.multiRemove([
//           "bookeasy_token",
//           "bookeasy_user",
//         ]);
//         router.replace("/business/login" as any);
//         return;
//       }

//       if (response.status === 403) {
//         Alert.alert(
//           "Staff Management unavailable",
//           data.message ||
//             "Your current subscription may not include staff management.",
//           [
//             { text: "Go Back", onPress: () => router.back() },
//             {
//               text: "View Plans",
//               onPress: () =>
//                 router.push("/business/subscription" as any),
//             },
//           ]
//         );
//         setStaff([]);
//         return;
//       }

//       if (!response.ok || data.success === false) {
//         throw new Error(data.message || "Unable to load staff.");
//       }

//       setStaff(Array.isArray(data.staff) ? data.staff : []);
//     } catch (error: any) {
//       Alert.alert(
//         "Unable to load staff",
//         error?.message || "Please check your internet connection."
//       );
//     } finally {
//       setLoading(false);
//     }
//   }, []);

 

// const loadStaffHistory = async (staffId: string) => {
//   if (expandedHistoryId === staffId) {
//     setExpandedHistoryId(null);
//     setHistoryError(null);
//     return;
//   }

//   setExpandedHistoryId(null);
//   setHistoryLoadingId(staffId);
//   setHistoryError(null);

//   try {
//     const token = await AsyncStorage.getItem("bookeasy_token");

//     if (!token) {
//       await AsyncStorage.multiRemove([
//         "bookeasy_token",
//         "bookeasy_user",
//       ]);
//       router.replace("/business/login" as any);
//       return;
//     }

//     const response = await fetch(
//       `${API_URL}/staff/${staffId}/bookings`,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );

//     const data = await response.json().catch(() => ({}));

//     if (response.status === 401) {
//       await AsyncStorage.multiRemove([
//         "bookeasy_token",
//         "bookeasy_user",
//       ]);
//       router.replace("/business/login" as any);
//       return;
//     }

//     if (response.status === 403) {
//       throw new Error(
//         data.message ||
//           "Your current subscription does not allow staff management."
//       );
//     }

//     if (!response.ok || data.success === false) {
//       throw new Error(
//         data.message || "Unable to load staff work history."
//       );
//     }

//     if (
//       !Array.isArray(data.bookings) ||
//       typeof data.summary !== "object" ||
//       data.summary === null
//     ) {
//       throw new Error(
//         "The server returned an unexpected work history response."
//       );
//     }

//     setStaffHistory((previous) => ({
//       ...previous,
//       [staffId]: data,
//     }));

//     setExpandedHistoryId(staffId);
//   } catch (error: any) {
//     setHistoryError({
//       staffId,
//       message:
//         error?.message || "Unable to load staff work history.",
//     });
//   } finally {
//     setHistoryLoadingId(null);
//   }
// };




//   useFocusEffect(
//     useCallback(() => {
//       loadStaff();
//     }, [loadStaff])
//   );

//   const openAddForm = () => {
//     setEditingId(null);
//     setForm(emptyForm);
//     setFormVisible(true);
//   };

//   const openEditForm = (member: StaffMember) => {
//     setEditingId(member._id);
//     setForm({
//       name: member.name || "",
//       phone: member.phone || "",
//       email: member.email || "",
//       designation: member.designation || "",
//     });
//     setFormVisible(true);
//   };

//   const updateField = (
//     field: keyof typeof emptyForm,
//     value: string
//   ) => {
//     setForm((previous) => ({ ...previous, [field]: value }));
//   };

//   const saveStaff = async () => {
//     if (!form.name.trim()) {
//       Alert.alert("Name required", "Enter the staff member's name.");
//       return;
//     }

//     try {
//       setSaving(true);

//       const token = await AsyncStorage.getItem("bookeasy_token");

//       if (!token) {
//         router.replace("/business/login" as any);
//         return;
//       }

//       const isEditing = Boolean(editingId);
//       const endpoint = isEditing
//         ? `${API_URL}/staff/${editingId}`
//         : `${API_URL}/staff`;

//       const response = await fetch(endpoint, {
//         method: isEditing ? "PATCH" : "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           name: form.name.trim(),
//           phone: form.phone.trim(),
//           email: form.email.trim().toLowerCase(),
//           designation: form.designation.trim() || "Staff",
//         }),
//       });

//       const data = await response.json().catch(() => ({}));

//       if (response.status === 401) {
//         await AsyncStorage.multiRemove([
//           "bookeasy_token",
//           "bookeasy_user",
//         ]);
//         router.replace("/business/login" as any);
//         return;
//       }

//       if (!response.ok || data.success === false) {
//         throw new Error(
//           data.message || "Unable to save staff member."
//         );
//       }

//       setFormVisible(false);
//       setEditingId(null);
//       setForm(emptyForm);

//       Alert.alert(
//         "Success",
//         data.message || "Staff member saved successfully."
//       );

//       await loadStaff();
//     } catch (error: any) {
//       Alert.alert(
//         "Unable to save staff",
//         error?.message || "Please try again."
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   const changeActiveStatus = async (
//     member: StaffMember,
//     activate: boolean
//   ) => {
//     try {
//       const token = await AsyncStorage.getItem("bookeasy_token");

//       if (!token) {
//         router.replace("/business/login" as any);
//         return;
//       }

//       const response = await fetch(`${API_URL}/staff/${member._id}`, {
//         method: "PATCH",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ isActive: activate }),
//       });

//       const data = await response.json().catch(() => ({}));

//       if (response.status === 401) {
//         await AsyncStorage.multiRemove([
//           "bookeasy_token",
//           "bookeasy_user",
//         ]);
//         router.replace("/business/login" as any);
//         return;
//       }

//       if (!response.ok || data.success === false) {
//         throw new Error(data.message || "Unable to update staff status.");
//       }

//       await loadStaff();
//     } catch (error: any) {
//       Alert.alert(
//         "Update failed",
//         error?.message || "Please try again."
//       );
//     }
//   };

//   const deactivateStaff = (member: StaffMember) => {
//     Alert.alert(
//       "Deactivate staff member?",
//       `${member.name} will be marked inactive. Their record will be kept.`,
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Deactivate",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               const token = await AsyncStorage.getItem(
//                 "bookeasy_token"
//               );

//               if (!token) {
//                 router.replace("/business/login" as any);
//                 return;
//               }

//               const response = await fetch(
//                 `${API_URL}/staff/${member._id}`,
//                 {
//                   method: "DELETE",
//                   headers: {
//                     Authorization: `Bearer ${token}`,
//                   },
//                 }
//               );

//               const data = await response.json().catch(() => ({}));

//               if (response.status === 401) {
//                 await AsyncStorage.multiRemove([
//                   "bookeasy_token",
//                   "bookeasy_user",
//                 ]);
//                 router.replace("/business/login" as any);
//                 return;
//               }

//               if (!response.ok || data.success === false) {
//                 throw new Error(
//                   data.message || "Unable to deactivate staff."
//                 );
//               }

//               await loadStaff();
//             } catch (error: any) {
//               Alert.alert(
//                 "Deactivation failed",
//                 error?.message || "Please try again."
//               );
//             }
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <KeyboardAvoidingView
//       style={styles.screen}
//       behavior={Platform.OS === "ios" ? "padding" : undefined}
//     >
//       <ScrollView
//         contentContainerStyle={styles.container}
//         keyboardShouldPersistTaps="handled"
//       >
//         <View style={styles.header}>
//           <TouchableOpacity
//             style={styles.backButton}
//             onPress={() => router.back()}
//           >
//             <Text style={styles.backText}>‹  Back</Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.refreshButton}
//             onPress={loadStaff}
//             disabled={loading}
//           >
//             <Text style={styles.refreshText}>Refresh</Text>
//           </TouchableOpacity>
//         </View>

//         <Text style={styles.eyebrow}>YOUR BUSINESS</Text>
//         <Text style={styles.title}>Staff Management</Text>
//         <Text style={styles.subtitle}>
//           Add team members and keep their details up to date.
//         </Text>

//         <View style={styles.summaryCard}>
//           <View>
//             <Text style={styles.summaryLabel}>Team members</Text>
//             <Text style={styles.summaryNumber}>{staff.length}</Text>
//           </View>
//           <View>
//             <Text style={styles.summaryLabel}>Active members</Text>
//             <Text style={styles.summaryNumber}>
//               {staff.filter((member) => member.isActive).length}
//             </Text>
//           </View>
//           <Text style={styles.teamIcon}>👥</Text>
//         </View>

//         {!formVisible ? (
//           <TouchableOpacity
//             style={styles.addButton}
//             onPress={openAddForm}
//             activeOpacity={0.85}
//           >
//             <Text style={styles.addButtonText}>＋  Add staff member</Text>
//           </TouchableOpacity>
//         ) : (
//           <View style={styles.formCard}>
//             <Text style={styles.formTitle}>
//               {editingId ? "Edit staff member" : "Add staff member"}
//             </Text>

//             <Text style={styles.label}>Full name *</Text>
//             <TextInput
//               style={styles.input}
//               value={form.name}
//               onChangeText={(value) => updateField("name", value)}
//               placeholder="Enter full name"
//               placeholderTextColor="#8A968F"
//               maxLength={100}
//             />

//             <Text style={styles.label}>Phone number</Text>
//             <TextInput
//               style={styles.input}
//               value={form.phone}
//               onChangeText={(value) => updateField("phone", value)}
//               placeholder="Enter phone number"
//               placeholderTextColor="#8A968F"
//               keyboardType="phone-pad"
//               maxLength={20}
//             />

//             <Text style={styles.label}>Email</Text>
//             <TextInput
//               style={styles.input}
//               value={form.email}
//               onChangeText={(value) => updateField("email", value)}
//               placeholder="Enter email address"
//               placeholderTextColor="#8A968F"
//               keyboardType="email-address"
//               autoCapitalize="none"
//               maxLength={254}
//             />

//             <Text style={styles.label}>Designation</Text>
//             <TextInput
//               style={styles.input}
//               value={form.designation}
//               onChangeText={(value) =>
//                 updateField("designation", value)
//               }
//               placeholder="e.g. Hair Stylist, Trainer"
//               placeholderTextColor="#8A968F"
//               maxLength={100}
//             />

//             <TouchableOpacity
//               style={[styles.addButton, saving && styles.disabledButton]}
//               onPress={saveStaff}
//               disabled={saving}
//             >
//               {saving ? (
//                 <ActivityIndicator color="#FFFFFF" />
//               ) : (
//                 <Text style={styles.addButtonText}>
//                   {editingId ? "Save changes" : "Add staff member"}
//                 </Text>
//               )}
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.cancelButton}
//               onPress={() => {
//                 setFormVisible(false);
//                 setEditingId(null);
//                 setForm(emptyForm);
//               }}
//               disabled={saving}
//             >
//               <Text style={styles.cancelText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         <View style={styles.listHeader}>
//           <Text style={styles.sectionTitle}>Your team</Text>
//           <Text style={styles.countText}>{staff.length} total</Text>
//         </View>

//         {loading ? (
//           <View style={styles.center}>
//             <ActivityIndicator size="large" color="#243B35" />
//             <Text style={styles.loadingText}>Loading team members...</Text>
//           </View>
//         ) : staff.length === 0 ? (
//           <View style={styles.emptyCard}>
//             <Text style={styles.emptyIcon}>🧑‍🤝‍🧑</Text>
//             <Text style={styles.emptyTitle}>No staff members yet</Text>
//             <Text style={styles.emptyText}>
//               Add your first team member to keep your staff details organized.
//             </Text>
//           </View>
//         ) : (
//           staff.map((member) => (
//             <View key={member._id} style={styles.staffCard}>
//               <View style={styles.staffTop}>
//                 <View style={styles.avatar}>
//                   <Text style={styles.avatarText}>
//                     {member.name.trim().charAt(0).toUpperCase() || "S"}
//                   </Text>
//                 </View>

//                 <View style={styles.staffInfo}>
//                   <Text style={styles.staffName}>{member.name}</Text>
//                   <Text style={styles.designation}>
//                     {member.designation || "Staff"}
//                   </Text>
//                   <View
//                     style={[
//                       styles.statusPill,
//                       member.isActive
//                         ? styles.activePill
//                         : styles.inactivePill,
//                     ]}
//                   >
//                     <Text
//                       style={[
//                         styles.statusText,
//                         member.isActive
//                           ? styles.activeText
//                           : styles.inactiveText,
//                       ]}
//                     >
//                       {member.isActive ? "Active" : "Inactive"}
//                     </Text>
//                   </View>
//                 </View>
//               </View>

//               {member.phone ? (
//                 <Text style={styles.contactText}>
//                   Phone: {member.phone}
//                 </Text>
//               ) : null}

//               {member.email ? (
//                 <Text style={styles.contactText}>
//                   Email: {member.email}
//                 </Text>
//               ) : null}

//               <View style={styles.actions}>
//                 <TouchableOpacity
//                   style={styles.editButton}
//                   onPress={() => openEditForm(member)}
//                 >
//                   <Text style={styles.editButtonText}>Edit details</Text>
//                 </TouchableOpacity>

//                 {member.isActive ? (
//                   <TouchableOpacity
//                     style={styles.deactivateButton}
//                     onPress={() => deactivateStaff(member)}
//                   >
//                     <Text style={styles.deactivateText}>Deactivate</Text>
//                   </TouchableOpacity>
//                 ) : (
//                   <TouchableOpacity
//                     style={styles.activateButton}
//                     onPress={() => changeActiveStatus(member, true)}
//                   >
//                     <Text style={styles.activateText}>Reactivate</Text>
//                   </TouchableOpacity>
//                 )}
//               </View>

// <Pressable
//   onPress={() => loadStaffHistory(member._id)}
//   disabled={historyLoadingId === member._id}
//   style={[
//     styles.historyToggle,
//     expandedHistoryId === member._id && styles.historyToggleActive,
//     historyLoadingId === member._id && styles.disabledButton,
//   ]}
// >
//   <View style={styles.historyToggleContent}>
//     <Text style={styles.historyToggleIcon}>
//       {expandedHistoryId === member._id ? "−" : "+"}
//     </Text>

//     <Text
//       style={[
//         styles.historyToggleText,
//         expandedHistoryId === member._id &&
//           styles.historyToggleTextActive,
//       ]}
//     >
//       {historyLoadingId === member._id
//         ? "Loading work history..."
//         : expandedHistoryId === member._id
//           ? "Hide Work History"
//           : "View Work History"}
//     </Text>
//   </View>

//   <Text style={styles.historyToggleArrow}>
//     {expandedHistoryId === member._id ? "⌃" : "⌄"}
//   </Text>
// </Pressable>

// {historyError?.staffId === member._id ? (
//   <Text style={styles.historyError}>
//     {historyError.message}
//   </Text>
// ) : null}

//   {expandedHistoryId === member._id &&
//           staffHistory[member._id] && (
//             <View style={styles.historyContainer}>
//       {(() => {
//         const history = staffHistory[member._id];
//         const summary = history.summary || {};
//         const bookings = Array.isArray(history.bookings)
//           ? history.bookings
//           : [];

//         const stats = [
//           {
//             label: "Total",
//             value: summary.total ?? 0,
//             color: "#3457C5",
//             background: "#E8EEFF",
//           },
//           {
//             label: "Completed",
//             value: summary.completed ?? 0,
//             color: "#16803D",
//             background: "#E5F7EC",
//           },
//           {
//             label: "Confirmed",
//             value: summary.confirmed ?? 0,
//             color: "#087E8B",
//             background: "#DDF7F7",
//           },
//           {
//             label: "Pending",
//             value: summary.pending ?? 0,
//             color: "#986400",
//             background: "#FFF4D8",
//           },
//           {
//             label: "Cancelled",
//             value: summary.cancelled ?? 0,
//             color: "#B42318",
//             background: "#FDEAEA",
//           },
//           {
//             label: "No-show",
//             value: summary.noShow ?? 0,
//             color: "#7542A8",
//             background: "#F1E8FF",
//           },
//         ];

//         return (
//           <>
//             <View style={styles.historyHeading}>
//               <View style={styles.historyHeadingIcon}>
//                 <Text style={styles.historyHeadingIconText}>↗</Text>
//               </View>

//               <View style={styles.historyHeadingText}>
//                 <Text style={styles.historyTitle}>Work History</Text>
//                 <Text style={styles.historySubtitle}>
//                   Appointments assigned to {member.name}
//                 </Text>
//               </View>
//             </View>

//             <View style={styles.historyStatsGrid}>
//               {stats.map((stat) => (
//                 <View
//                   key={stat.label}
//                   style={[
//                     styles.historyStatCard,
//                     { backgroundColor: stat.background },
//                   ]}
//                 >
//                   <Text
//                     style={[
//                       styles.historyStatValue,
//                       { color: stat.color },
//                     ]}
//                   >
//                     {stat.value}
//                   </Text>

//                   <Text style={styles.historyStatLabel}>
//                     {stat.label}
//                   </Text>
//                 </View>
//               ))}
//             </View>

//             <View style={styles.historyBookingHeader}>
//               <Text style={styles.historyBookingHeaderTitle}>
//                 Appointment activity
//               </Text>

//               <View style={styles.historyCountBadge}>
//                 <Text style={styles.historyCountText}>
//                   {bookings.length}
//                 </Text>
//               </View>
//             </View>

//             {bookings.length === 0 ? (
//               <View style={styles.historyEmpty}>
//                 <Text style={styles.historyEmptyIcon}>📅</Text>
//                 <Text style={styles.historyEmptyTitle}>
//                   No appointment history
//                 </Text>
//                 <Text style={styles.historyEmptyText}>
//                   Appointments assigned to this staff member will appear here.
//                 </Text>
//               </View>
//             ) : (
//               bookings.map((booking: any) => {
//                 const statusStyle = getStatusStyle(booking.status);

//                 return (
//                   <View
//                     key={booking._id}
//                     style={styles.historyBookingCard}
//                   >
//                     <View style={styles.bookingAccent} />

//                     <View style={styles.historyBookingContent}>
//                       <View style={styles.bookingTitleRow}>
//                         <View style={styles.bookingServiceIcon}>
//                           <Text style={styles.bookingServiceIconText}>
//                             ✦
//                           </Text>
//                         </View>

//                         <View style={styles.bookingTitleContent}>
//                           <Text style={styles.bookingServiceName}>
//                             {booking.serviceId?.name ||
//                               "Service unavailable"}
//                           </Text>

//                           <Text style={styles.bookingCustomer}>
//                             Customer: {booking.customerName || "Unknown"}
//                           </Text>
//                         </View>

//                         <View
//                           style={[
//                             styles.bookingStatusBadge,
//                             { backgroundColor: statusStyle.backgroundColor },
//                           ]}
//                         >
//                           <Text
//                             style={[
//                               styles.bookingStatusText,
//                               { color: statusStyle.color },
//                             ]}
//                           >
//                             {booking.status || "Unknown"}
//                           </Text>
//                         </View>
//                       </View>

//                       <View style={styles.bookingInfoRow}>
//                         <Text style={styles.bookingInfoIcon}>◷</Text>

//                         <View style={styles.bookingInfoContent}>
//                           <Text style={styles.bookingInfoLabel}>
//                             APPOINTMENT
//                           </Text>

//                           <Text style={styles.bookingInfoValue}>
//                             {formatDateTime(booking.bookingDate)}
//                           </Text>
//                         </View>
//                       </View>

//                       {Array.isArray(booking.statusHistory) &&
//                         booking.statusHistory.length > 0 && (
//                           <View style={styles.timelineSection}>
//                             <Text style={styles.timelineTitle}>
//                               Activity timeline
//                             </Text>

//                             {booking.statusHistory.map(
//                               (event: any, index: number) => {
//                                 const actionLabel =
//                                   event.action === "rescheduled"
//                                     ? "Appointment rescheduled"
//                                     : event.action === "staff_assigned"
//                                       ? "Staff assigned"
//                                       : event.action === "staff_unassigned"
//                                         ? "Staff unassigned"
//                                         : `Status: ${event.status || "Updated"}`;

//                                 return (
//                                   <View
//                                     key={`${booking._id}-${index}`}
//                                     style={styles.timelineItem}
//                                   >
//                                     <View style={styles.timelineMarkerColumn}>
//                                       <View
//                                         style={[
//                                           styles.timelineDot,
//                                           index === 0 &&
//                                             styles.timelineDotLatest,
//                                         ]}
//                                       />

//                                       {index <
//                                         booking.statusHistory.length - 1 && (
//                                         <View style={styles.timelineLine} />
//                                       )}
//                                     </View>

//                                     <View style={styles.timelineContent}>
//                                       <Text style={styles.timelineAction}>
//                                         {actionLabel}
//                                       </Text>

//                                       <Text style={styles.timelineMeta}>
//                                         {event.changedByName ||
//                                           "Business owner"}
//                                       </Text>

//                                       <Text style={styles.timelineDate}>
//                                         {formatDateTime(event.changedAt)}
//                                       </Text>

//                                       {event.action === "staff_assigned" && (
//                                         <Text style={styles.timelineChange}>
//                                           {event.oldStaffName || "Unassigned"}
//                                           {"  →  "}
//                                           {event.newStaffName || "Unassigned"}
//                                         </Text>
//                                       )}

//                                       {event.action === "staff_unassigned" && (
//                                         <Text style={styles.timelineChange}>
//                                           {event.oldStaffName || member.name}
//                                           {"  →  Unassigned"}
//                                         </Text>
//                                       )}

//                                       {event.action === "rescheduled" && (
//                                         <View style={styles.rescheduleBox}>
//                                           <Text style={styles.rescheduleLabel}>
//                                             Previous appointment
//                                           </Text>

//                                           <Text style={styles.rescheduleDate}>
//                                             {formatDateTime(
//                                               event.oldBookingDate
//                                             )}
//                                           </Text>

//                                           <Text style={styles.rescheduleArrow}>
//                                             ↓ Rescheduled to
//                                           </Text>

//                                           <Text style={styles.rescheduleDate}>
//                                             {formatDateTime(
//                                               event.newBookingDate
//                                             )}
//                                           </Text>

//                                       )}
//                                     </View>
//                                   </View>
//                                 );
//                               }
//                             )}
//                           </View>
//                         )}
//                     </View>
//                   </View>
//                 );
//               })
//             )}
//           </>
//         );
//       })()}
//     </View>
//   )}
//             </View>
//           ))
//         )}




// const styles = StyleSheet.create({
//   screen: {
//     flex: 1,
//     backgroundColor: "#F7F6F0",
//   },
//   container: {
//     padding: 20,
//     paddingBottom: 40,
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 24,
//   },
//   backButton: {
//     paddingVertical: 8,
//     paddingRight: 12,
//   },
//   backText: {
//     color: "#243B35",
//     fontSize: 16,
//     fontWeight: "700",
//   },
//   refreshButton: {
//     paddingHorizontal: 14,
//     paddingVertical: 9,
//     backgroundColor: "#E9F0E8",
//     borderRadius: 10,
//   },
//   refreshText: {
//     color: "#243B35",
//     fontWeight: "700",
//   },
//   eyebrow: {
//     color: "#64766A",
//     fontSize: 12,
//     fontWeight: "800",
//     letterSpacing: 1.4,
//   },
//   title: {
//     color: "#243B35",
//     fontSize: 28,
//     fontWeight: "800",
//     marginTop: 6,
//   },
//   subtitle: {
//     color: "#64766A",
//     fontSize: 14,
//     lineHeight: 21,
//     marginTop: 8,
//     marginBottom: 20,
//   },
//   summaryCard: {
//     backgroundColor: "#243B35",
//     borderRadius: 18,
//     padding: 20,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 18,
//   },
//   summaryLabel: {
//     color: "#D6E1D8",
//     fontSize: 12,
//     marginBottom: 8,
//   },
//   summaryNumber: {
//     color: "#FFFFFF",
//     fontSize: 27,
//     fontWeight: "800",
//   },
//   teamIcon: {
//     fontSize: 34,
//   },
//   addButton: {
//     backgroundColor: "#243B35",
//     borderRadius: 12,
//     minHeight: 50,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingHorizontal: 16,
//     paddingVertical: 13,
//   },
//   addButtonText: {
//     color: "#FFFFFF",
//     fontWeight: "800",
//     fontSize: 15,
//   },
//   disabledButton: {
//     opacity: 0.65,
//   },
//   formCard: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 16,
//     padding: 17,
//     marginBottom: 20,
//     borderWidth: 1,
//     borderColor: "#E0E7DF",
//   },
//   formTitle: {
//     fontSize: 19,
//     fontWeight: "800",
//     color: "#243B35",
//     marginBottom: 14,
//   },
//   label: {
//     fontSize: 13,
//     fontWeight: "700",
//     color: "#34483F",
//     marginBottom: 7,
//     marginTop: 10,
//   },
//   input: {
//     backgroundColor: "#FAFBF8",
//     borderWidth: 1,
//     borderColor: "#DCE4DC",
//     borderRadius: 10,
//     minHeight: 46,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     color: "#243B35",
//     fontSize: 15,
//   },
//   cancelButton: {
//     alignItems: "center",
//     padding: 12,
//     marginTop: 4,
//   },
//   cancelText: {
//     color: "#64766A",
//     fontWeight: "700",
//   },
//   listHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginTop: 28,
//     marginBottom: 13,
//   },
//   sectionTitle: {
//     color: "#243B35",
//     fontSize: 20,
//     fontWeight: "800",
//   },
//   countText: {
//     color: "#64766A",
//     fontSize: 13,
//   },
//   center: {
//     alignItems: "center",
//     padding: 30,
//   },
//   loadingText: {
//     marginTop: 12,
//     color: "#64766A",
//   },
//   emptyCard: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 16,
//     padding: 28,
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#E0E7DF",
//   },
//   emptyIcon: {
//     fontSize: 38,
//     marginBottom: 12,
//   },
//   emptyTitle: {
//     color: "#243B35",
//     fontSize: 17,
//     fontWeight: "800",
//   },
//   emptyText: {
//     color: "#64766A",
//     textAlign: "center",
//     lineHeight: 21,
//     marginTop: 8,
//   },
//   staffCard: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 15,
//     padding: 16,
//     marginBottom: 13,
//     borderWidth: 1,
//     borderColor: "#E0E7DF",
//   },
//   staffTop: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   avatar: {
//     width: 47,
//     height: 47,
//     borderRadius: 24,
//     backgroundColor: "#E9F0E8",
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 12,
//   },
//   avatarText: {
//     fontSize: 20,
//     color: "#243B35",
//     fontWeight: "800",
//   },
//   staffInfo: {
//     flex: 1,
//     alignItems: "flex-start",
//   },
//   staffName: {
//     color: "#243B35",
//     fontSize: 17,
//     fontWeight: "800",
//   },
//   designation: {
//     color: "#64766A",
//     fontSize: 13,
//     marginTop: 3,
//   },
//   statusPill: {
//     paddingHorizontal: 9,
//     paddingVertical: 4,
//     borderRadius: 20,
//     marginTop: 7,
//   },
//   activePill: {
//     backgroundColor: "#E4F5E7",
//   },
//   inactivePill: {
//     backgroundColor: "#F1E7E7",
//   },
//   statusText: {
//     fontSize: 11,
//     fontWeight: "800",
//   },
//   activeText: {
//     color: "#24723A",
//   },
//   inactiveText: {
//     color: "#9A3B3B",
//   },
//   contactText: {
//     color: "#52645A",
//     fontSize: 13,
//     marginTop: 4,
//   },
//   actions: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 9,
//     marginTop: 15,
//   },
//   editButton: {
//     backgroundColor: "#E9F0E8",
//     paddingHorizontal: 13,
//     paddingVertical: 10,
//     borderRadius: 9,
//   },
//   editButtonText: {
//     color: "#243B35",
//     fontSize: 12,
//     fontWeight: "800",
//   },
//   deactivateButton: {
//     backgroundColor: "#FBEAEA",
//     paddingHorizontal: 13,
//     paddingVertical: 10,
//     borderRadius: 9,
//   },
//   deactivateText: {
//     color: "#A33434",
//     fontSize: 12,
//     fontWeight: "800",
//   },
//   activateButton: {
//     backgroundColor: "#E4F5E7",
//     paddingHorizontal: 13,
//     paddingVertical: 10,
//     borderRadius: 9,
//   },
//   activateText: {
//     color: "#24723A",
//     fontSize: 12,
//     fontWeight: "800",
//   },

//     // Work history expand/collapse
//   historyToggle: {
//     marginTop: 16,
//     minHeight: 48,
//     paddingHorizontal: 14,
//     paddingVertical: 11,
//     borderRadius: 12,
//     backgroundColor: "#F4F6FF",
//     borderWidth: 1,
//     borderColor: "#DCE3FF",
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   historyToggleActive: {
//     backgroundColor: "#E8EEFF",
//     borderColor: "#C8D5FF",
//   },
//   historyToggleContent: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//   },
//   historyToggleIcon: {
//     fontSize: 21,
//     fontWeight: "700",
//     color: "#4657C8",
//   },
//   historyToggleText: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#4657C8",
//   },
//   historyToggleTextActive: {
//     color: "#293C9C",
//   },
//   historyToggleArrow: {
//     color: "#4657C8",
//     fontSize: 20,
//     fontWeight: "700",
//   },
//   historyError: {
//     marginTop: 10,
//     padding: 12,
//     borderRadius: 10,
//     backgroundColor: "#FDEAEA",
//     color: "#B42318",
//     fontSize: 13,
//     lineHeight: 19,
//   },

//   // History container and heading
//   historyContainer: {
//     marginTop: 14,
//     padding: 14,
//     backgroundColor: "#F8FAFF",
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: "#E0E7F5",
//   },
//   historyHeading: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 16,
//     gap: 11,
//   },
//   historyHeadingIcon: {
//     width: 43,
//     height: 43,
//     borderRadius: 13,
//     backgroundColor: "#E8EEFF",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   historyHeadingIconText: {
//     color: "#4657C8",
//     fontSize: 24,
//     fontWeight: "800",
//   },
//   historyHeadingText: {
//     flex: 1,
//   },
//   historyTitle: {
//     fontSize: 18,
//     fontWeight: "800",
//     color: "#172B4D",
//   },
//   historySubtitle: {
//     fontSize: 12,
//     color: "#71809A",
//     lineHeight: 18,
//     marginTop: 3,
//   },

//   // Summary grid
//   historyStatsGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 9,
//     marginBottom: 20,
//   },
//   historyStatCard: {
//     width: "31%",
//     minHeight: 79,
//     borderRadius: 12,
//     paddingVertical: 12,
//     paddingHorizontal: 7,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   historyStatValue: {
//     fontSize: 23,
//     fontWeight: "800",
//   },
//   historyStatLabel: {
//     fontSize: 10,
//     fontWeight: "700",
//     color: "#526071",
//     marginTop: 4,
//     textAlign: "center",
//   },

//   // Appointment list
//   historyBookingHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 12,
//   },
//   historyBookingHeaderTitle: {
//     color: "#172B4D",
//     fontSize: 15,
//     fontWeight: "800",
//     flexShrink: 1,
//   },
//   historyCountBadge: {
//     minWidth: 28,
//     height: 28,
//     paddingHorizontal: 8,
//     borderRadius: 14,
//     backgroundColor: "#E8EEFF",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   historyCountText: {
//     color: "#3457C5",
//     fontSize: 12,
//     fontWeight: "800",
//   },
//   historyEmpty: {
//     padding: 22,
//     borderRadius: 12,
//     backgroundColor: "#FFFFFF",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#E5EAF3",
//   },
//   historyEmptyIcon: {
//     fontSize: 28,
//     marginBottom: 8,
//   },
//   historyEmptyTitle: {
//     fontSize: 14,
//     fontWeight: "800",
//     color: "#24334D",
//   },
//   historyEmptyText: {
//     fontSize: 12,
//     lineHeight: 18,
//     textAlign: "center",
//     color: "#71809A",
//     marginTop: 6,
//   },

//   // Individual booking card
//   historyBookingCard: {
//     flexDirection: "row",
//     overflow: "hidden",
//     borderRadius: 13,
//     backgroundColor: "#FFFFFF",
//     borderWidth: 1,
//     borderColor: "#E3E9F2",
//     marginBottom: 12,
//   },
//   bookingAccent: {
//     width: 4,
//     backgroundColor: "#6978E8",
//   },
//   historyBookingContent: {
//     flex: 1,
//     minWidth: 0,
//     padding: 12,
//     gap: 14,
//   },
//   bookingTitleRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     gap: 9,
//   },
//   bookingServiceIcon: {
//     width: 35,
//     height: 35,
//     borderRadius: 10,
//     backgroundColor: "#F0F2FF",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   bookingServiceIconText: {
//     color: "#5966D8",
//     fontSize: 20,
//     fontWeight: "800",
//   },
//   bookingTitleContent: {
//     flex: 1,
//     minWidth: 0,
//   },
//   bookingServiceName: {
//     fontSize: 15,
//     lineHeight: 21,
//     fontWeight: "800",
//     color: "#172B4D",
//   },
//   bookingCustomer: {
//     fontSize: 12,
//     lineHeight: 18,
//     color: "#71809A",
//     marginTop: 3,
//   },
//   bookingStatusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 5,
//     borderRadius: 8,
//     alignSelf: "flex-start",
//     maxWidth: 100,
//   },
//   bookingStatusText: {
//     fontSize: 10,
//     fontWeight: "800",
//     textTransform: "capitalize",
//   },
//   bookingInfoRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     gap: 10,
//     padding: 11,
//     borderRadius: 10,
//     backgroundColor: "#F7F9FC",
//   },
//   bookingInfoIcon: {
//     color: "#5966D8",
//     fontSize: 19,
//     fontWeight: "800",
//   },
//   bookingInfoContent: {
//     flex: 1,
//   },
//   bookingInfoLabel: {
//     color: "#8995A9",
//     fontSize: 9,
//     fontWeight: "800",
//     letterSpacing: 1,
//   },
//   bookingInfoValue: {
//     color: "#344563",
//     fontSize: 12,
//     lineHeight: 19,
//     fontWeight: "600",
//     marginTop: 4,
//   },

//   // Activity timeline
//   timelineSection: {
//     borderTopWidth: 1,
//     borderTopColor: "#EDF0F6",
//     paddingTop: 13,
//   },
//   timelineTitle: {
//     color: "#24334D",
//     fontSize: 13,
//     fontWeight: "800",
//     marginBottom: 14,
//   },
//   timelineItem: {
//     flexDirection: "row",
//     alignSelf: "stretch",
//     gap: 10,
//   },
//   timelineMarkerColumn: {
//     width: 13,
//     alignItems: "center",
//   },
//   timelineDot: {
//     width: 9,
//     height: 9,
//     borderRadius: 5,
//     backgroundColor: "#B9C4D7",
//     marginTop: 4,
//   },
//   timelineDotLatest: {
//     backgroundColor: "#5966D8",
//     width: 11,
//     height: 11,
//     borderRadius: 6,
//   },
//   timelineLine: {
//     width: 2,
//     flex: 1,
//     minHeight: 20,
//     backgroundColor: "#E0E6F0",
//     marginTop: 4,
//     marginBottom: 3,
//   },
//   timelineContent: {
//     flex: 1,
//     minWidth: 0,
//     paddingBottom: 17,
//   },
//   timelineAction: {
//     color: "#24334D",
//     fontSize: 12,
//     fontWeight: "800",
//     lineHeight: 18,
//   },
//   timelineMeta: {
//     color: "#63728A",
//     fontSize: 11,
//     marginTop: 4,
//   },
//   timelineDate: {
//     color: "#8A96A8",
//     fontSize: 10,
//     lineHeight: 16,
//     marginTop: 3,
//   },
//   timelineChange: {
//     color: "#4657C8",
//     fontSize: 11,
//     lineHeight: 17,
//     fontWeight: "700",
//     marginTop: 7,
//     backgroundColor: "#F0F2FF",
//     padding: 8,
//     borderRadius: 7,
//     overflow: "hidden",
//   },
//   rescheduleBox: {
//     backgroundColor: "#F7F9FC",
//     borderRadius: 9,
//     padding: 10,
//     marginTop: 8,
//     borderWidth: 1,
//     borderColor: "#E5EAF3",
//   },
//   rescheduleLabel: {
//     color: "#8995A9",
//     fontSize: 9,
//     fontWeight: "800",
//     textTransform: "uppercase",
//     letterSpacing: 0.6,
//   },
//   rescheduleDate: {
//     color: "#344563",
//     fontSize: 11,
//     lineHeight: 17,
//     fontWeight: "600",
//     marginTop: 5,
//   },
//   rescheduleArrow: {
//     color: "#5966D8",
//     fontSize: 11,
//     fontWeight: "800",
//     marginTop: 8,
//   },
// });
