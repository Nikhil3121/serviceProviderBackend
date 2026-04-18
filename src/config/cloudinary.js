// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload an image to Cloudinary.
 * Accepts a file path (string), a URL (string), or a Buffer (from multer memoryStorage).
 */
const uploadImage = (filePathOrBuffer, folder = 'service-provider') => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'auto',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    };

    // Buffer from multer memoryStorage — use upload_stream
    if (Buffer.isBuffer(filePathOrBuffer)) {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload_stream error:', error);
            return reject(new Error('Image upload failed'));
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(filePathOrBuffer);
    } else {
      // File path or URL
      cloudinary.uploader.upload(filePathOrBuffer, uploadOptions, (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error);
          return reject(new Error('Image upload failed'));
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      });
    }
  });
};

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    return false;
  }
};

module.exports = { cloudinary, uploadImage, deleteImage };
