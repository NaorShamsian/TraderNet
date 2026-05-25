import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import API from "../api";

const Register = ({ navigateToLogin }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    bio: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleRegister = async () => {
    const { fullName, email, username, password } = formData;
    if (!fullName.trim() || !email.trim() || !username.trim() || !password.trim()) {
      setError("Full name, email, username, and password are required.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await API.post("/users/register", {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        password,
        bio: formData.bio.trim(),
      });

      // Redirect to login page on success
      navigateToLogin();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Registration failed. Try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>
            TraderNet <Text style={styles.trendIcon}>📈</Text>
          </Text>
          <Text style={styles.subtitle}>Create your account to start trading ideas</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="john@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={formData.email}
              onChangeText={(text) => handleChange("email", text)}
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
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={formData.password}
              onChangeText={(text) => handleChange("password", text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Trader Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Day trader specializing in Tech stocks and Crypto Options"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              value={formData.bio}
              onChangeText={(text) => handleChange("bio", text)}
            />
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.linkText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingVertical: 40,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(21, 28, 44, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f3f4f6",
    textAlign: "center",
    marginBottom: 6,
  },
  trendIcon: {
    color: "#6366f1",
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 24,
  },
  errorText: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    color: "#fb7185",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 14,
    textAlign: "left",
  },
  inputGroup: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 12,
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
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  linkText: {
    color: "#6366f1",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default Register;
