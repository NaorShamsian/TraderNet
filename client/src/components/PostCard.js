import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import API, { getSessionUser } from "../api";
import SoundManager from "../utils/SoundManager";

const PostCard = ({ post, onPostUpdated, onEditPress, onPostDeleted, onStartPrivateChat, onNavigate, onShowUserModal, onTagPress, theme, isDarkMode }) => {
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);

  const COMMENTS_PREVIEW = 2;

  // Like bounce animation
  const likeScale = useRef(new Animated.Value(1)).current;

  const currentUser = getSessionUser() || {};
  const isOwner = post.user?._id === currentUser._id || post.user === currentUser._id;
  const isAdmin = currentUser.role === "admin";

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

  const handleLike = async () => {
    const willLike = !post.likes?.some((likeId) => likeId === currentUser._id);
    // Sound + bounce animation
    if (willLike) {
      SoundManager.profitTarget();
    } else {
      SoundManager.unlike();
    }
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.45, useNativeDriver: true, speed: 80, bounciness: 6 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 10 }),
    ]).start();

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
    SoundManager.commentAdded();
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
      SoundManager.error();
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
              SoundManager.stopLoss();
              if (onPostDeleted) {
                onPostDeleted(post._id);
              }
            } catch (err) {
              console.error("Error deleting post", err);
              SoundManager.error();
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
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={{ flexDirection: "row", flex: 1, alignItems: "center" }}
          onPress={() => {
            if (!post.user || !post.user._id) return;
            if (post.user._id === currentUser._id) {
              onNavigate && onNavigate("Profile");
              return;
            }
            onShowUserModal && onShowUserModal(post.user);
          }}
          disabled={!post.user}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {post.user?.fullName?.charAt(0).toUpperCase() || "T"}
            </Text>
          </View>
          <View style={[styles.authorInfo, { flex: 1 }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.fullName, { color: colors.text }]}>{post.user?.fullName || "Deleted User"}</Text>
              <Text style={[styles.username, { color: colors.subText }]}>@{post.user?.username || "deleted"}</Text>
            </View>
            <Text style={[styles.postTime, { color: colors.subText }]}>{formatDate(post.createdAt)}</Text>
            {post.user?.bio ? <Text style={[styles.bio, { color: colors.subText }]}>{post.user.bio}</Text> : null}
          </View>
        </TouchableOpacity>

        {/* Controls */}
        {(isOwner || isAdmin) && (
          <View style={styles.ownerControls}>
            {(isOwner || isAdmin) && (
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: colors.border }]}
                onPress={() => onEditPress && onEditPress(post)}
              >
                <Text style={styles.editBtnText}>✏️</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.border }]} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Badges Row */}
      {(post.group || post.isFriend) ? (
        <View style={styles.badgesRow}>
          {post.group ? (
            <TouchableOpacity
              style={[
                styles.groupBadge,
                {
                  backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)",
                  borderColor: isDarkMode ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.15)",
                }
              ]}
              onPress={() => onNavigate && onNavigate("GroupDetails", post.group._id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.groupBadgeText, { color: colors.primary }]}>
                👥 Posted in: {post.group.name}
              </Text>
            </TouchableOpacity>
          ) : null}

          {post.isFriend ? (
            <View
              style={[
                styles.friendBadge,
                {
                  backgroundColor: isDarkMode ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.08)",
                  borderColor: isDarkMode ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.15)",
                }
              ]}
            >
              <Text style={[styles.friendBadgeText, { color: colors.success || "#10b981" }]}>
                🤝 Your Friend
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Content */}
      <View style={styles.body}>
        <Text style={[styles.content, { color: colors.text }]}>{post.content}</Text>
        
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
              <TouchableOpacity
                key={idx}
                style={[styles.tagPill, { backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.1)" : "#f1f5f9", borderColor: colors.border }]}
                onPress={() => {
                  if (onTagPress) {
                    onTagPress(tag);
                  } else {
                    onNavigate && onNavigate("Feed", tag);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagText, { color: colors.primary }]}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, hasLiked && styles.likedBtn]}
          onPress={handleLike}
          activeOpacity={0.8}
        >
          <Animated.Text style={[styles.actionIcon, { transform: [{ scale: likeScale }] }]}>
            {hasLiked ? "❤️" : "🤍"}
          </Animated.Text>
          <Text style={[styles.actionCount, hasLiked && styles.likedText]}>
            {post.likes?.length || 0}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.actionBtn}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={[styles.actionCount, { color: colors.subText }]}>{post.comments?.length || 0}</Text>
        </View>
      </View>

      {/* Comments section */}
      <View style={[styles.commentsSection, { borderColor: colors.border }]}>
        {post.comments && post.comments.length > 0 ? (
          <View style={styles.commentsList}>
            {/* Show preview or all comments */}
            {(showAllComments ? post.comments : post.comments.slice(0, COMMENTS_PREVIEW)).map((comment) => (
              <View key={comment._id} style={[styles.commentItem, { backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.06)" : "#f8fafc", borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.commentMeta}
                  onPress={() => {
                    if (!comment.user || !comment.user._id) return;
                    if (comment.user._id === currentUser._id) {
                      onNavigate && onNavigate("Profile");
                      return;
                    }
                    onShowUserModal && onShowUserModal(comment.user);
                  }}
                  disabled={!comment.user}
                >
                  <View style={[styles.commentAvatarDot, { backgroundColor: colors.primary }]}>
                    <Text style={styles.commentAvatarText}>
                      {comment.user?.fullName?.charAt(0).toUpperCase() || "T"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.commentMetaRow}>
                      <Text style={[styles.commentAuthor, { color: colors.text }]}>{comment.user?.fullName || "Trader"}</Text>
                      <Text style={[styles.commentUsername, { color: colors.subText }]}>@{comment.user?.username || "user"}</Text>
                      <Text style={[styles.commentTime, { color: colors.subText }]}>{formatDate(comment.createdAt)}</Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.text }]}>{comment.text}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}

            {/* Expand / Collapse toggle */}
            {post.comments.length > COMMENTS_PREVIEW && (
              <TouchableOpacity
                style={[
                  styles.showMoreBtn,
                  { backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.05)", borderColor: isDarkMode ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.12)" }
                ]}
                onPress={() => {
                  SoundManager.segmentSwitch();
                  setShowAllComments(!showAllComments);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.showMoreText, { color: colors.primary }]}>
                  {showAllComments
                    ? "\u25b4 Show less"
                    : `\u25be ${post.comments.length - COMMENTS_PREVIEW} more comment${post.comments.length - COMMENTS_PREVIEW > 1 ? "s" : ""}`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {commentError ? <Text style={styles.errorText}>{commentError}</Text> : null}

        {/* Comment input form */}
        <View style={styles.addCommentForm}>
          <TextInput
            style={[styles.commentInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
            placeholder="Add a comment..."
            placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
            value={commentText}
            onChangeText={setCommentText}
            disabled={commentLoading}
          />
          <TouchableOpacity
            style={[styles.commentSubmitBtn, { backgroundColor: colors.primary }]}
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
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  username: {
    fontSize: 12,
  },
  postTime: {
    fontSize: 10,
    marginTop: 2,
  },
  bio: {
    fontSize: 11,
    marginTop: 2,
  },
  body: {
    marginBottom: 12,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
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
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
  },
  likedText: {
    color: "#ec4899",
  },
  commentsSection: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  commentsList: {
    marginBottom: 10,
    gap: 8,
  },
  commentItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  commentAvatarDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  commentAvatarText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  commentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 3,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: "600",
  },
  commentUsername: {
    fontSize: 10,
  },
  commentTime: {
    fontSize: 9,
  },
  commentText: {
    fontSize: 12,
    lineHeight: 16,
  },
  showMoreBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    marginTop: 4,
  },
  showMoreText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  commentSubmitBtn: {
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
    backgroundColor: "rgba(99, 102, 241, 0.05)",
    borderWidth: 1,
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
    backgroundColor: "rgba(244, 63, 94, 0.05)",
    borderWidth: 1,
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnText: {
    fontSize: 14,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
    marginTop: -4,
  },
  groupBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  friendBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  friendBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

export default PostCard;
