import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import io from "socket.io-client/dist/socket.io";
import API, { getSessionUser, LOCAL_IP } from "../api";
import SoundManager from "../utils/SoundManager";

const DMsList = ({ onLogout, onNavigate, onOpenPrivateChat, onOpenGroupChat, theme, isDarkMode }) => {
  const [dmConversations, setDmConversations]   = useState([]);
  const [myGroups, setMyGroups]                 = useState([]);
  const [recentChats, setRecentChats]           = useState([]);
  const [friends, setFriends]                   = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [error, setError]                       = useState("");

  const socketRef  = useRef(null);
  const currentUser = getSessionUser() || {};

  const colors = theme || {
    bg:       "#f8fafc",
    cardBg:   "#ffffff",
    text:     "#0f172a",
    subText:  "#64748b",
    border:   "rgba(15, 23, 42, 0.08)",
    inputBg:  "#f1f5f9",
    inputText:"#0f172a",
    primary:  "#6366f1",
    accent:   "#ec4899",
  };

  // ─── helpers ──────────────────────────────────────────────────────────────

  const getPartnerUser = (conv) => {
    if (!conv || !conv.participants) return {};
    return conv.participants.find(
      (p) => p._id !== currentUser._id && p !== currentUser._id
    ) || {};
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now   = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Merge DMs + groups into one sorted list
  const buildRecentChats = (dms, groups) => {
    const uid = currentUser._id;

    const dmItems = dms.map((conv) => {
      const partner = conv.participants?.find(
        (p) => (p._id || p) !== uid
      ) || {};
      return {
        type:        "dm",
        id:          conv._id,
        key:         `dm_${conv._id}`,
        name:        partner.fullName || "Trader",
        username:    partner.username || "—",
        lastMsg:     conv.lastMessageText || "No messages yet",
        lastAt:      conv.lastMessageAt || conv.updatedAt || 0,
        isSentByMe:  conv.lastMessageSender === uid ||
                     (conv.lastMessageSender && conv.lastMessageSender._id === uid),
        convData:    conv,
        partner,
      };
    });

    const groupItems = groups.map((g) => ({
      type:       "group",
      id:         g._id,
      key:        `group_${g._id}`,
      name:       g.name,
      topic:      g.topic || "",
      lastMsg:    g.lastMessageText || "No recent messages",
      lastAt:     g.lastMessageAt || g.updatedAt || 0,
      isSentByMe: false,
      groupData:  g,
    }));

    const merged = [...dmItems, ...groupItems];
    merged.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
    return merged;
  };

  // ─── data fetching ────────────────────────────────────────────────────────

  const fetchAll = async () => {
    try {
      const [dmsRes, groupsRes, friendsRes] = await Promise.all([
        API.get("/dm"),
        API.get("/groups"),
        API.get("/users/friends/list"),
      ]);

      const uid          = currentUser._id;
      const joinedGroups = groupsRes.data.filter((g) =>
        g.members.some((m) => (m._id || m) === uid)
      );

      setDmConversations(dmsRes.data);
      setMyGroups(joinedGroups);
      setFriends(friendsRes.data);
      setRecentChats(buildRecentChats(dmsRes.data, joinedGroups));
      setError("");
    } catch (err) {
      setError("Failed to load conversations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAll();

    const socket = io(`http://${LOCAL_IP}:5000`);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinUserRoom", currentUser._id);
    });

    // When a DM gets a new message, bubble it to the top
    socket.on("conversationUpdate", (updatedConv) => {
      setDmConversations((prev) => {
        const filtered = prev.filter((c) => c._id !== updatedConv._id);
        const next = [updatedConv, ...filtered];
        setRecentChats((prevChats) => {
          const groups = prevChats.filter((c) => c.type === "group").map((c) => c.groupData);
          return buildRecentChats(next, groups);
        });
        return next;
      });
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // ─── navigation helpers ───────────────────────────────────────────────────

  const openItem = (item) => {
    if (item.type === "dm") {
      onOpenPrivateChat && onOpenPrivateChat(item.id, item.partner);
    } else {
      SoundManager.tabSwitch();
      onOpenGroupChat && onOpenGroupChat(item.id);
    }
  };

  const openGroupById = (groupId) => {
    SoundManager.tabSwitch();
    onOpenGroupChat && onOpenGroupChat(groupId);
  };

  // ─── avatar helpers ───────────────────────────────────────────────────────

  const dmInitial  = (item) => item.name?.charAt(0).toUpperCase() || "T";
  const grpInitial = (item) => item.name?.charAt(0).toUpperCase() || "G";

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.headerTitleRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>💬 Messages</Text>
        <Text style={[styles.screenSubtitle, { color: colors.subText }]}>
          Recent DMs &amp; Group Chats
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Quick-Access Group Chips */}
      {!loading && myGroups.length > 0 && (
        <View style={[styles.groupsBarContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.groupsBarTitle, { color: colors.subText }]}>MY ROOMS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {myGroups.map((g) => (
              <TouchableOpacity
                key={g._id}
                style={[styles.groupChip, {
                  backgroundColor: isDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
                  borderColor: colors.primary,
                }]}
                onPress={() => openGroupById(g._id)}
                activeOpacity={0.75}
              >
                <View style={[styles.groupChipIcon, { backgroundColor: colors.primary }]}>
                  <Text style={styles.groupChipIconText}>{g.name?.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={[styles.groupChipName, { color: colors.text }]} numberOfLines={1}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Quick-Access Friends Row (for starting new DMs) */}
      {!loading && friends.length > 0 && (
        <View style={[styles.friendsBarContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.friendsBarTitle, { color: colors.subText }]}>QUICK DM</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {friends.map((friend) => (
              <TouchableOpacity
                key={friend._id}
                style={styles.friendBubble}
                onPress={async () => {
                  try {
                    const response = await API.post("/dm", { recipientId: friend._id });
                    onOpenPrivateChat && onOpenPrivateChat(response.data._id, friend);
                  } catch (err) {
                    console.error("Failed to start quick DM", err);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.friendAvatar, { backgroundColor: colors.accent }]}>
                  <Text style={styles.friendAvatarText}>
                    {friend.fullName?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.friendBubbleName, { color: colors.text }]} numberOfLines={1}>
                  @{friend.username}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Recent Chats List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.subText }]}>Loading conversations...</Text>
        </View>
      ) : (
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
          {recentChats.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No chats yet 🕊️</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subText }]}>
                Connect with traders or join a room to start chatting!
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => onNavigate("Search")}
              >
                <Text style={styles.actionBtnText}>Find Traders &amp; Groups 👥</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.chatList}>
              {recentChats.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.chatCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  onPress={() => openItem(item)}
                  activeOpacity={0.75}
                >
                  {/* Avatar */}
                  <View style={[
                    styles.avatar,
                    { backgroundColor: item.type === "dm" ? colors.primary : colors.accent },
                  ]}>
                    <Text style={styles.avatarText}>
                      {item.type === "dm" ? dmInitial(item) : grpInitial(item)}
                    </Text>
                  </View>

                  {/* Content */}
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={styles.nameLine}>
                        <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.type === "group" && (
                          <View style={[styles.typeBadge, { backgroundColor: isDarkMode ? "rgba(236,72,153,0.18)" : "rgba(236,72,153,0.10)" }]}>
                            <Text style={[styles.typeBadgeText, { color: colors.accent }]}>ROOM</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.msgTime, { color: colors.subText }]}>
                        {formatDate(item.lastAt)}
                      </Text>
                    </View>
                    <Text style={[styles.lastMsg, { color: colors.subText }]} numberOfLines={1}>
                      {item.type === "dm" && item.isSentByMe ? "You: " : ""}
                      {item.lastMsg}
                    </Text>
                    {item.type === "dm" && item.username && (
                      <Text style={[styles.username, { color: colors.subText }]}>
                        @{item.username}
                      </Text>
                    )}
                    {item.type === "group" && item.topic && (
                      <Text style={[styles.username, { color: colors.subText }]}>
                        #{item.topic}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerTitleRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  screenSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    color: "#fb7185",
    padding: 10,
    borderRadius: 8,
    margin: 16,
    textAlign: "center",
  },
  // ── Group Chips Bar ──
  groupsBarContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  groupsBarTitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    gap: 6,
  },
  groupChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  groupChipIconText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  groupChipName: {
    fontSize: 11,
    fontWeight: "600",
    maxWidth: 80,
  },
  // ── Friends Quick DM Bar ──
  friendsBarContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  friendsBarTitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  friendBubble: {
    alignItems: "center",
    marginRight: 14,
    width: 56,
  },
  friendAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 3,
  },
  friendAvatarText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  friendBubbleName: {
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
  // ── Empty ──
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 240,
    marginBottom: 16,
  },
  actionBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  // ── Chat List ──
  chatList: {
    gap: 10,
  },
  chatCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
    marginRight: 8,
  },
  chatName: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  msgTime: {
    fontSize: 10,
    flexShrink: 0,
  },
  lastMsg: {
    fontSize: 12,
    lineHeight: 16,
  },
  username: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default DMsList;
