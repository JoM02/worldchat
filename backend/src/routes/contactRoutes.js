const express = require('express');
const ContactController = require('../controllers/contactController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', ContactController.createContact);
router.get('/', ContactController.getAllContacts);
router.get('/:userId1/:userId2', ContactController.getContactByUserIds);
router.delete('/:userId1/:userId2', ContactController.deleteContact);
router.put('/:userId1/:userId2/:status', ContactController.modifyContactStatus);

module.exports = router;