import { resendClient, sender } from "../lib/resend.js";
import { createWelcomeEmailTemplate, createResetPasswordTemplate } from "./emailTemplates.js";
import logger from "../config/logger.js";

export const sendWelcomeEmail = async (email, name, clientURL) => {
  if (!resendClient) {
    logger.info(`[Email Simulated] Welcome email to ${email} (${name})`);
    return;
  }

  const { data, error } = await resendClient.emails.send({
    from: `${sender.name} <${sender.email}>`,
    to: email,
    subject: "Welcome to Chatify! 🎉",
    html: createWelcomeEmailTemplate(name, clientURL),
  });

  if (error) {
    logger.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email");
  }

  logger.info(`Welcome email sent to ${email}`, data);
};

export const sendPasswordResetEmail = async (email, name, resetUrl) => {
  if (!resendClient) {
    logger.info(`[Email Simulated] Password reset email to ${email}. URL: ${resetUrl}`);
    return;
  }

  const { data, error } = await resendClient.emails.send({
    from: `${sender.name} <${sender.email}>`,
    to: email,
    subject: "Reset Your Password - Chatify",
    html: createResetPasswordTemplate(name, resetUrl),
  });

  if (error) {
    logger.error("Error sending reset email:", error);
    throw new Error("Failed to send reset email");
  }

  logger.info(`Password reset email sent to ${email}`, data);
};
