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
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", createUser);
router.post("/register", createUser);
router.post("/login", loginUser);
router.get("/", getUsers);

// Put /me and /search before /:id so Express handles them correctly
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);
router.delete("/me", authMiddleware, deleteMe);
router.get("/search", authMiddleware, searchUsers);

router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
