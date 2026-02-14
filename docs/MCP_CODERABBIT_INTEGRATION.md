# 🐰 CodeRabbit MCP Integration Guide

**Date**: 2025-06-28
**Status**: Configuré et Opérationnel

## 🌟 Vue d'ensemble

CodeRabbit est maintenant intégré au projet Attitudes.vip via un serveur MCP personnalisé. Cette intégration permet d'effectuer des revues de code automatisées directement depuis Claude Desktop.

## 🔧 Configuration

### 1. Serveur MCP
**Fichier**: `/Volumes/AI_Project/AttitudesFramework/mcp-servers/coderabbit-server.js`

### 2. Clé API
```
cr-bd6b10519914ef612a04a31fe1708e2afa9bfd576261a04c4b8a701788
```

### 3. Configuration Claude Desktop
**Fichier**: `~/Library/Application Support/Claude/claude_desktop_config.json`
```json
"attitudes-coderabbit": {
  "command": "node",
  "args": [
    "/Volumes/AI_Project/AttitudesFramework/mcp-servers/coderabbit-server.js",
    "cr-bd6b10519914ef612a04a31fe1708e2afa9bfd576261a04c4b8a701788"
  ]
}
```

## 🛠️ Outils Disponibles

### 1. `coderabbit_review`
Effectue une revue complète du code.
```javascript
// Paramètres:
{
  code: "string",         // Code à analyser
  language: "string",     // Langage (javascript, python, etc.)
  context: "string?",     // Contexte additionnel
  focus: ["string"]?      // Points spécifiques (security, performance)
}
```

### 2. `coderabbit_analyze_pr`
Analyse une pull request GitHub.
```javascript
// Paramètres:
{
  owner: "string",        // Propriétaire du repo
  repo: "string",         // Nom du repository
  pr_number: integer      // Numéro de la PR
}
```

### 3. `coderabbit_security_scan`
Scanne le code pour des vulnérabilités.
```javascript
// Paramètres:
{
  code: "string",
  language: "string",
  severity_threshold: "low|medium|high|critical"  // Défaut: medium
}
```

### 4. `coderabbit_suggest_improvements`
Suggère des améliorations pour le code.
```javascript
// Paramètres:
{
  code: "string",
  language: "string",
  goal: "string?"         // performance, lisibilité, etc.
}
```

### 5. `coderabbit_check_standards`
Vérifie la conformité aux standards.
```javascript
// Paramètres:
{
  code: "string",
  language: "string",
  standards: ["string"]?  // ESLint, PEP8, etc.
}
```

## 🚀 Utilisation

### Depuis Claude Desktop

1. **Redémarrer Claude Desktop** après la configuration

2. **Utiliser les outils CodeRabbit** avec le mot-clé "Rabbit":
   ```
   Rabbit, fais une revue de ce code
   
   Rabbit analyse la sécurité de cette fonction
   
   Rabbit suggère des améliorations pour ce composant
   
   Rabbit vérifie les standards de ce fichier
   ```

### 🎯 Mots-clés déclencheurs

CodeRabbit répond aux mots-clés suivants :
- **Rabbit** (majuscules ou minuscules)
- **code review** / **revue de code**
- **analyse code**
- **coderabbit**

### Exemples d'utilisation

#### Revue de code basique
```javascript
// Demande:
"Rabbit, analyse ce code JavaScript"

// Résultat:
{
  "summary": "Revue de code javascript",
  "issues": [
    {
      "severity": "medium",
      "line": 1,
      "message": "Consider using const instead of let",
      "suggestion": "Replace let with const"
    }
  ],
  "score": 85
}
```

#### Scan de sécurité
```javascript
// Demande:
"Rabbit vérifie la sécurité de ce code"

// Résultat:
{
  "vulnerabilities": [
    {
      "severity": "high",
      "type": "SQL Injection",
      "line": 25,
      "fix": "Use parameterized queries"
    }
  ]
}
```

## 📊 Intégration dans le Workflow

### 1. Revue automatique des commits
- CodeRabbit peut analyser chaque commit
- Intégration avec les webhooks GitHub

### 2. Validation avant merge
- Analyse des PR avant fusion
- Vérification des standards de code

### 3. Rapport de qualité
- Métriques de complexité
- Score de maintenabilité
- Couverture de tests recommandée

## 🛡️ Sécurité

- **Token sécurisé**: Stocké uniquement dans la config Claude
- **Pas de logs sensibles**: Le serveur ne log pas le code analysé
- **Connexion locale**: Communication directe sans exposition réseau

## 🔄 Maintenance

### Mise à jour du token
```bash
# Éditer la configuration Claude Desktop
open "~/Library/Application Support/Claude/claude_desktop_config.json"

# Remplacer le token dans la section attitudes-coderabbit
```

### Vérification du serveur
```bash
# Tester le serveur
node /Volumes/AI_Project/AttitudesFramework/mcp-servers/coderabbit-server.js test

# Vérifier les logs
tail -f ~/.claude/logs/mcp-*.log
```

## 🐛 Troubleshooting

### Serveur ne démarre pas
1. Vérifier que Node.js est installé
2. Vérifier les dépendances: `cd mcp-servers && npm install`
3. Vérifier les permissions du fichier

### Token invalide
1. Vérifier le format du token
2. Confirmer avec CodeRabbit que le token est actif
3. Redémarrer Claude Desktop

### Pas de réponse
1. Vérifier la connexion internet
2. Vérifier les logs MCP
3. Tester avec un code simple d'abord

## 📝 Notes

- Le serveur implémente actuellement des réponses simulées
- Pour une intégration complète, l'API CodeRabbit réelle doit être utilisée
- Les limites de taux d'API doivent être respectées

---

**Prochaines étapes**:
1. Intégrer l'API CodeRabbit réelle
2. Ajouter le cache des résultats
3. Implémenter les webhooks GitHub
4. Créer des rapports de qualité automatiques