import React, { useRef, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, Animated } from "react-native";
import SoundManager from "../utils/SoundManager";

const Navbar = ({ currentScreen, onNavigate, isDarkMode, friendRequestsCount }) => {
  const tabs = [
    { id: "Feed", label: "Home", icon: "🏠" },
    { id: "GroupsList", label: "Rooms", icon: "📁" },
    { id: "DMsList", label: "Messages", icon: "💬" },
    { id: "Search", label: "Search", icon: "🔍" },
    { id: "Profile", label: "Profile", icon: "👤" },
  ];

  // Dynamic colors
  const activeColor = "#6366f1";
  const inactiveColor = isDarkMode ? "#9ca3af" : "#64748b";
  const borderTopColor = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";
  const backgroundColor = isDarkMode ? "#151c2c" : "#ffffff";

  // Per-tab scale animations for press feedback
  const scales = useRef(tabs.map(() => new Animated.Value(1))).current;

  // Animated active indicator — horizontal translateX
  const getActiveIndex = () => {
    const idx = tabs.findIndex(
      (tab) =>
        currentScreen === tab.id ||
        (tab.id === "GroupsList" && currentScreen === "GroupDetails") ||
        (tab.id === "DMsList" && (currentScreen === "PrivateChat" || currentScreen === "GroupChat"))
    );
    return idx >= 0 ? idx : 0;
  };

  const indicatorX = useRef(new Animated.Value(getActiveIndex())).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: getActiveIndex(),
      useNativeDriver: true,
      speed: 18,
      bounciness: 5,
    }).start();
  }, [currentScreen]);

  const handlePress = (tab, idx) => {
    SoundManager.tabSwitch();

    // Pop scale animation
    Animated.sequence([
      Animated.spring(scales[idx], { toValue: 0.82, useNativeDriver: true, speed: 80, bounciness: 2 }),
      Animated.spring(scales[idx], { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 8 }),
    ]).start();

    onNavigate(tab.id);
  };

  return (
    <View style={[styles.bottomBar, { backgroundColor, borderTopColor }]}>
      {tabs.map((tab, idx) => {
        const isActive =
          currentScreen === tab.id ||
          (tab.id === "GroupsList" && currentScreen === "GroupDetails") ||
          (tab.id === "DMsList" && (currentScreen === "PrivateChat" || currentScreen === "GroupChat"));

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => handlePress(tab, idx)}
            activeOpacity={1}
          >
            <Animated.View
              style={[
                styles.tabInner,
                { transform: [{ scale: scales[idx] }] },
                isActive && {
                  backgroundColor: isDarkMode
                    ? "rgba(99, 102, 241, 0.15)"
                    : "rgba(99, 102, 241, 0.08)",
                  borderRadius: 10,
                },
              ]}
            >
              <View>
                <Text style={[styles.icon, { color: isActive ? activeColor : inactiveColor }]}>
                  {tab.icon}
                </Text>
                {tab.id === "Profile" && friendRequestsCount > 0 && (
                  <View style={[styles.badgeContainer, { borderColor: backgroundColor }]}>
                    <Text style={styles.badgeText}>{friendRequestsCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color: isActive ? activeColor : inactiveColor }]}>
                {tab.label}
              </Text>
              {/* Active pill dot */}
              {isActive && (
                <View style={[styles.activeDot, { backgroundColor: activeColor }]} />
              )}
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: "row",
    width: "100%",
    height: Platform.OS === "ios" ? 90 : 88,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 26 : 24,
    justifyContent: "space-around",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  tab: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 44,
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "800",
  },
});

export default Navbar;
