const Image = require('../models/imageModel');

class ImageRepository {
    static async create(imageData) {
        return await Image.create(imageData);
    }

    static async findByMessageId(messageId) {
        return await Image.findAll({
            where: { message_id: messageId }
        });
    }

    static async findById(id) {
        return await Image.findByPk(id);
    }

    static async delete(id) {
        return await Image.destroy({
            where: { id }
        });
    }
}

module.exports = ImageRepository;
