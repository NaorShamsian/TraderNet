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
  Modal,
  Alert,
  StatusBar as RNStatusBar,
} from "react-native";
import API, { setSession } from "../api";

const Login = ({ onLoginSuccess, navigateToRegister, theme, isDarkMode }) => {
  const colors = theme || {
    bg: isDarkMode ? "#0b0f19" : "#f8fafc",
    cardBg: isDarkMode ? "#151c2c" : "#ffffff",
    text: isDarkMode ? "#f3f4f6" : "#0f172a",
    subText: isDarkMode ? "#9ca3af" : "#64748b",
    border: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
    inputBg: isDarkMode ? "#1f293d" : "#f1f5f9",
    inputText: isDarkMode ? "#f3f4f6" : "#0f172a",
    primary: "#6366f1",
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot Password modal states
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Request Code, 2: Reset Password
  const [forgotEmailOrPhone, setForgotEmailOrPhone] = useState("");
  const [forgotMethod, setForgotMethod] = useState("email"); // 'email' or 'sms'
  const [forgotToken, setForgotToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await API.post("/users/login", {
        email: email.trim(),
        password,
      });

      // Save token and user details in local api memory session
      setSession(response.data.token, response.data.user);
      
      // Notify root app
      onLoginSuccess(response.data.token, response.data.user);
    } catch (err) {
      const errMsg = err.response?.data?.message || "Invalid email or password.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetCode = async () => {
    if (!forgotEmailOrPhone.trim()) {
      setForgotError("Please enter your email or phone number.");
      return;
    }

    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);

    try {
      const response = await API.post("/users/forgot-password", {
        emailOrPhone: forgotEmailOrPhone.trim(),
        method: forgotMethod,
      });

      setForgotSuccess(response.data.message);

      // Transition to Step 2 after a small delay
      setTimeout(() => {
        setForgotStep(2);
        setForgotSuccess("");
      }, 2000);

    } catch (err) {
      setForgotError(err.response?.data?.message || "Failed to send reset code.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotToken.trim()) {
      setForgotError("Please enter the 6-digit verification code.");
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError("Password must be at least 6 characters long.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);

    try {
      const response = await API.post("/users/reset-password", {
        token: forgotToken.trim(),
        newPassword: forgotNewPassword,
      });

      Alert.alert("Success", response.data.message);
      
      // If it was an email, auto-populate the email field on login page
      if (forgotEmailOrPhone.includes("@")) {
        setEmail(forgotEmailOrPhone.trim());
      }
      
      // Reset & close
      setForgotModalVisible(false);
      setForgotStep(1);
      setForgotToken("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (err) {
      setForgotError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            TraderNet <Text style={styles.trendIcon}>📈</Text>
          </Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>Connect with top traders worldwide</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Forgot Password trigger link */}
          <TouchableOpacity
            style={styles.forgotLinkContainer}
            onPress={() => {
              setForgotStep(1);
              setForgotEmailOrPhone("");
              setForgotError("");
              setForgotSuccess("");
              setForgotToken("");
              setForgotNewPassword("");
              setForgotConfirmPassword("");
              setForgotModalVisible(true);
            }}
          >
            <Text style={[styles.forgotLinkText, { color: colors.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.subText }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Register here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Modal Overlay */}
      <Modal
        visible={forgotModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDarkMode ? "rgba(11, 15, 25, 0.9)" : "rgba(15, 23, 42, 0.5)" }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Password Reset 🔑</Text>

            {forgotError ? <Text style={styles.modalErrorText}>{forgotError}</Text> : null}
            {forgotSuccess ? <Text style={styles.modalSuccessText}>{forgotSuccess}</Text> : null}

            {forgotStep === 1 ? (
              // STEP 1: REQUEST VERIFICATION PIN
              <View>
                <Text style={[styles.modalInfoText, { color: colors.subText }]}>
                  Choose your reset channel. We will generate a secure 6-digit numeric PIN code.
                </Text>

                {/* Method selector tabs */}
                <View style={[styles.methodToggleRow, { backgroundColor: isDarkMode ? "rgba(21, 28, 44, 0.6)" : "rgba(241, 245, 249, 0.8)", borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.methodTab, forgotMethod === "email" && { backgroundColor: colors.primary }]}
                    onPress={() => setForgotMethod("email")}
                  >
                    <Text style={[styles.methodTabText, { color: forgotMethod === "email" ? "#fff" : colors.subText }]}>
                      📧 Email
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.methodTab, forgotMethod === "sms" && { backgroundColor: colors.primary }]}
                    onPress={() => setForgotMethod("sms")}
                  >
                    <Text style={[styles.methodTabText, { color: forgotMethod === "sms" ? "#fff" : colors.subText }]}>
                      💬 Mobile SMS
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: colors.text }]}>
                    {forgotMethod === "email" ? "Registered Email Address" : "Mobile Phone Number"}
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                    placeholder={
                      forgotMethod === "email" ? "trader1@trader.net" : "+15550191"
                    }
                    placeholderTextColor="#9ca3af"
                    value={forgotEmailOrPhone}
                    onChangeText={setForgotEmailOrPhone}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={forgotMethod === "email" ? "email-address" : "phone-pad"}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }, forgotLoading && styles.btnDisabled]}
                  onPress={handleRequestResetCode}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // STEP 2: VERIFY CODE AND SET NEW PASSWORD
              <View>
                <Text style={[styles.modalInfoText, { color: colors.subText }]}>
                  A 6-digit PIN has been dispatched. Enter it below to unlock password resetting.
                </Text>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: colors.text }]}>6-Digit Reset PIN</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9ca3af"
                    value={forgotToken}
                    onChangeText={setForgotToken}
                    maxLength={6}
                    keyboardType="number-pad"
                  />
                  {forgotToken.length === 6 && (
                    <Text style={styles.helperCodeText}>6-Digit PIN entered ✓</Text>
                  )}
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: colors.text }]}>New Password</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={forgotNewPassword}
                    onChangeText={setForgotNewPassword}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: colors.text }]}>Confirm Password</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                    placeholder="Re-type new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={forgotConfirmPassword}
                    onChangeText={setForgotConfirmPassword}
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }, forgotLoading && styles.btnDisabled]}
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Update Password & Log In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.backToStep1} 
                  onPress={() => setForgotStep(1)}
                  disabled={forgotLoading}
                >
                  <Text style={[styles.backToStep1Text, { color: colors.primary }]}>← Resend verification code</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setForgotModalVisible(false)}
              disabled={forgotLoading}
            >
              <Text style={[styles.modalCancelBtnText, { color: colors.subText }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 0,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "95%",
    maxWidth: 380,
    backgroundColor: "rgba(21, 28, 44, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f3f4f6",
    textAlign: "center",
    marginBottom: 4,
  },
  trendIcon: {
    color: "#6366f1",
  },
  subtitle: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 16,
  },
  errorText: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    color: "#fb7185",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 13,
    textAlign: "left",
  },
  inputGroup: {
    marginBottom: 12,
    width: "100%",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f3f4f6",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f3f4f6",
    fontSize: 14,
  },
  forgotLinkContainer: {
    alignSelf: "flex-end",
    marginBottom: 14,
    marginTop: -4,
  },
  forgotLinkText: {
    color: "#818cf8",
    fontSize: 12,
    fontWeight: "600",
  },
  btnPrimary: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  linkText: {
    color: "#6366f1",
    fontWeight: "700",
    fontSize: 13,
  },

  // MODAL OVERLAY STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 15, 25, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#151c2c",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 24,
    padding: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f3f4f6",
    textAlign: "center",
    marginBottom: 10,
  },
  modalInfoText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 16,
  },
  modalErrorText: {
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.2)",
    color: "#fb7185",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    fontSize: 12,
    textAlign: "center",
  },
  modalSuccessText: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    color: "#34d399",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    fontSize: 12,
    textAlign: "center",
  },
  methodToggleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(21, 28, 44, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    justifyContent: "space-between",
  },
  methodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  methodTabActive: {
    backgroundColor: "#6366f1",
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
  },
  methodTabTextActive: {
    color: "#fff",
  },
  modalInputGroup: {
    marginBottom: 14,
    width: "100%",
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f3f4f6",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f3f4f6",
    fontSize: 14,
  },
  helperCodeText: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
    marginLeft: 4,
  },
  modalSubmitBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  backToStep1: {
    alignSelf: "center",
    marginTop: 14,
  },
  backToStep1Text: {
    color: "#818cf8",
    fontSize: 12,
    fontWeight: "600",
  },
  modalCancelBtn: {
    alignSelf: "center",
    marginTop: 18,
    padding: 6,
  },
  modalCancelBtnText: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default Login;
