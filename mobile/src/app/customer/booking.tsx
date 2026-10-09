import { useEffect, useState } from "react";
import {
  registerPushTokenWithBackend,
} from "../../services/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

import { router, useLocalSearchParams } from "expo-router";
import API_URL from "../../api";

type TimeSlot = {
  value: string;
  label: string;
};

export default function CustomerBookingScreen() {
  const params = useLocalSearchParams<{
    businessId?: string;
    businessName?: string;
    businessSlug?: string;
    serviceId?: string;
    serviceName?: string;
    servicePrice?: string;
    serviceDuration?: string;
  }>();

  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] =
    useState<TimeSlot | null>(null);

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [loadingSlots, setLoadingSlots] =
    useState(false);

  const [booking, setBooking] = useState(false);

  const [error, setError] = useState("");

  // ======================================================
  // NEXT 7 DATES
  // ======================================================

  const getNextDates = () => {
    const dates: string[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date();

      date.setDate(date.getDate() + i);

      const year = date.getFullYear();

      const month = String(
        date.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        date.getDate()
      ).padStart(2, "0");

      dates.push(
        `${year}-${month}-${day}`
      );
    }

    return dates;
  };

  const dates = getNextDates();

  // ======================================================
  // FORMAT DATE
  // ======================================================

  const formatDate = (
    dateString: string
  ) => {
    const date = new Date(
      `${dateString}T00:00:00`
    );

    return date.toLocaleDateString(
      "en-IN",
      {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }
    );
  };

  // ======================================================
  // LOAD AVAILABILITY
  // ======================================================

  const loadAvailability = async (
    date: string
  ) => {
    if (
      !params.businessId ||
      !params.serviceId
    ) {
      setError(
        "Business or service information is missing."
      );

      return;
    }

    try {
      setLoadingSlots(true);
      setError("");
      setSelectedSlot(null);
      setSlots([]);

      const url =
        `${API_URL}/bookings/availability` +
        `?businessId=${encodeURIComponent(
          params.businessId
        )}` +
        `&serviceId=${encodeURIComponent(
          params.serviceId
        )}` +
        `&date=${encodeURIComponent(
          date
        )}`;

      console.log(
        "Availability URL:",
        url
      );

      const response =
        await fetch(url);

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load available times."
        );
      }

      setSlots(
        Array.isArray(data.slots)
          ? data.slots
          : []
      );

      if (
        !data.slots ||
        data.slots.length === 0
      ) {
        setError(
          data.message ||
            "No available slots for this date."
        );
      }
    } catch (error) {
      console.log(
        "Availability error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load available times."
      );
    } finally {
      setLoadingSlots(false);
    }
  };

  // ======================================================
  // INITIAL DATE
  // ======================================================

  useEffect(() => {
    if (dates.length > 0) {
      const firstDate = dates[0];

      setSelectedDate(firstDate);

      loadAvailability(firstDate);
    }
  }, []);

  // ======================================================
  // DATE SELECT
  // ======================================================

  const handleDateSelect = (
    date: string
  ) => {
    setSelectedDate(date);

    loadAvailability(date);
  };

  // ======================================================
  // BOOK SERVICE
  // ======================================================

  const handleBookService = async () => {
    if (!params.businessId) {
      Alert.alert(
        "Error",
        "Business information is missing."
      );

      return;
    }

    if (!params.serviceId) {
      Alert.alert(
        "Error",
        "Service information is missing."
      );

      return;
    }

    if (!customerName.trim()) {
      Alert.alert(
        "Name required",
        "Please enter your name."
      );

      return;
    }

    if (!customerPhone.trim()) {
      Alert.alert(
        "Phone required",
        "Please enter your phone number."
      );

      return;
    }

    if (
      customerPhone.trim().length < 10
    ) {
      Alert.alert(
        "Invalid phone",
        "Please enter a valid phone number."
      );

      return;
    }

    if (!selectedSlot) {
      Alert.alert(
        "Time required",
        "Please select an available time."
      );

      return;
    }

    try {
  setBooking(true);

  // ==================================================
  // REGISTER CUSTOMER PUSH TOKEN BEFORE BOOKING
  // ==================================================

  await AsyncStorage.setItem(
    "bookeasy_customer_phone",
    customerPhone.trim()
  );

  console.log(
    "BOOKEASY CUSTOMER PHONE SAVED:",
    customerPhone.trim()
  );

  await registerPushTokenWithBackend();

  // ==================================================
  // CREATE BOOKING
  // ==================================================

  const response =
    await fetch(
      `${API_URL}/bookings/public`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              businessId:
                params.businessId,

              serviceId:
                params.serviceId,

              customerName:
                customerName.trim(),

              customerPhone:
                customerPhone.trim(),

              bookingDate:
                selectedSlot.value,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "Booking response:",
        data
      );

      // ==================================================
      // SLOT ALREADY BOOKED
      // ==================================================

      if (!response.ok) {
        if (response.status === 409) {
          await loadAvailability(
            selectedDate
          );

          setSelectedSlot(null);

          Alert.alert(
            "Time Slot Unavailable",
            data.message ||
              "This time slot was just booked by another customer. Please select another time."
          );

          return;
        }

        throw new Error(
          data.message ||
            "Unable to create booking."
        );
      }

      // ==================================================
      // SAVE CUSTOMER PHONE
      //
      // We still save the phone number.
      // Push notification registration is intentionally
      // disabled here while using Expo Go.
      // ==================================================

      await AsyncStorage.setItem(
        "bookeasy_customer_phone",
        customerPhone.trim()
      );

      console.log(
        "BOOKEASY CUSTOMER PHONE SAVED:",
        customerPhone.trim()
      );

      await registerPushTokenWithBackend();

      // ==================================================
      // SUCCESS
      // ==================================================

      Alert.alert(
        "Booking Successful 🎉",
        "Your appointment has been booked successfully.",
        [
          {
            text: "View My Bookings",

            onPress: () => {
              router.replace({
                pathname:
                  "/customer/bookings",

                params: {
                  phone:
                    customerPhone.trim(),

                  businessId:
                    params.businessId,
                },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.log(
        "Booking error:",
        error
      );

      Alert.alert(
        "Booking Failed",
        error instanceof Error
          ? error.message
          : "Unable to create booking."
      );
    } finally {
      setBooking(false);
    }
  };

  // ======================================================
  // UI
  // ======================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
    >
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Book Service
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* SERVICE INFORMATION */}

      <View style={styles.serviceCard}>
        <Text style={styles.businessName}>
          {params.businessName ||
            "Business"}
        </Text>

        <Text style={styles.serviceName}>
          {params.serviceName ||
            "Service"}
        </Text>

        <View style={styles.serviceInfo}>
          <Text style={styles.price}>
            ₹
            {params.servicePrice ||
              "0"}
          </Text>

          <Text style={styles.dot}>
            •
          </Text>

          <Text style={styles.duration}>
            {params.serviceDuration ||
              "0"}{" "}
            min
          </Text>
        </View>
      </View>

      {/* DATE */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Select Date
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.dateList
          }
        >
          {dates.map((date) => (
            <TouchableOpacity
              key={date}
              style={[
                styles.dateButton,

                selectedDate === date &&
                  styles.selectedDateButton,
              ]}
              onPress={() =>
                handleDateSelect(date)
              }
            >
              <Text
                style={[
                  styles.dateText,

                  selectedDate ===
                    date &&
                    styles.selectedDateText,
                ]}
              >
                {formatDate(date)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* TIME */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Select Time
        </Text>

        {loadingSlots ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading available times...
            </Text>
          </View>
        ) : slots.length === 0 ? (
          <View
            style={styles.noSlotsCard}
          >
            <Text
              style={
                styles.noSlotsText
              }
            >
              No available time slots for
              this date.
            </Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => (
              <TouchableOpacity
                key={slot.value}
                style={[
                  styles.slotButton,

                  selectedSlot?.value ===
                    slot.value &&
                    styles.selectedSlotButton,
                ]}
                onPress={() =>
                  setSelectedSlot(
                    slot
                  )
                }
              >
                <Text
                  style={[
                    styles.slotText,

                    selectedSlot?.value ===
                      slot.value &&
                      styles.selectedSlotText,
                  ]}
                >
                  {slot.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ERROR */}

      {error ? (
        <Text style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {/* CUSTOMER DETAILS */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Your Details
        </Text>

        <Text style={styles.label}>
          Your Name
        </Text>

        <TextInput
          value={customerName}
          onChangeText={
            setCustomerName
          }
          placeholder="Enter your name"
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />

        <Text style={styles.label}>
          Phone Number
        </Text>

        <TextInput
          value={customerPhone}
          onChangeText={
            setCustomerPhone
          }
          placeholder="Enter phone number"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          maxLength={15}
          style={styles.input}
        />
      </View>

      {/* BOOKING SUMMARY */}

      {selectedSlot ? (
        <View style={styles.summaryCard}>
          <Text
            style={styles.summaryTitle}
          >
            Booking Summary
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Service
            </Text>

            <Text style={styles.summaryValue}>
              {params.serviceName}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Date
            </Text>

            <Text style={styles.summaryValue}>
              {formatDate(
                selectedDate
              )}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Time
            </Text>

            <Text style={styles.summaryValue}>
              {selectedSlot.label}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Price
            </Text>

            <Text style={styles.summaryPrice}>
              ₹
              {params.servicePrice}
            </Text>
          </View>
        </View>
      ) : null}

      {/* BOOK BUTTON */}

      <TouchableOpacity
        style={[
          styles.bookButton,

          booking &&
            styles.disabledButton,
        ]}
        onPress={
          handleBookService
        }
        disabled={booking}
      >
        {booking ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text
            style={
              styles.bookButtonText
            }
          >
            Book Service
          </Text>
        )}
      </TouchableOpacity>

      {/* MY BOOKINGS */}

      <TouchableOpacity
        style={styles.myBookingsButton}
        onPress={() =>
          router.push(
            "/customer/bookings"
          )
        }
      >
        <Text
          style={
            styles.myBookingsText
          }
        >
          View My Bookings
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  content: {
    paddingBottom: 40,
  },

  header: {
    height: 60,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    fontSize: 38,
    lineHeight: 40,
    color: "#111827",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  serviceCard: {
    backgroundColor: "#ffffff",
    margin: 16,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  businessName: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },

  serviceName: {
    fontSize: 23,
    color: "#111827",
    fontWeight: "800",
    marginTop: 5,
  },

  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  price: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  dot: {
    marginHorizontal: 8,
    color: "#9ca3af",
  },

  duration: {
    fontSize: 15,
    color: "#6b7280",
  },

  section: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },

  dateList: {
    paddingRight: 10,
  },

  dateButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 8,
    backgroundColor: "#ffffff",
  },

  selectedDateButton: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },

  dateText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },

  selectedDateText: {
    color: "#ffffff",
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },

  loadingText: {
    marginTop: 8,
    color: "#6b7280",
  },

  noSlotsCard: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 10,
  },

  noSlotsText: {
    color: "#6b7280",
    textAlign: "center",
  },

  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  slotButton: {
    width: "31%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: "center",
    marginRight: "2%",
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },

  selectedSlotButton: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },

  slotText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  selectedSlotText: {
    color: "#ffffff",
  },

  errorText: {
    color: "#b91c1c",
    marginHorizontal: 18,
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
    marginTop: 8,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 15,
  },

  summaryCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },

  summaryLabel: {
    color: "#6b7280",
  },

  summaryValue: {
    color: "#111827",
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },

  summaryPrice: {
    color: "#111827",
    fontWeight: "800",
  },

  bookButton: {
    height: 52,
    backgroundColor: "#111827",
    borderRadius: 11,
    marginHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  bookButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  myBookingsButton: {
    height: 50,
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 11,
    marginHorizontal: 16,
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  myBookingsText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
});
