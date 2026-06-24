const Group = require("../models/Group");
const GroupMessage = require("../models/GroupMessage");
const mongoose = require("mongoose");

// Get group messages history (last 100 messages)
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Verify user is a member of the group, or is the site admin
    const isMember = group.members.some(
      (m) => m.toString() === userId.toString()
    );
    const isSiteAdmin = req.user.role === "admin";

    if (!isMember && !isSiteAdmin) {
      return res.status(403).json({ message: "Must be a member to access group chat" });
    }

    const messages = await GroupMessage.find({ group: groupId })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate("sender", "fullName username");

    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch group messages" });
  }
};

module.exports = {
  getGroupMessages,
};
