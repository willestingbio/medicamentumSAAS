#!/bin/bash
# scripts/backup-db.sh — Backup automático de Postgres
# Crontab: 0 2 * * * /opt/medicamentum360/scripts/backup-db.sh >> /var/log/medicamentum-backup.log 2>&1

set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/medicamentum360/backups
CONTAINER_NAME=medicamentum_postgres
DB_NAME=medicamentum360
DB_USER=medicamentum
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup de $DB_NAME..."

docker exec "$CONTAINER_NAME" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

FILESIZE=$(du -h "$BACKUP_DIR/backup_$DATE.sql.gz" | cut -f1)
echo "[$(date)] Backup completado: backup_$DATE.sql.gz ($FILESIZE)"

# Mantener solo los últimos $KEEP_DAYS días
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "[$(date)] Limpieza: backups mayores a $KEEP_DAYS días eliminados"

# Opcional: copiar a S3/R2 para offsite backup
# aws s3 cp "$BACKUP_DIR/backup_$DATE.sql.gz" s3://tu-bucket-backups/
