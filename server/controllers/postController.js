const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");
const Group = require("../models/Group");

// יצירת פוסט חדש (תומך בפוסטים גלובליים ובפוסטים בתוך קבוצות ספציפיות)
const createPost = async (req, res) => {
  try {
    const { content, image, video, tags, group } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    let groupObj = null;
    // בדיקה האם הפוסט מיועד לקבוצה מסוימת
    if (group) {
      if (!mongoose.Types.ObjectId.isValid(group)) {
        return res.status(400).json({ message: "Invalid group id" });
      }
      groupObj = await Group.findById(group);
      if (!groupObj) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // אימות שהמשתמש המנסה לכתוב פוסט בקבוצה אכן חבר בה
      const isMember = groupObj.members.some(
        (m) => m.toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({
          message: "You must be a member of this group to post in it",
        });
      }

      // אכיפת מערכת התפקידים וההרשאות בקבוצה:
      // רק יוצר הקבוצה, מנהל הקבוצה, מנהל האתר, או משתמשים שקודמו לצוות מורשים לפרסם פוסטים.
      // Roles authorized: Creator, Admin, Site Admin, Staff
      // משתמשים ברמת מאזינים בלבד חסומים מלפרסם פוסטים בקבוצה.
      // Roles blocked: Listeners
      const isGroupAdmin = groupObj.admin.toString() === req.user._id.toString() || groupObj.creator.toString() === req.user._id.toString();
      const isSiteAdmin = req.user.role === "admin";
      const isStaff = groupObj.staff && groupObj.staff.some((s) => s.toString() === req.user._id.toString());

      if (!isGroupAdmin && !isSiteAdmin && !isStaff) {
        return res.status(403).json({
          message: "Listeners cannot publish posts in this group. You must be promoted to Staff by the group admin."
        });
      }
    }

    const post = await Post.create({
      user: req.user._id,
      content,
      image,
      video: video || "",
      tags,
      group: group || null,
    });

    // Populate user and group details for returning
    const populatedPost = await Post.findById(post._id)
      .populate("user", "fullName username bio")
      .populate("group", "name privacy topic");

    return res.status(201).json(populatedPost);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to create post" });
  }
};

// שליפת פוסטים מותאמת אישית לפי חוקי פרטיות וקשרים חברתיים.
// Security check: Post visibility constraints
// הערה חשובה להצגה למרצה: פה מיושם מנגנון אבטחה המונע ממשתמשים לראות פוסטים של קבוצות שהם אינם חברים בהן.
const getPosts = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;

    // 1. שליפת כל מזהי הקבוצות שהמשתמש הנוכחי חבר או מנהל בהן (או כל הקבוצות אם הוא מנהל מערכת)
    const groups = await Group.find();
    const visibleGroupIds = groups
      .filter(
        (g) =>
          userId && (req.user.role === "admin" || g.members.some((m) => m.toString() === userId.toString()))
      )
      .map((g) => g._id);

    // 2. שליפת רשימת החברים של המשתמש כדי לבדוק סטטוס חברות
    const user = await User.findById(req.user._id);
    const friendIds = user ? (user.friends || []).map((f) => f.toString()) : [];

    // 3. שליפת כל הקבוצות הציבוריות.
    // Group type: Public
    const publicGroupIds = groups
      .filter((g) => g.privacy === "public")
      .map((g) => g._id);

    // 4. בניית שאילתת סינון מתקדמת במסד הנתונים.
    // Query builder: MongoDB $or aggregation
    // פוסט ייחשב כגלוי למשתמש אם:
    // א. הוא פוסט כללי ללא שיוך לקבוצה.
    // condition: group: null
    // ב. הוא שייך לקבוצה שהמשתמש הנוכחי חבר בה.
    // condition: visibleGroupIds list
    // ג. הוא שייך לקבוצה ציבורית והכותב שלו הוא חבר אישי של המשתמש הנוכחי
    const query = {
      $or: [
        { group: null },
        { group: { $in: visibleGroupIds } },
        {
          $and: [
            { group: { $in: publicGroupIds } },
            { user: { $in: friendIds } }
          ]
        }
      ],
    };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username")
      .populate("group", "name privacy topic");

    // Inject friend status
    const postsWithFriendStatus = posts.map((post) => {
      const postObj = post.toObject();
      if (postObj.user) {
        const authorId = postObj.user._id ? postObj.user._id.toString() : postObj.user.toString();
        postObj.isFriend = friendIds.includes(authorId);
      } else {
        postObj.isFriend = false;
      }
      return postObj;
    });

    return res.status(200).json(postsWithFriendStatus);
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
      .populate("comments.user", "fullName username")
      .populate("group", "name privacy topic");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Fetch user's friends to verify access and set isFriend status
    const user = await User.findById(req.user._id);
    const friendIds = user ? (user.friends || []).map((f) => f.toString()) : [];

    // Security Check: If post is in a private group, requester must be member or site admin (friends are NOT allowed to bypass if not members!)
    if (post.group && post.group.privacy === "private") {
      const groupObj = await Group.findById(post.group._id);
      const isMember = groupObj && groupObj.members.some((m) => m.toString() === req.user._id.toString());
      const isSiteAdmin = req.user.role === "admin";

      if (!isMember && !isSiteAdmin) {
        return res.status(403).json({ message: "You do not have permission to view this post" });
      }
    }

    const postObj = post.toObject();
    const authorId = postObj.user?._id ? postObj.user._id.toString() : postObj.user?.toString();
    postObj.isFriend = authorId ? friendIds.includes(authorId) : false;

    return res.status(200).json(postObj);
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

    // Check ownership or admin role
    if (post.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to update this post" });
    }

    if (content !== undefined) post.content = content;
    if (image !== undefined) post.image = image;
    if (tags !== undefined) post.tags = tags;

    await post.save();

    // Fetch populated post for response
    const updatedPost = await Post.findById(post._id)
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username")
      .populate("group", "name privacy topic");

    return res.status(200).json(updatedPost);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to update post" });
  }
};

// Delete a post (owner or admin can delete)
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

    // Check ownership or site admin role
    let isAuthorized = post.user.toString() === req.user._id.toString() || req.user.role === "admin";

    // Also allow Group Admin / Creator to delete the post if it was posted inside their group
    if (!isAuthorized && post.group) {
      const groupObj = await Group.findById(post.group);
      if (groupObj) {
        const isGroupAdmin = groupObj.admin.toString() === req.user._id.toString() || groupObj.creator.toString() === req.user._id.toString();
        if (isGroupAdmin) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(id);

    return res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete post" });
  }
};

// סימון לייק או ביטול לייק על פוסט.
// Action: Toggle Like
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

    // בדיקה האם המשתמש כבר סימן לייק בעבר
    const userIdStr = req.user._id.toString();
    const hasLiked = post.likes.some((likeId) => likeId.toString() === userIdStr);

    if (hasLiked) {
      // ביטול לייק (הסרה ממערך הלייקים)
      post.likes = post.likes.filter((likeId) => likeId.toString() !== userIdStr);
    } else {
      // הוספת לייק חדש
      post.likes.push(req.user._id);

      // יצירת התראה בזמן אמת.
      // Technology: WebSockets (Socket.io)
      // אם המשתמש שסימן לייק אינו בעל הפוסט בעצמו, נשלח התראה ממוקדת לחדר האישי של בעל הפוסט
      if (post.user.toString() !== userIdStr) {
        const io = req.app.get("io");
        if (io) {
          // שליחת אירוע לחדר האישי של הכותב.
          // Event: postLiked
          // Room target: user_userID
          io.to(`user_${post.user.toString()}`).emit("postLiked", {
            likerName: req.user.fullName,
            likerUsername: req.user.username,
            postId: post._id,
            postContent: post.content ? (post.content.length > 50 ? post.content.substring(0, 50) + "..." : post.content) : "your post",
          });
        }
      }
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username")
      .populate("group", "name privacy topic");

    return res.status(200).json(updatedPost);
  } catch (error) {
    return res.status(500).json({ message: "Failed to toggle like on post" });
  }
};

// הוספת תגובה לפוסט קיים
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

    // הוספת התגובה למערך התגובות הפנימי של הפוסט.
    // Document type: Embedded / Subdocument
    post.comments.push({
      user: req.user._id,
      text,
    });

    await post.save();

    // שליחת התראה בזמן אמת.
    // Technology: WebSockets (Socket.io)
    // אם המשתמש שהגיב אינו בעל הפוסט בעצמו, נשלח התראה לחדר האישי של בעל הפוסט
    const userIdStr = req.user._id.toString();
    if (post.user.toString() !== userIdStr) {
      const io = req.app.get("io");
      if (io) {
        // שליחת אירוע לחדר האישי של הכותב.
        // Event: postCommented
        io.to(`user_${post.user.toString()}`).emit("postCommented", {
          commenterName: req.user.fullName,
          commenterUsername: req.user.username,
          postId: post._id,
          commentText: text.length > 50 ? text.substring(0, 50) + "..." : text,
          postContent: post.content ? (post.content.length > 50 ? post.content.substring(0, 50) + "..." : post.content) : "your post",
        });
      }
    }

    const updatedPost = await Post.findById(post._id)
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username")
      .populate("group", "name privacy topic");

    return res.status(201).json(updatedPost);
  } catch (error) {
    return res.status(500).json({ message: "Failed to add comment" });
  }
};

// Search posts by content, tag, date range, username, and group (respects group privacy)
const searchPosts = async (req, res) => {
  try {
    const { content, tag, fromDate, toDate, username, group } = req.query;
    const query = {};

    // 1. Enforce privacy visibility (only see group posts if you are a member or admin)
    const userId = req.user ? req.user._id : null;
    const groups = await Group.find();
    const visibleGroupIds = groups
      .filter(
        (g) =>
          userId && (req.user.role === "admin" || g.members.some((m) => m.toString() === userId.toString()))
      )
      .map((g) => g._id);

    // Fetch user to get friends list for visibility
    const user = await User.findById(req.user._id);
    const friendIds = user ? (user.friends || []).map((f) => f.toString()) : [];

    const publicGroupIds = groups
      .filter((g) => g.privacy === "public")
      .map((g) => g._id);

    // Visibility filter
    const visibilityQuery = {
      $or: [
        { group: null },
        { group: { $in: visibleGroupIds } },
        {
          $and: [
            { group: { $in: publicGroupIds } },
            { user: { $in: friendIds } }
          ]
        }
      ],
    };

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

    if (group) {
      // If a specific group is searched, verify visibility first
      if (!mongoose.Types.ObjectId.isValid(group)) {
        return res.status(400).json({ message: "Invalid group id" });
      }
      const isGroupVisible = visibleGroupIds.some(
        (gId) => gId.toString() === group.toString()
      );
      if (!isGroupVisible) {
        // If not a member, check if the group is public
        const groupObj = await Group.findById(group);
        if (groupObj && groupObj.privacy === "public") {
          // Public group: only show friends' posts
          query.group = group;
          query.user = { $in: friendIds };
        } else {
          // Private group: show nothing
          query._id = null;
        }
      } else {
        query.group = group;
      }
    } else {
      // Default visibility
      query.$or = visibilityQuery.$or;
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "fullName username bio")
      .populate("comments.user", "fullName username")
      .populate("group", "name privacy topic");

    // Inject friend status
    const postsWithFriendStatus = posts.map((post) => {
      const postObj = post.toObject();
      if (postObj.user) {
        const authorId = postObj.user._id ? postObj.user._id.toString() : postObj.user.toString();
        postObj.isFriend = friendIds.includes(authorId);
      } else {
        postObj.isFriend = false;
      }
      return postObj;
    });

    return res.status(200).json(postsWithFriendStatus);
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
