import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from "react-native";
import API, { getSessionUser } from "../api";
import SoundManager from "../utils/SoundManager";

const GroupsList = ({ onLogout, onNavigate, onStartPrivateChat, theme, isDarkMode }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Search state
  const [searchName, setSearchName] = useState("");
  const [searchTopic, setSearchTopic] = useState("");
  const [searchPrivacy, setSearchPrivacy] = useState(""); // "" or "public" or "private"
  const [isSearching, setIsSearching] = useState(false);

  // Create group modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newPrivacy, setNewPrivacy] = useState("public");
  const [newDescription, setNewDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

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

  const fetchGroups = async () => {
    try {
      const response = await API.get("/groups");
      setGroups(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load trading groups.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setLoading(true);
    setError("");
    try {
      const response = await API.get("/groups/search", {
        params: {
          name: searchName.trim() || undefined,
          topic: searchTopic.trim() || undefined,
          privacy: searchPrivacy || undefined,
        },
      });
      setGroups(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to search groups.");
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleResetSearch = () => {
    setSearchName("");
    setSearchTopic("");
    setSearchPrivacy("");
    fetchGroups();
  };

  const handleCreateGroup = async () => {
    if (!newName.trim() || !newTopic.trim()) {
      Alert.alert("Validation Error", "Group name and topic are required.");
      return;
    }

    setCreateLoading(true);
    try {
      const response = await API.post("/groups", {
        name: newName.trim(),
        topic: newTopic.trim(),
        privacy: newPrivacy,
        description: newDescription.trim(),
      });

      Alert.alert("Success", `Group "${response.data.name}" created successfully!`);
      setCreateModalVisible(false);
      
      setNewName("");
      setNewTopic("");
      setNewPrivacy("public");
      setNewDescription("");
      
      fetchGroups();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to create group.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinLeaveGroup = async (group) => {
    const isMember = group.members.some((m) => m._id === currentUser._id || m === currentUser._id);
    
    if (isMember) {
      Alert.alert(
        "Leave Group",
        `Are you sure you want to leave "${group.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: async () => {
              try {
                const response = await API.post(`/groups/${group._id}/leave`);
                SoundManager.unlike(); // Left group sound
                Alert.alert("Success", response.data.message);
                fetchGroups();
              } catch (err) {
                SoundManager.error();
                Alert.alert("Error", err.response?.data?.message || "Failed to leave group.");
              }
            },
          },
        ]
      );
    } else {
      try {
        const response = await API.post(`/groups/${group._id}/join`);
        SoundManager.joinGroup(); // Joined group sound
        Alert.alert("Group Membership Update", response.data.message);
        fetchGroups();
      } catch (err) {
        SoundManager.error();
        Alert.alert("Error", err.response?.data?.message || "Failed to join group.");
      }
    }
  };

  const joinedGroups = groups.filter((g) =>
    g.members.some((m) => m._id === currentUser._id || m === currentUser._id)
  );
  const discoverGroups = groups.filter((g) =>
    !g.members.some((m) => m._id === currentUser._id || m === currentUser._id)
  );

  const renderGroupCard = (group, isJoinedGrid = false) => {
    const isMember = group.members.some(
      (m) => m._id === currentUser._id || m === currentUser._id
    );
    const isPending = group.pendingRequests.some(
      (r) => r._id === currentUser._id || r === currentUser._id
    );
    const isSiteAdmin = currentUser.role === "admin";

    return (
      <View key={group._id} style={[isJoinedGrid ? styles.joinedGroupCard : styles.groupCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.groupCardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
            <Text style={[styles.groupTopic, { color: colors.primary }]} numberOfLines={1}>Topic: {group.topic}</Text>
          </View>
          <View style={[styles.badge, group.privacy === "public" ? styles.badgePublic : styles.badgePrivate]}>
            <Text style={styles.badgeText}>{group.privacy.toUpperCase()}</Text>
          </View>
        </View>

        {!isJoinedGrid && (
          <Text style={[styles.groupDescription, { color: colors.subText }]} numberOfLines={2}>
            {group.description || "No description provided."}
          </Text>
        )}

        <View style={styles.groupFooter}>
          <Text style={[styles.membersCount, { color: colors.subText }]}>
            👥 {group.members ? group.members.length : 0} members
          </Text>
        </View>

        {/* Clickable Admin & Members List */}
        <View style={styles.memberListPreview}>
          <Text style={[styles.memberPreviewTitle, { color: colors.subText }]}>👑 Admin: </Text>
          {group.admin && (
            <TouchableOpacity
              onPress={() => {
                if (!group.admin || !group.admin._id) return;
                if (group.admin._id === currentUser._id) {
                  onNavigate && onNavigate("Profile");
                  return;
                }
                Alert.alert(
                  "Direct Message",
                  `Start a private chat with @${group.admin.username}?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Start Chat 💬",
                      onPress: () => onStartPrivateChat && onStartPrivateChat(group.admin),
                    },
                  ]
                );
              }}
            >
              <Text style={styles.adminMemberName}>@{group.admin.username || "admin"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isJoinedGrid && group.members && group.members.length > 0 && (
          <View style={styles.memberListPreview}>
            <Text style={[styles.memberPreviewTitle, { color: colors.subText }]}>👥 Members: </Text>
            <View style={styles.membersRow}>
              {group.members.slice(0, 4).map((member) => (
                <TouchableOpacity
                  key={member._id}
                  onPress={() => {
                    if (!member._id) return;
                    if (member._id === currentUser._id) {
                      onNavigate && onNavigate("Profile");
                      return;
                    }
                    Alert.alert(
                      "Direct Message",
                      `Start a private chat with @${member.username}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Start Chat 💬",
                          onPress: () => onStartPrivateChat && onStartPrivateChat(member),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.memberPreviewName}>@{member.username || "user"} </Text>
                </TouchableOpacity>
              ))}
              {group.members.length > 4 && (
                <Text style={[styles.moreMembersText, { color: colors.subText }]}>+{group.members.length - 4} more</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.groupActions}>
          {isSiteAdmin ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnView, { backgroundColor: colors.primary }]}
              onPress={() => onNavigate("GroupDetails", group._id)}
            >
              <Text style={styles.actionBtnViewText}>Enter Room (Admin) 🚪</Text>
            </TouchableOpacity>
          ) : isMember ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnView, { backgroundColor: colors.primary }]}
                onPress={() => onNavigate("GroupDetails", group._id)}
              >
                <Text style={styles.actionBtnViewText}>Enter 🚪</Text>
              </TouchableOpacity>
              {!isJoinedGrid && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnLeave, { borderColor: colors.danger }]}
                  onPress={() => handleJoinLeaveGroup(group)}
                >
                  <Text style={[styles.actionBtnLeaveText, { color: colors.danger }]}>Leave</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {isPending ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPending, { borderColor: colors.warning }]}
                  disabled={true}
                >
                  <Text style={[styles.actionBtnPendingText, { color: colors.warning }]}>Pending ⏳</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnJoin, { borderColor: colors.primary }]}
                  onPress={() => handleJoinLeaveGroup(group)}
                >
                  <Text style={[styles.actionBtnJoinText, { color: colors.primary }]}>
                    {group.privacy === "public" ? "Join ✓" : "Request 🔐"}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

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
        {/* Header Action */}
        <View style={styles.headerBtnRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📁 Trading Rooms</Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCreateModalVisible(true)}
          >
            <Text style={styles.createBtnText}>+ Create Group</Text>
          </TouchableOpacity>
        </View>

        {/* Search Accordion */}
        <View style={[styles.searchAccordionContent, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.searchFormRow}>
            <View style={[styles.searchFormGroup, { flex: 1.2 }]}>
              <Text style={[styles.searchFormLabel, { color: colors.subText }]}>Room Name</Text>
              <TextInput
                style={[styles.searchFormInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                placeholder="Search name..."
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                value={searchName}
                onChangeText={setSearchName}
              />
            </View>
            <View style={[styles.searchFormGroup, { flex: 1 }]}>
              <Text style={[styles.searchFormLabel, { color: colors.subText }]}>Topic</Text>
              <TextInput
                style={[styles.searchFormInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                placeholder="e.g. Crypto"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                value={searchTopic}
                onChangeText={setSearchTopic}
              />
            </View>
          </View>

          <View style={styles.searchFormRow}>
            <View style={[styles.searchFormGroup, { flex: 1.2 }]}>
              <Text style={[styles.searchFormLabel, { color: colors.subText }]}>Privacy Mode</Text>
              <View style={styles.radioRow}>
                <TouchableOpacity
                  style={[styles.radioBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, searchPrivacy === "" && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: colors.primary }]}
                  onPress={() => setSearchPrivacy("")}
                >
                  <Text style={[styles.radioText, { color: colors.subText }, searchPrivacy === "" && { color: colors.primary }]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, searchPrivacy === "public" && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: colors.primary }]}
                  onPress={() => setSearchPrivacy("public")}
                >
                  <Text style={[styles.radioText, { color: colors.subText }, searchPrivacy === "public" && { color: colors.primary }]}>Public</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, searchPrivacy === "private" && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: colors.primary }]}
                  onPress={() => setSearchPrivacy("private")}
                >
                  <Text style={[styles.radioText, { color: colors.subText }, searchPrivacy === "private" && { color: colors.primary }]}>Private</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchFormBtnRow}>
              <TouchableOpacity
                style={[styles.accordionBtn, styles.searchAccordionBtn, { backgroundColor: colors.primary }]}
                onPress={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.accordionBtnText}>Filter</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accordionBtn, styles.resetAccordionBtn, { borderColor: colors.border }]}
                onPress={handleResetSearch}
              >
                <Text style={[styles.resetBtnText, { color: colors.subText }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subText }]}>Fetching active rooms...</Text>
          </View>
        ) : null}

        {!loading && groups.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No trading rooms found 📁</Text>
            <Text style={[styles.emptySubtitle, { color: colors.subText }]}>
              Try adjusting your filter settings or create a brand new trading community!
            </Text>
          </View>
        ) : null}

        {/* Joined Groups Section */}
        {!loading && joinedGroups.length > 0 ? (
          <View style={styles.sectionDivider}>
            <Text style={[styles.sectionSubtitle, styles.css3TextShadow, { color: colors.text }]}>Joined Groups 📁</Text>
            <View style={styles.css3MultipleColumnsGrid}>
              {joinedGroups.map((group) => renderGroupCard(group, true))}
            </View>
          </View>
        ) : null}

        {/* Discover Groups Section */}
        {!loading && groups.length > 0 ? (
          <View style={styles.sectionDivider}>
            <Text style={[styles.sectionSubtitle, styles.css3TextShadow, { color: colors.text }]}>
              {currentUser.role === "admin" ? "All Active Rooms 🔍" : "Discover Rooms 🔍"}
            </Text>
            {currentUser.role === "admin" ? (
              groups.map((group) => renderGroupCard(group, false))
            ) : discoverGroups.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.emptySubtitle, { color: colors.subText }]}>You are currently a member of all existing trading rooms!</Text>
              </View>
            ) : (
              discoverGroups.map((group) => renderGroupCard(group, false))
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create a New Trading Room 📁</Text>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Room Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                placeholder="e.g. Crypto Bulls"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Topic / Category</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                placeholder="e.g. Cryptocurrencies, Stocks, Forex"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                value={newTopic}
                onChangeText={setNewTopic}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Privacy Type</Text>
              <View style={styles.radioRow}>
                <TouchableOpacity
                  style={[styles.radioBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, newPrivacy === "public" && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: colors.primary }]}
                  onPress={() => setNewPrivacy("public")}
                >
                  <Text style={[styles.radioText, { color: colors.subText }, newPrivacy === "public" && { color: colors.primary }]}>Public</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, newPrivacy === "private" && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: colors.primary }]}
                  onPress={() => setNewPrivacy("private")}
                >
                  <Text style={[styles.radioText, { color: colors.subText }, newPrivacy === "private" && { color: colors.primary }]}>Private (Requires Admin Invite)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                placeholder="Describe the purpose, strategies, or assets discussed in this room..."
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                multiline
                numberOfLines={3}
                value={newDescription}
                onChangeText={setNewDescription}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn, { backgroundColor: colors.primary }, createLoading && styles.btnDisabled]}
                onPress={handleCreateGroup}
                disabled={createLoading}
              >
                {createLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Create Room</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setCreateModalVisible(false)}
                disabled={createLoading}
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
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  createBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  searchAccordionContent: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
  },
  searchFormRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  searchFormGroup: {
    marginBottom: 0,
  },
  searchFormLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  searchFormInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  radioRow: {
    flexDirection: "row",
    gap: 6,
  },
  radioBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  radioText: {
    fontSize: 11,
    fontWeight: "600",
  },
  searchFormBtnRow: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  accordionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchAccordionBtn: {
    backgroundColor: "#6366f1",
  },
  resetAccordionBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  accordionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  resetBtnText: {
    fontWeight: "700",
    fontSize: 12,
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 10,
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 240,
  },
  sectionDivider: {
    marginBottom: 24,
    width: "100%",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  css3TextShadow: {
    textShadowColor: "rgba(99, 102, 241, 0.15)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  css3MultipleColumnsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  joinedGroupCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 2,
  },
  groupCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  groupCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  groupName: {
    fontSize: 15,
    fontWeight: "700",
  },
  groupTopic: {
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgePublic: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  badgePrivate: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#fff",
  },
  groupDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  groupFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    paddingTop: 8,
  },
  membersCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  memberListPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    flexWrap: "wrap",
  },
  memberPreviewTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  adminMemberName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fbbf24",
    textDecorationLine: "underline",
  },
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flex: 1,
  },
  memberPreviewName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6366f1",
    textDecorationLine: "underline",
    marginRight: 4,
  },
  moreMembersText: {
    fontSize: 10,
    fontStyle: "italic",
  },
  groupActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnView: {},
  actionBtnViewText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  actionBtnLeave: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  actionBtnLeaveText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionBtnPending: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  actionBtnPendingText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionBtnJoin: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  actionBtnJoinText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 15, 25, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalTextArea: {
    minHeight: 80,
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
    fontSize: 14,
  },
  modalCancelBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontWeight: "700",
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.7,
  },
});

export default GroupsList;
