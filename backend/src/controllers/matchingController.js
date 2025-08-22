const MatchingService = require('../services/matchingService');
const UserService = require('../services/userService');

class MatchingController {
    static async startChatWithTimeout(req, res) {
        try {
            const { userId, language } = req.body;

            // Validation des champs requis  
            if (!userId || !language) {
                return res.status(400).json({ 
                    error: 'Missing required fields: userId and language are required' 
                });
            }

            // Déterminer le type d'utilisateur  
            const user = await UserService.getUserById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const match = await MatchingService.findMatchWithTimeout(userId, language);

            if (!match || !match.conversation) {
              return res.status(404).json({ error: 'No suitable match found' });
            }
            return res.status(200).json({
              conversationId: match.conversation.id,
              matchedUser: {
                  id: match.matchedUser.id,
                  username: match.matchedUser.username  
              }
          });
          } catch (error) {
            console.error('Matching error:', error);
            return res.status(500).json({ 
              error: error.message || 'Failed to find a match' 
            });
          }
        }

}

module.exports = MatchingController;