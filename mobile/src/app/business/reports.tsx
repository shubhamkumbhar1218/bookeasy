// import React, {
//   useEffect,
//   useState,
// } from "react";

// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
// } from "react-native";

// import { router } from "expo-router";

// import AsyncStorage from "@react-native-async-storage/async-storage";

// import API_URL from "../../api";

// type Report = {
//   period: {
//     year: number;
//     month: number | null;
//     label: string;
//     isCurrent: boolean;
//   };

//   periodBookings: number;
//   periodRevenue: number;

//   pendingBookings: number;
//   confirmedBookings: number;
//   completedBookings: number;
//   cancelledBookings: number;

//   todayBookings: number;
//   todayRevenue: number;

//   monthlyBookings: number;
//   monthlyRevenue: number;

//   totalBookings: number;
//   totalRevenue: number;
// };

// const months = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];

// export default function BusinessReports() {
//   const [report, setReport] =
//     useState<Report | null>(null);

//   const [year, setYear] = useState(
//     new Date().getFullYear()
//   );

//   const [month, setMonth] = useState(
//     new Date().getMonth() + 1
//   );

//   const [view, setView] =
//     useState<"running" | "past">("running");

//   const [loading, setLoading] =
//     useState(true);

//   const [error, setError] =
//     useState("");

//   // ======================================================
//   // LOAD REPORT
//   // ======================================================

//   const loadReport = async (
//     selectedYear: number,
//     selectedMonth: number
//   ) => {
//     try {
//       setLoading(true);
//       setError("");

//       const savedUser =
//         await AsyncStorage.getItem(
//           "bookeasy_user"
//         );

//       const savedToken =
//         await AsyncStorage.getItem(
//           "bookeasy_token"
//         );

//       const user = savedUser
//         ? JSON.parse(savedUser)
//         : null;

//       console.log(
//         "BOOKEASY USER:",
//         user
//       );

//       console.log(
//         "BOOKEASY TOKEN EXISTS:",
//         !!savedToken
//       );

//       // Support both id and _id
//       const businessId =
//         user?.id || user?._id;

//       if (!businessId) {
//         throw new Error(
//           "Business information not found. Please login again."
//         );
//       }

//       if (!savedToken) {
//         throw new Error(
//           "Login session expired. Please login again."
//         );
//       }

//       const url =
//         `${API_URL}/bookings/stats/${businessId}` +
//         `?year=${selectedYear}` +
//         `&month=${selectedMonth}`;

//       console.log(
//         "REPORT API:",
//         url
//       );

//       const response =
//         await fetch(url, {
//           method: "GET",
//           headers: {
//             Authorization:
//               `Bearer ${savedToken}`,
//             "Content-Type":
//               "application/json",
//           },
//         });

//       const data =
//         await response.json();

//       console.log(
//         "REPORT STATUS:",
//         response.status
//       );

//       console.log(
//         "REPORT DATA:",
//         data
//       );

//       // --------------------------------------------------
//       // UNAUTHORIZED
//       // --------------------------------------------------

//       if (response.status === 401) {
//         await AsyncStorage.multiRemove([
//           "bookeasy_token",
//           "bookeasy_user",
//           "bookeasy_role",
//         ]);

//         router.replace(
//           "/business/login"
//         );

//         return;
//       }

//       // --------------------------------------------------
//       // OTHER ERROR
//       // --------------------------------------------------

//       if (!response.ok) {
//         throw new Error(
//           data?.message ||
//             "Failed to load business report"
//         );
//       }

//       // --------------------------------------------------
//       // SAVE REPORT
//       // --------------------------------------------------

//       setReport(data);
//     } catch (error: any) {
//       console.log(
//         "REPORT ERROR:",
//         error
//       );

//       setError(
//         error?.message ||
//           "Unable to load business reports"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ======================================================
//   // INITIAL LOAD
//   // ======================================================

//   useEffect(() => {
//     loadReport(
//       new Date().getFullYear(),
//       new Date().getMonth() + 1
//     );
//   }, []);

//   // ======================================================
//   // RUNNING
//   // ======================================================

//   const handleRunning = () => {
//     const now = new Date();

//     const currentYear =
//       now.getFullYear();

//     const currentMonth =
//       now.getMonth() + 1;

//     setView("running");
//     setYear(currentYear);
//     setMonth(currentMonth);

//     loadReport(
//       currentYear,
//       currentMonth
//     );
//   };

//   // ======================================================
//   // PAST
//   // ======================================================

//   const handlePast = () => {
//     const now = new Date();

//     let previousMonth =
//       now.getMonth();

//     let previousYear =
//       now.getFullYear();

//     if (previousMonth === 0) {
//       previousMonth = 12;
//       previousYear--;
//     }

//     setView("past");
//     setYear(previousYear);
//     setMonth(previousMonth);

//     loadReport(
//       previousYear,
//       previousMonth
//     );
//   };

//   // ======================================================
//   // CHANGE YEAR
//   // ======================================================

//   const changeYear = (
//     value: number
//   ) => {
//     setYear(value);

//     loadReport(
//       value,
//       month
//     );
//   };

//   // ======================================================
//   // CHANGE MONTH
//   // ======================================================

//   const changeMonth = (
//     value: number
//   ) => {
//     setMonth(value);

//     loadReport(
//       year,
//       value
//     );
//   };

//   // ======================================================
//   // MONEY FORMAT
//   // ======================================================

//   const formatMoney = (
//     amount: number
//   ) => {
//     return `₹${Number(
//       amount || 0
//     ).toLocaleString("en-IN")}`;
//   };

//   // ======================================================
//   // YEARS
//   // Minimum year = 2026
//   // ======================================================

//   const years: number[] = [];

//   const currentYear =
//     new Date().getFullYear();

//   for (
//     let y = currentYear;
//     y >= 2026;
//     y--
//   ) {
//     years.push(y);
//   }

//   // ======================================================
//   // LOADING
//   // ======================================================

//   if (loading && !report) {
//     return (
//       <View
//         style={
//           styles.loadingContainer
//         }
//       >
//         <ActivityIndicator
//           size="large"
//         />

//         <Text
//           style={
//             styles.loadingText
//           }
//         >
//           Loading reports...
//         </Text>
//       </View>
//     );
//   }

//   return (
//     <ScrollView
//       style={styles.container}
//       contentContainerStyle={
//         styles.content
//       }
//     >
//       {/* ==================================================
//           HEADER
//       ================================================== */}

//       <View style={styles.header}>
//         <TouchableOpacity
//           onPress={() =>
//             router.back()
//           }
//         >
//           <Text style={styles.back}>
//             ← Dashboard
//           </Text>
//         </TouchableOpacity>

//         <Text style={styles.title}>
//           Reports & Analytics
//         </Text>

//         <Text
//           style={styles.subtitle}
//         >
//           Track your business
//           performance
//         </Text>
//       </View>

//       {/* ==================================================
//           RUNNING / PAST
//       ================================================== */}

//       <View
//         style={
//           styles.switchContainer
//         }
//       >
//         <TouchableOpacity
//           style={[
//             styles.switchButton,
//             view === "running" &&
//               styles.switchActive,
//           ]}
//           onPress={
//             handleRunning
//           }
//         >
//           <Text
//             style={[
//               styles.switchText,
//               view === "running" &&
//                 styles.switchTextActive,
//             ]}
//           >
//             Running
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[
//             styles.switchButton,
//             view === "past" &&
//               styles.switchActive,
//           ]}
//           onPress={handlePast}
//         >
//           <Text
//             style={[
//               styles.switchText,
//               view === "past" &&
//                 styles.switchTextActive,
//             ]}
//           >
//             Past
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* ==================================================
//           FILTERS
//       ================================================== */}

//       <View
//         style={styles.filterCard}
//       >
//         <Text
//           style={styles.filterLabel}
//         >
//           Year
//         </Text>

//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={
//             false
//           }
//         >
//           {years.map(
//             (item) => (
//               <TouchableOpacity
//                 key={item}
//                 style={[
//                   styles.filterOption,
//                   year === item &&
//                     styles.filterOptionActive,
//                 ]}
//                 onPress={() =>
//                   changeYear(
//                     item
//                   )
//                 }
//               >
//                 <Text
//                   style={[
//                     styles.filterOptionText,
//                     year === item &&
//                       styles.filterOptionTextActive,
//                   ]}
//                 >
//                   {item}
//                 </Text>
//               </TouchableOpacity>
//             )
//           )}
//         </ScrollView>

//         <Text
//           style={[
//             styles.filterLabel,
//             {
//               marginTop: 18,
//             },
//           ]}
//         >
//           Month
//         </Text>

//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={
//             false
//           }
//         >
//           {months.map(
//             (
//               item,
//               index
//             ) => {
//               const monthValue =
//                 index + 1;

//               return (
//                 <TouchableOpacity
//                   key={item}
//                   style={[
//                     styles.filterOption,
//                     month ===
//                       monthValue &&
//                       styles.filterOptionActive,
//                   ]}
//                   onPress={() =>
//                     changeMonth(
//                       monthValue
//                     )
//                   }
//                 >
//                   <Text
//                     style={[
//                       styles.filterOptionText,
//                       month ===
//                         monthValue &&
//                         styles.filterOptionTextActive,
//                     ]}
//                   >
//                     {item.substring(
//                       0,
//                       3
//                     )}
//                   </Text>
//                 </TouchableOpacity>
//               );
//             }
//           )}
//         </ScrollView>
//       </View>

//       {/* ==================================================
//           ERROR
//       ================================================== */}

//       {error ? (
//         <View
//           style={styles.errorBox}
//         >
//           <Text
//             style={styles.errorText}
//           >
//             {error}
//           </Text>

//           <TouchableOpacity
//             style={styles.retryButton}
//             onPress={() =>
//               loadReport(
//                 year,
//                 month
//               )
//             }
//           >
//             <Text
//               style={
//                 styles.retryText
//               }
//             >
//               Try Again
//             </Text>
//           </TouchableOpacity>
//         </View>
//       ) : null}

//       {/* ==================================================
//           REPORT
//       ================================================== */}

//       {report && (
//         <>
//           {/* ==================================================
//               PERIOD
//           ================================================== */}

//           <View
//             style={styles.periodCard}
//           >
//             <View>
//               <Text
//                 style={
//                   styles.periodLabel
//                 }
//               >
//                 Selected Period
//               </Text>

//               <Text
//                 style={
//                   styles.periodTitle
//                 }
//               >
//                 {report.period?.label}
//               </Text>
//             </View>

//             <View
//               style={[
//                 styles.badge,
//                 report.period
//                   ?.isCurrent
//                   ? styles.currentBadge
//                   : styles.pastBadge,
//               ]}
//             >
//               <Text
//                 style={
//                   report.period
//                     ?.isCurrent
//                     ? styles.currentBadgeText
//                     : styles.pastBadgeText
//                 }
//               >
//                 {report.period
//                   ?.isCurrent
//                   ? "Running"
//                   : "Past"}
//               </Text>
//             </View>
//           </View>

//           {/* ==================================================
//               SUMMARY
//           ================================================== */}

//           <View
//             style={styles.summaryRow}
//           >
//             <View
//               style={[
//                 styles.summaryCard,
//                 styles.summaryCardLeft,
//               ]}
//             >
//               <Text
//                 style={
//                   styles.cardLabel
//                 }
//               >
//                 Period Revenue
//               </Text>

//               <Text
//                 style={styles.money}
//               >
//                 {formatMoney(
//                   report.periodRevenue
//                 )}
//               </Text>

//               <Text
//                 style={
//                   styles.cardHint
//                 }
//               >
//                 Completed appointments
//               </Text>
//             </View>

//             <View
//               style={[
//                 styles.summaryCard,
//                 styles.summaryCardRight,
//               ]}
//             >
//               <Text
//                 style={
//                   styles.cardLabel
//                 }
//               >
//                 Period Bookings
//               </Text>

//               <Text
//                 style={
//                   styles.bigNumber
//                 }
//               >
//                 {report.periodBookings ||
//                   0}
//               </Text>

//               <Text
//                 style={
//                   styles.cardHint
//                 }
//               >
//                 Total appointments
//               </Text>
//             </View>
//           </View>

//           {/* ==================================================
//               BOOKING STATUS
//           ================================================== */}

//           <View
//             style={styles.section}
//           >
//             <Text
//               style={
//                 styles.sectionTitle
//               }
//             >
//               Booking Status
//             </Text>

//             <Text
//               style={
//                 styles.sectionSubtitle
//               }
//             >
//               Appointments for{" "}
//               {report.period?.label}
//             </Text>

//             <View
//               style={
//                 styles.statusGrid
//               }
//             >
//               <StatusBox
//                 label="Pending"
//                 value={
//                   report.pendingBookings ||
//                   0
//                 }
//                 type="pending"
//               />

//               <StatusBox
//                 label="Confirmed"
//                 value={
//                   report.confirmedBookings ||
//                   0
//                 }
//                 type="confirmed"
//               />

//               <StatusBox
//                 label="Completed"
//                 value={
//                   report.completedBookings ||
//                   0
//                 }
//                 type="completed"
//               />

//               <StatusBox
//                 label="Cancelled"
//                 value={
//                   report.cancelledBookings ||
//                   0
//                 }
//                 type="cancelled"
//               />
//             </View>
//           </View>

//           {/* ==================================================
//               BUSINESS OVERVIEW
//           ================================================== */}

//           <View
//             style={styles.section}
//           >
//             <Text
//               style={
//                 styles.sectionTitle
//               }
//             >
//               Business Overview
//             </Text>

//             <Text
//               style={
//                 styles.sectionSubtitle
//               }
//             >
//               Overall business
//               performance
//             </Text>

//             <OverviewRow
//               label="Today's Bookings"
//               value={
//                 report.todayBookings ||
//                 0
//               }
//             />

//             <OverviewRow
//               label="Today's Revenue"
//               value={formatMoney(
//                 report.todayRevenue
//               )}
//             />

//             <OverviewRow
//               label="Current Month Bookings"
//               value={
//                 report.monthlyBookings ||
//                 0
//               }
//             />

//             <OverviewRow
//               label="Current Month Revenue"
//               value={formatMoney(
//                 report.monthlyRevenue
//               )}
//             />

//             <OverviewRow
//               label="Lifetime Bookings"
//               value={
//                 report.totalBookings ||
//                 0
//               }
//             />

//             <OverviewRow
//               label="Lifetime Revenue"
//               value={formatMoney(
//                 report.totalRevenue
//               )}
//             />
//           </View>

//           {/* ==================================================
//               REFRESH
//           ================================================== */}

//           <TouchableOpacity
//             style={
//               styles.refreshButton
//             }
//             onPress={() =>
//               loadReport(
//                 year,
//                 month
//               )
//             }
//           >
//             <Text
//               style={
//                 styles.refreshText
//               }
//             >
//               Refresh Reports
//             </Text>
//           </TouchableOpacity>
//         </>
//       )}
//     </ScrollView>
//   );
// }

// // ======================================================
// // STATUS BOX
// // ======================================================

// function StatusBox({
//   label,
//   value,
//   type,
// }: {
//   label: string;
//   value: number;
//   type: string;
// }) {
//   return (
//     <View
//       style={[
//         styles.statusBox,
//         type === "pending" &&
//           styles.pendingBox,
//         type === "confirmed" &&
//           styles.confirmedBox,
//         type === "completed" &&
//           styles.completedBox,
//         type === "cancelled" &&
//           styles.cancelledBox,
//       ]}
//     >
//       <Text
//         style={styles.statusLabel}
//       >
//         {label}
//       </Text>

//       <Text
//         style={styles.statusValue}
//       >
//         {value || 0}
//       </Text>
//     </View>
//   );
// }

// // ======================================================
// // OVERVIEW ROW
// // ======================================================

// function OverviewRow({
//   label,
//   value,
// }: {
//   label: string;
//   value: string | number;
// }) {
//   return (
//     <View
//       style={styles.overviewRow}
//     >
//       <Text
//         style={styles.overviewLabel}
//       >
//         {label}
//       </Text>

//       <Text
//         style={styles.overviewValue}
//       >
//         {value}
//       </Text>
//     </View>
//   );
// }

// // ======================================================
// // STYLES
// // ======================================================

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f7f8fc",
//   },

//   content: {
//     padding: 20,
//     paddingBottom: 50,
//   },

//   loadingContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#f7f8fc",
//   },

//   loadingText: {
//     marginTop: 10,
//     color: "#6b7280",
//   },

//   header: {
//     marginBottom: 20,
//   },

//   back: {
//     color: "#374151",
//     fontWeight: "600",
//     marginBottom: 15,
//   },

//   title: {
//     fontSize: 27,
//     fontWeight: "800",
//     color: "#111827",
//   },

//   subtitle: {
//     marginTop: 6,
//     color: "#6b7280",
//     fontSize: 14,
//   },

//   switchContainer: {
//     flexDirection: "row",
//     backgroundColor: "#ffffff",
//     borderRadius: 12,
//     padding: 4,
//     marginBottom: 16,
//   },

//   switchButton: {
//     flex: 1,
//     paddingVertical: 12,
//     alignItems: "center",
//     borderRadius: 9,
//   },

//   switchActive: {
//     backgroundColor: "#111827",
//   },

//   switchText: {
//     color: "#6b7280",
//     fontWeight: "700",
//   },

//   switchTextActive: {
//     color: "#ffffff",
//   },

//   filterCard: {
//     backgroundColor: "#ffffff",
//     borderRadius: 15,
//     padding: 17,
//     marginBottom: 18,
//   },

//   filterLabel: {
//     fontSize: 13,
//     color: "#6b7280",
//     fontWeight: "700",
//     marginBottom: 9,
//   },

//   filterOption: {
//     paddingHorizontal: 14,
//     paddingVertical: 9,
//     borderRadius: 9,
//     backgroundColor: "#f3f4f6",
//     marginRight: 8,
//   },

//   filterOptionActive: {
//     backgroundColor: "#111827",
//   },

//   filterOptionText: {
//     color: "#374151",
//     fontWeight: "600",
//   },

//   filterOptionTextActive: {
//     color: "#ffffff",
//   },

//   errorBox: {
//     backgroundColor: "#fee2e2",
//     borderRadius: 10,
//     padding: 14,
//     marginBottom: 18,
//   },

//   errorText: {
//     color: "#991b1b",
//     marginBottom: 10,
//   },

//   retryButton: {
//     backgroundColor: "#991b1b",
//     alignSelf: "flex-start",
//     paddingHorizontal: 15,
//     paddingVertical: 9,
//     borderRadius: 8,
//   },

//   retryText: {
//     color: "#ffffff",
//     fontWeight: "700",
//   },

//   periodCard: {
//     backgroundColor: "#111827",
//     borderRadius: 16,
//     padding: 20,
//     marginBottom: 18,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },

//   periodLabel: {
//     color: "#9ca3af",
//     fontSize: 12,
//   },

//   periodTitle: {
//     color: "#ffffff",
//     fontSize: 23,
//     fontWeight: "800",
//     marginTop: 4,
//   },

//   badge: {
//     paddingHorizontal: 11,
//     paddingVertical: 7,
//     borderRadius: 20,
//   },

//   currentBadge: {
//     backgroundColor: "#dcfce7",
//   },

//   pastBadge: {
//     backgroundColor: "#e5e7eb",
//   },

//   currentBadgeText: {
//     color: "#166534",
//     fontWeight: "700",
//     fontSize: 12,
//   },

//   pastBadgeText: {
//     color: "#374151",
//     fontWeight: "700",
//     fontSize: 12,
//   },

//   summaryRow: {
//     flexDirection: "row",
//     marginBottom: 18,
//   },

//   summaryCard: {
//     flex: 1,
//     backgroundColor: "#ffffff",
//     padding: 18,
//     borderRadius: 15,
//   },

//   summaryCardLeft: {
//     marginRight: 7,
//   },

//   summaryCardRight: {
//     marginLeft: 7,
//   },

//   cardLabel: {
//     color: "#6b7280",
//     fontSize: 13,
//   },

//   money: {
//     fontSize: 25,
//     fontWeight: "800",
//     color: "#111827",
//     marginTop: 7,
//   },

//   bigNumber: {
//     fontSize: 29,
//     fontWeight: "800",
//     color: "#111827",
//     marginTop: 7,
//   },

//   cardHint: {
//     color: "#9ca3af",
//     fontSize: 11,
//     marginTop: 4,
//   },

//   section: {
//     backgroundColor: "#ffffff",
//     borderRadius: 15,
//     padding: 18,
//     marginBottom: 18,
//   },

//   sectionTitle: {
//     fontSize: 19,
//     fontWeight: "800",
//     color: "#111827",
//   },

//   sectionSubtitle: {
//     color: "#6b7280",
//     fontSize: 13,
//     marginTop: 4,
//     marginBottom: 16,
//   },

//   statusGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     justifyContent: "space-between",
//   },

//   statusBox: {
//     width: "48%",
//     padding: 15,
//     borderRadius: 11,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: "#e5e7eb",
//   },

//   pendingBox: {
//     borderLeftWidth: 4,
//     borderLeftColor: "#f59e0b",
//   },

//   confirmedBox: {
//     borderLeftWidth: 4,
//     borderLeftColor: "#3b82f6",
//   },

//   completedBox: {
//     borderLeftWidth: 4,
//     borderLeftColor: "#22c55e",
//   },

//   cancelledBox: {
//     borderLeftWidth: 4,
//     borderLeftColor: "#ef4444",
//   },

//   statusLabel: {
//     color: "#6b7280",
//     fontSize: 13,
//   },

//   statusValue: {
//     color: "#111827",
//     fontSize: 23,
//     fontWeight: "800",
//     marginTop: 4,
//   },

//   overviewRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: "#f0f0f0",
//   },

//   overviewLabel: {
//     color: "#6b7280",
//     fontSize: 13,
//     flex: 1,
//   },

//   overviewValue: {
//     color: "#111827",
//     fontWeight: "800",
//     fontSize: 15,
//   },

//   refreshButton: {
//     backgroundColor: "#111827",
//     borderRadius: 12,
//     paddingVertical: 14,
//     alignItems: "center",
//     marginBottom: 20,
//   },

//   refreshText: {
//     color: "#ffffff",
//     fontWeight: "700",
//     fontSize: 15,
//   },
// });







import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../../api";

type Report = {
  period?: {
    year: number;
    month: number | null;
    label: string;
    isCurrent: boolean;
  };
  periodBookings: number;
  periodRevenue: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  todayBookings: number;
  todayRevenue: number;
  monthlyBookings: number;
  monthlyRevenue: number;
  totalBookings: number;
  totalRevenue: number;
};

const months = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const COLORS = {
  background: "#F5F6FC",
  ink: "#171B36",
  muted: "#858AA3",
  purple: "#6258E8",
  border: "#ECECF5",
  green: "#1BAA75",
  amber: "#E99A28",
  blue: "#4888F5",
  red: "#E85D75",
};

const money = (value?: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const number = (value?: number) =>
  Number(value || 0).toLocaleString("en-IN");

export default function BusinessReports() {
  const now = new Date();

  const [report, setReport] = useState<Report | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const years = Array.from(
    { length: Math.max(1, currentYear - 2026 + 1) },
    (_, index) => currentYear - index
  );

  const loadReport = useCallback(
    async (selectedYear: number, selectedMonth: number) => {
      try {
        setLoading(true);
        setError("");

        const [savedUser, savedToken] = await Promise.all([
          AsyncStorage.getItem("bookeasy_user"),
          AsyncStorage.getItem("bookeasy_token"),
        ]);

        const user = savedUser ? JSON.parse(savedUser) : null;
        const businessId = user?.id || user?._id;

        if (!businessId || !savedToken) {
          await AsyncStorage.multiRemove([
            "bookeasy_token",
            "bookeasy_user",
            "bookeasy_role",
          ]);
          router.replace("/business/login");
          return;
        }

        const response = await fetch(
          `${API_URL}/bookings/stats/${businessId}?year=${selectedYear}&month=${selectedMonth}`,
          {
            headers: {
              Authorization: `Bearer ${savedToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (response.status === 401) {
          await AsyncStorage.multiRemove([
            "bookeasy_token",
            "bookeasy_user",
            "bookeasy_role",
          ]);
          router.replace("/business/login");
          return;
        }

        if (!response.ok) {
          throw new Error(data?.message || "Unable to load reports.");
        }

        setReport(data);
      } catch (err: any) {
        setError(err?.message || "Unable to load reports. Check your connection.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadReport(currentYear, currentMonth);
  }, [loadReport, currentYear, currentMonth]);

  const selectPeriod = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
    loadReport(nextYear, nextMonth);
  };

  const selectCurrent = () => {
    selectPeriod(currentYear, currentMonth);
  };

  const selectPrevious = () => {
    const previous = new Date(currentYear, currentMonth - 2, 1);
    selectPeriod(previous.getFullYear(), previous.getMonth() + 1);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReport(year, month);
  };

  const isCurrent = year === currentYear && month === currentMonth;

  if (loading && !report) {
    return (
      <View style={styles.loadingPage}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
        <Text style={styles.loadingTitle}>Preparing your insights</Text>
        <Text style={styles.loadingSubtitle}>Getting your latest business numbers…</Text>
      </View>
    );
  }

  const statusItems = [
    {
      label: "Completed",
      value: report?.completedBookings || 0,
      color: COLORS.green,
      background: "#E5F8F0",
    },
    {
      label: "Confirmed",
      value: report?.confirmedBookings || 0,
      color: COLORS.blue,
      background: "#EAF1FF",
    },
    {
      label: "Pending",
      value: report?.pendingBookings || 0,
      color: COLORS.amber,
      background: "#FFF3DE",
    },
    {
      label: "Cancelled",
      value: report?.cancelledBookings || 0,
      color: COLORS.red,
      background: "#FFE9ED",
    },
  ];

  const totalStatuses = statusItems.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#5146D8" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.purple}
          />
        }
        contentContainerStyle={styles.content}
      >
        {/* HERO HEADER */}
        <LinearGradient
          colors={["#5146D8", "#776CF5", "#9288FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Back to dashboard"
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>

            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>↗</Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>BUSINESS INSIGHTS</Text>
          <Text style={styles.heroTitle}>Reports &{"\n"}Analytics</Text>
          <Text style={styles.heroDescription}>
            Your business performance, at a glance.
          </Text>

          <View style={styles.heroBottom}>
            <View>
              <Text style={styles.heroMetricLabel}>SELECTED PERIOD</Text>
              <Text style={styles.heroMetricValue}>
                {report?.period?.label || `${months[month - 1]} ${year}`}
              </Text>
            </View>

            <View style={styles.periodPill}>
              <View
                style={[
                  styles.periodDot,
                  { backgroundColor: isCurrent ? "#74F0B7" : "#D6D2FF" },
                ]}
              />
              <Text style={styles.periodPillText}>
                {isCurrent ? "Current" : "Past period"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ERROR */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn’t update reports</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadReport(year, month)}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* QUICK PERIOD FILTERS */}
        <View style={styles.quickFilters}>
          <TouchableOpacity
            onPress={selectCurrent}
            style={[styles.quickButton, isCurrent && styles.quickButtonActive]}
          >
            <Text style={[styles.quickButtonText, isCurrent && styles.quickButtonTextActive]}>
              This month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={selectPrevious}
            style={[
              styles.quickButton,
              !isCurrent &&
                year === new Date(currentYear, currentMonth - 2, 1).getFullYear() &&
                month === new Date(currentYear, currentMonth - 2, 1).getMonth() + 1 &&
                styles.quickButtonActive,
            ]}
          >
            <Text
              style={[
                styles.quickButtonText,
                !isCurrent &&
                  year === new Date(currentYear, currentMonth - 2, 1).getFullYear() &&
                  month === new Date(currentYear, currentMonth - 2, 1).getMonth() + 1 &&
                  styles.quickButtonTextActive,
              ]}
            >
              Last month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshChip}
            accessibilityLabel="Refresh reports"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={COLORS.purple} />
            ) : (
              <Text style={styles.refreshSymbol}>↻</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* MONTH AND YEAR SELECTORS */}
        <View style={styles.filterCard}>
          <Text style={styles.filterHeading}>Explore a period</Text>

          <Text style={styles.filterLabel}>YEAR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {years.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => selectPeriod(item, month)}
                style={[styles.yearChip, year === item && styles.chipActive]}
              >
                <Text style={[styles.chipText, year === item && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterLabel, { marginTop: 18 }]}>MONTH</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {months.map((item, index) => (
              <TouchableOpacity
                key={item}
                onPress={() => selectPeriod(year, index + 1)}
                style={[
                  styles.monthChip,
                  month === index + 1 && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    month === index + 1 && styles.chipTextActive,
                  ]}
                >
                  {item.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading && report ? (
          <View style={styles.updatingRow}>
            <ActivityIndicator size="small" color={COLORS.purple} />
            <Text style={styles.updatingText}>Updating selected period…</Text>
          </View>
        ) : null}

        {report ? (
          <>
            {/* REVENUE FEATURE CARD */}
            <LinearGradient
              colors={["#242047", "#38306B", "#5146A8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.revenueCard}
            >
              <View style={styles.revenueCardTop}>
                <View>
                  <Text style={styles.revenueLabel}>PERIOD REVENUE</Text>
                  <Text style={styles.revenueAmount}>
                    {money(report.periodRevenue)}
                  </Text>
                </View>
                <View style={styles.rupeeCircle}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                </View>
              </View>

              <View style={styles.revenueDivider} />

              <View style={styles.revenueBottom}>
                <View>
                  <Text style={styles.revenueBottomLabel}>Completed appointments</Text>
                  <Text style={styles.revenueBottomValue}>
                    {number(report.completedBookings)} bookings
                  </Text>
                </View>
                <View style={styles.revenueTag}>
                  <Text style={styles.revenueTagText}>Revenue</Text>
                </View>
              </View>
            </LinearGradient>

            {/* KEY METRICS */}
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionTitle}>Performance snapshot</Text>
                <Text style={styles.sectionSubtitle}>Your selected period</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <MetricCard
                label="Total bookings"
                value={number(report.periodBookings)}
                caption="All statuses"
                icon="▦"
                color={COLORS.purple}
                tint="#EFEDFF"
              />
              <MetricCard
                label="Completed"
                value={number(report.completedBookings)}
                caption="Appointments done"
                icon="✓"
                color={COLORS.green}
                tint="#E5F8F0"
              />
              <MetricCard
                label="Today's revenue"
                value={money(report.todayRevenue)}
                caption={`${number(report.todayBookings)} bookings today`}
                icon="₹"
                color={COLORS.blue}
                tint="#EAF1FF"
              />
              <MetricCard
                label="Monthly revenue"
                value={money(report.monthlyRevenue)}
                caption={`${number(report.monthlyBookings)} bookings this month`}
                icon="↗"
                color="#A66AE8"
                tint="#F5EBFF"
              />
            </View>

            {/* STATUS DISTRIBUTION */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeadingRow}>
                <View>
                  <Text style={styles.sectionTitle}>Booking breakdown</Text>
                  <Text style={styles.sectionSubtitle}>
                    Status distribution for this period
                  </Text>
                </View>
                <View style={styles.totalPill}>
                  <Text style={styles.totalPillText}>
                    {number(report.periodBookings)} total
                  </Text>
                </View>
              </View>

              {statusItems.map((item) => {
                const percent =
                  totalStatuses > 0
                    ? Math.min(100, (item.value / totalStatuses) * 100)
                    : 0;

                return (
                  <View key={item.label} style={styles.statusItem}>
                    <View style={styles.statusTopRow}>
                      <View style={styles.statusNameWrap}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: item.color },
                          ]}
                        />
                        <Text style={styles.statusName}>{item.label}</Text>
                      </View>
                      <Text style={styles.statusCount}>
                        {number(item.value)}{" "}
                        <Text style={styles.statusPercent}>
                          {Math.round(percent)}%
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percent}%`,
                            backgroundColor: item.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}

              {totalStatuses === 0 ? (
                <Text style={styles.emptyText}>
                  No bookings recorded for this period yet.
                </Text>
              ) : null}
            </View>

            {/* BUSINESS OVERVIEW */}
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionTitle}>Business overview</Text>
                <Text style={styles.sectionSubtitle}>Today, this month and lifetime</Text>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <OverviewItem
                icon="◷"
                tint="#FFF3DE"
                color={COLORS.amber}
                label="Today's bookings"
                value={number(report.todayBookings)}
              />
              <OverviewItem
                icon="₹"
                tint="#E5F8F0"
                color={COLORS.green}
                label="Today's revenue"
                value={money(report.todayRevenue)}
              />
              <OverviewItem
                icon="▦"
                tint="#EAF1FF"
                color={COLORS.blue}
                label="This month's bookings"
                value={number(report.monthlyBookings)}
              />
              <OverviewItem
                icon="↗"
                tint="#EFEDFF"
                color={COLORS.purple}
                label="This month's revenue"
                value={money(report.monthlyRevenue)}
              />
              <OverviewItem
                icon="◎"
                tint="#F5EBFF"
                color="#A66AE8"
                label="Lifetime bookings"
                value={number(report.totalBookings)}
              />
              <OverviewItem
                icon="₹"
                tint="#FFE9ED"
                color={COLORS.red}
                label="Lifetime revenue"
                value={money(report.totalRevenue)}
                last
              />
            </View>

            <Text style={styles.footerNote}>
              Revenue figures are based on the totals returned by BookEasy.
              Check completed bookings and payment records for reconciliation.
            </Text>
          </>
        ) : !error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No report available</Text>
            <Text style={styles.emptyText}>
              Try refreshing or choosing another month.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MetricCard({
  label,
  value,
  caption,
  icon,
  color,
  tint,
}: {
  label: string;
  value: string;
  caption: string;
  icon: string;
  color: string;
  tint: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: tint }]}>
        <Text style={[styles.metricIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>
        {value}
      </Text>
      <Text numberOfLines={2} style={styles.metricCaption}>{caption}</Text>
    </View>
  );
}

function OverviewItem({
  icon,
  tint,
  color,
  label,
  value,
  last = false,
}: {
  icon: string;
  tint: string;
  color: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.overviewItem, !last && styles.overviewBorder]}>
      <View style={[styles.overviewIcon, { backgroundColor: tint }]}>
        <Text style={[styles.overviewIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={styles.overviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 36,
  },
  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    padding: 24,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: COLORS.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 20,
  },
  loadingSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 7,
  },
  hero: {
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.17)",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 36,
    marginTop: -4,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.17)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconText: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
  },
  eyebrow: {
    color: "#DCD9FF",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "800",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    marginTop: 8,
  },
  heroDescription: {
    color: "#E5E2FF",
    fontSize: 13,
    marginTop: 8,
  },
  heroBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 26,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.22)",
  },
  heroMetricLabel: {
    color: "#D8D5FF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroMetricValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 5,
  },
  periodPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 30,
  },
  periodDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  periodPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  quickFilters: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginTop: 19,
    marginBottom: 14,
    gap: 8,
  },
  quickButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
  },
  quickButtonActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  quickButtonText: {
    color: "#646982",
    fontSize: 12,
    fontWeight: "700",
  },
  quickButtonTextActive: {
    color: "#FFFFFF",
  },
  refreshChip: {
    marginLeft: "auto",
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshSymbol: {
    color: COLORS.purple,
    fontSize: 27,
    lineHeight: 30,
  },
  filterCard: {
    marginHorizontal: 18,
    padding: 17,
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#EEEEF6",
    marginBottom: 19,
  },
  filterHeading: {
    fontSize: 15,
    color: COLORS.ink,
    fontWeight: "800",
    marginBottom: 17,
  },
  filterLabel: {
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 10,
  },
  yearChip: {
    backgroundColor: "#F3F3FA",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  monthChip: {
    backgroundColor: "#F3F3FA",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginRight: 7,
  },
  chipActive: {
    backgroundColor: COLORS.ink,
  },
  chipText: {
    color: "#626780",
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  updatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 15,
  },
  updatingText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  revenueCard: {
    marginHorizontal: 18,
    borderRadius: 23,
    padding: 21,
    marginBottom: 25,
  },
  revenueCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  revenueLabel: {
    color: "#C9C5F6",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  revenueAmount: {
    color: "#FFFFFF",
    fontSize: 35,
    fontWeight: "900",
    marginTop: 9,
  },
  rupeeCircle: {
    width: 51,
    height: 51,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  rupeeSymbol: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  revenueDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.17)",
    marginVertical: 18,
  },
  revenueBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  revenueBottomLabel: {
    color: "#C9C5F6",
    fontSize: 11,
  },
  revenueBottomValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 5,
  },
  revenueTag: {
    backgroundColor: "rgba(119,235,185,0.15)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },
  revenueTagText: {
    color: "#8BF0C1",
    fontSize: 10,
    fontWeight: "800",
  },
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 19,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginBottom: 25,
    gap: 11,
  },
  metricCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "44%",
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    borderColor: "#EEEEF6",
    minHeight: 158,
  },
  metricIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  metricIconText: {
    fontSize: 20,
    fontWeight: "900",
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  metricValue: {
    color: COLORS.ink,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 6,
  },
  metricCaption: {
    color: "#A0A4B7",
    fontSize: 10,
    marginTop: 5,
  },
  sectionCard: {
    marginHorizontal: 18,
    marginBottom: 25,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#EEEEF6",
  },
  totalPill: {
    backgroundColor: "#F0EEFF",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
  },
  totalPillText: {
    color: COLORS.purple,
    fontSize: 10,
    fontWeight: "800",
  },
  statusItem: {
    marginTop: 17,
  },
  statusTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  statusNameWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 9,
  },
  statusName: {
    color: "#4B5069",
    fontSize: 12,
    fontWeight: "700",
  },
  statusCount: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  statusPercent: {
    color: COLORS.muted,
    fontWeight: "600",
  },
  progressTrack: {
    height: 8,
    borderRadius: 10,
    backgroundColor: "#F0F1F7",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
  },
  overviewCard: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#EEEEF6",
  },
  overviewItem: {
    minHeight: 69,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
  overviewBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1F7",
  },
  overviewIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  overviewIconText: {
    fontSize: 18,
    fontWeight: "900",
  },
  overviewLabel: {
    flex: 1,
    color: "#656A83",
    fontSize: 12,
    fontWeight: "600",
  },
  overviewValue: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 8,
  },
  footerNote: {
    color: "#969BB0",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginHorizontal: 30,
    marginTop: 18,
  },
  errorCard: {
    backgroundColor: "#FFF0F1",
    borderColor: "#FFD9DE",
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: 18,
    marginTop: 15,
    padding: 15,
  },
  errorTitle: {
    color: "#A52F45",
    fontSize: 14,
    fontWeight: "800",
  },
  errorMessage: {
    color: "#9E4A5B",
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: "#B83E55",
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 9,
    marginTop: 12,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    marginHorizontal: 18,
    padding: 24,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  emptyTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
});
