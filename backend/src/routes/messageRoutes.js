const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const auth = require('../middlewares/authMiddleware');

// Create a new message
router.post('/', auth, MessageController.createMessage);

// Get all messages for a conversation
router.get('/conversation/:conversationId', auth, MessageController.getAllMessagesByConversationId);

// Get a specific message
router.get('/:id', auth, MessageController.getMessageById);

// Update a message
router.put('/:id', auth, MessageController.updateMessage);

// Delete a message (soft delete by default, hard delete with ?hard=true)
router.delete('/:id', auth, MessageController.deleteMessage);

module.exports = router;