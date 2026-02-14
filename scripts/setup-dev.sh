#!/bin/bash

# Setup Development Environment Script
# Attitudes.vip - Wedding Management Platform

set -e

echo "🚀 Setting up Attitudes.vip Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node version
check_node_version() {
    echo "📦 Checking Node.js version..."
    if command -v nvm &> /dev/null; then
        nvm use
    fi
    
    REQUIRED_NODE_VERSION=$(cat .nvmrc)
    CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2)
    
    if [ "$CURRENT_NODE_VERSION" != "$REQUIRED_NODE_VERSION" ]; then
        echo -e "${YELLOW}⚠️  Node version mismatch. Required: v$REQUIRED_NODE_VERSION, Current: v$CURRENT_NODE_VERSION${NC}"
        echo "Please install the correct version using nvm"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js version OK${NC}"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing npm dependencies..."
    npm ci
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Setup environment
setup_environment() {
    echo "🔧 Setting up environment..."
    
    # Copy env file if not exists
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            echo -e "${GREEN}✅ Created .env file from .env.example${NC}"
        else
            echo -e "${YELLOW}⚠️  No .env.example file found${NC}"
        fi
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi
    
    # Create local env if not exists
    if [ ! -f .env.local ]; then
        cp .env .env.local
        echo -e "${GREEN}✅ Created .env.local file${NC}"
    fi
}

# Start Docker services
start_docker_services() {
    echo "🐳 Starting Docker services..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running${NC}"
        echo "Please start Docker Desktop"
        exit 1
    fi
    
    docker-compose up -d database redis
    echo -e "${GREEN}✅ Docker services started${NC}"
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    sleep 5
}

# Initialize database
init_database() {
    echo "🗄️ Initializing database..."
    
    # Run migrations
    npm run db:migrate || {
        echo -e "${YELLOW}⚠️  Migration failed, attempting to create database...${NC}"
        npm run db:create
        npm run db:migrate
    }
    
    # Run seeds
    npm run db:seed || echo -e "${YELLOW}⚠️  Seeding failed or no seeds available${NC}"
    
    echo -e "${GREEN}✅ Database initialized${NC}"
}

# Setup git hooks
setup_git_hooks() {
    echo "🪝 Setting up git hooks..."
    
    if [ -f .husky/pre-commit ]; then
        npx husky install
        echo -e "${GREEN}✅ Git hooks installed${NC}"
    else
        echo -e "${YELLOW}⚠️  No husky configuration found${NC}"
    fi
}

# Create necessary directories
create_directories() {
    echo "📁 Creating necessary directories..."
    
    directories=(
        "logs"
        "uploads"
        "temp"
        "coverage"
        "dist"
        ".cache"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
    done
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Install VS Code extensions
install_vscode_extensions() {
    echo "💻 Checking VS Code extensions..."
    
    if command -v code &> /dev/null; then
        echo "Installing recommended VS Code extensions..."
        code --install-extension dbaeumer.vscode-eslint
        code --install-extension esbenp.prettier-vscode
        code --install-extension ms-vscode.vscode-typescript-next
        code --install-extension christian-kohler.path-intellisense
        code --install-extension formulahendry.auto-rename-tag
        echo -e "${GREEN}✅ VS Code extensions installed${NC}"
    else
        echo -e "${YELLOW}⚠️  VS Code CLI not found${NC}"
    fi
}

# Run initial tests
run_initial_tests() {
    echo "🧪 Running initial tests..."
    
    # Run linting
    npm run lint || echo -e "${YELLOW}⚠️  Linting issues found${NC}"
    
    # Run tests
    npm test -- --passWithNoTests || echo -e "${YELLOW}⚠️  Tests failed or no tests found${NC}"
    
    echo -e "${GREEN}✅ Initial checks completed${NC}"
}

# Main execution
main() {
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║          🎉 Attitudes.vip Development Setup                    ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_node_version
    install_dependencies
    setup_environment
    create_directories
    start_docker_services
    init_database
    setup_git_hooks
    install_vscode_extensions
    run_initial_tests
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    ✅ Setup Complete!                          ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║  Next steps:                                                   ║"
    echo "║  1. Update .env with your configuration                        ║"
    echo "║  2. Run 'npm run dev' to start the development server          ║"
    echo "║  3. Visit http://localhost:3000                                ║"
    echo "║                                                                ║"
    echo "║  Useful commands:                                              ║"
    echo "║  - npm run dev         : Start development server              ║"
    echo "║  - npm test           : Run tests                              ║"
    echo "║  - npm run lint       : Run linting                            ║"
    echo "║  - npm run build      : Build for production                   ║"
    echo "║  - docker-compose up  : Start all services                     ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
}

# Run main function
main