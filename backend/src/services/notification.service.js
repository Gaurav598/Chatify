import Notification from "../models/Notification.js";
import { getReceiverSocketId, io } from "../socket/index.js";
import logger from "../config/logger.js";

class NotificationService {
  /**
   * Create and deliver a notification
   */
  async create({ recipient, sender, type, title, body, reference }) {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      body,
      reference,
    });

    await notification.populate("sender", "fullName profilePic username");

    // Deliver via WebSocket if user is online
    const socketId = getReceiverSocketId(recipient.toString());
    if (socketId) {
      io.to(socketId).emit("notification", notification);
    }

    return notification;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, { page = 1, limit = 30 }) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "fullName profilePic username")
        .lean(),
      Notification.countDocuments({ recipient: userId }),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds, userId) {
    await Notification.updateMany(
      { _id: { $in: notificationIds }, recipient: userId },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * Delete a notification
   */
  async delete(notificationId, userId) {
    await Notification.deleteOne({ _id: notificationId, recipient: userId });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({ recipient: userId, isRead: false });
  }
}

export default new NotificationService();
