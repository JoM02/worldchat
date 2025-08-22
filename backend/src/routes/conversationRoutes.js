const express = require('express');
const ConversationController = require('../controllers/conversationController');
// const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// router.use(authMiddleware);

router.post('/', ConversationController.createConversation);
router.get('/', ConversationController.getAllConversations);
router.get('/:id', ConversationController.getConversationById);
router.get('/user/:userId', ConversationController.getConversationsByUserId);
router.delete('/:id', ConversationController.deleteConversation);

module.exports = router;