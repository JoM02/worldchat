const ConversationService = require('../services/conversationService');

class ConversationController {
    async createConversation(req, res) {
        try {
            const conversation = await ConversationService.createConversation(req.body);
            res.status(201).json(conversation);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async getAllConversations(req, res) {
        try {
            const conversations = await ConversationService.getAllConversations();
            res.status(200).json(conversations);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getConversationById(req, res) {
        try {
            const conversationId = req.params.id;
            const conversation = await ConversationService.getConversationById(conversationId);
            if (!conversation) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            res.status(200).json(conversation);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async deleteConversation(req, res) {
        try {
            const conversationId = req.params.id;
            const deletedConversation = await ConversationService.deleteConversation(conversationId);
            
            if (!deletedConversation) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            
            res.status(200).json({ message: 'Conversation deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getConversationsByUserId(req, res) {
        try {
            const userId = req.params.userId;
            const conversations = await ConversationService.getConversationsByUserId(userId);
            res.status(200).json(conversations);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new ConversationController();