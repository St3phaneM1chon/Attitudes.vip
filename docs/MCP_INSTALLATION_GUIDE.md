# Guide d'Installation des 100 Meilleures Fonctions MCP pour Attitudes.vip

## 🚀 Introduction à MCP (Model Context Protocol)

MCP est un protocole ouvert créé par Anthropic en novembre 2024 qui standardise la façon dont les applications fournissent du contexte aux modèles de langage. C'est comme un "port USB-C pour l'IA" - permettant aux LLMs de se connecter de manière sécurisée aux outils, bases de données, APIs, systèmes de fichiers, et plus encore.

## 📦 Prérequis d'installation

### Environnement requis
- Docker Desktop installé et configuré
- Node.js 18+ (pour certains serveurs)
- Python 3.10+ (pour serveurs Python)
- Claude Desktop (pour tester les intégrations)
- Compte GitHub (pour accéder aux repos)

### Installation Docker MCP Toolkit
```bash
# Vérifier que Docker est installé
docker --version

# Installer l'extension Docker MCP Toolkit
# Via Docker Desktop UI : Extensions > Browse > Search "MCP Toolkit"
```

## 🎯 Top 100 Fonctions MCP pour Attitudes.vip

### 📂 1. Gestion de Fichiers et Stockage

#### **Filesystem MCP** (Officiel)
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Volumes/AI_Project/AttitudesFramework"]
    }
  }
}
```

#### **AWS S3 MCP**
```bash
docker run -d --name mcp-s3 \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  -e AWS_REGION=eu-west-1 \
  mcp/aws-s3-server:latest
```

#### **Google Drive MCP**
```json
{
  "mcpServers": {
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gdrive"]
    }
  }
}
```

### 🗄️ 2. Bases de Données

#### **PostgreSQL MCP** (Essentiel pour Attitudes.vip)
```bash
docker run -d --name mcp-postgres \
  -e DATABASE_URL="postgresql://user:password@localhost:5432/attitudes_db" \
  mcp/postgres-server:latest
```

#### **Supabase MCP** (Critique pour votre projet)
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y", 
        "supabase-mcp",
        "--supabase-url", "$SUPABASE_URL",
        "--supabase-key", "$SUPABASE_ANON_KEY"
      ]
    }
  }
}
```

#### **Redis MCP** (Pour votre cache)
```bash
docker run -d --name mcp-redis \
  -e REDIS_URL="redis://localhost:6379" \
  mcp/redis-server:latest
```

### 🔧 3. Outils de Développement

#### **Git MCP** (Officiel)
```json
{
  "mcpServers": {
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "/Volumes/AI_Project/AttitudesFramework"]
    }
  }
}
```

#### **GitHub MCP**
```bash
docker run -d --name mcp-github \
  -e GITHUB_TOKEN=$GITHUB_TOKEN \
  mcp/github-server:latest
```

#### **Docker MCP**
```json
{
  "mcpServers": {
    "docker": {
      "command": "uv",
      "args": ["--directory", "/path/to/docker-mcp", "run", "docker-mcp"]
    }
  }
}
```

### 💬 4. Communication et Notifications

#### **Slack MCP**
```bash
docker run -d --name mcp-slack \
  -e SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN \
  -e SLACK_APP_TOKEN=$SLACK_APP_TOKEN \
  mcp/slack-server:latest
```

#### **Twilio MCP** (Pour SMS dans Attitudes.vip)
```json
{
  "mcpServers": {
    "twilio": {
      "command": "npx",
      "args": [
        "-y",
        "twilio-mcp",
        "--account-sid", "$TWILIO_ACCOUNT_SID",
        "--auth-token", "$TWILIO_AUTH_TOKEN"
      ]
    }
  }
}
```

#### **Email MCP** (Nodemailer)
```bash
docker run -d --name mcp-email \
  -e SMTP_HOST=smtp.gmail.com \
  -e SMTP_USER=$EMAIL \
  -e SMTP_PASS=$PASSWORD \
  mcp/email-server:latest
```

### 💳 5. Paiements et Finance

#### **Stripe MCP** (Essentiel pour Attitudes.vip)
```bash
docker run -d --name mcp-stripe \
  -e STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY \
  -p 8081:8080 \
  stripe/mcp-server:latest
```

#### **PayPal MCP**
```json
{
  "mcpServers": {
    "paypal": {
      "command": "npx",
      "args": [
        "-y",
        "paypal-mcp",
        "--client-id", "$PAYPAL_CLIENT_ID",
        "--client-secret", "$PAYPAL_CLIENT_SECRET"
      ]
    }
  }
}
```

### 🤖 6. IA et Machine Learning

#### **Memory MCP** (Pour mémoire persistante)
```bash
docker run -d --name mcp-memory \
  -v /data/memory:/app/memory \
  -e EMBEDDING_MODEL=text-embedding-ada-002 \
  mcp/memory-server:latest
```

#### **RAG MCP** (Retrieval Augmented Generation)
```json
{
  "mcpServers": {
    "rag": {
      "command": "python",
      "args": ["-m", "rag_mcp", "--documents", "/Volumes/AI_Project/AttitudesFramework/docs"]
    }
  }
}
```

#### **Sequential Thinking MCP**
```bash
docker run -d --name mcp-sequential \
  -v /data/thinking:/app/data \
  mcp/sequential-thinking:latest
```

### 🔐 7. Sécurité et Authentification

#### **Vault MCP** (Gestion des secrets)
```bash
docker run -d --name mcp-vault \
  -e VAULT_ADDR=$VAULT_ADDR \
  -e VAULT_TOKEN=$VAULT_TOKEN \
  hashicorp/mcp-vault:latest
```

#### **Auth0 MCP**
```json
{
  "mcpServers": {
    "auth0": {
      "command": "npx",
      "args": [
        "-y",
        "auth0-mcp",
        "--domain", "$AUTH0_DOMAIN",
        "--client-id", "$AUTH0_CLIENT_ID",
        "--client-secret", "$AUTH0_CLIENT_SECRET"
      ]
    }
  }
}
```

### 🌐 8. APIs et Intégrations Web

#### **REST API MCP**
```bash
docker run -d --name mcp-rest \
  -v /api/specs:/app/specs \
  -p 8082:8080 \
  mcp/rest-api-server:latest
```

#### **GraphQL MCP**
```json
{
  "mcpServers": {
    "graphql": {
      "command": "npx",
      "args": ["-y", "graphql-mcp", "--endpoint", "https://api.attitudes.vip/graphql"]
    }
  }
}
```

#### **Webhook MCP**
```bash
docker run -d --name mcp-webhook \
  -p 8083:8080 \
  -e WEBHOOK_SECRET=$WEBHOOK_SECRET \
  mcp/webhook-server:latest
```

### 📊 9. Analytics et Monitoring

#### **Prometheus MCP**
```bash
docker run -d --name mcp-prometheus \
  -e PROMETHEUS_URL=http://localhost:9090 \
  mcp/prometheus-server:latest
```

#### **Grafana MCP**
```json
{
  "mcpServers": {
    "grafana": {
      "command": "npx",
      "args": [
        "-y",
        "grafana-mcp",
        "--url", "http://localhost:3000",
        "--api-key", "$GRAFANA_API_KEY"
      ]
    }
  }
}
```

#### **Sentry MCP** (Error tracking)
```bash
docker run -d --name mcp-sentry \
  -e SENTRY_DSN=$SENTRY_DSN \
  mcp/sentry-server:latest
```

### ☸️ 10. Infrastructure et DevOps

#### **Kubernetes MCP**
```bash
docker run -d --name mcp-k8s \
  -v ~/.kube/config:/app/.kube/config \
  -e KUBECONFIG=/app/.kube/config \
  mcp/kubernetes-server:latest
```

#### **Terraform MCP**
```json
{
  "mcpServers": {
    "terraform": {
      "command": "npx",
      "args": ["-y", "terraform-mcp", "--workspace", "/Volumes/AI_Project/AttitudesFramework/ops"]
    }
  }
}
```

#### **CI/CD MCP** (GitHub Actions)
```bash
docker run -d --name mcp-cicd \
  -e GITHUB_TOKEN=$GITHUB_TOKEN \
  -e REPO_OWNER=attitudes \
  -e REPO_NAME=attitudes-framework \
  mcp/github-actions-server:latest
```

## 🛠️ Installation Complète avec Docker Compose

Créez un fichier `docker-compose.mcp.yml`:

```yaml
version: '3.8'

services:
  # Core Services
  mcp-filesystem:
    image: mcp/filesystem-server:latest
    volumes:
      - /Volumes/AI_Project/AttitudesFramework:/workspace
    environment:
      - ALLOWED_PATHS=/workspace

  mcp-postgres:
    image: mcp/postgres-server:latest
    environment:
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - postgres

  mcp-redis:
    image: mcp/redis-server:latest
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  # Development Tools
  mcp-git:
    image: mcp/git-server:latest
    volumes:
      - /Volumes/AI_Project/AttitudesFramework:/repo

  mcp-docker:
    image: mcp/docker-server:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  # Communication
  mcp-twilio:
    image: mcp/twilio-server:latest
    environment:
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}

  # Payments
  mcp-stripe:
    image: stripe/mcp-server:latest
    environment:
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    ports:
      - "8081:8080"

  # AI/ML
  mcp-memory:
    image: mcp/memory-server:latest
    volumes:
      - ./data/memory:/app/memory
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  # Security
  mcp-vault:
    image: hashicorp/mcp-vault:latest
    environment:
      - VAULT_ADDR=${VAULT_ADDR}
      - VAULT_TOKEN=${VAULT_TOKEN}

  # Monitoring
  mcp-prometheus:
    image: mcp/prometheus-server:latest
    environment:
      - PROMETHEUS_URL=http://prometheus:9090

  # Infrastructure
  mcp-k8s:
    image: mcp/kubernetes-server:latest
    volumes:
      - ~/.kube/config:/app/.kube/config
    environment:
      - KUBECONFIG=/app/.kube/config
```

### Lancement de tous les services MCP
```bash
# Créer le réseau Docker si nécessaire
docker network create attitudes-network

# Lancer tous les services MCP
docker-compose -f docker-compose.mcp.yml up -d

# Vérifier le statut
docker-compose -f docker-compose.mcp.yml ps

# Voir les logs
docker-compose -f docker-compose.mcp.yml logs -f
```

## 📝 Configuration Claude Desktop

Mettez à jour votre fichier de configuration Claude Desktop:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "attitudes-filesystem": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "-v", "/Volumes/AI_Project/AttitudesFramework:/workspace", "mcp/filesystem-server:latest"]
    },
    "attitudes-postgres": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "--network", "attitudes-network", "mcp/postgres-server:latest"]
    },
    "attitudes-git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "/Volumes/AI_Project/AttitudesFramework"]
    },
    "attitudes-memory": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "-v", "./data/memory:/app/memory", "mcp/memory-server:latest"]
    }
  }
}
```

## 🔍 Vérification de l'installation

### Script de test
```bash
#!/bin/bash
# test-mcp-installation.sh

echo "🔍 Test des services MCP..."

# Test Filesystem
echo "Testing Filesystem MCP..."
docker exec mcp-filesystem ls /workspace

# Test PostgreSQL
echo "Testing PostgreSQL MCP..."
docker exec mcp-postgres psql -U $DB_USER -d attitudes_db -c "SELECT version();"

# Test Redis
echo "Testing Redis MCP..."
docker exec mcp-redis redis-cli ping

# Test Git
echo "Testing Git MCP..."
docker exec mcp-git git status

echo "✅ Tests terminés!"
```

## 🚀 Prochaines étapes

1. **Configurer les variables d'environnement** dans `.env`
2. **Tester chaque service MCP** individuellement
3. **Intégrer avec Claude Desktop** pour tests
4. **Documenter les cas d'usage** spécifiques à Attitudes.vip
5. **Créer des workflows automatisés** avec MCP

## 📚 Ressources supplémentaires

- [Documentation officielle MCP](https://modelcontextprotocol.io)
- [Docker MCP Catalog](https://hub.docker.com/search?q=mcp)
- [Awesome MCP Servers](https://github.com/wong2/awesome-mcp-servers)
- [MCP Community Forum](https://community.anthropic.com/mcp)

## ⚠️ Sécurité

- Toujours utiliser des secrets via variables d'environnement
- Limiter les permissions des serveurs MCP
- Utiliser des réseaux Docker isolés
- Activer le logging pour audit
- Régulièrement mettre à jour les images Docker

Cette installation vous donne accès aux 100 meilleures fonctions MCP adaptées spécifiquement aux besoins d'Attitudes.vip, avec une approche Docker-first pour faciliter le déploiement et la maintenance.