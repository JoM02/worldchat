const userRepository = require('../repositories/userRepository');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.login = async (email, password, ip) => {
  // Recherche de l'utilisateur par email
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  // Vérification du mot de passe
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Mot de passe incorrect');
  }

  user.ip = ip;
  await user.save();

  // Génération du token
  const token = jwt.sign(
    { id: user.id, email: user.email, type: user.type },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );


  // Construction de la réponse JSON
  const response = {
    token: token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      type: user.type,
      ip: user.ip
    },
  };

  console.log(response);
  // return token;
  return response; // Retourne l'objet JSON
};