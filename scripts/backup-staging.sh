#!/bin/sh

# Script de backup automatique pour staging
# Exécuté par cron dans le container backup-staging

# Configuration
DB_HOST="postgres-staging"
DB_NAME="attitudes_staging"
DB_USER="postgres"
BACKUP_DIR="/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/attitudes-staging-$TIMESTAMP.sql"

# Créer le répertoire si nécessaire
mkdir -p $BACKUP_DIR

# Fonction de log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Effectuer le backup
log "Début du backup de $DB_NAME"

# Dump de la base de données
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    # Compresser le backup
    gzip $BACKUP_FILE
    log "Backup créé: ${BACKUP_FILE}.gz"
    
    # Calculer la taille
    SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    log "Taille du backup: $SIZE"
    
    # Nettoyer les anciens backups
    log "Nettoyage des backups de plus de $RETENTION_DAYS jours"
    find $BACKUP_DIR -name "attitudes-staging-*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Lister les backups restants
    log "Backups disponibles:"
    ls -lh $BACKUP_DIR/*.sql.gz 2>/dev/null | tail -5
else
    log "ERREUR: Échec du backup"
    exit 1
fi

log "Backup terminé avec succès"