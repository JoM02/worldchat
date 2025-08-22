const Conversation = require('../models/conversationModel');
const { Op } = require('sequelize');

class ConversationRepository {
    async create(conversationData) {
        return await Conversation.create(conversationData);
    }

    async findAll() {
        return await Conversation.findAll();
    }

    async findById(conversationId) {
        return await Conversation.findByPk(conversationId);
    }

    async findByStudentAndTeacher(studentId, teacherId) {
        return await Conversation.findOne({
            where: {
                student_id: studentId,
                teacher_id: teacherId
            }
        });
    }

    async findByUserId(userId) {
        return await Conversation.findAll({
            where: {
                [Op.or]: [
                    { student_id: userId },
                    { teacher_id: userId }
                ]
            }
        });
    }
}

module.exports = new ConversationRepository();