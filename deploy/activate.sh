#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run through the configured sudo command.' >&2; exit 1; }
release_id="${1:-}"
[[ "$release_id" =~ ^[a-f0-9]{40}-[a-zA-Z0-9-]+$ ]] || { echo 'Invalid release identifier.' >&2; exit 1; }
exec 9>/run/lock/citabox-deploy.lock
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
archive="/opt/citabox/incoming/${release_id}.tar.gz"
release="/opt/citabox/releases/${release_id}"
[[ -f "$archive" && ! -L "$archive" && ! -e "$release" ]] || { echo 'Missing artifact or release already exists.' >&2; exit 1; }

# Extract application code as the unprivileged runtime user, never as root.
python3 - "$archive" <<'PY'
import sys, tarfile
from pathlib import PurePosixPath
with tarfile.open(sys.argv[1], 'r:gz') as archive:
    for member in archive.getmembers():
        path = PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts or member.issym() or member.islnk() or not (member.isfile() or member.isdir()):
            raise SystemExit('Unsafe artifact member: ' + member.name)
PY
install -d -o citabox -g citabox -m 0750 "$release"
install -o citabox -g citabox -m 0600 "$archive" "$release/release.tar.gz"
runuser -u citabox -- tar -xzf "$release/release.tar.gz" -C "$release"
rm "$release/release.tar.gz"
[[ -f "$release/dist/src/main.js" && -f "$release/package-lock.json" ]] || { echo 'Artifact missing runtime files.' >&2; exit 1; }

if [[ -L /opt/citabox/current ]]; then
  /usr/local/sbin/citabox-backup
fi
runuser -u citabox -- bash -c '
  set -Eeuo pipefail
  set -a; source /etc/citabox/api.env; set +a
  cd "$1"
  npm ci --omit=dev --no-audit --no-fund
  npm run prisma:generate
  npm run deploy:migrate
' bash "$release"

previous="$(readlink -f /opt/citabox/current || true)"
ln -s "$release" /opt/citabox/current.next
mv -Tf /opt/citabox/current.next /opt/citabox/current
systemctl restart citabox-api
set -a; source /etc/citabox/api.env; set +a
health_host="${HOST:-127.0.0.1}"
[[ "$health_host" != 0.0.0.0 ]] || health_host=127.0.0.1
for attempt in $(seq 1 20); do
  if curl --fail --silent --max-time 3 "http://${health_host}:${PORT:-3001}/health"; then
    echo " Activated release ${release_id}"
    exit 0
  fi
  sleep 3
done

echo 'Health check failed. Rolling back application code.' >&2
if [[ "$previous" == /opt/citabox/releases/* && -d "$previous" ]]; then
  ln -s "$previous" /opt/citabox/current.rollback
  mv -Tf /opt/citabox/current.rollback /opt/citabox/current
  systemctl restart citabox-api
else
  systemctl stop citabox-api
fi
exit 1
