const express = require("express");
const userRoutes = require("./userRoutes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ message: "TraderNet API is running" });
});

router.use("/users", userRoutes);

module.exports = router;
