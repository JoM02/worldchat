require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize } = require('sequelize');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Route imports
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const contactRoutes = require('./routes/contactRoutes');
const matchingRoutes = require('./routes/matchingRoutes');
const imageRoutes = require('./routes/imageRoutes');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./src/docs/openapi.yaml');

const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    methods: ['GET', 'POST', 'OPTIONS','PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Sequelize setup
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:4200",
        methods: ["GET", "POST"],
        credentials: true,
        transports: ['websocket', 'polling']
    }
});

// Initialize matching and user service with socket.io instance
const UserService = require('./services/userService');
const matchingService = require('./services/matchingService');
matchingService.setIo(io);

// Chat rooms storage
const chatRooms = new Map();
const userSockets = new Map(); // Track user's socket connections

// WebSocket logic
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // User joins a chat room
    socket.on('join', async (data) => {
        try {
            const { conversationId, username, userId } = data;
            console.log(`User ${username} (${socket.id}) joined conversation: ${conversationId}`);

            const roomId = `chat-${conversationId}`;
            socket.join(roomId);

            // Track user's socket and update status
            if (userId) {
                if (!userSockets.has(userId)) {
                    userSockets.set(userId, new Set());
                    // Update user status to online only if not manually set
                    try {
                        const currentUser = await UserService.getUserById(userId);
                        if (!['busy', 'away'].includes(currentUser.status?.toLowerCase())) {
                            await UserService.updateUserStatus(userId, 'online', false);
                            io.emit('userStatusUpdate', { userId, status: 'online', isManual: false });
                        }
                    } catch (error) {
                        console.error('Error updating user status:', error);
                    }
                }
                userSockets.get(userId).add(socket.id);
            }

            // Initialize room if it doesn't exist
            if (!chatRooms.has(roomId)) {
                chatRooms.set(roomId, new Map());
            }
            const room = chatRooms.get(roomId);
            room.set(socket.id, { username, userId });

            // Notify others in the room
            io.to(roomId).emit('userJoined', {
                type: 'system',
                message: `${username} has joined the chat`,
                timestamp: new Date().toISOString(),
                username: 'System',
                userId
            });

            // Update and emit user list
            const userList = Array.from(room.values()).map(user => ({
                id: user.userId,
                username: user.username,
                status: 'online'
            }));
            io.to(roomId).emit('userListUpdate', userList);
        } catch (error) {
            console.error('Error in join event:', error);
            socket.emit('error', 'Failed to join chat room');
        }
    });

    // User leaves a room
    socket.on('leave', (data) => {
        const { conversationId, username, userId } = data;
        const roomId = `chat-${conversationId}`;
        
        handleUserLeaving(socket, roomId, username, userId);
    });

    // Handle conversation deletion
    socket.on('conversation_deleted', (data) => {
        const { conversationId } = data;
        const roomId = `chat-${conversationId}`;
        
        // Notify all users in the room
        io.to(roomId).emit('conversation_deleted', {
            conversationId,
            timestamp: new Date().toISOString()
        });

        chatRooms.delete(roomId);
    });

    // User sends a message
    socket.on('message', (data) => {
        try {
            const { conversationId, message, username, userId, images } = data;
            const roomId = `chat-${conversationId}`;
            console.log(`Message from ${username} (${userId}) in ${roomId}: ${message}`);

            io.to(roomId).emit('message', {
                type: 'message',
                sender: userId,
                username,
                text: message,
                timestamp: new Date().toISOString(),
                images: images || []
            });
        } catch (error) {
            console.error('Error in message event:', error);
            socket.emit('error', 'Failed to send message');
        }
    });

    // Message update event
    socket.on('message_update', (data) => {
        try {
            const { conversationId, messageId, content, username, userId } = data;
            const roomId = `chat-${conversationId}`;
            console.log(`Message update from ${username} (${userId}) in ${roomId} for message ${messageId}`);

            io.to(roomId).emit('message_updated', {
                messageId,
                content,
                sender: userId,
                username,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in message_update event:', error);
            socket.emit('error', 'Failed to update message');
        }
    });

    // Message deletion event
    socket.on('message_delete', (data) => {
        try {
            const { conversationId, messageId, username, userId } = data;
            const roomId = `chat-${conversationId}`;
            console.log(`Message deletion from ${username} (${userId}) in ${roomId} for message ${messageId}`);

            io.to(roomId).emit('message_deleted', {
                messageId,
                sender: userId,
                username,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in message_delete event:', error);
            socket.emit('error', 'Failed to delete message');
        }
    });

    // Typing status event
    socket.on('typing', (data) => {
        const { conversationId, username, isTyping } = data;
        const roomId = `chat-${conversationId}`;
        socket.to(roomId).emit('userTyping', { username, isTyping });
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
        console.log(`Client disconnected: ${socket.id}`);
        
        // Find all rooms this socket was in and handle leaving
        chatRooms.forEach((room, roomId) => {
            if (room.has(socket.id)) {
                const userData = room.get(socket.id);
                handleUserLeaving(socket, roomId, userData.username, userData.userId);
            }
        });

        // Remove socket from user tracking and update status if needed
        for (const [userId, sockets] of userSockets.entries()) {
            if (sockets.has(socket.id)) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    userSockets.delete(userId);
                    // Update user status to offline
                    try {
                        const currentUser = await UserService.getUserById(userId);
                        // Always set to offline when all sockets are closed
                        await UserService.updateUserStatus(userId, 'offline', false);
                        io.emit('userStatusUpdate', { userId, status: 'offline', isManual: false });
                    } catch (error) {
                        console.error('Error updating user status:', error);
                    }
                }
            }
        }
    });

    // Handle manual status updates
    socket.on('updateStatus', async (data) => {
        const { userId, status, isManual } = data;
        try {
            await UserService.updateUserStatus(userId, status, isManual);
            io.emit('userStatusUpdate', { userId, status, isManual });
        } catch (error) {
            console.error('Error updating user status:', error);
            socket.emit('error', 'Failed to update status');
        }
    });
});

function handleUserLeaving(socket, roomId, username, userId) {
    const room = chatRooms.get(roomId);
    if (room) {
        room.delete(socket.id);
        socket.leave(roomId);

        // Remove socket from user's connections
        if (userId && userSockets.has(userId)) {
            const userSocketSet = userSockets.get(userId);
            userSocketSet.delete(socket.id);
            if (userSocketSet.size === 0) {
                userSockets.delete(userId);
            }
        }

        // Notify room about user leaving
        io.to(roomId).emit('userLeft', {
            type: 'system',
            message: `${username} has left the chat`,
            timestamp: new Date().toISOString(),
            username: 'System',
            userId
        });

        // Update user list
        const userList = Array.from(room.values()).map(user => ({
            id: user.userId,
            username: user.username,
            status: 'online'
        }));
        io.to(roomId).emit('userListUpdate', userList);

        // Clean up empty rooms
        if (room.size === 0) {
            chatRooms.delete(roomId);
        }
    }
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/auth', authRoutes); // Route d'authentification
app.use('/api/users', userRoutes); // Route des utilisateurs
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/images', imageRoutes);

// Serve uploaded files
app.use('/uploads/images', express.static(path.join(__dirname, '../uploads/images')));

// Database connection
const connectDB = async (retries = 5) => {
    while (retries) {
        try {
            await sequelize.authenticate();
            console.log('Database connection established successfully');
            
            // Import all models
            const models = {
                User: require('./models/userModel'),
                Message: require('./models/messageModel'),
                Conversation: require('./models/conversationModel'),
                Contact: require('./models/contactModel'),
                Image: require('./models/imageModel')
            };

            // Set up associations
            Object.values(models).forEach(model => {
                if (model.associate) {
                    model.associate(models);
                }
            });

            // Sync all models
            await sequelize.sync({ force: false });
            console.log('Database synchronized');
            return true;
        } catch (error) {
            retries -= 1;
            console.error(`Database connection failed. Retries left: ${retries}`, error);
            if (error.original) {
                console.error('Original error:', error.original);
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    return false;
};

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        const dbConnected = await connectDB();
        if (!dbConnected) throw new Error('Failed to connect to the database');

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received. Closing server...');
            server.close(() => {
                console.log('Server closed');
                sequelize.close();
                process.exit(0);
            });
        });
    } catch (error) {
        console.error('Fatal error starting server:', error);
        process.exit(1);
    }
};

startServer();
