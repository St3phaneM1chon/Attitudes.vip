#!/bin/bash

# Script d'installation des serveurs MCP étendus pour Attitudes.vip
# Installe les 20 serveurs MCP prioritaires pour la gestion de mariages

set -e

echo "🚀 Installation des serveurs MCP étendus pour Attitudes.vip..."

# Couleurs pour output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Fonction pour vérifier les prérequis
check_prerequisites() {
    echo "📋 Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé${NC}"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
        exit 1
    fi
    
    # Vérifier le réseau MCP
    if ! docker network ls | grep -q "mcp-network"; then
        echo "📡 Création du réseau Docker MCP..."
        docker network create mcp-network
    fi
    
    echo -e "${GREEN}✅ Prérequis vérifiés${NC}"
}

# Fonction pour créer le template .env
create_env_template() {
    if [ ! -f .env.mcp-extended ]; then
        echo "📝 Création du template .env.mcp-extended..."
        cat > .env.mcp-extended << 'EOF'
# Payment Services
STRIPE_API_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
SQUARE_ACCESS_TOKEN=your_square_token
SQUARE_LOCATION_ID=your_square_location
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
PAYPAL_MODE=sandbox

# Communication Services
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@attitudes.vip
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token

# Storage Services
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=attitudes-vip-wedding-media
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token

# Calendar Services
GOOGLE_CALENDAR_CLIENT_ID=your_calendar_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_calendar_secret
GOOGLE_CALENDAR_REFRESH_TOKEN=your_calendar_refresh_token
CALENDLY_API_KEY=your_calendly_key
CALENDLY_WEBHOOK_TOKEN=your_calendly_webhook
TODOIST_API_TOKEN=your_todoist_token

# Analytics Services
MIXPANEL_TOKEN=your_mixpanel_token
MIXPANEL_API_SECRET=your_mixpanel_secret
SALESFORCE_CLIENT_ID=your_sf_client_id
SALESFORCE_CLIENT_SECRET=your_sf_secret
SALESFORCE_USERNAME=your_sf_username
SALESFORCE_PASSWORD=your_sf_password
GA_PROPERTY_ID=your_ga_property
GA_SERVICE_ACCOUNT_KEY=your_ga_key

# AI Services
OPENAI_API_KEY=your_openai_key
OPENAI_ORGANIZATION=your_openai_org
ANTHROPIC_API_KEY=your_anthropic_key
ZAPIER_API_KEY=your_zapier_key
ZAPIER_WEBHOOK_URL=your_zapier_webhook

# Geolocation Services
GOOGLE_MAPS_API_KEY=your_maps_key
MAPBOX_ACCESS_TOKEN=your_mapbox_token
EOF
        echo -e "${YELLOW}⚠️  Veuillez configurer vos clés API dans .env.mcp-extended${NC}"
    fi
}

# Fonction pour démarrer les services
start_services() {
    echo "🐳 Démarrage des services MCP étendus..."
    
    # Charger les variables d'environnement si elles existent
    if [ -f .env.mcp-extended ]; then
        export $(cat .env.mcp-extended | grep -v '^#' | xargs)
    fi
    
    # Démarrer uniquement les services configurés
    configured_services=""
    
    # Vérifier chaque service et l'ajouter s'il est configuré
    if [ ! -z "$STRIPE_API_KEY" ] && [ "$STRIPE_API_KEY" != "sk_test_your_stripe_key" ]; then
        configured_services="$configured_services mcp-stripe"
    fi
    
    if [ ! -z "$TWILIO_ACCOUNT_SID" ] && [ "$TWILIO_ACCOUNT_SID" != "your_twilio_sid" ]; then
        configured_services="$configured_services mcp-twilio"
    fi
    
    if [ ! -z "$SENDGRID_API_KEY" ] && [ "$SENDGRID_API_KEY" != "your_sendgrid_key" ]; then
        configured_services="$configured_services mcp-sendgrid"
    fi
    
    if [ ! -z "$CLOUDINARY_CLOUD_NAME" ] && [ "$CLOUDINARY_CLOUD_NAME" != "your_cloud_name" ]; then
        configured_services="$configured_services mcp-cloudinary"
    fi
    
    if [ ! -z "$configured_services" ]; then
        echo "🚀 Démarrage des services configurés: $configured_services"
        docker-compose -f docker-compose.mcp-extended.yml up -d $configured_services
    else
        echo -e "${YELLOW}⚠️  Aucun service configuré. Veuillez d'abord configurer .env.mcp-extended${NC}"
    fi
}

# Fonction pour afficher le statut
show_status() {
    echo ""
    echo "📊 Statut des services MCP:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep mcp-
}

# Fonction pour créer les scripts de gestion
create_management_scripts() {
    echo "📁 Création des scripts de gestion..."
    
    # Script pour arrêter tous les services
    cat > scripts/stop-extended-mcp.sh << 'EOF'
#!/bin/bash
echo "🛑 Arrêt des services MCP étendus..."
docker-compose -f docker-compose.mcp-extended.yml down
echo "✅ Services arrêtés"
EOF
    
    # Script pour voir les logs
    cat > scripts/logs-extended-mcp.sh << 'EOF'
#!/bin/bash
service=${1:-}
if [ -z "$service" ]; then
    docker-compose -f docker-compose.mcp-extended.yml logs -f
else
    docker-compose -f docker-compose.mcp-extended.yml logs -f $service
fi
EOF
    
    # Script pour redémarrer un service
    cat > scripts/restart-mcp-service.sh << 'EOF'
#!/bin/bash
service=$1
if [ -z "$service" ]; then
    echo "Usage: $0 <service-name>"
    echo "Exemple: $0 mcp-stripe"
    exit 1
fi
docker-compose -f docker-compose.mcp-extended.yml restart $service
echo "✅ Service $service redémarré"
EOF
    
    chmod +x scripts/stop-extended-mcp.sh
    chmod +x scripts/logs-extended-mcp.sh
    chmod +x scripts/restart-mcp-service.sh
    
    echo -e "${GREEN}✅ Scripts de gestion créés${NC}"
}

# Fonction principale
main() {
    echo "========================================="
    echo "   Installation MCP Étendu - Attitudes.vip"
    echo "========================================="
    echo ""
    
    check_prerequisites
    create_env_template
    create_management_scripts
    
    echo ""
    echo "📋 Instructions:"
    echo "1. Configurez vos clés API dans .env.mcp-extended"
    echo "2. Exécutez à nouveau ce script pour démarrer les services configurés"
    echo ""
    echo "🛠️  Scripts de gestion disponibles:"
    echo "   ./scripts/stop-extended-mcp.sh    - Arrêter tous les services"
    echo "   ./scripts/logs-extended-mcp.sh    - Voir les logs"
    echo "   ./scripts/restart-mcp-service.sh  - Redémarrer un service"
    echo ""
    
    # Demander si l'utilisateur veut démarrer les services maintenant
    read -p "Voulez-vous démarrer les services maintenant? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_services
        show_status
    fi
    
    echo ""
    echo -e "${GREEN}✅ Installation terminée!${NC}"
}

# Exécuter le script principal
main