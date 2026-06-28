const express = require("express");
const userRoutes = require("./userRoutes");
const postRoutes = require("./postRoutes");
const groupRoutes = require("./groupRoutes");
const statisticsRoutes = require("./statisticsRoutes");
const chatRoutes = require("./chatRoutes");
const dmRoutes = require("./dmRoutes");
const groupChatRoutes = require("./groupChatRoutes");
const uploadRoutes = require("./uploadRoutes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ message: "TraderNet API is running" });
});

router.use("/users", userRoutes);
router.use("/posts", postRoutes);
router.use("/groups", groupRoutes);
router.use("/statistics", statisticsRoutes);
router.use("/chat", chatRoutes);
router.use("/dm", dmRoutes);
router.use("/group-chat", groupChatRoutes);
router.use("/upload", uploadRoutes);

module.exports = router;
