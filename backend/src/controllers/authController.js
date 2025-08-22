const AuthService = require('../services/authService'); // Import du service d'authentification

class AuthController {
    async login(req, res) {
        try {
            const { email, password, ip } = req.body; // Récupérer l'email et le mot de passe du corps de la requête
            const token = await AuthService.login(email, password, ip); // Appel à la méthode login du service
            res.status(200).json({ token }); // Réponse avec le token
        } catch (err) {
            res.status(400).json({ error: err.message }); // Erreur si l'authentification échoue
        }
    }
}

module.exports = new AuthController();