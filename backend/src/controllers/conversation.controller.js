import { z } from "zod";
import conversationService from "../services/conversation.service.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { validate, objectId } from "../middleware/validate.js";

const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    avatar: z.string().optional(),
    participantIds: z.array(objectId).min(1).max(255),
  }),
});

const addMembersSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    memberIds: z.array(objectId).min(1).max(255),
  }),
});

const updateGroupSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    avatar: z.string().optional(),
  }),
});

export const getConversations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query?.page) || 1;
  const limit = parseInt(req.query?.limit) || 50;

  const conversations = await conversationService.getUserConversations(
    req.user._id,
    { page, limit }
  );

  res.status(200).json({
    success: true,
    data: { conversations },
  });
});

export const getOrCreateDirect = asyncHandler(async (req, res) => {
  const conversation = await conversationService.getOrCreateDirect(
    req.user._id,
    req.params.id
  );

  res.status(200).json({
    success: true,
    data: { conversation },
  });
});

export const createGroup = [
  validate(createGroupSchema),
  asyncHandler(async (req, res) => {
    const conversation = await conversationService.createGroup(
      req.user._id,
      req.body
    );

    // Notify all participants via socket
    const { getReceiverSocketId, io } = await import("../socket/index.js");
    for (const p of conversation.participants) {
      const pid = p.userId._id?.toString() || p.userId.toString();
      if (pid !== req.user._id.toString()) {
        const socketId = getReceiverSocketId(pid);
        if (socketId) {
          io.to(socketId).emit("newConversation", conversation);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: { conversation },
    });
  }),
];

export const addMembers = [
  validate(addMembersSchema),
  asyncHandler(async (req, res) => {
    const conversation = await conversationService.addMembers(
      req.params.id,
      req.user._id,
      req.body.memberIds
    );

    res.status(200).json({
      success: true,
      data: { conversation },
    });
  }),
];

export const removeMember = asyncHandler(async (req, res) => {
  const conversation = await conversationService.removeMember(
    req.params.conversationId,
    req.user._id,
    req.params.memberId
  );

  res.status(200).json({
    success: true,
    data: { conversation },
  });
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const conversation = await conversationService.removeMember(
    req.params.id,
    req.user._id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    data: { message: "Left the group" },
  });
});

export const updateGroup = [
  validate(updateGroupSchema),
  asyncHandler(async (req, res) => {
    const conversation = await conversationService.updateGroup(
      req.params.id,
      req.user._id,
      req.body
    );

    res.status(200).json({
      success: true,
      data: { conversation },
    });
  }),
];

export const toggleMute = asyncHandler(async (req, res) => {
  const { mute, duration } = req.body;
  const conversation = await conversationService.toggleMute(
    req.params.id,
    req.user._id,
    mute,
    duration
  );

  res.status(200).json({
    success: true,
    data: { conversation },
  });
});

export const getContacts = asyncHandler(async (req, res) => {
  const contacts = await conversationService.getContacts(req.user._id);

  res.status(200).json({
    success: true,
    data: { contacts },
  });
});

export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const users = await conversationService.searchUsers(req.user._id, q);

  res.status(200).json({
    success: true,
    data: { users },
  });
});
