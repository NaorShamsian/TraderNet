# TraderNet 📈

TraderNet is a high-fidelity, full-stack social trading network built with **Node.js/Express MVC** on the backend and **React Native (Expo)** on the client, utilizing a **MongoDB** database for storage and **Socket.io** for real-time market discussions.

This application is designed specifically for traders to share setups, form trading rooms (groups), conduct technical analysis, and interact with peers in real-time.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account or local MongoDB instance (v6.0+)
- Expo Go app on your physical smartphone or an iOS/Android simulator

### 1. Environment Configuration

Create a `.env` file in the `server` directory with the following variables:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

### 2. Seeding the Database
To populate the database with realistic traders, public/private groups, group memberships, posts, comments, likes, and chat logs, run the seeding command:
```bash
# Navigate to server directory
cd server

# Run the seeding script
npm run seed
```
> **Note**: The seeding script deletes any existing data and populates clean, rich mockup entries. If Atlas fails due to IP whitelisting constraints, the seed script and backend will **automatically fall back gracefully to a local MongoDB instance** (`mongodb://127.0.0.1:27017/tradernet`).

### 3. Running the Express Backend Server
Start the backend server in development mode (hot reloading with `nodemon`):
```bash
# Start backend server
npm run dev
```
The server will boot on `http://localhost:5000` (or your configured port).
* Access the D3.js statistics dashboard at: `http://localhost:5000/statistics.html`
* Access the jQuery AJAX post search demo at: `http://localhost:5000/jquery-demo.html`

### 4. Running the React Native Client
Configure the server IP in `client/src/api.js`:
```javascript
// Replace this with your computer's local IPv4 Address (run 'ipconfig' on Windows)
export const LOCAL_IP = "192.168.1.89"; 
```
Boot the Expo development client:
```bash
# Navigate to client directory
cd client

# Start Expo bundler
npm run start
```
Scan the QR code with your **Expo Go** app to test live on a physical smartphone or run a simulator!

---

## 🛠️ Technology Stack
* **Server (MVC)**: Node.js, Express, Mongoose, JWT (jsonwebtoken), bcryptjs, Socket.io
* **Client (Mobile)**: React Native, Expo, Axios, Socket.io-client, PanResponder (drawing gestures)
* **Database**: MongoDB (Atlas / Local Mongoose)
* **Web Isolated Views**: jQuery (Ajax), D3.js (Data-Driven SVG graphs)

---

## 📋 Features Checklist

### 1. MVC Backend & Models
* **MVC Structure**: Verified separation across `models/`, `controllers/`, `routes/`, and `middleware/`.
* **Three Core Models**:
  - `User`: Username, email, fullName, hashed password, role, bio.
  - `Post`: Content text, optional image, likes list, comments list, tags list, and optional reference to a `Group`.
  - `Group`: Name, topic, privacy setting, creator, admin, members list, and pending requests list.
  - `Message`: Persistent historical log schema for global chat messages.

### 2. Full CRUD Operations
* **Users**: Register/login, forgot password resets (supports Email & SMS 6-digit verification code dispatches), view profile, edit profile, and delete account.
* **Posts**: Create posts, edit own posts, delete own posts, list posts (filtered by group privacy), and search posts.
* **Groups**: Create public/private groups, list groups, search groups, update/delete group (admin only), join/leave group, and process private group member approvals.

### 3. Robust Permissions & Security
* **JWT Authentication**: Secured private routes with token verification middleware.
* **Privacy Filtering**: Non-group members are restricted from viewing posts published inside private groups.
* **Role Permissions**: Group creators/admins have exclusive administrative access to update groups, delete groups, and approve/reject pending member join requests.

### 4. Advanced Real-Time Features
* **Live Chat Desk**: Instant global chat room utilizing Socket.io. Historical messages are fetched from MongoDB, new messages are broadcast live, and conversations scroll to the bottom automatically.
* **Password Resets**: Recovers passwords by triggering a 6-digit numeric verification PIN sent over Email (simulates SMTP Nodemailer) or mobile phone SMS (simulates Twilio API gateway) with full terminal debug logging.
* **Dynamic Statistics**: Backend aggregates posts per group, users per group, and posts per month via Mongoose pipelines. The statistics are rendered visually in both mobile SVG-like graphs and a dynamic D3.js browser dashboard.

---

## 🎓 React Native Architecture Adaptations

Since this is a modern React Native mobile application rather than a browser-based DOM application, the web-only course requirements were adapted into appropriate mobile equivalents:

### 1. jQuery / AJAX Requirement
* **Adaptation**: Mobile React Native clients communicate using native HTTP APIs (implemented via `fetch`/`axios` with Bearer headers) instead of browser-DOM jQuery scripts.
* **Demonstration**: To meet the specific course requirement, a separate standalone demo page was added at `server/public/jquery-demo.html`. This page features a demo login panel and a post search input that triggers actual **jQuery $.ajax** requests to the backend API, displaying results dynamically.

### 2. D3.js Charts Requirement
* **Adaptation**: Rendering unstable canvas or browser-only D3 DOM elements inside native React Native screens can cause rendering blocks.
* **Demonstration**: 
  - On the client, we built a beautiful, stable **Native Statistics screen** that renders live SVG-like bar charts using flex grids and styles.
  - On the server, we built a standalone dashboard at `server/public/statistics.html` utilizing **D3.js (v7)**. This dashboard pulls live data from the aggregated `/api/statistics` endpoint to render two stunning interactive charts: a bar chart representing "Posts per Group" with hover tooltips, and a donut chart representing "Members per Group".

### 3. CSS3 Styling Requirement
* **Adaptation**: React Native utilizes a custom flex-based styling engine rather than browser CSS3 stylesheets. We implemented visual equivalents for advanced CSS3 features:
  - `text-shadow`: Rendered using `textShadowColor`, `textShadowOffset`, and `textShadowRadius` in style headers.
  - `border-radius`: Applied via `borderRadius` properties on cards and inputs.
  - `transition`/`animation`: Handled smoothly via the native **Animated API** (e.g. for seek bars and modals).
  - `multiple-columns`: Implemented via flexbox row grids (`flexDirection: "row"` and `flexWrap: "wrap"`).

### 4. Video & Canvas Requirements
* **Video**: To avoid heavy external compilation dependencies, we built a premium custom **Video Lesson player** inside the `LearningHub` tab. It features animated seek progress bars, play/pause toggles, volume sliders, time indicators, and video course selectors.
* **Canvas**: We implemented an interactive **Stock Drawing Chart Canvas** using the React Native `PanResponder` API. Traders can tap and drag touch gestures directly over candlestick charts to draw key support levels (green dashed lines) or resistance levels (red dashed lines) in real-time, complete with custom labels and a clear drawings option.
