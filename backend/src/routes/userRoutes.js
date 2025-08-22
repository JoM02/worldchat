const express = require('express');
const UserController = require('../controllers/userController');
// const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// router.use(authMiddleware);

router.post('/', UserController.createUser);
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);
router.get('/language/:language', UserController.findUsersByLanguage);
router.put('/:id/status', UserController.updateUserStatus);

module.exports = router;