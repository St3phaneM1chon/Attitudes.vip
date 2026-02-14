#!/bin/bash
# ============================================
# SYNC TRANSLATIONS - AI-Powered i18n Automation
# ============================================
# Synchronizes translation files across all supported languages.
# Uses Claude API for high-quality AI translation with cultural context.
#
# Usage:
#   ./scripts/sync-translations.sh                    # Sync all languages
#   ./scripts/sync-translations.sh --lang ar,he,zh    # Specific languages
#   ./scripts/sync-translations.sh --dry-run           # Preview only
#   ./scripts/sync-translations.sh --namespace wedding  # Specific namespace
#
# Prerequisites:
#   - ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable
#   - Node.js 18+

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCALES_DIR="$PROJECT_ROOT/src/i18n/locales"
SOURCE_LANG="fr"
CONFIG_FILE="$PROJECT_ROOT/.i18n-sync.json"

# Default target languages (main 7)
DEFAULT_LANGS="en,ar,es,he,hi,zh,de"

# Parse arguments
TARGET_LANGS="${DEFAULT_LANGS}"
DRY_RUN=false
NAMESPACE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --lang) TARGET_LANGS="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        --namespace) NAMESPACE="$2"; shift 2 ;;
        --help) echo "Usage: $0 [--lang ar,he,zh] [--dry-run] [--namespace wedding]"; exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo "============================================"
echo "  SYNC TRANSLATIONS - AI-Powered"
echo "============================================"
echo "Source: ${SOURCE_LANG}"
echo "Targets: ${TARGET_LANGS}"
echo "Namespace: ${NAMESPACE:-all}"
echo "Dry run: ${DRY_RUN}"
echo ""

# Run the Node.js translation script
node "$PROJECT_ROOT/scripts/translate-i18n.js" \
    --source "$SOURCE_LANG" \
    --targets "$TARGET_LANGS" \
    --locales-dir "$LOCALES_DIR" \
    ${NAMESPACE:+--namespace "$NAMESPACE"} \
    ${DRY_RUN:+--dry-run}

echo ""
echo "Translation sync complete!"
