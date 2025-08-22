const UserService = require('../services/userService');

class UserController {
    async createUser(req, res) {
        try {
            const user = await UserService.createUser(req.body);
            res.status(201).json(user);
        } catch (err) {
            console.error("Error creating user:", err);
            res.status(400).json({ error: err.message });
        }
    }

    async getAllUsers(req, res) {
        try {
            const users = await UserService.getAllUsers();
            res.status(200).json(users);
        } catch (err) {
            console.error("Error fetching all users:", err);
            res.status(500).json({ error: err.message });
        }
    }

    async getUserById(req, res) {
        try {
            const userId = req.params.id;
            const user = await UserService.getUserById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.status(200).json(user);
        } catch (err) {
            console.error("Error fetching user by ID:", err);
            res.status(500).json({ error: err.message });
        }
    }

    async updateUser(req, res) {
        try {
            const userId = req.params.id;
            const updatedUser = await UserService.updateUser(userId, req.body);
            res.status(200).json(updatedUser);
        } catch (err) {
            console.error("Error updating user:", err);
            res.status(400).json({ error: err.message });
        }
    }

    async deleteUser(req, res) {
        try {
            const userId = req.params.id;
            await UserService.deleteUser(userId);
            res.status(204).send();
        } catch (err) {
            console.error("Error deleting user:", err);
            res.status(400).json({ error: err.message });
        }
    }

    async findUsersByLanguage(req, res) {
        try {
            const language = req.params.language;
            const users = await UserService.findUsersByLanguage(language);
            res.status(200).json(users);
        } catch (err) {
            console.error("Error finding users by language:", err);
            res.status(500).json({ error: err.message });
        }
    }

    async updateUserStatus(req, res) {
        try {
            const userId = req.params.id;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({ error: 'Status is required' });
            }

            const validStatuses = ['online', 'offline', 'busy', 'away'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status value' });
            }

            const updatedUser = await UserService.updateUserStatus(userId, status);
            res.status(200).json(updatedUser);
        } catch (err) {
            console.error("Error updating user status:", err);
            res.status(400).json({ error: err.message });
        }
    }
}

module.exports = new UserController();