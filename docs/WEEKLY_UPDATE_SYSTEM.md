# 📅 Système de Mise à Jour Hebdomadaire Automatique

## ✅ Confirmation : Lundi 3h00 AM

Oui, le système est configuré pour exécuter automatiquement les mises à jour **tous les lundis à 3h00 du matin**.

## 🚀 Ce qui se passe chaque lundi à 3h00

### 1. **Découverte MCP** 🔍
- Recherche des 100 serveurs MCP les plus populaires
- Compare avec ceux déjà installés
- Installe automatiquement les nouveaux

### 2. **Mise à jour des dépendances** 📦
- `npm update` pour les dépendances
- Audit de sécurité automatique
- Rapport des vulnérabilités

### 3. **Mise à jour Docker** 🐳
- Pull des dernières images
- Mise à jour des conteneurs MCP
- Optimisation de l'espace disque

### 4. **Maintenance système** 🖥️
- Vérification de l'espace disque
- Nettoyage des logs anciens
- Health check complet

### 5. **Redémarrage intelligent** 🔄
- Si des mises à jour critiques sont installées
- Sauvegarde automatique avant redémarrage
- Notification 5 minutes avant

## 🔧 Installation

Pour activer les mises à jour automatiques :

```bash
# Installation automatique
./scripts/setup-weekly-updates.sh

# Vérifier le statut
node scripts/weekly-update-scheduler.js status
```

## 📊 Vérification

### Sur macOS
```bash
# Voir si le service est actif
launchctl list | grep attitudes

# Voir les logs
tail -f logs/weekly-updates/stdout.log
```

### Sur Linux
```bash
# Avec systemd
systemctl status attitudes-weekly-update.timer
systemctl list-timers | grep attitudes

# Avec cron
crontab -l | grep attitudes
```

## 🧪 Test Manuel

Pour tester la mise à jour sans attendre lundi :

```bash
# Exécuter maintenant
node scripts/weekly-update-scheduler.js run-now

# Ou
./test-weekly-update.sh
```

## 📋 Logs et Rapports

Après chaque mise à jour :
- **Log détaillé** : `logs/weekly-updates/update-YYYY-MM-DD.log`
- **Rapport** : `logs/weekly-updates/latest-report.md`
- **Erreurs** : `logs/weekly-updates/stderr.log`

## 🔔 Notifications

Le système génère un rapport avec :
- ✅ Nombre de nouveaux MCP installés
- ✅ Dépendances mises à jour
- ✅ Images Docker actualisées
- ✅ État de santé du système

## ⚙️ Configuration

Pour modifier l'heure ou le jour, éditez :

```javascript
// Dans weekly-update-scheduler.js
cronExpression: '0 3 * * 1',  // Format: minute heure * * jour
// 0 = minute 0
// 3 = 3h du matin
// * * = tous les jours/mois
// 1 = lundi (0=dimanche, 1=lundi, etc.)
```

## 🛡️ Sécurité

- Sauvegarde automatique avant toute mise à jour majeure
- Rollback possible via les backups
- Mode safe par défaut
- Logs détaillés de toutes les actions

## 📈 Exemple de Rapport

```
# Rapport de Mise à Jour Hebdomadaire

Date: Lundi 2025-07-01 03:00:00
Durée: 245s

## Résultats

### MCP Discovery
✅ 3 nouveaux serveurs
- mcp-server-code-analyzer@1.2.0
- mcp-server-ai-assistant@2.0.0
- mcp-server-db-tools@1.5.0

### Dépendances NPM
✅ 12 mises à jour
- react: 18.2.0 → 18.3.0
- express: 4.18.0 → 4.19.0

### Images Docker
✅ 5 images mises à jour

### Système
✅ Health check complété
- Espace disque: 45% utilisé
- Mémoire: 2.3GB/8GB

🔄 Redémarrage planifié dans 5 minutes
```

## ❓ FAQ

**Q: Puis-je désactiver temporairement ?**
```bash
# macOS
launchctl unload ~/Library/LaunchAgents/com.attitudes.weekly-update.plist

# Linux systemd
sudo systemctl stop attitudes-weekly-update.timer

# Linux cron
crontab -e  # Commenter la ligne
```

**Q: Comment changer pour un autre jour ?**
- Modifier le `Weekday` (macOS) ou `OnCalendar` (Linux)
- 0=Dimanche, 1=Lundi, 2=Mardi, etc.

**Q: Les mises à jour sont-elles sûres ?**
- Oui, mode prudent par défaut
- Sauvegarde avant changements majeurs
- Pas de breaking changes automatiques

---

✅ **Confirmé** : Vos mises à jour automatiques sont programmées pour **tous les lundis à 3h00 AM** ! 🚀