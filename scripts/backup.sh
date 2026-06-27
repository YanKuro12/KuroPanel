#!/bin/bash
set -e

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "Backing up database..."
docker exec kuropanel-db pg_dump -U kuropanel kuropanel > $BACKUP_DIR/db_$DATE.sql

echo "Backing up config..."
cp /opt/kuropanel/.env $BACKUP_DIR/env_$DATE

echo "Compressing..."
tar -czf $BACKUP_DIR/kuropanel_$DATE.tar.gz -C /opt/kuropanel backend frontend .env

echo "Cleaning old backups (keep 7 days)..."
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR/kuropanel_$DATE.tar.gz"