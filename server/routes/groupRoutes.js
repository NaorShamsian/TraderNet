const express = require("express");
const {
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
} = require("../controllers/groupController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Apply authMiddleware to all group routes to ensure standard security
router.use(authMiddleware);

router.post("/", createGroup);
router.get("/", getGroups);
router.get("/search", searchGroups);

router.get("/:id", getGroupById);
router.put("/:id", updateGroup);
router.delete("/:id", deleteGroup);

router.post("/:id/join", joinGroup);
router.post("/:id/leave", leaveGroup);
router.post("/:id/cancel-request", cancelJoinRequest);
router.post("/:id/approve/:userId", approveJoinRequest);
router.post("/:id/reject/:userId", rejectJoinRequest);
router.post("/:id/remove/:userId", removeGroupMember);
router.post("/:id/promote/:userId", promoteMemberToStaff);
router.post("/:id/demote/:userId", demoteMemberToListener);

module.exports = router;

