import express from "express";
import {
  getConversations, getOrCreateDirect, createGroup,
  addMembers, removeMember, leaveGroup, updateGroup,
  toggleMute, getContacts, searchUsers,
} from "../controllers/conversation.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

// Conversations
router.get("/", getConversations);
router.get("/contacts", getContacts);
router.get("/search", searchUsers);
router.get("/direct/:id", getOrCreateDirect);

// Groups
router.post("/group", ...createGroup);
router.put("/group/:id", ...updateGroup);
router.post("/group/:id/members", ...addMembers);
router.delete("/group/:conversationId/members/:memberId", removeMember);
router.post("/group/:id/leave", leaveGroup);
router.post("/:id/mute", toggleMute);

export default router;
