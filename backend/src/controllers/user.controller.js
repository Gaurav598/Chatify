import { z } from "zod";
import userService from "../services/user.service.js";
import notificationService from "../services/notification.service.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { validate, objectId } from "../middleware/validate.js";

export const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.params.id);
  res.status(200).json({ success: true, data: { user } });
});

export const blockUser = asyncHandler(async (req, res) => {
  const result = await userService.blockUser(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const result = await userService.unblockUser(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const getBlockedUsers = asyncHandler(async (req, res) => {
  const users = await userService.getBlockedUsers(req.user._id);
  res.status(200).json({ success: true, data: { users } });
});

export const sendFriendRequest = asyncHandler(async (req, res) => {
  const request = await userService.sendFriendRequest(
    req.user._id,
    req.params.id,
    req.body.message
  );
  res.status(201).json({ success: true, data: { request } });
});

export const respondToFriendRequest = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const request = await userService.respondToFriendRequest(
    req.params.id,
    req.user._id,
    status
  );
  res.status(200).json({ success: true, data: { request } });
});

export const getPendingRequests = asyncHandler(async (req, res) => {
  const requests = await userService.getPendingRequests(req.user._id);
  res.status(200).json({ success: true, data: requests });
});

export const getContacts = asyncHandler(async (req, res) => {
  const contacts = await userService.getContacts(req.user._id);
  res.status(200).json({ success: true, data: { contacts } });
});

export const removeContact = asyncHandler(async (req, res) => {
  const result = await userService.removeContact(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await userService.updateSettings(req.user._id, req.body);
  res.status(200).json({ success: true, data: { settings } });
});

export const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query?.page) || 1;
  const limit = parseInt(req.query?.limit) || 30;
  const result = await notificationService.getUserNotifications(req.user._id, { page, limit });
  res.status(200).json({ success: true, data: result });
});

export const markNotificationsRead = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (ids) {
    await notificationService.markAsRead(ids, req.user._id);
  } else {
    await notificationService.markAllAsRead(req.user._id);
  }
  res.status(200).json({ success: true, data: { message: "Notifications marked as read" } });
});
