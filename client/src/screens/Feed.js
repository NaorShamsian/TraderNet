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
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import SoundManager from "../utils/SoundManager";

const Feed = ({ onLogout, onNavigate, onStartPrivateChat, theme, isDarkMode, initialTagFilter, onClearTagFilter, incomingRequests, friendRequestsCount }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [feedFilter, setFeedFilter] = useState("global"); 
  const [myJoinedGroupIds, setMyJoinedGroupIds] = useState([]);

  // Collapsible search state
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchContent, setSearchContent] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [searchFromDate, setSearchFromDate] = useState("");
  const [searchToDate, setSearchToDate] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Edit post state
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const currentUser = getSessionUser() || {};

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

  const fetchPosts = async () => {
    try {
      const response = await API.get("/posts");
      setPosts(response.data);

      const groupsRes = await API.get("/groups");
      const joinedIds = groupsRes.data
        .filter((g) =>
          g.members.some((m) => (m._id || m) === currentUser._id)
        )
        .map((g) => g._id);
      setMyJoinedGroupIds(joinedIds);

      setError("");
    } catch (err) {
      setError("Failed to load feed posts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialTagFilter) {
      setIsSearchExpanded(true);
      setSearchTag(initialTagFilter);
      handleSearch(initialTagFilter);
      if (onClearTagFilter) {
        onClearTagFilter();
      }
    } else {
      fetchPosts();
    }
  }, [initialTagFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handlePostCreated = (newPost) => {
    setPosts((prevPosts) => [newPost, ...prevPosts]);
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post._id === updatedPost._id ? updatedPost : post))
    );
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post._id !== deletedPostId));
  };

  const handleSearch = async (tagOverride) => {
    setIsSearching(true);
    setLoading(true);
    setError("");
    const finalTag = typeof tagOverride === "string" ? tagOverride : searchTag;
    try {
      const response = await API.get("/posts/search", {
        params: {
          content: searchContent.trim() || undefined,
          tag: finalTag.trim() || undefined,
          fromDate: searchFromDate.trim() || undefined,
          toDate: searchToDate.trim() || undefined,
          username: searchUsername.trim() || undefined,
        },
      });
      setPosts(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to search posts.");
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleTagPress = (tag) => {
    setIsSearchExpanded(true);
    setSearchTag(tag);
    handleSearch(tag);
  };

  const handleResetSearch = () => {
    setSearchContent("");
    setSearchTag("");
    setSearchFromDate("");
    setSearchToDate("");
    setSearchUsername("");
    fetchPosts();
  };

  const handleEditPress = (post) => {
    setEditingPost(post);
    setEditContent(post.content || "");
    setEditTags(post.tags ? post.tags.join(", ") : "");
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim()) {
      Alert.alert("Error", "Post content cannot be empty.");
      return;
    }

    setEditLoading(true);
    try {
      const tagsArray = editTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");

      const response = await API.put(`/posts/${editingPost._id}`, {
        content: editContent.trim(),
        tags: tagsArray,
      });

      handlePostUpdated(response.data);
      Alert.alert("Success", "Post updated successfully!");
      setEditingPost(null);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update post.");
    } finally {
      setEditLoading(false);
    }
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
        {/* Real-time Friend Requests Hint Card Banner */}
        {friendRequestsCount > 0 && (
          <TouchableOpacity
            style={[styles.friendRequestHintCard, { backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.05)", borderColor: colors.primary }]}
            onPress={() => onNavigate("Profile")}
            activeOpacity={0.8}
          >
            <View style={styles.hintCardLeft}>
              <Text style={styles.hintCardIcon}>👥</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.hintCardTitle, { color: colors.text }]}>
                  {friendRequestsCount === 1 ? "You have a new connection request!" : `You have ${friendRequestsCount} pending connection requests!`}
                </Text>
                <Text style={[styles.hintCardSubtitle, { color: colors.subText }]}>
                  Tap here to review and respond to requests
                </Text>
              </View>
            </View>
            <Text style={[styles.hintCardArrow, { color: colors.primary }]}>➔</Text>
          </TouchableOpacity>
        )}

        {/* Feed Segment Filter Toggle */}
        <View style={[styles.segmentContainer, { backgroundColor: isDarkMode ? "rgba(21, 28, 44, 0.6)" : "#f1f5f9", borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, feedFilter === "global" && { backgroundColor: colors.primary }]}
            onPress={() => {
              SoundManager.segmentSwitch();
              setFeedFilter("global");
            }}
          >
            <Text style={[styles.segmentText, feedFilter === "global" && { color: "#ffffff" }]}>
              🌐 Global
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, feedFilter === "groups" && { backgroundColor: colors.primary }]}
            onPress={() => {
              SoundManager.segmentSwitch();
              setFeedFilter("groups");
            }}
          >
            <Text style={[styles.segmentText, feedFilter === "groups" && { color: "#ffffff" }]}>
              📁 My Groups
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, feedFilter === "mine" && { backgroundColor: colors.primary }]}
            onPress={() => {
              SoundManager.segmentSwitch();
              setFeedFilter("mine");
            }}
          >
            <Text style={[styles.segmentText, feedFilter === "mine" && { color: "#ffffff" }]}>
              👤 My Posts
            </Text>
          </TouchableOpacity>
        </View>

        {feedFilter === "global" || feedFilter === "mine" ? (
          <CreatePost onPostCreated={handlePostCreated} theme={colors} isDarkMode={isDarkMode} />
        ) : null}

        {/* Collapsible Search Accordion */}
        <TouchableOpacity
          style={[styles.searchAccordionHeader, { backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.04)", borderColor: colors.border }]}
          onPress={() => {
            SoundManager.segmentSwitch();
            setIsSearchExpanded(!isSearchExpanded);
          }}
        >
          <Text style={[styles.searchAccordionTitle, { color: colors.primary }]}>
            {isSearchExpanded ? "👇 Collapse Filters" : "🔍 Advanced Post Search"}
          </Text>
        </TouchableOpacity>

        {isSearchExpanded && (
          <View style={[styles.searchAccordionContent, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.searchFormGroup}>
              <Text style={[styles.searchFormLabel, { color: colors.subText }]}>Keyword in Content</Text>
              <TextInput
                style={[styles.searchFormInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                placeholder="e.g. breakout, gold, bullish"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                value={searchContent}
                onChangeText={setSearchContent}
              />
            </View>

            <View style={styles.searchFormRow}>
              <View style={[styles.searchFormGroup, { flex: 1 }]}>
                <Text style={[styles.searchFormLabel, { color: colors.subText }]}>Tag</Text>
                <TextInput
                  style={[styles.searchFormInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                  placeholder="e.g. BTC"
                  placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                  autoCapitalize="none"
                  value={searchTag}
                  onChangeText={setSearchTag}
                />
              </View>
              <View style={[styles.searchFormGroup, { flex: 1 }]}>
                <Text style={[styles.searchFormLabel, { color: colors.subText }]}>Author Username</Text>
                <TextInput
                  style={[styles.searchFormInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                  placeholder="e.g. johndoe"
                  placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                  autoCapitalize="none"
                  value={searchUsername}
                  onChangeText={setSearchUsername}
                />
              </View>
            </View>

            <View style={styles.searchFormRow}>
              <View style={[styles.searchFormGroup, { flex: 1 }]}>
                <Text style={[styles.searchFormLabel, { color: colors.subText }]}>From Date</Text>
                <TextInput
                  style={[styles.searchFormInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                  value={searchFromDate}
                  onChangeText={setSearchFromDate}
                />
              </View>
              <View style={[styles.searchFormGroup, { flex: 1 }]}>
                <Text style={[styles.searchFormLabel, { color: colors.subText }]}>To Date</Text>
                <TextInput
                  style={[styles.searchFormInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                  value={searchToDate}
                  onChangeText={setSearchToDate}
                />
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
                  <Text style={styles.accordionBtnText}>Search</Text>
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
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subText }]}>Loading trading feed...</Text>
          </View>
        ) : null}

        {(() => {
          const filteredPosts = posts.filter((post) => {
            if (feedFilter === "mine") {
              return (
                post.user &&
                (post.user._id === currentUser._id || post.user === currentUser._id)
              );
            }
            if (feedFilter === "groups") {
              return post.group && myJoinedGroupIds.includes(post.group._id);
            }
            return true;
          });

          if (!loading && filteredPosts.length === 0) {
            return (
              <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No analysis found 📉</Text>
                <Text style={[styles.emptySubtitle, { color: colors.subText }]}>
                  {feedFilter === "groups"
                    ? "Posts from groups you belong to will show up here. Join some groups first!"
                    : feedFilter === "mine"
                    ? "You haven't written any analyses yet! Create your first post above."
                    : "Try adjusting your search filters or be the first to publish a new post!"}
                </Text>
              </View>
            );
          }

          return filteredPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPostUpdated={handlePostUpdated}
              onEditPress={handleEditPress}
              onPostDeleted={handlePostDeleted}
              onStartPrivateChat={onStartPrivateChat}
              onNavigate={onNavigate}
              onTagPress={handleTagPress}
              theme={colors}
              isDarkMode={isDarkMode}
            />
          ));
        })()}
      </ScrollView>

      {/* Edit Post Modal */}
      <Modal
        visible={editingPost !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingPost(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Post ✏️</Text>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Update Post Content</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                multiline
                numberOfLines={4}
                value={editContent}
                onChangeText={setEditContent}
                placeholder="What's on your mind?"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>Tags (comma-separated)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                value={editTags}
                onChangeText={setEditTags}
                placeholder="e.g. trading, gold, tsla"
                placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn, { backgroundColor: colors.primary }, editLoading && styles.btnDisabled]}
                onPress={handleEditSubmit}
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
                onPress={() => setEditingPost(null)}
                disabled={editLoading}
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
  errorText: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    color: "#fb7185",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    textAlign: "center",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 10,
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    textAlign: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
  searchAccordionHeader: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  searchAccordionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  searchAccordionContent: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  searchFormGroup: {
    marginBottom: 10,
  },
  searchFormLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  searchFormInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
  },
  searchFormRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  searchFormBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  accordionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
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
    fontSize: 13,
  },
  resetBtnText: {
    fontWeight: "700",
    fontSize: 13,
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
    minHeight: 100,
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
    color: "#64748b",
  },
  friendRequestHintCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  hintCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  hintCardIcon: {
    fontSize: 22,
  },
  hintCardTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  hintCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  hintCardArrow: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
});

export default Feed;
