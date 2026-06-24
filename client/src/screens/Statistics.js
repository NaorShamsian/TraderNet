import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from "react-native";
import API, { LOCAL_IP } from "../api";

const Statistics = ({ onLogout, onNavigate, theme, isDarkMode }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const colors = theme || {
    bg: isDarkMode ? "#0b0f19" : "#f8fafc",
    cardBg: isDarkMode ? "#151c2c" : "#ffffff",
    text: isDarkMode ? "#f3f4f6" : "#0f172a",
    subText: isDarkMode ? "#9ca3af" : "#64748b",
    border: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
    inputBg: isDarkMode ? "#1f293d" : "#f1f5f9",
    inputText: isDarkMode ? "#f3f4f6" : "#0f172a",
    primary: "#6366f1",
  };

  const fetchStats = async () => {
    try {
      const response = await API.get("/statistics");
      setStats(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load platform statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const openD3WebDashboard = async () => {
    const webUrl = `http://${LOCAL_IP}:5000/statistics.html`;
    try {
      const supported = await Linking.canOpenURL(webUrl);
      if (supported) {
        await Linking.openURL(webUrl);
      } else {
        Alert.alert("URL Error", `Cannot open web browser to ${webUrl}`);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to launch web browser.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.subText }]}>Compiling analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { postsPerGroup = [], usersPerGroup = [], summary = {} } = stats || {};

  // Find max values for chart scaling
  const maxPostCount = Math.max(...postsPerGroup.map((d) => d.count), 1);
  const maxUserCount = Math.max(...usersPerGroup.map((d) => d.count), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 TraderNet Analytics</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Database Metric Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.summaryNum, { color: colors.primary }]}>{summary.totalUsers || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>Total Users</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.summaryNum, { color: colors.primary }]}>{summary.totalPosts || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>Analyses</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.summaryNum, { color: colors.primary }]}>{summary.totalGroups || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>Active Rooms</Text>
          </View>
        </View>

        {/* Interactive Web Link Card */}
        <TouchableOpacity 
          style={[
            styles.webPromoCard, 
            { 
              backgroundColor: isDarkMode ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.06)", 
              borderColor: isDarkMode ? "rgba(99, 102, 241, 0.35)" : "rgba(99, 102, 241, 0.15)" 
            }
          ]} 
          onPress={openD3WebDashboard}
        >
          <Text style={[styles.promoTitle, { color: isDarkMode ? "#818cf8" : "#4f46e5" }]}>Interactive D3.js Charts ↗</Text>
          <Text style={[styles.promoDesc, { color: colors.subText }]}>
            Open the premium web dashboard containing dynamic animated SVG graphs rendered with D3.js.
          </Text>
          <Text style={[styles.webUrlText, { color: colors.primary }]}>http://{LOCAL_IP}:5000/statistics.html</Text>
        </TouchableOpacity>

        {/* Native Chart 1: Posts per Group */}
        <View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>📁 Posts per Trading Room</Text>
          {postsPerGroup.length === 0 ? (
            <Text style={[styles.emptyChartText, { color: colors.subText }]}>No posts available for analysis.</Text>
          ) : (
            <View style={styles.barChartContainer}>
              <View style={[styles.chartYAxis, { borderRightColor: colors.border }]}>
                <Text style={[styles.yAxisLabel, { color: colors.subText }]}>{maxPostCount}</Text>
                <Text style={[styles.yAxisLabel, { color: colors.subText }]}>{Math.round(maxPostCount / 2)}</Text>
                <Text style={[styles.yAxisLabel, { color: colors.subText }]}>0</Text>
              </View>
              <View style={styles.chartBarsArea}>
                {postsPerGroup.map((item, idx) => {
                  const percentage = Math.round((item.count / maxPostCount) * 100);
                  return (
                     <View key={idx} style={styles.barWrapper}>
                       <View style={[styles.barTrack, { backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(15, 23, 42, 0.03)" }]}>
                         <View style={[styles.barFill, { backgroundColor: colors.primary, height: `${percentage}%` }]} />
                       </View>
                       <Text style={[styles.barLabel, { color: colors.subText }]} numberOfLines={1}>
                         {item.groupName}
                       </Text>
                       <Text style={[styles.barValue, { color: colors.text }]}>{item.count}</Text>
                     </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Native Chart 2: Members per Group */}
        <View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>👥 Members per Trading Room</Text>
          {usersPerGroup.length === 0 ? (
            <Text style={[styles.emptyChartText, { color: colors.subText }]}>No active rooms for analysis.</Text>
          ) : (
            <View style={styles.barChartContainer}>
              <View style={[styles.chartYAxis, { borderRightColor: colors.border }]}>
                <Text style={[styles.yAxisLabel, { color: colors.subText }]}>{maxUserCount}</Text>
                <Text style={[styles.yAxisLabel, { color: colors.subText }]}>{Math.round(maxUserCount / 2)}</Text>
                <Text style={[styles.yAxisLabel, { color: colors.subText }]}>0</Text>
              </View>
              <View style={styles.chartBarsArea}>
                {usersPerGroup.map((item, idx) => {
                  const percentage = Math.round((item.count / maxUserCount) * 100);
                  return (
                    <View key={idx} style={styles.barWrapper}>
                       <View style={[styles.barTrack, { backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(15, 23, 42, 0.03)" }]}>
                        <View
                          style={[
                            styles.barFill,
                            styles.barFillSecondary,
                            { height: `${percentage}%` },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barLabel, { color: colors.subText }]} numberOfLines={1}>
                        {item.groupName}
                      </Text>
                      <Text style={[styles.barValue, { color: colors.text }]}>{item.count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  loadingText: {
    fontSize: 14,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  summaryNum: {
    fontSize: 22,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 4,
  },
  webPromoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6,
  },
  promoDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  webUrlText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 16,
  },
  emptyChartText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 20,
  },
  barChartContainer: {
    flexDirection: "row",
    height: 180,
  },
  chartYAxis: {
    width: 25,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 8,
    borderRightWidth: 1,
    paddingVertical: 10,
  },
  yAxisLabel: {
    fontSize: 9,
    fontWeight: "700",
  },
  chartBarsArea: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingLeft: 10,
  },
  barWrapper: {
    alignItems: "center",
    width: 50,
  },
  barTrack: {
    height: 120,
    width: 16,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
  },
  barFillSecondary: {
    backgroundColor: "#a855f7",
  },
  barLabel: {
    fontSize: 9,
    marginTop: 8,
    textAlign: "center",
    width: "100%",
  },
  barValue: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  },
  errorText: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    color: "#fb7185",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 13,
    textAlign: "center",
  },
});

export default Statistics;Statistics;
