import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/errors.js";
import logger from "../config/logger.js";

class ConversationService {
  /**
   * Get all conversations for a user (sidebar list)
   */
  async getUserConversations(userId, { page = 1, limit = 50 }) {
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({
      "participants.userId": userId,
      isActive: true,
    })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("lastMessage", "text type senderId createdAt media")
      .populate("participants.userId", "fullName profilePic username status lastSeen")
      .lean();

    // Calculate unread count for each conversation
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find(
          (p) => p.userId._id.toString() === userId.toString()
        );

        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: userId },
          createdAt: { $gt: participant?.lastReadAt || new Date(0) },
          deletedAt: null,
        });

        return {
          ...conv,
          unreadCount,
        };
      })
    );

    return enriched;
  }

  /**
   * Get or create a direct conversation
   */
  async getOrCreateDirect(userId, otherUserId) {
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) throw new NotFoundError("User not found");

    if (otherUser.isBlocked(userId)) {
      throw new ForbiddenError("Cannot start conversation with this user");
    }

    const conversation = await Conversation.findOrCreateDirect(userId, otherUserId);

    await conversation.populate("participants.userId", "fullName profilePic username status lastSeen");
    await conversation.populate("lastMessage", "text type senderId createdAt media");

    return conversation;
  }

  /**
   * Create a group conversation
   */
  async createGroup(creatorId, { name, description, avatar, participantIds }) {
    if (!name || name.trim().length < 2) {
      throw new BadRequestError("Group name must be at least 2 characters");
    }

    if (!participantIds || participantIds.length < 1) {
      throw new BadRequestError("At least 1 other participant is required");
    }

    if (participantIds.length > 256) {
      throw new BadRequestError("Group cannot have more than 256 members");
    }

    // Verify all participants exist
    const users = await User.find({ _id: { $in: participantIds } });
    if (users.length !== participantIds.length) {
      throw new BadRequestError("One or more participants not found");
    }

    // Remove duplicates and creator from participant list
    const uniqueParticipants = [...new Set(participantIds.map(String))].filter(
      (id) => id !== creatorId.toString()
    );

    const participants = [
      { userId: creatorId, role: "owner" },
      ...uniqueParticipants.map((id) => ({ userId: id, role: "member" })),
    ];

    const conversation = await Conversation.create({
      type: "group",
      participants,
      groupInfo: {
        name: name.trim(),
        description: description?.trim(),
        avatar,
        createdBy: creatorId,
      },
    });

    await conversation.populate("participants.userId", "fullName profilePic username status");

    logger.info(`Group created: "${name}" by ${creatorId} with ${participants.length} members`);

    return conversation;
  }

  /**
   * Add members to a group
   */
  async addMembers(conversationId, requesterId, memberIds) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation not found");
    if (conversation.type !== "group") throw new BadRequestError("Not a group conversation");
    if (!conversation.isAdmin(requesterId)) {
      throw new ForbiddenError("Only admins can add members");
    }

    const currentParticipantIds = conversation.participants.map((p) => p.userId.toString());
    const newMemberIds = memberIds.filter((id) => !currentParticipantIds.includes(id.toString()));

    if (newMemberIds.length === 0) {
      throw new BadRequestError("All users are already members");
    }

    if (conversation.participants.length + newMemberIds.length > 256) {
      throw new BadRequestError("Group cannot have more than 256 members");
    }

    conversation.participants.push(
      ...newMemberIds.map((id) => ({ userId: id, role: "member" }))
    );

    await conversation.save();
    await conversation.populate("participants.userId", "fullName profilePic username status");

    return conversation;
  }

  /**
   * Remove a member from a group
   */
  async removeMember(conversationId, requesterId, memberId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation not found");
    if (conversation.type !== "group") throw new BadRequestError("Not a group conversation");

    // Allow self-removal (leaving group) or admin removal
    const isSelfRemoval = requesterId.toString() === memberId.toString();
    if (!isSelfRemoval && !conversation.isAdmin(requesterId)) {
      throw new ForbiddenError("Only admins can remove members");
    }

    const memberParticipant = conversation.getParticipant(memberId);
    if (!memberParticipant) throw new BadRequestError("User is not a member");

    if (memberParticipant.role === "owner" && !isSelfRemoval) {
      throw new ForbiddenError("Cannot remove the group owner");
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.userId.toString() !== memberId.toString()
    );

    // If owner leaves, transfer ownership
    if (memberParticipant.role === "owner" && conversation.participants.length > 0) {
      const newOwner = conversation.participants.find((p) => p.role === "admin")
        || conversation.participants[0];
      newOwner.role = "owner";
    }

    // Deactivate if no members left
    if (conversation.participants.length === 0) {
      conversation.isActive = false;
    }

    await conversation.save();
    return conversation;
  }

  /**
   * Update group info
   */
  async updateGroup(conversationId, requesterId, updates) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation not found");
    if (conversation.type !== "group") throw new BadRequestError("Not a group conversation");
    if (!conversation.isAdmin(requesterId)) {
      throw new ForbiddenError("Only admins can update group info");
    }

    const allowedUpdates = ["name", "description", "avatar"];
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        conversation.groupInfo[key] = updates[key];
      }
    }

    await conversation.save();
    return conversation;
  }

  /**
   * Update member role
   */
  async updateMemberRole(conversationId, requesterId, memberId, newRole) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation not found");

    const requesterParticipant = conversation.getParticipant(requesterId);
    if (!requesterParticipant || requesterParticipant.role !== "owner") {
      throw new ForbiddenError("Only the owner can change roles");
    }

    const memberParticipant = conversation.getParticipant(memberId);
    if (!memberParticipant) throw new BadRequestError("User is not a member");

    memberParticipant.role = newRole;
    await conversation.save();

    return conversation;
  }

  /**
   * Mute/unmute a conversation for a user
   */
  async toggleMute(conversationId, userId, mute = true, duration = null) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation not found");

    const participant = conversation.getParticipant(userId);
    if (!participant) throw new ForbiddenError("Not a participant");

    participant.isMuted = mute;
    participant.mutedUntil = duration ? new Date(Date.now() + duration) : null;

    await conversation.save();
    return conversation;
  }

  /**
   * Get all contacts (users) for a user
   */
  async getContacts(userId) {
    return User.find({
      _id: { $ne: userId },
      blockedUsers: { $ne: userId },
    })
      .select("fullName profilePic username status lastSeen bio")
      .sort({ fullName: 1 })
      .lean();
  }

  /**
   * Search users
   */
  async searchUsers(userId, query) {
    if (!query || query.length < 2) return [];

    return User.find({
      _id: { $ne: userId },
      blockedUsers: { $ne: userId },
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
      .select("fullName profilePic username status lastSeen bio")
      .limit(20)
      .lean();
  }
}

export default new ConversationService();
