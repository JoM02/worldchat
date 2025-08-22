const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres'
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connexion à la base de données réussie !');
    } catch (err) {
        console.error('Erreur de connexion à la base de données :', err);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };