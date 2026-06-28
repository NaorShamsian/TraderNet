const express = require("express");
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  getMe,
  updateMe,
  deleteMe,
  searchUsers,
  forgotPassword,
  resetPassword,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getMeDigest,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.post("/", createUser);
router.post("/register", createUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/", authMiddleware, getUsers);

// Put /me and /search before /:id so Express handles them correctly
router.get("/me/digest", authMiddleware, getMeDigest);
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);
router.delete("/me", authMiddleware, deleteMe);
router.get("/search", authMiddleware, searchUsers);

// Friends routes
router.get("/friends/list", authMiddleware, getFriends);
router.get("/friends/requests", authMiddleware, getFriendRequests);
router.post("/friends/request/:id", authMiddleware, sendFriendRequest);
router.post("/friends/cancel/:id", authMiddleware, cancelFriendRequest);
router.post("/friends/accept/:id", authMiddleware, acceptFriendRequest);
router.post("/friends/reject/:id", authMiddleware, rejectFriendRequest);
router.delete("/friends/remove/:id", authMiddleware, removeFriend);

router.get("/:id", authMiddleware, getUserById);
router.put("/:id", authMiddleware, adminMiddleware, updateUser);
router.delete("/:id", authMiddleware, adminMiddleware, deleteUser);

module.exports = router;

