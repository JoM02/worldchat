const jwt = require('jsonwebtoken');

// Clé secrète utilisée pour signer les tokens
const SECRET_KEY = process.env.JWT_SECRET || 'site_web_chat_world';

// Middleware d'authentification
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header is missing' });
    }

    // Vérifie que l'en-tête contient le mot "Bearer"
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Token is missing' });
    }

    try {
        // Vérifie et décode le token
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Ajoute les données du token décodé à la requête
        next(); // Passe au middleware ou à la route suivante
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;