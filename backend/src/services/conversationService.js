const ConversationRepository = require('../repositories/conversationRepository');
const MessageRepository = require('../repositories/messageRepository');
const ImageService = require('./imageService');

class ConversationService {
    async createConversation(conversationData) {
        return await ConversationRepository.create(conversationData);
    }

    async getAllConversations() {
        return await ConversationRepository.findAll();
    }

    async getConversationById(conversationId) {
        return await ConversationRepository.findById(conversationId);
    }

    async getConversationByStudentAndTeacher(studentId, teacherId) {
        return await ConversationRepository.findByStudentAndTeacher(studentId, teacherId);
    }

    async deleteConversation(conversationId) {
        try {
            console.log(`Starting deletion of conversation ${conversationId}`);
            const conversation = await ConversationRepository.findById(conversationId);
            
            if (!conversation) {
                console.log(`Conversation ${conversationId} not found`);
                return null;
            }

            // Get all messages for this conversation
            console.log(`Fetching messages for conversation ${conversationId}`);
            const messages = await MessageRepository.findAllByConversationId(conversationId);
            console.log(`Found ${messages.length} messages to process`);

            // Delete all images associated with the messages
            for (const message of messages) {
                try {
                    if (message.has_image) {
                        console.log(`Processing images for message ${message.id}`);
                        const images = await ImageService.getImagesByMessageId(message.id);
                        console.log(`Found ${images.length} images for message ${message.id}`);
                        
                        for (const image of images) {
                            try {
                                console.log(`Deleting image ${image.id}`);
                                await ImageService.deleteImage(image.id);
                            } catch (imageError) {
                                console.error(`Error deleting image ${image.id}:`, imageError);
                                // Continue with other images even if one fails
                            }
                        }
                    }
                } catch (messageError) {
                    console.error(`Error processing message ${message.id}:`, messageError);
                    // Continue with other messages even if one fails
                }
            }

            // Delete the conversation (this will cascade delete messages due to foreign key constraint)
            console.log(`Deleting conversation ${conversationId}`);
            await conversation.destroy();
            console.log(`Successfully deleted conversation ${conversationId}`);
            return conversation;
        } catch (error) {
            console.error('Error in deleteConversation:', error);
            throw error;
        }
    }

    async findConversationBetweenUsers(userId1, userId2, language) {
        const conversations = await this.getAllConversations();
        return conversations.find(conv => {
            const hasUser1 = conv.student_id === userId1 || conv.teacher_id === userId1;
            const hasUser2 = conv.student_id === userId2 || conv.teacher_id === userId2;
            const sameLanguage = conv.language === language;
            return hasUser1 && hasUser2 && sameLanguage && conv.status !== 'ended';
        });
    }

    async endConversation(conversationId) {
        const conversation = await ConversationRepository.findById(conversationId);
        if (!conversation) {
            return null;
        }
        conversation.status = 'ended';
        await conversation.save();
        return conversation;
    }

    async getConversationsByUserId(userId) {
        return await ConversationRepository.findByUserId(userId);
    }
}

module.exports = new ConversationService();
