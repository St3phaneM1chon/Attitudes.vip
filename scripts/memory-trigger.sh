#!/bin/bash

# 🧠 MEMORY TRIGGER - Déclencheur de restauration mémoire
# Usage: ./scripts/memory-trigger.sh ou simplement taper "mémoire" dans le chat

echo "🧠 Déclenchement de la restauration mémoire..."

# Exécuter le script de restauration
node "$(dirname "$0")/claude-memory-restore.js"

# Afficher le statut post-restauration
echo ""
echo "💡 AIDE-MÉMOIRE RAPIDE:"
echo "  • Projet: AttitudesFramework (40% complété)"
echo "  • Commandes utiles:"
echo "    - npm run dev          # Lancer en développement"
echo "    - docker-compose up -d # Services infrastructure"
echo "    - npm test             # Tests automatisés"
echo "    - npm run lint         # Vérification code"
echo ""
echo "  • Priorités actuelles:"
echo "    1. Finaliser Dashboard Customer"
echo "    2. Intégrer Stripe (paiements)"
echo "    3. Tests E2E complets"
echo "    4. Déploiement staging"
echo ""
echo "🚀 Claude est maintenant contextualisé !"