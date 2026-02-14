# 📝 Standards de Code Obligatoires

## 🎯 Règles Fondamentales

### 1. Qualité du Code
- ✅ **ESLint** : AUCUNE erreur tolérée
- ✅ **Prettier** : Formatage automatique obligatoire
- ✅ **TypeScript** : Types stricts pour tout nouveau code
- ✅ **Coverage** : Minimum 80% de couverture de tests

### 2. Architecture
- ✅ **DRY** : Don't Repeat Yourself - Aucune duplication
- ✅ **SOLID** : Principes SOLID respectés
- ✅ **Clean Architecture** : Séparation des couches
- ✅ **Microservices** : Un service = une responsabilité

### 3. Sécurité dans le Code
```javascript
// ❌ INTERDIT
const query = `SELECT * FROM users WHERE id = ${userId}`;
password = req.body.password; // Sans validation

// ✅ OBLIGATOIRE
const query = 'SELECT * FROM users WHERE id = $1';
const hashedPassword = await bcrypt.hash(validatedPassword, 10);
```

### 4. Gestion d'Erreurs
```javascript
// ✅ OBLIGATOIRE pour TOUTE fonction async
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error, context });
  return { success: false, error: error.message };
}
```

### 5. Documentation
- ✅ **JSDoc** pour TOUTES les fonctions publiques
- ✅ **README** pour chaque module
- ✅ **Changelog** mis à jour à chaque PR

### 6. Nomenclature
```javascript
// Classes : PascalCase
class UserAuthentication {}

// Fonctions : camelCase
function validateUserInput() {}

// Constantes : UPPER_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;

// Fichiers : kebab-case
// user-service.js, auth-middleware.js
```

### 7. Structure des Fichiers
```
src/
├── services/      # Logique métier
├── controllers/   # Endpoints API
├── middleware/    # Middleware Express
├── models/        # Modèles de données
├── utils/         # Utilitaires réutilisables
└── types/         # Types TypeScript
```

### 8. Commits Git
Format OBLIGATOIRE :
```
type(scope): description courte

- feat: nouvelle fonctionnalité
- fix: correction de bug
- docs: documentation
- style: formatage
- refactor: refactoring
- test: ajout de tests
- chore: maintenance
```

### 9. Pull Requests
Checklist OBLIGATOIRE :
- [ ] Tests passent (npm test)
- [ ] Lint sans erreurs (npm run lint)
- [ ] Documentation à jour
- [ ] Changelog mis à jour
- [ ] Code review par au moins 1 personne

### 10. Performance
- ✅ Temps de réponse API < 200ms
- ✅ Bundle size < 500KB
- ✅ Lighthouse score > 90
- ✅ Requêtes SQL optimisées

## 🚨 Violations = Build Failed

Toute violation de ces règles entraîne :
1. Échec du build
2. Blocage du merge
3. Notification à l'équipe
4. Correction obligatoire immédiate