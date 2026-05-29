import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/errors.js";
import logger from "../config/logger.js";
import cloudinary from "../config/cloudinary.js";

class MessageService {
  /**
   * Send a message
   */
  async sendMessage({ senderId, conversationId, recipientId, text, media, replyTo, type = "text" }) {
    // If no conversationId, create/find direct conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) throw new NotFoundError("Conversation not found");
      if (!conversation.isParticipant(senderId)) {
        throw new ForbiddenError("Not a participant in this conversation");
      }
    } else if (recipientId) {
      // Check if sender is blocked by recipient
      const recipient = await User.findById(recipientId);
      if (!recipient) throw new NotFoundError("Recipient not found");
      if (recipient.isBlocked(senderId)) {
        throw new ForbiddenError("Cannot send messages to this user");
      }
      if (senderId.toString() === recipientId.toString()) {
        throw new BadRequestError("Cannot send messages to yourself");
      }
      conversation = await Conversation.findOrCreateDirect(senderId, recipientId);
    } else {
      throw new BadRequestError("Either conversationId or recipientId is required");
    }

    if (!text && !media) {
      throw new BadRequestError("Message content is required");
    }

    // Handle media upload
    let mediaData = null;
    if (media) {
      mediaData = await this.processMedia(media, type);
    }

    // Parse mentions from text
    const mentions = text ? this.parseMentions(text) : [];

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      type,
      text: text?.trim(),
      media: mediaData,
      replyTo,
      mentions,
    });

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    conversation.messageCount += 1;
    await conversation.save();

    // Populate sender info for real-time delivery
    await message.populate("senderId", "fullName profilePic username");
    if (message.replyTo) {
      await message.populate({
        path: "replyTo",
        select: "text senderId type",
        populate: { path: "senderId", select: "fullName" },
      });
    }

    logger.debug(`Message sent in conversation ${conversation._id} by ${senderId}`);

    return { message, conversation };
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(conversationId, userId, { page = 1, limit = 50 }) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation not found");
    if (!conversation.isParticipant(userId)) {
      throw new ForbiddenError("Not a participant in this conversation");
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "fullName profilePic username")
      .populate({
        path: "replyTo",
        select: "text senderId type media",
        populate: { path: "senderId", select: "fullName" },
      })
      .populate("reactions.userId", "fullName profilePic")
      .lean();

    const total = await Message.countDocuments({
      conversationId,
      deletedFor: { $ne: userId },
    });

    return {
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  }

  /**
   * Get messages by direct recipient (convenience method)
   */
  async getMessagesByRecipient(userId, recipientId, options) {
    const conversation = await Conversation.findOne({
      type: "direct",
      "participants.userId": { $all: [userId, recipientId] },
    });

    if (!conversation) return { messages: [], pagination: { page: 1, limit: 50, total: 0, pages: 0, hasMore: false } };

    return this.getMessages(conversation._id, userId, options);
  }

  /**
   * Edit a message
   */
  async editMessage(messageId, userId, newText) {
    const message = await Message.findById(messageId);
    if (!message) throw new NotFoundError("Message not found");
    if (message.senderId.toString() !== userId.toString()) {
      throw new ForbiddenError("Can only edit your own messages");
    }
    if (message.type !== "text") {
      throw new BadRequestError("Can only edit text messages");
    }

    // Allow editing within 15 minutes
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > fifteenMinutes) {
      throw new BadRequestError("Cannot edit messages older than 15 minutes");
    }

    message.text = newText.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate("senderId", "fullName profilePic username");

    return message;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId, userId, deleteForEveryone = false) {
    const message = await Message.findById(messageId);
    if (!message) throw new NotFoundError("Message not found");

    if (deleteForEveryone) {
      if (message.senderId.toString() !== userId.toString()) {
        throw new ForbiddenError("Can only delete your own messages for everyone");
      }
      message.deletedAt = new Date();
      message.text = undefined;
      message.media = undefined;
    } else {
      // Delete for self only
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
      }
    }

    await message.save();
    return message;
  }

  /**
   * React to a message
   */
  async reactToMessage(messageId, userId, emoji) {
    const message = await Message.findById(messageId);
    if (!message) throw new NotFoundError("Message not found");

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== userId.toString()
    );

    // Add new reaction (unless removing)
    if (emoji) {
      message.reactions.push({ userId, emoji });
    }

    await message.save();
    await message.populate("reactions.userId", "fullName profilePic");

    return message;
  }

  /**
   * Pin/unpin a message
   */
  async togglePinMessage(messageId, userId, conversationId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation not found");

    const message = await Message.findById(messageId);
    if (!message) throw new NotFoundError("Message not found");

    if (message.isPinned) {
      message.isPinned = false;
      conversation.pinnedMessages = conversation.pinnedMessages.filter(
        (id) => id.toString() !== messageId
      );
    } else {
      if (conversation.pinnedMessages.length >= 50) {
        throw new BadRequestError("Maximum 50 pinned messages allowed");
      }
      message.isPinned = true;
      conversation.pinnedMessages.push(messageId);
    }

    await Promise.all([message.save(), conversation.save()]);
    return message;
  }

  /**
   * Forward a message
   */
  async forwardMessage(messageId, senderId, targetConversationId) {
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) throw new NotFoundError("Original message not found");

    const sender = await User.findById(originalMessage.senderId);

    return this.sendMessage({
      senderId,
      conversationId: targetConversationId,
      text: originalMessage.text,
      media: originalMessage.media ? { ...originalMessage.media.toObject() } : undefined,
      type: originalMessage.type,
    });
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return;

    // Update participant's lastReadAt
    const participant = conversation.getParticipant(userId);
    if (participant) {
      participant.lastReadAt = new Date();
      await conversation.save();
    }

    // Add read receipt to unread messages
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        "readBy.userId": { $ne: userId },
      },
      {
        $push: {
          readBy: { userId, readAt: new Date() },
        },
      }
    );
  }

  /**
   * Search messages
   */
  async searchMessages(userId, query, { page = 1, limit = 20 }) {
    // Get user's conversations
    const conversations = await Conversation.find({
      "participants.userId": userId,
    }).select("_id");

    const conversationIds = conversations.map((c) => c._id);

    const skip = (page - 1) * limit;
    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      $text: { $search: query },
      deletedAt: null,
      deletedFor: { $ne: userId },
    })
      .sort({ score: { $meta: "textScore" } })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "fullName profilePic username")
      .populate("conversationId", "type groupInfo participants")
      .lean();

    return messages;
  }

  /**
   * Get pinned messages for a conversation
   */
  async getPinnedMessages(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation not found");
    if (!conversation.isParticipant(userId)) {
      throw new ForbiddenError("Not a participant");
    }

    return Message.find({
      conversationId,
      isPinned: true,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "fullName profilePic username")
      .lean();
  }

  /**
   * Process media upload
   */
  async processMedia(media, type) {
    // If it's a base64 string, upload to Cloudinary
    if (typeof media === "string" && media.startsWith("data:")) {
      const resourceType = type === "video" ? "video" : type === "voice" ? "video" : "image";
      const uploadResponse = await cloudinary.uploader.upload(media, {
        resource_type: resourceType,
        folder: `chatify/${type}s`,
        transformation: type === "image" ? [{ quality: "auto", fetch_format: "auto" }] : undefined,
      });

      return {
        url: uploadResponse.secure_url,
        publicId: uploadResponse.public_id,
        type: `${type}/*`,
        size: uploadResponse.bytes,
        duration: uploadResponse.duration,
      };
    }

    // If it's already a media object (forwarded message)
    if (typeof media === "object" && media.url) {
      return media;
    }

    throw new BadRequestError("Invalid media format");
  }

  /**
   * Parse @mentions from text
   */
  parseMentions(text) {
    const mentionRegex = /@\[([^\]]+)\]\(([a-f0-9]{24})\)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]);
    }
    return mentions;
  }
}

export default new MessageService();
