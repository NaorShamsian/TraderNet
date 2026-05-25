const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");

// Create a new post
const createPost = async (req, res) => {
  try {
    const { content, image, tags } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const post = await Post.create({
      user: req.user._id,
      content,
      image,
      tags,
    });

    // Populate user details for returning
    const populatedPost = await Post.findById(post._id).populate(
      "user",
      "fullName username bio"
    );

    return res.status(201).json(populatedPost);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to create post" });
  }
};

// Get all posts, sorted by newest first
const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username");

    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch posts" });
  }
};

// Get a single post by ID
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const post = await Post.findById(id)
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json(post);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch post" });
  }
};

// Update a post (only owner can update)
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, image, tags } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check ownership
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this post" });
    }

    if (content !== undefined) post.content = content;
    if (image !== undefined) post.image = image;
    if (tags !== undefined) post.tags = tags;

    await post.save();

    // Fetch populated post for response
    const updatedPost = await Post.findById(post._id)
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username");

    return res.status(200).json(updatedPost);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to update post" });
  }
};

// Delete a post (only owner can delete)
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check ownership
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(id);

    return res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete post" });
  }
};

// Like or unlike a post (toggle)
const likePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Toggle logic
    const userIdStr = req.user._id.toString();
    const hasLiked = post.likes.some((likeId) => likeId.toString() === userIdStr);

    if (hasLiked) {
      // Unlike: remove from likes array
      post.likes = post.likes.filter((likeId) => likeId.toString() !== userIdStr);
    } else {
      // Like: add to likes array
      post.likes.push(req.user._id);
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username");

    return res.status(200).json(updatedPost);
  } catch (error) {
    return res.status(500).json({ message: "Failed to toggle like on post" });
  }
};

// Add comment to a post
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push({
      user: req.user._id,
      text,
    });

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username");

    return res.status(201).json(updatedPost);
  } catch (error) {
    return res.status(500).json({ message: "Failed to add comment" });
  }
};

// Search posts by content, tag, date range, and username
const searchPosts = async (req, res) => {
  try {
    const { content, tag, fromDate, toDate, username } = req.query;
    const query = {};

    if (content) {
      query.content = { $regex: content, $options: "i" };
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.createdAt.$lte = new Date(toDate);
      }
    }

    if (username) {
      // Find matching users
      const users = await User.find({ username: { $regex: username, $options: "i" } });
      const userIds = users.map((user) => user._id);
      query.user = { $in: userIds };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username");

    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ message: "Failed to search posts" });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  addComment,
  searchPosts,
};
