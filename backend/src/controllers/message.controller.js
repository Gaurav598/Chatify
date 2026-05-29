import { z } from "zod";
import messageService from "../services/message.service.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { validate, objectId, paginationQuery } from "../middleware/validate.js";

// Validation schemas
const sendMessageSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    text: z.string().max(5000).optional(),
    image: z.string().optional(),
    media: z.string().optional(),
    type: z.enum(["text", "image", "video", "file", "voice"]).default("text"),
    replyTo: objectId.optional(),
  }),
});

const getMessagesSchema = z.object({
  params: z.object({ id: objectId }),
  query: paginationQuery.optional(),
});

const editMessageSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    text: z.string().min(1).max(5000),
  }),
});

const reactSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    emoji: z.string().max(10).optional(),
  }),
});

const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1),
    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(50).default(20).optional(),
  }),
});

// Controllers
export const sendMessage = [
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const { text, image, media, type, replyTo } = req.body;
    const recipientId = req.params.id;

    const result = await messageService.sendMessage({
      senderId: req.user._id,
      recipientId,
      text,
      media: image || media,
      type: image ? "image" : type,
      replyTo,
    });

    // Emit real-time event
    const { getReceiverSocketId, io } = await import("../socket/index.js");
    const conversation = result.conversation;

    // Notify all participants except sender
    const participants = conversation.participants || [];
    for (const p of participants) {
      const pid = p.userId?.toString() || p.toString();
      if (pid !== req.user._id.toString()) {
        const socketId = getReceiverSocketId(pid);
        if (socketId) {
          io.to(socketId).emit("newMessage", result.message);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: { message: result.message },
    });
  }),
];

export const getMessages = [
  validate(getMessagesSchema),
  asyncHandler(async (req, res) => {
    const recipientId = req.params.id;
    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 50;

    const result = await messageService.getMessagesByRecipient(
      req.user._id,
      recipientId,
      { page, limit }
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  }),
];

export const editMessage = [
  validate(editMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await messageService.editMessage(
      req.params.id,
      req.user._id,
      req.body.text
    );

    // Emit edit event to conversation participants
    const { getReceiverSocketId, io } = await import("../socket/index.js");
    const conversation = await (await import("../models/Conversation.js")).default.findById(
      message.conversationId
    );
    if (conversation) {
      for (const p of conversation.participants) {
        const pid = p.userId.toString();
        if (pid !== req.user._id.toString()) {
          const socketId = getReceiverSocketId(pid);
          if (socketId) {
            io.to(socketId).emit("messageEdited", message);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: { message },
    });
  }),
];

export const deleteMessage = asyncHandler(async (req, res) => {
  const { deleteForEveryone } = req.body;
  const message = await messageService.deleteMessage(
    req.params.id,
    req.user._id,
    deleteForEveryone
  );

  // Emit delete event
  if (deleteForEveryone) {
    const { getReceiverSocketId, io } = await import("../socket/index.js");
    const Conversation = (await import("../models/Conversation.js")).default;
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation) {
      for (const p of conversation.participants) {
        const pid = p.userId.toString();
        if (pid !== req.user._id.toString()) {
          const socketId = getReceiverSocketId(pid);
          if (socketId) {
            io.to(socketId).emit("messageDeleted", {
              messageId: message._id,
              conversationId: message.conversationId,
            });
          }
        }
      }
    }
  }

  res.status(200).json({
    success: true,
    data: { message: "Message deleted" },
  });
});

export const reactToMessage = [
  validate(reactSchema),
  asyncHandler(async (req, res) => {
    const message = await messageService.reactToMessage(
      req.params.id,
      req.user._id,
      req.body.emoji
    );

    // Emit reaction event
    const { getReceiverSocketId, io } = await import("../socket/index.js");
    const Conversation = (await import("../models/Conversation.js")).default;
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation) {
      for (const p of conversation.participants) {
        const pid = p.userId.toString();
        if (pid !== req.user._id.toString()) {
          const socketId = getReceiverSocketId(pid);
          if (socketId) {
            io.to(socketId).emit("messageReaction", {
              messageId: message._id,
              reactions: message.reactions,
              conversationId: message.conversationId,
            });
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: { message },
    });
  }),
];

export const togglePinMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.body;
  const message = await messageService.togglePinMessage(
    req.params.id,
    req.user._id,
    conversationId
  );

  res.status(200).json({
    success: true,
    data: { message },
  });
});

export const searchMessages = [
  validate(searchSchema),
  asyncHandler(async (req, res) => {
    const { q, page, limit } = req.query;
    const messages = await messageService.searchMessages(req.user._id, q, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.status(200).json({
      success: true,
      data: { messages },
    });
  }),
];

export const getPinnedMessages = asyncHandler(async (req, res) => {
  const messages = await messageService.getPinnedMessages(
    req.params.id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    data: { messages },
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  await messageService.markAsRead(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    data: { message: "Messages marked as read" },
  });
});
