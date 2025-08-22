const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contact = sequelize.define('Contact', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id_1: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model:'User',
            key:'id'
        }
    },
    user_id_2: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    conversation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Conversation',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'Pending'
    },
    creation_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'Contact',
    timestamps: false
});

Contact.associate = (models) => {
    Contact.belongsTo(models.User, { 
        as: 'User1',
        foreignKey: 'user_id_1'
    });
    Contact.belongsTo(models.User, { 
        as: 'User2',
        foreignKey: 'user_id_2'
    });
    Contact.belongsTo(models.Conversation, {
        foreignKey: 'conversation_id'
    });
};

module.exports = Contact;