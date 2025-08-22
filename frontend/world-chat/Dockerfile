# Utiliser une image de base Node.js
FROM node:23.5.0

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Create .angular directory and set permissions
RUN mkdir -p /app/.angular && \
    chmod -R 777 /app/.angular

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Nettoyer le cache npm et installer les dépendances
RUN npm cache clean --force && \
    npm install --legacy-peer-deps

# Ensure cache directories have proper permissions
RUN mkdir -p node_modules/.cache && chmod -R 777 node_modules/.cache && \
    mkdir -p /app/.angular/cache && chmod -R 777 /app/.angular/cache

# Installer Angular CLI globalement
RUN npm install -g @angular/cli

# Copier le reste des fichiers de l'application
COPY . .

# Set permissions for the entire app directory
RUN chmod -R 777 /app

# Expose the port
EXPOSE 4200

# Start the application
CMD ["ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]