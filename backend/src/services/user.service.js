import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../utils/errors.js";
import notificationService from "./notification.service.js";
import logger from "../config/logger.js";

class UserService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const user = await User.findById(userId)
      .select("fullName profilePic username bio status lastSeen customStatus createdAt");
    if (!user) throw new NotFoundError("User not found");
    return user;
  }

  /**
   * Block a user
   */
  async blockUser(userId, targetId) {
    if (userId.toString() === targetId.toString()) {
      throw new BadRequestError("Cannot block yourself");
    }

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    if (user.isBlocked(targetId)) {
      throw new ConflictError("User already blocked");
    }

    user.blockedUsers.push(targetId);
    // Also remove from contacts
    user.contacts = user.contacts.filter((id) => id.toString() !== targetId.toString());
    await user.save();

    logger.info(`User ${userId} blocked ${targetId}`);
    return { message: "User blocked successfully" };
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId, targetId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== targetId.toString()
    );
    await user.save();

    return { message: "User unblocked successfully" };
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId) {
    const user = await User.findById(userId).populate("blockedUsers", "fullName profilePic username");
    if (!user) throw new NotFoundError("User not found");
    return user.blockedUsers;
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(fromId, toId, message) {
    if (fromId.toString() === toId.toString()) {
      throw new BadRequestError("Cannot send friend request to yourself");
    }

    const targetUser = await User.findById(toId);
    if (!targetUser) throw new NotFoundError("User not found");

    if (targetUser.isBlocked(fromId)) {
      throw new ForbiddenError("Cannot send request to this user");
    }

    // Check if already contacts
    const fromUser = await User.findById(fromId);
    if (fromUser.isContact(toId)) {
      throw new ConflictError("Already in your contacts");
    }

    // Check for existing pending request
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: fromId, to: toId, status: "pending" },
        { from: toId, to: fromId, status: "pending" },
      ],
    });

    if (existingRequest) {
      if (existingRequest.from.toString() === toId.toString()) {
        // They already sent us a request — auto-accept
        return this.respondToFriendRequest(existingRequest._id, fromId, "accepted");
      }
      throw new ConflictError("Friend request already sent");
    }

    const request = await FriendRequest.create({
      from: fromId,
      to: toId,
      message,
    });

    await request.populate("from", "fullName profilePic username");

    // Send notification
    await notificationService.create({
      recipient: toId,
      sender: fromId,
      type: "friend_request",
      title: `${fromUser.fullName} sent you a friend request`,
      body: message || undefined,
      reference: { model: "FriendRequest", id: request._id },
    });

    logger.info(`Friend request sent: ${fromId} → ${toId}`);
    return request;
  }

  /**
   * Respond to a friend request
   */
  async respondToFriendRequest(requestId, userId, status) {
    const request = await FriendRequest.findById(requestId);
    if (!request) throw new NotFoundError("Friend request not found");
    if (request.to.toString() !== userId.toString()) {
      throw new ForbiddenError("Not your request to respond to");
    }
    if (request.status !== "pending") {
      throw new BadRequestError("Request already responded to");
    }

    request.status = status;
    request.respondedAt = new Date();
    await request.save();

    if (status === "accepted") {
      // Add each other as contacts
      await User.findByIdAndUpdate(request.from, {
        $addToSet: { contacts: request.to },
      });
      await User.findByIdAndUpdate(request.to, {
        $addToSet: { contacts: request.from },
      });

      const user = await User.findById(userId);

      // Send notification to requester
      await notificationService.create({
        recipient: request.from,
        sender: userId,
        type: "friend_accepted",
        title: `${user.fullName} accepted your friend request`,
        reference: { model: "User", id: userId },
      });

      logger.info(`Friend request accepted: ${request.from} ← ${request.to}`);
    }

    return request;
  }

  /**
   * Get pending friend requests for a user
   */
  async getPendingRequests(userId) {
    const [incoming, outgoing] = await Promise.all([
      FriendRequest.find({ to: userId, status: "pending" })
        .populate("from", "fullName profilePic username bio")
        .sort({ createdAt: -1 })
        .lean(),
      FriendRequest.find({ from: userId, status: "pending" })
        .populate("to", "fullName profilePic username bio")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return { incoming, outgoing };
  }

  /**
   * Remove a contact
   */
  async removeContact(userId, contactId) {
    await User.findByIdAndUpdate(userId, {
      $pull: { contacts: contactId },
    });
    await User.findByIdAndUpdate(contactId, {
      $pull: { contacts: userId },
    });

    return { message: "Contact removed" };
  }

  /**
   * Get user's contacts
   */
  async getContacts(userId) {
    const user = await User.findById(userId).populate(
      "contacts",
      "fullName profilePic username status lastSeen bio customStatus"
    );
    if (!user) throw new NotFoundError("User not found");
    return user.contacts;
  }

  /**
   * Update user settings
   */
  async updateSettings(userId, settings) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    if (settings.notifications) {
      user.settings.notifications = { ...user.settings.notifications, ...settings.notifications };
    }
    if (settings.privacy) {
      user.settings.privacy = { ...user.settings.privacy, ...settings.privacy };
    }
    if (settings.theme) {
      user.settings.theme = settings.theme;
    }

    await user.save();
    return user.settings;
  }
}

export default new UserService();
