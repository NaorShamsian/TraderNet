import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Login from "./src/screens/Login";
import Register from "./src/screens/Register";
import Feed from "./src/screens/Feed";
import Profile from "./src/screens/Profile";
import UsersList from "./src/screens/UsersList";
import { setSession } from "./src/api";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("Login");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const handleLoginSuccess = (userToken, userData) => {
    setToken(userToken);
    setUser(userData);
    setCurrentScreen("Feed");
  };

  const handleLogout = () => {
    // Clear session memory
    setSession("", null);
    setToken(null);
    setUser(null);
    setCurrentScreen("Login");
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "Login":
        return (
          <Login
            onLoginSuccess={handleLoginSuccess}
            navigateToRegister={() => setCurrentScreen("Register")}
          />
        );
      case "Register":
        return (
          <Register
            navigateToLogin={() => setCurrentScreen("Login")}
          />
        );
      case "Feed":
        return (
          <Feed
            onLogout={handleLogout}
            onNavigate={setCurrentScreen}
          />
        );
      case "Profile":
        return (
          <Profile
            onLogout={handleLogout}
            onNavigate={setCurrentScreen}
          />
        );
      case "UsersList":
        return (
          <UsersList
            onLogout={handleLogout}
            onNavigate={setCurrentScreen}
          />
        );
      default:
        return (
          <Login
            onLoginSuccess={handleLoginSuccess}
            navigateToRegister={() => setCurrentScreen("Register")}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
});
