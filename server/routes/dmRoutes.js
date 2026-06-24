const express = require("express");
const {
  getConversations,
  getDirectMessages,
  createConversation,
} = require("../controllers/dmController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getConversations);
router.post("/", authMiddleware, createConversation);
router.get("/:conversationId/messages", authMiddleware, getDirectMessages);

module.exports = router;
