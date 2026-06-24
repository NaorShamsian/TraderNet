const express = require("express");
const {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  addComment,
  searchPosts,
} = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createPost);
router.get("/", authMiddleware, getPosts);

// Mount search route before dynamic id route
router.get("/search", authMiddleware, searchPosts);

router.get("/:id", authMiddleware, getPostById);
router.put("/:id", authMiddleware, updatePost);
router.delete("/:id", authMiddleware, deletePost);
router.put("/:id/like", authMiddleware, likePost);
router.post("/:id/comments", authMiddleware, addComment);

module.exports = router;
