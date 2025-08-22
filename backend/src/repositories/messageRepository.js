const Message = require('../models/messageModel');
const User = require('../models/userModel');
const Image = require('../models/imageModel');

class MessageRepository {
    async create(messageData) {
        try {
            return await Message.create(messageData);
        } catch (error) {
            console.error('Error creating message in repository:', error);
            throw error;
        }
    }

    async findAllByConversationId(conversationId) {
        try {
            console.log(`Repository: Finding messages for conversation ${conversationId}`);
            const messages = await Message.findAll({
                where: { conversation_id: conversationId },
                include: [
                    {
                        model: User,
                        as: 'sender',
                        attributes: ['id', 'username', 'email', 'type', 'status'] 
                    },
                    {
                        model: Image,
                        as: 'images',
                        attributes: ['id', 'filename', 'path']
                    }
                ],
                order: [['datetime', 'ASC']]
            });
            console.log(`Repository: Found ${messages.length} messages`);
            return messages;
        } catch (error) {
            console.error('Error finding messages in repository:', error);
            if (error.original) {
                console.error('Original error:', error.original);
            }
            throw error;
        }
    }

    async findById(messageId) {
        try {
            return await Message.findByPk(messageId, {
                include: [
                    {
                        model: User,
                        as: 'sender',
                        attributes: ['id', 'username', 'email', 'type', 'status'] 
                    },
                    {
                        model: Image,
                        as: 'images',
                        attributes: ['id', 'filename', 'path']
                    }
                ]
            });
        } catch (error) {
            console.error('Error finding message by ID in repository:', error);
            if (error.original) {
                console.error('Original error:', error.original);
            }
            throw error;
        }
    }

    async update(messageId, updateData) {
        try {
            const message = await this.findById(messageId);
            if (!message) {
                throw new Error('Message not found');
            }
            
            // Update message fields
            await message.update({
                content: updateData.content,
                status: updateData.status,
                has_image: updateData.has_image,
                updated_at: new Date()
            });

            return await this.findById(messageId); // Return updated message with associations
        } catch (error) {
            console.error('Error updating message:', error);
            throw error;
        }
    }

    async delete(messageId) {
        try {
            const message = await this.findById(messageId);
            if (!message) {
                throw new Error('Message not found');
            }

            // Set message status to deleted instead of actually deleting
            await message.update({
                status: 'Deleted',
                content: '[Message deleted]',
                updated_at: new Date()
            });

            return message;
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }

    async hardDelete(messageId) {
        try {
            const message = await this.findById(messageId);
            if (!message) {
                throw new Error('Message not found');
            }

            await message.destroy();
            return true;
        } catch (error) {
            console.error('Error hard deleting message:', error);
            throw error;
        }
    }
}

module.exports = new MessageRepository();