import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import API, { getSessionUser, setSession, getSessionToken } from "../api";
import Navbar from "../components/Navbar";

const Profile = ({ onLogout, onNavigate }) => {
  const currentUser = getSessionUser() || {};
  const token = getSessionToken();

  const [formData, setFormData] = useState({
    fullName: currentUser.fullName || "",
    username: currentUser.username || "",
    bio: currentUser.bio || "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleUpdate = async () => {
    const { fullName, username, bio, password } = formData;
    if (!fullName.trim() || !username.trim()) {
      setError("Full Name and Username are required.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const updatePayload = {
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
      };

      if (password.trim()) {
        updatePayload.password = password;
      }

      const response = await API.put("/users/me", updatePayload);
      
      // Update memory session with the newly returned user details
      setSession(token, response.data);
      
      setSuccessMsg("Profile updated successfully!");
      // Clear password field
      setFormData((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account ⚠️",
      "Are you sure you want to permanently delete your account? This action is irreversible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete("/users/me");
              Alert.alert("Success", "Account deleted successfully.");
              onLogout();
            } catch (err) {
              Alert.alert("Error", "Failed to delete account. Try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Navbar onLogout={onLogout} currentScreen="Profile" onNavigate={onNavigate} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Edit Profile 👤</Text>
            <Text style={styles.subtitle}>Update your trading profile details</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#9ca3af"
                value={formData.fullName}
                onChangeText={(text) => handleChange("fullName", text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="johndoe"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                value={formData.username}
                onChangeText={(text) => handleChange("username", text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell other traders about your style..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                value={formData.bio}
                onChangeText={(text) => handleChange("bio", text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Change Password (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave blank to keep current"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={formData.password}
                onChangeText={(text) => handleChange("password", text)}
              />
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnDanger}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.btnDangerText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "rgba(21, 28, 44, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f3f4f6",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 20,
  },
  errorText: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    color: "#fb7185",
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  successText: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    color: "#34d399",
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 14,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f3f4f6",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#f3f4f6",
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  btnPrimary: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  btnDanger: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.4)",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  btnDangerText: {
    color: "#fb7185",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default Profile;
