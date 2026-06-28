import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import API from "../api";
import PostCard from "../components/PostCard";
import SoundManager from "../utils/SoundManager";

const UserProfile = ({
  userId,
  onLogout,
  onNavigate,
  onStartPrivateChat,
  onShowUserModal, // callback to open the custom user action popup
  theme,
  isDarkMode,
}) => {
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [status, setStatus] = useState("none"); // 'friends' | 'incoming' | 'outgoing' | 'none'
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProfileData = async () => {
    if (!userId) return;
    try {
      // 1. Fetch user by ID
      const userRes = await API.get(`/users/${userId}`);
      const userData = userRes.data;
      setProfileUser(userData);

      // 2. Fetch connection relations to check friendship status
      const friendsRes = await API.get("/users/friends/list");
      const isFriend = friendsRes.data.some((f) => f._id === userId);

      if (isFriend) {
        setStatus("friends");
      } else {
        const requestsRes = await API.get("/users/friends/requests");
        const isIncoming = requestsRes.data.some((r) => r._id === userId);
        
        if (isIncoming) {
          setStatus("incoming");
        } else if (userData.isOutgoingRequest) {
          setStatus("outgoing");
        } else {
          setStatus("none");
        }
      }

      // 3. Fetch user's friends list (if visible/available)
      // Since backend getUserById returns sanitised user, let's look for their populated friends or call list if needed
      // Currently the system populates user.friends with ID array on DB, but let's query if there is friends array
      // Wait, getUserById returns userObj which has 'friends' array (of IDs or populated objects depending on schema)
      // Since getUserById does not populate friends, let's load all users and filter, or fetch from friend lists if we can.
      // Wait! We can retrieve all users and see which ones have this user in their friends list or just check if user.friends contains them
      // Better yet, let's fetch all users, and those who have this user's ID in their friends list, or check if we can populate it.
      // Actually, if we look at the User model, friends is an array of object IDs.
      // To get their friends, let's query all users and check who is friends with them, or check if they have populated friends.
      // Let's call API.get("/users") which fetches all users, and then filter those who are in profileUser.friends!
      const allUsersRes = await API.get("/users");
      const friendsList = allUsersRes.data.filter((u) => 
        userData.friends && userData.friends.includes(u._id)
      );
      setFriends(friendsList);

      // 4. Fetch user's posts
      const postsRes = await API.get("/posts/search", {
        params: { username: userData.username },
      });
      setPosts(postsRes.data);

      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      setLoading(true);
      fetchProfileData();
    }
  }, [userId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      const response = await API.post(`/users/friends/request/${userId}`);
      SoundManager.sendMessage();
      Alert.alert("Success", response.data.message || "Connection request sent!");
      fetchProfileData();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to send request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setActionLoading(true);
    try {
      await API.post(`/users/friends/cancel/${userId}`);
      SoundManager.unlike();
      Alert.alert("Success", "Connection request cancelled.");
      fetchProfileData();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to cancel request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    setActionLoading(true);
    try {
      await API.post(`/users/friends/accept/${userId}`);
      SoundManager.profitTarget();
      Alert.alert("Success", "Connection request accepted!");
      fetchProfileData();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to accept request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    setActionLoading(true);
    try {
      await API.post(`/users/friends/reject/${userId}`);
      SoundManager.unlike();
      Alert.alert("Success", "Connection request rejected.");
      fetchProfileData();
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Failed to reject request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    Alert.alert(
      "Remove Connection",
      `Are you sure you want to disconnect with @${profileUser.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await API.delete(`/users/friends/remove/${userId}`);
              SoundManager.unlike();
              Alert.alert("Success", "Connection removed.");
              fetchProfileData();
            } catch (err) {
              SoundManager.error();
              Alert.alert("Error", err.response?.data?.message || "Failed to remove friend.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subText }]}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !profileUser) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>{error || "User profile not found."}</Text>
        <TouchableOpacity
          style={[styles.backLink, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={() => onNavigate("Feed")}
        >
          <Text style={{ color: colors.text }}>← Back to Feed</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Back Link */}
        <TouchableOpacity style={styles.backLinkHeader} onPress={() => onNavigate("Feed")}>
          <Text style={[styles.backLinkHeaderText, { color: colors.primary }]}>← Trading Feed</Text>
        </TouchableOpacity>

        {/* User Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.profileAvatarText}>
                {profileUser.fullName?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={[styles.profileName, { color: colors.text }]}>{profileUser.fullName}</Text>
              <Text style={[styles.profileUsername, { color: colors.subText }]}>@{profileUser.username}</Text>
              <View style={[styles.roleTag, profileUser.role === "admin" ? styles.adminRoleTag : { borderColor: colors.primary }]}>
                <Text style={[styles.roleTagText, { color: profileUser.role === "admin" ? colors.accent : colors.primary }]}>
                  {profileUser.role?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {profileUser.bio ? (
            <Text style={[styles.profileBio, { color: colors.text }]}>{profileUser.bio}</Text>
          ) : null}

          {/* Connection Actions in Profile Page */}
          <View style={styles.connectionActions}>
            {actionLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: "center", marginVertical: 10 }} />
            ) : status === "friends" ? (
              <View style={styles.btnRow}>
                <View style={[styles.statusBadge, { borderColor: colors.success, backgroundColor: "rgba(16, 185, 129, 0.05)" }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.success }]}>Connected 🤝</Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.removeBtn, { borderColor: colors.danger }]}
                  onPress={handleRemoveFriend}
                >
                  <Text style={[styles.actionBtnText, { color: colors.danger }]}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : status === "incoming" ? (
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.success, flex: 1.2 }]}
                  onPress={handleAcceptRequest}
                >
                  <Text style={[styles.actionBtnText, { color: "#fff" }]}>Accept ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.removeBtn, { borderColor: colors.danger, flex: 1 }]}
                  onPress={handleRejectRequest}
                >
                  <Text style={[styles.actionBtnText, { color: colors.danger }]}>Reject</Text>
                </TouchableOpacity>
              </View>
            ) : status === "outgoing" ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.pendingBtn, { borderColor: colors.warning, backgroundColor: "rgba(245, 158, 11, 0.05)" }]}
                onPress={handleCancelRequest}
              >
                <Text style={[styles.actionBtnText, { color: colors.warning }]}>Pending ⏳ (Cancel Request)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddFriend}
              >
                <Text style={[styles.actionBtnText, { color: "#fff" }]}>Connect ➕</Text>
              </TouchableOpacity>
            )}

            {/* Direct Message Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.messageBtn, { borderColor: colors.border }]}
              onPress={() => onStartPrivateChat && onStartPrivateChat(profileUser)}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Send Private Message 💬</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Friends Grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Connections ({friends.length})</Text>
        <View style={[styles.friendsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {friends.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subText }]}>No active connections public on this profile.</Text>
          ) : (
            <View style={styles.friendsGrid}>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend._id}
                  style={[styles.friendGridItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  onPress={() => onShowUserModal && onShowUserModal(friend)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.friendAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.friendAvatarText}>
                      {friend.fullName?.charAt(0).toUpperCase() || "F"}
                    </Text>
                  </View>
                  <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
                    {friend.fullName}
                  </Text>
                  <Text style={[styles.friendUsername, { color: colors.subText }]} numberOfLines={1}>
                    @{friend.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* User's Analyses Feed */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Analyses Published</Text>
        <View style={styles.feedContainer}>
          {posts.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No active analyses shared 📉</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subText }]}>
                Posts published by @{profileUser.username} that you are authorized to see will show up here.
              </Text>
            </View>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onPostUpdated={handlePostUpdated}
                onEditPress={() => {}}
                onPostDeleted={handlePostDeleted}
                onStartPrivateChat={onStartPrivateChat}
                onNavigate={onNavigate}
                theme={colors}
                isDarkMode={isDarkMode}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  backLink: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  backLinkHeader: {
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  backLinkHeaderText: {
    fontSize: 13,
    fontWeight: "700",
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileAvatarText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 26,
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "800",
  },
  profileUsername: {
    fontSize: 12,
    marginBottom: 6,
  },
  roleTag: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  adminRoleTag: {
    borderColor: "#ec4899",
  },
  roleTagText: {
    fontSize: 8,
    fontWeight: "800",
  },
  profileBio: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  connectionActions: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    paddingTop: 14,
    gap: 8,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  statusBadge: {
    flex: 1.2,
    borderWidth: 1.5,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  removeBtn: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  pendingBtn: {
    borderWidth: 1.5,
    width: "100%",
  },
  messageBtn: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
    width: "100%",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  friendsCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 10,
  },
  friendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  friendGridItem: {
    width: "31%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  friendAvatarText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  friendName: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
  },
  friendUsername: {
    fontSize: 9,
    textAlign: "center",
    width: "100%",
  },
  feedContainer: {
    gap: 10,
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 240,
  },
});

export default UserProfile;
