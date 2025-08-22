const ImageRepository = require('../repositories/imageRepository');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ImageService {
    static async saveImage(file, messageId) {
        const uploadDir = path.join(__dirname, '../../uploads/images');
        
        // Ensure upload directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        const fileExtension = path.extname(file.originalname);
        const filename = `${uuidv4()}${fileExtension}`;
        const filepath = path.join(uploadDir, filename);

        // Save file to disk
        await fs.writeFile(filepath, file.buffer);

        // Save image metadata to database
        const imageData = {
            message_id: messageId,
            filename: filename,
            path: `/uploads/images/${filename}`,
            mimetype: file.mimetype,
            size: file.size
        };

        return await ImageRepository.create(imageData);
    }

    static async getImagesByMessageId(messageId) {
        return await ImageRepository.findByMessageId(messageId);
    }

    static async getImageById(id) {
        return await ImageRepository.findById(id);
    }

    static async deleteImage(id) {
        const image = await ImageRepository.findById(id);
        if (image) {
            const filepath = path.join(__dirname, '../..', image.path);
            await fs.unlink(filepath);
            return await ImageRepository.delete(id);
        }
        return false;
    }
}

module.exports = ImageService;
