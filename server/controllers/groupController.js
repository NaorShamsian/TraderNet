const mongoose = require("mongoose");
const Group = require("../models/Group");
const User = require("../models/User");
const GroupMessage = require("../models/GroupMessage");
const Post = require("../models/Post");

// Create a new group
const createGroup = async (req, res) => {
  try {
    const { name, description, topic, privacy } = req.body;

    if (!name || !topic) {
      return res.status(400).json({ message: "Group name and topic are required" });
    }

    // Check if group name already exists
    const existingGroup = await Group.findOne({ name: name.trim() });
    if (existingGroup) {
      return res.status(409).json({ message: "A group with this name already exists" });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description || "",
      topic: topic.trim(),
      privacy: privacy || "public",
      creator: req.user._id,
      admin: req.user._id,
      members: [req.user._id],
      pendingRequests: [],
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username");

    return res.status(201).json(populatedGroup);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to create group" });
  }
};

// Get all groups
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .sort({ createdAt: -1 })
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username")
      .populate("pendingRequests", "fullName username");

    return res.status(200).json(groups);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch groups" });
  }
};

// Get a single group by ID
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(id)
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username")
      .populate("pendingRequests", "fullName username");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    return res.status(200).json(group);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch group" });
  }
};

// Update group (admin only)
const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, topic, privacy } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if the current user is the group admin or a site admin
    if (group.admin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the group admin can update this group" });
    }

    if (name) {
      const nameTrimmed = name.trim();
      if (nameTrimmed !== group.name) {
        const existingGroup = await Group.findOne({ name: nameTrimmed });
        if (existingGroup) {
          return res.status(409).json({ message: "A group with this name already exists" });
        }
        group.name = nameTrimmed;
      }
    }

    if (description !== undefined) group.description = description;
    if (topic !== undefined) group.topic = topic.trim();
    if (privacy !== undefined) group.privacy = privacy;

    await group.save();

    const updatedGroup = await Group.findById(group._id)
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username")
      .populate("pendingRequests", "fullName username");

    return res.status(200).json(updatedGroup);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to update group" });
  }
};

// Delete a group (group admin or site admin only)
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is the group admin or a site admin
    if (group.admin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the group admin can delete this group" });
    }

    // Cascade Deletion: Purge all GroupMessage and Post documents of this group
    await GroupMessage.deleteMany({ group: id });
    await Post.deleteMany({ group: id });

    await Group.findByIdAndDelete(id);

    return res.status(200).json({ message: "Group and all related posts/messages deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete group" });
  }
};

// Search groups (at least 3 parameters)
const searchGroups = async (req, res) => {
  try {
    const { name, privacy, topic, minMembers } = req.query;
    const query = {};

    if (name) {
      query.name = { $regex: name, $options: "i" };
    }
    if (privacy) {
      query.privacy = privacy;
    }
    if (topic) {
      query.topic = { $regex: topic, $options: "i" };
    }
    if (minMembers) {
      const minCount = parseInt(minMembers, 10);
      if (!isNaN(minCount)) {
        query.$expr = { $gte: [{ $size: "$members" }, minCount] };
      }
    }

    const groups = await Group.find(query)
      .sort({ createdAt: -1 })
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username");

    return res.status(200).json(groups);
  } catch (error) {
    return res.status(500).json({ message: "Failed to search groups" });
  }
};

// Join a group (supports public/private)
const joinGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is already a member
    const isMember = group.members.some((m) => m.toString() === userId.toString());
    if (isMember) {
      return res.status(400).json({ message: "You are already a member of this group" });
    }

    if (group.privacy === "public") {
      // Immediately join
      group.members.push(userId);
      group.activityLogs.push({
        userId,
        username: req.user.username,
        action: "joined",
        timestamp: Date.now(),
      });
      await group.save();
      const updatedGroup = await Group.findById(id)
        .populate("creator", "fullName username")
        .populate("admin", "fullName username")
        .populate("members", "fullName username")
        .populate("staff", "fullName username")
        .populate("pendingRequests", "fullName username");

      return res.status(200).json({
        message: "Successfully joined the group!",
        group: updatedGroup,
        joined: true,
      });
    } else {
      // Private group: user requests to join
      const alreadyRequested = group.pendingRequests.some(
        (r) => r.toString() === userId.toString()
      );
      if (alreadyRequested) {
        return res.status(400).json({ message: "Join request is already pending approval" });
      }

      group.pendingRequests.push(userId);
      await group.save();
      const updatedGroup = await Group.findById(id)
        .populate("creator", "fullName username")
        .populate("admin", "fullName username")
        .populate("members", "fullName username")
        .populate("staff", "fullName username")
        .populate("pendingRequests", "fullName username");

      return res.status(200).json({
        message: "Join request sent successfully. Pending admin approval.",
        group: updatedGroup,
        joined: false,
      });
    }
  } catch (error) {
    return res.status(500).json({ message: "Failed to join group" });
  }
};

// Leave a group
const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Admin cannot leave if they are the creator/sole admin without transferring (simplified: allow leaving unless it's the admin, or just allow it but they lose admin power. Let's block creator from leaving for consistency, or let them leave if there are other members).
    if (group.creator.toString() === userId.toString()) {
      return res.status(400).json({ message: "Group creator cannot leave the group." });
    }

    // Check if user is a member
    const isMember = group.members.some((m) => m.toString() === userId.toString());
    if (!isMember) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    // Remove user
    group.members = group.members.filter((m) => m.toString() !== userId.toString());
    group.activityLogs.push({
      userId,
      username: req.user.username,
      action: "left",
      timestamp: Date.now(),
    });
    await group.save();

    const updatedGroup = await Group.findById(id)
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username")
      .populate("pendingRequests", "fullName username");

    return res.status(200).json({
      message: "Left group successfully",
      group: updatedGroup,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to leave group" });
  }
};

// Approve a join request (admin only)
const approveJoinRequest = async (req, res) => {
  try {
    const { id, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid group or user id" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if logged-in user is group admin OR site admin
    if (group.admin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the group admin or a platform administrator can approve requests" });
    }

    // Check if user is in pending requests
    const isPending = group.pendingRequests.some((r) => r.toString() === userId.toString());
    if (!isPending) {
      return res.status(404).json({ message: "No pending request found for this user" });
    }

    // Move from pending requests to members
    group.pendingRequests = group.pendingRequests.filter(
      (r) => r.toString() !== userId.toString()
    );
    group.members.push(userId);

    const approvedUser = await User.findById(userId);
    group.activityLogs.push({
      userId,
      username: approvedUser ? approvedUser.username : "user",
      action: "joined",
      timestamp: Date.now(),
    });
    await group.save();

    const updatedGroup = await Group.findById(id)
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username")
      .populate("pendingRequests", "fullName username");

    return res.status(200).json({
      message: "Request approved successfully",
      group: updatedGroup,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve request" });
  }
};

// Reject a join request (admin only)
const rejectJoinRequest = async (req, res) => {
  try {
    const { id, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid group or user id" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if logged-in user is group admin OR site admin
    if (group.admin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the group admin or a platform administrator can reject requests" });
    }

    // Check if user is in pending requests
    const isPending = group.pendingRequests.some((r) => r.toString() === userId.toString());
    if (!isPending) {
      return res.status(404).json({ message: "No pending request found for this user" });
    }

    // Remove from pending requests
    group.pendingRequests = group.pendingRequests.filter(
      (r) => r.toString() !== userId.toString()
    );
    await group.save();

    const updatedGroup = await Group.findById(id)
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username")
      .populate("pendingRequests", "fullName username");

    return res.status(200).json({
      message: "Request rejected successfully",
      group: updatedGroup,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject request" });
  }
};

// Remove a member from the group (admin only)
const removeGroupMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid group or user id" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if logged-in user is group admin OR site admin
    if (group.admin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the group admin or a platform administrator can remove members" });
    }

    // Cannot remove the creator or the admin themselves
    if (group.creator.toString() === userId.toString()) {
      return res.status(400).json({ message: "Cannot remove the group creator from the group" });
    }
    if (group.admin.toString() === userId.toString()) {
      return res.status(400).json({ message: "Cannot remove the group admin from the group" });
    }

    // Check if user is a member
    const isMember = group.members.some((m) => m.toString() === userId.toString());
    if (!isMember) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    // Remove from members
    group.members = group.members.filter((m) => m.toString() !== userId.toString());

    const removedUser = await User.findById(userId);
    group.activityLogs.push({
      userId,
      username: removedUser ? removedUser.username : "user",
      action: "left",
      timestamp: Date.now(),
    });
    await group.save();

    const updatedGroup = await Group.findById(id)
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username")
      .populate("pendingRequests", "fullName username");

    return res.status(200).json({
      message: "Member removed successfully",
      group: updatedGroup,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove member" });
  }
};

// Promote a member to Staff (admin only)
const promoteMemberToStaff = async (req, res) => {
  try {
    const { id, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid group or user id" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if logged-in user is group admin OR site admin
    if (group.admin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the group admin or a platform administrator can promote members" });
    }

    // Check if user is a member
    const isMember = group.members.some((m) => m.toString() === userId.toString());
    if (!isMember) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    // Check if already staff
    const isStaff = group.staff.some((s) => s.toString() === userId.toString());
    if (isStaff) {
      return res.status(400).json({ message: "User is already a staff member" });
    }

    // Add to staff list
    group.staff.push(userId);

    const promotedUser = await User.findById(userId);
    group.activityLogs.push({
      userId,
      username: promotedUser ? promotedUser.username : "user",
      action: "promoted",
      timestamp: Date.now(),
    });
    await group.save();

    // Emit live socket event to the promoted user
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${userId}`).emit("staffPromoted", {
        groupId: group._id,
        groupName: group.name,
      });
    }

    const updatedGroup = await Group.findById(id)
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username")
      .populate("pendingRequests", "fullName username");

    return res.status(200).json({
      message: "Member promoted to Staff successfully",
      group: updatedGroup,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to promote member" });
  }
};

// Demote a member to Listener (admin only)
const demoteMemberToListener = async (req, res) => {
  try {
    const { id, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid group or user id" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if logged-in user is group admin OR site admin
    if (group.admin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the group admin or a platform administrator can demote members" });
    }

    // Check if user is in staff list
    const isStaff = group.staff.some((s) => s.toString() === userId.toString());
    if (!isStaff) {
      return res.status(400).json({ message: "User is not a staff member" });
    }

    // Remove from staff list
    group.staff = group.staff.filter((s) => s.toString() !== userId.toString());

    const demotedUser = await User.findById(userId);
    group.activityLogs.push({
      userId,
      username: demotedUser ? demotedUser.username : "user",
      action: "demoted",
      timestamp: Date.now(),
    });
    await group.save();

    const updatedGroup = await Group.findById(id)
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username")
      .populate("pendingRequests", "fullName username");

    return res.status(200).json({
      message: "Member demoted to Listener successfully",
      group: updatedGroup,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to demote member" });
  }
};

// Cancel a pending join request by the user themselves
const cancelJoinRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isPending = group.pendingRequests.some((r) => r.toString() === userId.toString());
    if (!isPending) {
      return res.status(400).json({ message: "No pending request found for your account" });
    }

    group.pendingRequests = group.pendingRequests.filter(
      (r) => r.toString() !== userId.toString()
    );
    await group.save();

    const updatedGroup = await Group.findById(id)
      .populate("creator", "fullName username")
      .populate("admin", "fullName username")
      .populate("members", "fullName username")
      .populate("staff", "fullName username")
      .populate("pendingRequests", "fullName username");

    return res.status(200).json({
      message: "Join request cancelled successfully",
      group: updatedGroup,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to cancel join request" });
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  searchGroups,
  joinGroup,
  leaveGroup,
  approveJoinRequest,
  rejectJoinRequest,
  removeGroupMember,
  promoteMemberToStaff,
  demoteMemberToListener,
  cancelJoinRequest,
};

