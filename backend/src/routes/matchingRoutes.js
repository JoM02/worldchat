const express = require('express');
const MatchingController = require('../controllers/matchingController');
// const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// router.use(authMiddleware);

// Add validation middleware if needed
router.post('/start-chat', 
    //add validation middleware here
    MatchingController.startChatWithTimeout
);

// Add error handling middleware
router.use((err, req, res, next) => {
    console.error('Matching route error:', err);
    res.status(500).json({ 
        error: 'Internal server error during matching' 
    });
});

module.exports = router;