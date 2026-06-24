const express = require("express");
const { getGroupMessages } = require("../controllers/groupChatController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:groupId", authMiddleware, getGroupMessages);

module.exports = router;
