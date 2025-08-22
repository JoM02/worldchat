const Contact = require('../models/contactModel');
const { Op } = require('sequelize');

class ContactRepository {
    async create(contactData) {
        // Check if contact already exists in either direction
        const existingContact = await this.findByUserIds(contactData.user_id_1, contactData.user_id_2);
        if (existingContact) {
            throw new Error('Contact already exists between these users');
        }
        return await Contact.create(contactData);
    }

    async findAll() {
        return await Contact.findAll();
    }

    async findByUserIds(userId1, userId2) {
        return await Contact.findOne({
            where: {
                [Op.or]: [
                    {
                        user_id_1: userId1,
                        user_id_2: userId2
                    },
                    {
                        user_id_1: userId2,
                        user_id_2: userId1
                    }
                ]
            }
        });
    }

    async deleteByUserIds(userId1, userId2) {
        return await Contact.destroy({
            where: {
                [Op.or]: [
                    {
                        user_id_1: userId1,
                        user_id_2: userId2
                    },
                    {
                        user_id_1: userId2,
                        user_id_2: userId1
                    }
                ]
            }
        });
    }

    async updateStatus(userId1, userId2, status) {
        try {
            const contact = await Contact.findOne({
                where: {
                    [Op.or]: [
                        {
                            user_id_1: userId1,
                            user_id_2: userId2
                        },
                        {
                            user_id_1: userId2,
                            user_id_2: userId1
                        }
                    ]
                }
            });
            if (!contact) {
                return null;
            }

            contact.status = status;
            await contact.save();

            return contact;
        } catch (error) {
            console.error('Error updating contact status:', error);
            throw error;
        }
    }

    async updateStatusWithConversation(userId1, userId2, status, conversationId) {
        try {
            const contact = await Contact.findOne({
                where: {
                    [Op.or]: [
                        {
                            user_id_1: userId1,
                            user_id_2: userId2
                        },
                        {
                            user_id_1: userId2,
                            user_id_2: userId1
                        }
                    ]
                }
            });
            if (!contact) {
                return null;
            }

            contact.status = status;
            contact.conversation_id = conversationId;
            await contact.save();

            return contact;
        } catch (error) {
            console.error('Error updating contact status and conversation:', error);
            throw error;
        }
    }
}

module.exports = new ContactRepository();