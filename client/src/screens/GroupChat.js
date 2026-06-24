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
  Alert,
} from "react-native";
import io from "socket.io-client/dist/socket.io";
import API, { getSessionUser, LOCAL_IP } from "../api";
import SoundManager from "../utils/SoundManager";

const GroupChat = ({ groupId, onLogout, onNavigate, theme, isDarkMode }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [groupName, setGroupName] = useState("Trading Room");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [groupAdminId, setGroupAdminId] = useState("");
  const [groupCreatorId, setGroupCreatorId] = useState("");

  const socketRef = useRef(null);
  const scrollViewRef = useRef(null);
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

  useEffect(() => {
    // 1. Fetch group metadata and message history
    const initializeChat = async () => {
      try {
        const groupRes = await API.get(`/groups/${groupId}`);
        setGroupName(groupRes.data.name);
        setGroupAdminId(groupRes.data.admin?._id || groupRes.data.admin);
        setGroupCreatorId(groupRes.data.creator?._id || groupRes.data.creator);

        const historyRes = await API.get(`/group-chat/${groupId}`);
        setMessages(historyRes.data);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to enter group chat.");
      } finally {
        setLoading(false);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    };

    initializeChat();

    // 2. Establish live Socket.io connection
    const socket = io(`http://${LOCAL_IP}:5000`);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinGroupChat", groupId);
    });

    socket.on("newGroupMessage", (message) => {
      setMessages((prev) => [...prev, message]);
      if (message.sender && (message.sender._id !== currentUser._id && message.sender !== currentUser._id)) {
        SoundManager.orderFilled();
      }
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });

    socket.on("groupMessageDeleted", (deletedMessageId) => {
      setMessages((prev) => prev.filter((m) => m._id !== deletedMessageId));
    });

    socket.on("connect_error", () => {
      setError("Failed to establish real-time chat connection.");
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [groupId]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    if (socketRef.current && socketRef.current.connected) {
      SoundManager.sendMessage();
      socketRef.current.emit("sendGroupMessage", {
        groupId,
        senderId: currentUser._id,
        text: inputText.trim(),
      });
      setInputText("");
    } else {
      SoundManager.error();
      setError("Cannot send message. Live server disconnected.");
    }
  };

  const handleDeleteMessage = (messageId) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message for everyone?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete for Everyone",
          style: "destructive",
          onPress: () => {
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit("deleteGroupMessage", {
                messageId,
                userId: currentUser._id,
                groupId,
              });
            } else {
              Alert.alert("Error", "Server disconnected. Cannot delete message.");
            }
          },
        },
      ]
    );
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
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => onNavigate("GroupDetails", groupId)}>
            <Text style={[styles.backBtnText, { color: colors.text }]}>← Exit Chat</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.groupTitle, { color: colors.text }]} numberOfLines={1}>💬 {groupName}</Text>
            <Text style={[styles.groupSubtitle, { color: colors.subText }]}>Room Discussion Desk</Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subText }]}>Opening room vault...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messageScrollContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg, index) => {
              const isMe = msg.sender && (msg.sender._id === currentUser._id || msg.sender === currentUser._id);
              const isMsgSender = msg.sender && (msg.sender._id === currentUser._id || msg.sender === currentUser._id);
              const isGroupAdmin = currentUser._id === groupAdminId || currentUser._id === groupCreatorId || currentUser.role === "admin";
              const canDelete = isMsgSender || isGroupAdmin;
              
              const senderName = msg.sender ? msg.sender.fullName : "Trader";
              const senderUsername = msg.sender ? `@${msg.sender.username}` : "";
              const timeStr = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <View
                  key={msg._id || index}
                  style={[styles.messageWrapper, isMe ? styles.messageMe : styles.messageOther]}
                >
                  {!isMe && (
                    <Text style={[styles.senderLabel, { color: colors.text }]}>
                      {senderName} <Text style={[styles.senderUser, { color: colors.subText }]}>{senderUsername}</Text>
                    </Text>
                  )}
                  
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {isMe && canDelete && msg._id && (
                      <TouchableOpacity onPress={() => handleDeleteMessage(msg._id)} style={styles.deleteMsgBtn} activeOpacity={0.7}>
                        <Text style={styles.deleteMsgIcon}>🗑️</Text>
                      </TouchableOpacity>
                    )}

                    <View style={[styles.bubble, isMe ? styles.bubbleMe : [styles.bubbleOther, { backgroundColor: colors.cardBg, borderColor: colors.border }]]}>
                      <Text style={[styles.messageText, { color: isMe ? "#ffffff" : colors.text }]}>{msg.text}</Text>
                      <Text style={[styles.timestamp, isMe ? styles.timeMe : { color: colors.subText }]}>
                        {timeStr}
                      </Text>
                    </View>

                    {!isMe && canDelete && msg._id && (
                      <TouchableOpacity onPress={() => handleDeleteMessage(msg._id)} style={styles.deleteMsgBtn} activeOpacity={0.7}>
                        <Text style={styles.deleteMsgIcon}>🗑️</Text>
                      </TouchableOpacity>
                    )}
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
            placeholder="Post to room..."
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
  keyboardContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 12,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  headerInfo: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  groupSubtitle: {
    fontSize: 10,
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
  senderLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
    marginLeft: 6,
  },
  senderUser: {
    fontWeight: "400",
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
    borderWidth: 1,
    borderTopLeftRadius: 2,
  },
  messageText: {
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
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 24, 
    borderTopWidth: 1,
    alignItems: "center",
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 80,
  },
  sendBtn: {
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
  deleteMsgBtn: {
    padding: 6,
    opacity: 0.6,
  },
  deleteMsgIcon: {
    fontSize: 12,
    color: "#ef4444",
  },
});

export default GroupChat;
