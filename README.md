# Programmation Web - projet

## Construire les images Docker (environnement de développement)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev up -d --build

## Construire les images Docker (environnement de production)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build

## Lancer le projet (environnement de développement)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev up -d

## Lancer le projet (environnement de production)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d

## Stopper les conteneurs et supprimer le volume Docker
docker-compose down -v


## Route pour accéder à la documentation locale de l'API (Swagger)
http://localhost:3000/api-docs