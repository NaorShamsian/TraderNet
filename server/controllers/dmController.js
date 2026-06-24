const Conversation = require("../models/Conversation");
const DirectMessage = require("../models/DirectMessage");
const mongoose = require("mongoose");

// Get all conversations for currently logged-in user
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ lastMessageAt: -1 })
      .populate("participants", "fullName username email bio role")
      .populate("lastMessageSender", "fullName username");

    return res.status(200).json(conversations);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

// Get direct messages history in a conversation (last 100 messages)
const getDirectMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Verify user is participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to access this chat" });
    }

    const messages = await DirectMessage.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate("sender", "fullName username");

    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// Create a new conversation or return existing
const createConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const senderId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ message: "Recipient ID is required" });
    }

    if (recipientId.toString() === senderId.toString()) {
      return res.status(400).json({ message: "Cannot start a conversation with yourself" });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: "Invalid recipient id" });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
        lastMessageText: "Chat started",
        lastMessageAt: Date.now(),
        lastMessageSender: senderId,
      });
    }

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "fullName username email bio role");

    return res.status(201).json(populatedConversation);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create or fetch conversation" });
  }
};

module.exports = {
  getConversations,
  getDirectMessages,
  createConversation,
};
