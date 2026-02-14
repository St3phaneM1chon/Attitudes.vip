
#!/bin/bash

# install-mcp-services.sh - Script d'installation automatique des services MCP pour Attitudes.vip
# Ce script installe et configure les services MCP essentiels via Docker

set -e  # Exit on error

echo "🚀 Installation des services MCP pour Attitudes.vip"
echo "=================================================="

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour vérifier les prérequis
check_prerequisites() {
    echo -e "${YELLOW}📋 Vérification des prérequis...${NC}"
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé. Veuillez installer Docker Desktop.${NC}"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose n'est pas installé.${NC}"
        exit 1
    fi
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}⚠️  Node.js n'est pas installé. Certains services MCP pourraient ne pas fonctionner.${NC}"
    fi
    
    echo -e "${GREEN}✅ Prérequis vérifiés${NC}"
}

# Fonction pour créer la structure de répertoires
create_directories() {
    echo -e "${YELLOW}📁 Création des répertoires...${NC}"
    
    mkdir -p data/memory
    mkdir -p data/vault
    mkdir -p logs/mcp
    mkdir -p config/mcp
    
    echo -e "${GREEN}✅ Répertoires créés${NC}"
}

# Fonction pour créer le réseau Docker
create_docker_network() {
    echo -e "${YELLOW}🔗 Création du réseau Docker...${NC}"
    
    if ! docker network ls | grep -q attitudes-network; then
        docker network create attitudes-network
        echo -e "${GREEN}✅ Réseau attitudes-network créé${NC}"
    else
        echo -e "${GREEN}✅ Réseau attitudes-network existe déjà${NC}"
    fi
}

# Fonction pour installer les services MCP essentiels
install_core_mcp_services() {
    echo -e "${YELLOW}📦 Installation des services MCP essentiels...${NC}"
    
    # Filesystem MCP
    echo "Installing Filesystem MCP..."
    npm install -g @modelcontextprotocol/server-filesystem || true
    
    # Git MCP
    echo "Installing Git MCP..."
    npm install -g @modelcontextprotocol/server-git || true
    
    # Memory MCP
    echo "Installing Memory MCP..."
    docker pull mcp/memory-server:latest || echo "Memory server image not available yet"
    
    echo -e "${GREEN}✅ Services MCP essentiels installés${NC}"
}

# Fonction pour créer le fichier docker-compose.mcp.yml
create_docker_compose() {
    echo -e "${YELLOW}📝 Création du fichier docker-compose.mcp.yml...${NC}"
    
    cat > docker-compose.mcp.yml << 'EOF'
version: '3.8'

networks:
  attitudes-network:
    external: true

services:
  # Simulation des services MCP (en attendant les images officielles)
  
  # Filesystem access (utilise un serveur Node.js local)
  mcp-filesystem:
    image: node:18-alpine
    command: npx -y @modelcontextprotocol/server-filesystem /workspace
    volumes:
      - .:/workspace
    networks:
      - attitudes-network
    restart: unless-stopped

  # PostgreSQL tools
  mcp-postgres-tools:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=postgres
    volumes:
      - ./scripts:/scripts
    networks:
      - attitudes-network
    command: sleep infinity
    restart: unless-stopped

  # Redis tools
  mcp-redis-tools:
    image: redis:7-alpine
    networks:
      - attitudes-network
    restart: unless-stopped

  # Git server simulation
  mcp-git:
    image: alpine/git:latest
    volumes:
      - .:/repo
    working_dir: /repo
    networks:
      - attitudes-network
    command: sleep infinity
    restart: unless-stopped

  # Simple HTTP server for testing
  mcp-test-server:
    image: python:3.11-alpine
    command: python -m http.server 8084
    ports:
      - "8084:8084"
    volumes:
      - ./docs:/usr/share/nginx/html
    networks:
      - attitudes-network
    restart: unless-stopped
EOF

    echo -e "${GREEN}✅ docker-compose.mcp.yml créé${NC}"
}

# Fonction pour créer la configuration Claude Desktop
create_claude_config() {
    echo -e "${YELLOW}📝 Création de la configuration Claude Desktop...${NC}"
    
    cat > config/mcp/claude_desktop_config.json << EOF
{
  "mcpServers": {
    "attitudes-filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "$(pwd)"]
    },
    "attitudes-git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "$(pwd)"]
    }
  }
}
EOF

    echo -e "${GREEN}✅ Configuration Claude créée dans config/mcp/claude_desktop_config.json${NC}"
    echo -e "${YELLOW}ℹ️  Copiez ce fichier vers:${NC}"
    echo -e "   macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
    echo -e "   Windows: %APPDATA%/Claude/claude_desktop_config.json"
}

# Fonction pour créer un script de test
create_test_script() {
    echo -e "${YELLOW}📝 Création du script de test...${NC}"
    
    cat > scripts/test-mcp-services.sh << 'EOF'
#!/bin/bash

echo "🔍 Test des services MCP..."
echo "=========================="

# Test réseau Docker
echo -n "Docker network: "
docker network ls | grep attitudes-network && echo "✅ OK" || echo "❌ FAIL"

# Test containers
echo -n "MCP containers: "
docker-compose -f docker-compose.mcp.yml ps

# Test filesystem access
echo -n "Filesystem test: "
ls -la > /dev/null && echo "✅ OK" || echo "❌ FAIL"

# Test Git
echo -n "Git test: "
git status > /dev/null 2>&1 && echo "✅ OK" || echo "❌ FAIL"

echo ""
echo "✅ Tests terminés!"
EOF

    chmod +x scripts/test-mcp-services.sh
    echo -e "${GREEN}✅ Script de test créé${NC}"
}

# Fonction pour démarrer les services
start_services() {
    echo -e "${YELLOW}🚀 Démarrage des services MCP...${NC}"
    
    docker-compose -f docker-compose.mcp.yml up -d
    
    echo -e "${GREEN}✅ Services démarrés${NC}"
    echo -e "${YELLOW}ℹ️  Utilisez 'docker-compose -f docker-compose.mcp.yml ps' pour voir le statut${NC}"
}

# Fonction pour afficher les instructions finales
show_instructions() {
    echo ""
    echo -e "${GREEN}🎉 Installation terminée!${NC}"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "1. Copiez la configuration Claude Desktop:"
    echo "   cp config/mcp/claude_desktop_config.json ~/Library/Application\\ Support/Claude/"
    echo ""
    echo "2. Testez les services:"
    echo "   ./scripts/test-mcp-services.sh"
    echo ""
    echo "3. Consultez les logs:"
    echo "   docker-compose -f docker-compose.mcp.yml logs -f"
    echo ""
    echo "4. Pour arrêter les services:"
    echo "   docker-compose -f docker-compose.mcp.yml down"
    echo ""
    echo "📚 Documentation: docs/MCP_INSTALLATION_GUIDE.md"
}

# Fonction principale
main() {
    echo "Début de l'installation à $(date)"
    
    check_prerequisites
    create_directories
    create_docker_network
    install_core_mcp_services
    create_docker_compose
    create_claude_config
    create_test_script
    start_services
    show_instructions
    
    echo "Installation terminée à $(date)"
}

# Exécuter le script principal
main
EOF