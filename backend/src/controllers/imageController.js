const ImageService = require('../services/imageService');

class ImageController {
    static async uploadImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No image file provided' });
            }

            const messageId = req.body.messageId;
            if (!messageId) {
                return res.status(400).json({ error: 'Message ID is required' });
            }

            const image = await ImageService.saveImage(req.file, messageId);
            res.status(201).json(image);
        } catch (err) {
            console.error('Error uploading image:', err);
            res.status(500).json({ error: 'Failed to upload image' });
        }
    }

    static async getImagesByMessageId(req, res) {
        try {
            const messageId = req.params.messageId;
            const images = await ImageService.getImagesByMessageId(messageId);
            res.status(200).json(images);
        } catch (err) {
            console.error('Error getting images:', err);
            res.status(500).json({ error: 'Failed to get images' });
        }
    }

    static async getImage(req, res) {
        try {
            const imageId = req.params.id;
            const image = await ImageService.getImageById(imageId);
            if (!image) {
                return res.status(404).json({ error: 'Image not found' });
            }
            res.status(200).json(image);
        } catch (err) {
            console.error('Error getting image:', err);
            res.status(500).json({ error: 'Failed to get image' });
        }
    }

    static async deleteImage(req, res) {
        try {
            const imageId = req.params.id;
            const result = await ImageService.deleteImage(imageId);
            if (!result) {
                return res.status(404).json({ error: 'Image not found' });
            }
            res.status(200).json({ message: 'Image deleted successfully' });
        } catch (err) {
            console.error('Error deleting image:', err);
            res.status(500).json({ error: 'Failed to delete image' });
        }
    }
}

module.exports = ImageController;
