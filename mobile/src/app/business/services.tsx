import { useEffect, useState } from "react";
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
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import API_URL from "../../api";

type Service = {
  _id: string;
  name: string;
  price: number;
  duration: number;
  active?: boolean;
};

export default function BusinessServices() {
  const [services, setServices] = useState<Service[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);

  const [editingService, setEditingService] =
    useState<Service | null>(null);

  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadServices = async () => {
    try {
      const userData = await AsyncStorage.getItem(
        "bookeasy_user"
      );

      if (!userData) {
        router.replace("/business/login");
        return;
      }

      const user = JSON.parse(userData);

      const response = await fetch(
        `${API_URL}/services/${user.id}`
      );

      const data = await response.json();

      if (response.ok) {
        setServices(Array.isArray(data) ? data : data.services || []);
      } else {
        Alert.alert(
          "Error",
          data.message || "Could not load services."
        );
      }
    } catch (error) {
      console.log("Load services error:", error);

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
    loadServices();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const openAddModal = () => {
    setEditingService(null);
    setServiceName("");
    setPrice("");
    setDuration("");
    setModalVisible(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setPrice(String(service.price));
    setDuration(String(service.duration));
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    setEditingService(null);
    setServiceName("");
    setPrice("");
    setDuration("");
  };
const saveService = async () => {
  if (!serviceName.trim()) {
    Alert.alert("Required", "Please enter service name.");
    return;
  }

  if (!price.trim()) {
    Alert.alert("Required", "Please enter service price.");
    return;
  }

  if (!duration.trim()) {
    Alert.alert("Required", "Please enter service duration.");
    return;
  }

  const priceNumber = Number(price);
  const durationNumber = Number(duration);

  if (Number.isNaN(priceNumber) || priceNumber < 0) {
    Alert.alert("Invalid price", "Please enter a valid price.");
    return;
  }

  if (Number.isNaN(durationNumber) || durationNumber <= 0) {
    Alert.alert(
      "Invalid duration",
      "Duration must be greater than 0."
    );
    return;
  }

  try {
    const token = await AsyncStorage.getItem("bookeasy_token");
    const userData = await AsyncStorage.getItem("bookeasy_user");

    console.log("TOKEN EXISTS:", !!token);
    console.log("USER DATA:", userData);

    if (!token || !userData) {
      Alert.alert(
        "Login required",
        "Business login information is missing. Please login again."
      );

      router.replace("/business/login");
      return;
    }

    const user = JSON.parse(userData);

    console.log("PARSED USER:", user);
    console.log("BUSINESS ID:", user.id);

    if (!user.id) {
      Alert.alert(
        "Business ID missing",
        "Your login information does not contain a business ID. Please logout and login again."
      );
      return;
    }

    setSaving(true);

    const url = editingService
      ? `${API_URL}/services/${editingService._id}`
      : `${API_URL}/services`;

    const method = editingService ? "PATCH" : "POST";

    const body = editingService
      ? {
          name: serviceName.trim(),
          price: priceNumber,
          duration: durationNumber,
        }
      : {
          businessId: user.id,
          name: serviceName.trim(),
          price: priceNumber,
          duration: durationNumber,
        };

    console.log("SERVICE REQUEST:", {
      url,
      method,
      body,
    });

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log("SERVICE RESPONSE:", data);

    if (!response.ok) {
      Alert.alert(
        "Could not save",
        data.message || "Something went wrong."
      );
      return;
    }

    setModalVisible(false);
    setEditingService(null);
    setServiceName("");
    setPrice("");
    setDuration("");

    await loadServices();

    Alert.alert(
      "Success",
      editingService
        ? "Service updated successfully."
        : "Service added successfully."
    );
  } catch (error) {
    console.log("Save service error:", error);

    Alert.alert(
      "Connection error",
      "Could not connect to the BookEasy server."
    );
  } finally {
    setSaving(false);
  }
};

  const deleteService = (service: Service) => {
    Alert.alert(
      "Delete Service",
      `Are you sure you want to delete "${service.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDelete(service._id),
        },
      ]
    );
  };

  const performDelete = async (serviceId: string) => {
    try {
      const token = await AsyncStorage.getItem(
        "bookeasy_token"
      );

      if (!token) {
        router.replace("/business/login");
        return;
      }

      setDeletingId(serviceId);

      const response = await fetch(
        `${API_URL}/services/${serviceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Delete failed",
          data.message || "Could not delete service."
        );
        return;
      }

      await loadServices();

      Alert.alert(
        "Deleted",
        "Service deleted successfully."
      );
    } catch (error) {
      console.log("Delete service error:", error);

      Alert.alert(
        "Connection error",
        "Could not connect to the BookEasy server."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563eb"
        />

        <Text style={styles.loadingText}>
          Loading services...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Services
          </Text>

          <Text style={styles.headerSubtitle}>
            {services.length} service
            {services.length !== 1 ? "s" : ""}
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
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Add Service */}

        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
        >
          <Text style={styles.addButtonIcon}>＋</Text>

          <View>
            <Text style={styles.addButtonTitle}>
              Add New Service
            </Text>

            <Text style={styles.addButtonSubtitle}>
              Add a service offered by your business
            </Text>
          </View>
        </TouchableOpacity>

        {/* Services */}

        {services.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🛠️</Text>

            <Text style={styles.emptyTitle}>
              No services yet
            </Text>

            <Text style={styles.emptyText}>
              Add your first service to start accepting
              bookings.
            </Text>

            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={openAddModal}
            >
              <Text style={styles.emptyAddText}>
                Add Service
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          services.map((service) => (
            <View
              key={service._id}
              style={styles.serviceCard}
            >
              <View style={styles.serviceTop}>
                <View style={styles.serviceIcon}>
                  <Text style={styles.serviceIconText}>
                    🛠️
                  </Text>
                </View>

                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>
                    {service.name}
                  </Text>

                  <Text style={styles.serviceDuration}>
                    ⏱️ {service.duration} minutes
                  </Text>
                </View>

                <View style={styles.priceBox}>
                  <Text style={styles.price}>
                    ₹{service.price}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.serviceActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    openEditModal(service)
                  }
                >
                  <Text style={styles.editText}>
                    ✏️ Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() =>
                    deleteService(service)
                  }
                  disabled={
                    deletingId === service._id
                  }
                >
                  <Text style={styles.deleteText}>
                    {deletingId === service._id
                      ? "Deleting..."
                      : "🗑️ Delete"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add / Edit Modal */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingService
                    ? "Edit Service"
                    : "Add Service"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Enter service details
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.closeText}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>
              Service Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Haircut"
              placeholderTextColor="#9ca3af"
              value={serviceName}
              onChangeText={setServiceName}
            />

            <Text style={styles.label}>
              Price
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. 300"
              placeholderTextColor="#9ca3af"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />

            <Text style={styles.label}>
              Duration
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. 30 minutes"
              placeholderTextColor="#9ca3af"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={saveService}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving
                    ? "Saving..."
                    : editingService
                    ? "Update"
                    : "Add Service"}
                </Text>
              </TouchableOpacity>
            </View>
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
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
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
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  emptyIcon: {
    fontSize: 45,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 7,
  },

  emptyAddButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 18,
  },

  emptyAddText: {
    color: "#ffffff",
    fontWeight: "800",
  },

  serviceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  serviceTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },

  serviceIconText: {
    fontSize: 22,
  },

  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },

  serviceName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  serviceDuration: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 5,
  },

  priceBox: {
    marginLeft: 8,
  },

  price: {
    fontSize: 17,
    fontWeight: "800",
    color: "#16a34a",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 14,
  },

  serviceActions: {
    flexDirection: "row",
    gap: 10,
  },

  editButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },

  editText: {
    color: "#2563eb",
    fontWeight: "800",
    fontSize: 13,
  },

  deleteButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },

  deleteText: {
    color: "#dc2626",
    fontWeight: "800",
    fontSize: 13,
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
    padding: 22,
    paddingBottom: 35,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  modalSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },

  closeText: {
    fontSize: 22,
    color: "#6b7280",
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
    marginBottom: 15,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },

  modalCancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCancelText: {
    color: "#374151",
    fontWeight: "800",
  },

  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});