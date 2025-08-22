const UserRepository = require('../repositories/userRepository');
const bcrypt = require('bcryptjs');
const CacheService = require('./cacheService');

class UserService {
    /**
     * Create a new user and save to the database
     * @param {Object} userData - The data of the user to create
     * @returns {Object} - The created user
     */
    async createUser(userData) {
        // Destructure userData to extract individual fields
        const { username, email, password, userType, languages } = userData;

        // Validate the required fields
        if (!username || !email || !password || !userType || !languages || languages.length === 0) {
            throw new Error("Missing required fields: 'username', 'email', 'password', 'userType', or 'languages'.");
        }

        // Check if the user already exists
        const existingUser = await UserRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Convert languages array into a comma-separated string
        const languagesStr = languages.join(','); // e.g. 'fr,it'

        // Create a new user with the provided data
        const user = await UserRepository.create({
            username,
            email,
            password: hashedPassword,
            type: userType,
            languages: languagesStr, // Store languages as a comma-separated string
        });

        // Cache the user data in Redis
        try {
            await CacheService.set(`user:${user.id}`, user, 3600); // Cache expires after 1 hour
        } catch (err) {
            console.error('Error caching user data:', err);
        }

        return user;
    }

    /**
     * Retrieve all users
     * @returns {Array} - List of all users
     */
    async getAllUsers() {
        return await UserRepository.findAll();
    }

    /**
     * Retrieve a user by ID
     * @param {number|string} userId - ID of the user to retrieve
     * @returns {Object} - The user data
     */
    async getUserById(userId) {
        try {
            // Check if the user data is in the cache
            // const cachedUser = await CacheService.get(`user:${userId}`);
            // if (cachedUser) {
            //     // Handle both string and object cases
            //     return typeof cachedUser === 'string' ? JSON.parse(cachedUser) : cachedUser;
            // }

            // If not in cache, fetch from the database
            const user = await UserRepository.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Cache the user data in Redis
            // await CacheService.set(`user:${userId}`, JSON.stringify(user), 3600); // Cache expires after 1 hour

            return user;
        } catch (error) {
            console.error('Error getting user by ID:', error);
            throw error;
        }
    }

    /**
     * Update a user's information
     * @param {number|string} userId - ID of the user to update
     * @param {Object} userData - The updated user data
     * @returns {Object} - The updated user
     */
    async updateUser(userId, userData) {
        try {
            // Validate the user exists
            const existingUser = await this.getUserById(userId);
            if (!existingUser) {
                throw new Error('User not found');
            }

            // If password is being updated, hash it
            if (userData.password) {
                userData.password = await bcrypt.hash(userData.password, 10);
            }

            // If languages are being updated, convert to string
            if (userData.languages && Array.isArray(userData.languages)) {
                userData.languages = userData.languages.join(',');
            }

            // Update the user
            const updatedUser = await UserRepository.update(userId, userData);

            // Update the cache with stringified data
            await CacheService.set(`user:${userId}`, JSON.stringify(updatedUser), 3600);

            return updatedUser;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    /**
     * Delete a user
     * @param {number} userId - ID of the user to delete
     * @returns {boolean} - True if the user was deleted successfully
     */
    async deleteUser(userId) {
        // Validate the user exists
        const existingUser = await this.getUserById(userId);
        if (!existingUser) {
            throw new Error('User not found');
        }

        // Delete the user
        const result = await UserRepository.delete(userId);

        // Remove from cache
        await CacheService.del(`user:${userId}`);

        return result;
    }
    /**
     * Find users by language
     * @param {string} language - The language to search for
     * @returns {Array} - List of users who speak the specified language
     */
    async findUsersByLanguage(language) {
        const users = await UserRepository.findUsersByLanguage(language);
        return users.map(user => {
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
    }

    /**
     * Update a user's status
     * @param {string} userId - ID of the user to update
     * @param {string} status - New status ('online', 'offline', 'busy', 'away')
     * @param {boolean} isManual - Whether the status update is manual or automatic
     * @returns {Object} - The updated user
     */
    async updateUserStatus(userId, status, isManual = false) {
        console.log(`[UserService] Updating status for user ${userId} to ${status} (Manual: ${isManual})`);
        try {
            // Validate status
            const validStatuses = ['online', 'offline', 'busy', 'away', 'Busy', 'Active'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status: ${status}`);
            }

            // Get current user data
            const currentUser = await this.getUserById(userId);
            
            // If it's an automatic online status update and user is busy/away, don't update
            if (!isManual && status === 'online' && 
                ['busy', 'away'].includes(currentUser.status?.toLowerCase())) {
                console.log(`[UserService] Ignoring automatic online status for user ${userId} with manual status ${currentUser.status}`);
                return currentUser;
            }

            // Update user status in database
            const updatedUser = await UserRepository.update(userId, { 
                status,
                statusIsManual: isManual && ['busy', 'away'].includes(status.toLowerCase())
            });
            console.log(`[UserService] Status updated successfully for user ${userId}`);

            // Update cache
            const cachedUser = await CacheService.get(`user:${userId}`);
            if (cachedUser) {
                const userData = typeof cachedUser === 'string' ? JSON.parse(cachedUser) : cachedUser;
                userData.status = status;
                userData.statusIsManual = isManual && ['busy', 'away'].includes(status.toLowerCase());
                await CacheService.set(`user:${userId}`, JSON.stringify(userData), 3600);
                console.log(`[UserService] Cache updated for user ${userId}`);
            }

            return updatedUser;
        } catch (error) {
            console.error('[UserService] Error updating user status:', error);
            throw error;
        }
    }
}

module.exports = new UserService();
