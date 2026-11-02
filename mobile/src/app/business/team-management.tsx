import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
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

type WorkingHour = {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
};

type Staff = {
  _id: string;
  name: string;
  designation?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive: boolean;
  workingHours?: WorkingHour[];
  serviceIds?: string[];
};

type BusinessService = {
  _id: string;
  name: string;
  staffIds?: (string | { _id: string })[];
  isActive?: boolean;
};

type WorkHistoryAppointment = {
  _id: string;
  bookingDate?: string;
  status?: string;
  customerName?: string;
  customerPhone?: string;
  serviceName?: string;
  service?: { name?: string };
  serviceId?: { name?: string };
};

type WorkHistoryData = {
  staff?: Staff;
  summary?: {
    total?: number;
    completed?: number;
    cancelled?: number;
    noShow?: number;
    upcoming?: number;
  };
  appointments?: WorkHistoryAppointment[];
};


const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const createDefaultHours = (): WorkingHour[] =>
  DAYS.map((_, dayOfWeek) => ({
    dayOfWeek,
    isAvailable: dayOfWeek !== 0,
    startTime: "09:00",
    endTime: "18:00",
  }));

const normalizeHours = (
  hours?: WorkingHour[]
): WorkingHour[] => {
  const defaults = createDefaultHours();

  if (!Array.isArray(hours) || hours.length === 0) {
    return defaults;
  }

  return defaults.map((day) => {
    const saved = hours.find(
      (item) => item.dayOfWeek === day.dayOfWeek
    );

    return saved
      ? {
          dayOfWeek: day.dayOfWeek,
          isAvailable: Boolean(saved.isAvailable),
          startTime: saved.startTime || "09:00",
          endTime: saved.endTime || "18:00",
        }
      : day;
  });
};

export default function TeamManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
const [staffFilter, setStaffFilter] = useState<
  "all" | "active" | "inactive"
>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(
    null
  );

  const [historyVisible, setHistoryVisible] = useState(false);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState("");
const [historyData, setHistoryData] =
  useState<WorkHistoryData | null>(null);
const [historyStaff, setHistoryStaff] = useState<Staff | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(
    null
  );

  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(
    createDefaultHours()
  );

  const [services, setServices] = useState<BusinessService[]>([]);
const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
const [servicesLoading, setServicesLoading] = useState(false);

  const getToken = async () => {
    const token = await AsyncStorage.getItem("bookeasy_token");

    if (!token) {
      router.replace("/business/login");
      return null;
    }

    return token;
  };

  const loadStaff = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);

      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
        ]);
        router.replace("/business/login");
        return;
      }

      if (response.status === 403) {
        Alert.alert(
          "Team Management unavailable",
          data.message ||
            "Team Management requires an active eligible subscription."
        );
        router.back();
        return;
      }

      if (!response.ok) {
        Alert.alert(
          "Error",
          data.message || "Could not load team members."
        );
        return;
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.staff)
        ? data.staff
        : [];

      setStaff(list);
    } catch (error) {
      console.log("Load staff error:", error);
      Alert.alert(
        "Connection error",
        "Could not connect to the BookEasy server."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadServices = async () => {
  try {
    setServicesLoading(true);

    const token = await getToken();
    if (!token) return;

    const storedUser = await AsyncStorage.getItem("bookeasy_user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const businessId = user?.id || user?._id;

    if (!businessId) {
      Alert.alert("Error", "Business account information not found.");
      return;
    }

    const response = await fetch(
      `${API_URL}/services/${businessId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      await AsyncStorage.multiRemove([
        "bookeasy_token",
        "bookeasy_user",
      ]);
      router.replace("/business/login");
      return;
    }

    if (!response.ok) {
      Alert.alert(
        "Could not load services",
        data.message || "Please try again."
      );
      return;
    }

    const list = Array.isArray(data)
      ? data
      : Array.isArray(data.services)
      ? data.services
      : [];

    setServices(list.filter((service: BusinessService) =>
      service.isActive !== false
    ));
  } catch (error) {
    console.log("Load services error:", error);
    Alert.alert("Error", "Could not load business services.");
  } finally {
    setServicesLoading(false);
  }
};

useFocusEffect(
  useCallback(() => {
    loadStaff(true);
    loadServices();
  }, [])
);

  const resetForm = () => {
    setEditingStaff(null);
    setName("");
    setDesignation("");
    setPhone("");
    setEmail("");
    setNotes("");
    setWorkingHours(createDefaultHours());
    setSelectedServiceIds([]);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

const openEditModal = (member: Staff) => {
  setEditingStaff(member);
  setName(member.name || "");
  setDesignation(member.designation || "");
  setPhone(member.phone || "");
  setEmail(member.email || "");
  setNotes(member.notes || "");
  setWorkingHours(normalizeHours(member.workingHours));

  // Load services already assigned to this staff member
  const assignedServiceIds = services
    .filter((service) =>
      service.staffIds?.some((staffItem) => {
        const staffId =
          typeof staffItem === "string"
            ? staffItem
            : staffItem._id;

        return String(staffId) === String(member._id);
      })
    )
    .map((service) => service._id);

  setSelectedServiceIds(assignedServiceIds);

  setModalVisible(true);
};

const toggleService = (serviceId: string) => {
  setSelectedServiceIds((current) =>
    current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId]
  );
};

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    resetForm();
  };

  const updateWorkingHour = (
    dayOfWeek: number,
    changes: Partial<WorkingHour>
  ) => {
    setWorkingHours((current) =>
      current.map((item) =>
        item.dayOfWeek === dayOfWeek
          ? { ...item, ...changes }
          : item
      )
    );
  };

  const isValidTime = (value: string) =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

  const saveStaff = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter the staff member's name.");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    for (const day of workingHours) {
      if (!day.isAvailable) continue;

      if (
        !isValidTime(day.startTime) ||
        !isValidTime(day.endTime)
      ) {
        Alert.alert(
          "Invalid working hours",
          `Enter valid 24-hour times for ${DAYS[day.dayOfWeek]}, such as 09:00.`
        );
        return;
      }

      if (day.startTime >= day.endTime) {
        Alert.alert(
          "Invalid working hours",
          `End time must be later than start time for ${DAYS[day.dayOfWeek]}.`
        );
        return;
      }
    }

    try {
      const token = await getToken();
      if (!token) return;

      setSaving(true);

const body = {
  name: name.trim(),
  designation: designation.trim(),
  phone: phone.trim(),
  email: email.trim(),
  notes: notes.trim(),
  workingHours,
  serviceIds: selectedServiceIds,
};

      const url = editingStaff
        ? `${API_URL}/staff/${editingStaff._id}`
        : `${API_URL}/staff`;

      const response = await fetch(url, {
        method: editingStaff ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
        ]);
        router.replace("/business/login");
        return;
      }

      if (!response.ok) {
        Alert.alert(
          "Could not save staff",
          data.message || "Please try again."
        );
        return;
      }

      setModalVisible(false);
      resetForm();
      await loadStaff();

      Alert.alert(
        "Success",
        editingStaff
          ? "Team member updated successfully."
          : "Team member added successfully."
      );
    } catch (error) {
      console.log("Save staff error:", error);
      Alert.alert(
        "Connection error",
        "Could not connect to the BookEasy server."
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStaffStatus = async (
    member: Staff,
    activate: boolean
  ) => {
    try {
      const token = await getToken();
      if (!token) return;

      setProcessingId(member._id);

      const endpoint = activate ? "activate" : "deactivate";

      const response = await fetch(
        `${API_URL}/staff/${member._id}/${endpoint}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
        ]);
        router.replace("/business/login");
        return;
      }

      if (!response.ok) {
        Alert.alert(
          "Could not update staff",
          data.message || "Please try again."
        );
        return;
      }

      await loadStaff();

      Alert.alert(
        "Success",
        activate
          ? "Team member activated."
          : "Team member deactivated."
      );
    } catch (error) {
      console.log("Change staff status error:", error);
      Alert.alert(
        "Connection error",
        "Could not connect to the BookEasy server."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const confirmStatusChange = (member: Staff) => {
    const activate = !member.isActive;

    Alert.alert(
      activate ? "Activate team member" : "Deactivate team member",
      activate
        ? `Activate ${member.name}? They can become eligible for automatic bookings.`
        : `Deactivate ${member.name}? They will no longer be eligible for new automatic assignments.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: activate ? "Activate" : "Deactivate",
          style: activate ? "default" : "destructive",
          onPress: () => changeStaffStatus(member, activate),
        },
      ]
    );
  };

  const permanentlyDeleteStaff = async (member: Staff) => {
  Alert.alert(
    "Permanently delete staff?",
    `Are you sure you want to permanently delete ${member.name}?\n\nThis cannot be undone. Their future appointments will be unassigned, but existing appointment records and work history will be preserved.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete permanently",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token) return;

            setProcessingId(member._id);

            const response = await fetch(
              `${API_URL}/staff/${member._id}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const data = await response.json();

            if (response.status === 401) {
              await AsyncStorage.multiRemove([
                "bookeasy_token",
                "bookeasy_user",
              ]);

              router.replace("/business/login");
              return;
            }

            if (!response.ok) {
              Alert.alert(
                "Delete failed",
                data.message || "Could not delete this staff member."
              );
              return;
            }

            setStaff((current) =>
              current.filter((item) => item._id !== member._id)
            );

            // Refresh service assignments after the backend removes
            // this staff member from Service.staffIds.
            await loadServices();

            Alert.alert(
              "Staff deleted",
              `${member.name} was permanently deleted.\n${data.unassignedBookings || 0} future booking(s) were unassigned.`
            );
          } catch (error) {
            console.log("Permanent staff deletion error:", error);

            Alert.alert(
              "Connection error",
              "Could not connect to the BookEasy server."
            );
          } finally {
            setProcessingId(null);
          }
        },
      },
    ]
  );
};

  const openWorkHistory = async (member: Staff) => {
  setHistoryStaff(member);
  setHistoryVisible(true);
  setHistoryLoading(true);
  setHistoryError("");
  setHistoryData(null);

  try {
    const token = await getToken();
    if (!token) {
      setHistoryVisible(false);
      return;
    }

    const response = await fetch(
      `${API_URL}/bookings/staff/${member._id}/work-history`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      await AsyncStorage.multiRemove([
        "bookeasy_token",
        "bookeasy_user",
      ]);
      setHistoryVisible(false);
      router.replace("/business/login");
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Could not load work history."
      );
    }

    setHistoryData(data);
  } catch (error) {
    console.log("Work history error:", error);
    setHistoryError(
      error instanceof Error
        ? error.message
        : "Could not load work history."
    );
  } finally {
    setHistoryLoading(false);
  }
};

const closeWorkHistory = () => {
  if (historyLoading) return;

  setHistoryVisible(false);
  setHistoryData(null);
  setHistoryStaff(null);
  setHistoryError("");
};

const formatHistoryDate = (date?: string) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getServiceName = (appointment: WorkHistoryAppointment) =>
  appointment.serviceName ||
  appointment.service?.name ||
  appointment.serviceId?.name ||
  "Service";

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>
          Loading team members...
        </Text>
      </View>
    );
  }

const activeCount = staff.filter((member) => member.isActive).length;
const inactiveCount = staff.length - activeCount;

const filteredStaff = staff.filter((member) => {
  const query = searchQuery.trim().toLowerCase();

  const matchesSearch =
    !query ||
(member.name || "").toLowerCase().includes(query) ||
(member.designation || "").toLowerCase().includes(query) ||
    (member.phone || "").toLowerCase().includes(query);

  const matchesFilter =
    staffFilter === "all" ||
    (staffFilter === "active" && member.isActive) ||
    (staffFilter === "inactive" && !member.isActive);

  return matchesSearch && matchesFilter;
});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Team Management</Text>
          <Text style={styles.headerSubtitle}>
            {activeCount} active · {staff.length} total
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addHeaderButton}
          onPress={openAddModal}
        >
          <Text style={styles.addHeaderText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStaff();
            }}
          />
        }
      >

        <View style={styles.summaryRow}>
  <View style={styles.summaryCard}>
    <Text style={styles.summaryNumber}>{staff.length}</Text>
    <Text style={styles.summaryLabel}>Total</Text>
  </View>

  <View style={styles.summaryCard}>
    <Text style={styles.summaryNumber}>{activeCount}</Text>
    <Text style={styles.summaryLabel}>Active</Text>
  </View>

  <View style={styles.summaryCard}>
    <Text style={styles.summaryNumber}>{inactiveCount}</Text>
    <Text style={styles.summaryLabel}>Inactive</Text>
  </View>
</View>

<TextInput
  style={styles.searchInput}
  placeholder="Search by name, role or phone..."
  placeholderTextColor="#888"
  value={searchQuery}
  onChangeText={setSearchQuery}
/>

<View style={styles.filterRow}>
  {(["all", "active", "inactive"] as const).map((filter) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        staffFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setStaffFilter(filter)}
    >
      <Text
        style={[
          styles.filterText,
          staffFilter === filter && styles.filterTextActive,
        ]}
      >
        {filter.charAt(0).toUpperCase() + filter.slice(1)}
      </Text>
    </TouchableOpacity>
  ))}
</View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Automatic team assignment
          </Text>
          <Text style={styles.infoText}>
            BookEasy assigns each appointment to an eligible,
            available team member. Customers do not need to
            choose a team member.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
        >
          <Text style={styles.addButtonIcon}>＋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.addButtonTitle}>
              Add Team Member
            </Text>
            <Text style={styles.addButtonSubtitle}>
              Add a staff member and set their working hours
            </Text>
          </View>
        </TouchableOpacity>

{filteredStaff.length === 0 ? (
  <View style={styles.emptyCard}>
    <Text style={styles.emptyIcon}>👥</Text>

    <Text style={styles.emptyTitle}>
      {staff.length === 0
        ? "No team members yet"
        : "No matching team members"}
    </Text>

    <Text style={styles.emptyText}>
      {staff.length === 0
        ? "Add your first team member to start managing staff availability and automatic assignments."
        : "Try another search term or change the filter."}
    </Text>

    {staff.length === 0 && (
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={openAddModal}
      >
        <Text style={styles.emptyButtonText}>
          Add Team Member
        </Text>
      </TouchableOpacity>
    )}
  </View>
) : (
          filteredStaff.map((member) => (
            <View key={member._id} style={styles.staffCard}>
              <View style={styles.staffTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name?.trim()?.charAt(0)?.toUpperCase() || "T"}
                  </Text>
                </View>

                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>
                    {member.name}
                  </Text>
                  <Text style={styles.staffDesignation}>
                    {member.designation || "Team member"}
                  </Text>
                  {member.phone ? (
                    <Text style={styles.staffContact}>
                      {member.phone}
                    </Text>
                  ) : null}
                  {member.email ? (
                    <Text style={styles.staffContact}>
                      {member.email}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    member.isActive
                      ? styles.activeBadge
                      : styles.inactiveBadge,
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

              <View style={styles.scheduleSummary}>
                <Text style={styles.scheduleTitle}>
                  Working days
                </Text>
                <Text style={styles.scheduleText}>
                  {member.workingHours?.length
                    ? member.workingHours
                        .filter((day) => day.isAvailable)
                        .map((day) => DAYS[day.dayOfWeek]?.slice(0, 3))
                        .join(", ") || "No working days set"
                    : "Uses business schedule"}
                </Text>
              </View>

              <View style={styles.cardActions}>

                <TouchableOpacity
  style={styles.historyButton}
  onPress={() => openWorkHistory(member)}
>
  <Text style={styles.historyButtonText}>
    History
  </Text>
</TouchableOpacity>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(member)}
                >
                  <Text style={styles.editButtonText}>
                    ✏️ Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    member.isActive
                      ? styles.deactivateButton
                      : styles.activateButton,
                  ]}
                  disabled={processingId === member._id}
                  onPress={() => confirmStatusChange(member)}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      member.isActive
                        ? styles.deactivateText
                        : styles.activateText,
                    ]}
                  >
                    {processingId === member._id
                      ? "Please wait..."
                      : member.isActive
                      ? "Deactivate"
                      : "Activate"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
  style={styles.deleteButton}
  disabled={processingId === member._id}
  onPress={() => permanentlyDeleteStaff(member)}
>
  <Text style={styles.deleteButtonText}>
    {processingId === member._id
      ? "Please wait..."
      : "Delete"}
  </Text>
</TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingStaff ? "Edit Team Member" : "Add Team Member"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Enter details and weekly availability
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Designation</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Senior Barber, Doctor, Trainer"
                placeholderTextColor="#9ca3af"
                value={designation}
                onChangeText={setDesignation}
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Optional notes"
                placeholderTextColor="#9ca3af"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <Text style={styles.sectionTitle}>
  Assign Services
</Text>

<Text style={styles.helperText}>
  Select the services this team member can handle.
  You can select multiple services.
</Text>

{servicesLoading ? (
  <View style={styles.servicesLoading}>
    <ActivityIndicator size="small" color="#2563eb" />
    <Text style={styles.servicesLoadingText}>
      Loading services...
    </Text>
  </View>
) : services.length === 0 ? (
  <View style={styles.noServicesCard}>
    <Text style={styles.noServicesText}>
      No active services found. Please add services first.
    </Text>
  </View>
) : (
  <View style={styles.serviceList}>
    {services.map((service) => {
      const isSelected = selectedServiceIds.includes(service._id);

      return (
        <TouchableOpacity
          key={service._id}
          style={[
            styles.serviceOption,
            isSelected && styles.serviceOptionSelected,
          ]}
          onPress={() => toggleService(service._id)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.serviceCheckbox,
              isSelected && styles.serviceCheckboxSelected,
            ]}
          >
            {isSelected && (
              <Text style={styles.serviceCheckmark}>✓</Text>
            )}
          </View>

          <Text
            style={[
              styles.serviceOptionText,
              isSelected && styles.serviceOptionTextSelected,
            ]}
          >
            {service.name}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
)}

<Text style={styles.selectedServicesCount}>
  {selectedServiceIds.length} service(s) selected
</Text>

              <Text style={styles.sectionTitle}>
                Weekly Working Hours
              </Text>
              <Text style={styles.helperText}>
                Switch off days when this team member is unavailable.
                Use 24-hour time, for example 09:00 to 18:00.
              </Text>

              {workingHours.map((day) => (
                <View key={day.dayOfWeek} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayName}>
                      {DAYS[day.dayOfWeek]}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dayToggle,
                        day.isAvailable
                          ? styles.dayToggleOn
                          : styles.dayToggleOff,
                      ]}
                      onPress={() =>
                        updateWorkingHour(day.dayOfWeek, {
                          isAvailable: !day.isAvailable,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.dayToggleText,
                          day.isAvailable
                            ? styles.dayToggleTextOn
                            : styles.dayToggleTextOff,
                        ]}
                      >
                        {day.isAvailable ? "Working" : "Off"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {day.isAvailable ? (
                    <View style={styles.timeRow}>
                      <View style={styles.timeField}>
                        <Text style={styles.timeLabel}>Start</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={day.startTime}
                          onChangeText={(value) =>
                            updateWorkingHour(day.dayOfWeek, {
                              startTime: value,
                            })
                          }
                          placeholder="09:00"
                          placeholderTextColor="#9ca3af"
                          maxLength={5}
                          autoCapitalize="none"
                        />
                      </View>

                      <Text style={styles.timeSeparator}>to</Text>

                      <View style={styles.timeField}>
                        <Text style={styles.timeLabel}>End</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={day.endTime}
                          onChangeText={(value) =>
                            updateWorkingHour(day.dayOfWeek, {
                              endTime: value,
                            })
                          }
                          placeholder="18:00"
                          placeholderTextColor="#9ca3af"
                          maxLength={5}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    saving && styles.disabledButton,
                  ]}
                  onPress={saveStaff}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving
                      ? "Saving..."
                      : editingStaff
                      ? "Update Member"
                      : "Add Member"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

            {/* Staff Work History Modal */}
      <Modal
        visible={historyVisible}
        transparent
        animationType="slide"
        onRequestClose={closeWorkHistory}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.historyModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  Work History
                </Text>
                <Text style={styles.modalSubtitle}>
                  {historyStaff?.name || "Team member"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeWorkHistory}
                disabled={historyLoading}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator
                  size="large"
                  color="#208aef"
                />
                <Text style={styles.loadingText}>
                  Loading work history...
                </Text>
              </View>
            ) : historyError ? (
              <View style={styles.historyEmpty}>
                <Text style={styles.historyErrorText}>
                  {historyError}
                </Text>

                <TouchableOpacity
                  style={styles.historyRetryButton}
                  onPress={() =>
                    historyStaff &&
                    openWorkHistory(historyStaff)
                  }
                >
                  <Text style={styles.historyRetryText}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 20,
                }}
              >
                <View style={styles.historySummaryGrid}>
                  {[
                    {
                      label: "Total",
                      value: historyData?.summary?.total,
                      color: "#2563eb",
                      background: "#eff6ff",
                    },
                    {
                      label: "Completed",
                      value: historyData?.summary?.completed,
                      color: "#15803d",
                      background: "#dcfce7",
                    },
                    {
                      label: "Cancelled",
                      value: historyData?.summary?.cancelled,
                      color: "#dc2626",
                      background: "#fee2e2",
                    },
                    {
                      label: "No-show",
                      value: historyData?.summary?.noShow,
                      color: "#b45309",
                      background: "#fef3c7",
                    },
                    {
                      label: "Upcoming",
                      value: historyData?.summary?.upcoming,
                      color: "#7c3aed",
                      background: "#f3e8ff",
                    },
                  ].map((item) => (
                    <View
                      key={item.label}
                      style={[
                        styles.historySummaryCard,
                        { backgroundColor: item.background },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historySummaryValue,
                          { color: item.color },
                        ]}
                      >
                        {item.value ?? 0}
                      </Text>
                      <Text style={styles.historySummaryLabel}>
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.historySectionTitle}>
                  Appointment Records
                </Text>

                {!historyData?.appointments?.length ? (
                  <View style={styles.historyEmpty}>
                    <Text style={styles.historyEmptyIcon}>
                      📋
                    </Text>
                    <Text style={styles.historyEmptyTitle}>
                      No appointment history
                    </Text>
                    <Text style={styles.historyEmptyDescription}>
                      Appointment records for this team member
                      will appear here.
                    </Text>
                  </View>
                ) : (
                  historyData.appointments.map((appointment) => {
                    const status = (
                      appointment.status || "unknown"
                    ).toLowerCase();

                    const statusStyle =
                      status === "completed"
                        ? styles.historyCompleted
                        : status === "cancelled"
                        ? styles.historyCancelled
                        : status === "no_show"
                        ? styles.historyNoShow
                        : status === "confirmed" ||
                          status === "pending"
                        ? styles.historyUpcoming
                        : styles.historyUnknown;

                    return (
                      <View
                        key={appointment._id}
                        style={styles.historyAppointmentCard}
                      >
                        <View style={styles.historyAppointmentTop}>
                          <Text style={styles.historyServiceName}>
                            {getServiceName(appointment)}
                          </Text>

                          <View
                            style={[
                              styles.historyStatusBadge,
                              statusStyle,
                            ]}
                          >
                            <Text style={styles.historyStatusText}>
                              {status.replace(/_/g, " ")}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.historyCustomer}>
                          Customer:{" "}
                          {appointment.customerName || "Not available"}
                        </Text>

                        {appointment.customerPhone ? (
                          <Text style={styles.historyDetail}>
                            Phone: {appointment.customerPhone}
                          </Text>
                        ) : null}

                        <Text style={styles.historyDetail}>
                          Date: {formatHistoryDate(appointment.bookingDate)}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.historyCloseButton}
              onPress={closeWorkHistory}
              disabled={historyLoading}
            >
              <Text style={styles.historyCloseButtonText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingTop: 55,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    fontSize: 26,
    color: "#2563eb",
  },
  headerCenter: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
  },
  addHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  addHeaderText: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "500",
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e40af",
  },
  infoText: {
    fontSize: 13,
    color: "#1e3a8a",
    lineHeight: 19,
    marginTop: 6,
  },
  addButton: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  addButtonIcon: {
    color: "#ffffff",
    fontSize: 30,
    marginRight: 12,
  },
  addButtonTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  addButtonSubtitle: {
    color: "#dbeafe",
    fontSize: 12,
    marginTop: 3,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 7,
  },
  emptyButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 18,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  staffCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  staffTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  staffInfo: {
    flex: 1,
    marginLeft: 11,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  staffDesignation: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 3,
  },
  staffContact: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeBadge: {
    backgroundColor: "#dcfce7",
  },
  inactiveBadge: {
    backgroundColor: "#f3f4f6",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  activeText: {
    color: "#15803d",
  },
  inactiveText: {
    color: "#6b7280",
  },
  scheduleSummary: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 11,
    marginTop: 14,
  },
  scheduleTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
  },
  scheduleText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    lineHeight: 18,
  },
cardActions: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 13,
},
  editButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  editButtonText: {
    color: "#2563eb",
    fontWeight: "800",
    fontSize: 13,
  },
  statusButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  deactivateButton: {
    backgroundColor: "#fee2e2",
  },
  activateButton: {
    backgroundColor: "#dcfce7",
  },
  statusButtonText: {
    fontWeight: "800",
    fontSize: 12,
  },
  deactivateText: {
    color: "#dc2626",
  },
  activateText: {
    color: "#15803d",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 30,
    maxHeight: "94%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  closeText: {
    fontSize: 22,
    color: "#6b7280",
    paddingLeft: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 11,
    paddingHorizontal: 13,
    fontSize: 14,
    color: "#111827",
    marginBottom: 14,
  },
  notesInput: {
    minHeight: 75,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 7,
    marginBottom: 5,
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
    marginBottom: 12,
  },

  servicesLoading: {
  flexDirection: "row",
  alignItems: "center",
  padding: 15,
  backgroundColor: "#f9fafb",
  borderRadius: 12,
  marginBottom: 12,
},

servicesLoadingText: {
  marginLeft: 10,
  fontSize: 13,
  color: "#6b7280",
},

noServicesCard: {
  backgroundColor: "#f9fafb",
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
},

noServicesText: {
  fontSize: 13,
  color: "#6b7280",
  lineHeight: 19,
},

serviceList: {
  gap: 9,
  marginBottom: 10,
},

serviceOption: {
  flexDirection: "row",
  alignItems: "center",
  padding: 13,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 11,
  backgroundColor: "#ffffff",
},

serviceOptionSelected: {
  borderColor: "#2563eb",
  backgroundColor: "#eff6ff",
},

serviceCheckbox: {
  width: 22,
  height: 22,
  borderWidth: 1.5,
  borderColor: "#9ca3af",
  borderRadius: 6,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 11,
},

serviceCheckboxSelected: {
  backgroundColor: "#2563eb",
  borderColor: "#2563eb",
},

serviceCheckmark: {
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "900",
},

serviceOptionText: {
  flex: 1,
  fontSize: 14,
  color: "#374151",
  fontWeight: "600",
},

serviceOptionTextSelected: {
  color: "#1d4ed8",
  fontWeight: "800",
},

selectedServicesCount: {
  fontSize: 12,
  color: "#2563eb",
  fontWeight: "700",
  marginBottom: 15,
},

  dayCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 9,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  dayToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dayToggleOn: {
    backgroundColor: "#dcfce7",
  },
  dayToggleOff: {
    backgroundColor: "#f3f4f6",
  },
  dayToggleText: {
    fontSize: 11,
    fontWeight: "800",
  },
  dayToggleTextOn: {
    color: "#15803d",
  },
  dayToggleTextOff: {
    color: "#6b7280",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 12,
    gap: 10,
  },
  timeField: {
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
    color: "#111827",
    fontSize: 14,
  },
  timeSeparator: {
    color: "#6b7280",
    marginBottom: 12,
    fontSize: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 10,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 11,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "800",
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 11,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },

    historyButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    justifyContent: "center",
    alignItems: "center",
  },
  historyButtonText: {
    color: "#1d4ed8",
    fontWeight: "800",
    fontSize: 13,
  },
  historyModalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 25,
    maxHeight: "92%",
    minHeight: "55%",
  },
  historyLoading: {
    paddingVertical: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  historySummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 22,
  },
  historySummaryCard: {
    width: "31%",
    minHeight: 76,
    borderRadius: 12,
    padding: 10,
    justifyContent: "center",
  },
  historySummaryValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  historySummaryLabel: {
    fontSize: 11,
    color: "#4b5563",
    fontWeight: "700",
    marginTop: 3,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  historyAppointmentCard: {
    backgroundColor: "#f9fbff",
    borderWidth: 1,
    borderColor: "#e5eaf2",
    borderRadius: 13,
    padding: 14,
    marginBottom: 11,
  },
  historyAppointmentTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  historyServiceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  historyStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  historyCompleted: {
    backgroundColor: "#dcfce7",
  },
  historyCancelled: {
    backgroundColor: "#fee2e2",
  },
  historyNoShow: {
    backgroundColor: "#fef3c7",
  },
  historyUpcoming: {
    backgroundColor: "#dbeafe",
  },
  historyUnknown: {
    backgroundColor: "#f3f4f6",
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#374151",
    textTransform: "capitalize",
  },
  historyCustomer: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 5,
  },
  historyDetail: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  historyEmpty: {
    padding: 25,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  historyEmptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  historyEmptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  historyEmptyDescription: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 6,
  },
  historyErrorText: {
    color: "#b42318",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  historyRetryButton: {
    marginTop: 15,
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9,
  },
  historyRetryText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  historyCloseButton: {
    height: 46,
    borderRadius: 11,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  historyCloseButtonText: {
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "800",
  },

  summaryRow: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 15,
},
summaryCard: {
  flex: 1,
  backgroundColor: "#ffffff",
  borderRadius: 13,
  paddingVertical: 15,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#e5e7eb",
},
summaryNumber: {
  fontSize: 22,
  fontWeight: "900",
  color: "#1d4ed8",
},
summaryLabel: {
  fontSize: 12,
  color: "#6b7280",
  fontWeight: "700",
  marginTop: 4,
},
searchInput: {
  height: 48,
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 12,
  paddingHorizontal: 14,
  fontSize: 14,
  color: "#111827",
  marginBottom: 12,
},
filterRow: {
  flexDirection: "row",
  gap: 9,
  marginBottom: 16,
},
filterButton: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 10,
  alignItems: "center",
  backgroundColor: "#e5e7eb",
},
filterButtonActive: {
  backgroundColor: "#2563eb",
},
filterText: {
  fontSize: 12,
  fontWeight: "700",
  color: "#374151",
},
filterTextActive: {
  color: "#ffffff",
},

deleteButton: {
  flex: 1,
  height: 42,
  borderRadius: 10,
  backgroundColor: "#fee2e2",
  borderWidth: 1,
  borderColor: "#fecaca",
  justifyContent: "center",
  alignItems: "center",
},

deleteButtonText: {
  color: "#dc2626",
  fontWeight: "800",
  fontSize: 12,
},

});
