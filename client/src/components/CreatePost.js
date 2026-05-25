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

const CreatePost = ({ onPostCreated }) => {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      });

      // Clear fields
      setContent("");
      setImage("");
      setTagsStr("");

      if (onPostCreated) {
        onPostCreated(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Share a Trade Idea 💡</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TextInput
        style={styles.textArea}
        placeholder="What's your analysis? (e.g. Bullish breakout on $TSLA!)"
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={3}
        maxLength={1000}
        value={content}
        onChangeText={setContent}
      />

      <View style={styles.metaRow}>
        <TextInput
          style={[styles.input, styles.metaInput]}
          placeholder="Image URL (optional)"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          value={image}
          onChangeText={setImage}
        />
        
        <TextInput
          style={[styles.input, styles.metaInput]}
          placeholder="Tags (separated by commas)"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          value={tagsStr}
          onChangeText={setTagsStr}
        />
      </View>

      <View style={styles.actionRow}>
        <Text style={styles.charCount}>{content.length}/1000</Text>
        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
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
    backgroundColor: "rgba(21, 28, 44, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: "100%",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f3f4f6",
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
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 12,
    color: "#f3f4f6",
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
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#f3f4f6",
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
    color: "#9ca3af",
  },
  btnPrimary: {
    backgroundColor: "#6366f1",
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
