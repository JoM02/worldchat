const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversation = sequelize.define('Conversation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    teacher_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    language: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    creation_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'random',
        validate: {
            isIn: [['random', 'private', 'ended']]
        }
    }
}, {
    tableName: 'Conversation',
    timestamps: false
});

Conversation.associate = (models) => {
    // Student relationship
    Conversation.belongsTo(models.User, { 
        as: 'Student',
        foreignKey: 'student_id'
    });

    // Teacher relationship
    Conversation.belongsTo(models.User, { 
        as: 'Teacher',
        foreignKey: 'teacher_id'
    });

    // Messages in conversation
    Conversation.hasMany(models.Message, { 
        as: 'Messages',
        foreignKey: 'conversation_id'
    });
};

module.exports = Conversation;