import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";
import API from "../api";
import Navbar from "../components/Navbar";

const UsersList = ({ onLogout, onNavigate }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search parameters
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState(""); // "" | "user" | "admin"

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("/users/search", {
        params: {
          username: username.trim(),
          fullName: fullName.trim(),
          role: role || undefined,
        },
      });
      setUsers(response.data);
    } catch (err) {
      setError("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on mount
    fetchUsers();
  }, [role]); // Automatically fetch when role toggle changes

  const handleSearchSubmit = () => {
    fetchUsers();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Navbar onLogout={onLogout} currentScreen="UsersList" onNavigate={onNavigate} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Search Panel */}
        <View style={styles.searchPanel}>
          <Text style={styles.panelTitle}>Search Directory 👥</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Username"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Full Name"
              placeholderTextColor="#9ca3af"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Role selector row */}
          <Text style={styles.roleLabel}>Filter by Role:</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, role === "" && styles.roleBtnActive]}
              onPress={() => setRole("")}
            >
              <Text style={[styles.roleBtnText, role === "" && styles.roleBtnTextActive]}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, role === "user" && styles.roleBtnActive]}
              onPress={() => setRole("user")}
            >
              <Text style={[styles.roleBtnText, role === "user" && styles.roleBtnTextActive]}>User</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, role === "admin" && styles.roleBtnActive]}
              onPress={() => setRole("admin")}
            >
              <Text style={[styles.roleBtnText, role === "admin" && styles.roleBtnTextActive]}>Admin</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
            <Text style={styles.searchBtnText}>Search Users</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Loading Spinner */}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loaderText}>Searching traders...</Text>
          </View>
        ) : null}

        {/* Empty State */}
        {!loading && users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users matched your search criteria 🔍</Text>
          </View>
        ) : null}

        {/* User Card Stream */}
        {!loading && users.length > 0 ? (
          <View style={styles.usersList}>
            {users.map((user) => (
              <View key={user._id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user.fullName?.charAt(0).toUpperCase() || "U"}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.fullName}>{user.fullName}</Text>
                      <View style={[styles.roleTag, user.role === "admin" && styles.roleTagAdmin]}>
                        <Text style={[styles.roleTagText, user.role === "admin" && styles.roleTagTextAdmin]}>
                          {user.role}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.username}>@{user.username}</Text>
                    {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  searchPanel: {
    backgroundColor: "rgba(21, 28, 44, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: "100%",
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f3f4f6",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
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
    fontSize: 14,
  },
  halfInput: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 8,
    fontWeight: "600",
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    backgroundColor: "#1f293d",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  roleBtnActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  roleBtnText: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "600",
  },
  roleBtnTextActive: {
    color: "#ffffff",
  },
  searchBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  errorText: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    color: "#fb7185",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: "center",
  },
  loader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loaderText: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 10,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    backgroundColor: "rgba(21, 28, 44, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 16,
  },
  userHeader: {
    flexDirection: "row",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f3f4f6",
  },
  roleTag: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleTagAdmin: {
    backgroundColor: "rgba(236, 72, 153, 0.1)",
    borderColor: "rgba(236, 72, 153, 0.2)",
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366f1",
    textTransform: "uppercase",
  },
  roleTagTextAdmin: {
    color: "#ec4899",
  },
  username: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  bio: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 6,
    lineHeight: 16,
  },
});

export default UsersList;
