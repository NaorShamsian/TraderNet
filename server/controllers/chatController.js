const Message = require("../models/Message");

const getChatMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: 1 })
      .limit(100)
      .populate("sender", "fullName username");

    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch chat history" });
  }
};

module.exports = { getChatMessages };
