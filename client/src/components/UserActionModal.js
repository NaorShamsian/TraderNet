import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import API from "../api";
import SoundManager from "../utils/SoundManager";

const UserActionModal = ({
  visible,
  user,
  onClose,
  onStartPrivateChat,
  onNavigate,
  currentUser,
  colors,
  isDarkMode,
  groupContext, // optional: { groupId, isAdmin, staff: [] }
  onGroupRefresh, // callback to refresh group details if admin actions are taken
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("none"); // 'friends' | 'incoming' | 'outgoing' | 'none'
  const [targetUser, setTargetUser] = useState(null);

  const fetchRelationship = async () => {
    if (!user || !user._id) return;
    setLoading(true);
    try {
      // 1. Fetch relations list
      const friendsRes = await API.get("/users/friends/list");
      const isFriend = friendsRes.data.some((f) => f._id === user._id);

      if (isFriend) {
        setStatus("friends");
      } else {
        const requestsRes = await API.get("/users/friends/requests");
        const isIncoming = requestsRes.data.some((r) => r._id === user._id);
        
        if (isIncoming) {
          setStatus("incoming");
        } else {
          // Fetch target user to check if current user is in their incoming requests (outgoing for us)
          const userRes = await API.get(`/users/${user._id}`);
          setTargetUser(userRes.data);
          if (userRes.data.isOutgoingRequest) {
            setStatus("outgoing");
          } else {
            setStatus("none");
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user relations in modal", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && user) {
      setTargetUser(user);
      fetchRelationship();
    }
  }, [visible, user]);

  if (!visible || !user) return null;

  const handleAddFriend = async () => {
    setLoading(true);
    try {
      const response = await API.post(`/users/friends/request/${user._id}`);
      SoundManager.sendMessage();
      Alert.alert("Success", response.data.message || "Connection request sent!");
      fetchRelationship();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to send request.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setLoading(true);
    try {
      await API.post(`/users/friends/cancel/${user._id}`);
      SoundManager.unlike();
      Alert.alert("Success", "Connection request cancelled.");
      fetchRelationship();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to cancel request.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    setLoading(true);
    try {
      await API.post(`/users/friends/accept/${user._id}`);
      SoundManager.profitTarget();
      Alert.alert("Success", "Connection request accepted!");
      fetchRelationship();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to accept request.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    setLoading(true);
    try {
      await API.post(`/users/friends/reject/${user._id}`);
      SoundManager.unlike();
      Alert.alert("Success", "Connection request rejected.");
      fetchRelationship();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to reject request.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    Alert.alert(
      "Remove Connection",
      `Are you sure you want to disconnect with @${user.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await API.delete(`/users/friends/remove/${user._id}`);
              SoundManager.unlike();
              Alert.alert("Success", "Connection removed.");
              fetchRelationship();
            } catch (err) {
              SoundManager.error();
              Alert.alert("Error", err.response?.data?.message || "Failed to remove friend.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Group Admin actions
  const isGroupAdmin = groupContext && groupContext.isAdmin;
  const isTargetGroupStaff =
    groupContext &&
    groupContext.staff &&
    groupContext.staff.some((s) => (s._id || s).toString() === (user._id || user).toString());

  const handlePromoteGroup = async () => {
    setLoading(true);
    try {
      const res = await API.post(`/groups/${groupContext.groupId}/promote/${user._id}`);
      Alert.alert("Success", res.data.message || "Member promoted to Staff.");
      onGroupRefresh && onGroupRefresh();
      onClose();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to promote member.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteGroup = async () => {
    setLoading(true);
    try {
      const res = await API.post(`/groups/${groupContext.groupId}/demote/${user._id}`);
      Alert.alert("Success", res.data.message || "Member demoted to Listener.");
      onGroupRefresh && onGroupRefresh();
      onClose();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to demote member.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGroup = async () => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove @${user.username} from this group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const res = await API.post(`/groups/${groupContext.groupId}/remove/${user._id}`);
              Alert.alert("Success", res.data.message || "Member removed from group.");
              onGroupRefresh && onGroupRefresh();
              onClose();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to remove member.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          activeOpacity={1}
          onPress={() => {}}
        >
          {/* Avatar and Info Header */}
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user.fullName?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <Text style={[styles.fullName, { color: colors.text }]}>{user.fullName}</Text>
            <Text style={[styles.username, { color: colors.subText }]}>@{user.username}</Text>
            <View style={[styles.roleBadge, user.role === "admin" ? styles.adminBadge : { borderColor: colors.primary }]}>
              <Text style={[styles.roleBadgeText, { color: user.role === "admin" ? colors.accent : colors.primary }]}>
                {user.role?.toUpperCase()}
              </Text>
            </View>
            {targetUser?.bio ? (
              <Text style={[styles.bio, { color: colors.text }]} numberOfLines={3}>
                {targetUser.bio}
              </Text>
            ) : null}
          </View>

          {/* Action List Section */}
          <View style={styles.actionsList}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.subText }]}>Syncing...</Text>
              </View>
            ) : (
              <>
                {/* Connection Action */}
                {status === "friends" ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.connectedBtn]}
                    onPress={handleRemoveFriend}
                  >
                    <Text style={styles.connectedBtnText}>Friends ✓ (Click to Disconnect)</Text>
                  </TouchableOpacity>
                ) : status === "incoming" ? (
                  <View style={styles.rowButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptBtn, { backgroundColor: colors.success }]}
                      onPress={handleAcceptRequest}
                    >
                      <Text style={styles.actionButtonText}>Accept ✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectBtn, { borderColor: colors.danger }]}
                      onPress={handleRejectRequest}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.danger }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                ) : status === "outgoing" ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.pendingBtn, { borderColor: colors.warning }]}
                    onPress={handleCancelRequest}
                  >
                    <Text style={[styles.pendingBtnText, { color: colors.warning }]}>Cancel Request ⏳</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddFriend}
                  >
                    <Text style={styles.actionButtonText}>Connect ➕</Text>
                  </TouchableOpacity>
                )}

                {/* Send Message */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={() => {
                    onClose();
                    onStartPrivateChat && onStartPrivateChat(user);
                  }}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Send Message 💬</Text>
                </TouchableOpacity>

                {/* View Profile */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={() => {
                    onClose();
                    onNavigate && onNavigate("UserProfile", user._id);
                  }}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>View Full Profile 👤</Text>
                </TouchableOpacity>

                {/* Group Administration Panel */}
                {isGroupAdmin && (
                  <View style={[styles.adminPanel, { borderColor: colors.border }]}>
                    <Text style={[styles.adminLabel, { color: colors.subText }]}>Group Admin Controls</Text>
                    <View style={styles.rowButtons}>
                      <TouchableOpacity
                        style={[styles.adminActionButton, { backgroundColor: colors.inputBg }]}
                        onPress={isTargetGroupStaff ? handleDemoteGroup : handlePromoteGroup}
                      >
                        <Text style={[styles.adminActionButtonText, { color: colors.text }]}>
                          {isTargetGroupStaff ? "Demote to Listener 👤" : "Promote to Staff 🎖️"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.adminActionButton, { backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: colors.danger, borderWidth: 1 }]}
                        onPress={handleRemoveGroup}
                      >
                        <Text style={[styles.adminActionButtonText, { color: colors.danger }]}>Kick Member ❌</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Cancel/Dismiss Action */}
            <TouchableOpacity
              style={[styles.actionButton, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(11, 15, 25, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 32,
  },
  fullName: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  username: {
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
    marginBottom: 8,
  },
  roleBadge: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 12,
  },
  adminBadge: {
    borderColor: "#ec4899",
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bio: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  actionsList: {
    gap: 10,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  actionButton: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  connectedBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1.5,
    borderColor: "#10b981",
  },
  connectedBtnText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "700",
  },
  pendingBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1.5,
  },
  pendingBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rowButtons: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  acceptBtn: {
    flex: 1.2,
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  closeButton: {
    backgroundColor: "transparent",
    marginTop: 6,
  },
  closeButtonText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  adminPanel: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 12,
    gap: 8,
  },
  adminLabel: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  adminActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  adminActionButtonText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
});

export default UserActionModal;
