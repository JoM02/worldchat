const User = require('../models/userModel');
const { Op } = require('sequelize');  // Add this import

class UserRepository {
    async create(userData) {
        return await User.create(userData);
    }

    async findAll() {
        return await User.findAll();
    }

    async findById(userId) {
        return await User.findByPk(userId);
    }

    async findByEmail(email) {
        return await User.findOne({ where: { email } });
    }

    async findUsersByLanguage(language) {
        return await User.findAll({
            where: {
                languages: { [Op.like]: `%${language}%` }
            }
        });
    }
    
    async update(userId, userData) {
        const [_, updatedUser] = await User.update(userData, {
            where: { id: userId },
            returning: true,
            plain: true,
        });
        return updatedUser;
    }
    
    async delete(userId) {
        return await User.destroy({ where: { id: userId } });
    }
}

module.exports = new UserRepository();