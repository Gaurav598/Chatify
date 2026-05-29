import express from "express";
import {
  sendMessage, getMessages, editMessage, deleteMessage,
  reactToMessage, togglePinMessage, searchMessages,
  getPinnedMessages, markAsRead,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All message routes require authentication
router.use(protectRoute);

// Message CRUD
router.post("/send/:id", ...sendMessage);
router.get("/:id", ...getMessages);
router.put("/:id", ...editMessage);
router.delete("/:id", deleteMessage);

// Message features
router.post("/:id/react", ...reactToMessage);
router.post("/:id/pin", togglePinMessage);
router.post("/:id/read", markAsRead);

// Search
router.get("/", ...searchMessages);

// Pinned messages for a conversation
router.get("/:id/pinned", getPinnedMessages);

export default router;
