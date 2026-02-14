#!/bin/bash

# Script pour configurer les credentials des MCP
# Usage: ./configure-mcp-credentials.sh [service] [credential]

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Répertoires
PROJECT_DIR="/Volumes/AI_Project/AttitudesFramework"
CLAUDE_CONFIG="/Users/altittudes.vip/Library/Application Support/Claude/claude_desktop_config.json"
MCP_CONFIG="$PROJECT_DIR/data/mcp-selfcheck-config.json"

echo -e "${BLUE}🔑 Configuration des Credentials MCP${NC}"
echo "===================================="

# Fonction pour ajouter un MCP avec credentials
add_mcp_with_credentials() {
    local service=$1
    local credential_name=$2
    local credential_value=$3
    
    echo -e "${YELLOW}📦 Configuration de $service...${NC}"
    
    # Configurations spécifiques par service
    case $service in
        "figma")
            command="figma-mcp-server"
            args="[\"--token\", \"$credential_value\"]"
            ;;
        "o3")
            command="openai-o3-mcp"
            args="[\"--api-key\", \"$credential_value\"]"
            ;;
        "coderabbit")
            command="coderabbit-mcp"
            args="[\"--token\", \"$credential_value\"]"
            ;;
        "stripe")
            command="stripe-mcp-server"
            args="[\"--secret-key\", \"$credential_value\"]"
            ;;
        "paypal")
            # PayPal nécessite 2 credentials
            local client_secret=$4
            command="paypal-mcp-server"
            args="[\"--client-id\", \"$credential_value\", \"--client-secret\", \"$client_secret\"]"
            ;;
        *)
            echo -e "${RED}❌ Service non reconnu: $service${NC}"
            return 1
            ;;
    esac
    
    # Lire la config Claude Desktop existante
    if [ -f "$CLAUDE_CONFIG" ]; then
        # Ajouter le service à la configuration
        temp_file=$(mktemp)
        jq --arg service "attitudes-$service" \
           --arg command "$command" \
           --argjson args "$args" \
           '.mcpServers[$service] = {"command": $command, "args": $args}' \
           "$CLAUDE_CONFIG" > "$temp_file"
        
        # Remplacer le fichier
        cat "$temp_file" > "$CLAUDE_CONFIG"
        rm "$temp_file"
        
        echo -e "${GREEN}✅ $service ajouté à Claude Desktop${NC}"
    else
        echo -e "${RED}❌ Configuration Claude Desktop introuvable${NC}"
    fi
    
    # Mettre à jour le Self-Check config
    if [ -f "$MCP_CONFIG" ]; then
        temp_file=$(mktemp)
        jq --arg service "$service" \
           '.mcpInventory[$service].available = true | .mcpInventory[$service].configured = true' \
           "$MCP_CONFIG" > "$temp_file"
        
        cat "$temp_file" > "$MCP_CONFIG"
        rm "$temp_file"
        
        echo -e "${GREEN}✅ $service mis à jour dans Self-Check${NC}"
    fi
}

# Menu interactif
show_menu() {
    echo ""
    echo -e "${YELLOW}🔧 Services MCP disponibles:${NC}"
    echo "1. Figma (nécessite FIGMA_TOKEN)"
    echo "2. OpenAI O3 (nécessite OPENAI_API_KEY)"
    echo "3. CodeRabbit (nécessite CODERABBIT_TOKEN)"
    echo "4. Stripe (nécessite STRIPE_SECRET_KEY)"
    echo "5. PayPal (nécessite PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET)"
    echo "6. Afficher la configuration actuelle"
    echo "7. Tester les MCP configurés"
    echo "0. Quitter"
    echo ""
}

# Tester les MCP
test_mcp() {
    echo -e "${BLUE}🧪 Test des MCP configurés...${NC}"
    
    if command -v jq >/dev/null 2>&1; then
        echo "MCP configurés dans Claude Desktop:"
        jq -r '.mcpServers | keys[]' "$CLAUDE_CONFIG" 2>/dev/null || echo "Aucun MCP configuré"
    else
        echo "Installation de jq requise pour afficher la configuration"
    fi
    
    echo ""
    echo "Test Self-Check:"
    cd "$PROJECT_DIR"
    node -e "
        require('./src/utils/mcp-self-check-v2');
        global.checkMCPv2('I need to use figma for design')
          .then(result => console.log('Figma detected:', result.shouldUseMCP))
          .catch(console.error);
    " 2>/dev/null || echo "Erreur lors du test"
}

# Interface principale
if [ $# -eq 0 ]; then
    # Mode interactif
    while true; do
        show_menu
        read -p "Choisissez une option (0-7): " choice
        
        case $choice in
            1)
                read -p "Entrez votre FIGMA_TOKEN: " token
                if [ -n "$token" ]; then
                    add_mcp_with_credentials "figma" "FIGMA_TOKEN" "$token"
                else
                    echo -e "${RED}❌ Token requis${NC}"
                fi
                ;;
            2)
                read -p "Entrez votre OPENAI_API_KEY: " api_key
                if [ -n "$api_key" ]; then
                    add_mcp_with_credentials "o3" "OPENAI_API_KEY" "$api_key"
                else
                    echo -e "${RED}❌ API Key requise${NC}"
                fi
                ;;
            3)
                read -p "Entrez votre CODERABBIT_TOKEN: " token
                if [ -n "$token" ]; then
                    add_mcp_with_credentials "coderabbit" "CODERABBIT_TOKEN" "$token"
                else
                    echo -e "${RED}❌ Token requis${NC}"
                fi
                ;;
            4)
                read -p "Entrez votre STRIPE_SECRET_KEY: " secret_key
                if [ -n "$secret_key" ]; then
                    add_mcp_with_credentials "stripe" "STRIPE_SECRET_KEY" "$secret_key"
                else
                    echo -e "${RED}❌ Secret Key requise${NC}"
                fi
                ;;
            5)
                read -p "Entrez votre PAYPAL_CLIENT_ID: " client_id
                read -p "Entrez votre PAYPAL_CLIENT_SECRET: " client_secret
                if [ -n "$client_id" ] && [ -n "$client_secret" ]; then
                    add_mcp_with_credentials "paypal" "PAYPAL_CLIENT_ID" "$client_id" "$client_secret"
                else
                    echo -e "${RED}❌ Client ID et Secret requis${NC}"
                fi
                ;;
            6)
                echo -e "${BLUE}📋 Configuration actuelle:${NC}"
                echo "Claude Desktop:"
                cat "$CLAUDE_CONFIG" | jq '.mcpServers' 2>/dev/null || echo "Configuration non lisible"
                ;;
            7)
                test_mcp
                ;;
            0)
                echo -e "${GREEN}👋 Au revoir!${NC}"
                break
                ;;
            *)
                echo -e "${RED}❌ Option invalide${NC}"
                ;;
        esac
        
        echo ""
        read -p "Appuyez sur Entrée pour continuer..."
    done
else
    # Mode ligne de commande
    service=$1
    credential=$2
    
    if [ -z "$credential" ]; then
        echo -e "${RED}❌ Usage: $0 <service> <credential> [credential2]${NC}"
        echo "Services: figma, o3, coderabbit, stripe, paypal"
        exit 1
    fi
    
    if [ "$service" = "paypal" ] && [ -z "$3" ]; then
        echo -e "${RED}❌ PayPal nécessite 2 credentials: CLIENT_ID et CLIENT_SECRET${NC}"
        exit 1
    fi
    
    add_mcp_with_credentials "$service" "CREDENTIAL" "$credential" "$3"
fi

echo ""
echo -e "${YELLOW}⚠️  N'oubliez pas de redémarrer Claude Desktop pour activer les nouveaux MCP!${NC}"
echo -e "${BLUE}📖 Guide complet: docs/MCP_USAGE_GUIDE.md${NC}"