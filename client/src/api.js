import axios from "axios";

// הגדרת כתובת הרשת המקומית של המחשב המשמש כשרת.
// LOCAL IP ADDRESS
// הערה חשובה להצגה למרצה: בבדיקת האפליקציה בטלפון פיזי באותה רשת אלחוטית,
// אנו חייבים להשתמש בכתובת הרשת המקומית של המחשב ולא בכתובת מקומית רגילה.
// Localhost is blocked on physical phones, must use computer IP
export const LOCAL_IP = "192.168.1.89"; // כתובת הרשת המקומית של המחשב שמריץ את השרת

// קביעת כתובות הרשת עבור ממשק התכנות, החיבור בזמן אמת וכתובת השרת הכללית.
// API / WebSockets / Web URL
// המערכת מנסה לקרוא ממשתני סביבה ואם אינם קיימים, משתמשת כברירת מחדל בכתובת הרשת המקומית ובפורט 5000.
// Fallback: local IP and port 5000
export const BASE_API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:5000/api`;
export const BASE_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || `http://${LOCAL_IP}:5000`;
export const BASE_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || `http://${LOCAL_IP}:5000`;

// יצירת מופע מותאם אישית מבוסס אקסיוס המיועד לכל קריאות השרת של האפליקציה.
// Axios instance creation
// כותרות הבקשה המוגדרות פה נועדו לעקוף אזהרות פופ-אפ של שירותי פרוקסי במידה ומשתמשים בהם.
// Bypass headers for ngrok tunnel stability
const API = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    "Bypass-Tunnel-Reminder": "true",
    "ngrok-skip-browser-warning": "true",
  },
});

// ניהול זיכרון המפגש של המשתמש בצד הלקוח.
// Session state storage (Token & User info)
// המשתנים נשמרים בזיכרון העבודה של האפליקציה למשך זמן הריצה הנוכחי.
// Saved in RAM during active app run
let sessionToken = "";
let sessionUser = null;

// פונקציה לעדכון פרטי המפגש לאחר כניסה או הרשמה מוצלחת.
// Login / Register success handler
export const setSession = (token, user) => {
  sessionToken = token;
  sessionUser = user;
};

// פונקציות עזר לשליפת מזהה המשתמש ופרטי המשתמש הנוכחי במקומות אחרים באפליקציה.
// Token & User session getters
export const getSessionToken = () => sessionToken;
export const getSessionUser = () => sessionUser;

// הגדרת מיירט בקשות של הלקוח.
// Request Interceptor (Axios)
// תפקיד המיירט: לתפוס כל בקשת שרת יוצאת, למשל שליפת פוסטים או שליחת הודעה,
// ולבדוק אם קיים טוקן בזיכרון. אם כן, הוא מזרק באופן אוטומטי כותרת אבטחה.
// If session token exists, auto-injects Bearer Authorization JWT
// בדרך זו, אין צורך להעביר ידנית את הטוקן בכל קריאת שרת נפרדת באפליקציה.
// Avoids manual authorization headers in every API call
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
