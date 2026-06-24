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
} from "react-native";
import API, { getSessionUser } from "../api";
import SoundManager from "../utils/SoundManager";

const UsersList = ({ onLogout, onNavigate, onStartPrivateChat, theme, isDarkMode }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUser = getSessionUser() || {};

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
    warning: "#f59e0b",
    danger: "#ef4444",
  };

  // Friends status checking
  const [myFriendIds, setMyFriendIds] = useState([]);
  const [myIncomingRequestIds, setMyIncomingRequestIds] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchRelations = async () => {
    try {
      const friendsRes = await API.get("/users/friends/list");
      setMyFriendIds(friendsRes.data.map((f) => f._id));
      const requestsRes = await API.get("/users/friends/requests");
      setMyIncomingRequestIds(requestsRes.data.map((r) => r._id));
    } catch (err) {
      console.error("Failed to load user relations", err);
    }
  };

  const handleDeleteUser = (userToDelete) => {
    Alert.alert(
      "Delete User 🗑️",
      `Are you sure you want to permanently delete user @${userToDelete.username} and all of their posts, groups, and logs? This action is irreversible.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete User",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/users/${userToDelete._id}`);
              Alert.alert("Deleted", "User deleted successfully.");
              fetchUsers();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to delete user.");
            }
          },
        },
      ]
    );
  };

  // Search parameters
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState(""); // "" | "user" | "admin"

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("/users/search", {
        params: {
          username: username.trim(),
          fullName: fullName.trim(),
          role: role || undefined,
        },
      });
      setUsers(response.data);
    } catch (err) {
      setError("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRelations();
  }, [role]);

  const handleSearchSubmit = () => {
    fetchUsers();
    fetchRelations();
  };

  const handleAddFriend = async (userId) => {
    setActionLoadingId(userId);
    try {
      const response = await API.post(`/users/friends/request/${userId}`);
      SoundManager.sendMessage(); // Outbound sound
      Alert.alert("Success", response.data.message || "Friend request sent!");
      fetchUsers();
      fetchRelations();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to send friend request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelFriendRequest = async (userId) => {
    setActionLoadingId(userId);
    try {
      await API.post(`/users/friends/cancel/${userId}`);
      SoundManager.unlike(); // Muted descending sound
      Alert.alert("Success", "Friend request cancelled!");
      fetchUsers();
      fetchRelations();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to cancel request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptFriend = async (userId) => {
    setActionLoadingId(userId);
    try {
      await API.post(`/users/friends/accept/${userId}`);
      SoundManager.profitTarget(); // Ascending celebratory chord
      Alert.alert("Success", "Friend request accepted!");
      fetchUsers();
      fetchRelations();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to accept friend request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Search Panel */}
        <View style={[styles.searchPanel, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Search Directory 👥</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
              placeholder="Username"
              placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
              placeholder="Full Name"
              placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Role selector row */}
          <Text style={[styles.roleLabel, { color: colors.subText }]}>Filter by Role:</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, role === "" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setRole("")}
            >
              <Text style={[styles.roleBtnText, role === "" && { color: "#ffffff" }]}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, role === "user" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setRole("user")}
            >
              <Text style={[styles.roleBtnText, role === "user" && { color: "#ffffff" }]}>User</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, role === "admin" && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setRole("admin")}
            >
              <Text style={[styles.roleBtnText, role === "admin" && { color: "#ffffff" }]}>Admin</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]} onPress={handleSearchSubmit}>
            <Text style={styles.searchBtnText}>Search Users</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Loading Spinner */}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderText, { color: colors.subText }]}>Searching traders...</Text>
          </View>
        ) : null}

        {/* Empty State */}
        {!loading && users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.subText }]}>No users matched your search criteria 🔍</Text>
          </View>
        ) : null}

        {/* User Card Stream */}
        {!loading && users.length > 0 ? (
          <View style={styles.usersList}>
            {users.map((user) => {
              const isSelf = user._id === currentUser._id;
              const isFriend = myFriendIds.includes(user._id);
              const isIncomingRequest = myIncomingRequestIds.includes(user._id);
              const isOutgoingRequest = user.friendRequests && user.friendRequests.includes(currentUser._id);

              return (
                <View key={user._id} style={[styles.userCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={styles.userHeader}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                      onPress={() => {
                        if (isSelf) return;
                        Alert.alert(
                          "Direct Message",
                          `Start a private chat with @${user.username}?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Start Chat 💬",
                              onPress: () => onStartPrivateChat && onStartPrivateChat(user),
                            },
                          ]
                        );
                      }}
                      disabled={isSelf}
                    >
                      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.avatarText}>
                          {user.fullName?.charAt(0).toUpperCase() || "U"}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.fullName, { color: colors.text }]}>{user.fullName}</Text>
                          <View style={[styles.roleTag, user.role === "admin" && styles.roleTagAdmin]}>
                            <Text style={[styles.roleTagText, user.role === "admin" && styles.roleTagTextAdmin]}>
                              {user.role}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.username, { color: colors.subText }]}>@{user.username}</Text>
                        {user.bio ? <Text style={[styles.bio, { color: colors.text }]}>{user.bio}</Text> : null}
                      </View>
                    </TouchableOpacity>

                    {/* Friend Relationship Action Button */}
                    {!isSelf && (
                      <View style={styles.relationContainer}>
                        {actionLoadingId === user._id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : isFriend ? (
                          <View style={[styles.statusBadge, { backgroundColor: "rgba(16, 185, 129, 0.1)", borderColor: colors.success }]}>
                            <Text style={[styles.statusBadgeText, { color: colors.success }]}>Friends ✓</Text>
                          </View>
                        ) : isIncomingRequest ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.success }]}
                            onPress={() => handleAcceptFriend(user._id)}
                          >
                            <Text style={styles.actionBtnText}>Accept 📥</Text>
                          </TouchableOpacity>
                        ) : isOutgoingRequest ? (
                          <TouchableOpacity
                            style={[styles.statusBadge, { backgroundColor: "rgba(245, 158, 11, 0.1)", borderColor: colors.warning }]}
                            onPress={() => handleCancelFriendRequest(user._id)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.statusBadgeText, { color: colors.warning }]}>Pending ⏳</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleAddFriend(user._id)}
                          >
                            <Text style={styles.actionBtnText}>Connect ➕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Admin Delete Action */}
                    {currentUser.role === "admin" && !isSelf && (
                      <TouchableOpacity
                        style={styles.deleteUserBtn}
                        onPress={() => handleDeleteUser(user)}
                      >
                        <Text style={styles.deleteUserBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  searchPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  halfInput: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "600",
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  roleBtnText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  searchBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  errorText: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    color: "#fb7185",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: "center",
  },
  loader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loaderText: {
    fontSize: 14,
    marginTop: 10,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
    marginRight: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullName: {
    fontSize: 14,
    fontWeight: "700",
  },
  roleTag: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleTagAdmin: {
    backgroundColor: "rgba(236, 72, 153, 0.1)",
    borderColor: "rgba(236, 72, 153, 0.2)",
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366f1",
    textTransform: "uppercase",
  },
  roleTagTextAdmin: {
    color: "#ec4899",
  },
  username: {
    fontSize: 11,
    marginTop: 2,
  },
  bio: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  relationContainer: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  actionBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  deleteUserBtn: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.2)",
    borderRadius: 10,
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  deleteUserBtnText: {
    fontSize: 14,
  },
});

export default UsersList;
