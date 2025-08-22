const MessageRepository = require('../repositories/messageRepository');
const CacheService = require('./cacheService');

class MessageService {
    async createMessage(messageData) {
        try {
            const message = await MessageRepository.create(messageData);
            // Invalidate the conversation messages cache when a new message is created
            const cacheKey = `messages:conversation:${messageData.conversation_id}`;
            await CacheService.del(cacheKey);
            return message;
        } catch (error) {
            console.error('Error creating message:', error);
            throw error;
        }
    }

    async getAllMessagesByConversationId(conversationId) {
        try {
            console.log(`Fetching messages for conversation: ${conversationId}`);
            const cacheKey = `messages:conversation:${conversationId}`;
            
            try {
                const cachedMessages = await CacheService.get(cacheKey);
                if (cachedMessages) {
                    console.log('Returning cached messages');
                    return JSON.parse(cachedMessages);
                }
            } catch (cacheError) {
                console.error('Cache error:', cacheError);
                // Continue without cache if there's an error
            }

            console.log('Cache miss, fetching from database');
            const messages = await MessageRepository.findAllByConversationId(conversationId);
            console.log(`Found ${messages.length} messages`);

            try {
                await CacheService.set(cacheKey, JSON.stringify(messages), 3600); // Cache for 1 hour
            } catch (cacheError) {
                console.error('Error setting cache:', cacheError);
                // Continue even if caching fails
            }

            return messages;
        } catch (error) {
            console.error('Error getting messages:', error);
            if (error.original) {
                console.error('Database error:', error.original);
            }
            throw error;
        }
    }

    async getMessageById(messageId) {
        try {
            const cacheKey = `message:${messageId}`;
            
            try {
                const cachedMessage = await CacheService.get(cacheKey);
                if (cachedMessage) {
                    return JSON.parse(cachedMessage);
                }
            } catch (cacheError) {
                console.error('Cache error:', cacheError);
                // Continue without cache if there's an error
            }

            const message = await MessageRepository.findById(messageId);
            
            try {
                await CacheService.set(cacheKey, JSON.stringify(message), 3600); // Cache for 1 hour
            } catch (cacheError) {
                console.error('Error setting cache:', cacheError);
                // Continue even if caching fails
            }

            return message;
        } catch (error) {
            console.error('Error getting message by ID:', error);
            if (error.original) {
                console.error('Database error:', error.original);
            }
            throw error;
        }
    }

    async updateMessage(id, messageData) {
        try {
            const { conversation_id, sender_id, content, has_image, image_id, status } = messageData;
            const result = await MessageRepository.update(id, {
                conversation_id, 
                sender_id, 
                content, 
                has_image, 
                image_id, 
                status,
                updated_at: new Date()
            });
            // Invalidate the conversation messages cache when a message is updated
            const cacheKey = `messages:conversation:${conversation_id}`;
            await CacheService.del(cacheKey);
            const cacheKeyMessage = `message:${id}`;
            await CacheService.del(cacheKeyMessage);
            return result;
        } catch (err) {
            console.error('Error in updateMessage:', err);
            throw err;
        }
    }
}

module.exports = new MessageService();