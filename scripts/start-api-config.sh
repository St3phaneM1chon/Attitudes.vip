#!/bin/bash

# Script pour démarrer le serveur de configuration des clés API

echo "🔑 Démarrage du serveur de configuration des clés API..."

# Vérifier si Express est installé
if ! npm list express &>/dev/null; then
    echo "📦 Installation d'Express..."
    npm install express cors --save
fi

# Démarrer le serveur
echo "🚀 Serveur démarré sur http://localhost:3100"
echo ""
echo "Ouvrez votre navigateur et allez à http://localhost:3100 pour configurer vos clés API"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le serveur"

node server/api-config-server.js