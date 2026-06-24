import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import API, { getSessionUser } from "../api";
import PostCard from "../components/PostCard";
import SoundManager from "../utils/SoundManager";

const Search = ({ onLogout, onNavigate, onStartPrivateChat, theme, isDarkMode }) => {
  const [searchTab, setSearchTab] = useState("posts"); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Post search parameters (5 filters)
  const [postKeyword, setPostKeyword] = useState("");
  const [postTag, setPostTag] = useState("");
  const [postAuthor, setPostAuthor] = useState("");
  const [postFromDate, setPostFromDate] = useState("");
  const [postToDate, setPostToDate] = useState("");
  const [postResults, setPostResults] = useState([]);

  // Group search parameters (4 filters)
  const [groupName, setGroupName] = useState("");
  const [groupTopic, setGroupTopic] = useState("");
  const [groupPrivacy, setGroupPrivacy] = useState(""); 
  const [groupMinMembers, setGroupMinMembers] = useState("");
  const [groupResults, setGroupResults] = useState([]);

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

  const handlePostSearch = async () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (postFromDate.trim() && !dateRegex.test(postFromDate.trim())) {
      Alert.alert("Format Error", "From Date must match YYYY-MM-DD format.");
      return;
    }
    if (postToDate.trim() && !dateRegex.test(postToDate.trim())) {
      Alert.alert("Format Error", "To Date must match YYYY-MM-DD format.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await API.get("/posts/search", {
        params: {
          content: postKeyword.trim() || undefined,
          tag: postTag.trim() || undefined,
          username: postAuthor.trim() || undefined,
          fromDate: postFromDate.trim() || undefined,
          toDate: postToDate.trim() || undefined,
        },
      });
      setPostResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to search posts.");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSearch = async () => {
    if (groupMinMembers.trim()) {
      const minCount = parseInt(groupMinMembers.trim(), 10);
      if (isNaN(minCount) || minCount < 0) {
        Alert.alert("Validation Error", "Minimum members count must be a non-negative integer.");
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      const response = await API.get("/groups/search", {
        params: {
          name: groupName.trim() || undefined,
          topic: groupTopic.trim() || undefined,
          privacy: groupPrivacy || undefined,
          minMembers: groupMinMembers.trim() || undefined,
        },
      });
      setGroupResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to search groups.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeaveGroup = async (group) => {
    const isMember = group.members.some((m) => m._id === currentUser._id || m === currentUser._id);
    try {
      if (isMember) {
        const response = await API.post(`/groups/${group._id}/leave`);
        SoundManager.unlike(); // Left group sound
        Alert.alert("Success", response.data.message);
      } else {
        const response = await API.post(`/groups/${group._id}/join`);
        SoundManager.joinGroup(); // Joined group sound
        Alert.alert("Success", response.data.message);
      }
      handleGroupSearch(); 
    } catch (err) {
      SoundManager.error();
      Alert.alert("Error", err.response?.data?.message || "Action failed.");
    }
  };

  const handlePostUpdated = (updatedPost) => {
    setPostResults((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  const handlePostDeleted = (deletedPostId) => {
    setPostResults((prev) => prev.filter((p) => p._id !== deletedPostId));
  };

  const handleResetFilters = () => {
    if (searchTab === "posts") {
      setPostKeyword("");
      setPostTag("");
      setPostAuthor("");
      setPostFromDate("");
      setPostToDate("");
      setPostResults([]);
    } else {
      setGroupName("");
      setGroupTopic("");
      setGroupPrivacy("");
      setGroupMinMembers("");
      setGroupResults([]);
    }
    setError("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🔍 Advanced Analysis Center</Text>

        {/* Tab Selection */}
        <View style={[styles.segmentContainer, { backgroundColor: isDarkMode ? "rgba(21, 28, 44, 0.6)" : "#f1f5f9", borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, searchTab === "posts" && { backgroundColor: colors.primary }]}
            onPress={() => setSearchTab("posts")}
          >
            <Text style={[styles.segmentText, searchTab === "posts" && { color: "#ffffff" }]}>
              💬 Search Analyses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, searchTab === "groups" && { backgroundColor: colors.primary }]}
            onPress={() => setSearchTab("groups")}
          >
            <Text style={[styles.segmentText, searchTab === "groups" && { color: "#ffffff" }]}>
              📁 Search Rooms
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Container */}
        <View style={[styles.formContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {searchTab === "posts" ? (
            // POST SEARCH FORM
            <View>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.subText }]}>Keyword / Content</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                  placeholder="e.g. Breakout, Bullish, TSLA"
                  placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                  value={postKeyword}
                  onChangeText={setPostKeyword}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.subText }]}>Tag / Category</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="e.g. BTC"
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                    value={postTag}
                    onChangeText={setPostTag}
                    autoCapitalize="none"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.subText }]}>Author Username</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="e.g. alex_mercer"
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                    value={postAuthor}
                    onChangeText={setPostAuthor}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.subText }]}>From Date</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                    value={postFromDate}
                    onChangeText={setPostFromDate}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.subText }]}>To Date</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                    value={postToDate}
                    onChangeText={setPostToDate}
                  />
                </View>
              </View>
            </View>
          ) : (
            // GROUP SEARCH FORM
            <View>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.subText }]}>Room Name</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                  placeholder="e.g. Crypto Bulls"
                  placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                  value={groupName}
                  onChangeText={setGroupName}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1.2 }]}>
                  <Text style={[styles.formLabel, { color: colors.subText }]}>Topic</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="e.g. Forex"
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                    value={groupTopic}
                    onChangeText={setGroupTopic}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.subText }]}>Min Members Count</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="e.g. 5"
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                    value={groupMinMembers}
                    onChangeText={setGroupMinMembers}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.subText }]}>Privacy Setting</Text>
                <View style={styles.radioRow}>
                  <TouchableOpacity
                    style={[styles.radioBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, groupPrivacy === "" && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: colors.primary }]}
                    onPress={() => setGroupPrivacy("")}
                  >
                    <Text style={[styles.radioText, { color: colors.subText }, groupPrivacy === "" && { color: colors.primary }]}>All Types</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, groupPrivacy === "public" && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: colors.primary }]}
                    onPress={() => setGroupPrivacy("public")}
                  >
                    <Text style={[styles.radioText, { color: colors.subText }, groupPrivacy === "public" && { color: colors.primary }]}>Public Only</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, groupPrivacy === "private" && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: colors.primary }]}
                    onPress={() => setGroupPrivacy("private")}
                  >
                    <Text style={[styles.radioText, { color: colors.subText }, groupPrivacy === "private" && { color: colors.primary }]}>Private Only</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: colors.primary }]}
              onPress={searchTab === "posts" ? handlePostSearch : handleGroupSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.searchBtnText}>Run Query ⚡</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border }]} onPress={handleResetFilters}>
              <Text style={[styles.resetBtnText, { color: colors.subText }]}>Clear Fields</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Results list */}
        <View style={styles.resultsWrapper}>
          <Text style={[styles.resultsHeading, { color: colors.text, borderBottomColor: colors.border }]}>
            Search Results ({searchTab === "posts" ? postResults.length : groupResults.length})
          </Text>

          {searchTab === "posts" ? (
            // Render Post Results
            postResults.length === 0 ? (
              <Text style={[styles.emptyResultsText, { color: colors.subText }]}>Enter search criteria and query posts.</Text>
            ) : (
              postResults.map((post) => (
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
            )
          ) : (
            // Render Group Results
            groupResults.length === 0 ? (
              <Text style={[styles.emptyResultsText, { color: colors.subText }]}>Enter search criteria and query trading rooms.</Text>
            ) : (
              groupResults.map((group) => {
                const isMember = group.members.some(
                  (m) => m._id === currentUser._id || m === currentUser._id
                );
                return (
                  <View key={group._id} style={[styles.groupCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={styles.groupCardHeader}>
                      <View>
                        <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                        <Text style={[styles.groupTopic, { color: colors.subText }]}>Topic: {group.topic}</Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          group.privacy === "public" ? styles.badgePublic : styles.badgePrivate,
                        ]}
                      >
                        <Text style={styles.badgeText}>{group.privacy.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={[styles.groupDesc, { color: colors.subText }]} numberOfLines={2}>
                      {group.description || "No description provided."}
                    </Text>
                    <View style={[styles.groupFooter, { borderTopColor: colors.border }]}>
                      <Text style={[styles.groupMembersText, { color: colors.subText }]}>👥 {group.members.length} members</Text>
                      {isMember ? (
                        <TouchableOpacity
                          style={[styles.enterRoomBtn, { backgroundColor: colors.primary }]}
                          onPress={() => onNavigate("GroupDetails", group._id)}
                        >
                          <Text style={styles.enterRoomBtnText}>Enter 🚪</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.joinBtn, { borderColor: colors.primary }]}
                          onPress={() => handleJoinLeaveGroup(group)}
                        >
                          <Text style={[styles.joinBtnText, { color: colors.primary }]}>Join Room</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    justifyContent: "space-between",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
  },
  formContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 0,
  },
  radioRow: {
    flexDirection: "row",
    gap: 8,
  },
  radioBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flex: 1,
    alignItems: "center",
  },
  radioText: {
    fontSize: 11,
    fontWeight: "600",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  searchBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    flex: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  resetBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 13,
    textAlign: "center",
  },
  resultsWrapper: {
    marginTop: 10,
  },
  resultsHeading: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 14,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  emptyResultsText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 30,
  },
  groupCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
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
  groupDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  groupFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 8,
  },
  groupMembersText: {
    fontSize: 11,
    fontWeight: "600",
  },
  enterRoomBtn: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  enterRoomBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  joinBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  joinBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

export default Search;
