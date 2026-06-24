const Post = require("../models/Post");
const Group = require("../models/Group");
const User = require("../models/User");

// Get statistics for rendering graphs
const getStats = async (req, res) => {
  try {
    // 1. Posts per Group
    // We do an aggregation on Post. If group is null, it's "Global".
    const postsPerGroup = await Post.aggregate([
      {
        $group: {
          _id: "$group",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "_id",
          foreignField: "_id",
          as: "groupDetails",
        },
      },
      {
        $project: {
          groupName: {
            $cond: {
              if: { $eq: ["$_id", null] },
              then: "Global Feed",
              else: { $arrayElemAt: ["$groupDetails.name", 0] },
            },
          },
          count: 1,
        },
      },
    ]);

    // 2. Users per Group
    // Since each group stores members in an array, we project the size of the members array.
    const usersPerGroup = await Group.aggregate([
      {
        $project: {
          groupName: "$name",
          count: { $size: "$members" },
        },
      },
    ]);

    // 3. Posts per Month
    const postsPerMonth = await Post.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          _id: 0,
          monthName: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: {
                  if: { $lt: ["$_id.month", 10] },
                  then: { $concat: ["0", { $toString: "$_id.month" }] },
                  else: { $toString: "$_id.month" },
                },
              },
            ],
          },
          count: 1,
        },
      },
    ]);

    // 4. General Stats
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalGroups = await Group.countDocuments();

    return res.status(200).json({
      postsPerGroup,
      usersPerGroup,
      postsPerMonth,
      summary: {
        totalUsers,
        totalPosts,
        totalGroups,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate statistics" });
  }
};

module.exports = { getStats };
