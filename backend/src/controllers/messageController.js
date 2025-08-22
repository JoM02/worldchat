const MessageService = require('../services/messageService');

class MessageController {
    async createMessage(req, res) {
        try {
            const messageData = {
                conversation_id: req.body.conversation_id,
                sender_id: req.body.sender_id,
                content: req.body.content,
                datetime: new Date().toISOString(),
                status: 'Unread',
                has_image: req.body.has_image || false
            };

            const message = await MessageService.createMessage(messageData);
            res.status(201).json(message);
        } catch (err) {
            console.error('Error creating message:', err);
            res.status(500).json({ 
                error: 'Failed to create message',
                details: err.message 
            });
        }
    }

    async getAllMessagesByConversationId(req, res) {
        try {
            const conversationId = req.params.conversationId;
            if (!conversationId) {
                return res.status(400).json({ error: 'Conversation ID is required' });
            }

            console.log(`Getting messages for conversation: ${conversationId}`);
            const messages = await MessageService.getAllMessagesByConversationId(conversationId);
            
            if (!messages) {
                return res.status(404).json({ error: 'No messages found for this conversation' });
            }

            res.json(messages);
        } catch (err) {
            console.error('Error getting messages:', err);
            res.status(500).json({ 
                error: 'Failed to get messages',
                details: err.message 
            });
        }
    }

    async getMessageById(req, res) {
        try {
            const messageId = req.params.id;
            if (!messageId) {
                return res.status(400).json({ error: 'Message ID is required' });
            }

            const message = await MessageService.getMessageById(messageId);
            
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }

            res.json(message);
        } catch (err) {
            console.error('Error getting message:', err);
            res.status(500).json({ 
                error: 'Failed to get message',
                details: err.message 
            });
        }
    }

    async updateMessageStatus(req, res) {
        try {
            const messageId = req.params.id;
            const { status } = req.body;

            if (!messageId || !status) {
                return res.status(400).json({ error: 'Message ID and status are required' });
            }

            if (!['Unread', 'Read', 'Deleted'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status value' });
            }

            const message = await MessageService.updateMessageStatus(messageId, status);
            
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }

            res.json(message);
        } catch (err) {
            console.error('Error updating message status:', err);
            res.status(500).json({ 
                error: 'Failed to update message status',
                details: err.message 
            });
        }
    }

    async updateMessage(req, res) {
        try {
            const messageId = req.params.id;
            const messageData = req.body;

            const message = await MessageService.updateMessage(messageId, messageData);
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }
            res.json(message);
        } catch (err) {
            console.error('Error updating message:', err);
            res.status(500).json({ error: 'Failed to update message' });
        }
    }

    async deleteMessage(req, res) {
        try {
            const messageId = req.params.id;
            const hardDelete = req.query.hard === 'true';
            const result = await MessageService.deleteMessage(messageId, hardDelete);
            if (!result) {
                return res.status(404).json({ error: 'Message not found' });
            }
            res.status(200).json({ message: 'Message deleted successfully' });
        } catch (err) {
            console.error('Error in deleteMessage:', err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new MessageController();