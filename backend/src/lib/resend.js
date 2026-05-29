import { Resend } from "resend";
import config from "../config/index.js";
import logger from "../config/logger.js";

let resendClient = null;

if (config.email.apiKey) {
  resendClient = new Resend(config.email.apiKey);
  logger.info("Resend email client configured");
} else {
  logger.warn("Resend API key not configured — emails will be logged to console");
}

const sender = {
  email: config.email.from || "noreply@chatify.app",
  name: config.email.fromName || "Chatify",
};

export { resendClient, sender };
