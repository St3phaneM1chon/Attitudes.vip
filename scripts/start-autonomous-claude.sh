#!/bin/bash

# Démarrage de Claude en mode 100% autonome
echo "🚀 Démarrage de Claude en mode autonome"

# Variables d'environnement pour mode autonome
export CLAUDE_AUTO_APPROVE=true
export CLAUDE_SILENT_MODE=true
export CLAUDE_BATCH_MODE=true

# IMPORTANT: Vérifier la conformité AVANT de démarrer
echo "📋 Vérification de la conformité..."
node scripts/compliance-checker.js check

if [ $? -ne 0 ]; then
    echo "❌ Conformité échouée - Démarrage bloqué"
    exit 1
fi

# Charger les règles dans le contexte Claude
echo "📖 Chargement des règles de développement..."
export CLAUDE_RULES_PATH="$(pwd)/rules"

# Créer un point d'ancrage avec les règles
node scripts/context-anchor.js create "startup-rules" "Démarrage avec règles de conformité chargées"

# Démarrer les services nécessaires
docker-compose up -d

# Lancer le monitor de session
node scripts/teams-session-monitor.js &

# Lancer le scheduler de mises à jour
node scripts/weekly-update-scheduler.js start &

# Lancer l'optimiseur de performance
echo "🚀 Démarrage de l'optimiseur de performance..."
node scripts/claude-performance-optimizer.js init
node scripts/claude-performance-optimizer.js monitor &

echo "✅ Claude est maintenant en mode 100% autonome"
echo "📊 Aucune intervention humaine requise"
echo "📋 Règles de conformité actives"
echo "⚡ Optimiseur de performance actif"
