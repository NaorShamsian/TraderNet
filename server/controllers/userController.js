const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper function to generate JWT token using process.env.JWT_SECRET
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "30d",
  });
};

const createUser = async (req, res) => {
  try {
    const { fullName, email, username, password, role, bio } = req.body;

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
    return res.status(200).json(users);
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

    return res.status(200).json(user);
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

    const { fullName, email, username, password, role, bio } = req.body;
    const updateData = { fullName, email, username, password, role, bio };

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
    const { fullName, email, username, password, bio } = req.body;
    const updateData = { fullName, email, username, password, bio };

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
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to search users" });
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
};
