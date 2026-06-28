import axios from "axios";

// IMPORTANT FOR PHYSICAL SMARTPHONE TESTING:
// Replace this with your computer's local IP address (e.g. 192.168.1.15) so your smartphone can connect!
// On Windows: run 'ipconfig' in command prompt to find your IPv4 Address.
// On Mac/Linux: run 'ifconfig' or check your network preferences.
export const LOCAL_IP = "192.168.1.89"; // Auto-configured to match your computer's IP!

// Resolve URLs dynamically from environment variables, falling back to local IP for standard local dev
export const BASE_API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:5000/api`;
export const BASE_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || `http://${LOCAL_IP}:5000`;
export const BASE_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || `http://${LOCAL_IP}:5000`;

const API = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    "Bypass-Tunnel-Reminder": "true",
    "ngrok-skip-browser-warning": "true",
  },
});

// Session memory storage fallback (cleaner and Expo-safe without external async libraries)
let sessionToken = "";
let sessionUser = null;

export const setSession = (token, user) => {
  sessionToken = token;
  sessionUser = user;
};

export const getSessionToken = () => sessionToken;
export const getSessionUser = () => sessionUser;

// Automatically inject Bearer JWT auth token into request headers
API.interceptors.request.use(
  (config) => {
    if (sessionToken) {
      config.headers.Authorization = `Bearer ${sessionToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;
