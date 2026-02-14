# Guide du Système de Redémarrage - Attitudes.vip

## 🔄 Vue d'ensemble

L'application Attitudes.vip dispose d'un système complet de redémarrage qui permet :
- **Redémarrage manuel** sécurisé avec sauvegarde
- **Redémarrage automatique** en cas de problème
- **Redémarrage planifié** pour maintenance
- **Monitoring continu** de la santé des services

## 🚀 Redémarrage Manuel

### Script principal : `restart-app.sh`

#### Modes disponibles

1. **Safe (Sécurisé)** - Par défaut
   ```bash
   ./scripts/restart-app.sh
   # ou
   ./scripts/restart-app.sh safe
   ```
   - ✅ Sauvegarde automatique
   - ✅ Notification aux utilisateurs
   - ✅ Arrêt gracieux
   - ✅ Vérification complète

2. **Quick (Rapide)**
   ```bash
   ./scripts/restart-app.sh quick
   ```
   - ⚡ Redémarrage rapide
   - ❌ Pas de sauvegarde
   - ✅ Vérification santé

3. **Emergency (Urgence)**
   ```bash
   ./scripts/restart-app.sh emergency
   ```
   - 🚨 Force l'arrêt et redémarre
   - 🔧 Recrée les conteneurs
   - ⚠️  Utiliser en dernier recours

4. **Service spécifique**
   ```bash
   ./scripts/restart-app.sh service redis
   ./scripts/restart-app.sh service auth-service
   ```
   Services disponibles : ui, auth-service, database, redis, mcp-*

### Commandes utiles

```bash
# Voir le statut complet
./scripts/restart-app.sh status

# Vérifier la santé
./scripts/restart-app.sh health

# Voir l'aide
./scripts/restart-app.sh help
```

## 🤖 Redémarrage Automatique

### Configuration

Le système surveille automatiquement la santé des services et redémarre si nécessaire.

#### Activation
```bash
# Variables d'environnement
export AUTO_RESTART_ENABLED=true
export SCHEDULED_RESTART_ENABLED=true

# Démarrer le gestionnaire
node src/utils/auto-restart-manager.js start
```

#### Services surveillés
- **UI (Nginx)** : http://localhost:8080/health
- **Auth Service** : http://localhost:3000/health
- **PostgreSQL** : Connexion database
- **Redis** : Ping redis

#### Paramètres
- Vérification : toutes les 5 minutes
- Échecs avant redémarrage : 3
- Cooldown entre redémarrages : 30 minutes

### Gestion du redémarrage automatique

```bash
# Démarrer la surveillance
node src/utils/auto-restart-manager.js start

# Voir le statut
node src/utils/auto-restart-manager.js status

# Forcer un redémarrage
node src/utils/auto-restart-manager.js restart [mode]

# Arrêter la surveillance
node src/utils/auto-restart-manager.js stop
```

## 📅 Redémarrage Planifié

### Configuration par défaut
- **Quand** : Dimanche à 4h00 du matin
- **Mode** : Safe (avec sauvegarde)
- **Notification** : 5 minutes avant

### Personnalisation

Dans `auto-restart-manager.js` :
```javascript
schedule: {
  enabled: true,
  cronExpression: '0 4 * * 0', // Format cron
  gracePeriod: 5 * 60 * 1000   // Délai d'avertissement
}
```

## 🛡️ Sécurité et Sauvegardes

### Sauvegardes automatiques

Lors d'un redémarrage sécurisé :
1. **Base de données** : `backups/backup-YYYYMMDD-HHMMSS.sql`
2. **Volumes Docker** : `backups/backup-YYYYMMDD-HHMMSS-volumes.tar.gz`
3. **Configuration** : `backups/backup-YYYYMMDD-HHMMSS-config.tar.gz`

### Restauration

```bash
# Restaurer la base de données
docker-compose exec -T database psql -U attitudes attitudes_db < backups/backup-20250627-120000.sql

# Restaurer les volumes
docker run --rm -v attitudesframework_postgres_data:/data -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/backup-20250627-120000-volumes.tar.gz -C /

# Restaurer la configuration
tar xzf backups/backup-20250627-120000-config.tar.gz
```

## 📊 Monitoring et Logs

### Logs de redémarrage
```bash
# Logs manuels
tail -f logs/restart-*.log

# Logs automatiques
tail -f logs/auto-restart/*.log

# Notifications
cat logs/auto-restart/notifications.json | jq
```

### Structure des logs
```json
{
  "timestamp": "2025-06-27T10:30:00Z",
  "level": "info|warning|error|critical",
  "message": "Description de l'événement"
}
```

## 🚨 Scénarios de redémarrage

### 1. Maintenance planifiée
```bash
# 1. Annoncer la maintenance
echo "Maintenance planifiée dans 10 minutes" | wall

# 2. Redémarrage sécurisé
./scripts/restart-app.sh safe

# 3. Vérifier
./scripts/restart-app.sh health
```

### 2. Problème de performance
```bash
# 1. Vérifier les ressources
docker stats

# 2. Redémarrage rapide
./scripts/restart-app.sh quick

# 3. Analyser les logs
docker-compose logs --tail=100
```

### 3. Service non responsive
```bash
# 1. Identifier le service problématique
./scripts/restart-app.sh status

# 2. Redémarrer le service spécifique
./scripts/restart-app.sh service [nom-service]

# 3. Si échec, redémarrage d'urgence
./scripts/restart-app.sh emergency
```

## 🔧 Configuration Docker

### Ordre de démarrage (docker-compose.yml)
```yaml
services:
  database:
    # Démarre en premier
  
  redis:
    # Démarre en second
  
  auth-service:
    depends_on:
      - database
      - redis
  
  ui:
    depends_on:
      - auth-service
```

### Politique de redémarrage
```yaml
services:
  auth-service:
    restart: unless-stopped  # Redémarre sauf si arrêté manuellement
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 📋 Checklist de redémarrage

### Avant le redémarrage
- [ ] Vérifier l'heure (éviter heures de pointe)
- [ ] Sauvegarder si nécessaire
- [ ] Informer les utilisateurs
- [ ] Vérifier l'espace disque
- [ ] Noter la raison du redémarrage

### Pendant le redémarrage
- [ ] Surveiller les logs
- [ ] Vérifier que les services démarrent
- [ ] Attendre la disponibilité complète

### Après le redémarrage
- [ ] Tester les endpoints critiques
- [ ] Vérifier les logs d'erreur
- [ ] Confirmer avec un utilisateur test
- [ ] Documenter l'intervention

## ⚠️ Troubleshooting

### Service qui ne démarre pas
```bash
# Voir les logs détaillés
docker-compose logs -f [service-name]

# Recréer le conteneur
docker-compose up -d --force-recreate [service-name]

# Vérifier les dépendances
docker-compose exec [service-name] /bin/sh
```

### Base de données corrompue
```bash
# 1. Arrêter les services
docker-compose stop

# 2. Restaurer depuis backup
./scripts/restore-db.sh [backup-file]

# 3. Redémarrer
./scripts/restart-app.sh safe
```

### Problème de permissions
```bash
# Réparer les permissions Docker
sudo chown -R $USER:docker /var/run/docker.sock

# Réparer les volumes
docker-compose run --rm ui chown -R nginx:nginx /usr/share/nginx/html
```

## 🎯 Bonnes pratiques

1. **Toujours** faire une sauvegarde avant un redémarrage en production
2. **Préférer** les redémarrages planifiés aux redémarrages d'urgence
3. **Documenter** chaque redémarrage dans les logs
4. **Tester** d'abord en environnement de développement
5. **Monitorer** activement après un redémarrage

## 📞 Support

En cas de problème :
1. Consulter les logs : `logs/restart-*.log`
2. Vérifier Docker : `docker ps -a`
3. Status détaillé : `./scripts/restart-app.sh status`
4. Mode urgence : `./scripts/restart-app.sh emergency`

---

*Le système de redémarrage garantit la disponibilité maximale de l'application tout en préservant l'intégrité des données.*