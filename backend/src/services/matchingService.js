const UserService = require('../services/userService');
const ConversationService = require('./conversationService');
const Queue = new Map();

class MatchingService {
    constructor() {
        this.io = null;
        this.activeSearches = new Map();
    }

    setIo(io) {
        this.io = io;
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Client connected for matching:', socket.id);

            socket.on('start-matching', async (data) => {
                const { userId, language, userType } = data;
                console.log(`User ${userId} started matching for language ${language}`);
                
                try {
                    const user = await UserService.getUserById(userId);
                    if (!user) {
                        socket.emit('matching-error', { message: 'User not found' });
                        return;
                    }

                    // Check for existing active conversation
                    const existingConversation = await this.checkExistingConversation(userId, language);
                    if (existingConversation) {
                        socket.emit('matching-error', { 
                            message: 'You already have an active conversation for this language',
                            existingConversation
                        });
                        return;
                    }

                    // Store socket info for this user
                    this.activeSearches.set(userId, {
                        socket,
                        language,
                        userType: user.type
                    });

                    await this.findMatch(userId, language, user.type);
                } catch (error) {
                    socket.emit('matching-error', { message: error.message });
                }
            });

            socket.on('stop-matching', async (data) => {
                const { userId, language } = data;
                this.removeFromQueue(userId, language);
                this.activeSearches.delete(userId);
            });

            socket.on('disconnect', () => {
                // Clean up any active searches for this socket
                for (const [userId, data] of this.activeSearches.entries()) {
                    if (data.socket === socket) {
                        this.removeFromQueue(userId, data.language);
                        this.activeSearches.delete(userId);
                        break;
                    }
                }
            });
        });
    }

    async checkExistingConversation(userId, language) {
        try {
            const conversations = await ConversationService.getAllConversations();
            return conversations.find(conv => 
                (conv.student_id === userId || conv.teacher_id === userId) &&
                conv.language === language &&
                conv.status !== 'ended'
            );
        } catch (error) {
            console.error('Error checking existing conversations:', error);
            return null;
        }
    }

    async findMatch(userId, language, userType) {
        const queue = Queue.get(language) || [];
        Queue.set(language, queue);

        // Find a matching user in the queue
        const matchIndex = queue.findIndex(entry => {
            // Check if users are different and have complementary roles
            const differentUser = entry.user.id !== userId;
            const complementaryRole = entry.user.type !== userType;
            
            return differentUser && complementaryRole;
        });

        if (matchIndex !== -1) {
            // Match found
            const matchedEntry = queue.splice(matchIndex, 1)[0];
            const matchedUser = matchedEntry.user;

            try {
                // Check for existing conversation between these users
                const existingConversation = await ConversationService.findConversationBetweenUsers(
                    userId,
                    matchedUser.id,
                    language
                );

                if (existingConversation && existingConversation.status !== 'ended') {
                    // If there's an active conversation, don't create a new one
                    const error = new Error('Already have an active conversation with this user');
                    error.existingConversation = existingConversation;
                    throw error;
                }

                const conversation = await ConversationService.createConversation({
                    student_id: userType === 'student' ? userId : matchedUser.id,
                    teacher_id: userType === 'teacher' ? userId : matchedUser.id,
                    language,
                    status: 'random',
                });

                // Notify both users
                const user1Socket = this.activeSearches.get(userId)?.socket;
                const user2Socket = this.activeSearches.get(matchedUser.id)?.socket;

                if (user1Socket) {
                    user1Socket.emit('match-found', { conversation, matchedUser });
                }
                if (user2Socket) {
                    user2Socket.emit('match-found', { conversation, matchedUser: { id: userId, type: userType } });
                }

                // Clean up
                this.activeSearches.delete(userId);
                this.activeSearches.delete(matchedUser.id);
            } catch (error) {
                console.error('Error creating conversation:', error);
                // Put the matched user back in queue if there was an error
                queue.push(matchedEntry);
                throw error;
            }
        } else {
            // No match found, add to queue
            queue.push({
                user: { id: userId, type: userType },
                timestamp: Date.now()
            });
        }
    }

    removeFromQueue(userId, language) {
        const queue = Queue.get(language);
        if (queue) {
            const index = queue.findIndex(entry => entry.user.id === userId);
            if (index !== -1) {
                queue.splice(index, 1);
            }
        }
    }
}

module.exports = new MatchingService();