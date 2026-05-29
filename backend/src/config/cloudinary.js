import { v2 as cloudinary } from "cloudinary";
import config from "./index.js";
import logger from "./logger.js";

if (config.cloudinary.cloudName) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
  logger.info("Cloudinary configured");
} else {
  logger.warn("Cloudinary not configured — file uploads will be disabled");
}

export default cloudinary;
