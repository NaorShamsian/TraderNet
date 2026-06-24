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
} from "react-native";
import API, { getSessionUser, setSession, getSessionToken } from "../api";

const Profile = ({ onLogout, onNavigate, onStartPrivateChat, theme, isDarkMode }) => {
  const currentUser = getSessionUser() || {};
  const token = getSessionToken();

  // Color mappings
  const colors = theme || {
    bg: "#f8fafc",
    cardBg: "#ffffff",
    text: "#0f172a",
    subText: "#64748b",
    border: "rgba(15, 23, 42, 0.08)",
    inputBg: "#f1f5f9",
    inputText: "#0f172a",
    primary: "#6366f1",
    accent: "#ec4899",
    success: "#10b981",
    danger: "#ef4444",
  };

  const [formData, setFormData] = useState({
    fullName: currentUser.fullName || "",
    email: currentUser.email || "",
    phoneNumber: currentUser.phoneNumber || "",
    username: currentUser.username || "",
    bio: currentUser.bio || "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  // Friends system state
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [friendsTab, setFriendsTab] = useState("list"); // 'list' or 'requests'
  const [friendsLoading, setFriendsLoading] = useState(false);

  const fetchFriendsData = async () => {
    setFriendsLoading(true);
    try {
      const friendsRes = await API.get("/users/friends/list");
      setFriends(friendsRes.data);
      const requestsRes = await API.get("/users/friends/requests");
      setRequests(requestsRes.data);
    } catch (err) {
      console.error("Failed to load friends data", err);
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendsData();
  }, []);

  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleUpdate = async () => {
    const { fullName, email, phoneNumber, username, bio, password } = formData;
    if (!fullName.trim() || !email.trim() || !username.trim()) {
      setError("Full Name, Email, and Username are required.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const updatePayload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
      };

      if (password.trim()) {
        updatePayload.password = password;
      }

      const response = await API.put("/users/me", updatePayload);
      setSession(token, response.data);
      setSuccessMsg("Profile updated successfully!");
      setFormData((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requesterId) => {
    try {
      await API.post(`/users/friends/accept/${requesterId}`);
      Alert.alert("Success", "Friend request accepted!");
      fetchFriendsData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to accept request.");
    }
  };

  const handleRejectRequest = async (requesterId) => {
    try {
      await API.post(`/users/friends/reject/${requesterId}`);
      Alert.alert("Success", "Friend request rejected.");
      fetchFriendsData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to reject request.");
    }
  };

  const handleRemoveFriend = async (friendId, name) => {
    Alert.alert(
      "Unfriend",
      `Are you sure you want to remove ${name} from your friends list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove Friend",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/users/friends/remove/${friendId}`);
              fetchFriendsData();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to remove friend.");
            }
          },
        },
      ]
    );
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* User Card info summary */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.profileSummaryRow}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.profileAvatarText}>
                {currentUser.fullName?.charAt(0).toUpperCase() || "T"}
              </Text>
            </View>
            <View style={styles.profileSummaryInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>{currentUser.fullName}</Text>
              <Text style={[styles.profileUsername, { color: colors.subText }]}>@{currentUser.username}</Text>
              <Text style={[styles.profileBio, { color: colors.text }]}>
                {currentUser.bio || "No bio set yet. Write one below!"}
              </Text>
            </View>
          </View>
        </View>

        {/* 2x2 Trading Tools Grid */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Trading Desk & Community</Text>
        <View style={styles.toolsGrid}>
          <View style={styles.gridRow}>
            <TouchableOpacity
              style={[styles.toolCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              onPress={() => onNavigate("UsersList")}
              activeOpacity={0.7}
            >
              <Text style={styles.toolIcon}>👥</Text>
              <Text style={[styles.toolLabel, { color: colors.text }]}>Traders</Text>
              <Text style={[styles.toolDesc, { color: colors.subText }]}>Directory</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              onPress={() => onNavigate("Chat")}
              activeOpacity={0.7}
            >
              <Text style={styles.toolIcon}>💬</Text>
              <Text style={[styles.toolLabel, { color: colors.text }]}>Global Chat</Text>
              <Text style={[styles.toolDesc, { color: colors.subText }]}>Trading Desk</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridRow}>
            <TouchableOpacity
              style={[styles.toolCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              onPress={() => onNavigate("Statistics")}
              activeOpacity={0.7}
            >
              <Text style={styles.toolIcon}>📊</Text>
              <Text style={[styles.toolLabel, { color: colors.text }]}>Market Stats</Text>
              <Text style={[styles.toolDesc, { color: colors.subText }]}>Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              onPress={() => onNavigate("LearningHub")}
              activeOpacity={0.7}
            >
              <Text style={styles.toolIcon}>🎓</Text>
              <Text style={[styles.toolLabel, { color: colors.text }]}>Academy</Text>
              <Text style={[styles.toolDesc, { color: colors.subText }]}>Learning Hub</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Connections / Friends list */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>My Connections</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border, padding: 12 }]}>
          <View style={styles.friendsTabHeader}>
            <TouchableOpacity
              style={[styles.friendsTabBtn, friendsTab === "list" && styles.friendsTabActive]}
              onPress={() => setFriendsTab("list")}
            >
              <Text style={[styles.friendsTabBtnText, { color: friendsTab === "list" ? colors.primary : colors.subText }]}>
                Friends ({friends.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.friendsTabBtn, friendsTab === "requests" && styles.friendsTabActive]}
              onPress={() => setFriendsTab("requests")}
            >
              <Text style={[styles.friendsTabBtnText, { color: friendsTab === "requests" ? colors.primary : colors.subText }]}>
                Requests ({requests.length})
              </Text>
            </TouchableOpacity>
          </View>

          {friendsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : friendsTab === "list" ? (
            friends.length === 0 ? (
              <Text style={[styles.emptyFriendsText, { color: colors.subText }]}>
                No friends added yet. Browse the Traders Directory to connect!
              </Text>
            ) : (
              friends.map((friend) => (
                <View key={friend._id} style={[styles.friendItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.friendName, { color: colors.text }]}>{friend.fullName}</Text>
                    <Text style={[styles.friendUsername, { color: colors.subText }]}>@{friend.username}</Text>
                  </View>
                  <View style={styles.friendItemActions}>
                    <TouchableOpacity
                      style={[styles.friendBtn, { backgroundColor: colors.primary }]}
                      onPress={() => onStartPrivateChat && onStartPrivateChat(friend)}
                    >
                      <Text style={styles.friendBtnText}>Chat 💬</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.friendBtn, { backgroundColor: "rgba(239, 68, 68, 0.1)", borderWidth: 1, borderColor: colors.danger }]}
                      onPress={() => handleRemoveFriend(friend._id, friend.fullName)}
                    >
                      <Text style={[styles.friendBtnText, { color: colors.danger }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          ) : (
            requests.length === 0 ? (
              <Text style={[styles.emptyFriendsText, { color: colors.subText }]}>
                No pending incoming requests.
              </Text>
            ) : (
              requests.map((reqUser) => (
                <View key={reqUser._id} style={[styles.friendItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.friendName, { color: colors.text }]}>{reqUser.fullName}</Text>
                    <Text style={[styles.friendUsername, { color: colors.subText }]}>@{reqUser.username}</Text>
                  </View>
                  <View style={styles.friendItemActions}>
                    <TouchableOpacity
                      style={[styles.friendBtn, { backgroundColor: colors.success }]}
                      onPress={() => handleAcceptRequest(reqUser._id)}
                    >
                      <Text style={styles.friendBtnText}>Accept ✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.friendBtn, { backgroundColor: "rgba(239, 68, 68, 0.1)", borderWidth: 1, borderColor: colors.danger }]}
                      onPress={() => handleRejectRequest(reqUser._id)}
                    >
                      <Text style={[styles.friendBtnText, { color: colors.danger }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          )}
        </View>

        {/* Profile Settings form */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Account Settings</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Edit Profile ✏️</Text>
          <Text style={[styles.subtitle, { color: colors.subText }]}>Update your details</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
              placeholder="John Doe"
              placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              value={formData.fullName}
              onChangeText={(text) => handleChange("fullName", text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
              placeholder="johndoe"
              placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              autoCapitalize="none"
              autoCorrect={false}
              value={formData.username}
              onChangeText={(text) => handleChange("username", text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
              placeholder="john@example.com"
              placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={formData.email}
              onChangeText={(text) => handleChange("email", text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
              placeholder="+15550191"
              placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              value={formData.phoneNumber}
              onChangeText={(text) => handleChange("phoneNumber", text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
              placeholder="Tell other traders about your style..."
              placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              multiline
              numberOfLines={3}
              value={formData.bio}
              onChangeText={(text) => handleChange("bio", text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Change Password (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
              placeholder="Leave blank to keep current"
              placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={formData.password}
              onChangeText={(text) => handleChange("password", text)}
            />
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
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
            style={[styles.btnDanger, { borderColor: colors.danger }]}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.btnDangerText, { color: colors.danger }]}>Delete Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.border }]}
            onPress={onLogout}
          >
            <Text style={[styles.logoutBtnText, { color: colors.text }]}>Logout Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
    alignItems: "center",
  },
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  profileSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileAvatarText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 24,
  },
  profileSummaryInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
  },
  profileUsername: {
    fontSize: 13,
    marginBottom: 6,
  },
  profileBio: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    alignSelf: "flex-start",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  toolsGrid: {
    width: "100%",
    gap: 12,
    marginBottom: 20,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  toolCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  toolIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  toolDesc: {
    fontSize: 9,
    marginTop: 1,
  },
  friendsTabHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
    marginBottom: 10,
  },
  friendsTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  friendsTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366f1",
  },
  friendsTabBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyFriendsText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 18,
    lineHeight: 18,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  friendName: {
    fontSize: 13,
    fontWeight: "700",
  },
  friendUsername: {
    fontSize: 11,
    marginTop: 2,
  },
  friendItemActions: {
    flexDirection: "row",
    gap: 6,
  },
  friendBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  friendBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
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
  },
  successText: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    color: "#34d399",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 13,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 12,
    width: "100%",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  btnPrimary: {
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  btnDanger: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  btnDangerText: {
    fontWeight: "700",
    fontSize: 13,
  },
  logoutBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  logoutBtnText: {
    fontWeight: "700",
    fontSize: 13,
  },
});

export default Profile;
