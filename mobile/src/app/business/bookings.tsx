import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import API_URL from "../../api";

type Booking = {
  _id: string;
  createdAt?: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
serviceId?: {
  _id: string;
  name?: string;
  price?: number;
  duration?: number;
} | string | null;
  staffId?:
  | string
  | {
      _id: string;
      name: string;
      designation?: string;
    }
  | null;
};

type StaffMember = {
  _id: string;
  name: string;
  designation?: string;
  isActive: boolean;
};

type AvailableSlot = {
  value: string;
  label: string;
};

const getBookingService = (serviceId: Booking["serviceId"]) => {
  return typeof serviceId === "object" && serviceId !== null
    ? serviceId
    : null;
};

export default function BusinessBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  // Appointment date filter
const [filterDate, setFilterDate] = useState<Date | null>(null);
const [showFilterDatePicker, setShowFilterDatePicker] =
  useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reschedule states
  const [rescheduleBooking, setRescheduleBooking] =
    useState<Booking | null>(null);

  const [newBookingDate, setNewBookingDate] =
    useState(new Date());

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
const [staffFeatureAvailable, setStaffFeatureAvailable] = useState(true);
const [staffPickerBookingId, setStaffPickerBookingId] = useState<string | null>(null);
const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);

const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
const [loadingSlots, setLoadingSlots] = useState(false);
const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
const [rescheduleDateString, setRescheduleDateString] = useState("");

  // ================================
  // LOAD BOOKINGS
  // ================================

  const loadBookings = async () => {
    try {
      const token = await AsyncStorage.getItem("bookeasy_token");
      const userData = await AsyncStorage.getItem("bookeasy_user");

      if (!token || !userData) {
        router.replace("/business/login");
        return;
      }

      const user = JSON.parse(userData);

      const response = await fetch(
        `${API_URL}/bookings/business/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        const bookingList = Array.isArray(data)
          ? data
          : data.bookings || [];

        setBookings(bookingList);
      } else if (response.status === 401) {
        await AsyncStorage.multiRemove([
          "bookeasy_token",
          "bookeasy_user",
          "bookeasy_role",
        ]);

        router.replace("/business/login");
      } else {
        Alert.alert(
          "Error",
          data.message || "Could not load bookings."
        );
      }
    } catch (error) {
      console.log("Load bookings error:", error);

      Alert.alert(
        "Connection error",
        "Could not connect to the BookEasy server."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const loadStaffMembers = async () => {
  try {
    const token = await AsyncStorage.getItem("bookeasy_token");

    if (!token) return;

    const response = await fetch(`${API_URL}/staff`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 403) {
      setStaffFeatureAvailable(false);
      setStaffMembers([]);
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to load staff");
    }

    const data = await response.json();

    setStaffMembers(
      (data.staff || []).filter(
        (member: StaffMember) => member.isActive
      )
    );

    setStaffFeatureAvailable(true);
  } catch (error) {
    console.error("Load staff error:", error);
  }
};


const assignStaffToBooking = async (
  bookingId: string,
  staffId: string | null
) => {
  try {
    setAssigningBookingId(bookingId);

    const token = await AsyncStorage.getItem("bookeasy_token");

    if (!token) {
      Alert.alert("Session expired", "Please log in again.");
      router.replace("/business/login");
      return;
    }

    const response = await fetch(
      `${API_URL}/bookings/${bookingId}/assign-staff`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ staffId }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 403) {
        setStaffFeatureAvailable(false);
      }

      throw new Error(data.message || "Could not assign staff");
    }

    setBookings((current) =>
      current.map((booking) =>
        booking._id === bookingId
          ? { ...booking, staffId: data.booking.staffId }
          : booking
      )
    );

    setStaffPickerBookingId(null);
    Alert.alert("Success", data.message);
  } catch (error) {
    Alert.alert(
      "Staff assignment",
      error instanceof Error ? error.message : "Something went wrong"
    );
  } finally {
    setAssigningBookingId(null);
  }
};


const loadAvailableSlots = async (
  booking: Booking,
  date: string
) => {
  try {
    if (!booking.serviceId || typeof booking.serviceId === "string") {
      Alert.alert("Cannot reschedule", "The booking's service details are unavailable.");
      return;
    }

    setLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot(null);

    const token = await AsyncStorage.getItem("bookeasy_token");
    const userString = await AsyncStorage.getItem("bookeasy_user");

    if (!token || !userString) {
      Alert.alert("Session expired", "Please log in again.");
      router.replace("/business/login");
      return;
    }

    const user = JSON.parse(userString);

    const query = new URLSearchParams({
      businessId: user.id,
      serviceId: booking.serviceId._id,
      date,
      excludeBookingId: booking._id,
    });

    const response = await fetch(
      `${API_URL}/bookings/availability?${query.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load available slots");
    }

    setAvailableSlots(data.slots || []);
  } catch (error) {
    Alert.alert(
      "Available slots",
      error instanceof Error ? error.message : "Something went wrong"
    );
  } finally {
    setLoadingSlots(false);
  }
};

useEffect(() => {
  loadBookings();
  loadStaffMembers();
}, []);

  // ================================
// SORT BOOKINGS AND FILTER BY DATE
// ================================

const getDateKey = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values: Record<string, string> = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return `${values.year}-${values.month}-${values.day}`;
};

const selectedDateKey = filterDate
  ? [
      filterDate.getFullYear(),
      String(filterDate.getMonth() + 1).padStart(2, "0"),
      String(filterDate.getDate()).padStart(2, "0"),
    ].join("-")
  : "";

const sortedBookings = [...bookings].sort((a, b) => {
  const dateA = new Date(
    a.createdAt || a.bookingDate || 0
  ).getTime();

  const dateB = new Date(
    b.createdAt || b.bookingDate || 0
  ).getTime();

  return dateB - dateA;
});

const filteredBookings = sortedBookings.filter((booking) => {
  if (!selectedDateKey) {
    return true;
  }

  return getDateKey(booking.bookingDate) === selectedDateKey;
});

  // ================================
  // REFRESH
  // ================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  // ================================
  // OPEN RESCHEDULE
  // ================================


const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const openReschedule = (booking: Booking) => {
  const initialDate = new Date(booking.bookingDate);

  if (Number.isNaN(initialDate.getTime())) {
    Alert.alert("Invalid date", "This booking has an invalid appointment date.");
    return;
  }

  const dateString = getLocalDateString(initialDate);

  setRescheduleBooking(booking);
  setNewBookingDate(initialDate);
  setRescheduleDateString(dateString);
  setAvailableSlots([]);
  setSelectedSlot(null);
  setShowDatePicker(false);

  loadAvailableSlots(booking, dateString);
};


  // ================================
  // CLOSE RESCHEDULE
  // ================================

const closeReschedule = () => {
  setRescheduleBooking(null);
  setShowDatePicker(false);
  setAvailableSlots([]);
  setSelectedSlot(null);
  setRescheduleDateString("");
  setLoadingSlots(false);
};


  // ================================
  // HANDLE RESCHEDULE
  // ================================


const handleReschedule = async () => {
  if (!rescheduleBooking) return;

  if (!selectedSlot) {
    Alert.alert(
      "Select a time",
      "Please choose an available appointment slot."
    );
    return;
  }

  try {
    const token = await AsyncStorage.getItem("bookeasy_token");

    if (!token) {
      router.replace("/business/login");
      return;
    }

    setActionLoading(`${rescheduleBooking._id}-reschedule`);

    const response = await fetch(
      `${API_URL}/bookings/${rescheduleBooking._id}/reschedule`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingDate: selectedSlot,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      Alert.alert(
        "Reschedule failed",
        data.message || "Could not reschedule booking."
      );
      return;
    }

    closeReschedule();

    await loadBookings();

    Alert.alert(
      "Success",
      "Appointment rescheduled successfully."
    );
  } catch (error) {
    console.log("Reschedule error:", error);

    Alert.alert(
      "Connection error",
      "Could not connect to the BookEasy server."
    );
  } finally {
    setActionLoading(null);
  }
};


  // ================================
  // UPDATE BOOKING STATUS
  // ================================

  const updateBookingStatus = async (
    bookingId: string,
    action: "confirm" | "cancel" | "complete"
  ) => {
    try {
      const token = await AsyncStorage.getItem(
        "bookeasy_token"
      );

      if (!token) {
        router.replace("/business/login");
        return;
      }

      setActionLoading(`${bookingId}-${action}`);

      const response = await fetch(
        `${API_URL}/bookings/${bookingId}/${action}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Action failed",
          data.message ||
            "Could not update booking."
        );

        return;
      }

      await loadBookings();
    } catch (error) {
      console.log("Update booking error:", error);

      Alert.alert(
        "Connection error",
        "Could not connect to the BookEasy server."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ================================
  // CONFIRM ACTION
  // ================================

  const confirmAction = (
    booking: Booking,
    action: "confirm" | "cancel" | "complete"
  ) => {
    let title = "";
    let message = "";

    if (action === "confirm") {
      title = "Confirm Booking";
      message = `Confirm the appointment for ${booking.customerName}?`;
    }

    if (action === "cancel") {
      title = "Cancel Booking";
      message = `Cancel the appointment for ${booking.customerName}?`;
    }

    if (action === "complete") {
      title = "Complete Booking";
      message = `Mark ${booking.customerName}'s appointment as completed?`;
    }

    Alert.alert(title, message, [
      {
        text: "No",
        style: "cancel",
      },
      {
        text: "Yes",
        onPress: () =>
          updateBookingStatus(
            booking._id,
            action
          ),
      },
    ]);
  };

  // ================================
  // FORMAT DATE
  // ================================

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ================================
  // FORMAT TIME
  // ================================

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ================================
  // STATUS STYLE
  // ================================

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "confirmed":
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
        };

      case "completed":
        return {
          backgroundColor: "#dbeafe",
          color: "#1d4ed8",
        };

      case "cancelled":
        return {
          backgroundColor: "#fee2e2",
          color: "#991b1b",
        };

      default:
        return {
          backgroundColor: "#fef3c7",
          color: "#92400e",
        };
    }
  };

  // ================================
  // LOADING
  // ================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563eb"
        />

        <Text style={styles.loadingText}>
          Loading bookings...
        </Text>
      </View>
    );
  }

  // ================================
  // MAIN UI
  // ================================

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Bookings
          </Text>

          <Text style={styles.headerSubtitle}>
            {filteredBookings.length} appointment
            {filteredBookings.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* BOOKINGS */}

      
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* DATE FILTER */}
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>
            Filter appointments by date
          </Text>

          <TouchableOpacity
            style={styles.filterDateButton}
            onPress={() => setShowFilterDatePicker(true)}
          >
            <Text style={styles.filterDateText}>
              📅{" "}
              {filterDate
                ? filterDate.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "Select appointment date"}
            </Text>

            <Text style={styles.filterDateArrow}>▼</Text>
          </TouchableOpacity>

          <View style={styles.filterBottomRow}>
            <Text style={styles.filterCount}>
              {filteredBookings.length} appointment
              {filteredBookings.length !== 1 ? "s" : ""}
              {filterDate
                ? " on selected date"
                : " · newest first"}
            </Text>

            <TouchableOpacity
              style={[
                styles.allBookingsButton,
                !filterDate &&
                  styles.allBookingsButtonDisabled,
              ]}
              onPress={() => {
                setFilterDate(null);
                setShowFilterDatePicker(false);
              }}
              disabled={!filterDate}
            >
              <Text style={styles.allBookingsText}>
                All bookings
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* APPOINTMENT DATE PICKER */}
        {showFilterDatePicker && (
          <DateTimePicker
            value={filterDate || new Date()}
            mode="date"
            onChange={(event, selectedDate) => {
              setShowFilterDatePicker(false);

              if (event.type === "set" && selectedDate) {
                setFilterDate(selectedDate);
              }
            }}
          />
        )}

        {/* FILTERED BOOKINGS */}
        
        {/* FILTERED BOOKINGS */}
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📅</Text>

            <Text style={styles.emptyTitle}>
              {filterDate
                ? "No bookings for this date"
                : "No bookings yet"}
            </Text>

            <Text style={styles.emptyText}>
              {filterDate
                ? "Try another date or select All bookings."
                : "Customer appointments will appear here."}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => {
            const statusStyle =
              getStatusStyle(booking.status);

            return (
              <View
                key={booking._id}
                style={styles.bookingCard}
              >
                {/* CUSTOMER */}
                <View style={styles.bookingTop}>
                  <View style={styles.customerIcon}>
                    <Text style={styles.customerIconText}>
                      👤
                    </Text>
                  </View>

                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>
                      {booking.customerName}
                    </Text>

                    <Text style={styles.customerPhone}>
                      📞 {booking.customerPhone}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          statusStyle.backgroundColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusStyle.color },
                      ]}
                    >
                      {booking.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* SERVICE */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    🛠️ Service
                  </Text>

                  <Text style={styles.infoValue}>
                    {getBookingService(booking.serviceId)?.name || "Service"}
                  </Text>
                </View>

                {/* DATE */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    📅 Date
                  </Text>

                  <Text style={styles.infoValue}>
                    {formatDate(booking.bookingDate)}
                  </Text>
                </View>

                {/* TIME */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    🕐 Time
                  </Text>

                  <Text style={styles.infoValue}>
                    {formatTime(booking.bookingDate)}
                  </Text>
                </View>

                {/* PRICE */}
                {getBookingService(booking.serviceId)?.price !== undefined && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      💰 Price
                    </Text>

                    <Text style={styles.price}>
                      ₹{getBookingService(booking.serviceId)?.price}
                    </Text>
                  </View>
                )}


                
{/* STAFF ASSIGNMENT */}
{staffFeatureAvailable &&
  !["cancelled", "completed"].includes(booking.status) && (
  <View style={{ marginTop: 12, marginBottom: 10 }}>
    <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 }}>
      Assigned staff
    </Text>

    <TouchableOpacity
      style={styles.dateButton}
      onPress={() =>
        setStaffPickerBookingId(
          staffPickerBookingId === booking._id ? null : booking._id
        )
      }
      disabled={
        assigningBookingId === booking._id ||
        ["cancelled", "completed"].includes(booking.status)
      }
    >
      <Text style={styles.dateButtonText}>
{assigningBookingId === booking._id
  ? "Updating..."
  : typeof booking.staffId === "object" && booking.staffId
    ? booking.staffId.name
    : typeof booking.staffId === "string"
      ? staffMembers.find(
          (member) => member._id === booking.staffId
        )?.name || "Assigned staff — select to change"
      : "Unassigned — select staff"}
      </Text>
    </TouchableOpacity>

    {staffPickerBookingId === booking._id && (
      <View style={{ gap: 8 }}>
        <TouchableOpacity
          style={styles.modalCancelButton}
          onPress={() => assignStaffToBooking(booking._id, null)}
          disabled={assigningBookingId === booking._id}
        >
          <Text style={styles.modalCancelText}>Unassign staff</Text>
        </TouchableOpacity>

        {staffMembers.map((member) => (
          <TouchableOpacity
            key={member._id}
            style={styles.dateButton}
            onPress={() =>
              assignStaffToBooking(booking._id, member._id)
            }
            disabled={assigningBookingId === booking._id}
          >
            <Text style={styles.dateButtonText}>
              {member.name}
              {member.designation ? ` · ${member.designation}` : ""}
            </Text>
          </TouchableOpacity>
        ))}

        {staffMembers.length === 0 && (
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            No active staff members. Add staff from Staff Management.
          </Text>
        )}

        <TouchableOpacity
          onPress={() => setStaffPickerBookingId(null)}
          style={{ paddingVertical: 8 }}
        >
          <Text style={{ color: "#2563eb", fontWeight: "600" }}>
            Close selector
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
)}



                {/* PENDING ACTIONS */}
                {booking.status === "pending" && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() =>
                        confirmAction(booking, "confirm")
                      }
                      disabled={actionLoading !== null}
                    >
                      <Text style={styles.confirmText}>
                        {actionLoading ===
                        `${booking._id}-confirm`
                          ? "..."
                          : "✓ Confirm"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() =>
                        confirmAction(booking, "cancel")
                      }
                      disabled={actionLoading !== null}
                    >
                      <Text style={styles.cancelText}>
                        {actionLoading ===
                        `${booking._id}-cancel`
                          ? "..."
                          : "✕ Cancel"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* CONFIRMED ACTIONS */}
                {booking.status === "confirmed" && (
                  <>
                    <TouchableOpacity
  style={styles.rescheduleButton}
  onPress={() => openReschedule(booking)}
  disabled={actionLoading !== null}
>
                      <Text style={styles.rescheduleText}>
                        📅 Reschedule
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={() =>
                        confirmAction(booking, "complete")
                      }
                      disabled={actionLoading !== null}
                    >
                      <Text style={styles.completeText}>
                        {actionLoading ===
                        `${booking._id}-complete`
                          ? "Updating..."
                          : "✓ Mark as Completed"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })
        )}
      </ScrollView>


      {/* ================================ */}
      {/* RESCHEDULE MODAL */}
      {/* ================================ */}

      <Modal
        visible={rescheduleBooking !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={closeReschedule}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>
              Reschedule Appointment
            </Text>

            <Text style={styles.modalCustomer}>
              {rescheduleBooking?.customerName}
            </Text>

            <Text style={styles.modalService}>
              {getBookingService(rescheduleBooking?.serviceId)?.name ||
  "Service"}
            </Text>

 {/* DATE BUTTON */}
<TouchableOpacity
  style={styles.dateButton}
  onPress={() => setShowDatePicker(true)}
>
  <Text style={styles.dateButtonText}>
    📅{" "}
    {newBookingDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}
  </Text>
</TouchableOpacity>

{/* DATE PICKER */}
{showDatePicker && (
  <DateTimePicker
    value={newBookingDate}
    mode="date"
    minimumDate={new Date()}
    onChange={(event, selectedDate) => {
      setShowDatePicker(false);

      if (event.type === "set" && selectedDate && rescheduleBooking) {
        const dateKey = getLocalDateString(selectedDate);

        setNewBookingDate(selectedDate);
        setRescheduleDateString(dateKey);
        setSelectedSlot(null);

        loadAvailableSlots(rescheduleBooking, dateKey);
      }
    }}
  />
)}

<Text style={styles.slotHint}>
  Choose an available appointment time for{" "}
  {rescheduleDateString || "the selected date"}.
</Text>

{/* AVAILABLE SLOTS */}
{loadingSlots ? (
  <View style={{ paddingVertical: 18, alignItems: "center" }}>
    <ActivityIndicator size="small" color="#2563eb" />
    <Text style={styles.slotHint}>Loading available slots...</Text>
  </View>
) : availableSlots.length === 0 ? (
  <Text style={styles.slotHint}>
    No available slots for this date. Choose another date.
  </Text>
) : (
  <ScrollView
    style={styles.slotList}
    nestedScrollEnabled
    keyboardShouldPersistTaps="handled"
  >
    {availableSlots.map((slot) => (
      <TouchableOpacity
        key={slot.value}
        style={[
          styles.slotOption,
          selectedSlot === slot.value && styles.slotOptionSelected,
        ]}
        onPress={() => setSelectedSlot(slot.value)}
      >
        <Text style={styles.slotOptionText}>
          {selectedSlot === slot.value ? "✓ " : ""}
          {slot.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
)}

            {/* MODAL ACTIONS */}

            <View style={styles.modalActions}>

              <TouchableOpacity
                style={
                  styles.modalCancelButton
                }
                onPress={closeReschedule}
               disabled={actionLoading !== null}
              >
                <Text
                  style={
                    styles.modalCancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

<TouchableOpacity
  style={styles.modalSaveButton}
  onPress={handleReschedule}
  disabled={
    actionLoading !== null ||
    !selectedSlot ||
    loadingSlots
  }
>
  <Text style={styles.modalSaveText}>
    {actionLoading === `${rescheduleBooking?._id}-reschedule`
      ? "Saving..."
      : "Reschedule"}
  </Text>
</TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ======================================
// STYLES
// ======================================

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
    fontSize: 14,
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
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },

  refreshText: {
    fontSize: 25,
    color: "#374151",
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 35,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  emptyIcon: {
    fontSize: 45,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 7,
    textAlign: "center",
  },

  bookingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 17,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  bookingTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  customerIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },

  customerIconText: {
    fontSize: 21,
  },

  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },

  customerName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  customerPhone: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 14,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  infoLabel: {
    fontSize: 13,
    color: "#6b7280",
  },

  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    maxWidth: "60%",
    textAlign: "right",
  },

  price: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16a34a",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  confirmButton: {
    flex: 1,
    height: 45,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
  },

  confirmText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
  },

  cancelButton: {
    flex: 1,
    height: 45,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },

  cancelText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "800",
  },

  rescheduleButton: {
    height: 45,
    borderRadius: 10,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },

  rescheduleText: {
    color: "#92400e",
    fontSize: 13,
    fontWeight: "800",
  },

  completeButton: {
    height: 45,
    borderRadius: 10,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },

  completeText: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "800",
  },

  // ==================================
  // RESCHEDULE MODAL
  // ==================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 22,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  modalCustomer: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },

  modalService: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 18,
  },

  dateButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "center",
    paddingHorizontal: 15,
    marginBottom: 12,
  },

  dateButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  modalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCancelText: {
    color: "#374151",
    fontWeight: "800",
  },

  modalSaveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },

  modalSaveText: {
    color: "#ffffff",
    fontWeight: "800",
  },

    // ==================================
  // BOOKING DATE FILTER
  // ==================================

  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  filterTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  filterDateButton: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  filterDateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },

  filterDateArrow: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 8,
  },

  filterBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },

  filterCount: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
  },

  allBookingsButton: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
  },

  allBookingsButtonDisabled: {
    opacity: 0.5,
  },

  allBookingsText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
  },

    // AVAILABLE APPOINTMENT SLOTS
  slotList: {
    maxHeight: 220,
    marginTop: 6,
    marginBottom: 10,
  },

  slotOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#ffffff",
  },

  slotOptionSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },

  slotOptionText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },

  slotHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 8,
  },
});
