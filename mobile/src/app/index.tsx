import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= LOGO ================= */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoSymbol}>⌂</Text>
          </View>

          <Text style={styles.logoText}>BookEasy</Text>
        </View>

        {/* ================= HEADING ================= */}
        <View style={styles.headingContainer}>
          <Text style={styles.eyebrow}>
            LOCAL SERVICES, MADE EASY
          </Text>

          <Text style={styles.title}>
            Welcome to BookEasy
          </Text>

          <Text style={styles.subtitle}>
            Find local businesses or manage appointments for your business.
          </Text>
        </View>

        {/* ================= QUESTION ================= */}
        <Text style={styles.question}>
          What would you like to do?
        </Text>

        {/* ================= CARDS ================= */}
        <View style={styles.cardsContainer}>

          {/* CUSTOMER CARD */}
          <View style={styles.card}>
            <View style={styles.cardDecoration} />

            <View style={styles.customerIconBox}>
              <Text style={styles.personIcon}>♙</Text>
            </View>

            <Text style={styles.cardTitle}>
              I'm a Customer
            </Text>

            <Text style={styles.cardDescription}>
              Find and book local businesses near you.
            </Text>

            <TouchableOpacity
              style={styles.continueButton}
              activeOpacity={0.8}
              onPress={() => {
                console.log("Find a Business clicked");
                router.push("/customer/dashboard");
              }}
            >
              <Text style={styles.continueText}>
                Continue
              </Text>

              <Text style={styles.arrow}>
                →
              </Text>
            </TouchableOpacity>
          </View>

          {/* BUSINESS OWNER CARD */}
          <View style={styles.card}>
            <View style={styles.cardDecoration} />

            <View style={styles.businessIconBox}>
              <Text style={styles.storeIcon}>⌂</Text>
            </View>

            <Text style={styles.cardTitle}>
              I'm a Business Owner
            </Text>

            <Text style={styles.cardDescription}>
              Manage your bookings and grow your local business.
            </Text>

            <TouchableOpacity
              style={styles.continueButton}
              activeOpacity={0.8}
              onPress={() => {
                console.log("Business Owner clicked");
                router.push("/business/login");
              }}
            >
              <Text style={styles.continueText}>
                Continue
              </Text>

              <Text style={styles.arrow}>
                →
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ================= BOTTOM NOTE ================= */}
        <View style={styles.noteContainer}>
          <Text style={styles.checkIcon}>✓</Text>

          <Text style={styles.noteText}>
            No account needed to book an appointment.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ================= MAIN ================= */

  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fc",
  },

  container: {
    flexGrow: 1,
    alignItems: "center",

    paddingHorizontal: 18,
    paddingTop: 55,
    paddingBottom: 40,
  },

  /* ================= LOGO ================= */

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",

    marginBottom: 58,
  },

  logoIcon: {
    width: 62,
    height: 62,

    borderRadius: 18,

    backgroundColor: "#5b52ed",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 14,

    shadowColor: "#4f46e5",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,

    elevation: 8,
  },

  logoSymbol: {
    color: "#ffffff",
    fontSize: 35,
    fontWeight: "bold",
  },

  logoText: {
    fontSize: 30,
    fontWeight: "800",

    color: "#111827",

    letterSpacing: -1,
  },

  /* ================= HEADING ================= */

  headingContainer: {
    width: "100%",
    alignItems: "center",
  },

  eyebrow: {
    color: "#5146e5",

    fontSize: 13,
    fontWeight: "800",

    letterSpacing: 1.7,

    marginBottom: 18,

    textAlign: "center",
  },

  title: {
    color: "#111827",

    fontSize: 43,
    lineHeight: 49,

    fontWeight: "800",

    letterSpacing: -1.8,

    textAlign: "center",
  },

  subtitle: {
    color: "#64748b",

    fontSize: 17,
    lineHeight: 26,

    textAlign: "center",

    marginTop: 18,

    maxWidth: 370,
  },

  /* ================= QUESTION ================= */

  question: {
    color: "#111827",

    fontSize: 22,

    fontWeight: "750",

    marginTop: 43,
    marginBottom: 25,

    textAlign: "center",
  },

  /* ================= CARDS ================= */

  cardsContainer: {
    width: "100%",

    gap: 18,
  },

  card: {
    width: "100%",

    minHeight: 350,

    backgroundColor: "#ffffff",

    borderWidth: 1,
    borderColor: "#dfe3eb",

    borderRadius: 25,

    padding: 34,

    overflow: "hidden",

    shadowColor: "#0f172a",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.06,
    shadowRadius: 25,

    elevation: 3,
  },

  cardDecoration: {
    position: "absolute",

    width: 190,
    height: 190,

    right: -95,
    top: -95,

    borderRadius: 100,

    backgroundColor: "#f1f2ff",
  },

  /* ================= CUSTOMER ICON ================= */

  customerIconBox: {
    width: 70,
    height: 70,

    borderRadius: 20,

    backgroundColor: "#eef2ff",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 28,
  },

  personIcon: {
    fontSize: 39,

    color: "#5146e5",
  },

  /* ================= BUSINESS ICON ================= */

  businessIconBox: {
    width: 70,
    height: 70,

    borderRadius: 20,

    backgroundColor: "#effcf4",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 28,
  },

  storeIcon: {
    fontSize: 38,

    color: "#16a34a",

    fontWeight: "bold",
  },

  /* ================= CARD TEXT ================= */

  cardTitle: {
    color: "#0f172a",

    fontSize: 24,

    fontWeight: "750",

    marginBottom: 11,

    letterSpacing: -0.4,
  },

  cardDescription: {
    color: "#64748b",

    fontSize: 16,

    lineHeight: 25,

    marginBottom: 25,

    maxWidth: 340,
  },

  /* ================= BUTTON ================= */

  continueButton: {
    width: "100%",
    height: 53,

    borderWidth: 1,
    borderColor: "#dce1ea",

    borderRadius: 11,

    backgroundColor: "#ffffff",

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    gap: 10,

    marginTop: "auto",
  },

  continueText: {
    color: "#172033",

    fontSize: 15,

    fontWeight: "700",
  },

  arrow: {
    color: "#334155",

    fontSize: 25,

    lineHeight: 25,
  },

  /* ================= BOTTOM NOTE ================= */

  noteContainer: {
    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    marginTop: 36,

    paddingHorizontal: 10,
  },

  checkIcon: {
    color: "#16a34a",

    fontSize: 18,

    fontWeight: "700",

    marginRight: 7,
  },

  noteText: {
    color: "#94a3b8",

    fontSize: 13,

    textAlign: "center",
  },
});