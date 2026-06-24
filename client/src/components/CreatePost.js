import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import API from "../api";
import SoundManager from "../utils/SoundManager";

const CreatePost = ({ onPostCreated, groupId, theme, isDarkMode }) => {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handlePublish = async () => {
    if (!content.trim()) {
      setError("Post content cannot be empty.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const tags = tagsStr
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const response = await API.post("/posts", {
        content: content.trim(),
        image: image.trim(),
        tags,
        group: groupId || null,
      });

      setContent("");
      setImage("");
      setTagsStr("");
      SoundManager.postCreated();

      if (onPostCreated) {
        onPostCreated(response.data);
      }
    } catch (err) {
      SoundManager.error();
      setError(err.response?.data?.message || "Failed to create post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Share a Trade Idea 💡</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TextInput
        style={[styles.textArea, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
        placeholder="What's your analysis? (e.g. Bullish breakout on $TSLA!)"
        placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
        multiline
        numberOfLines={3}
        maxLength={1000}
        value={content}
        onChangeText={setContent}
      />

      <View style={styles.metaRow}>
        <TextInput
          style={[styles.input, styles.metaInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
          placeholder="Image URL (optional)"
          placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
          autoCapitalize="none"
          autoCorrect={false}
          value={image}
          onChangeText={setImage}
        />
        
        <TextInput
          style={[styles.input, styles.metaInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
          placeholder="Tags (separated by commas)"
          placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
          autoCapitalize="none"
          autoCorrect={false}
          value={tagsStr}
          onChangeText={setTagsStr}
        />
      </View>

      <View style={styles.actionRow}>
        <Text style={[styles.charCount, { color: colors.subText }]}>{content.length}/1000</Text>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
          onPress={handlePublish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>Publish Post</Text>
          )}
        </TouchableOpacity>
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
  title: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  errorText: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    color: "#fb7185",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  metaInput: {
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontSize: 12,
  },
  btnPrimary: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default CreatePost;
