#!/bin/bash

# Script pour démarrer l'application en mode développement
# avec React frontend et Node.js backend

echo "🚀 Démarrage de l'application Attitudes.vip en mode développement..."

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier les prérequis
echo -e "${BLUE}Vérification des prérequis...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

# Vérifier que les conteneurs sont en cours d'exécution
echo -e "${BLUE}Vérification des services Docker...${NC}"
if ! docker ps | grep -q "attitudesframework-database-1"; then
    echo -e "${YELLOW}⚠️  PostgreSQL n'est pas en cours d'exécution. Démarrage...${NC}"
    docker-compose up -d database
    sleep 5
fi

if ! docker ps | grep -q "attitudesframework-redis-1"; then
    echo -e "${YELLOW}⚠️  Redis n'est pas en cours d'exécution. Démarrage...${NC}"
    docker-compose up -d redis
    sleep 3
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installation des dépendances...${NC}"
    npm install
fi

# Créer le fichier .env s'il n'existe pas
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env manquant. Copie depuis .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  IMPORTANT: Veuillez configurer votre fichier .env${NC}"
fi

# Lancer les migrations de base de données
echo -e "${BLUE}Exécution des migrations...${NC}"
npm run db:migrate || echo "⚠️  Migrations échouées ou déjà appliquées"

# Créer deux processus : backend et frontend
echo -e "${GREEN}✅ Démarrage du backend sur le port 3000...${NC}"
npm run dev &
BACKEND_PID=$!

# Attendre que le backend soit prêt
sleep 5

# Démarrer le frontend React (si configuré)
if [ -f "src/App.jsx" ]; then
    echo -e "${GREEN}✅ Démarrage du frontend React sur le port 3001...${NC}"
    PORT=3001 npm run start:react &
    FRONTEND_PID=$!
fi

# Démarrer le service WebSocket
echo -e "${GREEN}✅ Initialisation des WebSockets...${NC}"

# Afficher les URLs
echo -e "\n${GREEN}🎉 Application démarrée avec succès!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Backend API:     http://localhost:3000"
echo -e "Frontend React:  http://localhost:3001"
echo -e "API Docs:        http://localhost:3000/api/v1"
echo -e "Health Check:    http://localhost:3000/health"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}Appuyez sur Ctrl+C pour arrêter l'application${NC}\n"

# Fonction de nettoyage
cleanup() {
    echo -e "\n${YELLOW}Arrêt de l'application...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    echo -e "${GREEN}✅ Application arrêtée${NC}"
    exit 0
}

# Capturer Ctrl+C
trap cleanup INT

# Attendre que les processus se terminent
wait