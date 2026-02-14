#!/bin/bash

# Power Commands pour Claude Teams 200$ CAD
# Commandes optimisées pour sessions marathon

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Fonction: Démarrer une session marathon
start_marathon() {
    echo -e "${BLUE}🚀 Démarrage Session Marathon Claude Teams${NC}"
    
    # Créer structure de session
    SESSION_DIR="marathon-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$SESSION_DIR"/{code,docs,tests,architecture}
    
    # Initialiser le tracking
    cat > "$SESSION_DIR/session-plan.md" << EOF
# Session Marathon - $(date +"%Y-%m-%d %H:%M")

## Objectifs
1. [ ] Architecture complète
2. [ ] Implementation core
3. [ ] Tests exhaustifs
4. [ ] Documentation
5. [ ] Deployment ready

## Métriques Cibles
- Lignes de code: 5000+
- Couverture tests: 90%+
- Documentation: Complète
- Performance: Optimisée

## Timeline
$(date +"%H:%M") - Début de session
$(date -d "+3 hours" +"%H:%M") - Checkpoint 1: Architecture
$(date -d "+6 hours" +"%H:%M") - Checkpoint 2: Core implementation
$(date -d "+9 hours" +"%H:%M") - Checkpoint 3: Tests & QA
$(date -d "+12 hours" +"%H:%M") - Fin estimée
EOF

    # Lancer le monitor
    node scripts/teams-session-monitor.js &
    MONITOR_PID=$!
    
    echo -e "${GREEN}✅ Session marathon initialisée${NC}"
    echo -e "📁 Répertoire: $SESSION_DIR"
    echo -e "📊 Monitor PID: $MONITOR_PID"
    
    # Sauvegarder les PIDs
    echo "$MONITOR_PID" > .marathon-pids
}

# Fonction: Génération massive de code
massive_codegen() {
    local SPEC_FILE=$1
    
    if [ -z "$SPEC_FILE" ]; then
        echo -e "${RED}❌ Usage: massive_codegen <spec-file.json>${NC}"
        return 1
    fi
    
    echo -e "${BLUE}🏗️  Génération Massive de Code${NC}"
    echo -e "📋 Spec: $SPEC_FILE"
    
    # Créer structure depuis spec
    cat > generate-from-spec.js << 'EOF'
const spec = require(process.argv[2]);
const fs = require('fs').promises;
const path = require('path');

async function generateProject(spec) {
    console.log(`Generating ${spec.name}...`);
    
    // Créer structure
    for (const [dir, files] of Object.entries(spec.structure)) {
        await fs.mkdir(dir, { recursive: true });
        
        for (const file of files) {
            const template = spec.templates[file.template] || '';
            const content = template
                .replace(/{{name}}/g, file.name)
                .replace(/{{type}}/g, file.type);
            
            await fs.writeFile(
                path.join(dir, file.filename),
                content
            );
            console.log(`✅ Created: ${dir}/${file.filename}`);
        }
    }
}

generateProject(spec).catch(console.error);
EOF

    node generate-from-spec.js "$SPEC_FILE"
}

# Fonction: Analyse de productivité en temps réel
productivity_dashboard() {
    echo -e "${BLUE}📊 Dashboard de Productivité Claude Teams${NC}"
    
    while true; do
        clear
        echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║         📊 PRODUCTIVITÉ CLAUDE TEAMS PREMIUM         ║${NC}"
        echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
        
        # Stats Git
        CHANGES=$(git status --porcelain 2>/dev/null | wc -l)
        COMMITS=$(git log --oneline --since="12 hours ago" 2>/dev/null | wc -l)
        
        # Stats fichiers
        FILES_TODAY=$(find . -type f -mtime -1 -not -path "*/node_modules/*" 2>/dev/null | wc -l)
        LINES_TODAY=$(find . -type f -mtime -1 -name "*.js" -o -name "*.ts" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
        
        # Calcul valeur
        HOURS_SAVED=$((LINES_TODAY / 50))
        VALUE_CAD=$((HOURS_SAVED * 150))
        
        echo -e "\n${YELLOW}📈 Statistiques Temps Réel${NC}"
        echo -e "├─ Fichiers modifiés aujourd'hui: ${GREEN}$FILES_TODAY${NC}"
        echo -e "├─ Lignes écrites: ${GREEN}$LINES_TODAY${NC}"
        echo -e "├─ Commits (12h): ${GREEN}$COMMITS${NC}"
        echo -e "└─ Changements non commités: ${YELLOW}$CHANGES${NC}"
        
        echo -e "\n${YELLOW}💰 Valeur Générée${NC}"
        echo -e "├─ Heures économisées: ${GREEN}$HOURS_SAVED h${NC}"
        echo -e "├─ Valeur: ${GREEN}$VALUE_CAD CAD${NC}"
        echo -e "└─ ROI aujourd'hui: ${GREEN}$((VALUE_CAD * 30 / 200))x${NC}"
        
        echo -e "\n${YELLOW}🏆 Objectifs de Session${NC}"
        if [ $LINES_TODAY -gt 1000 ]; then
            echo -e "✅ Milestone 1000 lignes atteint!"
        else
            echo -e "⏳ Progress: $LINES_TODAY/1000 lignes"
        fi
        
        if [ $FILES_TODAY -gt 20 ]; then
            echo -e "✅ 20+ fichiers créés/modifiés!"
        else
            echo -e "⏳ Progress: $FILES_TODAY/20 fichiers"
        fi
        
        echo -e "\n${BLUE}Refresh dans 30s... (Ctrl+C pour quitter)${NC}"
        sleep 30
    done
}

# Fonction: Multi-projet workspace
multi_project() {
    echo -e "${BLUE}🔄 Configuration Multi-Projets${NC}"
    
    cat > .claude-projects.json << 'EOF'
{
  "projects": {
    "main": {
      "path": ".",
      "description": "Projet principal",
      "context": "Full-stack web application"
    },
    "api": {
      "path": "./api",
      "description": "API Backend",
      "context": "RESTful API with GraphQL"
    },
    "frontend": {
      "path": "./frontend",
      "description": "Frontend React",
      "context": "React 18 with TypeScript"
    },
    "mobile": {
      "path": "./mobile",
      "description": "App Mobile",
      "context": "React Native cross-platform"
    },
    "docs": {
      "path": "./docs",
      "description": "Documentation",
      "context": "Technical documentation"
    }
  },
  "activeProjects": [],
  "sessionType": "multi-project"
}
EOF

    echo -e "${GREEN}✅ Configuration multi-projets créée${NC}"
    echo -e "📁 Projets configurés: 5"
    echo -e "💡 Utilisez 'switch_project <name>' pour naviguer"
}

# Fonction: Switch entre projets
switch_project() {
    local PROJECT=$1
    
    if [ -z "$PROJECT" ]; then
        echo -e "${YELLOW}Projets disponibles:${NC}"
        cat .claude-projects.json 2>/dev/null | jq -r '.projects | keys[]' || echo "Aucun projet configuré"
        return
    fi
    
    # Changer de contexte
    PROJECT_PATH=$(cat .claude-projects.json | jq -r ".projects.$PROJECT.path")
    
    if [ "$PROJECT_PATH" != "null" ]; then
        cd "$PROJECT_PATH" || return
        echo -e "${GREEN}✅ Switched to: $PROJECT${NC}"
        echo -e "📁 Path: $(pwd)"
        
        # Afficher le contexte
        CONTEXT=$(cat .claude-projects.json | jq -r ".projects.$PROJECT.context")
        echo -e "📋 Context: $CONTEXT"
    else
        echo -e "${RED}❌ Projet inconnu: $PROJECT${NC}"
    fi
}

# Fonction: Analyse de codebase complète
analyze_codebase() {
    echo -e "${BLUE}🔍 Analyse Complète du Codebase${NC}"
    
    # Créer rapport
    REPORT_FILE="codebase-analysis-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# Analyse Complète du Codebase
Date: $(date)

## Vue d'ensemble
EOF

    # Stats générales
    echo -e "\n### Statistiques Générales" >> "$REPORT_FILE"
    echo -e "\`\`\`" >> "$REPORT_FILE"
    find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) \
        -not -path "*/node_modules/*" | wc -l | \
        xargs -I {} echo "Total fichiers JS/TS: {}" >> "$REPORT_FILE"
    
    find . -type f -name "*.test.*" -o -name "*.spec.*" | wc -l | \
        xargs -I {} echo "Fichiers de test: {}" >> "$REPORT_FILE"
    echo -e "\`\`\`" >> "$REPORT_FILE"
    
    # Top fichiers complexes
    echo -e "\n### Top 10 Fichiers Complexes" >> "$REPORT_FILE"
    echo -e "\`\`\`" >> "$REPORT_FILE"
    find . -name "*.js" -o -name "*.ts" -not -path "*/node_modules/*" | \
        xargs wc -l 2>/dev/null | sort -nr | head -11 | tail -10 >> "$REPORT_FILE"
    echo -e "\`\`\`" >> "$REPORT_FILE"
    
    # Architecture détectée
    echo -e "\n### Architecture Détectée" >> "$REPORT_FILE"
    for dir in src components services utils api controllers models views; do
        if [ -d "$dir" ]; then
            FILE_COUNT=$(find "$dir" -type f -name "*.js" -o -name "*.ts" 2>/dev/null | wc -l)
            echo "- **$dir/**: $FILE_COUNT fichiers" >> "$REPORT_FILE"
        fi
    done
    
    # Dépendances
    if [ -f "package.json" ]; then
        echo -e "\n### Dépendances Principales" >> "$REPORT_FILE"
        cat package.json | jq -r '.dependencies | keys[]' | head -20 | \
            sed 's/^/- /' >> "$REPORT_FILE"
    fi
    
    echo -e "${GREEN}✅ Analyse terminée: $REPORT_FILE${NC}"
}

# Menu principal
case "$1" in
    "marathon")
        start_marathon
        ;;
    "codegen")
        massive_codegen "$2"
        ;;
    "dashboard")
        productivity_dashboard
        ;;
    "multi")
        multi_project
        ;;
    "switch")
        switch_project "$2"
        ;;
    "analyze")
        analyze_codebase
        ;;
    *)
        echo -e "${BLUE}🚀 Claude Teams Power Commands${NC}"
        echo -e "\nUsage: $0 <command> [options]"
        echo -e "\nCommandes disponibles:"
        echo -e "  ${YELLOW}marathon${NC}    - Démarrer une session marathon (8-12h)"
        echo -e "  ${YELLOW}codegen${NC}     - Génération massive depuis spec JSON"
        echo -e "  ${YELLOW}dashboard${NC}   - Dashboard de productivité temps réel"
        echo -e "  ${YELLOW}multi${NC}       - Configurer workspace multi-projets"
        echo -e "  ${YELLOW}switch${NC}      - Changer de projet actif"
        echo -e "  ${YELLOW}analyze${NC}     - Analyse complète du codebase"
        echo -e "\nExemples:"
        echo -e "  $0 marathon"
        echo -e "  $0 codegen spec.json"
        echo -e "  $0 switch frontend"
        ;;
esac