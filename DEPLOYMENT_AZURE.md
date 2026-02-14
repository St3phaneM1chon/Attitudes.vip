# Attitudes.vip - Deploiement Azure

## Architecture Azure

```
┌─────────────────────────────────────────────────────┐
│                  Resource Group                      │
│                attitudes-vip-prod                    │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  App Service  │  │  Key Vault   │                │
│  │  (P1v3/B1)   │──│  (Secrets)   │                │
│  │  Node 20 LTS  │  └──────────────┘                │
│  └──────┬───────┘                                   │
│         │                                           │
│  ┌──────┴───────┐  ┌──────────────┐                │
│  │  PostgreSQL   │  │ Azure Cache  │                │
│  │  Flexible 15  │  │  for Redis   │                │
│  │  (B1ms/B2s)   │  │  (Basic/Std) │                │
│  └──────────────┘  └──────────────┘                │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  App Insights │  │ Log Analytics│                │
│  │  (Monitoring) │  │  (90 jours)  │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

## Prerequis

- Azure CLI installe (`az --version`)
- Compte Azure actif avec abonnement
- GitHub Actions secrets configures

## Deploiement rapide

### 1. Configuration initiale Azure

```bash
# Login
az login

# Creer le Resource Group
az group create --name attitudes-vip-prod --location canadacentral

# Deployer l'infrastructure via Bicep
az deployment group create \
  --resource-group attitudes-vip-prod \
  --template-file .azure/main.bicep \
  --parameters environment=prod \
  --parameters dbAdminPassword=<MOT_DE_PASSE_SECURISE> \
  --parameters jwtSecret=<JWT_SECRET_SECURISE>
```

### 2. Secrets GitHub Actions

Configurer dans Settings > Secrets > Actions :

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Service Principal client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |

### 3. Creer le Service Principal

```bash
az ad sp create-for-rbac \
  --name "attitudes-vip-deploy" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/attitudes-vip-prod \
  --sdk-auth
```

### 4. Domaine personnalise

```bash
# Ajouter le domaine
az webapp config hostname add \
  --resource-group attitudes-vip-prod \
  --webapp-name attitudes-vip \
  --hostname attitudes.vip

# SSL gratuit
az webapp config ssl create \
  --resource-group attitudes-vip-prod \
  --name attitudes-vip \
  --hostname attitudes.vip
```

## Couts estimes

| Ressource | Tier Dev | Tier Prod |
|-----------|----------|-----------|
| App Service | B1 (~$17/mois) | P1v3 (~$95/mois) |
| PostgreSQL | B1ms (~$18/mois) | B2s (~$35/mois) |
| Redis Cache | Basic C0 (~$21/mois) | Standard C1 (~$55/mois) |
| Key Vault | Standard (~$0.03/op) | Standard (~$0.03/op) |
| App Insights | Gratuit (5GB/mois) | Gratuit (5GB/mois) |
| **Total** | **~$56 CAD/mois** | **~$186 CAD/mois** |

## CI/CD Pipeline

Le push sur `main` declenche automatiquement :

1. **Test** - Lint + tests unitaires + audit securite
2. **Build** - Construction du package de deploiement
3. **Deploy** - Deploiement sur Azure App Service
4. **Health Check** - 6 tentatives, 30s d'intervalle

## Commandes utiles

```bash
# Voir les logs en temps reel
az webapp log tail --resource-group attitudes-vip-prod --name attitudes-vip

# Redemarrer l'app
az webapp restart --resource-group attitudes-vip-prod --name attitudes-vip

# SSH dans le conteneur
az webapp ssh --resource-group attitudes-vip-prod --name attitudes-vip

# Voir les metriques
az monitor metrics list --resource attitudes-vip --metric CpuPercentage
```

## Relation avec les autres configs

- **Docker Compose** (`docker-compose.yml`) : Developpement local uniquement
- **Kubernetes** (`ops/kubernetes/`) : Deploiement alternatif sur K8s generique ou AKS
- **GitHub Actions CI/CD** (`ci-cd-pipeline.yml`) : Tests CI, pas de deploiement Azure
- **Azure** (`.azure/` + `deploy-azure.yml`) : Production Azure App Service
