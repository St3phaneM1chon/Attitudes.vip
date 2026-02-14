# 🔑 Configuration des Clés API - Attitudes.vip

## Vue d'ensemble

Ce guide explique comment configurer toutes les clés API nécessaires pour activer les services MCP (Model Context Protocol) de la plateforme Attitudes.vip.

## 🚀 Démarrage rapide

1. **Lancer le serveur de configuration**
   ```bash
   ./scripts/start-api-config.sh
   ```

2. **Ouvrir le formulaire**
   - Navigateur: http://localhost:3100
   - Ou ouvrez directement: `configure-api-keys.html`

3. **Configurer vos clés**
   - Remplissez les champs avec vos vraies clés API
   - Cliquez sur "Sauvegarder toutes les clés API"

## 📋 Services à configurer

### 1. **Stripe** (Paiements) ✅
- **Statut**: Déjà configuré en mode TEST
- **À faire**: Ajouter le Webhook Secret pour production
- **Obtenir les clés**: https://dashboard.stripe.com/apikeys

### 2. **Twilio** (SMS/WhatsApp) ❌
- **Requis**: Account SID, Auth Token, Phone Number
- **Obtenir les clés**: https://console.twilio.com
- **Usage**: Envoi de SMS pour confirmations RSVP, rappels

### 3. **SendGrid** (Emails) ❌
- **Requis**: API Key, From Email (vérifié)
- **Obtenir les clés**: https://app.sendgrid.com/settings/api_keys
- **Usage**: Invitations, confirmations, notifications

### 4. **Cloudinary** (Médias) ❌
- **Requis**: Cloud Name, API Key, API Secret
- **Obtenir les clés**: https://cloudinary.com/console
- **Usage**: Stockage photos/vidéos mariage, galeries

### 5. **Google Calendar** ❌
- **Requis**: Client ID, Client Secret, Refresh Token
- **Obtenir les clés**: https://console.cloud.google.com
- **Usage**: Synchronisation événements, planning

### Services optionnels
- **Square**: Point de vente mobile
- **PayPal**: Paiements alternatifs
- **Slack**: Communication équipe

## 🔧 Utilisation du formulaire

### Interface
- **Barre de progression**: Montre le % de services configurés
- **Status badges**: 
  - 🟢 Configuré = Service prêt
  - 🟠 Non configuré = Clés manquantes
- **Bouton Test**: Vérifie la connexion au service

### Fonctionnalités
1. **Auto-détection**: Détecte les clés déjà configurées
2. **Validation**: Vérifie le format des clés
3. **Test en direct**: Teste chaque service individuellement
4. **Sauvegarde sécurisée**: Stocke dans `.env.mcp-extended`

## 📁 Fichiers créés

```
/configure-api-keys.html       # Formulaire principal
/scripts/api-keys-manager.js   # Gestionnaire de clés
/server/api-config-server.js   # Serveur API
/.env.mcp-extended            # Fichier de configuration
```

## 🛠️ Scripts utiles

```bash
# Vérifier le statut des clés
node scripts/api-keys-manager.js status

# Tester un service spécifique
node scripts/api-keys-manager.js test stripe

# Mettre à jour le tracker MCP
node scripts/api-keys-manager.js update
```

## 🚨 Sécurité

- **Ne jamais** commiter `.env.mcp-extended` dans Git
- Les clés sont masquées dans l'interface
- Utilisez des clés de test en développement
- Restreignez l'accès en production

## 📈 Après configuration

1. **Redémarrer les services MCP**
   ```bash
   docker-compose -f docker-compose.mcp-local.yml restart
   ```

2. **Vérifier les services**
   ```bash
   ./scripts/mcp-status-report.sh
   ```

3. **Tester l'intégration**
   ```bash
   node scripts/test-all-mcp-services.js
   ```

## 🆘 Dépannage

### Service non accessible
- Vérifiez que Docker est lancé
- Vérifiez les logs: `docker logs mcp-<service>`

### Clés non reconnues
- Vérifiez le format (pas d'espaces)
- Testez avec le bouton "Tester"
- Vérifiez les permissions API

### Formulaire ne s'affiche pas
- Lancez: `npm install express cors`
- Vérifiez le port 3100 est libre

## 📞 Support

Pour obtenir des clés API:
- **Stripe**: support@stripe.com
- **Twilio**: support@twilio.com
- **SendGrid**: support@sendgrid.com
- **Cloudinary**: support@cloudinary.com

---

*Ce formulaire centralise la configuration de tous les services externes pour Attitudes.vip. Une fois configurés, les services MCP permettront d'envoyer des SMS, emails, gérer les paiements et stocker les médias automatiquement.*