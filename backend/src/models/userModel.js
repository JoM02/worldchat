const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    languages: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'offline',
        validate: {
            isIn: [['online', 'offline', 'busy', 'away', 'Busy', 'Active']]
        }
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'User',
    timestamps: true,
    createdAt: 'creation_date',
    updatedAt: false
});

User.associate = (models) => {
    // Student conversations
    User.hasMany(models.Conversation, {
        as: 'TeachingConversations',
        foreignKey: 'teacher_id'
    });
    
    // Teacher conversations
    User.hasMany(models.Conversation, {
        as: 'LearningConversations',
        foreignKey: 'student_id'
    });
    
    // Messages sent by user
    User.hasMany(models.Message, {
        as: 'SentMessages',
        foreignKey: 'sender_id'
    });
    
    // Contacts (self-referential many-to-many)
    User.belongsToMany(models.User, {
        through: models.Contact,
        as: 'Contacts',
        foreignKey: 'user_id_1',
        otherKey: 'user_id_2'
    });
};

module.exports = User;
