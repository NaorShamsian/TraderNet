import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import API from "../api";
import SoundManager from "../utils/SoundManager";

const CreatePost = ({ onPostCreated, groupId, theme, isDarkMode }) => {
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need media library access permissions to select photos!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleUploadFile(result.assets[0].uri, "image");
      }
    } catch (err) {
      console.error("Image selection failed", err);
      Alert.alert("Error", "Failed to select image from gallery.");
    }
  };

  const handlePickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need media library access permissions to select videos!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleUploadFile(result.assets[0].uri, "video");
      }
    } catch (err) {
      console.error("Video selection failed", err);
      Alert.alert("Error", "Failed to select video from gallery.");
    }
  };

  const handleUploadFile = async (localUri, fileType) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      const filename = localUri.split("/").pop() || "upload-media";
      
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1] : "";
      let type = "";
      if (fileType === "image") {
        type = ext ? `image/${ext}` : "image/jpeg";
      } else {
        type = ext ? `video/${ext}` : "video/mp4";
      }

      formData.append("file", {
        uri: localUri,
        name: filename,
        type: type,
      });

      const response = await API.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (fileType === "image") {
        setImage(response.data.url);
        setVideo(""); // clear video to post only one media type
      } else {
        setVideo(response.data.url);
        setImage(""); // clear image to post only one media type
      }
      SoundManager.profitTarget();
    } catch (err) {
      console.error("File upload failed", err);
      setError(err.response?.data?.message || "Failed to upload media file to server.");
      SoundManager.error();
    } finally {
      setUploading(false);
    }
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
        image: image,
        video: video,
        tags,
        group: groupId || null,
      });

      setContent("");
      setImage("");
      setVideo("");
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

      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.uploadingText, { color: colors.subText }]}>Uploading media file...</Text>
        </View>
      )}

      {/* Media previews */}
      {image ? (
        <View style={[styles.previewContainer, { borderColor: colors.border }]}>
          <Text style={[styles.previewLabel, { color: colors.primary }]}>🖼️ Attached Image</Text>
          <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setImage("")}>
            <Text style={styles.removeMediaText}>Remove ❌</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {video ? (
        <View style={[styles.previewContainer, { borderColor: colors.border }]}>
          <Text style={[styles.previewLabel, { color: colors.primary }]}>🎥 Attached Video</Text>
          <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setVideo("")}>
            <Text style={styles.removeMediaText}>Remove ❌</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <TouchableOpacity
          style={[styles.mediaBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={handlePickImage}
          disabled={uploading}
        >
          <Text style={[styles.mediaBtnText, { color: colors.text }]}>🖼️ Image</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mediaBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={handlePickVideo}
          disabled={uploading}
        >
          <Text style={[styles.mediaBtnText, { color: colors.text }]}>🎥 Video</Text>
        </TouchableOpacity>
        
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
          style={[styles.btnPrimary, { backgroundColor: colors.primary }, (loading || uploading) && styles.btnDisabled]}
          onPress={handlePublish}
          disabled={loading || uploading}
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
  uploadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  uploadingText: {
    fontSize: 12,
  },
  previewContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "rgba(99, 102, 241, 0.04)",
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  removeMediaBtn: {
    padding: 4,
  },
  removeMediaText: {
    fontSize: 11,
    color: "#ef4444",
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  mediaBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    flex: 0.7,
  },
  mediaBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  metaInput: {
    flex: 1.6,
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
