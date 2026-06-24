const express = require("express");
const { getChatMessages } = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getChatMessages);

module.exports = router;
