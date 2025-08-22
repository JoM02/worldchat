const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    conversation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Conversation',
            key: 'id'
        }
    },
    sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    datetime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'Unread',
        validate: {
            isIn: [['Unread', 'Read', 'Deleted']]
        }
    },
    has_image: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'Message',  
    timestamps: true,
    createdAt: 'datetime',
    updatedAt: false
});

Message.associate = function(models) {
    Message.belongsTo(models.User, { 
        as: 'sender',
        foreignKey: 'sender_id'
    });
    Message.belongsTo(models.Conversation, { 
        foreignKey: 'conversation_id'
    });
    Message.hasMany(models.Image, { 
        foreignKey: 'message_id',
        as: 'images'
    });
};

module.exports = Message;