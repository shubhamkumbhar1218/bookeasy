// import { useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { router } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// import API_URL from "../../api";

// type Booking = {
//   _id: string;
//   customerName: string;
//   customerPhone: string;
//   bookingDate: string;
//   status: "pending" | "confirmed" | "cancelled" | "completed";
//   serviceId?: {
//     name?: string;
//     price?: number;
//     duration?: number;
//   };
// };

// export default function BusinessBookings() {
//   const [bookings, setBookings] = useState<Booking[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [actionLoading, setActionLoading] = useState<string | null>(null);

//   const [rescheduleBooking, setRescheduleBooking] =
//   useState<Booking | null>(null);

// const [newBookingDate, setNewBookingDate] =
//   useState(new Date());

// const [showDatePicker, setShowDatePicker] =
//   useState(false);

// const [showTimePicker, setShowTimePicker] =
//   useState(false);


//   const openReschedule = (booking: Booking) => {
//   setRescheduleBooking(booking);
//   setNewBookingDate(new Date(booking.bookingDate));
// };

// const handleReschedule = async () => {
//   if (!rescheduleBooking) return;

//   try {
//     const token = await AsyncStorage.getItem(
//       "bookeasy_token"
//     );

//     if (!token) {
//       router.replace("/business/login");
//       return;
//     }

//     setActionLoading(
//       `${rescheduleBooking._id}-reschedule`
//     );

//     const response = await fetch(
//       `${API_URL}/bookings/${rescheduleBooking._id}/reschedule`,
//       {
//         method: "PATCH",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           bookingDate: newBookingDate.toISOString(),
//         }),
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       Alert.alert(
//         "Reschedule failed",
//         data.message || "Could not reschedule booking."
//       );
//       return;
//     }

//     setRescheduleBooking(null);
//     setShowDatePicker(false);
//     setShowTimePicker(false);

//     Alert.alert(
//       "Success",
//       "Appointment rescheduled successfully."
//     );

//     await loadBookings();
//   } catch (error) {
//     console.log("Reschedule error:", error);

//     Alert.alert(
//       "Connection error",
//       "Could not connect to the BookEasy server."
//     );
//   } finally {
//     setActionLoading(null);
//   }
// }; 

//   const loadBookings = async () => {
//     try {
//       const token = await AsyncStorage.getItem("bookeasy_token");
//       const userData = await AsyncStorage.getItem("bookeasy_user");

//       if (!token || !userData) {
//         router.replace("/business/login");
//         return;
//       }

//       const user = JSON.parse(userData);

//       const response = await fetch(
//         `${API_URL}/bookings/business/${user.id}`,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       const data = await response.json();

//       if (response.ok) {
//         const bookingList = Array.isArray(data)
//           ? data
//           : data.bookings || [];

//         setBookings(bookingList);
//       } else if (response.status === 401) {
//         await AsyncStorage.multiRemove([
//           "bookeasy_token",
//           "bookeasy_user",
//           "bookeasy_role",
//         ]);

//         router.replace("/business/login");
//       } else {
//         Alert.alert(
//           "Error",
//           data.message || "Could not load bookings."
//         );
//       }
//     } catch (error) {
//       console.log("Load bookings error:", error);

//       Alert.alert(
//         "Connection error",
//         "Could not connect to the BookEasy server."
//       );
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     loadBookings();
//   }, []);

//   const handleRefresh = () => {
//     setRefreshing(true);
//     loadBookings();
//   };

//   const updateBookingStatus = async (
//     bookingId: string,
//     action: "confirm" | "cancel" | "complete"
//   ) => {
//     try {
//       const token = await AsyncStorage.getItem("bookeasy_token");

//       if (!token) {
//         router.replace("/business/login");
//         return;
//       }

//       setActionLoading(`${bookingId}-${action}`);

//       const response = await fetch(
//         `${API_URL}/bookings/${bookingId}/${action}`,
//         {
//           method: "PATCH",
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         Alert.alert(
//           "Action failed",
//           data.message || "Could not update booking."
//         );
//         return;
//       }

//       await loadBookings();
//     } catch (error) {
//       console.log("Update booking error:", error);

//       Alert.alert(
//         "Connection error",
//         "Could not connect to the BookEasy server."
//       );
//     } finally {
//       setActionLoading(null);
//     }
//   };

//   const confirmAction = (
//     booking: Booking,
//     action: "confirm" | "cancel" | "complete"
//   ) => {
//     let title = "";
//     let message = "";

//     if (action === "confirm") {
//       title = "Confirm Booking";
//       message = `Confirm the appointment for ${booking.customerName}?`;
//     }

//     if (action === "cancel") {
//       title = "Cancel Booking";
//       message = `Cancel the appointment for ${booking.customerName}?`;
//     }

//     if (action === "complete") {
//       title = "Complete Booking";
//       message = `Mark ${booking.customerName}'s appointment as completed?`;
//     }

//     Alert.alert(title, message, [
//       {
//         text: "No",
//         style: "cancel",
//       },
//       {
//         text: "Yes",
//         onPress: () => updateBookingStatus(booking._id, action),
//       },
//     ]);
//   };

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);

//     return date.toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     });
//   };

//   const formatTime = (dateString: string) => {
//     const date = new Date(dateString);

//     return date.toLocaleTimeString("en-IN", {
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     });
//   };

//   const getStatusStyle = (status: string) => {
//     switch (status) {
//       case "confirmed":
//         return {
//           backgroundColor: "#dcfce7",
//           color: "#166534",
//         };

//       case "completed":
//         return {
//           backgroundColor: "#dbeafe",
//           color: "#1d4ed8",
//         };

//       case "cancelled":
//         return {
//           backgroundColor: "#fee2e2",
//           color: "#991b1b",
//         };

//       default:
//         return {
//           backgroundColor: "#fef3c7",
//           color: "#92400e",
//         };
//     }
//   };

//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#2563eb" />

//         <Text style={styles.loadingText}>
//           Loading bookings...
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Header */}

//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => router.back()}
//         >
//           <Text style={styles.backText}>←</Text>
//         </TouchableOpacity>

//         <View style={styles.headerCenter}>
//           <Text style={styles.headerTitle}>Bookings</Text>

//           <Text style={styles.headerSubtitle}>
//             {bookings.length} appointment
//             {bookings.length !== 1 ? "s" : ""}
//           </Text>
//         </View>

//         <TouchableOpacity
//           style={styles.refreshButton}
//           onPress={handleRefresh}
//         >
//           <Text style={styles.refreshText}>↻</Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.content}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={handleRefresh}
//           />
//         }
//       >
//         {bookings.length === 0 ? (
//           <View style={styles.emptyCard}>
//             <Text style={styles.emptyIcon}>📅</Text>

//             <Text style={styles.emptyTitle}>
//               No bookings yet
//             </Text>

//             <Text style={styles.emptyText}>
//               Customer appointments will appear here.
//             </Text>
//           </View>
//         ) : (
//           bookings.map((booking) => {
//             const statusStyle = getStatusStyle(booking.status);

//             return (
//               <View
//                 key={booking._id}
//                 style={styles.bookingCard}
//               >
//                 {/* Customer */}

//                 <View style={styles.bookingTop}>
//                   <View style={styles.customerIcon}>
//                     <Text style={styles.customerIconText}>
//                       👤
//                     </Text>
//                   </View>

//                   <View style={styles.customerInfo}>
//                     <Text style={styles.customerName}>
//                       {booking.customerName}
//                     </Text>

//                     <Text style={styles.customerPhone}>
//                       📞 {booking.customerPhone}
//                     </Text>
//                   </View>

//                   <View
//                     style={[
//                       styles.statusBadge,
//                       {
//                         backgroundColor:
//                           statusStyle.backgroundColor,
//                       },
//                     ]}
//                   >
//                     <Text
//                       style={[
//                         styles.statusText,
//                         {
//                           color: statusStyle.color,
//                         },
//                       ]}
//                     >
//                       {booking.status}
//                     </Text>
//                   </View>
//                 </View>

//                 {/* Appointment */}

//                 <View style={styles.divider} />

//                 <View style={styles.infoRow}>
//                   <Text style={styles.infoLabel}>
//                     🛠️ Service
//                   </Text>

//                   <Text style={styles.infoValue}>
//                     {booking.serviceId?.name || "Service"}
//                   </Text>
//                 </View>

//                 <View style={styles.infoRow}>
//                   <Text style={styles.infoLabel}>
//                     📅 Date
//                   </Text>

//                   <Text style={styles.infoValue}>
//                     {formatDate(booking.bookingDate)}
//                   </Text>
//                 </View>

//                 <View style={styles.infoRow}>
//                   <Text style={styles.infoLabel}>
//                     🕐 Time
//                   </Text>

//                   <Text style={styles.infoValue}>
//                     {formatTime(booking.bookingDate)}
//                   </Text>
//                 </View>

//                 {booking.serviceId?.price !== undefined && (
//                   <View style={styles.infoRow}>
//                     <Text style={styles.infoLabel}>
//                       💰 Price
//                     </Text>

//                     <Text style={styles.price}>
//                       ₹{booking.serviceId.price}
//                     </Text>
//                   </View>
//                 )}

//                 {/* Actions */}

//                 {booking.status === "pending" && (
//                   <View style={styles.actions}>
//                     <TouchableOpacity
//                       style={styles.confirmButton}
//                       onPress={() =>
//                         confirmAction(
//                           booking,
//                           "confirm"
//                         )
//                       }
//                       disabled={
//                         actionLoading !== null
//                       }
//                     >
//                       <Text style={styles.confirmText}>
//                         {actionLoading ===
//                         `${booking._id}-confirm`
//                           ? "..."
//                           : "✓ Confirm"}
//                       </Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                       style={styles.cancelButton}
//                       onPress={() =>
//                         confirmAction(
//                           booking,
//                           "cancel"
//                         )
//                       }
//                       disabled={
//                         actionLoading !== null
//                       }
//                     >
//                       <Text style={styles.cancelText}>
//                         {actionLoading ===
//                         `${booking._id}-cancel`
//                           ? "..."
//                           : "✕ Cancel"}
//                       </Text>
//                     </TouchableOpacity>
//                   </View>
//                 )}

//                 {booking.status === "confirmed" && (
//   <>
//     <TouchableOpacity
//       style={styles.rescheduleButton}
//       onPress={() => openReschedule(booking)}
//       disabled={actionLoading !== null}
//     >
//       <Text style={styles.rescheduleText}>
//         📅 Reschedule
//       </Text>
//     </TouchableOpacity>

//     <TouchableOpacity
//       style={styles.completeButton}
//       onPress={() =>
//         confirmAction(
//           booking,
//           "complete"
//         )
//       }
//       disabled={actionLoading !== null}
//     >
//       <Text style={styles.completeText}>
//         {actionLoading ===
//         `${booking._id}-complete`
//           ? "Updating..."
//           : "✓ Mark as Completed"}
//       </Text>
//     </TouchableOpacity>
//   </>
// )}
//               </View>
//             );
//           })
//         )}
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f8fafc",
//   },

//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f8fafc",
//   },

//   loadingText: {
//     marginTop: 12,
//     color: "#6b7280",
//     fontSize: 14,
//   },

//   header: {
//     backgroundColor: "#ffffff",
//     paddingHorizontal: 18,
//     paddingTop: 55,
//     paddingBottom: 15,
//     flexDirection: "row",
//     alignItems: "center",
//     borderBottomWidth: 1,
//     borderBottomColor: "#e5e7eb",
//   },

//   backButton: {
//     width: 42,
//     height: 42,
//     borderRadius: 12,
//     backgroundColor: "#eff6ff",
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   backText: {
//     fontSize: 26,
//     color: "#2563eb",
//   },

//   headerCenter: {
//     flex: 1,
//     marginLeft: 14,
//   },

//   headerTitle: {
//     fontSize: 21,
//     fontWeight: "800",
//     color: "#111827",
//   },

//   headerSubtitle: {
//     fontSize: 12,
//     color: "#6b7280",
//     marginTop: 2,
//   },

//   refreshButton: {
//     width: 42,
//     height: 42,
//     borderRadius: 12,
//     backgroundColor: "#f3f4f6",
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   refreshText: {
//     fontSize: 25,
//     color: "#374151",
//   },

//   content: {
//     padding: 18,
//     paddingBottom: 40,
//   },

//   emptyCard: {
//     backgroundColor: "#ffffff",
//     borderRadius: 18,
//     padding: 35,
//     alignItems: "center",
//     marginTop: 20,
//     borderWidth: 1,
//     borderColor: "#e5e7eb",
//   },

//   emptyIcon: {
//     fontSize: 45,
//     marginBottom: 15,
//   },

//   emptyTitle: {
//     fontSize: 19,
//     fontWeight: "800",
//     color: "#111827",
//   },

//   emptyText: {
//     fontSize: 14,
//     color: "#6b7280",
//     marginTop: 7,
//     textAlign: "center",
//   },

//   bookingCard: {
//     backgroundColor: "#ffffff",
//     borderRadius: 18,
//     padding: 17,
//     marginBottom: 15,
//     borderWidth: 1,
//     borderColor: "#e5e7eb",
//   },

//   bookingTop: {
//     flexDirection: "row",
//     alignItems: "center",
//   },

//   customerIcon: {
//     width: 46,
//     height: 46,
//     borderRadius: 23,
//     backgroundColor: "#eff6ff",
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   customerIconText: {
//     fontSize: 21,
//   },

//   customerInfo: {
//     flex: 1,
//     marginLeft: 12,
//   },

//   customerName: {
//     fontSize: 16,
//     fontWeight: "800",
//     color: "#111827",
//   },

//   customerPhone: {
//     fontSize: 12,
//     color: "#6b7280",
//     marginTop: 4,
//   },

//   statusBadge: {
//     paddingHorizontal: 9,
//     paddingVertical: 6,
//     borderRadius: 8,
//   },

//   statusText: {
//     fontSize: 11,
//     fontWeight: "800",
//     textTransform: "capitalize",
//   },

//   divider: {
//     height: 1,
//     backgroundColor: "#e5e7eb",
//     marginVertical: 14,
//   },

//   infoRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 10,
//   },

//   infoLabel: {
//     fontSize: 13,
//     color: "#6b7280",
//   },

//   infoValue: {
//     fontSize: 13,
//     fontWeight: "700",
//     color: "#111827",
//     maxWidth: "60%",
//     textAlign: "right",
//   },

//   price: {
//     fontSize: 15,
//     fontWeight: "800",
//     color: "#16a34a",
//   },

//   actions: {
//     flexDirection: "row",
//     gap: 10,
//     marginTop: 8,
//   },

//   confirmButton: {
//     flex: 1,
//     height: 45,
//     borderRadius: 10,
//     backgroundColor: "#dcfce7",
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   confirmText: {
//     color: "#166534",
//     fontSize: 13,
//     fontWeight: "800",
//   },

//   cancelButton: {
//     flex: 1,
//     height: 45,
//     borderRadius: 10,
//     backgroundColor: "#fee2e2",
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   cancelText: {
//     color: "#dc2626",
//     fontSize: 13,
//     fontWeight: "800",
//   },

//   completeButton: {
//     height: 45,
//     borderRadius: 10,
//     backgroundColor: "#dbeafe",
//     justifyContent: "center",
//     alignItems: "center",
//     marginTop: 5,
//   },

// completeText: {
//   color: "#1d4ed8",
//   fontSize: 13,
//   fontWeight: "800",
// },

// rescheduleButton: {
//   height: 45,
//   borderRadius: 10,
//   backgroundColor: "#fef3c7",
//   justifyContent: "center",
//   alignItems: "center",
//   marginTop: 5,
// },

// rescheduleText: {
//   color: "#92400e",
//   fontSize: 13,
//   fontWeight: "800",
// },
// });

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
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  serviceId?: {
    name?: string;
    price?: number;
    duration?: number;
  };
};

export default function BusinessBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  const [showTimePicker, setShowTimePicker] =
    useState(false);

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

  useEffect(() => {
    loadBookings();
  }, []);

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

  const openReschedule = (booking: Booking) => {
    setRescheduleBooking(booking);
    setNewBookingDate(new Date(booking.bookingDate));
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  // ================================
  // CLOSE RESCHEDULE
  // ================================

  const closeReschedule = () => {
    setRescheduleBooking(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  // ================================
  // HANDLE RESCHEDULE
  // ================================

  const handleReschedule = async () => {
    if (!rescheduleBooking) return;

    try {
      const token = await AsyncStorage.getItem(
        "bookeasy_token"
      );

      if (!token) {
        router.replace("/business/login");
        return;
      }

      setActionLoading(
        `${rescheduleBooking._id}-reschedule`
      );

      const response = await fetch(
        `${API_URL}/bookings/${rescheduleBooking._id}/reschedule`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingDate: newBookingDate.toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Reschedule failed",
          data.message ||
            "Could not reschedule booking."
        );

        return;
      }

      closeReschedule();

      Alert.alert(
        "Success",
        "Appointment rescheduled successfully."
      );

      await loadBookings();
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
            {bookings.length} appointment
            {bookings.length !== 1 ? "s" : ""}
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
        {bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📅
            </Text>

            <Text style={styles.emptyTitle}>
              No bookings yet
            </Text>

            <Text style={styles.emptyText}>
              Customer appointments will appear here.
            </Text>
          </View>
        ) : (
          bookings.map((booking) => {
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
                    <Text
                      style={
                        styles.customerIconText
                      }
                    >
                      👤
                    </Text>
                  </View>

                  <View style={styles.customerInfo}>
                    <Text
                      style={styles.customerName}
                    >
                      {booking.customerName}
                    </Text>

                    <Text
                      style={styles.customerPhone}
                    >
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
                        {
                          color:
                            statusStyle.color,
                        },
                      ]}
                    >
                      {booking.status}
                    </Text>
                  </View>
                </View>

                {/* DIVIDER */}

                <View style={styles.divider} />

                {/* SERVICE */}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    🛠️ Service
                  </Text>

                  <Text style={styles.infoValue}>
                    {booking.serviceId?.name ||
                      "Service"}
                  </Text>
                </View>

                {/* DATE */}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    📅 Date
                  </Text>

                  <Text style={styles.infoValue}>
                    {formatDate(
                      booking.bookingDate
                    )}
                  </Text>
                </View>

                {/* TIME */}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    🕐 Time
                  </Text>

                  <Text style={styles.infoValue}>
                    {formatTime(
                      booking.bookingDate
                    )}
                  </Text>
                </View>

                {/* PRICE */}

                {booking.serviceId?.price !==
                  undefined && (
                  <View style={styles.infoRow}>
                    <Text
                      style={styles.infoLabel}
                    >
                      💰 Price
                    </Text>

                    <Text style={styles.price}>
                      ₹{booking.serviceId.price}
                    </Text>
                  </View>
                )}

                {/* PENDING ACTIONS */}

                {booking.status === "pending" && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={
                        styles.confirmButton
                      }
                      onPress={() =>
                        confirmAction(
                          booking,
                          "confirm"
                        )
                      }
                      disabled={
                        actionLoading !== null
                      }
                    >
                      <Text
                        style={styles.confirmText}
                      >
                        {actionLoading ===
                        `${booking._id}-confirm`
                          ? "..."
                          : "✓ Confirm"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.cancelButton
                      }
                      onPress={() =>
                        confirmAction(
                          booking,
                          "cancel"
                        )
                      }
                      disabled={
                        actionLoading !== null
                      }
                    >
                      <Text
                        style={styles.cancelText}
                      >
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
                      style={
                        styles.rescheduleButton
                      }
                      onPress={() =>
                        openReschedule(booking)
                      }
                      disabled={
                        actionLoading !== null
                      }
                    >
                      <Text
                        style={
                          styles.rescheduleText
                        }
                      >
                        📅 Reschedule
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.completeButton
                      }
                      onPress={() =>
                        confirmAction(
                          booking,
                          "complete"
                        )
                      }
                      disabled={
                        actionLoading !== null
                      }
                    >
                      <Text
                        style={
                          styles.completeText
                        }
                      >
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
              {rescheduleBooking?.serviceId?.name ||
                "Service"}
            </Text>

            {/* DATE BUTTON */}

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                setShowTimePicker(false);
                setShowDatePicker(true);
              }}
            >
              <Text
                style={styles.dateButtonText}
              >
                📅{" "}
                {newBookingDate.toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </Text>
            </TouchableOpacity>

            {/* TIME BUTTON */}

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                setShowDatePicker(false);
                setShowTimePicker(true);
              }}
            >
              <Text
                style={styles.dateButtonText}
              >
                🕐{" "}
                {newBookingDate.toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }
                )}
              </Text>
            </TouchableOpacity>

            {/* DATE PICKER */}

            {showDatePicker && (
              <DateTimePicker
                value={newBookingDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(
                  event,
                  selectedDate
                ) => {
                  setShowDatePicker(false);

                  if (selectedDate) {
                    const updatedDate =
                      new Date(
                        newBookingDate
                      );

                    updatedDate.setFullYear(
                      selectedDate.getFullYear()
                    );

                    updatedDate.setMonth(
                      selectedDate.getMonth()
                    );

                    updatedDate.setDate(
                      selectedDate.getDate()
                    );

                    setNewBookingDate(
                      updatedDate
                    );
                  }
                }}
              />
            )}

            {/* TIME PICKER */}

            {showTimePicker && (
              <DateTimePicker
                value={newBookingDate}
                mode="time"
                onChange={(
                  event,
                  selectedTime
                ) => {
                  setShowTimePicker(false);

                  if (selectedTime) {
                    const updatedDate =
                      new Date(
                        newBookingDate
                      );

                    updatedDate.setHours(
                      selectedTime.getHours()
                    );

                    updatedDate.setMinutes(
                      selectedTime.getMinutes()
                    );

                    setNewBookingDate(
                      updatedDate
                    );
                  }
                }}
              />
            )}

            {/* MODAL ACTIONS */}

            <View style={styles.modalActions}>

              <TouchableOpacity
                style={
                  styles.modalCancelButton
                }
                onPress={closeReschedule}
                disabled={
                  actionLoading !== null
                }
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
                  actionLoading !== null
                }
              >
                <Text
                  style={styles.modalSaveText}
                >
                  {actionLoading ===
                  `${rescheduleBooking?._id}-reschedule`
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
});