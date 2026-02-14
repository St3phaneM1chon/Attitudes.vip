# ♿ WCAG 2.2 - Web Content Accessibility Guidelines

## 🚨 CRITICITÉ : LÉGALE ET ÉTHIQUE
**Non-conformité = Poursuites judiciaires, exclusion marchés publics, discrimination**

## 📋 Vue d'Ensemble WCAG 2.2

Les WCAG (Web Content Accessibility Guidelines) 2.2 sont la norme internationale pour l'accessibilité numérique. La conformité est légalement requise dans de nombreux pays et essentielle pour l'inclusion.

### Niveaux de Conformité
```yaml
conformance_levels:
  A: "Niveau minimum - Barrières majeures supprimées"
  AA: "Niveau recommandé - Exigé par la plupart des lois"
  AAA: "Niveau maximum - Rarement requis intégralement"

legal_requirements:
  USA: "Section 508, ADA - Niveau AA"
  Europe: "EN 301 549 - Niveau AA"
  Canada: "AODA - Niveau AA"
  France: "RGAA 4.1 - Niveau AA"
```

## 1. PRINCIPE 1 : PERCEPTIBLE

### 1.1 Alternatives Textuelles
```javascript
// ✅ OBLIGATOIRE - Niveau A
class TextAlternatives {
  // 1.1.1 Contenu non textuel
  implementAltText() {
    const requirements = {
      images: {
        informative: 'Description complète du contenu',
        decorative: 'alt="" ou role="presentation"',
        complex: 'Description longue + résumé court',
        text_in_image: 'Texte intégral dans alt'
      },
      
      controls: {
        buttons: 'Label descriptif de l\'action',
        inputs: 'Label ou aria-label obligatoire',
        icons: 'Texte équivalent de la fonction'
      },
      
      media: {
        audio: 'Transcription complète',
        video: 'Audio description ou alternative',
        animations: 'Description de l\'information'
      },
      
      tests: {
        captcha: 'Alternative accessible requise',
        charts: 'Données en tableau accessible'
      }
    };
    
    return requirements;
  }
}

// Exemple HTML
<img src="product.jpg" alt="Smartphone XYZ noir, vue de face montrant l'écran 6.5 pouces">
<img src="decoration.png" alt="" role="presentation">
<button aria-label="Fermer la fenêtre de dialogue">X</button>
```

### 1.2 Médias Temporels
```javascript
// ✅ OBLIGATOIRE - Niveaux A et AA
class MediaAccessibility {
  // 1.2.1 Audio seulement et vidéo seulement (A)
  provideAlternatives() {
    return {
      audio_only: {
        requirement: 'Transcription textuelle complète',
        format: 'HTML structuré avec timestamps',
        location: 'Lien visible près du lecteur'
      },
      
      video_only: {
        requirement: 'Description textuelle OU piste audio',
        content: 'Toute information visuelle importante'
      }
    };
  }
  
  // 1.2.2 Sous-titres (préenregistrés) (A)
  // 1.2.4 Sous-titres (en direct) (AA)
  implementCaptions() {
    return {
      prerecorded: {
        format: 'WebVTT, SRT, ou TTML',
        accuracy: '99% minimum',
        synchronization: 'Précis à 100ms',
        identification: 'Locuteurs identifiés',
        non_speech: '[Musique], [Applaudissements], etc.'
      },
      
      live: {
        delay: 'Maximum 5 secondes',
        accuracy: '95% acceptable',
        fallback: 'Transcription post-diffusion'
      },
      
      styling: {
        font: 'Sans-serif lisible',
        size: 'Ajustable par utilisateur',
        contrast: 'Ratio 4.5:1 minimum',
        background: 'Semi-transparent noir'
      }
    };
  }
  
  // 1.2.5 Audio-description (AA)
  provideAudioDescription() {
    return {
      requirement: 'Description des éléments visuels importants',
      timing: 'Entre les dialogues naturels',
      extended: 'Pause vidéo si nécessaire (AAA)',
      content: [
        'Actions importantes',
        'Changements de scène',
        'Expressions faciales clés',
        'Texte à l\’écran'
      ]
    };
  }
}
```

### 1.3 Adaptable
```html
<!-- ✅ OBLIGATOIRE - Structure sémantique -->
<!DOCTYPE html>
<html lang="fr">
<head>
    <title>Titre de page descriptif - Nom du site</title>
</head>
<body>
    <header>
        <nav aria-label="Navigation principale">
            <ul>
                <li><a href="/">Accueil</a></li>
                <li><a href="/products">Produits</a></li>
                <li><a href="/contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <h1>Titre principal unique de la page</h1>
        
        <article>
            <h2>Sous-titre structurant</h2>
            <p>Contenu avec <strong>emphase sémantique</strong>.</p>
            
            <!-- 1.3.5 Identifier la finalité (AA) -->
            <form>
                <label for="email">Email</label>
                <input type="email" id="email" autocomplete="email" required>
                
                <label for="name">Nom complet</label>
                <input type="text" id="name" autocomplete="name" required>
            </form>
        </article>
        
        <!-- 1.3.4 Orientation (AA) -->
        <style>
            /* Ne pas bloquer l'orientation */
            @media screen and (orientation: portrait) {
                /* Styles adaptatifs, pas de blocage */
            }
        </style>
    </main>
    
    <footer>
        <p>&copy; 2024 Entreprise. Tous droits réservés.</p>
    </footer>
</body>
</html>
```

### 1.4 Distinguable
```css
/* ✅ OBLIGATOIRE - Contraste et lisibilité */

/* 1.4.3 Contraste minimum (AA) */
.text-normal {
    color: #595959; /* Ratio 7:1 sur blanc */
    background-color: #ffffff;
}

.text-large {
    font-size: 18pt; /* ou 14pt bold */
    color: #767676; /* Ratio 4.5:1 acceptable pour grand texte */
}

/* 1.4.11 Contraste non textuel (AA) */
.button {
    border: 2px solid #767676; /* Ratio 3:1 pour UI */
    background-color: #0066cc;
    color: #ffffff; /* Ratio 7.5:1 */
}

.button:focus {
    outline: 3px solid #000000;
    outline-offset: 2px;
}

/* 1.4.4 Redimensionnement du texte (AA) */
html {
    font-size: 100%; /* Base 16px */
}

body {
    font-size: 1rem; /* Utiliser rem pour scalabilité */
    line-height: 1.5;
}

/* 1.4.10 Reflow (AA) */
@media screen and (max-width: 320px) {
    /* Contenu doit rester lisible sans scroll horizontal */
    .container {
        width: 100%;
        padding: 0 10px;
    }
}

/* 1.4.12 Espacement du texte (AA) */
* {
    /* Doit supporter ces ajustements sans perte */
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
}

p {
    margin-bottom: 2em !important;
}

/* 1.4.13 Contenu au survol (AA) */
.tooltip {
    position: absolute;
    /* Doit être */
    /* - Dismissible (Esc ou déplacement souris) */
    /* - Hoverable (survol du tooltip lui-même) */
    /* - Persistent (reste visible) */
}
```

## 2. PRINCIPE 2 : UTILISABLE

### 2.1 Accessible au Clavier
```javascript
// ✅ OBLIGATOIRE - Navigation clavier complète
class KeyboardAccessibility {
  // 2.1.1 Clavier (A)
  // 2.1.3 Clavier sans exception (AAA)
  implementKeyboardNav() {
    // Tous les éléments interactifs accessibles
    document.addEventListener('DOMContentLoaded', () => {
      // Ordre de tabulation logique
      const tabbableElements = document.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      // Vérifier que tous sont atteignables
      tabbableElements.forEach(element => {
        if (!element.hasAttribute('tabindex')) {
          // tabindex="0" pour ordre naturel
          element.setAttribute('tabindex', '0');
        }
      });
    });
    
    // Gestionnaire d'événements clavier
    document.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'Enter':
        case ' ':
          // Activer l'élément focusé
          if (e.target.matches('[role="button"]')) {
            e.preventDefault();
            e.target.click();
          }
          break;
          
        case 'Escape':
          // Fermer dialogues, menus, etc.
          closeActiveDialog();
          break;
          
        case 'Tab':
          // Piéger focus dans modales
          if (isModalOpen()) {
            trapFocus(e);
          }
          break;
      }
    });
  }
  
  // 2.1.2 Pas de piège au clavier (A)
  preventKeyboardTrap() {
    // Toujours permettre sortie avec Tab/Shift+Tab
    const focusableElements = 'a, button, input, textarea, select, [tabindex]';
    
    // Pour les contenus embarqués
    const embeds = document.querySelectorAll('iframe, object, embed');
    embeds.forEach(embed => {
      embed.setAttribute('tabindex', '0');
      
      // Instructions pour sortir
      const instructions = document.createElement('div');
      instructions.className = 'sr-only';
      instructions.textContent = 'Appuyez sur Tab pour continuer la navigation';
      embed.parentNode.insertBefore(instructions, embed);
    });
  }
}

// 2.1.4 Raccourcis clavier (A)
class KeyboardShortcuts {
  implementShortcuts() {
    const shortcuts = {
      // Utiliser des combinaisons pour éviter conflits
      'Alt+S': 'skipToSearch',
      'Alt+M': 'openMenu',
      'Alt+H': 'goHome',
      
      // Permettre personnalisation
      allowCustomization: true,
      
      // Fournir mécanisme désactivation
      canDisable: true
    };
    
    // Documentation des raccourcis
    this.documentShortcuts(shortcuts);
  }
}
```

### 2.2 Délai Suffisant
```javascript
// ✅ OBLIGATOIRE - Gestion du temps
class TimingAccessibility {
  // 2.2.1 Réglage du délai (A)
  implementTimeAdjustment() {
    const session = {
      defaultTimeout: 20 * 60 * 1000, // 20 minutes
      warningBefore: 2 * 60 * 1000,   // 2 minutes avant
      
      // Avertir avant expiration
      showWarning() {
        const dialog = this.createWarningDialog();
        dialog.show();
        
        // Options utilisateur
        dialog.addOption('extend', 'Prolonger de 10 minutes');
        dialog.addOption('save', 'Sauvegarder et se déconnecter');
        dialog.addOption('continue', 'Continuer sans limite');
      },
      
      // Au moins 10x le temps par défaut disponible
      extendTime() {
        this.timeout += 10 * 60 * 1000;
        this.announce('Session prolongée de 10 minutes');
      }
    };
  }
  
  // 2.2.2 Mettre en pause, arrêter, masquer (A)
  controlMovingContent() {
    // Contrôles pour contenu animé
    const carousel = {
      autoPlayDefault: false, // Désactivé par défaut
      
      controls: `
        <button aria-label="Mettre en pause le carrousel" 
                data-playing="true">
          <span class="pause-icon">⏸</span>
          <span class="play-icon" hidden>▶</span>
        </button>
      `,
      
      // Pause au survol/focus
      pauseOnHover: true,
      pauseOnFocus: true,
      
      // Durée minimum entre transitions
      minInterval: 5000 // 5 secondes
    };
  }
}
```

### 2.3 Crises et Réactions Physiques
```javascript
// ✅ OBLIGATOIRE - Prévention des crises
class SeizurePrevention {
  // 2.3.1 Pas plus de trois flashs (A)
  validateAnimations() {
    const limits = {
      maxFlashesPerSecond: 3,
      maxRedFlashArea: 0.25, // 25% de l'écran
      
      // Détecter contenu dangereux
      checkContent(element) {
        const animation = getComputedStyle(element).animation;
        if (animation && animation.includes('flash')) {
          const duration = parseFloat(animation.match(/[\d.]+s/)[0]);
          const iterations = animation.match(/infinite|[\d]+/)[0];
          
          // Calculer fréquence
          const frequency = iterations === 'infinite' ? 
            Infinity : iterations / duration;
          
          return frequency <= this.maxFlashesPerSecond;
        }
        return true;
      }
    };
  }
  
  // 2.3.3 Animation depuis les interactions (AAA)
  respectMotionPreferences() {
    // Respecter prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (motionQuery.matches) {
      // Désactiver animations non essentielles
      document.documentElement.classList.add('reduce-motion');
    }
    
    // CSS correspondant
    const styles = `
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
  }
}
```

### 2.4 Navigable
```javascript
// ✅ OBLIGATOIRE - Navigation claire
class NavigationAccessibility {
  // 2.4.1 Contourner des blocs (A)
  implementSkipLinks() {
    const skipLinks = `
      <nav class="skip-links" aria-label="Liens d'évitement">
        <a href="#main" class="skip-link">Aller au contenu principal</a>
        <a href="#nav" class="skip-link">Aller à la navigation</a>
        <a href="#search" class="skip-link">Aller à la recherche</a>
      </nav>
    `;
    
    // CSS pour skip links
    const styles = `
      .skip-link {
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      
      .skip-link:focus {
        position: absolute;
        left: 0;
        top: 0;
        width: auto;
        height: auto;
        padding: 8px;
        background: #000;
        color: #fff;
        text-decoration: none;
        z-index: 999999;
      }
    `;
  }
  
  // 2.4.2 Titre de page (A)
  // 2.4.6 En-têtes et étiquettes (AA)
  implementClearTitles() {
    // Titre de page unique et descriptif
    document.title = 'Page actuelle - Section - Nom du site';
    
    // Hiérarchie claire des titres
    const headingStructure = {
      h1: 'Un seul par page - titre principal',
      h2: 'Sections principales',
      h3: 'Sous-sections',
      h4: 'Détails',
      rules: [
        'Ne pas sauter de niveaux',
        'Utiliser pour structure, pas style',
        'Texte descriptif du contenu suivant'
      ]
    };
  }
  
  // 2.4.3 Parcours du focus (A)
  // 2.4.7 Visibilité du focus (AA)
  implementFocusIndicators() {
    const focusStyles = `
      /* Indicateur visible pour tous éléments focusables */
      :focus {
        outline: 3px solid #0066cc;
        outline-offset: 2px;
      }
      
      /* Alternative pour certains éléments */
      button:focus,
      a:focus {
        box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5);
      }
      
      /* Ne jamais faire */
      /* :focus { outline: none; } */
      
      /* Si style custom, garantir contraste 3:1 */
      .custom-focus {
        outline: 3px solid currentColor;
        outline-offset: 2px;
      }
    `;
  }
  
  // 2.4.5 Accès multiples (AA)
  provideMultipleWays() {
    return [
      'Plan du site complet',
      'Recherche fonctionnelle',
      'Navigation principale claire',
      'Fil d\'Ariane',
      'Index/Table des matières',
      'Liens connexes'
    ];
  }
}
```

### 2.5 Modalités d'Entrée
```javascript
// ✅ OBLIGATOIRE - Nouvautés WCAG 2.1/2.2
class InputModalities {
  // 2.5.1 Gestes de pointeur (A)
  implementPointerGestures() {
    // Pas de gestes complexes obligatoires
    const gestureAlternatives = {
      pinchZoom: 'Boutons +/- disponibles',
      swipe: 'Boutons précédent/suivant',
      longPress: 'Menu contextuel accessible',
      multiTouch: 'Alternative monopoint'
    };
    
    // Exemple implémentation
    class AccessibleSlider {
      constructor(element) {
        // Swipe ET boutons
        this.addSwipeSupport();
        this.addButtonControls();
        this.addKeyboardSupport();
      }
      
      addButtonControls() {
        const prevBtn = `<button aria-label="Précédent">←</button>`;
        const nextBtn = `<button aria-label="Suivant">→</button>`;
        // Ajouter aux contrôles
      }
    }
  }
  
  // 2.5.2 Annulation du pointeur (A)
  implementPointerCancellation() {
    // Événements sur mouseup/touchend, pas mousedown
    document.querySelectorAll('button, a').forEach(element => {
      element.addEventListener('touchstart', e => e.preventDefault());
      element.addEventListener('touchend', e => {
        // Action sur relâchement
        this.handleAction(e);
      });
      
      // Permettre annulation
      element.addEventListener('touchmove', e => {
        // Si déplacement, annuler action
        this.cancelAction(e);
      });
    });
  }
  
  // 2.5.4 Activation par mouvement (A)
  provideMotionAlternatives() {
    // Si shake pour undo
    if (this.hasShakeGesture) {
      // Fournir bouton alternatif
      this.addUndoButton();
      
      // Permettre désactivation
      this.settings.allowDisableMotion = true;
    }
  }
  
  // 2.5.7 Mouvements de glissement (AA) - WCAG 2.2
  implementDraggingAlternatives() {
    // Pour toute action drag-and-drop
    class AccessibleDragDrop {
      constructor(draggables) {
        draggables.forEach(item => {
          // Ajouter boutons d'action
          this.addMoveButtons(item);
          
          // Support clavier
          item.setAttribute('tabindex', '0');
          item.addEventListener('keydown', this.handleKeyboard);
        });
      }
      
      addMoveButtons(item) {
        const controls = `
          <button aria-label="Déplacer vers le haut">↑</button>
          <button aria-label="Déplacer vers le bas">↓</button>
          <button aria-label="Déplacer au début">⤒</button>
          <button aria-label="Déplacer à la fin">⤓</button>
        `;
      }
    }
  }
  
  // 2.5.8 Taille de la cible (AA) - WCAG 2.2  
  ensureTargetSize() {
    const requirements = {
      minimumSize: '24x24px',
      exceptions: [
        'Phrase ou bloc de texte inline',
        'Agent utilisateur détermine taille',
        'Essentiel pour information',
        'Valeur équivalente ailleurs'
      ],
      
      css: `
        /* Taille minimum pour cibles */
        button, a, input[type="checkbox"],
        input[type="radio"], [role="button"] {
          min-width: 24px;
          min-height: 24px;
          /* Ou padding pour atteindre 24px */
        }
        
        /* Espacement entre cibles */
        .button-group button {
          margin: 4px; /* Total 32px entre centres */
        }
      `
    };
  }
}
```

## 3. PRINCIPE 3 : COMPRÉHENSIBLE

### 3.1 Lisible
```javascript
// ✅ OBLIGATOIRE - Lisibilité du contenu
class ReadableContent {
  // 3.1.1 Langue de la page (A)
  // 3.1.2 Langue d'un passage (AA)
  implementLanguageSupport() {
    // Langue principale
    document.documentElement.lang = 'fr';
    
    // Changements de langue
    const multilingualContent = `
      <p>Le mot <span lang="en">web</span> est utilisé mondialement.</p>
      <blockquote lang="en">
        <p>To be or not to be, that is the question.</p>
      </blockquote>
      <p>Retour au français après la citation.</p>
    `;
    
    // Codes de langue valides ISO 639-1
    const validLanguages = {
      'fr': 'Français',
      'en': 'English',
      'es': 'Español',
      'de': 'Deutsch',
      'it': 'Italiano',
      'fr-CA': 'Français canadien'
    };
  }
  
  // 3.1.3 Mots rares (AAA)
  // 3.1.4 Abréviations (AAA)  
  clarifyComplexContent() {
    // Définitions pour termes techniques
    const definitions = `
      <p>Le <dfn id="wcag-def">WCAG</dfn> 
      (<abbr title="Web Content Accessibility Guidelines">
        Web Content Accessibility Guidelines
      </abbr>) est le standard international.</p>
      
      <!-- Glossaire accessible -->
      <dl class="glossary">
        <dt>API</dt>
        <dd>Interface de Programmation d'Applications</dd>
        
        <dt>A11Y</dt>
        <dd>Accessibilité (11 lettres entre A et Y)</dd>
      </dl>
    `;
  }
  
  // 3.1.5 Niveau de lecture (AAA)
  ensureReadability() {
    const guidelines = {
      targetLevel: 'Secondaire inférieur (12-14 ans)',
      techniques: [
        'Phrases courtes (15-20 mots)',
        'Paragraphes courts (3-4 phrases)',
        'Voix active préférée',
        'Jargon évité ou expliqué',
        'Structure claire avec titres'
      ],
      
      supplements: [
        'Résumés pour textes longs',
        'Illustrations explicatives',
        'Version simplifiée disponible'
      ]
    };
  }
}
```

### 3.2 Prévisible
```javascript
// ✅ OBLIGATOIRE - Comportement prévisible
class PredictableBehavior {
  // 3.2.1 Au focus (A)
  // 3.2.2 À la saisie (A)
  preventUnexpectedChanges() {
    // Pas de changement de contexte au focus
    document.querySelectorAll('select, input, textarea').forEach(input => {
      // Mauvais : auto-submit au changement
      // input.addEventListener('change', () => form.submit());
      
      // Bon : bouton submit explicite
      const form = input.closest('form');
      if (form && !form.querySelector('[type="submit"]')) {
        form.insertAdjacentHTML('beforeend', 
          '<button type="submit">Envoyer</button>'
        );
      }
    });
    
    // Avertir des changements de contexte
    const externalLinks = document.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach(link => {
      if (!link.getAttribute('aria-label')?.includes('nouvelle fenêtre')) {
        link.setAttribute('aria-label', 
          `${link.textContent} (ouvre dans une nouvelle fenêtre)`
        );
        // Ou icône visuelle
        link.insertAdjacentHTML('beforeend', 
          ' <span aria-hidden="true">🗗</span>'
        );
      }
    });
  }
  
  // 3.2.3 Navigation cohérente (AA)
  // 3.2.4 Identification cohérente (AA)
  ensureConsistency() {
    const navigationConsistency = {
      // Même ordre sur toutes les pages
      mainNav: ['Accueil', 'Produits', 'Services', 'Contact'],
      
      // Mêmes libellés pour mêmes fonctions
      labels: {
        search: 'Rechercher', // Toujours ce terme
        submit: 'Envoyer',    // Pas "Soumettre" ailleurs
        cancel: 'Annuler',    // Pas "Retour" ailleurs
        next: 'Suivant',      // Pas "Continuer" ailleurs
      },
      
      // Mêmes icônes pour mêmes actions
      icons: {
        home: '🏠',
        search: '🔍', 
        menu: '☰',
        close: '✕'
      }
    };
  }
  
  // 3.2.6 Aide cohérente (A) - WCAG 2.2
  provideConsistentHelp() {
    // Mécanismes d'aide au même endroit
    const helpLocations = {
      header: 'Lien Contact/Aide',
      footer: 'Section support',
      contextual: 'Icônes ? près des champs',
      chatbot: 'Coin inférieur droit'
    };
    
    // Toujours au même endroit sur toutes pages
    class ConsistentHelp {
      renderHelpSection() {
        return `
          <aside class="help-section" aria-label="Aide">
            <h2>Besoin d'aide ?</h2>
            <ul>
              <li><a href="/faq">FAQ</a></li>
              <li><a href="/contact">Nous contacter</a></li>
              <li><a href="/guide">Guide d'utilisation</a></li>
              <li><button onclick="openChat()">Chat en direct</button></li>
            </ul>
          </aside>
        `;
      }
    }
  }
}
```

### 3.3 Assistance à la Saisie
```javascript
// ✅ OBLIGATOIRE - Aide à la saisie
class InputAssistance {
  // 3.3.1 Identification des erreurs (A)
  // 3.3.3 Suggestion d'erreur (AA)
  implementErrorHandling() {
    class FormValidation {
      validateField(field) {
        const errors = [];
        const value = field.value.trim();
        
        // Validation email
        if (field.type === 'email') {
          if (!value.match(/^[^@]+@[^@]+\.[^@]+$/)) {
            errors.push({
              message: 'Adresse email invalide. Format attendu : nom@domaine.com',
              suggestion: 'Vérifiez qu\'il y a un @ et un point après.'
            });
          }
        }
        
        // Validation téléphone
        if (field.type === 'tel') {
          const cleaned = value.replace(/\D/g, '');
          if (cleaned.length !== 10) {
            errors.push({
              message: 'Numéro de téléphone invalide.',
              suggestion: 'Entrez 10 chiffres. Exemple : 01 23 45 67 89'
            });
          }
        }
        
        // Affichage des erreurs
        this.displayErrors(field, errors);
      }
      
      displayErrors(field, errors) {
        // Référence ARIA
        const errorId = `${field.id}-error`;
        field.setAttribute('aria-describedby', errorId);
        field.setAttribute('aria-invalid', errors.length > 0);
        
        // Message d'erreur
        let errorContainer = document.getElementById(errorId);
        if (!errorContainer) {
          errorContainer = document.createElement('div');
          errorContainer.id = errorId;
          errorContainer.className = 'error-message';
          errorContainer.setAttribute('role', 'alert');
          field.parentNode.appendChild(errorContainer);
        }
        
        if (errors.length > 0) {
          errorContainer.innerHTML = errors.map(err => `
            <p class="error">
              <strong>Erreur :</strong> ${err.message}<br>
              <span class="suggestion">${err.suggestion}</span>
            </p>
          `).join('');
          
          // Focus sur premier champ en erreur
          if (this.firstError === null) {
            this.firstError = field;
            field.focus();
          }
        } else {
          errorContainer.innerHTML = '';
        }
      }
    }
  }
  
  // 3.3.2 Étiquettes ou instructions (A)
  provideLabelsAndInstructions() {
    const formMarkup = `
      <form>
        <!-- Étiquette claire et associée -->
        <label for="birthdate">
          Date de naissance
          <span class="required" aria-label="requis">*</span>
        </label>
        <input 
          type="date" 
          id="birthdate" 
          required
          aria-describedby="birthdate-help"
          min="1900-01-01"
          max="2023-12-31"
        >
        <span id="birthdate-help" class="help-text">
          Format : JJ/MM/AAAA
        </span>
        
        <!-- Instructions pour champs complexes -->
        <fieldset>
          <legend>Adresse de livraison</legend>
          
          <label for="street">
            Numéro et nom de rue
            <span class="required">*</span>
          </label>
          <input 
            type="text" 
            id="street" 
            required
            autocomplete="street-address"
            aria-describedby="street-help"
          >
          <span id="street-help" class="help-text">
            Exemple : 123 Rue de la Paix
          </span>
        </fieldset>
        
        <!-- Indication champs obligatoires -->
        <p class="form-required-note">
          <span class="required">*</span> Champs obligatoires
        </p>
      </form>
    `;
  }
  
  // 3.3.4 Prévention des erreurs (AA)
  // 3.3.7 Authentification accessible (AA) - WCAG 2.2
  implementErrorPrevention() {
    // Pour données sensibles : confirmation
    class SecureFormSubmission {
      constructor(form) {
        this.form = form;
        this.setupReviewStep();
      }
      
      setupReviewStep() {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          
          // Afficher résumé pour vérification
          const summary = this.generateSummary();
          const dialog = this.showReviewDialog(summary);
          
          dialog.addButton('Modifier', () => {
            dialog.close();
            this.form.elements[0].focus();
          });
          
          dialog.addButton('Confirmer', () => {
            this.submitForm();
          });
        });
      }
    }
    
    // Authentification accessible (3.3.7)
    class AccessibleAuth {
      implementLogin() {
        return {
          // Pas de test cognitif seul
          methods: [
            'password', // Avec paste autorisé
            'biometric', // Alternative au password
            'magic-link', // Email avec lien
            'oauth', // Connexion tierce
          ],
          
          // Support gestionnaires mots de passe
          passwordField: {
            autocomplete: 'current-password',
            paste: 'allowed', // Jamais bloquer
            show_hide: 'toggle button provided'
          },
          
          // Pas de CAPTCHA cognitif seul
          captcha: {
            required: false, // Préférer honeypot
            alternatives: [
              'Audio CAPTCHA',
              'Email verification',
              'SMS verification'
            ]
          }
        };
      }
    }
  }
}
```

## 4. PRINCIPE 4 : ROBUSTE

### 4.1 Compatible
```javascript
// ✅ OBLIGATOIRE - Compatibilité maximale
class RobustImplementation {
  // 4.1.1 Analyse syntaxique (A)
  ensureValidMarkup() {
    // HTML valide et bien formé
    const validationRules = {
      doctype: '<!DOCTYPE html>',
      encoding: '<meta charset="UTF-8">',
      elements: {
        opening_closing: 'Tous balancés correctement',
        nesting: 'Hiérarchie respectée',
        attributes: 'Pas de doublons, quotes correctes'
      },
      ids: 'Uniques dans la page',
      
      // Outils de validation
      validators: [
        'validator.w3.org',
        'wave.webaim.org',
        'axe DevTools'
      ]
    };
  }
  
  // 4.1.2 Nom, rôle et valeur (A)
  implementNameRoleValue() {
    // Composants custom accessibles
    class AccessibleToggle {
      constructor(element) {
        // Rôle approprié
        element.setAttribute('role', 'switch');
        
        // État
        element.setAttribute('aria-checked', 'false');
        
        // Label
        element.setAttribute('aria-label', 'Activer les notifications');
        
        // Interactivité
        element.setAttribute('tabindex', '0');
        
        // Comportement
        element.addEventListener('click', () => this.toggle());
        element.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.toggle();
          }
        });
      }
      
      toggle() {
        const current = this.element.getAttribute('aria-checked') === 'true';
        this.element.setAttribute('aria-checked', !current);
        
        // Annoncer changement
        this.announce(`Notifications ${!current ? 'activées' : 'désactivées'}`);
      }
    }
  }
  
  // 4.1.3 Messages d'état (AA)
  implementStatusMessages() {
    // Annoncer sans déplacer focus
    class StatusAnnouncer {
      constructor() {
        // Créer région live
        this.liveRegion = document.createElement('div');
        this.liveRegion.setAttribute('role', 'status');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.className = 'sr-only';
        document.body.appendChild(this.liveRegion);
      }
      
      announce(message, priority = 'polite') {
        // Changer aria-live si urgent
        if (priority === 'assertive') {
          this.liveRegion.setAttribute('aria-live', 'assertive');
        }
        
        // Annoncer
        this.liveRegion.textContent = message;
        
        // Nettoyer après annonce
        setTimeout(() => {
          this.liveRegion.textContent = '';
          this.liveRegion.setAttribute('aria-live', 'polite');
        }, 1000);
      }
    }
    
    // Exemples d'utilisation
    const announcer = new StatusAnnouncer();
    
    // Recherche
    announcer.announce('15 résultats trouvés');
    
    // Sauvegarde
    announcer.announce('Document enregistré avec succès');
    
    // Erreur
    announcer.announce('Erreur : Email déjà utilisé', 'assertive');
    
    // Progression
    announcer.announce('Chargement : 75% complété');
  }
}
```

## OUTILS ET TESTS

### Tests Automatiques
```javascript
// ✅ OBLIGATOIRE - Intégrer tests accessibilité
const AccessibilityTesting = {
  tools: {
    automated: [
      'axe-core',           // NPM package
      'Pa11y',             // CI/CD integration  
      'Lighthouse',        // Chrome DevTools
      'WAVE',             // WebAIM
      'IBM Equal Access'   // Browser extension
    ],
    
    code_linters: [
      'eslint-plugin-jsx-a11y',  // React
      'vue-a11y',               // Vue
      'angular-a11y',           // Angular
    ]
  },
  
  // Intégration CI/CD
  cicd_integration: `
    // package.json
    "scripts": {
      "test:a11y": "pa11y ./dist/**/*.html",
      "test:axe": "axe ./dist/"
    }
    
    // GitHub Actions
    - name: Accessibility Tests
      run: |
        npm run test:a11y
        npm run test:axe
  `,
  
  // Tests unitaires
  unit_tests: `
    import { axe, toHaveNoViolations } from 'jest-axe';
    
    expect.extend(toHaveNoViolations);
    
    test('should be accessible', async () => {
      const { container } = render(<MyComponent />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  `
};
```

### Tests Manuels
```yaml
tests_manuels:
  navigation_clavier:
    - Parcourir sans souris
    - Vérifier ordre logique
    - Tester raccourcis
    - Vérifier pièges focus
  
  lecteur_ecran:
    outils:
      - NVDA (Windows - gratuit)
      - JAWS (Windows - payant)
      - VoiceOver (macOS/iOS)
      - TalkBack (Android)
    
    tests:
      - Navigation par titres
      - Lecture formulaires
      - Annonces dynamiques
      - Images et graphiques
  
  zoom_et_reflow:
    - Zoom 200% minimum
    - Pas de scroll horizontal
    - Texte reste lisible
    - Fonctionnalités accessibles
  
  contrastes:
    outils:
      - Colour Contrast Analyser
      - Chrome DevTools
      - Stark (Figma/Sketch)
    
    vérifier:
      - Texte normal : 4.5:1
      - Grand texte : 3:1
      - UI components : 3:1
```

## RESSOURCES ET RÉFÉRENCES

```yaml
ressources:
  documentation:
    - W3C WCAG 2.2 : "w3.org/WAI/WCAG22/quickref/"
    - Techniques WCAG : "w3.org/WAI/WCAG22/Techniques/"
    - Understanding WCAG : "w3.org/WAI/WCAG22/Understanding/"
  
  formations:
    - W3C WAI courses : "w3.org/WAI/courses/"
    - Deque University : "dequeuniversity.com"
    - WebAIM : "webaim.org"
  
  communauté:
    - A11y Slack : "a11y.slack.com"
    - Twitter #a11y
    - Forums W3C WAI
  
  exemples:
    - ARIA Authoring Practices
    - A11y Style Guide
    - Inclusive Components
```

---

**♿ RAPPEL : L'accessibilité n'est pas optionnelle. C'est un droit humain, une obligation légale, et la bonne chose à faire. Viser WCAG 2.2 niveau AA minimum pour toutes les interfaces.**