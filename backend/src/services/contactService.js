const ContactRepository = require('../repositories/contactRepository');
const Conversation = require('../models/conversationModel');

class ContactService {
    async createContact(contactData) {
        return await ContactRepository.create(contactData);
    }

    async getAllContacts() {
        return await ContactRepository.findAll();
    }

    async getContactByUserIds(userId1, userId2) {
        return await ContactRepository.findByUserIds(userId1, userId2);
    }

    async deleteContact(userId1, userId2) {
        return await ContactRepository.deleteByUserIds(userId1, userId2);
    }

    async modifyContactStatus(userId1, userId2, status) {
        if (status === 'Accepted') {
            // Create an MP conversation when accepting contact request
            const conversation = await Conversation.create({
                student_id: userId1,  // We'll use user1 as student for MP
                teacher_id: userId2,  // We'll use user2 as teacher for MP
                language: 'en',       // Default language
                status: 'private'     // Set status to private for MP conversations
            });

            // Update contact with the conversation ID
            return await ContactRepository.updateStatusWithConversation(userId1, userId2, status, conversation.id);
        }
        
        return await ContactRepository.updateStatus(userId1, userId2, status);
    }
}

module.exports = new ContactService();