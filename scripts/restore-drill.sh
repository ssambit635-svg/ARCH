#!/usr/bin/env bash
set -euo pipefail
# Use a dedicated EMPTY database; NEVER point RESTORE_DATABASE_URL at production.
: "${RESTORE_DATABASE_URL:?Dedicated disposable restore database URL required}"
: "${1:?Usage: restore-drill.sh /path/to/backup.dump}"
if [[ "${DATABASE_URL:-}" == "$RESTORE_DATABASE_URL" ]]; then
  echo 'Refusing to restore into source database.' >&2
  exit 1
fi
if [[ "${CONFIRM_DISPOSABLE_RESTORE:-}" != 'YES' ]]; then
  echo 'Set CONFIRM_DISPOSABLE_RESTORE=YES only after verifying the restore URL points to a disposable database.' >&2
  exit 1
fi
pg_restore --exit-on-error --no-owner --no-acl --clean --if-exists --dbname="$RESTORE_DATABASE_URL" "$1"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc 'SELECT count(*) FROM organizations' >/dev/null
printf 'Restore drill succeeded: organizations table readable.\n'
