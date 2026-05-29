import express from "express";
import {
  getProfile, blockUser, unblockUser, getBlockedUsers,
  sendFriendRequest, respondToFriendRequest, getPendingRequests,
  getContacts, removeContact, updateSettings,
  getNotifications, markNotificationsRead,
} from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

// Profile
router.get("/profile/:id", getProfile);

// Contacts & Friends
router.get("/contacts", getContacts);
router.delete("/contacts/:id", removeContact);
router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id", respondToFriendRequest);
router.get("/friend-requests", getPendingRequests);

// Blocking
router.post("/block/:id", blockUser);
router.delete("/block/:id", unblockUser);
router.get("/blocked", getBlockedUsers);

// Settings
router.put("/settings", updateSettings);

// Notifications
router.get("/notifications", getNotifications);
router.put("/notifications/read", markNotificationsRead);

export default router;
