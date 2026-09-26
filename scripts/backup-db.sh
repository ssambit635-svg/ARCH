#!/usr/bin/env bash
set -euo pipefail
# Export DATABASE_URL from a secret manager. Output path must be protected off-host.
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
file="$BACKUP_DIR/arch-$(date -u +%Y%m%dT%H%M%SZ).dump"
umask 077
pg_dump --format=custom --no-owner --no-acl --dbname="$DATABASE_URL" --file="$file"
pg_restore --list "$file" >/dev/null
printf 'Backup written: %s\n' "$file"
