import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Alert, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import SoundManager from "./src/utils/SoundManager";
import Login from "./src/screens/Login";
import Register from "./src/screens/Register";
import Feed from "./src/screens/Feed";
import Profile from "./src/screens/Profile";
import UsersList from "./src/screens/UsersList";
import GroupsList from "./src/screens/GroupsList";
import GroupDetails from "./src/screens/GroupDetails";
import Search from "./src/screens/Search";
import Chat from "./src/screens/Chat";
import Statistics from "./src/screens/Statistics";
import LearningHub from "./src/screens/LearningHub";
import DMsList from "./src/screens/DMsList";
import PrivateChat from "./src/screens/PrivateChat";
import GroupChat from "./src/screens/GroupChat";
import Navbar from "./src/components/Navbar";
import API, { setSession, LOCAL_IP } from "./src/api";
import io from "socket.io-client/dist/socket.io";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("Login");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState("");

  // Global Real-time connection states
  const socketRef = useRef(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [notification, setNotification] = useState(null);

  const slideAnim = useRef(new Animated.Value(-150)).current;

  // Preload audio engine once on mount
  useEffect(() => {
    SoundManager.preload();
  }, []);

  // Socket listener for live background updates
  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setPendingRequestsCount(0);
      setIncomingRequests([]);
      return;
    }

    const fetchRequests = async () => {
      try {
        const res = await API.get("/users/friends/requests");
        setPendingRequestsCount(res.data.length);
        setIncomingRequests(res.data);
      } catch (err) {
        console.error("Failed to load friend requests in App.js", err);
      }
    };
    fetchRequests();

    const socket = io(`http://${LOCAL_IP}:5000`);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinUserRoom", user._id);
    });

    socket.on("friendRequestReceived", (sender) => {
      setNotification({
        id: Date.now().toString(),
        title: "👥 New Friend Request",
        body: `@${sender.username} sent you a connection request!`,
        type: "friend_request"
      });
      SoundManager.joinGroup();
      setPendingRequestsCount((prev) => prev + 1);
      setIncomingRequests((prev) => {
        if (prev.some((r) => r._id === sender._id)) return prev;
        return [...prev, sender];
      });
    });

    socket.on("friendRequestCancelled", ({ senderId }) => {
      setPendingRequestsCount((prev) => Math.max(0, prev - 1));
      setIncomingRequests((prev) => prev.filter((r) => r._id !== senderId));
    });

    socket.on("friendRequestAccepted", ({ friendId }) => {
      setPendingRequestsCount((prev) => Math.max(0, prev - 1));
      setIncomingRequests((prev) => prev.filter((r) => r._id !== friendId));
    });

    socket.on("friendRequestRejected", ({ rejecterId }) => {
      setPendingRequestsCount((prev) => Math.max(0, prev - 1));
      setIncomingRequests((prev) => prev.filter((r) => r._id !== rejecterId));
    });

    socket.on("conversationUpdate", (updatedConv) => {
      const isSending = updatedConv.lastMessageSender === user._id;
      if (!isSending) {
        SoundManager.orderFilled();
        const isOnChat = currentScreen === "PrivateChat" && selectedConvId === updatedConv._id;
        if (!isOnChat) {
          const otherParticipant = updatedConv.participants?.find((p) => p._id !== user._id);
          setNotification({
            id: Date.now().toString(),
            title: `✉️ Message from @${otherParticipant?.username || "Trader"}`,
            body: updatedConv.lastMessageText,
            type: "message",
            data: { conversationId: updatedConv._id, partner: otherParticipant }
          });
        }
      }
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, token, currentScreen, selectedConvId]);

  useEffect(() => {
    if (notification) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 4,
      }).start();

      const timer = setTimeout(() => {
        handleDismissNotification();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleDismissNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setNotification(null);
    });
  };

  const handleNotificationClick = (notif) => {
    handleDismissNotification();
    if (notif.type === "friend_request") {
      setCurrentScreen("Profile");
    } else if (notif.type === "message" && notif.data) {
      setSelectedConvId(notif.data.conversationId);
      setSelectedPartner(notif.data.partner);
      setCurrentScreen("PrivateChat");
    }
  };

  // Theme support
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    SoundManager.themeToggle();
    setIsDarkMode((prev) => !prev);
  };

  const colors = {
    bg: isDarkMode ? "#0b0f19" : "#f8fafc",
    cardBg: isDarkMode ? "#151c2c" : "#ffffff",
    text: isDarkMode ? "#f3f4f6" : "#0f172a",
    subText: isDarkMode ? "#9ca3af" : "#64748b",
    border: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
    inputBg: isDarkMode ? "#1f293d" : "#f1f5f9",
    inputText: isDarkMode ? "#f3f4f6" : "#0f172a",
    primary: "#6366f1",
    primaryDark: "#4f46e5",
    accent: "#ec4899",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  };

  const handleLoginSuccess = (userToken, userData) => {
    setToken(userToken);
    setUser(userData);
    SoundManager.loginSuccess();
    setCurrentScreen("Feed");
  };

  const handleLogout = () => {
    SoundManager.logout();
    // Clear session memory
    setSession("", null);
    setToken(null);
    setUser(null);
    setSelectedGroupId(null);
    setSelectedConvId(null);
    setSelectedPartner(null);
    setSelectedTagFilter("");
    setCurrentScreen("Login");
  };

  // Start private chat session from click trigger
  const handleStartPrivateChat = async (partnerUser) => {
    if (!partnerUser || !partnerUser._id) return;
    if (partnerUser._id === user?._id) {
      Alert.alert("Notice", "Cannot message yourself.");
      return;
    }

    try {
      const response = await API.post("/dm", { recipientId: partnerUser._id });
      setSelectedConvId(response.data._id);
      setSelectedPartner(partnerUser);
      setCurrentScreen("PrivateChat");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to start private chat.");
    }
  };

  // State-based routing with optional navigation parameter (e.g. Group ID)
  const handleNavigate = (screen, param = null) => {
    if (param) {
      if (screen === "GroupDetails" || screen === "GroupChat") {
        setSelectedGroupId(param);
      } else if (screen === "PrivateChat") {
        setSelectedConvId(param.conversationId);
        setSelectedPartner(param.partner);
      } else if (screen === "Feed") {
        setSelectedTagFilter(param);
      }
    } else {
      if (screen === "Feed") {
        setSelectedTagFilter("");
      }
    }
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "Login":
        return (
          <Login
            onLoginSuccess={handleLoginSuccess}
            navigateToRegister={() => setCurrentScreen("Register")}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "Register":
        return (
          <Register
            navigateToLogin={() => setCurrentScreen("Login")}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "Feed":
        return (
          <Feed
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onStartPrivateChat={handleStartPrivateChat}
            theme={colors}
            isDarkMode={isDarkMode}
            initialTagFilter={selectedTagFilter}
            onClearTagFilter={() => setSelectedTagFilter("")}
            incomingRequests={incomingRequests}
            friendRequestsCount={pendingRequestsCount}
          />
        );
      case "Profile":
        return (
          <Profile
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onStartPrivateChat={handleStartPrivateChat}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "UsersList":
        return (
          <UsersList
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onStartPrivateChat={handleStartPrivateChat}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "GroupsList":
        return (
          <GroupsList
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onStartPrivateChat={handleStartPrivateChat}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "GroupDetails":
        return (
          <GroupDetails
            groupId={selectedGroupId}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onStartPrivateChat={handleStartPrivateChat}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "Search":
        return (
          <Search
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onStartPrivateChat={handleStartPrivateChat}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "Chat":
        return (
          <Chat
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "DMsList":
        return (
          <DMsList
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onOpenPrivateChat={(convId, partnerUser) => {
              setSelectedConvId(convId);
              setSelectedPartner(partnerUser);
              setCurrentScreen("PrivateChat");
            }}
            onOpenGroupChat={(groupId) => {
              setSelectedGroupId(groupId);
              setCurrentScreen("GroupChat");
            }}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "PrivateChat":
        return (
          <PrivateChat
            conversationId={selectedConvId}
            partner={selectedPartner}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "GroupChat":
        return (
          <GroupChat
            groupId={selectedGroupId}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "Statistics":
        return (
          <Statistics
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      case "LearningHub":
        return (
          <LearningHub
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
      default:
        return (
          <Login
            onLoginSuccess={handleLoginSuccess}
            navigateToRegister={() => setCurrentScreen("Register")}
            theme={colors}
            isDarkMode={isDarkMode}
          />
        );
    }
  };

  const showChrome = user && currentScreen !== "Login" && currentScreen !== "Register";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {showChrome && (
        <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
          <Text style={[styles.logo, { color: colors.text }]}>
            TraderNet <Text style={{ color: colors.primary }}>📈</Text>
          </Text>
          
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle} activeOpacity={0.7}>
              <Text style={{ fontSize: 20 }}>{isDarkMode ? "☀️" : "🌙"}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setCurrentScreen("Profile")} 
              style={[styles.avatar, { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Text style={styles.avatarText}>
                {user.fullName?.charAt(0).toUpperCase() || "T"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Floating real-time notification banner */}
      {notification && (
        <Animated.View style={[
          styles.notificationBanner,
          {
            backgroundColor: isDarkMode ? "rgba(21, 28, 44, 0.96)" : "rgba(255, 255, 255, 0.96)",
            borderColor: colors.primary,
            transform: [{ translateY: slideAnim }],
            shadowColor: colors.primary,
          }
        ]}>
          <TouchableOpacity
            style={styles.notificationTouchable}
            onPress={() => handleNotificationClick(notification)}
            activeOpacity={0.9}
          >
            <View style={styles.notificationHeader}>
              <Text style={[styles.notificationTitle, { color: colors.text }]}>{notification.title}</Text>
              <TouchableOpacity onPress={handleDismissNotification} style={styles.notificationClose}>
                <Text style={{ color: colors.subText, fontSize: 16 }}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.notificationBody, { color: colors.subText }]} numberOfLines={2}>
              {notification.body}
            </Text>
            <Text style={[styles.notificationHint, { color: colors.primary }]}>Click to view details</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>

      {showChrome && (
        <Navbar 
          currentScreen={currentScreen} 
          onNavigate={handleNavigate} 
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          friendRequestsCount={pendingRequestsCount}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    width: "100%",
    height: Platform.OS === "android" ? 56 + (RNStatusBar.currentHeight || 24) : 56,
    paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  logo: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  themeToggle: {
    padding: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  notificationBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 74 : 64,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 9999,
  },
  notificationTouchable: {
    width: "100%",
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  notificationClose: {
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBody: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  notificationHint: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
