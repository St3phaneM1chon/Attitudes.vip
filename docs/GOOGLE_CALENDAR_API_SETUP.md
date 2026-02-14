# 📅 Guide de Configuration Google Calendar API

## Étapes pour obtenir les clés API Google Calendar

### 1. Accéder à Google Cloud Console
🔗 **URL**: https://console.cloud.google.com/

- Connectez-vous avec votre compte Google
- Si c'est votre première fois, acceptez les conditions

### 2. Créer un nouveau projet (ou sélectionner un existant)
1. Cliquez sur le **menu déroulant** en haut (à côté de "Google Cloud")
2. Cliquez sur **"Nouveau projet"**
3. Nom du projet : `Attitudes-VIP`
4. Cliquez sur **"Créer"**

### 3. Activer l'API Google Calendar
1. Dans le menu de gauche, cliquez sur **"API et services"** > **"Bibliothèque"**
2. Dans la barre de recherche, tapez **"Google Calendar API"**
3. Cliquez sur **"Google Calendar API"** dans les résultats
4. Cliquez sur le bouton **"ACTIVER"**

### 4. Créer des identifiants (Client ID et Secret)
1. Allez dans **"API et services"** > **"Identifiants"**
2. Cliquez sur **"+ CRÉER DES IDENTIFIANTS"** > **"ID client OAuth"**

### 5. Configurer l'écran de consentement OAuth (si demandé)
1. Cliquez sur **"CONFIGURER L'ÉCRAN DE CONSENTEMENT"**
2. Choisissez **"Externe"** (sauf si vous avez Google Workspace)
3. Remplissez :
   - **Nom de l'application** : Attitudes.vip
   - **Email d'assistance** : votre email
   - **Domaines autorisés** : attitudes.vip (si vous avez le domaine)
   - **Email du développeur** : votre email
4. Cliquez sur **"Enregistrer et continuer"**
5. Dans **"Champs d'application"**, cliquez sur **"Ajouter ou supprimer des champs"**
6. Recherchez et cochez :
   - `../auth/calendar` (Voir, modifier, partager et supprimer définitivement tous les agendas)
   - `../auth/calendar.events` (Afficher et modifier les événements)
7. **"Enregistrer et continuer"**
8. **"Enregistrer et continuer"** jusqu'à la fin

### 6. Créer l'ID client OAuth
1. Retournez dans **"Identifiants"** > **"+ CRÉER DES IDENTIFIANTS"** > **"ID client OAuth"**
2. **Type d'application** : "Application Web"
3. **Nom** : "Attitudes.vip Calendar Integration"
4. **URI de redirection autorisés**, ajoutez :
   - `http://localhost:3000/auth/google/callback`
   - `http://localhost:8080/auth/google/callback`
   - `https://attitudes.vip/auth/google/callback` (pour la production)
5. Cliquez sur **"CRÉER"**

### 7. Récupérer vos clés
Une popup s'affiche avec :
- **Client ID** : `123456789-abcdefg.apps.googleusercontent.com`
- **Client Secret** : `GOCSPX-xxxxxxxxxxxx`

**⚠️ COPIEZ CES VALEURS IMMÉDIATEMENT !**

### 8. Obtenir le Refresh Token
Pour obtenir le refresh token, vous devez faire une authentification OAuth2. Voici la méthode simple :

#### Option A : Utiliser OAuth2 Playground (Recommandé)
1. Allez sur https://developers.google.com/oauthplayground/
2. Cliquez sur l'engrenage ⚙️ en haut à droite
3. Cochez **"Use your own OAuth credentials"**
4. Entrez votre **Client ID** et **Client Secret**
5. Dans la liste de gauche, trouvez **"Google Calendar API v3"**
6. Cochez `https://www.googleapis.com/auth/calendar`
7. Cliquez **"Authorize APIs"**
8. Connectez-vous et autorisez
9. Cliquez **"Exchange authorization code for tokens"**
10. **COPIEZ LE REFRESH TOKEN** qui apparaît

#### Option B : Script Node.js
Créez un fichier `get-google-refresh-token.js` :

```javascript
const readline = require('readline');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  'VOTRE_CLIENT_ID',
  'VOTRE_CLIENT_SECRET',
  'http://localhost:3000/oauth2callback'
);

const scopes = ['https://www.googleapis.com/auth/calendar'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Autorisez cette app en visitant cette URL:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Entrez le code de l\'URL de retour: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Erreur:', err);
    console.log('Votre refresh token:', token.refresh_token);
  });
});
```

### 9. Résumé des clés nécessaires
Vous devez avoir :
1. **Client ID** : `123456789-xxx.apps.googleusercontent.com`
2. **Client Secret** : `GOCSPX-xxxxxxxxxx`
3. **Refresh Token** : `1//0xxxxxxxxxxxxx`

### 📝 Notes importantes
- Le **Refresh Token** ne s'obtient qu'une fois lors de la première autorisation
- Gardez ces clés **secrètes et sécurisées**
- Ne les commitez **jamais** dans Git
- Pour la production, ajoutez votre domaine réel dans les URI de redirection

### 🆘 Problèmes courants
1. **"Accès bloqué"** : Vérifiez que l'API est bien activée
2. **"URI de redirection non valide"** : Ajoutez l'URL exacte dans la console
3. **"Refresh token manquant"** : Assurez-vous d'avoir `access_type: 'offline'`

### 🔗 Liens directs utiles
- [Console Google Cloud](https://console.cloud.google.com/)
- [API Calendar](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Identifiants](https://console.cloud.google.com/apis/credentials)
- [OAuth Playground](https://developers.google.com/oauthplayground/)

---

Une fois que vous avez ces 3 clés, retournez dans le formulaire de configuration et entrez-les dans la section Google Calendar !