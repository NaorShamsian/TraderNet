import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import API, { getSessionUser } from "../api";

const PostCard = ({ post, onPostUpdated, onEditPress, onPostDeleted }) => {
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");

  const currentUser = getSessionUser() || {};
  const isOwner = post.user?._id === currentUser._id || post.user === currentUser._id;

  const handleLike = async () => {
    try {
      const response = await API.put(`/posts/${post._id}/like`);
      if (onPostUpdated) {
        onPostUpdated(response.data);
      }
    } catch (err) {
      console.error("Error liking post", err);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;

    setCommentLoading(true);
    setCommentError("");

    try {
      const response = await API.post(`/posts/${post._id}/comments`, {
        text: commentText.trim(),
      });
      setCommentText("");
      if (onPostUpdated) {
        onPostUpdated(response.data);
      }
    } catch (err) {
      setCommentError(err.response?.data?.message || "Failed to add comment.");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Post 🗑️",
      "Are you sure you want to permanently delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/posts/${post._id}`);
              if (onPostDeleted) {
                onPostDeleted(post._id);
              }
            } catch (err) {
              console.error("Error deleting post", err);
              Alert.alert("Error", err.response?.data?.message || "Failed to delete post.");
            }
          },
        },
      ]
    );
  };

  const hasLiked = post.likes?.some((likeId) => likeId === currentUser._id);

  const formatDate = (dateStr) => {
    const options = { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  // Convert TradingView webpage link to direct PNG image URL for mobile rendering
  const getPostImageUrl = (url) => {
    if (!url) return null;
    if (url.includes("tradingview.com/x/")) {
      const parts = url.split("/x/");
      if (parts.length > 1) {
        const chartId = parts[1].split("/")[0].split("?")[0];
        const firstLetter = chartId.charAt(0).toLowerCase();
        return `https://s3.tradingview.com/snapshots/${firstLetter}/${chartId}.png`;
      }
    }
    return url;
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", flex: 1, alignItems: "center" }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {post.user?.fullName?.charAt(0).toUpperCase() || "T"}
            </Text>
          </View>
          <View style={[styles.authorInfo, { flex: 1 }]}>
            <View style={styles.metaRow}>
              <Text style={styles.fullName}>{post.user?.fullName || "Deleted User"}</Text>
              <Text style={styles.username}>@{post.user?.username || "deleted"}</Text>
            </View>
            <Text style={styles.postTime}>{formatDate(post.createdAt)}</Text>
            {post.user?.bio ? <Text style={styles.bio}>{post.user.bio}</Text> : null}
          </View>
        </View>

        {/* Owner Controls */}
        {isOwner && (
          <View style={styles.ownerControls}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => onEditPress && onEditPress(post)}
            >
              <Text style={styles.editBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.body}>
        <Text style={styles.content}>{post.content}</Text>
        
        {post.image ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: getPostImageUrl(post.image) }}
              style={styles.postImage}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Tags */}
        {post.tags && post.tags.length > 0 ? (
          <View style={styles.tagsContainer}>
            {post.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagPill}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, hasLiked && styles.likedBtn]}
          onPress={handleLike}
        >
          <Text style={styles.actionIcon}>{hasLiked ? "❤️" : "🤍"}</Text>
          <Text style={[styles.actionCount, hasLiked && styles.likedText]}>
            {post.likes?.length || 0}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.actionBtn}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post.comments?.length || 0}</Text>
        </View>
      </View>

      {/* Comments section */}
      <View style={styles.commentsSection}>
        {post.comments && post.comments.length > 0 ? (
          <View style={styles.commentsList}>
            {post.comments.map((comment) => (
              <View key={comment._id} style={styles.commentItem}>
                <View style={styles.commentMeta}>
                  <Text style={styles.commentAuthor}>{comment.user?.fullName || "Trader"}</Text>
                  <Text style={styles.commentUsername}>@{comment.user?.username || "user"}</Text>
                  <Text style={styles.commentTime}>{formatDate(comment.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {commentError ? <Text style={styles.errorText}>{commentError}</Text> : null}

        {/* Comment input form */}
        <View style={styles.addCommentForm}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor="#9ca3af"
            value={commentText}
            onChangeText={setCommentText}
            disabled={commentLoading}
          />
          <TouchableOpacity
            style={styles.commentSubmitBtn}
            onPress={handleCommentSubmit}
            disabled={commentLoading}
          >
            {commentLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.commentSubmitBtnText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(21, 28, 44, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  authorInfo: {
    flex: 1,
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  fullName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f3f4f6",
  },
  username: {
    fontSize: 12,
    color: "#9ca3af",
  },
  postTime: {
    fontSize: 10,
    color: "rgba(156, 163, 175, 0.5)",
    marginTop: 2,
  },
  bio: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  body: {
    marginBottom: 12,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: "#f3f4f6",
    marginBottom: 8,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#000",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagPill: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6366f1",
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 8,
    marginBottom: 12,
    gap: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  likedBtn: {
    backgroundColor: "rgba(236, 72, 153, 0.05)",
  },
  actionIcon: {
    fontSize: 14,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
  },
  likedText: {
    color: "#ec4899",
  },
  commentsSection: {
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 10,
    padding: 10,
  },
  commentsList: {
    maxHeight: 180,
    marginBottom: 10,
    gap: 8,
  },
  commentItem: {
    backgroundColor: "#151c2c",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 8,
    padding: 8,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f3f4f6",
  },
  commentUsername: {
    fontSize: 10,
    color: "#9ca3af",
  },
  commentTime: {
    fontSize: 9,
    color: "rgba(156, 163, 175, 0.4)",
  },
  commentText: {
    fontSize: 12,
    lineHeight: 16,
    color: "#f3f4f6",
  },
  errorText: {
    color: "#fb7185",
    fontSize: 12,
    marginBottom: 8,
  },
  addCommentForm: {
    flexDirection: "row",
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#f3f4f6",
    fontSize: 13,
  },
  commentSubmitBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  commentSubmitBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  ownerControls: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  editBtn: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  editBtnText: {
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.2)",
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnText: {
    fontSize: 14,
  },
});

export default PostCard;
