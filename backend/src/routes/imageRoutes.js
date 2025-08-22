const express = require('express');
const multer = require('multer');
const ImageController = require('../controllers/imageController');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

router.post('/upload', upload.single('image'), ImageController.uploadImage);
router.get('/message/:messageId', ImageController.getImagesByMessageId);
router.get('/:id', ImageController.getImage);
router.delete('/:id', ImageController.deleteImage);

module.exports = router;
