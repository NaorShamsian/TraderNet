import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { getSessionUser } from "../api";

const Navbar = ({ onLogout, currentScreen, onNavigate }) => {
  const user = getSessionUser() || {};

  return (
    <View style={styles.headerContainer}>
      <View style={styles.navbar}>
        <Text style={styles.logo}>
          TraderNet <Text style={styles.trendIcon}>📈</Text>
        </Text>
        
        {user.username ? (
          <View style={styles.userContainer}>
            <View style={styles.userInfo}>
              <Text style={styles.fullName}>{user.fullName}</Text>
              <Text style={styles.username}>@{user.username}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {user.username && onNavigate ? (
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, currentScreen === "Feed" && styles.activeTab]}
            onPress={() => onNavigate("Feed")}
          >
            <Text style={[styles.tabText, currentScreen === "Feed" && styles.activeTabText]}>
              💬 Feed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, currentScreen === "UsersList" && styles.activeTab]}
            onPress={() => onNavigate("UsersList")}
          >
            <Text style={[styles.tabText, currentScreen === "UsersList" && styles.activeTabText]}>
              👥 Users
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, currentScreen === "Profile" && styles.activeTab]}
            onPress={() => onNavigate("Profile")}
          >
            <Text style={[styles.tabText, currentScreen === "Profile" && styles.activeTabText]}>
              👤 Profile
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: "100%",
    backgroundColor: "rgba(21, 28, 44, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  navbar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  logo: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f3f4f6",
  },
  trendIcon: {
    color: "#6366f1",
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  userInfo: {
    alignItems: "flex-end",
    marginRight: 12,
  },
  fullName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f3f4f6",
  },
  username: {
    fontSize: 11,
    color: "#9ca3af",
  },
  logoutBtn: {
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f3f4f6",
  },
  tabsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingVertical: 2,
    justifyContent: "space-around",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#6366f1",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
  },
  activeTabText: {
    color: "#6366f1",
  },
});

export default Navbar;
