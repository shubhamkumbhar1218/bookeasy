import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import API_URL from "../../api";

type Service = {
  _id: string;
  name: string;
  price: number;
  duration: number;
};

type Booking = {
  _id: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  serviceId: Service;
};

export default function CustomerBookingsScreen() {
  const params = useLocalSearchParams<{
    businessId?: string;
    phone?: string;
  }>();

  const [phone, setPhone] = useState(
    typeof params.phone === "string" ? params.phone : ""
  );

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const loadBookings = async () => {
    const cleanPhone = phone.trim();

    if (!cleanPhone) {
      Alert.alert(
        "Phone Number Required",
        "Please enter the mobile number used while booking."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(false);

      let url =
        `${API_URL}/bookings/customer` +
        `?phone=${encodeURIComponent(cleanPhone)}`;

      // Business ID is optional on this screen.
      // If it exists, send it.
      if (params.businessId) {
        url += `&businessId=${encodeURIComponent(params.businessId)}`;
      }

      console.log("Loading bookings:", url);

      const response = await fetch(url);

      const data = await response.json();

      console.log("Bookings response:", data);

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to find your bookings."
        );
      }

      setBookings(Array.isArray(data) ? data : []);
      setSearched(true);
    } catch (error: any) {
      console.log("Bookings error:", error);

      setBookings([]);
      setSearched(true);

      setError(
        error?.message || "Unable to load your bookings."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#16a34a";

      case "pending":
        return "#f59e0b";

      case "cancelled":
        return "#dc2626";

      case "completed":
        return "#2563eb";

      default:
        return "#64748b";
    }
  };

  const getStatusBackground = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#dcfce7";

      case "pending":
        return "#fef3c7";

      case "cancelled":
        return "#fee2e2";

      case "completed":
        return "#dbeafe";

      default:
        return "#f1f5f9";
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>My Bookings</Text>
            <Text style={styles.headerSubtitle}>
              View your appointments
            </Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>
            Find Your Bookings
          </Text>

          <Text style={styles.searchDescription}>
            Enter the mobile number you used when booking your
            appointment.
          </Text>

          <Text style={styles.label}>Mobile Number</Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter mobile number"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.searchButton}
            onPress={loadBookings}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.searchButtonText}>
                Find Bookings
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ERROR */}
        {error !== "" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* RESULTS */}
        {searched && !loading && (
          <View style={styles.results}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                Your Appointments
              </Text>

              <Text style={styles.count}>
                {bookings.length}
              </Text>
            </View>

            {bookings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📅</Text>

                <Text style={styles.emptyTitle}>
                  No Bookings Found
                </Text>

                <Text style={styles.emptyDescription}>
                  No appointment was found for this mobile number.
                  Please make sure you entered the same number used
                  during booking.
                </Text>

                <TouchableOpacity
                  style={styles.businessButton}
                  onPress={() =>
                    router.push("/customer/dashboard")
                  }
                >
                  <Text style={styles.businessButtonText}>
                    Find a Business
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              bookings.map((booking) => (
                <View
                  key={booking._id}
                  style={styles.bookingCard}
                >
                  {/* BOOKING TOP */}
                  <View style={styles.bookingTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>
                        {booking.serviceId?.name || "Service"}
                      </Text>

                      <Text style={styles.customerName}>
                        {booking.customerName}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            getStatusBackground(
                              booking.status
                            ),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: getStatusColor(
                              booking.status
                            ),
                          },
                        ]}
                      >
                        {booking.status
                          .charAt(0)
                          .toUpperCase() +
                          booking.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* DATE */}
                  <View style={styles.row}>
                    <Text style={styles.icon}>📅</Text>

                    <View>
                      <Text style={styles.smallLabel}>
                        Date
                      </Text>

                      <Text style={styles.value}>
                        {formatDate(booking.bookingDate)}
                      </Text>
                    </View>
                  </View>

                  {/* TIME */}
                  <View style={styles.row}>
                    <Text style={styles.icon}>⏰</Text>

                    <View>
                      <Text style={styles.smallLabel}>
                        Time
                      </Text>

                      <Text style={styles.value}>
                        {formatTime(booking.bookingDate)}
                      </Text>
                    </View>
                  </View>

                  {/* DURATION */}
                  <View style={styles.row}>
                    <Text style={styles.icon}>⌛</Text>

                    <View>
                      <Text style={styles.smallLabel}>
                        Duration
                      </Text>

                      <Text style={styles.value}>
                        {booking.serviceId?.duration || 0} minutes
                      </Text>
                    </View>
                  </View>

                  {/* PRICE */}
                  <View style={styles.row}>
                    <Text style={styles.icon}>₹</Text>

                    <View>
                      <Text style={styles.smallLabel}>
                        Price
                      </Text>

                      <Text style={styles.price}>
                        ₹{booking.serviceId?.price || 0}
                      </Text>
                    </View>
                  </View>

                  {/* PHONE */}
                  <View style={styles.row}>
                    <Text style={styles.icon}>📱</Text>

                    <View>
                      <Text style={styles.smallLabel}>
                        Mobile
                      </Text>

                      <Text style={styles.value}>
                        {booking.customerPhone}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* FIND BUSINESS */}
        <TouchableOpacity
          style={styles.anotherButton}
          onPress={() =>
            router.push("/customer/dashboard")
          }
        >
          <Text style={styles.anotherText}>
            ← Find Another Business
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  content: {
    paddingBottom: 40,
  },

  header: {
    backgroundColor: "#2563eb",
    paddingTop: 55,
    paddingBottom: 25,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  backText: {
    color: "#ffffff",
    fontSize: 34,
  },

  headerTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
  },

  headerSubtitle: {
    color: "#dbeafe",
    marginTop: 3,
    fontSize: 14,
  },

  searchCard: {
    backgroundColor: "#ffffff",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
  },

  searchTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },

  searchDescription: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#0f172a",
  },

  searchButton: {
    height: 52,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  searchButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  errorBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
  },

  errorText: {
    color: "#b91c1c",
    fontSize: 14,
  },

  results: {
    marginHorizontal: 16,
  },

  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  resultsTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0f172a",
  },

  count: {
    backgroundColor: "#dbeafe",
    color: "#2563eb",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    fontWeight: "700",
  },

  bookingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  bookingTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  serviceName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },

  customerName: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 13,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  icon: {
    width: 38,
    height: 38,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    marginRight: 12,
    fontSize: 17,
  },

  smallLabel: {
    color: "#94a3b8",
    fontSize: 11,
  },

  value: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },

  price: {
    color: "#16a34a",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 45,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 12,
  },

  emptyDescription: {
    color: "#64748b",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 7,
  },

  businessButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 18,
  },

  businessButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },

  anotherButton: {
    alignItems: "center",
    paddingVertical: 18,
  },

  anotherText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "600",
  },
});