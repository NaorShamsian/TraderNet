import axios from "axios";

// IMPORTANT FOR PHYSICAL SMARTPHONE TESTING:
// Replace this with your computer's local IP address (e.g. 192.168.1.15) so your smartphone can connect!
// On Windows: run 'ipconfig' in command prompt to find your IPv4 Address.
// On Mac/Linux: run 'ifconfig' or check your network preferences.
export const LOCAL_IP = "192.168.1.89"; // Auto-configured to match your computer's IP!

const API = axios.create({
  baseURL: `http://${LOCAL_IP}:5000/api`,
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
