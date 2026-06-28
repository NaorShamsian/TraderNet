const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Group = require("../models/Group");

// Helper function to generate JWT token using process.env.JWT_SECRET
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "30d",
  });
};

const createUser = async (req, res) => {
  try {
    const { fullName, email, username, password, role, bio, phoneNumber } = req.body;

    if (!fullName || !email || !username || !password) {
      return res.status(400).json({
        message: "fullName, email, username, and password are required",
      });
    }

    // Hash password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      email,
      username,
      password: hashedPassword,
      role,
      bio,
      phoneNumber,
    });

    // Do not return password in response
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json(userResponse);
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `${duplicateField} already exists`,
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: "Failed to create user" });
  }
};

const getUsers = async (req, res) => {
  try {
    // Do not return password in response
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    // Sanitize private fields for other users
    const sanitizedUsers = users.map((user) => {
      const userObj = user.toObject();
      if (req.user._id.toString() !== userObj._id.toString()) {
        userObj.isOutgoingRequest = user.friendRequests && user.friendRequests.some((r) => r.toString() === req.user._id.toString());
      }
      if (req.user._id.toString() !== userObj._id.toString() && req.user.role !== "admin") {
        delete userObj.email;
        delete userObj.phoneNumber;
        delete userObj.friendRequests;
        delete userObj.resetPasswordToken;
        delete userObj.resetPasswordExpire;
      }
      return userObj;
    });

    return res.status(200).json(sanitizedUsers);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // Do not return password in response
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Sanitize private fields if the requester is not the user themselves and not a site admin
    const userObj = user.toObject();
    if (req.user._id.toString() !== id) {
      userObj.isOutgoingRequest = user.friendRequests && user.friendRequests.some((r) => r.toString() === req.user._id.toString());
    }
    if (req.user._id.toString() !== id && req.user.role !== "admin") {
      delete userObj.email;
      delete userObj.phoneNumber;
      delete userObj.friendRequests;
      delete userObj.resetPasswordToken;
      delete userObj.resetPasswordExpire;
    }

    return res.status(200).json(userObj);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const { fullName, email, username, password, role, bio, phoneNumber } = req.body;
    const updateData = { fullName, email, username, password, role, bio, phoneNumber };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    // Hash password if a new one is provided
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    // Do not return password in response
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(updatedUser);
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `${duplicateField} already exists`,
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: "Failed to update user" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete user" });
  }
};

// Log in user with email and password, returning user info and JWT
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate request
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Check if user exists (finding by email)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Compare provided password with hashed password in database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Update login timestamps
    user.previousLoginAt = user.lastLoginAt || Date.now();
    user.lastLoginAt = Date.now();
    await user.save();

    // Prepare response, omitting password
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      user: userResponse,
      token,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error during login",
    });
  }
};

// Get logged-in user profile
const getMe = async (req, res) => {
  try {
    // req.user is already populated by authMiddleware (without password)
    return res.status(200).json(req.user);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// Update logged-in user profile
const updateMe = async (req, res) => {
  try {
    const { fullName, email, username, password, bio, phoneNumber } = req.body;
    const updateData = { fullName, email, username, password, bio, phoneNumber };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    // Hash password if a new one is provided
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json(updatedUser);
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `${duplicateField} already exists`,
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: "Failed to update profile" });
  }
};

// Delete logged-in user account
const deleteMe = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete account" });
  }
};

// Search users by fullName, username, and role
const searchUsers = async (req, res) => {
  try {
    const { fullName, username, role } = req.query;
    const query = {};

    if (fullName) {
      query.fullName = { $regex: fullName, $options: "i" };
    }
    if (username) {
      query.username = { $regex: username, $options: "i" };
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });

    // Sanitize private fields for other users
    const sanitizedUsers = users.map((user) => {
      const userObj = user.toObject();
      if (req.user._id.toString() !== userObj._id.toString()) {
        userObj.isOutgoingRequest = user.friendRequests && user.friendRequests.some((r) => r.toString() === req.user._id.toString());
      }
      if (req.user._id.toString() !== userObj._id.toString() && req.user.role !== "admin") {
        delete userObj.email;
        delete userObj.phoneNumber;
        delete userObj.friendRequests;
        delete userObj.resetPasswordToken;
        delete userObj.resetPasswordExpire;
      }
      return userObj;
    });

    return res.status(200).json(sanitizedUsers);
  } catch (error) {
    return res.status(500).json({ message: "Failed to search users" });
  }
};

// Request password reset (Generates 6-digit PIN and sends via Email or SMS mock)
const forgotPassword = async (req, res) => {
  try {
    const { emailOrPhone, method } = req.body;

    if (!emailOrPhone || !method) {
      return res.status(400).json({ message: "Email or phone number and method are required" });
    }

    if (method !== "email" && method !== "sms") {
      return res.status(400).json({ message: "Invalid method. Supported: 'email', 'sms'" });
    }

    // Find user by either email or phoneNumber
    const user = await User.findOne({
      $or: [
        { email: emailOrPhone.toLowerCase().trim() },
        { phoneNumber: emailOrPhone.trim() }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "No user found with that email or phone number" });
    }

    // Generate a secure 6-digit PIN code
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Set code and expiration (expires in 10 minutes)
    user.resetPasswordToken = pin;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    let emailStatusMessage = "";
    if (method === "email") {
      let transporter;
      
      // 1. Check if custom SMTP env configurations exist and are not placeholders
      const isSmtpConfigured = process.env.SMTP_HOST && 
                               process.env.SMTP_USER && 
                               process.env.SMTP_PASS && 
                               process.env.SMTP_PASS !== "YOUR_APP_PASSWORD_HERE" &&
                               process.env.SMTP_PASS.trim() !== "";

      if (isSmtpConfigured) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } else {
        // 2. Fallback to automatic, zero-config Nodemailer Ethereal testing account!
        // Creates a real, functional SMTP credential inbox in 2 seconds.
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      const resetLink = `http://${req.get("host")}/reset-password.html?token=${pin}`;

      const mailOptions = {
        from: '"TraderNet Notifications" <notifications@tradernet.net>',
        to: user.email,
        subject: "Reset Your TraderNet Password 📈",
        text: `Hello ${user.fullName},\n\nYou requested a password reset for your TraderNet account.\n\nYour 6-digit verification code is: ${pin}\n\nAlternatively, you can reset your password immediately in your browser by clicking this secure link:\n${resetLink}\n\nThis token will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 40px; border-radius: 16px; max-width: 500px; margin: auto; border: 1px solid rgba(255,255,255,0.08);">
            <h2 style="font-family: 'Outfit', sans-serif; color: #6366f1; text-align: center; margin-bottom: 24px;">TraderNet 📈</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #d1d5db;">Hello <strong>${user.fullName}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6; color: #d1d5db;">We received a request to reset your password. Use the verification PIN below inside the mobile app:</p>
            <div style="background-color: #1f293d; padding: 16px; border-radius: 12px; text-align: center; margin: 24px 0; border: 1px solid rgba(255,255,255,0.08);">
              <span style="font-size: 32px; font-weight: 800; color: #818cf8; letter-spacing: 4px;">${pin}</span>
            </div>
            <p style="font-size: 15px; line-height: 1.6; color: #d1d5db; text-align: center;">- OR -</p>
            <p style="font-size: 15px; line-height: 1.6; color: #d1d5db;">Click the secure link below to reset your password immediately in your browser:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${resetLink}" target="_blank" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);">Reset Password Online</a>
            </div>
            <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
              This link and verification PIN will expire in 10 minutes. If you did not make this request, you can safely ignore this email.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      
      console.log(`
==================================================
[REAL SMTP EMAIL SENT - Nodemailer Gateway]
Message ID: ${info.messageId}
TO: ${user.email}
SUBJECT: Reset Your TraderNet Password 📈
`);

      // If Ethereal test account was used, print the direct preview link in console!
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        const testUrl = nodemailer.getTestMessageUrl(info);
        emailStatusMessage = ` Preview email at: ${testUrl}`;
        console.log(`
👉 PREVIEW REAL SENT EMAIL AT:
${testUrl}
==================================================
        `);
      } else {
        console.log(`==================================================`);
      }
    } else {
      // 1. Check if Twilio custom env configurations exist
      const isTwilioConfigured = process.env.TWILIO_ACCOUNT_SID && 
                                 process.env.TWILIO_AUTH_TOKEN && 
                                 process.env.TWILIO_PHONE_NUMBER && 
                                 process.env.TWILIO_ACCOUNT_SID !== "YOUR_TWILIO_SID_HERE" &&
                                 process.env.TWILIO_ACCOUNT_SID.trim() !== "";

      if (isTwilioConfigured) {
        try {
          const accountSid = process.env.TWILIO_ACCOUNT_SID;
          const authToken = process.env.TWILIO_AUTH_TOKEN;
          const fromNumber = process.env.TWILIO_PHONE_NUMBER;
          let toNumber = user.phoneNumber.trim();

          // Auto-format local Israeli numbers (e.g., 05XXXXXXXX) to E.164 international format (+9725XXXXXXXX) for Twilio
          if (toNumber.startsWith("05") && toNumber.length === 10) {
            toNumber = "+972" + toNumber.substring(1);
          } else if (toNumber.startsWith("5") && toNumber.length === 9) {
            toNumber = "+972" + toNumber;
          } else if (!toNumber.startsWith("+")) {
            if (toNumber.startsWith("0")) {
              toNumber = "+972" + toNumber.substring(1);
            } else {
              toNumber = "+972" + toNumber;
            }
          }

          // Twilio REST API URL
          const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

          // Form data payload
          const details = {
            From: fromNumber,
            To: toNumber,
            Body: `אבטחת טריידרנט 📈: קוד האימות שלך לשחזור הסיסמה הוא: ${pin}. פג תוקף בעוד 10 דקות.`,
          };

          const formBody = Object.keys(details)
            .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(details[key]))
            .join('&');

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
            },
            body: formBody,
          });

          if (!response.ok) {
            const errData = await response.json();
            console.error("[TWILIO ERROR]", errData);
          } else {
            console.log(`
==================================================
[REAL SMS SENT - Twilio API]
TO: ${toNumber}
MESSAGE:
TraderNet Security: Your password reset code is: ${pin}. Expires in 10 minutes.
==================================================
            `);
          }
        } catch (err) {
          console.error("Twilio SMS failed, falling back to simulator:", err.message);
        }
      } else {
        // SMS simulated dispatch fallback
        console.log(`
==================================================
[SIMULATED SMS DISPATCH - Twilio Gateway]
TO: ${user.phoneNumber || emailOrPhone}
FROM: +1 (855) TRADER-NET
MESSAGE:
TraderNet Security: Your password reset code is: ${pin}. Expires in 10 minutes. Do not share.
==================================================
        `);
      }
    }

    return res.status(200).json({
      message: `Password reset code sent successfully via ${method === "email" ? "Email" : "SMS"}.${emailStatusMessage}`,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to request password reset" });
  }
};

// Reset password using the 6-digit PIN
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Code and new password are required" });
    }

    // Find user with matching token and unexpired timer
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    // Hash the new password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset token and timer
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(200).json({ message: "Password reset successful! You can now log in." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reset password" });
  }
};

// Get all friends of the current user
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("friends", "fullName username bio role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user.friends);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch friends list" });
  }
};

// Get all pending friend requests for the current user
const getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("friendRequests", "fullName username bio role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user.friendRequests);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch friend requests" });
  }
};

// Send a friend request to another user
const sendFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot send a friend request to yourself" });
    }

    const recipient = await User.findById(id);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient user not found" });
    }

    // Block friend requests to platform administrators
    if (recipient.role === "admin") {
      return res.status(403).json({ message: "Cannot send a connection request to a platform administrator" });
    }

    const sender = await User.findById(req.user._id);

    // Check if already friends
    if (sender.friends.includes(id)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    // Check if request already sent
    if (recipient.friendRequests.includes(req.user._id)) {
      return res.status(400).json({ message: "Friend request already pending" });
    }

    // Add to recipient's requests
    recipient.friendRequests.push(req.user._id);
    await recipient.save();

    // Emit live socket event to recipient
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${id}`).emit("friendRequestReceived", {
        _id: sender._id,
        fullName: sender.fullName,
        username: sender.username,
        bio: sender.bio,
        role: sender.role,
      });
    }

    return res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send friend request" });
  }
};

// Cancel a pending outgoing friend request
const cancelFriendRequest = async (req, res) => {
  try {
    const { id } = req.params; // The recipient's ID
    const recipient = await User.findById(id);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient user not found" });
    }

    const requestIndex = recipient.friendRequests.indexOf(req.user._id);
    if (requestIndex === -1) {
      return res.status(400).json({ message: "No pending friend request to this user" });
    }

    // Remove from recipient's requests
    recipient.friendRequests.splice(requestIndex, 1);
    await recipient.save();

    // Emit live socket event to recipient
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${id}`).emit("friendRequestCancelled", {
        senderId: req.user._id,
      });
    }

    return res.status(200).json({ message: "Friend request cancelled successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to cancel friend request" });
  }
};

// Accept a friend request
const acceptFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    const sender = await User.findById(id);

    if (!sender) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify request exists
    const requestIndex = user.friendRequests.indexOf(id);
    if (requestIndex === -1) {
      return res.status(400).json({ message: "No pending friend request from this user" });
    }

    // Remove from request list
    user.friendRequests.splice(requestIndex, 1);

    // Add to both friends lists if not already added
    if (!user.friends.includes(id)) {
      user.friends.push(id);
    }
    if (!sender.friends.includes(req.user._id)) {
      sender.friends.push(req.user._id);
    }

    await user.save();
    await sender.save();

    // Emit live socket events
    const io = req.app.get("io");
    if (io) {
      // Notify the sender that the request was accepted
      io.to(`user_${id}`).emit("friendRequestAccepted", {
        friendId: req.user._id,
        friendName: user.fullName,
        friendUsername: user.username,
      });
      // Also notify recipient's own socket room if online to sync UI elsewhere
      io.to(`user_${req.user._id}`).emit("friendRequestCancelled", {
        senderId: id,
      });
    }

    return res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to accept friend request" });
  }
};

// Reject a friend request
const rejectFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const requestIndex = user.friendRequests.indexOf(id);
    if (requestIndex === -1) {
      return res.status(400).json({ message: "No pending friend request from this user" });
    }

    // Remove from requests list
    user.friendRequests.splice(requestIndex, 1);
    await user.save();

    // Emit live socket event
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${id}`).emit("friendRequestRejected", {
        rejecterId: req.user._id,
      });
      io.to(`user_${req.user._id}`).emit("friendRequestCancelled", {
        senderId: id,
      });
    }

    return res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject friend request" });
  }
};

// Remove friend
const removeFriend = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    const friend = await User.findById(id);

    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove from both friends arrays
    user.friends = user.friends.filter(fId => fId.toString() !== id);
    friend.friends = friend.friends.filter(fId => fId.toString() !== req.user._id.toString());

    await user.save();
    await friend.save();

    // Emit socket event to both users to sync relations in real-time
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${id}`).emit("friendRemoved", { friendId: req.user._id });
      io.to(`user_${req.user._id}`).emit("friendRemoved", { friendId: id });
    }

    return res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove friend" });
  }
};

// Get digest summary of what happened since previousLoginAt
const getMeDigest = async (req, res) => {
  try {
    const user = req.user;
    const previousLoginAt = user.previousLoginAt || user.createdAt;

    // 1. Pending connection requests count (friend requests)
    const pendingFriendRequestsCount = user.friendRequests.length;

    // 2. Fetch unread direct messages (since previousLoginAt from other users)
    const conversations = await Conversation.find({
      participants: user._id,
      lastMessageAt: { $gt: previousLoginAt },
      lastMessageSender: { $ne: user._id }
    }).populate("lastMessageSender", "fullName username");

    const newMessages = conversations.map((conv) => ({
      conversationId: conv._id,
      senderUsername: conv.lastMessageSender?.username || "user",
      senderFullName: conv.lastMessageSender?.fullName || "Trader",
      lastMessageText: conv.lastMessageText,
      lastMessageAt: conv.lastMessageAt,
    }));

    // 3. Fetch activity logs in groups where user is admin or creator
    const managedGroups = await Group.find({
      $or: [
        { admin: user._id },
        { creator: user._id }
      ]
    });

    const pendingJoinRequestsCount = managedGroups.reduce((acc, g) => acc + (g.pendingRequests ? g.pendingRequests.length : 0), 0);

    const logs = [];
    managedGroups.forEach((group) => {
      if (group.activityLogs) {
        group.activityLogs.forEach((log) => {
          if (new Date(log.timestamp) > new Date(previousLoginAt)) {
            logs.push({
              groupId: group._id,
              groupName: group.name,
              userId: log.userId,
              username: log.username,
              action: log.action,
              timestamp: log.timestamp
            });
          }
        });
      }
    });

    // Sort logs newest first
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      pendingFriendRequestsCount,
      newMessages,
      pendingJoinRequestsCount,
      logs,
      previousLoginAt,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to compile digest" });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  getMe,
  updateMe,
  deleteMe,
  searchUsers,
  forgotPassword,
  resetPassword,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getMeDigest,
};

