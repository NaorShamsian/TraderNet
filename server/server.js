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

  // שמירת מופע השרת הדו-כיווני על גבי האפליקציה כדי לאפשר גישה אליו גם מתוך הבקרים.
  // Express app integration for Socket.io
  app.set("io", io);

  // האזנה לאירוע חיבור לקוח חדש לשרת.
  // Event: connection
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // הצטרפות לחדר הגלובלי.
    // Room: global
    socket.on("joinGlobal", () => {
      console.log(`Socket ${socket.id} joined global room`);
      socket.join("global");
    });

    // האזנה לשליחת הודעה חדשה בצ'אט הגלובלי.
    // Event: sendMessage
    socket.on("sendMessage", async (data) => {
      try {
        const { senderId, text } = data;
        if (!senderId || !text || !text.trim()) return;

        // 1. שמירת ההודעה במסד הנתונים.
        // Save to Database: MongoDB
        const newMessage = await Message.create({
          sender: senderId,
          text: text.trim(),
        });

        // 2. שליפת ההודעה שנוצרה עם פרטי השולח המאוכלסים.
        // Population target fields: fullName, username
        const populatedMessage = await Message.findById(newMessage._id).populate(
          "sender",
          "fullName username"
        );

        // 3. הפצת ההודעה בזמן אמת לכל המשתמשים המחוברים לחדר.
        // Broadcast target: global room
        io.to("global").emit("newMessage", populatedMessage);
      } catch (error) {
        console.error("Socket error processing message:", error);
      }
    });

    // האזנה למחיקת הודעה בצ'אט הגלובלי.
    // Event: deleteMessage (Admin only)
    socket.on("deleteMessage", async (data) => {
      try {
        const { messageId, adminUserId } = data;
        if (!messageId || !adminUserId) return;

        // אימות הרשאת מנהל מערכת במסד הנתונים.
        // Authorization: User role admin check
        const User = require("./models/User");
        const user = await User.findById(adminUserId);
        if (user && user.role === "admin") {
          // מחיקה ממסד הנתונים.
          // Action: MongoDB Find & Delete
          await Message.findByIdAndDelete(messageId);
          // עדכון כל הלקוחות בזמן אמת להסרת ההודעה מהמסך.
          io.to("global").emit("messageDeleted", messageId);
        }
      } catch (error) {
        console.error("Socket error deleting message:", error);
      }
    });

    // האזנה למחיקת הודעה בקבוצה.
    // Event: deleteGroupMessage
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
          // הפצת אירוע המחיקה בזמן אמת לחברי החדר של אותה קבוצה.
          // Broadcast target: group chat room
          io.to(`group_${groupId}`).emit("groupMessageDeleted", messageId);
        }
      } catch (error) {
        console.error("Socket error deleting group message:", error);
      }
    });

    // הצטרפות לחדר אישי של המשתמש לקבלת עדכוני רקע.
    // Target updates: likes, comments, connections
    socket.on("joinUserRoom", (userId) => {
      if (userId) {
        console.log(`Socket ${socket.id} joined user room: user_${userId}`);
        socket.join(`user_${userId}`);
      }
    });

    // הצטרפות לחדר של שיחת צ'אט פרטית.
    // Room type: Direct Message
    socket.on("joinDmRoom", (conversationId) => {
      if (conversationId) {
        console.log(`Socket ${socket.id} joined DM room: dm_${conversationId}`);
        socket.join(`dm_${conversationId}`);
      }
    });

    // טיפול בשליחת הודעה פרטית.
    // Event: sendDirectMessage
    socket.on("sendDirectMessage", async (data) => {
      try {
        const { conversationId, senderId, text } = data;
        if (!conversationId || !senderId || !text || !text.trim()) return;

        // 1. שמירת הודעת השיחה הפרטית במסד הנתונים.
        // Database: DirectMessage collection
        const newMessage = await DirectMessage.create({
          conversation: conversationId,
          sender: senderId,
          text: text.trim(),
        });

        // 2. עדכון מטא-דאטה של השיחה.
        // Fields updated: lastMessageText, lastMessageAt, lastMessageSender
        // משמש לטעינת תצוגה מקדימה ברשימת השיחות הכללית.
        const updatedConv = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessageText: text.trim(),
            lastMessageAt: Date.now(),
            lastMessageSender: senderId,
          },
          { new: true }
        ).populate("participants", "fullName username");

        const populatedMessage = await DirectMessage.findById(newMessage._id).populate(
          "sender",
          "fullName username"
        );

        // 3. הפצת ההודעה החדשה לכל מי שנמצא כרגע בתוך החדר של אותה שיחה פרטית.
        io.to(`dm_${conversationId}`).emit("newDirectMessage", populatedMessage);

        // 4. שליחת התראה בזמן אמת לחדרים האישיים של שני המשתתפים בשיחה.
        // הדבר מאפשר לעדכן את רשימת השיחות הפעילות שלהם מבלי שיצטרכו לרענן ידנית.
        // Update target: user active chat lists (WhatsApp style)
        if (updatedConv && updatedConv.participants) {
          updatedConv.participants.forEach((participant) => {
            io.to(`user_${participant._id}`).emit("conversationUpdate", updatedConv);
          });
        }
      } catch (error) {
        console.error("Socket error processing DM:", error);
      }
    });

    // הצטרפות לחדר שיחה של קבוצה.
    // Room type: Group Chat
    socket.on("joinGroupChat", (groupId) => {
      if (groupId) {
        console.log(`Socket ${socket.id} joined group chat room: group_${groupId}`);
        socket.join(`group_${groupId}`);
      }
    });

    // טיפול בשליחת הודעה קבוצתית.
    // Event: sendGroupMessage
    socket.on("sendGroupMessage", async (data) => {
      try {
        const { groupId, senderId, text } = data;
        if (!groupId || !senderId || !text || !text.trim()) return;

        // 1. שמירת הודעת הקבוצה במסד הנתונים.
        // Database: MongoDB GroupMessage
        const newMessage = await GroupMessage.create({
          group: groupId,
          sender: senderId,
          text: text.trim(),
        });

        const populatedMessage = await GroupMessage.findById(newMessage._id).populate(
          "sender",
          "fullName username"
        );

        // 2. הפצה בזמן אמת לכל המשתמשים שנמצאים בתוך חדר הקבוצה.
        io.to(`group_${groupId}`).emit("newGroupMessage", populatedMessage);
      } catch (error) {
        console.error("Socket error processing group message:", error);
      }
    });

    // ניתוק החיבור
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
