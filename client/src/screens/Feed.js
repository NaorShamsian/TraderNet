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
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
} from "react-native";
import API from "../api";
import Navbar from "../components/Navbar";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";

const Feed = ({ onLogout, onNavigate }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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

  const fetchPosts = async () => {
    try {
      const response = await API.get("/posts");
      setPosts(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load feed posts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

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

  const handleSearch = async () => {
    setIsSearching(true);
    setLoading(true);
    setError("");
    try {
      const response = await API.get("/posts/search", {
        params: {
          content: searchContent.trim() || undefined,
          tag: searchTag.trim() || undefined,
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#151c2c" />
      <Navbar onLogout={onLogout} currentScreen="Feed" onNavigate={onNavigate} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={["#6366f1"]}
          />
        }
      >
        <CreatePost onPostCreated={handlePostCreated} />

        {/* Collapsible Search Accordion */}
        <TouchableOpacity
          style={styles.searchAccordionHeader}
          onPress={() => setIsSearchExpanded(!isSearchExpanded)}
        >
          <Text style={styles.searchAccordionTitle}>
            {isSearchExpanded ? "👇 Collapse Filters" : "🔍 Advanced Post Search"}
          </Text>
        </TouchableOpacity>

        {isSearchExpanded && (
          <View style={styles.searchAccordionContent}>
            <View style={styles.searchFormGroup}>
              <Text style={styles.searchFormLabel}>Keyword in Content</Text>
              <TextInput
                style={styles.searchFormInput}
                placeholder="e.g. breakout, gold, bullish"
                placeholderTextColor="#9ca3af"
                value={searchContent}
                onChangeText={setSearchContent}
              />
            </View>

            <View style={styles.searchFormRow}>
              <View style={[styles.searchFormGroup, { flex: 1 }]}>
                <Text style={styles.searchFormLabel}>Tag</Text>
                <TextInput
                  style={styles.searchFormInput}
                  placeholder="e.g. BTC (no #)"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  value={searchTag}
                  onChangeText={setSearchTag}
                />
              </View>
              <View style={[styles.searchFormGroup, { flex: 1 }]}>
                <Text style={styles.searchFormLabel}>Author Username</Text>
                <TextInput
                  style={styles.searchFormInput}
                  placeholder="e.g. johndoe"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  value={searchUsername}
                  onChangeText={setSearchUsername}
                />
              </View>
            </View>

            <View style={styles.searchFormRow}>
              <View style={[styles.searchFormGroup, { flex: 1 }]}>
                <Text style={styles.searchFormLabel}>From Date</Text>
                <TextInput
                  style={styles.searchFormInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  value={searchFromDate}
                  onChangeText={setSearchFromDate}
                />
              </View>
              <View style={[styles.searchFormGroup, { flex: 1 }]}>
                <Text style={styles.searchFormLabel}>To Date</Text>
                <TextInput
                  style={styles.searchFormInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  value={searchToDate}
                  onChangeText={setSearchToDate}
                />
              </View>
            </View>

            <View style={styles.searchFormBtnRow}>
              <TouchableOpacity
                style={[styles.accordionBtn, styles.searchAccordionBtn]}
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
                style={[styles.accordionBtn, styles.resetAccordionBtn]}
                onPress={handleResetSearch}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading trading feed...</Text>
          </View>
        ) : null}

        {!loading && posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No analysis found 📉</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search filters or be the first to publish a new post!
            </Text>
          </View>
        ) : null}

        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onPostUpdated={handlePostUpdated}
            onEditPress={handleEditPress}
            onPostDeleted={handlePostDeleted}
          />
        ))}
      </ScrollView>

      {/* Edit Post Modal Overlay */}
      <Modal
        visible={editingPost !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingPost(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Post ✏️</Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Update Post Content</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                multiline
                numberOfLines={4}
                value={editContent}
                onChangeText={setEditContent}
                placeholder="What's on your mind?"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Tags (comma-separated)</Text>
              <TextInput
                style={styles.modalInput}
                value={editTags}
                onChangeText={setEditTags}
                placeholder="e.g. trading, gold, tsla"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn, editLoading && styles.btnDisabled]}
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
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setEditingPost(null)}
                disabled={editLoading}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
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
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 10,
  },
  emptyContainer: {
    backgroundColor: "rgba(21, 28, 44, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f3f4f6",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
  searchAccordionHeader: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  searchAccordionTitle: {
    color: "#6366f1",
    fontSize: 13,
    fontWeight: "700",
  },
  searchAccordionContent: {
    backgroundColor: "rgba(21, 28, 44, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
    color: "#9ca3af",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  searchFormInput: {
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: "#f3f4f6",
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
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  accordionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  resetBtnText: {
    color: "#9ca3af",
    fontWeight: "700",
    fontSize: 13,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
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
    fontSize: 11,
    fontWeight: "600",
    color: "#f3f4f6",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
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
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  modalCancelBtnText: {
    color: "#9ca3af",
    fontWeight: "700",
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.7,
  },
});

export default Feed;
