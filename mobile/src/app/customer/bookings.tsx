// import { useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { router, useLocalSearchParams } from "expo-router";
// import API_URL from "../../api";

// type Service = {
//   _id: string;
//   name: string;
//   price: number;
//   duration: number;
// };

// type Booking = {
//   _id: string;
//   customerName: string;
//   customerPhone: string;
//   bookingDate: string;
//   status: "pending" | "confirmed" | "cancelled" | "completed";
//   serviceId: Service;
// };

// export default function CustomerBookingsScreen() {
//   const params = useLocalSearchParams<{
//     businessId?: string;
//     phone?: string;
//   }>();

//   const [phone, setPhone] = useState(
//     typeof params.phone === "string" ? params.phone : ""
//   );

//   const [bookings, setBookings] = useState<Booking[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [searched, setSearched] = useState(false);
//   const [error, setError] = useState("");

//   const loadBookings = async () => {
//     const cleanPhone = phone.trim();

//     if (!cleanPhone) {
//       Alert.alert(
//         "Phone Number Required",
//         "Please enter the mobile number used while booking."
//       );
//       return;
//     }

//     try {
//       setLoading(true);
//       setError("");
//       setSearched(false);

//       let url =
//         `${API_URL}/bookings/customer` +
//         `?phone=${encodeURIComponent(cleanPhone)}`;

//       // Business ID is optional on this screen.
//       // If it exists, send it.
//       if (params.businessId) {
//         url += `&businessId=${encodeURIComponent(params.businessId)}`;
//       }

//       console.log("Loading bookings:", url);

//       const response = await fetch(url);

//       const data = await response.json();

//       console.log("Bookings response:", data);

//       if (!response.ok) {
//         throw new Error(
//           data?.message || "Unable to find your bookings."
//         );
//       }

//       setBookings(Array.isArray(data) ? data : []);
//       setSearched(true);
//     } catch (error: any) {
//       console.log("Bookings error:", error);

//       setBookings([]);
//       setSearched(true);

//       setError(
//         error?.message || "Unable to load your bookings."
//       );
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const handleRefresh = async () => {
//     setRefreshing(true);
//     await loadBookings();
//   };

//   const formatDate = (date: string) => {
//     return new Date(date).toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     });
//   };

//   const formatTime = (date: string) => {
//     return new Date(date).toLocaleTimeString("en-IN", {
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case "confirmed":
//         return "#16a34a";

//       case "pending":
//         return "#f59e0b";

//       case "cancelled":
//         return "#dc2626";

//       case "completed":
//         return "#2563eb";

//       default:
//         return "#64748b";
//     }
//   };

//   const getStatusBackground = (status: string) => {
//     switch (status) {
//       case "confirmed":
//         return "#dcfce7";

//       case "pending":
//         return "#fef3c7";

//       case "cancelled":
//         return "#fee2e2";

//       case "completed":
//         return "#dbeafe";

//       default:
//         return "#f1f5f9";
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <ScrollView
//         contentContainerStyle={styles.content}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={handleRefresh}
//           />
//         }
//       >
//         {/* HEADER */}
//         <View style={styles.header}>
//           <TouchableOpacity
//             style={styles.backButton}
//             onPress={() => router.back()}
//           >
//             <Text style={styles.backText}>‹</Text>
//           </TouchableOpacity>

//           <View>
//             <Text style={styles.headerTitle}>My Bookings</Text>
//             <Text style={styles.headerSubtitle}>
//               View your appointments
//             </Text>
//           </View>
//         </View>

//         {/* SEARCH */}
//         <View style={styles.searchCard}>
//           <Text style={styles.searchTitle}>
//             Find Your Bookings
//           </Text>

//           <Text style={styles.searchDescription}>
//             Enter the mobile number you used when booking your
//             appointment.
//           </Text>

//           <Text style={styles.label}>Mobile Number</Text>

//           <TextInput
//             value={phone}
//             onChangeText={setPhone}
//             placeholder="Enter mobile number"
//             placeholderTextColor="#94a3b8"
//             keyboardType="phone-pad"
//             style={styles.input}
//           />

//           <TouchableOpacity
//             style={styles.searchButton}
//             onPress={loadBookings}
//             disabled={loading}
//           >
//             {loading ? (
//               <ActivityIndicator color="#ffffff" />
//             ) : (
//               <Text style={styles.searchButtonText}>
//                 Find Bookings
//               </Text>
//             )}
//           </TouchableOpacity>
//         </View>

//         {/* ERROR */}
//         {error !== "" && (
//           <View style={styles.errorBox}>
//             <Text style={styles.errorText}>{error}</Text>
//           </View>
//         )}

//         {/* RESULTS */}
//         {searched && !loading && (
//           <View style={styles.results}>
//             <View style={styles.resultsHeader}>
//               <Text style={styles.resultsTitle}>
//                 Your Appointments
//               </Text>

//               <Text style={styles.count}>
//                 {bookings.length}
//               </Text>
//             </View>

//             {bookings.length === 0 ? (
//               <View style={styles.emptyCard}>
//                 <Text style={styles.emptyIcon}>📅</Text>

//                 <Text style={styles.emptyTitle}>
//                   No Bookings Found
//                 </Text>

//                 <Text style={styles.emptyDescription}>
//                   No appointment was found for this mobile number.
//                   Please make sure you entered the same number used
//                   during booking.
//                 </Text>

//                 <TouchableOpacity
//                   style={styles.businessButton}
//                   onPress={() =>
//                     router.push("/customer/dashboard")
//                   }
//                 >
//                   <Text style={styles.businessButtonText}>
//                     Find a Business
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             ) : (
//               bookings.map((booking) => (
//                 <View
//                   key={booking._id}
//                   style={styles.bookingCard}
//                 >
//                   {/* BOOKING TOP */}
//                   <View style={styles.bookingTop}>
//                     <View style={{ flex: 1 }}>
//                       <Text style={styles.serviceName}>
//                         {booking.serviceId?.name || "Service"}
//                       </Text>

//                       <Text style={styles.customerName}>
//                         {booking.customerName}
//                       </Text>
//                     </View>

//                     <View
//                       style={[
//                         styles.statusBadge,
//                         {
//                           backgroundColor:
//                             getStatusBackground(
//                               booking.status
//                             ),
//                         },
//                       ]}
//                     >
//                       <Text
//                         style={[
//                           styles.statusText,
//                           {
//                             color: getStatusColor(
//                               booking.status
//                             ),
//                           },
//                         ]}
//                       >
//                         {booking.status
//                           .charAt(0)
//                           .toUpperCase() +
//                           booking.status.slice(1)}
//                       </Text>
//                     </View>
//                   </View>

//                   <View style={styles.divider} />

//                   {/* DATE */}
//                   <View style={styles.row}>
//                     <Text style={styles.icon}>📅</Text>

//                     <View>
//                       <Text style={styles.smallLabel}>
//                         Date
//                       </Text>

//                       <Text style={styles.value}>
//                         {formatDate(booking.bookingDate)}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* TIME */}
//                   <View style={styles.row}>
//                     <Text style={styles.icon}>⏰</Text>

//                     <View>
//                       <Text style={styles.smallLabel}>
//                         Time
//                       </Text>

//                       <Text style={styles.value}>
//                         {formatTime(booking.bookingDate)}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* DURATION */}
//                   <View style={styles.row}>
//                     <Text style={styles.icon}>⌛</Text>

//                     <View>
//                       <Text style={styles.smallLabel}>
//                         Duration
//                       </Text>

//                       <Text style={styles.value}>
//                         {booking.serviceId?.duration || 0} minutes
//                       </Text>
//                     </View>
//                   </View>

//                   {/* PRICE */}
//                   <View style={styles.row}>
//                     <Text style={styles.icon}>₹</Text>

//                     <View>
//                       <Text style={styles.smallLabel}>
//                         Price
//                       </Text>

//                       <Text style={styles.price}>
//                         ₹{booking.serviceId?.price || 0}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* PHONE */}
//                   <View style={styles.row}>
//                     <Text style={styles.icon}>📱</Text>

//                     <View>
//                       <Text style={styles.smallLabel}>
//                         Mobile
//                       </Text>

//                       <Text style={styles.value}>
//                         {booking.customerPhone}
//                       </Text>
//                     </View>
//                   </View>
//                 </View>
//               ))
//             )}
//           </View>
//         )}

//         {/* FIND BUSINESS */}
//         <TouchableOpacity
//           style={styles.anotherButton}
//           onPress={() =>
//             router.push("/customer/dashboard")
//           }
//         >
//           <Text style={styles.anotherText}>
//             ← Find Another Business
//           </Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f8fafc",
//   },

//   content: {
//     paddingBottom: 40,
//   },

//   header: {
//     backgroundColor: "#2563eb",
//     paddingTop: 55,
//     paddingBottom: 25,
//     paddingHorizontal: 20,
//     flexDirection: "row",
//     alignItems: "center",
//   },

//   backButton: {
//     width: 42,
//     height: 42,
//     borderRadius: 21,
//     backgroundColor: "rgba(255,255,255,0.2)",
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 14,
//   },

//   backText: {
//     color: "#ffffff",
//     fontSize: 34,
//   },

//   headerTitle: {
//     color: "#ffffff",
//     fontSize: 24,
//     fontWeight: "700",
//   },

//   headerSubtitle: {
//     color: "#dbeafe",
//     marginTop: 3,
//     fontSize: 14,
//   },

//   searchCard: {
//     backgroundColor: "#ffffff",
//     margin: 16,
//     padding: 20,
//     borderRadius: 16,
//     elevation: 3,
//   },

//   searchTitle: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#0f172a",
//   },

//   searchDescription: {
//     color: "#64748b",
//     fontSize: 14,
//     lineHeight: 20,
//     marginTop: 6,
//     marginBottom: 20,
//   },

//   label: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#334155",
//     marginBottom: 8,
//   },

//   input: {
//     height: 52,
//     borderWidth: 1,
//     borderColor: "#cbd5e1",
//     borderRadius: 10,
//     paddingHorizontal: 15,
//     fontSize: 16,
//     color: "#0f172a",
//   },

//   searchButton: {
//     height: 52,
//     backgroundColor: "#2563eb",
//     borderRadius: 10,
//     alignItems: "center",
//     justifyContent: "center",
//     marginTop: 14,
//   },

//   searchButtonText: {
//     color: "#ffffff",
//     fontSize: 16,
//     fontWeight: "700",
//   },

//   errorBox: {
//     marginHorizontal: 16,
//     marginBottom: 12,
//     padding: 14,
//     borderRadius: 10,
//     backgroundColor: "#fee2e2",
//   },

//   errorText: {
//     color: "#b91c1c",
//     fontSize: 14,
//   },

//   results: {
//     marginHorizontal: 16,
//   },

//   resultsHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 12,
//   },

//   resultsTitle: {
//     fontSize: 19,
//     fontWeight: "700",
//     color: "#0f172a",
//   },

//   count: {
//     backgroundColor: "#dbeafe",
//     color: "#2563eb",
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 15,
//     fontWeight: "700",
//   },

//   bookingCard: {
//     backgroundColor: "#ffffff",
//     borderRadius: 16,
//     padding: 18,
//     marginBottom: 14,
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//   },

//   bookingTop: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//   },

//   serviceName: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: "#0f172a",
//   },

//   customerName: {
//     color: "#64748b",
//     marginTop: 4,
//     fontSize: 13,
//   },

//   statusBadge: {
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 20,
//   },

//   statusText: {
//     fontSize: 12,
//     fontWeight: "700",
//   },

//   divider: {
//     height: 1,
//     backgroundColor: "#e2e8f0",
//     marginVertical: 16,
//   },

//   row: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 14,
//   },

//   icon: {
//     width: 38,
//     height: 38,
//     textAlign: "center",
//     textAlignVertical: "center",
//     backgroundColor: "#eff6ff",
//     borderRadius: 10,
//     marginRight: 12,
//     fontSize: 17,
//   },

//   smallLabel: {
//     color: "#94a3b8",
//     fontSize: 11,
//   },

//   value: {
//     color: "#334155",
//     fontSize: 14,
//     fontWeight: "600",
//     marginTop: 2,
//   },

//   price: {
//     color: "#16a34a",
//     fontSize: 15,
//     fontWeight: "700",
//     marginTop: 2,
//   },

//   emptyCard: {
//     backgroundColor: "#ffffff",
//     borderRadius: 16,
//     padding: 30,
//     alignItems: "center",
//   },

//   emptyIcon: {
//     fontSize: 45,
//   },

//   emptyTitle: {
//     fontSize: 19,
//     fontWeight: "700",
//     color: "#0f172a",
//     marginTop: 12,
//   },

//   emptyDescription: {
//     color: "#64748b",
//     textAlign: "center",
//     lineHeight: 21,
//     marginTop: 7,
//   },

//   businessButton: {
//     backgroundColor: "#2563eb",
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 10,
//     marginTop: 18,
//   },

//   businessButtonText: {
//     color: "#ffffff",
//     fontWeight: "700",
//   },

//   anotherButton: {
//     alignItems: "center",
//     paddingVertical: 18,
//   },

//   anotherText: {
//     color: "#2563eb",
//     fontSize: 15,
//     fontWeight: "600",
//   },
// });



import { useState } from "react";

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

import { router, useLocalSearchParams } from "expo-router";
import API_URL from "../../api";


// ======================================================
// TYPES
// ======================================================

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

type ReviewStatus = {
  canReview: boolean;
  alreadyReviewed: boolean;
  bookingStatus: string;
  review: {
    _id: string;
    customerName: string;
    rating: number;
    review: string;
    createdAt: string;
  } | null;
};


// ======================================================
// SCREEN
// ======================================================

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

  // ====================================================
  // REVIEW STATE
  // ====================================================

  const [reviewStatuses, setReviewStatuses] = useState<
    Record<string, ReviewStatus>
  >({});

  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  const [selectedRating, setSelectedRating] = useState(0);

  const [reviewText, setReviewText] = useState("");

  const [reviewLoading, setReviewLoading] = useState(false);


// ======================================================
// LOAD REVIEW STATUS FOR COMPLETED BOOKINGS
// ======================================================

  const loadReviewStatuses = async (
    bookingList: Booking[],
    customerPhone: string
  ) => {
    const completedBookings = bookingList.filter(
      (booking) => booking.status === "completed"
    );

    if (completedBookings.length === 0) {
      setReviewStatuses({});
      return;
    }

    const statusEntries = await Promise.all(
      completedBookings.map(async (booking) => {
        try {
          const response = await fetch(
            `${API_URL}/reviews/booking/${booking._id}?phone=${encodeURIComponent(
              customerPhone
            )}`
          );

          const data = await response.json();

          if (!response.ok) {
            console.log(
              "Review status error:",
              data?.message
            );

            return [
              booking._id,
              {
                canReview: false,
                alreadyReviewed: false,
                bookingStatus: booking.status,
                review: null,
              },
            ] as const;
          }

          return [booking._id, data] as const;
        } catch (error) {
          console.log(
            "Review status loading error:",
            error
          );

          return [
            booking._id,
            {
              canReview: false,
              alreadyReviewed: false,
              bookingStatus: booking.status,
              review: null,
            },
          ] as const;
        }
      })
    );

    setReviewStatuses(
      Object.fromEntries(statusEntries)
    );
  };


// ======================================================
// LOAD BOOKINGS
// ======================================================

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
        url += `&businessId=${encodeURIComponent(
          params.businessId
        )}`;
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

      const bookingList = Array.isArray(data)
        ? data
        : [];

      setBookings(bookingList);
      setSearched(true);

      // Load review status after bookings are loaded
      await loadReviewStatuses(
        bookingList,
        cleanPhone
      );
    } catch (error: any) {
      console.log("Bookings error:", error);

      setBookings([]);
      setReviewStatuses({});
      setSearched(true);

      setError(
        error?.message ||
          "Unable to load your bookings."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


// ======================================================
// REFRESH
// ======================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
  };


// ======================================================
// OPEN REVIEW MODAL
// ======================================================

  const openReviewModal = (booking: Booking) => {
    const status = reviewStatuses[booking._id];

    if (!status?.canReview) {
      if (status?.alreadyReviewed) {
        Alert.alert(
          "Already Reviewed",
          "You have already reviewed this booking."
        );
      } else {
        Alert.alert(
          "Review Not Available",
          "You can review the service only after the booking is completed."
        );
      }

      return;
    }

    setSelectedBooking(booking);
    setSelectedRating(0);
    setReviewText("");
    setReviewModalVisible(true);
  };


// ======================================================
// CLOSE REVIEW MODAL
// ======================================================

  const closeReviewModal = () => {
    if (reviewLoading) {
      return;
    }

    setReviewModalVisible(false);
    setSelectedBooking(null);
    setSelectedRating(0);
    setReviewText("");
  };


// ======================================================
// SUBMIT REVIEW
// ======================================================

  const submitReview = async () => {
    if (!selectedBooking) {
      return;
    }

    const cleanReview = reviewText.trim();

    if (selectedRating < 1 || selectedRating > 5) {
      Alert.alert(
        "Rating Required",
        "Please select a rating from 1 to 5 stars."
      );
      return;
    }

    if (cleanReview.length < 3) {
      Alert.alert(
        "Review Required",
        "Review must contain at least 3 characters."
      );
      return;
    }

    try {
      setReviewLoading(true);

      const response = await fetch(
        `${API_URL}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: selectedBooking._id,
            customerName:
              selectedBooking.customerName,
            customerPhone:
              selectedBooking.customerPhone,
            rating: selectedRating,
            review: cleanReview,
          }),
        }
      );

      const data = await response.json();

      console.log("Review response:", data);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to submit your review."
        );
      }

      // Update review state immediately
      setReviewStatuses((previous) => ({
        ...previous,
        [selectedBooking._id]: {
          canReview: false,
          alreadyReviewed: true,
          bookingStatus:
            selectedBooking.status,
          review: data.review,
        },
      }));

      setReviewModalVisible(false);

      setSelectedBooking(null);
      setSelectedRating(0);
      setReviewText("");

      Alert.alert(
        "Thank You! ⭐",
        "Your review has been submitted successfully."
      );
    } catch (error: any) {
      console.log(
        "Submit review error:",
        error
      );

      Alert.alert(
        "Review Failed",
        error?.message ||
          "Unable to submit your review. Please try again."
      );
    } finally {
      setReviewLoading(false);
    }
  };


// ======================================================
// DATE
// ======================================================

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };


// ======================================================
// TIME
// ======================================================

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };


// ======================================================
// STATUS COLOR
// ======================================================

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


// ======================================================
// STATUS BACKGROUND
// ======================================================

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


// ======================================================
// RENDER
// ======================================================

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

        {/* ==================================================
            HEADER
        ================================================== */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>
              My Bookings
            </Text>

            <Text style={styles.headerSubtitle}>
              View your appointments
            </Text>
          </View>
        </View>


        {/* ==================================================
            SEARCH
        ================================================== */}

        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>
            Find Your Bookings
          </Text>

          <Text style={styles.searchDescription}>
            Enter the mobile number you used while
            booking your appointment.
          </Text>

          <Text style={styles.label}>
            Mobile Number
          </Text>

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


        {/* ==================================================
            ERROR
        ================================================== */}

        {error !== "" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}


        {/* ==================================================
            RESULTS
        ================================================== */}

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
                <Text style={styles.emptyIcon}>
                  📅
                </Text>

                <Text style={styles.emptyTitle}>
                  No Bookings Found
                </Text>

                <Text style={styles.emptyDescription}>
                  No appointment was found for this
                  mobile number. Please make sure
                  you entered the same number used
                  during booking.
                </Text>

                <TouchableOpacity
                  style={styles.businessButton}
                  onPress={() =>
                    router.push(
                      "/customer/dashboard"
                    )
                  }
                >
                  <Text style={styles.businessButtonText}>
                    Find a Business
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              bookings.map((booking) => {
                const reviewStatus =
                  reviewStatuses[booking._id];

                return (
                  <View
                    key={booking._id}
                    style={styles.bookingCard}
                  >

                    {/* ======================================
                        BOOKING TOP
                    ====================================== */}

                    <View style={styles.bookingTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>
                          {booking.serviceId?.name ||
                            "Service"}
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
                              color:
                                getStatusColor(
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


                    {/* ======================================
                        DATE
                    ====================================== */}

                    <View style={styles.row}>
                      <Text style={styles.icon}>
                        📅
                      </Text>

                      <View>
                        <Text style={styles.smallLabel}>
                          Date
                        </Text>

                        <Text style={styles.value}>
                          {formatDate(
                            booking.bookingDate
                          )}
                        </Text>
                      </View>
                    </View>


                    {/* ======================================
                        TIME
                    ====================================== */}

                    <View style={styles.row}>
                      <Text style={styles.icon}>
                        ⏰
                      </Text>

                      <View>
                        <Text style={styles.smallLabel}>
                          Time
                        </Text>

                        <Text style={styles.value}>
                          {formatTime(
                            booking.bookingDate
                          )}
                        </Text>
                      </View>
                    </View>


                    {/* ======================================
                        DURATION
                    ====================================== */}

                    <View style={styles.row}>
                      <Text style={styles.icon}>
                        ⌛
                      </Text>

                      <View>
                        <Text style={styles.smallLabel}>
                          Duration
                        </Text>

                        <Text style={styles.value}>
                          {booking.serviceId?.duration ||
                            0}{" "}
                          minutes
                        </Text>
                      </View>
                    </View>


                    {/* ======================================
                        PRICE
                    ====================================== */}

                    <View style={styles.row}>
                      <Text style={styles.icon}>
                        ₹
                      </Text>

                      <View>
                        <Text style={styles.smallLabel}>
                          Price
                        </Text>

                        <Text style={styles.price}>
                          ₹
                          {booking.serviceId?.price ||
                            0}
                        </Text>
                      </View>
                    </View>


                    {/* ======================================
                        PHONE
                    ====================================== */}

                    <View style={styles.row}>
                      <Text style={styles.icon}>
                        📱
                      </Text>

                      <View>
                        <Text style={styles.smallLabel}>
                          Mobile
                        </Text>

                        <Text style={styles.value}>
                          {booking.customerPhone}
                        </Text>
                      </View>
                    </View>


                    {/* ======================================
                        REVIEW SECTION
                    ====================================== */}

                    {booking.status ===
                      "completed" && (
                      <View style={styles.reviewSection}>

                        <View
                          style={styles.reviewDivider}
                        />

                        <Text
                          style={styles.reviewSectionTitle}
                        >
                          ⭐ Service Review
                        </Text>


                        {/* REVIEW NOT YET LOADED */}

                        {!reviewStatus && (
                          <View
                            style={
                              styles.reviewLoading
                            }
                          >
                            <ActivityIndicator
                              size="small"
                              color="#2563eb"
                            />

                            <Text
                              style={
                                styles.reviewLoadingText
                              }
                            >
                              Checking review...
                            </Text>
                          </View>
                        )}


                        {/* CAN REVIEW */}

                        {reviewStatus?.canReview && (
                          <TouchableOpacity
                            style={
                              styles.writeReviewButton
                            }
                            onPress={() =>
                              openReviewModal(
                                booking
                              )
                            }
                          >
                            <Text
                              style={
                                styles.writeReviewButtonText
                              }
                            >
                              ⭐ Write a Review
                            </Text>
                          </TouchableOpacity>
                        )}


                        {/* ALREADY REVIEWED */}

                        {reviewStatus?.alreadyReviewed &&
                          reviewStatus.review && (
                            <View
                              style={
                                styles.submittedReviewCard
                              }
                            >
                              <View
                                style={
                                  styles.submittedReviewTop
                                }
                              >
                                <Text
                                  style={
                                    styles.submittedReviewTitle
                                  }
                                >
                                  Your Review
                                </Text>

                                <View
                                  style={
                                    styles.starsRow
                                  }
                                >
                                  {[1, 2, 3, 4, 5].map(
                                    (star) => (
                                      <Text
                                        key={star}
                                        style={
                                          styles.smallStar
                                        }
                                      >
                                        {star <=
                                        reviewStatus
                                          .review!
                                          .rating
                                          ? "★"
                                          : "☆"}
                                      </Text>
                                    )
                                  )}
                                </View>
                              </View>

                              <Text
                                style={
                                  styles.submittedReviewText
                                }
                              >
                                {
                                  reviewStatus
                                    .review.review
                                }
                              </Text>

                              <Text
                                style={
                                  styles.reviewSubmittedText
                                }
                              >
                                ✓ Review submitted
                              </Text>
                            </View>
                          )}


                        {/* REVIEW EXISTS BUT DATA IS NULL */}

                        {reviewStatus?.alreadyReviewed &&
                          !reviewStatus.review && (
                            <View
                              style={
                                styles.alreadyReviewedBox
                              }
                            >
                              <Text
                                style={
                                  styles.alreadyReviewedText
                                }
                              >
                                ✓ You have already
                                reviewed this booking
                              </Text>
                            </View>
                          )}
                      </View>
                    )}

                  </View>
                );
              })
            )}
          </View>
        )}


        {/* ==================================================
            FIND BUSINESS
        ================================================== */}

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


      {/* ====================================================
          REVIEW MODAL
      ==================================================== */}

      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeReviewModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  Rate Your Experience
                </Text>

                <Text style={styles.modalSubtitle}>
                  {selectedBooking?.serviceId?.name ||
                    "Service"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeReviewModal}
                disabled={reviewLoading}
              >
                <Text style={styles.closeButtonText}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>


            {/* STARS */}

            <Text style={styles.ratingLabel}>
              How was your experience?
            </Text>

            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() =>
                    setSelectedRating(star)
                  }
                  disabled={reviewLoading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.ratingStar,
                      star <= selectedRating &&
                        styles.ratingStarSelected,
                    ]}
                  >
                    {star <= selectedRating
                      ? "★"
                      : "☆"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingValue}>
              {selectedRating === 0
                ? "Select a rating"
                : `${selectedRating} out of 5`}
            </Text>


            {/* REVIEW INPUT */}

            <Text style={styles.reviewInputLabel}>
              Write your review
            </Text>

            <TextInput
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="Tell us about your experience..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
              editable={!reviewLoading}
              style={styles.reviewInput}
              textAlignVertical="top"
            />

            <Text style={styles.characterCount}>
              {reviewText.length}/500
            </Text>


            {/* SUBMIT */}

            <TouchableOpacity
              style={[
                styles.submitReviewButton,
                reviewLoading &&
                  styles.disabledButton,
              ]}
              onPress={submitReview}
              disabled={reviewLoading}
            >
              {reviewLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text
                  style={
                    styles.submitReviewButtonText
                  }
                >
                  Submit Review
                </Text>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}


// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  content: {
    paddingBottom: 40,
  },

  // ====================================================
  // HEADER
  // ====================================================

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
    backgroundColor:
      "rgba(255,255,255,0.2)",
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

  // ====================================================
  // SEARCH
  // ====================================================

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

  // ====================================================
  // ERROR
  // ====================================================

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

  // ====================================================
  // RESULTS
  // ====================================================

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

  // ====================================================
  // BOOKING CARD
  // ====================================================

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

  // ====================================================
  // REVIEW SECTION
  // ====================================================

  reviewSection: {
    marginTop: 2,
  },

  reviewDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginTop: 4,
    marginBottom: 16,
  },

  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },

  reviewLoading: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },

  reviewLoadingText: {
    marginLeft: 8,
    color: "#64748b",
    fontSize: 13,
  },

  writeReviewButton: {
    backgroundColor: "#2563eb",
    height: 46,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  writeReviewButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },

  submittedReviewCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  submittedReviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  submittedReviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  starsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  smallStar: {
    fontSize: 18,
    color: "#f59e0b",
    marginLeft: 1,
  },

  submittedReviewText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },

  reviewSubmittedText: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },

  alreadyReviewedBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 12,
  },

  alreadyReviewedText: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "600",
  },

  // ====================================================
  // EMPTY
  // ====================================================

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

  // ====================================================
  // FIND ANOTHER BUSINESS
  // ====================================================

  anotherButton: {
    alignItems: "center",
    paddingVertical: 18,
  },

  anotherText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "600",
  },

  // ====================================================
  // REVIEW MODAL
  // ====================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#0f172a",
  },

  modalSubtitle: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 4,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    color: "#475569",
    fontSize: 28,
    lineHeight: 30,
  },

  ratingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
    marginTop: 24,
  },

  ratingStars: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  ratingStar: {
    fontSize: 43,
    color: "#cbd5e1",
    marginHorizontal: 4,
  },

  ratingStarSelected: {
    color: "#f59e0b",
  },

  ratingValue: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },

  reviewInputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginTop: 22,
    marginBottom: 8,
  },

  reviewInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },

  characterCount: {
    color: "#94a3b8",
    fontSize: 11,
    textAlign: "right",
    marginTop: 5,
  },

  submitReviewButton: {
    height: 52,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },

  submitReviewButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.7,
  },
});