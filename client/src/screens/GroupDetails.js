import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import API, { getSessionUser } from "../api";
import Navbar from "../components/Navbar";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import SoundManager from "../utils/SoundManager";

const GroupDetails = ({ groupId, onLogout, onNavigate, onStartPrivateChat, onShowUserModal, theme, isDarkMode }) => {
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
  };
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Edit group state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editPrivacy, setEditPrivacy] = useState("public");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Edit post state
  const [editingPost, setEditingPost] = useState(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostTags, setEditPostTags] = useState("");
  const [editPostLoading, setEditPostLoading] = useState(false);

  const currentUser = getSessionUser() || {};

  const fetchData = async () => {
    try {
      // 1. Fetch group details
      const groupRes = await API.get(`/groups/${groupId}`);
      setGroup(groupRes.data);
      
      // Initialize edit fields
      setEditName(groupRes.data.name);
      setEditTopic(groupRes.data.topic);
      setEditPrivacy(groupRes.data.privacy);
      setEditDescription(groupRes.data.description || "");

      // 2. Fetch posts and filter for this group
      const postsRes = await API.get("/posts");
      const filteredPosts = postsRes.data.filter(
        (p) => p.group && p.group._id === groupId
      );
      setPosts(filteredPosts);
      
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load group details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchData();
    }
  }, [groupId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePostCreated = (newPost) => {
    // Inject the group details to match card populated layout
    const formattedPost = {
      ...newPost,
      group: {
        _id: group._id,
        name: group.name,
        privacy: group.privacy,
        topic: group.topic,
      },
    };
    setPosts((prev) => [formattedPost, ...prev]);
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
  };

  const handleEditPress = (post) => {
    setEditingPost(post);
    setEditPostContent(post.content || "");
    setEditPostTags(post.tags ? post.tags.join(", ") : "");
  };

  const handleEditPostSubmit = async () => {
    if (!editPostContent.trim()) {
      Alert.alert("Error", "Post content cannot be empty.");
      return;
    }

    setEditPostLoading(true);
    try {
      const tagsArray = editPostTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");

      const response = await API.put(`/posts/${editingPost._id}`, {
        content: editPostContent.trim(),
        tags: tagsArray,
      });

      handlePostUpdated(response.data);
      Alert.alert("Success", "Post updated successfully!");
      setEditingPost(null);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update post.");
    } finally {
      setEditPostLoading(false);
    }
  };

  const handleApproveRequest = async (userId) => {
    try {
      const response = await API.post(`/groups/${groupId}/approve/${userId}`);
      Alert.alert("Request Approved", response.data.message);
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to approve request.");
    }
  };

  const handleRejectRequest = async (userId) => {
    try {
      const response = await API.post(`/groups/${groupId}/reject/${userId}`);
      Alert.alert("Request Rejected", response.data.message);
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to reject request.");
    }
  };

  const handleRemoveMember = async (member) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove @${member.username} from this group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove Member",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await API.post(`/groups/${groupId}/remove/${member._id}`);
              Alert.alert("Success", response.data.message || "Member removed successfully.");
              fetchData();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to remove member.");
            }
          },
        },
      ]
    );
  };

  const handlePromoteMember = async (member) => {
    try {
      const response = await API.post(`/groups/${groupId}/promote/${member._id}`);
      Alert.alert("Success", response.data.message || "Member promoted to Staff.");
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to promote member.");
    }
  };

  const handleDemoteMember = async (member) => {
    try {
      const response = await API.post(`/groups/${groupId}/demote/${member._id}`);
      Alert.alert("Success", response.data.message || "Member demoted to Listener.");
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to demote member.");
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Leave Group",
      "Are you sure you want to leave this trading room?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave Group",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await API.post(`/groups/${groupId}/leave`);
              Alert.alert("Success", response.data.message || "You have left the group.");
              onNavigate("GroupsList");
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to leave group.");
            }
          },
        },
      ]
    );
  };

  const handleUpdateGroup = async () => {
    if (!editName.trim() || !editTopic.trim()) {
      Alert.alert("Validation Error", "Group name and topic are required.");
      return;
    }

    setEditLoading(true);
    try {
      const response = await API.put(`/groups/${groupId}`, {
        name: editName.trim(),
        topic: editTopic.trim(),
        privacy: editPrivacy,
        description: editDescription.trim(),
      });
      setGroup(response.data);
      setIsEditing(false);
      Alert.alert("Success", "Group details updated successfully!");
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update group.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    Alert.alert(
      "Delete Group",
      "🚨 WARNING: This will permanently delete this group! This action CANNOT be undone. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Group",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/groups/${groupId}`);
              Alert.alert("Deleted", "Group deleted successfully.");
              onNavigate("GroupsList");
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to delete group.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subText }]}>Entering room...</Text>
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <Text style={styles.errorText}>{error || "Group details not found."}</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => onNavigate("GroupsList")}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>← Back to Groups</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAdmin = group.admin === currentUser._id || group.admin?._id === currentUser._id || currentUser.role === "admin";
  const isMember = group.members.some((m) => m._id === currentUser._id || m === currentUser._id) || currentUser.role === "admin";

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
        <TouchableOpacity style={styles.backLink} onPress={() => onNavigate("GroupsList")}>
          <Text style={[styles.backLinkText, { color: colors.primary }]}>← Active Rooms</Text>
        </TouchableOpacity>

        {/* Group Header Info */}
        <View style={[styles.groupHeaderCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.groupTitleName, { color: colors.text }]}>{group.name}</Text>
            <View style={[styles.badge, group.privacy === "public" ? styles.badgePublic : styles.badgePrivate]}>
              <Text style={styles.badgeText}>{group.privacy.toUpperCase()}</Text>
            </View>
          </View>
          
          <Text style={[styles.groupTopicText, { color: colors.primary }]}>Topic: #{group.topic}</Text>
          <Text style={[styles.groupDescText, { color: colors.subText }]}>{group.description || "No description provided."}</Text>

          {isMember && (
            <View style={{ gap: 8, marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.roomChatBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                onPress={() => onNavigate("GroupChat", group._id)}
              >
                <Text style={styles.roomChatBtnText}>💬 Room Chat</Text>
              </TouchableOpacity>
              
              {(group.creator?._id || group.creator) !== currentUser._id && (
                <TouchableOpacity
                  style={[styles.leaveGroupBtn, { borderColor: colors.danger, borderWidth: 1 }]}
                  onPress={handleLeaveGroup}
                >
                  <Text style={[styles.leaveGroupBtnText, { color: colors.danger }]}>🚪 Leave Group</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={[styles.membersRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.membersListLabel, { color: colors.text }]}>Members ({group.members.length}):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
              {group.members.map((m) => {
                const isTargetOwner =
                  (m._id || m).toString() === (group.admin?._id || group.admin || "").toString() ||
                  (m._id || m).toString() === (group.creator?._id || group.creator || "").toString();
                const isTargetStaff = group.staff && group.staff.some((s) => (s._id || s).toString() === (m._id || m).toString());
                const roleLabel = isTargetOwner ? "Owner 👑" : isTargetStaff ? "Staff 🎖️" : "Listener 👤";

                return (
                  <TouchableOpacity
                    key={m._id || m}
                    style={[styles.memberAvatar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={() => {
                      if (!m._id) return;
                      if (m._id === currentUser._id) {
                        onNavigate && onNavigate("Profile");
                        return;
                      }

                      const isTargetAdmin = m._id === (group.admin?._id || group.admin) || m._id === (group.creator?._id || group.creator);
                      
                      const groupCtx = isAdmin && !isTargetAdmin ? {
                        groupId: group._id,
                        isAdmin: true,
                        staff: group.staff,
                        onRefresh: fetchData
                      } : null;

                      onShowUserModal && onShowUserModal(m, groupCtx);
                    }}
                  >
                    <Text style={[styles.memberText, { color: colors.text }]}>
                      @{m.username} ({roleLabel})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Admin Management Section */}
          {isAdmin && (
            <View style={[styles.adminActionRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.adminBtn, styles.editAdminBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => setIsEditing(true)}
              >
                <Text style={[styles.adminBtnText, { color: colors.text }]}>✏️ Edit Room</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adminBtn, styles.deleteAdminBtn, { borderColor: colors.danger }]}
                onPress={handleDeleteGroup}
              >
                <Text style={[styles.adminBtnText, { color: colors.danger }]}>🗑️ Delete Room</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pending Requests Section (Admin Only) */}
        {isAdmin && group.privacy === "private" && group.pendingRequests && group.pendingRequests.length > 0 && (
          <View style={[styles.adminPanel, { backgroundColor: isDarkMode ? "rgba(245, 158, 11, 0.05)" : "rgba(245, 158, 11, 0.08)", borderColor: colors.warning }]}>
            <Text style={[styles.panelTitle, { color: colors.warning }]}>⏳ Pending Join Requests ({group.pendingRequests.length})</Text>
            {group.pendingRequests.map((reqUser) => (
              <View key={reqUser._id} style={[styles.requestCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.reqFullName, { color: colors.text }]}>{reqUser.fullName}</Text>
                  <Text style={[styles.reqUsername, { color: colors.subText }]}>@{reqUser.username}</Text>
                </View>
                <View style={styles.reqActionBtns}>
                  <TouchableOpacity
                    style={[styles.reqBtn, styles.reqApproveBtn]}
                    onPress={() => handleApproveRequest(reqUser._id)}
                  >
                    <Text style={styles.reqBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reqBtn, styles.reqRejectBtn]}
                    onPress={() => handleRejectRequest(reqUser._id)}
                  >
                    <Text style={styles.reqBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Group Feed Section */}
        {isMember ? (
          <View style={styles.feedSection}>
            <Text style={[styles.feedTitle, { color: colors.text }]}>💬 Room Discussion</Text>
            
            {/* Create Post or Listener Mode lock */}
            {(() => {
              const isTargetStaff = group.staff && group.staff.some((s) => (s._id || s) === currentUser._id);
              const isOwner = currentUser._id === (group.admin?._id || group.admin) || currentUser._id === (group.creator?._id || group.creator);
              const isSiteAdmin = currentUser.role === "admin";
              const canPost = isOwner || isTargetStaff || isSiteAdmin;

              return canPost ? (
                <CreatePost onPostCreated={handlePostCreated} groupId={group._id} theme={colors} isDarkMode={isDarkMode} />
              ) : (
                <View style={[styles.lockedSection, { backgroundColor: colors.inputBg, borderColor: colors.border, padding: 14, borderRadius: 12, marginBottom: 16 }]}>
                  <Text style={[styles.lockedTitle, { color: colors.subText, fontSize: 13, textAlign: "center", fontWeight: "700" }]}>
                    🔒 You are in listening mode. Only staff members can publish posts here.
                  </Text>
                </View>
              );
            })()}

            {posts.length === 0 ? (
              <View style={[styles.emptyFeed, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.emptyFeedText, { color: colors.text }]}>No posts in this room yet 🕯️</Text>
                <Text style={[styles.emptyFeedSubtext, { color: colors.subText }]}>Be the first to share your market analysis!</Text>
              </View>
            ) : null}

            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onPostUpdated={handlePostUpdated}
                onEditPress={handleEditPress}
                onPostDeleted={handlePostDeleted}
                onStartPrivateChat={onStartPrivateChat}
                onNavigate={onNavigate}
                onShowUserModal={onShowUserModal}
                theme={colors}
                isDarkMode={isDarkMode}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.lockedSection, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.lockedTitle, { color: colors.warning }]}>🔐 Private Discussion Locked</Text>
            <Text style={[styles.lockedSubtitle, { color: colors.subText }]}>
              Only approved members of this trading room can view or participate in discussions.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Group Modal (Admin Only) */}
      <Modal
        visible={isEditing}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDarkMode ? "rgba(11, 15, 25, 0.9)" : "rgba(15, 23, 42, 0.5)" }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Update Group Details ✏️</Text>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Group Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Topic/Category</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                value={editTopic}
                onChangeText={setEditTopic}
                placeholder="Topic"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Privacy Type</Text>
              <View style={styles.radioRow}>
                <TouchableOpacity
                  style={[
                    styles.radioBtn,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    editPrivacy === "public" && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: colors.primary }
                  ]}
                  onPress={() => setEditPrivacy("public")}
                >
                  <Text style={[styles.radioText, { color: colors.subText }, editPrivacy === "public" && { color: colors.primary }]}>Public</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioBtn,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    editPrivacy === "private" && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: colors.primary }
                  ]}
                  onPress={() => setEditPrivacy("private")}
                >
                  <Text style={[styles.radioText, { color: colors.subText }, editPrivacy === "private" && { color: colors.primary }]}>Private</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                multiline
                numberOfLines={3}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn, { backgroundColor: colors.primary }, editLoading && styles.btnDisabled]}
                onPress={handleUpdateGroup}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setIsEditing(false)}
                disabled={editLoading}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.subText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Post Modal Overlay */}
      <Modal
        visible={editingPost !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingPost(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDarkMode ? "rgba(11, 15, 25, 0.9)" : "rgba(15, 23, 42, 0.5)" }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Group Post ✏️</Text>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Post Content</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                multiline
                numberOfLines={4}
                value={editPostContent}
                onChangeText={setEditPostContent}
                placeholder="Post content"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Tags (comma-separated)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                value={editPostTags}
                onChangeText={setEditPostTags}
                placeholder="e.g. trading, stocks"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn, { backgroundColor: colors.primary }, editPostLoading && styles.btnDisabled]}
                onPress={handleEditPostSubmit}
                disabled={editPostLoading}
              >
                {editPostLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setEditingPost(null)}
                disabled={editPostLoading}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.subText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingText: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 10,
  },
  backBtn: {
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 15,
  },
  backBtnText: {
    color: "#f3f4f6",
    fontWeight: "700",
    fontSize: 13,
  },
  backLink: {
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  backLinkText: {
    fontSize: 13,
    color: "#6366f1",
    fontWeight: "700",
  },
  groupHeaderCard: {
    backgroundColor: "#151c2c",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupTitleName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f3f4f6",
    flex: 1,
    marginRight: 10,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgePublic: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  badgePrivate: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
  groupTopicText: {
    color: "#6366f1",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 8,
  },
  groupDescText: {
    fontSize: 13,
    color: "#9ca3af",
    lineHeight: 18,
    marginBottom: 14,
  },
  membersRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: 12,
  },
  membersListLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f3f4f6",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  membersScroll: {
    flexDirection: "row",
  },
  memberAvatar: {
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  memberText: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
  },
  adminActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: 12,
  },
  adminBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  editAdminBtn: {
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  deleteAdminBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  adminBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  adminPanel: {
    backgroundColor: "rgba(245, 158, 11, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fbbf24",
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: "#151c2c",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reqFullName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f3f4f6",
  },
  reqUsername: {
    fontSize: 10,
    color: "#9ca3af",
  },
  reqActionBtns: {
    flexDirection: "row",
    gap: 6,
  },
  reqBtn: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  reqApproveBtn: {
    backgroundColor: "#10b981",
  },
  reqRejectBtn: {
    backgroundColor: "#ef4444",
  },
  reqBtnText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  feedSection: {
    marginTop: 10,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f3f4f6",
    marginBottom: 14,
  },
  emptyFeed: {
    backgroundColor: "rgba(21, 28, 44, 0.5)",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    marginTop: 10,
  },
  emptyFeedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f3f4f6",
    marginBottom: 4,
  },
  emptyFeedSubtext: {
    fontSize: 11,
    color: "#9ca3af",
  },
  lockedSection: {
    backgroundColor: "rgba(21, 28, 44, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    marginTop: 30,
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fbbf24",
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 240,
  },
  errorText: {
    color: "#fb7185",
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 15, 25, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#151c2c",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f3f4f6",
    textAlign: "center",
    marginBottom: 16,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f3f4f6",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#f3f4f6",
    fontSize: 13,
  },
  modalTextArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveBtn: {
    backgroundColor: "#6366f1",
  },
  modalSaveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  modalCancelBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  modalCancelBtnText: {
    color: "#9ca3af",
    fontWeight: "700",
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  radioRow: {
    flexDirection: "row",
    gap: 6,
  },
  radioBtn: {
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  radioActive: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderColor: "#6366f1",
  },
  radioText: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
  },
  radioActiveText: {
    color: "#6366f1",
  },
  roomChatBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  roomChatBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  leaveGroupBtn: {
    width: "100%",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  leaveGroupBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

export default GroupDetails;
