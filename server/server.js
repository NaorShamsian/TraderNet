const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const socketIo = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");
const DirectMessage = require("./models/DirectMessage");
const GroupMessage = require("./models/GroupMessage");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join the global room
    socket.on("joinGlobal", () => {
      console.log(`Socket ${socket.id} joined global room`);
      socket.join("global");
    });

    // Listen for new messages
    socket.on("sendMessage", async (data) => {
      try {
        const { senderId, text } = data;
        if (!senderId || !text || !text.trim()) return;

        // Create and save message in MongoDB
        const newMessage = await Message.create({
          sender: senderId,
          text: text.trim(),
        });

        // Fetch populated sender details
        const populatedMessage = await Message.findById(newMessage._id).populate(
          "sender",
          "fullName username"
        );

        // Broadcast live to all users in the global room
        io.to("global").emit("newMessage", populatedMessage);
      } catch (error) {
        console.error("Socket error processing message:", error);
      }
    });

    // Listen for delete message (Admin only)
    socket.on("deleteMessage", async (data) => {
      try {
        const { messageId, adminUserId } = data;
        if (!messageId || !adminUserId) return;

        // Verify admin status
        const User = require("./models/User");
        const user = await User.findById(adminUserId);
        if (user && user.role === "admin") {
          await Message.findByIdAndDelete(messageId);
          // Broadcast deletion in real-time
          io.to("global").emit("messageDeleted", messageId);
        }
      } catch (error) {
        console.error("Socket error deleting message:", error);
      }
    });

    // Listen for delete group message (Group Admin, Creator, Sender, or Site Admin)
    socket.on("deleteGroupMessage", async (data) => {
      try {
        const { messageId, userId, groupId } = data;
        if (!messageId || !userId || !groupId) return;

        const groupObj = await require("./models/Group").findById(groupId);
        if (!groupObj) return;

        const msgObj = await GroupMessage.findById(messageId);
        if (!msgObj) return;

        const User = require("./models/User");
        const user = await User.findById(userId);

        const isSender = msgObj.sender.toString() === userId.toString();
        const isGroupAdmin = groupObj.admin.toString() === userId.toString() || groupObj.creator.toString() === userId.toString();
        const isSiteAdmin = user && user.role === "admin";

        if (isSender || isGroupAdmin || isSiteAdmin) {
          await GroupMessage.findByIdAndDelete(messageId);
          // Broadcast deletion in real-time to the group chat room
          io.to(`group_${groupId}`).emit("groupMessageDeleted", messageId);
        }
      } catch (error) {
        console.error("Socket error deleting group message:", error);
      }
    });

    // Join a user-specific room for background updates (like WhatsApp chat list updates)
    socket.on("joinUserRoom", (userId) => {
      if (userId) {
        console.log(`Socket ${socket.id} joined user room: user_${userId}`);
        socket.join(`user_${userId}`);
      }
    });

    // Join a private DM chat room
    socket.on("joinDmRoom", (conversationId) => {
      if (conversationId) {
        console.log(`Socket ${socket.id} joined DM room: dm_${conversationId}`);
        socket.join(`dm_${conversationId}`);
      }
    });

    // Handle sending a private DM
    socket.on("sendDirectMessage", async (data) => {
      try {
        const { conversationId, senderId, text } = data;
        if (!conversationId || !senderId || !text || !text.trim()) return;

        // Create the DM
        const newMessage = await DirectMessage.create({
          conversation: conversationId,
          sender: senderId,
          text: text.trim(),
        });

        // Update the Conversation metadata (lastMessageText, lastMessageAt, lastMessageSender)
        const updatedConv = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessageText: text.trim(),
            lastMessageAt: Date.now(),
            lastMessageSender: senderId,
          },
          { new: true }
        ).populate("participants", "fullName username");

        // Fetch populated sender details
        const populatedMessage = await DirectMessage.findById(newMessage._id).populate(
          "sender",
          "fullName username"
        );

        // Broadcast the new message to everyone inside the DM room
        io.to(`dm_${conversationId}`).emit("newDirectMessage", populatedMessage);

        // Notify both participants in their user-specific rooms so their WhatsApp chat lists update live!
        if (updatedConv && updatedConv.participants) {
          updatedConv.participants.forEach((participant) => {
            io.to(`user_${participant._id}`).emit("conversationUpdate", updatedConv);
          });
        }
      } catch (error) {
        console.error("Socket error processing DM:", error);
      }
    });

    // Join room-specific group chat
    socket.on("joinGroupChat", (groupId) => {
      if (groupId) {
        console.log(`Socket ${socket.id} joined group chat room: group_${groupId}`);
        socket.join(`group_${groupId}`);
      }
    });

    // Handle sending a group-specific message
    socket.on("sendGroupMessage", async (data) => {
      try {
        const { groupId, senderId, text } = data;
        if (!groupId || !senderId || !text || !text.trim()) return;

        // Create the group message
        const newMessage = await GroupMessage.create({
          group: groupId,
          sender: senderId,
          text: text.trim(),
        });

        // Fetch populated sender details
        const populatedMessage = await GroupMessage.findById(newMessage._id).populate(
          "sender",
          "fullName username"
        );

        // Broadcast live to everyone in the group chat room
        io.to(`group_${groupId}`).emit("newGroupMessage", populatedMessage);
      } catch (error) {
        console.error("Socket error processing group message:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
