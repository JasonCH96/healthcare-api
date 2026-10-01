#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
install -d -m 0700 /var/backups/citabox
backup="/var/backups/citabox/citabox-$(date -u +%Y%m%dT%H%M%S).dump"
umask 077
runuser -u postgres -- pg_dump --format=custom citabox > "${backup}.tmp"
mv "${backup}.tmp" "$backup"
find /var/backups/citabox -maxdepth 1 -type f -name 'citabox-*.dump' -mtime +7 -delete
echo "Database backup complete: $(basename "$backup")"
