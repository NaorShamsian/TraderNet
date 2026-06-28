import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import io from "socket.io-client/dist/socket.io";
import API, { getSessionUser, BASE_SOCKET_URL } from "../api";
import Navbar from "../components/Navbar";
import SoundManager from "../utils/SoundManager";

const PrivateChat = ({ conversationId, partner, onLogout, onNavigate, theme, isDarkMode }) => {
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
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const scrollViewRef = useRef(null);
  const currentUser = getSessionUser() || {};

  useEffect(() => {
    // 1. Fetch DM history from server
    const fetchHistory = async () => {
      try {
        const response = await API.get(`/dm/${conversationId}/messages`);
        setMessages(response.data);
        setError("");
      } catch (err) {
        setError("Failed to load chat history.");
      } finally {
        setLoading(false);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    };

    fetchHistory();

    // 2. Establish live Socket.io connection
    const socket = io(BASE_SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinDmRoom", conversationId);
    });

    socket.on("newDirectMessage", (message) => {
      setMessages((prev) => [...prev, message]);
      if (message.sender && (message.sender._id !== currentUser._id && message.sender !== currentUser._id)) {
        SoundManager.orderFilled();
      }
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });

    socket.on("connect_error", () => {
      setError("Failed to establish real-time chat connection.");
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [conversationId]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    if (socketRef.current && socketRef.current.connected) {
      SoundManager.chartTick();
      socketRef.current.emit("sendDirectMessage", {
        conversationId,
        senderId: currentUser._id,
        text: inputText.trim(),
      });
      setInputText("");
    } else {
      SoundManager.error();
      setError("Cannot send message. Live server disconnected.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 90}
      >
        {/* Header */}
        <View style={[styles.chatHeader, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => onNavigate("DMsList")}>
            <Text style={[styles.backBtnText, { color: colors.text }]}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.partnerName, { color: colors.text }]}>{partner.fullName || "Trader"}</Text>
            <Text style={[styles.partnerUsername, { color: colors.subText }]}>@{partner.username || "username"}</Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subText }]}>Opening secure chat...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messageScrollContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg, index) => {
              const isMe = msg.sender && (msg.sender._id === currentUser._id || msg.sender === currentUser._id);
              const timeStr = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <View
                  key={msg._id || index}
                  style={[styles.messageWrapper, isMe ? styles.messageMe : styles.messageOther]}
                >
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : [styles.bubbleOther, { backgroundColor: colors.cardBg, borderColor: colors.border }]]}>
                    <Text style={[styles.messageText, { color: isMe ? "#ffffff" : colors.text }]}>{msg.text}</Text>
                    <Text style={[styles.timestamp, isMe ? styles.timeMe : { color: colors.subText }]}>
                      {timeStr}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={[styles.inputContainer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.chatInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
            placeholder="Type a message..."
            placeholderTextColor={isDarkMode ? "#9ca3af" : "#64748b"}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={handleSendMessage}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  keyboardContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(21, 28, 44, 0.6)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#1f293d",
    borderRadius: 8,
    marginRight: 12,
  },
  backBtnText: {
    color: "#f3f4f6",
    fontSize: 12,
    fontWeight: "700",
  },
  headerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f3f4f6",
  },
  partnerUsername: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 1,
  },
  errorText: {
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    color: "#fb7185",
    padding: 8,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 10,
  },
  messageScrollContent: {
    padding: 16,
    paddingBottom: 25,
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: "80%",
  },
  messageMe: {
    alignSelf: "flex-end",
  },
  messageOther: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: "#6366f1",
    borderTopRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: "#151c2c",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderTopLeftRadius: 2,
  },
  messageText: {
    color: "#f3f4f6",
    fontSize: 14,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 8,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeMe: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  timeOther: {
    color: "#9ca3af",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 24, // Raised bottom spacing
    backgroundColor: "#151c2c",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#f3f4f6",
    fontSize: 13,
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
});

export default PrivateChat;
