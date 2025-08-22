const express = require('express');
const AuthController = require('../controllers/authController'); 

const router = express.Router();

router.post('/login', AuthController.login); // Appel à la méthode login du contrôleur

module.exports = router;